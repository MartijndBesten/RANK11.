import { afterEach, describe, expect, it, vi } from 'vitest';
import { handle } from '../src/index.ts';
import { servePilot } from '../src/pilot.ts';
import { createApp, platformCode } from './helpers.ts';

afterEach(() => vi.useRealTimers());

const password = 'synthetic-pilot-password-at-least-32-characters';
const basic = `Basic ${btoa(`tester:${password}`)}`;

function pilot() {
  const app = createApp({ PILOT_MODE: 'true', PILOT_ACCESS_USER: 'tester', PILOT_ACCESS_PASSWORD: password });
  const assets = vi.fn(async () => new Response('<html>pilot</html>', { headers: { 'Content-Type': 'text/html' } }));
  app.env.ASSETS = { fetch: assets } as unknown as Fetcher;
  const request = (path: string, opts: RequestInit = {}) => servePilot(new Request(`https://app.rank11.test${path}`, opts), app.env, handle);
  return { app, assets, request };
}

describe('besloten pilot', () => {
  it('schermt HTML, assets, API en preflight af, ook bij ongeldige credentials', async () => {
    const { assets, request } = pilot();
    for (const path of ['/', '/assets/app.js', '/api/health', '/api/auth/register']) {
      for (const authorization of ['', 'Basic !!!', `Basic ${btoa('tester:fout')}`, 'Bearer willekeurig']) {
        const res = await request(path, { headers: { Authorization: authorization } });
        expect(res.status).toBe(401);
        expect(res.headers.get('WWW-Authenticate')).toContain('Basic');
        expect(res.headers.get('X-Robots-Tag')).toContain('noindex');
        expect(res.headers.get('Cache-Control')).toBe('no-store');
      }
    }
    expect((await request('/api/health', { method: 'OPTIONS' })).status).toBe(401);
    expect(assets).not.toHaveBeenCalled();
  });

  it('ontbrekende of te korte secrets geven 503 zonder assets te bedienen', async () => {
    const { app, assets, request } = pilot();
    app.env.PILOT_ACCESS_PASSWORD = 'kort';
    expect((await request('/', { headers: { Authorization: basic } })).status).toBe(503);
    app.env.PILOT_ACCESS_PASSWORD = password;
    delete app.env.PILOT_ACCESS_USER;
    expect((await request('/api/health')).status).toBe(503);
    expect(assets).not.toHaveBeenCalled();
  });

  it('bedient app en API op dezelfde origin; gesloten registratie laat bestaande sessies werken', async () => {
    const { app, request } = pilot();
    const page = await request('/', { headers: { Authorization: basic } });
    expect(await page.text()).toContain('<html>');
    expect(page.headers.get('Cache-Control')).toBe('no-store');
    expect((await request('/api/me', { headers: { Authorization: basic } })).status).toBe(401);
    const code = await platformCode(app, { maxUses: 1 });
    const signup = await request('/api/auth/register', {
      method: 'POST', headers: { Authorization: basic, 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'pilot_tester', password: 'synthetic-account-password', inviteCode: code, cookie: true }),
    });
    expect(signup.status).toBe(201);
    const cookie = signup.headers.get('Set-Cookie')!.split(';')[0]!;
    app.env.REGISTRATION_ENABLED = 'false';
    const closed = await request('/api/auth/register', {
      method: 'POST', headers: { Authorization: basic, 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'extra', password: 'synthetic-account-password', inviteCode: await platformCode(app) }),
    });
    expect(closed.status).toBe(403);
    expect(app.db.db.prepare('SELECT count(*) AS n FROM users').get()).toMatchObject({ n: 1 });
    expect((await request('/api/me', { headers: { Authorization: basic, Cookie: cookie } })).status).toBe(200);
    const mutation = (origin: string) => request('/api/pools', {
      method: 'POST', headers: { Authorization: basic, Cookie: cookie, Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Fictieve pilotpool' }),
    });
    expect((await mutation('https://evil.test')).status).toBe(401);
    expect((await mutation('https://app.rank11.test')).status).toBe(201);
  });
});
