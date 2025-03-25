// サーバーサイドとクライアントサイドを識別する
const isServer = typeof window === 'undefined';
const isClient = !isServer;

// クライアントサイドでのみduckdbをインポート
let duckdb: any;
let AsyncDuckDB: any;

// クライアントサイドでのみモジュールを読み込む
if (isClient) {
  import('@duckdb/duckdb-wasm').then((module) => {
    duckdb = module;
    AsyncDuckDB = module.AsyncDuckDB;
  });
}

let db: any = null;
let dbInitPromise: Promise<any> | null = null;

// 環境に関わらず単純なベースパスを使用
const basePath = '';

const DUCKDB_BUNDLES = isClient
  ? {
      mvp: {
        mainModule: `${basePath}/duckdb/duckdb-mvp.wasm`,
        mainWorker: `${basePath}/duckdb/duckdb-browser-mvp.worker.js`,
      },
      eh: {
        mainModule: `${basePath}/duckdb/duckdb-eh.wasm`,
        mainWorker: `${basePath}/duckdb/duckdb-browser-eh.worker.js`,
      },
      coi: {
        mainModule: `${basePath}/duckdb/duckdb-coi.wasm`,
        mainWorker: `${basePath}/duckdb/duckdb-browser-coi.worker.js`,
        pthreadWorker: `${basePath}/duckdb/duckdb-browser-coi.pthread.worker.js`,
      },
    }
  : {};

export async function initDuckDB() {
  // サーバーサイドでは何もしない
  if (isServer) {
    return Promise.reject(new Error('DuckDB can only be initialized in the browser'));
  }

  if (db) return db;
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
    try {
      console.log('Initializing DuckDB...');

      // DuckDBをロード
      const logger = new duckdb.ConsoleLogger();

      // Try to use COI bundle first (which works best with modern browsers), fallback to others
      const bundle = DUCKDB_BUNDLES.coi ?? DUCKDB_BUNDLES.eh ?? DUCKDB_BUNDLES.mvp;
      if (!bundle || !bundle.mainModule || !bundle.mainWorker) {
        throw new Error('DuckDB bundle not found');
      }

      const worker = await duckdb.createWorker(bundle.mainWorker);
      const duckdbInstance = new duckdb.AsyncDuckDB(logger, worker);
      await duckdbInstance.instantiate(bundle.mainModule, bundle.pthreadWorker);

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

async function createSampleData(db: any): Promise<void> {
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

    // テーブルが空の場合のみデータを挿入
    const checkResult = await conn.query('SELECT COUNT(*) as count FROM sales');
    const checkResultChild = checkResult.getChild(0);
    if (!checkResultChild) {
      throw new Error('Failed to check sales table');
    }

    const count = checkResultChild.toArray()[0].count;
    if (count > 0) {
      console.log('Sample data already exists');
      return;
    }

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
  } finally {
    await conn.close();
  }
}

export async function runQuery(query: string) {
  if (isServer) {
    return Promise.reject(new Error('DuckDB queries can only be run in the browser'));
  }

  const duckdbInstance = await initDuckDB();
  const conn = await duckdbInstance.connect();

  try {
    console.log('Running query:', query);
    const result = await conn.query(query);
    return result.toArray();
  } finally {
    await conn.close();
  }
}
