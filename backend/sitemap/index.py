'''
Business: Генерация sitemap.xml для поисковых систем со всеми товарами
Args: event - dict с httpMethod
      context - object с request_id
Returns: XML карта сайта со списком всех страниц
'''
import json
import os
import psycopg2
from typing import Dict, Any
from datetime import datetime

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
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    dsn = os.environ.get('DATABASE_URL')
    
    if not dsn:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Database not configured'}),
            'isBase64Encoded': False
        }
    
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    
    cur.execute(
        "SELECT id, title, category, created_at FROM t_p99209851_math_resources_site.products ORDER BY id"
    )
    products = cur.fetchall()
    
    cur.close()
    conn.close()
    
    base_url = 'https://p99209851.poehali.app'
    today = datetime.now().strftime('%Y-%m-%d')
    
    sitemap_xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    sitemap_xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    
    sitemap_xml += f'''  <url>
    <loc>{base_url}/</loc>
    <lastmod>{today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
'''
    
    for product in products:
        product_id, title, category, created_at = product
        lastmod = created_at.strftime('%Y-%m-%d') if created_at else today
        
        sitemap_xml += f'''  <url>
    <loc>{base_url}/?product={product_id}</loc>
    <lastmod>{lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
'''
    
    sitemap_xml += '</urlset>'
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/xml',
            'Access-Control-Allow-Origin': '*'
        },
        'body': sitemap_xml,
        'isBase64Encoded': False
    }
