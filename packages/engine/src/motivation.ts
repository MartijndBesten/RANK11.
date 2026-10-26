/**
 * Motivatie-engine: drie gescheiden XP-soorten, elk afzonderlijk berekend en begrensd.
 *  - Performance XP: voor behaalde schoolcijfers.
 *  - Progress XP:    voor persoonlijke verbetering, herstel na een onvoldoende en bereikte doelen.
 *  - Academy XP:     voor afgeronde leeractiviteiten (zie academy.ts).
 * Uitgangspunten (zie docs/MOTIVATION-ENGINE.md en docs/onderzoek/VERGELIJKBARE-APPS.md):
 *  - verbetering en oefenen lonen, niet alleen hoge cijfers;
 *  - geen streaks of loginbeloningen; plafonds per dag en week tegen farmen;
 *  - iedere toekenning heeft een idempotente sleutel en de configuratieversie;
 *  - een verwijderd cijfer verliest zijn XP; dezelfde toets opnieuw invoeren levert niets op.
 */
import { DUTCH_SCALE, gradeKey, weightedAverage, type Grade } from './grades.ts';
import { goalReachedBy, upcomingFor, type Goal, type UpcomingTest } from './goals.ts';
import { chronological, requiredForTarget } from './stats.ts';
import { sortedTiers, type RewardConfig } from './rewards.ts';

export type XpCategory = 'performance' | 'progress' | 'academy';

export interface MotivationConfig {
  version: string;
  performance: { perGrade: number; bonuses: { minGrade: number; xp: number }[]; dailyCap: number; weeklyCap: number };
  progress: {
    improvementXp: number;
    improvementMinDelta: number;
    recoveryXp: number;
    recoveryMinJump: number;
    goalXp: number;
    goalPackId: string;
    weeklyCap: number;
  };
  academy: {
    completeXp: number;
    /** Minimale score (0-1) voor afrondings-XP; gokken of wegklikken levert dan niets op. */
    completeMinScore: number;
    highScoreXp: number;
    highScoreMin: number;
    mistakeFixedXp: number;
    mistakeFixedMaxPerActivity: number;
    improvedScoreXp: number;
    improvedScoreMinDelta: number;
    /** Minimale seconden per vraag; 0 = geen tijdregel (standaard sinds V-016). */
    minSecondsPerQuestion: number;
    repeatCooldownHours: number;
    dailyCap: number;
    weeklyCap: number;
  };
  levels: { base: number; growth: number };
}

export const DEFAULT_MOTIVATION_CONFIG: MotivationConfig = {
  version: '2026.10-motivatie.3',
  performance: { perGrade: 50, bonuses: [{ minGrade: 7, xp: 30 }, { minGrade: 8, xp: 60 }, { minGrade: 9, xp: 100 }], dailyCap: 450, weeklyCap: 1500 },
  progress: { improvementXp: 40, improvementMinDelta: 0.2, recoveryXp: 80, recoveryMinJump: 1.5, goalXp: 100, goalPackId: 'gold', weeklyCap: 700 },
  academy: {
    completeXp: 20, completeMinScore: 0.5, highScoreXp: 30, highScoreMin: 0.8, mistakeFixedXp: 25, mistakeFixedMaxPerActivity: 4,
    improvedScoreXp: 15, improvedScoreMinDelta: 0.1, minSecondsPerQuestion: 0, repeatCooldownHours: 20, dailyCap: 150, weeklyCap: 600,
  },
  levels: { base: 250, growth: 1.18 },
};

export interface XpEntry {
  /** Idempotente sleutel: dezelfde sleutel wordt nooit twee keer toegekend. */
  key: string;
  category: XpCategory;
  xp: number;
  label: string;
  /** Datum (JJJJ-MM-DD) waarop de XP telt voor dag- en weekplafonds. */
  date: string;
  source: { kind: 'grade' | 'goal' | 'academy' | 'correction' | 'deletion'; id: string };
  configVersion: string;
  /** Hoeveel XP door een plafond niet is toegekend. */
  cappedBy?: number;
  /** Pack dat bij deze toekenning hoort (bijv. doel bereikt). */
  packId?: string;
}

