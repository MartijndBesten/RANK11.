import { describe, expect, it } from 'vitest';
import { buyListing, cancelListing, generateCatalog, listCard, marketInvariants, MarketError, priceBand, type MarketState } from '../src/index.ts';

const cat = generateCatalog();
const card = cat.find((p) => p.rarity === 'gold' && p.rating >= 80)!;
const base = (): MarketState => ({
  cards: [{ instanceId: 'i1', cardId: card.id, ownerId: 'ana', acquiredAt: '2026-10-01T10:00:00Z', via: 'pack' }],
  listings: [], wallets: { ana: 100, bo: 5000, cy: 10 }, lineups: { ana: [] }, txs: [],
});
const now = '2026-10-20T12:00:00Z';
const band = priceBand(card);
const err = (fn: () => unknown) => { try { fn(); } catch (e) { return (e as MarketError).code; } return 'geen fout'; };

describe('transfermarkt', () => {
  it('verkoop en koop zijn atomair en kloppen met de invarianten', () => {
    const listed = listCard(base(), { listingId: 'l1', instanceId: 'i1', sellerId: 'ana', poolId: 'klas', price: band.min, now, card });
    const after = buyListing(listed, { listingId: 'l1', buyerId: 'bo', poolId: 'klas', now, txId: 't1' });
    expect(after.cards[0]!.ownerId).toBe('bo');
    expect(after.wallets.bo).toBe(5000 - band.min);
    expect(after.wallets.ana).toBe(100 + band.min - Math.ceil(band.min * 0.05));
    expect(marketInvariants(listed, after)).toEqual([]);
    // tweede koop van dezelfde advertentie faalt (geen dubbele verkoop)
    expect(err(() => buyListing(after, { listingId: 'l1', buyerId: 'cy', poolId: 'klas', now, txId: 't2' }))).toBe('not-active');
  });

  it('weigert prijzen buiten de band, kaarten in het elftal, draftkaarten en andere pools', () => {
    expect(err(() => listCard(base(), { listingId: 'l', instanceId: 'i1', sellerId: 'ana', poolId: 'p', price: band.max + 10, now, card }))).toBe('price');
    expect(err(() => listCard({ ...base(), lineups: { ana: ['i1'] } }, { listingId: 'l', instanceId: 'i1', sellerId: 'ana', poolId: 'p', price: band.min, now, card }))).toBe('in-lineup');
    expect(err(() => listCard(base(), { listingId: 'l', instanceId: 'i1', sellerId: 'ana', poolId: 'p', price: band.min, now, card: { ...card, temporary: true } }))).toBe('temporary');
    expect(err(() => listCard(base(), { listingId: 'l', instanceId: 'i1', sellerId: 'bo', poolId: 'p', price: band.min, now, card }))).toBe('not-owner');
    const listed = listCard(base(), { listingId: 'l1', instanceId: 'i1', sellerId: 'ana', poolId: 'klas', price: band.min, now, card });
    expect(err(() => buyListing(listed, { listingId: 'l1', buyerId: 'bo', poolId: 'andere', now, txId: 't' }))).toBe('pool');
    expect(err(() => buyListing(listed, { listingId: 'l1', buyerId: 'cy', poolId: 'klas', now, txId: 't' }))).toBe('funds');
    expect(err(() => buyListing(listed, { listingId: 'l1', buyerId: 'ana', poolId: 'klas', now, txId: 't' }))).toBe('own-listing');
  });

  it('afkoelperiode na aankoop en verlopen advertenties', () => {
    const listed = listCard(base(), { listingId: 'l1', instanceId: 'i1', sellerId: 'ana', poolId: 'klas', price: band.min, now, card });
    const bought = buyListing(listed, { listingId: 'l1', buyerId: 'bo', poolId: 'klas', now, txId: 't1' });
    expect(err(() => listCard(bought, { listingId: 'l2', instanceId: 'i1', sellerId: 'bo', poolId: 'klas', price: band.min, now: '2026-10-21T12:00:00Z', card }))).toBe('cooldown');
    expect(() => listCard(bought, { listingId: 'l2', instanceId: 'i1', sellerId: 'bo', poolId: 'klas', price: band.min, now: '2026-10-24T13:00:00Z', card })).not.toThrow();
    const late = '2026-10-23T12:00:01Z';
    expect(err(() => buyListing(listed, { listingId: 'l1', buyerId: 'bo', poolId: 'klas', now: late, txId: 't' }))).toBe('not-active');
    expect(cancelListing(listed, 'l1', 'ana').listings[0]!.status).toBe('cancelled');
  });
});
