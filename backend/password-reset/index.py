'''
Business: Сброс пароля пользователя через email
Args: event с httpMethod, body (action: request_reset/reset_password, email, token, new_password)
      context с request_id
Returns: Статус отправки письма или результат смены пароля
'''
import json
import os
import psycopg2
import bcrypt
import secrets
from datetime import datetime, timedelta
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'POST')
    
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
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    
    try:
        if action == 'request_reset':
            email = body_data.get('email')
            
            if not email:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': 'Email required'}),
                    'isBase64Encoded': False
                }
            
            cur.execute('SELECT id FROM t_p99209851_math_resources_site.users WHERE email = %s', (email,))
            user = cur.fetchone()
            
            if not user:
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({'message': 'Если аккаунт существует, письмо отправлено'}),
                    'isBase64Encoded': False
                }
            
            token = secrets.token_urlsafe(32)
            expires_at = datetime.utcnow() + timedelta(hours=1)
            
            cur.execute(
                'INSERT INTO t_p99209851_math_resources_site.password_reset_tokens (email, token, expires_at) VALUES (%s, %s, %s)',
                (email, token, expires_at)
            )
            conn.commit()
            
            reset_url = f"{os.environ.get('FRONTEND_URL', 'https://mk-room.ru')}/reset-password?token={token}"
            
            send_email_function_url = 'https://functions.poehali.dev/4acdc478-3ce3-4267-92ea-bf6b79e2fffd'
            
            import urllib.request
            email_body = {
                'to_email': email,
                'subject': 'Восстановление пароля',
                'html': f'''
                <h2>Восстановление пароля</h2>
                <p>Вы запросили сброс пароля для вашего аккаунта.</p>
                <p>Перейдите по ссылке для создания нового пароля:</p>
                <p><a href="{reset_url}">Сбросить пароль</a></p>
                <p>Ссылка действительна 1 час.</p>
                <p>Если вы не запрашивали сброс пароля, проигнорируйте это письмо.</p>
                '''
            }
            
            req = urllib.request.Request(
                send_email_function_url,
                data=json.dumps(email_body).encode('utf-8'),
                headers={'Content-Type': 'application/json'},
                method='POST'
            )
            
            try:
                urllib.request.urlopen(req)
            except Exception as e:
                print(f'Failed to send email: {e}')
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'message': 'Письмо с инструкциями отправлено'}),
                'isBase64Encoded': False
            }
        
        elif action == 'reset_password':
            token = body_data.get('token')
            new_password = body_data.get('new_password')
            
            if not token or not new_password:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': 'Token and new password required'}),
                    'isBase64Encoded': False
                }
            
            cur.execute(
                'SELECT email, expires_at, used FROM t_p99209851_math_resources_site.password_reset_tokens WHERE token = %s',
                (token,)
            )
            token_data = cur.fetchone()
            
            if not token_data:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': 'Недействительный токен'}),
                    'isBase64Encoded': False
                }
            
            email, expires_at, used = token_data
            
            if used:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': 'Токен уже использован'}),
                    'isBase64Encoded': False
                }
            
            if datetime.utcnow() > expires_at:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': 'Токен истёк'}),
                    'isBase64Encoded': False
                }
            
            password_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            cur.execute(
                'UPDATE t_p99209851_math_resources_site.users SET password_hash = %s WHERE email = %s',
                (password_hash, email)
            )
            
            cur.execute(
                'UPDATE t_p99209851_math_resources_site.password_reset_tokens SET used = TRUE WHERE token = %s',
                (token,)
            )
            
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'message': 'Пароль успешно изменён'}),
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
