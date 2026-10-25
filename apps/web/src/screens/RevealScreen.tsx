import { useEffect, useMemo, useRef, useState } from 'react';
import { compareAverages, formatGrade, PACKS, subjectAverages, type Player } from '@rank11/engine';
import type { Nav } from '../App';
import { subjectById, useStore, type RevealOutcome } from '../state/store';
import { PackArt } from '../components/PackArt';
import { PlayerCard, RIM } from '../components/PlayerCard';
import { Sparks } from '../components/Sparks';
import { Walkout } from '../components/Walkout';
import { IconCoin, IconDown, IconUp, IconVault, IconVoucher, IconXp } from '../components/Icons';
import { useReducedMotion } from '../lib/motion';
import { sfx } from '../lib/sound';
import './reveal.css';

type Tone = 'elite' | 'good' | 'pass' | 'support';
const toneFor = (v: number): Tone => (v >= 8.5 ? 'elite' : v >= 6.5 ? 'good' : v >= 5.5 ? 'pass' : 'support');

const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });

export function RevealScreen({ nav }: { nav: Nav }) {
  const { grades, pending, revealGrade } = useStore();
  const [active, setActive] = useState<string | null>(null);
  const [direct, setDirect] = useState<RevealOutcome[]>([]);
  const revealed = useMemo(() => grades.filter((g) => !pending.some((p) => p.grade.id === g.id)), [grades, pending]);
  const averages = useMemo(() => subjectAverages(revealed), [revealed]);

  return (
    <div className="screen vault">
      <header className="screen-head">
        <div className="eyebrow">Cijferkluis</div>
        <h1 className="display">{pending.length ? `${pending.length} nieuw` : 'Alles onthuld'}</h1>
      </header>

      <div className="vault-grid">
        <section className="vault-pending" aria-label="Nieuwe cijfers">
          {pending.length === 0 && direct.length === 0 && (
            <div className="panel empty">
              <p>Geen beloningen die wachten.</p>
              <p className="dim small">Voer een cijfer in; de beloning verschijnt hier om te openen.</p>
              <button className="btn small" onClick={() => nav.go('cijfers-invoeren')}>Cijfer invoeren</button>
            </div>
          )}
          {pending.map((p, i) => (
            <article key={p.grade.id} className="sealed" style={{ animationDelay: `${i * 80}ms` }}>
              <button className="sealed-main" onClick={() => { sfx.tap(); setActive(p.grade.id); nav.setImmersive(true); }}>
                <div className="sealed-lock" aria-hidden="true"><IconVault /></div>
                <div className="sealed-copy">
                  <b>Nieuw cijfer</b>
                  <span className="dim small">Binnengekomen om {fmtTime(p.arrivedAt)}</span>
                </div>
                <div className="sealed-q display" aria-hidden="true">?</div>
              </button>
              <button
                className="link-btn sealed-direct"
                onClick={() => {
                  const out = revealGrade(p.grade.id);
                  if (out) setDirect((d) => [out, ...d]);
                }}
              >
                Direct bekijken zonder animatie
              </button>
            </article>
          ))}
          {direct.map((o) => <DirectResult key={o.grade.id} outcome={o} nav={nav} />)}
        </section>

        <section className="panel vault-overview" aria-label="Cijferoverzicht">
          <div className="eyebrow" style={{ padding: '14px 16px 4px' }}>Mijn gemiddelden</div>
          <ul>
            {[...averages.entries()].map(([sid, avg]) => {
              const s = subjectById(sid);
              const list = revealed.filter((g) => g.subjectId === sid);
              const last = list[list.length - 1];
              return (
                <li key={sid}>
                  <span className="subj-dot" style={{ background: s.color }}>{s.short}</span>
                  <span className="subj-name">{s.name}<small className="dim">{list.length} cijfers{last ? ` · laatste ${formatGrade(last.value)}` : ''}</small></span>
                  <span className={`subj-avg num ${avg < 5.5 ? 'low' : ''}`}>{formatGrade(avg)}</span>
                </li>
              );
            })}
          </ul>
          <p className="dim small" style={{ padding: '0 16px 14px', margin: 0 }}>Alleen jij ziet je cijfers. In pools tellen alleen de spelresultaten.</p>
        </section>
      </div>

      {active && (
        <RevealSequence
          gradeId={active}
          onClose={() => { setActive(null); nav.setImmersive(false); }}
          onOpenPack={(id) => { setActive(null); nav.setImmersive(false); nav.openPack(id); }}
        />
      )}
    </div>
  );
}

