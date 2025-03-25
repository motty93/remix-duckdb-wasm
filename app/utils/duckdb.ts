import * as duckdb from '@duckdb/duckdb-wasm';
import type { AsyncDuckDB } from '@duckdb/duckdb-wasm';

let db: AsyncDuckDB | null = null;
let dbInitPromise: Promise<AsyncDuckDB> | null = null;

// 絶対パスを使用してURLを指定
const getBasePath = () => {
  if (typeof window !== 'undefined') {
    // アプリがどのパスで提供されているかを取得
    const origin = window.location.origin;
    return `${origin}/`;
  }
  return '/';
};

// DuckDBバンドルの定義
const DUCKDB_BUNDLES: duckdb.DuckDBBundles = {
  mvp: {
    mainModule: `${getBasePath()}duckdb/duckdb-mvp.wasm`,
    mainWorker: `${getBasePath()}duckdb/duckdb-browser-mvp.worker.js`,
  },
  eh: {
    mainModule: `${getBasePath()}duckdb/duckdb-eh.wasm`,
    mainWorker: `${getBasePath()}duckdb/duckdb-browser-eh.worker.js`,
  },
  coi: {
    mainModule: `${getBasePath()}duckdb/duckdb-coi.wasm`,
    mainWorker: `${getBasePath()}duckdb/duckdb-browser-coi.worker.js`,
    pthreadWorker: `${getBasePath()}duckdb/duckdb-browser-coi.pthread.worker.js`,
  },
};

// ファイルの存在確認
const checkFileExists = async (url: string): Promise<boolean> => {
  try {
    console.log(`Checking if file exists: ${url}`);
    const response = await fetch(url, { method: 'HEAD' });
    const exists = response.ok;
    console.log(`File ${url} exists: ${exists}`);
    return exists;
  } catch (e) {
    console.error(`Error checking file: ${url}`, e);
    return false;
  }
};

export async function initDuckDB(): Promise<AsyncDuckDB> {
  // サーバーサイドでの実行をチェック
  if (typeof window === 'undefined') {
    throw new Error('DuckDB cannot be initialized on the server side');
  }

  if (db) return db;
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
    try {
      console.log('DuckDB初期化の試行 #1');
      const logger = new duckdb.ConsoleLogger();

      // 利用可能なバンドルを探す
      for (const bundleKey of ['eh', 'mvp', 'coi'] as const) {
        const bundle = DUCKDB_BUNDLES[bundleKey];

        if (!bundle?.mainModule || !bundle?.mainWorker) {
          console.log(`Bundle ${bundleKey} is not complete`);
          continue;
        }

        try {
          console.log(`Trying bundle: ${bundleKey}`);
          console.log(`- Worker URL: ${bundle.mainWorker}`);
          console.log(`- Module URL: ${bundle.mainModule}`);

          // ファイルの存在確認
          const workerExists = await checkFileExists(bundle.mainWorker);
          const moduleExists = await checkFileExists(bundle.mainModule);

          if (!workerExists || !moduleExists) {
            console.log(`${bundleKey} bundle files not found`);
            continue;
          }

          // WorkerとDuckDBインスタンスの作成
          console.log(`Creating worker from: ${bundle.mainWorker}`);
          const worker = await duckdb.createWorker(bundle.mainWorker);

          console.log('Creating DuckDB instance');
          const duckdbInstance = new duckdb.AsyncDuckDB(logger, worker);

          console.log(`Instantiating WASM module: ${bundle.mainModule}`);
          await duckdbInstance.instantiate(bundle.mainModule);

          console.log('Creating sample data');
          await createSampleData(duckdbInstance);

          console.log(`Successfully initialized DuckDB with ${bundleKey} bundle`);
          db = duckdbInstance;
          return duckdbInstance;
        } catch (error) {
          console.error(`Error with ${bundleKey} bundle:`, error);
        }
      }

      throw new Error('Missing DuckDB worker URL!');
    } catch (e) {
      console.error('DuckDB初期化エラー:', e);
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
  if (typeof window === 'undefined') {
    throw new Error('DuckDB queries cannot be run on the server side');
  }

  try {
    const duckdbInstance = await initDuckDB();
    const conn = await duckdbInstance.connect();

    try {
      console.log('Running query:', query);
      const result = await conn.query(query);
      return result.toArray();
    } finally {
      await conn.close();
    }
  } catch (error) {
    console.error('Query execution failed:', error);
    throw error;
  }
}
