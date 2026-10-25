/**
 * Balanssimulaties: duizenden drafts en packs met dezelfde engine als het spel, om kansen,
 * terugval en garanties te controleren voordat een configuratie live gaat (zie docs/REWARD-ECONOMY.md).
 * Deterministisch per seed, zodat een rapport reproduceerbaar is.
 */
import { RARITY_RANK, type Player, type Rarity } from './catalog.ts';
import { createDraft, draftFormation, draftOdds, groupOf, type DraftEventDef, type PityState } from './draft.ts';
import { openPack, oddsTable, isWalkout, type PackDef } from './packs.ts';
import { createRng } from './rng.ts';
import { teamRating, type Lineup } from './squad.ts';
import { computeReward, DEFAULT_REWARD_CONFIG, type RewardConfig } from './rewards.ts';
import type { Grade } from './grades.ts';

const pct = (sorted: number[], p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] ?? 0;

export interface DraftSimReport {
  drafts: number;
  /** Teamrating als de speler steeds de hoogste rating kiest. */
  rating: { mean: number; p10: number; p50: number; p90: number; min: number; max: number };
  /** Aandeel aangeboden kaarten per groep: nominaal (configuratie) en gemeten (na terugval en garantie). */
  offerShare: { groupId: string; nominal: number; observed: number }[];
  /** Kans dat een draft minstens één kaart van deze groep (of beter) bevat. */
  draftsWithGroupOrBetter: Record<string, number>;
  /** Hoe vaak een garantie ingreep, en de langste reeks zonder groep (of beter). */
  pityTriggers: Record<string, number>;
  longestDrought: Record<string, number>;
  rarityShare: Partial<Record<Rarity, number>>;
}

export function simulateDrafts(event: DraftEventDef, catalog: readonly Player[], drafts = 5000, seed = 'sim-draft'): DraftSimReport {
  const rng = createRng(seed);
  const formation = draftFormation({ eventId: event.id, formationId: event.formationId, slots: [], guaranteed: [] });
  const groups = [...event.groups].sort((a, b) => a.rank - b.rank);
  let pity: PityState = {};
  const ratings: number[] = [];
  const offerCount = new Map<string, number>();
  const withGroup = new Map<string, number>();
  const triggers: Record<string, number> = {};
  const drought: Record<string, number> = {};
  const longest: Record<string, number> = {};
  const rarity = new Map<Rarity, number>();
  let totalOffers = 0;

  for (let i = 0; i < drafts; i++) {
    const { session, pity: next } = createDraft(event, catalog, rng, pity);
    pity = next;
    for (const g of session.guaranteed) triggers[g] = (triggers[g] ?? 0) + 1;
    const lineup: Lineup = {};
    let bestRank = 99;
    for (const slot of session.slots) {
      for (const p of slot.offers) {
        const g = groupOf(event, p);
        offerCount.set(g?.id ?? '?', (offerCount.get(g?.id ?? '?') ?? 0) + 1);
        rarity.set(p.rarity, (rarity.get(p.rarity) ?? 0) + 1);
        bestRank = Math.min(bestRank, g?.rank ?? 99);
        totalOffers++;
      }
      lineup[slot.slotId] = [...slot.offers].sort((a, b) => b.rating - a.rating || RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity])[0];
    }
    ratings.push(teamRating(formation, lineup));
    for (const g of groups) {
      if (bestRank <= g.rank) {
        withGroup.set(g.id, (withGroup.get(g.id) ?? 0) + 1);
        drought[g.id] = 0;
      } else {
        drought[g.id] = (drought[g.id] ?? 0) + 1;
        longest[g.id] = Math.max(longest[g.id] ?? 0, drought[g.id]!);
      }
    }
  }
  const sorted = [...ratings].sort((a, b) => a - b);
  const nominal = new Map(draftOdds(event).map((o) => [o.groupId, o.chance]));
  return {
    drafts,
    rating: { mean: ratings.reduce((s, x) => s + x, 0) / drafts, p10: pct(sorted, 0.1), p50: pct(sorted, 0.5), p90: pct(sorted, 0.9), min: sorted[0] ?? 0, max: sorted.at(-1) ?? 0 },
    offerShare: groups.map((g) => ({ groupId: g.id, nominal: nominal.get(g.id) ?? 0, observed: (offerCount.get(g.id) ?? 0) / totalOffers })),
    draftsWithGroupOrBetter: Object.fromEntries(groups.map((g) => [g.id, (withGroup.get(g.id) ?? 0) / drafts])),
    pityTriggers: triggers,
    longestDrought: Object.fromEntries(groups.map((g) => [g.id, longest[g.id] ?? 0])),
    rarityShare: Object.fromEntries([...rarity.entries()].map(([r, n]) => [r, n / totalOffers])),
  };
}

