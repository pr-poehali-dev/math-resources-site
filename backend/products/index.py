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
                    'headers': headers,
                    'body': json.dumps(stats),
                    'isBase64Encoded': False
                }
            
            if product_id:
                query = f"SELECT id, title, description, price, category, type, sample_pdf_url, full_pdf_with_answers_url, full_pdf_without_answers_url, trainer1_url, trainer2_url, trainer3_url, is_free, preview_image_url FROM products WHERE id = {int(product_id)}"
                cur.execute(query)
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
                    'headers': headers,
                    'body': json.dumps(products),
                    'isBase64Encoded': False
                }
        
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            
            def safe_str(val):
                if val is None or val == '' or (isinstance(val, str) and val.strip() == ''):
                    return 'NULL'
                escaped = str(val).replace("'", "''")
                return f"'{escaped}'"
            
            title = body_data.get('title', '')
            description = body_data.get('description', '')
            price = body_data.get('price', 0) if body_data.get('price') else 0
            category = body_data.get('category', '')
            product_type = body_data.get('type', '')
            sample_pdf_url = body_data.get('sample_pdf_url', '')
            full_pdf_with_answers_url = body_data.get('full_pdf_with_answers_url', '')
            full_pdf_without_answers_url = body_data.get('full_pdf_without_answers_url', '')
            trainer1_url = body_data.get('trainer1_url', '')
            trainer2_url = body_data.get('trainer2_url', '')
            trainer3_url = body_data.get('trainer3_url', '')
            is_free = body_data.get('is_free', False)
            preview_image_url = body_data.get('preview_image_url', '')
            
            query = f"""
                INSERT INTO products (title, description, price, category, type, sample_pdf_url, full_pdf_with_answers_url, full_pdf_without_answers_url, trainer1_url, trainer2_url, trainer3_url, is_free, preview_image_url) 
                VALUES ({safe_str(title)}, {safe_str(description)}, {price}, {safe_str(category)}, {safe_str(product_type)}, {safe_str(sample_pdf_url)}, {safe_str(full_pdf_with_answers_url)}, {safe_str(full_pdf_without_answers_url)}, {safe_str(trainer1_url)}, {safe_str(trainer2_url)}, {safe_str(trainer3_url)}, {is_free}, {safe_str(preview_image_url)}) 
                RETURNING id
            """
            cur.execute(query)
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
            
            def safe_str(val):
                if val is None or val == '' or (isinstance(val, str) and val.strip() == ''):
                    return 'NULL'
                escaped = str(val).replace("'", "''")
                return f"'{escaped}'"
            
            product_id = int(body_data.get('id'))
            title = body_data.get('title', '')
            description = body_data.get('description', '')
            price = body_data.get('price', 0) if body_data.get('price') else 0
            category = body_data.get('category', '')
            product_type = body_data.get('type', '')
            sample_pdf_url = body_data.get('sample_pdf_url', '')
            full_pdf_with_answers_url = body_data.get('full_pdf_with_answers_url', '')
            full_pdf_without_answers_url = body_data.get('full_pdf_without_answers_url', '')
            trainer1_url = body_data.get('trainer1_url', '')
            trainer2_url = body_data.get('trainer2_url', '')
            trainer3_url = body_data.get('trainer3_url', '')
            is_free = body_data.get('is_free', False)
            preview_image_url = body_data.get('preview_image_url', '')
            
            query = f"""
                UPDATE products 
                SET title = {safe_str(title)}, description = {safe_str(description)}, price = {price}, category = {safe_str(category)}, type = {safe_str(product_type)}, 
                    sample_pdf_url = {safe_str(sample_pdf_url)}, full_pdf_with_answers_url = {safe_str(full_pdf_with_answers_url)}, 
                    full_pdf_without_answers_url = {safe_str(full_pdf_without_answers_url)}, trainer1_url = {safe_str(trainer1_url)}, 
                    trainer2_url = {safe_str(trainer2_url)}, trainer3_url = {safe_str(trainer3_url)}, is_free = {is_free}, 
                    preview_image_url = {safe_str(preview_image_url)}, updated_at = CURRENT_TIMESTAMP 
                WHERE id = {product_id}
            """
            cur.execute(query)
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'message': 'Product updated'}),
                'isBase64Encoded': False
            }
        
        elif method == 'DELETE':
            body_data = json.loads(event.get('body', '{}'))
            product_id = int(body_data.get('id'))
            
            query = f"DELETE FROM products WHERE id = {product_id}"
            cur.execute(query)
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