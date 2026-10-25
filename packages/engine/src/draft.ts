/**
 * Ultimate Draft: per positie 5 kaarten, kies er 1 en bouw zo een tijdelijk elftal.
 * Spelersgroepen (A = topgroep) met transparante kansen en een configureerbare garantie
 * ("Groep B of hoger gegarandeerd binnen X drafts"). Draftkaarten zijn altijd tijdelijk.
 */
import { RELATED_POSITIONS, type Player, type Position, type Rarity } from './catalog.ts';
import type { Rng } from './rng.ts';
import { FORMATIONS, type Formation, type Lineup } from './squad.ts';

export interface DraftGroup {
  id: string;
  label: string;
  /** Lagere rank = betere groep (A = 0). */
  rank: number;
  weight: number;
  minRating: number;
  maxRating?: number;
  rarities?: Rarity[];
  /** Vaste kaarten (baseId), bijv. de uitgelichte sterspelers van een event. */
  ids?: string[];
}

export interface PityRule {
  groupId: string;
  /** Garantie uiterlijk bij de zoveelste draft. */
  every: number;
}

export interface DraftEventDef {
  id: string;
  name: string;
  subtitle: string;
  formationId: keyof typeof FORMATIONS | string;
  offersPerSlot: number;
  voucherCost: number;
  /** Uitgelichte kaarten in de lobby (baseId's). */
  featured: string[];
  groups: DraftGroup[];
  pity: PityRule[];
}

export const DRAFT_EVENTS: Record<string, DraftEventDef> = {
  toetsweek1: {
    id: 'toetsweek1',
    name: 'Toetsweek Draft I',
    subtitle: 'Verdiend met je cijfers uit toetsweek 1',
    formationId: '4-3-3',
    offersPerSlot: 5,
    voucherCost: 1,
    featured: ['L01', 'S01', 'L06'],
    // Gewicht per aangeboden kaart. Een draft biedt 55 kaarten, dus per-kaart-kansen zijn bewust klein.
    groups: [
      { id: 'A', label: 'Groep A · Sterspelers', rank: 0, weight: 0.03, minRating: 0, ids: ['L06', 'L01', 'L03'] },
      { id: 'B', label: 'Groep B · Legends & Electric 90+', rank: 1, weight: 0.35, minRating: 90, rarities: ['legend', 'special', 'exam', 'season'] },
      { id: 'C', label: 'Groep C · 85+', rank: 2, weight: 10, minRating: 85 },
      { id: 'D', label: 'Groep D · 80-84', rank: 3, weight: 40, minRating: 80, maxRating: 84 },
      { id: 'E', label: 'Groep E · 70-79', rank: 4, weight: 49.62, minRating: 70, maxRating: 79 },
    ],
    pity: [
      { groupId: 'B', every: 10 },
      { groupId: 'A', every: 50 },
    ],
  },
};

export type PityState = Record<string, number>;

export interface DraftSlot {
  slotId: string;
  position: Position;
  offers: Player[];
  pickedId?: string;
}

export interface DraftSession {
  eventId: string;
  formationId: string;
  slots: DraftSlot[];
  /** Groepen die in deze draft gegarandeerd waren (voor uitleg en audit). */
  guaranteed: string[];
}

export class DraftError extends Error {}

export function groupOf(event: DraftEventDef, player: Player): DraftGroup | undefined {
  return [...event.groups]
    .sort((a, b) => a.rank - b.rank)
    .find(
      (g) =>
        (!g.ids || g.ids.includes(player.baseId)) &&
        player.rating >= g.minRating &&
        (g.maxRating === undefined || player.rating <= g.maxRating) &&
        (!g.rarities || g.rarities.includes(player.rarity)),
    );
}

function fitsSlot(p: Player, position: Position, strict: boolean): boolean {
  if (p.position === position || p.altPositions.includes(position)) return true;
  return !strict && position !== 'GK' && RELATED_POSITIONS[p.position].includes(position);
}

type GroupIndex = Map<string, Player[]>;

function indexGroups(event: DraftEventDef, catalog: readonly Player[]): GroupIndex {
  const index: GroupIndex = new Map(event.groups.map((g) => [g.id, []]));
  for (const p of catalog) {
    if (p.temporary) continue;
    const g = groupOf(event, p);
    if (g) index.get(g.id)?.push(p);
  }
  return index;
}

function candidates(index: GroupIndex, group: DraftGroup, position: Position, used: Set<string>, strict = true): Player[] {
  return (index.get(group.id) ?? []).filter((p) => !used.has(p.baseId) && fitsSlot(p, position, strict));
}

/**
 * Kandidaten met terugval: eerst de gerolde groep, dan dichtstbijzijnde lagere groepen, dan hogere;
 * pas als geen enkele groep een speler op exact deze positie heeft, ook verwante posities.
 */
function poolWithFallback(index: GroupIndex, groupsByRank: DraftGroup[], rolled: DraftGroup, position: Position, used: Set<string>): Player[] {
  const order = [...groupsByRank].sort((a, b) => {
    const da = a.rank >= rolled.rank ? a.rank - rolled.rank : (rolled.rank - a.rank) + 0.5;
    const db = b.rank >= rolled.rank ? b.rank - rolled.rank : (rolled.rank - b.rank) + 0.5;
    return da - db;
  });
  for (const strict of [true, false]) {
    for (const g of order) {
      const pool = candidates(index, g, position, used, strict);
      if (pool.length) return pool;
    }
  }
  return [];
}

