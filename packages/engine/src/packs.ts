/**
 * Packs: transparante kansen per kaartplek, deterministisch te reproduceren met een seed.
 * Geen betaalde packs: packs komen alleen uit cijferbeloningen, events en coins die in het spel zijn verdiend.
 */
import { compareCardValue, isPackable, RARITY_RANK, type Player, type Rarity } from './catalog.ts';
import type { Rng } from './rng.ts';

export interface OddsBucket {
  id: string;
  label: string;
  /** Relatief gewicht binnen de kaartplek. */
  weight: number;
  rarities: Rarity[];
  minRating?: number;
  maxRating?: number;
}

export interface PackSlot {
  label?: string;
  buckets: OddsBucket[];
}

export type PackTheme = 'bronze' | 'silver' | 'silverplus' | 'gold' | 'rare' | 'exam' | 'legend';

export interface PackDef {
  id: string;
  name: string;
  tagline: string;
  theme: PackTheme;
  slots: PackSlot[];
  /** Waarde in coins als de pack in de winkel wordt aangeboden (alleen spelvaluta). */
  coinPrice?: number;
}

// Ronde 15: 85+ en edities iets zeldzamer in de gewone plekken; de inzet-route (Inzetpack) garandeert 85+.
const GOLD_BASE: OddsBucket[] = [
  { id: 'g75', label: 'Goud 75-79', weight: 72, rarities: ['gold'], minRating: 75, maxRating: 79 },
  { id: 'g80', label: 'Goud 80-84', weight: 24, rarities: ['gold', 'rare_gold'], minRating: 80, maxRating: 84 },
  { id: 'g85', label: 'Goud 85+', weight: 3.5, rarities: ['gold', 'rare_gold'], minRating: 85 },
  { id: 'spc', label: 'Speciale kaart', weight: 0.5, rarities: ['special', 'season', 'exam'] },
];

