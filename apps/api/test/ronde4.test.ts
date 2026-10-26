import { describe, expect, it } from 'vitest';
import { createApp, idem, platformCode, poolWith, register, type TestUser } from './helpers.ts';
import { startMatch } from './squads.ts';

const grade = (extra: Record<string, unknown> = {}) => ({ subjectId: 'wiskunde', testName: 'Toets 1', value: 7, weight: 1, date: '2026-10-20', ...extra });

describe('config en feature flags', () => {
  it('transfermarkt staat standaard uit; deadline asynchroon standaard 48 uur', async () => {
    const app = createApp();
    const res = await app.api('GET', '/api/config');
    expect(res.status).toBe(200);
    expect(res.body.flags.market).toBe(false);
    expect(res.body.asyncDeadlineHours).toBe(48);
    const on = createApp({ FEATURE_MARKET: 'true', ASYNC_DEADLINE_HOURS: '24' });
    expect((await on.api('GET', '/api/config')).body).toMatchObject({ flags: { market: true }, asyncDeadlineHours: 24 });
  });
});

describe('doelen en geplande toetsen', () => {
  it('doel vervangt een ouder doel voor hetzelfde vak; doel bereikt geeft Vooruitgangs-XP en een doelpack; alleen voor jezelf', async () => {
    const app = createApp();
    const code = await platformCode(app, { maxUses: 5 });
    const u = await register(app, 'Doelen', code);
    const other = await register(app, 'Anders', code);
    await app.api('POST', '/api/grades', { token: u.token, idem: idem(), body: grade({ value: 5, testName: 'SO 1', date: '2026-10-10' }) });
    await app.api('POST', '/api/goals', { token: u.token, body: { scope: 'subject', subjectId: 'wiskunde', target: 7 } });
    const g2 = await app.api('POST', '/api/goals', { token: u.token, body: { scope: 'subject', subjectId: 'wiskunde', target: 6 } });
    expect(g2.status).toBe(201);
    const plan = await app.api('GET', '/api/planning', { token: u.token });
    expect(plan.body.goals).toHaveLength(1);
    expect(plan.body.goals[0].target).toBe(6);
    // 5 en 7 → gemiddelde 6: doel bereikt
    const hit = await app.api('POST', '/api/grades', { token: u.token, idem: idem(), body: grade({ value: 7, testName: 'SO 2', date: '2026-10-26' }) });
    expect(hit.body.xp.entries.some((e: { key: string }) => e.key.startsWith('doel:'))).toBe(true);
    const packs = await app.api('GET', '/api/packs', { token: u.token });
    expect(packs.body.unopened.some((p: { source: string; packId: string }) => p.packId === 'gold')).toBe(true);
    // Toetsen plannen: verleden geweigerd; andermans doel niet te verwijderen.
    expect((await app.api('POST', '/api/upcoming', { token: u.token, body: { subjectId: 'wiskunde', name: 'H5', date: '2026-01-01', weight: 2 } })).status).toBe(400);
    expect((await app.api('POST', '/api/upcoming', { token: u.token, body: { subjectId: 'wiskunde', name: 'H5', date: '2026-11-03', weight: 2 } })).status).toBe(201);
    expect((await app.api('DELETE', `/api/goals/${g2.body.goal.id}`, { token: other.token })).status).toBe(404);
    expect((await app.api('GET', '/api/planning', { token: other.token })).body).toEqual({ goals: [], upcoming: [] });
  });
});

describe('cijferkluis op de server', () => {
  it('nieuwe beloning staat in de kluis tot hij geopend is; andere speler ziet niets', async () => {
    const app = createApp();
    const code = await platformCode(app, { maxUses: 5 });
    const u = await register(app, 'Kluis', code);
    const other = await register(app, 'Nieuwsgierig', code);
    await app.api('POST', '/api/grades', { token: u.token, idem: idem(), body: grade({ value: 8.6 }) });
    const vault = await app.api('GET', '/api/vault', { token: u.token });
    expect(vault.body.items).toHaveLength(1);
    const item = vault.body.items[0];
    expect(item.grade).toMatchObject({ value: 8.6, subjectId: 'wiskunde' });
    expect(item.xp.length).toBeGreaterThan(0);
    expect((await app.api('GET', '/api/vault', { token: other.token })).body.items).toEqual([]);
    expect((await app.api('POST', `/api/vault/${item.grantId}/seen`, { token: other.token })).status).toBe(404);
    expect((await app.api('POST', `/api/vault/${item.grantId}/seen`, { token: u.token })).status).toBe(200);
    expect((await app.api('GET', '/api/vault', { token: u.token })).body.items).toEqual([]);
  });

  it('9,5+ (Legendarisch): Elitepack en voucher; geen spelerskeuze in de eerlijke configuratie', async () => {
    const app = createApp();
    const u = await register(app, 'Legende', await platformCode(app));
    await app.api('POST', '/api/grades', { token: u.token, idem: idem(), body: grade({ value: 9.8 }) });
    const item = (await app.api('GET', '/api/vault', { token: u.token })).body.items[0];
    expect(item).toMatchObject({ tierId: 'legendary', packId: 'elite', vouchers: 1, pick: null });
  });
});

