import { describe, expect, it } from 'vitest';
import {
  ACHIEVABLE_PROGRESS_CONFIG, ACHIEVABLE_REWARD_CONFIG, DEFAULT_PROGRESS_CONFIG as P, DEFAULT_REWARD_CONFIG, FAIR_REWARD_CONFIG, computeReward, matchupWinRate,
  progressRewards, simulateSchoolYear, STUDENT_PROFILES,
  type Goal, type Grade, type Period, type ProgressGrant, type XpEntry,
} from '../src/index.ts';

let n = 0;
const g = (subjectId: string, value: number, date: string, weight = 1): Grade => ({ id: `e${++n}`, subjectId, testName: `T${n}`, value, weight, date, status: 'registered', source: 'manual' });
const periods: Period[] = [
  { id: 'p1', name: 'P1', start: '2026-09-01', end: '2026-10-31' },
  { id: 'p2', name: 'P2', start: '2026-11-01', end: '2026-12-31' },
];
const run = (grades: Grade[], today: string, extra: { goals?: Goal[]; ledger?: XpEntry[]; grants?: ProgressGrant[] } = {}) =>
  progressRewards(P, { grades, goals: extra.goals ?? [], ledger: extra.ledger ?? [], grants: extra.grants ?? [], periods, today });
const acad = (xp: number, date: string, i = 0): XpEntry => ({ key: `a${i}`, category: 'academy', xp, label: 'x', date, source: { kind: 'academy', id: `ev${i}` }, configVersion: 'v' });

describe('cijferbeloning economie v2', () => {
  it('voucher pas vanaf 8,5; troost-coins bij een onvoldoende', () => {
    const r = (value: number) => computeReward(FAIR_REWARD_CONFIG, { grade: g('wi', value, '2026-10-01'), subjectAvgBefore: null, subjectAvgAfter: null, rewardedToday: 0, rewardedThisWeek: 0 });
    expect(r(7.8).vouchers).toBe(0);
    expect(r(8.6).vouchers).toBe(1);
    expect(r(4.2)).toMatchObject({ status: 'support', coins: 100 });
    expect(FAIR_REWARD_CONFIG.version).not.toBe(DEFAULT_REWARD_CONFIG.version);
  });
});

