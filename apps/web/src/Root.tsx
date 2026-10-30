import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { api, ApiError, serverAvailable } from './api/client';
import { StoreProvider } from './state/store';
import { OnlineStoreProvider } from './state/onlineStore';
import { App } from './App';
import { Landing } from './screens/Landing';
import iconUrl from './assets/icon.svg';

type Mode = 'checking' | 'landing' | 'choose' | 'online' | 'demo' | 'unavailable' | 'pending';
const MODE_KEY = 'rank11-mode';
const PUBLIC_DEMO = import.meta.env.VITE_PUBLIC_DEMO === '1';
const ONLINE_ONLY = import.meta.env.VITE_ONLINE_ONLY === '1';
const readMode = () => { try { return localStorage.getItem(MODE_KEY); } catch { return null; } };
const writeMode = (m: string | null) => { try { if (m) localStorage.setItem(MODE_KEY, m); else localStorage.removeItem(MODE_KEY); } catch { /* geen opslag */ } };

interface Config { registrationEnabled: boolean; openRegistration: boolean; turnstileSiteKey: string | null }

export function Root() {
  const [mode, setMode] = useState<Mode>(PUBLIC_DEMO ? 'demo' : 'checking');
  const [hasServer, setHasServer] = useState(false);
  const [config, setConfig] = useState<Config>({ registrationEnabled: !ONLINE_ONLY, openRegistration: false, turnstileSiteKey: null });
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (PUBLIC_DEMO) return;
    let alive = true;
    (async () => {
      const server = await serverAvailable(ONLINE_ONLY ? 6000 : 1500);
      if (!alive) return;
      setHasServer(server);
      if (!server) return setMode(ONLINE_ONLY ? 'unavailable' : 'demo');
      if (ONLINE_ONLY) {
        try {
          const c = await api<Config>('GET', '/config');
          if (alive) setConfig({ registrationEnabled: c.registrationEnabled === true, openRegistration: c.openRegistration === true, turnstileSiteKey: c.turnstileSiteKey ?? null });
        } catch { if (alive) setConfig({ registrationEnabled: false, openRegistration: false, turnstileSiteKey: null }); }
      }
      if (!ONLINE_ONLY && readMode() === 'demo') return setMode('demo');
      try {
        const me = await api<{ user: { status?: string } }>('GET', '/me');
        if (!alive) return;
        setMode(me.user?.status && me.user.status !== 'active' ? 'pending' : 'online');
      } catch { if (alive) setMode('landing'); } // niet ingelogd: toon de publieke startpagina
    })();
    return () => { alive = false; };
  }, [retry]);

  const loggedOut = useCallback(() => { writeMode(null); setMode('landing'); }, []);
  const exitDemo = useCallback(() => { writeMode(null); setMode(hasServer ? 'landing' : 'demo'); }, [hasServer]);
  const goAuth = useCallback((tab: 'login' | 'register') => { setAuthTab(tab); setMode('choose'); }, []);

  if (mode === 'checking') return <div className="boot"><div className="stadium" /><div className="boot-card"><span>RANK11. start…</span></div></div>;
  if (ONLINE_ONLY && mode === 'unavailable') return (
    <div className="boot"><div className="stadium" />
      <div className="boot-card" role="alert">
        <h1>RANK11. is tijdelijk niet bereikbaar</h1>
        <p>De online server reageert niet. Je cijfers en wedstrijden blijven op de server bewaard. Er wordt niets lokaal als echt cijfer opgeslagen.</p>
        <button className="btn" onClick={() => { setMode('checking'); setRetry((n) => n + 1); }}>Opnieuw verbinden</button>
      </div>
    </div>
  );
  if (mode === 'landing') return <Landing onRegister={() => goAuth('register')} onLogin={() => goAuth('login')} />;
  if (mode === 'pending') return <PendingScreen onLoggedOut={() => { void api('POST', '/auth/logout').catch(() => {}); loggedOut(); }} />;
  if (mode === 'choose') return <AuthScreen config={config} initialTab={authTab}
    onOnline={() => { writeMode('online'); setMode('online'); }}
    onPending={() => setMode('pending')}
    onBack={() => setMode('landing')}
    onDemo={ONLINE_ONLY ? undefined : () => { writeMode('demo'); setMode('demo'); }} />;
  if (mode === 'online') return <OnlineStoreProvider onLoggedOut={loggedOut}><App /></OnlineStoreProvider>;
  return <StoreProvider onExit={hasServer ? exitDemo : undefined}><App /></StoreProvider>;
}

/** Wachtscherm: het kind is ingelogd maar wacht op toestemming van de ouder. Standaard gaat dat via een
 * e-mail aan de ouder (beveiligde link). Werkt e-mail nog niet, dan is er de beheerder-route: het kind toont
 * een koppelcode die een beheerder in de app invoert. Een koppelcode leidt NOOIT tot zelfgoedkeuring. */
