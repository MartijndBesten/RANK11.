/**
 * Elftal: formaties, positiefit, teamrating, chemie en automatisch beste elftal.
 */
import { RELATED_POSITIONS, type Player, type Position } from './catalog.ts';

export interface FormationSlot {
  id: string;
  position: Position;
  /** Coördinaten op het veld in procenten (x: links→rechts, y: eigen doel 100 → aanval 0). */
  x: number;
  y: number;
}

export interface Formation {
  id: string;
  name: string;
  slots: FormationSlot[];
}

const s = (id: string, position: Position, x: number, y: number): FormationSlot => ({ id, position, x, y });

export const FORMATIONS: Record<string, Formation> = {
  '4-3-3': {
    id: '4-3-3',
    name: '4-3-3',
    slots: [
      s('gk', 'GK', 50, 90), s('lb', 'LB', 14, 70), s('lcb', 'CB', 37, 74), s('rcb', 'CB', 63, 74), s('rb', 'RB', 86, 70),
      s('lcm', 'CM', 28, 49), s('cdm', 'CDM', 50, 56), s('rcm', 'CM', 72, 49),
      s('lw', 'LW', 17, 22), s('st', 'ST', 50, 14), s('rw', 'RW', 83, 22),
    ],
  },
  '4-4-2': {
    id: '4-4-2',
    name: '4-4-2',
    slots: [
      s('gk', 'GK', 50, 90), s('lb', 'LB', 14, 70), s('lcb', 'CB', 37, 74), s('rcb', 'CB', 63, 74), s('rb', 'RB', 86, 70),
      s('lm', 'LM', 14, 44), s('lcm', 'CM', 38, 50), s('rcm', 'CM', 62, 50), s('rm', 'RM', 86, 44),
      s('ls', 'ST', 37, 17), s('rs', 'ST', 63, 17),
    ],
  },
  '4-2-3-1': {
    id: '4-2-3-1',
    name: '4-2-3-1',
    slots: [
      s('gk', 'GK', 50, 90), s('lb', 'LB', 14, 70), s('lcb', 'CB', 37, 74), s('rcb', 'CB', 63, 74), s('rb', 'RB', 86, 70),
      s('ldm', 'CDM', 37, 55), s('rdm', 'CDM', 63, 55),
      s('lm', 'LM', 17, 34), s('cam', 'CAM', 50, 36), s('rm', 'RM', 83, 34), s('st', 'ST', 50, 13),
    ],
  },
  '3-5-2': {
    id: '3-5-2',
    name: '3-5-2',
    slots: [
      s('gk', 'GK', 50, 90), s('lcb', 'CB', 27, 73), s('cb', 'CB', 50, 76), s('rcb', 'CB', 73, 73),
      s('lm', 'LM', 11, 46), s('lcm', 'CM', 33, 52), s('cam', 'CAM', 50, 38), s('rcm', 'CM', 67, 52), s('rm', 'RM', 89, 46),
      s('ls', 'ST', 37, 16), s('rs', 'ST', 63, 16),
    ],
  },
};

export type Fit = 'exact' | 'alt' | 'related' | 'off';

export function positionFit(player: Pick<Player, 'position' | 'altPositions'>, slot: Position): Fit {
  if (player.position === slot) return 'exact';
  if (player.altPositions.includes(slot)) return 'alt';
  if (slot === 'GK' || player.position === 'GK') return 'off';
  if (RELATED_POSITIONS[player.position].includes(slot)) return 'related';
  return 'off';
}

const FIT_PENALTY: Record<Fit, number> = { exact: 0, alt: 0, related: 3, off: 12 };
const GK_OFF_PENALTY = 35;

export function effectiveRating(player: Player, slot: Position): number {
  const fit = positionFit(player, slot);
  if (fit === 'off' && (slot === 'GK' || player.position === 'GK')) return Math.max(1, player.rating - GK_OFF_PENALTY);
  return Math.max(1, player.rating - FIT_PENALTY[fit]);
}

export type Lineup = Record<string, Player | undefined>;

/**
 * Teamrating: gemiddelde van effectieve ratings, met een bonus voor spelers boven het gemiddelde
 * (zoals spelers dat van voetbalgames gewend zijn). Lege plekken tellen als 0.
 */
