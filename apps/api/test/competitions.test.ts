import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp, poolWith, type TestUser } from './helpers.ts';
import { giveSquad, MEDIUM, playOut, STRONG, WEAK } from './squads.ts';

afterEach(() => { vi.useRealTimers(); });

const HOUR = 3600_000;

describe('competitie in een pool', () => {
  it('round-robin via de engine, wedstrijden per fixture, forfait na deadline en ranglijst', async () => {
    const app = createApp();
    const { poolId, users } = await poolWith(app, ['Sterk', 'Middel', 'Zwak']);
    const [sterk, middel, zwak] = users as [TestUser, TestUser, TestUser];
    await giveSquad(app, sterk, STRONG());
    await giveSquad(app, middel, MEDIUM());
    await giveSquad(app, zwak, WEAK());

    expect((await app.api('POST', `/api/pools/${poolId}/competitions`, { token: middel.token, body: { name: 'Nee' } })).status).toBe(403);
    const created = await app.api('POST', `/api/pools/${poolId}/competitions`, { token: sterk.token, body: { name: 'Herfstcompetitie', roundHours: 24 } });
    expect(created.status).toBe(201);
    expect(created.body.competition).toMatchObject({ rounds: 3, fixtures: 3, unplayedRule: 'double-forfeit' });
    const cid = created.body.competition.id;

    let comp = await app.api('GET', `/api/pools/${poolId}/competitions/${cid}`, { token: zwak.token });
    const fixtures = comp.body.fixtures as { id: string; round: number; homeUserId: string; awayUserId: string; deadline: number; status: string }[];
    expect(fixtures).toHaveLength(3);
    expect(fixtures.map((f) => f.deadline)).toEqual([...fixtures].map((f) => app.now() + f.round * 24 * HOUR));
    const fx = (a: TestUser, b: TestUser) => fixtures.find((f) => new Set([f.homeUserId, f.awayUserId]).has(a.id) && new Set([f.homeUserId, f.awayUserId]).has(b.id))!;

    // Sterk speelt (en wint) beide wedstrijden
    for (const opp of [middel, zwak]) {
      const f = fx(sterk, opp);
      const ch = await app.api('POST', `/api/pools/${poolId}/matches`, { token: sterk.token, body: { opponentId: opp.id, fixtureId: f.id } });
      expect(ch.status).toBe(201);
      expect(ch.body.match).toMatchObject({ homeUserId: f.homeUserId, awayUserId: f.awayUserId, fixtureId: f.id });
      expect((await app.api('POST', `/api/pools/${poolId}/matches`, { token: opp.id === middel.id ? middel.token : zwak.token, body: { opponentId: sterk.id, fixtureId: f.id } })).status).toBe(409);
      expect((await app.api('POST', `/api/matches/${ch.body.match.id}/accept`, { token: opp.token })).status).toBe(200);
      const end = await playOut(app, ch.body.match.id, users);
      expect(end.match.result.winnerUserId).toBe(sterk.id);
    }
    // Zwak mag niet de fixture van twee anderen claimen
    const mz = fx(middel, zwak);
    expect((await app.api('POST', `/api/pools/${poolId}/matches`, { token: zwak.token, body: { opponentId: sterk.id, fixtureId: mz.id } })).status).toBe(400);
    // Middel daagt Zwak uit, Zwak reageert niet vóór de deadline
    const ch = await app.api('POST', `/api/pools/${poolId}/matches`, { token: middel.token, body: { opponentId: zwak.id, fixtureId: mz.id } });
    expect(ch.status).toBe(201);
    comp = await app.api('GET', `/api/pools/${poolId}/competitions/${cid}`, { token: zwak.token });
    expect(comp.body.fixtures.find((f: { id: string }) => f.id === mz.id).status).toBe('pending');

    app.setTime(mz.deadline + 1);
    expect((await app.api('POST', `/api/pools/${poolId}/matches`, { token: zwak.token, body: { opponentId: middel.id, fixtureId: mz.id } })).status).toBe(409);
    comp = await app.api('GET', `/api/pools/${poolId}/competitions/${cid}`, { token: zwak.token });
    const mzView = comp.body.fixtures.find((f: { id: string }) => f.id === mz.id);
    expect(mzView.status).toBe('forfeit');
    const table = comp.body.standings as { participant: string; points: number; played: number; goalsFor: number; goalsAgainst: number; forfeits: number; won: number; lost: number; form: string[] }[];
    expect(table.map((t) => t.participant)).toEqual([sterk.id, middel.id, zwak.id]);
    expect(table[0]).toMatchObject({ played: 2, won: 2, points: 6, goalsFor: 12, goalsAgainst: 0 });
    expect(table[1]).toMatchObject({ played: 2, won: 1, lost: 1, points: 3, goalsFor: 3, goalsAgainst: 6 });
    expect(table[2]).toMatchObject({ played: 2, lost: 2, points: 0, goalsFor: 0, goalsAgainst: 9, forfeits: 1 });

    const list = await app.api('GET', `/api/pools/${poolId}/competitions`, { token: middel.token });
    expect(list.body.competitions).toHaveLength(1);
  });

  it('niemand speelt vóór de deadline: dubbel forfait (standaard) of vervallen', async () => {
    const app = createApp();
    const { poolId, users } = await poolWith(app, ['Ruud', 'Saar']);
    const [ruud] = users as [TestUser, TestUser];
    const a = await app.api('POST', `/api/pools/${poolId}/competitions`, { token: ruud.token, body: { name: 'Streng', roundHours: 1 } });
    const b = await app.api('POST', `/api/pools/${poolId}/competitions`, { token: ruud.token, body: { name: 'Mild', roundHours: 1, unplayedRule: 'void' } });
    app.advance(HOUR + 1);
    const strict = await app.api('GET', `/api/pools/${poolId}/competitions/${a.body.competition.id}`, { token: ruud.token });
    expect(strict.body.fixtures[0].status).toBe('forfeit');
    expect(strict.body.standings.every((s: { played: number; lost: number; points: number; forfeits: number }) => s.played === 1 && s.lost === 1 && s.points === 0 && s.forfeits === 1)).toBe(true);
    const mild = await app.api('GET', `/api/pools/${poolId}/competitions/${b.body.competition.id}`, { token: ruud.token });
    expect(mild.body.fixtures[0].status).toBe('void');
    expect(mild.body.standings.every((s: { played: number }) => s.played === 0)).toBe(true);
  });

  it('dubbele competitie: iedereen twee keer, één keer thuis', async () => {
    const app = createApp();
    const { poolId, users } = await poolWith(app, ['Tim', 'Uma', 'Vera', 'Wout']);
    const res = await app.api('POST', `/api/pools/${poolId}/competitions`, { token: users[0]?.token, body: { name: 'Heen en terug', double: true } });
    expect(res.body.competition).toMatchObject({ rounds: 6, fixtures: 12 });
  });
});
