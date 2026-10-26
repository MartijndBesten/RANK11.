/**
 * Competitie online: echte privépools op de (lokale test)server. Pools maken en uitnodigen, lid worden met
 * een code, klasgenoten uitdagen (asynchroon, deadline instelbaar, standaard 48 uur), wedstrijden spelen en
 * de serverberekende ranglijsten (RANK League en Grade League) bekijken.
 */
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import type { Nav } from '../App';
import { api, ApiError } from '../api/client';
import { useStore } from '../state/store';
import { OnlineBattle } from './OnlineBattle';
import { IconLeague } from '../components/Icons';
import './competition.css';

interface Pool { id: string; name: string; role: 'admin' | 'member'; memberCount: number; maxMembers: number }
interface Member { userId: string; username: string; role: string; club: { name: string; short: string } | null }
interface Standing { participant: string; username: string | null; rank: number; played: number; won: number; drawn: number; lost: number; goalDifference: number; points: number; form: ('W' | 'G' | 'V')[] }
interface MatchRow {
  id: string; homeUserId: string; awayUserId: string; challengerId: string; status: 'pending' | 'active' | 'finished' | 'declined' | 'expired';
  timing: 'live' | 'async'; deadlineHours: number; acceptBefore: number | null; createdAt: number;
  result: { homeGoals: number; awayGoals: number; winnerUserId: string | null; forfeitBy: string | null } | null;
}
interface GlRow { userId: string; username: string | null; me: boolean; rank: number | null; eligible: boolean; score: number | null; components?: { performance: number; progress: number; goals: number | null; bonus: number }; explanation?: string[] }

const POOL_KEY = 'rank11-active-pool';
const formClass = { W: 'up', G: 'flat', V: 'down' } as const;
const until = (ms: number) => {
  const h = Math.max(0, Math.round((ms - Date.now()) / 3.6e6));
  return h >= 24 ? `${Math.floor(h / 24)} d ${h % 24} u` : `${h} u`;
};

function ServerNote() {
  return <p className="hint">Echte accounts op de lokale testserver, alleen met synthetische testgegevens. Nog niet online voor echte gebruikers.</p>;
}

