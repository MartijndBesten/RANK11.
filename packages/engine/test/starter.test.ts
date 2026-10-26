import { describe, expect, it } from 'vitest';
import { FORMATIONS, generateCatalog, positionFit, starterLineup, starterSquad, teamRating, type Lineup } from '../src/index.ts';

const catalog = generateCatalog();

describe('startelftal (V-013)', () => {
  it('compleet: 11 basisspelers exact op positie in een 4-3-3 en 7 reserves, allemaal verschillend', () => {
    for (const seed of ['a', 'b', 'c', 'd', 'e']) {
      const s = starterSquad(catalog, seed);
      expect(s.starters).toHaveLength(11);
      expect(s.reserves).toHaveLength(7);
      const f = FORMATIONS['4-3-3']!;
      for (const { slotId, player } of s.starters) expect(positionFit(player, f.slots.find((x) => x.id === slotId)!.position)).not.toBe('off');
      const ids = [...s.starters.map((x) => x.player.baseId), ...s.reserves.map((p) => p.baseId)];
      expect(new Set(ids).size).toBe(18);
      expect(s.reserves.some((p) => p.position === 'GK')).toBe(true);
    }
  });
  it('eerlijk: vooral brons/zilver, hooguit 2 lage goudkaarten, geen speciale, tijdelijke of legendarische kaarten', () => {
    const ratings: number[] = [];
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
      const s = starterSquad(catalog, seed);
      const all = [...s.starters.map((x) => x.player), ...s.reserves];
      expect(all.every((p) => ['bronze', 'silver', 'gold'].includes(p.rarity) && !p.temporary)).toBe(true);
      expect(all.filter((p) => p.rarity === 'gold').length).toBeLessThanOrEqual(2);
      expect(all.filter((p) => p.rarity === 'gold').every((p) => p.rating <= 77)).toBe(true);
      const lineup: Lineup = Object.fromEntries(s.starters.map((x) => [x.slotId, x.player]));
      ratings.push(teamRating(FORMATIONS['4-3-3']!, lineup));
    }
    expect(Math.max(...ratings) - Math.min(...ratings)).toBeLessThanOrEqual(6);
  });
  it('deterministisch per seed en opstelling met reservebank', () => {
    expect(starterSquad(catalog, 'x').lineup).toEqual(starterSquad(catalog, 'x').lineup);
    const lineup = starterLineup(starterSquad(catalog, 'x'));
    expect(Object.keys(lineup).filter((k) => k.startsWith('bench'))).toHaveLength(7);
    expect(Object.keys(lineup)).toContain('gk');
  });
});
