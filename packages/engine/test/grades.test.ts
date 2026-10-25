import { describe, expect, it } from 'vitest';
import {
  compareAverages, formatGrade, gradeKey, overallAverage, requiredGrade, subjectAverages,
  validateGrade, weightedAverage, whatIf, GradeValidationError, type Grade,
} from '../src/index.ts';

const g = (subjectId: string, value: number, weight: number, extra: Partial<Grade> = {}): Grade => ({
  id: `${subjectId}-${value}-${weight}-${Math.random()}`, subjectId, testName: 'Toets', value, weight,
  date: '2026-10-01', status: 'registered', source: 'manual', ...extra,
});

describe('gewogen gemiddelden', () => {
  it('weegt cijfers met hun schoolweging', () => {
    expect(weightedAverage([g('wis', 6, 1), g('wis', 9, 2)])).toBeCloseTo(8, 10);
  });
  it('negeert gesimuleerde cijfers', () => {
    expect(weightedAverage([g('wis', 6, 1), g('wis', 10, 5, { status: 'simulated' })])).toBe(6);
  });
  it('geeft null zonder cijfers', () => {
    expect(weightedAverage([])).toBeNull();
  });
  it('algemeen gemiddelde = gemiddelde van vakgemiddelden', () => {
    const grades = [g('wis', 8, 1), g('wis', 6, 1), g('ne', 5, 1)];
    expect(subjectAverages(grades).get('wis')).toBe(7);
    expect(overallAverage(grades)).toBe(6);
    expect(overallAverage(grades, ['wis'])).toBe(7);
  });
});

describe('wat-als', () => {
  it('berekent het effect van een 8,5 die drie keer meetelt', () => {
    const grades = [g('wis', 6, 1), g('wis', 7, 2), g('en', 8, 1)];
    const r = whatIf(grades, { subjectId: 'wis', value: 8.5, weight: 3 });
    expect(r.subject.before).toBeCloseTo(20 / 3, 10);
    expect(r.subject.after).toBeCloseTo((6 + 14 + 25.5) / 6, 10);
    expect(r.subject.trend).toBe('up');
    expect(r.overall.trend).toBe('up');
    expect(grades).toHaveLength(3); // origineel onaangetast
  });
  it('toont een daling bij een laag cijfer', () => {
    expect(whatIf([g('wis', 8, 1)], { subjectId: 'wis', value: 4, weight: 1 }).subject.trend).toBe('down');
  });
  it('weigert ongeldige scenario-invoer', () => {
    expect(() => whatIf([], { subjectId: 'wis', value: 11, weight: 1 })).toThrow(GradeValidationError);
  });
  it('rekent het benodigde cijfer voor een doel uit', () => {
    const r = requiredGrade([g('wis', 6, 1)], 'wis', 7, 1);
    expect(r.required).toBeCloseTo(8, 10);
    expect(requiredGrade([g('wis', 3, 3)], 'wis', 9, 1).reachable).toBe(false);
  });
});

describe('validatie', () => {
  const ok = { value: 7.5, weight: 2, date: '2026-10-01', subjectId: 'wis', testName: 'H3' };
  it('accepteert een normaal cijfer', () => expect(() => validateGrade(ok, undefined, '2026-10-25')).not.toThrow());
  it.each([
    [{ value: 0.5 }], [{ value: 10.5 }], [{ value: 7.123 }], [{ weight: 0 }], [{ weight: 11 }],
    [{ date: '2027-01-01' }], [{ date: 'gisteren' }], [{ subjectId: ' ' }], [{ testName: '' }],
  ])('weigert %o', (patch) => {
    expect(() => validateGrade({ ...ok, ...patch }, undefined, '2026-10-25')).toThrow(GradeValidationError);
  });
  it('accepteert twee decimalen zonder afrondfout', () => {
    expect(() => validateGrade({ ...ok, value: 8.55 }, undefined, '2026-10-25')).not.toThrow();
  });
});

describe('ontdubbelen', () => {
  it('herkent dezelfde toets ondanks hoofdletters en leestekens', () => {
    const a = gradeKey({ subjectId: 'wis', testName: 'Toets H3 – Breuken', date: '2026-10-01', source: 'manual' });
    const b = gradeKey({ subjectId: 'wis', testName: 'toets h3 breuken', date: '2026-10-01', source: 'confirmed' });
    expect(a).toBe(b);
  });
  it('gebruikt de externe sleutel als die er is', () => {
    expect(gradeKey({ subjectId: 'wis', testName: 'x', date: '2026-10-01', source: 'magister', externalRef: '123' })).toBe('ext:magister:123');
  });
});

describe('weergave', () => {
  it('formatteert met komma', () => {
    expect(formatGrade(7.25)).toBe('7,3');
    expect(formatGrade(null)).toBe('–');
    expect(compareAverages(7, 7.001).trend).toBe('flat');
  });
});
