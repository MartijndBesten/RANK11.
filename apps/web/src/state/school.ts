/**
 * Schoolgegevens voor het prototype: vakken, periodes en de demo-startset.
 * De periode-indeling is een aanpasbaar voorbeeld (scholen verschillen); in de functionele fase
 * komt deze uit de poolinstellingen.
 */
import { DEFAULT_PERIODS, type Goal, type Grade, type Period, type UpcomingTest } from '@rank11/engine';

export interface Subject { id: string; name: string; short: string; color: string }

// Gangbare vakken in het Nederlandse voortgezet onderwijs. Bestaande id's (wis, ne, en, fa, bi, gs,
// nask, ak) blijven ongewijzigd zodat eerder ingevoerde cijfers geldig blijven.
export const SUBJECTS: Subject[] = [
  { id: 'wis', name: 'Wiskunde', short: 'WI', color: '#3aa8ff' },
  { id: 'ne', name: 'Nederlands', short: 'NE', color: '#ff8a3d' },
  { id: 'en', name: 'Engels', short: 'EN', color: '#e84a5f' },
  { id: 'du', name: 'Duits', short: 'DU', color: '#e0b020' },
  { id: 'fa', name: 'Frans', short: 'FA', color: '#5b6cff' },
  { id: 'sp', name: 'Spaans', short: 'SPA', color: '#ff5a3c' },
  { id: 'bi', name: 'Biologie', short: 'BI', color: '#2fe39a' },
  { id: 'sk', name: 'Scheikunde', short: 'SK', color: '#2fd0c3' },
  { id: 'nask', name: 'Natuurkunde', short: 'NA', color: '#9b6bff' },
  { id: 'ak', name: 'Aardrijkskunde', short: 'AK', color: '#20c3c3' },
  { id: 'gs', name: 'Geschiedenis', short: 'GS', color: '#d9a441' },
  { id: 'ec', name: 'Economie', short: 'EC', color: '#38c172' },
  { id: 'ml', name: 'Maatschappijleer', short: 'MAW', color: '#c0792f' },
  { id: 'lv', name: 'Levensbeschouwing', short: 'LB', color: '#9a7bd0' },
  { id: 'inf', name: 'Informatica', short: 'INF', color: '#4aa0ff' },
  { id: 'lo', name: 'Lichamelijke opvoeding', short: 'LO', color: '#ff7aa8' },
  { id: 'ckv', name: 'Kunst / CKV', short: 'KU', color: '#ff9f43' },
  { id: 'mu', name: 'Muziek', short: 'MU', color: '#b36bff' },
];

export const subjectById = (id: string): Subject =>
  SUBJECTS.find((s) => s.id === id) ?? { id, name: id, short: id.slice(0, 2).toUpperCase(), color: '#888' };
export const subjectName = (id: string) => subjectById(id).name;

export const PERIODS: Period[] = DEFAULT_PERIODS;

export const todayIso = () => new Date().toISOString().slice(0, 10);
export const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
export const currentPeriod = (today: string): Period =>
  PERIODS.find((p) => today >= p.start && today <= p.end) ?? PERIODS.filter((p) => p.start <= today).at(-1) ?? (PERIODS[0] as Period);
export const previousPeriod = (p: Period): Period | undefined => PERIODS[PERIODS.indexOf(p) - 1];

const g = (id: string, subjectId: string, testName: string, value: number, weight: number, date: string): Grade =>
  ({ id, subjectId, testName, value, weight, date, status: 'registered', source: 'manual' });

/** Demo: cijfers die de speler al eerder heeft ingevoerd en waarvan de beloning al is opgehaald. */
export const DEMO_GRADES: Grade[] = [
  g('g1', 'wis', 'Toets H2 · Breuken', 6.8, 2, '2026-09-18'),
  g('g2', 'wis', 'SO Kwadraten', 7.4, 1, '2026-10-02'),
  g('g3', 'ne', 'Leesvaardigheid', 7.1, 2, '2026-09-24'),
  g('g4', 'ne', 'Spelling SO', 6.2, 1, '2026-10-08'),
  g('g5', 'en', 'Vocabulary U1', 8.0, 1, '2026-09-20'),
  g('g6', 'en', 'Grammar test', 7.6, 2, '2026-10-06'),
  g('g7', 'fa', 'Vocabulaire Ch.1', 5.9, 1, '2026-09-26'),
  g('g8', 'fa', 'Grammaire', 5.1, 2, '2026-10-09'),
  g('g9', 'bi', 'De cel', 7.8, 2, '2026-10-01'),
  g('g10', 'gs', 'Romeinen', 6.9, 2, '2026-10-03'),
  g('g11', 'nask', 'Krachten', 7.2, 2, '2026-10-07'),
  g('g12', 'ak', 'Klimaatzones', 7.5, 1, '2026-10-02'),
  g('g13', 'wis', 'SO Vergelijkingen', 7.9, 1, '2026-10-13'),
  g('g14', 'ne', 'Woordenschat', 6.0, 1, '2026-10-14'),
  g('g15', 'gs', 'SO Middeleeuwen', 7.4, 1, '2026-10-15'),
];

/** Demo: zelf ingevoerde cijfers waarvan de beloning nog in de kluis wacht. */
export const DEMO_PENDING: Grade[] = [
  g('n1', 'wis', 'Toets H4 · Lineaire verbanden', 8.4, 3, '2026-10-16'),
  g('n2', 'en', 'Reading test Unit 3', 9.6, 1, '2026-10-15'),
  g('n3', 'fa', 'Toets Chapitre 2', 6.8, 2, '2026-10-16'),
];

export const demoGoals = (): Goal[] => [
  { id: 'doel-fa', scope: 'subject', subjectId: 'fa', target: 6.0, createdAt: '2026-10-10T16:00:00Z' },
  { id: 'doel-wis', scope: 'subject', subjectId: 'wis', target: 7.5, createdAt: '2026-10-01T16:00:00Z' },
  { id: 'doel-alg', scope: 'overall', target: 7.2, createdAt: '2026-09-15T16:00:00Z' },
];

/** Aankomende toetsen relatief aan vandaag, zodat de demo niet veroudert. */
export const demoUpcoming = (today: string): UpcomingTest[] => [
  { id: 't1', subjectId: 'fa', name: 'Toets Chapitre 3', date: addDays(today, 3), weight: 2 },
  { id: 't2', subjectId: 'wis', name: 'SO H5 · Grafieken', date: addDays(today, 5), weight: 1 },
  { id: 't3', subjectId: 'en', name: 'Grammar test Unit 4', date: addDays(today, 8), weight: 2 },
  { id: 't4', subjectId: 'bi', name: 'Toets Erfelijkheid', date: addDays(today, 12), weight: 2 },
  { id: 't5', subjectId: 'ne', name: 'Spreekbeurt', date: addDays(today, 16), weight: 2 },
];
