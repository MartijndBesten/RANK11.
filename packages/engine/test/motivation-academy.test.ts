import { describe, expect, it } from 'vitest';
import {
  academyReward, academySubjectSummary, achievements, applyCaps, categoryTotals, clubLevel, correctionXp, DEFAULT_MOTIVATION_CONFIG as M,
  DEFAULT_REWARD_CONFIG, deletionXp, gradeLeagueRow, gradeLeagueTable, gradeXp, hmacHex, nextRewards, performanceXpFor, resolvePlayer,
  safeEqual, signedProvider, validateEvent, verifySignature, weekStart, AcademyEventError,
  type Goal, type Grade, type LearningEvent, type XpEntry,
} from '../src/index.ts';

let n = 0;
const g = (subjectId: string, value: number, weight: number, date: string, extra: Partial<Grade> = {}): Grade => ({
  id: `m${++n}`, subjectId, testName: `Toets ${n}`, value, weight, date, status: 'registered', source: 'manual', ...extra,
});

describe('Performance en Progress XP', () => {
  it('basis + hoogste bonus (niet gestapeld)', () => {
    expect(performanceXpFor(M, 6)).toBe(50);
    expect(performanceXpFor(M, 7.2)).toBe(70);
    expect(performanceXpFor(M, 8.4)).toBe(90);
    expect(performanceXpFor(M, 9.5)).toBe(110);
  });
  it('verbetering, herstel en doel bereikt (met pack)', () => {
    const before = [g('nk', 4.8, 1, '2026-09-10')];
    const grade = g('nk', 6.8, 1, '2026-10-10');
    const goal: Goal = { id: 'd1', scope: 'subject', subjectId: 'nk', target: 5.5, createdAt: '2026-09-15T00:00:00Z' };
    const e = gradeXp(M, { grade, before, goals: [goal], ledger: [], enteredOn: '2026-10-10' });
    expect(e.map((x) => x.label)).toEqual(['Cijfer 6,8', 'Gemiddelde omhoog', 'Herstel na onvoldoende', 'Persoonlijk doel bereikt']);
    expect(categoryTotals(e)).toEqual({ performance: 50, progress: 40 + 80 + 100, academy: 0 });
    expect(e.find((x) => x.key === 'doel:d1')!.packId).toBe('gold');
    expect(e.every((x) => x.configVersion === M.version)).toBe(true);
  });
  it('een leerling die van 5 naar 7 groeit verdient meer Progress dan iemand die op 9 blijft', () => {
    const grower = gradeXp(M, { grade: g('wi', 7, 1, '2026-10-02'), before: [g('wi', 5, 1, '2026-09-01')], goals: [], ledger: [], enteredOn: '2026-10-02' });
    const stayer = gradeXp(M, { grade: g('wi', 9, 1, '2026-10-02'), before: [g('wi', 9, 1, '2026-09-01')], goals: [], ledger: [], enteredOn: '2026-10-02' });
    expect(categoryTotals(grower).progress).toBeGreaterThan(categoryTotals(stayer).progress);
  });
  it('simulaties en dubbele invoer leveren niets op', () => {
    const grade = g('en', 8, 1, '2026-10-01');
    expect(gradeXp(M, { grade: { ...grade, status: 'simulated' }, before: [], goals: [], ledger: [], enteredOn: '2026-10-01' })).toEqual([]);
    const first = gradeXp(M, { grade, before: [], goals: [], ledger: [], enteredOn: '2026-10-01' });
    expect(gradeXp(M, { grade: { ...grade, id: 'ander' }, before: [], goals: [], ledger: first, enteredOn: '2026-10-01' })).toEqual([]);
  });
  it('dagplafond voor Performance XP', () => {
    let ledger: XpEntry[] = [];
    for (let i = 0; i < 5; i++) ledger = [...ledger, ...gradeXp(M, { grade: g(`v${i}`, 9.5, 1, '2026-10-01'), before: [], goals: [], ledger, enteredOn: '2026-10-01' })];
    expect(categoryTotals(ledger).performance).toBe(M.performance.dailyCap);
    expect(ledger.some((e) => e.cappedBy)).toBe(true);
  });
  it('weekplafond over meerdere dagen en weekgrens op maandag', () => {
    expect(weekStart('2026-10-25')).toBe('2026-10-19'); // zondag → maandag ervoor
    expect(weekStart('2026-10-26')).toBe('2026-10-26');
    const big = (key: string, date: string): XpEntry => ({ key, category: 'progress', xp: 400, label: 'x', date, source: { kind: 'grade', id: key }, configVersion: 'v' });
    const out = applyCaps(M, [big('a', '2026-10-20')], [big('b', '2026-10-21'), big('c', '2026-10-27')]);
    expect(out[0]!.xp).toBe(300); // 700 - 400
    expect(out[1]!.xp).toBe(400); // nieuwe week
  });
  it('correctie omhoog schrijft verschil bij; verwijderen draait XP terug; opnieuw invoeren levert niets', () => {
    const grade = g('ak', 6.5, 1, '2026-10-01');
    let ledger = gradeXp(M, { grade, before: [], goals: [], ledger: [], enteredOn: '2026-10-01' });
    const corr = correctionXp(M, ledger, grade, { ...grade, value: 8.1 }, '2026-10-02');
    expect(corr[0]!.xp).toBe(90 - 50);
    ledger = [...ledger, ...corr];
    expect(correctionXp(M, ledger, grade, { ...grade, value: 7 }, '2026-10-02')).toEqual([]);
    const del = deletionXp(M, ledger, grade, '2026-10-03');
    ledger = [...ledger, ...del];
    expect(categoryTotals(ledger).performance).toBe(0);
    expect(deletionXp(M, ledger, grade, '2026-10-03')).toEqual([]);
    expect(gradeXp(M, { grade: { ...grade, id: 'terug' }, before: [], goals: [], ledger, enteredOn: '2026-10-04' })).toEqual([]);
  });
  it('clublevel volgt de configureerbare curve', () => {
    expect(clubLevel(0)).toEqual({ level: 1, into: 0, span: 250 });
    expect(clubLevel(250).level).toBe(2);
    expect(clubLevel(250 + 295).level).toBe(3);
  });
});

