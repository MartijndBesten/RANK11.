/**
 * Spelerscatalogus. De basiscatalogus bestaat uit ECHTE, actieve spelers (zie real-players.generated.ts,
 * gegenereerd uit openbare bronnen — Wikidata + Wikipedia — met een eigen ratingformule; geen EA FC/FIFA,
 * geen spelersfoto's). De stats-subwaarden en zeldzaamheidslagen worden deterministisch uit de rating en
 * positie afgeleid, zodat de spelmechaniek gelijk blijft. RANK11 is niet gelieerd aan spelers/clubs/bonden.
 */
import { createRng, type Rng } from './rng.ts';
import { REAL_PLAYERS, type RealPlayer } from './real-players.generated.ts';

export type Position =
  | 'GK' | 'RB' | 'CB' | 'LB' | 'CDM' | 'CM' | 'CAM' | 'RM' | 'LM' | 'RW' | 'LW' | 'ST';

export const POSITION_LABEL: Record<Position, string> = {
  GK: 'KP', RB: 'RB', CB: 'CV', LB: 'LB', CDM: 'CVM', CM: 'CM', CAM: 'CAM',
  RM: 'RM', LM: 'LM', RW: 'RW', LW: 'LW', ST: 'SP',
};

export const POSITION_NAME: Record<Position, string> = {
  GK: 'Keeper', RB: 'Rechtsback', CB: 'Centrale verdediger', LB: 'Linksback',
  CDM: 'Verdedigende middenvelder', CM: 'Centrale middenvelder', CAM: 'Aanvallende middenvelder',
  RM: 'Rechtermiddenvelder', LM: 'Linkermiddenvelder', RW: 'Rechtsbuiten', LW: 'Linksbuiten', ST: 'Spits',
};

export type StatKey = 'pace' | 'attack' | 'passing' | 'technique' | 'defending' | 'physical';
export const STAT_KEYS: readonly StatKey[] = ['pace', 'attack', 'passing', 'technique', 'defending', 'physical'];
export const STAT_LABEL: Record<StatKey, string> = {
  pace: 'SNE', attack: 'AAN', passing: 'PAS', technique: 'TEC', defending: 'VER', physical: 'FYS',
};
export const STAT_NAME: Record<StatKey, string> = {
  pace: 'Snelheid', attack: 'Aanvallen', passing: 'Passing', technique: 'Techniek', defending: 'Verdedigen', physical: 'Fysiek',
};

export type Rarity =
  | 'bronze' | 'silver' | 'gold' | 'rare_gold' | 'special' | 'exam' | 'season' | 'champion' | 'legend';

/** Volgorde = waarde (hoog is zeldzamer). */
export const RARITY_RANK: Record<Rarity, number> = {
  bronze: 0, silver: 1, gold: 2, rare_gold: 3, season: 4, exam: 5, special: 6, champion: 7, legend: 8,
};

export const RARITY_LABEL: Record<Rarity, string> = {
  bronze: 'Brons', silver: 'Zilver', gold: 'Goud', rare_gold: 'Rare', special: 'Electric',
  exam: 'Toetsweek Special', season: 'Seizoen', champion: 'Kampioen', legend: 'Legendary',
};

export interface RatingScale { min: number; max: number }
export const DEFAULT_RATING_SCALE: RatingScale = { min: 50, max: 99 };

export interface Nation { code: string; name: string }
export const NATIONS: readonly Nation[] = [
  { code: 'NL', name: 'Nederland' }, { code: 'BE', name: 'België' }, { code: 'DE', name: 'Duitsland' },
  { code: 'FR', name: 'Frankrijk' }, { code: 'ES', name: 'Spanje' }, { code: 'PT', name: 'Portugal' },
  { code: 'IT', name: 'Italië' }, { code: 'EN', name: 'Engeland' }, { code: 'BR', name: 'Brazilië' },
  { code: 'AR', name: 'Argentinië' }, { code: 'MA', name: 'Marokko' }, { code: 'SN', name: 'Senegal' },
  { code: 'NG', name: 'Nigeria' }, { code: 'GH', name: 'Ghana' }, { code: 'JP', name: 'Japan' },
  { code: 'DK', name: 'Denemarken' }, { code: 'NO', name: 'Noorwegen' }, { code: 'SE', name: 'Zweden' },
  { code: 'PL', name: 'Polen' }, { code: 'HR', name: 'Kroatië' }, { code: 'TR', name: 'Turkije' },
  { code: 'CO', name: 'Colombia' }, { code: 'UY', name: 'Uruguay' }, { code: 'AT', name: 'Oostenrijk' },
];

