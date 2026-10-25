import { describe, expect, it } from 'vitest';
import { battleState, createBattle, type BattleCard, type BattleState } from '../src/engine.ts';
import { MatchRoom, RoomError, type MatchMeta } from '../src/match/room.ts';
import { MemoryStorage } from './helpers.ts';

const card = (id: string, rating: number): BattleCard => ({
  id, rating, position: 'CM', stats: { pace: rating, attack: rating, passing: rating, technique: rating, defending: rating, physical: rating },
});
const team = (p: string, r: number) => Array.from({ length: 11 }, (_, i) => card(`${p}${i}`, r));
const meta: MatchMeta = { matchId: 'm1', poolId: 'p1', homeUserId: 'uh', awayUserId: 'ua' };
const created = (moveTimeoutMs = 1000) => createBattle({
  matchId: 'm1', seed: 'room-seed', at: 0, home: { playerId: 'uh', cards: team('h', 90) }, away: { playerId: 'ua', cards: team('a', 60) },
  config: { moveTimeoutMs },
});

function room(opts: { failReports?: number } = {}) {
  let now = 0;
  let failures = opts.failReports ?? 0;
  const storage = new MemoryStorage();
  const reports: BattleState[] = [];
  const broadcasts: unknown[] = [];
  const r = new MatchRoom(storage, {
    now: () => now,
    broadcast: (m) => broadcasts.push(m),
    reportResult: async (_meta, s) => {
      if (failures > 0) { failures--; throw new Error('D1 tijdelijk onbereikbaar'); }
      reports.push(s);
    },
  });
  return { r, storage, reports, broadcasts, setNow: (t: number) => { now = t; } };
}

describe('MatchRoom (DO-kern met in-memory opslag)', () => {
  it('init bewaart meta + eventlog en zet het alarm op de deadline; dubbel of ongeldig init wordt geweigerd', async () => {
    const { r, storage } = room();
    const view = await r.init(meta, created());
    expect(view.eventCount).toBe(1);
    expect(storage.alarmAt).toBe(1000);
    expect((await storage.get<unknown[]>('events'))?.length).toBe(1);
    await expect(r.init(meta, created())).rejects.toMatchObject({ status: 409 });
    const other = room();
    await expect(other.r.init({ ...meta, homeUserId: 'iemand' }, created())).rejects.toBeInstanceOf(RoomError);
    await expect(other.r.sync()).rejects.toMatchObject({ status: 404 });
    await other.r.alarm(); // niet geïnitialiseerd: geen fout
  });

  it('zetten, broadcast, niet-deelnemer geweigerd, uitslag één keer gerapporteerd', async () => {
    const { r, reports, broadcasts, storage } = room();
    await r.init(meta, created(10_000));
    await expect(r.move('vreemde', 'h0')).rejects.toMatchObject({ status: 403, code: 'not_participant' });
    for (let i = 0; i < 40; i++) {
      const v = await r.sync();
      if (v.state.status === 'finished') break;
      const side = v.state.toMove!;
      await r.move(v.state.players[side], v.state.available[side][0]!);
    }
    const end = await r.sync();
    expect(end.state.result).toMatchObject({ winner: 'home', decidedEarly: true });
    expect(reports).toHaveLength(1);
    expect(storage.alarmAt).toBeNull();
    expect(broadcasts.length).toBe(12);
    await r.sync();
    expect(reports).toHaveLength(1);
  });

  it('time-outs via het alarm; mislukte rapportage wordt bij de volgende sync opnieuw geprobeerd', async () => {
    const { r, reports, setNow, storage } = room({ failReports: 1 });
    await r.init(meta, created(1000));
    setNow(10_000);
    await expect(r.alarm()).rejects.toThrow(/onbereikbaar/);
    const events = await storage.get<Parameters<typeof battleState>[0]>('events');
    expect(battleState(events!).status).toBe('finished'); // eventlog is wel bewaard
    expect(reports).toHaveLength(0);
    await r.sync();
    expect(reports).toHaveLength(1);
    expect(reports[0]?.result).toMatchObject({ forfeit: true, forfeitReason: 'timeouts' });
  });
});
