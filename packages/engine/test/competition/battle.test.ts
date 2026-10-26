import { describe, expect, it } from 'vitest';
import {
  battleState, createBattle, duelValue, lowestAvailableCard, playCard, resign, resolveBattleConfig, timeoutEvents,
  tossWinner, BattleError, BATTLE_CONFIG_VERSION, type BattleCard, type BattleConfig, type BattleEvent, type Side,
} from '../../src/competition/index.ts';

const T0 = 1_000_000;

function card(id: string, rating: number, extra: Partial<BattleCard> = {}): BattleCard {
  return {
    id, rating, position: 'CM',
    stats: { pace: rating - 5, attack: rating, passing: rating, technique: rating + 1, defending: rating - 10, physical: rating },
    ...extra,
  };
}

const team = (prefix: string, ratings: number[], extra: (i: number) => Partial<BattleCard> = () => ({})) =>
  ratings.map((r, i) => card(`${prefix}${i + 1}`, r, extra(i)));

const flat = (prefix: string, rating: number) => team(prefix, Array(11).fill(rating));

function start(home: BattleCard[], away: BattleCard[], config: Partial<BattleConfig> = {}, seed = 'seed-1'): BattleEvent[] {
  return [createBattle({ matchId: 'm1', seed, at: T0, home: { playerId: 'anna', cards: home }, away: { playerId: 'bram', cards: away }, config })];
}

function play(events: BattleEvent[], side: Side, cardId: string, at?: number): BattleEvent[] {
  const s = battleState(events);
  return [...events, playCard(events, { side, cardId, at: at ?? s.lastEventAt + 1000 })];
}

/** Speelt de wedstrijd uit; iedere kant speelt de eerste beschikbare kaart. */
function playOut(events: BattleEvent[]): BattleEvent[] {
  let log = events;
  for (let i = 0; i < 40; i++) {
    const s = battleState(log);
    if (s.status === 'finished') return log;
    const side = s.toMove as Side;
    log = play(log, side, s.available[side][0] as string);
  }
  throw new Error('wedstrijd eindigt niet');
}

function expectCode(fn: () => unknown, code: string) {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(BattleError);
    expect((e as BattleError).code).toBe(code);
    return;
  }
  throw new Error(`verwachtte BattleError ${code}`);
}

describe('battle: opzet en validatie', () => {
  it('standaardconfig is versieerbaar en compleet', () => {
    const c = resolveBattleConfig();
    expect(c.configVersion).toBe(BATTLE_CONFIG_VERSION);
    expect(c).toMatchObject({ mode: 'rating', tieRule: 'none', maxRounds: 11, stopWhenDecided: true, maxConsecutiveTimeouts: 3 });
    const s = battleState(start(flat('h', 70), flat('a', 70)));
    expect(s.configVersion).toBe(BATTLE_CONFIG_VERSION);
  });

  it('weigert ongeldige elftallen', () => {
    expectCode(() => start(flat('h', 70).slice(0, 10), flat('a', 70)), 'INVALID_LINEUP');
    const dup = flat('h', 70); dup[1] = { ...dup[0] as BattleCard };
    expectCode(() => start(dup, flat('a', 70)), 'INVALID_LINEUP');
    expectCode(() => start(flat('x', 70), flat('x', 70)), 'INVALID_LINEUP'); // zelfde kaart-ids in beide elftallen
    expectCode(() => createBattle({ matchId: 'm', seed: 's', at: T0, home: { playerId: 'p', cards: flat('h', 70) }, away: { playerId: 'p', cards: flat('a', 70) } }), 'INVALID_LINEUP');
    expectCode(() => start(team('h', Array(11).fill(70), () => ({ suspended: true })), flat('a', 70)), 'INVALID_LINEUP');
    const noPace = flat('h', 70).map((c) => ({ ...c, stats: { ...c.stats, pace: Number.NaN } }));
    expectCode(() => start(noPace, flat('a', 70), { mode: 'pace' }), 'INVALID_LINEUP');
  });

  it('weigert ongeldige configuratie', () => {
    expectCode(() => resolveBattleConfig({ maxRounds: 12 }), 'INVALID_CONFIG');
    expectCode(() => resolveBattleConfig({ tieRule: 'chemie' as never }), 'INVALID_CONFIG');
    expectCode(() => resolveBattleConfig({ mode: 'shooting' as never }), 'INVALID_CONFIG');
    expectCode(() => resolveBattleConfig({ forfeitScore: { winner: 0, loser: 0 } }), 'INVALID_CONFIG');
    expectCode(() => resolveBattleConfig({ maxConsecutiveTimeouts: 0 }), 'INVALID_CONFIG');
  });

  it('toss is deterministisch per seed en kent beide uitkomsten', () => {
    expect(tossWinner('abc')).toBe(tossWinner('abc'));
    const outcomes = new Set(Array.from({ length: 40 }, (_, i) => tossWinner(`s${i}`)));
    expect(outcomes).toEqual(new Set(['home', 'away']));
    const s = battleState(start(flat('h', 70), flat('a', 70), {}, 'abc'));
    expect(s.tossWinner).toBe(tossWinner('abc'));
    expect(s.toMove).toBe(s.tossWinner);
    expect(s.attacker).toBe(s.tossWinner);
  });
});

