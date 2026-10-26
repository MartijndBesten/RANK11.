/**
 * Lokale demo-pool: fictieve teamgenoten (computertegenstanders) zodat de competitie zonder server
 * te spelen en te begrijpen is. Alles hier draait op de echte engine (battle, league, schedule,
 * gradeLeague); alleen de tegenstanders zijn verzonnen. Online tegen echte klasgenoten volgt via apps/api.
 */
import {
  autoBestLineup, battleState, computeStandings, createBattle, createRng, FORMATIONS, gradeLeagueTable, lowestAvailableCard, RANK_FORM_MAX,
  playCard, roundRobin, duelValue, type BattleCard, type BattleEvent, type Goal, type Grade, type LeagueResult, type Player, type Side,
} from '@rank11/engine';
import { CATALOG } from '../state/store';
import { PERIODS, SUBJECTS } from '../state/school';

export const ME = 'speler-demo';
export const POOL_NAME = 'Klas 2B · demo-pool';

export interface Bot { id: string; name: string; club: string; strength: number; profile: 'stijger' | 'constant' | 'moeite' | 'weinig' | 'sterk'; color: string }

export const BOTS: Bot[] = [
  { id: 'bot-daan', name: 'Daan', club: 'Daan United', strength: 84, profile: 'constant', color: '#e84a5f' },
  { id: 'bot-sara', name: 'Sara', club: 'SC Sara', strength: 88, profile: 'sterk', color: '#3aa8ff' },
  { id: 'bot-milan', name: 'Milan', club: 'Milan City', strength: 80, profile: 'stijger', color: '#2fe39a' },
  { id: 'bot-noor', name: 'Noor', club: 'FC Noorderzon', strength: 86, profile: 'moeite', color: '#d9a441' },
  { id: 'bot-yusuf', name: 'Yusuf', club: 'Yusuf Rovers', strength: 82, profile: 'stijger', color: '#9b6bff' },
  { id: 'bot-lotte', name: 'Lotte', club: 'Lotte Athletic', strength: 85, profile: 'weinig', color: '#20c3c3' },
  { id: 'bot-finn', name: 'Finn', club: 'Finn FC', strength: 83, profile: 'constant', color: '#ff8a3d' },
];
export const PARTICIPANTS = [ME, ...BOTS.map((b) => b.id)];
export const nameOf = (id: string, myClub: string) => (id === ME ? myClub : BOTS.find((b) => b.id === id)?.club ?? id);

/** Vast speelschema: enkele competitie, iedereen één keer tegen iedereen (7 speelrondes). */
export const SCHEDULE = roundRobin(PARTICIPANTS, { shuffleSeed: 'klas-2b-2026' });
/** In de demo zijn de eerste speelrondes al gespeeld (computer tegen computer); jouw duels speel je zelf. */
export const PLAYED_ROUNDS = 3;

const toBattleCard = (owner: string, p: Player, chem = 0): BattleCard => ({ id: `${owner}:${p.id}`, rating: p.rating, stats: p.stats, position: p.position, chemBonus: chem });

/** Elftal van een computertegenstander: beste opstelling uit een deterministische selectie rond zijn sterkte. */
export function botTeam(bot: Bot): BattleCard[] {
  const rng = createRng(`team:${bot.id}`);
  const pool = rng.shuffle(CATALOG.filter((p) => !p.temporary && Math.abs(p.rating - bot.strength) <= 7)).slice(0, 40);
  const lineup = autoBestLineup(FORMATIONS['4-3-3']!, pool);
  return Object.values(lineup).filter((p): p is Player => !!p).map((p) => toBattleCard(bot.id, p));
}

export function myTeam(lineup: Record<string, string>, byId: Map<string, Player>): BattleCard[] {
  return Object.entries(lineup).filter(([slot]) => !slot.startsWith('bench')).map(([, id]) => byId.get(id)).filter((p): p is Player => !!p).map((p) => toBattleCard(ME, p));
}

/** Duelmodus wisselt per ronde: zo telt meer dan alleen de rating. */
export const ROUND_MODES = ['rating', 'pace', 'technique', 'defending', 'rating', 'pace', 'technique', 'defending', 'rating', 'pace', 'technique'] as const;

export function newBattle(matchId: string, home: { id: string; cards: BattleCard[] }, away: { id: string; cards: BattleCard[] }, at = Date.now()): BattleEvent[] {
  return [createBattle({
    matchId, seed: matchId, at,
    home: { playerId: home.id, cards: home.cards },
    away: { playerId: away.id, cards: away.cards },
    config: { roundModes: [...ROUND_MODES], moveTimeoutMs: 24 * 3600 * 1000, maxConsecutiveTimeouts: null, formMax: RANK_FORM_MAX },
  })];
}

/**
 * Computerzet: als aanvaller een sterke maar niet de allersterkste kaart; als verdediger de zwakste kaart
 * die de aanval nog stopt, anders de zwakste kaart (geen goede kaarten weggooien).
 */
