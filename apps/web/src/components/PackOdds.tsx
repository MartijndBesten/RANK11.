import { oddsTable, type PackDef } from '@rank11/engine';

const pct = (x: number) => (x === 0 ? '–' : x < 0.001 ? '<0,1%' : `${(x * 100).toFixed(x < 0.1 ? 1 : 0).replace('.', ',')}%`);

/** Transparante kansen: per kaartplek en "minstens één in deze pack". */
export function PackOdds({ def }: { def: PackDef }) {
  const rows = oddsTable(def);
  const uniform = def.slots.every((s) => s === def.slots[0]);
  return (
    <>
      <table className="odds">
        <thead>
          <tr>
            <th>Categorie</th>
            {!uniform && def.slots.map((s, i) => <th key={i} className="n">{s.label ?? `Plek ${i + 1}`}</th>)}
            {uniform && <th className="n">Per kaart</th>}
            <th className="n">In pack</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.bucketId}>
              <td>{r.label}</td>
              {!uniform && r.perSlot.map((p, i) => <td key={i} className="n">{pct(p)}</td>)}
              {uniform && <td className="n">{pct(r.perSlot[0] ?? 0)}</td>}
              <td className="n">{pct(r.atLeastOne)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="odds-note">"In pack" = kans op minstens één kaart uit die categorie. Packs zijn nooit met echt geld te koop; je verdient ze met cijfers, events en spelcoins.</p>
    </>
  );
}
