import { describe, expect, it } from 'vitest';
import {
  applyGradeEvents, checkNewGrade, compareScenarios, countPerSubject, distribution, examWeekResults, extremes, generateInsights,
  goalProgress, goalReachedBy, gradeImpacts, heavyTestInfluence, inSentence, movingAverage, passRate, periodAverages, personalRecords,
  requiredForTarget, runningAverages, trend, unweightedAverage, whatIfMany, GradebookError,
  type Goal, type Grade, type Period, type UpcomingTest,
} from '../src/index.ts';

let n = 0;
const g = (subjectId: string, value: number, weight: number, date: string, extra: Partial<Grade> = {}): Grade => ({
  id: `g${++n}`, subjectId, testName: `T${n}`, value, weight, date, status: 'registered', source: 'manual', ...extra,
});

describe('statistieken', () => {
  const wis = [g('wis', 6, 1, '2026-09-01'), g('wis', 8, 2, '2026-09-15'), g('wis', 5, 1, '2026-10-01')];
  it('ongewogen vs gewogen', () => {
    expect(unweightedAverage(wis)).toBeCloseTo(19 / 3, 10);
    expect(runningAverages(wis).map((p) => p.average)).toEqual([6, (6 + 16) / 3, (6 + 16 + 5) / 4]);
  });
  it('voortschrijdend gemiddelde over 2', () => {
    expect(movingAverage(wis, 2).map((p) => p.average)).toEqual([6, 7, 6.5]);
  });
  it('invloed per toets', () => {
    const imp = gradeImpacts(wis);
    expect(imp[0]!.before).toBeNull();
    expect(imp[1]!.delta).toBeCloseTo(22 / 3 - 6, 10);
    expect(imp[2]!.delta).toBeCloseTo(27 / 4 - 22 / 3, 10);
  });
  it('simulaties tellen nergens mee', () => {
    expect(unweightedAverage([...wis, g('wis', 10, 9, '2026-10-02', { status: 'simulated' })])).toBeCloseTo(19 / 3, 10);
    expect(runningAverages([...wis, g('wis', 10, 9, '2026-10-02', { status: 'simulated' })])).toHaveLength(3);
  });
  it('perioden, uitersten, verdeling, voldoendes, aantallen', () => {
    const periods: Period[] = [{ id: 'p1', name: 'P1', start: '2026-08-20', end: '2026-09-20' }, { id: 'p2', name: 'P2', start: '2026-09-21', end: '2026-11-15' }];
    const pa = periodAverages(wis, periods);
    expect(pa[0]!.count).toBe(2);
    expect(pa[1]!.subjects.get('wis')).toBe(5);
    expect(extremes(wis).highest!.value).toBe(8);
    expect(extremes(wis).lowest!.value).toBe(5);
    expect(distribution(wis).find((b) => b.id === '5')!.count).toBe(1);
    expect(passRate(wis)).toBeCloseTo(2 / 3, 10);
    expect(countPerSubject([...wis, g('en', 7, 1, '2026-09-02')]).get('wis')).toBe(3);
    expect(passRate([])).toBeNull();
  });
  it('invloed van zware toetsen', () => {
    const h = heavyTestInfluence([g('nk', 4, 3, '2026-09-01'), g('nk', 8, 1, '2026-09-02')]);
    expect(h.share).toBe(0.75);
    expect(h.averageWithoutHeavy).toBe(8);
  });
  it('trend: onvoldoende gegevens bij weinig cijfers, anders richting', () => {
    expect(trend(wis.slice(0, 2)).direction).toBe('insufficient');
    const up = [g('x', 5, 1, '2026-09-01'), g('x', 7, 1, '2026-09-02'), g('x', 8, 1, '2026-09-03')];
    const t = trend(up);
    expect(t.direction).toBe('up');
    expect(t.delta).toBeCloseTo(20 / 3 - 5, 10);
    expect(trend([g('y', 7, 1, '2026-09-01'), g('y', 7, 1, '2026-09-02'), g('y', 7.05, 1, '2026-09-03')]).direction).toBe('flat');
  });
  it('toetsweekresultaten en records', () => {
    const r = examWeekResults(wis, [{ id: 'tw1', name: 'TW1', start: '2026-09-14', end: '2026-09-18' }]);
    expect(r[0]).toMatchObject({ count: 1, average: 8 });
    const rec = personalRecords([...wis, g('en', 9.1, 1, '2026-09-03'), g('en', 6, 1, '2026-09-04')]);
    expect(rec.bestGrade!.value).toBe(9.1);
    expect(rec.longestPassRun).toBeGreaterThanOrEqual(2);
    expect(rec.biggestJump!.subjectId).toBe('wis');
  });
});

