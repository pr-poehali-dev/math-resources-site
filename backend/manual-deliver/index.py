import json
import os
import psycopg2
from typing import Dict, Any
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Manually deliver products to customer by email
    Args: event with email and product_ids in query params
    Returns: HTTP response
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    body = event.get('body') or '{}'
    body_data = json.loads(body) if body else {}
    email = body_data.get('email')
    product_ids = body_data.get('product_ids', [])
    amount = body_data.get('amount', 0)
    
    if not email or not product_ids:
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Email and product_ids required'})
        }
    
    database_url = os.environ.get('DATABASE_URL')
    
    conn = psycopg2.connect(database_url)
    cur = conn.cursor()
    
    # Create order
    cur.execute(
        "INSERT INTO t_p99209851_math_resources_site.orders (guest_email, total_price, payment_id, payment_status) "
        "VALUES (%s, %s, %s, %s) RETURNING id",
        (email, amount, f'manual-{context.request_id}', 'paid')
    )
    order_id = cur.fetchone()[0]
    
    # Get products
    product_ids_str = ','.join(map(str, product_ids))
    cur.execute(
        f"SELECT id, title, full_pdf_url, full_pdf_with_answers_url FROM t_p99209851_math_resources_site.products WHERE id IN ({product_ids_str})"
    )
    products = cur.fetchall()
    
    # Create order items
    for product in products:
        cur.execute(
            "INSERT INTO t_p99209851_math_resources_site.order_items (order_id, product_id, product_title, product_price, full_pdf_url, quantity) "
            "VALUES (%s, %s, %s, %s, %s, %s)",
            (order_id, product[0], product[1], int(amount), product[2], 1)
        )
    
    conn.commit()
    
    # Send email
    smtp_host = os.environ.get('SMTP_HOST')
    smtp_port = int(os.environ.get('SMTP_PORT', 587))
    smtp_user = os.environ.get('SMTP_USER')
    smtp_password = os.environ.get('SMTP_PASSWORD')
    
    msg = MIMEMultipart('alternative')
    msg['Subject'] = 'Ваши материалы готовы!'
    msg['From'] = smtp_user
    msg['To'] = email
    
    product_lines = []
    for p in products:
        product_lines.append(f'• {p[1]}:')
        if p[2]:
            product_lines.append(f'  - Полный файл: {p[2]}')
        if p[3]:
            product_lines.append(f'  - С ответами: {p[3]}')
    
    product_links = '\n'.join(product_lines)
    
    text = f'''
Здравствуйте!

Ваш заказ №{order_id} оплачен. Вот ваши материалы:

{product_links}

Спасибо за покупку!
'''
    
    msg.attach(MIMEText(text, 'plain'))
    
    with smtplib.SMTP(smtp_host, smtp_port) as server:
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.send_message(msg)
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
        'body': json.dumps({
            'order_id': order_id,
            'products_sent': len(products),
            'email': email
        })
    }