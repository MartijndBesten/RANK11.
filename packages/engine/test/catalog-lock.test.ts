/**
 * Harde eis ronde 15: bestaande kaarten mogen nooit verloren gaan of stilzwijgend een andere speler worden.
 * De catalog-lock legt per kaart-id de Wikidata-QID (en editie) vast zoals die live stond vóór deze sync.
 */
import { describe, expect, it } from 'vitest';
import { CARD_LOCK, generateCatalog, isPackable, openPack, PACKS, REAL_PLAYERS, starterSquad, createRng, createDraft, DRAFT_EVENTS } from '../src/index.ts';

const catalog = generateCatalog();
const byId = new Map(catalog.map((p) => [p.id, p]));

describe('catalog-lock: stabiele kaartidentiteit', () => {
  it('alle 245 eerder uitgegeven kaart-id’s bestaan nog', () => {
    const ids = Object.keys(CARD_LOCK);
    expect(ids.length).toBe(245);
    const missing = ids.filter((id) => !byId.has(id));
    expect(missing).toEqual([]);
  });

  it('iedere kaart-id verwijst naar dezelfde speler (QID) als vóór de sync', () => {
    for (const [id, lock] of Object.entries(CARD_LOCK)) {
      expect(byId.get(id)!.qid, id).toBe(lock.qid);
    }
  });

  it('edities (Electric/Toetsweek/Seizoen/Legend/uitgelicht) houden hun editie', () => {
    for (const [id, lock] of Object.entries(CARD_LOCK)) {
      if (id === lock.slot) continue;
      expect(byId.get(id)!.rarity, id).toBe(lock.rarity);
    }
  });

  it('slots zijn uniek, QID’s zijn uniek en geen slot is hergebruikt', () => {
    const slots = REAL_PLAYERS.map((p) => p.id);
    const qids = REAL_PLAYERS.map((p) => p.qid);
    expect(new Set(slots).size).toBe(slots.length);
    expect(new Set(qids).size).toBe(qids.length);
    for (const [id, lock] of Object.entries(CARD_LOCK)) {
      if (id !== lock.slot) continue;
      expect(REAL_PLAYERS.find((p) => p.id === id)?.qid, id).toBe(lock.qid);
    }
  });

  it('nieuwe spelers krijgen nieuwe slots na p0200', () => {
    const fresh = REAL_PLAYERS.filter((p) => !CARD_LOCK[p.id]);
    expect(fresh.length).toBeGreaterThan(0);
    expect(fresh.every((p) => Number(p.id.slice(1)) > 200)).toBe(true);
  });

  it('collectiebescherming: een bestaande kaart zakt nooit in zeldzaamheid (brons < zilver < goud < rare)', () => {
    const TIER = ['bronze', 'silver', 'gold', 'rare_gold'];
    for (const [id, lock] of Object.entries(CARD_LOCK)) {
      if (id !== lock.slot) continue;
      expect(TIER.indexOf(byId.get(id)!.rarity), id).toBeGreaterThanOrEqual(TIER.indexOf(lock.rarity));
    }
  });

  it('ratings van bestaande kaarten veranderen per sync hooguit 5 punten', () => {
    for (const [id, lock] of Object.entries(CARD_LOCK)) {
      if (id !== lock.slot) continue;
      expect(Math.abs(byId.get(id)!.rating - lock.ratingAtLock), id).toBeLessThanOrEqual(5);
    }
  });
});

describe('inactieve spelers: geldig in collecties, niet meer uit packs', () => {
  const inactive = catalog.filter((p) => p.inPacks === false);
  it('er zijn inactieve spelers en ze zijn niet packbaar', () => {
    expect(inactive.length).toBeGreaterThan(0);
    expect(inactive.every((p) => !isPackable(p))).toBe(true);
  });
  it('komen niet uit packs, startelftallen of drafts', () => {
    const rng = createRng('lock-test');
    const off = new Set(inactive.map((p) => p.baseId));
    for (let i = 0; i < 400; i++) {
      for (const pull of openPack(PACKS.gold!, catalog, rng).pulls) expect(off.has(pull.card.baseId)).toBe(false);
      for (const pull of openPack(PACKS.starter!, catalog, rng).pulls) expect(off.has(pull.card.baseId)).toBe(false);
    }
    for (let i = 0; i < 50; i++) {
      const s = starterSquad(catalog, `lock-${i}`);
      for (const p of [...s.starters.map((x) => x.player), ...s.reserves]) expect(off.has(p.baseId)).toBe(false);
    }
    const { session } = createDraft(DRAFT_EVENTS.toetsweek1!, catalog, rng, {});
    for (const slot of session.slots) for (const p of slot.offers) expect(p.inPacks).not.toBe(false);
  });
});

describe('echte-spelergegevens', () => {
  it('iedere echte speler heeft naam, club, positie, nationaliteit en een rating', () => {
    for (const p of REAL_PLAYERS) {
      expect(p.last.length, p.id).toBeGreaterThan(0);
      expect(p.clubName.length, p.id).toBeGreaterThan(0);
      expect(['GK', 'RB', 'CB', 'LB', 'CDM', 'CM', 'CAM', 'RM', 'LM', 'RW', 'LW', 'ST']).toContain(p.position);
      expect(p.nationName.length, p.id).toBeGreaterThan(0);
      expect(p.rating, p.id).toBeGreaterThanOrEqual(50);
      expect(p.rating, p.id).toBeLessThanOrEqual(99);
    }
  });
  it('rugnummers alleen voor actieve spelers en binnen 1–99', () => {
    for (const p of REAL_PLAYERS) if (p.number !== null) { expect(p.active).toBe(true); expect(p.number).toBeGreaterThanOrEqual(1); expect(p.number).toBeLessThanOrEqual(99); }
  });
  it('foto’s alleen met een vrije licentie, mét maker en bronpagina', () => {
    for (const p of REAL_PLAYERS) {
      if (!p.photo) continue;
      expect(p.photo.license, p.id).toMatch(/^(CC0|Public domain|CC BY(-SA)? \d\.\d( [a-z]{2})?)$/i);
      expect(p.photo.page, p.id).toMatch(/^https:\/\/commons\.wikimedia\.org\//);
      expect(p.photo.artist.length, p.id).toBeGreaterThan(0);
    }
  });
});
