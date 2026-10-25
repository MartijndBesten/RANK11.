/**
 * Grade League: eerlijke, uitlegbare schoolcompetitie per periode.
 * - Gemiddelden in plaats van optellingen: meer toetsen ≠ automatisch winnen.
 * - Vooruitgang t.o.v. de eigen uitgangspositie per vak weegt het zwaarst; zo telt een 5 → 7 mee.
 * - Te weinig gegevens: geen ranking (en geen straf).
 * - De uitkomst bevat alleen componentscores 0-100, nooit cijfers.
 */
import { DUTCH_SCALE, weightedAverage, type Grade } from './grades.ts';
import { goalReachedBy, type Goal } from './goals.ts';
import { chronological } from './stats.ts';

export interface GradeLeagueConfig {
  version: string;
  weights: { performance: number; progress: number; goals: number };
  minGradesInPeriod: number;
  /** Cijfer dat 0 punten geeft en cijfer dat 100 punten geeft voor de prestatiecomponent. */
  performanceRange: [number, number];
  /** Punten per vol punt verbetering van het vakgemiddelde (50 = gelijk gebleven). */
  progressPerPoint: number;
  comebackBonus: number;
  comebackBonusMax: number;
}

export const DEFAULT_GRADE_LEAGUE_CONFIG: GradeLeagueConfig = {
  version: '2026.10-gradeleague.1',
  weights: { performance: 0.35, progress: 0.45, goals: 0.2 },
  minGradesInPeriod: 2,
  performanceRange: [4, 9],
  progressPerPoint: 25,
  comebackBonus: 5,
  comebackBonusMax: 10,
};

export interface GradeLeagueParticipant { playerId: string; grades: readonly Grade[]; goals: readonly Goal[] }
export interface GradeLeagueRow {
  playerId: string;
  eligible: boolean;
  score: number;
  components: { performance: number; progress: number; goals: number | null; bonus: number };
  gradesInPeriod: number;
  explanation: string[];
  rank?: number;
}

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const r1 = (v: number) => Math.round(v * 10) / 10;

export function gradeLeagueRow(p: GradeLeagueParticipant, period: { start: string; end: string }, config: GradeLeagueConfig = DEFAULT_GRADE_LEAGUE_CONFIG): GradeLeagueRow {
  const real = p.grades.filter((g) => g.status !== 'simulated');
  const inP = real.filter((g) => g.date >= period.start && g.date <= period.end);
  const before = real.filter((g) => g.date < period.start);
  if (inP.length < config.minGradesInPeriod) {
    return { playerId: p.playerId, eligible: false, score: 0, components: { performance: 0, progress: 0, goals: null, bonus: 0 }, gradesInPeriod: inP.length,
      explanation: [`Nog niet genoeg cijfers deze periode (minimaal ${config.minGradesInPeriod}). Je verliest niets.`] };
  }
  const [lo, hi] = config.performanceRange;
  const totalW = inP.reduce((s, g) => s + g.weight, 0);
  const performance = inP.reduce((s, g) => s + clamp(((g.value - lo) / (hi - lo)) * 100) * g.weight, 0) / totalW;

  const subjects = [...new Set(inP.map((g) => g.subjectId))];
  const deltas = subjects.flatMap((s) => {
    const b = weightedAverage(before.filter((g) => g.subjectId === s));
    const a = weightedAverage(inP.filter((g) => g.subjectId === s));
    return b === null || a === null ? [] : [a - b];
  });
  const progress = deltas.length ? deltas.reduce((s, d) => s + clamp(50 + d * config.progressPerPoint), 0) / deltas.length : 50;

  const active = p.goals.filter((goal) => goal.createdAt.slice(0, 10) <= period.end);
  const reached = active.filter((goal) => {
    const g = goalReachedBy(real, goal);
    return g && g.date >= period.start && g.date <= period.end;
  }).length;
  const goals = active.length ? (reached / active.length) * 100 : null;

  let comebacks = 0;
  for (const s of subjects) {
    const list = chronological(real.filter((g) => g.subjectId === s));
    for (let i = 1; i < list.length; i++) {
      const cur = list[i] as Grade;
      const prev = list[i - 1] as Grade;
      if (cur.date >= period.start && cur.date <= period.end && prev.value < DUTCH_SCALE.pass && cur.value >= DUTCH_SCALE.pass && cur.value - prev.value >= 1.5) comebacks++;
    }
  }
  const bonus = Math.min(config.comebackBonusMax, comebacks * config.comebackBonus);

  const w = config.weights;
  const parts: [number, number][] = [[performance, w.performance], [progress, w.progress], ...(goals === null ? [] : [[goals, w.goals] as [number, number]])];
  const weightSum = parts.reduce((s, [, x]) => s + x, 0);
  const score = clamp(parts.reduce((s, [v, x]) => s + v * x, 0) / weightSum + bonus, 0, 110);

  const explanation = [
    `Prestatie ${Math.round(performance)} van 100 (gemiddelde, niet het aantal toetsen).`,
    deltas.length ? `Vooruitgang ${Math.round(progress)} van 100 (t.o.v. je eigen eerdere gemiddelden; 50 = gelijk gebleven).` : 'Vooruitgang telt neutraal mee (nog geen eerdere cijfers om mee te vergelijken).',
    goals === null ? 'Geen doelen ingesteld: telt niet mee.' : `Doelen ${reached} van ${active.length} bereikt.`,
    ...(bonus ? [`Herstelbonus +${bonus}.`] : []),
  ];
  return { playerId: p.playerId, eligible: true, score: r1(score), components: { performance: r1(performance), progress: r1(progress), goals: goals === null ? null : r1(goals), bonus }, gradesInPeriod: inP.length, explanation };
}

/** Ranglijst: alleen spelers met genoeg gegevens krijgen een plek; gelijke score = gedeelde plek. */
export function gradeLeagueTable(players: readonly GradeLeagueParticipant[], period: { start: string; end: string }, config: GradeLeagueConfig = DEFAULT_GRADE_LEAGUE_CONFIG): GradeLeagueRow[] {
  const rows = players.map((p) => gradeLeagueRow(p, period, config));
  const ranked = rows.filter((r) => r.eligible).sort((a, b) => b.score - a.score || a.playerId.localeCompare(b.playerId));
  ranked.forEach((r, i) => { r.rank = i > 0 && r.score === (ranked[i - 1] as GradeLeagueRow).score ? (ranked[i - 1] as GradeLeagueRow).rank : i + 1; });
  return [...ranked, ...rows.filter((r) => !r.eligible)];
}
