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

  useEffect(() => {
    async function initializeDB() {
      try {
        await initDuckDB();
        setDbInitialized(true);
      } catch (err) {
        setError('DuckDBの初期化に失敗しました');
        console.error(err);
      }
    }

    initializeDB();
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
        setError('データの取得に失敗しました');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [dbInitialized]);

  if (error) {
    return <div className='error'>{error}</div>;
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
                {data?.byRegion.map((entry, index) => (
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
                {data?.byProduct.map((entry, index) => (
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
