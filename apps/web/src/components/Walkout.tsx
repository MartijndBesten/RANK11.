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

const DURATIONS = [700, 1300, 1100, 1100, 1300, 0];

/**
 * Walkout-onthulling: licht → vlag → positie → club → silhouet → kaart.
 * Tikken versnelt naar de volgende stap; "Overslaan" toont meteen de kaart.
 */
export function Walkout({ player, reduced, onDone, doneLabel = 'Verder' }: { player: Player; reduced: boolean; onDone: () => void; doneLabel?: string }) {
  const [stage, setStage] = useState(reduced ? 5 : 0);
  const timer = useRef<number | undefined>(undefined);
  const club = clubById(player.clubId);
  const nation = nationByCode(player.nation);
  const accent = RIM[player.rarity];

  useEffect(() => {
    if (stage >= 5) return;
    const sounds = [sfx.rise, sfx.whoosh, sfx.whoosh, sfx.whoosh, sfx.rise];
    sounds[stage]?.();
    timer.current = window.setTimeout(() => setStage((s) => s + 1), DURATIONS[stage]);
    return () => clearTimeout(timer.current);
  }, [stage]);

  useEffect(() => {
    if (stage === 5 && !reduced) {
      sfx.boom();
      setTimeout(sfx.sparkle, 250);
      setTimeout(sfx.reveal, 380);
    }
  }, [stage, reduced]);

  const advance = () => {
    if (stage < 5) {
      clearTimeout(timer.current);
      setStage((s) => Math.min(5, s + 1));
    }
  };

  // Via een portal: een geanimeerde ouder (transform) zou position: fixed anders insluiten.
  return createPortal(
    <div className={`walkout stage-${stage}`} style={{ ['--accent' as string]: accent }} onClick={advance}>
      <div className="wo-beams" aria-hidden="true">
        <i /><i /><i /><i />
      </div>
      <div className="wo-floor" aria-hidden="true" />
      {stage < 5 && (
        <button className="skip-btn" onClick={(e) => { e.stopPropagation(); clearTimeout(timer.current); setStage(5); }}>
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
        {stage === 4 && (
          <div className="wo-silhouette" key="sil">
            <Portrait data={player.portrait} club={club} silhouette rim={accent} />
          </div>
        )}
        {stage === 5 && (
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
      <Sparks colors={[accent, '#ffffff', '#f2cf73']} trigger={stage === 5 ? 1 : 0} fountain count={160} disabled={reduced} />
    </div>,
    document.body,
  );
}
