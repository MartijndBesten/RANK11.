import { useCallback, useEffect, useState } from 'react';
import { Sheet } from '../components/Sheet';
import { useStore } from '../state/store';
import { Koppelingen } from './Koppelingen';
import { api, ApiError } from '../api/client';

interface AdminInvite { id: string; note: string | null; maxUses: number; uses: number; expiresAt: number; revokedAt: number | null; createdAt: number; active: boolean }

/** Beheerder: uitnodigingscodes aanmaken en intrekken, zonder databasecommando's. Alleen zichtbaar voor platform_admin. */
function InviteAdmin() {
  const [invites, setInvites] = useState<AdminInvite[] | null>(null);
  const [newCode, setNewCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [maxUses, setMaxUses] = useState(5);
  const [days, setDays] = useState(14);

  const load = useCallback(async () => {
    try { const r = await api<{ invites: AdminInvite[] }>('GET', '/admin/platform-invites'); setInvites(r.invites); setErr(null); }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Kan uitnodigingen niet laden.'); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const create = async () => {
    setBusy(true); setErr(null); setNewCode(null); setCopied(false);
    try {
      const r = await api<{ code: string }>('POST', '/admin/platform-invites', { maxUses, expiresInHours: days * 24 });
      setNewCode(r.code); await load();
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Aanmaken mislukt.'); } finally { setBusy(false); }
  };
  const revoke = async (id: string) => {
    setBusy(true); setErr(null);
    try { await api('POST', `/admin/platform-invites/${id}/revoke`); await load(); }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Intrekken mislukt.'); } finally { setBusy(false); }
  };
  const copy = async () => { if (!newCode) return; try { await navigator.clipboard.writeText(newCode); setCopied(true); } catch { /* selecteren mag ook */ } };
  const fmt = (ms: number) => new Date(ms).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });

  return (
    <div className="invite-admin">
      <div className="form-row" style={{ marginTop: 8, alignItems: 'end' }}>
        <label className="field"><span>Aantal keer bruikbaar</span>
          <input className="input" type="number" min={1} max={100} value={maxUses} onChange={(e) => setMaxUses(Math.max(1, Math.min(100, Number(e.target.value) || 1)))} /></label>
        <label className="field"><span>Geldig (dagen)</span>
          <input className="input" type="number" min={1} max={30} value={days} onChange={(e) => setDays(Math.max(1, Math.min(30, Number(e.target.value) || 1)))} /></label>
        <button className="btn small" disabled={busy} onClick={() => void create()}>{busy ? 'Bezig…' : 'Nieuwe code'}</button>
      </div>
      {newCode && (
        <div className="panel gold" style={{ marginTop: 10, padding: 12 }}>
          <div className="eyebrow">Nieuwe uitnodigingscode — noteer deze nu</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
            <code className="invite-code" style={{ fontSize: '1.2em', letterSpacing: '0.08em', userSelect: 'all' }}>{newCode}</code>
            <button className="btn ghost small" onClick={() => void copy()}>{copied ? 'Gekopieerd' : 'Kopiëren'}</button>
          </div>
          <p className="hint" style={{ marginTop: 6 }}>De code is hierna niet meer op te vragen; maak zo nodig een nieuwe aan.</p>
        </div>
      )}
      {err && <p className="form-error" role="alert">{err}</p>}
      <ul className="rows" style={{ marginTop: 10 }}>
        {invites === null ? <li className="row"><span className="dim small">Laden…</span></li>
          : invites.length === 0 ? <li className="row"><span className="dim small">Nog geen uitnodigingen.</span></li>
          : invites.map((iv) => (
            <li className="row" key={iv.id}>
              <div className="row-main">
                <span className="row-title">{iv.uses}/{iv.maxUses} gebruikt · t/m {fmt(iv.expiresAt)}</span>
                <span className="row-sub">{iv.revokedAt ? 'Ingetrokken' : iv.active ? 'Actief' : iv.uses >= iv.maxUses ? 'Vol' : 'Verlopen'}{iv.note ? ` · ${iv.note}` : ''}</span>
              </div>
              {iv.active && <button className="btn ghost small" disabled={busy} onClick={() => void revoke(iv.id)}>Intrekken</button>}
            </li>
          ))}
      </ul>
    </div>
  );
}

function Toggle({ label, note, on, onChange }: { label: string; note?: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="toggle-row">
      <div><b>{label}</b>{note && <small>{note}</small>}</div>
      <button className="switch" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} />
    </div>
  );
}

