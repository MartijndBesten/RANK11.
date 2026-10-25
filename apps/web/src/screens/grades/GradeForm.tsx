import { useState, type FormEvent } from 'react';
import { SUBJECTS, todayIso } from '../../state/school';
import type { ActionResult, GradeInput } from '../../state/store';

export const parseNum = (s: string) => Number(s.trim().replace(',', '.'));
const WEIGHTS = [1, 2, 3, 4];

/** Formulier voor een nieuw of gecorrigeerd cijfer. De engine valideert; hier alleen invoergemak. */
export function GradeForm({ initial, submitLabel, onSubmit, withReason = false }: {
  initial?: Partial<GradeInput>;
  submitLabel: string;
  onSubmit: (input: GradeInput, reason?: string) => ActionResult;
  withReason?: boolean;
}) {
  const [subjectId, setSubject] = useState(initial?.subjectId ?? SUBJECTS[0]!.id);
  const [testName, setName] = useState(initial?.testName ?? '');
  const [value, setValue] = useState(initial?.value !== undefined ? String(initial.value).replace('.', ',') : '');
  const [weight, setWeight] = useState(initial?.weight !== undefined ? String(initial.weight).replace('.', ',') : '1');
  const [date, setDate] = useState(initial?.date ?? todayIso());
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const v = parseNum(value);
  const valueInvalid = value !== '' && !(v >= 1 && v <= 10);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim() || Number.isNaN(v)) return setError('Vul een cijfer in, bijvoorbeeld 7,4.');
    const res = onSubmit({ subjectId, testName, value: v, weight: parseNum(weight), date }, reason.trim() || undefined);
    if (!res.ok) setError(res.error);
    else setError(null);
  };

  return (
    <form className="form" onSubmit={submit} noValidate>
      <div className="form-row">
        <label className="field">
          <span>Vak</span>
          <select className="select" value={subjectId} onChange={(e) => setSubject(e.target.value)}>
            {SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Datum toets</span>
          <input className="input" type="date" value={date} max={todayIso()} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>
      <label className="field">
        <span>Toets</span>
        <input className="input" value={testName} maxLength={80} placeholder="Bijv. Toets H3 · Breuken" onChange={(e) => setName(e.target.value)} />
      </label>
      <div className="form-row">
        <label className="field">
          <span>Cijfer</span>
          <input className="input grade-input" inputMode="decimal" value={value} placeholder="7,4" aria-invalid={valueInvalid}
            onChange={(e) => setValue(e.target.value.replace(/[^0-9.,]/g, '').slice(0, 5))} />
        </label>
        <div className="field">
          <span>Weging</span>
          <div className="seg" role="group" aria-label="Weging">
            {WEIGHTS.map((w) => (
              <button key={w} type="button" aria-pressed={parseNum(weight) === w} onClick={() => setWeight(String(w))}>{w}×</button>
            ))}
          </div>
          <input className="input" inputMode="decimal" aria-label="Andere weging" value={weight} onChange={(e) => setWeight(e.target.value.replace(/[^0-9.,]/g, '').slice(0, 4))} style={{ height: 38 }} />
        </div>
      </div>
      {withReason && (
        <label className="field">
          <span>Reden (optioneel)</span>
          <input className="input" value={reason} maxLength={120} placeholder="Bijv. verkeerd overgenomen" onChange={(e) => setReason(e.target.value)} />
        </label>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="btn" type="submit">{submitLabel}</button>
    </form>
  );
}
