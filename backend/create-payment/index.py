'''
Business: Безопасное создание платежа - берёт цены из БД по product_ids
Args: event - dict с httpMethod, body (product_ids, customer_email, return_url)
      context - object с request_id
Returns: HTTP response с payment_url для оплаты (цены из базы данных)
'''
import json
import os
import uuid
import base64
from typing import Dict, Any, List
import urllib.request
import psycopg2

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    body_data = json.loads(event.get('body', '{}'))
    product_ids: List[int] = body_data.get('product_ids', [])
    customer_email: str = body_data.get('customer_email', '')
    return_url: str = body_data.get('return_url', '')
    
    if not product_ids or not customer_email or not return_url:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Missing product_ids, customer_email or return_url'}),
            'isBase64Encoded': False
        }
    
    # Получаем DATABASE_URL из секретов
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Database connection not configured'}),
            'isBase64Encoded': False
        }
    
    # Подключаемся к БД и получаем реальные цены из таблицы products
    conn = psycopg2.connect(database_url)
    cur = conn.cursor()
    
    placeholders = ','.join(['%s'] * len(product_ids))
    query = f'SELECT id, title, price FROM t_p99209851_math_resources_site.products WHERE id IN ({placeholders})'
    cur.execute(query, product_ids)
    products = cur.fetchall()
    
    cur.close()
    conn.close()
    
    if not products:
        return {
            'statusCode': 404,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Products not found'}),
            'isBase64Encoded': False
        }
    
    # Вычисляем общую сумму и применяем скидку если нужно
    subtotal = sum(price for _, _, price in products)
    has_discount = len(products) >= 10
    discount_percent = 15 if has_discount else 0
    discount_amount = int(subtotal * discount_percent / 100) if has_discount else 0
    total_amount = subtotal - discount_amount
    
    # Формируем описание заказа
    product_titles = [title for _, title, _ in products]
    description = ', '.join(product_titles[:3])
    if len(product_titles) > 3:
        description += f' и ещё {len(product_titles) - 3} товар(ов)'
    
    # Получаем ЮКасса credentials
    shop_id = os.environ.get('YOOKASSA_SHOP_ID')
    secret_key = os.environ.get('YOOKASSA_SECRET_KEY')
    
    if not shop_id or not secret_key:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'YooKassa credentials not configured'}),
            'isBase64Encoded': False
        }
    
    idempotence_key = str(uuid.uuid4())
    
    # Создаём платёж в ЮКасса
    payment_data = {
        'amount': {
            'value': f'{float(total_amount):.2f}',
            'currency': 'RUB'
        },
        'confirmation': {
            'type': 'redirect',
            'return_url': return_url
        },
        'capture': True,
        'description': description,
        'receipt': {
            'customer': {
                'email': customer_email
            },
            'items': [{
                'description': title,
                'quantity': '1',
                'amount': {
                    'value': f'{float(price):.2f}',
                    'currency': 'RUB'
                },
                'vat_code': 1,
                'payment_mode': 'full_payment',
                'payment_subject': 'commodity'
            } for _, title, price in products]
        },
        'metadata': {
            'order_id': idempotence_key,
            'product_ids': ','.join(map(str, product_ids)),
            'customer_email': customer_email
        }
    }
    
    auth_string = f'{shop_id}:{secret_key}'
    credentials = base64.b64encode(auth_string.encode('utf-8')).decode('ascii')
    
    req = urllib.request.Request(
        'https://api.yookassa.ru/v3/payments',
        data=json.dumps(payment_data).encode(),
        headers={
            'Authorization': f'Basic {credentials}',
            'Idempotence-Key': idempotence_key,
            'Content-Type': 'application/json'
        }
    )
    
    try:
        response = urllib.request.urlopen(req)
        response_data = json.loads(response.read().decode())
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'payment_url': response_data['confirmation']['confirmation_url'],
                'payment_id': response_data['id'],
                'total_amount': total_amount,
                'discount_applied': has_discount
            }),
            'isBase64Encoded': False
        }
    except urllib.error.HTTPError as e:
        error_body = e.read().decode()
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': 'YooKassa API error',
                'details': error_body
            }),
            'isBase64Encoded': False
        }
