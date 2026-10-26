/**
 * Serveert de statische frontend-build (same-origin met de API) uit een R2-bucket.
 * Alleen actief als env.ASSETS is gebonden (de besloten-testomgeving). Single-page-app:
 * onbekende paden zonder extensie geven index.html terug. Nergens indexeerbaar (besloten test).
 */
import type { Env } from './env.ts';

const ROBOTS = 'User-agent: *\nDisallow: /\n';

function noIndex(headers: Headers): Headers {
  headers.set('X-Robots-Tag', 'noindex, nofollow');
  return headers;
}

export async function serveStatic(request: Request, env: Env): Promise<Response> {
  if (!env.ASSETS) return new Response('Niet gevonden', { status: 404 });
  const url = new URL(request.url);

  if (url.pathname === '/robots.txt') {
    return new Response(ROBOTS, { headers: noIndex(new Headers({ 'Content-Type': 'text/plain; charset=utf-8' })) });
  }

  let key = decodeURIComponent(url.pathname.slice(1));
  if (key === '' || key.endsWith('/')) key += 'index.html';

  let obj = await env.ASSETS.get(key);
  // Onbekend pad zonder bestandsextensie: single-page app → index.html.
  if (!obj && !key.split('/').pop()!.includes('.')) obj = await env.ASSETS.get('index.html');
  if (!obj) return new Response('Niet gevonden', { status: 404 });

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('Cache-Control', key === 'index.html' ? 'no-cache' : 'public, max-age=86400');
  return new Response(obj.body, { headers: noIndex(headers) });
}
