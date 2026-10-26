import { useEffect, useMemo, useState, type ComponentType } from 'react';
import iconUrl from './assets/icon.svg';
import { inQuietHours, useStore } from './state/store';
import { Crest } from './components/Crest';
import {
  IconAcademy, IconCoin, IconGrades, IconHome, IconLeague, IconSettings, IconSquad, IconVault, IconVoucher, IconXp,
} from './components/Icons';
import { setSoundEnabled, sfx } from './lib/sound';
import { useReducedMotion } from './lib/motion';
import { Hub } from './screens/Hub';
import { PackScreen } from './screens/PackScreen';
import { PackOpening } from './screens/PackOpening';
import { RevealScreen } from './screens/RevealScreen';
import { DraftScreen } from './screens/DraftScreen';
import { SquadScreen } from './screens/SquadScreen';
import { CollectionScreen } from './screens/CollectionScreen';
import { GradesScreen } from './screens/grades/GradesScreen';
import { CompetitionScreen } from './screens/CompetitionScreen';
import { AcademyScreen } from './screens/AcademyScreen';
import { SettingsSheet } from './screens/SettingsSheet';
import { SubNav } from './components/SubNav';
import './styles/ui.css';

export type Tab = 'home' | 'club' | 'competitie' | 'cijfers' | 'academy';
/** Route = tab of tab-sub (alleen letters, cijfers en '-' zodat het preview-anker werkt). */
export type Route = string;

export interface Nav {
  go: (route: Route) => void;
  openPack: (packId: string) => void;
  setImmersive: (on: boolean) => void;
}

interface TabDef { id: Tab; label: string; Icon: ComponentType<{ width?: number; height?: number }>; subs: { id: string; label: string }[] }

export const TABS: TabDef[] = [
  { id: 'home', label: 'Home', Icon: IconHome, subs: [] },
  { id: 'club', label: 'Club', Icon: IconSquad, subs: [{ id: 'elftal', label: 'Elftal' }, { id: 'collectie', label: 'Collectie' }, { id: 'packs', label: 'Packs' }, { id: 'draft', label: 'Draft' }] },
  { id: 'competitie', label: 'Competitie', Icon: IconLeague, subs: [{ id: 'overzicht', label: 'Overzicht' }, { id: 'gradeleague', label: 'Grade League' }, { id: 'rankleague', label: 'RANK League' }, { id: 'pools', label: 'Pools' }] },
  { id: 'cijfers', label: 'Cijfers', Icon: IconGrades, subs: [{ id: 'overzicht', label: 'Overzicht' }, { id: 'vakken', label: 'Vakken' }, { id: 'invoeren', label: 'Invoeren' }, { id: 'doelen', label: 'Doelen' }, { id: 'watals', label: 'Wat als' }, { id: 'kluis', label: 'Kluis' }] },
  { id: 'academy', label: 'Academy', Icon: IconAcademy, subs: [{ id: 'overzicht', label: 'Overzicht' }, { id: 'oefenen', label: 'Oefenen' }] },
];

/** Oude ankers en interne verwijzingen blijven werken. */
const ALIASES: Record<string, Route> = {
  vault: 'cijfers-kluis', kluis: 'cijfers-kluis', draft: 'club-draft', packs: 'club-packs', squad: 'club-elftal', elftal: 'club-elftal',
  collectie: 'club-collectie', league: 'competitie', grades: 'cijfers',
};

function parse(raw: string, academyOn: boolean): { tab: Tab; sub: string } {
  const r = ALIASES[raw] ?? raw;
  const [tabId, ...rest] = r.split('-');
  const tab = TABS.find((t) => t.id === tabId && (t.id !== 'academy' || academyOn));
  if (!tab) return { tab: 'home', sub: '' };
  const sub = rest.join('-');
  return { tab: tab.id, sub: tab.subs.some((s) => s.id === sub) ? sub : tab.subs[0]?.id ?? '' };
}

