import { useMemo, useState } from 'react';
import {
  clubById, nationByCode, POSITION_LABEL, POSITION_NAME, RARITY_LABEL, RARITY_RANK, STAT_KEYS, STAT_NAME,
  type Player, type Position, type Rarity,
} from '@rank11/engine';
import type { Nav } from '../App';
import { quickSellValue, useStore } from '../state/store';
import { PlayerCard, RIM } from '../components/PlayerCard';
import { Sheet } from '../components/Sheet';
import { Flag } from '../components/Flag';
import { Crest } from '../components/Crest';
import { IconCoin, IconSearch } from '../components/Icons';
import './collection.css';

type SeriesKey = 'bronze' | 'silver' | 'gold' | 'rare_gold' | 'exam' | 'legend' | 'other';
const SERIES: { key: SeriesKey; label: string; rarities: Rarity[]; rim: string }[] = [
  { key: 'bronze', label: RARITY_LABEL.bronze, rarities: ['bronze'], rim: RIM.bronze },
  { key: 'silver', label: RARITY_LABEL.silver, rarities: ['silver'], rim: RIM.silver },
  { key: 'gold', label: RARITY_LABEL.gold, rarities: ['gold'], rim: RIM.gold },
  { key: 'rare_gold', label: RARITY_LABEL.rare_gold, rarities: ['rare_gold'], rim: RIM.rare_gold },
  { key: 'exam', label: RARITY_LABEL.exam, rarities: ['exam'], rim: RIM.exam },
  { key: 'legend', label: RARITY_LABEL.legend, rarities: ['legend'], rim: RIM.legend },
  { key: 'other', label: 'Overig', rarities: ['special', 'season', 'champion'], rim: RIM.special },
];
const seriesOf = (r: Rarity): SeriesKey => SERIES.find((s) => s.rarities.includes(r))?.key ?? 'other';

type Group = 'gk' | 'def' | 'mid' | 'att';
const GROUPS: { key: Group; label: string; positions: Position[] }[] = [
  { key: 'gk', label: 'Keepers', positions: ['GK'] },
  { key: 'def', label: 'Verdedigers', positions: ['RB', 'CB', 'LB'] },
  { key: 'mid', label: 'Middenvelders', positions: ['CDM', 'CM', 'CAM', 'RM', 'LM'] },
  { key: 'att', label: 'Aanvallers', positions: ['RW', 'LW', 'ST'] },
];
const POS_ORDER: Position[] = ['GK', 'RB', 'CB', 'LB', 'CDM', 'CM', 'CAM', 'RM', 'LM', 'RW', 'LW', 'ST'];

type Sort = 'rating' | 'new' | 'name' | 'series' | 'position';
const SORTS: { key: Sort; label: string }[] = [
  { key: 'rating', label: 'Rating' },
  { key: 'new', label: 'Nieuw' },
  { key: 'name', label: 'Naam' },
  { key: 'series', label: 'Serie' },
  { key: 'position', label: 'Positie' },
];

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

interface Entry { player: Player; count: number; newest: number; inLineup: boolean }