function DirectResult({ outcome, nav }: { outcome: RevealOutcome; nav: Nav }) {
  const { claimPick } = useStore();
  const [picked, setPicked] = useState<string | null>(null);
  const s = subjectById(outcome.grade.subjectId);
  const ch = compareAverages(outcome.subjectBefore, outcome.subjectAfter);
  return (
    <article className="panel direct">
      <div className="direct-row">
        <span className="subj-dot" style={{ background: s.color }}>{s.short}</span>
        <div style={{ flex: 1 }}>
          <b>{s.name}</b>
          <div className="dim small">{outcome.grade.testName} · telt {outcome.grade.weight}× mee</div>
        </div>
        <div className={`direct-grade num tone-${toneFor(outcome.grade.value)}`}>{formatGrade(outcome.grade.value)}</div>
      </div>
      <div className="dim small">
        Gemiddelde {formatGrade(ch.before)} → {formatGrade(ch.after)} {ch.trend === 'up' ? '▲' : ch.trend === 'down' ? '▼' : ''} · +{outcome.reward.xp} XP
        {outcome.reward.coins ? ` · +${outcome.reward.coins} coins` : ''}
      </div>
      {outcome.pickOptions && (
        <div className="direct-pick">
          <div className="eyebrow">{picked ? 'Toegevoegd aan je collectie' : 'Kies je speler'}</div>
          <div className="rv-pick-row">
            {outcome.pickOptions.map((p) => (
              <div key={p.id} className={`rv-pick-card ${picked && picked !== p.id ? 'faded' : ''}`}>
                <PlayerCard player={p} size="sm" selected={picked === p.id} onClick={picked ? undefined : () => { setPicked(p.id); claimPick(p.id); }} />
              </div>
            ))}
          </div>
        </div>
      )}
      {outcome.reward.packId && (
        <button className="btn small" style={{ marginTop: 10 }} onClick={() => nav.openPack(outcome.reward.packId!)}>
          {PACKS[outcome.reward.packId]!.name} openen
        </button>
      )}
    </article>
  );
}

/* ———————————————————— Onthulling ———————————————————— */

type Step = 'door' | 'opening' | 'subject' | 'weight' | 'grade' | 'average' | 'reward';
const ORDER: Step[] = ['door', 'opening', 'subject', 'weight', 'grade', 'average', 'reward'];
// 'grade' gaat pas verder nadat de rolteller geland is (zie onLanded).
const AUTO: Partial<Record<Step, number>> = { opening: 900, subject: 1300, weight: 1100, average: 2600 };

