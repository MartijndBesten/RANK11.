/**
 * Server-side spelgegevens: de (fictieve) catalogus uit de engine, het startelftal en de omzetting
 * van kaartinstanties naar battlekaarten. De catalogus is deterministisch (seed), dus een
 * kaartinstantie verwijst alleen naar `card_def_id` + catalogusversie.
 */
import { createRng, FORMATIONS, generateCatalog, RELATED_POSITIONS, type BattleCard, type Player } from './engine.ts';

export const CATALOG_SEED = 'rank11-catalog-v1';
export const CATALOG_VERSION = `${CATALOG_SEED}:200`;

let catalog: Player[] | null = null;
let byId: Map<string, Player> | null = null;

export function getCatalog(): Player[] {
  catalog ??= generateCatalog({ seed: CATALOG_SEED, size: 200 });
  return catalog;
}

export function cardDef(id: string): Player | undefined {
  byId ??= new Map(getCatalog().map((p) => [p.id, p]));
  return byId.get(id);
}

/** Publieke kaartweergave (geen interne velden). */
export function cardView(instanceId: string, def: Player) {
  return {
    id: instanceId,
    cardDefId: def.id,
    name: def.cardName,
    position: def.position,
    rating: def.rating,
    rarity: def.rarity,
    clubId: def.clubId,
    nation: def.nation,
    stats: def.stats,
  };
}

export function toBattleCard(instanceId: string, def: Player): BattleCard {
  return { id: instanceId, rating: def.rating, stats: { ...def.stats }, position: def.position };
}

/**
 * Startelftal (aanname, zie README): één brons/zilver-kaart per plek van een 4-3-3, met een
 * cryptografische seed die in de audit wordt bewaard. Zelfde seed = zelfde elftal.
 */
export function starterSquad(seed: string): Player[] {
  const rng = createRng(`starter:${seed}`);
  const formation = FORMATIONS['4-3-3'];
  if (!formation) throw new Error('Formatie 4-3-3 ontbreekt in de engine.');
  const pool = getCatalog().filter((p) => !p.temporary && (p.rarity === 'bronze' || p.rarity === 'silver'));
  const taken = new Set<string>();
  return formation.slots.map((slot) => {
    const free = (list: Player[]) => list.filter((p) => !taken.has(p.baseId));
    const exact = free(pool.filter((p) => p.position === slot.position));
    const related = free(pool.filter((p) => RELATED_POSITIONS[slot.position].includes(p.position)));
    const choice = rng.pick(exact.length ? exact : related.length ? related : free(pool));
    taken.add(choice.baseId);
    return choice;
  });
}
