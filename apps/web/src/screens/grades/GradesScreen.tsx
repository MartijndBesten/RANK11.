import type { Nav } from '../../App';
import { GradesOverview } from './Overview';
import { SubjectsView } from './Subjects';
import { GradeEntry } from './Entry';
import { GoalsView } from './Goals';
import { WhatIfView } from './WhatIf';
import './grades.css';

/** Cijfers-tab: dashboard, vakken, invoeren, doelen/toetsen en wat-als. De kluis is een eigen route. */
export function GradesScreen({ nav, sub }: { nav: Nav; sub: string }) {
  if (sub === 'vakken') return <SubjectsView nav={nav} />;
  if (sub === 'invoeren') return <GradeEntry nav={nav} />;
  if (sub === 'doelen') return <GoalsView nav={nav} />;
  if (sub === 'watals') return <WhatIfView />;
  return <GradesOverview nav={nav} />;
}
