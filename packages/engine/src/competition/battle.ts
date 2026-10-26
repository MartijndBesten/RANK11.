/**
 * Open kaartbattle (GDD §4.7) als pure reducer: `status = f(gebeurtenissen)`.
 *
 * De status wordt nooit opgeslagen. De server bewaart alleen de eventlog en leidt de stand,
 * de beurt, de deadline en de uitslag telkens opnieuw af met `battleState(events)`.
 * Zetten worden gevalideerd met `playCard()` (levert het nieuwe event of gooit een getypeerde fout),
 * time-outs met `timeoutEvents()` (levert de automatische zetten die de server moet toevoegen).
 */
import { createRng } from '../rng.ts';
import type { StatKey, Stats } from '../catalog.ts';

export type Side = 'home' | 'away';
export type DuelMode = 'rating' | Extract<StatKey, 'pace' | 'defending' | 'technique'>;
/** Wie scoort bij gelijke duelwaarde. */
export type TieRule = 'none' | 'both' | 'attacker' | 'defender';

export const BATTLE_CONFIG_VERSION = 'battle.2026.10-2';
/** Vorm van de dag voor echte wedstrijden (V-018): 0..3 extra per kaart per duel. 0 = uit. */
export const RANK_FORM_MAX = 3;

export interface BattleConfig {
  /** Versie van deze regels; iedere wedstrijd bewaart de versie waaronder hij is aangemaakt. */
  configVersion: string;
  /** Standaard duelmodus. */
  mode: DuelMode;
  /** Optioneel: modus per ronde (index 0 = ronde 1). Ontbrekende rondes vallen terug op `mode`. */
  roundModes?: DuelMode[];
  tieRule: TieRule;
  /** Aantal kaarten per elftal. */
  lineupSize: number;
  maxRounds: number;
  /** Stoppen zodra de voorsprong groter is dan het aantal resterende duels. */
  stopWhenDecided: boolean;
  /** Chemiebonus (0–3) optellen bij de rating (alleen in modus 'rating'). */
  applyChemBonus: boolean;
  /** Bedenktijd per zet in milliseconden (live 30 s, asynchroon 24 uur). */
  moveTimeoutMs: number;
  /** Aantal time-outs op rij dat tot reglementair verlies leidt; `null` = nooit. */
  maxConsecutiveTimeouts: number | null;
  /** Uitslag bij reglementair verlies. */
  forfeitScore: { winner: number; loser: number };
  /**
   * Vorm van de dag (V-018): elke gespeelde kaart krijgt per duel 0..`formMax` extra bij zijn duelwaarde.
   * Deterministisch uit de wedstrijdseed, dus server en app rekenen hetzelfde en het is achteraf te controleren.
   * De bonus staat in het duelresultaat (geen verborgen willekeur). 0 = uit. Zo wint de sterkere kaart meestal,
   * maar blijft een kleine verrassing mogelijk.
   */
  formMax: number;
}

export const DEFAULT_BATTLE_CONFIG: BattleConfig = {
  configVersion: BATTLE_CONFIG_VERSION,
  mode: 'rating',
  tieRule: 'none',
  lineupSize: 11,
  maxRounds: 11,
  stopWhenDecided: true,
  applyChemBonus: false,
  moveTimeoutMs: 30_000,
  maxConsecutiveTimeouts: 3,
  forfeitScore: { winner: 3, loser: 0 },
  formMax: 0,
};

/** Vorm van de dag voor één kaart in één duel: deterministisch uit de seed, een geheel getal 0..max. */
export function formBonus(seed: string, round: number, side: Side, cardId: string, max: number): number {
  if (max <= 0) return 0;
  return createRng(`${seed}:vorm:${round}:${side}:${cardId}`).int(0, max);
}

export const LIVE_MOVE_TIMEOUT_MS = 30_000;
export const ASYNC_MOVE_TIMEOUT_MS = 24 * 60 * 60 * 1000;

export interface BattleCard {
  id: string;
  rating: number;
  stats: Stats;
  position: string;
  /** Chemiebonus 0–3 (wordt begrensd). */
  chemBonus?: number;
  /** Geschorste kaart (§5.6): hoort bij het vastgezette elftal, maar is niet speelbaar. */
  suspended?: boolean;
}