describe('volgende beloningen', () => {
  it('per geplande toets en per doel, alleen uit echte gegevens', () => {
    const grades = [g('wi', 6, 1, '2026-09-01'), g('wi', 6.5, 1, '2026-10-01')];
    const r = nextRewards(DEFAULT_REWARD_CONFIG, {
      grades, goals: [{ id: 'd', scope: 'subject', subjectId: 'wi', target: 7, createdAt: '2026-09-01T00:00:00Z' }],
      upcoming: [{ id: 'u', subjectId: 'wi', name: 'H5', date: '2026-11-03', weight: 2 }], today: '2026-10-26',
      packName: (id) => ({ exam: 'Toetsweekpack', gold: 'Goudpack' }[id] ?? id), subjectName: () => 'Wiskunde',
    });
    // Vakgemiddelde 6,25: de eerstvolgende tier erboven is 6,5 (Goudpack).
    expect(r[0]).toMatchObject({ kind: 'test', condition: 'Haal een 6,5 of hoger', reward: 'Goudpack' });
    // (7*4 - 12,5)/2 = 7,75 → 7,8
    expect(r[1]).toMatchObject({ kind: 'goal', condition: 'Haal minimaal een 7,8 voor H5' });
    expect(nextRewards(DEFAULT_REWARD_CONFIG, { grades, goals: [], upcoming: [], today: '2026-10-26', packName: (x) => x, subjectName: (x) => x })).toEqual([]);
    // Hoog gemiddelde (8,0): drempel 8,5 (Elitepack).
    const high = nextRewards(DEFAULT_REWARD_CONFIG, { grades: [g('en', 8, 1, '2026-10-01')], goals: [], upcoming: [{ id: 'e', subjectId: 'en', name: 'U4', date: '2026-11-03', weight: 1 }], today: '2026-10-26', packName: (x) => x, subjectName: (x) => x });
    expect(high[0]!.condition).toBe('Haal een 8,5 of hoger');
  });
});

