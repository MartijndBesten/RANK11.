import { useState } from 'react';
import { generateCatalog, type Player, type Rarity } from '@rank11/engine';
import { Walkout } from './components/Walkout';
import { PlayerCard } from './components/PlayerCard';
import { PORTRAITS } from './portraits/registry';

/** Ontwikkelpagina (?gallery): voorbeeldkaarten en framevergelijking. */
const catalog = generateCatalog({ photos: PORTRAITS });
const s01 = catalog.find((p) => p.id === 'S01')!;
const l01 = catalog.find((p) => p.id === 'L01')!;
const as = (p: Player, rarity: Rarity, rating = p.rating): Player => ({ ...p, id: `${p.id}-${rarity}`, rarity, rating });

export function Gallery() {
  const frames: Player[] = [s01, as(s01, 'rare_gold', 88), as(s01, 'special', 91), l01];
  const [walk, setWalk] = useState<Player | null>(null);
  return (
    <div className="gallery">
      {walk && <Walkout player={walk} reduced={false} onDone={() => setWalk(null)} doneLabel="Sluiten" />}
      <div className="gallery-row">
        <button className="btn small" onClick={() => setWalk(s01)}>Walkout Hoekstra</button>
        <button className="btn small" onClick={() => setWalk(l01)}>Walkout Steenhuis</button>
      </div>
      <h2 className="display">Voorbeeldkaarten</h2>
      <div className="gallery-row">
        <PlayerCard player={s01} size="xl" tilt />
        <PlayerCard player={l01} size="xl" tilt />
      </div>
      <h2 className="display">Frames: Gold · Rare · Electric · Legend</h2>
      <div className="gallery-row">
        {frames.map((p) => <PlayerCard key={p.id} player={p} size="lg" tilt />)}
      </div>
      <h2 className="display">Kleine maten (elftal, collectie)</h2>
      <div className="gallery-row">
        {frames.map((p) => <PlayerCard key={p.id + 's'} player={p} size="sm" />)}
        {frames.map((p) => <PlayerCard key={p.id + 'x'} player={p} size="xs" />)}
      </div>
    </div>
  );
}
