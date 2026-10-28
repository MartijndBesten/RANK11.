import { useMemo } from 'react';
import { chemistry, DRAFT_EVENTS, FORMATIONS, PACKS, pityRemaining, teamRating, type Lineup } from '@rank11/engine';
import type { Nav } from '../App';
import { CARD_BY_ID, useStore } from '../state/store';
import { dayLabel, fmt, gradeClass, useGradeData } from '../state/gradeData';
import { PlayerCard } from '../components/PlayerCard';
import { PackArt } from '../components/PackArt';
import { Sparkline } from '../components/charts';
import { IconCalendar, IconClock, IconDown, IconPack, IconTarget, IconUp, IconVault } from '../components/Icons';
import { Countdown } from '../components/Countdown';
import './hub.css';
import { Help } from '../components/Help';

export function useLineup() {
  const { state } = useStore();
  return useMemo(() => {
    const formation = FORMATIONS[state.formationId] ?? FORMATIONS['4-3-3']!;
    const lineup: Lineup = {};
    for (const [slot, id] of Object.entries(state.lineup)) lineup[slot] = CARD_BY_ID.get(id);
    return { formation, lineup, rating: teamRating(formation, lineup), chem: chemistry(formation, lineup) };
  }, [state.formationId, state.lineup]);
}

export const DRAFT_END = new Date('2026-11-01T18:00:00+01:00');

const press = (fn: () => void) => ({ role: 'button' as const, tabIndex: 0, onClick: fn, onKeyDown: (e: { key: string; preventDefault: () => void }) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } } });

