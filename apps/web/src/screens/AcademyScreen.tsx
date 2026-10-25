import { useMemo, useRef, useState, type FormEvent } from 'react';
import {
  academySubjectSummary, DEFAULT_MOTIVATION_CONFIG, weekStart, type AcademyDecision, type AcademyDecisionStatus,
} from '@rank11/engine';
import type { Nav } from '../App';
import { useStore } from '../state/store';
import { subjectById, todayIso } from '../state/school';
import {
  BANKS, buildEvent, buildSession, checkAnswer, formatAnswer, QUESTIONS_PER_SESSION, type AcademySubject, type Session,
} from '../academy/demoProvider';
import { IconAcademy, IconCheck, IconClose, IconInfo } from '../components/Icons';
import './academy.css';

const CAPS = DEFAULT_MOTIVATION_CONFIG.academy;

export const STATUS_LABEL: Record<AcademyDecisionStatus, string> = {
  rewarded: 'Beloond',
  duplicate: 'Al verwerkt',
  'not-linked': 'Niet gekoppeld',
  abandoned: 'Niet afgerond',
  'too-fast': 'Te snel',
  'no-learning-value': 'Geen nieuwe leerwinst',
  capped: 'Plafond bereikt',
  disabled: 'Academy staat uit',
};

const STATUS_EXPLAIN: Partial<Record<AcademyDecisionStatus, string>> = {
  'too-fast': `Je was sneller dan ${CAPS.minSecondsPerQuestion} seconden per vraag. Zo snel kunnen we niet zien dat je echt hebt geoefend, dus dit levert geen XP op. Je foute antwoorden komen wel terug als herkansing.`,
  abandoned: 'Een afgebroken oefening levert geen XP op. Je foute antwoorden komen wel terug als herkansing.',
  'no-learning-value': `Dezelfde oefening opnieuw levert alleen XP op als je score minstens ${Math.round(CAPS.improvedScoreMinDelta * 100)} procentpunt hoger is en er ${CAPS.repeatCooldownHours} uur tussen zit, of als je eerdere fouten nu goed hebt.`,
  capped: `Je hebt het maximum aan Academy XP bereikt (${CAPS.dailyCap} per dag, ${CAPS.weeklyCap} per week). Oefenen mag altijd; XP komt er morgen of volgende week weer bij.`,
};

const pct = (v: number | null) => (v === null ? '–' : `${Math.round(v * 100)}%`);

export function AcademyScreen({ nav, sub }: { nav: Nav; sub: string }) {
  return sub === 'oefenen' ? <Practice nav={nav} /> : <Overview nav={nav} />;
}

/* ———————————— Overzicht ———————————— */

