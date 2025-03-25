import type {
  AsyncDuckDB,
  AsyncDuckDBConnection,
  ConsoleLogger,
  DuckDBBundles,
  QueryResult,
} from '@duckdb/duckdb-wasm';

// サーバーサイドとクライアントサイドを識別する
const isServer = typeof window === 'undefined';
const isClient = !isServer;

// 必要なDuckDBモジュールの型定義
interface DuckDBModule {
  AsyncDuckDB: new (logger: ConsoleLogger, worker: Worker) => AsyncDuckDB;
  ConsoleLogger: new () => ConsoleLogger;
  createWorker: (url: string) => Promise<Worker>;
}

// クライアントサイドでのみ使用するモジュール参照
let duckdbModule: DuckDBModule | null = null;
let db: AsyncDuckDB | null = null;
let dbInitPromise: Promise<AsyncDuckDB> | null = null;

// クライアントサイドでのみモジュールを読み込む
if (isClient) {
  import('@duckdb/duckdb-wasm').then((module) => {
    duckdbModule = module as unknown as DuckDBModule;
  });
}

// duckdbルートを使用するようにパスを設定
const DUCKDB_BUNDLES: DuckDBBundles | Record<string, never> = isClient
  ? {
      mvp: {
        mainModule: '/duckdb/duckdb-mvp.wasm',
        mainWorker: '/duckdb/duckdb-browser-mvp.worker.js',
      },
      eh: {
        mainModule: '/duckdb/duckdb-eh.wasm',
        mainWorker: '/duckdb/duckdb-browser-eh.worker.js',
      },
      coi: {
        mainModule: '/duckdb/duckdb-coi.wasm',
        mainWorker: '/duckdb/duckdb-browser-coi.worker.js',
        pthreadWorker: '/duckdb/duckdb-browser-coi.pthread.worker.js',
      },
    }
  : {};

// クエリ結果の型定義
type RowData = Record<string, unknown>;
interface QueryResultRow {
  [key: string]: string | number | boolean | null;
}

export async function initDuckDB(): Promise<AsyncDuckDB> {
  // サーバーサイドでは何もしない
  if (isServer || !duckdbModule) {
    return Promise.reject(new Error('DuckDB can only be initialized in the browser'));
  }

  if (db) return db;
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
    try {
      console.log('Initializing DuckDB...');
      console.log('WASM Bundles:', DUCKDB_BUNDLES);

      // DuckDBをロード
      const logger = new duckdbModule.ConsoleLogger();

      // 互換性の高いehバンドルを使用
      const bundle = (DUCKDB_BUNDLES as DuckDBBundles).eh ?? (DUCKDB_BUNDLES as DuckDBBundles).mvp;
      if (!bundle || !bundle.mainModule || !bundle.mainWorker) {
        throw new Error('DuckDB bundle not found');
      }

      console.log('Using DuckDB bundle:', bundle);

      const worker = await duckdbModule.createWorker(bundle.mainWorker);
      const duckdbInstance = new duckdbModule.AsyncDuckDB(logger, worker);
      await duckdbInstance.instantiate(bundle.mainModule);

      // サンプルデータを作成
      await createSampleData(duckdbInstance);

      db = duckdbInstance;
      return duckdbInstance;
    } catch (e) {
      console.error('DuckDB initialization failed:', e);
      throw e;
    }
  })();

  return dbInitPromise;
}

async function createSampleData(db: AsyncDuckDB): Promise<void> {
  const conn = await db.connect();

  try {
    // サンプルデータを作成
    await conn.query(`
      CREATE TABLE IF NOT EXISTS sales (
        date DATE,
        region VARCHAR,
        product VARCHAR,
        amount DECIMAL(10, 2)
      )
    `);

    // より単純な方法でテーブルが空かどうかを確認
    try {
      const checkResult = await conn.query('SELECT COUNT(*) as count FROM sales');

      // 結果が配列またはオブジェクトで返される可能性がある
      let count = 0;

      if (Array.isArray(checkResult)) {
        count = (checkResult[0] as { count: number })?.count || 0;
      } else {
        try {
          const rows = extractRows(checkResult);
          count = rows.length > 0 ? (rows[0].count as number) || 0 : 0;
        } catch (e) {
          console.warn('Error extracting rows:', e);
          // 失敗した場合はデータを挿入する
          count = 0;
        }
      }

      console.log('Current row count:', count);

      if (count > 0) {
        console.log('Sample data already exists');
        return;
      }
    } catch (e) {
      console.warn('Error checking table:', e);
      // エラーが発生した場合はデータを挿入する試み
    }

    console.log('Inserting sample data...');

    // 安全にデータを挿入（既存のデータがあっても問題ない）
    await conn.query(`
      INSERT INTO sales VALUES
        ('2023-01-01', '東京', '製品A', 1200.50),
        ('2023-01-01', '大阪', '製品B', 950.75),
        ('2023-01-02', '東京', '製品A', 1100.25),
        ('2023-01-02', '東京', '製品B', 800.00),
        ('2023-01-03', '大阪', '製品A', 1300.00),
        ('2023-01-03', '東京', '製品B', 950.50),
        ('2023-01-04', '大阪', '製品A', 1250.75),
        ('2023-01-04', '東京', '製品B', 900.25),
        ('2023-01-05', '東京', '製品A', 1400.00),
        ('2023-01-05', '大阪', '製品B', 875.50),
        ('2023-01-06', '東京', '製品A', 1150.25),
        ('2023-01-06', '大阪', '製品B', 925.75),
        ('2023-01-07', '東京', '製品A', 1300.50),
        ('2023-01-07', '東京', '製品B', 850.00),
        ('2023-01-08', '大阪', '製品A', 1200.00),
        ('2023-01-08', '東京', '製品B', 900.50),
        ('2023-01-09', '大阪', '製品A', 1350.75),
        ('2023-01-09', '東京', '製品B', 950.25),
        ('2023-01-10', '東京', '製品A', 1450.00),
        ('2023-01-10', '大阪', '製品B', 975.50)
    `);

    console.log('Sample data inserted successfully');
  } finally {
    await conn.close();
  }
}

// クエリ結果から行データを抽出するヘルパー関数
function extractRows(result: QueryResult | unknown): QueryResultRow[] {
  if (!result) return [];

  // QueryResultインターフェースに準拠している場合
  if (typeof (result as QueryResult).toArray === 'function') {
    return (result as QueryResult).toArray() as QueryResultRow[];
  }

  // 配列として返された場合
  if (Array.isArray(result)) {
    return result as QueryResultRow[];
  }

  // getChildメソッドがある場合
  if (typeof result.getChild === 'function') {
    try {
      const child = result.getChild(0);
      if (child && typeof child.toArray === 'function') {
        return child.toArray() as QueryResultRow[];
      }
    } catch (e) {
      console.warn('Error getting child from result:', e);
    }
  }

  // その他の形式の場合
  console.warn('Unexpected query result format:', result);
  return [];
}

export async function runQuery(query: string): Promise<QueryResultRow[]> {
  if (isServer) {
    return Promise.reject(new Error('DuckDB queries can only be run in the browser'));
  }

  const duckdbInstance = await initDuckDB();
  const conn = await duckdbInstance.connect();

  try {
    console.log('Running query:', query);
    const result = await conn.query(query);
    return extractRows(result);
  } finally {
    await conn.close();
  }
}
