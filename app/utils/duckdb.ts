import * as duckdb from '@duckdb/duckdb-wasm';
import type { AsyncDuckDB } from '@duckdb/duckdb-wasm';

let db: AsyncDuckDB | null = null;
let dbInitPromise: Promise<AsyncDuckDB> | null = null;

const basePath = '/duckdb/';

const DUCKDB_BUNDLES: duckdb.DuckDBBundles = {
  mvp: {
    mainModule: `${basePath}duckdb-mvp.wasm`,
    mainWorker: `${basePath}duckdb-browser-mvp.worker.js`,
  },
  eh: {
    mainModule: `${basePath}duckdb-eh.wasm`,
    mainWorker: `${basePath}duckdb-browser-eh.worker.js`,
  },
  coi: {
    mainModule: `${basePath}duckdb-coi.wasm`,
    mainWorker: `${basePath}duckdb-browser-coi.worker.js`,
    pthreadWorker: `${basePath}duckdb-browser-coi.pthread.worker.js`,
  },
};

export async function initDuckDB(): Promise<AsyncDuckDB> {
  if (db) return db;
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
    try {
      console.log('Initializing DuckDB...');
      console.log('WASM Bundles:', DUCKDB_BUNDLES);

      // 1. まずEHバンドルを試す
      // 2. それが利用できなければMVPバンドルを使用
      // 3. どちらも利用できなければエラー
      const logger = new duckdb.ConsoleLogger();
      const bundle = await selectBundle();

      console.log('Selected bundle:', bundle);

      if (!bundle?.mainModule || !bundle?.mainWorker) {
        throw new Error('DuckDB bundle not found or incomplete');
      }

      try {
        // ワーカーの作成を試みる
        const worker = await duckdb.createWorker(bundle.mainWorker);
        const duckdbInstance = new duckdb.AsyncDuckDB(logger, worker);

        // WASMモジュールのインスタンス化
        console.log('Instantiating WASM module:', bundle.mainModule);
        await duckdbInstance.instantiate(bundle.mainModule);

        // サンプルデータを作成
        await createSampleData(duckdbInstance);

        db = duckdbInstance;
        return duckdbInstance;
      } catch (workerError) {
        console.error('Error creating worker:', workerError);
        throw workerError;
      }
    } catch (e) {
      console.error('DuckDB initialization failed:', e);
      throw e;
    }
  })();

  return dbInitPromise;
}

// 利用可能なバンドルを選択する関数
async function selectBundle() {
  // EHバンドルを優先的に使用
  const bundle = DUCKDB_BUNDLES.eh;

  // ファイルが存在するか確認する関数
  const checkFileExists = async (url: string): Promise<boolean> => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (e) {
      return false;
    }
  };

  // EHバンドルのファイルが存在するか確認
  if (bundle?.mainModule && bundle?.mainWorker) {
    const moduleExists = await checkFileExists(bundle.mainModule);
    const workerExists = await checkFileExists(bundle.mainWorker);

    if (moduleExists && workerExists) {
      console.log('Using EH bundle');
      return bundle;
    }
  }

  // EHバンドルが利用できない場合はMVPバンドルを試す
  const mvpBundle = DUCKDB_BUNDLES.mvp;
  if (mvpBundle?.mainModule && mvpBundle?.mainWorker) {
    const moduleExists = await checkFileExists(mvpBundle.mainModule);
    const workerExists = await checkFileExists(mvpBundle.mainWorker);

    if (moduleExists && workerExists) {
      console.log('Using MVP bundle');
      return mvpBundle;
    }
  }

  // どちらも利用できない場合
  console.error('No valid DuckDB bundle found');
  return null;
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
