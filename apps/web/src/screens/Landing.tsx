import { generateCatalog, type Player } from '@rank11/engine';
import { PlayerCard } from '../components/PlayerCard';
import { PORTRAITS } from '../portraits/registry';
import iconUrl from '../assets/icon.svg';
import './landing.css';

const DEMO_URL = 'https://rank11-demo.martijndenbesten.com';

// Een paar aansprekende voorbeeldkaarten voor het voorproefje (hoogste ratings, met portret).
const preview: Player[] = generateCatalog({ photos: PORTRAITS })
  .filter((p) => p.photo)
  .sort((a, b) => b.rating - a.rating)
  .slice(0, 5);

const STEPS: { title: string; text: string }[] = [
  { title: 'Haal cijfers', text: 'Voer je eigen schoolcijfers in. Ze blijven privé — niemand anders ziet ze.' },
  { title: 'Verdien kaarten', text: 'Goede cijfers geven pakjes met spelerskaarten. Hoe beter je cijfer, hoe gaver de kaart.' },
  { title: 'Bouw je elftal', text: 'Stel je sterkste team samen uit je verzamelde kaarten.' },
  { title: 'Speel tegen vrienden', text: 'Daag vrienden uit, speel wedstrijden en klim in de ranglijst.' },
];

/** Publieke startpagina: zichtbaar zonder inloggen. Een account is pas nodig om echt te spelen. */
export function Landing({ onRegister, onLogin }: { onRegister: () => void; onLogin: () => void }) {
  return (
    <div className="landing">
      <div className="stadium" />
      <div className="landing-inner">
        <header className="landing-hero">
          <div className="landing-brand">
            <img src={iconUrl} alt="" width={52} height={52} />
            <div className="display">RANK11.</div>
          </div>
          <div className="landing-tag">Your grades. Your squad.</div>
          <p className="landing-lead">Haal cijfers, verdien spelerskaarten, bouw je eigen elftal en speel tegen vrienden. Jouw cijfers blijven privé.</p>
          <div className="landing-cta">
            <button className="btn" onClick={onRegister}>Account maken</button>
            <button className="btn ghost" onClick={onLogin}>Inloggen</button>
            <a className="btn ghost" href={DEMO_URL} target="_blank" rel="noopener noreferrer">Probeer de demo</a>
          </div>
          <p className="landing-note">Rondkijken kan zonder account. Een account is pas nodig als je echt wilt spelen.</p>
        </header>

        <section className="landing-sec" aria-label="Voorbeeldkaarten">
          <div className="landing-cards">
            {preview.map((p) => <PlayerCard key={p.id} player={p} size="md" />)}
          </div>
        </section>

        <section className="landing-sec">
          <h2>Zo werkt het</h2>
          <div className="steps">
            {STEPS.map((s, i) => (
              <div className="step" key={s.title}>
                <span className="step-n">{i + 1}</span>
                <b>{s.title}</b>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="landing-parents">
          <h2>Voor ouders</h2>
          <p className="dim">RANK11. is een voetbalkaartspel voor kinderen van 10–16 jaar. Kinderen voeren hun eigen schoolcijfers in om kaarten en beloningen te verdienen.</p>
          <ul>
            <li>Cijfers zijn <b>privé</b> en niet zichtbaar voor andere spelers.</li>
            <li>Geen reclameprofielen, geen verkoop van gegevens. Opslag binnen de EU.</li>
            <li>Voor kinderen onder de 16 is <b>toestemming van een ouder</b> nodig voordat ze kunnen spelen.</li>
            <li>Een account kan altijd worden verwijderd; toestemming kan worden ingetrokken.</li>
          </ul>
        </section>

        <footer className="landing-footer">
          <a href="/privacy">Privacyverklaring</a>
          <a href="/privacy">Contact &amp; vragen</a>
          <span className="landing-note">RANK11. · schoolcijfers blijven privé</span>
        </footer>
      </div>
    </div>
  );
}
