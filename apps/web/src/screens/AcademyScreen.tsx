import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import {
  PACKS, PRACTICE_SUBJECTS, type AcademyDecisionStatus, type PracticeSubjectId, type PublicPracticeSession, type TopicProgressRow,
} from '@rank11/engine';
import type { Nav } from '../App';
import { useStore } from '../state/store';
import { subjectById } from '../state/school';
import type { AcademyOverview, PracticeResult } from '../academy/types';
import { IconCheck, IconClose, IconInfo } from '../components/Icons';
import './academy.css';
import { Help } from '../components/Help';

export const STATUS_LABEL: Record<AcademyDecisionStatus, string> = {
  rewarded: 'Beloond',
  duplicate: 'Al verwerkt',
  'not-linked': 'Niet gekoppeld',
  abandoned: 'Afgebroken',
  'too-fast': 'Niet beloond',
  'no-learning-value': 'Geen nieuwe leerwinst',
  'low-score': 'Nog niet beloond',
  capped: 'Plafond bereikt',
  disabled: 'Academy staat uit',
};
const statusLabel = (s: string) => STATUS_LABEL[s as AcademyDecisionStatus] ?? s;

const STATUS_EXPLAIN: Partial<Record<AcademyDecisionStatus, string>> = {
  abandoned: 'Een afgebroken oefening levert geen XP op. De vragen die je wel beantwoordde, tellen mee voor je herhaling.',
  'no-learning-value': 'XP is er alleen voor echte vooruitgang: nieuwe stof, verbeterde fouten en een betere score dan eerder. Dezelfde oefening herhalen levert niets op.',
  'low-score': 'XP voor afronden krijg je vanaf de helft goed. Je fouten komen morgen terug als herkansing; goed bij een latere oefening levert wel XP op.',
  capped: 'Je hebt het maximum aan Academy XP voor vandaag of deze week bereikt. Oefenen mag altijd; je voortgang per onderwerp telt gewoon door.',
  disabled: 'De Academy staat uit in de instellingen.',
};

const REASON: Record<string, { label: string; cls: string }> = {
  fix: { label: 'Herkansing', cls: 'fix' },
  review: { label: 'Herhaling', cls: 'review' },
  new: { label: 'Nieuw', cls: 'new' },
  extra: { label: 'Extra oefening', cls: 'extra' },
};

export function AcademyScreen({ nav, sub }: { nav: Nav; sub: string }) {
  return sub === 'oefenen' ? <Practice nav={nav} /> : <Overview nav={nav} />;
}

/** Overzicht laden via de actieve backend (lokaal of server). */
function useOverview() {
  const { practice, xp } = useStore();
  const [data, setData] = useState<AcademyOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(() => {
    practice.overview().then((d) => { setData(d); setError(null); }, (e) => setError(e instanceof Error ? e.message : 'Kan de Academy niet laden.'));
  }, [practice]);
  // Opnieuw laden als de Academy-XP verandert (na een oefening).
  useEffect(() => { reload(); }, [reload, xp.byCategory.academy]);
  return { data, error, reload };
}

/** Gestapelde voortgangsbalk: beheerst / aan het leren / nieuw. */
function TopicBar({ t }: { t: TopicProgressRow }) {
  const w = (n: number) => `${t.total ? (n / t.total) * 100 : 0}%`;
  return (
    <div className="topic-bar" role="img" aria-label={`${t.label}: ${t.mastered} beheerst, ${t.learning} aan het leren, ${t.fresh} nieuw van ${t.total}`}>
      <i className="m" style={{ width: w(t.mastered) }} />
      <i className="l" style={{ width: w(t.learning) }} />
    </div>
  );
}

function TopicRows({ rows, onPractice }: { rows: TopicProgressRow[]; onPractice?: (t: TopicProgressRow) => void }) {
  return (
    <ul className="rows topic-rows">
      {rows.map((t) => (
        <li key={`${t.subjectId}-${t.topic}`}>
          <button className="row topic-row" onClick={onPractice ? () => onPractice(t) : undefined} disabled={!onPractice}>
            <div className="row-main">
              <span className="row-title">{t.label}</span>
              <TopicBar t={t} />
              <span className="row-sub">{t.mastered} beheerst · {t.learning} aan het leren · {t.fresh} nieuw{t.due ? ` · ${t.due} nu aan de beurt` : ''}</span>
            </div>
            <span className="row-grade num">{Math.round(t.pct * 100)}<small>%</small></span>
          </button>
        </li>
      ))}
    </ul>
  );
}