function Overview({ nav }: { nav: Nav }) {
  const { state, xp } = useStore();
  const today = todayIso();
  const usage = useMemo(() => {
    const pos = state.xpLedger.filter((e) => e.category === 'academy' && e.xp > 0);
    return {
      day: pos.filter((e) => e.date === today).reduce((s, e) => s + e.xp, 0),
      week: pos.filter((e) => weekStart(e.date) === weekStart(today)).reduce((s, e) => s + e.xp, 0),
    };
  }, [state.xpLedger, today]);
  const summaries = BANKS.map((b) => ({ bank: b, s: academySubjectSummary(state.academy.events, state.xpLedger, b.id) }));
  const decisions = [...state.academy.decisions].reverse().slice(0, 8);
  const eventById = new Map(state.academy.events.map((e) => [e.eventId, e]));
  const retries = state.academy.wrong.length;

  return (
    <div className="page academy">
      <div className="page-head">
        <div>
          <div className="eyebrow">RANK Academy</div>
          <h1 className="display">Trainingskamp</h1>
          <p className="dim">Oefen voor je toetsen en verdien Academy XP. Je oefenscores worden nooit als schoolcijfer opgeslagen.</p>
        </div>
        <button className="btn" onClick={() => nav.go('academy-oefenen')}>Start oefening</button>
      </div>

      <div className="demo-note">
        <IconInfo />
        <span>Alleen de interne <b>RANK Oefenmodule</b> werkt in deze preview. De echte leeromgeving (leren.martijndenbesten.com) is niet gekoppeld: de koppeling is ontworpen, maar staat uit.</span>
      </div>

      <div className="kpis">
        <div className="kpi">
          <span className="kpi-label">Academy XP</span>
          <span className="kpi-value">{xp.byCategory.academy.toLocaleString('nl-NL')}</span>
          <span className="kpi-note">totaal verdiend</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Vandaag</span>
          <span className="kpi-value">{usage.day}<small>/{CAPS.dailyCap}</small></span>
          <div className="bar electric"><i style={{ width: `${Math.min(100, (usage.day / CAPS.dailyCap) * 100)}%` }} /></div>
        </div>
        <div className="kpi">
          <span className="kpi-label">Deze week</span>
          <span className="kpi-value">{usage.week}<small>/{CAPS.weeklyCap}</small></span>
          <div className="bar electric"><i style={{ width: `${Math.min(100, (usage.week / CAPS.weeklyCap) * 100)}%` }} /></div>
        </div>
        <div className="kpi">
          <span className="kpi-label">Herkansingen</span>
          <span className="kpi-value">{retries}</span>
          <span className="kpi-note">vragen die terugkomen</span>
        </div>
      </div>

      <div className="page-cols">
        <div className="stack">
          <section className="panel" aria-label="Per vak">
            <div className="panel-head"><h2>Per vak</h2></div>
            <ul className="rows">
              {summaries.map(({ bank, s }) => {
                const subj = subjectById(bank.id);
                return (
                  <li key={bank.id}>
                    <button className="row" onClick={() => nav.go('academy-oefenen')}>
                      <span className="subj-dot" style={{ background: subj.color }}>{subj.short}</span>
                      <div className="row-main">
                        <span className="row-title">{bank.name} · {bank.topicLabel}</span>
                        <span className="row-sub">
                          {s.count ? `${s.count} oefening${s.count === 1 ? '' : 'en'} · gemiddeld ${pct(s.averageScore)} goed · ${s.xp} XP` : 'Nog niet geoefend'}
                        </span>
                      </div>
                      {s.count > 0 && <span className="row-grade">{pct(s.averageScore)}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="panel" aria-label="Laatste oefeningen">
            <div className="panel-head"><h2>Laatste oefeningen</h2></div>
            {decisions.length ? (
              <ul className="rows">
                {decisions.map((d) => {
                  const e = eventById.get(d.eventId);
                  return (
                    <li key={d.eventId} className="row">
                      <div className="row-main">
                        <span className="row-title">{e ? `${subjectById(e.subjectId).name} · ${e.correctCount}/${e.questionCount} goed` : 'Oefening'}</span>
                        <span className="row-sub">{e ? new Date(e.completedAt).toLocaleString('nl-NL', { weekday: 'short', hour: '2-digit', minute: '2-digit' }) : ''} · {d.reason}</span>
                      </div>
                      <div className="row-end">
                        <span className={`tag ${d.status === 'rewarded' ? 'live' : ''}`}>{STATUS_LABEL[d.status]}</span>
                        <b className="acad-xp num">{d.xp > 0 ? `+${d.xp}` : '0'}</b>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="empty"><span>Nog geen oefeningen gedaan.</span></div>
            )}
          </section>
        </div>

        <div className="stack">
          <section className="panel electric" aria-label="Koppelingen">
            <div className="panel-head"><h2>Koppelingen</h2></div>
            <ul className="rows">
              <li className="row">
                <span className="acad-link on" aria-hidden="true"><IconCheck /></span>
                <div className="row-main">
                  <span className="row-title">RANK Oefenmodule</span>
                  <span className="row-sub">Gekoppeld · intern, demo</span>
                </div>
                <span className="tag live">Actief</span>
              </li>
              <li className="row">
                <span className="acad-link" aria-hidden="true"><IconClose /></span>
                <div className="row-main">
                  <span className="row-title">leren.martijndenbesten.com</span>
                  <span className="row-sub">Nog niet gekoppeld · koppeling ontworpen, staat uit</span>
                </div>
                <span className="tag demo">Uit</span>
              </li>
            </ul>
          </section>

          <section className="panel" aria-label="Zo verdien je Academy XP">
            <div className="panel-head"><h2>Zo werkt het</h2><IconAcademy width={20} height={20} className="dim" /></div>
            <ul className="acad-rules">
              <li><b>+{CAPS.completeXp}</b> eerste keer een oefening afgerond</li>
              <li><b>+{CAPS.highScoreXp}</b> bij {Math.round(CAPS.highScoreMin * 100)}% of meer goed</li>
              <li><b>+{CAPS.mistakeFixedXp}</b> per eerdere fout die je nu goed hebt (max {CAPS.mistakeFixedMaxPerActivity})</li>
              <li><b>+{CAPS.improvedScoreXp}</b> bij een betere score na {CAPS.repeatCooldownHours} uur</li>
              <li>Minimaal {CAPS.minSecondsPerQuestion} seconden per vraag; snel klikken levert niets op.</li>
              <li>Maximaal {CAPS.dailyCap} XP per dag en {CAPS.weeklyCap} per week.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ———————————— Oefenen ———————————— */

interface Answer { id: string; correct: boolean; retry: boolean; given: string }

function newSeed() {
  const a = new Uint32Array(2);
  crypto.getRandomValues(a);
  return `${a[0]}-${a[1]}`;
}

function Practice({ nav }: { nav: Nav }) {
  const { state, submitLearningEvent, recordWrongAnswers } = useStore();
  const [session, setSession] = useState<Session | null>(null);
  const [startedAt, setStartedAt] = useState('');
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [result, setResult] = useState<{ decision: AcademyDecision; correct: number; total: number; fixed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const retriesFor = (id: AcademySubject) => state.academy.wrong.filter((w) => w.startsWith(id === 'wis' ? 'wi-' : `${id}-`)).length;

  const start = (id: AcademySubject) => {
    setSession(buildSession(id, state.academy.wrong, newSeed()));
    setStartedAt(new Date().toISOString());
    setAnswers([]);
    setResult(null);
    setError(null);
  };

  const finish = (s: Session, list: Answer[], status: 'completed' | 'abandoned') => {
    const wrong = list.filter((a) => !a.correct).map((a) => a.id);
    const fixed = list.filter((a) => a.correct && a.retry).map((a) => a.id);
    const correct = list.filter((a) => a.correct).length;
    try {
      const event = buildEvent(s, { startedAt, completedAt: new Date().toISOString(), correct, answered: list.length, mistakesFixed: fixed.length, status });
      const decision = submitLearningEvent(event);
      recordWrongAnswers(wrong, fixed);
      if (status === 'abandoned') {
        setSession(null);
        return;
      }
      setResult({ decision, correct, total: s.questions.length, fixed: fixed.length });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (result && session) return <Result session={session} result={result} onAgain={() => start(session.bank.id)} onDone={() => { setSession(null); setResult(null); nav.go('academy'); }} />;
  if (session) {
    return (
      <Quiz
        key={startedAt}
        session={session}
        answers={answers}
        onAnswer={(a) => setAnswers((list) => [...list, a])}
        onFinish={(list) => finish(session, list, 'completed')}
        onQuit={() => (answers.length ? finish(session, answers, 'abandoned') : setSession(null))}
        error={error}
      />
    );
  }

  return (
    <div className="page academy">
      <div className="page-head">
        <div>
          <div className="eyebrow">RANK Oefenmodule</div>
          <h1 className="display">Kies je training</h1>
          <p className="dim">{QUESTIONS_PER_SESSION} vragen per oefening, direct nakijken. Telt mee als je minimaal {CAPS.minSecondsPerQuestion} seconden per vraag neemt; snel klikken levert niets op.</p>
        </div>
      </div>
      <div className="acad-banks">
        {BANKS.map((b) => {
          const subj = subjectById(b.id);
          const r = retriesFor(b.id);
          return (
            <button key={b.id} className="panel acad-bank" onClick={() => start(b.id)} style={{ ['--subj' as string]: subj.color }}>
              <span className="subj-dot" style={{ background: subj.color }}>{subj.short}</span>
              <span className="acad-bank-name">{b.name}</span>
              <span className="acad-bank-topic">{b.topicLabel}</span>
              <span className="row-sub">{b.description}</span>
              {r > 0 && <span className="tag lime">{r} herkansing{r === 1 ? '' : 'en'}</span>}
            </button>
          );
        })}
      </div>
      <p className="hint">Oefenscores zijn geen schoolcijfers en worden nooit in je cijferlijst gezet. Ze zijn alleen zichtbaar voor jou.</p>
    </div>
  );
}

function Quiz({ session, answers, onAnswer, onFinish, onQuit, error }: {
  session: Session; answers: Answer[]; onAnswer: (a: Answer) => void; onFinish: (list: Answer[]) => void; onQuit: () => void; error: string | null;
}) {
  const [feedback, setFeedback] = useState<Answer | null>(null);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  // Tijdens feedback is het antwoord al toegevoegd: de getoonde vraag is dan de vorige.
  const shownIdx = feedback ? answers.length - 1 : answers.length;
  const current = session.questions[Math.min(shownIdx, session.questions.length - 1)]!;
  const last = answers.length >= session.questions.length;

  const answer = (given: string) => {
    if (feedback || !given.trim()) return;
    const a: Answer = { id: current.id, correct: checkAnswer(current, given), retry: current.retry, given };
    setFeedback(a);
    onAnswer(a);
  };
  const next = () => {
    if (!feedback) return;
    if (last) {
      onFinish(answers);
      return;
    }
    setFeedback(null);
    setValue('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (feedback) next();
    else answer(value);
  };

  return (
    <div className="page academy quiz">
      <div className="quiz-top">
        <button className="link-btn" onClick={onQuit}>Stoppen</button>
        <span className="eyebrow">{session.bank.name} · vraag {shownIdx + 1} van {session.questions.length}</span>
      </div>
      <div className="quiz-progress" aria-hidden="true">
        {session.questions.map((qq, i) => (
          <i key={qq.id} data-state={i < answers.length ? (answers[i]!.correct ? 'ok' : 'bad') : i === shownIdx ? 'now' : undefined} />
        ))}
      </div>

      <section className="panel quiz-card" aria-live="polite">
        <div className="quiz-meta">
          <span className="dim">{current.instruction}</span>
          {current.retry && <span className="tag lime">Herkansing</span>}
        </div>
        <div className="quiz-prompt">{current.prompt}</div>

        <form onSubmit={submit} className="quiz-form">
          {current.kind === 'choice' ? (
            <div className="quiz-options">
              {current.options!.map((o) => {
                const isAnswer = o === current.answer;
                const chosen = feedback?.given === o;
                const state = feedback ? (isAnswer ? 'ok' : chosen ? 'bad' : 'off') : undefined;
                return (
                  <button key={o} type="button" className="quiz-option" data-state={state} disabled={!!feedback} onClick={() => answer(o)}>
                    {o}
                  </button>
                );
              })}
            </div>
          ) : (
            <label className="field">
              <span>{current.kind === 'fraction' ? 'Antwoord (bijv. 3/4)' : 'Antwoord'}</span>
              <input
                ref={inputRef}
                className="input grade-input"
                inputMode={current.kind === 'fraction' ? 'text' : 'decimal'}
                autoComplete="off"
                autoFocus
                value={feedback ? feedback.given : value}
                readOnly={!!feedback}
                aria-invalid={feedback ? !feedback.correct : undefined}
                onChange={(e) => setValue(e.target.value)}
              />
            </label>
          )}

          {feedback && (
            <div className={`quiz-feedback ${feedback.correct ? 'ok' : 'bad'}`} role="status">
              {feedback.correct ? <IconCheck /> : <IconClose />}
              <span>{feedback.correct ? (current.retry ? 'Goed! Deze fout heb je nu verbeterd.' : 'Goed!') : <>Helaas. Het juiste antwoord is <b>{formatAnswer(current)}</b>. Deze vraag komt terug als herkansing.</>}</span>
            </div>
          )}

          {(feedback || current.kind !== 'choice') && (
            <button className="btn" type="submit" disabled={!feedback && !value.trim()}>
              {feedback ? (last ? 'Bekijk resultaat' : 'Volgende vraag') : 'Controleer'}
            </button>
          )}
          {error && <p className="form-error">{error}</p>}
        </form>
      </section>
    </div>
  );
}

function Result({ session, result, onAgain, onDone }: {
  session: Session; result: { decision: AcademyDecision; correct: number; total: number; fixed: number }; onAgain: () => void; onDone: () => void;
}) {
  const { decision, correct, total, fixed } = result;
  const xp = decision.entries.reduce((s, e) => s + e.xp, 0);
  const capped = decision.entries.reduce((s, e) => s + (e.cappedBy ?? 0), 0);
  const explain = STATUS_EXPLAIN[decision.status];
  return (
    <div className="page academy">
      <section className="panel electric acad-result">
        <div className="eyebrow">{session.bank.name} · {session.bank.topicLabel}</div>
        <div className="acad-score">
          <span className="big-num">{correct}<small>/{total}</small></span>
          <div className="acad-score-meta">
            <span className="dim">{Math.round(decision.score * 100)}% goed{fixed ? ` · ${fixed} eerdere fout${fixed === 1 ? '' : 'en'} verbeterd` : ''}</span>
            <span className={`tag ${decision.status === 'rewarded' ? 'live' : ''}`}>{STATUS_LABEL[decision.status]}</span>
          </div>
        </div>

        {decision.entries.length > 0 && (
          <ul className="rows">
            {decision.entries.map((e) => (
              <li key={e.key} className="row">
                <div className="row-main">
                  <span className="row-title">{e.label}</span>
                  {e.cappedBy ? <span className="row-sub">{e.cappedBy} XP niet toegekend door het plafond</span> : null}
                </div>
                <b className="acad-xp num">+{e.xp}</b>
              </li>
            ))}
          </ul>
        )}
        <div className="acad-total">
          <span>Academy XP</span>
          <b className="num">+{xp}</b>
        </div>
        {capped > 0 && decision.status === 'rewarded' && <p className="hint">{STATUS_EXPLAIN.capped}</p>}
        {explain && <p className="hint">{explain}</p>}
        <p className="hint">Je oefenscore is niet als schoolcijfer opgeslagen.</p>
        <div className="acad-actions">
          <button className="btn" onClick={onAgain}>Nog een keer</button>
          <button className="btn ghost" onClick={onDone}>Naar overzicht</button>
        </div>
      </section>
    </div>
  );
}
