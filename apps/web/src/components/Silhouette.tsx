import { memo, useId } from 'react';

/**
 * Generiek, niet-herkenbaar spelerssilhouet (buste) gevuld met de nationale vlagkleuren. Geen gezicht,
 * geen gelijkenis met een bestaande foto, geen logo's. Voor echte spelers i.p.v. een portret.
 */
const HEAD = 'M100 40 C128 40 138 62 137 88 C136 108 130 122 118 132 C110 138 104 141 100 141 C96 141 90 138 82 132 C70 122 64 108 63 88 C62 62 72 40 100 40 Z';
const SHOULDERS = 'M12 290 L12 214 C14 192 28 182 52 176 C70 172 74 166 82 156 Q100 170 118 156 C126 166 142 172 148 176 C172 182 186 192 188 214 L188 290 Z';

export const Silhouette = memo(function Silhouette({ colors, className }: { colors?: readonly string[]; className?: string }) {
  const id = useId();
  const [c0, c1, c2] = colors && colors.length >= 3 ? colors : ['#5b6472', '#aeb6c2', '#2b3240'];
  return (
    <svg className={className} viewBox="0 0 200 290" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={c0} />
          <stop offset="0.55" stopColor={c2} />
          <stop offset="1" stopColor={c0} />
        </linearGradient>
        <radialGradient id={`${id}-fig`} cx="0.5" cy="0.3" r="0.85">
          <stop offset="0" stopColor={c1} stopOpacity="0.95" />
          <stop offset="1" stopColor={c2} stopOpacity="0.9" />
        </radialGradient>
        <radialGradient id={`${id}-light`} cx="0.5" cy="0.26" r="0.7">
          <stop offset="0" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="200" height="290" fill={`url(#${id}-bg)`} />
      <polygon points="0,290 0,150 200,40 200,112 0,290" fill={c1} opacity="0.16" />
      <g fill={`url(#${id}-fig)`} stroke={c2} strokeWidth="1.5">
        <path d={SHOULDERS} />
        <path d={HEAD} />
      </g>
      <rect width="200" height="290" fill={`url(#${id}-light)`} />
    </svg>
  );
});

/** Mini-vlag: drie verticale banen in de nationale vlagkleuren (geen wapens/emblemen). */
export const FlagStripes = memo(function FlagStripes({ colors, className, title }: { colors?: readonly string[]; className?: string; title?: string }) {
  const [a, b, c] = colors && colors.length >= 3 ? colors : ['#5b6472', '#aeb6c2', '#2b3240'];
  return (
    <svg className={className} viewBox="0 0 30 20" role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <rect width="10" height="20" fill={a} />
      <rect x="10" width="10" height="20" fill={b} />
      <rect x="20" width="10" height="20" fill={c} />
      <rect width="30" height="20" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="0.6" />
    </svg>
  );
});
