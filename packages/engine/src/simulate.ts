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
import { weightedAverage, type Grade } from './grades.ts';
import { generateCatalog } from './catalog.ts';
import { PACKS } from './packs.ts';
import { autoBestLineup, FORMATIONS } from './squad.ts';
import type { Goal } from './goals.ts';
import type { Period } from './stats.ts';
import { categoryTotals, DEFAULT_MOTIVATION_CONFIG, gradeXp, type MotivationConfig, type XpEntry } from './motivation.ts';
import { academyReward, type LearningEvent } from './academy.ts';
import { ACHIEVABLE_PROGRESS_CONFIG, ACHIEVABLE_REWARD_CONFIG, progressRewards, type ProgressGrant, type ProgressRewardConfig } from './economy.ts';
import { starterSquad } from './starter.ts';
import { battleState, createBattle, duelValue, playCard, type BattleCard, type BattleEvent, type DuelMode, type Side } from './competition/battle.ts';

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

/* ———————————— Volledig schooljaar per leerlingprofiel (V-011) ———————————— */

export interface StudentProfile {
  id: string;
  label: string;
  /** Gemiddeld cijfer aan het begin en (optioneel) aan het eind van het jaar (lineaire trend). */
  mean: number;
  endMean?: number;
  sd: number;
  gradesPerWeek: number;
  /** Stelt per periode twee persoonlijke doelen voor de zwakste vakken. */
  goals: boolean;
  academyPerWeek: number;
  /** Oefenscore (0-1) aan het begin en groei over het jaar. */
  academySkill: number;
  academyGrowth: number;
  /** Doet actief mee (cijfers, doelen of oefenen); de eerlijkheidsgrens geldt tussen deze profielen. */
  motivated: boolean;
}

export const STUDENT_PROFILES: StudentProfile[] = [
  // Doet mee: stelt doelen en/of oefent in de Academy.
  { id: 'sterk', label: 'Sterk en stabiel (≈8,1)', mean: 8.1, sd: 0.7, gradesPerWeek: 2, goals: true, academyPerWeek: 1, academySkill: 0.85, academyGrowth: 0.05, motivated: true },
  { id: 'goed', label: 'Ruim voldoende (≈7,3)', mean: 7.3, sd: 0.8, gradesPerWeek: 2, goals: true, academyPerWeek: 1, academySkill: 0.75, academyGrowth: 0.05, motivated: true },
  { id: 'gemiddeld', label: 'Gemiddeld (≈6,6)', mean: 6.6, sd: 0.9, gradesPerWeek: 2, goals: true, academyPerWeek: 1, academySkill: 0.65, academyGrowth: 0.1, motivated: true },
  { id: 'netvoldoende', label: 'Net voldoende (≈6,0)', mean: 6.0, sd: 1.0, gradesPerWeek: 2, goals: true, academyPerWeek: 1, academySkill: 0.6, academyGrowth: 0.1, motivated: true },
  { id: 'wisselvallig', label: 'Wisselvallig (≈6,3, van 4 tot 8)', mean: 6.3, sd: 1.5, gradesPerWeek: 2, goals: true, academyPerWeek: 1, academySkill: 0.6, academyGrowth: 0.1, motivated: true },
  { id: 'moeite', label: 'Moeite, wel gemotiveerd (≈5,5)', mean: 5.3, endMean: 5.8, sd: 1.0, gradesPerWeek: 2, goals: true, academyPerWeek: 2, academySkill: 0.5, academyGrowth: 0.25, motivated: true },
  { id: 'stijger', label: 'Stijger (5,5 → 7,0)', mean: 5.5, endMean: 7.0, sd: 0.8, gradesPerWeek: 2, goals: true, academyPerWeek: 2, academySkill: 0.55, academyGrowth: 0.25, motivated: true },
  { id: 'oefenaar', label: 'Oefenaar Academy (≈6,5)', mean: 6.4, endMean: 6.7, sd: 0.9, gradesPerWeek: 2, goals: true, academyPerWeek: 4, academySkill: 0.6, academyGrowth: 0.25, motivated: true },
  // Voert alleen cijfers in: geen doelen, geen Academy.
  { id: 'invoer-hoog', label: 'Alleen invoeren, hoog (≈8,0)', mean: 8.0, sd: 0.8, gradesPerWeek: 2, goals: false, academyPerWeek: 0, academySkill: 0.6, academyGrowth: 0, motivated: false },
  { id: 'invoer-midden', label: 'Alleen invoeren, midden (≈6,5)', mean: 6.5, sd: 0.9, gradesPerWeek: 2, goals: false, academyPerWeek: 0, academySkill: 0.6, academyGrowth: 0, motivated: false },
  { id: 'invoer-laag', label: 'Alleen invoeren, laag (≈5,8)', mean: 5.8, sd: 1.0, gradesPerWeek: 2, goals: false, academyPerWeek: 0, academySkill: 0.6, academyGrowth: 0, motivated: false },
  { id: 'weinig', label: 'Weinig cijfers ingevoerd (≈7,0)', mean: 7.0, sd: 0.9, gradesPerWeek: 1, goals: false, academyPerWeek: 0, academySkill: 0.6, academyGrowth: 0, motivated: false },
];

