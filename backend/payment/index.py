'''
Business: Создание платежа через ЮMoney API для оплаты товаров
Args: event - dict с httpMethod, body (amount, description, return_url)
      context - object с request_id
Returns: HTTP response с payment_url для перенаправления на оплату
'''
import json
import os
import uuid
from typing import Dict, Any
from urllib.parse import urlencode
import urllib.request

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    # Handle CORS OPTIONS request
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
    
    if not amount or not return_url:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Missing amount or return_url'}),
            'isBase64Encoded': False
        }
    
    client_id = os.environ.get('YOOMONEY_CLIENT_ID')
    
    if not client_id:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'YooMoney credentials not configured'}),
            'isBase64Encoded': False
        }
    
    # Создаем URL для оплаты через форму ЮMoney
    payment_params = {
        'receiver': client_id,
        'quickpay-form': 'shop',
        'targets': description,
        'paymentType': 'SB',  # СБП по умолчанию
        'sum': str(amount),
        'successURL': return_url,
        'label': str(uuid.uuid4())  # Уникальный ID платежа
    }
    
    payment_url = f"https://yoomoney.ru/quickpay/confirm.xml?{urlencode(payment_params)}"
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({
            'payment_url': payment_url,
            'payment_id': payment_params['label']
        }),
        'isBase64Encoded': False
    }
