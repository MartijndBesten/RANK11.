/**
 * Runtime-schakelaars uit /api/config. Spelersfoto's staan standaard UIT: een vrije auteursrechtlicentie
 * (Wikimedia Commons) regelt niet het portretrecht van de speler. Alleen de beheerder zet ze aan
 * (`PLAYER_PHOTOS=true` op de server) na een bewuste afweging; zie docs/BEELDRECHTEN.md.
 */
let photos = false;
export const setPlayerPhotos = (on: boolean) => { photos = on; };
export const playerPhotosEnabled = () => photos;
/** Eigen proxy-route (geen hotlink naar Wikimedia: geen IP-adressen van kinderen naar derden). */
export const portraitUrl = (qid: string) => `/api/portrait/${encodeURIComponent(qid)}`;
