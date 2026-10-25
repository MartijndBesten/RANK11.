import { useState, type FormEvent } from 'react';
import { DEFAULT_MOTIVATION_CONFIG, PACKS } from '@rank11/engine';
import type { Nav } from '../../App';
import { useStore } from '../../state/store';
import { SUBJECTS, todayIso, addDays } from '../../state/school';
import { dayLabel, fmt, gradeClass, useGradeData } from '../../state/gradeData';
import { IconTrash } from '../../components/Icons';
import { parseNum } from './GradeForm';

/** Persoonlijke doelen en aankomende toetsen: de basis voor "wat moet ik halen" en de volgende beloning. */
export function GoalsView({ nav }: { nav: Nav }) {
  const { addGoal, removeGoal, addUpcoming, removeUpcoming, state } = useStore();
  const d = useGradeData();
  const [scope, setScope] = useState<'subject' | 'overall'>('subject');
  const [goalSubject, setGoalSubject] = useState(SUBJECTS[0]!.id);
  const [target, setTarget] = useState('7,0');
  const [goalError, setGoalError] = useState<string | null>(null);
  const [tSubject, setTSubject] = useState(SUBJECTS[0]!.id);
  const [tName, setTName] = useState('');
  const [tDate, setTDate] = useState(addDays(todayIso(), 7));
  const [tWeight, setTWeight] = useState('2');
  const [testError, setTestError] = useState<string | null>(null);
  const goalPack = PACKS[DEFAULT_MOTIVATION_CONFIG.progress.goalPackId]?.name ?? 'pack';

  const submitGoal = (e: FormEvent) => {
    e.preventDefault();
    const t = parseNum(target);
    if (!(t >= 1 && t <= 10)) return setGoalError('Kies een doel tussen 1 en 10.');
    addGoal({ scope, subjectId: scope === 'subject' ? goalSubject : undefined, target: Math.round(t * 10) / 10 });
    setGoalError(null);
  };
  const submitTest = (e: FormEvent) => {
    e.preventDefault();
    const res = addUpcoming({ subjectId: tSubject, name: tName, date: tDate, weight: parseNum(tWeight) });
    if (!res.ok) setTestError(res.error);
    else { setTestError(null); setTName(''); }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Cijfers</div>
          <h1 className="display">Doelen & toetsen</h1>
          <p className="dim small">Een bereikt doel levert eenmalig {DEFAULT_MOTIVATION_CONFIG.progress.goalXp} Vooruitgangs-XP en een {goalPack} op. Een doel dat je al haalt bij het instellen, telt niet.</p>
        </div>
      </div>

      <div className="page-cols even">
        <div className="stack">
          <section className="panel flush">
            <div className="panel-head"><h2>Mijn doelen</h2></div>
            {d.goals.length ? (
              <ul className="rows">
                {d.goals.map((g) => {
                  const s = g.goal.subjectId ? d.subjectById(g.goal.subjectId) : null;
                  return (
                    <li key={g.goal.id} className="row goal-row">
                      {s ? <span className="subj-dot" style={{ background: s.color }}>{s.short}</span> : <span className="subj-dot all">ALL</span>}
                      <div className="row-main">
                        <span className="row-title">{s ? s.name : 'Algemeen gemiddelde'} · doel {fmt(g.goal.target)}</span>
                        <div className={`bar ${g.achieved ? 'up' : ''}`}><i style={{ width: `${Math.max(4, g.progress * 100)}%` }} /></div>
                        <span className="row-sub" style={{ whiteSpace: 'normal' }}>
                          {g.achieved ? 'Gehaald!' : g.nextTest
                            ? g.nextTest.result.status === 'reachable' ? `Minimaal ${fmt(g.nextTest.result.required)} nodig voor ${g.nextTest.test.name} (${dayLabel(g.nextTest.test.date, d.today)})`
                              : g.nextTest.result.status === 'secured' ? 'Haal je sowieso bij de volgende toets.' : `Met alleen ${g.nextTest.test.name} niet haalbaar; daarna wel.`
                            : g.goal.scope === 'subject' ? 'Plan een toets voor dit vak om te zien wat je nodig hebt.' : `Nog ${fmt(g.gap)} te gaan.`}
                        </span>
                      </div>
                      <span className={`row-grade ${gradeClass(g.current)}`}>{fmt(g.current)}</span>
                      <button className="icon-action danger" aria-label="Doel verwijderen" onClick={() => removeGoal(g.goal.id)}><IconTrash /></button>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="hint" style={{ padding: '0 16px 14px' }}>Nog geen doelen.</p>}
          </section>

          <section className="panel">
            <div className="panel-head"><h2>Nieuw doel</h2></div>
            <form className="form" onSubmit={submitGoal}>
              <div className="seg" role="group" aria-label="Soort doel">
                <button type="button" aria-pressed={scope === 'subject'} onClick={() => setScope('subject')}>Vak</button>
                <button type="button" aria-pressed={scope === 'overall'} onClick={() => setScope('overall')}>Algemeen</button>
              </div>
              <div className="form-row">
                {scope === 'subject' && (
                  <label className="field"><span>Vak</span>
                    <select className="select" value={goalSubject} onChange={(e) => setGoalSubject(e.target.value)}>
                      {SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </label>
                )}
                <label className="field"><span>Doelgemiddelde</span>
                  <input className="input" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value.replace(/[^0-9.,]/g, '').slice(0, 4))} />
                </label>
              </div>
              {goalError && <p className="form-error" role="alert">{goalError}</p>}
              <p className="hint">Een nieuw doel voor hetzelfde vak vervangt het oude.</p>
              <button className="btn small" type="submit">Doel opslaan</button>
            </form>
          </section>
        </div>

        <div className="stack">
          <section className="panel flush">
            <div className="panel-head"><h2>Aankomende toetsen</h2></div>
            {d.upcoming.length ? (
              <ul className="rows">
                {d.upcoming.map((t) => (
                  <li key={t.id} className="row">
                    <span className="subj-dot" style={{ background: d.subjectById(t.subjectId).color }}>{d.subjectById(t.subjectId).short}</span>
                    <div className="row-main"><span className="row-title">{t.name}</span><span className="row-sub">{d.subjectById(t.subjectId).name} · {dayLabel(t.date, d.today)} · weging {String(t.weight).replace('.', ',')}</span></div>
                    <button className="icon-action danger" aria-label={`${t.name} verwijderen`} onClick={() => removeUpcoming(t.id)}><IconTrash /></button>
                  </li>
                ))}
              </ul>
            ) : <p className="hint" style={{ padding: '0 16px 14px' }}>Geen toetsen gepland.</p>}
            {state.upcoming.length > d.upcoming.length && <p className="hint" style={{ padding: '0 16px 14px' }}>Voorbije toetsen verdwijnen vanzelf uit dit lijstje; voer het cijfer in bij <button className="link-btn" onClick={() => nav.go('cijfers-invoeren')}>Invoeren</button>.</p>}
          </section>

          <section className="panel">
            <div className="panel-head"><h2>Toets plannen</h2></div>
            <form className="form" onSubmit={submitTest}>
              <div className="form-row">
                <label className="field"><span>Vak</span>
                  <select className="select" value={tSubject} onChange={(e) => setTSubject(e.target.value)}>
                    {SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </label>
                <label className="field"><span>Datum</span><input className="input" type="date" min={todayIso()} value={tDate} onChange={(e) => setTDate(e.target.value)} /></label>
              </div>
              <div className="form-row">
                <label className="field"><span>Toets</span><input className="input" value={tName} maxLength={80} placeholder="Bijv. SO H6" onChange={(e) => setTName(e.target.value)} /></label>
                <label className="field"><span>Weging</span><input className="input" inputMode="decimal" value={tWeight} onChange={(e) => setTWeight(e.target.value.replace(/[^0-9.,]/g, '').slice(0, 4))} /></label>
              </div>
              {testError && <p className="form-error" role="alert">{testError}</p>}
              <button className="btn small" type="submit">Toets toevoegen</button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