describe('wat-als en benodigd cijfer', () => {
  const list = [g('wis', 6, 1, '2026-09-01'), g('wis', 7, 2, '2026-09-10'), g('en', 8, 1, '2026-09-11')];
  it('meerdere toekomstige cijfers, ook over vakken', () => {
    const r = whatIfMany(list, [{ subjectId: 'wis', value: 8.5, weight: 3 }, { subjectId: 'wis', value: 7, weight: 1 }, { subjectId: 'en', value: 6, weight: 1 }]);
    const wis = r.subjects.find((s) => s.subjectId === 'wis')!;
    expect(wis.after).toBeCloseTo((6 + 14 + 25.5 + 7) / 7, 10);
    expect(r.subjects.find((s) => s.subjectId === 'en')!.after).toBe(7);
    expect(list).toHaveLength(3);
  });
  it('benodigd minimum voor een doel, afgerond naar boven', () => {
    // (6 + 14) / 3 = 6,67; doel 7,0 met één toets weging 2: (7*5 - 20) / 2 = 7,5
    expect(requiredForTarget(list, 'wis', 7, [2])).toMatchObject({ required: 7.5, status: 'reachable' });
    // afronding: (7*4 - 20)/1 = 8 → precies 8,0
    expect(requiredForTarget(list, 'wis', 7, [1]).required).toBe(8);
    expect(requiredForTarget(list, 'wis', 7.1, [1]).required).toBe(8.4);
  });
  it('meerdere toetsen samen, onhaalbaar en al binnen', () => {
    expect(requiredForTarget(list, 'wis', 9, [1]).status).toBe('unreachable');
    expect(requiredForTarget(list, 'wis', 8.5, [3, 3])).toMatchObject({ status: 'reachable', required: 9.5 }); // (8,5·9 − 20)/6 = 9,42 → 9,5
    expect(requiredForTarget(list, 'wis', 9, [3, 3]).status).toBe('unreachable'); // (81 − 20)/6 = 10,2
    expect(requiredForTarget([g('a', 9, 10, '2026-09-01')], 'a', 5.5, [1]).status).toBe('secured');
    expect(() => requiredForTarget(list, 'wis', 7, [])).toThrow();
  });
  it('scenario\'s vergelijken', () => {
    const c = compareScenarios(list, [
      { id: 'a', name: 'Voorzichtig', future: [{ subjectId: 'wis', value: 6, weight: 2 }] },
      { id: 'b', name: 'Knallen', future: [{ subjectId: 'wis', value: 9, weight: 2 }] },
    ]);
    expect(c[1]!.subjects[0]!.after!).toBeGreaterThan(c[0]!.subjects[0]!.after!);
  });
});

describe('cijferboek met mutatiegeschiedenis', () => {
  const a = g('wis', 6, 1, '2026-09-01');
  it('toevoegen, corrigeren en verwijderen met historie', () => {
    const book = applyGradeEvents([
      { type: 'add', at: 't1', grade: a },
      { type: 'correct', at: 't2', gradeId: a.id, changes: { value: 6.5 }, reason: 'typfout' },
    ]);
    expect(book.grades[0]!.value).toBe(6.5);
    expect(book.history.get(a.id)!.map((h) => h.type)).toEqual(['add', 'correct']);
    const deleted = applyGradeEvents([{ type: 'add', at: 't1', grade: a }, { type: 'delete', at: 't3', gradeId: a.id }]);
    expect(deleted.grades).toHaveLength(0);
    expect(deleted.history.get(a.id)!.at(-1)!.before!.value).toBe(6);
  });
  it('fouten in de log worden geweigerd', () => {
    expect(() => applyGradeEvents([{ type: 'delete', at: 't', gradeId: 'x' }])).toThrow(GradebookError);
    expect(() => applyGradeEvents([{ type: 'add', at: 't', grade: a }, { type: 'add', at: 't', grade: a }])).toThrow(GradebookError);
  });
  it('dubbele invoer van dezelfde toets wordt herkend, ongeldige invoer geweigerd', () => {
    const book = applyGradeEvents([{ type: 'add', at: 't1', grade: { ...a, testName: 'Toets H3' } }]);
    expect(checkNewGrade(book, { ...a, id: 'nieuw', testName: 'toets h3' }, undefined, '2026-10-26').ok).toBe(false);
    expect(checkNewGrade(book, { ...a, id: 'nieuw2', testName: 'Toets H4' }, undefined, '2026-10-26').ok).toBe(true);
    expect(checkNewGrade(book, { ...a, id: 'nieuw3', testName: 'X', value: 12 }, undefined, '2026-10-26').error).toMatch(/tussen/);
  });
});

