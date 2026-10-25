/**
 * Afgeleide cijfergegevens voor Home en Cijfers: één plek, zodat beide schermen hetzelfde laten zien.
 * Alles komt uit de engine (stats, goals, insights, motivation); hier wordt niets zelf berekend.
 */
import { useMemo } from 'react';
import {
  DEFAULT_REWARD_CONFIG, generateInsights, goalProgress, nextRewards, overallAverage, PACKS, periodAverages, runningAverages,
  subjectAverages, trend, weightedAverage, type Grade, type TrendResult,
} from '@rank11/engine';
import { useStore } from './store';
import { currentPeriod, PERIODS, previousPeriod, subjectById, subjectName, SUBJECTS, todayIso, type Subject } from './school';

export interface SubjectRow {
  subject: Subject;
  grades: Grade[];
  average: number | null;
  trend: TrendResult;
  last: Grade | undefined;
}

export function useGradeData() {
  const { grades, state } = useStore();
  const { goals, upcoming } = state;
  return useMemo(() => {
    const today = todayIso();
    const period = currentPeriod(today);
    const prev = previousPeriod(period);
    const [pa] = periodAverages(grades, [period]);
    const [pb] = prev ? periodAverages(grades, [prev]) : [undefined];
    const overall = overallAverage(grades);
    const subjects: SubjectRow[] = SUBJECTS.map((subject) => {
      const list = grades.filter((g) => g.subjectId === subject.id).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
      return { subject, grades: list, average: weightedAverage(list), trend: trend(list), last: list.at(-1) };
    }).filter((r) => r.grades.length > 0);
    const rising = subjects.filter((r) => r.trend.direction === 'up').sort((a, b) => b.trend.delta - a.trend.delta);
    const falling = subjects.filter((r) => r.trend.direction === 'down').sort((a, b) => a.trend.delta - b.trend.delta);
    const overallRunning = runningAverages(grades);
    const goalList = goals.map((g) => goalProgress(grades, g, upcoming, today));
    const upcomingSorted = upcoming.filter((t) => t.date >= today).sort((a, b) => a.date.localeCompare(b.date));
    const insights = generateInsights({ grades, goals, upcoming, periods: PERIODS, subjectName, today });
    const rewards = nextRewards(DEFAULT_REWARD_CONFIG, { grades, goals, upcoming, today, packName: (id) => PACKS[id]?.name ?? id, subjectName });
    // Gemiddelde over de vakgemiddelden nu en zonder het laatst ingevoerde cijfer: de verandering door de laatste toets.
    const latest = [...grades].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)).at(-1);
    const overallBeforeLatest = latest ? overallAverage(grades.filter((g) => g.id !== latest.id)) : null;
    return {
      today, period, prev,
      periodOverall: pa?.overall ?? null,
      prevPeriodOverall: pb && pb.count ? pb.overall : null,
      overall, overallBeforeLatest, latest, overallRunning,
      subjects, rising, falling, goals: goalList, upcoming: upcomingSorted, insights, rewards,
      subjectAverages: subjectAverages(grades),
      subjectById,
    };
  }, [grades, goals, upcoming]);
}

export const fmt = (v: number | null | undefined, d = 1) => (v === null || v === undefined || Number.isNaN(v) ? '–' : v.toFixed(d).replace('.', ','));
export const gradeClass = (v: number | null | undefined) => (v === null || v === undefined ? '' : v < 5.5 ? 'grade-low' : v >= 8 ? 'grade-high' : 'grade-ok');

export function dayLabel(iso: string, today: string): string {
  const d = Math.round((Date.parse(`${iso}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 864e5);
  if (d === 0) return 'vandaag';
  if (d === 1) return 'morgen';
  if (d > 1 && d < 7) return `over ${d} dagen`;
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });
}
export const shortDate = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
