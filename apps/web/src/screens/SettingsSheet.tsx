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

const FEEDBACK_KINDS: { value: string; label: string }[] = [
  { value: 'werkt-niet', label: 'Er werkt iets niet' },
  { value: 'onduidelijk', label: 'Iets is onduidelijk' },
  { value: 'idee', label: 'Ik heb een idee' },
];

/** Compact feedbackformulier, bereikbaar vanuit de app. Geen extra persoonsgegevens. */
function FeedbackForm() {
  const [kind, setKind] = useState('werkt-niet');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const send = async () => {
    setBusy(true); setErr(null);
    try { await api('POST', '/feedback', { kind, message, context: location.hash.slice(1) || undefined }); setDone(true); setMessage(''); }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Versturen mislukt.'); } finally { setBusy(false); }
  };
  if (done) return <p className="hint" role="status">Bedankt voor je melding! <button className="link-btn" onClick={() => setDone(false)}>Nog een melding</button></p>;
  return (
    <div>
      <div className="seg" role="radiogroup" aria-label="Soort melding" style={{ marginTop: 6 }}>
        {FEEDBACK_KINDS.map((k) => (
          <button key={k.value} role="radio" aria-checked={kind === k.value} aria-pressed={kind === k.value} onClick={() => setKind(k.value)}>{k.label}</button>
        ))}
      </div>
      <label className="field" style={{ marginTop: 8 }}><span className="dim small">Jouw melding</span>
        <textarea className="input" rows={3} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Wat werkt niet, wat is onduidelijk, of welk idee heb je?" /></label>
      {err && <p className="form-error" role="alert">{err}</p>}
      <div style={{ marginTop: 8 }}><button className="btn small" disabled={busy || message.trim().length < 2} onClick={() => void send()}>{busy ? 'Versturen…' : 'Versturen'}</button></div>
    </div>
  );
}

interface FeedbackItem { id: string; kind: string; message: string; status: string; context: string | null; created_at: number; username: string | null }

/** Beheerder: binnengekomen meldingen bekijken en op status zetten. */
function FeedbackAdmin() {
  const [items, setItems] = useState<FeedbackItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(async () => {
    try { const r = await api<{ feedback: FeedbackItem[] }>('GET', '/admin/feedback'); setItems(r.feedback); setErr(null); }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Kan meldingen niet laden.'); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const setStatus = async (id: string, status: string) => {
    try { await api('POST', `/admin/feedback/${id}/status`, { status }); await load(); } catch { /* opnieuw proberen */ }
  };
  const kindLabel = (k: string) => FEEDBACK_KINDS.find((x) => x.value === k)?.label ?? k;
  if (err) return <p className="form-error">{err}</p>;
  if (items === null) return <p className="dim small">Laden…</p>;
  if (items.length === 0) return <p className="dim small">Nog geen meldingen.</p>;
  return (
    <ul className="rows" style={{ marginTop: 8 }}>
      {items.map((f) => (
        <li className="row" key={f.id}>
          <div className="row-main">
            <span className="row-title">{kindLabel(f.kind)}{f.username ? ` · ${f.username}` : ''}</span>
            <span className="row-sub">{f.message}</span>
          </div>
          <select className="input" style={{ maxWidth: 130 }} value={f.status} onChange={(e) => void setStatus(f.id, e.target.value)} aria-label="Status">
            <option value="nieuw">Nieuw</option>
            <option value="bekeken">Bekeken</option>
            <option value="afgehandeld">Afgehandeld</option>
          </select>
        </li>
      ))}
    </ul>
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
              <div className="eyebrow" style={{ marginTop: 18 }}>Meldingen</div>
              <p className="hint">Feedback van testers. Zet een melding op bekeken of afgehandeld.</p>
              <FeedbackAdmin />
            </>
          )}

          <div className="eyebrow" style={{ marginTop: 18 }}>Feedback</div>
          <p className="hint">Werkt iets niet, is iets onduidelijk of heb je een idee? Laat het weten.</p>
          <FeedbackForm />
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
