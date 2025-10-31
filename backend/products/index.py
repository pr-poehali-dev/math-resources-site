'''
Business: API для управления товарами (получение, добавление, обновление, удаление)
Args: event с httpMethod, body, pathParams, headers; context с request_id
Returns: HTTP response с JSON данными
'''
import json
import os
import psycopg2
import jwt
from typing import Dict, Any, Optional

ADMIN_SECRET_KEY = os.environ.get('ADMIN_JWT_SECRET', 'admin-secret-key-change-in-production')

def verify_admin_token(headers: Dict[str, str]) -> Optional[Dict[str, Any]]:
    """Проверяет JWT токен админа из заголовка X-Admin-Token"""
    token = headers.get('x-admin-token') or headers.get('X-Admin-Token')
    
    if not token:
        return None
    
    try:
        payload = jwt.decode(token, ADMIN_SECRET_KEY, algorithms=['HS256'])
        if 'admin_id' not in payload:
            return None
        return payload
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    headers_response = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    }
    
    # Для POST, PUT, DELETE требуется авторизация админа
    if method in ['POST', 'PUT', 'DELETE']:
        request_headers = event.get('headers', {})
        admin_payload = verify_admin_token(request_headers)
        
        if not admin_payload:
            return {
                'statusCode': 401,
                'headers': headers_response,
                'body': json.dumps({'error': 'Unauthorized: Admin access required'}),
                'isBase64Encoded': False
            }
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    
    try:
        if method == 'GET':
            query_params = event.get('queryStringParameters', {})
            product_id = query_params.get('id') if query_params else None
            stats_request = query_params.get('stats') if query_params else None
            
            if stats_request == 'true':
                cur.execute('''
                    SELECT 
                        COUNT(*) as total_products,
                        SUM(CASE WHEN sample_pdf_url IS NOT NULL AND sample_pdf_url != '' THEN 1 ELSE 0 END) +
                        SUM(CASE WHEN full_pdf_with_answers_url IS NOT NULL AND full_pdf_with_answers_url != '' THEN 1 ELSE 0 END) +
                        SUM(CASE WHEN full_pdf_without_answers_url IS NOT NULL AND full_pdf_without_answers_url != '' THEN 1 ELSE 0 END) +
                        SUM(CASE WHEN trainer1_url IS NOT NULL AND trainer1_url != '' THEN 1 ELSE 0 END) +
                        SUM(CASE WHEN trainer2_url IS NOT NULL AND trainer2_url != '' THEN 1 ELSE 0 END) +
                        SUM(CASE WHEN trainer3_url IS NOT NULL AND trainer3_url != '' THEN 1 ELSE 0 END) as total_files
                    FROM products
                ''')
                stats_row = cur.fetchone()
                stats = {
                    'total_products': stats_row[0] or 0,
                    'total_files': int(stats_row[1] or 0)
                }
                return {
                    'statusCode': 200,
                    'headers': headers_response,
                    'body': json.dumps(stats),
                    'isBase64Encoded': False
                }
            
            if product_id:
                cur.execute(
                    "SELECT id, title, description, price, category, type, sample_pdf_url, full_pdf_with_answers_url, full_pdf_without_answers_url, trainer1_url, trainer2_url, trainer3_url, is_free, preview_image_url FROM products WHERE id = %s",
                    (int(product_id),)
                )
                row = cur.fetchone()
                if row:
                    product = {
                        'id': row[0],
                        'title': row[1],
                        'description': row[2],
                        'price': row[3],
                        'category': row[4],
                        'type': row[5],
                        'sample_pdf_url': row[6],
                        'full_pdf_with_answers_url': row[7],
                        'full_pdf_without_answers_url': row[8],
                        'trainer1_url': row[9],
                        'trainer2_url': row[10],
                        'trainer3_url': row[11],
                        'is_free': row[12],
                        'preview_image_url': row[13]
                    }
                    return {
                        'statusCode': 200,
                        'headers': headers_response,
                        'body': json.dumps(product),
                        'isBase64Encoded': False
                    }
                else:
                    return {
                        'statusCode': 404,
                        'headers': headers_response,
                        'body': json.dumps({'error': 'Product not found'}),
                        'isBase64Encoded': False
                    }
            else:
                cur.execute('SELECT id, title, description, price, category, type, sample_pdf_url, full_pdf_with_answers_url, full_pdf_without_answers_url, trainer1_url, trainer2_url, trainer3_url, is_free, preview_image_url FROM products ORDER BY id')
                rows = cur.fetchall()
                products = [
                    {
                        'id': row[0],
                        'title': row[1],
                        'description': row[2],
                        'price': row[3],
                        'category': row[4],
                        'type': row[5],
                        'sample_pdf_url': row[6],
                        'full_pdf_with_answers_url': row[7],
                        'full_pdf_without_answers_url': row[8],
                        'trainer1_url': row[9],
                        'trainer2_url': row[10],
                        'trainer3_url': row[11],
                        'is_free': row[12],
                        'preview_image_url': row[13]
                    }
                    for row in rows
                ]
                return {
                    'statusCode': 200,
                    'headers': headers_response,
                    'body': json.dumps(products),
                    'isBase64Encoded': False
                }
        
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            
            title = body_data.get('title', '')
            description = body_data.get('description', '')
            price = body_data.get('price', 0) if body_data.get('price') else 0
            category = body_data.get('category', '')
            product_type = body_data.get('type', '')
            sample_pdf_url = body_data.get('sample_pdf_url') or None
            full_pdf_with_answers_url = body_data.get('full_pdf_with_answers_url') or None
            full_pdf_without_answers_url = body_data.get('full_pdf_without_answers_url') or None
            trainer1_url = body_data.get('trainer1_url') or None
            trainer2_url = body_data.get('trainer2_url') or None
            trainer3_url = body_data.get('trainer3_url') or None
            is_free = body_data.get('is_free', False)
            preview_image_url = body_data.get('preview_image_url') or None
            
            cur.execute(
                """
                INSERT INTO products (title, description, price, category, type, sample_pdf_url, full_pdf_with_answers_url, full_pdf_without_answers_url, trainer1_url, trainer2_url, trainer3_url, is_free, preview_image_url) 
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) 
                RETURNING id
                """,
                (title, description, price, category, product_type, sample_pdf_url, full_pdf_with_answers_url, full_pdf_without_answers_url, trainer1_url, trainer2_url, trainer3_url, is_free, preview_image_url)
            )
            new_id = cur.fetchone()[0]
            conn.commit()
            
            return {
                'statusCode': 201,
                'headers': headers_response,
                'body': json.dumps({'id': new_id, 'message': 'Product created'}),
                'isBase64Encoded': False
            }
        
        elif method == 'PUT':
            body_data = json.loads(event.get('body', '{}'))
            
            product_id = int(body_data.get('id'))
            title = body_data.get('title', '')
            description = body_data.get('description', '')
            price = body_data.get('price', 0) if body_data.get('price') else 0
            category = body_data.get('category', '')
            product_type = body_data.get('type', '')
            sample_pdf_url = body_data.get('sample_pdf_url') or None
            full_pdf_with_answers_url = body_data.get('full_pdf_with_answers_url') or None
            full_pdf_without_answers_url = body_data.get('full_pdf_without_answers_url') or None
            trainer1_url = body_data.get('trainer1_url') or None
            trainer2_url = body_data.get('trainer2_url') or None
            trainer3_url = body_data.get('trainer3_url') or None
            is_free = body_data.get('is_free', False)
            preview_image_url = body_data.get('preview_image_url') or None
            
            cur.execute(
                """
                UPDATE products 
                SET title = %s, description = %s, price = %s, category = %s, type = %s, 
                    sample_pdf_url = %s, full_pdf_with_answers_url = %s, full_pdf_without_answers_url = %s, 
                    trainer1_url = %s, trainer2_url = %s, trainer3_url = %s, is_free = %s, preview_image_url = %s
                WHERE id = %s
                """,
                (title, description, price, category, product_type, sample_pdf_url, full_pdf_with_answers_url, full_pdf_without_answers_url, trainer1_url, trainer2_url, trainer3_url, is_free, preview_image_url, product_id)
            )
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': headers_response,
                'body': json.dumps({'message': 'Product updated'}),
                'isBase64Encoded': False
            }
        
        elif method == 'DELETE':
            body_data = json.loads(event.get('body', '{}'))
            product_id = int(body_data.get('id'))
            
            cur.execute("DELETE FROM products WHERE id = %s", (product_id,))
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': headers_response,
                'body': json.dumps({'message': 'Product deleted'}),
                'isBase64Encoded': False
            }
        
        return {
            'statusCode': 405,
            'headers': headers_response,
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    finally:
        cur.close()
        conn.close()
