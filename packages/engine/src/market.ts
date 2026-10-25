/**
 * Transfermarkt binnen een pool. Veilig voor 10-16 jaar:
 *  - alleen spelcoins (nooit echt geld, coins zijn niet te koop);
 *  - vaste prijsband per kaart (min/max) tegen afzetterij en verdekt "geld geven" aan een vriend;
 *  - kaart staat in escrow zolang hij te koop staat (niet in elftal, niet dubbel te verkopen);
 *  - tijdelijke (draft)kaarten en kaarten in het elftal zijn niet verhandelbaar;
 *  - afkoelperiode na aankoop (geen doorverkoop-carrousel), daglimieten, belasting als coin-afvoer;
 *  - geen chat, geen biedingen, geen ruil: alleen vaste prijs binnen de band.
 * Iedere transactie is één atomaire overgang: alles of niets (op de server in één DB-transactie).
 */
import { RARITY_RANK, type Player } from './catalog.ts';

export interface MarketConfig {
  version: string;
  /** Percentage dat bij verkoop verdwijnt (coin-afvoer tegen inflatie). */
  taxRate: number;
  listingHours: number;
  maxActiveListingsPerPlayer: number;
  maxBuysPerDay: number;
  maxSalesPerDay: number;
  /** Na aankoop pas na zoveel uur opnieuw verkopen. */
  resaleCooldownHours: number;
  /** Prijsband rond de basiswaarde. */
  band: { min: number; max: number };
}

export const DEFAULT_MARKET_CONFIG: MarketConfig = {
  version: '2026.10-markt.1',
  taxRate: 0.05,
  listingHours: 48,
  maxActiveListingsPerPlayer: 5,
  maxBuysPerDay: 5,
  maxSalesPerDay: 5,
  resaleCooldownHours: 72,
  band: { min: 0.8, max: 1.5 },
};

/** Basiswaarde van een kaart (zelfde orde als snel verkopen, maar marktwaarde). */
export function baseValue(card: Pick<Player, 'rating' | 'rarity'>): number {
  const r = card.rating;
  const base = r >= 90 ? 9000 : r >= 85 ? 4000 : r >= 80 ? 1600 : r >= 75 ? 700 : r >= 65 ? 300 : 120;
  const mult = card.rarity === 'legend' ? 6 : RARITY_RANK[card.rarity] >= RARITY_RANK.season ? 2.5 : card.rarity === 'rare_gold' ? 1.4 : 1;
  return Math.round((base * mult) / 10) * 10;
}

export function priceBand(card: Pick<Player, 'rating' | 'rarity'>, config: MarketConfig = DEFAULT_MARKET_CONFIG): { min: number; max: number } {
  const v = baseValue(card);
  return { min: Math.round((v * config.band.min) / 10) * 10, max: Math.round((v * config.band.max) / 10) * 10 };
}

export interface OwnedCard { instanceId: string; cardId: string; ownerId: string; acquiredAt: string; via: 'pack' | 'reward' | 'draft' | 'market' | 'start' }
export interface Listing { id: string; instanceId: string; cardId: string; sellerId: string; poolId: string; price: number; createdAt: string; expiresAt: string; status: 'active' | 'sold' | 'cancelled' | 'expired'; buyerId?: string }
export interface MarketTx { id: string; listingId: string; at: string; sellerId: string; buyerId: string; price: number; tax: number; configVersion: string }

export interface MarketState {
  cards: OwnedCard[];
  listings: Listing[];
  wallets: Record<string, number>;
  /** Kaarten in een elftal (instanceId's) per speler. */
  lineups: Record<string, string[]>;
  txs: MarketTx[];
}

export class MarketError extends Error {
  constructor(public code: 'not-owner' | 'in-lineup' | 'temporary' | 'already-listed' | 'price' | 'limit' | 'cooldown' | 'not-found' | 'not-active' | 'own-listing' | 'funds' | 'pool', message: string) { super(message); }
}

const hours = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 3.6e6;
const sameDay = (a: string, b: string) => a.slice(0, 10) === b.slice(0, 10);

/** Verloopt oude advertenties; kaart komt automatisch terug (geen actie van de verkoper nodig). */
export function expireListings(state: MarketState, now: string): MarketState {
  return { ...state, listings: state.listings.map((l) => (l.status === 'active' && l.expiresAt <= now ? { ...l, status: 'expired' } : l)) };
}