export interface BattleTeam {
  playerId: string;
  cards: BattleCard[];
}

export type BattleErrorCode =
  | 'INVALID_LINEUP'
  | 'INVALID_CONFIG'
  | 'INVALID_LOG'
  | 'NOT_YOUR_TURN'
  | 'CARD_NOT_OWNED'
  | 'CARD_USED'
  | 'CARD_SUSPENDED'
  | 'MATCH_FINISHED'
  | 'INVALID_TIME';

export class BattleError extends Error {
  constructor(public readonly code: BattleErrorCode, message: string) {
    super(message);
    this.name = 'BattleError';
  }
}

export type BattleEvent =
  | {
      type: 'created';
      at: number;
      matchId: string;
      seed: string;
      config: BattleConfig;
      home: BattleTeam;
      away: BattleTeam;
    }
  | { type: 'played'; at: number; side: Side; cardId: string; auto: boolean }
  | { type: 'forfeit'; at: number; side: Side; reason: 'timeouts' | 'resign' };

export type ForfeitReason = 'timeouts' | 'resign';

export interface DuelResult {
  round: number;
  mode: DuelMode;
  attacker: Side;
  attackerCardId: string;
  defenderCardId: string;
  attackerValue: number;
  defenderValue: number;
  /** Wie scoorde: één kant, beide of niemand. */
  scorer: Side | 'both' | null;
  autoAttacker: boolean;
  autoDefender: boolean;
  /** Vorm van de dag die in `attackerValue`/`defenderValue` is meegeteld (alleen gevuld als `formMax` > 0). */
  attackerForm?: number;
  defenderForm?: number;
}

export interface BattleResult {
  homeGoals: number;
  awayGoals: number;
  winner: Side | null;
  decidedEarly: boolean;
  forfeit: boolean;
  forfeitedBy: Side | null;
  forfeitReason: ForfeitReason | null;
}

export interface BattleState {
  matchId: string;
  configVersion: string;
  config: BattleConfig;
  seed: string;
  players: Record<Side, string>;
  status: 'in_progress' | 'finished';
  tossWinner: Side;
  /** Aantal rondes dat maximaal gespeeld kan worden (begrensd door speelbare kaarten). */
  totalRounds: number;
  /** Huidige ronde (1-based); na afloop de laatst gespeelde ronde. */
  round: number;
  attacker: Side | null;
  /** Wie nu aan zet is (`null` als de wedstrijd voorbij is). */
  toMove: Side | null;
  phase: 'attack' | 'defend' | null;
  /** Duelmodus van de huidige ronde (vooraf zichtbaar voor beide spelers). */
  currentMode: DuelMode | null;
  /** De open gelegde aanvalskaart waar de verdediger op reageert. */
  openCard: { side: Side; cardId: string } | null;
  score: Record<Side, number>;
  used: Record<Side, string[]>;
  available: Record<Side, string[]>;
  duels: DuelResult[];
  consecutiveTimeouts: Record<Side, number>;
  /** Tijdstip (ms) waarop de huidige zet uiterlijk gedaan moet zijn. */
  deadline: number | null;
  lastEventAt: number;
  result: BattleResult | null;
}

export const otherSide = (side: Side): Side => (side === 'home' ? 'away' : 'home');

const DUEL_MODES: readonly DuelMode[] = ['rating', 'pace', 'defending', 'technique'];
const TIE_RULES: readonly TieRule[] = ['none', 'both', 'attacker', 'defender'];

/** Vult ontbrekende instellingen aan met de standaard en valideert het geheel. */
export function resolveBattleConfig(partial: Partial<BattleConfig> = {}): BattleConfig {
  const config: BattleConfig = { ...DEFAULT_BATTLE_CONFIG, ...partial, forfeitScore: { ...DEFAULT_BATTLE_CONFIG.forfeitScore, ...partial.forfeitScore } };
  validateConfig(config);
  return config;
}

