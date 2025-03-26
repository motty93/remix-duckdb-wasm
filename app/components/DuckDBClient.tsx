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

// 値を安全に取得する関数
function safeExtract(obj: any, key: string): any {
  if (obj == null) return null;

  // プロキシオブジェクトから値を直接取得
  try {
    // 直接アクセスを試みる
    const value = obj[key];
    console.log(`Extracting ${key} from:`, obj, 'Value:', value);

    // Uint32Arrayの処理
    if (value && value.constructor && value.constructor.name === 'Uint32Array') {
      console.log(`Converting Uint32Array to number for ${key}:`, value);
      return value[0];
    }

    // 日付値の処理（タイムスタンプかどうかを判断）
    if (key === 'date' && typeof value === 'number') {
      // ミリ秒単位のJavaScriptタイムスタンプに変換
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0]; // YYYY-MM-DD形式に変換
      }
    }

    return value;
  } catch (error) {
    console.error(`Error extracting ${key} from object:`, error);
    return null;
  }
}

export default function DuckDBClient() {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [dbInitialized, setDbInitialized] = useState<boolean>(false);
  const [initAttempts, setInitAttempts] = useState<number>(0);
  const [rawData, setRawData] = useState<any>(null);

  useEffect(() => {
    async function initializeDB() {
      try {
        console.log(`DuckDB初期化の試行 #${initAttempts + 1}`);
        setError(null);

        // ブラウザ環境の確認
        if (typeof window === 'undefined') {
          throw new Error('Browser environment not available');
        }

        console.log('Browser environment confirmed, initializing DuckDB...');
        await initDuckDB();
        console.log('DuckDB initialized successfully!');
        setDbInitialized(true);
      } catch (err) {
        console.error('DuckDB初期化エラー:', err);
        let errorMessage = err instanceof Error ? err.message : String(err);

        if (errorMessage.includes('Failed to parse URL')) {
          errorMessage +=
            ' - DuckDBのWASMファイルのパスが正しくありません。パスを確認してください。';
        }

        setError(`DuckDBの初期化に失敗しました: ${errorMessage}`);
      }
    }

    // ブラウザ環境でのみ実行
    initializeDB();
  }, [initAttempts]);

  useEffect(() => {
    if (!dbInitialized) return;

    async function loadData() {
      setLoading(true);
      try {
        // 地域ごとの売上
        const byRegionData = await runQuery(`
          SELECT region, CAST(SUM(amount) AS DOUBLE) as total
          FROM sales
          GROUP BY region
          ORDER BY total DESC
        `);

        // 製品ごとの売上
        const byProductData = await runQuery(`
          SELECT product, CAST(SUM(amount) AS DOUBLE) as total
          FROM sales
          GROUP BY product
          ORDER BY total DESC
        `);

        // 日ごとの売上 - SQL内でフォーマットを調整
        const dailySalesData = await runQuery(`
          SELECT 
            date, 
            CAST(SUM(amount) AS DOUBLE) as amount
          FROM sales
          GROUP BY date
          ORDER BY date
        `);

        // 生データを保存（デバッグ用）
        setRawData({
          byRegionData,
          byProductData,
          dailySalesData,
        });

        // 結果をログ出力して確認
        console.log('Region data (raw):', byRegionData);

        // データの直接検査
        if (byRegionData && byRegionData.length > 0) {
          const sample = byRegionData[0];
          console.log('Sample region row:', sample);
          console.log('Keys:', Object.keys(sample));
          console.log('Region value:', sample.region);
          console.log('Total value:', sample.total);

          // プロパティのディスクリプタをチェック
          const descriptors = Object.getOwnPropertyDescriptors(sample);
          console.log('Property descriptors:', descriptors);
        }

        // データを平坦化して変換
        const byRegion = byRegionData.map((row, index) => {
          console.log(`Processing region row ${index}:`, row);
          const region = safeExtract(row, 'region');
          const total = safeExtract(row, 'total');

          return {
            region: String(region || ''),
            total:
              typeof total === 'number'
                ? total
                : typeof total === 'string'
                  ? Number.parseFloat(total)
                  : 0,
          };
        });

        const byProduct = byProductData.map((row, index) => {
          console.log(`Processing product row ${index}:`, row);
          const product = safeExtract(row, 'product');
          const total = safeExtract(row, 'total');

          return {
            product: String(product || ''),
            total:
              typeof total === 'number'
                ? total
                : typeof total === 'string'
                  ? Number.parseFloat(total)
                  : 0,
          };
        });

        const dailySales = dailySalesData.map((row, index) => {
          console.log(`Processing date row ${index}:`, row);
          const date = safeExtract(row, 'date');
          const amount = safeExtract(row, 'amount');

          return {
            date: String(date || ''),
            amount:
              typeof amount === 'number'
                ? amount
                : typeof amount === 'string'
                  ? Number.parseFloat(amount)
                  : 0,
          };
        });

        console.log('Converted data:', { byRegion, byProduct, dailySales });

        // データをセット
        setData({
          byRegion,
          byProduct,
          dailySales,
        });
      } catch (err) {
        setError(`データの取得に失敗しました: ${err instanceof Error ? err.message : String(err)}`);
        console.error('Data loading error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [dbInitialized]);

  const showDebugInfo = () => {
    if (rawData) {
      console.log('Raw data from DuckDB:', rawData);
      alert('デバッグ情報がコンソールに出力されました。ブラウザの開発者ツールを確認してください。');
    } else {
      alert('データがまだ読み込まれていません。');
    }
  };

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
            setInitAttempts(initAttempts + 1);
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

      {/* デバッグボタン */}
      <div className='mb-4'>
        <button
          className='px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm'
          onClick={showDebugInfo}
        >
          デバッグ情報を表示
        </button>
      </div>

      <div className='chart-container'>
        <div className='chart'>
          <h3>日別売上</h3>
          <div className='w-full overflow-x-auto'>
            <BarChart width={500} height={300} data={data?.dailySales || []}>
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
                data={data?.byRegion || []}
                cx={150}
                cy={150}
                labelLine={true}
                outerRadius={100}
                fill='#8884d8'
                dataKey='total'
                nameKey='region'
                label={({ region, total }) => `${region}: ¥${total.toLocaleString()}`}
              >
                {(data?.byRegion || []).map((_, index) => (
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
                data={data?.byProduct || []}
                cx={150}
                cy={150}
                labelLine={true}
                outerRadius={100}
                fill='#8884d8'
                dataKey='total'
                nameKey='product'
                label={({ product, total }) => `${product}: ¥${total.toLocaleString()}`}
              >
                {(data?.byProduct || []).map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `¥${value.toLocaleString()}`} />
            </PieChart>
          </div>
        </div>
      </div>

      {/* デバッグ表示 */}
      {data && (
        <div className='mt-8 border-t pt-4'>
          <h3 className='text-lg font-medium mb-2'>デバッグ情報</h3>
          <div className='bg-gray-100 p-4 rounded overflow-auto max-h-60'>
            <pre className='text-xs'>{JSON.stringify(data, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
