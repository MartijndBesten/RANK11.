/**
 * Schoolperiodes (voorbeeldindeling 2026-2027; aanpasbaar per pool in een latere versie).
 * Gedeeld door app en server, zodat periodegebonden beloningen overal hetzelfde uitvallen.
 */
import type { Period } from './stats.ts';

export const DEFAULT_PERIODS: Period[] = [
  { id: 'p1', name: 'Periode 1', start: '2026-08-24', end: '2026-10-09' },
  { id: 'p2', name: 'Periode 2', start: '2026-10-12', end: '2026-12-18' },
  { id: 'p3', name: 'Periode 3', start: '2027-01-04', end: '2027-03-26' },
  { id: 'p4', name: 'Periode 4', start: '2027-03-29', end: '2027-07-09' },
];
