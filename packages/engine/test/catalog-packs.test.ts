import { describe, expect, it } from 'vitest';
import {
  createRng, generateCatalog, oddsTable, openPack, PACKS, validatePack, isWalkout, PackConfigError,
  RARITY_RANK, DEFAULT_RATING_SCALE, type PackDef,
} from '../src/index.ts';

const catalog = generateCatalog();

describe('catalogus', () => {
  it('is deterministisch', () => {
    expect(generateCatalog().map((p) => p.id + p.rating)).toEqual(catalog.map((p) => p.id + p.rating));
  });
  it('blijft binnen de ratingschaal en heeft unieke kaart-ID\'s', () => {
    for (const p of catalog) {
      expect(p.rating).toBeGreaterThanOrEqual(DEFAULT_RATING_SCALE.min);
      expect(p.rating).toBeLessThanOrEqual(DEFAULT_RATING_SCALE.max);
    }
    expect(new Set(catalog.map((p) => p.id)).size).toBe(catalog.length);
  });
  it('bevat alle zeldzaamheden die de packs nodig hebben', () => {
    const rarities = new Set(catalog.map((p) => p.rarity));
    for (const r of ['bronze', 'silver', 'gold', 'rare_gold', 'special', 'exam', 'season', 'legend']) expect(rarities).toContain(r);
  });
});

describe('packs', () => {
  it('alle standaardpacks zijn geldig tegen de catalogus', () => {
    for (const def of Object.values(PACKS)) expect(validatePack(def, catalog)).toEqual([]);
  });
  it('zelfde seed = zelfde pack (reproduceerbaar voor audit)', () => {
    const a = openPack(PACKS.gold!, catalog, createRng('seed-1'));
    const b = openPack(PACKS.gold!, catalog, createRng('seed-1'));
    expect(a.pulls.map((p) => p.card.id)).toEqual(b.pulls.map((p) => p.card.id));
  });
  it('geen dubbele speler in één pack en beste kaart als laatste', () => {
    for (let i = 0; i < 300; i++) {
      const r = openPack(PACKS.exam!, catalog, createRng(`dup-${i}`));
      expect(new Set(r.pulls.map((p) => p.card.baseId)).size).toBe(r.pulls.length);
      const last = r.revealOrder[r.revealOrder.length - 1]!;
      for (const c of r.revealOrder) {
        expect(RARITY_RANK[c.rarity] < RARITY_RANK[last.rarity] || (RARITY_RANK[c.rarity] === RARITY_RANK[last.rarity] && c.rating <= last.rating)).toBe(true);
      }
    }
  });
  it('goudpack garandeert een 80+ topkaart', () => {
    for (let i = 0; i < 300; i++) {
      const r = openPack(PACKS.gold!, catalog, createRng(`g-${i}`));
      expect(r.pulls[4]!.card.rating).toBeGreaterThanOrEqual(80);
    }
  });
  it('waargenomen kansen benaderen de getoonde kansen (Legend in Toetsweekpack, 2%)', () => {
    const N = 20000;
    let legends = 0;
    for (let i = 0; i < N; i++) {
      if (openPack(PACKS.exam!, catalog, createRng(`odds-${i}`)).pulls[4]!.bucketId === 'leg') legends++;
    }
    expect(legends / N).toBeGreaterThan(0.015);
    expect(legends / N).toBeLessThan(0.025);
  });
  it('kansentabel klopt per plek en voor "minstens één"', () => {
    const rows = oddsTable(PACKS.exam!);
    const leg = rows.find((r) => r.bucketId === 'leg')!;
    expect(leg.perSlot[4]).toBeCloseTo(0.02, 10);
    expect(leg.atLeastOne).toBeCloseTo(0.02, 10);
    const spc = rows.find((r) => r.bucketId === 'spc')!;
    expect(spc.atLeastOne).toBeCloseTo(1 - 0.99 ** 4 * 0.92, 10);
    for (let slot = 0; slot < 5; slot++) {
      expect(rows.reduce((s, r) => s + (r.perSlot[slot] ?? 0), 0)).toBeCloseTo(1, 10);
    }
  });
  it('weigert een pack met een lege categorie', () => {
    const broken: PackDef = { id: 'x', name: 'x', tagline: '', theme: 'gold', slots: [{ buckets: [{ id: 'n', label: 'Niets', weight: 1, rarities: ['gold'], minRating: 100 }] }] };
    expect(() => openPack(broken, catalog, createRng(1))).toThrow(PackConfigError);
  });
  it('walkout alleen voor bijzondere kaarten', () => {
    expect(isWalkout({ ...catalog[0]!, rarity: 'bronze', rating: 60 })).toBe(false);
    expect(isWalkout({ ...catalog[0]!, rarity: 'legend', rating: 95 })).toBe(true);
  });
});
