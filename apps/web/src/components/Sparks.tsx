import { useEffect, useRef } from 'react';

/** Lichte deeltjesburst (canvas). Rendert niets bij verminderde beweging. */
export function Sparks({ colors, trigger, count = 140, fountain = false, disabled = false }: { colors: string[]; trigger: number; count?: number; fountain?: boolean; disabled?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (disabled || !trigger) return;
    const canvas = ref.current;
    const c = canvas?.getContext('2d');
    if (!canvas || !c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = (canvas.width = canvas.clientWidth * dpr);
    const h = (canvas.height = canvas.clientHeight * dpr);
    type P = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string };
    const parts: P[] = [];
    const spawn = (x: number, y: number, n: number, up: boolean) => {
      for (let i = 0; i < n; i++) {
        const a = up ? -Math.PI / 2 + (Math.random() - 0.5) * 0.5 : Math.random() * Math.PI * 2;
        const sp = (up ? 9 + Math.random() * 9 : 2 + Math.random() * 9) * dpr;
        parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: 50 + Math.random() * 50, size: (1 + Math.random() * 2.4) * dpr, color: colors[i % colors.length]! });
      }
    };
    if (fountain) {
      spawn(w * 0.12, h, count / 4, true); spawn(w * 0.88, h, count / 4, true);
    }
    spawn(w / 2, h * 0.45, count, false);
    let raf = 0;
    let frame = 0;
    const tick = () => {
      frame++;
      if (fountain && frame < 70 && frame % 6 === 0) { spawn(w * 0.12, h, 8, true); spawn(w * 0.88, h, 8, true); }
      c.clearRect(0, 0, w, h);
      c.globalCompositeOperation = 'lighter';
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]!;
        p.life++;
        p.vy += 0.16 * dpr;
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.x += p.vx;
        p.y += p.vy;
        const k = 1 - p.life / p.max;
        if (k <= 0) { parts.splice(i, 1); continue; }
        c.globalAlpha = k;
        c.fillStyle = p.color;
        c.beginPath();
        c.arc(p.x, p.y, p.size * (0.6 + k * 0.6), 0, Math.PI * 2);
        c.fill();
        c.globalAlpha = k * 0.35;
        c.fillRect(p.x - p.vx * 1.5, p.y - p.vy * 1.5, p.size * 0.8, p.size * 0.8);
      }
      if (parts.length) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [trigger, disabled, count, fountain, colors]);
  if (disabled) return null;
  return <canvas ref={ref} className="sparks" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 30 }} />;
}
