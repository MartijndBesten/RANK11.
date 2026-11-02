/** Ronde 15: cijferladder — elke stap tussen 5,5 en 7,5 voelbaar, een 7,5 is al goud. */
import { describe, expect, it } from 'vitest';
import {
  computeReward, CURRENT_PROGRESS_CONFIG, CURRENT_REWARD_CONFIG, LADDER_PROGRESS_CONFIG, LADDER_REWARD_CONFIG, PACKS, progressRewards,
  type Grade, type Period, type ProgressGrant,
} from '../src/index.ts';

let n = 0;
const g = (subjectId: string, value: number, date: string, weight = 1): Grade => ({ id: `l${++n}`, subjectId, testName: `T${n}`, value, weight, date, status: 'registered', source: 'manual' });
const reward = (value: number, extra: Partial<{ rewardedToday: number; rewardedThisWeek: number }> = {}) =>
  computeReward(LADDER_REWARD_CONFIG, { grade: g('wi', value, '2026-11-02'), subjectAvgBefore: null, subjectAvgAfter: null, rewardedToday: 0, rewardedThisWeek: 0, ...extra });
const periods: Period[] = [{ id: 'p2', name: 'P2', start: '2026-11-01', end: '2026-12-31' }];

describe('cijferladder 2026.11-ladder.1', () => {
  it('is de economie die app en server gebruiken', () => {
    expect(CURRENT_REWARD_CONFIG).toBe(LADDER_REWARD_CONFIG);
    expect(CURRENT_PROGRESS_CONFIG).toBe(LADDER_PROGRESS_CONFIG);
  });

  it.each([
    [4.9, undefined, 'support'], [5.4, undefined, 'support'],
    [5.5, 'starter', 'bronze'], [5.9, 'starter', 'bronze'],
    [6.0, 'silver', 'silver'], [6.9, 'silver', 'silver'],
    [7.0, 'silver_plus', 'silver_plus'], [7.4, 'silver_plus', 'silver_plus'],
    [7.5, 'gold', 'gold'], [7.9, 'gold', 'gold'],
    [8.0, 'gold', 'gold_bonus'], [8.9, 'gold', 'gold_bonus'],
    [9.0, 'gold', 'gold_special'], [10, 'gold', 'gold_special'],
  ])('%s → pack %s (trede %s)', (value, packId, tier) => {
    const r = reward(value);
    expect(r.packId).toBe(packId);
    expect(r.tier?.id).toBe(tier);
  });

  it('onder 5,5 geen cijferpack, wel coins/XP (herstelkans)', () => {
    const r = reward(5.4);
    expect(r.status).toBe('support');
    expect(r.packId).toBeUndefined();
    expect(r.vouchers).toBe(0);
    expect(r.coins).toBeGreaterThan(0);
  });

  it('elke stap is merkbaar beter: coins en XP stijgen met iedere trede', () => {
    const steps = [5.5, 6.0, 7.0, 7.5, 8.0, 9.0].map((v) => reward(v));
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i]!.coins).toBeGreaterThan(steps[i - 1]!.coins);
      expect(steps[i]!.xp).toBeGreaterThan(steps[i - 1]!.xp);
    }
    expect(reward(8.0).vouchers).toBe(1);
    expect(reward(9.0).pick).toBeTruthy();
    expect(reward(7.9).pick).toBeUndefined();
  });

  it('Verbeterd Zilverpack geeft merkbaar meer kans op goud dan een Zilverpack', () => {
    // Kans op minstens één goudkaart (goud of hoger) in de pack.
    const goldChance = (id: string) => 1 - PACKS[id]!.slots.reduce((miss, slot) => {
      const total = slot.buckets.reduce((a, b) => a + b.weight, 0);
      const gold = slot.buckets.filter((b) => b.rarities.includes('gold')).reduce((a, b) => a + b.weight, 0);
      return miss * (1 - gold / total);
    }, 1);
    expect(goldChance('silver_plus')).toBe(1); // laatste kaart is altijd minstens goud
    expect(goldChance('silver')).toBeLessThan(0.9);
  });

  it('limieten: maximaal 3 beloonde cijfers per dag en 8 per week', () => {
    expect(reward(7.6, { rewardedToday: 3 }).status).toBe('capped');
    expect(reward(7.6, { rewardedThisWeek: 8 }).status).toBe('capped');
    expect(reward(7.6, { rewardedToday: 2, rewardedThisWeek: 7 }).status).toBe('rewarded');
  });

  it('correctie naar een hogere trede: alleen het verschil, geen dubbele pack bij dezelfde trede', () => {
    const first = reward(7.2);
    const same = computeReward(LADDER_REWARD_CONFIG, { grade: g('wi', 7.3, '2026-11-02'), subjectAvgBefore: null, subjectAvgAfter: null, rewardedToday: 0, rewardedThisWeek: 0, previous: first });
    expect(same.status).toBe('duplicate');
    const up = computeReward(LADDER_REWARD_CONFIG, { grade: g('wi', 7.6, '2026-11-02'), subjectAvgBefore: null, subjectAvgAfter: null, rewardedToday: 0, rewardedThisWeek: 0, previous: first });
    expect(up.status).toBe('correction');
    expect(up.coins).toBe(LADDER_REWARD_CONFIG.tiers.find((t) => t.id === 'gold')!.coins - first.coins);
  });
});

describe('groei onder de voldoende (4,8 → 5,4)', () => {
  const run = (grades: Grade[], today: string, grants: ProgressGrant[] = []) =>
    progressRewards(LADDER_PROGRESS_CONFIG, { grades, goals: [], ledger: [], grants, periods, today });

  it('wordt positief gewaardeerd, zonder voldoende-claim, één keer per vak per periode', () => {
    const grades = [g('ne', 4.8, '2026-11-03'), g('ne', 5.4, '2026-11-10')];
    const first = run(grades, '2026-11-10');
    const growth = first.find((x) => x.kind === 'growth')!;
    expect(growth).toBeTruthy();
    expect(growth.label).toContain('op weg naar een voldoende');
    expect(growth.packId).toBe('starter');
    // Geen herstel-beloning: het cijfer is nog geen voldoende.
    expect(first.some((x) => x.kind === 'recovery')).toBe(false);
    // Nog een stap omhoog in dezelfde periode: niet nog eens.
    const again = run([...grades, g('ne', 5.0, '2026-11-12'), g('ne', 5.4, '2026-11-14')], '2026-11-14', first);
    expect(again.filter((x) => x.kind === 'growth')).toEqual([]);
  });

  it('te kleine stap of daling levert niets op', () => {
    expect(run([g('ne', 4.8, '2026-11-03'), g('ne', 5.1, '2026-11-10')], '2026-11-10').filter((x) => x.kind === 'growth')).toEqual([]);
    expect(run([g('ne', 5.0, '2026-11-03'), g('ne', 4.4, '2026-11-10')], '2026-11-10').filter((x) => x.kind === 'growth')).toEqual([]);
  });

  it('van onvoldoende naar voldoende geeft de herstelbeloning: een Inzetpack met gegarandeerde 85+', () => {
    const r = run([g('ne', 4.6, '2026-11-03'), g('ne', 6.0, '2026-11-10')], '2026-11-10');
    expect(r.find((x) => x.kind === 'recovery')?.packId).toBe('effort');
  });
});