export type CrestShape = 'shield' | 'round' | 'hex' | 'diamond' | 'classic';
export type CrestSymbol = 'star' | 'lion' | 'ball' | 'crown' | 'bolt' | 'tower' | 'wing' | 'anchor' | 'none';
export type CrestPattern = 'plain' | 'stripes' | 'halves' | 'sash' | 'chevron' | 'quarters';

export interface Club {
  id: string;
  name: string;
  short: string;
  primary: string;
  secondary: string;
  accent: string;
  shape: CrestShape;
  symbol: CrestSymbol;
  pattern: CrestPattern;
  league: string;
}

export const CLUBS: readonly Club[] = [
  { id: 'hvs', name: 'Havenstad FC', short: 'HVS', primary: '#0f2c6b', secondary: '#f2f4f8', accent: '#e8b33a', shape: 'shield', symbol: 'anchor', pattern: 'stripes', league: 'Lage Landen' },
  { id: 'bri', name: 'Atlético Brisa', short: 'ATB', primary: '#b3122e', secondary: '#ffffff', accent: '#1d3f8f', shape: 'classic', symbol: 'tower', pattern: 'stripes', league: 'Iberia' },
  { id: 'lum', name: 'Sporting Lumen', short: 'SPL', primary: '#0d7a43', secondary: '#ffffff', accent: '#d9b44a', shape: 'round', symbol: 'lion', pattern: 'halves', league: 'Iberia' },
  { id: 'val', name: 'AC Valtero', short: 'ACV', primary: '#121212', secondary: '#c4161c', accent: '#f5f5f5', shape: 'round', symbol: 'star', pattern: 'stripes', league: 'Calcio Nova' },
  { id: 'rhw', name: 'Rheinwald 04', short: 'RW4', primary: '#d10f26', secondary: '#ffffff', accent: '#111111', shape: 'diamond', symbol: 'wing', pattern: 'plain', league: 'Nordliga' },
  { id: 'mar', name: 'Olympique Marais', short: 'OLM', primary: '#1a4fa0', secondary: '#ffffff', accent: '#e23b3b', shape: 'shield', symbol: 'crown', pattern: 'sash', league: 'Ligue Azur' },
  { id: 'kbr', name: 'Kingsbridge Rovers', short: 'KBR', primary: '#6b1d2f', secondary: '#7fb7e6', accent: '#f0d27a', shape: 'classic', symbol: 'lion', pattern: 'quarters', league: 'Albion Premier' },
  { id: 'nvk', name: 'Nordvik IF', short: 'NIF', primary: '#f2c200', secondary: '#101820', accent: '#ffffff', shape: 'hex', symbol: 'bolt', pattern: 'chevron', league: 'Nordliga' },
  { id: 'sal', name: 'CD Sierra Alta', short: 'CSA', primary: '#5b2a86', secondary: '#f4f1e8', accent: '#e0a82e', shape: 'shield', symbol: 'crown', pattern: 'plain', league: 'Iberia' },
  { id: 'uwk', name: 'Union Westerkwartier', short: 'UWK', primary: '#ff6a13', secondary: '#0b1d3a', accent: '#ffffff', shape: 'round', symbol: 'ball', pattern: 'halves', league: 'Lage Landen' },
  { id: 'dyk', name: 'Dynamo Kaskade', short: 'DYK', primary: '#0b5fa5', secondary: '#ffffff', accent: '#9fd3ff', shape: 'diamond', symbol: 'bolt', pattern: 'stripes', league: 'Calcio Nova' },
  { id: 'ast', name: 'Astoria United', short: 'AST', primary: '#1d1d1f', secondary: '#d4af37', accent: '#ffffff', shape: 'hex', symbol: 'star', pattern: 'chevron', league: 'Albion Premier' },
  { id: 'coa', name: 'Real Costa Oro', short: 'RCO', primary: '#f7f7f2', secondary: '#c9a227', accent: '#1f2f6b', shape: 'classic', symbol: 'crown', pattern: 'plain', league: 'Iberia' },
  { id: 'pol', name: 'Polder Vooruit', short: 'PVO', primary: '#0a7d8c', secondary: '#ffffff', accent: '#ffcf33', shape: 'shield', symbol: 'tower', pattern: 'sash', league: 'Lage Landen' },
  { id: 'aur', name: 'FC Aurora', short: 'FCA', primary: '#2a2f8f', secondary: '#ff4f9a', accent: '#ffffff', shape: 'round', symbol: 'star', pattern: 'quarters', league: 'Ligue Azur' },
  { id: 'leg', name: 'RANK11. Legends', short: 'R11', primary: '#0a0a0c', secondary: '#e9d29a', accent: '#ffffff', shape: 'hex', symbol: 'crown', pattern: 'plain', league: 'Legends' },
];

