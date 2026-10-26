/**
 * Isolatie tussen accounts: speler B mag niets van speler A zien of wijzigen (cijfers, doelen, kluis,
 * packs, collectie, draft, oefensessies, pools en wedstrijden). Niet-eigenaar = 404 (bestaan lekt niet).
 */
import { describe, expect, it } from 'vitest';
import { createApp, idem, platformCode, register, type TestApp, type TestUser } from './helpers.ts';

const grade = (extra: Record<string, unknown> = {}) => ({ subjectId: 'wiskunde', testName: 'Toets 1', value: 8.8, weight: 1, date: '2026-10-20', ...extra });

async function setupA(app: TestApp) {
  const code = await platformCode(app, { maxUses: 10 });
  const a = await register(app, 'Anna', code);
  const b = await register(app, 'Bram', code);
  const g = await app.api('POST', '/api/grades', { token: a.token, idem: idem(), body: grade() });
  const goal = await app.api('POST', '/api/goals', { token: a.token, body: { scope: 'subject', subjectId: 'wiskunde', target: 9 } });
  const test = await app.api('POST', '/api/upcoming', { token: a.token, body: { subjectId: 'wiskunde', name: 'H5', date: '2026-11-03', weight: 2 } });
  const vault = await app.api('GET', '/api/vault', { token: a.token });
  const packs = await app.api('GET', '/api/packs', { token: a.token });
  const lineup = await app.api('GET', '/api/lineup', { token: a.token });
  const draft = await app.api('POST', '/api/draft', { token: a.token, idem: idem() });
  const practice = await app.api('POST', '/api/academy/sessions', { token: a.token, body: { subjectId: 'en' } });
  const pool = await app.api('POST', '/api/pools', { token: a.token, body: { name: 'Pool van Anna' } });
  return {
    a, b,
    gradeId: g.body.grade.id as string, goalId: goal.body.goal.id as string, testId: test.body.test.id as string,
    grantId: vault.body.items[0].grantId as string, packGrantId: packs.body.unopened[0].grantId as string,
    lineup: lineup.body.cardIds as string[], draftId: draft.body.draft.id as string, sessionId: practice.body.session.id as string,
    poolId: pool.body.pool.id as string,
  };
}

describe('isolatie tussen accounts', () => {
  it('B kan niets van A lezen of wijzigen', async () => {
    const app = createApp();
    const x = await setupA(app);
    const b: TestUser = x.b;
    const as = (method: string, path: string, body?: unknown) => app.api(method, path, { token: b.token, idem: idem(), body });

    // Lezen: eigen lijsten bevatten niets van A.
    expect((await as('GET', '/api/grades')).body.grades).toEqual([]);
    expect((await as('GET', '/api/vault')).body.items).toEqual([]);
    expect((await as('GET', '/api/planning')).body).toEqual({ goals: [], upcoming: [] });
    expect((await as('GET', '/api/xp')).body.ledger).toEqual([]);
    const bCards = (await as('GET', '/api/collection')).body.cards.map((c: { id: string }) => c.id);
    expect(bCards.some((id: string) => x.lineup.includes(id))).toBe(false);

    // Direct op id: altijd 404 (of 400 bij een elftal met vreemde kaarten), nooit 200.
    const attempts: [string, string, unknown?][] = [
      ['GET', `/api/grades/${x.gradeId}/history`],
      ['PUT', `/api/grades/${x.gradeId}`, { value: 2 }],
      ['DELETE', `/api/grades/${x.gradeId}`],
      ['DELETE', `/api/goals/${x.goalId}`],
      ['DELETE', `/api/upcoming/${x.testId}`],
      ['POST', `/api/vault/${x.grantId}/seen`],
      ['POST', `/api/packs/${x.packGrantId}/open`],
      ['POST', `/api/draft/${x.draftId}/pick`, { slotId: 'gk', playerId: 'x' }],
      ['POST', `/api/academy/sessions/${x.sessionId}/submit`, { answers: {} }],
      ['GET', `/api/pools/${x.poolId}`],
      ['GET', `/api/pools/${x.poolId}/members`],
      ['GET', `/api/pools/${x.poolId}/standings`],
      ['GET', `/api/pools/${x.poolId}/grade-league`],
      ['GET', `/api/pools/${x.poolId}/matches`],
      ['POST', `/api/pools/${x.poolId}/invites`, {}],
    ];
    for (const [method, path, body] of attempts) {
      const res = await as(method, path, body);
      expect([404, 403], `${method} ${path} gaf ${res.status}`).toContain(res.status);
    }
    expect((await as('PUT', '/api/lineup', { cardIds: x.lineup })).status).toBe(400);

    // A's gegevens zijn onveranderd.
    const aGrades = await app.api('GET', '/api/grades', { token: x.a.token });
    expect(aGrades.body.grades).toHaveLength(1);
    expect(aGrades.body.grades[0].value).toBe(8.8);
  });

  it('zonder sessie: 401 op alles behalve health, config, registreren en inloggen', async () => {
    const app = createApp();
    for (const path of ['/api/me', '/api/grades', '/api/collection', '/api/vault', '/api/pools', '/api/academy', '/api/xp', '/api/draft']) {
      expect((await app.api('GET', path)).status, path).toBe(401);
    }
    expect((await app.api('GET', '/api/health')).status).toBe(200);
    expect((await app.api('GET', '/api/config')).status).toBe(200);
  });

  it('wedstrijd: poollid zonder rol in de wedstrijd mag niet zetten; buitenstaander ziet niets', async () => {
    const app = createApp();
    const x = await setupA(app);
    const invite = await app.api('POST', `/api/pools/${x.poolId}/invites`, { token: x.a.token, body: {} });
    await app.api('POST', '/api/pools/join', { token: x.b.token, body: { code: invite.body.invite.code } });
    const c = await register(app, 'Cas', await platformCode(app));
    await app.api('POST', '/api/pools/join', { token: c.token, body: { code: invite.body.invite.code } });
    const ch = await app.api('POST', `/api/pools/${x.poolId}/matches`, { token: x.a.token, body: { opponentId: x.b.id } });
    await app.api('POST', `/api/matches/${ch.body.match.id}/accept`, { token: x.b.token });
    const view = await app.api('GET', `/api/matches/${ch.body.match.id}`, { token: c.token });
    expect(view.status).toBe(200); // poolleden mogen meekijken
    const card = view.body.battle.cards.home[0].id;
    expect((await app.api('POST', `/api/matches/${ch.body.match.id}/moves`, { token: c.token, body: { cardId: card } })).status).toBe(403);
    expect((await app.api('POST', `/api/matches/${ch.body.match.id}/accept`, { token: c.token })).status).toBe(403);
    const d = await register(app, 'Dirk', await platformCode(app));
    expect((await app.api('GET', `/api/matches/${ch.body.match.id}`, { token: d.token })).status).toBe(404);
  });
});
