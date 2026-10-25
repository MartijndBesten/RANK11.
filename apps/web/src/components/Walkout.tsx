import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { clubById, nationByCode, POSITION_LABEL, POSITION_NAME, RARITY_LABEL, type Player } from '@rank11/engine';
import { Flag } from './Flag';
import { Crest } from './Crest';
import { Portrait } from './Portrait';
import { PlayerCard, RIM } from './PlayerCard';
import { Sparks } from './Sparks';
import { sfx } from '../lib/sound';
import './walkout.css';

// licht, vlag, positie, club, silhouet, speler licht op (alleen met foto), kaart
const DURATIONS = [700, 1300, 1100, 1100, 1500, 1400, 0];

/**
 * Walkout-onthulling: licht → vlag → positie → club → silhouet → speler licht op → kaart.
 * Tikken versnelt naar de volgende stap; "Overslaan" toont meteen de kaart.
 */
export function Walkout({ player, reduced, onDone, doneLabel = 'Verder' }: { player: Player; reduced: boolean; onDone: () => void; doneLabel?: string }) {
  // Zonder foto is er geen 'licht op'-stap: dan volgt de kaart direct na het silhouet.
  const CARD = player.photo ? 6 : 5;
  const [stage, setStage] = useState(reduced ? CARD : 0);
  const timer = useRef<number | undefined>(undefined);
  const club = clubById(player.clubId);
  const nation = nationByCode(player.nation);
  const accent = RIM[player.rarity];

  useEffect(() => {
    if (stage >= CARD) return;
    const sounds = [sfx.rise, sfx.whoosh, sfx.whoosh, sfx.whoosh, sfx.rise, sfx.sparkle];
    sounds[stage]?.();
    timer.current = window.setTimeout(() => setStage((s) => s + 1), DURATIONS[stage]);
    return () => clearTimeout(timer.current);
  }, [stage, CARD]);

  useEffect(() => {
    if (stage === CARD && !reduced) {
      sfx.boom();
      setTimeout(sfx.sparkle, 250);
      setTimeout(sfx.reveal, 380);
    }
  }, [stage, reduced, CARD]);

  const advance = () => {
    if (stage < CARD) {
      clearTimeout(timer.current);
      setStage((s) => Math.min(CARD, s + 1));
    }
  };

  // Via een portal: een geanimeerde ouder (transform) zou position: fixed anders insluiten.
  return createPortal(
    <div className={`walkout stage-${stage} ${stage === CARD ? 'stage-card' : ''}`} style={{ ['--accent' as string]: accent }} onClick={advance}>
      <div className="wo-beams" aria-hidden="true">
        <i /><i /><i /><i />
      </div>
      <div className="wo-floor" aria-hidden="true" />
      {stage < CARD && (
        <button className="skip-btn" onClick={(e) => { e.stopPropagation(); clearTimeout(timer.current); setStage(CARD); }}>
          Overslaan
        </button>
      )}

      <div className="wo-stage" aria-live="polite">
        {stage >= 1 && stage < 5 && (
          <div className="wo-clue wo-flag" key="flag">
            <Flag code={player.nation} className="wo-flag-svg" />
            <span>{nation.name}</span>
          </div>
        )}
        {stage >= 2 && stage < 5 && (
          <div className="wo-clue wo-pos" key="pos">
            <b>{POSITION_LABEL[player.position]}</b>
            <span>{POSITION_NAME[player.position]}</span>
          </div>
        )}
        {stage >= 3 && stage < 5 && (
          <div className="wo-clue wo-club" key="club">
            <Crest data={club} className="wo-crest" />
            <span>{club.name}</span>
          </div>
        )}
        {(stage === 4 || (stage === 5 && CARD === 6)) && (
          <div className={`wo-silhouette ${player.photo ? 'photo' : ''} ${stage === 5 ? 'lit' : ''}`} key="sil">
            {player.photo ? (
              <img src={player.photo.src} alt="" draggable={false} />
            ) : (
              <Portrait data={player.portrait} club={club} silhouette rim={accent} />
            )}
          </div>
        )}
        {stage === CARD && (
          <div className="wo-reveal" key="card">
            <div className="wo-flash" aria-hidden="true" />
            <div className="wo-rarity eyebrow">{RARITY_LABEL[player.rarity]}</div>
            <PlayerCard player={player} size="xl" tilt className="wo-card" />
            <div className="wo-name">
              <span>{player.firstName}</span> {player.lastName}
            </div>
            <button className="btn" onClick={(e) => { e.stopPropagation(); onDone(); }}>{doneLabel}</button>
          </div>
        )}
      </div>
      <Sparks colors={[accent, '#ffffff', '#f2cf73']} trigger={stage === CARD ? 1 : 0} fountain count={160} disabled={reduced} />
    </div>,
    document.body,
  );
}
