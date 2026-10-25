/**
 * Portretregister: koppelt een speler (baseId) aan een fotoportret.
 * Vervangen door gelicentieerde foto's = alleen dit register (of de serverbron) aanpassen;
 * kaarten, packs en draft lezen uitsluitend `player.photo`.
 *
 * Huidige beelden: fictieve personen, lokaal gegenereerd met FLUX.2 [klein] 4B (Apache-2.0),
 * achtergrond verwijderd met BiRefNet-portrait (MIT). Promptlog: docs/portretten/PROMPTS.md.
 */
import type { PortraitAsset } from '@rank11/engine';
import s01 from './S01.webp';
import l01 from './L01.webp';

const AI = {
  kind: 'ai-fictional' as const,
  license: 'Eigen AI-generatie, model FLUX.2 [klein] 4B (Apache-2.0); fictieve persoon',
  credit: 'AI-gegenereerd portret van een fictieve speler',
  aiGenerated: true,
};

export const PORTRAITS: Record<string, PortraitAsset> = {
  S01: { ...AI, src: s01, headTop: 0.0 },
  L01: { ...AI, src: l01, headTop: 0.0 },
};