function PendingScreen({ onLoggedOut }: { onLoggedOut: () => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [emailOn, setEmailOn] = useState<boolean | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [claim, setClaim] = useState<string | null>(null);
  const [claimBusy, setClaimBusy] = useState(false);
  const [claimErr, setClaimErr] = useState<string | null>(null);
  useEffect(() => {
    void api<{ emailConfigured?: boolean; consent: { parentEmailMasked: string } | null }>('GET', '/consent/status')
      .then((r) => { setEmail(r.consent?.parentEmailMasked ?? null); setEmailOn(r.emailConfigured === true); })
      .catch(() => {});
  }, []);
  const resend = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await api<{ emailSent?: boolean }>('POST', '/consent/resend');
      setMsg(r.emailSent ? 'We hebben de e-mail opnieuw verstuurd.' : 'E-mail staat nog niet aan. Vraag een beheerder om je goed te keuren met je koppelcode.');
    } catch (e) { setMsg(e instanceof ApiError ? e.message : 'Opnieuw versturen lukte niet.'); } finally { setBusy(false); }
  };
  const getCode = async () => {
    setClaimBusy(true); setClaimErr(null);
    try { const r = await api<{ claimCode: string }>('POST', '/consent/claim-code'); setClaim(r.claimCode); }
    catch (e) { setClaimErr(e instanceof ApiError ? e.message : 'Een code maken lukte niet.'); } finally { setClaimBusy(false); }
  };
  const openCode = () => { setShowCode(true); if (!claim) void getCode(); };
  return (
    <div className="auth"><div className="stadium" />
      <main className="auth-card panel gold">
        <div className="auth-brand"><img src={iconUrl} alt="" width={56} height={56} /><div><div className="display auth-title">RANK11.</div><div className="dim small">Your grades. Your squad.</div></div></div>
        <h1 style={{ fontSize: 20, margin: '6px 0 8px' }}>We wachten op je ouder</h1>
        {emailOn === false ? (
          <p className="hint">Voor kinderen onder de 16 moet een ouder toestemming geven. E-mail staat nu nog niet aan, dus vraag een beheerder om je account goed te keuren met jouw koppelcode (hieronder).</p>
        ) : (
          <p className="hint">We hebben je ouder{email ? ` (${email})` : ''} een e-mail gestuurd met een beveiligde link. Zodra je ouder toestemming geeft, kun je RANK11 spelen.</p>
        )}
        {msg && <p className="hint" role="status">{msg}</p>}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
          {emailOn !== false && <button className="btn small" disabled={busy} onClick={() => void resend()}>{busy ? 'Bezig…' : 'E-mail opnieuw sturen'}</button>}
          {!showCode && <button className="btn ghost small" onClick={openCode}>Toon koppelcode voor beheerder</button>}
          <button className="link-btn" onClick={onLoggedOut}>Uitloggen</button>
        </div>
        {showCode && (
          <div className="panel gold" style={{ marginTop: 12, padding: 14 }}>
            <div className="eyebrow">Koppelcode voor de beheerder</div>
            <p className="hint" style={{ marginTop: 4 }}>Geef deze code aan een beheerder. Alleen een beheerder kan je hiermee goedkeuren — de code werkt niet om jezelf goed te keuren.</p>
            {claimErr && <p className="form-error" role="alert">{claimErr}</p>}
            {claimBusy && !claim && <p className="dim small">Code maken…</p>}
            {claim && (
              <div style={{ marginTop: 8 }}>
                <code style={{ fontSize: '1.6em', letterSpacing: '0.14em', userSelect: 'all' }}>{claim}</code>
                <div style={{ marginTop: 8 }}><button className="btn ghost small" disabled={claimBusy} onClick={() => void getCode()}>{claimBusy ? 'Bezig…' : 'Nieuwe code'}</button></div>
              </div>
            )}
            <p className="hint" style={{ marginTop: 10 }}>De code is kort geldig en maar één keer te gebruiken. Alleen een ouder of wettelijk vertegenwoordiger mag toestemming geven.</p>
          </div>
        )}
      </main>
    </div>
  );
}

declare global { interface Window { turnstile?: { render: (el: HTMLElement, opts: Record<string, unknown>) => void } } }

