import { memo, useId } from 'react';
import type { Player } from '@rank11/engine';

/**
 * RANK11-shirtportret: het eigen alternatief voor een spelersfoto. Een gestileerde, gezichtsloze speler in een
 * shirt in de officiële clubkleuren (Wikidata P6364) met het echte rugnummer, tegen een stadionachtergrond.
 * Geen gezicht, geen gelijkenis, geen clublogo, geen sponsor. Alleen naam/kleuren/nummer: feitelijke gegevens.
 */

const FALLBACK = ['#3a4252', '#c9d1dc'];
const isDark = (hex: string) => {
  const m = hex.replace('#', '');
  if (m.length < 6) return true;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m.slice(i, i + 2), 16));
  return 0.299 * r! + 0.587 * g! + 0.114 * b! < 140;
};
const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0), 2166136261);

/** Clubkleuren: primair, secundair en een leesbare inktkleur voor nummer/afkorting. */
export function clubPalette(p: Pick<Player, 'clubColors' | 'flagColors'>): { primary: string; secondary: string; ink: string } {
  const cols = (p.clubColors && p.clubColors.length ? p.clubColors : p.flagColors?.slice(0, 2)) ?? FALLBACK;
  const primary = cols[0] ?? FALLBACK[0]!;
  let secondary = cols[1] ?? (isDark(primary) ? '#ffffff' : '#111111');
  if (secondary.toLowerCase() === primary.toLowerCase()) secondary = isDark(primary) ? '#ffffff' : '#111111';
  const ink = isDark(primary) ? (isDark(secondary) ? '#ffffff' : secondary) : (isDark(secondary) ? secondary : '#111111');
  return { primary, secondary, ink };
}

const STOP = new Set(['fc', 'f.c.', 'afc', 'a.f.c.', 'cf', 'c.f.', 'sc', 's.c.', 'ac', 'as', 'ssc', 'us', 'ss', 'sl', 's.l.', 'cd', 'ud', 'rc', 'rcd', 'sv', 'vfb', 'vfl', 'tsg', 'bv', 'fk', 'club', 'de', 'calcio', 'balompié', 'fútbol', 'futebol', 'football', 'and', '&', 'hove', '1909', '1907', '1913', '04', '05', '07', '09', 'osc', 'ogc', 'ca']);
/** Eigen clubafkorting (drie letters) uit de clubnaam — geen officieel logo of merk. */
export function clubShort(name?: string | null): string {
  if (!name || name === 'Zonder club') return '—';
  const words = name.replace(/[.,]/g, ' ').split(/\s+/).filter((w) => w && !STOP.has(w.toLowerCase()) && !/^\d+$/.test(w));
  const core = words.length ? words : name.split(/\s+/);
  if (core.length === 1) return core[0]!.slice(0, 3).toUpperCase();
  return core.slice(0, 3).map((w) => w[0]).join('').toUpperCase().padEnd(3, core[0]!.slice(1, 3).toUpperCase()).slice(0, 3);
}

/** Kleine eigen clubaanduiding: schild in clubkleuren met afkorting. Bewust géén nagebootst logo. */
export const ClubBadge = memo(function ClubBadge({ player, className, title }: { player: Pick<Player, 'clubColors' | 'flagColors' | 'clubName'>; className?: string; title?: string }) {
  const { primary, secondary, ink } = clubPalette(player);
  const label = clubShort(player.clubName);
  return (
    <svg className={className} viewBox="0 0 40 46" role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <path d="M20 1 L38 6 L38 22 C38 34 30 41 20 45 C10 41 2 34 2 22 L2 6 Z" fill={primary} stroke={secondary} strokeWidth="2.4" />
      <path d="M20 1 L38 6 L38 13 L2 13 L2 6 Z" fill={secondary} opacity="0.85" />
      <text x="20" y="31" textAnchor="middle" fontSize="12.5" fontWeight="800" fontFamily="var(--font-display, system-ui)" fill={ink} letterSpacing="0.5">{label}</text>
    </svg>
  );
});

/**
 * Gezichtsloze speler in clubshirt. Variatie per speler (schouderbreedte, hoofdvorm, kraag, shirtpatroon)
 * komt uit een hash van het kaart-id — zo ziet niet iedere kaart er hetzelfde uit, zonder iemand na te bootsen.
 */
