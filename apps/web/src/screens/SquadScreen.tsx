import { useMemo, useState } from 'react';
import {
  autoBestLineup, candidatesForSlot, chemistry, effectiveRating, FORMATIONS, POSITION_LABEL, POSITION_NAME, RARITY_LABEL,
  RARITY_RANK, remapLineup, STAT_KEYS, STAT_LABEL, teamRating, type Fit, type Formation, type Lineup, type Player, type Rarity,
} from '@rank11/engine';
import type { Nav } from '../App';
import { CARD_BY_ID, useStore } from '../state/store';
import { Pitch } from '../components/Pitch';
import { PlayerCard } from '../components/PlayerCard';
import { Sheet } from '../components/Sheet';
import { sfx } from '../lib/sound';
import './squad.css';
import { Help } from '../components/Help';

const BENCH = ['bench0', 'bench1', 'bench2', 'bench3', 'bench4', 'bench5', 'bench6'];
const FIT_LABEL: Record<Fit, string> = { exact: 'Positie', alt: 'Alternatief', related: 'Verwant −3', off: 'Uit positie' };

function toIds(lineup: Lineup): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, p] of Object.entries(lineup)) if (p) out[k] = p.id;
  return out;
}

function withBench(formation: Formation, starters: Lineup, owned: Player[]): Lineup {
  const used = new Set(formation.slots.map((s) => starters[s.id]?.baseId).filter(Boolean));
  const rest = owned.filter((p) => !used.has(p.baseId)).sort((a, b) => b.rating - a.rating);
  const bench: Lineup = {};
  const seen = new Set<string>();
  let i = 0;
  for (const p of rest) {
    if (i >= BENCH.length) break;
    if (seen.has(p.baseId)) continue;
    seen.add(p.baseId);
    bench[BENCH[i++]!] = p;
  }
  return { ...starters, ...bench };
}

