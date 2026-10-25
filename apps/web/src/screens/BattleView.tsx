import { useEffect, useMemo, useState } from 'react';
import { BattleError, battleState, duelValue, otherSide, playCard, resign, type BattleCard, type BattleEvent, type DuelMode, type Fixture, type LeagueResult, type Side } from '@rank11/engine';
import { CARD_BY_ID, useStore } from '../state/store';
import { BOTS, botMove, botTeam, ME, myTeam, nameOf, newBattle, resultOf } from '../competition/demoPool';
import { PlayerCard } from '../components/PlayerCard';
import { sfx } from '../lib/sound';

const MODE_LABEL: Record<DuelMode, string> = { rating: 'Rating', pace: 'Snelheid', technique: 'Techniek', defending: 'Verdedigen' };
const playerOf = (c: BattleCard) => CARD_BY_ID.get(c.id.slice(c.id.indexOf(':') + 1));

/** Eén kaartbattle tegen een computertegenstander, volledig via de battle-engine (eventlog). */
export function BattleView({ fixture, onExit }: { fixture: Fixture & { result?: LeagueResult }; onExit: () => void }) {
  const { state, saveBattle } = useStore();
  const mySide: Side = fixture.home === ME ? 'home' : 'away';
  const oppId = mySide === 'home' ? fixture.away : fixture.home;
  const bot = BOTS.find((b) => b.id === oppId)!;
  const [events, setEvents] = useState<BattleEvent[]>(() => {
    const saved = state.competition.battles[fixture.id];
    if (saved) return saved;
    const mine = { id: ME, cards: myTeam(state.lineup, CARD_BY_ID) };
    const theirs = { id: bot.id, cards: botTeam(bot) };
    return mySide === 'home' ? newBattle(fixture.id, mine, theirs) : newBattle(fixture.id, theirs, mine);
  });
  const [error, setError] = useState<string | null>(null);
  const [confirmResign, setConfirmResign] = useState(false);
  const s = useMemo(() => battleState(events), [events]);
  const created = events[0] as Extract<BattleEvent, { type: 'created' }>;
  const cards = { home: created.home.cards, away: created.away.cards };
  const byId = (side: Side, id: string) => cards[side].find((c) => c.id === id);
  const mode = s.currentMode ?? 'rating';
  const club = state.club.name;

  const commit = (next: BattleEvent[]) => {
    setEvents(next);
    const st = battleState(next);
    saveBattle(fixture.id, next, st.status === 'finished' ? resultOf(next, fixture.id, Date.now()) : undefined);
  };

  // Eerste opslag (zodat een onderbroken wedstrijd later verder kan).
  useEffect(() => { if (!state.competition.battles[fixture.id]) saveBattle(fixture.id, events); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Computerzet met een korte pauze, zodat je ziet wat er gebeurt.
  useEffect(() => {
    if (s.status !== 'in_progress' || s.toMove !== otherSide(mySide)) return;
    const t = setTimeout(() => {
      const side = otherSide(mySide);
      commit([...events, playCard(events, { side, cardId: botMove(events, side), at: Math.max(Date.now(), s.lastEventAt) })]);
    }, 850);
    return () => clearTimeout(t);
  }, [events]); // eslint-disable-line react-hooks/exhaustive-deps

  const play = (cardId: string) => {
    if (s.toMove !== mySide) return;
    try {
      sfx.tap();
      commit([...events, playCard(events, { side: mySide, cardId, at: Math.max(Date.now(), s.lastEventAt) })]);
      setError(null);
    } catch (e) {
      setError(e instanceof BattleError ? e.message : 'Deze zet kan niet.');
    }
  };

  const open = s.openCard ? byId(s.openCard.side, s.openCard.cardId) : null;
  const myCards = [...cards[mySide]].sort((a, b) => duelValue(b, mode, s.config) - duelValue(a, mode, s.config));
  const lastDuel = s.duels.at(-1);
  const myScore = s.score[mySide];
  const theirScore = s.score[otherSide(mySide)];
  const prompt = s.status === 'finished' ? '' : s.toMove === mySide
    ? s.phase === 'attack' ? 'Jij valt aan: kies een kaart' : 'Verdedig: kies een kaart die hoger is'
    : 'Tegenstander kiest…';

  return (
    <div className="battle">
      <header className="battle-head">
        <button className="skip-btn battle-exit" onClick={onExit}>{s.status === 'finished' ? 'Terug' : 'Pauze'}</button>
        <div className="battle-score">
          <span className="bs-team">{mySide === 'home' ? club : bot.club}</span>
          <b className="num">{s.score.home} – {s.score.away}</b>
          <span className="bs-team">{mySide === 'home' ? bot.club : club}</span>
        </div>
        <div className="battle-meta">
          {s.status === 'finished' ? <span className="tag gold">Afgelopen</span> : <span className="tag">Ronde {s.round}/{s.totalRounds}</span>}
          {s.status !== 'finished' && <span className="tag lime">Duel: {MODE_LABEL[mode]}</span>}
        </div>
      </header>

      {s.status === 'finished' && s.result ? (
        <section className="battle-end">
          <div className="eyebrow">Eindstand</div>
          <h2 className="display">{myScore > theirScore ? 'Gewonnen!' : myScore < theirScore ? 'Verloren' : 'Gelijkspel'}</h2>
          <p className="dim">{s.result.forfeit ? (s.result.forfeitedBy === mySide ? 'Je hebt opgegeven.' : 'De tegenstander gaf op.') : s.result.decidedEarly ? 'Beslist voordat alle kaarten gespeeld waren.' : 'Alle duels gespeeld.'} De uitslag telt mee in de demo-league.</p>
          <button className="btn" onClick={onExit}>Naar de stand</button>
        </section>
      ) : (
        <section className="battle-table">
          <div className="battle-open">
            {open ? (
              <>
                <div className="eyebrow">{s.openCard!.side === mySide ? 'Jouw aanval' : `Aanval van ${bot.name}`}</div>
                {playerOf(open) && <PlayerCard player={playerOf(open)!} size="sm" />}
                <div className="bo-value num">{duelValue(open, mode, s.config)}</div>
              </>
            ) : (
              <div className="bo-empty">{lastDuel ? <>Ronde {lastDuel.round}: {lastDuel.scorer === null ? 'geen doelpunt' : lastDuel.scorer === mySide ? 'doelpunt voor jou!' : lastDuel.scorer === 'both' ? 'allebei raak' : `doelpunt voor ${bot.name}`} ({lastDuel.attackerValue} tegen {lastDuel.defenderValue})</> : 'De toss bepaalt wie begint.'}</div>
            )}
          </div>
          <p className="battle-prompt" aria-live="polite">{prompt}</p>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="battle-hand" role="list" aria-label="Jouw kaarten">
            {myCards.map((c) => {
              const used = s.used[mySide].includes(c.id);
              const p = playerOf(c);
              const v = duelValue(c, mode, s.config);
              const wins = open && s.openCard!.side !== mySide ? v > duelValue(open, mode, s.config) : null;
              return (
                <button key={c.id} role="listitem" className="bh-card" disabled={used || s.toMove !== mySide} onClick={() => play(c.id)} data-used={used || undefined} data-wins={wins ?? undefined}
                  aria-label={`${p ? p.cardName : c.id}, ${MODE_LABEL[mode]} ${v}${used ? ', al gespeeld' : ''}`}>
                  {p && <PlayerCard player={p} size="xs" />}
                  <span className="bh-value num">{v}</span>
                </button>
              );
            })}
          </div>
          <div className="battle-foot">
            {confirmResign ? (
              <span className="confirm-inline">
                <span className="small dim">Opgeven = 3-0 verlies.</span>
                <button className="btn ghost small" onClick={() => commit([...events, resign(events, mySide, Math.max(Date.now(), s.lastEventAt))])}>Opgeven</button>
                <button className="link-btn" onClick={() => setConfirmResign(false)}>Doorspelen</button>
              </span>
            ) : <button className="link-btn" onClick={() => setConfirmResign(true)}>Opgeven</button>}
          </div>
        </section>
      )}

      {s.duels.length > 0 && (
        <section className="battle-log">
          <div className="eyebrow">Duels</div>
          <ol>
            {s.duels.map((d) => {
              const iAttack = d.attacker === mySide;
              return (
                <li key={d.round} data-scorer={d.scorer === mySide ? 'me' : d.scorer === null ? 'none' : 'them'}>
                  <span className="num">R{d.round}</span>
                  <span>{MODE_LABEL[d.mode]}</span>
                  <span className="num">{iAttack ? `${d.attackerValue} – ${d.defenderValue}` : `${d.defenderValue} – ${d.attackerValue}`}</span>
                  <span>{d.scorer === null ? 'gestopt' : d.scorer === mySide ? 'goal jij' : d.scorer === 'both' ? 'beide' : `goal ${nameOf(oppId, club).split(' ')[0]}`}</span>
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
}