export function Hub({ nav }: { nav: Nav }) {
  const { state, pending, xp, mode } = useStore();
  const d = useGradeData();
  const { rating, chem } = useLineup();
  const event = DRAFT_EVENTS.toetsweek1!;
  const pity = pityRemaining(event, state.pity);
  const featured = event.featured.map((id) => CARD_BY_ID.get(id)).filter((p) => !!p);
  const packEntries = Object.entries(state.packs).filter(([, n]) => n > 0);
  const delta = d.overall !== null && d.overallBeforeLatest !== null ? d.overall - d.overallBeforeLatest : null;
  const movers = [...d.rising.slice(0, 2).map((r) => ({ r, up: true })), ...d.falling.slice(0, 2).map((r) => ({ r, up: false }))];

  return (
    <div className="page home">
      <Help id="start" />
      <section className="panel home-hero" aria-label="Je cijfers in één oogopslag">
        <div className="home-hero-main">
          <div className="eyebrow">{d.period.name} · zelf ingevoerd</div>
          <div className="home-avg">
            <span className={`big-num ${gradeClass(d.overall)}`}>{fmt(d.overall)}</span>
            <div className="home-avg-meta">
              <span className="dim small">Gemiddelde over {d.subjects.length} vakken</span>
              {delta !== null && Math.abs(delta) >= 0.005 && (
                <span className={`delta ${delta > 0 ? 'up' : 'down'}`}>
                  {delta > 0 ? <IconUp /> : <IconDown />}{fmt(Math.abs(delta), 2)} <span className="dim small" style={{ fontFamily: 'var(--font-ui)', fontWeight: 500 }}>door je laatste toets</span>
                </span>
              )}
            </div>
          </div>
          <Sparkline values={d.overallRunning.map((p) => p.average)} className="home-spark" />
          <button className="link-btn" onClick={() => nav.go('cijfers')}>Naar je cijferdashboard</button>
        </div>
        <div className="home-xp">
          <div className="eyebrow">Clubniveau {xp.level.level}</div>
          <div className="bar"><i style={{ width: `${(xp.level.into / xp.level.span) * 100}%` }} /></div>
          <div className="dim small">{xp.level.span - xp.level.into} XP tot niveau {xp.level.level + 1}</div>

        </div>
      </section>

      {pending.length > 0 && (
        <section className="home-vault" {...press(() => nav.go('cijfers-kluis'))} aria-label="Cijferkluis">
          <div className="sealed-lock" aria-hidden="true"><IconVault /></div>
          <div className="row-main">
            <b className="home-vault-title">{pending.length === 1 ? '1 beloning wacht' : `${pending.length} beloningen wachten`}</b>
            <span className="row-sub">Open de kluis en ontdek welke speler je verdiend hebt</span>
          </div>
          <span className="btn small">Open</span>
        </section>
      )}

      <div className="home-actions">
        <button className="btn" onClick={() => nav.go('cijfers-invoeren')}>Cijfer invoeren</button>
        {state.settings.academy && <button className="btn ghost" onClick={() => nav.go('academy-oefenen')}>Even oefenen</button>}
      </div>
          <div className="hub-tiles">
            <section className="hub-tile" {...press(() => nav.go('club-packs'))}>
              <div className="eyebrow">Mijn packs</div>
              <div className="hub-packs">
                {packEntries.length ? packEntries.slice(0, 3).map(([id, n]) => (
                  <div key={id} className="hub-pack">
                    <PackArt theme={PACKS[id]!.theme} name={PACKS[id]!.name} className="pack-mini" />
                    {n > 1 && <span className="hub-pack-n">×{n}</span>}
                  </div>
                )) : <p className="dim small">Geen ongeopende packs. Verdien ze met je cijfers.</p>}
              </div>
            </section>
            <section className="hub-tile" {...press(() => nav.go('club-elftal'))}>
              <div className="eyebrow">Mijn elftal</div>
              <div className="hub-squad">
                <div><div className="hub-big num">{rating}</div><div className="dim small">Teamrating</div></div>
                <div><div className="hub-big num">{chem.total}<small>/{chem.max}</small></div><div className="dim small">Chemie</div></div>
              </div>
            </section>
          </div>
      {d.upcoming.length > 0 && <section className="panel" aria-label="Eerstvolgende toets">
        <div className="panel-head"><h2>Eerstvolgende toets</h2><button className="link-btn" onClick={() => nav.go('cijfers-doelen')}>Planning</button></div>
        <p className="next-test"><b>{d.subjectById(d.upcoming[0]!.subjectId).name}</b> · {d.upcoming[0]!.name}</p>
        <span className="dim small">{dayLabel(d.upcoming[0]!.date, d.today)}</span>
      </section>}
      <details className="panel disclosure home-details">
        <summary>Meer over je voortgang en beloningen</summary>
        <div className="page-cols">
        <div className="stack">
          <section className="panel gold" aria-label="Volgende voetbalbeloning">
            <div className="panel-head"><h2>Volgende beloning</h2><IconPack width={20} height={20} className="dim" /></div>
            {d.rewards.length ? (
              <ul className="rows">
                {d.rewards.slice(0, 3).map((r) => (
                  <li key={r.id} className="row reward-row">
                    <span className="subj-dot" style={{ background: d.subjectById(r.subjectId).color }}>{d.subjectById(r.subjectId).short}</span>
                    <div className="row-main">
                      <span className="row-title">{r.title}</span>
                      <span className="row-sub">{r.condition}{r.date ? ` · ${dayLabel(r.date, d.today)}` : ''}</span>
                      <span className="reward-what">{r.reward}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="hint">Zet je aankomende toetsen in Cijfers › Doelen; dan zie je hier wat je ermee kunt verdienen.</p>
            )}
          </section>

          <section className="panel" aria-label="Stijgende en dalende vakken">
            <div className="panel-head"><h2>In vorm</h2><button className="link-btn" onClick={() => nav.go('cijfers-vakken')}>Alle vakken</button></div>
            {movers.length ? (
              <ul className="rows">
                {movers.map(({ r, up }) => (
                  <li key={r.subject.id}>
                    <button className="row" onClick={() => nav.go('cijfers-vakken')}>
                      <span className="subj-dot" style={{ background: r.subject.color }}>{r.subject.short}</span>
                      <div className="row-main">
                        <span className="row-title">{r.subject.name}</span>
                        <span className="row-sub">{up ? 'Stijgt' : 'Daalt'} na je laatste {r.trend.recentCount === 1 ? 'toets' : `${r.trend.recentCount} toetsen`}</span>
                      </div>
                      <span className={`delta ${up ? 'up' : 'down'}`}>{up ? <IconUp /> : <IconDown />}{fmt(Math.abs(r.trend.delta), 2)}</span>
                      <span className={`row-grade ${gradeClass(r.average)}`}>{fmt(r.average)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="hint">Nog geen duidelijke stijgers of dalers. Een trend tonen we pas vanaf drie cijfers per vak.</p>
            )}
          </section>

          {d.insights.length > 0 && (
            <section className="panel electric" aria-label="Inzichten">
              <div className="panel-head"><h2>Inzicht</h2><span className="tag">uit jouw cijfers</span></div>
              <ul className="insights">
                {d.insights.slice(0, 1).map((i) => <li key={i.id} data-tone={i.tone}>{i.text}</li>)}
              </ul>
            </section>
          )}
        </div>

        <div className="stack">
          <section className="panel" aria-label="Persoonlijke doelen">
            <div className="panel-head"><h2>Doelen</h2><IconTarget width={20} height={20} className="dim" /></div>
            {d.goals.length ? (
              <ul className="rows">
                {d.goals.slice(0, 3).map((g) => {
                  const s = g.goal.subjectId ? d.subjectById(g.goal.subjectId) : null;
                  return (
                    <li key={g.goal.id} className="row goal-row">
                      <div className="row-main">
                        <span className="row-title">{s ? s.name : 'Algemeen gemiddelde'} naar {fmt(g.goal.target)}</span>
                        <div className={`bar ${g.achieved ? 'up' : ''}`}><i style={{ width: `${Math.max(4, g.progress * 100)}%` }} /></div>
                        <span className="row-sub">
                          {g.achieved ? 'Gehaald' : g.nextTest
                            ? g.nextTest.result.status === 'reachable' ? `Haal minimaal een ${fmt(g.nextTest.result.required)} voor ${g.nextTest.test.name}`
                              : g.nextTest.result.status === 'secured' ? 'Haal je sowieso bij de volgende toets' : 'Niet in één toets haalbaar; blijf bouwen'
                            : `Nu ${fmt(g.current)}`}
                        </span>
                      </div>
                      <span className={`row-grade ${gradeClass(g.current)}`}>{fmt(g.current)}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="empty"><span>Nog geen doelen.</span><button className="btn small" onClick={() => nav.go('cijfers-doelen')}>Doel kiezen</button></div>
            )}
          </section>

          <section className="panel" aria-label="Aankomende toetsen">
            <div className="panel-head"><h2>Aankomende toetsen</h2><IconCalendar width={20} height={20} className="dim" /></div>
            {d.upcoming.length ? (
              <ul className="rows">
                {d.upcoming.slice(0, 3).map((t) => (
                  <li key={t.id} className="row">
                    <span className="subj-dot" style={{ background: d.subjectById(t.subjectId).color }}>{d.subjectById(t.subjectId).short}</span>
                    <div className="row-main">
                      <span className="row-title">{t.name}</span>
                      <span className="row-sub">{d.subjectById(t.subjectId).name} · telt {String(t.weight).replace('.', ',')}× mee</span>
                    </div>
                    <span className="tag">{dayLabel(t.date, d.today)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="hint">Geen toetsen gepland. Voeg ze toe bij Cijfers › Doelen.</p>
            )}
          </section>

          <section className="hub-event" {...press(() => nav.go('club-draft'))}>
            <div className="hub-event-cards" aria-hidden="true">
              {featured.map((p, i) => <PlayerCard key={p!.id} player={p!} size="sm" className={`fan fan-${i}`} />)}
            </div>
            <div className="hub-event-copy">
              <div className="eyebrow lime">Event · Toetsweek 1</div>
              <h2 className="display">{event.name}</h2>
              <div className="hub-event-meta">
                <span><IconClock width={16} height={16} /> <Countdown to={DRAFT_END} /></span>
                <span>Groep B+ binnen <b className="num" style={{ whiteSpace: 'nowrap' }}>{pity.B} drafts</b></span>
              </div>
            </div>
          </section>


        </div>
      </div>

      </details>

      <footer className="hub-foot">
        <span className="hint">{mode === 'online' ? 'Ingelogd · je voortgang wordt in je account opgeslagen' : 'Demomodus · voortgang alleen op dit toestel'}</span>
      </footer>
    </div>
  );
}