export function listCard(
  state: MarketState,
  input: { listingId: string; instanceId: string; sellerId: string; poolId: string; price: number; now: string; card: Player },
  config: MarketConfig = DEFAULT_MARKET_CONFIG,
): MarketState {
  const s = expireListings(state, input.now);
  const owned = s.cards.find((c) => c.instanceId === input.instanceId);
  if (!owned || owned.ownerId !== input.sellerId) throw new MarketError('not-owner', 'Deze kaart is niet van jou.');
  if (input.card.temporary || owned.via === 'draft') throw new MarketError('temporary', 'Draftkaarten zijn tijdelijk en niet te verkopen.');
  if (s.lineups[input.sellerId]?.includes(input.instanceId)) throw new MarketError('in-lineup', 'Haal de kaart eerst uit je elftal.');
  if (s.listings.some((l) => l.instanceId === input.instanceId && l.status === 'active')) throw new MarketError('already-listed', 'Deze kaart staat al te koop.');
  if (owned.via === 'market' && hours(owned.acquiredAt, input.now) < config.resaleCooldownHours) {
    throw new MarketError('cooldown', `Een gekochte kaart kun je pas na ${config.resaleCooldownHours} uur weer verkopen.`);
  }
  const band = priceBand(input.card, config);
  if (!Number.isInteger(input.price) || input.price < band.min || input.price > band.max) {
    throw new MarketError('price', `Kies een prijs tussen ${band.min} en ${band.max} coins.`);
  }
  const active = s.listings.filter((l) => l.sellerId === input.sellerId && l.status === 'active').length;
  if (active >= config.maxActiveListingsPerPlayer) throw new MarketError('limit', `Je kunt maximaal ${config.maxActiveListingsPerPlayer} kaarten tegelijk aanbieden.`);
  const expiresAt = new Date(Date.parse(input.now) + config.listingHours * 3.6e6).toISOString();
  return {
    ...s,
    listings: [...s.listings, { id: input.listingId, instanceId: input.instanceId, cardId: owned.cardId, sellerId: input.sellerId, poolId: input.poolId, price: input.price, createdAt: input.now, expiresAt, status: 'active' }],
  };
}

export function cancelListing(state: MarketState, listingId: string, sellerId: string): MarketState {
  const l = state.listings.find((x) => x.id === listingId);
  if (!l) throw new MarketError('not-found', 'Advertentie niet gevonden.');
  if (l.sellerId !== sellerId) throw new MarketError('not-owner', 'Dit is niet jouw advertentie.');
  if (l.status !== 'active') throw new MarketError('not-active', 'Deze advertentie is niet meer actief.');
  return { ...state, listings: state.listings.map((x) => (x.id === listingId ? { ...x, status: 'cancelled' } : x)) };
}

/** Koop: alles of niets. Controleert pool, saldo, limieten en of de advertentie nog actief is. */
export function buyListing(
  state: MarketState,
  input: { listingId: string; buyerId: string; poolId: string; now: string; txId: string },
  config: MarketConfig = DEFAULT_MARKET_CONFIG,
): MarketState {
  const s = expireListings(state, input.now);
  const l = s.listings.find((x) => x.id === input.listingId);
  if (!l) throw new MarketError('not-found', 'Advertentie niet gevonden.');
  if (l.status !== 'active') throw new MarketError('not-active', 'Deze kaart is al verkocht of niet meer te koop.');
  if (l.poolId !== input.poolId) throw new MarketError('pool', 'Je kunt alleen kopen binnen je eigen pool.');
  if (l.sellerId === input.buyerId) throw new MarketError('own-listing', 'Je kunt je eigen kaart niet kopen.');
  const buysToday = s.txs.filter((t) => t.buyerId === input.buyerId && sameDay(t.at, input.now)).length;
  if (buysToday >= config.maxBuysPerDay) throw new MarketError('limit', `Maximaal ${config.maxBuysPerDay} aankopen per dag.`);
  const salesToday = s.txs.filter((t) => t.sellerId === l.sellerId && sameDay(t.at, input.now)).length;
  if (salesToday >= config.maxSalesPerDay) throw new MarketError('limit', 'Deze verkoper heeft vandaag het maximum bereikt.');
  if ((s.wallets[input.buyerId] ?? 0) < l.price) throw new MarketError('funds', 'Niet genoeg coins.');
  const tax = Math.ceil(l.price * config.taxRate);
  return {
    ...s,
    wallets: { ...s.wallets, [input.buyerId]: (s.wallets[input.buyerId] ?? 0) - l.price, [l.sellerId]: (s.wallets[l.sellerId] ?? 0) + l.price - tax },
    cards: s.cards.map((c) => (c.instanceId === l.instanceId ? { ...c, ownerId: input.buyerId, acquiredAt: input.now, via: 'market' } : c)),
    listings: s.listings.map((x) => (x.id === l.id ? { ...x, status: 'sold', buyerId: input.buyerId } : x)),
    txs: [...s.txs, { id: input.txId, listingId: l.id, at: input.now, sellerId: l.sellerId, buyerId: input.buyerId, price: l.price, tax, configVersion: config.version }],
  };
}

/** Controle voor audit/tests: totaal aan coins verandert alleen met de belasting; iedere kaart heeft één eigenaar. */
export function marketInvariants(before: MarketState, after: MarketState): string[] {
  const issues: string[] = [];
  const sum = (w: Record<string, number>) => Object.values(w).reduce((a, b) => a + b, 0);
  const taxed = after.txs.slice(before.txs.length).reduce((a, t) => a + t.tax, 0);
  if (sum(before.wallets) - taxed !== sum(after.wallets)) issues.push('Coins verdwenen of ontstaan buiten de belasting om.');
  if (Object.values(after.wallets).some((v) => v < 0)) issues.push('Negatief saldo.');
  const ids = after.cards.map((c) => c.instanceId);
  if (new Set(ids).size !== ids.length) issues.push('Kaart dubbel aanwezig.');
  if (after.cards.length !== before.cards.length) issues.push('Aantal kaarten veranderd.');
  return issues;
}
