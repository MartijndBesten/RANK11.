/**
 * Cijfercentrum: gewogen gemiddelden, wat-als-simulaties en ontdubbeling.
 *
 * Grondregels:
 * - Schoolweging (weight) en gameweging (pool-instelling) zijn strikt gescheiden; hier alleen schoolweging.
 * - Gesimuleerde cijfers tellen nooit mee in echte gemiddelden of beloningen.
 * - Precisie: intern ongerond rekenen, alleen voor weergave afronden.
 */

export type GradeStatus = 'registered' | 'verified' | 'simulated';
export type GradeSource = 'manual' | 'import' | 'confirmed' | 'magister';

export interface Grade {
  id: string;
  subjectId: string;
  periodId?: string;
  testName: string;
  value: number;
  weight: number;
  /** ISO-datum (JJJJ-MM-DD) van de toets. */
  date: string;
  status: GradeStatus;
  source: GradeSource;
  /** Stabiele sleutel uit de bron (bijv. toets-ID uit Magister). */
  externalRef?: string;
}

export interface GradeScale {
  min: number;
  max: number;
  pass: number;
  maxWeight: number;
}

export const DUTCH_SCALE: GradeScale = { min: 1, max: 10, pass: 5.5, maxWeight: 10 };

export class GradeValidationError extends Error {}

export function validateGrade(
  input: Pick<Grade, 'value' | 'weight' | 'date' | 'subjectId' | 'testName'>,
  scale: GradeScale = DUTCH_SCALE,
  today: string = new Date().toISOString().slice(0, 10),
): void {
  if (!Number.isFinite(input.value) || input.value < scale.min || input.value > scale.max) {
    throw new GradeValidationError(`Cijfer moet tussen ${scale.min} en ${scale.max} liggen.`);
  }
  if (Math.abs(input.value * 100 - Math.round(input.value * 100)) > 1e-6) {
    throw new GradeValidationError('Cijfer mag maximaal twee decimalen hebben.');
  }
  if (!Number.isFinite(input.weight) || input.weight <= 0 || input.weight > scale.maxWeight) {
    throw new GradeValidationError(`Weging moet groter dan 0 en hooguit ${scale.maxWeight} zijn.`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new GradeValidationError('Datum ontbreekt of is ongeldig.');
  if (input.date > today) throw new GradeValidationError('Een cijfer kan niet in de toekomst liggen.');
  if (!input.subjectId.trim()) throw new GradeValidationError('Vak ontbreekt.');
  if (!input.testName.trim()) throw new GradeValidationError('Toetsnaam ontbreekt.');
}

const real = (g: Grade) => g.status !== 'simulated';

export function weightedAverage(grades: readonly Grade[]): number | null {
  let sum = 0;
  let weights = 0;
  for (const g of grades) {
    if (!real(g)) continue;
    sum += g.value * g.weight;
    weights += g.weight;
  }
  return weights > 0 ? sum / weights : null;
}

export function subjectAverages(grades: readonly Grade[]): Map<string, number> {
  const bySubject = new Map<string, Grade[]>();
  for (const g of grades) {
    if (!real(g)) continue;
    const list = bySubject.get(g.subjectId) ?? [];
    list.push(g);
    bySubject.set(g.subjectId, list);
  }
  const out = new Map<string, number>();
  for (const [subject, list] of bySubject) {
    const avg = weightedAverage(list);
    if (avg !== null) out.set(subject, avg);
  }
  return out;
}

/** Algemeen gemiddelde = gemiddelde van de vakgemiddelden (ieder vak telt even zwaar). */
export function overallAverage(grades: readonly Grade[], subjects?: readonly string[]): number | null {
  const averages = subjectAverages(grades);
  const values = [...averages.entries()]
    .filter(([subject]) => !subjects || subjects.includes(subject))
    .map(([, avg]) => avg);
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export type Trend = 'up' | 'down' | 'flat';

export interface AverageChange {
  before: number | null;
  after: number | null;
  delta: number;
  trend: Trend;
}

export function compareAverages(before: number | null, after: number | null, epsilon = 0.005): AverageChange {
  const delta = before === null || after === null ? 0 : after - before;
  const trend: Trend = Math.abs(delta) < epsilon ? 'flat' : delta > 0 ? 'up' : 'down';
  return { before, after, delta, trend };
}

/**
 * Wat-als: "wat gebeurt er als ik voor wiskunde een 8,5 haal die drie keer meetelt?"
 * Levert vak- en algemeen gemiddelde voor en na. Raakt de echte cijferlijst niet aan.
 */
export function whatIf(
  grades: readonly Grade[],
  scenario: { subjectId: string; value: number; weight: number },
  scale: GradeScale = DUTCH_SCALE,
): { subject: AverageChange; overall: AverageChange } {
  validateGrade({ ...scenario, date: '2000-01-01', testName: 'simulatie' }, scale);
  const subjectGrades = grades.filter((g) => g.subjectId === scenario.subjectId);
  const simulated: Grade = {
    id: '__whatif__',
    subjectId: scenario.subjectId,
    testName: 'Wat-als',
    value: scenario.value,
    weight: scenario.weight,
    date: '2000-01-01',
    status: 'registered', // alleen binnen deze berekening als echt behandeld
    source: 'manual',
  };
  return {
    subject: compareAverages(weightedAverage(subjectGrades), weightedAverage([...subjectGrades, simulated])),
    overall: compareAverages(overallAverage(grades), overallAverage([...grades, simulated])),
  };
}

/** Benodigd cijfer om een doelgemiddelde voor een vak te halen met een toets van gegeven weging. */
export function requiredGrade(
  grades: readonly Grade[],
  subjectId: string,
  target: number,
  weight: number,
  scale: GradeScale = DUTCH_SCALE,
): { required: number; reachable: boolean } {
  let sum = 0;
  let weights = 0;
  for (const g of grades) {
    if (g.subjectId !== subjectId || !real(g)) continue;
    sum += g.value * g.weight;
    weights += g.weight;
  }
  const required = (target * (weights + weight) - sum) / weight;
  return { required, reachable: required <= scale.max };
}

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();
}

/**
 * Ontdubbelsleutel: dezelfde toets mag maar één keer beloond worden, ongeacht
 * of hij handmatig, bevestigd of later via Magister binnenkomt.
 */
export function gradeKey(g: Pick<Grade, 'subjectId' | 'testName' | 'date' | 'externalRef' | 'source'>): string {
  if (g.externalRef) return `ext:${g.source}:${g.externalRef}`;
  return `toets:${g.subjectId}:${normalize(g.testName)}:${g.date}`;
}

export function formatGrade(value: number | null, decimals = 1): string {
  if (value === null) return '–';
  return value.toFixed(decimals).replace('.', ',');
}
