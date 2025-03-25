import type { HeadersFunction, LinksFunction } from '@remix-run/node';
import { Links, LiveReload, Meta, Outlet, Scripts, ScrollRestoration } from '@remix-run/react';
import './tailwind.css';

export const links: LinksFunction = () => [];

// CSPを正しく設定するためのヘッダー
export const headers: HeadersFunction = () => {
  return {
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'Content-Security-Policy': `
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:;
      worker-src 'self' blob:;
      style-src 'self' 'unsafe-inline';
      font-src 'self' data:;
      img-src 'self' data:;
      connect-src 'self' blob: ws: wss:;
    `
      .replace(/\s+/g, ' ')
      .trim(),
  };
};

export default function App() {
  return (
    <html lang='ja'>
      <head>
        <meta charSet='utf-8' />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        {/* ブラウザのHTMLレベルでもCSPを設定 */}
        <meta
          httpEquiv='Content-Security-Policy'
          content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; connect-src 'self' blob: ws: wss:;"
        />
        <Meta />
        <Links />
        <title>DuckDB-Wasm Dashboard</title>
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