/** Maandag van de ISO-week van een datum (JJJJ-MM-DD). */
export function weekStart(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

export function categoryTotals(ledger: readonly XpEntry[]): Record<XpCategory, number> {
  const t: Record<XpCategory, number> = { performance: 0, progress: 0, academy: 0 };
  for (const e of ledger) t[e.category] += e.xp;
  return t;
}

function caps(config: MotivationConfig, c: XpCategory): { day: number; week: number } {
  if (c === 'performance') return { day: config.performance.dailyCap, week: config.performance.weeklyCap };
  if (c === 'progress') return { day: Infinity, week: config.progress.weeklyCap };
  return { day: config.academy.dailyCap, week: config.academy.weeklyCap };
}

/** Past dag- en weekplafonds toe; negatieve correcties gaan altijd door. */
export function applyCaps(config: MotivationConfig, ledger: readonly XpEntry[], entries: readonly XpEntry[]): XpEntry[] {
  const out: XpEntry[] = [];
  const all = [...ledger];
  for (const e of entries) {
    if (all.some((x) => x.key === e.key)) continue; // idempotent
    if (e.xp <= 0) { out.push(e); all.push(e); continue; }
    const { day, week } = caps(config, e.category);
    const used = (pred: (x: XpEntry) => boolean) => all.filter((x) => x.category === e.category && x.xp > 0 && pred(x)).reduce((s, x) => s + x.xp, 0);
    const room = Math.max(0, Math.min(day - used((x) => x.date === e.date), week - used((x) => weekStart(x.date) === weekStart(e.date))));
    const xp = Math.min(e.xp, room);
    const entry = xp < e.xp ? { ...e, xp, cappedBy: e.xp - xp } : e;
    out.push(entry);
    all.push(entry);
  }
  return out;
}

export interface GradeXpInput {
  grade: Grade;
  /** Alle echte cijfers zoals ze waren vóór dit cijfer werd ingevoerd. */
  before: readonly Grade[];
  goals: readonly Goal[];
  ledger: readonly XpEntry[];
  /** Datum waarop het cijfer is ingevoerd (telt voor de plafonds). */
  enteredOn: string;
}

export function performanceXpFor(config: MotivationConfig, value: number): number {
  const bonus = [...config.performance.bonuses].sort((a, b) => b.minGrade - a.minGrade).find((b) => value >= b.minGrade)?.xp ?? 0;
  return config.performance.perGrade + bonus;
}

/** XP-toekenningen voor een nieuw ingevoerd cijfer (na plafonds en ontdubbelen). */
export function gradeXp(config: MotivationConfig, input: GradeXpInput): XpEntry[] {
  const { grade, before, goals, ledger, enteredOn } = input;
  if (grade.status === 'simulated') return [];
  const key = gradeKey(grade);
  const base = { date: enteredOn, configVersion: config.version };
  const entries: XpEntry[] = [];
  // Dezelfde toets eerder ingevoerd (ook als die daarna is verwijderd): geen nieuwe XP.
  if (ledger.some((e) => e.key === `perf:${key}`)) return [];

  entries.push({ ...base, key: `perf:${key}`, category: 'performance', xp: performanceXpFor(config, grade.value), label: `Cijfer ${grade.value.toFixed(1).replace('.', ',')}`, source: { kind: 'grade', id: grade.id } });

  const subjectBefore = before.filter((g) => g.subjectId === grade.subjectId);
  const avgBefore = weightedAverage(subjectBefore);
  const avgAfter = weightedAverage([...subjectBefore, grade]);
  if (avgBefore !== null && avgAfter !== null && avgAfter - avgBefore >= config.progress.improvementMinDelta) {
    entries.push({ ...base, key: `prog-impr:${key}`, category: 'progress', xp: config.progress.improvementXp, label: 'Gemiddelde omhoog', source: { kind: 'grade', id: grade.id } });
  }
  const lastBefore = chronological(subjectBefore).at(-1);
  if (lastBefore && lastBefore.value < DUTCH_SCALE.pass && grade.value >= DUTCH_SCALE.pass && grade.value - lastBefore.value >= config.progress.recoveryMinJump) {
    entries.push({ ...base, key: `prog-herstel:${key}`, category: 'progress', xp: config.progress.recoveryXp, label: 'Herstel na onvoldoende', source: { kind: 'grade', id: grade.id } });
  }
  for (const goal of goals) {
    if (goalReachedBy([...before, grade], goal)?.id === grade.id) {
      entries.push({ ...base, key: `doel:${goal.id}`, category: 'progress', xp: config.progress.goalXp, label: 'Persoonlijk doel bereikt', source: { kind: 'goal', id: goal.id }, packId: config.progress.goalPackId });
    }
  }
  return applyCaps(config, ledger, entries);
}

/** Correctie van een cijfer: alleen een hoger Performance-bedrag wordt bijgeschreven (verschil). */
export function correctionXp(config: MotivationConfig, ledger: readonly XpEntry[], oldGrade: Grade, newGrade: Grade, on: string): XpEntry[] {
  const key = gradeKey(oldGrade);
  const granted = ledger.filter((e) => e.category === 'performance' && (e.key === `perf:${key}` || e.key.startsWith(`perf-corr:${key}:`))).reduce((s, e) => s + e.xp, 0);
  const diff = performanceXpFor(config, newGrade.value) - granted;
  if (diff <= 0 || !ledger.some((e) => e.key === `perf:${key}`)) return [];
  return applyCaps(config, ledger, [{ key: `perf-corr:${key}:${newGrade.value}`, category: 'performance', xp: diff, label: 'Cijfer gecorrigeerd', date: on, source: { kind: 'correction', id: newGrade.id }, configVersion: config.version }]);
}

/** Verwijderen: alle XP die aan dit cijfer hing wordt teruggedraaid (packs blijven, doelen niet). */
export function deletionXp(config: MotivationConfig, ledger: readonly XpEntry[], grade: Grade, on: string): XpEntry[] {
  const key = gradeKey(grade);
  const related = ledger.filter((e) => e.source.id === grade.id && e.source.kind !== 'goal' && !e.key.startsWith('del:'));
  const total = related.reduce((s, e) => s + e.xp, 0);
  if (total <= 0 || ledger.some((e) => e.key === `del:${key}`)) return [];
  const byCat = new Map<XpCategory, number>();
  for (const e of related) byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.xp);
  return [...byCat.entries()].map(([category, xp], i) => ({
    key: i === 0 ? `del:${key}` : `del:${key}:${category}`, category, xp: -xp, label: 'Cijfer verwijderd', date: on,
    source: { kind: 'deletion', id: grade.id }, configVersion: config.version,
  }));
}

