import { memo, useId } from 'react';
import type { PackTheme } from '@rank11/engine';

const THEMES: Record<PackTheme, { a: string; b: string; c: string; ink: string; glow: string }> = {
  bronze: { a: '#f0c69d', b: '#9a6238', c: '#4a2a14', ink: '#2b170a', glow: '#ffb37a' },
  gold: { a: '#fff1c4', b: '#d6a640', c: '#6f4e10', ink: '#2a1b04', glow: '#ffd76a' },
  rare: { a: '#fffbe6', b: '#c9972f', c: '#3a2806', ink: '#2a1b04', glow: '#ffe08a' },
  exam: { a: '#c8ff5a', b: '#6d28d9', c: '#16052f', ink: '#ffffff', glow: '#b8ff3c' },
  legend: { a: '#ffffff', b: '#d8c8a4', c: '#1b1406', ink: '#1b1406', glow: '#fff4d6' },
};

/** Eigen pack-ontwerp: foliezakje met gekartelde randen, reliëf-"11" en serienaam. */
export const PackArt = memo(function PackArt({ theme, name, className, sub }: { theme: PackTheme; name: string; sub?: string; className?: string }) {
  const t = THEMES[theme];
  const id = `pk${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const zig = (y: number, up: boolean) =>
    Array.from({ length: 21 }, (_, i) => `${i * 8},${y + (i % 2 ? (up ? -5 : 5) : 0)}`).join(' L');
  const dark = theme === 'exam';
  return (
    <svg className={className} viewBox="0 0 160 240" role="img" aria-label={`${name}${sub ? `, ${sub}` : ''}`}>
      <defs>
        <linearGradient id={`${id}-f`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={t.a} />
          <stop offset="0.45" stopColor={t.b} />
          <stop offset="1" stopColor={t.c} />
        </linearGradient>
        <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="0.5" cy="0.42" r="0.6">
          <stop offset="0" stopColor={t.glow} stopOpacity={dark ? 0.6 : 0.5} />
          <stop offset="1" stopColor={t.glow} stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${id}-c`}>
          <path d={`M0,14 L${zig(8, true)} L160,14 L160,226 L${zig(232, false).split(' L').reverse().join(' L')} L0,226 Z`} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-c)`}>
        <rect width="160" height="240" fill={`url(#${id}-f)`} />
        <rect width="160" height="240" fill={`url(#${id}-glow)`} />
        {Array.from({ length: 14 }, (_, i) => (
          <path key={i} d={`M${-60 + i * 22} 240 L${40 + i * 22} 0`} stroke={dark ? t.a : '#fff'} strokeOpacity={dark ? 0.12 : 0.14} strokeWidth="1" />
        ))}
        <rect y="22" width="160" height="5" fill={t.c} opacity="0.35" />
        <rect y="213" width="160" height="5" fill={t.c} opacity="0.35" />
        <path d="M44 66 H132 V150 L112 170 H28 V82 Z" fill="none" stroke={dark ? t.a : t.ink} strokeOpacity="0.55" strokeWidth="3" />
        <text x="80" y="146" textAnchor="middle" fontFamily="Barlow Condensed, Arial Narrow, sans-serif" fontWeight="800" fontSize="92" letterSpacing="-4" fill={dark ? t.a : t.ink} opacity="0.9">11</text>
        <text x="80" y="54" textAnchor="middle" fontFamily="Barlow Condensed, Arial Narrow, sans-serif" fontWeight="700" fontSize="13" letterSpacing="5" fill={dark ? '#fff' : t.ink} opacity="0.85">RANK11.</text>
        <text x="80" y="194" textAnchor="middle" fontFamily="Barlow Condensed, Arial Narrow, sans-serif" fontWeight="800" fontSize="17" letterSpacing="1.5" fill={dark ? '#fff' : t.ink}>{name.toUpperCase()}</text>
        {sub && <text x="80" y="208" textAnchor="middle" fontFamily="Barlow, sans-serif" fontWeight="600" fontSize="8.5" letterSpacing="0.5" fill={dark ? t.a : t.ink} opacity="0.85">{sub}</text>}
        <rect className="pack-sheen" x="-80" y="0" width="60" height="240" fill={`url(#${id}-sheen)`} transform="skewX(-18)" />
      </g>
    </svg>
  );
});
