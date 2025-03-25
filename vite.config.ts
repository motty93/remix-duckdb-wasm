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
      serverModuleFormat: 'esm',
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
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; connect-src 'self' blob: ws: wss:;",
    },
    fs: {
      // 開発サーバーがpublicディレクトリを直接提供できるようにする
      strict: false,
      allow: ['..'],
    },
    middlewareMode: false,
  },
  optimizeDeps: {
    // DuckDBをViteの最適化から除外
    exclude: ['@duckdb/duckdb-wasm'],
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      external: [/^node:/],
      output: {
        manualChunks: undefined,
      },
    },
    // WASMファイルをアセットとして扱う
    assetsInlineLimit: 0,
  },
  publicDir: 'public',
});
