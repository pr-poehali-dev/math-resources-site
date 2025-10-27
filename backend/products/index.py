import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: API для управления товарами (получение, добавление, обновление, удаление)
    Args: event с httpMethod, body, pathParams; context с request_id
    Returns: HTTP response с JSON данными
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    }
    
    try:
        if method == 'GET':
            product_id = event.get('queryStringParameters', {}).get('id')
            
            if product_id:
                cur.execute('SELECT id, title, description, price, category, type, sample_pdf_url, full_pdf_with_answers_url, full_pdf_without_answers_url FROM products WHERE id = %s', (product_id,))
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
                        'full_pdf_without_answers_url': row[8]
                    }
                    return {
                        'statusCode': 200,
                        'headers': headers,
                        'body': json.dumps(product),
                        'isBase64Encoded': False
                    }
                else:
                    return {
                        'statusCode': 404,
                        'headers': headers,
                        'body': json.dumps({'error': 'Product not found'}),
                        'isBase64Encoded': False
                    }
            else:
                cur.execute('SELECT id, title, description, price, category, type, sample_pdf_url, full_pdf_with_answers_url, full_pdf_without_answers_url FROM products ORDER BY id')
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
                        'full_pdf_without_answers_url': row[8]
                    }
                    for row in rows
                ]
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps(products),
                    'isBase64Encoded': False
                }
        
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            title = body_data.get('title')
            description = body_data.get('description')
            price = body_data.get('price')
            category = body_data.get('category')
            product_type = body_data.get('type')
            sample_pdf_url = body_data.get('sample_pdf_url')
            full_pdf_with_answers_url = body_data.get('full_pdf_with_answers_url')
            full_pdf_without_answers_url = body_data.get('full_pdf_without_answers_url')
            
            cur.execute(
                'INSERT INTO products (title, description, price, category, type, sample_pdf_url, full_pdf_with_answers_url, full_pdf_without_answers_url) VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id',
                (title, description, price, category, product_type, sample_pdf_url, full_pdf_with_answers_url, full_pdf_without_answers_url)
            )
            new_id = cur.fetchone()[0]
            conn.commit()
            
            return {
                'statusCode': 201,
                'headers': headers,
                'body': json.dumps({'id': new_id, 'message': 'Product created'}),
                'isBase64Encoded': False
            }
        
        elif method == 'PUT':
            body_data = json.loads(event.get('body', '{}'))
            product_id = body_data.get('id')
            title = body_data.get('title')
            description = body_data.get('description')
            price = body_data.get('price')
            category = body_data.get('category')
            product_type = body_data.get('type')
            sample_pdf_url = body_data.get('sample_pdf_url')
            full_pdf_with_answers_url = body_data.get('full_pdf_with_answers_url')
            full_pdf_without_answers_url = body_data.get('full_pdf_without_answers_url')
            
            cur.execute(
                'UPDATE products SET title = %s, description = %s, price = %s, category = %s, type = %s, sample_pdf_url = %s, full_pdf_with_answers_url = %s, full_pdf_without_answers_url = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s',
                (title, description, price, category, product_type, sample_pdf_url, full_pdf_with_answers_url, full_pdf_without_answers_url, product_id)
            )
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'message': 'Product updated'}),
                'isBase64Encoded': False
            }
        
        elif method == 'DELETE':
            body_data = json.loads(event.get('body', '{}'))
            product_id = body_data.get('id')
            
            cur.execute('DELETE FROM products WHERE id = %s', (product_id,))
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'message': 'Product deleted'}),
                'isBase64Encoded': False
            }
        
        return {
            'statusCode': 405,
            'headers': headers,
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    finally:
        cur.close()
        conn.close()