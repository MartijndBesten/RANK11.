/**
 * Eén toegangspunt naar de gedeelde spelregels. De competitiemodule staat (nog) niet in de
 * barrel van @rank11/engine; zodra `export * from './competition/index.ts'` daar is toegevoegd,
 * kan de tweede regel vervallen.
 */
export * from '@rank11/engine';
export * from '@rank11/engine/src/competition/index.ts';