describe('achievements', () => {
  it('worden afgeleid uit gegevens, inclusief comeback en klimmer', () => {
    const grades = [g('fa', 4.5, 1, '2026-09-01'), g('fa', 5.2, 1, '2026-09-08'), g('fa', 6.4, 1, '2026-09-15'), g('fa', 7.1, 1, '2026-09-22'), g('wi', 9.2, 1, '2026-09-23')];
    const a = Object.fromEntries(achievements({ grades, goals: [] }).map((x) => [x.id, x]));
    expect(a['eerste-cijfer']!.achieved).toBe(true);
    expect(a['negen']!.achievedOn).toBe('2026-09-23');
    expect(a['comeback']!.achieved).toBe(true);
    expect(a['klimmer']!.achieved).toBe(true);
    expect(a['tien-cijfers']!.progress).toBeCloseTo(0.5, 10);
    expect(Object.keys(a).some((k) => /streak|login|dag/i.test(k))).toBe(false);
  });
});

const ev = (over: Partial<LearningEvent> = {}): LearningEvent => ({
  schemaVersion: 1, eventId: `e${++n}`, providerId: 'demo', externalUserId: 'u1', activityId: 'nk-h4-oef1', subjectId: 'nk', topic: 'Elektriciteit',
  activityType: 'practice', startedAt: '2026-10-20T15:00:00Z', completedAt: '2026-10-20T15:10:00Z', questionCount: 10, correctCount: 8, mistakesFixed: 0, status: 'completed', ...over,
});
const ctx = (extra: Partial<Parameters<typeof academyReward>[2]> = {}) => ({ enabled: true, playerId: 'p1', history: [], ledger: [], ...extra });

