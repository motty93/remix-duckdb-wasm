import type { MetaFunction } from '@remix-run/node';
import { ClientOnly } from '~/components/ClientOnly';
import DuckDBClient from '~/components/DuckDBClient';

export const meta: MetaFunction = () => {
  return [
    { title: 'DuckDB-Wasm Dashboard' },
    { name: 'description', content: 'WebAssemblyで動作するDuckDBダッシュボード' },
  ];
};

// avoid severside js
export const clientLoader = true;
export const clientAction = true;

export default function Index() {
  return (
    <div className='container'>
      <h1>DuckDB-Wasm Dashboard</h1>
      <ClientOnly fallback={<div className='p-8 text-center'>読み込み中...</div>}>
        {() => <DuckDBClient />}
      </ClientOnly>
    </div>
  );
}
