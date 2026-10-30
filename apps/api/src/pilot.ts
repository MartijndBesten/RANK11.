/** Afzonderlijke ingang voor de besloten pilot; geen vervanging voor accountauthenticatie. */
import { safeEqual, sha256Hex } from './crypto.ts';
import type { Env } from './env.ts';
import { serveStatic } from './static.ts';
import { servePages } from './consent-pages.ts';

/** Routeert een verzoek: /api → de API, /ouder|/privacy → Worker-pagina's, de rest → de statische frontend. */
async function route(request: Request, env: Env, api: (request: Request, env: Env) => Promise<Response>): Promise<Response> {
  const path = new URL(request.url).pathname;
  if (path === '/api' || path.startsWith('/api/')) return api(request, env);
  const pageRes = await servePages(request, env);
  if (pageRes) return pageRes;
  if (request.method === 'GET' || request.method === 'HEAD') return serveStatic(request, env);
  return new Response('Methode niet toegestaan.', { status: 405 });
}

function privateResponse(res: Response): Response {
  if (res.status === 101) return res;
  const out = new Response(res.body, res);
  out.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  out.headers.set('Cache-Control', 'no-store');
  out.headers.set('Referrer-Policy', 'no-referrer');
  out.headers.set('X-Content-Type-Options', 'nosniff');
  return out;
}

export async function servePilot(
  request: Request, env: Env, api: (request: Request, env: Env) => Promise<Response>,
): Promise<Response> {
  // Publieke (niet-pilot) modus: gewoon routeren, geen Basic Auth, wel de frontend en de ouder-pagina's.
  if (env.PILOT_MODE !== 'true' && env.ENVIRONMENT !== 'test') return route(request, env, api);

  // Besloten pilot: alles achter HTTP Basic Auth. Ontbrekende configuratie mag de site nooit openbaar maken.
  if (!env.PILOT_ACCESS_USER || !env.PILOT_ACCESS_PASSWORD || env.PILOT_ACCESS_PASSWORD.length < 32 || !env.ASSETS) {
    return privateResponse(new Response('Testomgeving nog niet beschikbaar.', { status: 503 }));
  }
  const authorization = request.headers.get('Authorization') ?? '';
  let credentials = '';
  if (authorization.startsWith('Basic ') && authorization.length < 2048) {
    try { credentials = atob(authorization.slice(6)); } catch { /* Ongeldige header: weigeren. */ }
  }
  const [actual, expected] = await Promise.all([
    sha256Hex(credentials), sha256Hex(`${env.PILOT_ACCESS_USER}:${env.PILOT_ACCESS_PASSWORD}`),
  ]);
  if (!safeEqual(actual, expected)) {
    return privateResponse(new Response('Besloten RANK11-testomgeving.', {
      status: 401, headers: { 'WWW-Authenticate': 'Basic realm="RANK11 pilot", charset="UTF-8"' },
    }));
  }
  return privateResponse(await route(request, env, api));
}
