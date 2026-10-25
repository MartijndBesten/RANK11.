import { useState } from 'react';
import type { Nav } from '../../App';
import { subjectById, useStore } from '../../state/store';
import { fmt, shortDate } from '../../state/gradeData';
import { GradeForm } from './GradeForm';
import { IconCheck, IconVault } from '../../components/Icons';

/** Zelf een cijfer invoeren: direct verwerkt (geen goedkeuring), beloning wacht daarna in de kluis. */
export function GradeEntry({ nav }: { nav: Nav }) {
  const { addGrade, grades, pending, history } = useStore();
  const [done, setDone] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const recent = [...grades]
    .map((g) => ({ g, at: history.get(g.id)?.[0]?.at ?? '' }))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 5);
  const added = done ? grades.find((g) => g.id === done) : null;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Cijfers</div>
          <h1 className="display">Cijfer invoeren</h1>
          <p className="dim small">Neem het cijfer over uit je schoolsysteem. Het telt direct mee; de beloning open je in de kluis.</p>
        </div>
      </div>
      <div className="page-cols">
        <section className="panel gold">
          {added ? (
            <div className="entry-done">
              <div className="entry-done-icon"><IconCheck /></div>
              <h2 className="display">Opgeslagen</h2>
              <p>{subjectById(added.subjectId).name} · {added.testName} · <b className="num">{fmt(added.value)}</b></p>
              <div className="confirm-inline" style={{ justifyContent: 'center' }}>
                <button className="btn" onClick={() => nav.go('cijfers-kluis')}><IconVault width={20} height={20} /> Open de kluis</button>
                <button className="btn ghost small" onClick={() => { setDone(null); setFormKey((k) => k + 1); }}>Nog een invoeren</button>
              </div>
            </div>
          ) : (
            <GradeForm key={formKey} submitLabel="Opslaan" onSubmit={(input) => {
              const res = addGrade(input);
              if (res.ok && res.id) setDone(res.id);
              return res;
            }} />
          )}
        </section>
        <div className="stack">
          <section className="panel">
            <div className="panel-head"><h2>Eerlijk spel</h2><span className="tag self">zelf ingevoerd</span></div>
            <ul className="insights">
              <li>Er is geen controle door school of ouders. Je cijfers zijn alleen voor jou zichtbaar.</li>
              <li>Dezelfde toets twee keer invoeren kan niet; een fout pas je aan bij Vakken. Iedere wijziging blijft in de geschiedenis staan.</li>
              <li>Een verwijderd cijfer verliest zijn XP. Packs die je al opende, blijven van jou.</li>
              <li>In de Grade League telt je gemiddelde en je vooruitgang, niet hoeveel toetsen je invoert.</li>
            </ul>
          </section>
          <section className="panel flush">
            <div className="panel-head"><h2>Laatst ingevoerd</h2></div>
            <ul className="rows">
              {recent.map(({ g }) => (
                <li key={g.id} className="row">
                  <span className="subj-dot" style={{ background: subjectById(g.subjectId).color }}>{subjectById(g.subjectId).short}</span>
                  <div className="row-main">
                    <span className="row-title">{g.testName}</span>
                    <span className="row-sub">{shortDate(g.date)} · weging {String(g.weight).replace('.', ',')}</span>
                    {pending.some((p) => p.grade.id === g.id) && <span className="tag wait">beloning wacht</span>}
                  </div>
                  <span className="row-grade num">{fmt(g.value)}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