function validateConfig(c: BattleConfig): void {
  const fail = (m: string): never => { throw new BattleError('INVALID_CONFIG', m); };
  if (!c.configVersion) fail('Configuratieversie ontbreekt.');
  if (!DUEL_MODES.includes(c.mode)) fail(`Onbekende duelmodus: ${String(c.mode)}.`);
  if (c.roundModes && c.roundModes.some((m) => !DUEL_MODES.includes(m))) fail('Onbekende duelmodus in roundModes.');
  if (!TIE_RULES.includes(c.tieRule)) fail(`Onbekende gelijkspelregel: ${String(c.tieRule)}.`);
  if (!Number.isInteger(c.lineupSize) || c.lineupSize < 1) fail('Elftalgrootte moet een positief geheel getal zijn.');
  if (!Number.isInteger(c.maxRounds) || c.maxRounds < 1 || c.maxRounds > c.lineupSize) fail('Maximaal aantal rondes moet tussen 1 en de elftalgrootte liggen.');
  if (!(c.moveTimeoutMs > 0)) fail('Bedenktijd moet groter dan 0 zijn.');
  if (c.maxConsecutiveTimeouts !== null && (!Number.isInteger(c.maxConsecutiveTimeouts) || c.maxConsecutiveTimeouts < 1)) {
    fail('Maximaal aantal time-outs moet een positief geheel getal of null zijn.');
  }
  if (c.forfeitScore.winner <= c.forfeitScore.loser) fail('Reglementaire uitslag moet een winnaar hebben.');
  if (!Number.isInteger(c.formMax) || c.formMax < 0 || c.formMax > 10) fail('Vorm van de dag (formMax) moet een geheel getal van 0 t/m 10 zijn.');
}

function validateTeam(team: BattleTeam, config: BattleConfig, label: string): void {
  const fail = (m: string): never => { throw new BattleError('INVALID_LINEUP', `${label}: ${m}`); };
  if (!team.playerId) fail('speler ontbreekt.');
  if (team.cards.length !== config.lineupSize) fail(`elftal moet precies ${config.lineupSize} kaarten hebben.`);
  const ids = new Set(team.cards.map((c) => c.id));
  if (ids.size !== team.cards.length) fail('dubbele kaart in het elftal.');
  for (const card of team.cards) {
    if (!card.id) fail('kaart zonder id.');
    if (!Number.isFinite(card.rating)) fail(`kaart ${card.id} heeft geen geldige rating.`);
    const modes = new Set<DuelMode>([config.mode, ...(config.roundModes ?? [])]);
    for (const m of modes) {
      if (m !== 'rating' && !Number.isFinite(card.stats?.[m])) fail(`kaart ${card.id} mist stat ${m}.`);
    }
  }
}

/** Toss met de gelogde seed: wie valt in ronde 1 aan. */
export function tossWinner(seed: string): Side {
  return createRng(`${seed}:toss`).next() < 0.5 ? 'home' : 'away';
}

export interface CreateBattleInput {
  matchId: string;
  seed: string;
  at: number;
  home: BattleTeam;
  away: BattleTeam;
  config?: Partial<BattleConfig>;
}

/** Maakt het startevent na validatie van beide elftallen. */
export function createBattle(input: CreateBattleInput): BattleEvent & { type: 'created' } {
  if (!input.matchId) throw new BattleError('INVALID_LOG', 'Wedstrijd-id ontbreekt.');
  if (!input.seed) throw new BattleError('INVALID_LOG', 'Seed ontbreekt.');
  if (!Number.isFinite(input.at)) throw new BattleError('INVALID_TIME', 'Ongeldig tijdstip.');
  const config = resolveBattleConfig(input.config);
  validateTeam(input.home, config, 'Thuisploeg');
  validateTeam(input.away, config, 'Uitploeg');
  if (input.home.playerId === input.away.playerId) throw new BattleError('INVALID_LINEUP', 'Een speler kan niet tegen zichzelf spelen.');
  const overlap = input.home.cards.some((h) => input.away.cards.some((a) => a.id === h.id));
  if (overlap) throw new BattleError('INVALID_LINEUP', 'Een kaart kan niet in beide elftallen staan.');
  const event = {
    type: 'created' as const,
    at: input.at,
    matchId: input.matchId,
    seed: input.seed,
    config,
    home: { playerId: input.home.playerId, cards: input.home.cards.map((c) => ({ ...c })) },
    away: { playerId: input.away.playerId, cards: input.away.cards.map((c) => ({ ...c })) },
  };
  if (playable(event.home).length === 0 || playable(event.away).length === 0) {
    throw new BattleError('INVALID_LINEUP', 'Een elftal heeft geen speelbare kaarten.');
  }
  return event;
}

