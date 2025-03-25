import * as duckdb from '@duckdb/duckdb-wasm';
import type { AsyncDuckDB } from '@duckdb/duckdb-wasm';

let db: AsyncDuckDB | null = null;
let dbInitPromise: Promise<AsyncDuckDB> | null = null;

// const DUCKDB_BUNDLE
