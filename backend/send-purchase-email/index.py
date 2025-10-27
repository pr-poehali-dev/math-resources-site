'''
Business: Отправка email покупателю со ссылками на скачивание файлов
Args: event - dict с httpMethod, body (customer_email, order_id)
      context - object с request_id
Returns: HTTP response с результатом отправки письма
'''
import json
import os
import smtplib
import psycopg2
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any, List

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
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    body_str = event.get('body') or '{}'
    body_data = json.loads(body_str) if body_str else {}
    customer_email = body_data.get('customer_email')
    order_id = body_data.get('order_id')
    
    if not customer_email or not order_id:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Missing customer_email or order_id'}),
            'isBase64Encoded': False
        }
    
    dsn = os.environ.get('DATABASE_URL')
    smtp_host = os.environ.get('SMTP_HOST')
    smtp_port = int(os.environ.get('SMTP_PORT', '587'))
    smtp_user = os.environ.get('SMTP_USER')
    smtp_password = os.environ.get('SMTP_PASSWORD')
    
    if not all([dsn, smtp_host, smtp_user, smtp_password]):
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Server configuration incomplete'}),
            'isBase64Encoded': False
        }
    
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    
    cur.execute("""
        SELECT 
            oi.product_title,
            p.full_pdf_with_answers_url,
            p.full_pdf_without_answers_url
        FROM t_p99209851_math_resources_site.order_items oi
        LEFT JOIN t_p99209851_math_resources_site.products p ON p.id = oi.product_id
        WHERE oi.order_id = %s
    """, (order_id,))
    
    items = cur.fetchall()
    cur.close()
    conn.close()
    
    if not items:
        return {
            'statusCode': 404,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Order not found'}),
            'isBase64Encoded': False
        }
    
    text_body = f"Здравствуйте!\n\nВаш заказ №{order_id} готов.\n\nМатериалы для скачивания:\n\n"
    
    for item in items:
        product_title = item[0]
        url_with_answers = item[1]
        url_without_answers = item[2]
        
        text_body += f"{product_title}\n"
        if url_with_answers:
            text_body += f"С ответами: {url_with_answers}\n"
        if url_without_answers:
            text_body += f"Без ответов: {url_without_answers}\n"
        text_body += "\n"
    
    text_body += "Если возникнут вопросы, отвечайте на это письмо.\n\nС уважением"
    
    html_body = f"""
    <html>
    <head>
        <meta charset="utf-8">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
            <h2 style="color: #2563eb; margin-bottom: 20px;">Заказ №{order_id} готов</h2>
            <p style="margin-bottom: 20px;">Здравствуйте! Материалы готовы к скачиванию.</p>
            
            <div style="margin: 20px 0;">
    """
    
    for item in items:
        product_title = item[0]
        url_with_answers = item[1]
        url_without_answers = item[2]
        
        html_body += f"""
            <div style="background: #f3f4f6; padding: 15px; margin: 10px 0; border-radius: 8px;">
                <h3 style="margin-top: 0; color: #1f2937;">{product_title}</h3>
        """
        
        if url_with_answers:
            html_body += f'<p>📄 <a href="{url_with_answers}" style="color: #2563eb;">Скачать с ответами</a></p>'
        
        if url_without_answers:
            html_body += f'<p>📝 <a href="{url_without_answers}" style="color: #2563eb;">Скачать без ответов</a></p>'
        
        html_body += '</div>'
    
    html_body += """
            </div>
            <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
                Если у вас есть вопросы, просто ответьте на это письмо.
            </p>
        </div>
    </body>
    </html>
    """
    
    msg = MIMEMultipart('alternative')
    msg['Subject'] = f'Заказ №{order_id}'
    msg['From'] = smtp_user
    msg['To'] = customer_email
    msg['Reply-To'] = smtp_user
    
    msg.attach(MIMEText(text_body, 'plain', 'utf-8'))
    msg.attach(MIMEText(html_body, 'html', 'utf-8'))
    
    server = smtplib.SMTP(smtp_host, smtp_port)
    server.starttls()
    server.login(smtp_user, smtp_password)
    server.send_message(msg)
    server.quit()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'status': 'success', 'message': 'Email sent'}),
        'isBase64Encoded': False
    }