const Legend = () => (
  <div className="topic-legend dim small"><span><i className="m" /> beheerst</span><span><i className="l" /> aan het leren</span><span><i /> nieuw</span></div>
);

/* ———————————— Overzicht ———————————— */

function Overview({ nav }: { nav: Nav }) {
  const { practice, mode } = useStore();
  const { data, error, reload } = useOverview();
  if (error) return <div className="page"><div className="panel empty"><b>Academy niet beschikbaar</b><span>{error}</span><button className="btn small" onClick={reload}>Opnieuw</button></div></div>;
  if (!data) return <div className="page"><div className="panel empty"><span>Academy wordt geladen…</span></div></div>;
  const due = data.progress.reduce((s, t) => s + t.due, 0);

  return (
    <div className="page academy">
      <div className="page-head">
        <div>
          <div className="eyebrow">RANK Academy</div>
          <h1 className="display">Trainingskamp</h1>
          <p className="dim">Kies een vak en oefen zes vragen. Je oefenscore telt niet als schoolcijfer.</p>
        </div>
        <button className="btn" onClick={() => nav.go('academy-oefenen')}>Oefenen</button>
      </div>
      <Help id="academy" />

      {due > 0 && (
        <button className="panel electric acad-due" onClick={() => nav.go('academy-oefenen')}>
          <div className="row-main">
            <span className="eyebrow">Nu aan de beurt</span>
            <b className="acad-due-title">{due} {due === 1 ? 'vraag' : 'vragen'} om te herhalen</b>
            <span className="row-sub">Herkansingen en herhalingen staan bovenaan in je volgende oefening.</span>
          </div>
          <span className="btn small">Start</span>
        </button>
      )}

      <div className="kpis">
        <div className="kpi">
          <span className="kpi-label">Academy XP</span>
          <span className="kpi-value">{data.xp.total.toLocaleString('nl-NL')}</span>
          <span className="kpi-note">totaal verdiend</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Vandaag</span>
          <span className="kpi-value">{data.xp.today}<small>/{data.xp.dailyCap}</small></span>
          <div className="bar electric"><i style={{ width: `${Math.min(100, (data.xp.today / data.xp.dailyCap) * 100)}%` }} /></div>
        </div>
        <div className="kpi">
          <span className="kpi-label">Deze week</span>
          <span className="kpi-value">{data.xp.week}<small>/{data.xp.weeklyCap}</small></span>
          <div className="bar electric"><i style={{ width: `${Math.min(100, (data.xp.week / data.xp.weeklyCap) * 100)}%` }} /></div>
        </div>
      </div>

      <div className="page-cols">
        <div className="stack">
          {data.subjects.map((s) => {
            const subj = subjectById(s.id);
            return (
              <section key={s.id} className="panel flush" aria-label={s.name}>
                <div className="panel-head"><h2 className="acad-subject-head"><span className="subj-dot" style={{ background: subj.color }}>{subj.short}</span> {s.name}</h2></div>
                <TopicRows rows={data.progress.filter((t) => t.subjectId === s.id)} onPractice={() => nav.go('academy-oefenen')} />
              </section>
            );
          })}
          <Legend />
        </div>

        <div className="stack">
          <details className="panel disclosure" aria-label="Zo werkt het">
            <summary>Hoe werkt oefenen?</summary>

            <ul className="insights">
              <li>Een fout komt na een dag terug als herkansing. Goed in een latere oefening telt als verbeterde fout.</li>
              <li>Goed bij herhaling: de vraag komt steeds later terug (1, 3, 7, 14 dagen). Drie keer gespreid goed = beheerst.</li>
              <li>XP alleen voor echte vooruitgang: nieuwe stof, verbeterde fouten en betere scores. Dezelfde oefening herhalen levert niets op. Geen tijdsdruk: neem de tijd die je nodig hebt.</li>
            </ul>
          </details>

          <details className="panel disclosure" aria-label="Laatste oefeningen">
            <summary>Laatste oefeningen</summary>

            {data.recent.length ? (
              <ul className="rows">
                {data.recent.slice(0, 8).map((r) => (
                  <li key={r.eventId} className="row">
                    <div className="row-main">
                      <span className="row-title">{r.subjectId ? `${subjectById(r.subjectId).name} · ` : ''}{r.correctCount}/{r.questionCount} goed{r.mistakesFixed ? ` · ${r.mistakesFixed} verbeterd` : ''}</span>
                      <span className="row-sub">{r.topic}{r.at ? ` · ${new Date(r.at).toLocaleString('nl-NL', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}</span>
                    </div>
                    <div className="row-end">
                      <span className={`tag ${r.decision === 'rewarded' ? 'live' : ''}`}>{statusLabel(r.decision)}</span>
                      <b className="acad-xp num">{r.xp > 0 ? `+${r.xp}` : '0'}</b>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <div className="empty"><span>Nog geen oefeningen gedaan.</span></div>}
          </details>

          <details className="panel electric disclosure" aria-label="Koppelingen">
            <summary>Oefenmodule en koppelingen</summary>

            <ul className="rows">
              <li className="row">
                <span className="acad-link on" aria-hidden="true"><IconCheck /></span>
                <div className="row-main">
                  <span className="row-title">RANK Oefenmodule</span>
                  <span className="row-sub">{practice.kind === 'server' ? 'Actief · de server maakt en kijkt na' : 'Actief · demo, nagekeken op dit toestel'}</span>
                </div>
                <span className="tag live">actief</span>
              </li>
              <li className="row">
                <span className="acad-link" aria-hidden="true"><IconClose /></span>
                <div className="row-main">
                  <span className="row-title">leren.martijndenbesten.com</span>
                  <span className="row-sub">Koppeling voorbereid, niet gekoppeld · de site is niet gewijzigd</span>
                </div>
                <span className="tag demo">uit</span>
              </li>
            </ul>
          </details>
        </div>
      </div>
    </div>
  );
}

/* ———————————— Oefenen ———————————— */

type Phase =
  | { k: 'kies' }
  | { k: 'vraag'; session: PublicPracticeSession; index: number; answers: Record<string, string> }
  | { k: 'klaar'; session: PublicPracticeSession; result: PracticeResult };

function Practice({ nav }: { nav: Nav }) {
  const { practice } = useStore();
  const { data } = useOverview();
  const [phase, setPhase] = useState<Phase>({ k: 'kies' });
  const [subject, setSubject] = useState<PracticeSubjectId | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  const start = async (subjectId: PracticeSubjectId, topic: string | null) => {
    setBusy(true); setError(null);
    try {
      const session = await practice.start(subjectId, topic);
      setPhase({ k: 'vraag', session, index: 0, answers: {} });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kan geen oefening starten.');
    } finally {
      setBusy(false);
    }
  };

  const submit = async (session: PublicPracticeSession, answers: Record<string, string>, abandoned = false) => {
    setBusy(true); setError(null);
    try {
      const result = await practice.submit(session.id, answers, abandoned);
      setLeaving(false);
      setPhase(abandoned ? { k: 'kies' } : { k: 'klaar', session, result });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Inleveren lukte niet.');
    } finally {
      setBusy(false);
    }
  };

  if (phase.k === 'vraag') {
    const { session, index, answers } = phase;
    const item = session.items[index]!;
    const last = index === session.items.length - 1;
    const topicLabel = session.topic ? PRACTICE_SUBJECTS.find((s) => s.id === session.subjectId)?.topics.find((t) => t.id === session.topic)?.label : 'mix';
    const setAnswer = (v: string) => setPhase({ ...phase, answers: { ...answers, [item.id]: v } });
    const next = () => (last ? void submit(session, answers) : setPhase({ ...phase, index: index + 1 }));
    return (
      <div className="page academy quiz">
        <div className="quiz-top">
          <div className="eyebrow">{subjectById(session.subjectId).name} · {topicLabel}</div>
          {leaving ? (
            <span className="confirm-inline">
              <span className="small dim">Stoppen? Beantwoorde vragen tellen mee voor herhaling, XP niet.</span>
              <button className="btn ghost small" disabled={busy} onClick={() => void submit(session, answers, true)}>Stoppen</button>
              <button className="link-btn" onClick={() => setLeaving(false)}>Doorgaan</button>
            </span>
          ) : <button className="link-btn" onClick={() => setLeaving(true)}>Stoppen</button>}
        </div>
        <div className="quiz-progress" aria-hidden="true">
          {session.items.map((it, i) => <i key={it.id} data-state={i === index ? 'now' : answers[it.id] !== undefined ? 'done' : undefined} />)}
        </div>
        <QuestionCard key={item.id} item={item} index={index} count={session.items.length} value={answers[item.id] ?? ''} onChange={setAnswer}
          onNext={next} last={last} busy={busy} onBack={index > 0 ? () => setPhase({ ...phase, index: index - 1 }) : undefined} />
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
    );
  }

  if (phase.k === 'klaar') return <Result session={phase.session} result={phase.result} onAgain={() => setPhase({ k: 'kies' })} onOverview={() => nav.go('academy')} />;

  const chosen = subject ? PRACTICE_SUBJECTS.find((s) => s.id === subject) : null;
  const progressOf = (sid: string, topic?: string) => (data?.progress ?? []).filter((t) => t.subjectId === sid && (!topic || t.topic === topic));
  const dueOf = (sid: string, topic?: string) => progressOf(sid, topic).reduce((s, t) => s + t.due, 0);

  return (
    <div className="page academy">
      <div className="page-head">
        <div>
          <div className="eyebrow">RANK Academy · oefenen</div>
          <h1 className="display">{chosen ? chosen.name : 'Kies je training'}</h1>
          <p className="dim">{chosen ? 'Kies een onderwerp of oefen alles door elkaar.' : 'Zes vragen per oefening. Herkansingen en herhalingen eerst, daarna nieuwe stof.'}</p>
        </div>
        {chosen && <button className="link-btn" onClick={() => setSubject(null)}>Ander vak</button>}
      </div>
      <p className="hint acad-rule"><IconInfo width={16} height={16} /> XP alleen voor echte vooruitgang: nieuwe stof, verbeterde fouten en betere scores; dezelfde oefening herhalen levert niets op. Geen tijdslimiet.</p>
      {error && <p className="form-error" role="alert">{error}</p>}

      {!chosen ? (
        <div className="acad-banks">
          {PRACTICE_SUBJECTS.map((s) => {
            const subj = subjectById(s.id);
            const rows = progressOf(s.id);
            const total = rows.reduce((a, t) => a + t.total, 0);
            const mastered = rows.reduce((a, t) => a + t.mastered, 0);
            const due = dueOf(s.id);
            return (
              <button key={s.id} className="panel acad-bank" style={{ ['--subj' as string]: subj.color }} disabled={busy}
                onClick={() => (s.topics.length > 1 ? setSubject(s.id) : void start(s.id, s.topics[0]!.id))}>
                <span className="subj-dot" style={{ background: subj.color }}>{subj.short}</span>
                <span className="acad-bank-name">{s.name}</span>
                <span className="acad-bank-topic">{s.topics.map((t) => t.label).join(' · ')}</span>
                <span className="row-sub">{mastered}/{total} beheerst</span>
                {due > 0 ? <span className="tag wait">{due} aan de beurt</span> : <span className="tag">start</span>}
              </button>
            );
          })}
        </div>
      ) : (
        <section className="panel flush">
          <ul className="rows topic-rows">
            <li>
              <button className="row topic-row" disabled={busy} onClick={() => void start(chosen.id, null)}>
                <div className="row-main"><span className="row-title">Mix van alle onderwerpen</span><span className="row-sub">{dueOf(chosen.id) ? `${dueOf(chosen.id)} vragen aan de beurt` : 'Alles door elkaar'}</span></div>
                <span className="btn small">Start</span>
              </button>
            </li>
            {chosen.topics.map((t) => {
              const row = progressOf(chosen.id, t.id)[0];
              return (
                <li key={t.id}>
                  <button className="row topic-row" disabled={busy} onClick={() => void start(chosen.id, t.id)}>
                    <div className="row-main">
                      <span className="row-title">{t.label}</span>
                      {row && <TopicBar t={row} />}
                      <span className="row-sub">{t.description}{row?.due ? ` · ${row.due} aan de beurt` : ''}</span>
                    </div>
                    <span className="btn small">Start</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function QuestionCard({ item, index, count, value, onChange, onNext, onBack, last, busy }: {
  item: PublicPracticeSession['items'][number]; index: number; count: number; value: string; onChange: (v: string) => void;
  onNext: () => void; onBack?: () => void; last: boolean; busy: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus(); }, []);
  const reason = REASON[item.reason] ?? REASON.new!;
  const submit = (e: FormEvent) => { e.preventDefault(); if (value.trim()) onNext(); };
  return (
    <form className="panel quiz-card" onSubmit={submit}>
      <div className="quiz-meta">
        <span className="dim small">Vraag {index + 1} van {count}</span>
        <span className={`tag reason-${reason.cls}`}>{reason.label}</span>
      </div>
      <div className="dim">{item.instruction}</div>
      <div className="quiz-prompt">{item.prompt}</div>
      {item.kind === 'choice' && item.options ? (
        <div className="quiz-options" role="radiogroup" aria-label="Antwoordopties">
          {item.options.map((o) => (
            <button key={o} type="button" role="radio" aria-checked={value === o} className="quiz-option" data-state={value === o ? 'picked' : undefined} onClick={() => onChange(o)}>{o}</button>
          ))}
        </div>
      ) : (
        <label className="field">
          <span>{item.kind === 'fraction' ? 'Antwoord (bijv. 3/4)' : 'Antwoord'}</span>
          <input ref={input} className="input grade-input" inputMode={item.kind === 'fraction' ? 'text' : 'decimal'} autoComplete="off" value={value} maxLength={20}
            onChange={(e) => onChange(e.target.value)} />
        </label>
      )}
      <div className="quiz-actions">
        {onBack && <button type="button" className="btn ghost small" onClick={onBack}>Vorige</button>}
        <button className="btn" type="submit" disabled={!value.trim() || busy}>{busy ? 'Bezig…' : last ? 'Inleveren' : 'Volgende'}</button>
      </div>
    </form>
  );
}

function Result({ session, result, onAgain, onOverview }: { session: PublicPracticeSession; result: PracticeResult; onAgain: () => void; onOverview: () => void }) {
  const { summary, decision } = result;
  const explain = STATUS_EXPLAIN[decision.status as AcademyDecisionStatus];
  const byId = new Map(session.items.map((i) => [i.id, i]));
  return (
    <div className="page academy">
      <section className="panel acad-result gold">
        <div className="eyebrow">Oefening klaar · {subjectById(session.subjectId).name}</div>
        <div className="acad-score">
          <span className="big-num">{summary.correctCount}<small>/{summary.questionCount}</small></span>
          <div className="acad-score-meta">
            <span className={`tag ${decision.status === 'rewarded' ? 'live' : ''}`}>{statusLabel(decision.status)}</span>
            {summary.mistakesFixed > 0 && <span className="tag lime">{summary.mistakesFixed} {summary.mistakesFixed === 1 ? 'fout' : 'fouten'} verbeterd</span>}
            {summary.newlyMastered.length > 0 && <span className="tag gold">{summary.newlyMastered.length} nu beheerst</span>}
          </div>
        </div>
        {decision.entries.length > 0 && (
          <ul className="rows acad-entries">
            {decision.entries.map((e) => (
              <li key={e.key} className="row">
                <span className="row-main row-title">{e.label}{e.cappedBy ? <span className="row-sub"> · {e.cappedBy} XP boven het plafond</span> : null}</span>
                <b className="acad-xp num">+{e.xp}</b>
              </li>
            ))}
          </ul>
        )}
        <div className="acad-total"><span>Academy XP</span><b className="num">+{decision.xp}</b></div>
        {explain && <p className="hint">{explain}</p>}
        {result.progress.length > 0 && (
          <div className="acad-grants">
            <div className="eyebrow">Mijlpaal bereikt</div>
            {result.progress.map((g) => (
              <div key={g.key} className="acad-grant">
                <b>{g.label}</b>
                <span>{[g.packId ? PACKS[g.packId]?.name ?? g.packId : null, g.vouchers ? `${g.vouchers} draft-voucher${g.vouchers === 1 ? '' : 's'}` : null, g.coins ? `${g.coins} coins` : null].filter(Boolean).join(' · ')}</span>
              </div>
            ))}
          </div>
        )}
        <div className="acad-actions">
          <button className="btn" onClick={onAgain}>Nog een oefening</button>
          <button className="btn ghost small" onClick={onOverview}>Naar overzicht</button>
        </div>
      </section>

      <div className="page-cols">
        <section className="panel flush" aria-label="Nakijken">
          <div className="panel-head"><h2>Nakijken</h2></div>
          <ul className="rows review-rows">
            {result.results.map((r) => {
              const it = byId.get(r.id);
              return (
                <li key={r.id} className="row">
                  <span className={`review-icon ${r.correct ? 'ok' : 'bad'}`} role="img" aria-label={r.correct ? 'Goed' : 'Fout'}>{r.correct ? <IconCheck /> : <IconClose />}</span>
                  <div className="row-main">
                    <span className="row-title">{it ? `${it.instruction}: ${it.prompt}` : r.id}</span>
                    <span className="row-sub">{r.correct ? `Goed: ${r.answer}` : `Jouw antwoord: ${r.given || '—'} · juist: ${r.answer}`}</span>
                    <span className="grade-tags">
                      <span className={`tag reason-${REASON[r.reason]?.cls ?? 'new'}`}>{REASON[r.reason]?.label ?? r.reason}</span>
                      {r.fixed && <span className="tag lime">fout verbeterd</span>}
                      {r.masteredNow && <span className="tag gold">beheerst</span>}
                      {!r.correct && <span className="tag wait">komt terug</span>}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
        <section className="panel flush" aria-label="Voortgang">
          <div className="panel-head"><h2>Voortgang</h2></div>
          <TopicRows rows={result.topicProgress} />
          <div style={{ padding: '0 16px 14px' }}><Legend /></div>
        </section>
      </div>
    </div>
  );
}
