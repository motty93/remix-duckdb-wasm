import type { HeadersFunction } from '@remix-run/node';

/**
 * DuckDBのWASMファイルへのエントリポイント
 * このルートはDuckDBのCross-Origin Isolationに必要なヘッダーを設定します
 */
export const loader = () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    },
  });
};

export const headers: HeadersFunction = () => {
  return {
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; connect-src 'self' blob:;",
  };
};

export default function DuckdbPage() {
  return (
    <div className='p-8'>
      <h1 className='text-2xl font-bold mb-4'>DuckDB WebAssembly Support</h1>
      <p className='mb-4'>
        このページはDuckDB WebAssemblyが正しく動作するために必要なヘッダーを設定しています。
      </p>
      <div className='p-4 bg-blue-100 border-l-4 border-blue-500'>
        <h2 className='font-bold mb-2'>技術情報:</h2>
        <p>DuckDB-WASMは以下のヘッダーを必要とします：</p>
        <ul className='list-disc ml-6 mt-2'>
          <li>Cross-Origin-Embedder-Policy: require-corp</li>
          <li>Cross-Origin-Opener-Policy: same-origin</li>
          <li>Cross-Origin-Resource-Policy: cross-origin</li>
        </ul>
      </div>
    </div>
  );
}
