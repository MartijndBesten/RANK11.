import { describe, expect, it } from 'vitest';
import {
  academyReward, checkPracticeAnswer, createPracticeSession, DEFAULT_MOTIVATION_CONFIG as M, gradePracticeSession, practiceEvent, practiceQuestion,
  PRACTICE_SUBJECTS, publicSession, topicItems, topicProgress, type ItemState, type LearningEvent, type PracticeSession, type XpEntry,
} from '../src/index.ts';

const day = (d: number) => new Date(Date.parse('2026-10-01T15:00:00Z') + d * 864e5).toISOString();
const answersFor = (s: PracticeSession, correct: (id: string) => boolean) =>
  Object.fromEntries(s.items.map((q) => [q.id, correct(q.id) ? q.answer : q.kind === 'choice' ? (q.options!.find((o) => o !== q.answer) as string) : '999999']));
const merge = (states: ItemState[], next: ItemState[]) => [...states.filter((s) => !next.some((x) => x.id === s.id)), ...next];

describe('vraagbanken', () => {
  it('iedere vraag is opnieuw op te bouwen uit zijn id, met dezelfde opties', () => {
    for (const subject of PRACTICE_SUBJECTS) for (const topic of subject.topics) {
      const ids = topicItems(subject.id, topic.id);
      expect(ids.length).toBeGreaterThanOrEqual(20);
      for (const id of ids) {
        const a = practiceQuestion(id)!;
        expect(a.topic).toBe(topic.id);
        expect(practiceQuestion(id)).toEqual(a);
        expect(checkPracticeAnswer(a, a.answer)).toBe(true);
      }
    }
    expect(practiceQuestion('wi-vgl-3-n4-11')).toMatchObject({ prompt: '3x − 4 = 11', answer: '5' });
    expect(practiceQuestion('onzin')).toBeNull();
  });
  it('nakijken: komma, breuken en spaties', () => {
    expect(checkPracticeAnswer(practiceQuestion('wi-pct-15-40')!, '6')).toBe(true);
    expect(checkPracticeAnswer(practiceQuestion('wi-br-6-8')!, ' 3 / 4 ')).toBe(true);
    expect(checkPracticeAnswer(practiceQuestion('wi-br-6-8')!, '6/8')).toBe(false);
  });
});

describe('sessies met herhaling', () => {
  it('publieke sessie bevat geen antwoorden', () => {
    const s = createPracticeSession({ subjectId: 'fa', seed: 's1', itemStates: [], now: day(0) });
    expect(s.items).toHaveLength(6);
    expect(JSON.stringify(publicSession(s))).not.toContain('"answer"');
    expect(publicSession(s).items[0]).not.toHaveProperty('answer');
  });

  it('fout → komt na een dag terug als herkansing; goed in een latere sessie = echte verbeterde fout', () => {
    const s1 = createPracticeSession({ subjectId: 'en', seed: 'a', itemStates: [], now: day(0) });
    const wrongId = s1.items[0]!.id;
    const g1 = gradePracticeSession(s1, answersFor(s1, (id) => id !== wrongId), day(0));
    expect(g1.mistakesFixed).toBe(0);
    let states = g1.states;
    // Dezelfde dag: de foute vraag is nog niet aan de beurt.
    const same = createPracticeSession({ subjectId: 'en', seed: 'b', itemStates: states, now: day(0.1) });
    expect(same.items.find((q) => q.id === wrongId)).toBeUndefined();
    // Volgende dag: herkansing staat vooraan in de selectie.
    const s2 = createPracticeSession({ subjectId: 'en', seed: 'c', itemStates: states, now: day(1.01) });
    expect(s2.items.find((q) => q.id === wrongId)?.reason).toBe('fix');
    const g2 = gradePracticeSession(s2, answersFor(s2, () => true), day(1.01));
    expect(g2.mistakesFixed).toBe(1);
    states = merge(states, g2.states);
    expect(states.find((x) => x.id === wrongId)).toMatchObject({ wrongOpen: false, fixes: 1 });
  });

  it('intervallen 1-3-7 dagen; na 3 keer gespreid goed is een vraag beheerst', () => {
    const s1 = createPracticeSession({ subjectId: 'fa', topic: 'woordenschat', seed: 'm', itemStates: [], now: day(0), size: 1 });
    const id = s1.items[0]!.id;
    let states = gradePracticeSession(s1, answersFor(s1, () => true), day(0)).states;
    expect(Date.parse(states[0]!.dueAt) - Date.parse(day(0))).toBe(864e5);
    for (const [d, expectDays, mastered] of [[1, 3, false], [4, 7, true]] as const) {
      const s = createPracticeSession({ subjectId: 'fa', seed: `m${d}`, itemStates: states, now: day(d + 0.01), size: 1 });
      expect(s.items[0]!.id).toBe(id);
      const g = gradePracticeSession(s, answersFor(s, () => true), day(d + 0.01));
      states = merge(states, g.states);
      const st = states.find((x) => x.id === id)!;
      expect(Math.round((Date.parse(st.dueAt) - Date.parse(day(d + 0.01))) / 864e5)).toBe(expectDays);
      expect(st.mastered).toBe(mastered);
    }
  });

  it('voortgang per onderwerp', () => {
    const s = createPracticeSession({ subjectId: 'wis', topic: 'breuken', seed: 'p', itemStates: [], now: day(0) });
    const g = gradePracticeSession(s, answersFor(s, () => true), day(0));
    const row = topicProgress(g.states, PRACTICE_SUBJECTS, day(0)).find((r) => r.topic === 'breuken')!;
    expect(row).toMatchObject({ learning: 6, mastered: 0, fresh: row.total - 6, due: 0 });
    expect(topicProgress(g.states, PRACTICE_SUBJECTS, day(2)).find((r) => r.topic === 'breuken')!.due).toBe(6);
  });
});

