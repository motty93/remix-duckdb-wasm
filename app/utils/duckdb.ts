import * as duckdb from '@duckdb/duckdb-wasm';
import type { AsyncDuckDB } from '@duckdb/duckdb-wasm';

let db: AsyncDuckDB | null = null;
let dbInitPromise: Promise<AsyncDuckDB> | null = null;

const DUCKDB_BUNDLES: duckdb.DuckDBBundles = {
  mvp: {
    mainModule: '/duckdb/duckdb-mvp.wasm',
    mainWorker: '/duckdb/duckdb-browser-mvp.worker.js',
  },
  eh: {
    mainModule: '/duckdb/duckdb-eh.wasm',
    mainWorker: '/duckdb/duckdb-browser-eh.worker.js',
  },
};

export async function initDuckDB(): Promise<AsyncDuckDB> {
  if (db) return db;
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
    try {
      // DuckDBをロード
      const logger = new duckdb.ConsoleLogger();

      const mainWorker = DUCKDB_BUNDLES.eh?.mainWorker;
      if (!mainWorker) {
        throw new Error('DuckDB worker bundle not found');
      }

      const worker = await duckdb.createWorker(mainWorker);
      const duckdbInstance = new duckdb.AsyncDuckDB(logger, worker);

      const mainModule = DUCKDB_BUNDLES.eh?.mainModule;
      if (!mainModule) {
        throw new Error('DuckDB module bundle not found');
      }

      await duckdbInstance.instantiate(mainModule);

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
      CREATE TABLE sales (
        date DATE,
        region VARCHAR,
        product VARCHAR,
        amount DECIMAL(10, 2)
      )
    `);

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
    const result = await conn.query(query);
    return result.toArray();
  } finally {
    await conn.close();
  }
}
