/**
 * Persoonlijke doelen en aankomende toetsen.
 * Een doel is een gemiddelde dat de leerling zelf kiest (per vak of algemeen).
 */
import { overallAverage, weightedAverage, type Grade } from './grades.ts';
import { chronological, requiredForTarget, type RequiredResult } from './stats.ts';

export interface Goal {
  id: string;
  scope: 'subject' | 'overall';
  subjectId?: string;
  target: number;
  createdAt: string;
}

export interface UpcomingTest {
  id: string;
  subjectId: string;
  name: string;
  date: string;
  weight: number;
}

export interface GoalProgress {
  goal: Goal;
  current: number | null;
  gap: number | null;
  achieved: boolean;
  /** 0-1, ten opzichte van het gemiddelde bij het aanmaken van het doel (of 1 als bereikt). */
  progress: number;
  /** Benodigd cijfer op de eerstvolgende toets van dit vak (alleen vakdoelen met een geplande toets). */
  nextTest?: { test: UpcomingTest; result: RequiredResult };
}

export function goalCurrent(grades: readonly Grade[], goal: Goal): number | null {
  return goal.scope === 'subject'
    ? weightedAverage(grades.filter((g) => g.subjectId === goal.subjectId))
    : overallAverage(grades);
}

export function upcomingFor(tests: readonly UpcomingTest[], subjectId: string, today: string): UpcomingTest[] {
  return tests.filter((t) => t.subjectId === subjectId && t.date >= today).sort((a, b) => a.date.localeCompare(b.date));
}

export function goalProgress(grades: readonly Grade[], goal: Goal, tests: readonly UpcomingTest[], today: string): GoalProgress {
  const current = goalCurrent(grades, goal);
  const atStart = goalCurrent(grades.filter((g) => g.date < goal.createdAt.slice(0, 10)), goal) ?? current;
  const achieved = current !== null && current >= goal.target - 1e-9;
  let progress = achieved ? 1 : 0;
  if (!achieved && current !== null && atStart !== null && goal.target > atStart) {
    progress = Math.max(0, Math.min(1, (current - atStart) / (goal.target - atStart)));
  }
  const out: GoalProgress = { goal, current, gap: current === null ? null : goal.target - current, achieved, progress };
  if (goal.scope === 'subject' && goal.subjectId && !achieved) {
    const next = upcomingFor(tests, goal.subjectId, today)[0];
    if (next) out.nextTest = { test: next, result: requiredForTarget(grades, goal.subjectId, goal.target, [next.weight]) };
  }
  return out;
}

/**
 * Het cijfer waarmee een doel bereikt werd: de eerste toets (chronologisch) waarna het
 * gemiddelde ≥ doel is en daarvóór niet. Basis voor een eenmalige, idempotente beloning.
 */
export function goalReachedBy(grades: readonly Grade[], goal: Goal): Grade | null {
  const relevant = chronological(goal.scope === 'subject' ? grades.filter((g) => g.subjectId === goal.subjectId) : grades)
    .filter((g) => g.date >= goal.createdAt.slice(0, 10));
  const before = grades.filter((g) => g.date < goal.createdAt.slice(0, 10));
  const acc = [...before];
  if ((goalCurrent(acc, goal) ?? -1) >= goal.target) return null; // was al bereikt bij aanmaken: geen beloning
  for (const g of relevant) {
    acc.push(g);
    if ((goalCurrent(acc, goal) ?? -1) >= goal.target - 1e-9) return g;
  }
  return null;
}