export interface SchoolYearOptions {
  weeks?: number;
  seeds?: readonly string[];
  rewards?: RewardConfig;
  /** `null` = oude economie zonder voortgangsbeloningen. */
  progress?: ProgressRewardConfig | null;
  motivation?: MotivationConfig;
  catalog?: readonly Player[];
  /** Coins aan het eind van het jaar omzetten in goudpacks (winkelprijs). */
  spendCoins?: boolean;
}

export interface SchoolYearRow {
  profileId: string;
  label: string;
  motivated: boolean;
  gradeAverage: number;
  vouchers: number;
  /** Vouchers uit voortgang (doel, verbetering, herstel, Academy). */
  progressVouchers: number;
  packs: Record<string, number>;
  picks: number;
  coins: number;
  xp: Record<'performance' | 'progress' | 'academy', number>;
  /** Teamrating van het beste 4-3-3-elftal uit startelftal + alle packs (+ coins → goudpacks) aan het eind van het jaar. */
  teamRating: number;
  /** Aantal verschillende spelers met rating 85+ in de collectie aan het eind van het jaar. */
  cards85: number;
  /** Teamrating aan het eind van week 10, 20, 30 en 40 (elftal groeit mee met het jaar). */
  ratingByWeek: Record<number, number>;
  /** Goudpacks plus zwaardere packs (Toetsweek, Elite) per jaar, inclusief packs gekocht met coins. */
  topPacks: number;
  /** Herkomst van Goudpacks en zwaardere packs: cijfer, coins, level, goal, improvement, recovery, academy. */
  topSources: Record<string, number>;
  /** Eindelftallen per seed, voor battles tussen profielen (`matchupWinRate`). */
  teams: BattleCard[][];
}

const SUBJECT_IDS = ['wi', 'ne', 'en', 'fa', 'bi', 'gs', 'na', 'ak'];
const ACADEMY_TOPICS = ['wis-procenten', 'wis-breuken', 'wis-vergelijkingen', 'fa-woordenschat', 'en-irregular-verbs'];
const YEAR_START = Date.parse('2026-08-31T12:00:00Z'); // maandag
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

function yearPeriods(weeks: number): Period[] {
  const per = Math.ceil(weeks / 4);
  return [0, 1, 2, 3].map((i) => ({ id: `p${i + 1}`, name: `Periode ${i + 1}`, start: isoDay(YEAR_START + i * per * 7 * 864e5), end: isoDay(YEAR_START + ((i + 1) * per * 7 - 1) * 864e5) }));
}

