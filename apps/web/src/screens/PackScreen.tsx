import { useState } from 'react';
import { PACKS } from '@rank11/engine';
import type { Nav } from '../App';
import { useStore } from '../state/store';
import { PackArt } from '../components/PackArt';
import { Sheet } from '../components/Sheet';
import { PackOdds } from '../components/PackOdds';
import { IconCoin, IconInfo } from '../components/Icons';
import './packs.css';
import { Help } from '../components/Help';

export function PackScreen({ nav }: { nav: Nav }) {
  const { state, buyPack } = useStore();
  const [odds, setOdds] = useState<string | null>(null);
  const mine = Object.entries(state.packs).filter(([, n]) => n > 0);
  const shop = Object.values(PACKS).filter((p) => p.coinPrice);

  return (
    <div className="packs">
      <header className="screen-head">
        <div className="eyebrow">Packs</div>
        <h1 className="display">Mijn packs</h1>
      </header>
      <Help id="packs" />

      {mine.length === 0 ? (
        <div className="panel empty">
          <p>Je hebt geen ongeopende packs.</p>
          <p className="dim small">Haal een voldoende in de Cijferkluis of koop er een met spelcoins.</p>
        </div>
      ) : (
        <div className="pack-row">
          {mine.map(([id, n]) => {
            const def = PACKS[id]!;
            return (
              <article key={id} className={`pack-card theme-${def.theme}`}>
                <button className="pack-card-art" onClick={() => nav.openPack(id)} aria-label={`${def.name} openen`}>
                  <PackArt theme={def.theme} name={def.name} />
                  {n > 1 && <span className="pack-count num">×{n}</span>}
                </button>
                <div className="pack-card-body">
                  <h3>{def.name}</h3>
                  <p className="dim small">{def.tagline}</p>
                  <div className="pack-card-actions">
                    <button className="btn small" onClick={() => nav.openPack(id)}>Openen</button>
                    <button className="icon-btn" onClick={() => setOdds(id)} aria-label={`Kansen ${def.name}`}><IconInfo /></button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <header className="screen-head sub">
        <div className="eyebrow">Winkel · alleen spelcoins</div>
      </header>
      <div className="shop">
        {shop.map((def) => (
          <article key={def.id} className="shop-item">
            <PackArt theme={def.theme} name={def.name} className="shop-art" />
            <div>
              <h3>{def.name}</h3>
              <p className="dim small">{def.tagline}</p>
              <div className="pack-card-actions">
                <button className="btn ghost small" disabled={state.coins < (def.coinPrice ?? 0)} onClick={() => buyPack(def.id)}>
                  <IconCoin width={18} height={18} /> {def.coinPrice?.toLocaleString('nl-NL')}
                </button>
                <button className="icon-btn" onClick={() => setOdds(def.id)} aria-label={`Kansen ${def.name}`}><IconInfo /></button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {odds && (
        <Sheet title={`Kansen · ${PACKS[odds]!.name}`} onClose={() => setOdds(null)}>
          <PackOdds def={PACKS[odds]!} />
        </Sheet>
      )}
    </div>
  );
}
