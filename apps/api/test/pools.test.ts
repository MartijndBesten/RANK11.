import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp, platformCode, poolWith, register } from './helpers.ts';

afterEach(() => { vi.useRealTimers(); });

describe('pools', () => {
  it('aanmaken, uitnodigen, lid worden, leden en rollen', async () => {
    const app = createApp();
    const admin = await register(app, 'Beheer', await platformCode(app));
    const created = await app.api('POST', '/api/pools', { token: admin.token, body: { name: 'Klas 2B' } });
    expect(created.status).toBe(201);
    expect(created.body.pool).toMatchObject({ name: 'Klas 2B', maxMembers: 20, role: 'admin', memberCount: 1 });
    const poolId = created.body.pool.id;

    const inv = await app.api('POST', `/api/pools/${poolId}/invites`, { token: admin.token, body: { maxUses: 5, expiresInHours: 24 } });
    expect(inv.status).toBe(201);
    expect(inv.body.invite.code).toMatch(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/);

    const other = await register(app, 'Lid', await platformCode(app));
    const join = await app.api('POST', '/api/pools/join', { token: other.token, body: { code: inv.body.invite.code } });
    expect(join.status).toBe(201);
    expect(join.body.pool).toMatchObject({ id: poolId, role: 'member', memberCount: 2 });
    expect((await app.api('POST', '/api/pools/join', { token: other.token, body: { code: inv.body.invite.code } })).status).toBe(409);

    const members = await app.api('GET', `/api/pools/${poolId}/members`, { token: other.token });
    expect(members.body.members.map((m: { username: string; role: string }) => [m.username, m.role])).toEqual([['Beheer', 'admin'], ['Lid', 'member']]);

    expect((await app.api('POST', `/api/pools/${poolId}/invites`, { token: other.token, body: {} })).status).toBe(403);
    expect((await app.api('PATCH', `/api/pools/${poolId}/members/${admin.id}`, { token: other.token, body: { role: 'member' } })).status).toBe(403);
    expect((await app.api('PATCH', `/api/pools/${poolId}/members/${admin.id}`, { token: admin.token, body: { role: 'member' } })).status).toBe(409); // laatste beheerder
    expect((await app.api('PATCH', `/api/pools/${poolId}/members/${other.id}`, { token: admin.token, body: { role: 'admin' } })).status).toBe(200);
    expect((await app.api('PATCH', `/api/pools/${poolId}/members/${admin.id}`, { token: other.token, body: { role: 'member' } })).status).toBe(200);
    const mine = await app.api('GET', '/api/pools', { token: admin.token });
    expect(mine.body.pools[0]).toMatchObject({ id: poolId, role: 'member' });
  });

  it('uitnodigingscodes worden alleen gehasht opgeslagen', async () => {
    const app = createApp();
    const { poolId, users } = await poolWith(app, ['Ad1']);
    const inv = await app.api('POST', `/api/pools/${poolId}/invites`, { token: users[0]?.token, body: {} });
    const code: string = inv.body.invite.code;
    const dump = JSON.stringify(app.db.db.prepare('SELECT * FROM pool_invites').all()) + JSON.stringify(app.db.db.prepare('SELECT * FROM audit_log').all());
    expect(dump).not.toContain(code);
    expect(dump).not.toContain(code.replace('-', ''));
  });

  it('registreren met een poolcode maakt je direct lid', async () => {
    const app = createApp();
    const { poolId, users } = await poolWith(app, ['Eigenaar', 'Kim']);
    const kim = users[1];
    const pool = await app.api('GET', `/api/pools/${poolId}`, { token: kim?.token });
    expect(pool.status).toBe(200);
    expect(pool.body.pool.role).toBe('member');
  });

  it('verlopen code en maximaal gebruik', async () => {
    const app = createApp();
    const { poolId, users } = await poolWith(app, ['Baas']);
    const admin = users[0]!;
    const once = await app.api('POST', `/api/pools/${poolId}/invites`, { token: admin.token, body: { maxUses: 1 } });
    const a = await register(app, 'Een', await platformCode(app));
    const b = await register(app, 'Twee', await platformCode(app));
    expect((await app.api('POST', '/api/pools/join', { token: a.token, body: { code: once.body.invite.code } })).status).toBe(201);
    const used = await app.api('POST', '/api/pools/join', { token: b.token, body: { code: once.body.invite.code } });
    expect(used.status).toBe(400);
    expect(used.body.error.message).toBe('Deze code is ongeldig of verlopen.');

    const short = await app.api('POST', `/api/pools/${poolId}/invites`, { token: admin.token, body: { expiresInHours: 1 } });
    app.advance(3600_000 + 1);
    expect((await app.api('POST', '/api/pools/join', { token: b.token, body: { code: short.body.invite.code } })).status).toBe(400);
    // registreren met een verlopen poolcode lukt ook niet
    const reg = await app.api('POST', '/api/auth/register', { body: { username: 'Drie', password: 'lang-genoeg-1', inviteCode: short.body.invite.code } });
    expect(reg.status).toBe(400);
  });

  it('maximaal aantal leden (configureerbaar) wordt afgedwongen', async () => {
    const app = createApp();
    const { poolId, users } = await poolWith(app, ['Max', 'Een'], { maxMembers: 2 });
    expect(users).toHaveLength(2);
    const inv = await app.api('POST', `/api/pools/${poolId}/invites`, { token: users[0]?.token, body: { maxUses: 10 } });
    const extra = await register(app, 'Extra', await platformCode(app));
    const full = await app.api('POST', '/api/pools/join', { token: extra.token, body: { code: inv.body.invite.code } });
    expect(full.status).toBe(409);
    expect(full.body.error.code).toBe('pool_full');
    const reg = await app.api('POST', '/api/auth/register', { body: { username: 'Nog1', password: 'lang-genoeg-1', inviteCode: inv.body.invite.code } });
    expect(reg.status).toBe(409);
    // geen half aangemaakt account na een volle pool
    expect(app.db.db.prepare(`SELECT COUNT(*) AS n FROM users WHERE username = 'Nog1'`).get()).toEqual({ n: 0 });
    // gebruik van de code is niet opgehoogd door de mislukte pogingen
    expect(app.db.db.prepare('SELECT uses FROM pool_invites WHERE id = ?').get(inv.body.invite.id)).toEqual({ uses: 0 });
  });

  it('isolatie: gebruiker A ziet de pool van B niet (overal 404)', async () => {
    const app = createApp();
    const b = await poolWith(app, ['Bob', 'Bea']);
    const a = await poolWith(app, ['Anna']);
    const anna = a.users[0]!;
    const p = b.poolId;
    for (const [method, path, body] of [
      ['GET', `/api/pools/${p}`, undefined],
      ['GET', `/api/pools/${p}/members`, undefined],
      ['POST', `/api/pools/${p}/invites`, {}],
      ['PATCH', `/api/pools/${p}/members/${b.users[1]?.id}`, { role: 'admin' }],
      ['GET', `/api/pools/${p}/standings`, undefined],
      ['GET', `/api/pools/${p}/competitions`, undefined],
      ['POST', `/api/pools/${p}/competitions`, { name: 'Inbraak' }],
      ['GET', `/api/pools/${p}/matches`, undefined],
      ['POST', `/api/pools/${p}/matches`, { opponentId: b.users[1]?.id }],
      ['GET', '/api/pools/bestaat-niet', undefined],
    ] as const) {
      const res = await app.api(method, path, { token: anna.token, body });
      expect(res.status, `${method} ${path}`).toBe(404);
    }
    const list = await app.api('GET', '/api/pools', { token: anna.token });
    expect(list.body.pools.map((x: { id: string }) => x.id)).toEqual([a.poolId]);
    // Een lid van B kan Anna niet uitdagen (Anna is geen lid van B)
    const bob = b.users[0]!;
    expect((await app.api('POST', `/api/pools/${p}/matches`, { token: bob.token, body: { opponentId: anna.id } })).status).toBe(404);
  });
});