export type SkinTone = 0 | 1 | 2 | 3 | 4 | 5;
export type HairStyle = 'buzz' | 'short' | 'curly' | 'fade' | 'long' | 'bun' | 'bald' | 'afro' | 'mohawk';

export interface Portrait {
  skin: SkinTone;
  hair: HairStyle;
  hairColor: string;
  beard: 0 | 1 | 2;
  /** 0 = smal, 1 = gemiddeld, 2 = breed */
  build: 0 | 1 | 2;
}

export type Stats = Record<StatKey, number>;

/**
 * Portretfoto van een kaart. Bewust los van de speler gedefinieerd, zodat een gelicentieerde foto
 * later alleen deze verwijzing vervangt (bron, licentie en vermelding gaan mee naar de UI en audit).
 */
export type PortraitKind = 'ai-fictional' | 'licensed-photo' | 'commissioned-photo';

export interface PortraitAsset {
  /** Uitgesneden beeld (transparante achtergrond), URL of asset-sleutel. */
  src: string;
  kind: PortraitKind;
  /** Licentie van het beeld, bijv. "Eigen AI-generatie met FLUX.2 [klein] 4B (Apache-2.0)". */
  license: string;
  /** Vermelding/bron die in de app getoond moet worden. */
  credit: string;
  /** Verplichte AI-vermelding bij gegenereerde beelden. */
  aiGenerated: boolean;
  /** Verticale positie van de bovenkant van het hoofd in het beeld (0-1), voor uitsnede op de kaart. */
  headTop?: number;
}

export interface Player {
  id: string;
  /** Catalogus-ID van de onderliggende speler (meerdere kaarten kunnen dezelfde speler zijn). */
  baseId: string;
  firstName: string;
  lastName: string;
  /** Naam zoals op de kaart. */
  cardName: string;
  nation: string;
  clubId: string;
  position: Position;
  altPositions: Position[];
  rating: number;
  rarity: Rarity;
  stats: Stats;
  portrait: Portrait;
  /** Draftkaarten zijn tijdelijk en worden nooit permanent eigendom. */
  temporary?: boolean;
  /** Fotoportret; ontbreekt het, dan toont de UI het parametrische portret. */
  photo?: PortraitAsset;
  /** Leeftijd, stuurt onder meer het portret. */
  age: number;
  /** Echte speler (uit de openbare catalogus). Toont een generiek silhouet i.p.v. een gezicht. */
  real?: boolean;
  /** Echte clubnaam (alleen tekst; geen logo). */
  clubName?: string;
  /** Volledige nationaliteitsnaam. */
  nationName?: string;
  /** 3-letter nationaliteitscode (voor op de kaart). */
  code3?: string;
  /** Dominante vlagkleuren voor het silhouet (geen logo's). */
  flagColors?: readonly [string, string, string];
}