/** Instellingen: speluitleg, geluid, animaties, Academy, meldingen met stille uren, en demo opnieuw beginnen. */
export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const { state, setSetting, setNotify, setTipsOn, reset, mode, user, logout, can } = useStore();
  const [confirm, setConfirm] = useState(false);
  const n = state.settings.notify;
  return (
    <Sheet title="Instellingen" onClose={onClose}>
      <div className="eyebrow" style={{ marginTop: 4 }}>Spel</div>
      <Toggle label="Speluitleg" note="Korte uitleg de eerste keer dat je iets opent. Teruglezen kan altijd via 'Hoe werkt dit?'." on={state.tips.on} onChange={setTipsOn} />
      <Toggle label="Geluid" on={state.settings.sound} onChange={(v) => setSetting('sound', v)} />
      <Toggle label="Volledige animaties" note="Uit = korte animaties (ook bij systeeminstelling 'minder beweging')." on={!state.settings.reducedMotion} onChange={(v) => setSetting('reducedMotion', !v)} />
      <Toggle label="RANK Academy" note="Toont de Academy-tab. Nu alleen met de interne oefenmodule; een echte leeromgeving is nog niet gekoppeld." on={state.settings.academy} onChange={(v) => setSetting('academy', v)} />

      <div className="eyebrow" style={{ marginTop: 18 }}>Cijfers koppelen</div>
      <Koppelingen />

      <div className="eyebrow" style={{ marginTop: 18 }}>Meldingen in de app</div>
      <Toggle label="Beloningen in de kluis" on={n.rewards} onChange={(v) => setNotify({ rewards: v })} />
      <Toggle label="Doelen en aankomende toetsen" on={n.goals} onChange={(v) => setNotify({ goals: v })} />
      <Toggle label="Competitie" on={n.competition} onChange={(v) => setNotify({ competition: v })} />
      <div className="form-row" style={{ marginTop: 10 }}>
        <label className="field"><span>Stil vanaf</span><input className="input" type="time" value={n.quietFrom} onChange={(e) => setNotify({ quietFrom: e.target.value })} /></label>
        <label className="field"><span>Stil tot</span><input className="input" type="time" value={n.quietTo} onChange={(e) => setNotify({ quietTo: e.target.value })} /></label>
      </div>
      <p className="hint" style={{ marginTop: 8 }}>Geen meldingen om terug te lokken, geen reeksen die je kwijtraakt. Pushmeldingen buiten de app bestaan nog niet.</p>

      {mode === 'online' ? (
        <>
          <div className="eyebrow" style={{ marginTop: 18 }}>Account</div>
          <p className="hint">Ingelogd als <b>{user?.username}</b>. Je cijfers, club, collectie en beloningen staan veilig op de server. Speluitleg onthouden we bij je account; de andere voorkeuren gelden alleen voor dit toestel.</p>
          <div style={{ marginTop: 10 }}><button className="btn ghost small" onClick={() => { onClose(); void logout(); }}>Uitloggen</button></div>
          {user?.role === 'platform_admin' && (
            <>
              <div className="eyebrow" style={{ marginTop: 18 }}>Uitnodigingen beheren</div>
              <p className="hint">Maak codes aan voor familie en vrienden, of trek ze in. Deel een code privé, niet openbaar.</p>
              <InviteAdmin />
            </>
          )}
        </>
      ) : (
        <>
          <div className="eyebrow" style={{ marginTop: 18 }}>Demo</div>
          <p className="hint">Alle gegevens staan alleen op dit toestel (localStorage). Deze demo is niet met een server verbonden.</p>
          <div style={{ marginTop: 10, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            {confirm ? (
              <span className="confirm-inline" role="group" aria-label="Demo opnieuw beginnen bevestigen">
                <span className="dim small">Je lokale voortgang wordt gewist.</span>
                <button className="btn ghost small" onClick={() => { reset(); setConfirm(false); onClose(); }}>Opnieuw beginnen</button>
                <button className="link-btn" onClick={() => setConfirm(false)}>Annuleren</button>
              </span>
            ) : (
              <button className="btn ghost small" onClick={() => setConfirm(true)}>Demo opnieuw beginnen</button>
            )}
            {can.exit && <button className="link-btn" onClick={() => { onClose(); void logout(); }}>Naar inloggen</button>}
          </div>
        </>
      )}
    </Sheet>
  );
}
