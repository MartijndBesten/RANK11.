import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, ApiError, serverAvailable } from './api/client';
import { StoreProvider } from './state/store';
import { OnlineStoreProvider } from './state/onlineStore';
import { App } from './App';
import iconUrl from './assets/icon.svg';

type Mode = 'checking' | 'choose' | 'online' | 'demo';
const MODE_KEY = 'rank11-mode';
// Publieke demo-build (VITE_PUBLIC_DEMO=1): geen server, geen inlog- of accountscherm. Start meteen de
// lokale demo, zodat de publieke omgeving nooit om een account vraagt en niet eerst 1,5s op een server wacht.
const PUBLIC_DEMO = import.meta.env.VITE_PUBLIC_DEMO === '1';
const readMode = () => { try { return localStorage.getItem(MODE_KEY); } catch { return null; } };
const writeMode = (m: string | null) => { try { if (m) localStorage.setItem(MODE_KEY, m); else localStorage.removeItem(MODE_KEY); } catch { /* geen opslag */ } };

/**
 * Kiest de modus: online (server bereikbaar en ingelogd) of de lokale demo. In de statische preview
 * is er geen server en start de demo direct.
 */
export function Root() {
  const [mode, setMode] = useState<Mode>(PUBLIC_DEMO ? 'demo' : 'checking');
  const [hasServer, setHasServer] = useState(false);

  useEffect(() => {
    if (PUBLIC_DEMO) return; // publieke demo: geen serverdetectie
    let alive = true;
    (async () => {
      const server = await serverAvailable();
      if (!alive) return;
      setHasServer(server);
      if (!server) return setMode('demo');
      if (readMode() === 'demo') return setMode('demo');
      try {
        await api('GET', '/me');
        if (alive) setMode('online');
      } catch {
        if (alive) setMode('choose');
      }
    })();
    return () => { alive = false; };
  }, []);

  const loggedOut = useCallback(() => { writeMode(null); setMode('choose'); }, []);
  const exitDemo = useCallback(() => { writeMode(null); setMode(hasServer ? 'choose' : 'demo'); }, [hasServer]);

  if (mode === 'checking') return <div className="boot"><div className="stadium" /><div className="boot-card"><span>RANK11. start…</span></div></div>;
  if (mode === 'choose') return <AuthScreen onOnline={() => { writeMode('online'); setMode('online'); }} onDemo={() => { writeMode('demo'); setMode('demo'); }} />;
  if (mode === 'online') return <OnlineStoreProvider onLoggedOut={loggedOut}><App /></OnlineStoreProvider>;
  return <StoreProvider onExit={hasServer ? exitDemo : undefined}><App /></StoreProvider>;
}

function AuthScreen({ onOnline, onDemo }: { onOnline: () => void; onDemo: () => void }) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [invite, setInvite] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (tab === 'login') await api('POST', '/auth/login', { username, password, cookie: true });
      else await api('POST', '/auth/register', { username, password, inviteCode: invite, cookie: true });
      onOnline();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Er ging iets mis.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <div className="stadium" />
      <main className="auth-card panel gold">
        <div className="auth-brand"><img src={iconUrl} alt="" width={56} height={56} /><div><div className="display auth-title">RANK11.</div><div className="dim small">Your grades. Your squad.</div></div></div>
        <div className="seg" role="tablist" aria-label="Inloggen of account maken">
          <button role="tab" aria-pressed={tab === 'login'} aria-selected={tab === 'login'} onClick={() => setTab('login')}>Inloggen</button>
          <button role="tab" aria-pressed={tab === 'register'} aria-selected={tab === 'register'} onClick={() => setTab('register')}>Account maken</button>
        </div>
        <form className="form" onSubmit={submit}>
          <label className="field"><span>Gebruikersnaam</span><input className="input" autoComplete="username" value={username} maxLength={20} onChange={(e) => setUsername(e.target.value)} /></label>
          <label className="field"><span>Wachtwoord</span><input className="input" type="password" autoComplete={tab === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          {tab === 'register' && (
            <label className="field"><span>Uitnodigingscode</span><input className="input" value={invite} placeholder="ABCDE-FGHJK" onChange={(e) => setInvite(e.target.value)} /></label>
          )}
          {tab === 'register' && <p className="hint">Gebruik geen echte naam als gebruikersnaam. Je krijgt meteen een club en een startelftal met reserves.</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="btn" type="submit" disabled={busy}>{busy ? 'Bezig…' : tab === 'login' ? 'Inloggen' : 'Account maken'}</button>
        </form>
        <div className="auth-demo">
          <span className="tag demo">testomgeving</span>
          <p className="hint">Deze server draait lokaal met alleen synthetische testaccounts. Zonder account kun je de demo op dit toestel spelen.</p>
          <button className="link-btn" onClick={onDemo}>Demo zonder account</button>
        </div>
      </main>
    </div>
  );
}
