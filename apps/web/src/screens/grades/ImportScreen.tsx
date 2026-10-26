import { useMemo, useRef, useState } from 'react';
import { parseGradeImport, importSummary, type ImportRow, type SubjectAlias } from '@rank11/engine';
import type { Nav } from '../../App';
import { SUBJECTS, subjectById, todayIso } from '../../state/school';
import { useStore, type GradeInput, type ImportOutcome } from '../../state/store';
import { fmt, shortDate } from '../../state/gradeData';
import { Help } from '../../components/Help';
import { IconCheck } from '../../components/Icons';

const ALIASES: SubjectAlias[] = SUBJECTS.map((s) => ({ id: s.id, aliases: [s.short, s.name] }));

const VOORBEELD = 'Wiskunde; 6,8; 2; 13-10-2026; SO H3\nFrans; 7,4; Grammaire; 20-10-2026\nEngels; 8,1; Reading Unit 3';

/** Meerdere cijfers tegelijk overnemen uit een bestand of door plakken. Controleoverzicht vóór het echt toevoegen. */
export function ImportScreen({ nav }: { nav: Nav }) {
  const { importGrades } = useStore();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportOutcome | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const rows = useMemo<ImportRow[]>(() => (text.trim() ? parseGradeImport(text, { subjects: ALIASES, today: todayIso() }) : []), [text]);
  const summary = importSummary(rows);
  const okRows = rows.filter((r) => r.status === 'ok');

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setText(typeof reader.result === 'string' ? reader.result : '');
    reader.readAsText(file);
  };

  const run = async () => {
    if (busy || !okRows.length) return;
    setBusy(true);
    try {
      const input: GradeInput[] = okRows.map((r) => r.grade!);
      setResult(await importGrades(input));
    } finally { setBusy(false); }
  };

  if (result) {
    return (
      <div className="page">
        <div className="page-head"><div><div className="eyebrow">Cijfers · importeren</div><h1 className="display">Klaar</h1></div></div>
        <section className="panel gold">
          <div className="entry-done">
            <div className="entry-done-icon"><IconCheck /></div>
            <h2 className="display">{result.created} toegevoegd</h2>
            <p>{result.created > 0 ? 'De beloningen wachten in de kluis.' : 'Er zijn geen nieuwe cijfers toegevoegd.'}</p>
            <ul className="import-tally">
              <li><b className="num">{result.created}</b> nieuw</li>
              <li><b className="num">{result.duplicate}</b> al aanwezig</li>
              <li><b className="num">{result.invalid}</b> overgeslagen</li>
            </ul>
            <div className="confirm-inline" style={{ justifyContent: 'center' }}>
              {result.created > 0 && <button className="btn" onClick={() => nav.go('cijfers-kluis')}>Open de kluis</button>}
              <button className="btn ghost small" onClick={() => { setResult(null); setText(''); }}>Nog een import</button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Cijfers · importeren</div>
          <h1 className="display">Meerdere cijfers tegelijk</h1>
          <p className="dim small">Plak een lijst of kies een bestand (.csv of .txt). Eén cijfer per regel: vak, cijfer, en optioneel weging, datum en toetsnaam.</p>
        </div>
      </div>
      <Help id="import" />
      <div className="page-cols">
        <section className="panel">
          <label className="field">
            <span>Plak je cijfers</span>
            <textarea className="input import-text" rows={8} value={text} spellCheck={false}
              placeholder={VOORBEELD} onChange={(e) => setText(e.target.value)} />
          </label>
          <div className="confirm-inline" style={{ marginTop: 10 }}>
            <button className="btn ghost small" type="button" onClick={() => fileRef.current?.click()}>Bestand kiezen</button>
            <button className="link-btn" type="button" onClick={() => setText(VOORBEELD)}>Voorbeeld invullen</button>
            <input ref={fileRef} type="file" accept=".csv,.txt,text/plain,text/csv" hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f); e.target.value = ''; }} />
          </div>
          <p className="hint" style={{ marginTop: 8 }}>Zelf overnemen uit je schoolsysteem. De cijfers krijgen het label "uit bestand" en zijn niet geverifieerd.</p>
        </section>

        <section className="panel flush">
          <div className="panel-head">
            <h2>Controleoverzicht</h2>
            {rows.length > 0 && <span className="tag self">{summary.ok} van {summary.total} klaar</span>}
          </div>
          {rows.length === 0 ? (
            <p className="dim" style={{ padding: '4px 16px 14px' }}>Zodra je iets plakt, zie je hier per regel of het klopt.</p>
          ) : (
            <ul className="rows import-rows">
              {rows.map((r, i) => (
                <li key={i} className="row" data-ok={r.status === 'ok'}>
                  {r.status === 'ok' ? (
                    <>
                      <span className="subj-dot" style={{ background: subjectById(r.grade!.subjectId).color }}>{subjectById(r.grade!.subjectId).short}</span>
                      <div className="row-main">
                        <span className="row-title">{r.grade!.testName}</span>
                        <span className="row-sub">{shortDate(r.grade!.date)} · weging {String(r.grade!.weight).replace('.', ',')}</span>
                      </div>
                      <span className="row-grade num">{fmt(r.grade!.value)}</span>
                    </>
                  ) : (
                    <>
                      <span className="subj-dot warn" aria-hidden="true">!</span>
                      <div className="row-main">
                        <span className="row-title">{r.raw}</span>
                        <span className="row-sub">{r.reason}</span>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
          {summary.ok > 0 && (
            <div style={{ padding: '10px 16px 4px' }}>
              <button className="btn" onClick={run} disabled={busy}>{busy ? 'Bezig…' : `Importeer ${summary.ok} ${summary.ok === 1 ? 'cijfer' : 'cijfers'}`}</button>
              <p className="hint" style={{ marginTop: 8 }}>Al ingevoerde cijfers (zelfde vak, cijfer en datum) worden overgeslagen; je krijgt nooit dubbele beloningen.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