describe('doelen', () => {
  const grades = [g('wis', 6, 1, '2026-09-01'), g('wis', 6.5, 1, '2026-09-10'), g('wis', 8, 2, '2026-10-05')];
  const goal: Goal = { id: 'd1', scope: 'subject', subjectId: 'wis', target: 7, createdAt: '2026-09-20T10:00:00Z' };
  const tests: UpcomingTest[] = [{ id: 't1', subjectId: 'wis', name: 'H5', date: '2026-11-02', weight: 2 }];
  it('voortgang, bereikt en het cijfer waarmee het doel bereikt werd', () => {
    const p = goalProgress(grades, goal, tests, '2026-10-26');
    expect(p.current).toBeCloseTo(28.5 / 4, 10);
    expect(p.achieved).toBe(true);
    expect(goalReachedBy(grades, goal)!.value).toBe(8);
  });
  it('benodigd cijfer voor de eerstvolgende toets', () => {
    const p = goalProgress(grades.slice(0, 2), goal, tests, '2026-10-26');
    expect(p.achieved).toBe(false);
    expect(p.nextTest!.result.required).toBe(7.8); // (7*4 - 12,5)/2 = 7,75 → 7,8
  });
  it('geen beloning als het doel al gehaald was bij het aanmaken', () => {
    expect(goalReachedBy(grades, { ...goal, createdAt: '2026-10-20T00:00:00Z', target: 7 })).toBeNull();
  });
});

describe('inzichten', () => {
  const names: Record<string, string> = { wis: 'Wiskunde', en: 'Engels', nk: 'Natuurkunde', ne: 'Nederlands' };
  const periods: Period[] = [{ id: 'p1', name: 'P1', start: '2026-08-20', end: '2026-09-30' }, { id: 'p2', name: 'P2', start: '2026-10-01', end: '2026-12-20' }];
  const base = (grades: Grade[], extra: Partial<Parameters<typeof generateInsights>[0]> = {}) =>
    generateInsights({ grades, goals: [], upcoming: [], periods, subjectName: (id) => names[id] ?? id, today: '2026-10-26', ...extra });
  it('vaknamen in een zin', () => {
    expect(inSentence('Wiskunde')).toBe('wiskunde');
    expect(inSentence('Engels')).toBe('Engels');
  });
  it('periodeverandering alleen met genoeg cijfers in beide perioden', () => {
    const grades = [g('en', 6.8, 1, '2026-09-05'), g('en', 6.8, 1, '2026-09-20'), g('en', 7.2, 1, '2026-10-05'), g('en', 7.2, 1, '2026-10-15')];
    const ins = base(grades).find((i) => i.rule === 'period-change')!;
    expect(ins.text).toBe('Je staat deze periode voor Engels gemiddeld 7,2. Dat is 0,4 hoger dan vorige periode.');
    expect(base(grades.slice(1)).some((i) => i.rule === 'period-change')).toBe(false);
  });
  it('zware toets, doel bijna bereikt en benodigd cijfer', () => {
    const grades = [g('nk', 6, 1, '2026-09-05'), g('nk', 7, 1, '2026-10-05'), g('ne', 6.8, 1, '2026-09-06'), g('ne', 6.9, 1, '2026-10-06')];
    const ins = base(grades, {
      upcoming: [{ id: 'u1', subjectId: 'nk', name: 'H4 Elektriciteit', date: '2026-11-03', weight: 3 }],
      goals: [{ id: 'g1', scope: 'subject', subjectId: 'ne', target: 7, createdAt: '2026-09-01T00:00:00Z' }, { id: 'g2', scope: 'subject', subjectId: 'nk', target: 7, createdAt: '2026-09-01T00:00:00Z' }],
    });
    expect(ins.find((i) => i.rule === 'heavy-test')!.text).toMatch(/^Je volgende toets natuurkunde \(H4 Elektriciteit\) telt drie keer mee/);
    expect(ins.find((i) => i.rule === 'goal-near')!.text).toBe('Je hebt voor Nederlands je persoonlijke doel bijna bereikt: nog 0,2 te gaan.');
    // nk: (13 + 3x)/5 ≥ 7 → x ≥ 7,33 → 7,4
    expect(ins.find((i) => i.rule === 'goal-required' && i.subjectId === 'nk')!.text).toBe('Voor je doel van 7,0 heb je bij de volgende toets natuurkunde met weging 3 minimaal een 7,4 nodig.');
  });
  it('trend, herstel en onder de voldoende met herstelpad', () => {
    const grades = [g('wis', 4.8, 1, '2026-09-05'), g('wis', 6.2, 1, '2026-10-02'), g('wis', 6.8, 1, '2026-10-12'), g('en', 4, 2, '2026-09-10'), g('en', 5, 1, '2026-10-10')];
    const ins = base(grades, { upcoming: [{ id: 'u', subjectId: 'en', name: 'Unit 4', date: '2026-11-01', weight: 2 }] });
    expect(ins.find((i) => i.rule === 'trend-up')!.text).toMatch(/^Je gemiddelde voor wiskunde is gestegen na je laatste 2 toetsen/);
    expect(ins.find((i) => i.rule === 'comeback')!.text).toBe('Sterk herstel bij wiskunde: van een 4,8 naar een 6,8.');
    // en: (8 + 5 + 2x)/5 ≥ 5,5 → x ≥ 7,25 → 7,3
    expect(ins.find((i) => i.rule === 'below-pass')!.text).toBe('Engels staat op 4,3. Met een 7,3 voor Unit 4 (weging 2) kom je weer op een voldoende.');
  });
  it('geen inzichten zonder gegevens', () => {
    expect(base([])).toEqual([]);
  });
});
