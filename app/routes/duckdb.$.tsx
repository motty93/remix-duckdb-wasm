import type { LoaderFunctionArgs } from '@remix-run/node';
import { redirect } from '@remix-run/node';

/**
 * DuckDBのWASMファイルリクエストを処理するためのルーター
 * これにより、WASMファイルとそのソースマップファイルを正しく提供できます
 */
export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  // URLからパスを取得
  const url = new URL(request.url);
  const path = params['*'] || '';

  // DuckDBのWASMファイルやワーカーファイルであれば、/public/duckdb/にリダイレクト
  if (path.endsWith('.wasm') || path.endsWith('.worker.js') || path.endsWith('.map')) {
    return redirect(`/duckdb/${path}`);
  }

  // それ以外は404
  throw new Response('Not Found', { status: 404 });
};

// ページコンポーネント（通常は表示されない）
export default function DuckdbRoute() {
  return (
    <div>
      <h1>DuckDB Resource</h1>
      <p>This route handles DuckDB WASM resources.</p>
    </div>
  );
}