function runYear(profile: StudentProfile, seed: string, opts: Required<Omit<SchoolYearOptions, 'seeds' | 'progress'>> & { progress: ProgressRewardConfig | null }) {
  const rng = createRng(`jaar:${profile.id}:${seed}`);
  const normal = () => Math.sqrt(-2 * Math.log(Math.max(1e-9, rng.next()))) * Math.cos(2 * Math.PI * rng.next());
  const periods = yearPeriods(opts.weeks);
  const offset = Object.fromEntries(SUBJECT_IDS.map((s) => [s, normal() * 0.4]));
  const grades: Grade[] = [];
  const goals: Goal[] = [];
  let ledger: XpEntry[] = [];
  let grants: ProgressGrant[] = [];
  let history: LearningEvent[] = [];
  const rewardLog: string[] = [];
  const packs: Record<string, number> = {};
  let coins = 0, vouchers = 0, picks = 0, n = 0, wrongPool = 0;
  // Kaarten komen binnen zodra de pack er is, zodat de teamsterkte per periode te volgen is.
  const cardRng = createRng(`kaarten:${profile.id}:${seed}`);
  const squad = starterSquad(opts.catalog, `${profile.id}:${seed}`);
  const owned: Player[] = [...squad.starters.map((x) => x.player), ...squad.reserves];
  const topSources: Record<string, number> = {};
  const addPack = (id: string | undefined, source: string) => {
    if (!id) return;
    packs[id] = (packs[id] ?? 0) + 1;
    if (id !== 'starter') topSources[source] = (topSources[source] ?? 0) + 1;
    const def = PACKS[id];
    if (def) owned.push(...openPack(def, opts.catalog, cardRng).pulls.map((x) => x.card));
  };
  const goldPrice = PACKS.gold?.coinPrice ?? Infinity;
  const spend = () => { if (opts.spendCoins) while (coins >= goldPrice) { coins -= goldPrice; addPack('gold', 'coins'); } };
  const formation = FORMATIONS['4-3-3']!;
  const ratingByWeek: Record<number, number> = {};
  const progress = (today: string) => {
    if (!opts.progress) return;
    const fresh = progressRewards(opts.progress, { grades, goals, ledger, grants, periods, today });
    grants = [...grants, ...fresh];
    for (const g of fresh) { addPack(g.packId, g.kind); vouchers += g.vouchers; coins += g.coins; }
  };

  for (let w = 0; w < opts.weeks; w++) {
    const t = w / Math.max(1, opts.weeks - 1);
    const mean = profile.mean + ((profile.endMean ?? profile.mean) - profile.mean) * t;
    const period = periods.find((p) => isoDay(YEAR_START + w * 7 * 864e5) >= p.start && isoDay(YEAR_START + w * 7 * 864e5) <= p.end);
    if (profile.goals && period && isoDay(YEAR_START + w * 7 * 864e5) === period.start) {
      const avg = (s: string) => weightedAverage(grades.filter((g) => g.subjectId === s)) ?? mean + (offset[s] as number);
      for (const s of [...SUBJECT_IDS].sort((a, b) => avg(a) - avg(b)).slice(0, 2)) {
        goals.push({ id: `doel-${period.id}-${s}`, scope: 'subject', subjectId: s, target: Math.min(9.5, Math.round((avg(s) + 0.4) * 10) / 10), createdAt: `${period.start}T08:00:00Z` });
      }
    }
    type Ev = { day: number; kind: 'grade' | 'academy' };
    const evs: Ev[] = [
      ...Array.from({ length: profile.gradesPerWeek }, () => ({ day: rng.int(0, 4), kind: 'grade' as const })),
      ...Array.from({ length: profile.academyPerWeek }, () => ({ day: rng.int(0, 6), kind: 'academy' as const })),
    ].sort((a, b) => a.day - b.day);
    for (const ev of evs) {
      const ms = YEAR_START + (w * 7 + ev.day) * 864e5;
      const today = isoDay(ms);
      if (ev.kind === 'grade') {
        const subjectId = rng.pick(SUBJECT_IDS);
        const value = Math.round(Math.max(1, Math.min(10, mean + (offset[subjectId] as number) + profile.sd * normal())) * 10) / 10;
        const grade: Grade = { id: `g${++n}`, subjectId, testName: `t${n}`, value, weight: rng.pick([1, 1, 2, 2, 3]), date: today, status: 'registered', source: 'manual' };
        const subj = grades.filter((g) => g.subjectId === subjectId);
        const before = weightedAverage(subj);
        const after = weightedAverage([...subj, grade]);
        const weekKey = isoDay(YEAR_START + w * 7 * 864e5);
        const r = computeReward(opts.rewards, {
          grade, subjectAvgBefore: before, subjectAvgAfter: after,
          rewardedToday: rewardLog.filter((d) => d === today).length,
          rewardedThisWeek: rewardLog.filter((d) => d >= weekKey && d <= isoDay(YEAR_START + (w * 7 + 6) * 864e5)).length,
        });
        if (r.status === 'rewarded') rewardLog.push(today);
        coins += r.coins; vouchers += r.vouchers; addPack(r.packId, 'cijfer'); if (r.pick) picks++;
        const fresh = gradeXp(opts.motivation, { grade, before: grades, goals, ledger, enteredOn: today });
        ledger = [...ledger, ...fresh];
        for (const e of fresh) if (e.packId) addPack(e.packId, 'goal'); // doelpack uit de motivatie-engine
        grades.push(grade);
        progress(today);
        spend();
      } else {
        const score = Math.max(0.1, Math.min(1, profile.academySkill + profile.academyGrowth * t + normal() * 0.12));
        const correct = Math.round(score * 6);
        const fixed = Math.min(wrongPool, rng.int(0, 2));
        wrongPool = wrongPool - fixed + (6 - correct);
        const event: LearningEvent = {
          schemaVersion: 1, eventId: `a${++n}`, providerId: 'rank-oefen', externalUserId: 'u', activityId: rng.pick(ACADEMY_TOPICS), subjectId: 'x', topic: 'x',
          activityType: 'practice', startedAt: new Date(ms + 15 * 3.6e6).toISOString(), completedAt: new Date(ms + 15.2 * 3.6e6).toISOString(),
          questionCount: 6, correctCount: correct, mistakesFixed: fixed, status: 'completed', contentKey: `ck-${n}`,
        };
        const d = academyReward(opts.motivation, event, { enabled: true, playerId: 'p', history, ledger });
        ledger = [...ledger, ...d.entries];
        if (['rewarded', 'capped', 'no-learning-value'].includes(d.status)) history = [...history, event];
        progress(today);
        spend();
      }
    }
    if ((w + 1) % 10 === 0) ratingByWeek[w + 1] = teamRating(formation, autoBestLineup(formation, owned));
  }
  for (let i = 0; i < picks; i++) {
    const options = cardRng.shuffle(opts.catalog.filter((p) => p.rating >= 90 && !p.temporary)).slice(0, 3);
    const best = [...options].sort((a, b) => b.rating - a.rating)[0];
    if (best) owned.push(best);
  }
  const lineup = autoBestLineup(formation, owned);
  const team = Object.values(lineup).filter((p): p is Player => !!p).map((p, i): BattleCard => ({ id: `${profile.id}:${seed}:${i}`, rating: p.rating, stats: p.stats, position: p.position }));
  return {
    gradeAverage: grades.reduce((s, g) => s + g.value, 0) / Math.max(1, grades.length),
    vouchers, progressVouchers: grants.reduce((s, g) => s + g.vouchers, 0), packs, picks, coins,
    xp: categoryTotals(ledger), teamRating: teamRating(formation, lineup),
    cards85: new Set(owned.filter((p) => p.rating >= 85).map((p) => p.baseId)).size,
    ratingByWeek, team, topSources,
    topPacks: (packs.gold ?? 0) + (packs.exam ?? 0) + (packs.elite ?? 0),
  };
}

