/**
 * Snel verkopen: een kaart inleveren voor spelcoins (geen echt geld). Waarde naar rating en serie.
 * Gedeeld door app en server, zodat de getoonde opbrengst gelijk is aan wat de server bijschrijft.
 */
import type { Player } from './catalog.ts';

export function quickSellValue(p: Pick<Player, 'rating' | 'rarity'>): number {
  const base = p.rating >= 85 ? 2500 : p.rating >= 80 ? 900 : p.rating >= 75 ? 400 : p.rating >= 65 ? 150 : 60;
  return p.rarity === 'legend' ? base * 10 : ['special', 'exam', 'season'].includes(p.rarity) ? base * 3 : base;
}
