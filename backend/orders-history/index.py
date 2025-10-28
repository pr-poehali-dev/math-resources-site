'''
Business: Получение истории всех заказов с деталями товаров для админки
Args: event - dict с httpMethod
      context - объект с атрибутами request_id, function_name
Returns: HTTP response с массивом заказов и информацией о товарах
'''
import json
import os
import psycopg2
from typing import Dict, Any, List
from collections import defaultdict

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
            o.id,
            o.guest_email,
            o.total_price,
            o.payment_status,
            o.created_at,
            oi.product_id,
            p.title,
            oi.quantity,
            oi.price
        FROM t_p99209851_math_resources_site.orders o
        LEFT JOIN t_p99209851_math_resources_site.order_items oi ON oi.order_id = o.id
        LEFT JOIN t_p99209851_math_resources_site.products p ON p.id = oi.product_id
        ORDER BY o.created_at DESC
    """)
    
    rows = cur.fetchall()
    
    orders_dict: Dict[int, Dict[str, Any]] = {}
    
    for row in rows:
        order_id = row[0]
        
        if order_id not in orders_dict:
            orders_dict[order_id] = {
                'id': order_id,
                'guest_email': row[1],
                'total_price': row[2],
                'payment_status': row[3],
                'created_at': row[4].isoformat() if row[4] else None,
                'items': []
            }
        
        if row[5] is not None:
            orders_dict[order_id]['items'].append({
                'product_id': row[5],
                'product_title': row[6],
                'quantity': row[7],
                'price': row[8]
            })
    
    orders: List[Dict[str, Any]] = list(orders_dict.values())
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps(orders),
        'isBase64Encoded': False
    }
