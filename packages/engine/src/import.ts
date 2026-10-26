/**
 * Cijfers importeren uit geplakte tekst of een bestand (CSV/TSV/kladblok). Pure, testbare parser:
 * geen netwerk, geen opslag. De dedup gebeurt bij de aanroeper (server of demo-store) met `gradeKey`.
 *
 * Opzet, bewust eenvoudig. Eén cijfer per regel, velden gescheiden door tab, puntkomma of 2+ spaties
 * (een losse komma is een decimaalteken, geen scheidingsteken):
 *
 *     Vak <scheiding> Cijfer [ <scheiding> Weging ] [ <scheiding> Datum ] [ <scheiding> Toetsnaam ]
 *
 * De eerste twee velden zijn vast (vak, cijfer); de rest wordt herkend op vorm, dus de volgorde van
 * weging/datum/toetsnaam maakt niet uit. Een kopregel ("vak;cijfer;...") wordt overgeslagen.
 */
import { DUTCH_SCALE, type Grade, type GradeScale } from './grades.ts';

/** Een vak met herkenbare schrijfwijzen (id, afkorting, volledige naam, synoniemen). */
export interface SubjectAlias {
  id: string;
  aliases: readonly string[];
}

export type ImportRowStatus = 'ok' | 'invalid';

export interface ImportRow {
  /** De oorspronkelijke regel, zodat de gebruiker ziet waar een probleem zit. */
  raw: string;
  status: ImportRowStatus;
  /** Alleen bij status 'ok': klaar om via de gewone cijferinvoer te verwerken. */
  grade?: { subjectId: string; testName: string; value: number; weight: number; date: string };
  /** Alleen bij status 'invalid'. */
  reason?: string;
}

const normalizeSubject = (s: string) => s.trim().toLowerCase().replace(/[.\s]+/g, '');

/** Zoekt het vak-id bij een geschreven vaknaam; `null` als niets past. */
export function matchSubject(raw: string, subjects: readonly SubjectAlias[]): string | null {
  const n = normalizeSubject(raw);
  if (!n) return null;
  for (const s of subjects) {
    if (normalizeSubject(s.id) === n) return s.id;
    if (s.aliases.some((a) => normalizeSubject(a) === n)) return s.id;
  }
  return null;
}

/** "6,8" of "6.8" → 6.8; lege of niet-numerieke waarde ("V", "g", "-") → null. */
export function parseGradeValue(raw: string): number | null {
  const t = raw.trim().replace(',', '.');
  if (!/^\d{1,2}(\.\d{1,2})?$/.test(t)) return null;
  const v = Number(t);
  return Number.isFinite(v) ? v : null;
}

/** Herkent dd-mm-jjjj, d-m-jj en jjjj-mm-dd (scheiding - / of .) en geeft jjjj-mm-dd terug, of null. */
export function parseDate(raw: string, today: string): string | null {
  const t = raw.trim();
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(t);
  if (m) return iso(Number(m[1]), Number(m[2]), Number(m[3]));
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/.exec(t);
  if (m) {
    const year = Number(m[3]!.length === 2 ? `20${m[3]}` : m[3]);
    return iso(year, Number(m[2]), Number(m[1]));
  }
  // "vandaag"/"today" als handige afkorting.
  if (/^(vandaag|today)$/i.test(t)) return today;
  return null;
}

function iso(y: number, mo: number, d: number): string | null {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return dt.toISOString().slice(0, 10);
}

const splitFields = (line: string): string[] =>
  line.includes('\t') ? line.split('\t')
    : line.includes(';') ? line.split(';')
      : line.split(/ {2,}/);

const looksLikeHeader = (fields: string[]) =>
  fields.length >= 2 && /^(vak|cijfer|toets|weging|datum|subject|grade)$/i.test(fields[0]!.trim()) && parseGradeValue(fields[1]!) === null;

export interface ImportOptions {
  subjects: readonly SubjectAlias[];
  today?: string;
  /** Standaardweging als er geen in de regel staat. */
  defaultWeight?: number;
  scale?: GradeScale;
}

/** Zet geplakte tekst om naar controleerbare regels. Verwerkt niets; de aanroeper doet dedup en opslag. */
export function parseGradeImport(text: string, opts: ImportOptions): ImportRow[] {
  const today = opts.today ?? new Date().toISOString().slice(0, 10);
  const scale = opts.scale ?? DUTCH_SCALE;
  const defaultWeight = opts.defaultWeight ?? 1;
  const rows: ImportRow[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const fields = splitFields(line).map((f) => f.trim()).filter((f) => f.length > 0);
    if (looksLikeHeader(fields)) continue;
    if (fields.length < 2) { rows.push({ raw: line, status: 'invalid', reason: 'Te weinig velden (minimaal vak en cijfer).' }); continue; }

    const subjectId = matchSubject(fields[0]!, opts.subjects);
    const value = parseGradeValue(fields[1]!);
    if (!subjectId) { rows.push({ raw: line, status: 'invalid', reason: `Onbekend vak: "${fields[0]}".` }); continue; }
    if (value === null) { rows.push({ raw: line, status: 'invalid', reason: `Geen geldig cijfer: "${fields[1]}".` }); continue; }
    if (value < scale.min || value > scale.max) { rows.push({ raw: line, status: 'invalid', reason: `Cijfer buiten ${scale.min}-${scale.max}: "${fields[1]}".` }); continue; }

    // Overige velden op vorm herkennen: datum, dan weging (geheel 1..maxWeight), de rest is de toetsnaam.
    let date: string | null = null;
    let weight: number | null = null;
    const nameParts: string[] = [];
    for (const f of fields.slice(2)) {
      const d = parseDate(f, today);
      if (d && !date) { date = d; continue; }
      if (weight === null && /^\d{1,2}$/.test(f)) { const w = Number(f); if (w >= 1 && w <= scale.maxWeight) { weight = w; continue; } }
      nameParts.push(f);
    }
    if (date && date > today) { rows.push({ raw: line, status: 'invalid', reason: 'Datum ligt in de toekomst.' }); continue; }

    rows.push({
      status: 'ok',
      raw: line,
      grade: {
        subjectId,
        value,
        weight: weight ?? defaultWeight,
        date: date ?? today,
        testName: nameParts.join(' ').trim() || `Import ${date ?? today}`,
      },
    });
  }
  return rows;
}

/** Korte samenvatting voor het controleoverzicht. */
export function importSummary(rows: readonly ImportRow[]): { total: number; ok: number; invalid: number } {
  const ok = rows.filter((r) => r.status === 'ok').length;
  return { total: rows.length, ok, invalid: rows.length - ok };
}
