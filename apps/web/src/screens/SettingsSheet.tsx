import { useState } from 'react';
import { Sheet } from '../components/Sheet';
import { useStore } from '../state/store';
import { Koppelingen } from './Koppelingen';

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
          <p className="hint">Ingelogd als <b>{user?.username}</b>. Je cijfers, club, collectie en beloningen staan op de (lokale test)server. Speluitleg onthouden we bij je account; de andere voorkeuren gelden alleen voor dit toestel.</p>
          <div style={{ marginTop: 10 }}><button className="btn ghost small" onClick={() => { onClose(); void logout(); }}>Uitloggen</button></div>
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