export function SquadScreen(_: { nav: Nav }) {
  const { state, owned, setLineup } = useStore();
  const formation = FORMATIONS[state.formationId] ?? FORMATIONS['4-3-3']!;
  const lineup: Lineup = useMemo(() => {
    const l: Lineup = {};
    for (const [k, id] of Object.entries(state.lineup)) l[k] = CARD_BY_ID.get(id);
    return l;
  }, [state.lineup]);
  const [slot, setSlot] = useState<string | null>(null);
  const [benchSwap, setBenchSwap] = useState<string | null>(null);
  const [showCollection, setShowCollection] = useState(false);

  const rating = teamRating(formation, lineup);
  const chem = chemistry(formation, lineup);
  const bench = BENCH.map((b) => ({ id: b, p: lineup[b] }));

  const commit = (f: Formation, l: Lineup) => setLineup(f.id, toIds(l));

  const place = (slotId: string, p: Player) => {
    sfx.tap();
    const next: Lineup = { ...lineup };
    // Staat de speler al ergens (bank of veld)? Dan wisselen.
    const from = Object.entries(next).find(([, x]) => x?.baseId === p.baseId)?.[0];
    if (from) next[from] = lineup[slotId];
    next[slotId] = p;
    commit(formation, next);
    setSlot(null);
  };

  const best = () => {
    sfx.reveal();
    const starters = autoBestLineup(formation, owned);
    commit(formation, withBench(formation, starters, owned));
  };

  const changeFormation = (id: string) => {
    const to = FORMATIONS[id]!;
    if (to.id === formation.id) return;
    sfx.tap();
    const starters = remapLineup(formation, to, lineup);
    const benchOnly: Lineup = {};
    for (const b of BENCH) benchOnly[b] = lineup[b];
    commit(to, { ...starters, ...benchOnly });
  };

  return (
    <div className="screen squad">
      <header className="squad-head">
        <div>
          <div className="eyebrow">Ultimate Team</div>
          <h1 className="display">Mijn elftal</h1>
        </div>
        <div className="squad-meters">
          <div className="meter">
            <b className="num">{rating}</b>
            <span>Teamrating</span>
          </div>
          <div className="meter">
            <b className="num">{chem.total}<small>/{chem.max}</small></b>
            <span>Chemie</span>
            <div className="chem-bar"><i style={{ width: `${(chem.total / chem.max) * 100}%` }} /></div>
          </div>
        </div>
      </header>
      <Help id="elftal" />

      <div className="squad-layout">
        <div className="squad-pitch-col">
          <div className="formations" role="radiogroup" aria-label="Formatie">
            {Object.values(FORMATIONS).map((f) => (
              <button key={f.id} role="radio" aria-checked={f.id === formation.id} className={f.id === formation.id ? 'on' : ''} onClick={() => changeFormation(f.id)}>{f.name}</button>
            ))}
          </div>
          <Pitch
            formation={formation}
            lineup={lineup}
            cardSize="sm"
            chem={chem.perSlot}
            activeSlot={slot}
            onSlot={(id) => { sfx.tap(); setSlot(id); }}
            effective={(id) => {
              const p = lineup[id];
              const s = formation.slots.find((x) => x.id === id);
              return p && s ? effectiveRating(p, s.position) : undefined;
            }}
          />
        </div>

        <aside className="squad-side">
          <div className="squad-actions">
            <button className="btn small" onClick={best}>Beste elftal</button>
            <button className="btn ghost small" onClick={() => setShowCollection(true)}>Collectie · {owned.length}</button>
          </div>
          <div className="bench">
            <div className="eyebrow">Reservebank</div>
            <div className="bench-row">
              {bench.map(({ id, p }) => (
                <button key={id} className="bench-slot" onClick={() => p ? setBenchSwap(id) : setSlot(id)} aria-label={p ? `Reserve ${p.lastName}, wisselen` : 'Lege reserveplek'}>
                  {p ? <PlayerCard player={p} size="xs" /> : <div className="pitch-empty"><span>+</span></div>}
                </button>
              ))}
            </div>
          </div>
          <p className="dim small">Tik op een speler om te wisselen of te vergelijken. Spelers uit positie verliezen rating; chemie komt van clubgenoten, landgenoten en de juiste positie.</p>
        </aside>
      </div>

      {slot && (
        <SlotSheet
          formation={formation}
          lineup={lineup}
          slotId={slot}
          owned={owned}
          onClose={() => setSlot(null)}
          onPick={(p) => place(slot, p)}
        />
      )}

      {benchSwap && lineup[benchSwap] && (
        <Sheet title={`${lineup[benchSwap]!.lastName} inbrengen`} onClose={() => setBenchSwap(null)}>
          <p className="dim small" style={{ marginTop: 0 }}>Kies wie er naar de bank gaat.</p>
          <div className="cand-list">
            {formation.slots.map((s) => {
              const cur = lineup[s.id];
              const incoming = lineup[benchSwap]!;
              const eff = effectiveRating(incoming, s.position);
              return (
                <button key={s.id} className="cand" onClick={() => { place(s.id, incoming); setBenchSwap(null); }}>
                  <span className="cand-pos">{POSITION_LABEL[s.position]}</span>
                  <span className="cand-name">{cur ? cur.lastName : 'Leeg'}<small className="dim">{cur ? `${cur.rating} → ${incoming.lastName} ${eff}` : ''}</small></span>
                  <span className={`cand-delta num ${cur && eff > effectiveRating(cur, s.position) ? 'up' : cur && eff < effectiveRating(cur, s.position) ? 'down' : ''}`}>
                    {cur ? `${eff - effectiveRating(cur, s.position) >= 0 ? '+' : ''}${eff - effectiveRating(cur, s.position)}` : `+${eff}`}
                  </span>
                </button>
              );
            })}
          </div>
        </Sheet>
      )}

      {showCollection && <CollectionSheet owned={owned} onClose={() => setShowCollection(false)} />}
    </div>
  );
}

