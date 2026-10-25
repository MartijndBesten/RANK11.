import type { ReactNode } from 'react';
import { POSITION_LABEL, type Formation, type Lineup } from '@rank11/engine';
import { PlayerCard, type CardSize } from './PlayerCard';
import './pitch.css';

interface Props {
  formation: Formation;
  lineup: Lineup;
  activeSlot?: string | null;
  onSlot?: (slotId: string) => void;
  cardSize?: CardSize;
  chem?: Record<string, number>;
  effective?: (slotId: string) => number | undefined;
  className?: string;
  children?: ReactNode;
}

/** Bovenaanzicht van het veld met kaarten op formatieposities (in procenten). */
export function Pitch({ formation, lineup, activeSlot, onSlot, cardSize = 'xs', chem, effective, className = '', children }: Props) {
  return (
    <div className={`pitch ${className}`}>
      <svg className="pitch-lines" viewBox="0 0 100 140" preserveAspectRatio="none" aria-hidden="true">
        <rect x="3" y="3" width="94" height="134" />
        <line x1="3" y1="70" x2="97" y2="70" />
        <circle cx="50" cy="70" r="11" />
        <rect x="24" y="3" width="52" height="20" />
        <rect x="37" y="3" width="26" height="7" />
        <rect x="24" y="117" width="52" height="20" />
        <rect x="37" y="130" width="26" height="7" />
        <path d="M40 23 A11 11 0 0 0 60 23" />
        <path d="M40 117 A11 11 0 0 1 60 117" />
      </svg>
      {formation.slots.map((slot) => {
        const p = lineup[slot.id];
        const isActive = activeSlot === slot.id;
        const content = p ? (
          <PlayerCard player={p} size={cardSize} effective={effective?.(slot.id)} selected={isActive} />
        ) : (
          <div className={`pitch-empty ${isActive ? 'active' : ''}`}><span>{POSITION_LABEL[slot.position]}</span></div>
        );
        return (
          <div key={slot.id} className={`pitch-slot ${isActive ? 'is-active' : ''}`} style={{ left: `${slot.x}%`, top: `${slot.y}%` }}>
            {onSlot ? (
              <button className="pitch-hit" onClick={() => onSlot(slot.id)} aria-label={`${POSITION_LABEL[slot.position]}${p ? `: ${p.firstName} ${p.lastName}, ${p.rating}` : ', leeg'}`}>
                {content}
              </button>
            ) : content}
            {chem && p && (
              <div className="chem-dots" aria-label={`Chemie ${chem[slot.id] ?? 0} van 3`}>
                {[0, 1, 2].map((i) => <i key={i} className={i < (chem[slot.id] ?? 0) ? 'on' : ''} />)}
              </div>
            )}
          </div>
        );
      })}
      {children}
    </div>
  );
}
