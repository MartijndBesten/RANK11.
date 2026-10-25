import { useMemo } from 'react';
import { chemistry, DRAFT_EVENTS, FORMATIONS, PACKS, pityRemaining, teamRating, type Lineup } from '@rank11/engine';
import type { Nav } from '../App';
import { CARD_BY_ID, useStore } from '../state/store';
import { PlayerCard } from '../components/PlayerCard';
import { PackArt } from '../components/PackArt';
import { IconClock, IconVault } from '../components/Icons';
import { Countdown } from '../components/Countdown';
import './hub.css';

export function useLineup() {
  const { state } = useStore();
  return useMemo(() => {
    const formation = FORMATIONS[state.formationId] ?? FORMATIONS['4-3-3']!;
    const lineup: Lineup = {};
    for (const [slot, id] of Object.entries(state.lineup)) lineup[slot] = CARD_BY_ID.get(id);
    return { formation, lineup, rating: teamRating(formation, lineup), chem: chemistry(formation, lineup) };
  }, [state.formationId, state.lineup]);
}

export const DRAFT_END = new Date('2026-11-01T18:00:00+01:00');

export function Hub({ nav }: { nav: Nav }) {
  const { state, reset } = useStore();
  const { rating, chem } = useLineup();
  const event = DRAFT_EVENTS.toetsweek1!;
  const pity = pityRemaining(event, state.pity);
  const featured = event.featured.map((id) => CARD_BY_ID.get(id)!).filter(Boolean);
  const packEntries = Object.entries(state.packs).filter(([, n]) => n > 0);
  const pending = state.pending.length;

  return (
    <div className="hub">
      <section className={`hub-vault ${pending ? 'has-new' : ''}`} onClick={() => nav.go('vault')} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && nav.go('vault')}>
        <div className="hub-vault-door" aria-hidden="true">
          <div className="door-ring" />
          <div className="door-core"><IconVault /></div>
          {pending > 0 && <div className="door-count num">{pending}</div>}
        </div>
        <div className="hub-vault-copy">
          <div className="eyebrow">Cijferkluis</div>
          <h2 className="display">{pending ? <>{pending} {pending === 1 ? 'nieuw cijfer' : 'nieuwe cijfers'}</> : 'Alles onthuld'}</h2>
          <p className="dim">{pending ? 'Welke speler heb jij verdiend?' : 'Nieuwe cijfers verschijnen hier zodra ze binnen zijn.'}</p>
          {pending > 0 && <span className="btn small">Open de kluis</span>}
        </div>
      </section>

      <section className="hub-event" onClick={() => nav.go('draft')} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && nav.go('draft')}>
        <div className="hub-event-cards" aria-hidden="true">
          {featured.map((p, i) => (
            <PlayerCard key={p.id} player={p} size="sm" className={`fan fan-${i}`} />
          ))}
        </div>
        <div className="hub-event-copy">
          <div className="eyebrow lime">Event · Toetsweek 1</div>
          <h2 className="display">{event.name}</h2>
          <div className="hub-event-meta">
            <span><IconClock width={16} height={16} /> <Countdown to={DRAFT_END} /></span>
            <span>Groep B+ gegarandeerd over&nbsp;<b className="num" style={{ whiteSpace: 'nowrap' }}>{pity.B} drafts</b></span>
          </div>
        </div>
      </section>

      <div className="hub-tiles">
        <section className="hub-tile" onClick={() => nav.go('packs')} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && nav.go('packs')}>
          <div className="eyebrow">Mijn packs</div>
          <div className="hub-packs">
            {packEntries.length ? (
              packEntries.slice(0, 3).map(([id, n]) => (
                <div key={id} className="hub-pack">
                  <PackArt theme={PACKS[id]!.theme} name={PACKS[id]!.name} className="pack-mini" />
                  {n > 1 && <span className="hub-pack-n">×{n}</span>}
                </div>
              ))
            ) : (
              <p className="dim small">Geen ongeopende packs. Verdien ze met je cijfers.</p>
            )}
          </div>
        </section>
        <section className="hub-tile" onClick={() => nav.go('squad')} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && nav.go('squad')}>
          <div className="eyebrow">Mijn elftal</div>
          <div className="hub-squad">
            <div>
              <div className="hub-big num">{rating}</div>
              <div className="dim small">Teamrating</div>
            </div>
            <div>
              <div className="hub-big num">{chem.total}<small>/{chem.max}</small></div>
              <div className="dim small">Chemie</div>
            </div>
          </div>
        </section>
      </div>

      <footer className="hub-foot">
        <span className="proto-tag">Prototype · demo-data, alleen op dit toestel</span>
        <button className="link-btn" onClick={() => { if (confirm('Demo opnieuw beginnen? Je lokale voortgang wordt gewist.')) reset(); }}>
          Demo opnieuw beginnen
        </button>
      </footer>
    </div>
  );
}
