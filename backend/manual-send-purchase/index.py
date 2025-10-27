import json
import os
import base64
import urllib.request
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Manually send purchase email by fetching payment from YooKassa
    Args: event with email in query params, context object
    Returns: HTTP response
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method != 'GET':
        return {
            'statusCode': 405,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    params = event.get('queryStringParameters', {})
    email = params.get('email')
    
    if not email:
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Email is required'})
        }
    
    shop_id = os.environ.get('YOOKASSA_SHOP_ID')
    secret_key = os.environ.get('YOOKASSA_SECRET_KEY')
    
    if not shop_id or not secret_key:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'YooKassa credentials not configured'})
        }
    
    # Get payments from YooKassa
    credentials = base64.b64encode(f'{shop_id}:{secret_key}'.encode()).decode()
    
    url = 'https://api.yookassa.ru/v3/payments'
    req = urllib.request.Request(url)
    req.add_header('Authorization', f'Basic {credentials}')
    req.add_header('Content-Type', 'application/json')
    
    response = urllib.request.urlopen(req)
    data = json.loads(response.read().decode())
    
    # Find payment by email
    matching_payments = []
    for payment in data.get('items', []):
        receipt = payment.get('receipt', {})
        customer = receipt.get('customer', {})
        if customer.get('email') == email and payment.get('status') == 'succeeded':
            matching_payments.append({
                'id': payment['id'],
                'amount': payment['amount']['value'],
                'created_at': payment['created_at'],
                'metadata': payment.get('metadata', {})
            })
    
    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
        'body': json.dumps({
            'email': email,
            'payments': matching_payments
        })
    }
