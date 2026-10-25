/**
 * Kleine, eigen SVG-grafieken (geen bibliotheek): één reeks per grafiek, dunne lijnen,
 * terughoudend raster, tooltip bij aanwijzen/aanraken en altijd een tekstalternatief.
 */
import { useId, useMemo, useState, type PointerEvent } from 'react';
import type { Grade } from '@rank11/engine';
import { runningAverages } from '@rank11/engine';
import { fmt, shortDate } from '../state/gradeData';
import './charts.css';

/** Sparkline van het lopende gemiddelde; puur decoratief naast een groot getal (dat getal is het tekstalternatief). */
export function Sparkline({ values, className = '' }: { values: number[]; className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  if (values.length < 2) return null;
  const min = Math.min(...values) - 0.2;
  const max = Math.max(...values) + 0.2;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * 100, 30 - ((v - min) / (max - min)) * 26 - 2] as const);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
  const last = pts.at(-1)!;
  return (
    <svg className={`spark ${className}`} viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={`sp${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--gold-2)" stopOpacity="0.28" />
          <stop offset="1" stopColor="var(--gold-2)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L100 30 L0 30 Z`} fill={`url(#sp${id})`} />
      <path d={d} fill="none" stroke="var(--gold-2)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.6" fill="var(--gold-1)" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/**
 * Cijfers van één vak in de tijd: punten = toetsen (groter = zwaarder), lijn = gemiddelde na iedere toets,
 * stippellijn = voldoendegrens 5,5.
 */
export function GradeChart({ grades, color = 'var(--electric)' }: { grades: Grade[]; color?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const points = useMemo(() => runningAverages(grades), [grades]);
  const byId = useMemo(() => new Map(grades.map((g) => [g.id, g])), [grades]);
  if (!points.length) return null;
  const W = 320;
  const H = 170;
  const pad = { l: 26, r: 12, t: 12, b: 24 };
  const lo = Math.max(1, Math.floor(Math.min(4, ...points.map((p) => p.value)) - 0.5));
  const hi = 10;
  const x = (i: number) => pad.l + (points.length === 1 ? (W - pad.l - pad.r) / 2 : (i / (points.length - 1)) * (W - pad.l - pad.r));
  const y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b);
  const ticks = [lo, 5.5, 8, 10].filter((t, i, a) => t >= lo && a.indexOf(t) === i);
  const avgPath = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.average).toFixed(1)}`).join(' ');

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    let best = 0;
    points.forEach((_, i) => { if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i; });
    setHover(best);
  };
  const hp = hover !== null ? points[hover] : null;
  const hg = hp ? byId.get(hp.gradeId) : null;

  return (
    <figure className="gchart">
      <div className="gchart-plot">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Grafiek met ${points.length} cijfers en het gemiddelde na iedere toets`}
          onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className={t === 5.5 ? 'gc-pass' : 'gc-grid'} />
              <text x={pad.l - 6} y={y(t) + 3.5} className="gc-axis" textAnchor="end">{String(t).replace('.', ',')}</text>
            </g>
          ))}
          <path d={avgPath} className="gc-avg" />
          {hp && <line x1={x(hover!)} x2={x(hover!)} y1={pad.t} y2={H - pad.b} className="gc-cross" />}
          {points.map((p, i) => (
            <circle key={p.gradeId} cx={x(i)} cy={y(p.value)} r={3.4 + Math.min(p.weight, 4) * 1.1}
              className="gc-dot" style={{ fill: p.value < 5.5 ? 'var(--down)' : color }} data-active={hover === i || undefined} />
          ))}
          <text x={pad.l} y={H - 6} className="gc-axis">{shortDate(points[0]!.date)}</text>
          {points.length > 1 && <text x={W - pad.r} y={H - 6} className="gc-axis" textAnchor="end">{shortDate(points.at(-1)!.date)}</text>}
        </svg>
        {hp && hg && (
          <div className="gchart-tip" style={{ left: `${(x(hover!) / W) * 100}%` }}>
            <b>{hg.testName}</b>
            <span>{shortDate(hg.date)} · weging {String(hg.weight).replace('.', ',')}</span>
            <span>Cijfer <strong className="num">{fmt(hg.value)}</strong> · gemiddelde daarna <strong className="num">{fmt(hp.average, 2)}</strong></span>
          </div>
        )}
      </div>
      <figcaption className="gchart-legend">
        <span><i className="lg-dot" style={{ background: color }} /> Toets (groter = telt zwaarder)</span>
        <span><i className="lg-line" /> Gemiddelde</span>
        <span><i className="lg-pass" /> Voldoende (5,5)</span>
      </figcaption>
    </figure>
  );
}

/** Horizontale balk 1-10 met een markering voor de voldoendegrens en (optioneel) een doel. */
export function GradeBar({ value, target }: { value: number | null; target?: number }) {
  const pct = (v: number) => `${((v - 1) / 9) * 100}%`;
  return (
    <div className="gbar" aria-hidden="true">
      {value !== null && <i className={value < 5.5 ? 'low' : ''} style={{ width: pct(value) }} />}
      <b className="gbar-pass" style={{ left: pct(5.5) }} />
      {target !== undefined && <b className="gbar-target" style={{ left: pct(target) }} />}
    </div>
  );
}

/** Verdeling van cijfers over klassen; eenvoudige kolommen met het aantal erboven. */
export function DistributionBars({ bins }: { bins: { id: string; label: string; count: number }[] }) {
  const max = Math.max(1, ...bins.map((b) => b.count));
  return (
    <div className="dist" role="table" aria-label="Verdeling van je cijfers">
      {bins.map((b) => (
        <div key={b.id} className="dist-col" role="row">
          <span className="dist-n num" role="cell">{b.count}</span>
          <div className="dist-bar"><i className={b.id === 'lt5' || b.id === '5' ? 'low' : ''} style={{ height: `${(b.count / max) * 100}%` }} /></div>
          <span className="dist-label" role="cell">{b.label}</span>
        </div>
      ))}
    </div>
  );
}
