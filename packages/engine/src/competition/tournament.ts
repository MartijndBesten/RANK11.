/**
 * Knock-outtoernooi (GDD §4.9): progressie van ronde naar ronde, byes, verlenging bij gelijkspel
 * en de kampioen. De toernooistand wordt afgeleid uit seeding + uitslagen, nooit opgeslagen.
 */
import { createRng } from '../rng.ts';
import { knockoutDraw } from './schedule.ts';

/**
 * Verlenging bij gelijke stand:
 * - 'extra-duel': één extra duel met de hoogst gewaardeerde kaart van ieder; bij opnieuw gelijk beslist de seed-toss;
 * - 'seed-toss': direct een toss met de gelogde toernooiseed.
 */
export type KnockoutTieBreak = 'extra-duel' | 'seed-toss';

export interface TournamentConfig {
  configVersion: string;
  tieBreak: KnockoutTieBreak;
}

export const DEFAULT_TOURNAMENT_CONFIG: TournamentConfig = {
  configVersion: 'tournament.2026.10-1',
  tieBreak: 'extra-duel',
};

export interface KnockoutMatchResult {
  homeGoals: number;
  awayGoals: number;
  /** Reglementair verlies voor deze kant. */
  forfeit?: 'home' | 'away' | null;
  /** Duelwaarden van het extra duel (alleen nodig bij gelijkspel en tieBreak 'extra-duel'). */
  extraDuel?: { home: number; away: number };
}

export type KnockoutStatus = 'waiting' | 'ready' | 'needs-tiebreak' | 'decided';
export type DecidedBy = 'regular' | 'forfeit' | 'extra-duel' | 'toss' | 'bye';

export interface KnockoutMatch {
  id: string;
  round: number;
  slot: number;
  home: string | null;
  away: string | null;
  status: KnockoutStatus;
  winner: string | null;
  decidedBy: DecidedBy | null;
  result: KnockoutMatchResult | null;
}

export interface TournamentState {
  config: TournamentConfig;
  size: number;
  rounds: KnockoutMatch[][];
  /** Wedstrijden die nu gespeeld kunnen worden. */
  ready: KnockoutMatch[];
  /** Wedstrijden die gelijk eindigden en een extra duel nodig hebben. */
  needsTiebreak: KnockoutMatch[];
  champion: string | null;
}

export class TournamentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TournamentError';
  }
}

export const knockoutMatchId = (round: number, slot: number): string => `KO-R${round}-M${slot + 1}`;

/** Naam van een ronde vanaf het eind gerekend. */
export function roundName(round: number, totalRounds: number): string {
  const fromEnd = totalRounds - round;
  if (fromEnd === 0) return 'Finale';
  if (fromEnd === 1) return 'Halve finale';
  if (fromEnd === 2) return 'Kwartfinale';
  if (fromEnd === 3) return 'Achtste finale';
  return `Ronde ${round}`;
}

/** Hoogste duelwaarde van een elftal, voor het extra duel. */
export function extraDuelValue(cards: readonly { rating: number; suspended?: boolean }[]): number {
  const values = cards.filter((c) => !c.suspended).map((c) => c.rating);
  if (values.length === 0) throw new TournamentError('Geen speelbare kaart voor het extra duel.');
  return Math.max(...values);
}

function decide(match: KnockoutMatch, result: KnockoutMatchResult, config: TournamentConfig, seed: string): void {
  const home = match.home as string;
  const away = match.away as string;
  match.result = result;
  if (result.forfeit === 'home' || result.forfeit === 'away') {
    match.winner = result.forfeit === 'home' ? away : home;
    match.decidedBy = 'forfeit';
    match.status = 'decided';
    return;
  }
  for (const g of [result.homeGoals, result.awayGoals]) {
    if (!Number.isInteger(g) || g < 0) throw new TournamentError('Doelpunten moeten gehele getallen ≥ 0 zijn.');
  }
  if (result.homeGoals !== result.awayGoals) {
    match.winner = result.homeGoals > result.awayGoals ? home : away;
    match.decidedBy = 'regular';
    match.status = 'decided';
    return;
  }
  const toss = () => (createRng(`${seed}:${match.id}:toss`).next() < 0.5 ? home : away);
  if (config.tieBreak === 'seed-toss') {
    match.winner = toss();
    match.decidedBy = 'toss';
    match.status = 'decided';
    return;
  }
  if (!result.extraDuel) {
    match.status = 'needs-tiebreak';
    return;
  }
  const { home: h, away: a } = result.extraDuel;
  if (h !== a) {
    match.winner = h > a ? home : away;
    match.decidedBy = 'extra-duel';
  } else {
    match.winner = toss();
    match.decidedBy = 'toss';
  }
  match.status = 'decided';
}