describe('battle: verloop', () => {
  it('aanvaller legt open, verdediger reageert, hoogste scoort, rollen wisselen', () => {
    let log = start(flat('h', 80), flat('a', 70));
    const s0 = battleState(log);
    const att = s0.toMove as Side;
    const def: Side = att === 'home' ? 'away' : 'home';
    const attCard = s0.available[att][0] as string;
    log = play(log, att, attCard);
    const s1 = battleState(log);
    expect(s1.phase).toBe('defend');
    expect(s1.toMove).toBe(def);
    expect(s1.openCard).toEqual({ side: att, cardId: attCard });
    log = play(log, def, s1.available[def][0] as string);
    const s2 = battleState(log);
    expect(s2.duels).toHaveLength(1);
    expect(s2.duels[0]?.scorer).toBe('home'); // 80 tegen 70
    expect(s2.score).toEqual({ home: 1, away: 0 });
    expect(s2.used[att]).toEqual([attCard]);
    expect(s2.available[att]).not.toContain(attCard);
    expect(s2.round).toBe(2);
    expect(s2.attacker).toBe(def);
    expect(s2.toMove).toBe(def);
    expect(s2.openCard).toBeNull();
  });

  it('valideert beurt, eigendom, verbruik en einde', () => {
    let log = start(flat('h', 70), flat('a', 70), { stopWhenDecided: false });
    const s = battleState(log);
    const att = s.toMove as Side;
    const def: Side = att === 'home' ? 'away' : 'home';
    expectCode(() => playCard(log, { side: def, cardId: s.available[def][0] as string, at: T0 + 1 }), 'NOT_YOUR_TURN');
    expectCode(() => playCard(log, { side: att, cardId: s.available[def][0] as string, at: T0 + 1 }), 'CARD_NOT_OWNED');
    expectCode(() => playCard(log, { side: att, cardId: 'bestaat-niet', at: T0 + 1 }), 'CARD_NOT_OWNED');
    const c = s.available[att][0] as string;
    log = play(log, att, c);
    log = play(log, def, s.available[def][0] as string);
    // ronde 2: def valt aan; ronde 3: att valt weer aan en probeert dezelfde kaart
    log = play(log, def, battleState(log).available[def][0] as string);
    log = play(log, att, battleState(log).available[att][0] as string);
    expectCode(() => playCard(log, { side: att, cardId: c, at: battleState(log).lastEventAt + 1 }), 'CARD_USED');
    log = playOut(log);
    expect(battleState(log).status).toBe('finished');
    expectCode(() => playCard(log, { side: 'home', cardId: 'h1', at: T0 + 10 ** 7 }), 'MATCH_FINISHED');
  });

  it('geschorste kaarten zijn niet speelbaar en verkorten de wedstrijd', () => {
    const home = team('h', Array(11).fill(70), (i) => ({ suspended: i < 2 }));
    const log = start(home, flat('a', 70), { stopWhenDecided: false }, 'seed-home-first');
    const s = battleState(log);
    expect(s.totalRounds).toBe(9);
    expect(s.available.home).not.toContain('h1');
    const side: Side = 'home';
    if (s.toMove === side) expectCode(() => playCard(log, { side, cardId: 'h1', at: T0 + 1 }), 'CARD_SUSPENDED');
    else {
      const l2 = play(log, 'away', 'a1');
      expectCode(() => playCard(l2, { side, cardId: 'h1', at: T0 + 2000 }), 'CARD_SUSPENDED');
    }
    const end = battleState(playOut(log));
    expect(end.duels).toHaveLength(9);
    expect(end.result?.decidedEarly).toBe(false);
  });

  it('speelt maximaal 11 rondes en eindigt gelijk zonder winnaar', () => {
    const end = battleState(playOut(start(flat('h', 70), flat('a', 70))));
    expect(end.duels).toHaveLength(11);
    expect(end.result).toEqual({ homeGoals: 0, awayGoals: 0, winner: null, decidedEarly: false, forfeit: false, forfeitedBy: null, forfeitReason: null });
    // aanvaller wisselde elke ronde
    end.duels.forEach((d, i) => expect(d.attacker).toBe(i % 2 === 0 ? end.tossWinner : (end.tossWinner === 'home' ? 'away' : 'home')));
  });

  it('stopt voortijdig zodra de voorsprong groter is dan het aantal resterende duels', () => {
    const end = battleState(playOut(start(flat('h', 90), flat('a', 60))));
    expect(end.duels).toHaveLength(6); // 6-0 met nog 5 duels te gaan
    expect(end.result).toMatchObject({ homeGoals: 6, awayGoals: 0, winner: 'home', decidedEarly: true, forfeit: false });
    expect(end.toMove).toBeNull();
    expect(end.deadline).toBeNull();
  });

  it('speelt door voor het doelsaldo als stopWhenDecided uit staat', () => {
    const end = battleState(playOut(start(flat('h', 90), flat('a', 60), { stopWhenDecided: false })));
    expect(end.duels).toHaveLength(11);
    expect(end.result).toMatchObject({ homeGoals: 11, awayGoals: 0, decidedEarly: false });
  });

  it('is niet voortijdig beslist bij precies gelijke voorsprong en resterende duels', () => {
    // thuis wint alleen de eerste 5 duels: na 5 duels 5-0 met 6 resterend -> doorspelen
    const home = team('h', [90, 90, 90, 90, 90, 50, 50, 50, 50, 50, 50]);
    const away = team('a', [60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60]);
    const end = battleState(playOut(start(home, away)));
    expect(end.result?.decidedEarly).toBe(false);
    expect(end.duels.length).toBe(11);
    expect(end.result).toMatchObject({ homeGoals: 5, awayGoals: 6, winner: 'away' });
  });
});

