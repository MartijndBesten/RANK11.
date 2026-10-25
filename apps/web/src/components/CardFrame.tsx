import { memo, useId } from 'react';
import type { Rarity } from '@rank11/engine';

/**
 * Kaartframe als SVG-laag (viewBox 100×140, zelfde verhouding als de kaart):
 * gegraveerde binnenlijn, hoekornamenten en een motief per zeldzaamheid.
 * Alles eigen ontwerp; schaalt scherp mee met iedere kaartmaat.
 */
export const OUTER = '15,0 40,0 43.5,3 56.5,3 60,0 100,0 100,124 85,140 0,140 0,16';
const INNER = '16,3.4 39,3.4 42.4,6.4 57.6,6.4 61,3.4 96.6,3.4 96.6,122.6 83.6,136.6 3.4,136.6 3.4,17.4';
const INNER2 = '16.8,5.2 38.4,5.2 41.8,8.2 58.2,8.2 61.6,5.2 94.8,5.2 94.8,121.8 82.8,134.8 5.2,134.8 5.2,18.2';

interface Tone { line: string; hi: string; lo: string; motif: string }
const TONES: Record<Rarity, Tone> = {
  bronze: { line: '#5a3418', hi: '#ffd8b0', lo: '#3b210e', motif: '#fff0e0' },
  silver: { line: '#3c4654', hi: '#ffffff', lo: '#55606e', motif: '#ffffff' },
  gold: { line: '#6b4a10', hi: '#fff6d2', lo: '#5a3d08', motif: '#fff3c4' },
  rare_gold: { line: '#120c02', hi: '#fff4c8', lo: '#2a1c03', motif: '#ffe9a0' },
  season: { line: '#02312d', hi: '#b5ffe6', lo: '#021f1d', motif: '#7dffd2' },
  exam: { line: '#1c0846', hi: '#e1ff8a', lo: '#12052e', motif: '#c8ff5a' },
  special: { line: '#04103a', hi: '#a6f7ff', lo: '#020a26', motif: '#7ff0ff' },
  champion: { line: '#000000', hi: '#ffe28a', lo: '#000000', motif: '#ffd76a' },
  legend: { line: '#8a6a2a', hi: '#ffffff', lo: '#9c7a34', motif: '#c9a24f' },
};

function Laurel({ color }: { color: string }) {
  // Twee lauwertakken langs een boog achter de speler.
  const leaves = [];
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 9; i++) {
      const a = (-120 + i * 12) * (Math.PI / 180);
      const r = 40;
      const cx = 52 + side * Math.cos(a) * r;
      const cy = 62 + Math.sin(-a) * -r * 0.95;
      const rot = side * (i * 12 - 30);
      leaves.push(<ellipse key={`${side}-${i}`} cx={cx} cy={cy} rx={1.4} ry={3.6} transform={`rotate(${rot} ${cx} ${cy})`} fill={color} />);
    }
  }
  return <g opacity={0.55}>{leaves}</g>;
}

function Rays({ color }: { color: string }) {
  return (
    <g opacity={0.28}>
      {Array.from({ length: 18 }, (_, i) => {
        const a = (i / 18) * Math.PI * 2;
        return <path key={i} d={`M52 50 L${52 + Math.cos(a) * 90} ${50 + Math.sin(a) * 90} L${52 + Math.cos(a + 0.09) * 90} ${50 + Math.sin(a + 0.09) * 90} Z`} fill={color} />;
      })}
    </g>
  );
}

function Circuit({ color }: { color: string }) {
  return (
    <g fill="none" stroke={color} strokeWidth={0.5} opacity={0.75}>
      <path d="M6 30 H22 L28 36 V58" />
      <path d="M94 24 H80 L74 30 V46 L70 50" />
      <path d="M6 70 H16 L22 76 V96" />
      <path d="M94 66 H84 L78 72 V92" />
      <circle cx={28} cy={58} r={1} fill={color} />
      <circle cx={70} cy={50} r={1} fill={color} />
      <circle cx={22} cy={96} r={1} fill={color} />
      <circle cx={78} cy={92} r={1} fill={color} />
    </g>
  );
}

function Shards({ color }: { color: string }) {
  return (
    <g fill={color} opacity={0.16}>
      <polygon points="60,8 96,8 96,40" />
      <polygon points="4,60 30,90 4,110" />
      <polygon points="70,60 96,48 96,96" />
      <polygon points="30,8 52,8 40,30" />
    </g>
  );
}

export const CardFrame = memo(function CardFrame({ rarity, className, layer }: { rarity: Rarity; className?: string; layer: 'back' | 'front' }) {
  const id = `cf${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const t = TONES[rarity];
  return (
    <svg className={className} viewBox="0 0 100 140" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-bevel`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={t.hi} stopOpacity="0.95" />
          <stop offset="0.5" stopColor={t.hi} stopOpacity="0.15" />
          <stop offset="1" stopColor={t.hi} stopOpacity="0.7" />
        </linearGradient>
      </defs>
      {layer === 'back' && <>
        {/* motief achter de speler */}
        {rarity === 'legend' && <><Rays color="#e9c46a" /><Laurel color={t.motif} /></>}
        {rarity === 'special' && <Circuit color={t.motif} />}
        {rarity === 'exam' && <Circuit color={t.motif} />}
        {rarity === 'rare_gold' && <Shards color={t.motif} />}
      </>}
      {layer === 'front' && <>
      {/* gegraveerde binnenrand: donkere groef + lichte rand */}
      <polygon points={INNER} fill="none" stroke={t.lo} strokeWidth={1.1} strokeOpacity={0.55} />
      <polygon points={INNER} fill="none" stroke={`url(#${id}-bevel)`} strokeWidth={0.45} transform="translate(0.35 0.35)" />
      <polygon points={INNER2} fill="none" stroke={t.line} strokeWidth={0.3} strokeOpacity={0.6} />
      {/* hoekornamenten */}
      <g fill={t.hi} opacity={0.9}>
        <polygon points="50,0.6 52.4,3 50,5.4 47.6,3" />
        <polygon points="7.5,13.2 9.3,15 7.5,16.8 5.7,15" />
        <polygon points="92.5,125.2 94.3,127 92.5,128.8 90.7,127" />
      </g>
      </>}
    </svg>
  );
});
