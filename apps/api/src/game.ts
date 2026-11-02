/**
 * Server-side spelgegevens: de catalogus van ECHTE spelers uit de engine, het startelftal en de omzetting
 * van kaartinstanties naar battlekaarten. De catalogus is deterministisch (seed) en gebruikt dezelfde
 * id-slots (p0001..), dus een kaartinstantie verwijst alleen naar `card_def_id` + catalogusversie en
 * bestaande collecties blijven geldig.
 */
import { generateCatalog, starterSquad as engineStarterSquad, type BattleCard, type Player } from './engine.ts';

export const CATALOG_SEED = 'rank11-catalog-v1';
// Versie opgehoogd bij de overgang naar echte spelers (zelfde id-slots; collecties blijven geldig).
export const CATALOG_VERSION = `${CATALOG_SEED}:real-2026-11`;

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
