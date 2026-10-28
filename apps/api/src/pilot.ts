/** Afzonderlijke ingang voor de besloten pilot; geen vervanging voor accountauthenticatie. */
import { safeEqual, sha256Hex } from './crypto.ts';
import type { Env } from './env.ts';
import { serveStatic } from './static.ts';

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
  if (env.PILOT_MODE !== 'true' && env.ENVIRONMENT !== 'test') return api(request, env);
  // Ontbrekende configuratie mag de website nooit openbaar maken.
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
  const path = new URL(request.url).pathname;
  // Zelfde origin voor de app en API: Secure/SameSite=Strict-sessiecookies blijven werken.
  return privateResponse(await (path === '/api' || path.startsWith('/api/')
    ? api(request, env)
    : (request.method === 'GET' || request.method === 'HEAD'
      ? serveStatic(request, env)
      : Promise.resolve(new Response('Methode niet toegestaan.', { status: 405 })))));
}
