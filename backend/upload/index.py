import json
import os
import base64
import uuid
import boto3
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Загрузка PDF-файлов в S3 хранилище для образцов материалов
    Args: event с httpMethod, body (base64); context с request_id
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
        body_data = json.loads(event.get('body', '{}'))
        file_content = body_data.get('file')
        filename = body_data.get('filename', 'sample.pdf')
        
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
        
        file_key = f'math-samples/{uuid.uuid4()}-{filename}'
        
        s3_client.put_object(
            Bucket=s3_bucket,
            Key=file_key,
            Body=file_bytes,
            ContentType='application/pdf'
        )
        
        file_url = f'{s3_endpoint}/{s3_bucket}/{file_key}'
        
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
