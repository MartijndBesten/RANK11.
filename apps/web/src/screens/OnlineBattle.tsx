/**
 * Online kaartbattle tussen twee accounts. De server (Durable Object) is leidend: de app stuurt alleen
 * de gekozen kaart en leest daarna de stand. Asynchroon: wie niet aan zet is, ververst elke paar seconden
 * (en direct bij terugkeren naar het tabblad), zodat een zet van de tegenstander vanzelf verschijnt.
 */
import { useCallback, useEffect, useState } from 'react';
import { duelValue, otherSide, type BattleCard, type BattleState, type DuelMode, type Side } from '@rank11/engine';
import { api, ApiError } from '../api/client';
import { CARD_BY_ID } from '../state/store';
import { PlayerCard } from '../components/PlayerCard';
import { sfx } from '../lib/sound';

const MODE_LABEL: Record<DuelMode, string> = { rating: 'Rating', pace: 'Snelheid', technique: 'Techniek', defending: 'Verdedigen' };

interface MatchResponse {
  match: { id: string; homeUserId: string; awayUserId: string; status: string; deadlineHours: number };
  battle: { state: BattleState; cards: Record<Side, BattleCard[]> } | null;
  cardDefs: Record<string, string>;
}

export function OnlineBattle({ matchId, me, nameOf, onExit }: { matchId: string; me: string; nameOf: (id: string) => string; onExit: () => void }) {
  const [data, setData] = useState<MatchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmResign, setConfirmResign] = useState(false);

  const load = useCallback(async () => {
    try { setData(await api<MatchResponse>('GET', `/matches/${matchId}`)); setError(null); } catch (e) { setError(e instanceof ApiError ? e.message : 'Kan de wedstrijd niet laden.'); }
  }, [matchId]);
  useEffect(() => { void load(); }, [load]);

  const s = data?.battle?.state;
  const mySide: Side | null = data ? (data.match.homeUserId === me ? 'home' : data.match.awayUserId === me ? 'away' : null) : null;
  const myTurn = !!s && s.status === 'in_progress' && s.toMove === mySide;

  // Verversen zolang de tegenstander aan zet is.
  useEffect(() => {
    if (!s || s.status !== 'in_progress' || myTurn) return;
    const t = setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 3000);
    const onVis = () => document.visibilityState === 'visible' && void load();
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVis); };
  }, [s?.status, myTurn, load]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data || !s || !mySide) {
    return <div className="battle"><header className="battle-head"><button className="skip-btn battle-exit" onClick={onExit}>Terug</button></header><p className="dim" style={{ textAlign: 'center' }}>{error ?? 'Wedstrijd laden…'}</p></div>;
  }
  const cards = data.battle!.cards;
  const playerOf = (c: BattleCard) => CARD_BY_ID.get(data.cardDefs[c.id] ?? '');
  const mode = s.currentMode ?? 'rating';
  const open = s.openCard ? cards[s.openCard.side].find((c) => c.id === s.openCard!.cardId) : null;
  const myCards = [...cards[mySide]].sort((a, b) => duelValue(b, mode, s.config) - duelValue(a, mode, s.config));
  const oppId = mySide === 'home' ? data.match.awayUserId : data.match.homeUserId;
  const myScore = s.score[mySide];
  const theirScore = s.score[otherSide(mySide)];
  const last = s.duels.at(-1);

  const play = async (cardId: string) => {
    if (!myTurn || busy) return;
    setBusy(true);
    try { sfx.tap(); await api('POST', `/matches/${matchId}/moves`, { cardId }); await load(); } catch (e) { setError(e instanceof ApiError ? e.message : 'Deze zet kan niet.'); await load(); } finally { setBusy(false); }
  };
  const resign = async () => { await api('POST', `/matches/${matchId}/resign`).catch(() => undefined); setConfirmResign(false); await load(); };

  return (
    <div className="battle">
      <header className="battle-head">
        <button className="skip-btn battle-exit" onClick={onExit}>Terug</button>
        <div className="battle-score">
          <span className="bs-team">{mySide === 'home' ? 'Jij' : nameOf(oppId)}</span>
          <b className="num">{s.score.home} – {s.score.away}</b>
          <span className="bs-team">{mySide === 'home' ? nameOf(oppId) : 'Jij'}</span>
        </div>
        <div className="battle-meta">
          {s.status === 'finished' ? <span className="tag gold">Afgelopen</span> : <span className="tag">Ronde {s.round}/{s.totalRounds}</span>}
          {s.status !== 'finished' && <span className="tag lime">Duel: {MODE_LABEL[mode]}</span>}
          <span className="tag live">online</span>
        </div>
      </header>

      {s.status === 'finished' && s.result ? (
        <section className="battle-end">
          <div className="eyebrow">Eindstand</div>
          <h2 className="display">{myScore > theirScore ? 'Gewonnen!' : myScore < theirScore ? 'Verloren' : 'Gelijkspel'}</h2>
          <p className="dim">{s.result.forfeit ? (s.result.forfeitedBy === mySide ? 'Reglementair verloren.' : 'De tegenstander verloor reglementair.') : s.result.decidedEarly ? 'Beslist voordat alle kaarten gespeeld waren.' : 'Alle duels gespeeld.'} De uitslag telt mee in de RANK League van de pool.</p>
          <button className="btn" onClick={onExit}>Naar de stand</button>
        </section>
      ) : (
        <section className="battle-table">
          <div className="battle-open">
            {open ? (
              <>
                <div className="eyebrow">{s.openCard!.side === mySide ? 'Jouw aanval' : `Aanval van ${nameOf(oppId)}`}</div>
                {playerOf(open) && <PlayerCard player={playerOf(open)!} size="sm" />}
                <div className="bo-value num">{duelValue(open, mode, s.config)}</div>
              </>
            ) : (
              <div className="bo-empty">{last ? <>Ronde {last.round}: {last.scorer === null ? 'geen doelpunt' : last.scorer === mySide ? 'doelpunt voor jou!' : last.scorer === 'both' ? 'allebei raak' : `doelpunt voor ${nameOf(oppId)}`} ({last.attackerValue} tegen {last.defenderValue})</> : 'De toss bepaalt wie begint.'}</div>
            )}
          </div>
          <p className="battle-prompt" aria-live="polite">
            {myTurn ? (s.phase === 'attack' ? 'Jij valt aan: kies een kaart' : 'Verdedig: kies een kaart die hoger is') : `${nameOf(oppId)} is aan zet`}
          </p>
          {!myTurn && s.deadline && <p className="hint" style={{ textAlign: 'center' }}>Zet uiterlijk {new Date(s.deadline).toLocaleString('nl-NL', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}; anders speelt de server automatisch de laagste kaart.</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="battle-hand" role="list" aria-label="Jouw kaarten">
            {myCards.map((c) => {
              const used = s.used[mySide].includes(c.id);
              const p = playerOf(c);
              const v = duelValue(c, mode, s.config);
              const wins = open && s.openCard!.side !== mySide ? v > duelValue(open, mode, s.config) : null;
              return (
                <button key={c.id} role="listitem" className="bh-card" disabled={used || !myTurn || busy} onClick={() => void play(c.id)} data-used={used || undefined} data-wins={wins ?? undefined}
                  aria-label={`${p ? p.cardName : 'kaart'}, ${MODE_LABEL[mode]} ${v}${used ? ', al gespeeld' : ''}`}>
                  {p && <PlayerCard player={p} size="xs" />}
                  <span className="bh-value num">{v}</span>
                </button>
              );
            })}
          </div>
          <div className="battle-foot">
            {confirmResign ? (
              <span className="confirm-inline"><span className="small dim">Opgeven = reglementair verlies.</span>
                <button className="btn ghost small" onClick={() => void resign()}>Opgeven</button>
                <button className="link-btn" onClick={() => setConfirmResign(false)}>Doorspelen</button></span>
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
                  <span className="num">R{d.round}</span><span>{MODE_LABEL[d.mode]}</span>
                  <span className="num">{iAttack ? `${d.attackerValue} – ${d.defenderValue}` : `${d.defenderValue} – ${d.attackerValue}`}</span>
                  <span>{d.scorer === null ? 'gestopt' : d.scorer === mySide ? 'goal jij' : d.scorer === 'both' ? 'beide' : 'goal tegen'}</span>
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
}