/**
 * Leidt de volledige knock-outstand af. `seeded[0]` is seed 1; `results` per wedstrijd-id
 * (zie `knockoutMatchId`). Een uitslag voor een wedstrijd waarvan de deelnemers nog niet vaststaan
 * is een fout.
 */
export function knockoutState(
  seeded: readonly string[],
  results: Readonly<Record<string, KnockoutMatchResult>>,
  options: { seed: string; config?: Partial<TournamentConfig> },
): TournamentState {
  if (!options.seed) throw new TournamentError('Toernooiseed ontbreekt.');
  const config: TournamentConfig = { ...DEFAULT_TOURNAMENT_CONFIG, ...options.config };
  const draw = knockoutDraw(seeded);
  const totalRounds = Math.log2(draw.size);
  const used = new Set<string>();
  const rounds: KnockoutMatch[][] = [];

  const first: KnockoutMatch[] = draw.pairings.map((p) => {
    const m: KnockoutMatch = {
      id: knockoutMatchId(1, p.slot), round: 1, slot: p.slot, home: p.home, away: p.away,
      status: 'ready', winner: null, decidedBy: null, result: null,
    };
    if (p.away === null) {
      m.status = 'decided';
      m.winner = p.home;
      m.decidedBy = 'bye';
    }
    return m;
  });
  rounds.push(first);

  for (let r = 2; r <= totalRounds; r++) {
    const prev = rounds[r - 2] as KnockoutMatch[];
    const current: KnockoutMatch[] = [];
    for (let s = 0; s < prev.length / 2; s++) {
      const a = prev[2 * s] as KnockoutMatch;
      const b = prev[2 * s + 1] as KnockoutMatch;
      current.push({
        id: knockoutMatchId(r, s), round: r, slot: s, home: a.winner, away: b.winner,
        status: a.winner && b.winner ? 'ready' : 'waiting', winner: null, decidedBy: null, result: null,
      });
    }
    rounds.push(current);
  }

  // Uitslagen ronde voor ronde verwerken; winnaars schuiven door.
  for (let r = 0; r < rounds.length; r++) {
    const round = rounds[r] as KnockoutMatch[];
    for (const m of round) {
      const result = results[m.id];
      if (m.decidedBy === 'bye') {
        if (result) throw new TournamentError(`Wedstrijd ${m.id} is een bye en heeft geen uitslag.`);
        continue;
      }
      if (result) {
        if (m.status === 'waiting') throw new TournamentError(`Wedstrijd ${m.id} kan nog niet gespeeld worden.`);
        used.add(m.id);
        decide(m, result, config, options.seed);
      }
    }
    const next = rounds[r + 1];
    if (next) {
      for (const n of next) {
        const a = round[2 * n.slot] as KnockoutMatch;
        const b = round[2 * n.slot + 1] as KnockoutMatch;
        n.home = a.winner;
        n.away = b.winner;
        n.status = n.home && n.away ? 'ready' : 'waiting';
      }
    }
  }
  for (const id of Object.keys(results)) {
    if (!used.has(id) && !rounds.flat().some((m) => m.id === id)) throw new TournamentError(`Onbekende wedstrijd ${id}.`);
  }

  const final = (rounds[rounds.length - 1] as KnockoutMatch[])[0] as KnockoutMatch;
  const all = rounds.flat();
  return {
    config,
    size: draw.size,
    rounds,
    ready: all.filter((m) => m.status === 'ready'),
    needsTiebreak: all.filter((m) => m.status === 'needs-tiebreak'),
    champion: final.status === 'decided' ? final.winner : null,
  };
}
