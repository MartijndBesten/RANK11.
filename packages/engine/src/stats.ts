/**
 * Cijferstatistieken. Uitgangspunten:
 * - Alleen echte cijfers (status !== 'simulated'); simulaties lopen via whatIfMany.
 * - Chronologisch = op toetsdatum, bij gelijke datum op id (deterministisch).
 * - Trends pas bij voldoende gegevens; anders 'insufficient' in plaats van een misleidende pijl.
 */
import { DUTCH_SCALE, overallAverage, subjectAverages, weightedAverage, type Grade, type GradeScale } from './grades.ts';

const real = (g: Grade) => g.status !== 'simulated';

export function chronological(grades: readonly Grade[]): Grade[] {
  return grades.filter(real).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

export function unweightedAverage(grades: readonly Grade[]): number | null {
  const list = grades.filter(real);
  return list.length ? list.reduce((s, g) => s + g.value, 0) / list.length : null;
}

export interface RunningPoint { gradeId: string; date: string; value: number; weight: number; average: number }

/** Gewogen gemiddelde na iedere toets (chronologisch). */
export function runningAverages(grades: readonly Grade[]): RunningPoint[] {
  let sum = 0;
  let weights = 0;
  return chronological(grades).map((g) => {
    sum += g.value * g.weight;
    weights += g.weight;
    return { gradeId: g.id, date: g.date, value: g.value, weight: g.weight, average: sum / weights };
  });
}

/** Voortschrijdend (ongewogen) gemiddelde over de laatste `window` cijfers. */
export function movingAverage(grades: readonly Grade[], window = 3): { gradeId: string; date: string; average: number }[] {
  const list = chronological(grades);
  return list.map((g, i) => {
    const slice = list.slice(Math.max(0, i - window + 1), i + 1);
    return { gradeId: g.id, date: g.date, average: slice.reduce((s, x) => s + x.value, 0) / slice.length };
  });
}

export interface GradeImpact { gradeId: string; before: number | null; after: number; delta: number }

/** Verandering van het vakgemiddelde door iedere toets ("verandering per toets"). */
export function gradeImpacts(grades: readonly Grade[]): GradeImpact[] {
  const points = runningAverages(grades);
  return points.map((p, i) => {
    const before = i === 0 ? null : (points[i - 1] as RunningPoint).average;
    return { gradeId: p.gradeId, before, after: p.average, delta: before === null ? 0 : p.average - before };
  });
}

export interface Period { id: string; name: string; start: string; end: string }

export function inPeriod(g: Pick<Grade, 'date'>, p: Period): boolean {
  return g.date >= p.start && g.date <= p.end;
}

export function periodAverages(grades: readonly Grade[], periods: readonly Period[]) {
  return periods.map((p) => {
    const list = grades.filter((g) => real(g) && inPeriod(g, p));
    return { periodId: p.id, count: list.length, overall: overallAverage(list), subjects: subjectAverages(list) };
  });
}

export interface Extremes { highest: Grade | null; lowest: Grade | null }
export function extremes(grades: readonly Grade[]): Extremes {
  const list = chronological(grades);
  if (!list.length) return { highest: null, lowest: null };
  let hi = list[0] as Grade;
  let lo = list[0] as Grade;
  for (const g of list) {
    if (g.value > hi.value) hi = g;
    if (g.value < lo.value) lo = g;
  }
  return { highest: hi, lowest: lo };
}

export const DISTRIBUTION_BINS = [
  { id: 'lt5', label: 'onder 5', min: 1, max: 4.99 },
  { id: '5', label: '5,0–5,4', min: 5, max: 5.49 },
  { id: '6', label: '5,5–6,4', min: 5.5, max: 6.49 },
  { id: '7', label: '6,5–7,4', min: 6.5, max: 7.49 },
  { id: '8', label: '7,5–8,4', min: 7.5, max: 8.49 },
  { id: '9', label: '8,5–10', min: 8.5, max: 10 },
] as const;

export function distribution(grades: readonly Grade[]): { id: string; label: string; count: number }[] {
  const list = grades.filter(real);
  return DISTRIBUTION_BINS.map((b) => ({ id: b.id, label: b.label, count: list.filter((g) => g.value >= b.min && g.value <= b.max).length }));
}

export function passRate(grades: readonly Grade[], scale: GradeScale = DUTCH_SCALE): number | null {
  const list = grades.filter(real);
  return list.length ? list.filter((g) => g.value >= scale.pass).length / list.length : null;
}

export function countPerSubject(grades: readonly Grade[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const g of grades) if (real(g)) out.set(g.subjectId, (out.get(g.subjectId) ?? 0) + 1);
  return out;
}

/** Aandeel van zware toetsen (weging ≥ drempel) in de totale weging, en het gemiddelde zonder die toetsen. */
export function heavyTestInfluence(grades: readonly Grade[], threshold = 3) {
  const list = grades.filter(real);
  const total = list.reduce((s, g) => s + g.weight, 0);
  const heavy = list.filter((g) => g.weight >= threshold);
  const heavyWeight = heavy.reduce((s, g) => s + g.weight, 0);
  return {
    share: total ? heavyWeight / total : 0,
    count: heavy.length,
    average: weightedAverage(list),
    averageWithoutHeavy: weightedAverage(list.filter((g) => g.weight < threshold)),
  };
}

export type TrendDirection = 'up' | 'down' | 'flat' | 'insufficient';
export interface TrendResult { direction: TrendDirection; delta: number; recentCount: number; reason?: string }

/**
 * Trend = gewogen gemiddelde nu min het gewogen gemiddelde vóór de laatste `recent` toetsen.
 * Vereist minstens `minTotal` cijfers en minstens één cijfer vóór de recente reeks.
 */
export function trend(grades: readonly Grade[], options: { recent?: number; minTotal?: number; epsilon?: number } = {}): TrendResult {
  const { recent = 2, minTotal = 3, epsilon = 0.1 } = options;
  const points = runningAverages(grades);
  if (points.length < minTotal) return { direction: 'insufficient', delta: 0, recentCount: 0, reason: `Minimaal ${minTotal} cijfers nodig.` };
  const n = Math.min(recent, points.length - 1);
  const now = (points[points.length - 1] as RunningPoint).average;
  const before = (points[points.length - 1 - n] as RunningPoint).average;
  const delta = now - before;
  return { direction: Math.abs(delta) < epsilon ? 'flat' : delta > 0 ? 'up' : 'down', delta, recentCount: n };
}

export interface ExamWeek { id: string; name: string; start: string; end: string }
export function examWeekResults(grades: readonly Grade[], weeks: readonly ExamWeek[]) {
  return weeks.map((w) => {
    const list = grades.filter((g) => real(g) && g.date >= w.start && g.date <= w.end);
    return { examWeekId: w.id, count: list.length, average: weightedAverage(list), passRate: passRate(list) };
  });
}

export interface PersonalRecords {
  bestGrade: Grade | null;
  bestSubjectAverage: { subjectId: string; average: number } | null;
  biggestJump: { gradeId: string; subjectId: string; delta: number } | null;
  longestPassRun: number;
}

/** Records afgeleid uit de gegevens (nooit opgeslagen). */
export function personalRecords(grades: readonly Grade[], scale: GradeScale = DUTCH_SCALE): PersonalRecords {
  const list = chronological(grades);
  const { highest } = extremes(list);
  let bestSubjectAverage: PersonalRecords['bestSubjectAverage'] = null;
  for (const [subjectId, average] of subjectAverages(list)) {
    if (!bestSubjectAverage || average > bestSubjectAverage.average) bestSubjectAverage = { subjectId, average };
  }
  let biggestJump: PersonalRecords['biggestJump'] = null;
  const bySubject = new Map<string, Grade[]>();
  for (const g of list) bySubject.set(g.subjectId, [...(bySubject.get(g.subjectId) ?? []), g]);
  for (const [subjectId, subjectGrades] of bySubject) {
    for (const impact of gradeImpacts(subjectGrades)) {
      if (impact.before !== null && (!biggestJump || impact.delta > biggestJump.delta)) {
        biggestJump = { gradeId: impact.gradeId, subjectId, delta: impact.delta };
      }
    }
  }
  let run = 0;
  let longestPassRun = 0;
  for (const g of list) {
    run = g.value >= scale.pass ? run + 1 : 0;
    longestPassRun = Math.max(longestPassRun, run);
  }
  return { bestGrade: highest, bestSubjectAverage, biggestJump, longestPassRun };
}

/* ———————————— Wat-als en doelen ———————————— */

export interface FutureGrade { subjectId: string; value: number; weight: number }

/** Meerdere toekomstige cijfers tegelijk (ook over verschillende vakken). */
export function whatIfMany(grades: readonly Grade[], future: readonly FutureGrade[]) {
  const simulated: Grade[] = future.map((f, i) => ({
    id: `__sim${i}`, subjectId: f.subjectId, testName: 'Wat-als', value: f.value, weight: f.weight,
    date: '9999-12-31', status: 'registered', source: 'manual',
  }));
  const all = [...grades.filter(real), ...simulated];
  const subjects = [...new Set(future.map((f) => f.subjectId))].map((subjectId) => ({
    subjectId,
    before: weightedAverage(grades.filter((g) => real(g) && g.subjectId === subjectId)),
    after: weightedAverage(all.filter((g) => g.subjectId === subjectId)),
  }));
  return { subjects, overallBefore: overallAverage(grades), overallAfter: overallAverage(all) };
}

export type RequiredStatus = 'reachable' | 'unreachable' | 'secured';
export interface RequiredResult { required: number; status: RequiredStatus; target: number; futureWeight: number }

/**
 * Minimaal (gelijk) cijfer op alle opgegeven toekomstige toetsen om een doelgemiddelde te halen.
 * 'secured' = doel wordt ook met het laagst mogelijke cijfer gehaald; 'unreachable' = boven het maximum.
 */
export function requiredForTarget(
  grades: readonly Grade[],
  subjectId: string,
  target: number,
  futureWeights: readonly number[],
  scale: GradeScale = DUTCH_SCALE,
): RequiredResult {
  const list = grades.filter((g) => real(g) && g.subjectId === subjectId);
  const sum = list.reduce((s, g) => s + g.value * g.weight, 0);
  const weights = list.reduce((s, g) => s + g.weight, 0);
  const future = futureWeights.reduce((s, w) => s + w, 0);
  if (future <= 0) throw new Error('Minstens één toekomstige toets met weging nodig.');
  const raw = (target * (weights + future) - sum) / future;
  const status: RequiredStatus = raw > scale.max ? 'unreachable' : raw <= scale.min ? 'secured' : 'reachable';
  // Naar boven afronden op één decimaal: een 7,76 nodig betekent een 7,8 halen.
  const required = Math.ceil(raw * 10 - 1e-9) / 10;
  return { required, status, target, futureWeight: future };
}

export interface Scenario { id: string; name: string; future: FutureGrade[] }
export function compareScenarios(grades: readonly Grade[], scenarios: readonly Scenario[]) {
  return scenarios.map((s) => ({ id: s.id, name: s.name, ...whatIfMany(grades, s.future) }));
}
