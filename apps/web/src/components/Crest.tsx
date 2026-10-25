import { memo, useId } from 'react';
import type { CrestPattern, CrestShape, CrestSymbol } from '@rank11/engine';

/** Parametrisch clubembleem (SVG). Basis voor de latere Club Creator: alle onderdelen zijn data. */
export interface CrestData {
  shape: CrestShape;
  symbol: CrestSymbol;
  pattern: CrestPattern;
  primary: string;
  secondary: string;
  accent: string;
  short?: string;
  stars?: number;
}

export const SHAPES: Record<CrestShape, string> = {
  shield: 'M50 6 L93 17 L93 52 C93 82 74 101 50 111 C26 101 7 82 7 52 L7 17 Z',
  classic: 'M9 9 H91 V56 C91 85 72 103 50 111 C28 103 9 85 9 56 Z',
  round: 'M50 12 A46 46 0 1 1 49.99 12 Z',
  hex: 'M50 7 L93 31 L93 83 L50 108 L7 83 L7 31 Z',
  diamond: 'M50 5 L95 58 L50 111 L5 58 Z',
};

/** Symbolen in een vak van 40×40. */
export const SYMBOLS: Record<Exclude<CrestSymbol, 'none'>, string> = {
  star: 'M20 2 L25.3 14.6 L38.8 15.4 L28.4 24.2 L31.6 37.4 L20 30.2 L8.4 37.4 L11.6 24.2 L1.2 15.4 L14.7 14.6 Z',
  ball: 'M20 2 A18 18 0 1 1 19.99 2 Z M20 11 L27.6 16.5 L24.7 25.5 L15.3 25.5 L12.4 16.5 Z',
  crown: 'M4 32 L4 12 L13 20 L20 6 L27 20 L36 12 L36 32 Z M4 35 H36 V38 H4 Z',
  bolt: 'M23 2 L8 23 H18 L15 38 L32 15 H21 Z',
  tower: 'M7 38 V12 H12 V6 H17 V12 H23 V6 H28 V12 H33 V38 H24 V28 A4 4 0 0 0 16 28 V38 Z',
  wing: 'M4 30 C10 14 22 6 38 4 C34 10 30 12 26 13 C31 14 34 15 36 16 C30 20 25 21 21 21 C25 23 27 24 28 26 C20 29 12 30 4 30 Z',
  anchor: 'M18 4 H22 V9 H27 V13 H22 V31 C27 30 31 27 33 22 L29 21 L36 15 L37 24 L35 23 C32 31 26 36 20 36 C14 36 8 31 5 23 L3 24 L4 15 L11 21 L7 22 C9 27 13 30 18 31 V13 H13 V9 H18 Z',
  lion: 'M20 3 L27 7 L34 6 L33 14 L38 20 L33 26 L34 34 L26 33 L20 38 L14 33 L6 34 L7 26 L2 20 L7 14 L6 6 L13 7 Z M14 17 L17 19 L14 21 Z M26 17 L23 19 L26 21 Z M16 27 Q20 31 24 27 L20 25 Z',
};

function Pattern({ pattern, color }: { pattern: CrestPattern; color: string }) {
  switch (pattern) {
    case 'stripes':
      return <g fill={color}>{[18, 38, 58, 78].map((x) => <rect key={x} x={x} y={0} width={10} height={120} />)}</g>;
    case 'halves':
      return <rect x={50} y={0} width={50} height={120} fill={color} />;
    case 'sash':
      return <path d="M0 18 L18 0 L100 82 L100 104 Z" fill={color} />;
    case 'chevron':
      return <path d="M0 62 L50 88 L100 62 L100 78 L50 104 L0 78 Z" fill={color} />;
    case 'quarters':
      return <path d="M50 0 H100 V58 H50 Z M0 58 H50 V120 H0 Z" fill={color} />;
    default:
      return null;
  }
}

export const Crest = memo(function Crest({ data, className, title }: { data: CrestData; className?: string; title?: string }) {
  const id = `cr${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const shape = SHAPES[data.shape];
  const stars = Math.min(5, data.stars ?? 0);
  return (
    <svg className={className} viewBox="0 -8 100 124" role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <defs>
        <clipPath id={`${id}-c`}>
          <path d={shape} />
        </clipPath>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      {stars > 0 && (
        <g fill={data.accent}>
          {Array.from({ length: stars }, (_, i) => {
            const x = 50 + (i - (stars - 1) / 2) * 11;
            return <path key={i} transform={`translate(${x - 4} -7) scale(0.2)`} d={SYMBOLS.star} />;
          })}
        </g>
      )}
      <path d={shape} fill={data.accent} transform="translate(50 58) scale(1.06) translate(-50 -58)" />
      <g clipPath={`url(#${id}-c)`}>
        <rect x={0} y={0} width={100} height={120} fill={data.primary} />
        <Pattern pattern={data.pattern} color={data.secondary} />
      </g>
      <path d={shape} fill="none" stroke={data.secondary} strokeWidth={1.6} opacity={0.9} transform="translate(50 58) scale(0.9) translate(-50 -58)" />
      {data.symbol !== 'none' && (
        <g transform={`translate(${50 - 17} ${data.short ? 30 : 38}) scale(0.85)`}>
          <path d={SYMBOLS[data.symbol]} fill={data.accent} stroke="rgba(0,0,0,.45)" strokeWidth={1.4} fillRule="evenodd" />
        </g>
      )}
      {data.short && (
        <g>
          <rect x={22} y={70} width={56} height={17} rx={2} fill="rgba(0,0,0,.55)" />
          <text x={50} y={83.5} textAnchor="middle" fill="#fff" fontFamily="Barlow Condensed, Arial Narrow, sans-serif" fontWeight={800} fontSize={14} letterSpacing={1.5}>
            {data.short}
          </text>
        </g>
      )}
      <path d={shape} fill={`url(#${id}-g)`} />
    </svg>
  );
});