export function teamRating(formation: Formation, lineup: Lineup): number {
  const values = formation.slots.map((slot) => {
    const p = lineup[slot.id];
    return p ? effectiveRating(p, slot.position) : 0;
  });
  const total = values.reduce((a, b) => a + b, 0);
  const avg = total / formation.slots.length;
  const excess = values.reduce((sum, v) => sum + Math.max(0, v - avg), 0);
  return Math.min(99, Math.round((total + excess) / formation.slots.length));
}

export interface ChemistryResult {
  total: number;
  max: number;
  perSlot: Record<string, number>;
}

/**
 * Chemie (0-3 per speler, max 33):
 * +1 bij juiste positie, +1 bij ≥2 teamgenoten van dezelfde club, +1 bij ≥3 van dezelfde nationaliteit.
 * Legends tellen voor iedere club als link.
 */
export function chemistry(formation: Formation, lineup: Lineup): ChemistryResult {
  const players = formation.slots.map((slot) => ({ slot, p: lineup[slot.id] })).filter((x): x is { slot: FormationSlot; p: Player } => !!x.p);
  const clubCount = new Map<string, number>();
  const nationCount = new Map<string, number>();
  for (const { p } of players) {
    clubCount.set(p.clubId, (clubCount.get(p.clubId) ?? 0) + 1);
    nationCount.set(p.nation, (nationCount.get(p.nation) ?? 0) + 1);
  }
  const legends = players.filter(({ p }) => p.rarity === 'legend').length;
  const perSlot: Record<string, number> = {};
  let total = 0;
  for (const { slot, p } of players) {
    const fit = positionFit(p, slot.position);
    let points = 0;
    if (fit === 'exact' || fit === 'alt') points++;
    const clubmates = p.rarity === 'legend' ? 2 : (clubCount.get(p.clubId) ?? 0) + legends;
    if (clubmates >= 2) points++;
    if ((nationCount.get(p.nation) ?? 0) >= 3) points++;
    if (fit === 'off') points = 0;
    perSlot[slot.id] = points;
    total += points;
  }
  return { total, max: formation.slots.length * 3, perSlot };
}

/**
 * Beste elftal voorstellen: per plek de hoogste effectieve rating, iedere speler (baseId) maximaal één keer.
 * Gretige toewijzing over alle (plek, speler)-paren gesorteerd op effectieve rating.
 */
export function autoBestLineup(formation: Formation, collection: readonly Player[]): Lineup {
  const pairs: { slotId: string; player: Player; value: number }[] = [];
  for (const slot of formation.slots) {
    for (const player of collection) {
      pairs.push({ slotId: slot.id, player, value: effectiveRating(player, slot.position) });
    }
  }
  pairs.sort((a, b) => b.value - a.value);
  const lineup: Lineup = {};
  const used = new Set<string>();
  for (const { slotId, player } of pairs) {
    if (lineup[slotId] || used.has(player.baseId)) continue;
    lineup[slotId] = player;
    used.add(player.baseId);
  }
  return lineup;
}

/** Kandidaten voor een plek, beste eerst; spelers die al elders staan worden uitgesloten. */
export function candidatesForSlot(
  formation: Formation,
  lineup: Lineup,
  slotId: string,
  collection: readonly Player[],
): { player: Player; effective: number; fit: Fit }[] {
  const slot = formation.slots.find((x) => x.id === slotId);
  if (!slot) return [];
  const usedElsewhere = new Set(
    Object.entries(lineup).filter(([id, p]) => id !== slotId && p).map(([, p]) => (p as Player).baseId),
  );
  return collection
    .filter((p) => !usedElsewhere.has(p.baseId))
    .map((player) => ({ player, effective: effectiveRating(player, slot.position), fit: positionFit(player, slot.position) }))
    .sort((a, b) => b.effective - a.effective);
}

/** Wisselt spelers tussen formaties zonder ze kwijt te raken: probeert op gelijke positie te plaatsen. */
export function remapLineup(from: Formation, to: Formation, lineup: Lineup): Lineup {
  const players = from.slots.map((slot) => lineup[slot.id]).filter((p): p is Player => !!p);
  return autoBestLineup(to, players);
}