const playable = (team: BattleTeam): BattleCard[] => team.cards.filter((c) => !c.suspended);

export function modeForRound(config: BattleConfig, round: number): DuelMode {
  return config.roundModes?.[round - 1] ?? config.mode;
}

/** Duelwaarde van een kaart in een modus. */
export function duelValue(card: BattleCard, mode: DuelMode, config: Pick<BattleConfig, 'applyChemBonus'>): number {
  if (mode === 'rating') {
    const chem = config.applyChemBonus ? Math.max(0, Math.min(3, Math.round(card.chemBonus ?? 0))) : 0;
    return card.rating + chem;
  }
  return card.stats[mode];
}

function scorerFor(rule: TieRule, attacker: Side, a: number, d: number): Side | 'both' | null {
  if (a > d) return attacker;
  if (d > a) return otherSide(attacker);
  switch (rule) {
    case 'none': return null;
    case 'both': return 'both';
    case 'attacker': return attacker;
    case 'defender': return otherSide(attacker);
  }
}

interface Internal {
  created: BattleEvent & { type: 'created' };
  cards: Record<Side, Map<string, BattleCard>>;
}

/**
 * Leidt de volledige status af uit de eventlog. Gooit `BattleError('INVALID_LOG')` als de log
 * een ongeldige reeks bevat (de server voegt alleen events toe die via `playCard`/`timeoutEvents` zijn gemaakt).
 */
export function battleState(events: readonly BattleEvent[]): BattleState {
  const first = events[0];
  if (!first || first.type !== 'created') throw new BattleError('INVALID_LOG', 'Eventlog moet met "created" beginnen.');
  const config = first.config;
  const internal: Internal = {
    created: first,
    cards: {
      home: new Map(first.home.cards.map((c) => [c.id, c])),
      away: new Map(first.away.cards.map((c) => [c.id, c])),
    },
  };
  const toss = tossWinner(first.seed);
  const totalRounds = Math.min(config.maxRounds, playable(first.home).length, playable(first.away).length);
  const state: BattleState = {
    matchId: first.matchId,
    configVersion: config.configVersion,
    config,
    seed: first.seed,
    players: { home: first.home.playerId, away: first.away.playerId },
    status: 'in_progress',
    tossWinner: toss,
    totalRounds,
    round: 1,
    attacker: toss,
    toMove: toss,
    phase: 'attack',
    currentMode: modeForRound(config, 1),
    openCard: null,
    score: { home: 0, away: 0 },
    used: { home: [], away: [] },
    available: {
      home: playable(first.home).map((c) => c.id),
      away: playable(first.away).map((c) => c.id),
    },
    duels: [],
    consecutiveTimeouts: { home: 0, away: 0 },
    deadline: first.at + config.moveTimeoutMs,
    lastEventAt: first.at,
    result: null,
  };
  let openAuto = false;

  for (let i = 1; i < events.length; i++) {
    const ev = events[i] as BattleEvent;
    if (ev.type === 'created') throw new BattleError('INVALID_LOG', 'Dubbel startevent.');
    if (state.status === 'finished') throw new BattleError('INVALID_LOG', 'Event na het einde van de wedstrijd.');
    if (!(ev.at >= state.lastEventAt)) throw new BattleError('INVALID_LOG', 'Events moeten in tijdsvolgorde staan.');
    state.lastEventAt = ev.at;

    if (ev.type === 'forfeit') {
      finishByForfeit(state, ev.side, ev.reason);
      continue;
    }

    // ev.type === 'played'
    assertPlayable(state, internal, ev.side, ev.cardId, 'INVALID_LOG');
    state.used[ev.side].push(ev.cardId);
    state.available[ev.side] = state.available[ev.side].filter((id) => id !== ev.cardId);
    state.consecutiveTimeouts[ev.side] = ev.auto ? state.consecutiveTimeouts[ev.side] + 1 : 0;

    if (state.phase === 'attack') {
      state.openCard = { side: ev.side, cardId: ev.cardId };
      openAuto = ev.auto;
      state.phase = 'defend';
      state.toMove = otherSide(ev.side);
    } else {
      const open = state.openCard as { side: Side; cardId: string };
      const attacker = open.side;
      const mode = state.currentMode as DuelMode;
      const aCard = internal.cards[attacker].get(open.cardId) as BattleCard;
      const dCard = internal.cards[ev.side].get(ev.cardId) as BattleCard;
      const aForm = formBonus(first.seed, state.round, attacker, open.cardId, config.formMax);
      const dForm = formBonus(first.seed, state.round, ev.side, ev.cardId, config.formMax);
      const attackerValue = duelValue(aCard, mode, config) + aForm;
      const defenderValue = duelValue(dCard, mode, config) + dForm;
      const scorer = scorerFor(config.tieRule, attacker, attackerValue, defenderValue);
      if (scorer === 'both') { state.score.home++; state.score.away++; }
      else if (scorer) state.score[scorer]++;
      state.duels.push({
        round: state.round, mode, attacker, attackerCardId: open.cardId, defenderCardId: ev.cardId,
        attackerValue, defenderValue, scorer, autoAttacker: openAuto, autoDefender: ev.auto,
        ...(config.formMax > 0 ? { attackerForm: aForm, defenderForm: dForm } : {}),
      });
      state.openCard = null;
      openAuto = false;

      const played = state.duels.length;
      const remaining = state.totalRounds - played;
      const lead = Math.abs(state.score.home - state.score.away);
      if (remaining === 0) {
        finishRegular(state, false);
      } else if (config.stopWhenDecided && lead > remaining) {
        finishRegular(state, true);
      } else {
        state.round = played + 1;
        state.attacker = otherSide(attacker);
        state.toMove = state.attacker;
        state.phase = 'attack';
        state.currentMode = modeForRound(config, state.round);
      }
    }

    // Reglementair verlies na te veel time-outs op rij staat als apart 'forfeit'-event in de log
    // (toegevoegd door timeoutEvents), zodat de log de enige waarheid blijft.
    if (state.status === 'in_progress') state.deadline = ev.at + config.moveTimeoutMs;
  }
  return state;
}

