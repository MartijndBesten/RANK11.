/** AVG-rechten: eigen gegevens exporteren (art. 15/20) en account volledig verwijderen (art. 17). Alleen voor jezelf. */
import { describe, expect, it } from 'vitest';
import { createApp, idem, platformCode, poolWith, register, type TestApp, type TestUser } from './helpers.ts';
import { startMatch } from './squads.ts';

const grade = (extra: Record<string, unknown> = {}) => ({ subjectId: 'wiskunde', testName: 'Toets 1', value: 7.4, weight: 2, date: '2026-10-20', ...extra });
const rows = (app: TestApp, u: TestUser, sql: string) => (app.db.db.prepare(sql).get(u.id) as { n: number }).n;

describe('eigen gegevens exporteren', () => {
  it('geeft de eigen cijfers, club en koppelingen terug, zonder tokens', async () => {
    const app = createApp();
    const u = await register(app, 'Export', await platformCode(app));
    await app.api('POST', '/api/grades', { token: u.token, idem: idem(), body: grade() });
    await app.api('POST', '/api/integrations/sample/connect', { token: u.token, idem: idem() });
    const res = await app.api('GET', '/api/me/export', { token: u.token });
    expect(res.status).toBe(200);
    expect(res.body.account.username).toBe('Export');
    expect(res.body.grades).toHaveLength(6); // 1 handmatig + 5 uit de voorbeeldbron
    expect(res.body.integrations.some((i: { provider: string }) => i.provider === 'sample')).toBe(true);
    // Nooit een token in de export.
    const tokenEnc = (app.db.db.prepare('SELECT token_enc FROM integration_links WHERE user_id = ?').get(u.id) as { token_enc: string }).token_enc;
    expect(JSON.stringify(res.body)).not.toContain(tokenEnc);
    expect(JSON.stringify(res.body).toLowerCase()).not.toContain('token');
    expect((await app.api('GET', '/api/me/export')).status).toBe(401);
  });
});

describe('account verwijderen', () => {
  it('wist alle persoonlijke gegevens en maakt de sessie ongeldig', async () => {
    const app = createApp();
    const u = await register(app, 'Weg', await platformCode(app));
    await app.api('POST', '/api/grades', { token: u.token, idem: idem(), body: grade() });
    await app.api('POST', '/api/integrations/sample/connect', { token: u.token, idem: idem() });
    expect((await app.api('DELETE', '/api/me', { token: u.token })).status).toBe(200);
    // Sessie ongeldig, gebruiker en persoonlijke gegevens weg.
    expect((await app.api('GET', '/api/me', { token: u.token })).status).toBe(401);
    expect(rows(app, u, 'SELECT COUNT(*) AS n FROM users WHERE id = ?')).toBe(0);
    expect(rows(app, u, 'SELECT COUNT(*) AS n FROM grades WHERE user_id = ?')).toBe(0);
    expect(rows(app, u, 'SELECT COUNT(*) AS n FROM card_instances WHERE user_id = ?')).toBe(0);
    expect(rows(app, u, 'SELECT COUNT(*) AS n FROM integration_links WHERE user_id = ?')).toBe(0);
    expect(rows(app, u, 'SELECT COUNT(*) AS n FROM sessions WHERE user_id = ?')).toBe(0);
  });

  it('na een wedstrijd: de wedstrijd verdwijnt en een pool wordt overgedragen aan een ander lid', async () => {
    const app = createApp();
    const { poolId, users } = await poolWith(app, ['Anna', 'Bram']);
    const [a, b] = users;
    await startMatch(app, poolId, a!, b!);
    await app.api('POST', '/api/grades', { token: a!.token, idem: idem(), body: grade() });
    expect((await app.api('DELETE', '/api/me', { token: a!.token })).status).toBe(200);
    // A is weg; de pool bestaat nog met B als eigenaar/admin; B kan de pool nog zien.
    expect(rows(app, a!, 'SELECT COUNT(*) AS n FROM users WHERE id = ?')).toBe(0);
    expect(rows(app, a!, 'SELECT COUNT(*) AS n FROM matches WHERE home_user_id = ? OR away_user_id = ? OR challenger_id = ?')).toBe(0);
    const pool = app.db.db.prepare('SELECT created_by FROM pools WHERE id = ?').get(poolId) as { created_by: string } | undefined;
    expect(pool?.created_by).toBe(b!.id);
    expect((await app.api('GET', `/api/pools/${poolId}`, { token: b!.token })).status).toBe(200);
  });

  it('een pool zonder andere leden vervalt bij verwijderen; zonder sessie 401', async () => {
    const app = createApp();
    const { poolId, users } = await poolWith(app, ['Solo']);
    await app.api('DELETE', '/api/me', { token: users[0]!.token });
    expect((app.db.db.prepare('SELECT COUNT(*) AS n FROM pools WHERE id = ?').get(poolId) as { n: number }).n).toBe(0);
    expect((await app.api('DELETE', '/api/me')).status).toBe(401);
  });
});