/* ———————————— Levels ———————————— */

export function clubLevel(totalXp: number, config: MotivationConfig = DEFAULT_MOTIVATION_CONFIG): { level: number; into: number; span: number } {
  let level = 1;
  let need = config.levels.base;
  let rest = Math.max(0, totalXp);
  while (rest >= need) {
    rest -= need;
    level++;
    need = Math.round(need * config.levels.growth);
  }
  return { level, into: rest, span: need };
}

/* ———————————— Volgende beloningen ———————————— */

export interface NextReward {
  id: string;
  kind: 'test' | 'goal';
  subjectId: string;
  title: string;
  /** Wat de leerling ervoor moet doen, bijv. "Haal een 7,5 of hoger". */
  condition: string;
  reward: string;
  date?: string;
}

/**
 * Concrete, haalbare beloningen voor de komende toetsen: de eerstvolgende cijfergrens boven je vakgemiddelde,
 * en welk cijfer is nodig om een doel te halen. Alleen echte gegevens; niets verzonnen.
 */
export function nextRewards(
  rewards: RewardConfig,
  input: { grades: readonly Grade[]; goals: readonly Goal[]; upcoming: readonly UpcomingTest[]; today: string; packName: (id: string) => string; subjectName: (id: string) => string },
): NextReward[] {
  const { grades, goals, upcoming, today, packName, subjectName } = input;
  const out: NextReward[] = [];
  const fmt = (v: number) => v.toFixed(1).replace('.', ',');
  const tiers = sortedTiers(rewards).filter((t) => t.packId || t.pick);
  for (const t of [...upcoming].filter((x) => x.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4)) {
    // Persoonlijke drempel: de eerste beloningstier boven je huidige vakgemiddelde (minimaal een voldoende),
    // zodat een haalbare stap zichtbaar is in plaats van steeds dezelfde 7,5.
    const avg = weightedAverage(grades.filter((g) => g.subjectId === t.subjectId));
    const floor = Math.max(rewards.scale.pass, avg ?? 0);
    const tier = tiers.find((x) => x.minGrade > floor) ?? tiers.at(-1);
    if (!tier) continue;
    const what = tier.packId ? packName(tier.packId) : `spelerskeuze (${tier.pick?.minRating}+)`;
    out.push({
      id: `toets:${t.id}`, kind: 'test', subjectId: t.subjectId, date: t.date,
      title: `${subjectName(t.subjectId)} · ${t.name}`,
      condition: `Haal een ${fmt(tier.minGrade)} of hoger`,
      reward: `${what}${tier.vouchers ? ' + draft-voucher' : ''}`,
    });
  }
  for (const goal of goals) {
    if (goal.scope !== 'subject' || !goal.subjectId) continue;
    const next = upcomingFor(upcoming, goal.subjectId, today)[0];
    if (!next) continue;
    const r = requiredForTarget(grades, goal.subjectId, goal.target, [next.weight]);
    const current = weightedAverage(grades.filter((g) => g.subjectId === goal.subjectId));
    if (current !== null && current >= goal.target) continue;
    if (r.status === 'unreachable') continue;
    out.push({
      id: `doel:${goal.id}`, kind: 'goal', subjectId: goal.subjectId, date: next.date,
      title: `Doel ${subjectName(goal.subjectId)} ${fmt(goal.target)}`,
      condition: r.status === 'secured' ? 'Je haalt je doel bij de volgende toets sowieso' : `Haal minimaal een ${fmt(r.required)} voor ${next.name}`,
      reward: `${packName(DEFAULT_MOTIVATION_CONFIG.progress.goalPackId)} + ${DEFAULT_MOTIVATION_CONFIG.progress.goalXp} Progress XP`,
    });
  }
  return out;
}
