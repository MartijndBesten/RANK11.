import { useMemo } from 'react';
import { achievements, distribution, heavyTestInfluence, passRate, personalRecords } from '@rank11/engine';
import type { Nav } from '../../App';
import { useStore } from '../../state/store';
import { fmt, gradeClass, shortDate, useGradeData } from '../../state/gradeData';
import { DistributionBars, GradeBar, Sparkline } from '../../components/charts';
import { IconCheck, IconDown, IconPlus, IconUp } from '../../components/Icons';

const CAT_LABEL = { performance: 'Prestatie', progress: 'Vooruitgang', academy: 'Academy' } as const;

export function GradesOverview({ nav }: { nav: Nav }) {
  const { grades, state, xp } = useStore();
  const d = useGradeData();
  const records = useMemo(() => personalRecords(grades), [grades]);
  const heavy = useMemo(() => heavyTestInfluence(grades), [grades]);
  const pass = passRate(grades);
  const ach = useMemo(() => achievements({
    grades, goals: state.goals,
    academyCompleted: state.academy.events.filter((e) => e.status === 'completed').length,
    academyMistakesFixed: state.academy.events.reduce((s, e) => s + e.mistakesFixed, 0),
  }), [grades, state.goals, state.academy.events]);
  const periodDelta = d.periodOverall !== null && d.prevPeriodOverall !== null ? d.periodOverall - d.prevPeriodOverall : null;
  const ledger = [...state.xpLedger].reverse().slice(0, 8);
  const goalFor = (sid: string) => state.goals.find((g) => g.scope === 'subject' && g.subjectId === sid)?.target;

  if (!grades.length) {
    return (
      <div className="page">
        <div className="panel empty">
          <b>Nog geen cijfers</b>
          <span>Voer je eerste cijfer in. Je ziet hier daarna je gemiddelden, verloop en inzichten.</span>
          <button className="btn small" onClick={() => nav.go('cijfers-invoeren')}>Cijfer invoeren</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Cijfers · {d.period.name}</div>
          <h1 className="display">Mijn cijfers</h1>
          <p className="dim small">Je gemiddelden en je volgende stap.</p>
        </div>
        <button className="btn small" onClick={() => nav.go('cijfers-invoeren')}><IconPlus width={18} height={18} /> Cijfer invoeren</button>
      </div>

      <div className="kpis grade-kpis">
        <div className="kpi">
          <span className="kpi-label">Alle periodes</span>
          <span className={`kpi-value ${gradeClass(d.overall)}`}>{fmt(d.overall)}</span>
          <Sparkline values={d.overallRunning.map((p) => p.average)} />
        </div>
        <div className="kpi">
          <span className="kpi-label">{d.period.name}</span>
          <span className={`kpi-value ${gradeClass(d.periodOverall)}`}>{fmt(d.periodOverall)}</span>
          <span className="kpi-note">
            {periodDelta !== null
              ? <span className={`delta ${periodDelta > 0.04 ? 'up' : periodDelta < -0.04 ? 'down' : 'flat'}`}>{periodDelta > 0.04 ? <IconUp /> : periodDelta < -0.04 ? <IconDown /> : null}{fmt(Math.abs(periodDelta), 2)} t.o.v. {d.prev?.name.toLowerCase()}</span>
              : 'Nog niet te vergelijken'}
          </span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Voldoendes</span>
          <span className="kpi-value">{pass === null ? '–' : Math.round(pass * 100)}<small>%</small></span>
          <span className="kpi-note">{grades.filter((g) => g.value >= 5.5).length} van {grades.length} cijfers</span>
        </div>
      </div>

      <div className="page-cols">
        <div className="stack">
          <section className="panel flush" aria-label="Gemiddelde per vak">
            <div className="panel-head"><h2>Per vak</h2><button className="link-btn" onClick={() => nav.go('cijfers-vakken')}>Details</button></div>
            <ul className="rows">
              {d.subjects.map((r) => (
                <li key={r.subject.id}>
                  <button className="row subj-row" onClick={() => nav.go('cijfers-vakken')}>
                    <span className="subj-dot" style={{ background: r.subject.color }}>{r.subject.short}</span>
                    <div className="row-main">
                      <span className="row-title">{r.subject.name}</span>
                      <GradeBar value={r.average} target={goalFor(r.subject.id)} />
                      <span className="row-sub">{r.grades.length} cijfer{r.grades.length === 1 ? '' : 's'} · laatste {fmt(r.last?.value)}
                        {r.trend.direction === 'insufficient' ? '' : r.trend.direction === 'flat' ? ' · stabiel' : ` · ${r.trend.direction === 'up' ? '▲' : '▼'} ${fmt(Math.abs(r.trend.delta), 2)}`}</span>
                    </div>
                    <span className={`row-grade ${gradeClass(r.average)}`}>{fmt(r.average)}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="hint" style={{ padding: '0 16px 14px' }}>Streepje = voldoende (5,5); blauw blokje = je doel.</p>
          </section>

          <section className="panel electric" aria-label="Inzichten">
            <div className="panel-head"><h2>Dit helpt je verder</h2></div>
            {d.insights.length ? (
              <>
                <ul className="insights">{d.insights.slice(0, 1).map((i) => <li key={i.id} data-tone={i.tone}>{i.text}</li>)}</ul>
                {d.insights.length > 1 && <details className="disclosure inline-details">
                  <summary>Meer inzichten ({d.insights.length - 1})</summary>
                  <ul className="insights">{d.insights.slice(1).map((i) => <li key={i.id} data-tone={i.tone}>{i.text}</li>)}</ul>
                </details>}
              </>
            ) : <p className="hint">Nog te weinig cijfers voor betrouwbare inzichten.</p>}
          </section>
        </div>

        <div className="stack">
          <details className="panel disclosure" aria-label="Verdeling">
            <summary>Verdeling en toetsweging</summary>

            <p className="hint">{grades.length} cijfers · zware toetsen vormen {Math.round(heavy.share * 100)}% van je totale weging ({heavy.count} met weging 3 of hoger).</p>
            <DistributionBars bins={distribution(grades)} />
            <p className="hint">Gemiddelden per vak zijn gewogen. Het algemene gemiddelde is het gemiddelde van je vakgemiddelden.</p>
          </details>

          <details className="panel disclosure" aria-label="Persoonlijke records">
            <summary>Persoonlijke records</summary>

            <div className="records">
              <div><span className="kpi-label">Hoogste cijfer</span><b className="grade-high">{fmt(records.bestGrade?.value)}</b><small>{records.bestGrade ? `${d.subjectById(records.bestGrade.subjectId).name} · ${shortDate(records.bestGrade.date)}` : ''}</small></div>
              <div><span className="kpi-label">Beste vak</span><b>{fmt(records.bestSubjectAverage?.average)}</b><small>{records.bestSubjectAverage ? d.subjectById(records.bestSubjectAverage.subjectId).name : ''}</small></div>
              <div><span className="kpi-label">Grootste sprong</span><b className="grade-ok">{records.biggestJump && records.biggestJump.delta > 0 ? `+${fmt(records.biggestJump.delta, 2)}` : '–'}</b><small>{records.biggestJump && records.biggestJump.delta > 0 ? d.subjectById(records.biggestJump.subjectId).name : 'nog geen'}</small></div>
              <div><span className="kpi-label">Voldoendes op rij</span><b>{records.longestPassRun}</b><small>langste reeks toetsen</small></div>
            </div>
          </details>

          <details className="panel disclosure" aria-label="XP">
            <summary>XP en beloningen</summary>

            <div className="xp-split">
              {(['performance', 'progress', 'academy'] as const).map((c) => (
                <div key={c}><span className="kpi-label">{CAT_LABEL[c]}</span><b className="num">{xp.byCategory[c]}</b></div>
              ))}
            </div>
            <ul className="rows ledger">
              {ledger.map((e) => (
                <li key={e.key} className="row">
                  <div className="row-main"><span className="row-title">{e.label}</span><span className="row-sub">{CAT_LABEL[e.category]} · {shortDate(e.date)}{e.cappedBy ? ` · ${e.cappedBy} XP boven plafond` : ''}</span></div>
                  <b className={`num ${e.xp < 0 ? 'grade-low' : ''}`}>{e.xp > 0 ? '+' : ''}{e.xp}</b>
                </li>
              ))}
            </ul>
            <p className="hint">Plafonds per dag en week voorkomen farmen. Verwijder je een cijfer, dan gaat de XP ervan weer af.</p>
          </details>

          <details className="panel disclosure" aria-label="Prestaties">
            <summary>Prestaties</summary>

            <ul className="ach">
              {ach.filter((a) => a.group !== 'academy' || state.settings.academy).map((a) => (
                <li key={a.id} data-done={a.achieved || undefined}>
                  <span className="ach-icon">{a.achieved ? <IconCheck /> : `${Math.round(a.progress * 100)}%`}</span>
                  <div className="row-main"><span className="row-title">{a.title}</span><span className="row-sub">{a.description}</span></div>
                </li>
              ))}
            </ul>
          </details>
        </div>
      </div>
    </div>
  );
}