describe('battle: gelijkspelregels en modi', () => {
  const tieEnd = (tieRule: BattleConfig['tieRule']) => {
    let log = start(flat('h', 70), flat('a', 70), { tieRule, stopWhenDecided: false });
    const s = battleState(log);
    const att = s.toMove as Side;
    log = play(log, att, s.available[att][0] as string);
    const def: Side = att === 'home' ? 'away' : 'home';
    log = play(log, def, battleState(log).available[def][0] as string);
    return { s: battleState(log), att, def };
  };

  it("'none': geen doelpunt", () => {
    const { s } = tieEnd('none');
    expect(s.score).toEqual({ home: 0, away: 0 });
    expect(s.duels[0]?.scorer).toBeNull();
  });
  it("'both': allebei een doelpunt", () => {
    const { s } = tieEnd('both');
    expect(s.score).toEqual({ home: 1, away: 1 });
    expect(s.duels[0]?.scorer).toBe('both');
  });
  it("'attacker' en 'defender'", () => {
    const a = tieEnd('attacker');
    expect(a.s.score[a.att]).toBe(1);
    expect(a.s.score[a.def]).toBe(0);
    const d = tieEnd('defender');
    expect(d.s.score[d.def]).toBe(1);
    expect(d.s.score[d.att]).toBe(0);
  });

  it('modus pace gebruikt de stat en roundModes is vooraf zichtbaar', () => {
    const home = flat('h', 70).map((c) => ({ ...c, stats: { ...c.stats, pace: 99 } }));
    const away = flat('a', 80);
    const end = battleState(playOut(start(home, away, { mode: 'pace', stopWhenDecided: false })));
    expect(end.duels.every((d) => d.mode === 'pace' && d.scorer === 'home')).toBe(true);

    const log = start(flat('h', 70), flat('a', 70), { roundModes: ['technique', 'defending'] });
    expect(battleState(log).currentMode).toBe('technique');
    const s = battleState(log);
    const l1 = play(log, s.toMove as Side, s.available[s.toMove as Side][0] as string);
    const other = battleState(l1).toMove as Side;
    const l2 = play(l1, other, battleState(l1).available[other][0] as string);
    expect(battleState(l2).currentMode).toBe('defending');
    expect(battleState(l2).duels[0]?.mode).toBe('technique');
  });

  it('chemiebonus telt alleen mee als die aan staat en is begrensd op 3', () => {
    const c = card('x', 80, { chemBonus: 7 });
    expect(duelValue(c, 'rating', { applyChemBonus: false })).toBe(80);
    expect(duelValue(c, 'rating', { applyChemBonus: true })).toBe(83);
    expect(duelValue(c, 'pace', { applyChemBonus: true })).toBe(75);
    const home = team('h', Array(11).fill(70), () => ({ chemBonus: 2 }));
    const end = battleState(playOut(start(home, flat('a', 71), { applyChemBonus: true })));
    expect(end.result?.winner).toBe('home');
  });
});

