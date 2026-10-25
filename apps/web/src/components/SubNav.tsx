import { useEffect, useRef } from 'react';

/** Subnavigatie per hoofdtab: horizontale, scrollbare tabs; de actieve tab schuift altijd in beeld. */
export function SubNav({ items, active, onSelect, label, badges = {} }: {
  items: { id: string; label: string }[]; active: string; onSelect: (id: string) => void; label: string; badges?: Record<string, number>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [active]);
  return (
    <div className="subnav" role="navigation" aria-label={`${label}-menu`}>
      <div className="subnav-track" ref={ref}>
        {items.map((it) => (
          <button key={it.id} className="subnav-item" aria-current={active === it.id ? 'page' : undefined} onClick={() => onSelect(it.id)}>
            {it.label}
            {(badges[it.id] ?? 0) > 0 && <span className="subnav-badge num">{badges[it.id]}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
