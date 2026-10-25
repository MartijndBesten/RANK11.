import { memo, useRef, type CSSProperties, type PointerEvent } from 'react';
import {
  clubById, nationByCode, POSITION_LABEL, RARITY_LABEL, STAT_KEYS, STAT_LABEL, type Player, type Rarity,
} from '@rank11/engine';
import { Portrait } from './Portrait';
import { Flag } from './Flag';
import { Crest } from './Crest';
import './card.css';

export type CardSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export const RIM: Record<Rarity, string> = {
  bronze: '#ffd2a8',
  silver: '#ffffff',
  gold: '#fff3c4',
  rare_gold: '#fff6d6',
  special: '#7ff0ff',
  exam: '#c8ff5a',
  season: '#7dffd2',
  champion: '#ffd76a',
  legend: '#fff7e0',
};

interface Props {
  player: Player;
  size?: CardSize;
  tilt?: boolean;
  /** Toon de achterkant (dicht). */
  faceDown?: boolean;
  className?: string;
  style?: CSSProperties;
  effective?: number;
  onClick?: () => void;
  selected?: boolean;
  label?: string;
}

export const PlayerCard = memo(function PlayerCard({
  player, size = 'md', tilt = false, faceDown = false, className = '', style, effective, onClick, selected, label,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const club = clubById(player.clubId);
  const nation = nationByCode(player.nation);

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!tilt || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    ref.current.style.setProperty('--rx', `${(0.5 - y) * 14}deg`);
    ref.current.style.setProperty('--ry', `${(x - 0.5) * 18}deg`);
    ref.current.style.setProperty('--mx', `${x * 100}%`);
    ref.current.style.setProperty('--my', `${y * 100}%`);
  };
  const onLeave = () => {
    if (!ref.current) return;
    ref.current.style.setProperty('--rx', '0deg');
    ref.current.style.setProperty('--ry', '0deg');
  };

  const Tag = onClick ? 'button' : 'div';
  const shown = effective ?? player.rating;
  const ariaLabel = label ?? `${player.firstName} ${player.lastName}, ${RARITY_LABEL[player.rarity]}, rating ${player.rating}, ${POSITION_LABEL[player.position]}`;

  return (
    <Tag
      className={`pc-wrap size-${size} ${selected ? 'is-selected' : ''} ${className}`}
      style={style}
      onClick={onClick}
      aria-label={ariaLabel}
      type={onClick ? 'button' : undefined}
    >
      <div ref={ref} className={`pc ${tilt ? 'tilt' : ''} ${faceDown ? 'down' : ''}`} onPointerMove={onMove} onPointerLeave={onLeave} data-rarity={player.rarity}>
        <div className="pc-face pc-front" aria-hidden="true">
          <div className="pc-bg" />
          <div className="pc-pattern" />
          <div className="pc-art">
            <Portrait className="pc-portrait" data={player.portrait} club={club} rim={RIM[player.rarity]} />
            <div className="pc-shade" />
          </div>
          <div className="pc-top">
            <div className={`pc-rating num ${effective !== undefined && effective < player.rating ? 'penalty' : ''}`}>{shown}</div>
            <div className="pc-pos">{POSITION_LABEL[player.position]}</div>
            <Flag className="pc-flag" code={player.nation} title={nation.name} />
            <Crest className="pc-crest" data={club} title={club.name} />
          </div>
          <div className="pc-bottom">
            <div className="pc-name">{player.cardName}</div>
            <div className="pc-stats">
              {STAT_KEYS.map((k) => (
                <div key={k} className="pc-stat">
                  <b className="num">{player.stats[k]}</b>
                  <span>{STAT_LABEL[k]}</span>
                </div>
              ))}
            </div>
          </div>
          {player.rarity === 'legend' && <div className="pc-legend-mark">LEGEND</div>}
          {(player.rarity === 'exam' || player.rarity === 'special' || player.rarity === 'season') && (
            <div className="pc-edition">{RARITY_LABEL[player.rarity]}</div>
          )}
          {player.temporary && <div className="pc-temp">DRAFT</div>}
          <div className="pc-foil" />
          <div className="pc-edge" />
        </div>
        <div className="pc-face pc-back" aria-hidden="true">
          <div className="pc-back-logo">
            <span>RANK</span>
            <b>11</b>
          </div>
        </div>
      </div>
    </Tag>
  );
});
