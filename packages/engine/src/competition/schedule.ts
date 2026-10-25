/**
 * Speelschema's: round-robin (cirkelmethode), knock-out met byes en seeding, poulefase met finale,
 * deadlines per speelronde en de forfaitregel bij niet spelen vóór de deadline.
 * Alle functies zijn puur en deterministisch.
 */
import { createRng } from '../rng.ts';
import type { LeagueResult } from './league.ts';

export interface Fixture {
  /** Stabiel id binnen het schema, bijv. "R1-1". */
  id: string;
  round: number;
  home: string;
  away: string;
}

export interface ScheduleRound {
  round: number;
  fixtures: Fixture[];
  /** Deelnemer met een rustbeurt (alleen bij een oneven aantal). */
  bye: string | null;
}

export class ScheduleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScheduleError';
  }
}

function assertParticipants(participants: readonly string[], min: number): void {
  if (participants.length < min) throw new ScheduleError(`Minimaal ${min} deelnemers nodig.`);
  if (new Set(participants).size !== participants.length) throw new ScheduleError('Dubbele deelnemer in het schema.');
  if (participants.some((p) => !p)) throw new ScheduleError('Lege deelnemer in het schema.');
}

export interface RoundRobinOptions {
  /** Dubbele competitie: iedereen speelt twee keer tegen iedereen, één keer thuis en één keer uit. */
  double?: boolean;
  /** Optioneel: volgorde van deelnemers eerst schudden met deze seed (anders vaste volgorde). */
  shuffleSeed?: string;
}

/**
 * Round-robin met de cirkelmethode. Bij een oneven aantal krijgt iedere deelnemer precies één
 * rustbeurt per competitiehelft. Thuis/uit wordt per wedstrijd gekozen voor de deelnemer met de
 * minste thuiswedstrijden tot dan toe, zodat het verschil thuis–uit hooguit 1 is.
 */
export function roundRobin(participants: readonly string[], options: RoundRobinOptions = {}): ScheduleRound[] {
  assertParticipants(participants, 2);
  const ordered = options.shuffleSeed ? createRng(options.shuffleSeed).shuffle(participants) : [...participants];
  const slots: (string | null)[] = ordered.length % 2 === 0 ? ordered : [...ordered, null];
  const n = slots.length;
  const homes = new Map<string, number>(ordered.map((p) => [p, 0]));
  const aways = new Map<string, number>(ordered.map((p) => [p, 0]));
  const firstLeg: ScheduleRound[] = [];
  let rotation = slots.slice(1);

  for (let r = 0; r < n - 1; r++) {
    const arr = [slots[0] as string | null, ...rotation];
    const fixtures: Fixture[] = [];
    let bye: string | null = null;
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i] as string | null;
      const b = arr[n - 1 - i] as string | null;
      if (a === null || b === null) {
        bye = a ?? b;
        continue;
      }
      // Balans: wie minder thuis speelde (relatief aan uit), speelt thuis; bij gelijkstand wisselt de ronde.
      const balA = (homes.get(a) ?? 0) - (aways.get(a) ?? 0);
      const balB = (homes.get(b) ?? 0) - (aways.get(b) ?? 0);
      const aHome = balA < balB || (balA === balB && (r + i) % 2 === 0);
      const home = aHome ? a : b;
      const away = aHome ? b : a;
      homes.set(home, (homes.get(home) ?? 0) + 1);
      aways.set(away, (aways.get(away) ?? 0) + 1);
      fixtures.push({ id: `R${r + 1}-${fixtures.length + 1}`, round: r + 1, home, away });
    }
    firstLeg.push({ round: r + 1, fixtures, bye });
    rotation = [rotation[rotation.length - 1] as string | null, ...rotation.slice(0, -1)];
  }

  if (!options.double) return firstLeg;
  const offset = firstLeg.length;
  const secondLeg = firstLeg.map((rd): ScheduleRound => ({
    round: rd.round + offset,
    bye: rd.bye,
    fixtures: rd.fixtures.map((f, i) => ({ id: `R${rd.round + offset}-${i + 1}`, round: rd.round + offset, home: f.away, away: f.home })),
  }));
  return [...firstLeg, ...secondLeg];
}

/** Volgorde van seeds in een bracket van `size` (macht van 2): 1, size, size/2+1, ... zodat 1 en 2 elkaar pas in de finale treffen. */
export function seedPositions(size: number): number[] {
  if (!Number.isInteger(size) || size < 2 || (size & (size - 1)) !== 0) throw new ScheduleError('Bracketgrootte moet een macht van 2 (≥ 2) zijn.');
  let order = [1];
  while (order.length < size) {
    const len = order.length * 2;
    order = order.flatMap((s) => [s, len + 1 - s]);
  }
  return order;
}

export interface KnockoutPairing {
  /** Positie in de eerste ronde (0-based). */
  slot: number;
  home: string;
  /** `null` = bye: `home` gaat direct door. */
  away: string | null;
  homeSeed: number;
  awaySeed: number | null;
}

export interface KnockoutDraw {
  size: number;
  byes: number;
  pairings: KnockoutPairing[];
}

/**
 * Eerste ronde van een knock-out. `seeded[0]` is seed 1. Het bracket wordt aangevuld tot de
 * volgende macht van 2; de hoogste seeds krijgen de byes.
 */