export function OnlineCompetition({ nav, sub }: { nav: Nav; sub: string }) {
  const { user } = useStore();
  const me = user!.id;
  const [pools, setPools] = useState<Pool[] | null>(null);
  const [poolId, setPoolId] = useState<string | null>(() => { try { return localStorage.getItem(POOL_KEY); } catch { return null; } });
  const [members, setMembers] = useState<Member[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [gl, setGl] = useState<{ period: { name: string }; rows: GlRow[] } | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pool = pools?.find((p) => p.id === poolId) ?? pools?.[0] ?? null;
  const loadPools = useCallback(async () => {
    const res = await api<{ pools: Pool[] }>('GET', '/pools');
    setPools(res.pools);
    return res.pools;
  }, []);
  const loadPool = useCallback(async (id: string) => {
    const [m, s, ms, g] = await Promise.all([
      api<{ members: Member[] }>('GET', `/pools/${id}/members`),
      api<{ standings: Standing[] }>('GET', `/pools/${id}/standings`),
      api<{ matches: MatchRow[] }>('GET', `/pools/${id}/matches`),
      api<{ period: { name: string }; rows: GlRow[] }>('GET', `/pools/${id}/grade-league`),
    ]);
    setMembers(m.members); setStandings(s.standings); setMatches(ms.matches); setGl(g);
  }, []);

  useEffect(() => { loadPools().catch((e) => setError(e instanceof ApiError ? e.message : 'Kan pools niet laden.')); }, [loadPools]);
  useEffect(() => {
    if (!pool) return;
    try { localStorage.setItem(POOL_KEY, pool.id); } catch { /* geen opslag */ }
    loadPool(pool.id).catch((e) => setError(e instanceof ApiError ? e.message : 'Kan de pool niet laden.'));
  }, [pool?.id, loadPool]); // eslint-disable-line react-hooks/exhaustive-deps

  const nameOf = useCallback((id: string) => (id === me ? 'Jij' : members.find((m) => m.userId === id)?.club?.name ?? members.find((m) => m.userId === id)?.username ?? 'Speler'), [members, me]);
  const refresh = () => { if (pool) void loadPool(pool.id); };

  if (playing) return <OnlineBattle matchId={playing} me={me} nameOf={nameOf} onExit={() => { setPlaying(null); nav.setImmersive(false); refresh(); }} />;
  const play = (id: string) => { setPlaying(id); nav.setImmersive(true); };

  if (pools === null) return <div className="page"><p className="dim">{error ?? 'Laden…'}</p></div>;
  if (!pool || sub === 'pools') {
    return <PoolsView pools={pools} active={pool} members={members} me={me} onSelect={(id) => { setPoolId(id); }} onChanged={async (id) => { const list = await loadPools(); if (id) setPoolId(id); else if (!list.length) setPoolId(null); }} />;
  }

  const myMatches = matches.filter((m) => m.homeUserId === me || m.awayUserId === me);
  const incoming = myMatches.filter((m) => m.status === 'pending' && m.challengerId !== me);
  const outgoing = myMatches.filter((m) => m.status === 'pending' && m.challengerId === me);
  const active = myMatches.filter((m) => m.status === 'active');
  const finished = myMatches.filter((m) => m.status === 'finished').slice(0, 8);
  const myRank = standings.find((s) => s.participant === me);
  const myGl = gl?.rows.find((r) => r.me);

  const respond = async (id: string, action: 'accept' | 'decline') => {
    try {
      await api('POST', `/matches/${id}/${action}`);
      if (action === 'accept') play(id); else refresh();
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Dat lukte niet.'); refresh(); }
  };

  const matchesPanel = (
    <section className="panel flush" aria-label="Jouw wedstrijden">
      <div className="panel-head"><h2>Jouw wedstrijden</h2></div>
      {error && <p className="form-error" style={{ padding: '0 16px' }}>{error}</p>}
      <ul className="rows">
        {incoming.map((m) => (
          <li key={m.id} className="row">
            <div className="row-main"><span className="row-title">{nameOf(m.challengerId)} daagt je uit</span><span className="row-sub">Accepteren kan nog {m.acceptBefore ? until(m.acceptBefore) : ''} · asynchroon, {m.deadlineHours} u per zet</span></div>
            <button className="btn small" onClick={() => void respond(m.id, 'accept')}>Accepteren</button>
            <button className="link-btn" onClick={() => void respond(m.id, 'decline')}>Weigeren</button>
          </li>
        ))}
        {active.map((m) => (
          <li key={m.id} className="row">
            <div className="row-main"><span className="row-title">Tegen {nameOf(m.homeUserId === me ? m.awayUserId : m.homeUserId)}</span><span className="row-sub">Bezig · {m.deadlineHours} u per zet</span></div>
            <button className="btn small" onClick={() => play(m.id)}>Spelen</button>
          </li>
        ))}
        {outgoing.map((m) => (
          <li key={m.id} className="row">
            <div className="row-main"><span className="row-title">Uitdaging aan {nameOf(m.homeUserId === me ? m.awayUserId : m.homeUserId)}</span><span className="row-sub">Wacht op antwoord · vervalt over {m.acceptBefore ? until(m.acceptBefore) : ''}</span></div>
          </li>
        ))}
        {finished.map((m) => {
          const mine = m.homeUserId === me ? m.result!.homeGoals : m.result!.awayGoals;
          const theirs = m.homeUserId === me ? m.result!.awayGoals : m.result!.homeGoals;
          return (
            <li key={m.id} className="row">
              <div className="row-main"><span className="row-title">Tegen {nameOf(m.homeUserId === me ? m.awayUserId : m.homeUserId)}</span><span className="row-sub">{m.result?.forfeitBy ? 'Reglementair' : 'Gespeeld'}</span></div>
              <button className={`result num ${mine > theirs ? 'win' : mine < theirs ? 'loss' : 'draw'}`} onClick={() => play(m.id)}>{mine}-{theirs}</button>
            </li>
          );
        })}
        {!incoming.length && !active.length && !outgoing.length && !finished.length && <li className="row"><span className="hint">Nog geen wedstrijden. Daag iemand uit bij RANK League.</span></li>}
      </ul>
    </section>
  );

  if (sub === 'gradeleague') {
    return (
      <div className="page">
        <div className="page-head"><div><div className="eyebrow">Competitie · {pool.name} · {gl?.period.name}</div><h1 className="display">Grade League</h1>
          <p className="dim small">Berekend op de server. Anderen zien alleen je plaats en totaalscore, nooit je cijfers of deelscores.</p></div></div>
        <ServerNote />
        <section className="panel flush">
          <div className="panel-head"><h2>Stand</h2><span className="tag live">server</span></div>
          <ol className="league-table">
            {gl?.rows.map((r) => (
              <li key={r.userId} data-me={r.me || undefined}>
                <details>
                  <summary>
                    <span className="lt-rank num">{r.rank ?? '–'}</span>
                    <span className="lt-name">{r.me ? 'Jij' : nameOf(r.userId)}</span>
                    <span className="lt-score num">{r.eligible && r.score !== null ? r.score.toFixed(1).replace('.', ',') : '–'}</span>
                  </summary>
                  <div className="gl-detail">
                    {r.me && r.components && (
                      <div className="gl-parts">
                        <span>Prestatie <b className="num">{Math.round(r.components.performance)}</b></span>
                        <span>Vooruitgang <b className="num">{Math.round(r.components.progress)}</b></span>
                        <span>Doelen <b className="num">{r.components.goals === null ? '–' : Math.round(r.components.goals)}</b></span>
                      </div>
                    )}
                    {r.me ? <ul>{r.explanation?.map((e) => <li key={e}>{e}</li>)}</ul> : <p>{r.eligible ? 'Alleen de totaalscore is zichtbaar.' : 'Nog te weinig cijfers deze periode.'}</p>}
                  </div>
                </details>
              </li>
            ))}
          </ol>
        </section>
      </div>
    );
  }

  if (sub === 'rankleague') {
    return (
      <div className="page">
        <div className="page-head"><div><div className="eyebrow">Competitie · {pool.name}</div><h1 className="display">RANK League</h1>
          <p className="dim small">Ranglijst berekend door de server uit alle gespeelde wedstrijden in deze pool.</p></div></div>
        <ServerNote />
        <div className="page-cols">
          <div className="stack">
            <section className="panel flush">
              <div className="panel-head"><h2>Stand</h2><span className="tag live">server</span></div>
              <div className="lt-scroll">
                <table className="standings">
                  <thead><tr><th>#</th><th className="l">Club</th><th title="Gespeeld">GS</th><th title="Gewonnen">W</th><th title="Gelijk">G</th><th title="Verloren">V</th><th title="Doelsaldo">+/−</th><th title="Punten">P</th><th className="l hide-xs">Vorm</th></tr></thead>
                  <tbody>
                    {standings.map((r) => (
                      <tr key={r.participant} data-me={r.participant === me || undefined}>
                        <td className="num">{r.rank}</td><td className="l name">{nameOf(r.participant)}</td>
                        <td className="num">{r.played}</td><td className="num">{r.won}</td><td className="num">{r.drawn}</td><td className="num">{r.lost}</td>
                        <td className="num">{r.goalDifference > 0 ? '+' : ''}{r.goalDifference}</td><td className="num pts">{r.points}</td>
                        <td className="l hide-xs"><span className="form">{r.form.map((f, i) => <i key={i} className={formClass[f]}>{f}</i>)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            {matchesPanel}
          </div>
          <ChallengePanel poolId={pool.id} members={members.filter((m) => m.userId !== me)} matches={myMatches} onDone={refresh} />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-head"><div><div className="eyebrow">Competitie · {pool.name}</div><h1 className="display">Drie leagues</h1></div>
        {pools.length > 1 && <select className="select" style={{ maxWidth: 220 }} value={pool.id} onChange={(e) => setPoolId(e.target.value)} aria-label="Kies pool">{pools.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}</div>
      <ServerNote />
      <div className="leagues">
        <section className="panel league-card rank" role="button" tabIndex={0} onClick={() => nav.go('competitie-rankleague')} onKeyDown={(e) => e.key === 'Enter' && nav.go('competitie-rankleague')}>
          <div className="eyebrow">RANK League · kaartbattles</div>
          <div className="league-pos"><span className="big-num">{myRank?.rank ?? '–'}</span><span className="dim">e van {standings.length}</span></div>
          <div className="dim small">{myRank ? `${myRank.points} punten · ${myRank.played} gespeeld` : ''}</div>
          {incoming.length + active.length > 0 && <div className="league-next"><b>{incoming.length + active.length}</b> wedstrijd{incoming.length + active.length === 1 ? '' : 'en'} wacht{incoming.length + active.length === 1 ? '' : 'en'} op jou</div>}
        </section>
        <section className="panel league-card grade" role="button" tabIndex={0} onClick={() => nav.go('competitie-gradeleague')} onKeyDown={(e) => e.key === 'Enter' && nav.go('competitie-gradeleague')}>
          <div className="eyebrow">Grade League · {gl?.period.name}</div>
          <div className="league-pos"><span className="big-num">{myGl?.rank ?? '–'}</span><span className="dim">e van {gl?.rows.filter((r) => r.eligible).length ?? 0}</span></div>
          <div className="dim small">{myGl?.eligible ? `Score ${myGl.score?.toFixed(1).replace('.', ',')}` : 'Nog te weinig cijfers deze periode'}</div>
        </section>
        <section className="panel league-card academy">
          <div className="eyebrow">Academy League</div>
          <div className="league-pos"><IconLeague width={40} height={40} /><span className="dim">nog niet actief</span></div>
          <div className="dim small">Komt als de pool het aanzet; telt dan oefenvoortgang met dezelfde plafonds.</div>
        </section>
      </div>
      {matchesPanel}
    </div>
  );
}

function ChallengePanel({ poolId, members, matches, onDone }: { poolId: string; members: Member[]; matches: MatchRow[]; onDone: () => void }) {
  const [hours, setHours] = useState(48);
  const [msg, setMsg] = useState<string | null>(null);
  const busyWith = useMemo(() => new Set(matches.filter((m) => m.status === 'pending' || m.status === 'active').flatMap((m) => [m.homeUserId, m.awayUserId])), [matches]);
  const challenge = async (opponentId: string) => {
    try {
      await api('POST', `/pools/${poolId}/matches`, { opponentId, timing: 'async', deadlineHours: hours });
      setMsg('Uitdaging verstuurd.');
      onDone();
    } catch (e) { setMsg(e instanceof ApiError ? e.message : 'Dat lukte niet.'); }
  };
  return (
    <section className="panel flush" aria-label="Uitdagen">
      <div className="panel-head"><h2>Uitdagen</h2>
        <select className="select" style={{ width: 'auto', height: 36 }} value={hours} onChange={(e) => setHours(Number(e.target.value))} aria-label="Bedenktijd per zet">
          {[24, 48, 72].map((h) => <option key={h} value={h}>{h} uur per zet</option>)}
        </select>
      </div>
      {msg && <p className="hint" style={{ padding: '0 16px' }}>{msg}</p>}
      <ul className="rows">
        {members.map((m) => (
          <li key={m.userId} className="row">
            <span className="pool-av" style={{ background: 'var(--electric)' }}>{(m.club?.short ?? m.username).slice(0, 3)}</span>
            <div className="row-main"><span className="row-title">{m.club?.name ?? m.username}</span><span className="row-sub">{m.username}</span></div>
            <button className="btn ghost small" disabled={busyWith.has(m.userId)} onClick={() => void challenge(m.userId)}>{busyWith.has(m.userId) ? 'Bezig' : 'Uitdagen'}</button>
          </li>
        ))}
        {!members.length && <li className="row"><span className="hint">Nog niemand anders in deze pool. Nodig iemand uit bij Pools.</span></li>}
      </ul>
    </section>
  );
}

function PoolsView({ pools, active, members, me, onSelect, onChanged }: {
  pools: Pool[]; active: Pool | null; members: Member[]; me: string; onSelect: (id: string) => void; onChanged: (id?: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [invite, setInvite] = useState<{ code: string; expiresAt: number; maxUses: number } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const run = async (fn: () => Promise<void>) => { setMsg(null); try { await fn(); } catch (e) { setMsg(e instanceof ApiError ? e.message : 'Dat lukte niet.'); } };
  const create = (e: FormEvent) => { e.preventDefault(); void run(async () => { const r = await api<{ pool: Pool }>('POST', '/pools', { name }); setName(''); await onChanged(r.pool.id); }); };
  const join = (e: FormEvent) => { e.preventDefault(); void run(async () => { const r = await api<{ pool: Pool }>('POST', '/pools/join', { code }); setCode(''); await onChanged(r.pool.id); }); };
  const makeInvite = () => void run(async () => { const r = await api<{ invite: { code: string; expiresAt: number; maxUses: number } }>('POST', `/pools/${active!.id}/invites`, { expiresInHours: 72, maxUses: 10 }); setInvite(r.invite); });
  const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); setMsg('Code gekopieerd.'); } catch { setMsg('Kopiëren lukt hier niet; selecteer de code.'); } };

  return (
    <div className="page">
      <div className="page-head"><div><div className="eyebrow">Competitie</div><h1 className="display">Pools</h1>
        <p className="dim small">Een pool is een besloten groep. Alleen leden zien elkaar; cijfers zijn nooit zichtbaar.</p></div></div>
      <ServerNote />
      {msg && <p className="form-ok" role="status">{msg}</p>}
      <div className="page-cols">
        <div className="stack">
          {pools.length > 0 && (
            <section className="panel flush">
              <div className="panel-head"><h2>Mijn pools</h2></div>
              <ul className="rows">
                {pools.map((p) => (
                  <li key={p.id}><button className="row" onClick={() => onSelect(p.id)} aria-current={active?.id === p.id || undefined}>
                    <div className="row-main"><span className="row-title">{p.name}</span><span className="row-sub">{p.memberCount}/{p.maxMembers} leden · {p.role === 'admin' ? 'beheerder' : 'lid'}</span></div>
                    {active?.id === p.id && <span className="tag gold">actief</span>}
                  </button></li>
                ))}
              </ul>
            </section>
          )}
          {active && (
            <section className="panel flush">
              <div className="panel-head"><h2>Leden · {active.name}</h2>{active.role === 'admin' && <button className="btn small" onClick={makeInvite}>Uitnodigen</button>}</div>
              {invite && (
                <div className="invite-box">
                  <span className="hint">Geef deze code aan wie je wilt uitnodigen (10× te gebruiken, 72 uur geldig). Hij wordt maar één keer getoond.</span>
                  <code className="invite-code" aria-label="Uitnodigingscode">{invite.code}</code>
                  <button className="btn ghost small" onClick={() => void copy(invite.code)}>Kopieer code</button>
                </div>
              )}
              <ul className="rows">
                {members.map((m) => (
                  <li key={m.userId} className="row">
                    <span className="pool-av" style={{ background: m.userId === me ? 'var(--gold-3)' : 'var(--electric)' }}>{(m.club?.short ?? m.username).slice(0, 3)}</span>
                    <div className="row-main"><span className="row-title">{m.club?.name ?? m.username}{m.userId === me ? ' (jij)' : ''}</span><span className="row-sub">{m.username} · {m.role === 'admin' ? 'beheerder' : 'lid'}</span></div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
        <div className="stack">
          <section className="panel">
            <div className="panel-head"><h2>Pool maken</h2></div>
            <form className="form" onSubmit={create}>
              <label className="field"><span>Naam</span><input className="input" value={name} maxLength={40} placeholder="Bijv. Klas 2B" onChange={(e) => setName(e.target.value)} /></label>
              <button className="btn small" type="submit" disabled={name.trim().length < 3}>Pool maken</button>
            </form>
          </section>
          <section className="panel">
            <div className="panel-head"><h2>Lid worden</h2></div>
            <form className="form" onSubmit={join}>
              <label className="field"><span>Uitnodigingscode</span><input className="input" value={code} placeholder="ABCDE-FGHJK" onChange={(e) => setCode(e.target.value)} /></label>
              <button className="btn small" type="submit" disabled={code.trim().length < 6}>Lid worden</button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