describe('Academy', () => {
  it('validatie weigert onzin', () => {
    expect(() => validateEvent({ ...ev(), correctCount: 11 })).toThrow(AcademyEventError);
    expect(() => validateEvent({ ...ev(), schemaVersion: 2 })).toThrow(AcademyEventError);
    expect(() => validateEvent({ ...ev(), completedAt: '2026-10-20T14:00:00Z' })).toThrow(AcademyEventError);
    expect(validateEvent(ev()).eventId).toMatch(/^e/);
  });
  it('handtekening: geldig, verkeerd geheim, verlopen, rotatie', async () => {
    const body = '{"events":[]}';
    const sig = await hmacHex('geheim-1', `1700000000.${body}`);
    expect(await verifySignature(body, '1700000000', sig, ['geheim-1'], 1700000100_000)).toBe(true);
    expect(await verifySignature(body, '1700000000', sig, ['fout'], 1700000100_000)).toBe(false);
    expect(await verifySignature(body, '1700000000', sig, ['geheim-1'], 1700001000_000)).toBe(false);
    expect(await verifySignature(body, '1700000000', sig, ['nieuw', 'geheim-1'], 1700000100_000)).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
  });
  it('provider accepteert alleen ondertekende batches van zichzelf', async () => {
    const p = signedProvider('demo', 'Demo', () => ['k'], () => 1700000000_000);
    const body = JSON.stringify({ events: [ev()] });
    const sig = await hmacHex('k', `1700000000.${body}`);
    expect(await p.receive(body, { 'x-rank-timestamp': '1700000000', 'x-rank-signature': sig })).toHaveLength(1);
    await expect(p.receive(body, { 'x-rank-timestamp': '1700000000', 'x-rank-signature': 'x' })).rejects.toThrow(AcademyEventError);
    const other = JSON.stringify({ events: [ev({ providerId: 'ander' })] });
    await expect(p.receive(other, { 'x-rank-timestamp': '1700000000', 'x-rank-signature': await hmacHex('k', `1700000000.${other}`) })).rejects.toThrow(/andere provider/);
  });
  it('koppeling: onbekend of ingetrokken = geen speler', () => {
    const links = [{ providerId: 'demo', externalUserId: 'u1', playerId: 'p1', linkedAt: 't' }, { providerId: 'demo', externalUserId: 'u2', playerId: 'p2', linkedAt: 't', revokedAt: 't2' }];
    expect(resolvePlayer(links, { providerId: 'demo', externalUserId: 'u1' })).toBe('p1');
    expect(resolvePlayer(links, { providerId: 'demo', externalUserId: 'u2' })).toBeNull();
    expect(academyReward(M, ev(), ctx({ playerId: null })).status).toBe('not-linked');
  });
  it('eerste afronding: basis + hoge score + verbeterde fouten', () => {
    const d = academyReward(M, ev({ correctCount: 9, mistakesFixed: 6 }), ctx());
    expect(d.status).toBe('rewarded');
    expect(d.entries.map((x) => x.xp)).toEqual([20, 30, 4 * 25]); // fouten begrensd op 4 per activiteit
  });
  it('wegklikken levert geen afrondings-XP op (minder dan de helft goed)', () => {
    expect(academyReward(M, ev({ correctCount: 2 }), ctx()).status).toBe('low-score');
    const half = academyReward(M, ev({ correctCount: 5 }), ctx());
    expect(half.entries.map((x) => x.xp)).toEqual([20]);
    // Een verbeterde fout telt wel, ook als de rest van de oefening slecht ging.
    expect(academyReward(M, ev({ correctCount: 2, mistakesFixed: 1 }), ctx()).entries.map((x) => x.xp)).toEqual([25]);
  });
  it('dubbel event, uitgeschakeld, afgebroken en (optionele) tijdregel', () => {
    const e = ev();
    const first = academyReward(M, e, ctx());
    expect(academyReward(M, e, ctx({ history: [e], ledger: first.entries })).status).toBe('duplicate');
    expect(academyReward(M, ev(), ctx({ enabled: false })).status).toBe('disabled');
    expect(academyReward(M, ev({ status: 'abandoned' }), ctx()).status).toBe('abandoned');
    // De tijdregel staat standaard uit (V-016), maar werkt nog als een configuratie hem expliciet instelt.
    expect(academyReward(M, ev({ completedAt: '2026-10-20T15:00:30Z' }), ctx()).status).toBe('rewarded');
    const strict = { ...M, academy: { ...M.academy, minSecondsPerQuestion: 8 } };
    expect(academyReward(strict, ev({ completedAt: '2026-10-20T15:00:30Z' }), ctx()).status).toBe('too-fast');
  });
  it('herhalen: niets zonder verbetering of binnen cooldown, wel bij een betere score', () => {
    const e1 = ev({ correctCount: 6 });
    const l1 = academyReward(M, e1, ctx()).entries;
    expect(academyReward(M, ev({ correctCount: 6, startedAt: '2026-10-21T16:00:00Z', completedAt: '2026-10-21T16:10:00Z' }), ctx({ history: [e1], ledger: l1 })).status).toBe('no-learning-value');
    expect(academyReward(M, ev({ correctCount: 9, startedAt: '2026-10-20T17:00:00Z', completedAt: '2026-10-20T17:10:00Z' }), ctx({ history: [e1], ledger: l1 })).status).toBe('no-learning-value');
    const better = academyReward(M, ev({ correctCount: 9, startedAt: '2026-10-21T16:00:00Z', completedAt: '2026-10-21T16:10:00Z' }), ctx({ history: [e1], ledger: l1 }));
    expect(better.entries.map((x) => x.label)).toEqual(['Score verbeterd naar 90%', '90% goed']);
  });
  it('eindeloos klikken loont niet: dagplafond', () => {
    let ledger: XpEntry[] = [];
    let history: LearningEvent[] = [];
    for (let i = 0; i < 12; i++) {
      const e = ev({ activityId: `act${i}`, correctCount: 10 });
      ledger = [...ledger, ...academyReward(M, e, ctx({ history, ledger })).entries];
      history = [...history, e];
    }
    expect(categoryTotals(ledger).academy).toBe(M.academy.dailyCap);
  });
  it('samenvatting per vak staat los van schoolcijfers', () => {
    const e1 = ev({ topic: 'Elektriciteit', correctCount: 5 });
    const e2 = ev({ topic: 'Krachten', activityId: 'k1', correctCount: 9 });
    const ledger = [...academyReward(M, e1, ctx()).entries, ...academyReward(M, e2, ctx({ history: [e1] })).entries];
    const s = academySubjectSummary([e1, e2], ledger, 'nk');
    expect(s.count).toBe(2);
    expect(s.averageScore).toBeCloseTo(0.7, 10);
    expect(s.hardestTopic!.topic).toBe('Elektriciteit');
    expect(s.xp).toBe(20 + 20 + 30);
  });
});

