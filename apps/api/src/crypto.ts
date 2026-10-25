/**
 * Crypto-primitieven op basis van Web Crypto (werkt in Workers én Node 22).
 * Patroon uit bouwsteen B23: alleen hashes van tokens opslaan, constant-time vergelijken.
 */

const encoder = new TextEncoder();

export function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

export function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(text: string): Uint8Array {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4);
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export function toHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Sessietoken: 32 bytes uit een cryptografische bron. */
export function randomToken(bytes = 32): string {
  return toBase64Url(randomBytes(bytes));
}

/** Seed voor packs, toss en startelftal (cryptografisch, wordt in de audit opgeslagen). */
export function randomSeed(): string {
  return toHex(randomBytes(16));
}

export function newId(prefix: string): string {
  return `${prefix}_${toHex(randomBytes(12))}`;
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(text));
  return toHex(new Uint8Array(digest));
}

/** Constant-time vergelijking van twee strings (lengte lekt wel, inhoud niet). */
export function safeEqual(a: string, b: string): boolean {
  const x = encoder.encode(a);
  const y = encoder.encode(b);
  let diff = x.length ^ y.length;
  const len = Math.max(x.length, y.length);
  for (let i = 0; i < len; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

/** Workers staan maximaal 100.000 PBKDF2-iteraties toe. */
export const MAX_PBKDF2_ITERATIONS = 100_000;
const MIN_PBKDF2_ITERATIONS = 1_000;

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

/** Wachtwoordhash in het formaat `pbkdf2-sha256$<iteraties>$<salt>$<hash>` (salt per gebruiker). */
export async function hashPassword(password: string, iterations: number = MAX_PBKDF2_ITERATIONS): Promise<string> {
  const iter = Math.min(MAX_PBKDF2_ITERATIONS, Math.max(MIN_PBKDF2_ITERATIONS, Math.floor(iterations)));
  const salt = randomBytes(16);
  const hash = await pbkdf2(password, salt, iter);
  return `pbkdf2-sha256$${iter}$${toBase64Url(salt)}$${toBase64Url(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iterText, saltText, hashText] = stored.split('$');
  const iterations = Number(iterText);
  if (scheme !== 'pbkdf2-sha256' || !saltText || !hashText || !Number.isInteger(iterations) || iterations > MAX_PBKDF2_ITERATIONS) return false;
  const hash = await pbkdf2(password, fromBase64Url(saltText), iterations);
  return safeEqual(toBase64Url(hash), hashText);
}

/** Uitnodigingscode: 10 tekens zonder verwarrende tekens (geen 0/O, 1/I/L), weergave XXXXX-XXXXX. */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function randomInviteCode(): string {
  let out = '';
  while (out.length < 10) {
    const [b] = randomBytes(1);
    // Afwijzen boven het grootste veelvoud, zodat iedere letter even waarschijnlijk is.
    if (b === undefined || b >= 256 - (256 % CODE_ALPHABET.length)) continue;
    out += CODE_ALPHABET[b % CODE_ALPHABET.length];
  }
  return `${out.slice(0, 5)}-${out.slice(5)}`;
}

export function normalizeInviteCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Hash van een uitnodigingscode; alleen deze hash wordt opgeslagen (bouwsteen B55). */
export function hashInviteCode(code: string): Promise<string> {
  return sha256Hex(`invite:${normalizeInviteCode(code)}`);
}
