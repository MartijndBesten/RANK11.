import { useEffect, useState } from 'react';
import { useStore, type IntegrationProvider } from '../state/store';

const when = (ms?: number | null) => (ms ? new Date(ms).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : null);

/** Koppelingen met externe cijferbronnen. Eén keer koppelen, daarna cijfers bijwerken. Ontkoppelen kan altijd. */
export function Koppelingen() {
  const { integrations } = useStore();
  const [providers, setProviders] = useState<IntegrationProvider[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = () => Promise.resolve(integrations.list()).then(setProviders);
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const act = async (id: string, fn: () => Promise<unknown> | unknown, after?: (r: unknown) => string) => {
    setBusy(id); setMsg(null);
    try { const r = await fn(); if (after) setMsg(after(r)); await load(); }
    finally { setBusy(null); }
  };

  if (!providers) return <p className="hint">Koppelingen laden…</p>;

  return (
    <div className="koppel">
      {msg && <p className="form-ok" role="status">{msg}</p>}
      {providers.map((p) => (
        <div key={p.id} className="koppel-row">
          <div className="koppel-head">
            <div>
              <b>{p.name}{p.school ? ` – ${p.school}` : ''}</b>
              <span className={`koppel-status ${p.link.linked ? (p.link.status === 'error' ? 'err' : 'on') : p.available ? 'off' : 'na'}`}>
                {!p.available ? 'nog niet beschikbaar' : p.link.linked ? (p.link.status === 'error' ? 'fout bij synchroniseren' : 'gekoppeld') : 'niet gekoppeld'}
              </span>
            </div>
          </div>
          {p.note && <p className="hint koppel-note">{p.note}</p>}
          {p.link.linked && p.link.lastSyncAt && <p className="hint">Laatst bijgewerkt: {when(p.link.lastSyncAt)}.</p>}
          {p.link.linked && p.link.lastError && <p className="form-error">{p.link.lastError}</p>}
          {p.available && (
            <div className="confirm-inline" style={{ marginTop: 8 }}>
              {!p.link.linked
                ? <button className="btn small" disabled={busy === p.id} onClick={() => act(p.id, () => integrations.connect(p.id), () => 'Gekoppeld. De cijfers komen binnen; open de kluis voor je beloningen.')}>Koppelen</button>
                : <>
                    <button className="btn small" disabled={busy === p.id} onClick={() => act(p.id, () => integrations.sync(p.id), (r) => { const o = r as { created: number }; return o.created > 0 ? `${o.created} nieuwe cijfers opgehaald.` : 'Geen nieuwe cijfers; alles was al bijgewerkt.'; })}>{busy === p.id ? 'Bezig…' : 'Nu synchroniseren'}</button>
                    <button className="link-btn" disabled={busy === p.id} onClick={() => act(p.id, () => integrations.disconnect(p.id), () => 'Ontkoppeld. Je cijfers blijven staan.')}>Ontkoppelen</button>
                  </>}
            </div>
          )}
        </div>
      ))}
      <p className="hint" style={{ marginTop: 4 }}>Een koppeling vraagt nooit je wachtwoord in RANK11. Cijfers uit een koppeling krijgen een herkomstlabel; dubbele cijfers worden overgeslagen.</p>
    </div>
  );
}
