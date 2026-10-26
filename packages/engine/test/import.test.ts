import { describe, expect, it } from 'vitest';
import { parseGradeImport, matchSubject, parseGradeValue, parseDate, importSummary, type SubjectAlias } from '../src/index.ts';

const subjects: SubjectAlias[] = [
  { id: 'wis', aliases: ['WI', 'wiskunde', 'wiskunde a'] },
  { id: 'ne', aliases: ['NE', 'Nederlands'] },
  { id: 'fa', aliases: ['FA', 'Frans'] },
  { id: 'nask', aliases: ['NA', 'natuurkunde'] },
];
const opts = { subjects, today: '2026-10-26' };

describe('cijferimport-parser', () => {
  it('matcht vakken op id, afkorting en naam (hoofdletterongevoelig, spaties/punten weg)', () => {
    expect(matchSubject('Wiskunde', subjects)).toBe('wis');
    expect(matchSubject('wi', subjects)).toBe('wis');
    expect(matchSubject(' N.A. ', subjects)).toBe('nask');
    expect(matchSubject('Duits', subjects)).toBeNull();
  });

  it('leest Nederlandse komma-cijfers en weigert niet-numeriek', () => {
    expect(parseGradeValue('6,8')).toBe(6.8);
    expect(parseGradeValue('10')).toBe(10);
    expect(parseGradeValue('V')).toBeNull();
    expect(parseGradeValue('o/v')).toBeNull();
  });

  it('leest datums in meerdere schrijfwijzen', () => {
    expect(parseDate('13-10-2026', '2026-10-26')).toBe('2026-10-13');
    expect(parseDate('2026-10-13', '2026-10-26')).toBe('2026-10-13');
    expect(parseDate('5-9-26', '2026-10-26')).toBe('2026-09-05');
    expect(parseDate('vandaag', '2026-10-26')).toBe('2026-10-26');
    expect(parseDate('32-01-2026', '2026-10-26')).toBeNull();
  });

  it('verwerkt een geplakt blok met verschillende volgordes van weging/datum/naam', () => {
    const text = [
      'vak;cijfer;weging;datum;toets',      // kopregel → overslaan
      'Wiskunde;6,8;2;13-10-2026;SO H3',
      'Frans\t7,4\tGrammaire\t20-10-2026',  // tab, naam vóór datum
      'NE  8  Boekverslag',                 // 2+ spaties, geen datum/weging → vandaag, weging 1
    ].join('\n');
    const rows = parseGradeImport(text, opts);
    expect(importSummary(rows)).toEqual({ total: 3, ok: 3, invalid: 0 });
    expect(rows[0]!.grade).toEqual({ subjectId: 'wis', value: 6.8, weight: 2, date: '2026-10-13', testName: 'SO H3' });
    expect(rows[1]!.grade).toEqual({ subjectId: 'fa', value: 7.4, weight: 1, date: '2026-10-20', testName: 'Grammaire' });
    expect(rows[2]!.grade).toEqual({ subjectId: 'ne', value: 8, weight: 1, date: '2026-10-26', testName: 'Boekverslag' });
  });

  it('markeert onbekend vak, geen cijfer, cijfer buiten bereik en toekomstdatum', () => {
    const rows = parseGradeImport([
      'Duits;7,0',
      'Wiskunde;V',
      'Frans;12',
      'NE;8;2;31-12-2099',
      'alleenvak',
    ].join('\n'), opts);
    expect(rows.map((r) => r.status)).toEqual(['invalid', 'invalid', 'invalid', 'invalid', 'invalid']);
    expect(rows[0]!.reason).toMatch(/Onbekend vak/);
    expect(rows[1]!.reason).toMatch(/Geen geldig cijfer/);
    expect(rows[2]!.reason).toMatch(/buiten/);
    expect(rows[3]!.reason).toMatch(/toekomst/);
  });

  it('negeert lege regels en gebruikt een standaard toetsnaam als die ontbreekt', () => {
    const rows = parseGradeImport('\n\nWiskunde;7,5\n', opts);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.grade!.testName).toBe('Import 2026-10-26');
  });
});
