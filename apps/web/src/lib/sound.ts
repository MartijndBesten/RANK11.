/**
 * Gesynthetiseerde geluidseffecten (WebAudio), geen audiobestanden of licenties nodig.
 * Uitschakelbaar; start pas na een gebruikersactie (vereist op iOS).
 */
let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean) { enabled = on; }

function ac(): AudioContext | null {
  if (!enabled) return null;
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', gain = 0.15, when = 0, slideTo?: number) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + when;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(dur: number, from: number, to: number, gain = 0.12, when = 0) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + when;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 1.2;
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.4);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(c.destination);
  src.start(t);
}

export const sfx = {
  tap: () => tone(880, 0.06, 'triangle', 0.06),
  tick: () => tone(1400, 0.03, 'square', 0.025),
  whoosh: () => noise(0.55, 400, 3200, 0.14),
  rise: () => { noise(1.6, 200, 5000, 0.08); tone(110, 1.6, 'sawtooth', 0.03, 0, 440); },
  boom: () => { tone(90, 0.7, 'sine', 0.45, 0, 38); noise(0.35, 2000, 300, 0.15); },
  sparkle: () => { for (let i = 0; i < 7; i++) tone(1800 + Math.random() * 2400, 0.18, 'sine', 0.035, i * 0.05); },
  reveal: () => { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.9 - i * 0.1, 'triangle', 0.07, i * 0.07)); },
  soft: () => { tone(392, 0.5, 'sine', 0.06); tone(493.88, 0.6, 'sine', 0.05, 0.12); },
  unlock: () => { tone(220, 0.12, 'square', 0.05); tone(330, 0.2, 'square', 0.05, 0.1); noise(0.3, 3000, 800, 0.08, 0.1); },
};
