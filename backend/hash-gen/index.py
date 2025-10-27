'''
Business: Генератор bcrypt хешей
Args: event с body (password)
Returns: hash
'''
import json
import bcrypt
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method = event.get('httpMethod', 'POST')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    headers = {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}
    
    body_data = json.loads(event.get('body', '{}'))
    password = body_data.get('password', '')
    
    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps({'hash': password_hash}),
        'isBase64Encoded': False
    }