describe('battle: timers en reglementair verlies', () => {
  const config = { moveTimeoutMs: 30_000 };

  it('geen time-out vóór de deadline; daarna speelt de server de laagste kaart', () => {
    const home = team('h', [90, 85, 60, 88, 87, 86, 84, 83, 82, 81, 80]);
    const away = team('a', [90, 85, 55, 88, 87, 86, 84, 83, 82, 81, 80]);
    const log = start(home, away, config);
    const s = battleState(log);
    expect(s.deadline).toBe(T0 + 30_000);
    expect(timeoutEvents(log, T0 + 29_999)).toEqual([]);
    const evs = timeoutEvents(log, T0 + 30_000);
    expect(evs).toHaveLength(1);
    expect(evs[0]).toMatchObject({ type: 'played', auto: true, side: s.toMove, at: T0 + 30_000 });
    expect((evs[0] as { cardId: string }).cardId).toBe(s.toMove === 'home' ? 'h3' : 'a3');
    const after = battleState([...log, ...evs]);
    expect(after.consecutiveTimeouts[s.toMove as Side]).toBe(1);
    expect(after.deadline).toBe(T0 + 60_000);
  });

  it('weigert een zet na de deadline', () => {
    const log = start(flat('h', 70), flat('a', 70), config);
    const s = battleState(log);
    expectCode(() => playCard(log, { side: s.toMove as Side, cardId: s.available[s.toMove as Side][0] as string, at: T0 + 30_001 }), 'INVALID_TIME');
  });

  it('drie time-outs op rij leveren reglementair verlies op (3-0)', () => {
    let log = start(flat('h', 70), flat('a', 70), config, 'timeouts');
    const sleeper = battleState(log).toMove as Side;
    const active: Side = sleeper === 'home' ? 'away' : 'home';
    // ronde 1: sleeper valt aan en slaapt
    log = [...log, ...timeoutEvents(log, battleState(log).deadline as number)];
    log = play(log, active, battleState(log).available[active][0] as string);
    // ronde 2: active valt aan, sleeper verdedigt niet
    log = play(log, active, battleState(log).available[active][0] as string);
    log = [...log, ...timeoutEvents(log, battleState(log).deadline as number)];
    // ronde 3: sleeper valt aan en slaapt opnieuw -> derde time-out op rij
    const evs = timeoutEvents(log, battleState(log).deadline as number);
    expect(evs.map((e) => e.type)).toEqual(['played', 'forfeit']);
    log = [...log, ...evs];
    const end = battleState(log);
    expect(end.status).toBe('finished');
    expect(end.result).toMatchObject({ forfeit: true, forfeitedBy: sleeper, forfeitReason: 'timeouts', winner: active });
    expect(end.result?.[active === 'home' ? 'homeGoals' : 'awayGoals']).toBe(3);
    expect(end.result?.[sleeper === 'home' ? 'homeGoals' : 'awayGoals']).toBe(0);
  });

  it('een eigen zet zet de time-outteller terug', () => {
    let log = start(flat('h', 70), flat('a', 70), config);
    const p = battleState(log).toMove as Side;
    const q: Side = p === 'home' ? 'away' : 'home';
    log = [...log, ...timeoutEvents(log, battleState(log).deadline as number)]; // p time-out
    log = play(log, q, battleState(log).available[q][0] as string);
    log = play(log, q, battleState(log).available[q][0] as string);
    log = [...log, ...timeoutEvents(log, battleState(log).deadline as number)]; // p time-out (2)
    expect(battleState(log).consecutiveTimeouts[p]).toBe(2);
    log = play(log, p, battleState(log).available[p][0] as string); // p speelt zelf
    expect(battleState(log).consecutiveTimeouts[p]).toBe(0);
  });

  it('asynchroon: één aanroep verwerkt een keten van verlopen deadlines; instelbaar zonder forfait', () => {
    const log = start(flat('h', 70), flat('a', 70), { moveTimeoutMs: 1000, maxConsecutiveTimeouts: null, stopWhenDecided: false });
    const evs = timeoutEvents(log, T0 + 10 ** 9);
    expect(evs).toHaveLength(22);
    expect(evs.every((e) => e.type === 'played' && e.auto)).toBe(true);
    const end = battleState([...log, ...evs]);
    expect(end.status).toBe('finished');
    expect(end.result?.forfeit).toBe(false);

    const withForfeit = timeoutEvents(start(flat('h', 70), flat('a', 70), { moveTimeoutMs: 1000 }), T0 + 10 ** 9);
    const last = withForfeit[withForfeit.length - 1];
    expect(last?.type).toBe('forfeit');
  });

  it('laagste kaart: bij gelijke waarde op rating en dan id', () => {
    const home = team('h', [70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70]);
    const log = start(home, flat('a', 70), {}, 'x');
    expect(lowestAvailableCard(log, 'home')).toBe('h1');
    expect(lowestAvailableCard(log, 'away')).toBe('a1');
  });

  it('opgeven geeft reglementair verlies', () => {
    const log = start(flat('h', 70), flat('a', 70));
    const end = battleState([...log, resign(log, 'away', T0 + 5)]);
    expect(end.result).toMatchObject({ winner: 'home', forfeit: true, forfeitedBy: 'away', forfeitReason: 'resign', homeGoals: 3, awayGoals: 0 });
    expectCode(() => resign([...log, resign(log, 'away', T0 + 5)], 'home', T0 + 6), 'MATCH_FINISHED');
  });
});

