import { useEffect, useMemo, useState } from 'react';
import {
  chemistry, DRAFT_EVENTS, draftFormation, draftLineup, draftOdds, effectiveRating, groupOf, nextOpenSlot, pickDraft,
  pityRemaining, POSITION_NAME, teamRating, type DraftSession, type Player,
} from '@rank11/engine';
import type { Nav } from '../App';
import { CARD_BY_ID, useStore } from '../state/store';
import { PlayerCard } from '../components/PlayerCard';
import { Pitch } from '../components/Pitch';
import { Sheet } from '../components/Sheet';
import { Countdown } from '../components/Countdown';
import { IconClock, IconInfo, IconLock, IconVoucher } from '../components/Icons';
import { Sparks } from '../components/Sparks';
import { DRAFT_END } from './Hub';
import { useReducedMotion } from '../lib/motion';
import { sfx } from '../lib/sound';
import './draft.css';

const event = DRAFT_EVENTS.toetsweek1!;

const OTHER_EVENTS = [
  { id: 'legends', name: 'Legends Draft', note: 'Vanaf niveau 12' },
  { id: 'final', name: 'Jaarfinale Draft', note: 'Na toetsweek 4' },
];

export function DraftScreen({ nav }: { nav: Nav }) {
  const { state, startDraft } = useStore();
  const [session, setSession] = useState<DraftSession | null>(null);
  const [odds, setOdds] = useState(false);

  if (session) {
    return <DraftPicking session={session} setSession={setSession} onExit={() => { setSession(null); nav.setImmersive(false); }} />;
  }

  const pity = pityRemaining(event, state.pity);
  const featured = event.featured.map((id) => CARD_BY_ID.get(id)!).filter(Boolean);

  return (
    <div className="draft-lobby">
      <aside className="draft-events" aria-label="Draft-events">
        <button className="draft-event active" aria-current="true">
          <span className="de-tag">Nieuw</span>
          <b>{event.name}</b>
          <small>Toetsweek 1</small>
        </button>
        {OTHER_EVENTS.map((e) => (
          <button key={e.id} className="draft-event locked" disabled>
            <IconLock width={14} height={14} />
            <b>{e.name}</b>
            <small>{e.note}</small>
          </button>
        ))}
      </aside>

      <section className="draft-hero">
        <div className="draft-title">
          <div className="eyebrow lime">Ultimate Draft</div>
          <h1 className="display">{event.name}</h1>
          <div className="draft-meta">
            <span><IconClock width={16} height={16} /> Eindigt over <Countdown to={DRAFT_END} /></span>
            <button className="draft-odds-btn" onClick={() => setOdds(true)}><IconInfo width={16} height={16} /> Kansen</button>
          </div>
        </div>

        <div className="draft-featured" aria-label="Uitgelichte sterspelers">
          {featured.map((p, i) => (
            <div key={p.id} className={`df-card df-${i}`}>
              <div className="df-name display" aria-hidden="true">{p.lastName}</div>
              <PlayerCard player={p} size="lg" tilt />
            </div>
          ))}
        </div>

        <div className="draft-cta">
          <div className="draft-guarantees">
            <div className="guarantee"><span className="g-chip g-b">Groep B</span> of hoger gegarandeerd over <b className="num">{pity.B}</b> drafts</div>
            <div className="guarantee"><span className="g-chip g-a">Groep A</span> gegarandeerd over <b className="num">{pity.A}</b> drafts</div>
          </div>
          <button
            className="btn"
            disabled={state.vouchers < event.voucherCost}
            onClick={() => {
              const s = startDraft();
              if (s) { sfx.whoosh(); setSession(s); nav.setImmersive(true); }
            }}
          >
            Start draft <span className="cost"><IconVoucher /> {event.voucherCost}</span>
          </button>
          <p className="dim small draft-note">
            {state.vouchers < event.voucherCost ? 'Geen vouchers meer. Verdien ze met een 7,5 of hoger.' : `Je hebt ${state.vouchers} voucher${state.vouchers === 1 ? '' : 's'}. `}
            Draftkaarten zijn tijdelijk en komen niet in je collectie.
          </p>
        </div>
      </section>

      {odds && (
        <Sheet title="Kansen · Ultimate Draft" onClose={() => setOdds(false)}>
          <table className="odds">
            <thead><tr><th>Groep</th><th className="n">Per aangeboden kaart</th></tr></thead>
            <tbody>
              {draftOdds(event).map((o) => (
                <tr key={o.groupId}>
                  <td>{event.groups.find((g) => g.id === o.groupId)?.label}</td>
                  <td className="n">{o.chance < 0.001 ? `${(o.chance * 100).toFixed(2).replace('.', ',')}%` : `${(o.chance * 100).toFixed(1).replace('.', ',')}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="odds-note">
            Per draft zie je 55 kaarten (11 posities × 5). Garantie: uiterlijk bij de {event.pity.find((p) => p.groupId === 'B')?.every}e draft minstens één kaart uit Groep B of hoger,
            bij de {event.pity.find((p) => p.groupId === 'A')?.every}e uit Groep A. De teller gaat terug naar nul zodra je zo'n kaart te zien krijgt.
          </p>
        </Sheet>
      )}
    </div>
  );
}

function DraftPicking({ session, setSession, onExit }: { session: DraftSession; setSession: (s: DraftSession) => void; onExit: () => void }) {
  const reduced = useReducedMotion();
  const formation = draftFormation(session);
  const lineup = draftLineup(session);
  const slot = nextOpenSlot(session);
  const [selected, setSelected] = useState<string | null>(null);
  const [flipped, setFlipped] = useState(0);
  const rating = teamRating(formation, lineup);
  const chem = chemistry(formation, lineup);
  const picked = session.slots.filter((s) => s.pickedId).length;

  // Kaarten één voor één omdraaien; topgroep als laatste voor spanning.
  const offers = useMemo(() => {
    if (!slot) return [];
    return [...slot.offers].sort((a, b) => (groupOf(event, b)?.rank ?? 9) - (groupOf(event, a)?.rank ?? 9));
  }, [slot]);

  useEffect(() => {
    setSelected(null);
    if (!slot) return;
    if (reduced) { setFlipped(offers.length); return; }
    setFlipped(0);
    const timers = offers.map((p, i) => window.setTimeout(() => {
      setFlipped(i + 1);
      const rank = groupOf(event, p)?.rank ?? 9;
      if (rank <= 1) sfx.sparkle(); else sfx.tick();
    }, 250 + i * 170));
    return () => timers.forEach(clearTimeout);
  }, [slot?.slotId, reduced, offers, slot]);

  if (!slot) return <DraftDone session={session} onExit={onExit} rating={rating} chem={chem.total} />;

  const choose = (p: Player) => {
    sfx.reveal();
    setSession(pickDraft(session, slot.slotId, p.id));
  };

  return (
    <div className="draft-pick">
      <header className="dp-head">
        <button className="link-btn" onClick={() => { if (confirm('Draft verlaten? Je voucher is al gebruikt.')) onExit(); }}>Verlaten</button>
        <div className="dp-step">
          <div className="eyebrow">Positie {picked + 1} van 11</div>
          <h2 className="display">Kies je {POSITION_NAME[slot.position].toLowerCase()}</h2>
        </div>
        <div className="dp-stats">
          <div><b className="num">{rating}</b><span>Rating</span></div>
          <div><b className="num">{chem.total}</b><span>Chemie</span></div>
        </div>
      </header>

      <div className="dp-body">
        <div className="dp-pitch">
          <Pitch formation={formation} lineup={lineup} activeSlot={slot.slotId} chem={chem.perSlot} />
        </div>
        <div className="dp-offers" role="listbox" aria-label={`Keuzes voor ${POSITION_NAME[slot.position]}`}>
          {offers.map((p, i) => {
            const grp = groupOf(event, p);
            const isSel = selected === p.id;
            const up = i < flipped;
            return (
              <div key={p.id} className={`dp-offer ${isSel ? 'sel' : ''} ${up && (grp?.rank ?? 9) <= 1 ? 'top-group' : ''}`} role="option" aria-selected={isSel}>
                {up && grp && <span className={`g-chip g-${grp.id.toLowerCase()}`}>{grp.label.split(' · ')[0]}</span>}
                <PlayerCard
                  player={p}
                  size="md"
                  faceDown={!up}
                  tilt={up}
                  selected={isSel}
                  effective={effectiveRating(p, slot.position)}
                  onClick={up ? () => { sfx.tap(); setSelected(isSel ? null : p.id); } : undefined}
                />
                {isSel && <button className="btn small dp-choose" onClick={() => choose(p)}>Kies</button>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DraftDone({ session, onExit, rating, chem }: { session: DraftSession; onExit: () => void; rating: number; chem: number }) {
  const { state } = useStore();
  const reduced = useReducedMotion();
  const formation = draftFormation(session);
  const lineup = draftLineup(session);
  const [shown, setShown] = useState(reduced ? rating : 0);
  useEffect(() => {
    if (reduced) return;
    sfx.rise();
    let v = 40;
    const t = setInterval(() => {
      v += Math.max(1, Math.round((rating - v) / 6));
      if (v >= rating) { v = rating; clearInterval(t); sfx.boom(); }
      setShown(v);
    }, 45);
    return () => clearInterval(t);
  }, [rating, reduced]);

  return (
    <div className="draft-done">
      <div className="dd-head">
        <div className="eyebrow lime">Draft voltooid</div>
        <div className="dd-rating num">{shown}</div>
        <div className="dd-sub">Teamrating · Chemie {chem}/33</div>
      </div>
      <div className="dd-pitch">
        <Pitch formation={formation} lineup={lineup} cardSize="sm" />
      </div>
      <div className="dd-actions">
        <button className="btn" disabled title="Toernooien worden gebouwd na goedkeuring van het ontwerp">Draft-toernooi · volgt in fase 5</button>
        <button className="btn ghost small" onClick={onExit}>Terug naar lobby</button>
      </div>
      <p className="dim small" style={{ textAlign: 'center', maxWidth: 420 }}>
        Dit draftteam is tijdelijk. {state.vouchers > 0 ? `Nog ${state.vouchers} voucher${state.vouchers === 1 ? '' : 's'} over.` : ''}
      </p>
      <Sparks colors={['#b8ff3c', '#fff', '#7c3aed']} trigger={shown === rating ? 1 : 0} fountain count={120} disabled={reduced} />
    </div>
  );
}
