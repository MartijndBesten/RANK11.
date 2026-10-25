import { useMemo, useState } from 'react';
import { battleState, DEFAULT_GRADE_LEAGUE_CONFIG } from '@rank11/engine';
import type { Nav } from '../App';
import { CARD_BY_ID, useStore } from '../state/store';
import { currentPeriod, todayIso } from '../state/school';
import { BOTS, botTeam, gradeLeague, ME, myFixtures, myTeam, nameOf, PLAYED_ROUNDS, POOL_NAME, standings } from '../competition/demoPool';
import { BattleView } from './BattleView';
import { IconInfo, IconLeague } from '../components/Icons';
import './competition.css';

const formClass = { W: 'up', G: 'flat', V: 'down' } as const;

function DemoNote() {
  return (
    <div className="demo-note">
      <IconInfo />
      <span><b>Demo-pool met computertegenstanders.</b> Spelregels, ranglijsten en battles draaien op de echte engine; de tegenstanders en hun cijfers zijn verzonnen. Online tegen klasgenoten werkt via de server, die lokaal gebouwd en getest is maar nog niet online staat.</span>
    </div>
  );
}

function resultClass(r: { homeGoals: number; awayGoals: number }, home: boolean): string {
  const mine = home ? r.homeGoals : r.awayGoals;
  const theirs = home ? r.awayGoals : r.homeGoals;
  return mine > theirs ? 'win' : mine < theirs ? 'loss' : 'draw';
}

