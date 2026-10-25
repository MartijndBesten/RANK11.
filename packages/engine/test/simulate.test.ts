import { describe, expect, it } from 'vitest';
import { DRAFT_EVENTS, generateCatalog, PACKS, simulateDrafts, simulateEconomy, simulatePacks } from '../src/index.ts';

const catalog = generateCatalog();

describe('balanssimulaties', () => {
  it('draftgarantie houdt stand: nooit langer dan de garantie zonder Groep B of beter', () => {
    const ev = DRAFT_EVENTS.toetsweek1!;
    const r = simulateDrafts(ev, catalog, 600, 'test-draft');
    const every = ev.pity.find((p) => p.groupId === 'B')!.every;
    expect(r.longestDrought.B).toBeLessThan(every);
    expect(r.longestDrought.A).toBeLessThan(ev.pity.find((p) => p.groupId === 'A')!.every);
    const total = r.offerShare.reduce((s, g) => s + g.observed, 0);
    expect(total).toBeCloseTo(1, 5);
  });

  it('gemeten packkansen liggen dicht bij de getoonde kansentabel', () => {
    const r = simulatePacks(PACKS.gold!, catalog, 4000, 'test-pack');
    for (const b of r.bucketShare) expect(Math.abs(b.observed - b.nominal)).toBeLessThan(0.03);
  });

  it('economie: hogere cijfers leveren meer op, maar ook bij moeite is er iets te verdienen', () => {
    const low = simulateEconomy({ weeks: 400, mean: 5.6, seed: 'a' });
    const high = simulateEconomy({ weeks: 400, mean: 8, seed: 'a' });
    expect(high.perWeek.coins).toBeGreaterThan(low.perWeek.coins);
    expect(low.perWeek.coins).toBeGreaterThan(0);
  });
});
