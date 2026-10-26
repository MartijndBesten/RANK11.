import { afterEach, describe, expect, it, vi } from 'vitest';
import { battleState, type BattleEvent } from '../src/engine.ts';
import { createApp, poolWith, type TestUser } from './helpers.ts';
import { giveSquad, MEDIUM, playOut, startMatch, STRONG, WEAK } from './squads.ts';

afterEach(() => { vi.useRealTimers(); });

describe('battle tussen twee accounts via de API', () => {
  it('volledige wedstrijd, voortijdig beslist, uitslag in D1 en ranglijst', async () => {
    const app = createApp();
    const { poolId, users } = await poolWith(app, ['Anna', 'Bram']);
    const [anna, bram] = users as [TestUser, TestUser];
    expect(Math.min(...STRONG().map((c) => c.rating))).toBeGreaterThan(Math.max(...WEAK().map((c) => c.rating)));
    await giveSquad(app, anna, STRONG());
    const bramCards = await giveSquad(app, bram, WEAK());

    const ch = await app.api('POST', `/api/pools/${poolId}/matches`, { token: anna.token, body: { opponentId: bram.id } });
    expect(ch.status).toBe(201);
    expect(ch.body.match).toMatchObject({ status: 'pending', homeUserId: anna.id, awayUserId: bram.id, timing: 'async' });
    const matchId = ch.body.match.id;
    expect((await app.api('POST', `/api/matches/${matchId}/accept`, { token: anna.token })).status).toBe(403);
    expect((await app.api('POST', `/api/matches/${matchId}/moves`, { token: anna.token, body: { cardId: 'x' } })).status).toBe(409);

    const acc = await app.api('POST', `/api/matches/${matchId}/accept`, { token: bram.token });
    expect(acc.status).toBe(200);
    expect(acc.body.match.status).toBe('active');
    expect(acc.body.battle.state.configVersion).toBe('battle.2026.10-2');
    expect((await app.api('POST', `/api/matches/${matchId}/accept`, { token: bram.token })).status).toBe(409);

    // validatie via de server
    const state = acc.body.battle.state;
    const toMove = state.players[state.toMove] === anna.id ? anna : bram;
    const waiting = toMove === anna ? bram : anna;
    const wrongTurn = await app.api('POST', `/api/matches/${matchId}/moves`, { token: waiting.token, body: { cardId: state.available[state.toMove === 'home' ? 'away' : 'home'][0] } });
    expect(wrongTurn.status).toBe(409);
    expect(wrongTurn.body.error.code).toBe('not_your_turn');
    const notOwned = await app.api('POST', `/api/matches/${matchId}/moves`, { token: toMove.token, body: { cardId: toMove === anna ? bramCards[0] : 'card_Anna_0' } });
    expect(notOwned.status).toBe(400);
    expect(notOwned.body.error.code).toBe('card_not_owned');

    const end = await playOut(app, matchId, users);
    expect(end.battle.state.result).toMatchObject({ homeGoals: 6, awayGoals: 0, winner: 'home', decidedEarly: true, forfeit: false });
    expect(end.battle.state.duels).toHaveLength(6);
    expect(end.match).toMatchObject({ status: 'finished', result: { homeGoals: 6, awayGoals: 0, winnerUserId: anna.id, decidedEarly: true, forfeitBy: null } });

    // reconnect: eventlog ophalen en status zelf afleiden
    const ev = await app.api('GET', `/api/matches/${matchId}/events`, { token: bram.token });
    expect(ev.body.events).toHaveLength(13);
    expect(battleState(ev.body.events as BattleEvent[]).result).toEqual(end.battle.state.result);
    expect((await app.api('POST', `/api/matches/${matchId}/moves`, { token: bram.token, body: { cardId: bramCards[10] } })).body.error.code).toBe('match_finished');

    const table = await app.api('GET', `/api/pools/${poolId}/standings`, { token: bram.token });
    expect(table.body.standings[0]).toMatchObject({ participant: anna.id, username: 'Anna', points: 3, goalsFor: 6, played: 1 });
    expect(table.body.standings[1]).toMatchObject({ participant: bram.id, points: 0, goalsAgainst: 6 });
  });

  it('time-outs: server speelt de laagste kaart (alarm én REST-fallback), 3× op rij = reglementair verlies', async () => {
    const app = createApp();
    const { poolId, users } = await poolWith(app, ['Cas', 'Dewi']);
    const [cas, dewi] = users as [TestUser, TestUser];
    await giveSquad(app, cas, MEDIUM());
    await giveSquad(app, dewi, MEDIUM().map((c) => c)); // zelfde kaartdefinities, eigen instanties
    const { matchId, accepted } = await startMatch(app, poolId, cas, dewi, { timing: 'live' });
    const s0 = accepted.battle.state;
    expect(s0.config.moveTimeoutMs).toBe(30_000);
    const sleeper = s0.players[s0.toMove] === cas.id ? cas : dewi;
    const active = sleeper === cas ? dewi : cas;
    const lowest = (side: 'home' | 'away', st: any, cards: any) =>
      [...st.available[side]].sort((a: string, b: string) => {
        const ca = cards[side].find((c: any) => c.id === a); const cb = cards[side].find((c: any) => c.id === b);
        return ca.rating - cb.rating || ca.rating - cb.rating || (a < b ? -1 : 1);
      })[0];
    const sleeperSide = s0.toMove as 'home' | 'away';
    const expectedAuto = lowest(sleeperSide, s0, accepted.battle.cards);

    // 1) DO-alarm na 30 s
    expect(app.dos.entries.get(matchId)?.storage.alarmAt).toBe(s0.deadline);
    app.advance(30_000);
    expect(await app.dos.runAlarms(app.now())).toBe(1);
    let view = (await app.api('GET', `/api/matches/${matchId}`, { token: active.token })).body.battle;
    expect(view.state.duels).toHaveLength(0);
    expect(view.state.openCard).toEqual({ side: sleeperSide, cardId: expectedAuto });
    expect(view.state.consecutiveTimeouts[sleeperSide]).toBe(1);

    // actieve speler verdedigt en valt aan
    let r = await app.api('POST', `/api/matches/${matchId}/moves`, { token: active.token, body: { cardId: view.state.available[sleeperSide === 'home' ? 'away' : 'home'][0] } });
    expect(r.status).toBe(200);
    r = await app.api('POST', `/api/matches/${matchId}/moves`, { token: active.token, body: { cardId: r.body.state.available[sleeperSide === 'home' ? 'away' : 'home'][0] } });
    expect(r.status).toBe(200);

    // 2) REST-fallback: geen alarm, maar een GET na de deadline verwerkt de time-out (en de volgende)
    app.advance(60_000);
    view = (await app.api('GET', `/api/matches/${matchId}`, { token: active.token })).body.battle;
    expect(view.state.status).toBe('finished');
    expect(view.state.result).toMatchObject({ forfeit: true, forfeitReason: 'timeouts', forfeitedBy: sleeperSide });
    const ev = (await app.api('GET', `/api/matches/${matchId}/events`, { token: active.token })).body.events as BattleEvent[];
    expect(ev.filter((e) => e.type === 'played' && e.auto)).toHaveLength(3);
    expect(ev[ev.length - 1]?.type).toBe('forfeit');

    const meta = (await app.api('GET', `/api/matches/${matchId}`, { token: sleeper.token })).body.match;
    expect(meta.status).toBe('finished');
    expect(meta.result).toMatchObject({ forfeitBy: sleeper.id, winnerUserId: active.id });
    const goals = active.id === meta.homeUserId ? [meta.result.homeGoals, meta.result.awayGoals] : [meta.result.awayGoals, meta.result.homeGoals];
    expect(goals).toEqual([3, 0]);
    expect(app.dos.entries.get(matchId)?.storage.alarmAt).toBeNull();
  });

  it('eventlog is persistent: na eviction van de DO gaat de wedstrijd verder', async () => {
    const app = createApp();
    const { poolId, users } = await poolWith(app, ['Eva', 'Femke']);
    const [eva, femke] = users as [TestUser, TestUser];
    await giveSquad(app, eva, MEDIUM());
    await giveSquad(app, femke, MEDIUM());
    const { matchId, accepted } = await startMatch(app, poolId, eva, femke);
    const s = accepted.battle.state;
    const mover = s.players[s.toMove] === eva.id ? eva : femke;
    await app.api('POST', `/api/matches/${matchId}/moves`, { token: mover.token, body: { cardId: s.available[s.toMove][0] } });
    app.dos.evict(matchId);
    const ev = await app.api('GET', `/api/matches/${matchId}/events`, { token: eva.token });
    expect(ev.body.events).toHaveLength(2);
    const end = await playOut(app, matchId, users);
    expect(end.battle.state.status).toBe('finished');
  });

  it('opgeven, weigeren, ontbrekend elftal en toegangsregels', async () => {
    const app = createApp();
    const { poolId, users } = await poolWith(app, ['Gijs', 'Hana', 'Ilse']);
    const [gijs, hana, ilse] = users as [TestUser, TestUser, TestUser];
    app.db.db.prepare('DELETE FROM lineups WHERE user_id = ?').run(gijs.id); // elftal ontbreekt
    const noLineup = await app.api('POST', `/api/pools/${poolId}/matches`, { token: gijs.token, body: { opponentId: hana.id } });
    expect(noLineup.status).toBe(409);
    expect(noLineup.body.error.code).toBe('no_lineup');
    await giveSquad(app, gijs, MEDIUM());
    await giveSquad(app, hana, WEAK());
    expect((await app.api('POST', `/api/pools/${poolId}/matches`, { token: gijs.token, body: { opponentId: gijs.id } })).status).toBe(400);

    const ch = await app.api('POST', `/api/pools/${poolId}/matches`, { token: gijs.token, body: { opponentId: hana.id } });
    expect((await app.api('POST', `/api/matches/${ch.body.match.id}/decline`, { token: hana.token })).status).toBe(200);
    expect((await app.api('POST', `/api/matches/${ch.body.match.id}/accept`, { token: hana.token })).status).toBe(409);

    const { matchId } = await startMatch(app, poolId, gijs, hana);
    // Ilse (lid, geen deelnemer) mag kijken maar niet spelen
    expect((await app.api('GET', `/api/matches/${matchId}`, { token: ilse.token })).status).toBe(200);
    expect((await app.api('POST', `/api/matches/${matchId}/moves`, { token: ilse.token, body: { cardId: 'x' } })).status).toBe(403);
    // buitenstaander: 404
    const outsider = (await poolWith(app, ['Buiten'])).users[0]!;
    expect((await app.api('GET', `/api/matches/${matchId}`, { token: outsider.token })).status).toBe(404);
    expect((await app.api('GET', `/api/matches/${matchId}/events`, { token: outsider.token })).status).toBe(404);

    const res = await app.api('POST', `/api/matches/${matchId}/resign`, { token: hana.token });
    expect(res.status).toBe(200);
    expect(res.body.state.result).toMatchObject({ forfeit: true, forfeitReason: 'resign', winner: 'home' });
    const list = await app.api('GET', `/api/pools/${poolId}/matches`, { token: ilse.token });
    expect(list.body.matches.map((m: { status: string }) => m.status).sort()).toEqual(['declined', 'finished']);
  });

  it('WebSocket-berichten (hibernation-handlers): zet, broadcast aan beide spelers, fout en sync', async () => {
    const app = createApp();
    const { poolId, users } = await poolWith(app, ['Jade', 'Koen']);
    const [jade, koen] = users as [TestUser, TestUser];
    await giveSquad(app, jade, MEDIUM());
    await giveSquad(app, koen, MEDIUM());
    const { matchId, accepted } = await startMatch(app, poolId, jade, koen);
    const s = accepted.battle.state;
    const { instance, connect } = app.dos.socket(matchId);
    const wsJade = connect(jade.id);
    const wsKoen = connect(koen.id);
    const mover = s.players[s.toMove] === jade.id ? { ws: wsJade } : { ws: wsKoen };
    const other = mover.ws === wsJade ? wsKoen : wsJade;

    await instance.webSocketMessage(other as unknown as WebSocket, JSON.stringify({ type: 'move', cardId: 'x', requestId: 'r1' }));
    expect(other.sent.at(-1)).toMatchObject({ type: 'error', requestId: 'r1', code: 'not_your_turn' });

    await instance.webSocketMessage(mover.ws as unknown as WebSocket, JSON.stringify({ type: 'move', cardId: s.available[s.toMove][0], requestId: 'r2' }));
    expect(mover.ws.sent.at(-1)).toMatchObject({ type: 'ack', requestId: 'r2' });
    for (const ws of [wsJade, wsKoen]) {
      const msg = ws.sent.find((m: any) => m.type === 'events') as any;
      expect(msg.events).toHaveLength(1);
      expect(msg.view.state.phase).toBe('defend');
    }
    await instance.webSocketMessage(other as unknown as WebSocket, JSON.stringify({ type: 'sync', requestId: 'r3' }));
    expect(other.sent.at(-1)).toMatchObject({ type: 'sync', requestId: 'r3' });
    expect((other.sent.at(-1) as any).events).toHaveLength(2);
    await instance.webSocketMessage(other as unknown as WebSocket, 'geen json');
    expect(other.sent.at(-1)).toMatchObject({ type: 'error', code: 'bad_request' });
    await instance.webSocketClose(other as unknown as WebSocket, 1006);
    expect(other.closed).toBe(1000);
  });
});
