import { vitePlugin as remix } from '@remix-run/dev';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

declare module '@remix-run/node' {
  interface Future {
    v3_singleFetch: true;
  }
}

export default defineConfig({
  plugins: [
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_singleFetch: true,
        v3_lazyRouteDiscovery: true,
      },
      ignoredRouteFiles: ['**/duckdb/**/*.map', '**/duckdb/**/*.wasm'],
    }),
    tsconfigPaths(),
  ],
  server: {
    port: 3000,
    host: true,
    hmr: {
      host: 'localhost',
    },
    headers: {
      // WASM用のセキュリティヘッダーを設定
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    },
    fs: {
      allow: ['..', 'node_modules/@duckdb/duckdb-wasm/dist'],
    },
  },
  optimizeDeps: {
    exclude: ['@duckdb/duckdb-wasm'],
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      external: [/^node:/],
    },
    sourcemap: true,
  },
  publicDir: 'public',
});
