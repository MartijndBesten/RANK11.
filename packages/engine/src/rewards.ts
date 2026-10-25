/**
 * Beloningen-engine. Alle drempels, beloningen en limieten komen uit een versieerbare configuratie
 * (beheer). Een toegekende beloning bewaart altijd de configuratieversie, zodat latere regelwijzigingen
 * bestaande beloningen niet veranderen.
 */
import { gradeKey, type Grade, type GradeScale, DUTCH_SCALE } from './grades.ts';

export type RewardTone = 'support' | 'pass' | 'good' | 'great' | 'elite' | 'legendary';

export interface RewardTier {
  id: string;
  label: string;
  minGrade: number;
  tone: RewardTone;
  xp: number;
  coins: number;
  packId?: string;
  pick?: { options: number; minRating: number };
}

export interface RewardConfig {
  version: string;
  scale: GradeScale;
  /** Hoogste drempel eerst of willekeurig; de engine sorteert zelf. */
  tiers: RewardTier[];
  weight: {
    /** Extra XP per wegingspunt boven 1. */
    xpPerExtraWeight: number;
    /** Vanaf deze weging één tier hoger (maximaal tot de hoogste tier). `null` = uit. */
    tierBumpFromWeight: number | null;
  };
  improvement: { minDelta: number; xp: number; coins: number };
  limits: {
    maxRewardedPerDay: number;
    maxRewardedPerWeek: number;
    /** Niet-geverifieerde (handmatige) cijfers krijgen maximaal deze tier. */
    unverifiedMaxTierId: string | null;
  };
  corrections: 'ignore' | 'topup';
}

export const DEFAULT_REWARD_CONFIG: RewardConfig = {
  version: '2026.10-proto.1',
  scale: DUTCH_SCALE,
  tiers: [
    { id: 'support', label: 'Herstelkans', minGrade: 1, tone: 'support', xp: 15, coins: 0 },
    { id: 'pass', label: 'Voldoende', minGrade: 5.5, tone: 'pass', xp: 50, coins: 150, packId: 'starter' },
    { id: 'good', label: 'Goed', minGrade: 6.5, tone: 'good', xp: 90, coins: 250, packId: 'gold' },
    { id: 'great', label: 'Sterk', minGrade: 7.5, tone: 'great', xp: 140, coins: 400, packId: 'exam' },
    { id: 'elite', label: 'Uitstekend', minGrade: 8.5, tone: 'elite', xp: 200, coins: 600, packId: 'elite' },
    { id: 'legendary', label: 'Legendarisch', minGrade: 9.5, tone: 'legendary', xp: 300, coins: 900, pick: { options: 3, minRating: 90 } },
  ],
  weight: { xpPerExtraWeight: 20, tierBumpFromWeight: null },
  improvement: { minDelta: 0.25, xp: 60, coins: 200 },
  limits: { maxRewardedPerDay: 4, maxRewardedPerWeek: 12, unverifiedMaxTierId: null },
  corrections: 'topup',
};

export type RewardStatus = 'rewarded' | 'support' | 'duplicate' | 'simulated' | 'capped' | 'correction';

export interface RewardBonus {
  label: string;
  xp: number;
  coins: number;
}

export interface RewardResult {
  status: RewardStatus;
  key: string;
  configVersion: string;
  tier: RewardTier | null;
  xp: number;
  coins: number;
  packId?: string;
  pick?: { options: number; minRating: number };
  bonuses: RewardBonus[];
  reason?: string;
}

export interface RewardInput {
  grade: Grade;
  subjectAvgBefore: number | null;
  subjectAvgAfter: number | null;
  rewardedToday: number;
  rewardedThisWeek: number;
  /** Eerder toegekende beloning voor dezelfde toets-sleutel, indien aanwezig. */
  previous?: RewardResult;
}

export function sortedTiers(config: RewardConfig): RewardTier[] {
  return [...config.tiers].sort((a, b) => a.minGrade - b.minGrade);
}