function AuthScreen({ onOnline, onPending, onBack, onDemo, config, initialTab }: {
  onOnline: () => void; onPending: () => void; onBack: () => void; onDemo?: () => void; config: Config; initialTab: 'login' | 'register';
}) {
  const [tab, setTab] = useState<'login' | 'register'>(initialTab);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [invite, setInvite] = useState('');
  const [under16, setUnder16] = useState<boolean | null>(null);
  const [parentEmail, setParentEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const turnstileToken = useRef<string | null>(null);
  const tsRef = useRef<HTMLDivElement>(null);
  const canRegister = config.registrationEnabled || config.openRegistration;

  // Turnstile-widget laden als er een sitekey is (bot-bescherming).
  useEffect(() => {
    if (tab !== 'register' || !config.turnstileSiteKey) return;
    const id = 'cf-turnstile';
    const render = () => { if (tsRef.current && window.turnstile) window.turnstile.render(tsRef.current, { sitekey: config.turnstileSiteKey, callback: (t: string) => { turnstileToken.current = t; } }); };
    if (window.turnstile) { render(); return; }
    if (!document.getElementById(id)) {
      const s = document.createElement('script'); s.id = id; s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'; s.async = true; s.onload = render; document.head.appendChild(s);
    }
  }, [tab, config.turnstileSiteKey]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (tab === 'register' && under16 === null) { setError('Geef aan of je jonger dan 16 bent.'); return; }
    if (tab === 'register' && under16 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)) { setError('Vul het e-mailadres van je ouder in.'); return; }
    setBusy(true);
    try {
      if (tab === 'login') { await api('POST', '/auth/login', { username, password, cookie: true }); onOnline(); return; }
      const body: Record<string, unknown> = { username, password, under16, cookie: true };
      if (under16) body.parentEmail = parentEmail;
      if (!config.openRegistration) body.inviteCode = invite;
      if (turnstileToken.current) body.turnstileToken = turnstileToken.current;
      const res = await api<{ pending?: boolean }>('POST', '/auth/register', body);
      if (res.pending) onPending(); else onOnline();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Er ging iets mis.');
    } finally { setBusy(false); }
  };

  return (
    <div className="auth">
      <div className="stadium" />
      <main className="auth-card panel gold">
        <div className="auth-brand"><img src={iconUrl} alt="" width={56} height={56} /><div><div className="display auth-title">RANK11.</div><div className="dim small">Your grades. Your squad.</div></div></div>
        {canRegister && (
          <div className="seg" role="tablist" aria-label="Inloggen of account maken">
            <button role="tab" aria-pressed={tab === 'login'} aria-selected={tab === 'login'} onClick={() => setTab('login')}>Inloggen</button>
            <button role="tab" aria-pressed={tab === 'register'} aria-selected={tab === 'register'} onClick={() => setTab('register')}>Account maken</button>
          </div>
        )}
        <form className="form" onSubmit={submit}>
          <label className="field"><span>Gebruikersnaam</span><input className="input" autoComplete="username" value={username} maxLength={20} onChange={(e) => setUsername(e.target.value)} /></label>
          <label className="field"><span>Wachtwoord</span><input className="input" type="password" autoComplete={tab === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          {tab === 'register' && (
            <>
              <div className="field"><span>Ben je jonger dan 16 jaar?</span>
                <div className="seg" role="radiogroup" aria-label="Jonger dan 16 jaar?">
                  <button type="button" role="radio" aria-checked={under16 === true} aria-pressed={under16 === true} onClick={() => setUnder16(true)}>Ja</button>
                  <button type="button" role="radio" aria-checked={under16 === false} aria-pressed={under16 === false} onClick={() => setUnder16(false)}>Nee</button>
                </div>
              </div>
              {under16 === true && (
                <label className="field"><span>E-mailadres van je ouder of verzorger</span>
                  <input className="input" type="email" autoComplete="email" value={parentEmail} placeholder="ouder@example.nl" onChange={(e) => setParentEmail(e.target.value)} />
                  <small className="dim">Een ouder moet eerst toestemming geven voordat je kunt spelen.</small></label>
              )}
              {!config.openRegistration && (
                <label className="field"><span>Uitnodigingscode</span><input className="input" value={invite} placeholder="ABCDE-FGHJK" onChange={(e) => setInvite(e.target.value)} /></label>
              )}
              {config.turnstileSiteKey && <div ref={tsRef} className="cf-turnstile" style={{ marginTop: 4 }} />}
              <p className="hint">Gebruik geen echte naam als gebruikersnaam. Gebruik voorlopig alleen verzonnen cijfers.</p>
            </>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="btn" type="submit" disabled={busy}>{busy ? 'Bezig…' : tab === 'login' ? 'Inloggen' : 'Account maken'}</button>
        </form>
        <div className="auth-demo">
          <button className="link-btn" onClick={onBack}>← Terug naar de startpagina</button>
          {ONLINE_ONLY ? (
            <p className="hint"><a href="/privacy" style={{ color: 'inherit' }}>Privacyverklaring</a>{canRegister ? '' : ' · Registratie is momenteel gesloten.'}</p>
          ) : (
            <>
              <span className="tag demo">testomgeving</span>
              <p className="hint">Besloten testomgeving. Gebruik uitsluitend verzonnen cijfers. Zonder account kun je de demo op dit toestel spelen.</p>
              {onDemo && <button className="link-btn" onClick={onDemo}>Demo zonder account</button>}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
