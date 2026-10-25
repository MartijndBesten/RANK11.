import { describe, expect, it } from 'vitest';
import {
  autoBestLineup, candidatesForSlot, chemistry, createDraft, createRng, DRAFT_EVENTS, draftLineup, draftOdds,
  effectiveRating, FORMATIONS, generateCatalog, groupOf, nextOpenSlot, pickDraft, pityRemaining, positionFit,
  remapLineup, teamRating, DraftError, type Player,
} from '../src/index.ts';

const catalog = generateCatalog();
const F = FORMATIONS['4-3-3']!;
const event = DRAFT_EVENTS.toetsweek1!;

describe('elftal', () => {
  const st = catalog.find((p) => p.position === 'ST' && p.altPositions.length === 0)!;
  it('positiefit en strafpunten', () => {
    expect(positionFit(st, 'ST')).toBe('exact');
    expect(positionFit(st, 'CAM')).toBe('related');
    expect(positionFit(st, 'CB')).toBe('off');
    expect(effectiveRating(st, 'GK')).toBeLessThan(st.rating - 30);
  });
  it('automatisch beste elftal vult elke plek met unieke spelers', () => {
    const lineup = autoBestLineup(F, catalog);
    const players = F.slots.map((s) => lineup[s.id]);
    expect(players.every(Boolean)).toBe(true);
    expect(new Set(players.map((p) => p!.baseId)).size).toBe(11);
    expect(positionFit(lineup.gk!, 'GK')).toBe('exact');
  });
  it('teamrating: leeg elftal 0, beste elftal hoog, nooit boven 99', () => {
    expect(teamRating(F, {})).toBe(0);
    const r = teamRating(F, autoBestLineup(F, catalog));
    expect(r).toBeGreaterThan(85);
    expect(r).toBeLessThanOrEqual(99);
  });
  it('chemie: 0..33 en hoger met clubgenoten', () => {
    const lineup = autoBestLineup(F, catalog);
    const c = chemistry(F, lineup);
    expect(c.total).toBeGreaterThanOrEqual(0);
    expect(c.total).toBeLessThanOrEqual(33);
    const club = catalog.filter((p) => p.clubId === 'hvs' && p.rarity !== 'legend');
    const clubLineup = autoBestLineup(F, club);
    const cc = chemistry(F, clubLineup);
    expect(Object.values(cc.perSlot).filter((v) => v >= 2).length).toBeGreaterThan(5);
  });
  it('kandidaten sluiten spelers uit die al elders staan', () => {
    const lineup = autoBestLineup(F, catalog);
    const cands = candidatesForSlot(F, lineup, 'st', catalog);
    const elsewhere = F.slots.filter((s) => s.id !== 'st').map((s) => lineup[s.id]!.baseId);
    expect(cands.some((c) => elsewhere.includes(c.player.baseId))).toBe(false);
    expect(cands[0]!.effective).toBeGreaterThanOrEqual(cands[cands.length - 1]!.effective);
  });
  it('formatiewissel behoudt de spelers', () => {
    const lineup = autoBestLineup(F, catalog);
    const remapped = remapLineup(F, FORMATIONS['4-4-2']!, lineup);
    const before = new Set(Object.values(lineup).map((p) => p!.baseId));
    expect(Object.values(remapped).every((p) => before.has(p!.baseId))).toBe(true);
    expect(Object.values(remapped)).toHaveLength(11);
  });
});

describe('draft', () => {
  it('biedt per positie 5 unieke, tijdelijke kaarten', () => {
    const { session } = createDraft(event, catalog, createRng('d1'));
    expect(session.slots).toHaveLength(11);
    const all = session.slots.flatMap((s) => s.offers);
    expect(all).toHaveLength(55);
    expect(all.every((p) => p.temporary && p.id.startsWith('draft:'))).toBe(true);
    expect(new Set(all.map((p) => p.baseId)).size).toBe(55);
    const gk = session.slots.find((s) => s.position === 'GK')!;
    expect(gk.offers.every((p) => p.position === 'GK' || p.altPositions.includes('GK'))).toBe(true);
  });
  it('kiezen: alleen uit het aanbod, één keer per positie', () => {
    let { session } = createDraft(event, catalog, createRng('d2'));
    const slot = nextOpenSlot(session)!;
    session = pickDraft(session, slot.slotId, slot.offers[2]!.id);
    expect(() => pickDraft(session, slot.slotId, slot.offers[1]!.id)).toThrow(DraftError);
    const other = session.slots[1]!;
    expect(() => pickDraft(session, other.slotId, slot.offers[0]!.id)).toThrow(DraftError);
    for (const s of session.slots) if (!s.pickedId) session = pickDraft(session, s.slotId, s.offers[0]!.id);
    expect(nextOpenSlot(session)).toBeUndefined();
    expect(Object.keys(draftLineup(session))).toHaveLength(11);
  });
  it('garantie: Groep B of hoger uiterlijk bij de 10e draft, Groep A bij de 50e', () => {
    let pity = {};
    let forcedB = 0;
    let forcedA = 0;
    for (let i = 0; i < 600; i++) {
      const before: Record<string, number> = { ...pity };
      const res = createDraft(event, catalog, createRng(`p-${i}`), pity);
      if ((before.B ?? 0) + 1 >= 10) {
        expect(res.session.slots.some((s) => s.offers.some((p) => (groupOf(event, p)?.rank ?? 9) <= 1))).toBe(true);
      }
      if ((before.A ?? 0) + 1 >= 50) {
        expect(res.session.slots.some((s) => s.offers.some((p) => groupOf(event, p)?.id === 'A'))).toBe(true);
      }
      forcedB += res.session.guaranteed.filter((g) => g === 'B').length;
      forcedA += res.session.guaranteed.filter((g) => g === 'A').length;
      expect(res.pity.B).toBeLessThan(10);
      expect(res.pity.A).toBeLessThan(50);
      pity = res.pity;
    }
    // De garantie moet in de praktijk ook echt ingrijpen, anders is de teller zinloos.
    expect(forcedB).toBeGreaterThan(0);
    expect(forcedA).toBeGreaterThan(0);
  });
  it('kans op Groep B+ per draft is zeldzaam genoeg dat de teller betekenis heeft', () => {
    let hits = 0;
    for (let i = 0; i < 2000; i++) {
      const { session } = createDraft(event, catalog, createRng(`r-${i}`));
      if (session.slots.some((s) => s.offers.some((p) => (groupOf(event, p)?.rank ?? 9) <= 1))) hits++;
    }
    expect(hits / 2000).toBeGreaterThan(0.08);
    expect(hits / 2000).toBeLessThan(0.35);
  });
  it('garantieteller en kansen zijn uitlegbaar', () => {
    expect(pityRemaining(event, { B: 1, A: 2 })).toEqual({ B: 9, A: 48 });
    const odds = draftOdds(event);
    expect(odds.reduce((s, o) => s + o.chance, 0)).toBeCloseTo(1, 10);
    expect(odds[0]!.groupId).toBe('A');
  });
  it('is reproduceerbaar met dezelfde seed', () => {
    const a = createDraft(event, catalog, createRng('same')).session.slots.flatMap((s) => s.offers.map((p) => p.id));
    const b = createDraft(event, catalog, createRng('same')).session.slots.flatMap((s) => s.offers.map((p) => p.id));
    expect(a).toEqual(b);
  });
});

export type { Player };