/** Positieprofielen: afwijking per vaardigheid t.o.v. de algemene rating. */
const ARCHETYPES: Record<Position, Stats> = {
  GK: { pace: -18, attack: -40, passing: -12, technique: -14, defending: 4, physical: -6 },
  CB: { pace: -10, attack: -28, passing: -8, technique: -14, defending: 5, physical: 4 },
  RB: { pace: 4, attack: -18, passing: -4, technique: -6, defending: 0, physical: -3 },
  LB: { pace: 4, attack: -18, passing: -4, technique: -6, defending: 0, physical: -3 },
  CDM: { pace: -9, attack: -14, passing: 0, technique: -5, defending: 3, physical: 3 },
  CM: { pace: -5, attack: -6, passing: 4, technique: 1, defending: -8, physical: -3 },
  CAM: { pace: -1, attack: 0, passing: 4, technique: 5, defending: -30, physical: -12 },
  RM: { pace: 4, attack: -4, passing: 0, technique: 2, defending: -22, physical: -10 },
  LM: { pace: 4, attack: -4, passing: 0, technique: 2, defending: -22, physical: -10 },
  RW: { pace: 6, attack: -1, passing: -3, technique: 4, defending: -34, physical: -12 },
  LW: { pace: 6, attack: -1, passing: -3, technique: 4, defending: -34, physical: -12 },
  ST: { pace: 2, attack: 4, passing: -8, technique: 0, defending: -38, physical: 0 },
};

export const RELATED_POSITIONS: Record<Position, Position[]> = {
  GK: [],
  CB: ['CDM'],
  RB: ['RM', 'CB'],
  LB: ['LM', 'CB'],
  CDM: ['CM', 'CB'],
  CM: ['CDM', 'CAM'],
  CAM: ['CM', 'ST'],
  RM: ['RW', 'RB'],
  LM: ['LW', 'LB'],
  RW: ['RM', 'ST'],
  LW: ['LM', 'ST'],
  ST: ['CAM', 'RW', 'LW'],
};

const HAIR: HairStyle[] = ['buzz', 'short', 'short', 'curly', 'fade', 'fade', 'bald', 'afro', 'mohawk', 'bun'];
const HAIR_COLORS = ['#141414', '#2b1d14', '#4a2f1d', '#7a5230', '#b88a4a', '#d9c08c', '#8a2f16'];

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export function rarityForRating(rating: number, rng?: Rng): Rarity {
  if (rating < 65) return 'bronze';
  if (rating < 75) return 'silver';
  if (rating >= 80 && rng && rng.next() < 0.4) return 'rare_gold';
  return 'gold';
}

export function deriveStats(position: Position, rating: number, rng: Rng, scale: RatingScale = DEFAULT_RATING_SCALE): Stats {
  const base = ARCHETYPES[position];
  const stats = {} as Stats;
  for (const key of STAT_KEYS) {
    // Bovenin de schaal comprimeren, anders krijgen topkaarten overal 99.
    const raw = rating + base[key] + rng.int(-4, 3);
    const soft = raw > 90 ? 90 + (raw - 90) * 0.55 : raw;
    stats[key] = clamp(Math.round(soft), 20, scale.max);
  }
  return stats;
}

function makePortrait(rng: Rng, nation: string): Portrait {
  const darkerLikely = ['SN', 'NG', 'GH', 'BR', 'CO'].includes(nation);
  const lighterLikely = ['NO', 'SE', 'DK', 'PL', 'NL', 'DE', 'AT', 'HR', 'EN', 'BE'].includes(nation);
  const skin = (darkerLikely ? rng.int(2, 5) : lighterLikely ? rng.int(0, 3) : rng.int(0, 4)) as SkinTone;
  return {
    skin,
    hair: rng.pick(HAIR),
    hairColor: rng.pick(skin >= 3 ? HAIR_COLORS.slice(0, 3) : HAIR_COLORS),
    beard: rng.int(0, 2) as 0 | 1 | 2,
    build: rng.int(0, 2) as 0 | 1 | 2,
  };
}

export interface CatalogOptions {
  seed?: string;
  size?: number;
  scale?: RatingScale;
  /** Portretten per baseId; wordt op alle kaarten van die speler gezet (ook speciale edities). */
  photos?: Record<string, PortraitAsset>;
  /** Alleen spelers met een fotoportret opnemen (consistente uitstraling zolang niet alle portretten klaar zijn). */
  photosOnly?: boolean;
}

/** Zet een echte-spelerrecord om naar een Player. De stats-subwaarden en zeldzaamheid volgen deterministisch
 * uit rating + positie, zodat de spelmechaniek gelijk blijft. Geen foto; de UI toont een generiek silhouet. */
