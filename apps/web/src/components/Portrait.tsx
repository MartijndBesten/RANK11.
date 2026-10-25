import { memo, useId } from 'react';
import type { Club, Portrait as PortraitData } from '@rank11/engine';

/**
 * Parametrisch spelersportret (SVG). Geen foto's: gestileerde buste met sleutellicht en randlicht
 * in de kleur van de kaartserie. Silhouetmodus wordt gebruikt tijdens de walkout vóór de onthulling.
 */
const SKIN: [string, string, string][] = [
  ['#f1d3bd', '#cfa283', '#fbe7da'],
  ['#e3bb98', '#bb8a64', '#f2d3b8'],
  ['#c99a72', '#9c6d47', '#e0b791'],
  ['#a4724c', '#764b2e', '#c18f6a'],
  ['#7d4f2d', '#553119', '#9c6942'],
  ['#56351e', '#36200f', '#764d31'],
];

interface Props {
  data: PortraitData;
  club: Club;
  rim?: string;
  silhouette?: boolean;
  className?: string;
}

function shoulders(build: number): string {
  const w = [88, 96, 104][build] ?? 96;
  const l = 100 - w;
  const r = 100 + w;
  return `M${l} 290 L${l} 214 C${l + 2} 192 ${l + 16} 182 ${l + 40} 176 C${l + 58} 172 74 166 82 156 Q100 170 118 156 C126 166 ${r - 58} 172 ${r - 40} 176 C${r - 16} 182 ${r - 2} 192 ${r} 214 L${r} 290 Z`;
}

const HEAD = 'M100 40 C128 40 138 62 137 88 C136 108 130 122 118 132 C110 138 104 141 100 141 C96 141 90 138 82 132 C70 122 64 108 63 88 C62 62 72 40 100 40 Z';

function HairBack({ style, color }: { style: PortraitData['hair']; color: string }) {
  if (style === 'long') {
    return <path d="M60 82 C56 42 80 27 100 27 C120 27 144 42 140 82 L142 122 C136 128 130 124 128 116 L127 100 C118 74 82 74 73 100 L72 116 C70 124 64 128 58 122 Z" fill={color} />;
  }
  if (style === 'afro') {
    return <path d="M44 96 C30 40 66 14 100 14 C134 14 170 40 156 96 C150 112 142 116 138 108 C132 78 120 64 100 64 C80 64 68 78 62 108 C58 116 50 112 44 96 Z" fill={color} />;
  }
  return null;
}

function HairFront({ style, color }: { style: PortraitData['hair']; color: string }) {
  switch (style) {
    case 'buzz':
      return <path d="M64 86 C61 56 76 37 100 37 C124 37 139 56 136 86 C131 66 118 55 100 55 C82 55 69 66 64 86 Z" fill={color} opacity={0.82} />;
    case 'short':
      return <path d="M60 90 C55 50 76 29 102 30 C129 31 145 52 140 90 C137 72 129 61 116 58 C102 63 85 60 72 65 C66 71 62 80 60 90 Z" fill={color} />;
    case 'fade':
      return (
        <g fill={color}>
          <path d="M67 72 C65 44 84 31 102 31 C122 31 137 45 134 72 C121 59 82 59 67 72 Z" />
          <path d="M63 92 C62 78 64 70 67 66 L70 80 Z M137 92 C138 78 136 70 133 66 L130 80 Z" opacity={0.45} />
        </g>
      );
    case 'curly':
      return (
        <g fill={color}>
          {[
            [70, 66, 11], [78, 50, 12], [92, 40, 13], [108, 39, 13], [122, 48, 12], [131, 63, 11],
            [64, 80, 8], [136, 80, 8], [86, 54, 10], [114, 53, 10], [100, 50, 10],
          ].map(([cx, cy, r], i) => <circle key={i} cx={cx} cy={cy} r={r} />)}
        </g>
      );
    case 'long':
      return <path d="M60 92 C55 48 78 28 101 28 C126 28 146 48 140 92 C134 70 122 58 104 58 C92 66 76 70 66 80 C63 84 61 88 60 92 Z" fill={color} />;
    case 'bun':
      return (
        <g fill={color}>
          <circle cx={100} cy={24} r={14} />
          <path d="M62 86 C58 52 77 34 100 34 C123 34 142 52 138 86 C132 66 118 54 100 54 C82 54 68 66 62 86 Z" />
        </g>
      );
    case 'afro':
      return <path d="M58 84 C60 66 76 56 100 56 C124 56 140 66 142 84 C136 60 120 46 100 46 C80 46 64 60 58 84 Z" fill={color} />;
    case 'mohawk':
      return (
        <g fill={color}>
          <path d="M89 64 C86 38 93 22 100 18 C107 22 114 38 111 64 C104 58 96 58 89 64 Z" />
          <path d="M64 86 C62 64 72 48 88 44 L86 60 C76 64 68 74 64 86 Z M136 86 C138 64 128 48 112 44 L114 60 C124 64 132 74 136 86 Z" opacity={0.3} />
        </g>
      );
    case 'bald':
    default:
      return null;
  }
}