describe('voortgangsbeloningen', () => {
  it('doel bereikt: één voucher, één keer; niet als het doel bij instellen al gehaald was', () => {
    const grades = [g('wi', 5.5, '2026-09-05'), g('wi', 7.5, '2026-09-20')];
    const goal: Goal = { id: 'd1', scope: 'subject', subjectId: 'wi', target: 6.4, createdAt: '2026-09-10T00:00:00Z' };
    const first = run(grades, '2026-09-20', { goals: [goal] });
    expect(first.find((x) => x.kind === 'goal')).toMatchObject({ key: 'pr-doel:d1', vouchers: 1 });
    expect(run(grades, '2026-09-21', { goals: [goal], grants: first }).filter((x) => x.kind === 'goal')).toEqual([]);
    const already: Goal = { ...goal, id: 'd2', target: 5, createdAt: '2026-09-10T00:00:00Z' };
    expect(run(grades, '2026-09-21', { goals: [already] }).filter((x) => x.kind === 'goal')).toEqual([]);
  });

  it('vakgemiddelde verbeterd t.o.v. eigen basis: één keer per vak per periode', () => {
    const grades = [g('fa', 5, '2026-09-05'), g('fa', 5.4, '2026-10-01'), g('fa', 6.2, '2026-11-05'), g('fa', 6.3, '2026-11-12'), g('fa', 6.1, '2026-11-20')];
    const r = run(grades, '2026-11-20');
    expect(r.find((x) => x.kind === 'improvement')).toMatchObject({ key: 'pr-vooruit:p2:fa', packId: 'gold', vouchers: 1 });
    expect(run(grades, '2026-11-21', { grants: r }).filter((x) => x.kind === 'improvement')).toEqual([]);
    // Te weinig cijfers in de periode: nog niets.
    expect(run(grades.slice(0, 4), '2026-11-12').filter((x) => x.kind === 'improvement')).toEqual([]);
  });

  it('persoonlijk topcijfer geldt voor ieder niveau; herstel na onvoldoende geeft een pack', () => {
    const low = [g('ne', 5, '2026-09-02'), g('ne', 5.2, '2026-09-09'), g('ne', 6.6, '2026-09-16')];
    expect(run(low, '2026-09-16').map((x) => x.kind).sort()).toEqual(['personalBest', 'recovery']);
    const high = [g('bi', 8, '2026-09-02'), g('bi', 8.1, '2026-09-09'), g('bi', 9.2, '2026-09-16')];
    expect(run(high, '2026-09-16').map((x) => x.kind)).toEqual(['personalBest']);
    expect(run(low, '2026-09-16').find((x) => x.kind === 'recovery')).toMatchObject({ packId: 'gold', vouchers: 0 });
  });

  it('Academy-mijlpalen met weeklimiet: vouchers schuiven door naar de volgende week', () => {
    const ledger = [acad(1300, '2026-09-07', 1)];
    const week1 = run([], '2026-09-07', { ledger });
    expect(week1.filter((x) => x.packId).length).toBe(P.academy.maxPacksPerWeek);
    expect(week1.reduce((s, x) => s + x.vouchers, 0)).toBe(P.maxVouchersPerWeek);
    const week2 = run([], '2026-09-14', { ledger, grants: week1 });
    expect(week2.reduce((s, x) => s + x.vouchers, 0)).toBe(1); // 1300 XP = 3 voucher-mijlpalen
    expect(new Set([...week1, ...week2].map((x) => x.key)).size).toBe(week1.length + week2.length);
  });

  it('weeklimiet geldt voor alle soorten samen en alles draagt de configuratieversie', () => {
    const grades = [g('ne', 5, '2026-09-02'), g('ne', 5.2, '2026-09-03'), g('ne', 6.6, '2026-09-04'), g('wi', 5, '2026-09-02'), g('wi', 5.1, '2026-09-03'), g('wi', 6.8, '2026-09-04'), g('fa', 6, '2026-09-02'), g('fa', 6.1, '2026-09-03'), g('fa', 7.5, '2026-09-04')];
    const r = run(grades, '2026-09-04', { ledger: [acad(500, '2026-09-04')] });
    expect(r.reduce((s, x) => s + x.vouchers, 0)).toBeLessThanOrEqual(P.maxVouchersPerWeek);
    expect(r.some((x) => x.cappedVouchers)).toBe(true);
    expect(r.every((x) => x.configVersion === P.version)).toBe(true);
  });
});

describe('economie v3: positief en haalbaar', () => {
  const C = ACHIEVABLE_PROGRESS_CONFIG;
  const xp = (n: number, date = '2026-09-07'): XpEntry => ({ key: `x${n}`, category: 'performance', xp: n, label: 'x', date, source: { kind: 'grade', id: `g${n}` }, configVersion: 'v' });
  const runC = (ledger: XpEntry[], grants: ProgressGrant[] = []) => progressRewards(C, { grades: [], goals: [], ledger, grants, periods, today: '2026-09-07' });

  it('ieder cijfer levert iets op; een voldoende geeft een pack; Goudpack uit cijfers pas bij 9,5+', () => {
    const r = (value: number) => computeReward(ACHIEVABLE_REWARD_CONFIG, { grade: g('wi', value, '2026-10-01'), subjectAvgBefore: null, subjectAvgAfter: null, rewardedToday: 0, rewardedThisWeek: 0 });
    expect(r(4.1)).toMatchObject({ status: 'support', coins: 150 });
    for (const v of [5.6, 6.8, 7.9, 8.8]) expect(r(v).packId).toBe('starter');
    expect(r(9.6)).toMatchObject({ packId: 'gold', vouchers: 1 });
    expect(r(8.8).vouchers).toBe(1);
    // Coins lopen maar weinig op met het cijfer: hoge cijfers zijn bijzonder, geen voorwaarde.
    expect(r(8.8).coins / r(5.6).coins).toBeLessThanOrEqual(2);
  });

  it('clubniveau omhoog geeft een Goudpack, één keer per niveau, zonder inhaalslag voor bestaande accounts', () => {
    expect(runC([xp(200)])).toEqual([]);
    const lvl2 = runC([xp(260)]);
    expect(lvl2).toMatchObject([{ key: 'pr-niveau:2', kind: 'level', packId: 'gold' }]);
    expect(runC([xp(260)], lvl2)).toEqual([]);
    // Twee niveaus tegelijk (niveau 4 vanaf 893 XP): beide.
    const jump = runC([xp(260), xp(700)], lvl2);
    expect(jump.map((x) => x.key)).toEqual(['pr-niveau:3', 'pr-niveau:4']);
    // Bestaand account op niveau 6 zonder niveaubeloningen: alleen het huidige niveau, daarna gewoon verder.
    const existing = runC([xp(2000)]);
    expect(existing.map((x) => x.key)).toEqual(['pr-niveau:6']);
    expect(runC([xp(2400)], existing).map((x) => x.key)).toEqual(['pr-niveau:7']);
  });

  it('Academy-mijlpalen geven in v3 vouchers, geen extra packs (oefen-XP telt al voor het clubniveau)', () => {
    const r = progressRewards(C, { grades: [], goals: [], ledger: [acad(900, '2026-09-07', 1)], grants: [], periods, today: '2026-09-07' });
    expect(r.filter((x) => x.kind === 'academy' && x.packId)).toEqual([]);
    expect(r.filter((x) => x.kind === 'academy').reduce((s, x) => s + x.vouchers, 0)).toBe(C.maxVouchersPerWeek);
  });
});

