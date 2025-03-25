import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

/**
 * The DEBUG flag will do two things:
 * 1. We will skip caching on the edge, which makes it easier to debug
 * 2. We will return an error message on exception in your Response rather than the default 500
 */
const DEBUG = false;

/**
 * Handle DuckDB WASM assets with proper headers
 */
async function handleDuckDBAsset(event, url) {
  const cache = caches.default;

  // Check if this is in the cache
  let response = await cache.match(event.request);

  if (!response) {
    // If not in cache, get from KV
    response = await getAssetFromKV(event);

    // Set the proper headers for WASM
    const headers = new Headers(response.headers);

    if (url.pathname.endsWith('.wasm')) {
      headers.set('Content-Type', 'application/wasm');
    } else if (url.pathname.endsWith('.js')) {
      headers.set('Content-Type', 'application/javascript');
    }

    // Always set CORS headers for DuckDB assets
    headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
    headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    response = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });

    // Put the asset in cache
    event.waitUntil(cache.put(event.request, response.clone()));
  }

  return response;
}

/**
 * Respond with remix handler or static assets
 */
async function handleEvent(event) {
  const url = new URL(event.request.url);

  try {
    // Check if this is a DuckDB asset
    if (url.pathname.startsWith('/duckdb/')) {
      return await handleDuckDBAsset(event, url);
    }

    // Otherwise, serve the asset normally
    return await getAssetFromKV(event);
  } catch (e) {
    if (DEBUG) {
      return new Response(e.message || e.toString(), {
        status: 500,
      });
    }

    // On error, fall back to the remix handler
    return fetch(event.request);
  }
}

addEventListener('fetch', (event) => {
  try {
    event.respondWith(handleEvent(event));
  } catch (e) {
    if (DEBUG) {
      return event.respondWith(
        new Response(e.message || e.toString(), {
          status: 500,
        }),
      );
    }
    event.respondWith(new Response('Internal Error', { status: 500 }));
  }
});