function finishRegular(state: BattleState, decidedEarly: boolean): void {
  const { home, away } = state.score;
  state.status = 'finished';
  state.toMove = null;
  state.phase = null;
  state.attacker = null;
  state.currentMode = null;
  state.deadline = null;
  state.result = {
    homeGoals: home,
    awayGoals: away,
    winner: home > away ? 'home' : away > home ? 'away' : null,
    decidedEarly,
    forfeit: false,
    forfeitedBy: null,
    forfeitReason: null,
  };
}

function finishByForfeit(state: BattleState, side: Side, reason: ForfeitReason): void {
  const { winner, loser } = state.config.forfeitScore;
  const winSide = otherSide(side);
  state.status = 'finished';
  state.toMove = null;
  state.phase = null;
  state.attacker = null;
  state.currentMode = null;
  state.openCard = null;
  state.deadline = null;
  state.result = {
    homeGoals: winSide === 'home' ? winner : loser,
    awayGoals: winSide === 'away' ? winner : loser,
    winner: winSide,
    decidedEarly: false,
    forfeit: true,
    forfeitedBy: side,
    forfeitReason: reason,
  };
}

function assertPlayable(state: BattleState, internal: Internal, side: Side, cardId: string, codeOverride?: BattleErrorCode): void {
  const fail = (code: BattleErrorCode, m: string): never => { throw new BattleError(codeOverride ?? code, m); };
  if (state.status === 'finished') fail('MATCH_FINISHED', 'De wedstrijd is al voorbij.');
  if (state.toMove !== side) fail('NOT_YOUR_TURN', 'Je bent niet aan de beurt.');
  const card = internal.cards[side].get(cardId);
  if (!card) fail('CARD_NOT_OWNED', 'Deze kaart staat niet in jouw elftal.');
  if (card?.suspended) fail('CARD_SUSPENDED', 'Deze speler is geschorst en kan niet spelen.');
  if (state.used[side].includes(cardId)) fail('CARD_USED', 'Deze kaart is al gespeeld.');
}

function internalOf(events: readonly BattleEvent[]): Internal {
  const created = events[0] as BattleEvent & { type: 'created' };
  return {
    created,
    cards: {
      home: new Map(created.home.cards.map((c) => [c.id, c])),
      away: new Map(created.away.cards.map((c) => [c.id, c])),
    },
  };
}

