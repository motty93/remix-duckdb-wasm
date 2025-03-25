import fs from 'node:fs';
import path from 'node:path';
import type { LoaderFunctionArgs } from '@remix-run/node';

/**
 * 静的ファイルを直接提供するためのルート
 */
export async function loader({ params }: LoaderFunctionArgs) {
  const filePath = params['*'] || '';
  const fullPath = path.join(process.cwd(), 'public', filePath);

  try {
    // ファイルが存在するか確認
    if (!fs.existsSync(fullPath)) {
      console.error(`File not found: ${fullPath}`);
      return new Response('File not found', { status: 404 });
    }

    // Content-Typeを設定
    const contentType = getContentType(fullPath);
    const fileContent = fs.readFileSync(fullPath);

    // レスポンスを返す
    return new Response(fileContent, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      },
    });
  } catch (error) {
    console.error(`Error serving static file: ${error}`);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// Content-Typeを取得
function getContentType(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();

  const contentTypeMap: Record<string, string> = {
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.wasm': 'application/wasm',
    '.map': 'application/json',
    '.json': 'application/json',
    '.html': 'text/html',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
  };

  return contentTypeMap[extension] || 'application/octet-stream';
}

// ページコンポーネントは不要
export default function StaticRoute() {
  return null;
}
