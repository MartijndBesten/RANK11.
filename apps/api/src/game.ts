/**
 * Server-side spelgegevens: de (fictieve) catalogus uit de engine, het startelftal en de omzetting
 * van kaartinstanties naar battlekaarten. De catalogus is deterministisch (seed), dus een
 * kaartinstantie verwijst alleen naar `card_def_id` + catalogusversie.
 */
import { generateCatalog, starterSquad as engineStarterSquad, type BattleCard, type Player } from './engine.ts';

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
 * Startelftal (V-013): 11 basisspelers op een 4-3-3 (in formatievolgorde) plus 7 reserves, uit de engine.
 * Cryptografische seed in de audit; zelfde seed = zelfde selectie.
 */
export function starterSquad(seed: string): Player[] {
  const squad = engineStarterSquad(getCatalog(), `starter:${seed}`);
  return [...squad.starters.map((s) => s.player), ...squad.reserves];
}
