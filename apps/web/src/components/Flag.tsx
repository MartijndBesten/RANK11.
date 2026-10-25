import { memo, type ReactElement } from 'react';

/** Vereenvoudigde vlaggen (30×20), zonder wapens of beschermde emblemen. */
const tri = (a: string, b: string, c: string, vertical = false) =>
  vertical ? (
    <>
      <rect width="10" height="20" fill={a} />
      <rect x="10" width="10" height="20" fill={b} />
      <rect x="20" width="10" height="20" fill={c} />
    </>
  ) : (
    <>
      <rect width="30" height="6.67" fill={a} />
      <rect y="6.67" width="30" height="6.67" fill={b} />
      <rect y="13.33" width="30" height="6.67" fill={c} />
    </>
  );

const nordic = (bg: string, cross: string, inner?: string) => (
  <>
    <rect width="30" height="20" fill={bg} />
    <rect x="8" width="5" height="20" fill={cross} />
    <rect y="7.5" width="30" height="5" fill={cross} />
    {inner && (
      <>
        <rect x="9.5" width="2" height="20" fill={inner} />
        <rect y="9" width="30" height="2" fill={inner} />
      </>
    )}
  </>
);

const star = (cx: number, cy: number, r: number, fill: string) => {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 ? r * 0.42 : r;
    return `${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`;
  }).join(' ');
  return <polygon points={pts} fill={fill} />;
};

const FLAGS: Record<string, ReactElement> = {
  NL: tri('#ae1c28', '#ffffff', '#21468b'),
  BE: tri('#1a1a1a', '#fdda24', '#ef3340', true),
  DE: tri('#111111', '#dd0000', '#ffce00'),
  FR: tri('#0055a4', '#ffffff', '#ef4135', true),
  IT: tri('#009246', '#ffffff', '#ce2b37', true),
  AT: tri('#c8102e', '#ffffff', '#c8102e'),
  CO: (
    <>
      <rect width="30" height="10" fill="#fcd116" />
      <rect y="10" width="30" height="5" fill="#003893" />
      <rect y="15" width="30" height="5" fill="#ce1126" />
    </>
  ),
  ES: (
    <>
      <rect width="30" height="20" fill="#aa151b" />
      <rect y="5" width="30" height="10" fill="#f1bf00" />
    </>
  ),
  PT: (
    <>
      <rect width="30" height="20" fill="#da291c" />
      <rect width="12" height="20" fill="#046a38" />
      <circle cx="12" cy="10" r="4" fill="#ffe900" />
      <circle cx="12" cy="10" r="2.4" fill="#da291c" />
    </>
  ),
  EN: (
    <>
      <rect width="30" height="20" fill="#ffffff" />
      <rect x="13" width="4" height="20" fill="#ce1124" />
      <rect y="8" width="30" height="4" fill="#ce1124" />
    </>
  ),
  DK: nordic('#c8102e', '#ffffff'),
  NO: nordic('#ba0c2f', '#ffffff', '#00205b'),
  SE: nordic('#006aa7', '#fecc00'),
  PL: (
    <>
      <rect width="30" height="10" fill="#ffffff" />
      <rect y="10" width="30" height="10" fill="#dc143c" />
    </>
  ),
  HR: (
    <>
      {tri('#ff0000', '#ffffff', '#171796')}
      <rect x="11" y="4.5" width="8" height="9" fill="#ffffff" stroke="#ff0000" strokeWidth="0.5" />
      {[0, 1, 2, 3].map((r) => [0, 1, 2, 3].map((c) => ((r + c) % 2 === 0 ? <rect key={`${r}${c}`} x={11 + c * 2} y={4.5 + r * 2.25} width="2" height="2.25" fill="#ff0000" /> : null)))}
    </>
  ),
  BR: (
    <>
      <rect width="30" height="20" fill="#009c3b" />
      <polygon points="15,2.5 27,10 15,17.5 3,10" fill="#ffdf00" />
      <circle cx="15" cy="10" r="4.4" fill="#002776" />
      <path d="M10.8 9.2 Q15 8 19.2 10.4" stroke="#fff" strokeWidth="0.8" fill="none" />
    </>
  ),
  AR: (
    <>
      {tri('#74acdf', '#ffffff', '#74acdf')}
      <circle cx="15" cy="10" r="2.2" fill="#f6b40e" />
    </>
  ),
  UY: (
    <>
      <rect width="30" height="20" fill="#ffffff" />
      {[2.2, 6.6, 11, 15.4].map((y) => <rect key={y} y={y} width="30" height="2.2" fill="#0038a8" />)}
      <rect width="11" height="11" fill="#ffffff" />
      <circle cx="5.5" cy="5.5" r="2.6" fill="#fcd116" />
    </>
  ),
  MA: (
    <>
      <rect width="30" height="20" fill="#c1272d" />
      <polygon points="15,5.2 16.3,9.2 20.5,9.2 17.1,11.6 18.4,15.6 15,13.1 11.6,15.6 12.9,11.6 9.5,9.2 13.7,9.2" fill="none" stroke="#006233" strokeWidth="0.9" />
    </>
  ),
  SN: (
    <>
      {tri('#00853f', '#fdef42', '#e31b23', true)}
      {star(15, 10, 3, '#00853f')}
    </>
  ),
  GH: (
    <>
      {tri('#ce1126', '#fcd116', '#006b3f')}
      {star(15, 10, 3, '#000000')}
    </>
  ),
  NG: tri('#008751', '#ffffff', '#008751', true),
  JP: (
    <>
      <rect width="30" height="20" fill="#ffffff" />
      <circle cx="15" cy="10" r="6" fill="#bc002d" />
    </>
  ),
  TR: (
    <>
      <rect width="30" height="20" fill="#e30a17" />
      <circle cx="12" cy="10" r="5" fill="#ffffff" />
      <circle cx="13.3" cy="10" r="4" fill="#e30a17" />
      {star(18.5, 10, 2.2, '#ffffff')}
    </>
  ),
};

export const Flag = memo(function Flag({ code, className, title }: { code: string; className?: string; title?: string }) {
  return (
    <svg className={className} viewBox="0 0 30 20" role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <defs>
        <linearGradient id="flag-sheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.25" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      {FLAGS[code] ?? <rect width="30" height="20" fill="#555" />}
      <rect width="30" height="20" fill="url(#flag-sheen)" />
    </svg>
  );
});
