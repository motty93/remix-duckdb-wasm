import type { LoaderFunctionArgs } from '@remix-run/node';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);

  // .map ファイルへのリクエストを処理
  if (url.pathname.endsWith('.map')) {
    console.log('Handling map file request:', url.pathname);
    return new Response(null, {
      status: 204,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });
  }

  // その他のリクエストは通常通り処理
  return new Response('Not found', { status: 404 });
}

export default function CatchAllRoute() {
  return null;
}