/** Bepaalt welke kant bij een speler hoort, of `null` als de speler niet meedoet. */
export function sideOf(state: Pick<BattleState, 'players'>, playerId: string): Side | null {
  if (state.players.home === playerId) return 'home';
  if (state.players.away === playerId) return 'away';
  return null;
}

/**
 * Valideert een zet en levert het event dat aan de log moet worden toegevoegd.
 * Let op: verlopen deadlines eerst verwerken met `timeoutEvents()`; een zet na de deadline wordt geweigerd.
 */
export function playCard(events: readonly BattleEvent[], move: { side: Side; cardId: string; at: number }): BattleEvent & { type: 'played' } {
  const state = battleState(events);
  if (!Number.isFinite(move.at) || move.at < state.lastEventAt) throw new BattleError('INVALID_TIME', 'Ongeldig tijdstip voor deze zet.');
  if (state.status === 'in_progress' && state.deadline !== null && move.at > state.deadline) {
    throw new BattleError('INVALID_TIME', 'De bedenktijd is verstreken; de server speelt automatisch.');
  }
  assertPlayable(state, internalOf(events), move.side, move.cardId);
  return { type: 'played', at: move.at, side: move.side, cardId: move.cardId, auto: false };
}

/** Opgeven: direct reglementair verlies voor deze kant. */
export function resign(events: readonly BattleEvent[], side: Side, at: number): BattleEvent & { type: 'forfeit' } {
  const state = battleState(events);
  if (state.status === 'finished') throw new BattleError('MATCH_FINISHED', 'De wedstrijd is al voorbij.');
  if (!Number.isFinite(at) || at < state.lastEventAt) throw new BattleError('INVALID_TIME', 'Ongeldig tijdstip.');
  return { type: 'forfeit', at, side, reason: 'resign' };
}

/** De laagste beschikbare kaart voor de huidige modus (bij gelijke waarde: laagste rating, dan id). */
export function lowestAvailableCard(events: readonly BattleEvent[], side: Side): string {
  const state = battleState(events);
  const internal = internalOf(events);
  const mode = state.currentMode ?? state.config.mode;
  const cards = state.available[side].map((id) => internal.cards[side].get(id) as BattleCard);
  if (cards.length === 0) throw new BattleError('INVALID_LOG', 'Geen beschikbare kaarten.');
  cards.sort((a, b) =>
    duelValue(a, mode, state.config) - duelValue(b, mode, state.config) || a.rating - b.rating || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return (cards[0] as BattleCard).id;
}

/**
 * Verwerkt alle verlopen deadlines tot en met `now`. Levert de events die de server moet toevoegen:
 * automatische zetten (laagste kaart) op het deadline-tijdstip en eventueel een forfait na
 * `maxConsecutiveTimeouts` time-outs op rij. Leeg als er niets verlopen is.
 */
export function timeoutEvents(events: readonly BattleEvent[], now: number): BattleEvent[] {
  const out: BattleEvent[] = [];
  let log = [...events];
  for (let guard = 0; guard < 100; guard++) {
    const state = battleState(log);
    if (state.status === 'finished' || state.deadline === null || now < state.deadline) break;
    const side = state.toMove as Side;
    const at = state.deadline;
    const auto: BattleEvent = { type: 'played', at, side, cardId: lowestAvailableCard(log, side), auto: true };
    log = [...log, auto];
    out.push(auto);
    const after = battleState(log);
    const max = state.config.maxConsecutiveTimeouts;
    if (after.status === 'in_progress' && max !== null && after.consecutiveTimeouts[side] >= max) {
      const forfeit: BattleEvent = { type: 'forfeit', at, side, reason: 'timeouts' };
      log = [...log, forfeit];
      out.push(forfeit);
    }
  }
  return out;
}

/** Kaartgegevens uit het startevent (voor weergave). */
export function battleCards(events: readonly BattleEvent[]): Record<Side, BattleCard[]> {
  const created = events[0];
  if (!created || created.type !== 'created') throw new BattleError('INVALID_LOG', 'Eventlog moet met "created" beginnen.');
  return { home: created.home.cards, away: created.away.cards };
}