export interface PackSimReport {
  packs: number;
  /** Kans op minstens één kaart per categorie: volgens de getoonde kansentabel en gemeten. */
  bucketShare: { bucketId: string; label: string; nominal: number; observed: number }[];
  meanRating: number;
  walkoutRate: number;
  rarityShare: Partial<Record<Rarity, number>>;
}

export function simulatePacks(def: PackDef, catalog: readonly Player[], packs = 10000, seed = 'sim-pack'): PackSimReport {
  const rng = createRng(seed);
  const counts = new Map<string, number>();
  const rarity = new Map<Rarity, number>();
  let ratingSum = 0;
  let cards = 0;
  let walkouts = 0;
  for (let i = 0; i < packs; i++) {
    const res = openPack(def, catalog, rng);
    if (res.pulls.some((p) => isWalkout(p.card))) walkouts++;
    for (const id of new Set(res.pulls.map((p) => p.bucketId))) counts.set(id, (counts.get(id) ?? 0) + 1);
    res.pulls.forEach((p) => {
      rarity.set(p.card.rarity, (rarity.get(p.card.rarity) ?? 0) + 1);
      ratingSum += p.card.rating;
      cards++;
    });
  }
  const table = oddsTable(def);
  return {
    packs,
    bucketShare: table.map((row) => ({ bucketId: row.bucketId, label: row.label, nominal: row.atLeastOne, observed: (counts.get(row.bucketId) ?? 0) / packs })),
    meanRating: ratingSum / cards,
    walkoutRate: walkouts / packs,
    rarityShare: Object.fromEntries([...rarity.entries()].map(([r, n]) => [r, n / cards])),
  };
}

export interface EconomySimReport {
  weeks: number;
  gradesPerWeek: number;
  perWeek: { xp: number; coins: number; vouchers: number; packs: Record<string, number>; picks: number };
  /** Aandeel cijfers dat door de dag-/weeklimiet geen beloning kreeg. */
  cappedShare: number;
}

/**
 * Wat verdient een leerling gemiddeld per week met de beloningsconfiguratie (kaarteconomie)?
 * Cijfers ~ normaal verdeeld rond `mean` met spreiding `sd`, afgerond op één decimaal en begrensd op 1-10.
 */
export function simulateEconomy(options: { weeks?: number; gradesPerWeek?: number; mean?: number; sd?: number; seed?: string; config?: RewardConfig } = {}): EconomySimReport {
  const { weeks = 2000, gradesPerWeek = 3, mean = 6.8, sd = 1.2, seed = 'sim-eco', config = DEFAULT_REWARD_CONFIG } = options;
  const rng = createRng(seed);
  const normal = () => {
    const u = Math.max(1e-9, rng.next());
    const v = rng.next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  let xp = 0, coins = 0, vouchers = 0, picks = 0, capped = 0, total = 0;
  const packs: Record<string, number> = {};
  for (let w = 0; w < weeks; w++) {
    let thisWeek = 0;
    const perDay = new Map<number, number>();
    for (let i = 0; i < gradesPerWeek; i++) {
      const value = Math.round(Math.max(1, Math.min(10, mean + sd * normal())) * 10) / 10;
      const day = rng.int(0, 4);
      const grade: Grade = { id: `w${w}g${i}`, subjectId: 's', testName: `t${w}-${i}`, value, weight: rng.pick([1, 1, 2, 2, 3]), date: '2026-10-01', status: 'registered', source: 'manual' };
      const r = computeReward(config, { grade, subjectAvgBefore: null, subjectAvgAfter: null, rewardedToday: perDay.get(day) ?? 0, rewardedThisWeek: thisWeek });
      total++;
      if (r.status === 'capped') { capped++; continue; }
      if (r.status === 'rewarded') { thisWeek++; perDay.set(day, (perDay.get(day) ?? 0) + 1); }
      xp += r.xp; coins += r.coins; vouchers += r.vouchers;
      if (r.packId) packs[r.packId] = (packs[r.packId] ?? 0) + 1;
      if (r.pick) picks++;
    }
  }
  return {
    weeks, gradesPerWeek,
    perWeek: { xp: xp / weeks, coins: coins / weeks, vouchers: vouchers / weeks, picks: picks / weeks, packs: Object.fromEntries(Object.entries(packs).map(([k, n]) => [k, n / weeks])) },
    cappedShare: total ? capped / total : 0,
  };
}