export function tierFor(config: RewardConfig, value: number): RewardTier {
  const tiers = sortedTiers(config);
  let found = tiers[0];
  for (const t of tiers) if (value >= t.minGrade) found = t;
  if (!found) throw new Error('Beloningsconfiguratie zonder tiers.');
  return found;
}

function empty(status: RewardStatus, key: string, config: RewardConfig, reason: string): RewardResult {
  return { status, key, configVersion: config.version, tier: null, xp: 0, coins: 0, bonuses: [], reason };
}

export function computeReward(config: RewardConfig, input: RewardInput): RewardResult {
  const { grade } = input;
  const key = gradeKey(grade);

  if (grade.status === 'simulated') {
    return empty('simulated', key, config, 'Gesimuleerde cijfers leveren nooit beloningen op.');
  }

  const tiers = sortedTiers(config);
  let tier = tierFor(config, grade.value);
  const passed = grade.value >= config.scale.pass;

  if (passed && config.weight.tierBumpFromWeight !== null && grade.weight >= config.weight.tierBumpFromWeight) {
    const idx = tiers.indexOf(tier);
    tier = tiers[Math.min(tiers.length - 1, idx + 1)] ?? tier;
  }
  if (grade.status !== 'verified' && config.limits.unverifiedMaxTierId) {
    const capIdx = tiers.findIndex((t) => t.id === config.limits.unverifiedMaxTierId);
    if (capIdx >= 0 && tiers.indexOf(tier) > capIdx) tier = tiers[capIdx] as RewardTier;
  }

  if (input.previous) {
    const prevTier = input.previous.tier ? tiers.findIndex((t) => t.id === input.previous?.tier?.id) : -1;
    const newIdx = tiers.indexOf(tier);
    if (config.corrections === 'ignore' || newIdx <= prevTier) {
      return empty('duplicate', key, config, 'Deze toets is al beloond.');
    }
    // Correctie naar een hogere tier: alleen het verschil wordt bijgeschreven.
    const prev = input.previous.tier;
    return {
      status: 'correction',
      key,
      configVersion: config.version,
      tier,
      xp: Math.max(0, tier.xp - (prev?.xp ?? 0)),
      coins: Math.max(0, tier.coins - (prev?.coins ?? 0)),
      packId: tier.packId,
      pick: tier.pick,
      bonuses: [],
      reason: 'Cijfer gecorrigeerd: alleen het verschil wordt bijgeschreven.',
    };
  }

  if (input.rewardedToday >= config.limits.maxRewardedPerDay || input.rewardedThisWeek >= config.limits.maxRewardedPerWeek) {
    return empty('capped', key, config, 'Dagelijkse of wekelijkse beloningslimiet bereikt. Het cijfer telt wel mee in je gemiddelde.');
  }

  const bonuses: RewardBonus[] = [];
  if (passed && grade.weight > 1 && config.weight.xpPerExtraWeight > 0) {
    bonuses.push({ label: `Weging ${grade.weight}×`, xp: Math.round((grade.weight - 1) * config.weight.xpPerExtraWeight), coins: 0 });
  }
  if (
    input.subjectAvgBefore !== null &&
    input.subjectAvgAfter !== null &&
    input.subjectAvgAfter - input.subjectAvgBefore >= config.improvement.minDelta
  ) {
    bonuses.push({ label: 'Grote verbetering', xp: config.improvement.xp, coins: config.improvement.coins });
  }

  return {
    status: passed ? 'rewarded' : 'support',
    key,
    configVersion: config.version,
    tier,
    xp: tier.xp + bonuses.reduce((s, b) => s + b.xp, 0),
    coins: tier.coins + bonuses.reduce((s, b) => s + b.coins, 0),
    packId: tier.packId,
    pick: tier.pick,
    bonuses,
    reason: passed ? undefined : 'Geen pack, wel XP en een herstelchallenge.',
  };
}