function RevealSequence({ gradeId, onClose, onOpenPack }: { gradeId: string; onClose: () => void; onOpenPack: (id: string) => void }) {
  const { revealGrade, claimPick } = useStore();
  const reduced = useReducedMotion();
  const [step, setStep] = useState<Step>('door');
  const [outcome, setOutcome] = useState<RevealOutcome | null>(null);
  const [hold, setHold] = useState(0);
  const holdTimer = useRef<number | undefined>(undefined);
  const autoTimer = useRef<number | undefined>(undefined);
  const ran = useRef(false);
  const idx = ORDER.indexOf(step);
  const at = (s: Step) => idx >= ORDER.indexOf(s);

  const start = () => {
    if (ran.current) return;
    ran.current = true;
    const out = revealGrade(gradeId);
    if (!out) { onClose(); return; }
    setOutcome(out);
    sfx.unlock();
    setStep(reduced ? 'reward' : 'opening');
  };

  // Ingedrukt houden om de kluis te openen: geeft spanning. Toetsenbord: Enter/spatie.
  const pressStart = () => {
    if (step !== 'door') return;
    const t0 = performance.now();
    const tick = () => {
      const p = Math.min(1, (performance.now() - t0) / 850);
      setHold(p);
      if (p >= 1) start();
      else holdTimer.current = requestAnimationFrame(tick);
    };
    holdTimer.current = requestAnimationFrame(tick);
  };
  const pressEnd = () => {
    if (holdTimer.current) cancelAnimationFrame(holdTimer.current);
    if (step === 'door' && !ran.current) setHold(0);
  };

  useEffect(() => {
    const d = AUTO[step];
    if (!d || !outcome) return;
    if (step === 'subject') sfx.whoosh();
    if (step === 'weight') sfx.tap();
    autoTimer.current = window.setTimeout(() => setStep(ORDER[idx + 1]!), d);
    return () => clearTimeout(autoTimer.current);
  }, [step, outcome, idx]);

  const advance = () => {
    if (step === 'door' || step === 'reward' || !outcome) return;
    clearTimeout(autoTimer.current);
    setStep(ORDER[idx + 1]!);
  };

  const g = outcome?.grade;
  const subject = g ? subjectById(g.subjectId) : null;
  const tone = g ? toneFor(g.value) : 'pass';

  return (
    <div className={`reveal tone-${tone} step-${step}`} onClick={advance} style={{ ['--subj' as string]: subject?.color ?? '#3aa8ff' }}>
      <div className="reveal-bg" aria-hidden="true" />
      {step !== 'reward' && step !== 'door' && (
        <button className="skip-btn" onClick={(e) => { e.stopPropagation(); clearTimeout(autoTimer.current); setStep('reward'); }}>Overslaan</button>
      )}
      {step === 'door' && (
        <button className="skip-btn" onClick={(e) => { e.stopPropagation(); onClose(); }}>Terug</button>
      )}

      {(step === 'door' || step === 'opening') && (
        <div className={`vault-door ${step === 'opening' ? 'open' : ''}`}>
          <button
            className="vault-door-btn"
            onPointerDown={pressStart}
            onPointerUp={pressEnd}
            onPointerLeave={pressEnd}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') start(); }}
            aria-label="Houd ingedrukt om de kluis te openen"
          >
            <svg viewBox="0 0 200 200" className="vault-svg" aria-hidden="true">
              <defs>
                <radialGradient id="vd-g" cx="0.35" cy="0.3" r="0.8">
                  <stop offset="0" stopColor="#4a5f8f" />
                  <stop offset="0.6" stopColor="#1a2644" />
                  <stop offset="1" stopColor="#0a1124" />
                </radialGradient>
                <linearGradient id="vd-gold" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#fff1c4" />
                  <stop offset="0.5" stopColor="#c9972f" />
                  <stop offset="1" stopColor="#7d5b17" />
                </linearGradient>
              </defs>
              <circle cx="100" cy="100" r="96" fill="#0a1124" stroke="url(#vd-gold)" strokeWidth="3" />
              <circle cx="100" cy="100" r="86" fill="url(#vd-g)" />
              {Array.from({ length: 24 }, (_, i) => (
                <rect key={i} x="98" y="16" width="4" height="10" rx="1" fill="#8aa0cf" opacity="0.5" transform={`rotate(${i * 15} 100 100)`} />
              ))}
              <g className="vault-wheel" style={{ transform: `rotate(${hold * 120}deg)` }}>
                <circle cx="100" cy="100" r="40" fill="none" stroke="url(#vd-gold)" strokeWidth="6" />
                {[0, 60, 120].map((r) => <rect key={r} x="96" y="48" width="8" height="104" rx="4" fill="url(#vd-gold)" transform={`rotate(${r} 100 100)`} />)}
                <circle cx="100" cy="100" r="14" fill="#0a1124" stroke="url(#vd-gold)" strokeWidth="4" />
              </g>
              <circle cx="100" cy="100" r="93" fill="none" stroke="#7ff0ff" strokeWidth="5" strokeLinecap="round"
                strokeDasharray={`${hold * 584} 584`} transform="rotate(-90 100 100)" style={{ filter: 'drop-shadow(0 0 6px #7ff0ff)' }} />
            </svg>
          </button>
          {step === 'door' && (
            <div className="door-copy">
              <div className="display door-title">Nieuw cijfer</div>
              <div className="dim">Houd de kluis ingedrukt om te openen</div>
            </div>
          )}
        </div>
      )}

      {g && subject && at('subject') && step !== 'reward' && (
        <div className="reveal-stack">
          <div className="rv-subject">
            <span className="rv-subj-badge">{subject.short}</span>
            <div>
              <div className="display rv-subj-name">{subject.name}</div>
              <div className="rv-test">{g.testName}</div>
            </div>
          </div>
          {at('weight') && <div className="rv-weight">Telt <b>{g.weight}×</b> mee</div>}
          {at('grade') && (
            <GradeRoller
              value={g.value}
              tone={tone}
              reduced={reduced}
              onLanded={() => { autoTimer.current = window.setTimeout(() => setStep((s) => (s === 'grade' ? 'average' : s)), 1500); }}
            />
          )}
          {at('average') && outcome && <AverageCompare outcome={outcome} />}
          <div className="rv-hint">Tik om door te gaan</div>
        </div>
      )}

      {step === 'reward' && outcome && (
        <RewardPanel outcome={outcome} reduced={reduced} onClose={onClose} onOpenPack={onOpenPack} onPick={claimPick} />
      )}
    </div>
  );
}

