#!/bin/bash

echo "Cleaning up project..."
echo "Stopping running processes..."
pkill -f remix || true
pkill -f vite || true

echo "Removing caches..."
rm -rf .cache
rm -rf build
rm -rf .vite

echo "Removing build files..."
rm -rf public/build
rm -rf dist

echo "Reinstalling DuckDB WASM files..."
rm -rf public/duckdb
bun run setup-duckdb

echo "Cleanup completed! Now you can restart the development server with 'bun run dev'"