describe('schooljaar-simulatie (economie v3)', () => {
  const rows = simulateSchoolYear(STUDENT_PROFILES, { seeds: ['t1', 't2', 't3', 't4'] });
  const motivated = rows.filter((r) => r.motivated);
  const field = rows.flatMap((r) => r.teams);
  const byId = (id: string) => rows.find((r) => r.profileId === id)!;

  it('geen eindeloze stroom topkaarten: hooguit ±30 Goudpacks per jaar en een elftal dat het hele jaar groeit', () => {
    for (const r of rows) expect(r.topPacks).toBeLessThanOrEqual(30);
    for (const r of motivated) expect(r.ratingByWeek[40]!).toBeGreaterThan(r.ratingByWeek[10]!);
    const old = simulateSchoolYear(STUDENT_PROFILES.filter((p) => p.id === 'gemiddeld'), { seeds: ['t1'], rewards: FAIR_REWARD_CONFIG, progress: P });
    expect(byId('gemiddeld').topPacks).toBeLessThan(old[0]!.topPacks / 2);
  });

  it('cijfers tussen 5,5 en 7,5 geven een competitief elftal: elk actief profiel ≥ 35% winkans tegen het veld', () => {
    for (const r of motivated) expect(matchupWinRate(r.teams, field, 120, `t:${r.profileId}`)).toBeGreaterThanOrEqual(0.35);
    const t = motivated.map((r) => r.teamRating);
    expect(Math.max(...t) - Math.min(...t)).toBeLessThanOrEqual(3);
  });

  it('hoge cijfers blijven extra bijzonder (meer vouchers), maar zonder grote voorsprong in teamsterkte', () => {
    expect(byId('sterk').vouchers).toBeGreaterThan(byId('gemiddeld').vouchers);
    expect(byId('sterk').teamRating - byId('netvoldoende').teamRating).toBeLessThanOrEqual(3);
  });

  it('inzet telt: wie doelen stelt en oefent, staat er beter voor dan wie alleen invoert', () => {
    expect(byId('gemiddeld').topPacks).toBeGreaterThan(byId('invoer-midden').topPacks);
  });

  it('de oude economie was wel extreem (ter vergelijking)', () => {
    const old = simulateSchoolYear(STUDENT_PROFILES.filter((p) => p.id === 'sterk' || p.id === 'moeite'), { seeds: ['t1'], rewards: DEFAULT_REWARD_CONFIG, progress: null });
    expect(old[0]!.vouchers / Math.max(1, old[1]!.vouchers)).toBeGreaterThan(5);
  });
});
