import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { initDuckDB, runQuery } from '~/utils/duckdb';

interface DashboardData {
  byRegion: Array<{
    region: string;
    total: number;
  }>;
  byProduct: Array<{
    product: string;
    total: number;
  }>;
  dailySales: Array<{
    date: string;
    amount: number;
  }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function DuckDBClient() {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [dbInitialized, setDbInitialized] = useState<boolean>(false);
  const [initAttempts, setInitAttempts] = useState<number>(0);

  useEffect(() => {
    async function initializeDB() {
      try {
        console.log(`DuckDB初期化の試行 #${initAttempts + 1}`);
        setError(null);
        await initDuckDB();
        setDbInitialized(true);
      } catch (err) {
        console.error('DuckDB初期化エラー:', err);
        setError(
          `DuckDBの初期化に失敗しました: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    if (typeof window !== 'undefined') {
      initializeDB();
    }
  }, []);

  useEffect(() => {
    if (!dbInitialized) return;

    async function loadData() {
      setLoading(true);
      try {
        // 地域ごとの売上
        const byRegionData = await runQuery(`
          SELECT region, SUM(amount) as total
          FROM sales
          GROUP BY region
          ORDER BY total DESC
        `);

        // 製品ごとの売上
        const byProductData = await runQuery(`
          SELECT product, SUM(amount) as total
          FROM sales
          GROUP BY product
          ORDER BY total DESC
        `);

        // 日ごとの売上
        const dailySalesData = await runQuery(`
          SELECT date, SUM(amount) as amount
          FROM sales
          GROUP BY date
          ORDER BY date
        `);

        setData({
          byRegion: byRegionData.map((row) => ({
            region: row.region,
            total: Number.parseFloat(row.total),
          })),
          byProduct: byProductData.map((row) => ({
            product: row.product,
            total: Number.parseFloat(row.total),
          })),
          dailySales: dailySalesData.map((row) => ({
            date: row.date,
            amount: Number.parseFloat(row.amount),
          })),
        });
      } catch (err) {
        setError(`データの取得に失敗しました: ${err instanceof Error ? err.message : String(err)}`);
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [dbInitialized]);

  // DuckDBの初期化に失敗した場合のトラブルシューティング情報を表示
  if (error) {
    return (
      <div className='error'>
        <p>{error}</p>
        <div className='mt-4'>
          <h3>トラブルシューティング:</h3>
          <ul className='list-disc pl-5 mt-2'>
            <li>ブラウザがWebAssembly (WASM)をサポートしていることを確認してください</li>
            <li>ブラウザのコンソールでエラーメッセージを確認してください</li>
            <li>ブラウザのキャッシュをクリアしてみてください</li>
            <li>Chrome/Edgeなどの最新ブラウザを使用してください</li>
            <li>プライベートブラウジングモードを無効にしてください</li>
            <li>サードパーティCookieの制限を一時的に解除してみてください</li>
          </ul>
        </div>
        <div className='mt-4 p-4 bg-yellow-100 border-l-4 border-yellow-500'>
          <p className='font-bold'>技術的な情報:</p>
          <p className='text-sm mt-1'>
            DuckDB-WASMはシェアードメモリとCross-Origin Isolationを必要とします。
            これらの機能はブラウザのセキュリティ設定によって制限されている可能性があります。
          </p>
        </div>
        <button
          className='mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'
          onClick={() => {
            setError(null);
            setInitAttempts(0);
          }}
        >
          再試行
        </button>
      </div>
    );
  }

  if (loading) {
    return <div className='loading'>データを読み込み中...</div>;
  }

  return (
    <div className='dashboard'>
      <h2>売上ダッシュボード</h2>

      <div className='chart-container'>
        <div className='chart'>
          <h3>日別売上</h3>
          <div className='w-full overflow-x-auto'>
            <BarChart width={500} height={300} data={data?.dailySales}>
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis dataKey='date' />
              <YAxis />
              <Tooltip formatter={(value) => [`¥${value.toLocaleString()}`, '売上']} />
              <Legend />
              <Bar dataKey='amount' fill='#3498db' name='売上' />
            </BarChart>
          </div>
        </div>

        <div className='chart-row'>
          <div className='chart'>
            <h3>地域別売上</h3>
            <PieChart width={300} height={300}>
              <Pie
                data={data?.byRegion}
                cx={150}
                cy={150}
                labelLine={true}
                outerRadius={100}
                fill='#8884d8'
                dataKey='total'
                nameKey='region'
                label={({ region, total }) => `${region}: ¥${total.toLocaleString()}`}
              >
                {data?.byRegion.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `¥${value.toLocaleString()}`} />
            </PieChart>
          </div>

          <div className='chart'>
            <h3>製品別売上</h3>
            <PieChart width={300} height={300}>
              <Pie
                data={data?.byProduct}
                cx={150}
                cy={150}
                labelLine={true}
                outerRadius={100}
                fill='#8884d8'
                dataKey='total'
                nameKey='product'
                label={({ product, total }) => `${product}: ¥${total.toLocaleString()}`}
              >
                {data?.byProduct.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `¥${value.toLocaleString()}`} />
            </PieChart>
          </div>
        </div>
      </div>
    </div>
  );
}
