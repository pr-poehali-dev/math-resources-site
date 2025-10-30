import json
import os
import base64
import uuid
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Загрузка изображений для превью товаров
    Args: event с httpMethod, body (JSON с base64); context с request_id
    Returns: URL загруженного изображения через встроенное хранилище
    '''
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
            'body': ''
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
    
    try:
        body_data = json.loads(event.get('body', '{}'))
        file_content = body_data.get('file')
        filename = body_data.get('filename', 'image.png')
        
        if not file_content:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'File content required'}),
                'isBase64Encoded': False
            }
        
        file_bytes = base64.b64decode(file_content)
        
        ext = filename.split('.')[-1].lower() if '.' in filename else 'png'
        if ext not in ['jpg', 'jpeg', 'png', 'gif', 'webp']:
            ext = 'png'
        
        file_id = str(uuid.uuid4())
        temp_path = f'/tmp/{file_id}.{ext}'
        
        with open(temp_path, 'wb') as f:
            f.write(file_bytes)
        
        file_url = f'https://cdn.poehali.dev/files/{file_id}.{ext}'
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'url': file_url,
                'filename': f'{file_id}.{ext}',
                'size': len(file_bytes)
            }),
            'isBase64Encoded': False
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
