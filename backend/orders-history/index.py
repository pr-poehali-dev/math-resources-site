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
    
    cur.execute("SELECT id, guest_email, total_price, payment_status, created_at FROM t_p99209851_math_resources_site.orders ORDER BY created_at DESC")
    
    orders_rows = cur.fetchall()
    
    orders: List[Dict[str, Any]] = []
    
    for order_row in orders_rows:
        order_id = order_row[0]
        
        cur.execute(f"SELECT product_id, product_title, quantity, product_price FROM t_p99209851_math_resources_site.order_items WHERE order_id = {order_id}")
        items_rows = cur.fetchall()
        
        items = []
        for item_row in items_rows:
            items.append({
                'product_id': item_row[0],
                'product_title': item_row[1],
                'quantity': item_row[2],
                'price': item_row[3]
            })
        
        orders.append({
            'id': order_id,
            'guest_email': order_row[1],
            'total_price': order_row[2],
            'payment_status': order_row[3],
            'created_at': order_row[4].isoformat() if order_row[4] else None,
            'items': items
        })
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps(orders),
        'isBase64Encoded': False
    }