export function CollectionScreen(_: { nav: Nav }) {
  const { state, owned, quickSell } = useStore();
  const [query, setQuery] = useState('');
  const [series, setSeries] = useState<SeriesKey | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [onlyLineup, setOnlyLineup] = useState(false);
  const [onlyDupes, setOnlyDupes] = useState(false);
  const [sort, setSort] = useState<Sort>('rating');
  const [openId, setOpenId] = useState<string | null>(null);

  const lineupIds = useMemo(() => new Set(Object.values(state.lineup)), [state.lineup]);

  const entries = useMemo(() => {
    const map = new Map<string, Entry>();
    owned.forEach((p, i) => {
      const e = map.get(p.id);
      if (e) { e.count++; e.newest = i; } else map.set(p.id, { player: p, count: 1, newest: i, inLineup: lineupIds.has(p.id) });
    });
    return [...map.values()];
  }, [owned, lineupIds]);

  const seriesCounts = useMemo(() => {
    const c = new Map<SeriesKey, number>();
    for (const p of owned) c.set(seriesOf(p.rarity), (c.get(seriesOf(p.rarity)) ?? 0) + 1);
    return c;
  }, [owned]);

  const shown = useMemo(() => {
    const q = norm(query.trim());
    const list = entries.filter(({ player: p, count, inLineup }) => {
      if (series && seriesOf(p.rarity) !== series) return false;
      if (group && !GROUPS.find((g) => g.key === group)!.positions.includes(p.position)) return false;
      if (onlyLineup && !inLineup) return false;
      if (onlyDupes && count < 2) return false;
      if (q) {
        const hay = norm(`${p.firstName} ${p.lastName} ${clubById(p.clubId).name} ${nationByCode(p.nation).name}`);
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const byName = (a: Entry, b: Entry) => a.player.lastName.localeCompare(b.player.lastName, 'nl');
    const cmp: Record<Sort, (a: Entry, b: Entry) => number> = {
      rating: (a, b) => b.player.rating - a.player.rating || byName(a, b),
      new: (a, b) => b.newest - a.newest,
      name: byName,
      series: (a, b) => RARITY_RANK[b.player.rarity] - RARITY_RANK[a.player.rarity] || b.player.rating - a.player.rating,
      position: (a, b) => POS_ORDER.indexOf(a.player.position) - POS_ORDER.indexOf(b.player.position) || b.player.rating - a.player.rating,
    };
    return list.sort(cmp[sort]);
  }, [entries, query, series, group, onlyLineup, onlyDupes, sort]);

  const filtered = !!(query || series || group || onlyLineup || onlyDupes);
  const reset = () => { setQuery(''); setSeries(null); setGroup(null); setOnlyLineup(false); setOnlyDupes(false); };
  const open = entries.find((e) => e.player.id === openId) ?? null;

  return (
    <div className="page coll">
      <div className="page-head">
        <div>
          <div className="eyebrow">Club</div>
          <h1 className="display">Collectie</h1>
          <p className="dim num">{owned.length} kaarten · {entries.length} uniek</p>
        </div>
      </div>

      <div className="coll-strip" role="group" aria-label="Kaarten per serie">
        {SERIES.filter((s) => s.key !== 'other' || seriesCounts.get('other')).map((s) => (
          <button key={s.key} className="coll-series" aria-pressed={series === s.key} onClick={() => setSeries(series === s.key ? null : s.key)}>
            <i style={{ background: s.rim }} aria-hidden="true" />
            <span>{s.label}</span>
            <b className="num">{seriesCounts.get(s.key) ?? 0}</b>
          </button>
        ))}
      </div>

      <div className="panel coll-tools">
        <label className="coll-search">
          <IconSearch aria-hidden="true" />
          <input className="input" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Zoek op naam, club of land" aria-label="Zoek in je collectie" />
        </label>
        <div className="chips" role="group" aria-label="Positie">
          {GROUPS.map((g) => (
            <button key={g.key} className="chip-btn" aria-pressed={group === g.key} onClick={() => setGroup(group === g.key ? null : g.key)}>{g.label}</button>
          ))}
          <button className="chip-btn" aria-pressed={onlyLineup} onClick={() => setOnlyLineup(!onlyLineup)}>In elftal</button>
          <button className="chip-btn" aria-pressed={onlyDupes} onClick={() => setOnlyDupes(!onlyDupes)}>Dubbel</button>
        </div>
        <div className="coll-sort">
          <label className="field">
            <span>Sorteren</span>
            <select className="select" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </label>
          <span className="dim small num" aria-live="polite">{shown.length} {shown.length === 1 ? 'kaart' : 'kaarten'}</span>
          {filtered && <button className="link-btn" onClick={reset}>Filters wissen</button>}
        </div>
      </div>

      {shown.length ? (
        <ul className="cl-grid">
          {shown.map(({ player, count, inLineup }) => (
            <li key={player.id} className="coll-item">
              <PlayerCard player={player} size="sm" onClick={() => setOpenId(player.id)}
                label={`${player.firstName} ${player.lastName}, ${RARITY_LABEL[player.rarity]}, rating ${player.rating}${count > 1 ? `, ${count} keer` : ''}. Details openen`} />
              {count > 1 && <span className="coll-n num" aria-hidden="true">×{count}</span>}
              {inLineup && <span className="coll-xi" aria-hidden="true">XI</span>}
            </li>
          ))}
        </ul>
      ) : (
        <div className="panel empty">
          <b>Geen kaarten gevonden</b>
          <span>{filtered ? 'Geen kaart past bij deze zoekopdracht of filters.' : 'Je collectie is nog leeg. Verdien packs met je cijfers.'}</span>
          {filtered && <button className="btn ghost small" onClick={reset}>Filters wissen</button>}
        </div>
      )}

      {open && <CardDetail entry={open} onClose={() => setOpenId(null)} onSell={() => quickSell([open.player.id])} />}
    </div>
  );
}

function CardDetail({ entry, onClose, onSell }: { entry: Entry; onClose: () => void; onSell: () => number }) {
  const { player: p, count, inLineup } = entry;
  const [confirm, setConfirm] = useState(false);
  const [sold, setSold] = useState<number | null>(null);
  const club = clubById(p.clubId);
  const nation = nationByCode(p.nation);
  const value = quickSellValue(p);

  return (
    <Sheet title={`${p.firstName} ${p.lastName}`} onClose={onClose}>
      <div className="cd">
        <div className="cd-card"><PlayerCard player={p} size="lg" tilt /></div>
        <div className="cd-info">
          <dl className="cd-facts">
            <div><dt>Positie</dt><dd>{POSITION_NAME[p.position]} <span className="dim">({POSITION_LABEL[p.position]})</span></dd></div>
            {p.altPositions.length > 0 && <div><dt>Ook</dt><dd>{p.altPositions.map((x) => POSITION_NAME[x]).join(', ')}</dd></div>}
            <div><dt>Leeftijd</dt><dd className="num">{p.age} jaar</dd></div>
            <div><dt>Land</dt><dd className="cd-inline"><Flag code={p.nation} className="cd-flag" /> {nation.name}</dd></div>
            <div><dt>Club</dt><dd className="cd-inline"><Crest data={club} className="cd-crest" /> {club.name}</dd></div>
            <div><dt>Serie</dt><dd className="cd-inline"><i className="cd-swatch" style={{ background: RIM[p.rarity] }} aria-hidden="true" /> {RARITY_LABEL[p.rarity]}</dd></div>
            <div><dt>Rating</dt><dd className="num"><b>{p.rating}</b></dd></div>
          </dl>
          <div className="chips">
            {inLineup ? <span className="tag live">In je elftal</span> : <span className="tag">Niet in je elftal</span>}
            {count > 1 && <span className="tag gold">{count}× in collectie</span>}
          </div>
        </div>
      </div>

      <ul className="cd-stats" aria-label="Statistieken">
        {STAT_KEYS.map((k) => (
          <li key={k}>
            <span>{STAT_NAME[k]}</span>
            <div className="bar" aria-hidden="true"><i style={{ width: `${Math.min(100, p.stats[k])}%` }} /></div>
            <b className="num">{p.stats[k]}</b>
          </li>
        ))}
      </ul>

      <div className="cd-sell">
        <div className="eyebrow">Snel verkopen</div>
        {sold !== null ? (
          <p className="form-ok">Verkocht voor {sold.toLocaleString('nl-NL')} coins.</p>
        ) : inLineup ? (
          <p className="hint">Deze kaart staat in je elftal. Haal hem eerst uit je opstelling om hem te verkopen.</p>
        ) : confirm ? (
          <span className="confirm-inline" role="group" aria-label="Verkoop bevestigen">
            <span className="dim small">{count > 1 ? 'Eén exemplaar' : 'Deze kaart'} verdwijnt uit je collectie.</span>
            <button className="btn small" onClick={() => { setSold(onSell()); setConfirm(false); }}>Verkopen</button>
            <button className="link-btn" onClick={() => setConfirm(false)}>Annuleren</button>
          </span>
        ) : (
          <button className="btn ghost small" onClick={() => setConfirm(true)}>
            Verkoop voor <span className="cost num"><IconCoin />{value.toLocaleString('nl-NL')}</span>
          </button>
        )}
        <p className="hint">Coins zijn alleen spelvaluta; ze zijn niet te kopen of in te wisselen.</p>
      </div>

      {p.photo && (
        <p className="cd-credit">
          {p.photo.aiGenerated ? 'AI-gegenereerd portret van een fictieve speler' : p.photo.credit} · {p.photo.license}
        </p>
      )}
    </Sheet>
  );
}
