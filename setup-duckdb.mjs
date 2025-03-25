#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// __dirnameの再現 (ESモジュールでは直接使えないため)
const __filename = fileURLToPath(import.meta.url);
const __dirname = new URL('.', import.meta.url).pathname;

// ディレクトリ設定
const sourceDir = resolve('./node_modules/@duckdb/duckdb-wasm/dist');
const destDir = resolve('./public/duckdb');

// 必要なディレクトリの作成
if (!existsSync(destDir)) {
  console.log(`Creating directory: ${destDir}`);
  mkdirSync(destDir, { recursive: true });
}

// 実際に存在するファイルのリスト
const requiredFiles = [
  'duckdb-browser-eh.worker.js',
  'duckdb-browser-eh.worker.js.map',
  'duckdb-browser-mvp.worker.js',
  'duckdb-eh.wasm',
  'duckdb-mvp.wasm',
  'duckdb-browser-coi.worker.js',
  'duckdb-browser-coi.worker.js.map',
  'duckdb-browser-coi.pthread.worker.js',
  'duckdb-browser-coi.pthread.worker.js.map',
  'duckdb-coi.wasm',
];

// 実際にコピーされたファイルを追跡
const copiedFiles = [];

// ファイルのコピー
let hasErrors = false;
for (const file of requiredFiles) {
  const sourcePath = join(sourceDir, file);
  const destPath = join(destDir, file);

  try {
    if (existsSync(sourcePath)) {
      copyFileSync(sourcePath, destPath);
      console.log(`Copied: ${file}`);
      copiedFiles.push(file);
    } else {
      console.warn(`Warning: Source file not found: ${sourcePath}`);
      // ファイルが見つからない場合でもエラーとはしない
    }
  } catch (error) {
    console.error(`Error copying ${file}: ${error.message}`);
    hasErrors = true;
  }
}

// duckdb-browser.mjsもコピーする (これはモジュールの初期化に必要)
try {
  const sourceMjsPath = join(sourceDir, 'duckdb-browser.mjs');
  const destMjsPath = join(destDir, 'duckdb-browser.mjs');
  if (existsSync(sourceMjsPath)) {
    copyFileSync(sourceMjsPath, destMjsPath);
    console.log('Copied: duckdb-browser.mjs');
    copiedFiles.push('duckdb-browser.mjs');
  }
} catch (error) {
  console.error(`Error copying duckdb-browser.mjs: ${error.message}`);
}

// コピー結果の確認 - 実際にコピーされたファイルのみチェック
console.log('\nFiles in public/duckdb:');
if (existsSync(destDir)) {
  const files = readdirSync(destDir);
  for (const file of files) {
    try {
      const stat = statSync(join(destDir, file));
      console.log(`- ${file} (${stat.size} bytes)`);
    } catch (error) {
      console.error(`Error checking file ${file}: ${error.message}`);
    }
  }
}

// 結果出力
if (hasErrors) {
  console.error('\nWarning: Some files could not be copied. Check the errors above.');
  process.exit(1);
} else {
  console.log('\nDuckDB-WASM setup completed successfully!');
}
