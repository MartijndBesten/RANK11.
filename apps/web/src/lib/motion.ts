import { useEffect, useState } from 'react';
import { useStore } from '../state/store';

/** Kort/volledig: systeeminstelling of in-app-keuze. */
export function useReducedMotion(): boolean {
  const { state } = useStore();
  const [sys, setSys] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setSys(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return sys || state.settings.reducedMotion;
}

/** Een reeks getimede stappen die met "Overslaan" direct naar het eind kan. */
export function useSequence(steps: number[], active: boolean, skip: boolean): number {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!active) { setStep(0); return; }
    if (skip) { setStep(steps.length); return; }
    const timers: number[] = [];
    let t = 0;
    steps.forEach((d, i) => { t += d; timers.push(window.setTimeout(() => setStep(i + 1), t)); });
    return () => timers.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, skip]);
  return step;
}

export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