/** Resterende drafts tot een garantie; voor de teller "gegarandeerd over N drafts". */
export function pityRemaining(event: DraftEventDef, pity: PityState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const rule of event.pity) out[rule.groupId] = Math.max(1, rule.every - (pity[rule.groupId] ?? 0));
  return out;
}

export function createDraft(
  event: DraftEventDef,
  catalog: readonly Player[],
  rng: Rng,
  pity: PityState = {},
): { session: DraftSession; pity: PityState } {
  const formation = FORMATIONS[event.formationId];
  if (!formation) throw new DraftError(`Onbekende formatie ${event.formationId}`);
  const groupsByRank = [...event.groups].sort((a, b) => a.rank - b.rank);
  const used = new Set<string>();
  const index = indexGroups(event, catalog);

  const slots: DraftSlot[] = formation.slots.map((slot) => {
    const offers: Player[] = [];
    for (let i = 0; i < event.offersPerSlot; i++) {
      const group = rng.weighted(event.groups, (g) => g.weight);
      const pool = poolWithFallback(index, groupsByRank, group, slot.position, used);
      if (!pool.length) throw new DraftError(`Te weinig spelers voor positie ${slot.position}.`);
      const pick = rng.pick(pool);
      used.add(pick.baseId);
      offers.push({ ...pick, id: `draft:${pick.id}`, temporary: true });
    }
    return { slotId: slot.id, position: slot.position, offers };
  });

  // Garanties toepassen: beste groep eerst.
  const guaranteed: string[] = [];
  const rules = [...event.pity].sort(
    (a, b) => (groupsByRank.find((g) => g.id === a.groupId)?.rank ?? 99) - (groupsByRank.find((g) => g.id === b.groupId)?.rank ?? 99),
  );
  const rankOf = (p: Player) => groupOf(event, p)?.rank ?? 99;
  for (const rule of rules) {
    const target = groupsByRank.find((g) => g.id === rule.groupId);
    if (!target) continue;
    const due = (pity[rule.groupId] ?? 0) + 1 >= rule.every;
    const present = slots.some((s) => s.offers.some((p) => rankOf(p) <= target.rank));
    if (!due || present) continue;
    // Injecteer één kaart van de doelgroep op een willekeurige plek waar een kandidaat bestaat.
    for (const slot of rng.shuffle(slots)) {
      const pool = candidates(index, target, slot.position, used, true).length
        ? candidates(index, target, slot.position, used, true)
        : candidates(index, target, slot.position, used, false);
      if (!pool.length) continue;
      const pick = rng.pick(pool);
      used.add(pick.baseId);
      const replaceAt = rng.int(0, slot.offers.length - 1);
      slot.offers[replaceAt] = { ...pick, id: `draft:${pick.id}`, temporary: true };
      guaranteed.push(rule.groupId);
      break;
    }
  }

  const nextPity: PityState = { ...pity };
  for (const rule of event.pity) {
    const target = groupsByRank.find((g) => g.id === rule.groupId);
    const hit = target && slots.some((s) => s.offers.some((p) => rankOf(p) <= target.rank));
    nextPity[rule.groupId] = hit ? 0 : (pity[rule.groupId] ?? 0) + 1;
  }

  return { session: { eventId: event.id, formationId: formation.id, slots, guaranteed }, pity: nextPity };
}

export function pickDraft(session: DraftSession, slotId: string, playerId: string): DraftSession {
  const slot = session.slots.find((s) => s.slotId === slotId);
  if (!slot) throw new DraftError('Onbekende positie.');
  if (slot.pickedId) throw new DraftError('Voor deze positie is al gekozen.');
  if (!slot.offers.some((p) => p.id === playerId)) throw new DraftError('Deze speler hoort niet bij de aangeboden keuzes.');
  return {
    ...session,
    slots: session.slots.map((s) => (s.slotId === slotId ? { ...s, pickedId: playerId } : s)),
  };
}

export function nextOpenSlot(session: DraftSession): DraftSlot | undefined {
  return session.slots.find((s) => !s.pickedId);
}

export function draftLineup(session: DraftSession): Lineup {
  const lineup: Lineup = {};
  for (const s of session.slots) {
    if (s.pickedId) lineup[s.slotId] = s.offers.find((p) => p.id === s.pickedId);
  }
  return lineup;
}

export function draftFormation(session: DraftSession): Formation {
  const f = FORMATIONS[session.formationId];
  if (!f) throw new DraftError('Onbekende formatie.');
  return f;
}

/** Transparante kansen per aangeboden kaart (vóór terugval en garantie). */
export function draftOdds(event: DraftEventDef): { groupId: string; label: string; chance: number }[] {
  const total = event.groups.reduce((s, g) => s + g.weight, 0);
  return [...event.groups].sort((a, b) => a.rank - b.rank).map((g) => ({ groupId: g.id, label: g.label, chance: g.weight / total }));
}
