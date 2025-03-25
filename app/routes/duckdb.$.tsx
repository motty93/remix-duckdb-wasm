import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { LoaderFunctionArgs } from '@remix-run/node';

/**
 * DuckDB WASMファイルを直接提供するルート
 */
export async function loader({ params, request }: LoaderFunctionArgs) {
  const fileParam = params['*'] || '';
  const publicPath = path.join(process.cwd(), 'public', 'duckdb', fileParam);

  try {
    // ファイルの存在確認
    try {
      await fs.access(publicPath);
    } catch (error) {
      console.error(`File not found: ${publicPath}`);
      return new Response(`File not found: /duckdb/${fileParam}`, { status: 404 });
    }

    // ファイルの読み込み
    const file = await fs.readFile(publicPath);

    // Content-Typeの設定
    const contentType = getContentType(fileParam);

    // レスポンスヘッダー
    const headers = {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; connect-src 'self' blob:;",
    };

    return new Response(file, { headers });
  } catch (error) {
    console.error('Error serving DuckDB file:', error);
    return new Response('Error serving file', { status: 500 });
  }
}

// ファイル拡張子に基づいてContent-Typeを設定
function getContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const contentTypes: Record<string, string> = {
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.wasm': 'application/wasm',
    '.map': 'application/json',
    '.worker.js': 'application/javascript',
    '.pthread.worker.js': 'application/javascript',
  };

  // worker.js ファイルの特殊処理
  if (filename.endsWith('.worker.js')) {
    return 'application/javascript';
  }

  if (filename.endsWith('.pthread.worker.js')) {
    return 'application/javascript';
  }

  return contentTypes[ext] || 'application/octet-stream';
}

// コンポーネントは空
export default function DuckDBFile() {
  return null;
}