describe('battle: eventlog als enige waarheid', () => {
  it('zelfde log = zelfde status, ook na JSON-roundtrip', () => {
    const log = playOut(start(team('h', [60, 65, 70, 75, 80, 85, 90, 72, 74, 76, 78]), team('a', [88, 66, 71, 79, 59, 83, 64, 77, 73, 69, 81])));
    const copy = JSON.parse(JSON.stringify(log)) as BattleEvent[];
    expect(battleState(copy)).toEqual(battleState(log));
  });

  it('weigert een gemanipuleerde log', () => {
    const log = start(flat('h', 70), flat('a', 70));
    const s = battleState(log);
    const wrong: Side = s.toMove === 'home' ? 'away' : 'home';
    expectCode(() => battleState([...log, { type: 'played', at: T0 + 1, side: wrong, cardId: s.available[wrong][0] as string, auto: false }]), 'INVALID_LOG');
    expectCode(() => battleState([...log, { type: 'played', at: T0 - 1, side: s.toMove as Side, cardId: s.available[s.toMove as Side][0] as string, auto: false }]), 'INVALID_LOG');
    const finished = [...log, resign(log, 'home', T0 + 1)];
    expectCode(() => battleState([...finished, { type: 'forfeit', at: T0 + 2, side: 'away', reason: 'resign' }]), 'INVALID_LOG');
    expectCode(() => battleState([]), 'INVALID_LOG');
    expectCode(() => battleState([...log, log[0] as BattleEvent]), 'INVALID_LOG');
  });

  it('createBattle kopieert kaarten (latere mutatie raakt de log niet)', () => {
    const home = flat('h', 70);
    const log = start(home, flat('a', 70));
    (home[0] as BattleCard).rating = 99;
    const created = log[0] as Extract<BattleEvent, { type: 'created' }>;
    expect(created.home.cards[0]?.rating).toBe(70);
  });
});

