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

import { practiceQuestion } from '../src/engine.ts';

describe('Academy op de server', () => {
  it('geen antwoorden vooraf; nakijken op de server; één keer inleveren; fouten komen later terug als herkansing', async () => {
    const app = createApp();
    const code = await platformCode(app, { maxUses: 5 });
    const u = await register(app, 'Oefenaar', code);
    const other = await register(app, 'Afkijker', code);
    const s1 = await app.api('POST', '/api/academy/sessions', { token: u.token, body: { subjectId: 'fa' } });
    expect(s1.status).toBe(201);
    const items = s1.body.session.items as { id: string; answer?: string }[];
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((i) => i.answer === undefined)).toBe(true);
    // Alles goed behalve de eerste vraag.
    const answers = Object.fromEntries(items.map((i, n) => [i.id, n === 0 ? 'fout-antwoord' : practiceQuestion(i.id)!.answer]));
    expect((await app.api('POST', `/api/academy/sessions/${s1.body.session.id}/submit`, { token: other.token, body: { answers } })).status).toBe(404);
    const r1 = await app.api('POST', `/api/academy/sessions/${s1.body.session.id}/submit`, { token: u.token, body: { answers } });
    expect(r1.status).toBe(200);
    expect(r1.body.summary.correctCount).toBe(items.length - 1);
    expect(r1.body.results[0]).toMatchObject({ correct: false, answer: practiceQuestion(items[0]!.id)!.answer });
    expect(r1.body.decision.status).toBe('rewarded');
    expect(r1.body.decision.xp).toBeGreaterThan(0);
    expect((await app.api('POST', `/api/academy/sessions/${s1.body.session.id}/submit`, { token: u.token, body: { answers } })).status).toBe(409);
    // Volgende dag: de foute vraag komt terug als herkansing; goed beantwoord telt als verbeterde fout.
    app.advance(25 * 3600_000);
    const s2 = await app.api('POST', '/api/academy/sessions', { token: u.token, body: { subjectId: 'fa' } });
    const fix = (s2.body.session.items as { id: string; reason: string }[]).find((i) => i.id === items[0]!.id);
    expect(fix?.reason).toBe('fix');
    const answers2 = Object.fromEntries((s2.body.session.items as { id: string }[]).map((i) => [i.id, practiceQuestion(i.id)!.answer]));
    const r2 = await app.api('POST', `/api/academy/sessions/${s2.body.session.id}/submit`, { token: u.token, body: { answers: answers2 } });
    expect(r2.body.summary.mistakesFixed).toBe(1);
    expect(r2.body.decision.entries.some((e: { label: string }) => /fout/i.test(e.label))).toBe(true);
    const overview = await app.api('GET', '/api/academy', { token: u.token });
    expect(overview.body.recent).toHaveLength(2);
    expect(overview.body.xp.total).toBeGreaterThan(0);
    expect(overview.body.progress.some((t: { subjectId: string; learning: number; mastered: number }) => t.subjectId === 'fa' && t.learning + t.mastered > 0)).toBe(true);
    expect((await app.api('GET', '/api/academy', { token: other.token })).body.recent).toEqual([]);
  });

  it('Academy uit via feature flag: 404', async () => {
    const app = createApp({ FEATURE_ACADEMY: 'false' });
    const u = await register(app, 'Uit', await platformCode(app));
    expect((await app.api('GET', '/api/academy', { token: u.token })).status).toBe(404);
  });
});

describe('Grade League in een pool (server)', () => {
  it('alleen plaats en totaalscore van anderen; eigen deelscores; niet-lid 404', async () => {
    const app = createApp();
    const { poolId, users } = await poolWith(app, ['Gerda', 'Henk']);
    const [gerda, henk] = users as [TestUser, TestUser];
    for (const [u, vals] of [[gerda, [6, 7, 8]], [henk, [5, 5.5]]] as const) {
      let i = 0;
      for (const v of vals) await app.api('POST', '/api/grades', { token: u.token, idem: idem(), body: grade({ value: v, testName: `T${i}`, date: `2026-10-1${3 + i++}` }) });
    }
    const res = await app.api('GET', `/api/pools/${poolId}/grade-league`, { token: gerda.token });
    expect(res.status).toBe(200);
    const mine = res.body.rows.find((r: { me: boolean }) => r.me);
    const theirs = res.body.rows.find((r: { me: boolean }) => !r.me);
    expect(mine.components).toBeDefined();
    expect(theirs.components).toBeUndefined();
    expect(theirs.explanation).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toMatch(/"value"|"grades"/);
    const outsider = await register(app, 'Buiten', await platformCode(app));
    expect((await app.api('GET', `/api/pools/${poolId}/grade-league`, { token: outsider.token })).status).toBe(404);
  });
});

describe('snel verkopen', () => {
  it('alleen eigen kaarten buiten elftal en bank; coins volgens de engine; minimaal 11 kaarten over', async () => {
    const app = createApp();
    const code = await platformCode(app, { maxUses: 5 });
    const u = await register(app, 'Verkoper', code);
    const other = await register(app, 'Koper', code);
    const lineup = (await app.api('GET', '/api/lineup', { token: u.token })).body;
    // Bank leegmaken zodat reserves vrij zijn.
    await app.api('PUT', '/api/lineup', { token: u.token, body: { cardIds: lineup.cardIds, formationId: '4-3-3', bench: [] } });
    const reserves = lineup.bench as string[];
    expect((await app.api('POST', '/api/collection/sell', { token: u.token, idem: idem(), body: { cardIds: [lineup.cardIds[0]] } })).status).toBe(409);
    expect((await app.api('POST', '/api/collection/sell', { token: other.token, idem: idem(), body: { cardIds: [reserves[0]] } })).status).toBe(404);
    const sold = await app.api('POST', '/api/collection/sell', { token: u.token, idem: idem(), body: { cardIds: reserves.slice(0, 2) } });
    expect(sold.status).toBe(200);
    expect(sold.body.sold).toBe(2);
    expect(sold.body.coins).toBeGreaterThan(0);
    expect(sold.body.balances.coins).toBe(sold.body.coins);
    expect((await app.api('GET', '/api/collection', { token: u.token })).body.cards).toHaveLength(16);
    // Alle overige reserves + 1 zou onder de 11 komen? Nee: 16 - 5 = 11 mag, maar elftalkaarten blijven geblokkeerd.
    const rest = reserves.slice(2);
    expect((await app.api('POST', '/api/collection/sell', { token: u.token, idem: idem(), body: { cardIds: rest } })).status).toBe(200);
  });
});