function SlotSheet({ formation, lineup, slotId, owned, onClose, onPick }: {
  formation: Formation; lineup: Lineup; slotId: string; owned: Player[]; onClose: () => void; onPick: (p: Player) => void;
}) {
  const isBench = slotId.startsWith('bench');
  const slot = formation.slots.find((s) => s.id === slotId);
  const current = lineup[slotId];
  const [compare, setCompare] = useState<string | null>(null);
  const list = useMemo(() => {
    if (slot) return candidatesForSlot(formation, lineup, slotId, owned);
    const onPitch = new Set(formation.slots.map((s) => lineup[s.id]?.baseId));
    return owned.filter((p) => !onPitch.has(p.baseId)).sort((a, b) => b.rating - a.rating).map((player) => ({ player, effective: player.rating, fit: 'exact' as Fit }));
  }, [formation, lineup, slotId, owned, slot]);
  const unique = list.filter((c, i) => list.findIndex((x) => x.player.id === c.player.id) === i).slice(0, 40);
  const curEff = current && slot ? effectiveRating(current, slot.position) : current?.rating ?? 0;

  return (
    <Sheet title={isBench ? 'Reserve kiezen' : `${POSITION_NAME[slot!.position]}`} onClose={onClose}>
      {current && (
        <div className="cur-row">
          <PlayerCard player={current} size="xs" />
          <div><div className="eyebrow">Nu</div><b>{current.firstName} {current.lastName}</b><div className="dim small">{RARITY_LABEL[current.rarity]} · {curEff}</div></div>
        </div>
      )}
      <div className="cand-list">
        {unique.map(({ player, effective, fit }) => {
          const delta = effective - curEff;
          const open = compare === player.id;
          return (
            <div key={player.id} className={`cand-wrap ${open ? 'open' : ''}`}>
              <button className="cand" onClick={() => setCompare(open ? null : player.id)} aria-expanded={open}>
                <PlayerCard player={player} size="xs" />
                <span className="cand-name">
                  {player.firstName} {player.lastName}
                  <small className="dim">{POSITION_LABEL[player.position]} · {RARITY_LABEL[player.rarity]} · <span className={`fit fit-${fit}`}>{FIT_LABEL[fit]}</span></small>
                </span>
                <span className="cand-eff num">{effective}</span>
                {current && <span className={`cand-delta num ${delta > 0 ? 'up' : delta < 0 ? 'down' : ''}`}>{delta > 0 ? '+' : ''}{delta}</span>}
              </button>
              {open && (
                <div className="compare">
                  {STAT_KEYS.map((k) => {
                    const d = current ? player.stats[k] - current.stats[k] : 0;
                    return (
                      <div key={k} className="cmp">
                        <span>{STAT_LABEL[k]}</span>
                        <b className="num">{player.stats[k]}</b>
                        {current && <em className={`num ${d > 0 ? 'up' : d < 0 ? 'down' : ''}`}>{d > 0 ? '+' : ''}{d}</em>}
                      </div>
                    );
                  })}
                  <button className="btn small" onClick={() => onPick(player)}>Plaatsen</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}

const FILTERS: (Rarity | 'all')[] = ['all', 'legend', 'special', 'exam', 'season', 'rare_gold', 'gold', 'silver', 'bronze'];

function CollectionSheet({ owned, onClose }: { owned: Player[]; onClose: () => void }) {
  const [filter, setFilter] = useState<Rarity | 'all'>('all');
  const shown = owned.filter((p) => filter === 'all' || p.rarity === filter).sort((a, b) => RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity] || b.rating - a.rating);
  return (
    <Sheet title={`Collectie · ${owned.length}`} onClose={onClose}>
      <div className="filters">
        {FILTERS.filter((f) => f === 'all' || owned.some((p) => p.rarity === f)).map((f) => (
          <button key={f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>{f === 'all' ? 'Alles' : RARITY_LABEL[f]}</button>
        ))}
      </div>
      <div className="coll-grid">
        {shown.map((p, i) => <PlayerCard key={p.id + i} player={p} size="sm" />)}
      </div>
    </Sheet>
  );
}