describe('vorm van de dag (V-018)', () => {
  it('staat standaard uit: geen vormvelden en geen effect op de duelwaarde', () => {
    const s = battleState(playOut(start(flat('h', 80), flat('a', 70))));
    expect(s.config.formMax).toBe(0);
    expect(s.duels.every((d) => d.attackerForm === undefined && d.defenderForm === undefined)).toBe(true);
    // Zonder vorm is de duelwaarde precies de rating (modus 'rating').
    expect(s.duels[0]!.attackerValue).toBe(80);
  });

  it('is begrensd (0..formMax), deterministisch uit de seed en zit in de duelwaarde', () => {
    const log = playOut(start(flat('h', 80), flat('a', 80), { formMax: 3 }, 'vorm-seed'));
    const s = battleState(log);
    for (const d of s.duels) {
      expect(d.attackerForm).toBeGreaterThanOrEqual(0);
      expect(d.attackerForm).toBeLessThanOrEqual(3);
      expect(d.defenderForm).toBeGreaterThanOrEqual(0);
      expect(d.defenderForm).toBeLessThanOrEqual(3);
      expect(d.attackerValue).toBe(80 + d.attackerForm!);
      expect(d.defenderValue).toBe(80 + d.defenderForm!);
    }
    // Zelfde seed → zelfde vorm (reproduceerbaar, niet willekeurig per run).
    const again = battleState(playOut(start(flat('h', 80), flat('a', 80), { formMax: 3 }, 'vorm-seed')));
    expect(again.duels.map((d) => d.attackerForm)).toEqual(s.duels.map((d) => d.attackerForm));
    // Andere seed → (vrijwel altijd) een ander vormverloop.
    const other = battleState(playOut(start(flat('h', 80), flat('a', 80), { formMax: 3 }, 'andere-seed')));
    expect(other.duels.map((d) => d.attackerForm)).not.toEqual(s.duels.map((d) => d.attackerForm));
  });

  it('een groot ratingverschil wordt niet omgedraaid door de vorm', () => {
    // 85 tegen 75: het verschil (10) is groter dan de maximale vormswing (3), dus het sterkere elftal (home)
    // heeft in elk duel de hoogste waarde, ongeacht wie aanvalt.
    const s = battleState(playOut(start(flat('h', 85), flat('a', 75), { formMax: 3 })));
    for (const d of s.duels) {
      const homeValue = d.attacker === 'home' ? d.attackerValue : d.defenderValue;
      const awayValue = d.attacker === 'home' ? d.defenderValue : d.attackerValue;
      expect(homeValue).toBeGreaterThan(awayValue);
    }
    expect(s.score.home).toBeGreaterThan(s.score.away);
  });

  it('formMax buiten 0..10 wordt geweigerd', () => {
    expect(() => resolveBattleConfig({ formMax: -1 })).toThrow(BattleError);
    expect(() => resolveBattleConfig({ formMax: 11 })).toThrow(BattleError);
    expect(() => resolveBattleConfig({ formMax: 2.5 })).toThrow(BattleError);
  });
});
