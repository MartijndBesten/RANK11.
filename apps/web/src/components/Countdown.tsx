import { useEffect, useState } from 'react';

export function Countdown({ to }: { to: Date }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const ms = Math.max(0, to.getTime() - now);
  const d = Math.floor(ms / 864e5);
  const h = Math.floor((ms % 864e5) / 36e5);
  const m = Math.floor((ms % 36e5) / 6e4);
  return <span className="num">{ms === 0 ? 'Afgelopen' : d > 0 ? `${d}d ${h}u` : `${h}u ${m}m`}</span>;
}
