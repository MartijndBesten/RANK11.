/**
 * Portretregister: koppelt een speler (baseId) aan een fotoportret.
 * Vervangen door gelicentieerde foto's = alleen dit register (of de serverbron) aanpassen;
 * kaarten, packs en draft lezen uitsluitend `player.photo`.
 *
 * Beelden staan in public/portraits/<baseId>.webp; manifest.json wordt gegenereerd door
 * tools/portretten/manifest.mjs. Huidige beelden: fictieve personen, lokaal gegenereerd met
 * FLUX.2 [klein] 4B (Apache-2.0), achtergrond verwijderd (BiRefNet-portrait / IS-Net).
 * Promptlog: docs/portretten/PROMPTS.md en tools/portretten/catalogus-jobs.json.
 */
import type { PortraitAsset } from '@rank11/engine';
import manifest from './manifest.json';

const AI = {
  kind: 'ai-fictional' as const,
  license: 'Eigen AI-generatie, model FLUX.2 [klein] 4B (Apache-2.0); fictieve persoon',
  credit: 'AI-gegenereerd portret van een fictieve speler',
  aiGenerated: true,
};

export const PORTRAIT_IDS: readonly string[] = manifest;

export const PORTRAITS: Record<string, PortraitAsset> = Object.fromEntries(
  PORTRAIT_IDS.map((id) => [id, { ...AI, src: `${import.meta.env.BASE_URL}portraits/${id}.webp`, headTop: 0 }]),
);

/**
 * Alleen spelers met een portret tonen zodra (bijna) de hele catalogus klaar is: zo staan er nooit
 * getekende en fotorealistische gezichten door elkaar. Daaronder blijft de volledige catalogus actief.
 */
export const PHOTOS_ONLY = PORTRAIT_IDS.length >= 150;