/** Simuleert een volledig schooljaar per profiel en middelt over de seeds. */
export function simulateSchoolYear(profiles: readonly StudentProfile[] = STUDENT_PROFILES, options: SchoolYearOptions = {}): SchoolYearRow[] {
  const opts = {
    weeks: options.weeks ?? 40,
    rewards: options.rewards ?? ACHIEVABLE_REWARD_CONFIG,
    progress: options.progress === undefined ? ACHIEVABLE_PROGRESS_CONFIG : options.progress,
    motivation: options.motivation ?? DEFAULT_MOTIVATION_CONFIG,
    catalog: options.catalog ?? generateCatalog(),
    spendCoins: options.spendCoins ?? true,
  };
  const seeds = options.seeds ?? ['a', 'b', 'c'];
  return profiles.map((profile) => {
    const runs = seeds.map((s) => runYear(profile, s, opts));
    const avg = (f: (r: (typeof runs)[number]) => number) => runs.reduce((s, r) => s + f(r), 0) / runs.length;
    const packIds = [...new Set(runs.flatMap((r) => Object.keys(r.packs)))];
    return {
      profileId: profile.id, label: profile.label, motivated: profile.motivated,
      gradeAverage: avg((r) => r.gradeAverage), vouchers: avg((r) => r.vouchers), progressVouchers: avg((r) => r.progressVouchers),
      packs: Object.fromEntries(packIds.map((id) => [id, avg((r) => r.packs[id] ?? 0)])),
      picks: avg((r) => r.picks), coins: avg((r) => r.coins),
      xp: { performance: avg((r) => r.xp.performance), progress: avg((r) => r.xp.progress), academy: avg((r) => r.xp.academy) },
      teamRating: avg((r) => r.teamRating), cards85: avg((r) => r.cards85),
      ratingByWeek: Object.fromEntries(Object.keys(runs[0]?.ratingByWeek ?? {}).map((k) => [Number(k), avg((r) => r.ratingByWeek[Number(k)] ?? 0)])),
      topPacks: avg((r) => r.topPacks),
      topSources: Object.fromEntries([...new Set(runs.flatMap((r) => Object.keys(r.topSources)))].map((k) => [k, avg((r) => r.topSources[k] ?? 0)])),
      teams: runs.map((r) => r.team),
    };
  });
}

