'''
Business: Обновление пароля админа с генерацией хеша
Args: event с body (username, new_password)
Returns: success message with hash
'''
import json
import os
import psycopg2
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
    username = body_data.get('username')
    new_password = body_data.get('new_password')
    
    if not username or not new_password:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': 'Username and new_password required'}),
            'isBase64Encoded': False
        }
    
    password_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    
    try:
        cur.execute(
            'UPDATE t_p99209851_math_resources_site.admin_users SET password_hash = %s WHERE username = %s',
            (password_hash, username)
        )
        conn.commit()
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'message': 'Password updated successfully',
                'username': username,
                'hash': password_hash
            }),
            'isBase64Encoded': False
        }
    
    finally:
        cur.close()
        conn.close()