function GradeRoller({ value, tone, reduced, onLanded }: { value: number; tone: Tone; reduced: boolean; onLanded: () => void }) {
  const [shown, setShown] = useState(reduced ? value : 1);
  const [landed, setLanded] = useState(reduced);
  const landedCb = useRef(onLanded);
  landedCb.current = onLanded;
  useEffect(() => {
    if (reduced) { landedCb.current(); return; }
    let n = 0;
    const total = 22;
    let t: number;
    const step = () => {
      n++;
      if (n >= total) {
        setShown(value);
        setLanded(true);
        landedCb.current();
        if (tone === 'support') sfx.soft();
        else { sfx.boom(); if (tone === 'elite') setTimeout(sfx.sparkle, 120); else setTimeout(sfx.reveal, 100); }
        return;
      }
      setShown(Math.round((1 + Math.random() * 9) * 10) / 10);
      sfx.tick();
      t = window.setTimeout(step, 40 + n * n * 0.4); // ±2 s, vertragend
    };
    t = window.setTimeout(step, 200);
    return () => clearTimeout(t);
  }, [value, tone, reduced]);
  return (
    <div className={`rv-grade ${landed ? 'landed' : 'rolling'}`}>
      <div className="rv-grade-num num">{formatGrade(shown)}</div>
      {landed && tone === 'elite' && <Sparks colors={['#f2cf73', '#fff', '#7ff0ff']} trigger={1} count={120} disabled={reduced} />}
    </div>
  );
}

function AverageCompare({ outcome }: { outcome: RevealOutcome }) {
  const ch = compareAverages(outcome.subjectBefore, outcome.subjectAfter);
  const all = compareAverages(outcome.overallBefore, outcome.overallAfter);
  const pctOf = (v: number | null) => `${(((v ?? 1) - 1) / 9) * 100}%`;
  return (
    <div className={`rv-avg trend-${ch.trend}`}>
      <div className="rv-avg-row">
        <span className="dim">Gemiddelde vak</span>
        <span className="num rv-avg-from">{formatGrade(ch.before)}</span>
        <span className="rv-arrow">{ch.trend === 'up' ? <IconUp /> : ch.trend === 'down' ? <IconDown /> : '='}</span>
        <span className="num rv-avg-to">{formatGrade(ch.after)}</span>
        <span className="num rv-delta">{ch.delta >= 0 ? '+' : ''}{ch.delta.toFixed(2).replace('.', ',')}</span>
      </div>
      <div className="rv-bar">
        <div className="rv-bar-from" style={{ width: pctOf(ch.before) }} />
        <div className="rv-bar-to" style={{ width: pctOf(ch.after) }} />
        <div className="rv-bar-pass" style={{ left: pctOf(5.5) }} />
      </div>
      <div className="rv-avg-row small">
        <span className="dim">Algemeen gemiddelde</span>
        <span className="num">{formatGrade(all.before, 2)} → {formatGrade(all.after, 2)}</span>
      </div>
    </div>
  );
}