export function knockoutDraw(seeded: readonly string[]): KnockoutDraw {
  assertParticipants(seeded, 2);
  let size = 2;
  while (size < seeded.length) size *= 2;
  const positions = seedPositions(size);
  const pairings: KnockoutPairing[] = [];
  for (let i = 0; i < size; i += 2) {
    const s1 = positions[i] as number;
    const s2 = positions[i + 1] as number;
    const [hi, lo] = s1 < s2 ? [s1, s2] : [s2, s1];
    const home = seeded[hi - 1] as string;
    const away = lo <= seeded.length ? (seeded[lo - 1] as string) : null;
    pairings.push({ slot: i / 2, home, away, homeSeed: hi, awaySeed: away === null ? null : lo });
  }
  return { size, byes: size - seeded.length, pairings };
}

export interface Group {
  id: string;
  participants: string[];
  rounds: ScheduleRound[];
}

/** Poules met slangverdeling op seed (A1, B1, B2, A2, A3, ...) en per poule een round-robin. */
export function groupStage(seeded: readonly string[], options: { groups: number; double?: boolean }): Group[] {
  assertParticipants(seeded, 2);
  const g = options.groups;
  if (!Number.isInteger(g) || g < 1) throw new ScheduleError('Aantal poules moet een positief geheel getal zijn.');
  if (seeded.length < g * 2) throw new ScheduleError('Iedere poule heeft minimaal 2 deelnemers nodig.');
  const buckets: string[][] = Array.from({ length: g }, () => []);
  seeded.forEach((p, i) => {
    const row = Math.floor(i / g);
    const col = i % g;
    (buckets[row % 2 === 0 ? col : g - 1 - col] as string[]).push(p);
  });
  return buckets.map((participants, i) => ({
    id: String.fromCharCode(65 + i),
    participants,
    rounds: roundRobin(participants, { double: options.double }),
  }));
}

/**
 * Plaatsingslijst voor de finalefase uit de eindstanden per poule: eerst alle poulewinnaars
 * (in pouleordening), dan alle nummers twee, enz. Met `knockoutDraw()` treffen poulewinnaars
 * bij twee poules in de halve finale een nummer twee uit de andere poule.
 */
export function groupQualifiers(groupTables: readonly (readonly string[])[], perGroup: number): string[] {
  if (!Number.isInteger(perGroup) || perGroup < 1) throw new ScheduleError('Aantal doorgaanden per poule moet ≥ 1 zijn.');
  const out: string[] = [];
  for (let place = 0; place < perGroup; place++) {
    for (const table of groupTables) {
      const p = table[place];
      if (p === undefined) throw new ScheduleError('Poule heeft te weinig deelnemers voor dit aantal doorgaanden.');
      out.push(p);
    }
  }
  return out;
}

export interface DatedRound extends ScheduleRound {
  opensAt: number;
  deadline: number;
}

/** Deadlines per speelronde: ronde k opent op start + (k-1)·duur en sluit een duur later. */
export function withDeadlines(rounds: readonly ScheduleRound[], options: { startAt: number; roundDurationMs: number }): DatedRound[] {
  if (!Number.isFinite(options.startAt)) throw new ScheduleError('Starttijd ontbreekt.');
  if (!(options.roundDurationMs > 0)) throw new ScheduleError('Duur per speelronde moet groter dan 0 zijn.');
  return rounds.map((rd, idx) => ({
    ...rd,
    opensAt: options.startAt + idx * options.roundDurationMs,
    deadline: options.startAt + (idx + 1) * options.roundDurationMs,
  }));
}

/** Wat er gebeurt als niemand heeft gespeeld vóór de deadline. */
export type UnplayedRule = 'double-forfeit' | 'void';

export type UnplayedOutcome =
  | { kind: 'open' }
  | { kind: 'in-play' }
  | { kind: 'void' }
  | { kind: 'forfeit'; result: LeagueResult };

/**
 * Forfaitregel voor een niet (volledig) gespeelde wedstrijd.
 * `ready` = de deelnemer heeft zijn deel gedaan (uitgedaagd of de uitdaging geaccepteerd).
 * - vóór de deadline: `open`;
 * - beide klaar (wedstrijd loopt): `in-play` — de battletimers beslissen, geen forfait;
 * - één klaar: de ander verliest reglementair;
 * - niemand klaar: dubbel forfait of vervallen (configureerbaar).
 */
export function resolveUnplayed(
  fixture: Pick<Fixture, 'id' | 'home' | 'away'> & { deadline: number },
  now: number,
  ready: { home: boolean; away: boolean },
  rule: UnplayedRule = 'double-forfeit',
): UnplayedOutcome {
  if (now < fixture.deadline) return { kind: 'open' };
  if (ready.home && ready.away) return { kind: 'in-play' };
  const base = { id: fixture.id, home: fixture.home, away: fixture.away, homeGoals: 0, awayGoals: 0, playedAt: fixture.deadline };
  if (ready.home) return { kind: 'forfeit', result: { ...base, forfeit: 'away' } };
  if (ready.away) return { kind: 'forfeit', result: { ...base, forfeit: 'home' } };
  return rule === 'void' ? { kind: 'void' } : { kind: 'forfeit', result: { ...base, forfeit: 'both' } };
}
