/**
 * Mapping van een ruw extern cijfer naar het cijfermodel van RANK11. Pure functie, geen netwerk.
 * Hergebruikt de parser-bouwstenen van de engine (Nederlandse komma, vakherkenning).
 */
import { matchSubject, parseGradeValue, DUTCH_SCALE, type SubjectAlias } from '../../engine.ts';
import type { ExternalGrade } from './providers.ts';

export interface MappedGrade {
  subjectId: string;
  testName: string;
  value: number;
  weight: number;
  date: string;
  externalRef: string;
  /** True = uit een geautoriseerde bron (telt als geverifieerd). */
  verified: boolean;
}

export type MapResult = { ok: true; grade: MappedGrade } | { ok: false; reason: string };

/** Zet één extern cijfer om; niet-numerieke waarden ("V", "G") en onbekende vakken worden overgeslagen. */
export function mapExternalGrade(raw: ExternalGrade, subjects: readonly SubjectAlias[], today: string): MapResult {
  const subjectId = matchSubject(raw.subjectRaw, subjects);
  if (!subjectId) return { ok: false, reason: `Onbekend vak: "${raw.subjectRaw}".` };
  const value = parseGradeValue(raw.value);
  if (value === null) return { ok: false, reason: `Geen numeriek cijfer: "${raw.value}".` };
  if (value < DUTCH_SCALE.min || value > DUTCH_SCALE.max) return { ok: false, reason: `Cijfer buiten bereik: "${raw.value}".` };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw.date) || raw.date > today) return { ok: false, reason: `Ongeldige of toekomstige datum: "${raw.date}".` };
  const weight = Number.isInteger(raw.weight) && (raw.weight ?? 0) >= 1 && (raw.weight ?? 0) <= DUTCH_SCALE.maxWeight ? raw.weight! : 1;
  return {
    ok: true,
    grade: { subjectId, value, weight, date: raw.date, testName: (raw.testName ?? '').trim() || `Cijfer ${raw.date}`, externalRef: raw.externalRef, verified: raw.verified },
  };
}