describe('draft op de server', () => {
  it('kost een voucher, bewaart de sessie, accepteert alleen aangeboden spelers en rondt af', async () => {
    const app = createApp();
    const u = await register(app, 'Drafter', await platformCode(app));
    expect((await app.api('POST', '/api/draft', { token: u.token, idem: idem() })).status).toBe(409); // geen voucher
    // 8,5+ → Uitstekend met een voucher (V-011)
    await app.api('POST', '/api/grades', { token: u.token, idem: idem(), body: grade({ value: 8.8 }) });
    const start = await app.api('POST', '/api/draft', { token: u.token, idem: idem() });
    expect(start.status).toBe(201);
    expect((await app.api('POST', '/api/draft', { token: u.token, idem: idem() })).status).toBe(409); // al een actieve draft
    let draft = start.body.draft;
    expect((await app.api('POST', `/api/draft/${draft.id}/pick`, { token: u.token, body: { slotId: draft.session.slots[0].slotId, playerId: 'niet-aangeboden' } })).status).toBe(400);
    for (const slot of draft.session.slots) {
      const r = await app.api('POST', `/api/draft/${draft.id}/pick`, { token: u.token, body: { slotId: slot.slotId, playerId: slot.offers[0].id } });
      expect(r.status).toBe(200);
      draft = r.body.draft;
    }
    expect(draft.status).toBe('finished');
    expect(draft.complete).toBe(true);
    expect(draft.rating).toBeGreaterThan(0);
    const status = await app.api('GET', '/api/draft', { token: u.token });
    expect(status.body.active).toBeNull();
    const other = await register(app, 'Spieker', await platformCode(app));
    expect((await app.api('POST', `/api/draft/${draft.id}/pick`, { token: other.token, body: { slotId: 'x', playerId: 'y' } })).status).toBe(404);
  });
});

describe('asynchrone wedstrijden met deadline (V-014)', () => {
  it('standaard 48 uur om te accepteren; daarna verlopen', async () => {
    const app = createApp();
    const { poolId, users } = await poolWith(app, ['Arie', 'Bea']);
    const [arie, bea] = users as [TestUser, TestUser];
    const ch = await app.api('POST', `/api/pools/${poolId}/matches`, { token: arie.token, body: { opponentId: bea.id } });
    expect(ch.status).toBe(201);
    expect(ch.body.match).toMatchObject({ timing: 'async', deadlineHours: 48, status: 'pending' });
    app.advance(49 * 3600_000);
    const late = await app.api('POST', `/api/matches/${ch.body.match.id}/accept`, { token: bea.token });
    expect(late.status).toBe(409);
    expect(late.body.error.code).toBe('expired');
    const list = await app.api('GET', `/api/pools/${poolId}/matches`, { token: arie.token });
    expect(list.body.matches[0].status).toBe('expired');
  });

  it('instelbare deadline wordt de bedenktijd per zet', async () => {
    const app = createApp();
    const { poolId, users } = await poolWith(app, ['Cor', 'Dirk']);
    const [cor, dirk] = users as [TestUser, TestUser];
    const { accepted } = await startMatch(app, poolId, cor, dirk, { deadlineHours: 12 });
    expect(accepted.match.deadlineHours).toBe(12);
    expect(accepted.battle.state.config.moveTimeoutMs).toBe(12 * 3600_000);
    expect(accepted.battle.state.deadline - accepted.battle.state.lastEventAt).toBe(12 * 3600_000);
  });
});
