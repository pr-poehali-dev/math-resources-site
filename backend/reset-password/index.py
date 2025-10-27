'''
Business: Сброс пароля администратора на admin123
Args: event с httpMethod; context с request_id
Returns: Статус сброса пароля
'''
import json
import os
import psycopg2
import bcrypt
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
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
            'body': '',
            'isBase64Encoded': False
        }
    
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    }
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    
    try:
        new_password = 'admin123'
        password_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        cur.execute(
            "UPDATE admin_users SET password_hash = %s WHERE username = %s",
            (password_hash, 'admin')
        )
        conn.commit()
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'message': 'Password reset to admin123'}),
            'isBase64Encoded': False
        }
    
    finally:
        cur.close()
        conn.close()
