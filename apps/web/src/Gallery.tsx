import { generateCatalog, type Rarity } from '@rank11/engine';
import { PlayerCard } from './components/PlayerCard';

const catalog = generateCatalog();
const order: Rarity[] = ['bronze', 'silver', 'gold', 'rare_gold', 'season', 'exam', 'special', 'legend'];

export function Gallery() {
  const picks = order.map((r) => catalog.filter((p) => p.rarity === r).sort((a, b) => b.rating - a.rating)[0]!);
  return (
    <div style={{ position: 'relative', zIndex: 1, padding: 24, display: 'flex', flexWrap: 'wrap', gap: 20, height: '100%', overflow: 'auto' }}>
      {picks.map((p) => <PlayerCard key={p.id} player={p} size="lg" tilt />)}
      {picks.slice(0, 6).map((p) => <PlayerCard key={p.id + 's'} player={p} size="sm" />)}
      <PlayerCard player={picks[2]!} size="md" faceDown />
    </div>
  );
}
