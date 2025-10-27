'''
Business: Обработка webhook от ЮКассы после оплаты, сохранение заказа в БД
Args: event - dict с httpMethod, body (уведомление от ЮКассы)
      context - object с request_id  
Returns: HTTP response 200 для подтверждения получения webhook
'''
import json
import os
import psycopg2
import urllib.request
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'POST')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    body_data = json.loads(event.get('body', '{}'))
    notification_type = body_data.get('event')
    payment_obj = body_data.get('object', {})
    
    if notification_type != 'payment.succeeded':
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'status': 'ignored'}),
            'isBase64Encoded': False
        }
    
    payment_id = payment_obj.get('id')
    amount = float(payment_obj.get('amount', {}).get('value', 0))
    customer_email = payment_obj.get('receipt', {}).get('customer', {}).get('email')
    description = payment_obj.get('description', '')
    metadata = payment_obj.get('metadata', {})
    product_ids = metadata.get('product_ids', '')
    
    if not payment_id or not customer_email:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Missing payment data'}),
            'isBase64Encoded': False
        }
    
    dsn = os.environ.get('DATABASE_URL')
    
    if not dsn:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Database not configured'}),
            'isBase64Encoded': False
        }
    
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    
    cur.execute(
        "INSERT INTO t_p99209851_math_resources_site.orders (guest_email, total_price, payment_id, payment_status) VALUES (%s, %s, %s, %s) RETURNING id",
        (customer_email, int(amount), payment_id, 'paid')
    )
    order_id = cur.fetchone()[0]
    
    if product_ids:
        product_id_list = [int(pid) for pid in product_ids.split(',') if pid.strip()]
        
        for product_id in product_id_list:
            cur.execute(
                "SELECT title, price, full_pdf_url FROM t_p99209851_math_resources_site.products WHERE id = %s",
                (product_id,)
            )
            product = cur.fetchone()
            
            if product:
                cur.execute(
                    "INSERT INTO t_p99209851_math_resources_site.order_items (order_id, product_id, product_title, product_price, full_pdf_url) VALUES (%s, %s, %s, %s, %s)",
                    (order_id, product_id, product[0], product[1], product[2])
                )
    
    conn.commit()
    cur.close()
    conn.close()
    
    email_payload = json.dumps({
        'customer_email': customer_email,
        'order_id': order_id
    }).encode()
    
    email_req = urllib.request.Request(
        'https://functions.poehali.dev/fa6783b1-aae1-4057-8f19-8f9ccb0665f1',
        data=email_payload,
        headers={'Content-Type': 'application/json'}
    )
    
    try:
        urllib.request.urlopen(email_req)
    except Exception:
        pass
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps({
            'status': 'success',
            'order_id': order_id
        }),
        'isBase64Encoded': False
    }