/**
 * Business: Upload image file to CDN storage
 * Args: event with multipart/form-data file upload
 * Returns: JSON with uploaded image URL
 */

interface CloudFunctionEvent {
  httpMethod: string;
  headers: Record<string, string>;
  body?: string;
  isBase64Encoded: boolean;
}

interface CloudFunctionContext {
  requestId: string;
}

export const handler = async (event: CloudFunctionEvent, context: CloudFunctionContext): Promise<any> => {
  const { httpMethod, body, isBase64Encoded } = event;

  if (httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400'
      },
      body: '',
      isBase64Encoded: false
    };
  }

  if (httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Method not allowed' }),
      isBase64Encoded: false
    };
  }

  try {
    if (!body) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'No file provided' }),
        isBase64Encoded: false
      };
    }

    const buffer = isBase64Encoded ? Buffer.from(body, 'base64') : Buffer.from(body);
    
    const uploadResponse = await fetch('https://storage-upload.poehali.dev/upload', {
      method: 'POST',
      headers: {
        'Content-Type': event.headers['content-type'] || 'application/octet-stream',
      },
      body: buffer
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.status}`);
    }

    const result = await uploadResponse.json();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ url: result.url }),
      isBase64Encoded: false
    };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Upload failed' }),
      isBase64Encoded: false
    };
  }
};