/* ———————————— Battles tussen profielen ———————————— */

const MATCH_MODES: DuelMode[] = ['rating', 'pace', 'technique', 'defending'];

/** Eenvoudige computerzet met een beetje toeval (aanvallen met een van de sterkste kaarten, zuinig verdedigen). */
function simMove(events: readonly BattleEvent[], side: Side, rng: ReturnType<typeof createRng>): string {
  const st = battleState(events);
  const created = events[0] as Extract<BattleEvent, { type: 'created' }>;
  const mine = (side === 'home' ? created.home : created.away).cards.filter((c) => st.available[side].includes(c.id));
  const mode = st.currentMode ?? 'rating';
  const val = (c: BattleCard) => duelValue(c, mode, st.config);
  const sorted = [...mine].sort((a, b) => val(a) - val(b));
  if (st.phase === 'attack') return (sorted[Math.max(0, sorted.length - 1 - rng.int(0, 2))] ?? sorted[0]!).id;
  const open = st.openCard ? (side === 'home' ? created.away : created.home).cards.find((c) => c.id === st.openCard!.cardId) : undefined;
  const need = open ? val(open) : 0;
  return (sorted.find((c) => val(c) > need) ?? sorted[0]!).id;
}

/** Winkans (winst = 1, gelijk = 0,5) van elftallen A tegen elftallen B over `games` wedstrijden met wisselende duelmodi. */
export function matchupWinRate(teamsA: readonly BattleCard[][], teamsB: readonly BattleCard[][], games = 120, seed = 'matchup', formMax = 0): number {
  const rng = createRng(seed);
  let points = 0;
  for (let g = 0; g < games; g++) {
    const a = teamsA[g % teamsA.length]!, b = teamsB[(g + 1) % teamsB.length]!;
    const offset = g % MATCH_MODES.length;
    const homeIsA = g % 2 === 0;
    const tag = (cards: readonly BattleCard[], p: string) => cards.map((c) => ({ ...c, id: `${p}:${c.id}` }));
    let log: BattleEvent[] = [createBattle({
      matchId: `m${g}`, seed: `${seed}:${g}`, at: 0,
      home: { playerId: 'A', cards: tag(homeIsA ? a : b, 'h') }, away: { playerId: 'B', cards: tag(homeIsA ? b : a, 'a') },
      config: { roundModes: Array.from({ length: 11 }, (_, i) => MATCH_MODES[(i + offset) % MATCH_MODES.length]!), maxConsecutiveTimeouts: null, formMax },
    })];
    for (let t = 1; t < 60; t++) {
      const st = battleState(log);
      if (st.status === 'finished' || !st.toMove) break;
      log = [...log, playCard(log, { side: st.toMove, cardId: simMove(log, st.toMove, rng), at: t * 1000 })];
    }
    const sc = battleState(log).score;
    const mineScore = homeIsA ? sc.home : sc.away, theirs = homeIsA ? sc.away : sc.home;
    points += mineScore > theirs ? 1 : mineScore === theirs ? 0.5 : 0;
  }
  return points / games;
}
