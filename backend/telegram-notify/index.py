'''
Business: Отправка уведомлений администратору в Telegram о новых покупках
Args: event - dict с httpMethod, body (message, amount, email, products)
      context - object с request_id
Returns: HTTP response с результатом отправки
'''
import json
import os
import urllib.request
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
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
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    bot_token = os.environ.get('TELEGRAM_BOT_TOKEN')
    chat_id = os.environ.get('TELEGRAM_CHAT_ID')
    
    if not bot_token or not chat_id:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Telegram credentials not configured'}),
            'isBase64Encoded': False
        }
    
    body_data = json.loads(event.get('body', '{}'))
    amount = body_data.get('amount', '0')
    email = body_data.get('email', 'Не указан')
    products = body_data.get('products', [])
    
    products_text = '\n'.join([f"  • {p}" for p in products]) if products else '  Информация о товарах отсутствует'
    
    message = f"""🎉 <b>Новая покупка!</b>

💰 <b>Сумма:</b> {amount} ₽
📧 <b>Email покупателя:</b> {email}

📦 <b>Купленные материалы:</b>
{products_text}

✅ Оплата успешно прошла"""
    
    telegram_data = {
        'chat_id': chat_id,
        'text': message,
        'parse_mode': 'HTML'
    }
    
    url = f'https://api.telegram.org/bot{bot_token}/sendMessage'
    
    req = urllib.request.Request(
        url,
        data=json.dumps(telegram_data).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
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
            'body': json.dumps({'success': True, 'message': 'Notification sent'}),
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
                'error': 'Telegram API error',
                'details': error_body
            }),
            'isBase64Encoded': False
        }
