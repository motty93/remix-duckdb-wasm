import type { MetaFunction } from '@remix-run/node';
import { ClientOnly } from '~/components/ClientOnly';
import DuckDBClientWrapper from '~/components/DuckDBClientWrapper';

export const meta: MetaFunction = () => {
  return [
    { title: 'DuckDB-Wasm Dashboard' },
    { name: 'description', content: 'WebAssemblyで動作するDuckDBダッシュボード' },
  ];
};

export default function Index() {
  return (
    <div className='container'>
      <h1>DuckDB-Wasm Dashboard</h1>
      <ClientOnly fallback={<div className='p-8 text-center'>読み込み中...</div>}>
        {() => <DuckDBClientWrapper />}
      </ClientOnly>
    </div>
  );
}