function Jersey({ club, id }: { club: Club; id: string }) {
  const p = club.pattern;
  return (
    <g clipPath={`url(#${id}-jersey)`}>
      <rect x={0} y={150} width={200} height={140} fill={club.primary} />
      {p === 'stripes' && [30, 62, 94, 126, 158].map((x) => <rect key={x} x={x} y={150} width={14} height={140} fill={club.secondary} opacity={0.9} />)}
      {p === 'halves' && <rect x={100} y={150} width={100} height={140} fill={club.secondary} />}
      {p === 'sash' && <path d="M40 150 L80 150 L220 290 L180 290 Z" fill={club.secondary} />}
      {p === 'chevron' && <path d="M20 190 L100 225 L180 190 L180 208 L100 243 L20 208 Z" fill={club.secondary} />}
      {p === 'quarters' && <path d="M100 150 H200 V200 H100 Z M0 200 H100 V290 H0 Z" fill={club.secondary} />}
      {/* kraag */}
      <path d="M78 159 Q100 181 122 159 L118 156 Q100 173 82 156 Z" fill={club.accent} />
      {/* embleem op de borst */}
      <circle cx={128} cy={196} r={7} fill={club.accent} opacity={0.95} />
      <circle cx={128} cy={196} r={4} fill={club.primary} />
      {/* plooien en volume */}
      <rect x={0} y={150} width={200} height={140} fill={`url(#${id}-cloth)`} />
    </g>
  );
}