export function botMove(events: BattleEvent[], side: Side): string {
  const s = battleState(events);
  const created = events[0] as Extract<BattleEvent, { type: 'created' }>;
  const cards = (side === 'home' ? created.home : created.away).cards.filter((c) => s.available[side].includes(c.id));
  const mode = s.currentMode ?? 'rating';
  const val = (c: BattleCard) => duelValue(c, mode, s.config);
  const sorted = [...cards].sort((a, b) => val(a) - val(b));
  if (s.phase === 'attack') return (sorted[Math.max(0, sorted.length - 2)] ?? sorted[0]!).id;
  const open = s.openCard ? (side === 'home' ? created.away : created.home).cards.find((c) => c.id === s.openCard!.cardId) : undefined;
  const need = open ? val(open) : 0;
  return (sorted.find((c) => val(c) > need) ?? sorted[0] ?? { id: lowestAvailableCard(events, side) }).id;
}

/** Speelt een wedstrijd volledig met computerzetten (voor computer-tegen-computer). */
export function autoPlay(events: BattleEvent[]): BattleEvent[] {
  let log = events;
  let t = (events[0] as { at: number }).at;
  for (let i = 0; i < 40; i++) {
    const s = battleState(log);
    if (s.status === 'finished' || !s.toMove) break;
    t += 1000;
    log = [...log, playCard(log, { side: s.toMove, cardId: botMove(log, s.toMove), at: t })];
  }
  return log;
}

export function resultOf(events: BattleEvent[], fixtureId: string, playedAt: number): LeagueResult {
  const s = battleState(events);
  return { id: fixtureId, home: s.players.home, away: s.players.away, homeGoals: s.score.home, awayGoals: s.score.away, playedAt };
}

let botResultsCache: LeagueResult[] | null = null;
/** Uitslagen van computer-tegen-computerwedstrijden in de al gespeelde rondes, plus resterende botduels. */
export function botResults(): LeagueResult[] {
  if (botResultsCache) return botResultsCache;
  const teams = new Map(BOTS.map((b) => [b.id, botTeam(b)]));
  const out: LeagueResult[] = [];
  for (const round of SCHEDULE) {
    for (const f of round.fixtures) {
      if (f.home === ME || f.away === ME) continue;
      if (round.round > PLAYED_ROUNDS) continue;
      const log = autoPlay(newBattle(f.id, { id: f.home, cards: teams.get(f.home)! }, { id: f.away, cards: teams.get(f.away)! }, Date.parse('2026-10-01T15:00:00Z') + round.round * 864e5));
      out.push(resultOf(log, f.id, Date.parse('2026-10-01T15:00:00Z') + round.round * 864e5));
    }
  }
  botResultsCache = out;
  return out;
}

export function standings(myResults: readonly LeagueResult[], myClub: string) {
  const names = Object.fromEntries(PARTICIPANTS.map((id) => [id, nameOf(id, myClub)]));
  return computeStandings(PARTICIPANTS, [...botResults(), ...myResults], { names });
}

/** Mijn wedstrijden in schemavolgorde, met uitslag als die al gespeeld is. */
export function myFixtures(myResults: readonly LeagueResult[]) {
  return SCHEDULE.flatMap((r) => r.fixtures.filter((f) => f.home === ME || f.away === ME).map((f) => ({ ...f, result: myResults.find((x) => x.id === f.id) })));
}

/* ———————————— Grade League: fictieve cijferprofielen ———————————— */

function botGrades(bot: Bot): Grade[] {
  const rng = createRng(`cijfers:${bot.id}`);
  const base = { stijger: 6.0, constant: 7.0, moeite: 5.4, weinig: 7.4, sterk: 8.1 }[bot.profile];
  const slope = { stijger: 0.9, constant: 0, moeite: 0.4, weinig: 0, sterk: 0.1 }[bot.profile];
  const count = bot.profile === 'weinig' ? 1 : 14;
  const out: Grade[] = [];
  const start = Date.parse('2026-09-01T12:00:00Z');
  const end = Date.parse('2026-10-24T12:00:00Z');
  for (let i = 0; i < count; i++) {
    const t = (i + 1) / count;
    const date = new Date(start + t * (end - start)).toISOString().slice(0, 10);
    const v = Math.max(1, Math.min(10, base + slope * t * 2 + (rng.next() - 0.5) * 1.6));
    out.push({ id: `${bot.id}-g${i}`, subjectId: SUBJECTS[i % SUBJECTS.length]!.id, testName: `Toets ${i + 1}`, value: Math.round(v * 10) / 10, weight: rng.pick([1, 1, 2, 2, 3]), date, status: 'registered', source: 'manual' });
  }
  return out;
}

function botGoals(bot: Bot): Goal[] {
  return bot.profile === 'stijger' ? [{ id: `${bot.id}-doel`, scope: 'overall', target: 6.8, createdAt: '2026-09-20T12:00:00Z' }] : [];
}

export function gradeLeague(myGrades: readonly Grade[], myGoals: readonly Goal[], periodId: string) {
  const period = PERIODS.find((p) => p.id === periodId) ?? PERIODS[1]!;
  return gradeLeagueTable([{ playerId: ME, grades: myGrades, goals: myGoals }, ...BOTS.map((b) => ({ playerId: b.id, grades: botGrades(b), goals: botGoals(b) }))], period);
}
