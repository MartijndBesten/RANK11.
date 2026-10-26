import { useState } from 'react';
import { useStore } from '../state/store';
import { IconInfo } from './Icons';

/** Korte uitleg per onderdeel, in gewone taal. De eerste keer vanzelf (als Speluitleg aan staat), daarna via "Hoe werkt dit?". */
export const TIPS = {
  start: {
    title: 'Zo werkt RANK11.',
    text: 'Voer na een toets je cijfer in. Open daarna je beloning in de Cijferkluis. Zet je beste spelers in je elftal en speel in de competitie.',
  },
  kluis: {
    title: 'De Cijferkluis',
    text: 'Elk cijfer dat je invoert, komt hier verzegeld binnen. Houd ingedrukt om hem te openen. Een voldoende geeft een pack. Een onvoldoende geeft coins, en als je daarna herstelt, krijg je extra.',
  },
  packs: {
    title: 'Packs',
    text: 'Je krijgt packs voor voldoendes, behaalde doelen, herstel na een onvoldoende en elk nieuw clubniveau. Bij elke pack zie je hoe groot de kans op elke kaart is. Coins zijn spelgeld; je kunt ze niet kopen.',
  },
  elftal: {
    title: 'Je elftal',
    text: 'Kies voor elke plek een speler. Een speler op zijn eigen positie telt het best mee. Spelers van dezelfde club of hetzelfde land geven extra chemie. Met dit elftal speel je in de competitie.',
  },
  competitie: {
    title: 'Competitie',
    text: 'In een kaartbattle kies je om de beurt een kaart. Per duel telt één waarde, bijvoorbeeld snelheid; de hoogste wint. Je hoeft niet tegelijk online te zijn. Je cijfers ziet niemand, ook niet in de Grade League.',
  },
  academy: {
    title: 'De Academy',
    text: 'Oefen in korte rondjes. Wat je fout had, komt later terug tot je het kent. XP krijg je voor echte vooruitgang: nieuwe stof, verbeterde fouten en een betere score. Hetzelfde rondje nog eens doen levert niets op.',
  },
} as const;
export type TipId = keyof typeof TIPS;

export function Help({ id }: { id: TipId }) {
  const { state, markTipSeen, setTipsOn } = useStore();
  const [open, setOpen] = useState(false);
  const auto = state.tips.on && !state.tips.seen.includes(id);
  const tip = TIPS[id];
  if (!auto && !open) {
    return (
      <div className="help-row">
        <button className="help-q" onClick={() => setOpen(true)} aria-expanded={false}><IconInfo width={15} height={15} /> Hoe werkt dit?</button>
      </div>
    );
  }
  const close = () => { setOpen(false); markTipSeen(id); };
  return (
    <aside className="help-card" aria-label={tip.title}>
      <IconInfo className="help-icon" width={20} height={20} aria-hidden="true" />
      <div className="help-body">
        <b>{tip.title}</b>
        <p>{tip.text}</p>
        <div className="help-actions">
          <button className="btn small ghost" onClick={close}>{auto ? 'Begrepen' : 'Sluiten'}</button>
          {auto && <button className="link-btn" onClick={() => { setTipsOn(false); close(); }}>Geen uitleg meer tonen</button>}
        </div>
      </div>
    </aside>
  );
}
