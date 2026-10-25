import { describe, expect, it } from 'vitest';
import {
  extraDuelValue, knockoutMatchId, knockoutState, roundName, TournamentError, type KnockoutMatchResult,
} from '../../src/competition/index.ts';

const players = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`);
const win = (home: number, away: number): KnockoutMatchResult => ({ homeGoals: home, awayGoals: away });

describe('knock-outprogressie', () => {
  it('4 deelnemers: halve finales, finale en kampioen', () => {
    const seeded = players(4);
    let s = knockoutState(seeded, {}, { seed: 't1' });
    expect(s.rounds).toHaveLength(2);
    expect(s.ready.map((m) => m.id)).toEqual(['KO-R1-M1', 'KO-R1-M2']);
    expect(s.rounds[1]?.[0]?.status).toBe('waiting');
    expect(s.champion).toBeNull();

    s = knockoutState(seeded, { 'KO-R1-M1': win(3, 1), 'KO-R1-M2': win(0, 2) }, { seed: 't1' });
    const final = s.rounds[1]?.[0];
    expect(final).toMatchObject({ home: 'p1', away: 'p3', status: 'ready' });
    expect(s.champion).toBeNull();

    s = knockoutState(seeded, { 'KO-R1-M1': win(3, 1), 'KO-R1-M2': win(0, 2), 'KO-R2-M1': win(1, 4) }, { seed: 't1' });
    expect(s.champion).toBe('p3');
    expect(s.ready).toEqual([]);
  });

  it('byes gaan automatisch door', () => {
    const s = knockoutState(players(6), {}, { seed: 'b' });
    const r1 = s.rounds[0] ?? [];
    const byes = r1.filter((m) => m.decidedBy === 'bye');
    expect(byes.map((m) => m.winner).sort()).toEqual(['p1', 'p2']);
    // tweede ronde: bye-winnaar wacht op tegenstander
    expect(s.rounds[1]?.some((m) => m.home === 'p1' && m.status === 'waiting')).toBe(true);
    expect(() => knockoutState(players(6), { [byes[0]?.id as string]: win(1, 0) }, { seed: 'b' })).toThrow(TournamentError);
  });

  it('volledig toernooi met 8 deelnemers: thuisploeg wint steeds', () => {
    const results: Record<string, KnockoutMatchResult> = {};
    let s = knockoutState(players(8), results, { seed: 's' });
    while (!s.champion) {
      for (const m of s.ready) results[m.id] = win(2, 1);
      s = knockoutState(players(8), results, { seed: 's' });
    }
    expect(s.champion).toBe('p1');
    expect(Object.keys(results)).toHaveLength(7);
  });

  it('gelijkspel met extra duel: hoogste waarde wint, ontbrekend duel = wachten', () => {
    const tie = { 'KO-R1-M1': win(2, 2) };
    const pending = knockoutState(players(2), tie, { seed: 'x' });
    expect(pending.needsTiebreak.map((m) => m.id)).toEqual(['KO-R1-M1']);
    expect(pending.champion).toBeNull();
    const decided = knockoutState(players(2), { 'KO-R1-M1': { ...win(2, 2), extraDuel: { home: 88, away: 91 } } }, { seed: 'x' });
    expect(decided.champion).toBe('p2');
    expect(decided.rounds[0]?.[0]?.decidedBy).toBe('extra-duel');
  });

  it('gelijk extra duel en seed-toss zijn deterministisch', () => {
    const res = { 'KO-R1-M1': { ...win(1, 1), extraDuel: { home: 90, away: 90 } } };
    const a = knockoutState(players(2), res, { seed: 'zelfde' });
    const b = knockoutState(players(2), res, { seed: 'zelfde' });
    expect(a.champion).toBe(b.champion);
    expect(a.rounds[0]?.[0]?.decidedBy).toBe('toss');
    const tossWinners = new Set(Array.from({ length: 30 }, (_, i) =>
      knockoutState(players(2), { 'KO-R1-M1': win(0, 0) }, { seed: `s${i}`, config: { tieBreak: 'seed-toss' } }).champion));
    expect(tossWinners).toEqual(new Set(['p1', 'p2']));
  });

  it('forfait laat de tegenstander doorgaan', () => {
    const s = knockoutState(players(2), { 'KO-R1-M1': { homeGoals: 0, awayGoals: 0, forfeit: 'home' } }, { seed: 'f' });
    expect(s.champion).toBe('p2');
    expect(s.rounds[0]?.[0]?.decidedBy).toBe('forfeit');
  });

  it('weigert uitslagen voor onbekende of nog niet speelbare wedstrijden', () => {
    expect(() => knockoutState(players(4), { 'KO-R2-M1': win(1, 0) }, { seed: 'x' })).toThrow(TournamentError);
    expect(() => knockoutState(players(4), { 'KO-R9-M1': win(1, 0) }, { seed: 'x' })).toThrow(TournamentError);
    expect(() => knockoutState(players(4), { 'KO-R1-M1': win(-1, 0) }, { seed: 'x' })).toThrow(TournamentError);
    expect(() => knockoutState(players(4), {}, { seed: '' })).toThrow(TournamentError);
  });

  it('hulpfuncties: ids, rondenamen en waarde voor het extra duel', () => {
    expect(knockoutMatchId(2, 0)).toBe('KO-R2-M1');
    expect([1, 2, 3, 4].map((r) => roundName(r, 4))).toEqual(['Achtste finale', 'Kwartfinale', 'Halve finale', 'Finale']);
    expect(roundName(1, 6)).toBe('Ronde 1');
    expect(extraDuelValue([{ rating: 80 }, { rating: 95, suspended: true }, { rating: 88 }])).toBe(88);
    expect(() => extraDuelValue([{ rating: 80, suspended: true }])).toThrow(TournamentError);
  });
});
