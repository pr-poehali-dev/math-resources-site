import json
import os
import base64
import uuid
import boto3
from typing import Dict, Any
from urllib.parse import parse_qs

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Загрузка файлов (PDF, изображений) в S3 хранилище
    Args: event с httpMethod, body (base64 или multipart); context с request_id
    Returns: URL загруженного файла
    '''
    method: str = event.get('httpMethod', 'POST')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
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
        content_type = event.get('headers', {}).get('content-type', '') or event.get('headers', {}).get('Content-Type', '')
        
        if 'multipart/form-data' in content_type:
            body = event.get('body', '')
            is_base64 = event.get('isBase64Encoded', False)
            
            if is_base64:
                body = base64.b64decode(body)
            else:
                body = body.encode('utf-8') if isinstance(body, str) else body
            
            boundary = content_type.split('boundary=')[1].encode()
            parts = body.split(b'--' + boundary)
            
            file_bytes = None
            filename = 'file'
            content_type_file = 'application/octet-stream'
            
            for part in parts:
                if b'Content-Disposition' in part:
                    headers_end = part.find(b'\r\n\r\n')
                    if headers_end > 0:
                        part_headers = part[:headers_end].decode('utf-8', errors='ignore')
                        part_body = part[headers_end + 4:]
                        
                        if b'\r\n--' in part_body:
                            part_body = part_body[:part_body.rfind(b'\r\n--')]
                        
                        if 'filename=' in part_headers:
                            filename_start = part_headers.find('filename="') + 10
                            filename_end = part_headers.find('"', filename_start)
                            filename = part_headers[filename_start:filename_end]
                            
                            if 'Content-Type:' in part_headers:
                                ct_start = part_headers.find('Content-Type:') + 13
                                ct_end = part_headers.find('\r\n', ct_start)
                                content_type_file = part_headers[ct_start:ct_end].strip()
                            
                            file_bytes = part_body
                            break
            
            if not file_bytes:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': 'No file found in request'}),
                    'isBase64Encoded': False
                }
        else:
            body_data = json.loads(event.get('body', '{}'))
            file_content = body_data.get('file')
            filename = body_data.get('filename', 'file')
            content_type_file = 'application/pdf'
            
            if not file_content:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': 'File content required'}),
                    'isBase64Encoded': False
                }
            
            file_bytes = base64.b64decode(file_content)
        
        s3_bucket = os.environ.get('S3_BUCKET', 'poehali-user-files')
        s3_region = os.environ.get('S3_REGION', 'ru-central1')
        s3_endpoint = os.environ.get('S3_ENDPOINT', 'https://storage.yandexcloud.net')
        
        s3_client = boto3.client(
            's3',
            endpoint_url=s3_endpoint,
            region_name=s3_region,
            aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY')
        )
        
        ext = filename.split('.')[-1] if '.' in filename else 'bin'
        file_key = f'files/{uuid.uuid4()}.{ext}'
        
        s3_client.put_object(
            Bucket=s3_bucket,
            Key=file_key,
            Body=file_bytes,
            ContentType=content_type_file
        )
        
        file_url = f'https://cdn.poehali.dev/{file_key}'
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'url': file_url}),
            'isBase64Encoded': False
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
