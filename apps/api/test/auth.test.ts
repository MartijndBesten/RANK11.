import { afterEach, describe, expect, it, vi } from 'vitest';
import { hashPassword, safeEqual, sha256Hex, verifyPassword } from '../src/crypto.ts';
import { createApp, platformCode, register } from './helpers.ts';

afterEach(() => { vi.useRealTimers(); });

describe('crypto', () => {
  it('PBKDF2 standaard 100.000 iteraties, salt per hash, nooit boven 100k', async () => {
    const a = await hashPassword('wachtwoord-123');
    const b = await hashPassword('wachtwoord-123');
    expect(a.startsWith('pbkdf2-sha256$100000$')).toBe(true);
    expect(a).not.toBe(b); // andere salt
    expect(await verifyPassword('wachtwoord-123', a)).toBe(true);
    expect(await verifyPassword('wachtwoord-124', a)).toBe(false);
    expect((await hashPassword('x', 500_000)).split('$')[1]).toBe('100000');
    expect(await verifyPassword('x', 'pbkdf2-sha256$200000$AAAA$AAAA')).toBe(false);
  });
  it('constant-time vergelijking', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });
});

describe('registratie', () => {
  it('lukt met een platformcode; sessietoken alleen als hash opgeslagen', async () => {
    const app = createApp();
    const code = await platformCode(app);
    const res = await app.api('POST', '/api/auth/register', { body: { username: 'Sem_10', password: 'lang-genoeg-1', inviteCode: code.toLowerCase() } });
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ username: 'Sem_10', role: 'player' });
    expect(res.body.token).toMatch(/^[A-Za-z0-9_-]{43}$/); // 32 bytes base64url
    const sessions = app.db.db.prepare('SELECT token_hash FROM sessions').all() as { token_hash: string }[];
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.token_hash).toBe(await sha256Hex(res.body.token));
    const dump = JSON.stringify(app.db.db.prepare('SELECT * FROM sessions').all());
    expect(dump).not.toContain(res.body.token);
    const user = app.db.db.prepare('SELECT password_hash FROM users').get() as { password_hash: string };
    expect(user.password_hash).toMatch(/^pbkdf2-sha256\$1000\$/);
    const me = await app.api('GET', '/api/me', { token: res.body.token });
    expect(me.status).toBe(200);
    expect(me.body.user.username).toBe('Sem_10');
  });

  it('weigert zonder geldige code met een generieke melding', async () => {
    const app = createApp();
    const res = await app.api('POST', '/api/auth/register', { body: { username: 'iemand', password: 'lang-genoeg-1', inviteCode: 'ABCDE-FGHJK' } });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/Registratie mislukt/);
    const none = await app.api('POST', '/api/auth/register', { body: { username: 'iemand', password: 'lang-genoeg-1' } });
    expect(none.status).toBe(400);
  });

  it('platformcode: verlopen en maximaal gebruik', async () => {
    const app = createApp();
    const once = await platformCode(app, { maxUses: 1 });
    await register(app, 'eerste', once);
    const second = await app.api('POST', '/api/auth/register', { body: { username: 'tweede', password: 'lang-genoeg-1', inviteCode: once } });
    expect(second.status).toBe(400);
    const shortLived = await platformCode(app, { expiresInMs: 1000 });
    app.advance(2000);
    const late = await app.api('POST', '/api/auth/register', { body: { username: 'laat', password: 'lang-genoeg-1', inviteCode: shortLived } });
    expect(late.status).toBe(400);
  });

  it('valideert gebruikersnaam en wachtwoord; dubbele naam (hoofdletterongevoelig) geweigerd', async () => {
    const app = createApp();
    const code = await platformCode(app);
    await register(app, 'Lotte', code);
    const dup = await app.api('POST', '/api/auth/register', { body: { username: 'lotte', password: 'lang-genoeg-1', inviteCode: code } });
    expect(dup.status).toBe(409);
    expect((await app.api('POST', '/api/auth/register', { body: { username: 'a b', password: 'lang-genoeg-1', inviteCode: code } })).status).toBe(400);
    expect((await app.api('POST', '/api/auth/register', { body: { username: 'kort', password: '1234567', inviteCode: code } })).status).toBe(400);
  });
});