export const KitPortrait = memo(function KitPortrait({ player, className }: { player: Pick<Player, 'id' | 'baseId' | 'position' | 'clubColors' | 'flagColors' | 'shirtNumber' | 'rarity'>; className?: string }) {
  const id = useId();
  const h = hash(player.baseId || player.id);
  const keeper = player.position === 'GK';
  const pal = clubPalette(player);
  const shirt = keeper ? ['#1fd17a', '#ff8a1f', '#2b8cff', '#ffd400'][h % 4]! : pal.primary;
  const trim = keeper ? '#101418' : pal.secondary;
  const ink = keeper ? '#101418' : pal.ink;
  const pattern = keeper ? 0 : (h >> 3) % 4; // 0 effen · 1 strepen · 2 band · 3 halven
  const w = 1 + ((h >> 6) % 3) * 0.04; // schouderbreedte
  const headW = 30 + ((h >> 9) % 3) * 2;
  const collar = (h >> 12) % 2;
  const num = player.shirtNumber ?? null;
  const flag = player.flagColors ?? ['#5b6472', '#aeb6c2', '#2b3240'];
  const L = 100 - 88 * w, R = 100 + 88 * w;
  const body = `M${L} 290 L${L} 214 C${L + 2} 192 ${L + 16} 182 ${L + 40} 176 C70 172 76 164 84 156 Q100 168 116 156 C124 164 130 172 ${R - 40} 176 C${R - 16} 182 ${R - 2} 192 ${R} 214 L${R} 290 Z`;
  return (
    <svg className={className} viewBox="0 0 200 290" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor={pal.primary} stopOpacity="0.5" />
          <stop offset="0.55" stopColor={pal.primary} stopOpacity="0.08" />
          <stop offset="1" stopColor={pal.secondary} stopOpacity="0.3" />
        </linearGradient>
        <radialGradient id={`${id}-spot`} cx="0.5" cy="0.18" r="0.75">
          <stop offset="0" stopColor="#fff" stopOpacity="0.38" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-shade`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.32" />
          <stop offset="0.45" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.38" />
        </linearGradient>
        <linearGradient id={`${id}-head`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#3a3f4a" />
          <stop offset="1" stopColor="#14171d" />
        </linearGradient>
        <clipPath id={`${id}-body`}><path d={body} /></clipPath>
      </defs>
      <rect width="200" height="290" fill={`url(#${id}-bg)`} />
      {/* stadionlichten */}
      <g opacity="0.5">{[30, 70, 130, 170].map((x, i) => <circle key={x} cx={x} cy={18 + (i % 2) * 6} r="2.2" fill="#fff" />)}</g>
      <rect width="200" height="290" fill={`url(#${id}-spot)`} />
      {/* shirt */}
      <g clipPath={`url(#${id}-body)`}>
        <rect x="0" y="140" width="200" height="150" fill={shirt} />
        {pattern === 1 && [0, 1, 2, 3, 4, 5, 6].map((i) => <rect key={i} x={6 + i * 28} y="140" width="13" height="150" fill={trim} opacity="0.9" />)}
        {pattern === 2 && <path d="M0 200 L200 160 L200 186 L0 226 Z" fill={trim} opacity="0.9" />}
        {pattern === 3 && <rect x="100" y="140" width="100" height="150" fill={trim} opacity="0.9" />}
        {/* mouwboorden */}
        <path d={`M${L} 238 L${L + 22} 232 L${L + 22} 240 L${L} 246 Z`} fill={trim} />
        <path d={`M${R} 238 L${R - 22} 232 L${R - 22} 240 L${R} 246 Z`} fill={trim} />
        {/* vlagpatch op de mouw (nationaliteit) */}
        <g transform={`translate(${R - 34} 206)`}>
          <rect width="7" height="12" fill={flag[0]} /><rect x="7" width="7" height="12" fill={flag[1]} /><rect x="14" width="7" height="12" fill={flag[2]} />
          <rect width="21" height="12" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="0.8" />
        </g>
        <rect x="0" y="140" width="200" height="150" fill={`url(#${id}-shade)`} />
      </g>
      {/* kraag */}
      {collar ? <path d="M84 156 Q100 176 116 156 L111 154 Q100 166 89 154 Z" fill={trim} /> : <path d="M86 155 L100 172 L114 155 L109 154 L100 164 L91 154 Z" fill={trim} />}
      {/* rugnummer op de borst (echt nummer), anders niets */}
      {num !== null && (
        <text x="100" y="214" textAnchor="middle" fontSize={num >= 10 ? 40 : 46} fontWeight="900" fontFamily="var(--font-display, system-ui)"
          fill={pattern === 1 || pattern === 3 ? '#fff' : ink} stroke={pattern === 1 || pattern === 3 ? '#000' : 'none'} strokeOpacity="0.45" strokeWidth="1.5" letterSpacing="-1">{num}</text>
      )}
      {/* gezichtsloos hoofd + nek */}
      <path d="M90 128 L90 152 Q100 160 110 152 L110 128 Z" fill="#1b1f27" />
      <ellipse cx="100" cy="94" rx={headW} ry="40" fill={`url(#${id}-head)`} />
      <path d={`M${100 - headW} 92 C${100 - headW} 60 ${100 + headW} 60 ${100 + headW} 92`} fill="none" stroke="#fff" strokeOpacity="0.16" strokeWidth="3" />
      {keeper && (
        <g fill={trim} opacity="0.9">
          <ellipse cx={L + 10} cy="282" rx="12" ry="9" /><ellipse cx={R - 10} cy="282" rx="12" ry="9" />
        </g>
      )}
    </svg>
  );
});