describe('Grade League', () => {
  const period = { start: '2026-10-01', end: '2026-12-20' };
  it('meer toetsen wint niet automatisch', () => {
    const many = { playerId: 'veel', goals: [], grades: Array.from({ length: 12 }, (_, i) => g('wi', 7, 1, `2026-10-${String(i + 2).padStart(2, '0')}`)) };
    const few = { playerId: 'weinig', goals: [], grades: [g('wi', 7, 1, '2026-10-02'), g('wi', 7, 1, '2026-10-03')] };
    expect(gradeLeagueRow(many, period).score).toBe(gradeLeagueRow(few, period).score);
  });
  it('verbetering t.o.v. eigen basis telt zwaar: 5 → 7 verslaat 8 → 8', () => {
    const grower = { playerId: 'groeier', goals: [], grades: [g('wi', 5, 1, '2026-09-01'), g('wi', 7, 1, '2026-10-05'), g('wi', 7, 1, '2026-10-12')] };
    const steady = { playerId: 'stabiel', goals: [], grades: [g('wi', 8, 1, '2026-09-01'), g('wi', 7.6, 1, '2026-10-05'), g('wi', 7.6, 1, '2026-10-12')] };
    const t = gradeLeagueTable([steady, grower], period);
    expect(t[0]!.playerId).toBe('groeier');
    expect(t[0]!.explanation.join(' ')).not.toMatch(/\d,\d/); // geen cijfers in de uitleg
  });
  it('te weinig gegevens: geen plek, wel uitleg zonder straf', () => {
    const t = gradeLeagueTable([{ playerId: 'x', goals: [], grades: [g('wi', 9, 1, '2026-10-05')] }], period);
    expect(t[0]!.eligible).toBe(false);
    expect(t[0]!.rank).toBeUndefined();
    expect(t[0]!.explanation[0]).toMatch(/verliest niets/);
  });
  it('gelijke score = gedeelde plek; doelen en herstelbonus tellen mee', () => {
    const a = { playerId: 'a', goals: [], grades: [g('wi', 7, 1, '2026-10-02'), g('wi', 7, 1, '2026-10-03')] };
    const b = { playerId: 'b', goals: [], grades: [g('en', 7, 1, '2026-10-02'), g('en', 7, 1, '2026-10-03')] };
    const t = gradeLeagueTable([a, b], period);
    expect(t.map((r) => r.rank)).toEqual([1, 1]);
    const c = { playerId: 'c', goals: [{ id: 'd', scope: 'subject' as const, subjectId: 'fa', target: 6, createdAt: '2026-09-01T00:00:00Z' }],
      grades: [g('fa', 4.5, 1, '2026-09-10'), g('fa', 6.8, 1, '2026-10-05'), g('fa', 7, 1, '2026-10-10')] };
    const row = gradeLeagueRow(c, period);
    expect(row.components.bonus).toBe(5);
    expect(row.components.goals).toBe(100);
  });
});
