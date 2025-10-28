'''
Business: Получение списка покупок пользователя по email
Args: event - dict с httpMethod, queryStringParameters (email)
      context - object с request_id
Returns: HTTP response со списком заказов и товаров
'''
import json
import os
import psycopg2
from typing import Dict, Any, List

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
    
    if method != 'GET':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    params = event.get('queryStringParameters', {})
    email = params.get('email')
    
    if not email:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Email is required'}),
            'isBase64Encoded': False
        }
    
    dsn = os.environ.get('DATABASE_URL')
    
    if not dsn:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Database not configured'}),
            'isBase64Encoded': False
        }
    
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    
    cur.execute("""
        SELECT 
            oi.id,
            oi.product_id,
            oi.product_title,
            oi.product_price,
            p.full_pdf_with_answers_url,
            p.full_pdf_without_answers_url,
            o.created_at
        FROM t_p99209851_math_resources_site.orders o
        JOIN t_p99209851_math_resources_site.order_items oi ON oi.order_id = o.id
        LEFT JOIN t_p99209851_math_resources_site.products p ON p.id = oi.product_id
        WHERE o.guest_email = %s AND o.payment_status = 'paid'
        ORDER BY o.created_at DESC
    """, (email,))
    
    rows = cur.fetchall()
    
    purchases: List[Dict[str, Any]] = []
    for row in rows:
        purchases.append({
            'id': row[0],
            'product_id': row[1],
            'product_title': row[2],
            'product_price': row[3],
            'full_pdf_with_answers_url': row[4] or '',
            'full_pdf_without_answers_url': row[5] or '',
            'created_at': row[6].isoformat() if row[6] else ''
        })
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'purchases': purchases}),
        'isBase64Encoded': False
    }