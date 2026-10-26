import { useMemo, useState } from 'react';
import { gradeImpacts, requiredForTarget, upcomingFor, type Grade } from '@rank11/engine';
import type { Nav } from '../../App';
import { useStore } from '../../state/store';
import { dayLabel, fmt, gradeClass, shortDate, useGradeData } from '../../state/gradeData';
import { GradeChart } from '../../components/charts';
import { Sheet } from '../../components/Sheet';
import { IconDown, IconEdit, IconHistory, IconTrash, IconUp } from '../../components/Icons';
import { GradeForm } from './GradeForm';

const fmtWhen = (iso: string) => new Date(iso).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const TYPE_LABEL = { add: 'Ingevoerd', correct: 'Gecorrigeerd', delete: 'Verwijderd' } as const;

export function SubjectsView({ nav }: { nav: Nav }) {
  const { state, pending, history, correctGrade, deleteGrade } = useStore();
  const d = useGradeData();
  const [sel, setSel] = useState(() => d.subjects[0]?.subject.id ?? '');
  const [editing, setEditing] = useState<Grade | null>(null);
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const row = d.subjects.find((r) => r.subject.id === sel) ?? d.subjects[0];
  const impacts = useMemo(() => new Map(row ? gradeImpacts(row.grades).map((i) => [i.gradeId, i]) : []), [row]);
  const deletedHere = useMemo(
    () => [...history.entries()].filter(([, h]) => h.at(-1)?.type === 'delete' && h.at(-1)?.before?.subjectId === sel).map(([id, h]) => ({ id, h })),
    [history, sel],
  );

  if (!row) {
    return <div className="page"><div className="panel empty"><b>Nog geen cijfers</b><button className="btn small" onClick={() => nav.go('cijfers-invoeren')}>Cijfer invoeren</button></div></div>;
  }
  const goal = state.goals.find((g) => g.scope === 'subject' && g.subjectId === row.subject.id);
  const next = upcomingFor(state.upcoming, row.subject.id, d.today)[0];
  const need = goal && next ? requiredForTarget(row.grades, row.subject.id, goal.target, [next.weight]) : null;
  const needPass = next ? requiredForTarget(row.grades, row.subject.id, 5.5, [next.weight]) : null;
  const list = [...row.grades].reverse();

  return (
    <div className="page">
      <div className="subject-picker" role="tablist" aria-label="Kies een vak">
        {d.subjects.map((r) => (
          <button key={r.subject.id} role="tab" aria-selected={r.subject.id === row.subject.id} className="subject-chip" onClick={() => { setSel(r.subject.id); setConfirmDel(null); }}
            style={{ ['--c' as string]: r.subject.color }}>
            <span className="subject-chip-short">{r.subject.short}</span>
            <span className={`num ${gradeClass(r.average)}`}>{fmt(r.average)}</span>
          </button>
        ))}
      </div>

      <div className="page-cols">
        <div className="stack">
          <section className="panel subject-hero" style={{ ['--c' as string]: row.subject.color }}>
            <div className="subject-hero-top">
              <div>
                <div className="eyebrow">{row.subject.name}</div>
                <div className={`big-num subject-avg ${gradeClass(row.average)}`}>{fmt(row.average, 2)}</div>
              </div>
              <div className="subject-hero-meta">
                <span className="dim small">{row.grades.length} cijfer{row.grades.length === 1 ? '' : 's'}</span>
                {row.trend.direction === 'insufficient'
                  ? <span className="dim small">Trend vanaf 3 cijfers</span>
                  : <span className={`delta ${row.trend.direction === 'up' ? 'up' : row.trend.direction === 'down' ? 'down' : 'flat'}`}>
                    {row.trend.direction === 'up' ? <IconUp /> : row.trend.direction === 'down' ? <IconDown /> : null}
                    {row.trend.direction === 'flat' ? 'stabiel' : fmt(Math.abs(row.trend.delta), 2)}
                  </span>}
                {goal && <span className="tag gold">doel {fmt(goal.target)}</span>}
              </div>
            </div>
            <GradeChart grades={row.grades} color={row.subject.color} />
          </section>

          {next && (
            <section className="panel">
              <div className="panel-head"><h2>Volgende toets</h2><span className="tag">{dayLabel(next.date, d.today)}</span></div>
              <p style={{ margin: '0 0 8px' }}><b>{next.name}</b> <span className="dim">· telt {String(next.weight).replace('.', ',')}× mee</span></p>
              <ul className="insights">
                {needPass && <li data-tone={needPass.status === 'secured' ? 'positive' : 'info'}>
                  {needPass.status === 'secured' ? 'Je blijft voldoende staan, wat je ook haalt.' : needPass.status === 'unreachable' ? 'Een voldoende gemiddelde zit er na deze toets nog niet in; daarna wel.' : `Voor een voldoende gemiddelde heb je minimaal een ${fmt(needPass.required)} nodig.`}
                </li>}
                {need && goal && <li data-tone={need.status === 'unreachable' ? 'attention' : 'positive'}>
                  {need.status === 'secured' ? `Je doel van ${fmt(goal.target)} haal je sowieso.` : need.status === 'unreachable' ? `Je doel van ${fmt(goal.target)} is met alleen deze toets niet haalbaar.` : `Voor je doel van ${fmt(goal.target)} heb je minimaal een ${fmt(need.required)} nodig.`}
                </li>}
              </ul>
            </section>
          )}
        </div>

        <section className="panel flush" aria-label={`Cijfers ${row.subject.name}`}>
          <div className="panel-head"><h2>Toetsen</h2><span className="tag self">zelf ingevoerd</span></div>
          <ul className="rows">
            {list.map((g) => {
              const imp = impacts.get(g.id);
              const isPending = pending.some((p) => p.grade.id === g.id);
              const edited = (history.get(g.id)?.length ?? 0) > 1;
              return (
                <li key={g.id} className="row grade-item">
                  <div className="row-main">
                    <span className="row-title">{g.testName}</span>
                    <span className="row-sub">
                      {shortDate(g.date)} · weging {String(g.weight).replace('.', ',')}
                      {imp && imp.before !== null && Math.abs(imp.delta) >= 0.005 ? ` · gemiddelde ${imp.delta > 0 ? '+' : '−'}${fmt(Math.abs(imp.delta), 2)}` : ''}
                    </span>
                    <span className="grade-tags">
                      {isPending && <span className="tag wait">beloning wacht</span>}
                      {edited && <span className="tag">aangepast</span>}
                    </span>
                    {confirmDel === g.id && (
                      <span className="confirm-inline del-confirm" role="group" aria-label="Verwijderen bevestigen">
                        <span className="small dim">{isPending ? 'Verwijderen?' : 'Verwijderen? De XP van dit cijfer gaat eraf.'}</span>
                        <button className="btn ghost small" onClick={async () => { await deleteGrade(g.id, 'Verwijderd door speler'); setConfirmDel(null); }}>Verwijder</button>
                        <button className="link-btn" onClick={() => setConfirmDel(null)}>Annuleren</button>
                      </span>
                    )}
                  </div>
                  <span className={`row-grade ${gradeClass(g.value)}`}>{fmt(g.value)}</span>
                  <div className="grade-actions">
                    <button className="icon-action" aria-label={`${g.testName} aanpassen`} onClick={() => setEditing(g)}><IconEdit /></button>
                    <button className="icon-action" aria-label={`Geschiedenis van ${g.testName}`} onClick={() => setShowHistory(g.id)}><IconHistory /></button>
                    <button className="icon-action danger" aria-label={`${g.testName} verwijderen`} onClick={() => setConfirmDel(g.id)}><IconTrash /></button>
                  </div>
                </li>
              );
            })}
          </ul>
          {deletedHere.length > 0 && (
            <p className="hint" style={{ padding: '0 16px 14px' }}>{deletedHere.length} verwijderd cijfer{deletedHere.length === 1 ? '' : 's'} blijft in de geschiedenis bewaard.</p>
          )}
        </section>
      </div>

      {editing && (
        <Sheet title="Cijfer aanpassen" onClose={() => setEditing(null)}>
          <GradeForm withReason submitLabel="Correctie opslaan" initial={editing} onSubmit={async (input, reason) => {
            const changes = Object.fromEntries(Object.entries(input).filter(([k, v]) => editing[k as keyof Grade] !== v));
            if (!Object.keys(changes).length) return { ok: false, error: 'Er is niets veranderd.' };
            const res = await correctGrade(editing.id, changes, reason);
            if (res.ok) setEditing(null);
            return res;
          }} />
          <p className="hint" style={{ marginTop: 10 }}>Een hoger cijfer levert alleen het verschil aan Prestatie-XP op; een lager cijfer kost geen XP. De oude waarde blijft in de geschiedenis.</p>
        </Sheet>
      )}
      {showHistory && (
        <Sheet title="Geschiedenis" onClose={() => setShowHistory(null)}>
          <ul className="rows">
            {(history.get(showHistory) ?? []).map((h, i) => (
              <li key={i} className="row">
                <div className="row-main">
                  <span className="row-title">{TYPE_LABEL[h.type]} · {fmtWhen(h.at)}</span>
                  <span className="row-sub" style={{ whiteSpace: 'normal' }}>
                    {h.type === 'add' && h.after && `${h.after.testName}: ${fmt(h.after.value)} (weging ${h.after.weight})`}
                    {h.type === 'correct' && h.before && h.after && `${fmt(h.before.value)} → ${fmt(h.after.value)}${h.before.weight !== h.after.weight ? `, weging ${h.before.weight} → ${h.after.weight}` : ''}${h.before.testName !== h.after.testName ? `, naam aangepast` : ''}${h.before.date !== h.after.date ? `, datum ${shortDate(h.before.date)} → ${shortDate(h.after.date)}` : ''}`}
                    {h.reason ? ` · ${h.reason}` : ''}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Sheet>
      )}
    </div>
  );
}
