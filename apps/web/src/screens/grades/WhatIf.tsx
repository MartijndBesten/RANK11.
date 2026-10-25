import { useMemo, useState } from 'react';
import { compareScenarios, requiredForTarget, upcomingFor, whatIfMany, type FutureGrade } from '@rank11/engine';
import { useStore } from '../../state/store';
import { SUBJECTS } from '../../state/school';
import { fmt, gradeClass, useGradeData } from '../../state/gradeData';
import { IconPlus, IconTrash } from '../../components/Icons';
import { parseNum } from './GradeForm';

interface Draft { subjectId: string; value: string; weight: string }

/** Wat-als met meerdere toekomstige cijfers tegelijk, opgeslagen scenario's en "wat moet ik halen". */
export function WhatIfView() {
  const { grades, state, saveScenario, removeScenario } = useStore();
  const d = useGradeData();
  const first = d.upcoming[0];
  const [rows, setRows] = useState<Draft[]>(() => d.upcoming.slice(0, 2).map((t) => ({ subjectId: t.subjectId, value: '7', weight: String(t.weight) }))
    .concat(d.upcoming.length ? [] : [{ subjectId: SUBJECTS[0]!.id, value: '7', weight: '1' }]));
  const [name, setName] = useState('');
  const future: FutureGrade[] = rows.map((r) => ({ subjectId: r.subjectId, value: parseNum(r.value), weight: parseNum(r.weight) }))
    .filter((f) => f.value >= 1 && f.value <= 10 && f.weight > 0 && f.weight <= 10);
  const result = useMemo(() => (future.length ? whatIfMany(grades, future) : null), [grades, future]);
  const compared = useMemo(() => compareScenarios(grades, state.scenarios), [grades, state.scenarios]);

  const [reqSubject, setReqSubject] = useState(first?.subjectId ?? SUBJECTS[0]!.id);
  const [reqTarget, setReqTarget] = useState('7');
  const plannedWeights = upcomingFor(state.upcoming, reqSubject, d.today).map((t) => t.weight);
  const [extraWeight, setExtraWeight] = useState('1');
  const weights = plannedWeights.length ? plannedWeights : [parseNum(extraWeight) || 1];
  const tgt = parseNum(reqTarget);
  const req = tgt >= 1 && tgt <= 10 && grades.some((g) => g.subjectId === reqSubject) ? requiredForTarget(grades, reqSubject, tgt, weights) : null;
  const set = (i: number, patch: Partial<Draft>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Cijfers · simulatie</div>
          <h1 className="display">Wat als?</h1>
          <p className="dim small">Probeer cijfers uit. Een simulatie wordt nooit opgeslagen als cijfer en levert geen beloning op.</p>
        </div>
      </div>

      <div className="page-cols">
        <div className="stack">
          <section className="panel">
            <div className="panel-head"><h2>Mijn simulatie</h2></div>
            <div className="sim-rows">
              {rows.map((r, i) => (
                <div key={i} className="sim-row">
                  <select className="select" aria-label="Vak" value={r.subjectId} onChange={(e) => set(i, { subjectId: e.target.value })}>
                    {SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <input className="input sim-grade" aria-label="Cijfer" inputMode="decimal" value={r.value} onChange={(e) => set(i, { value: e.target.value.replace(/[^0-9.,]/g, '').slice(0, 4) })} />
                  <input className="input sim-weight" aria-label="Weging" inputMode="decimal" value={r.weight} onChange={(e) => set(i, { weight: e.target.value.replace(/[^0-9.,]/g, '').slice(0, 4) })} />
                  <button className="icon-action danger" aria-label="Regel verwijderen" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}><IconTrash /></button>
                </div>
              ))}
              <div className="sim-head dim small"><span>Vak</span><span>Cijfer</span><span>Weging</span></div>
            </div>
            <button className="btn ghost small" onClick={() => setRows((rs) => [...rs, { subjectId: rs.at(-1)?.subjectId ?? SUBJECTS[0]!.id, value: '7', weight: '1' }])} disabled={rows.length >= 8}>
              <IconPlus width={18} height={18} /> Cijfer toevoegen
            </button>

            {result && (
              <div className="sim-result">
                <ul className="rows">
                  {result.subjects.map((s) => (
                    <li key={s.subjectId} className="row">
                      <span className="subj-dot" style={{ background: d.subjectById(s.subjectId).color }}>{d.subjectById(s.subjectId).short}</span>
                      <span className="row-main row-title">{d.subjectById(s.subjectId).name}</span>
                      <span className="sim-change num"><span className={gradeClass(s.before)}>{fmt(s.before, 2)}</span> → <b className={gradeClass(s.after)}>{fmt(s.after, 2)}</b></span>
                    </li>
                  ))}
                  <li className="row">
                    <span className="subj-dot all">ALL</span>
                    <span className="row-main row-title">Algemeen gemiddelde</span>
                    <span className="sim-change num"><span>{fmt(result.overallBefore, 2)}</span> → <b className={gradeClass(result.overallAfter)}>{fmt(result.overallAfter, 2)}</b></span>
                  </li>
                </ul>
                <div className="sim-save">
                  <input className="input" value={name} maxLength={40} placeholder="Naam, bijv. Realistisch" aria-label="Naam van het scenario" onChange={(e) => setName(e.target.value)} />
                  <button className="btn small" onClick={() => { saveScenario({ name: name.trim() || `Scenario ${state.scenarios.length + 1}`, future }); setName(''); }}>Bewaar</button>
                </div>
              </div>
            )}
          </section>

          {compared.length > 0 && (
            <section className="panel flush">
              <div className="panel-head"><h2>Scenario's vergelijken</h2></div>
              <ul className="rows">
                {compared.map((c) => (
                  <li key={c.id} className="row">
                    <div className="row-main">
                      <span className="row-title">{c.name}</span>
                      <span className="row-sub">{c.subjects.map((s) => `${d.subjectById(s.subjectId).short} ${fmt(s.after)}`).join(' · ')}</span>
                    </div>
                    <span className={`row-grade ${gradeClass(c.overallAfter)}`}>{fmt(c.overallAfter, 2)}</span>
                    <button className="icon-action danger" aria-label={`${c.name} verwijderen`} onClick={() => removeScenario(c.id)}><IconTrash /></button>
                  </li>
                ))}
              </ul>
              <p className="hint" style={{ padding: '0 16px 14px' }}>Rechts: algemeen gemiddelde in dat scenario. Berekend met je huidige cijfers.</p>
            </section>
          )}
        </div>

        <section className="panel gold">
          <div className="panel-head"><h2>Wat moet ik halen?</h2></div>
          <div className="form">
            <div className="form-row">
              <label className="field"><span>Vak</span>
                <select className="select" value={reqSubject} onChange={(e) => setReqSubject(e.target.value)}>
                  {SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
              <label className="field"><span>Gewenst gemiddelde</span>
                <input className="input" inputMode="decimal" value={reqTarget} onChange={(e) => setReqTarget(e.target.value.replace(/[^0-9.,]/g, '').slice(0, 4))} />
              </label>
            </div>
            {plannedWeights.length
              ? <p className="hint">Op basis van {plannedWeights.length} geplande toets{plannedWeights.length === 1 ? '' : 'en'} (weging {plannedWeights.join(' + ')}), allemaal hetzelfde cijfer.</p>
              : <label className="field"><span>Weging volgende toets</span><input className="input" inputMode="decimal" value={extraWeight} onChange={(e) => setExtraWeight(e.target.value.replace(/[^0-9.,]/g, '').slice(0, 4))} /></label>}
          </div>
          {req ? (
            <div className={`req req-${req.status}`}>
              {req.status === 'reachable' && <><span className="kpi-label">Minimaal nodig</span><b className="big-num">{fmt(req.required)}</b><span className="dim small">gemiddeld op {weights.length === 1 ? 'je volgende toets' : `je ${weights.length} volgende toetsen`}</span></>}
              {req.status === 'secured' && <><b className="req-title">Al binnen</b><span className="dim small">Je haalt een {fmt(req.target)} ook met het laagst mogelijke cijfer.</span></>}
              {req.status === 'unreachable' && <><b className="req-title">Nog niet haalbaar</b><span className="dim small">Je zou een {fmt(req.required)} nodig hebben. Plan meer toetsen in of kies een tussendoel.</span></>}
            </div>
          ) : <p className="hint">Kies een vak waarin je al cijfers hebt.</p>}
        </section>
      </div>
    </div>
  );
}