export const Portrait = memo(function Portrait({ data, club, rim = '#ffffff', silhouette = false, className }: Props) {
  const raw = useId().replace(/[^a-zA-Z0-9]/g, '');
  const id = `pt${raw}`;
  const [base, shade, light] = SKIN[data.skin] ?? SKIN[2]!;
  const s = silhouette;
  const body = shoulders(data.build);

  return (
    <svg className={className} viewBox="0 0 200 290" aria-hidden="true" preserveAspectRatio="xMidYMin meet">
      <defs>
        <clipPath id={`${id}-jersey`}>
          <path d={body} />
        </clipPath>
        <linearGradient id={`${id}-cloth`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="0.45" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id={`${id}-face`} x1="0" y1="0" x2="1" y2="0.3">
          <stop offset="0" stopColor={light} />
          <stop offset="0.38" stopColor={base} />
          <stop offset="0.72" stopColor={shade} />
          <stop offset="1" stopColor={shade} stopOpacity="1" />
        </linearGradient>
        <linearGradient id={`${id}-dark`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0.5" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.38" />
        </linearGradient>
        <linearGradient id={`${id}-neck`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={shade} />
          <stop offset="0.5" stopColor={base} />
          <stop offset="1" stopColor={shade} />
        </linearGradient>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0.45" stopColor={rim} stopOpacity="0" />
          <stop offset="1" stopColor={rim} stopOpacity="0.95" />
        </linearGradient>
        <radialGradient id={`${id}-key`} cx="0.3" cy="0.25" r="0.75">
          <stop offset="0" stopColor="#fff" stopOpacity="0.18" />
          <stop offset="1" stopColor="#000" stopOpacity="0.2" />
        </radialGradient>
        <filter id={`${id}-soft`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <filter id={`${id}-soft2`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.8" />
        </filter>
      </defs>

      {s ? (
        <g fill="#04060c">
          <path d={body} />
          <g transform="translate(100 150) scale(0.86) translate(-100 -150)">
            <HairBack style={data.hair} color="#04060c" />
            <path d="M82 128 L82 164 Q100 178 118 164 L118 128 Z" />
            <path d={HEAD} />
            <ellipse cx={63} cy={94} rx={6} ry={11} />
            <ellipse cx={137} cy={94} rx={6} ry={11} />
            <HairFront style={data.hair} color="#04060c" />
          </g>
        </g>
      ) : (
        <g>
          <Jersey club={club} id={id} />
          <g transform="translate(100 150) scale(0.86) translate(-100 -150)">
          <HairBack style={data.hair} color={data.hairColor} />
          <path d="M82 126 L82 162 Q100 177 118 162 L118 126 Z" fill={`url(#${id}-neck)`} />
          <path d="M84 150 Q100 160 116 150 L116 136 Q100 146 84 136 Z" fill={shade} opacity={0.55} />
          <ellipse cx={63} cy={94} rx={6} ry={11} fill={shade} />
          <ellipse cx={137} cy={94} rx={6} ry={11} fill={shade} />
          <path d={HEAD} fill={`url(#${id}-face)`} />
          <path d={HEAD} fill={`url(#${id}-dark)`} />
          <path d="M66 74 C74 60 88 54 100 54 C112 54 126 60 134 74 C124 66 112 62 100 62 C88 62 76 66 66 74 Z" fill="#000" opacity={0.12} filter={`url(#${id}-soft)`} />
          {/* gezichtsvolume: zacht gemodelleerd, geen getekende ogen */}
          <g filter={`url(#${id}-soft)`}>
            <path d="M70 92 C72 112 79 124 92 131 C82 119 77 107 76 92 Z" fill={shade} opacity={0.55} />
            <path d="M130 90 C128 112 121 124 108 131 C120 118 124 106 124 90 Z" fill={shade} opacity={0.75} />
            <ellipse cx={85} cy={93} rx={10} ry={5.5} fill={shade} opacity={0.7} />
            <ellipse cx={115} cy={93} rx={10} ry={5.5} fill={shade} opacity={0.8} />
            <path d="M101 90 C102 101 106 108 107 112 Q102 116 97 113 C99 108 100 100 101 90 Z" fill={shade} opacity={0.6} />
            <ellipse cx={82} cy={106} rx={8} ry={5} fill={light} opacity={0.5} />
            <path d="M90 123 Q100 127 110 123 Q100 130 90 123 Z" fill={shade} opacity={0.75} />
          </g>
          <g filter={`url(#${id}-soft2)`} opacity={0.7}>
            <path d="M77 84 Q85 80 94 83" stroke={data.hairColor} strokeWidth={3.2} strokeLinecap="round" fill="none" />
            <path d="M106 83 Q115 80 123 84" stroke={data.hairColor} strokeWidth={3.2} strokeLinecap="round" fill="none" />
            <path d="M79 93.5 Q85 90 91 93.5 Q85 96.5 79 93.5 Z" fill="#20140d" opacity={0.75} />
            <path d="M109 93.5 Q115 90 121 93.5 Q115 96.5 109 93.5 Z" fill="#20140d" opacity={0.75} />
            <circle cx={86.5} cy={92.6} r={0.9} fill="#fff" opacity={0.7} />
            <circle cx={116.5} cy={92.6} r={0.9} fill="#fff" opacity={0.7} />
          </g>
          {data.beard === 1 && <path d="M66 104 C70 124 84 140 100 141 C116 140 130 124 134 104 C130 118 120 128 110 129 Q100 133 90 129 C80 128 70 118 66 104 Z" fill={data.hairColor} opacity={0.32} />}
          {data.beard === 2 && (
            <g fill={data.hairColor} opacity={0.9}>
              <path d="M66 102 C69 126 84 143 100 144 C116 143 131 126 134 102 C130 118 121 127 111 128 Q100 134 89 128 C79 127 70 118 66 102 Z" />
              <path d="M88 118 Q100 113 112 118 Q100 121 88 118 Z" />
            </g>
          )}
          <HairFront style={data.hair} color={data.hairColor} />
          {data.hair === 'bald' && <ellipse cx={88} cy={56} rx={14} ry={8} fill="#fff" opacity={0.14} />}
          </g>
          <rect x={0} y={0} width={200} height={290} fill={`url(#${id}-key)`} style={{ mixBlendMode: 'soft-light' }} />
        </g>
      )}

      {/* randlicht */}
      <g fill="none" stroke={`url(#${id}-rim)`} strokeWidth={s ? 2.6 : 2}>
        <path d={HEAD} transform="translate(100 150) scale(0.86) translate(-100 -150)" />
        <path d={body} />
      </g>
    </svg>
  );
});