function RewardPanel({ outcome, reduced, onClose, onOpenPack, onPick }: {
  outcome: RevealOutcome; reduced: boolean; onClose: () => void; onOpenPack: (id: string) => void; onPick: (id: string) => void;
}) {
  const r = outcome.reward;
  const g = outcome.grade;
  const subject = subjectById(g.subjectId);
  const tone = toneFor(g.value);
  const [picked, setPicked] = useState<Player | null>(null);
  const [walkout, setWalkout] = useState(false);
  const [flip, setFlip] = useState(false);
  useEffect(() => {
    if (r.pick && !reduced) { const t = setTimeout(() => setFlip(true), 700); return () => clearTimeout(t); }
    setFlip(true);
  }, [r.pick, reduced]);

  if (walkout && picked) {
    return <Walkout player={picked} reduced={reduced} onDone={() => setWalkout(false)} doneLabel="Naar mijn collectie" />;
  }

  return (
    <div className="rv-reward" onClick={(e) => e.stopPropagation()}>
      <div className="rv-reward-head">
        <div className="rv-mini">
          <span className="rv-subj-badge small">{subject.short}</span>
          <span>{subject.name} · {g.testName}</span>
          <b className={`num tone-${tone}`}>{formatGrade(g.value)}</b>
        </div>
        {r.tier && <div className={`rv-tier tier-${r.tier.tone} display`}>{r.tier.label}</div>}
        {r.status === 'support' && <p className="rv-support">Dit cijfer telt mee, maar het zegt niet alles. Je volgende toets is een nieuwe kans.</p>}
        {(r.status === 'capped' || r.status === 'duplicate') && <p className="rv-support">{r.reason}</p>}
      </div>

      <div className="rv-gains">
        {r.xp > 0 && <span className="gain"><IconXp /> +{r.xp} XP</span>}
        {r.coins > 0 && <span className="gain"><IconCoin /> +{r.coins.toLocaleString('nl-NL')}</span>}
        {r.vouchers > 0 && <span className="gain"><IconVoucher /> +{r.vouchers} draft-voucher</span>}
      </div>
      {r.bonuses.length > 0 && (
        <div className="rv-bonuses">
          {r.bonuses.map((b) => <span key={b.label} className="bonus">{b.label}{b.xp ? ` +${b.xp} XP` : ''}{b.coins ? ` +${b.coins}` : ''}</span>)}
        </div>
      )}

      {r.status === 'support' && (
        <div className="panel rv-challenge">
          <div className="eyebrow">Herstelchallenge</div>
          <p>Haal bij je volgende toets {subject.name} een <b>6,0 of hoger</b> en verdien een <b>Goudpack</b>.</p>
        </div>
      )}

      {r.packId && (
        <div className="rv-pack">
          <div className="rv-pack-art"><PackArt theme={PACKS[r.packId]!.theme} name={PACKS[r.packId]!.name} /></div>
          <div className="rv-pack-copy">
            <div className="eyebrow">Beloning</div>
            <div className="display rv-pack-name">{PACKS[r.packId]!.name}</div>
            <div className="dim small">{PACKS[r.packId]!.tagline}</div>
            <div className="rv-actions">
              <button className="btn" onClick={() => onOpenPack(r.packId!)}>Nu openen</button>
              <button className="btn ghost small" onClick={onClose}>Bewaren</button>
            </div>
          </div>
        </div>
      )}

      {r.pick && outcome.pickOptions && (
        <div className="rv-pick">
          <div className="eyebrow" style={{ textAlign: 'center' }}>{picked ? 'Toegevoegd aan je collectie' : `Kies 1 van ${outcome.pickOptions.length} spelers (${r.pick.minRating}+)`}</div>
          <div className="rv-pick-row">
            {outcome.pickOptions.map((p) => (
              <div key={p.id} className={`rv-pick-card ${picked && picked.id !== p.id ? 'faded' : ''}`}>
                <PlayerCard
                  player={p}
                  size="md"
                  faceDown={!flip}
                  tilt={flip}
                  selected={picked?.id === p.id}
                  onClick={picked || !flip ? undefined : () => { sfx.reveal(); setPicked(p); onPick(p.id); setWalkout(true); }}
                />
              </div>
            ))}
          </div>
          {picked && <div className="rv-actions center"><button className="btn" onClick={onClose}>Klaar</button></div>}
        </div>
      )}

      {!r.packId && !r.pick && (
        <div className="rv-actions center"><button className="btn" onClick={onClose}>Klaar</button></div>
      )}
      <Sparks colors={[RIM.gold, '#fff']} trigger={tone === 'elite' ? 1 : 0} count={80} disabled={reduced} />
    </div>
  );
}
