import json
import os
import psycopg2
import bcrypt
import jwt
from datetime import datetime, timedelta
from typing import Dict, Any

SECRET_KEY = os.environ.get('JWT_SECRET', 'default-secret-key-change-in-production')

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Авторизация администраторов для доступа к админ-панели
    Args: event с httpMethod, body; context с request_id
    Returns: JWT токен при успешной авторизации
    '''
    method: str = event.get('httpMethod', 'POST')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': headers,
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    body_data = json.loads(event.get('body', '{}'))
    username = body_data.get('username')
    password = body_data.get('password')
    
    if not username or not password:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': 'Username and password required'}),
            'isBase64Encoded': False
        }
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    
    try:
        cur.execute('SELECT id, password_hash FROM admin_users WHERE username = %s', (username,))
        row = cur.fetchone()
        
        if not row:
            return {
                'statusCode': 401,
                'headers': headers,
                'body': json.dumps({'error': 'Invalid credentials'}),
                'isBase64Encoded': False
            }
        
        user_id, password_hash = row
        
        if not bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8')):
            return {
                'statusCode': 401,
                'headers': headers,
                'body': json.dumps({'error': 'Invalid credentials'}),
                'isBase64Encoded': False
            }
        
        token = jwt.encode(
            {
                'user_id': user_id,
                'username': username,
                'exp': datetime.utcnow() + timedelta(days=7)
            },
            SECRET_KEY,
            algorithm='HS256'
        )
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'token': token, 'username': username}),
            'isBase64Encoded': False
        }
    
    finally:
        cur.close()
        conn.close()