export function CompetitionScreen({ nav, sub }: { nav: Nav; sub: string }) {
  const { state, grades } = useStore();
  const [playing, setPlaying] = useState<string | null>(null);
  const club = state.club.name;
  const table = useMemo(() => standings(state.competition.results, club), [state.competition.results, club]);
  const fixtures = useMemo(() => myFixtures(state.competition.results), [state.competition.results]);
  const period = currentPeriod(todayIso());
  const gl = useMemo(() => gradeLeague(grades, state.goals, period.id), [grades, state.goals, period.id]);
  const me = table.find((r) => r.participant === ME);
  const glMe = gl.find((r) => r.playerId === ME);
  const next = fixtures.find((f) => !f.result);
  const team = useMemo(() => myTeam(state.lineup, CARD_BY_ID), [state.lineup]);

  if (playing) {
    const fx = fixtures.find((f) => f.id === playing)!;
    return <BattleView fixture={fx} onExit={() => { setPlaying(null); nav.setImmersive(false); }} />;
  }
  const play = (id: string) => { setPlaying(id); nav.setImmersive(true); };

  if (sub === 'gradeleague') {
    const cfg = DEFAULT_GRADE_LEAGUE_CONFIG;
    return (
      <div className="page">
        <div className="page-head"><div><div className="eyebrow">Competitie · {period.name}</div><h1 className="display">Grade League</h1>
          <p className="dim small">Eerlijk vergelijken zonder cijfers te tonen: alleen scores van 0 tot 100. Meer toetsen invoeren levert niets extra op.</p></div></div>
        <DemoNote />
        <div className="page-cols">
          <section className="panel flush">
            <div className="panel-head"><h2>Stand</h2><span className="tag demo">demo</span></div>
            <ol className="league-table">
              {gl.map((r) => {
                const bot = BOTS.find((b) => b.id === r.playerId);
                return (
                  <li key={r.playerId} data-me={r.playerId === ME || undefined}>
                    <details>
                      <summary>
                        <span className="lt-rank num">{r.rank ?? '–'}</span>
                        <span className="lt-name">{r.playerId === ME ? `${club} (jij)` : bot?.name}</span>
                        <span className="lt-score num">{r.eligible ? r.score.toFixed(1).replace('.', ',') : '–'}</span>
                      </summary>
                      <div className="gl-detail">
                        {r.eligible && (
                          <div className="gl-parts">
                            <span>Prestatie <b className="num">{Math.round(r.components.performance)}</b></span>
                            <span>Vooruitgang <b className="num">{Math.round(r.components.progress)}</b></span>
                            <span>Doelen <b className="num">{r.components.goals === null ? '–' : Math.round(r.components.goals)}</b></span>
                            {r.components.bonus > 0 && <span>Herstel <b className="num">+{r.components.bonus}</b></span>}
                          </div>
                        )}
                        <ul>{r.explanation.map((e) => <li key={e}>{e}</li>)}</ul>
                      </div>
                    </details>
                  </li>
                );
              })}
            </ol>
            <p className="hint" style={{ padding: '0 16px 14px' }}>Tik op een rij voor de uitleg. Wie te weinig cijfers heeft, staat onderaan zonder plek en verliest niets.</p>
          </section>
          <section className="panel">
            <div className="panel-head"><h2>Zo telt het</h2></div>
            <ul className="insights">
              <li>Prestatie ({Math.round(cfg.weights.performance * 100)}%): gewogen gemiddelde deze periode; een {cfg.performanceRange[0]} = 0 punten, een {cfg.performanceRange[1]} of hoger = 100.</li>
              <li>Vooruitgang ({Math.round(cfg.weights.progress * 100)}%): per vak je gemiddelde nu tegenover je eigen eerdere gemiddelde. Gelijk = 50; iedere punt beter = +{cfg.progressPerPoint}.</li>
              <li>Doelen ({Math.round(cfg.weights.goals * 100)}%): bereikte persoonlijke doelen. Geen doelen? Dan telt dit deel niet mee.</li>
              <li>Herstelbonus: +{cfg.comebackBonus} per voldoende na een onvoldoende (minstens 1,5 hoger), maximaal +{cfg.comebackBonusMax}.</li>
              <li>Minimaal {cfg.minGradesInPeriod} cijfers in de periode voor een plek. Cijfers zelf zijn nooit zichtbaar voor anderen.</li>
            </ul>
          </section>
        </div>
      </div>
    );
  }

  if (sub === 'rankleague') {
    return (
      <div className="page">
        <div className="page-head"><div><div className="eyebrow">Competitie · {POOL_NAME}</div><h1 className="display">RANK League</h1>
          <p className="dim small">Kaartbattles met je elftal: om de beurt aanvallen en verdedigen; per ronde telt een andere eigenschap.</p></div></div>
        <DemoNote />
        <div className="page-cols">
          <section className="panel flush">
            <div className="panel-head"><h2>Stand</h2><span className="dim small">computerduels t/m ronde {PLAYED_ROUNDS}</span></div>
            <div className="lt-scroll">
              <table className="standings">
                <thead><tr><th>#</th><th className="l">Club</th><th title="Gespeeld">GS</th><th title="Gewonnen">W</th><th title="Gelijk">G</th><th title="Verloren">V</th><th title="Doelsaldo">+/−</th><th title="Punten">P</th><th className="l hide-xs">Vorm</th></tr></thead>
                <tbody>
                  {table.map((r) => (
                    <tr key={r.participant} data-me={r.participant === ME || undefined}>
                      <td className="num">{r.rank}</td>
                      <td className="l name">{nameOf(r.participant, club)}</td>
                      <td className="num">{r.played}</td><td className="num">{r.won}</td><td className="num">{r.drawn}</td><td className="num">{r.lost}</td>
                      <td className="num">{r.goalDifference > 0 ? '+' : ''}{r.goalDifference}</td>
                      <td className="num pts">{r.points}</td>
                      <td className="l hide-xs"><span className="form">{r.form.map((f, i) => <i key={i} className={formClass[f]}>{f}</i>)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="panel flush">
            <div className="panel-head"><h2>Jouw wedstrijden</h2></div>
            {team.length < 11 && <p className="form-error" style={{ padding: '0 16px' }}>Je elftal is niet compleet ({team.length}/11). <button className="link-btn" onClick={() => nav.go('club-elftal')}>Elftal aanvullen</button></p>}
            <ul className="rows">
              {fixtures.map((f) => {
                const opp = f.home === ME ? f.away : f.home;
                const live = state.competition.battles[f.id];
                const st = live && !f.result ? battleState(live) : null;
                return (
                  <li key={f.id} className="row">
                    <span className="lt-round">R{f.round}</span>
                    <div className="row-main">
                      <span className="row-title">{f.home === ME ? 'Thuis' : 'Uit'} tegen {nameOf(opp, club)}</span>
                      <span className="row-sub">{f.result ? 'Gespeeld' : st ? `Bezig · ${st.score.home}-${st.score.away}` : f.id === next?.id ? 'Volgende wedstrijd' : 'Gepland'}</span>
                    </div>
                    {f.result
                      ? <span className={`result num ${resultClass(f.result, f.home === ME)}`}>{f.result.homeGoals}-{f.result.awayGoals}</span>
                      : f.id === next?.id && <button className="btn small" disabled={team.length < 11} onClick={() => play(f.id)}>{st ? 'Verder' : 'Spelen'}</button>}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </div>
    );
  }

  if (sub === 'pools') {
    return (
      <div className="page">
        <div className="page-head"><div><div className="eyebrow">Competitie</div><h1 className="display">Pools</h1>
          <p className="dim small">Een pool is een besloten groep (klas, team, vrienden). Alleen leden zien elkaar; cijfers zijn nooit zichtbaar.</p></div></div>
        <div className="page-cols">
          <section className="panel flush">
            <div className="panel-head"><h2>{POOL_NAME}</h2><span className="tag demo">lokaal</span></div>
            <ul className="rows">
              <li className="row"><span className="pool-av" style={{ background: 'var(--gold-3)' }}>JIJ</span><div className="row-main"><span className="row-title">{club}</span><span className="row-sub">Jouw club</span></div></li>
              {BOTS.map((b) => (
                <li key={b.id} className="row"><span className="pool-av" style={{ background: b.color }}>{b.name.slice(0, 2).toUpperCase()}</span>
                  <div className="row-main"><span className="row-title">{b.club}</span><span className="row-sub">Computertegenstander · gem. rating {Math.round(botTeam(b).reduce((s, c) => s + c.rating, 0) / 11)}</span></div></li>
              ))}
            </ul>
          </section>
          <section className="panel">
            <div className="panel-head"><h2>Online pools</h2><span className="tag">server nodig</span></div>
            <p style={{ marginTop: 0 }}>De server voor echte pools is gebouwd en getest, maar staat nog niet online. Daarom kun je hier nog geen pool maken of iemand uitnodigen.</p>
            <ul className="insights">
              <li>Lid worden alleen met een uitnodigingscode van de beheerder; codes worden gehasht bewaard en kunnen verlopen.</li>
              <li>Niet-leden zien niets van een pool, ook niet dat hij bestaat.</li>
              <li>Battles live (30 seconden per zet) of op je eigen tempo (24 uur), met herverbinden.</li>
              <li>Voordat er echte accounts van kinderen online komen, moeten privacy en toestemming van ouders geregeld zijn.</li>
            </ul>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-head"><div><div className="eyebrow">Competitie · {POOL_NAME}</div><h1 className="display">Drie leagues</h1></div></div>
      <DemoNote />
      <div className="leagues">
        <section className="panel league-card rank" role="button" tabIndex={0} onClick={() => nav.go('competitie-rankleague')} onKeyDown={(e) => e.key === 'Enter' && nav.go('competitie-rankleague')}>
          <div className="eyebrow">RANK League · kaartbattles</div>
          <div className="league-pos"><span className="big-num">{me?.rank ?? '–'}</span><span className="dim">e van {table.length}</span></div>
          <div className="dim small">{me ? `${me.points} punten · ${me.played} gespeeld` : ''}</div>
          {next && <div className="league-next">Volgende: {next.home === ME ? 'thuis' : 'uit'} tegen <b>{nameOf(next.home === ME ? next.away : next.home, club)}</b></div>}
        </section>
        <section className="panel league-card grade" role="button" tabIndex={0} onClick={() => nav.go('competitie-gradeleague')} onKeyDown={(e) => e.key === 'Enter' && nav.go('competitie-gradeleague')}>
          <div className="eyebrow">Grade League · {period.name}</div>
          <div className="league-pos"><span className="big-num">{glMe?.rank ?? '–'}</span><span className="dim">e van {gl.filter((r) => r.eligible).length}</span></div>
          <div className="dim small">{glMe?.eligible ? `Score ${glMe.score.toFixed(1).replace('.', ',')} · vooruitgang telt het zwaarst` : 'Nog te weinig cijfers deze periode'}</div>
        </section>
        <section className="panel league-card academy">
          <div className="eyebrow">Academy League</div>
          <div className="league-pos"><IconLeague width={40} height={40} /><span className="dim">nog niet actief</span></div>
          <div className="dim small">Rangschikt op Academy XP (oefenen, fouten verbeteren) met dezelfde plafonds. Start pas als een leeromgeving gekoppeld is en de pool het aanzet.</div>
        </section>
      </div>
    </div>
  );
}
