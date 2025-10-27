'''
Business: Регистрация и авторизация покупателей (не админов)
Args: event с httpMethod, body (email, password, full_name)
      context с request_id
Returns: JWT токен при успешной регистрации/авторизации
'''
import json
import os
import psycopg2
import bcrypt
import jwt
from datetime import datetime, timedelta
from typing import Dict, Any

SECRET_KEY = os.environ.get('JWT_SECRET', 'default-secret-key-change-in-production')

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'POST')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
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
    action = body_data.get('action')
    email = body_data.get('email')
    password = body_data.get('password')
    full_name = body_data.get('full_name', '')
    
    if not email or not password:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': 'Email and password required'}),
            'isBase64Encoded': False
        }
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    
    try:
        if action == 'register':
            cur.execute('SELECT id FROM users WHERE email = %s', (email,))
            if cur.fetchone():
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': 'Email already registered'}),
                    'isBase64Encoded': False
                }
            
            password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            cur.execute(
                'INSERT INTO users (email, password_hash, full_name) VALUES (%s, %s, %s) RETURNING id',
                (email, password_hash, full_name)
            )
            user_id = cur.fetchone()[0]
            conn.commit()
            
            token = jwt.encode(
                {
                    'user_id': user_id,
                    'email': email,
                    'exp': datetime.utcnow() + timedelta(days=30)
                },
                SECRET_KEY,
                algorithm='HS256'
            )
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'token': token, 'email': email, 'user_id': user_id}),
                'isBase64Encoded': False
            }
        
        elif action == 'login':
            cur.execute('SELECT id, password_hash, full_name FROM users WHERE email = %s', (email,))
            row = cur.fetchone()
            
            if not row:
                return {
                    'statusCode': 401,
                    'headers': headers,
                    'body': json.dumps({'error': 'Invalid credentials'}),
                    'isBase64Encoded': False
                }
            
            user_id, password_hash, user_full_name = row
            
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
                    'email': email,
                    'exp': datetime.utcnow() + timedelta(days=30)
                },
                SECRET_KEY,
                algorithm='HS256'
            )
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'token': token, 'email': email, 'user_id': user_id, 'full_name': user_full_name}),
                'isBase64Encoded': False
            }
        
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': 'Invalid action'}),
            'isBase64Encoded': False
        }
    
    finally:
        cur.close()
        conn.close()