describe('inloggen, sessies en uitloggen', () => {
  it('juiste gegevens geven een nieuwe sessie; foute gegevens een generieke fout', async () => {
    const app = createApp();
    await register(app, 'Mila', await platformCode(app), 'mijn-wachtwoord');
    const ok = await app.api('POST', '/api/auth/login', { body: { username: 'MILA', password: 'mijn-wachtwoord' } });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeTruthy();
    const wrongPw = await app.api('POST', '/api/auth/login', { body: { username: 'mila', password: 'fout-wachtwoord' } });
    const noUser = await app.api('POST', '/api/auth/login', { body: { username: 'bestaatniet', password: 'fout-wachtwoord' } });
    expect(wrongPw.status).toBe(401);
    expect(noUser.status).toBe(401);
    expect(wrongPw.body.error.message).toBe(noUser.body.error.message);
  });

  it('rate limiting: na 5 mislukte pogingen 429, ook met het juiste wachtwoord; na een kwartier weer open', async () => {
    const app = createApp();
    await register(app, 'Noor', await platformCode(app), 'juist-wachtwoord');
    for (let i = 0; i < 5; i++) {
      expect((await app.api('POST', '/api/auth/login', { body: { username: 'noor', password: `fout-${i}-xxxx` } })).status).toBe(401);
    }
    const blocked = await app.api('POST', '/api/auth/login', { body: { username: 'noor', password: 'juist-wachtwoord' } });
    expect(blocked.status).toBe(429);
    app.advance(15 * 60 * 1000 + 1);
    expect((await app.api('POST', '/api/auth/login', { body: { username: 'noor', password: 'juist-wachtwoord' } })).status).toBe(200);
  });

  it('rate limiting per IP over meerdere gebruikersnamen', async () => {
    const app = createApp({ LOGIN_MAX_FAILURES_IP: '3' });
    for (let i = 0; i < 3; i++) await app.api('POST', '/api/auth/login', { body: { username: `naam${i}`, password: 'fout-wachtwoord' }, ip: '198.51.100.9' });
    expect((await app.api('POST', '/api/auth/login', { body: { username: 'naam9', password: 'fout-wachtwoord' }, ip: '198.51.100.9' })).status).toBe(429);
    expect((await app.api('POST', '/api/auth/login', { body: { username: 'naam9', password: 'fout-wachtwoord' }, ip: '198.51.100.10' })).status).toBe(401);
  });

  it('uitloggen maakt de token ongeldig; verlopen sessies werken niet', async () => {
    const app = createApp({ SESSION_TTL_DAYS: '1' });
    const u = await register(app, 'Finn', await platformCode(app));
    expect((await app.api('POST', '/api/auth/logout', { token: u.token })).status).toBe(200);
    expect((await app.api('GET', '/api/me', { token: u.token })).status).toBe(401);
    const login = await app.api('POST', '/api/auth/login', { body: { username: 'finn', password: 'geheim-wachtwoord-1' } });
    app.advance(24 * 3600_000 + 1);
    expect((await app.api('GET', '/api/me', { token: login.body.token })).status).toBe(401);
    expect((await app.api('GET', '/api/me', { token: 'onzin' })).status).toBe(401);
    expect((await app.api('GET', '/api/me')).status).toBe(401);
  });

  it('optioneel httpOnly-cookie; cookie bij muterende verzoeken alleen vanaf toegestane origin', async () => {
    const app = createApp();
    const code = await platformCode(app);
    const res = await app.api('POST', '/api/auth/register', { body: { username: 'Cookie', password: 'lang-genoeg-1', inviteCode: code, cookie: true } });
    const setCookie = res.headers.get('Set-Cookie') ?? '';
    expect(setCookie).toMatch(/^rank11_session=[A-Za-z0-9_-]+; HttpOnly; Secure; SameSite=Strict; Path=\/; Max-Age=\d+$/);
    const cookie = setCookie.split(';')[0] as string;
    expect((await app.api('GET', '/api/me', { headers: { Cookie: cookie } })).status).toBe(200);
    const csrf = await app.api('POST', '/api/pools', { headers: { Cookie: cookie, Origin: 'https://kwaadaardig.test' }, body: { name: 'Hack' } });
    expect(csrf.status).toBe(401);
    const ok = await app.api('POST', '/api/pools', { headers: { Cookie: cookie, Origin: 'https://app.rank11.test' }, body: { name: 'Echt' } });
    expect(ok.status).toBe(201);
  });
});

describe('beveiligingslagen', () => {
  it('vaste beveiligingsheaders, CORS alleen voor de allowlist, nette 404/405/415', async () => {
    const app = createApp();
    const res = await app.api('GET', '/api/health', { headers: { Origin: 'https://app.rank11.test' } });
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('Content-Security-Policy')).toContain("default-src 'none'");
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://app.rank11.test');
    const other = await app.api('GET', '/api/health', { headers: { Origin: 'https://elders.test' } });
    expect(other.headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect((await app.api('GET', '/api/bestaat-niet')).status).toBe(404);
    expect((await app.api('DELETE', '/api/auth/login')).status).toBe(405);
    const pre = await app.api('OPTIONS', '/api/pools', { headers: { Origin: 'https://elders.test' } });
    expect(pre.status).toBe(403);
    const u = await register(app, 'Hdr', await platformCode(app));
    const notJson = await app.api('POST', '/api/pools', { token: u.token, headers: { 'Content-Type': 'text/plain' } });
    expect(notJson.status).toBe(415);
  });

  it('platformuitnodiging via beheer-endpoint alleen voor platformbeheerders (anderen: 404)', async () => {
    const app = createApp();
    const u = await register(app, 'Gewoon', await platformCode(app));
    expect((await app.api('POST', '/api/admin/platform-invites', { token: u.token, body: {} })).status).toBe(404);
    app.db.db.prepare(`UPDATE users SET role = 'platform_admin' WHERE id = ?`).run(u.id);
    const inv = await app.api('POST', '/api/admin/platform-invites', { token: u.token, body: { maxUses: 2 } });
    expect(inv.status).toBe(201);
    expect(inv.body.code).toMatch(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/);
    await register(app, 'Nieuw', inv.body.code);
  });
});
