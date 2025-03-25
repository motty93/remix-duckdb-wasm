import type { LoaderFunctionArgs } from '@remix-run/node';

/**
 * DuckDBのWASMファイルなどの静的ファイルにアクセスするためのルート
 * viteでは/public以下のファイルにアクセス可能
 */
export async function loader({ params }: LoaderFunctionArgs) {
  const pathParam = params['*'] || '';
  const staticFilePath = `/${pathParam}`;

  console.log(`Static file request for: ${staticFilePath}`);

  // 静的ファイルへのレスポンスを返す
  return new Response(null, {
    status: 307,
    headers: {
      Location: staticFilePath,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    },
  });
}

// ページコンポーネントは不要（静的ファイルを処理するだけのルート）
export default function DuckdbRoute() {
  return null;
}
