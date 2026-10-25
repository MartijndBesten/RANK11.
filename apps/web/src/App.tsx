import { useEffect, useState } from 'react';
import { useStore, levelFor } from './state/store';
import { Crest } from './components/Crest';
import {
  IconCoin, IconDraft, IconHome, IconMotion, IconPack, IconSound, IconSquad, IconVault, IconVoucher, IconXp,
} from './components/Icons';
import { setSoundEnabled, sfx } from './lib/sound';
import { useReducedMotion } from './lib/motion';
import { Hub } from './screens/Hub';
import { PackScreen } from './screens/PackScreen';
import { PackOpening } from './screens/PackOpening';
import { RevealScreen } from './screens/RevealScreen';
import { DraftScreen } from './screens/DraftScreen';
import { SquadScreen } from './screens/SquadScreen';

export type Screen = 'home' | 'vault' | 'draft' | 'packs' | 'squad';

export interface Nav {
  go: (s: Screen) => void;
  openPack: (packId: string) => void;
  setImmersive: (on: boolean) => void;
}

const NAV: { id: Screen; label: string; Icon: typeof IconHome }[] = [
  { id: 'home', label: 'Home', Icon: IconHome },
  { id: 'vault', label: 'Kluis', Icon: IconVault },
  { id: 'draft', label: 'Draft', Icon: IconDraft },
  { id: 'packs', label: 'Packs', Icon: IconPack },
  { id: 'squad', label: 'Elftal', Icon: IconSquad },
];

function initialScreen(): Screen {
  const h = location.hash.replace('#', '') as Screen;
  return NAV.some((n) => n.id === h) ? h : 'home';
}

export function App() {
  const { state, setSetting } = useStore();
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [immersive, setImmersive] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  const [toast, setToast] = useState(() => {
    // Eén keer per sessie tonen.
    try {
      if (sessionStorage.getItem('rank11-toast')) return false;
      sessionStorage.setItem('rank11-toast', '1');
    } catch { /* geen opslag: gewoon tonen */ }
    return state.pending.length > 0;
  });
  const reduced = useReducedMotion();

  useEffect(() => setSoundEnabled(state.settings.sound), [state.settings.sound]);
  useEffect(() => {
    const t = setTimeout(() => setToast(false), 5200);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    const onHash = () => setScreen(initialScreen());
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, []);

  const go = (s: Screen) => {
    sfx.tap();
    setImmersive(false);
    history.replaceState(null, '', `#${s}`);
    setScreen(s);
  };
  const nav: Nav = { go, openPack: (id) => setOpening(id), setImmersive };
  const lvl = levelFor(state.xp);
  const unopened = Object.values(state.packs).reduce((a, b) => a + b, 0);

  return (
    <div className={reduced ? 'reduce-motion' : ''} style={{ height: '100%' }}>
      <div className="stadium" />
      <div className={`shell ${immersive || opening ? 'immersive' : ''}`}>
        <header className="topbar">
          <div className="club">
            <Crest data={state.club.crest} className="club-crest" title={state.club.name} />
            <div style={{ minWidth: 0 }}>
              <div className="club-name">{state.club.name}</div>
              <div className="lvl">
                Niveau {lvl.level} · {lvl.into}/{lvl.span} XP
              </div>
            </div>
          </div>
          <div className="spacer" />
          <div className="wallet">
            <span className="chip num" title="Coins (alleen spelvaluta)"><IconCoin />{state.coins.toLocaleString('nl-NL')}</span>
            <span className="chip num" title="Draft-vouchers"><IconVoucher />{state.vouchers}</span>
            <span className="chip num xp" title="XP"><IconXp />{state.xp.toLocaleString('nl-NL')}</span>
          </div>
          <button className="icon-btn" onClick={() => setSetting('sound', !state.settings.sound)} aria-label={state.settings.sound ? 'Geluid uit' : 'Geluid aan'} aria-pressed={state.settings.sound}>
            <IconSound on={state.settings.sound} />
          </button>
          <button className="icon-btn hide-phone" onClick={() => setSetting('reducedMotion', !state.settings.reducedMotion)} aria-label={state.settings.reducedMotion ? 'Volledige animaties' : 'Korte animaties'} aria-pressed={!state.settings.reducedMotion}>
            <IconMotion on={!state.settings.reducedMotion} />
          </button>
        </header>

        <main className="main" key={screen}>
          {screen === 'home' && <Hub nav={nav} />}
          {screen === 'vault' && <RevealScreen nav={nav} />}
          {screen === 'draft' && <DraftScreen nav={nav} />}
          {screen === 'packs' && <PackScreen nav={nav} />}
          {screen === 'squad' && <SquadScreen nav={nav} />}
        </main>

        <nav className="nav" aria-label="Hoofdmenu">
          <div className="brand"><img src="./icon.svg" alt="RANK11." width={44} height={44} /></div>
          {NAV.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => go(id)} aria-current={screen === id ? 'page' : undefined}>
              <Icon />
              {label}
              {id === 'vault' && state.pending.length > 0 && <span className="badge">{state.pending.length}</span>}
              {id === 'packs' && unopened > 0 && <span className="badge">{unopened}</span>}
            </button>
          ))}
        </nav>
      </div>

      {toast && state.pending.length > 0 && !opening && screen !== 'vault' && (
        <button className="toast" onClick={() => { setToast(false); go('vault'); }}>
          <IconVault width={28} height={28} />
          <div style={{ textAlign: 'left' }}>
            <b>Je hebt {state.pending.length === 1 ? 'een nieuw cijfer' : `${state.pending.length} nieuwe cijfers`} binnen!</b>
            <span>Open de Cijferkluis en ontdek je beloning</span>
          </div>
        </button>
      )}

      {opening && <PackOpening packId={opening} onDone={() => setOpening(null)} />}
    </div>
  );
}
