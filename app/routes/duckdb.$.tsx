import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { LoaderFunctionArgs } from '@remix-run/node';

/**
 * DuckDBのWASMファイルを直接提供するためのルート
 * パターン: /duckdb/[ファイル名]
 */
export async function loader({ params, request }: LoaderFunctionArgs) {
  const fileId = params['*'];

  if (!fileId) {
    return new Response('File not found', { status: 404 });
  }

  // ファイルパスの構築
  const filePath = join(process.cwd(), 'public', 'duckdb', fileId);
  console.log(`Serving DuckDB file: ${filePath}`);

  try {
    // ファイルを読み込む
    const fileContent = await readFile(filePath);

    // ファイルの種類に基づいてContent-Typeを設定
    let contentType = 'application/octet-stream';
    if (fileId.endsWith('.wasm')) {
      contentType = 'application/wasm';
    } else if (fileId.endsWith('.js')) {
      contentType = 'application/javascript';
    } else if (fileId.endsWith('.worker.js')) {
      contentType = 'application/javascript';
    } else if (fileId.endsWith('.map')) {
      contentType = 'application/json';
    }

    // CORSとキャッシュヘッダーを設定
    return new Response(fileContent, {
      headers: {
        'Content-Type': contentType,
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'Cache-Control': 'public, max-age=31536000',
        'Content-Security-Policy':
          "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; connect-src 'self' blob:;",
      },
    });
  } catch (error) {
    console.error(`Error serving DuckDB file: ${error}`);
    return new Response('File not found or error reading file', { status: 404 });
  }
}

export default function DuckdbFile() {
  return null;
}
