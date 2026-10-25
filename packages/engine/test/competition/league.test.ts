import { describe, expect, it } from 'vitest';
import { computeStandings, LeagueError, type LeagueResult } from '../../src/competition/index.ts';

const r = (home: string, away: string, homeGoals: number, awayGoals: number, extra: Partial<LeagueResult> = {}): LeagueResult =>
  ({ home, away, homeGoals, awayGoals, ...extra });

describe('ranglijst', () => {
  it('telt gespeeld, W/G/V, doelpunten, saldo en punten 3/1/0', () => {
    const table = computeStandings(['a', 'b', 'c'], [r('a', 'b', 3, 1), r('b', 'c', 2, 2), r('c', 'a', 0, 1)]);
    // b en c beide 1 punt; c heeft het betere saldo (-1 tegen -2)
    expect(table.map((t) => t.participant)).toEqual(['a', 'c', 'b']);
    expect(table[0]).toMatchObject({ rank: 1, played: 2, won: 2, drawn: 0, lost: 0, goalsFor: 4, goalsAgainst: 1, goalDifference: 3, points: 6 });
    expect(table[1]).toMatchObject({ rank: 2, played: 2, drawn: 1, lost: 1, goalsFor: 2, goalsAgainst: 3, goalDifference: -1, points: 1 });
    expect(table[2]).toMatchObject({ rank: 3, played: 2, won: 0, drawn: 1, lost: 1, goalsFor: 3, goalsAgainst: 5, goalDifference: -2, points: 1 });
  });

  it('deelnemers zonder wedstrijden staan erin met nullen', () => {
    const table = computeStandings(['a', 'b', 'z'], [r('a', 'b', 1, 0)]);
    expect(table.find((t) => t.participant === 'z')).toMatchObject({ played: 0, points: 0, form: [] });
  });

  it('puntentelling is configureerbaar', () => {
    const table = computeStandings(['a', 'b'], [r('a', 'b', 1, 1), r('b', 'a', 2, 0)], { config: { points: { win: 2, draw: 1, loss: 0 } } });
    expect(table[0]).toMatchObject({ participant: 'b', points: 3 });
    expect(table[1]).toMatchObject({ participant: 'a', points: 1 });
  });

  it('vorm toont de laatste 5, oudste eerst, op tijdstip gesorteerd', () => {
    const results = [
      r('a', 'b', 1, 0, { playedAt: 1 }), r('a', 'b', 0, 1, { playedAt: 2 }), r('a', 'b', 1, 1, { playedAt: 3 }),
      r('a', 'b', 2, 0, { playedAt: 4 }), r('a', 'b', 2, 0, { playedAt: 5 }), r('a', 'b', 0, 3, { playedAt: 7 }),
      r('a', 'b', 1, 1, { playedAt: 6 }),
    ];
    const a = computeStandings(['a', 'b'], results).find((t) => t.participant === 'a');
    expect(a?.form).toEqual(['G', 'W', 'W', 'G', 'V']);
  });

  it('tie-breakers: punten, dan saldo, dan gescoord', () => {
    const results = [
      r('a', 'x', 3, 0), r('b', 'x', 1, 0), r('c', 'x', 2, 1), // a +3, b +1, c +1 met meer goals
    ];
    const table = computeStandings(['x', 'b', 'c', 'a'], results);
    expect(table.map((t) => t.participant)).toEqual(['a', 'c', 'b', 'x']);
  });

  it('tie-breaker onderling resultaat', () => {
    // a: V(b) W(c) G(d) = 4 pt, 1-1; b: W(a) V(d) G(c) = 4 pt, 1-1 -> b wint onderling van a
    const realTie = [r('a', 'b', 0, 1), r('c', 'a', 0, 1), r('b', 'd', 0, 1), r('d', 'c', 0, 0), r('a', 'd', 0, 0), r('b', 'c', 0, 0)];
    const table = computeStandings(['a', 'b', 'c', 'd'], realTie);
    expect(table.map((t) => t.participant)).toEqual(['d', 'b', 'a', 'c']);
    const [b, a] = [table[1], table[2]];
    expect([a?.points, a?.goalDifference, a?.goalsFor]).toEqual([b?.points, b?.goalDifference, b?.goalsFor]);
  });

  it('daarna alfabetisch op naam en ten slotte op id', () => {
    const names = { u1: 'Zoë', u2: 'Anouk', u3: 'Anouk' };
    const table = computeStandings(['u1', 'u3', 'u2'], [], { names });
    expect(table.map((t) => t.participant)).toEqual(['u2', 'u3', 'u1']);
  });

  it('forfait: verliezer krijgt 0-3, telt als gespeeld en als forfait', () => {
    const table = computeStandings(['a', 'b'], [r('a', 'b', 5, 0, { forfeit: 'home' })]);
    expect(table[0]).toMatchObject({ participant: 'b', won: 1, goalsFor: 3, goalsAgainst: 0, points: 3, forfeits: 0, form: ['W'] });
    expect(table[1]).toMatchObject({ participant: 'a', lost: 1, goalsFor: 0, goalsAgainst: 3, points: 0, forfeits: 1, form: ['V'] });
  });

  it('forfait: strafpunt en dubbel forfait', () => {
    const table = computeStandings(['a', 'b', 'c'], [r('a', 'b', 0, 0, { forfeit: 'both' }), r('a', 'c', 0, 0, { forfeit: 'away' })], { config: { forfeitLossPoints: -1 } });
    const by = (id: string) => table.find((t) => t.participant === id);
    expect(by('a')).toMatchObject({ played: 2, won: 1, lost: 1, points: 2, forfeits: 1 });
    expect(by('b')).toMatchObject({ played: 1, lost: 1, points: -1, goalsFor: 0, goalsAgainst: 0, forfeits: 1 });
    expect(by('c')).toMatchObject({ played: 1, lost: 1, points: -1, goalsAgainst: 3 });
  });

  it('valideert invoer', () => {
    expect(() => computeStandings(['a', 'a'], [])).toThrow(LeagueError);
    expect(() => computeStandings(['a', 'b'], [r('a', 'q', 1, 0)])).toThrow(LeagueError);
    expect(() => computeStandings(['a', 'b'], [r('a', 'a', 1, 0)])).toThrow(LeagueError);
    expect(() => computeStandings(['a', 'b'], [r('a', 'b', -1, 0)])).toThrow(LeagueError);
    expect(() => computeStandings(['a', 'b'], [r('a', 'b', 1.5, 0)])).toThrow(LeagueError);
  });

  it('is deterministisch ongeacht de volgorde van deelnemers', () => {
    const results = [r('a', 'b', 1, 1), r('c', 'd', 1, 1), r('a', 'c', 0, 0), r('b', 'd', 0, 0)];
    const one = computeStandings(['a', 'b', 'c', 'd'], results).map((t) => t.participant);
    const two = computeStandings(['d', 'c', 'b', 'a'], results).map((t) => t.participant);
    expect(one).toEqual(two);
  });
});
