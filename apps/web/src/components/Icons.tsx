import type { SVGProps } from 'react';

const base = (p: SVGProps<SVGSVGElement>) => ({ viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true, ...p });

export const IconHome = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M3 11 12 4l9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-5h4v5" /></svg>;
export const IconVault = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="12" cy="12" r="4" /><path d="M12 8v1M12 15v1M8 12h1M15 12h1M7 20v1M17 20v1" /></svg>;
export const IconDraft = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><rect x="2.5" y="6" width="7" height="11" rx="1" transform="rotate(-10 6 11.5)" /><rect x="8.5" y="4" width="7" height="12" rx="1" /><rect x="14.5" y="6" width="7" height="11" rx="1" transform="rotate(10 18 11.5)" /></svg>;
export const IconPack = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M6 3h12l-1 3 1 3v12H6V9l1-3z" /><path d="M6 9h12" /><path d="M12 12.5l1.2 2.4 2.6.3-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.8 2.6-.3z" /></svg>;
export const IconSquad = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 12h18" /><circle cx="12" cy="12" r="3" /><path d="M8 3v3h8V3M8 21v-3h8v3" /></svg>;
export const IconCoin = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...p}><defs><linearGradient id="ic-coin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff1c4" /><stop offset=".5" stopColor="#f2cf73" /><stop offset="1" stopColor="#a87b25" /></linearGradient></defs><circle cx="12" cy="12" r="10" fill="url(#ic-coin)" /><circle cx="12" cy="12" r="7" fill="none" stroke="#7d5b17" strokeWidth="1.4" /><text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="800" fill="#5c420f" fontFamily="Barlow Condensed, sans-serif">R</text></svg>
);
export const IconVoucher = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...p}><path d="M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2a3 3 0 0 0 0 6v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-2a3 3 0 0 0 0-6z" fill="#3aa8ff" /><path d="M9 5v14" stroke="#0b2f6b" strokeDasharray="2 2" strokeWidth="1.4" /><path d="M14.5 8.5l1 2 2.2.3-1.6 1.5.4 2.2-2-1.1-2 1.1.4-2.2-1.6-1.5 2.2-.3z" fill="#fff" /></svg>
);
export const IconXp = (p: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...p}><path d="M12 2l2.6 6.6L21 9l-5 4.6L17.4 21 12 17.3 6.6 21 8 13.6 3 9l6.4-.4z" fill="#b8ff3c" /></svg>
);
export const IconSound = ({ on, ...p }: SVGProps<SVGSVGElement> & { on: boolean }) => <svg {...base(p)}><path d="M4 9h4l5-4v14l-5-4H4z" />{on ? <><path d="M16 9a4 4 0 0 1 0 6" /><path d="M18.5 6.5a8 8 0 0 1 0 11" /></> : <path d="M17 9l5 6M22 9l-5 6" />}</svg>;
export const IconMotion = ({ on, ...p }: SVGProps<SVGSVGElement> & { on: boolean }) => <svg {...base(p)}><path d="M4 12h3l2-6 4 12 2-6h5" />{!on && <path d="M3 3l18 18" />}</svg>;
export const IconInfo = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.5" /></svg>;
export const IconClose = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M6 6l12 12M18 6 6 18" /></svg>;
export const IconBack = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M15 5l-7 7 7 7" /></svg>;
export const IconUp = (p: SVGProps<SVGSVGElement>) => <svg viewBox="0 0 24 24" aria-hidden="true" {...p}><path d="M12 4l8 10h-5v6H9v-6H4z" fill="currentColor" /></svg>;
export const IconDown = (p: SVGProps<SVGSVGElement>) => <svg viewBox="0 0 24 24" aria-hidden="true" {...p}><path d="M12 20 4 10h5V4h6v6h5z" fill="currentColor" /></svg>;
export const IconLock = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>;
export const IconClock = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
export const IconShield = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /></svg>;
export const IconGrades = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /><path d="M14.5 8.5 17 6l3 1.5" /></svg>;
export const IconLeague = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M8 4h8v5a4 4 0 0 1-8 0z" /><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9.5 17h5" /></svg>;
export const IconAcademy = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M2 9l10-5 10 5-10 5z" /><path d="M6 11v5c3 2.5 9 2.5 12 0v-5M22 9v6" /></svg>;
export const IconSettings = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>;
export const IconSearch = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
export const IconPlus = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>;
export const IconEdit = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></svg>;
export const IconTrash = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>;
export const IconTarget = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /></svg>;
export const IconCalendar = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>;
export const IconCheck = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="m5 12 5 5 9-10" /></svg>;
export const IconHistory = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></svg>;
export const IconSpark = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" /></svg>;
