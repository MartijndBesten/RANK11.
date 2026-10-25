import { describe, expect, it } from 'vitest';
import {
  groupQualifiers, groupStage, knockoutDraw, resolveUnplayed, roundRobin, seedPositions, withDeadlines,
  ScheduleError, type ScheduleRound,
} from '../../src/competition/index.ts';

const players = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`);
const pairKey = (a: string, b: string) => [a, b].sort().join('|');

function checkSingle(rounds: ScheduleRound[], ps: string[]) {
  const pairs = new Map<string, number>();
  const homes = new Map(ps.map((p) => [p, 0]));
  const aways = new Map(ps.map((p) => [p, 0]));
  const byes = new Map(ps.map((p) => [p, 0]));
  for (const rd of rounds) {
    const seen = new Set<string>();
    for (const f of rd.fixtures) {
      expect(seen.has(f.home) || seen.has(f.away)).toBe(false); // max één wedstrijd per ronde
      seen.add(f.home); seen.add(f.away);
      pairs.set(pairKey(f.home, f.away), (pairs.get(pairKey(f.home, f.away)) ?? 0) + 1);
      homes.set(f.home, (homes.get(f.home) ?? 0) + 1);
      aways.set(f.away, (aways.get(f.away) ?? 0) + 1);
    }
    if (rd.bye) {
      expect(seen.has(rd.bye)).toBe(false);
      byes.set(rd.bye, (byes.get(rd.bye) ?? 0) + 1);
      seen.add(rd.bye);
    }
    expect(seen.size).toBe(ps.length); // iedereen speelt of rust
  }
  return { pairs, homes, aways, byes };
}

describe('round-robin (cirkelmethode)', () => {
  for (const n of [2, 3, 4, 5, 6, 7, 8, 11, 12, 16, 20]) {
    it(`${n} deelnemers: iedereen precies één keer tegen iedereen, thuis/uit gebalanceerd`, () => {
      const ps = players(n);
      const rounds = roundRobin(ps);
      expect(rounds).toHaveLength(n % 2 === 0 ? n - 1 : n);
      const { pairs, homes, aways, byes } = checkSingle(rounds, ps);
      expect(pairs.size).toBe((n * (n - 1)) / 2);
      expect([...pairs.values()].every((c) => c === 1)).toBe(true);
      for (const p of ps) expect(Math.abs((homes.get(p) ?? 0) - (aways.get(p) ?? 0))).toBeLessThanOrEqual(1);
      if (n % 2 === 1) for (const p of ps) expect(byes.get(p)).toBe(1);
      else expect(rounds.every((rd) => rd.bye === null)).toBe(true);
    });
  }

  it('dubbel: iedere ontmoeting twee keer, één keer thuis en één keer uit', () => {
    const ps = players(5);
    const rounds = roundRobin(ps, { double: true });
    expect(rounds).toHaveLength(10);
    expect(rounds.map((r) => r.round)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const directed = new Set<string>();
    for (const rd of rounds) for (const f of rd.fixtures) {
      expect(directed.has(`${f.home}>${f.away}`)).toBe(false);
      directed.add(`${f.home}>${f.away}`);
    }
    expect(directed.size).toBe(5 * 4);
    const ids = rounds.flatMap((r) => r.fixtures.map((f) => f.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('deterministisch, ook met schudseed', () => {
    expect(roundRobin(players(6))).toEqual(roundRobin(players(6)));
    expect(roundRobin(players(6), { shuffleSeed: 'x' })).toEqual(roundRobin(players(6), { shuffleSeed: 'x' }));
    expect(roundRobin(players(6), { shuffleSeed: 'x' })).not.toEqual(roundRobin(players(6), { shuffleSeed: 'y' }));
  });

  it('valideert deelnemers', () => {
    expect(() => roundRobin(['a'])).toThrow(ScheduleError);
    expect(() => roundRobin(['a', 'a'])).toThrow(ScheduleError);
    expect(() => roundRobin(['a', ''])).toThrow(ScheduleError);
  });
});

describe('knock-out met seeding en byes', () => {
  it('seedposities scheiden 1 en 2 tot de finale', () => {
    expect(seedPositions(2)).toEqual([1, 2]);
    expect(seedPositions(4)).toEqual([1, 4, 2, 3]);
    expect(seedPositions(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
    expect(() => seedPositions(6)).toThrow(ScheduleError);
  });

  it('8 deelnemers: geen byes, 1-8, 4-5, 2-7, 3-6', () => {
    const d = knockoutDraw(players(8));
    expect(d.size).toBe(8);
    expect(d.byes).toBe(0);
    expect(d.pairings.map((p) => [p.home, p.away])).toEqual([['p1', 'p8'], ['p4', 'p5'], ['p2', 'p7'], ['p3', 'p6']]);
  });

  it('6 deelnemers: bracket van 8, de twee hoogste seeds krijgen een bye', () => {
    const d = knockoutDraw(players(6));
    expect(d.size).toBe(8);
    expect(d.byes).toBe(2);
    const byes = d.pairings.filter((p) => p.away === null).map((p) => p.home);
    expect(byes.sort()).toEqual(['p1', 'p2']);
    expect(d.pairings.filter((p) => p.away !== null)).toHaveLength(2);
  });

  it('3 en 5 deelnemers', () => {
    expect(knockoutDraw(players(3)).pairings.map((p) => [p.home, p.away])).toEqual([['p1', null], ['p2', 'p3']]);
    const five = knockoutDraw(players(5));
    expect(five.byes).toBe(3);
    expect(five.pairings.filter((p) => p.away !== null).map((p) => [p.home, p.away])).toEqual([['p4', 'p5']]);
  });
});

describe('poulefase en finale', () => {
  it('slangverdeling over poules, met round-robin per poule', () => {
    const groups = groupStage(players(8), { groups: 2 });
    expect(groups.map((g) => g.id)).toEqual(['A', 'B']);
    expect(groups[0]?.participants).toEqual(['p1', 'p4', 'p5', 'p8']);
    expect(groups[1]?.participants).toEqual(['p2', 'p3', 'p6', 'p7']);
    expect(groups[0]?.rounds).toHaveLength(3);
    const odd = groupStage(players(7), { groups: 2 });
    expect(odd.map((g) => g.participants.length)).toEqual([3, 4]); // A: p1,p4,p5 · B: p2,p3,p6,p7
    expect(odd[0]?.rounds.every((r) => r.bye !== null)).toBe(true);
  });

  it('doorgaanden: poulewinnaars treffen in de halve finale een nummer twee van de andere poule', () => {
    const seeded = groupQualifiers([['A1', 'A2', 'A3'], ['B1', 'B2', 'B3']], 2);
    expect(seeded).toEqual(['A1', 'B1', 'A2', 'B2']);
    const semi = knockoutDraw(seeded).pairings.map((p) => [p.home, p.away]);
    expect(semi).toEqual([['A1', 'B2'], ['B1', 'A2']]);
  });

  it('valideert poules', () => {
    expect(() => groupStage(players(3), { groups: 2 })).toThrow(ScheduleError);
    expect(() => groupStage(players(4), { groups: 0 })).toThrow(ScheduleError);
    expect(() => groupQualifiers([['A1'], ['B1', 'B2']], 2)).toThrow(ScheduleError);
  });
});

describe('deadlines en forfaitregel', () => {
  it('deadline per speelronde', () => {
    const dated = withDeadlines(roundRobin(players(4)), { startAt: 1000, roundDurationMs: 100 });
    expect(dated.map((r) => [r.opensAt, r.deadline])).toEqual([[1000, 1100], [1100, 1200], [1200, 1300]]);
    expect(() => withDeadlines([], { startAt: 0, roundDurationMs: 0 })).toThrow(ScheduleError);
  });

  const fx = { id: 'R1-1', home: 'a', away: 'b', deadline: 1000 };
  it('vóór de deadline open, daarna forfait voor wie niet klaar was', () => {
    expect(resolveUnplayed(fx, 999, { home: false, away: false })).toEqual({ kind: 'open' });
    expect(resolveUnplayed(fx, 1000, { home: true, away: true })).toEqual({ kind: 'in-play' });
    expect(resolveUnplayed(fx, 1000, { home: true, away: false })).toMatchObject({ kind: 'forfeit', result: { forfeit: 'away', home: 'a', away: 'b' } });
    expect(resolveUnplayed(fx, 1000, { home: false, away: true })).toMatchObject({ kind: 'forfeit', result: { forfeit: 'home' } });
  });
  it('niemand klaar: dubbel forfait of vervallen (configureerbaar)', () => {
    expect(resolveUnplayed(fx, 2000, { home: false, away: false })).toMatchObject({ kind: 'forfeit', result: { forfeit: 'both' } });
    expect(resolveUnplayed(fx, 2000, { home: false, away: false }, 'void')).toEqual({ kind: 'void' });
  });
});