export function App() {
  const { state, pending, xp, markNotified } = useStore();
  const academyOn = state.settings.academy;
  const [route, setRoute] = useState(() => parse(location.hash.replace('#', ''), academyOn));
  const [immersive, setImmersive] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  const [settings, setSettings] = useState(false);
  // Melding precies één keer per wachtende beloning; niet in stille uren en alleen als de speler dat wil.
  const [toastIds] = useState(() =>
    state.settings.notify.rewards && !inQuietHours(state.settings.notify) ? pending.map((p) => p.grade.id).filter((id) => !state.notified.includes(id)) : [],
  );
  const [toast, setToast] = useState(toastIds.length > 0);
  const reduced = useReducedMotion();

  useEffect(() => setSoundEnabled(state.settings.sound), [state.settings.sound]);
  useEffect(() => {
    if (toastIds.length) markNotified(toastIds);
    const t = setTimeout(() => setToast(false), 5200);
    return () => clearTimeout(t);
  }, [toastIds, markNotified]);
  useEffect(() => {
    const onHash = () => { setRoute(parse(location.hash.replace('#', ''), academyOn)); document.querySelector('.main')?.scrollTo({ top: 0 }); };
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, [academyOn]);
  useEffect(() => {
    if (!academyOn && route.tab === 'academy') setRoute({ tab: 'home', sub: '' });
  }, [academyOn, route.tab]);

  const go = (r: Route) => {
    sfx.tap();
    setImmersive(false);
    const next = parse(r, academyOn);
    history.replaceState(null, '', `#${next.sub ? `${next.tab}-${next.sub}` : next.tab}`);
    setRoute(next);
    document.querySelector('.main')?.scrollTo({ top: 0 });
  };
  const nav: Nav = { go, openPack: (id) => setOpening(id), setImmersive };
  const unopened = Object.values(state.packs).reduce((a, b) => a + b, 0);
  const tabs = useMemo(() => TABS.filter((t) => t.id !== 'academy' || academyOn), [academyOn]);
  const current = TABS.find((t) => t.id === route.tab)!;
  const badge = (t: Tab) => (t === 'cijfers' ? pending.length : t === 'club' ? unopened : 0);
  const key = `${route.tab}-${route.sub}`;

  return (
    <div className={reduced ? 'reduce-motion' : ''} style={{ height: '100%' }}>
      <div className="stadium" />
      <div className={`shell ${immersive || opening ? 'immersive' : ''}`}>
        <header className="topbar">
          <button className="club" onClick={() => go('club-elftal')} aria-label="Naar je club">
            <Crest data={state.club.crest} className="club-crest" title={state.club.name} />
            <div style={{ minWidth: 0, textAlign: 'left' }}>
              <div className="club-name">{state.club.name}</div>
              <div className="lvl">Niveau {xp.level.level} · {xp.level.into}/{xp.level.span} XP</div>
            </div>
          </button>
          <div className="wallet">
            <span className="chip num" title="Coins (alleen spelvaluta, niet te kopen)"><IconCoin />{state.coins.toLocaleString('nl-NL')}</span>
            <span className="chip num" title="Draft-vouchers"><IconVoucher />{state.vouchers}</span>
            <span className="chip num xp" title="Totale XP"><IconXp />{xp.total.toLocaleString('nl-NL')}</span>
          </div>
          <button className="icon-btn" onClick={() => setSettings(true)} aria-label="Instellingen">
            <IconSettings />
          </button>
        </header>

        <main className="main">
          {current.subs.length > 0 && (
            <SubNav items={current.subs} active={route.sub} onSelect={(s) => go(`${route.tab}-${s}`)} label={current.label}
              badges={{ kluis: pending.length, packs: unopened }} />
          )}
          <div className="route" key={key}>
            {route.tab === 'home' && <Hub nav={nav} />}
            {route.tab === 'club' && route.sub === 'elftal' && <SquadScreen nav={nav} />}
            {route.tab === 'club' && route.sub === 'collectie' && <CollectionScreen nav={nav} />}
            {route.tab === 'club' && route.sub === 'packs' && <PackScreen nav={nav} />}
            {route.tab === 'club' && route.sub === 'draft' && <DraftScreen nav={nav} />}
            {route.tab === 'cijfers' && route.sub === 'kluis' && <RevealScreen nav={nav} />}
            {route.tab === 'cijfers' && route.sub !== 'kluis' && <GradesScreen nav={nav} sub={route.sub} />}
            {route.tab === 'competitie' && <CompetitionScreen nav={nav} sub={route.sub} />}
            {route.tab === 'academy' && <AcademyScreen nav={nav} sub={route.sub} />}
          </div>
        </main>

        <nav className="nav" aria-label="Hoofdmenu">
          <div className="brand"><img src={iconUrl} alt="RANK11." width={44} height={44} /></div>
          {tabs.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => go(id)} aria-current={route.tab === id ? 'page' : undefined}>
              <Icon />
              <span className="nav-label">{label}</span>
              {badge(id) > 0 && <span className="badge">{badge(id)}</span>}
            </button>
          ))}
        </nav>
      </div>

      {toast && pending.length > 0 && !opening && route.sub !== 'kluis' && (
        <button className="toast" onClick={() => { setToast(false); go('cijfers-kluis'); }}>
          <IconVault width={28} height={28} />
          <div style={{ textAlign: 'left' }}>
            <b>{toastIds.length === 1 ? 'Er wacht een beloning' : `Er wachten ${toastIds.length} beloningen`}</b>
            <span>Open de Cijferkluis voor je cijfer{toastIds.length === 1 ? '' : 's'}</span>
          </div>
        </button>
      )}

      {opening && <PackOpening packId={opening} onDone={() => setOpening(null)} />}
      {settings && <SettingsSheet onClose={() => setSettings(false)} />}
    </div>
  );
}
