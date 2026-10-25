import { describe, expect, it } from 'vitest';
import { computeReward, DEFAULT_REWARD_CONFIG as C, tierFor, type Grade, type RewardConfig } from '../src/index.ts';

const grade = (value: number, extra: Partial<Grade> = {}): Grade => ({
  id: 'x', subjectId: 'wis', testName: 'H3', value, weight: 1, date: '2026-10-01',
  status: 'registered', source: 'manual', ...extra,
});
const base = { subjectAvgBefore: 6.5, subjectAvgAfter: 6.6, rewardedToday: 0, rewardedThisWeek: 0 };

describe('beloningen', () => {
  it.each([
    [4.2, 'support'], [5.5, 'pass'], [6.4, 'pass'], [6.5, 'good'], [7.9, 'great'], [8.5, 'elite'], [9.5, 'legendary'], [10, 'legendary'],
  ])('cijfer %s → tier %s', (value, tier) => {
    expect(tierFor(C, value).id).toBe(tier);
  });

  it('een voldoende levert XP en een pack', () => {
    const r = computeReward(C, { ...base, grade: grade(6) });
    expect(r.status).toBe('rewarded');
    expect(r.packId).toBe('starter');
    expect(r.xp).toBeGreaterThan(0);
    expect(r.configVersion).toBe(C.version);
  });

  it('een onvoldoende: geen pack, wel steun-XP', () => {
    const r = computeReward(C, { ...base, grade: grade(4.5) });
    expect(r.status).toBe('support');
    expect(r.packId).toBeUndefined();
    expect(r.xp).toBe(15);
  });

  it('een uitzonderlijk cijfer geeft een directe spelerskeuze', () => {
    expect(computeReward(C, { ...base, grade: grade(9.7) }).pick).toEqual({ options: 3, minRating: 90 });
  });

  it('sterke cijfers leveren een draft-voucher op, een voldoende niet', () => {
    expect(computeReward(C, { ...base, grade: grade(7.6) }).vouchers).toBe(1);
    expect(computeReward(C, { ...base, grade: grade(6.0) }).vouchers).toBe(0);
  });

  it('gesimuleerde cijfers leveren nooit iets op', () => {
    const r = computeReward(C, { ...base, grade: grade(10, { status: 'simulated' }) });
    expect(r.status).toBe('simulated');
    expect(r.xp + r.coins).toBe(0);
    expect(r.packId).toBeUndefined();
  });

  it('weging en verbetering geven bonussen', () => {
    const r = computeReward(C, { ...base, subjectAvgBefore: 6, subjectAvgAfter: 6.5, grade: grade(8, { weight: 3 }) });
    expect(r.bonuses.map((b) => b.label)).toEqual(['Weging 3×', 'Grote verbetering']);
    expect(r.xp).toBe(140 + 40 + 60);
  });

  it('dubbele invoer van dezelfde toets wordt niet opnieuw beloond', () => {
    const first = computeReward(C, { ...base, grade: grade(7) });
    const again = computeReward(C, { ...base, grade: grade(7), previous: first });
    expect(again.status).toBe('duplicate');
    expect(again.xp).toBe(0);
  });

  it('correctie naar hogere tier schrijft alleen het verschil bij', () => {
    const first = computeReward(C, { ...base, grade: grade(6.0) });
    const fixed = computeReward(C, { ...base, grade: grade(7.0), previous: first });
    expect(fixed.status).toBe('correction');
    expect(fixed.xp).toBe(90 - 50);
    expect(fixed.coins).toBe(250 - 150);
  });

  it('correctie omlaag neemt niets terug en geeft niets extra', () => {
    const first = computeReward(C, { ...base, grade: grade(8) });
    expect(computeReward(C, { ...base, grade: grade(6), previous: first }).status).toBe('duplicate');
  });

  it('limieten tegen beloningsfraude', () => {
    expect(computeReward(C, { ...base, rewardedToday: 4, grade: grade(9) }).status).toBe('capped');
    expect(computeReward(C, { ...base, rewardedThisWeek: 12, grade: grade(9) }).status).toBe('capped');
  });

  it('niet-geverifieerde cijfers kunnen worden afgetopt', () => {
    const cfg: RewardConfig = { ...C, limits: { ...C.limits, unverifiedMaxTierId: 'good' } };
    expect(computeReward(cfg, { ...base, grade: grade(9.8) }).tier?.id).toBe('good');
    expect(computeReward(cfg, { ...base, grade: grade(9.8, { status: 'verified' }) }).tier?.id).toBe('legendary');
  });

  it('optionele tier-verhoging bij zware weging', () => {
    const cfg: RewardConfig = { ...C, weight: { ...C.weight, tierBumpFromWeight: 3 } };
    expect(computeReward(cfg, { ...base, grade: grade(7, { weight: 3 }) }).tier?.id).toBe('great');
    expect(computeReward(cfg, { ...base, grade: grade(4, { weight: 3 }) }).tier?.id).toBe('support');
  });
});
