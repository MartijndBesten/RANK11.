/**
 * Cijferboek als eventlog: zelf ingevoerde cijfers met correcties, verwijderingen en volledige
 * mutatiegeschiedenis. De huidige cijferlijst wordt altijd afgeleid uit de events (nooit los bewaard).
 * Er is bewust geen goedkeuringsstap: cijfers worden direct verwerkt (status 'zelf ingevoerd').
 */
import { gradeKey, validateGrade, DUTCH_SCALE, type Grade, type GradeScale } from './grades.ts';

export type GradeEvent =
  | { type: 'add'; at: string; grade: Grade }
  | { type: 'correct'; at: string; gradeId: string; changes: Partial<Pick<Grade, 'value' | 'weight' | 'testName' | 'date' | 'subjectId'>>; reason?: string }
  | { type: 'delete'; at: string; gradeId: string; reason?: string };

export interface GradeHistoryEntry { at: string; type: GradeEvent['type']; before?: Grade; after?: Grade; reason?: string }

export interface Gradebook {
  grades: Grade[];
  history: Map<string, GradeHistoryEntry[]>;
}

export class GradebookError extends Error {}

export function applyGradeEvents(events: readonly GradeEvent[]): Gradebook {
  const current = new Map<string, Grade>();
  const history = new Map<string, GradeHistoryEntry[]>();
  const log = (id: string, e: GradeHistoryEntry) => history.set(id, [...(history.get(id) ?? []), e]);
  for (const e of events) {
    if (e.type === 'add') {
      if (current.has(e.grade.id)) throw new GradebookError(`Cijfer ${e.grade.id} bestaat al.`);
      current.set(e.grade.id, e.grade);
      log(e.grade.id, { at: e.at, type: 'add', after: e.grade });
    } else if (e.type === 'correct') {
      const before = current.get(e.gradeId);
      if (!before) throw new GradebookError(`Cijfer ${e.gradeId} bestaat niet (meer).`);
      const after = { ...before, ...e.changes };
      current.set(e.gradeId, after);
      log(e.gradeId, { at: e.at, type: 'correct', before, after, reason: e.reason });
    } else {
      const before = current.get(e.gradeId);
      if (!before) throw new GradebookError(`Cijfer ${e.gradeId} bestaat niet (meer).`);
      current.delete(e.gradeId);
      log(e.gradeId, { at: e.at, type: 'delete', before, reason: e.reason });
    }
  }
  return { grades: [...current.values()], history };
}

export interface AddCheck { ok: boolean; duplicateOf?: string; error?: string }

/**
 * Controle vóór toevoegen: geldig cijfer en geen dubbele invoer van dezelfde toets
 * (zelfde vak, genormaliseerde toetsnaam en datum, of zelfde externe sleutel).
 */
export function checkNewGrade(book: Gradebook, grade: Grade, scale: GradeScale = DUTCH_SCALE, today?: string): AddCheck {
  try {
    validateGrade(grade, scale, today);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  const key = gradeKey(grade);
  const dup = book.grades.find((g) => gradeKey(g) === key);
  return dup ? { ok: false, duplicateOf: dup.id, error: 'Deze toets staat al in je cijferlijst. Pas hem aan in plaats van hem opnieuw in te voeren.' } : { ok: true };
}
