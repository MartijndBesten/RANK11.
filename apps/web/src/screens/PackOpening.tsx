import { useEffect, useRef, useState } from 'react';
import { isWalkout, PACKS, RARITY_LABEL, RARITY_RANK, type PackResult } from '@rank11/engine';
import { PackArt } from '../components/PackArt';
import { PlayerCard, RIM } from '../components/PlayerCard';
import { Walkout } from '../components/Walkout';
import { Sparks } from '../components/Sparks';
import { quickSellValue, useStore } from '../state/store';
import { useReducedMotion } from '../lib/motion';
import { sfx } from '../lib/sound';
import './opening.css';

type Stage = 'intro' | 'burst' | 'walkout' | 'grid';

export function PackOpening({ packId, onDone }: { packId: string; onDone: () => void }) {
  const { openPackFromInventory, quickSell, state } = useStore();
  const reduced = useReducedMotion();
  const def = PACKS[packId]!;
  const [result, setResult] = useState<PackResult | null>(null);
  const [ownedBefore] = useState(() => new Set(state.collection));
  const [stage, setStage] = useState<Stage>('intro');
  const [flipped, setFlipped] = useState(0);
  const [sold, setSold] = useState<number | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    Promise.resolve(openPackFromInventory(packId)).then((r) => {
      if (!r) onDone();
      else setResult(r);
    }, () => onDone());
  }, [openPackFromInventory, packId, onDone]);

  useEffect(() => {
    if (stage !== 'grid' || !result) return;
    if (reduced) { setFlipped(result.revealOrder.length); return; }
    const timers = result.revealOrder.map((_, i) => window.setTimeout(() => { setFlipped(i + 1); sfx.tick(); }, 250 + i * 220));
    return () => timers.forEach(clearTimeout);
  }, [stage, result, reduced]);

  if (!result) return <div className="opening" />;
  const best = result.best;
  const walkout = isWalkout(best);
  const tell = walkout ? RIM[best.rarity] : '#ffffff';
  const intensity = Math.min(3, RARITY_RANK[best.rarity] - 1);

  const open = () => {
    if (stage !== 'intro') return;
    sfx.whoosh();
    setStage('burst');
    setTimeout(() => {
      sfx.boom();
      setStage(walkout ? 'walkout' : 'grid');
    }, reduced ? 50 : 900);
  };

  const duplicates = result.revealOrder.filter((c) => ownedBefore.has(c.id));

  if (stage === 'walkout') {
    return <Walkout player={best} reduced={reduced} onDone={() => setStage('grid')} doneLabel="Bekijk alle kaarten" />;
  }

  return (
    <div className={`opening stage-${stage}`} style={{ ['--tell' as string]: tell, ['--shake' as string]: intensity }}>
      {stage === 'intro' && (
        <>
          <button className="skip-btn" onClick={() => setStage('grid')}>Overslaan</button>
          <div className="op-intro">
            <div className="eyebrow">{def.tagline}</div>
            <button className="op-pack" onClick={open} aria-label={`${def.name} openen`}>
              <div className="op-pack-glow" aria-hidden="true" />
              <PackArt theme={def.theme} name={def.name} className="op-pack-art" />
            </button>
            <div className="op-hint">Tik op de pack om te openen</div>
          </div>
        </>
      )}

      {stage === 'burst' && (
        <div className="op-burst" aria-hidden="true">
          <div className="op-pack-half top"><PackArt theme={def.theme} name={def.name} className="op-pack-art" /></div>
          <div className="op-pack-half bottom"><PackArt theme={def.theme} name={def.name} className="op-pack-art" /></div>
          <div className="op-light" />
        </div>
      )}

      {stage === 'grid' && (
        <div className="op-grid-wrap">
          <div className="op-grid-head">
            <div className="eyebrow">{def.name} geopend</div>
            <h2 className="display">{result.revealOrder.length} nieuwe spelers</h2>
          </div>
          <div className={`op-grid n${result.revealOrder.length}`}>
            {result.revealOrder.map((card, i) => (
              <div key={card.id + i} className={`op-slot ${card.id === best.id ? 'best' : ''}`}>
                <PlayerCard player={card} size={card.id === best.id ? 'lg' : 'md'} faceDown={i >= flipped} tilt={i < flipped} />
                {i < flipped && (
                  <div className="op-tag">
                    {RARITY_LABEL[card.rarity]}
                    {ownedBefore.has(card.id) && <em> · al in bezit</em>}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="op-actions">
            <p className="dim small">Alle kaarten staan in je collectie.</p>
            {duplicates.length > 0 && sold === null && (
              <button className="btn ghost small" onClick={async () => setSold(await quickSell(duplicates.map((d) => d.id)))}>
                Dubbele kaarten verkopen · {duplicates.reduce((s, d) => s + quickSellValue(d), 0).toLocaleString('nl-NL')} coins
              </button>
            )}
            {sold !== null && <p className="small" style={{ color: 'var(--up)' }}>+{sold.toLocaleString('nl-NL')} coins</p>}
            <button className="btn" onClick={onDone}>Klaar</button>
          </div>
          <Sparks colors={[RIM[best.rarity], '#fff']} trigger={flipped === result.revealOrder.length ? 1 : 0} count={60} disabled={reduced} />
        </div>
      )}
    </div>
  );
}