export const PACKS: Record<string, PackDef> = {
  starter: {
    id: 'starter',
    name: 'Bronspack',
    tagline: '3 spelers · brons en zilver, kans op goud',
    theme: 'bronze',
    coinPrice: 750,
    slots: Array.from({ length: 3 }, (_, i): PackSlot => ({
      label: `Kaart ${i + 1}`,
      buckets: [
        // Ronde 15: echte catalogus heeft weinig bronzen spelers; minder brons voorkomt eindeloze dubbelen.
        { id: 'b', label: 'Brons', weight: 35, rarities: ['bronze'] },
        { id: 's', label: 'Zilver', weight: 59, rarities: ['silver'] },
        { id: 'g', label: 'Goud', weight: 6, rarities: ['gold'] },
      ],
    })),
  },
  silver: {
    id: 'silver',
    name: 'Zilverpack',
    tagline: '3 spelers · zilver met goede kans op goud',
    theme: 'silver',
    coinPrice: 1800,
    slots: Array.from({ length: 3 }, (_, i): PackSlot => ({
      label: `Kaart ${i + 1}`,
      buckets: [
        { id: 's', label: 'Zilver', weight: 62, rarities: ['silver'] },
        { id: 'g', label: 'Goud', weight: 32, rarities: ['gold'] },
        { id: 'gh', label: 'Goud 82+', weight: 6, rarities: ['gold', 'rare_gold'], minRating: 82 },
      ],
    })),
  },
  silver_plus: {
    id: 'silver_plus',
    name: 'Verbeterd Zilverpack',
    tagline: '3 spelers · zilver+ · grote kans op goud, laatste kaart minstens goud',
    theme: 'silverplus',
    coinPrice: 2600,
    slots: [
      ...Array.from({ length: 2 }, (_, i): PackSlot => ({
        label: `Kaart ${i + 1}`,
        buckets: [
          { id: 's', label: 'Zilver', weight: 52, rarities: ['silver'] },
          { id: 'g', label: 'Goud', weight: 40, rarities: ['gold'] },
          { id: 'gh', label: 'Goud 82+', weight: 8, rarities: ['gold', 'rare_gold'], minRating: 82 },
        ],
      })),
      {
        label: 'Topkaart',
        buckets: [
          { id: 'g', label: 'Goud', weight: 84, rarities: ['gold'] },
          { id: 'gh', label: 'Goud 82+', weight: 16, rarities: ['gold', 'rare_gold'], minRating: 82 },
        ],
      },
    ],
  },
  gold: {
    id: 'gold',
    name: 'Goudpack',
    tagline: '5 gouden spelers · 1× 80+ gegarandeerd',
    theme: 'gold',
    coinPrice: 5000,
    slots: [
      ...Array.from({ length: 4 }, (_, i): PackSlot => ({ label: `Kaart ${i + 1}`, buckets: GOLD_BASE })),
      {
        label: 'Topkaart',
        buckets: [
          { id: 'g80', label: 'Goud 80-84', weight: 88, rarities: ['gold', 'rare_gold'], minRating: 80, maxRating: 84 },
          { id: 'g85', label: 'Goud 85+', weight: 10, rarities: ['gold', 'rare_gold'], minRating: 85 },
          { id: 'spc', label: 'Speciale kaart', weight: 2, rarities: ['special', 'season', 'exam'] },
        ],
      },
    ],
  },
  effort: {
    id: 'effort',
    name: 'Inzetpack',
    tagline: '3 spelers · voor inzet, oefenen en herstel · 1× 85+ gegarandeerd',
    theme: 'rare',
    slots: [
      ...Array.from({ length: 2 }, (_, i): PackSlot => ({
        label: `Kaart ${i + 1}`,
        buckets: [{ id: 'g80', label: 'Goud 80-84', weight: 1, rarities: ['gold', 'rare_gold'], minRating: 80, maxRating: 84 }],
      })),
      {
        label: 'Topspeler',
        buckets: [
          { id: 'g85', label: 'Goud 85+', weight: 92, rarities: ['gold', 'rare_gold'], minRating: 85 },
          { id: 'spc', label: 'Speciale kaart', weight: 8, rarities: ['special', 'season', 'exam'] },
        ],
      },
    ],
  },
  exam: {
    id: 'exam',
    name: 'Toetsweekpack',
    tagline: '5 spelers · kans op Toetsweek-editie en Legend',
    theme: 'exam',
    slots: [
      ...Array.from({ length: 4 }, (_, i): PackSlot => ({ label: `Kaart ${i + 1}`, buckets: GOLD_BASE })),
      {
        label: 'Toetsweekkaart',
        buckets: [
          { id: 'r84', label: 'Rare of goud 84+', weight: 70, rarities: ['rare_gold', 'gold'], minRating: 84 },
          { id: 'exm', label: 'Toetsweek-editie', weight: 20, rarities: ['exam'] },
          { id: 'spc', label: 'Electric', weight: 8, rarities: ['special'] },
          { id: 'leg', label: 'Legendary', weight: 2, rarities: ['legend'] },
        ],
      },
    ],
  },
  elite: {
    id: 'elite',
    name: 'Elitepack',
    tagline: '3 spelers · allemaal 85+ · Legend-kans 6%',
    theme: 'legend',
    slots: [
      ...Array.from({ length: 2 }, (_, i): PackSlot => ({
        label: `Kaart ${i + 1}`,
        buckets: [
          { id: 'g85', label: 'Goud 85+', weight: 80, rarities: ['gold', 'rare_gold'], minRating: 85 },
          { id: 'spc', label: 'Speciale kaart 85+', weight: 20, rarities: ['special', 'season', 'exam'], minRating: 85 },
        ],
      })),
      {
        label: 'Elitekaart',
        buckets: [
          { id: 'spc', label: 'Speciale kaart 88+', weight: 74, rarities: ['special', 'season', 'exam'], minRating: 88 },
          { id: 'cmp', label: 'Topper 90+', weight: 20, rarities: ['gold', 'rare_gold', 'special'], minRating: 90 },
          { id: 'leg', label: 'Legendary', weight: 6, rarities: ['legend'] },
        ],
      },
    ],
  },
};

