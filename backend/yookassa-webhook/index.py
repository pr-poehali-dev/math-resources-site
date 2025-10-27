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
import base64
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
    
    print(f'[WEBHOOK] Event: {notification_type}, Payment: {json.dumps(payment_obj)}')
    
    if notification_type != 'payment.succeeded':
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'status': 'ignored'}),
            'isBase64Encoded': False
        }
    
    payment_id = payment_obj.get('id')
    
    if not payment_id:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Missing payment_id'}),
            'isBase64Encoded': False
        }
    
    shop_id = os.environ.get('YOOKASSA_SHOP_ID')
    secret_key = os.environ.get('YOOKASSA_SECRET_KEY')
    
    if not shop_id or not secret_key:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'YooKassa credentials not configured'}),
            'isBase64Encoded': False
        }
    
    auth_string = f'{shop_id}:{secret_key}'
    credentials = base64.b64encode(auth_string.encode('utf-8')).decode('ascii')
    
    payment_req = urllib.request.Request(
        f'https://api.yookassa.ru/v3/payments/{payment_id}',
        headers={
            'Authorization': f'Basic {credentials}',
            'Content-Type': 'application/json'
        }
    )
    
    try:
        payment_response = urllib.request.urlopen(payment_req)
        full_payment_data = json.loads(payment_response.read().decode())
        print(f'[WEBHOOK] Full payment data from API: {json.dumps(full_payment_data)}')
        
        amount = float(full_payment_data.get('amount', {}).get('value', 0))
        metadata = full_payment_data.get('metadata', {})
        customer_email = metadata.get('customer_email') or full_payment_data.get('receipt', {}).get('customer', {}).get('email')
        product_ids = metadata.get('product_ids', '')
        
        print(f'[WEBHOOK] Email: {customer_email}, Product IDs from API: {product_ids}')
    except Exception as e:
        print(f'[WEBHOOK] Error fetching payment from API: {str(e)}')
        amount = float(payment_obj.get('amount', {}).get('value', 0))
        metadata = payment_obj.get('metadata', {})
        customer_email = metadata.get('customer_email') or payment_obj.get('receipt', {}).get('customer', {}).get('email')
        product_ids = metadata.get('product_ids', '')
        print(f'[WEBHOOK] Using webhook data - Email: {customer_email}, Product IDs: {product_ids}')
    
    if not customer_email:
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