describe('Academy-beloning zonder minimumtijd (V-016), zonder farmen', () => {
  const meta = (i: number, at: string) => ({ eventId: `ev${i}`, providerId: 'rank-oefen', externalUserId: 'u', completedAt: at });
  const ctx = (history: LearningEvent[], ledger: XpEntry[]) => ({ enabled: true, playerId: 'p', history, ledger });

  it('geen tijdregel: ook snel afgerond wordt beloond', () => {
    expect(M.academy.minSecondsPerQuestion).toBe(0);
    const s = createPracticeSession({ subjectId: 'fa', seed: 'z', itemStates: [], now: day(0) });
    const ev = practiceEvent(s, gradePracticeSession(s, answersFor(s, () => true), day(0)), meta(1, day(0)));
    expect(academyReward(M, ev, ctx([], [])).status).toBe('rewarded');
  });

  it('afronding één keer per activiteit per dag; identieke vragenset levert niets op', () => {
    const s1 = createPracticeSession({ subjectId: 'fa', topic: 'woordenschat', seed: 'q1', itemStates: [], now: day(0) });
    const e1 = practiceEvent(s1, gradePracticeSession(s1, answersFor(s1, () => true), day(0)), meta(1, day(0)));
    const d1 = academyReward(M, e1, ctx([], []));
    const s2 = createPracticeSession({ subjectId: 'fa', topic: 'woordenschat', seed: 'q2', itemStates: [], now: day(0.01) });
    const e2 = practiceEvent(s2, gradePracticeSession(s2, answersFor(s2, () => true), day(0.01)), meta(2, day(0.01)));
    expect(academyReward(M, e2, ctx([e1], d1.entries)).status).toBe('no-learning-value');
    const copy = { ...e1, eventId: 'ev-kopie', completedAt: day(2) };
    expect(academyReward(M, copy, ctx([e1], d1.entries)).reason).toMatch(/precies zo/);
    const e3 = { ...e2, eventId: 'ev3', completedAt: day(1), startedAt: day(1) };
    expect(academyReward(M, e3, ctx([e1], d1.entries)).entries.map((x) => x.label)).toEqual([expect.stringMatching(/afgerond/)]);
  });

  it('XP voor verbeterde fouten alleen bij echte herkansing in een latere sessie', () => {
    const s1 = createPracticeSession({ subjectId: 'en', seed: 'f1', itemStates: [], now: day(0) });
    const g1 = gradePracticeSession(s1, answersFor(s1, () => false), day(0));
    expect(practiceEvent(s1, g1, meta(1, day(0))).mistakesFixed).toBe(0);
    const s2 = createPracticeSession({ subjectId: 'en', seed: 'f2', itemStates: g1.states, now: day(1.5) });
    const g2 = gradePracticeSession(s2, answersFor(s2, () => true), day(1.5));
    const e2 = practiceEvent(s2, g2, meta(2, day(1.5)));
    // 4 herkansingen + 2 plekken voor nieuwe stof.
    expect(e2.mistakesFixed).toBe(4);
    expect(s2.items.filter((q) => q.reason === 'new')).toHaveLength(2);
    expect(e2.activityType).toBe('mistakes');
    const d = academyReward(M, e2, ctx([practiceEvent(s1, g1, meta(1, day(0)))], []));
    const fix = d.entries.find((x) => x.key.endsWith(':fouten'))!;
    // 4 verbeterde fouten × 25 XP; het dagplafond (150) kapt het laatste deel af.
    expect(fix.xp + (fix.cappedBy ?? 0)).toBe(4 * M.academy.mistakeFixedXp);
    expect(d.entries.reduce((s, x) => s + x.xp, 0)).toBe(M.academy.dailyCap);
  });
});
