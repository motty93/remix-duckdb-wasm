import type { MetaFunction } from '@remix-run/node';
import { ClientOnly } from '~/components/ClientOnly';
import DuckDBClient from '~/components/DuckDBClient';

export const meta: MetaFunction = () => {
  return [{ title: 'New Remix App' }, { name: 'description', content: 'Welcome to Remix!' }];
};

export default function Index() {
  return (
    <div className='container'>
      <h1>DuckDB-Wasm Dashboard</h1>
      <ClientOnly fallback={<div>読み込み中...</div>}>{() => <DuckDBClient />}</ClientOnly>
    </div>
  );
}
