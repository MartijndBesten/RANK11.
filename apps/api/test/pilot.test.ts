import { afterEach, describe, expect, it, vi } from 'vitest';
import worker, { handle } from '../src/index.ts';
import { servePilot } from '../src/pilot.ts';
import { createApp, platformCode } from './helpers.ts';

afterEach(() => vi.useRealTimers());

const password = 'synthetic-pilot-password-at-least-32-characters';
const basic = `Basic ${btoa(`tester:${password}`)}`;

function pilot() {
  const app = createApp({ PILOT_MODE: 'true', REGISTRATION_ENABLED: 'true', PILOT_ACCESS_USER: 'tester', PILOT_ACCESS_PASSWORD: password });
  const assets = vi.fn(async () => ({ body: '<html>pilot</html>', httpEtag: 'test', writeHttpMetadata: (h: Headers) => h.set('Content-Type', 'text/html') }));
  app.env.ASSETS = { get: assets } as unknown as R2Bucket;
  const request = (path: string, opts: RequestInit = {}) => servePilot(new Request(`https://app.rank11.test${path}`, opts), app.env, handle);
  return { app, assets, request };
}

describe('besloten pilot', () => {
  it('geeft de actuele uitnodigingsregistratie-status door aan de frontend, zonder de toegangspoort te passeren', async () => {
    const { app, request } = pilot();
    const locked = await request('/api/config');
    expect(locked.status).toBe(401);
    const open = await request('/api/config', { headers: { Authorization: basic } });
    expect(open.status).toBe(200);
    expect(((await open.json()) as { registrationEnabled: boolean }).registrationEnabled).toBe(true);
    app.env.REGISTRATION_ENABLED = 'false';
    const closed = await request('/api/config', { headers: { Authorization: basic } });
    expect(closed.status).toBe(200);
    expect(((await closed.json()) as { registrationEnabled: boolean }).registrationEnabled).toBe(false);
  });

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

// Publieke modus (prod): geen Basic Auth-poort; publieke routes open, persoonlijke/admin via sessie.
function publicSite() {
  const app = createApp({ ENVIRONMENT: 'prod', REGISTRATION_ENABLED: 'true', OPEN_REGISTRATION: 'true' });
  const assets = vi.fn(async () => ({ body: '<html>home</html>', httpEtag: 'test', writeHttpMetadata: (h: Headers) => h.set('Content-Type', 'text/html') }));
  app.env.ASSETS = { get: assets } as unknown as R2Bucket;
  const request = (path: string, opts: RequestInit = {}) => servePilot(new Request(`https://rank11.test${path}`, opts), app.env, handle);
  return { app, assets, request };
}

describe('publieke site (geen Basic Auth-poort)', () => {
  it('serveert de publieke voordeur zonder inloggen', async () => {
    const { request } = publicSite();
    expect((await request('/')).status).toBe(200);           // startpagina/app-shell
    expect((await request('/assets/app.js')).status).toBe(200);
    expect((await request('/api/health')).status).toBe(200);
    expect((await request('/api/config')).status).toBe(200); // publieke config voor de UI
    expect((await request('/privacy')).status).toBe(200);    // ouder/privacy-pagina's publiek
  });

  it('beschermt persoonlijke en beheerdersroutes zonder geldige sessie', async () => {
    const { request } = publicSite();
    expect((await request('/api/me')).status).toBe(401);
    expect((await request('/api/grades')).status).toBe(401);
    expect((await request('/api/club')).status).toBe(401);
    expect((await request('/api/admin/consents')).status).toBe(401);
    expect((await request('/api/admin/platform-invites')).status).toBe(401);
  });

  it('publieke toestemmingsroute valideert nog steeds (geen geldige token = 400)', async () => {
    const { request } = publicSite();
    const r = await request('/api/consent/decide', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'x'.repeat(40), decision: 'approve', guardianConfirmed: true }),
    });
    expect(r.status).toBe(400);
  });

  it('een koppelcode kan NIET via de publieke route goedkeuren (beveiliging)', async () => {
    const { request } = publicSite();
    const r = await request('/api/consent/decide', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claimCode: 'ABCD2345', decision: 'approve', guardianConfirmed: true }),
    });
    expect(r.status).toBe(400);
  });

  it('open registratie heeft een misbruikrem per IP', async () => {
    const { request } = publicSite();
    const signup = (i: number) => request('/api/auth/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: `speler${i}`, password: 'synthetic-account-password', under16: false }),
    });
    let throttled = false;
    for (let i = 0; i < 17; i++) { if ((await signup(i)).status === 429) { throttled = true; break; } }
    expect(throttled).toBe(true);
  });
});

// De echte Worker-ingang moet ook zonder PILOT_MODE gesloten blijven in env.test.
describe('testomgeving fail-closed', () => {
  it('kan de toegangspoort niet overslaan door een ontbrekende vlag', async () => {
    const { app } = pilot();
    app.env.ENVIRONMENT = 'test';
    delete app.env.PILOT_MODE;
    delete app.env.REGISTRATION_ENABLED;
    expect((await handle(new Request('https://app.rank11.test/api/auth/register', { method: 'POST' }), app.env)).status).toBe(403);
    expect((await worker.fetch(new Request('https://app.rank11.test/'), app.env)).status).toBe(401);
    delete app.env.ASSETS;
    expect((await worker.fetch(new Request('https://app.rank11.test/api/health'), app.env)).status).toBe(503);
  });
});
