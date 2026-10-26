/**
 * Startelftal (V-013): iedere nieuwe speler krijgt een compleet, bruikbaar elftal met reserves.
 * 11 basisspelers passen exact op een 4-3-3, 7 reserves dekken keeper, verdediging, middenveld en aanval.
 * Vooral brons en zilver in een smalle, eerlijke band; hooguit twee lage goudkaarten. Geen tijdelijke,
 * speciale of legendarische kaarten. Deterministisch per seed (de server logt de seed in de audit).
 */
import type { Player, Position } from './catalog.ts';
import { createRng } from './rng.ts';
import { FORMATIONS } from './squad.ts';

export interface StarterOptions {
  /** Ratingband voor brons/zilver. */
  band?: [number, number];
  maxGold?: number;
  maxGoldRating?: number;
}

export interface StarterSquad {
  seed: string;
  starters: { slotId: string; player: Player }[];
  reserves: Player[];
  /** Opstelling in hetzelfde formaat als de app: slotId → kaart-id, reserves als bench0..bench6. */
  lineup: Record<string, string>;
  formationId: '4-3-3';
}

const RESERVE_NEEDS: Position[][] = [['GK'], ['CB'], ['LB', 'RB'], ['CM', 'CDM'], ['CAM', 'CM'], ['LW', 'RW', 'LM', 'RM'], ['ST']];

export function starterSquad(catalog: readonly Player[], seed: string, options: StarterOptions = {}): StarterSquad {
  const { band = [61, 72], maxGold = 2, maxGoldRating = 77 } = options;
  const rng = createRng(`starter:${seed}`);
  const pool = catalog.filter((p) => !p.temporary && (p.rarity === 'bronze' || p.rarity === 'silver' || p.rarity === 'gold') && p.id === p.baseId);
  const used = new Set<string>();
  let gold = 0;

  const choose = (positions: readonly Position[]): Player => {
    const fits = (p: Player, strictPos: boolean) => positions.includes(p.position) || (!strictPos && p.altPositions.some((a) => positions.includes(a)));
    const tiers: ((p: Player) => boolean)[] = [
      (p) => p.rarity !== 'gold' && p.rating >= band[0] && p.rating <= band[1] && fits(p, true),
      (p) => p.rarity !== 'gold' && p.rating >= band[0] - 4 && p.rating <= band[1] + 2 && fits(p, true),
      (p) => p.rarity !== 'gold' && p.rating >= band[0] - 4 && p.rating <= band[1] + 2 && fits(p, false),
      (p) => gold < maxGold && p.rarity === 'gold' && p.rating <= maxGoldRating && fits(p, true),
      (p) => p.rarity !== 'gold' && fits(p, false),
    ];
    for (const ok of tiers) {
      const list = pool.filter((p) => !used.has(p.baseId) && ok(p));
      if (list.length) {
        const pick = rng.pick(list);
        used.add(pick.baseId);
        if (pick.rarity === 'gold') gold++;
        return pick;
      }
    }
    throw new Error(`Geen startspeler voor ${positions.join('/')}`);
  };

  const formation = FORMATIONS['4-3-3']!;
  const starters = formation.slots.map((slot) => ({ slotId: slot.id, player: choose([slot.position]) }));
  const reserves = RESERVE_NEEDS.map((need) => choose(need));
  const lineup: Record<string, string> = {};
  for (const s of starters) lineup[s.slotId] = s.player.id;
  reserves.forEach((p, i) => { lineup[`bench${i}`] = p.id; });
  return { seed, starters, reserves, lineup, formationId: '4-3-3' };
}

/** Alleen de opstelling (handig als de kaarten al bekend zijn). */
export function starterLineup(squad: StarterSquad): Record<string, string> {
  return { ...squad.lineup };
}