export function bucketCandidates(bucket: OddsBucket, catalog: readonly Player[]): Player[] {
  return catalog.filter(
    (p) =>
      isPackable(p) &&
      bucket.rarities.includes(p.rarity) &&
      (bucket.minRating === undefined || p.rating >= bucket.minRating) &&
      (bucket.maxRating === undefined || p.rating <= bucket.maxRating),
  );
}

export interface PackPull {
  card: Player;
  slot: number;
  bucketId: string;
}

export interface PackResult {
  packId: string;
  pulls: PackPull[];
  /** Kaarten gesorteerd op onthulvolgorde: beste kaart als laatste (walkout). */
  revealOrder: Player[];
  best: Player;
}

export class PackConfigError extends Error {}

/** Valideert dat iedere kaartplek kandidaten heeft; gebruikt door beheer vóór publicatie van een pack. */
export function validatePack(def: PackDef, catalog: readonly Player[]): string[] {
  const problems: string[] = [];
  def.slots.forEach((slot, i) => {
    const total = slot.buckets.reduce((s, b) => s + b.weight, 0);
    if (total <= 0) problems.push(`Plek ${i + 1}: geen positief gewicht.`);
    for (const b of slot.buckets) {
      if (b.weight > 0 && bucketCandidates(b, catalog).length === 0) {
        problems.push(`Plek ${i + 1}, ${b.label}: geen spelers in de catalogus.`);
      }
    }
  });
  return problems;
}

export function openPack(def: PackDef, catalog: readonly Player[], rng: Rng): PackResult {
  const problems = validatePack(def, catalog);
  if (problems.length) throw new PackConfigError(problems.join(' '));
  const taken = new Set<string>();
  const pulls: PackPull[] = def.slots.map((slot, i) => {
    const bucket = rng.weighted(slot.buckets, (b) => b.weight);
    // Geen dubbele speler (baseId) in één pack.
    const pool = bucketCandidates(bucket, catalog).filter((p) => !taken.has(p.baseId));
    const card = rng.pick(pool.length ? pool : bucketCandidates(bucket, catalog));
    taken.add(card.baseId);
    return { card, slot: i, bucketId: bucket.id };
  });
  const revealOrder = pulls.map((p) => p.card).sort((a, b) => -compareCardValue(a, b));
  return { packId: def.id, pulls, revealOrder, best: revealOrder[revealOrder.length - 1] as Player };
}

export interface OddsRow {
  bucketId: string;
  label: string;
  /** Kans per kaartplek waar deze categorie voorkomt (0-1). */
  perSlot: number[];
  /** Kans op minstens één kaart uit deze categorie in de hele pack. */
  atLeastOne: number;
}

/** Transparante kansentabel zoals die in de app getoond wordt. */
export function oddsTable(def: PackDef): OddsRow[] {
  const rows = new Map<string, OddsRow>();
  def.slots.forEach((slot, i) => {
    const total = slot.buckets.reduce((s, b) => s + b.weight, 0);
    for (const b of slot.buckets) {
      const row = rows.get(b.id) ?? { bucketId: b.id, label: b.label, perSlot: def.slots.map(() => 0), atLeastOne: 0 };
      row.perSlot[i] = b.weight / total;
      rows.set(b.id, row);
    }
  });
  for (const row of rows.values()) {
    row.atLeastOne = 1 - row.perSlot.reduce((miss, p) => miss * (1 - p), 1);
  }
  return [...rows.values()];
}

export function isWalkout(card: Player): boolean {
  return RARITY_RANK[card.rarity] >= RARITY_RANK.rare_gold || card.rating >= 85;
}