function realToPlayer(rp: RealPlayer, rng: Rng, scale: RatingScale): Player {
  const position = rp.position as Position;
  // Een stabiele club-id uit de echte clubnaam: zo werkt clubchemie tussen echte clubgenoten (geen logo).
  const clubId = 'rc-' + rp.clubName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return {
    id: rp.id, baseId: rp.id,
    firstName: rp.first, lastName: rp.last, cardName: rp.cardName,
    nation: rp.code3, nationName: rp.nationName, code3: rp.code3, flagColors: rp.flagColors,
    clubId, clubName: rp.clubName, real: true,
    position,
    // Niet iedereen krijgt een tweede positie (variatie, en sommige kaarten zijn positiezuiver).
    altPositions: RELATED_POSITIONS[position].length && rng.next() < 0.6 ? [rng.pick(RELATED_POSITIONS[position])] : [],
    rating: rp.rating, rarity: rarityForRating(rp.rating, rng),
    stats: deriveStats(position, rp.rating, rng, scale),
    portrait: makePortrait(rng, rp.code3), age: rp.age,
  };
}

/** Deterministische catalogus van ECHTE spelers. Vaste id-slots (p0001..) houden bestaande kaarten geldig. */
export function generateCatalog(options: CatalogOptions = {}): Player[] {
  const { seed = 'rank11-catalog-v1', size = 200, scale = DEFAULT_RATING_SCALE, photos = {}, photosOnly = false } = options;
  const rng = createRng(seed);
  const players: Player[] = [];

  // Basiscatalogus: echte, actieve spelers op vaste id-slots (migratieveilig).
  for (const rp of REAL_PLAYERS.slice(0, size)) players.push(realToPlayer(rp, rng, scale));

  // Speciale edities bovenop bestaande toppers (zelfde baseId, hogere rating).
  const promoSources = players.filter((p) => p.rating >= 78).slice(0, 36);
  promoSources.forEach((src, idx) => {
    const rarity: Rarity = idx % 3 === 0 ? 'special' : idx % 3 === 1 ? 'exam' : 'season';
    const boost = rarity === 'special' ? 6 : rarity === 'exam' ? 5 : 4;
    const rating = clamp(src.rating + boost, scale.min, scale.max - 1);
    players.push({ ...src, id: `${src.id}-${rarity}`, rating, rarity, stats: deriveStats(src.position, rating, rng, scale) });
  });

  // Toppers als legend-/featured-editie (eigen id's; worden niet als startkaart uitgedeeld).
  const top = REAL_PLAYERS.slice(0, 9);
  top.slice(0, 8).forEach((rp, i) => {
    const lrng = createRng(`${seed}:L${i}`);
    const rating = clamp(rp.rating + 6, scale.min, scale.max);
    players.push({ ...realToPlayer(rp, lrng, scale), id: `L0${i + 1}`, baseId: `L0${i + 1}`, rarity: 'legend', rating, stats: deriveStats(rp.position as Position, rating, lrng, scale) });
  });
  // Featured 'S01' = de best gerate echte spits (een herkenbare gold-aanvalskaart).
  const f = REAL_PLAYERS.find((p) => p.position === 'ST') ?? top[8];
  if (f) {
    const frng = createRng(`${seed}:S01`);
    const rating = clamp(f.rating + 3, scale.min, scale.max - 1);
    players.push({ ...realToPlayer(f, frng, scale), id: 'S01', baseId: 'S01', rarity: 'gold', rating, stats: deriveStats('ST', rating, frng, scale) });
  }

  const withPhotos = players.map((p) => (photos[p.baseId] ? { ...p, photo: photos[p.baseId] } : p));
  return photosOnly ? withPhotos.filter((p) => p.photo) : withPhotos;
}

export function clubById(id: string): Club {
  return CLUBS.find((c) => c.id === id) ?? (CLUBS[0] as Club);
}

export function nationByCode(code: string): Nation {
  return NATIONS.find((n) => n.code === code) ?? { code, name: code };
}

export function compareCardValue(a: Player, b: Player): number {
  return RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity] || b.rating - a.rating;
}
