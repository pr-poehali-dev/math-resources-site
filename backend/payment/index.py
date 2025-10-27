'''
Business: Создание платежа через ЮКасса API для оплаты товаров
Args: event - dict с httpMethod, body (amount, description, return_url)
      context - object с request_id
Returns: HTTP response с payment_url и confirmation_token для оплаты
'''
import json
import os
import uuid
import base64
from typing import Dict, Any
import urllib.request

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
    amount = body_data.get('amount')
    description = body_data.get('description', 'Оплата заказа')
    return_url = body_data.get('return_url', '')
    customer_email = body_data.get('customer_email', '')
    product_ids = body_data.get('product_ids', [])
    
    if not amount or not return_url or not customer_email:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Missing amount, return_url or customer_email'}),
            'isBase64Encoded': False
        }
    
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
    
    payment_data = {
        'amount': {
            'value': str(amount) if '.' in str(amount) else f'{float(amount):.2f}',
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
                'description': description,
                'quantity': '1',
                'amount': {
                    'value': str(amount) if '.' in str(amount) else f'{float(amount):.2f}',
                    'currency': 'RUB'
                },
                'vat_code': 1,
                'payment_mode': 'full_payment',
                'payment_subject': 'commodity'
            }]
        },
        'metadata': {
            'order_id': idempotence_key,
            'product_ids': ','.join(map(str, product_ids)) if product_ids else '',
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
                'payment_id': response_data['id']
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