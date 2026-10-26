/**
 * Versleutelen van tokens voor externe koppelingen (AES-GCM). De sleutel komt uit een omgeving-secret
 * (`INTEGRATION_KEY`), niet uit de code. Tokens worden nooit naar de frontend gestuurd of gelogd.
 */
const enc = new TextEncoder();
const dec = new TextDecoder();

const b64 = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes));
const unb64 = (s: string): Uint8Array => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

/** 32-byte sleutel uit het secret (SHA-256), zodat elk secretformaat werkt. */
async function aesKey(secret: string): Promise<CryptoKey> {
  if (!secret) throw new Error('INTEGRATION_KEY ontbreekt.');
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(secret));
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptToken(secret: string, plaintext: string): Promise<string> {
  const key = await aesKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext)));
  return `${b64(iv)}:${b64(ct)}`;
}

export async function decryptToken(secret: string, blob: string): Promise<string> {
  const [ivb, ctb] = blob.split(':');
  if (!ivb || !ctb) throw new Error('Ongeldig tokenformaat.');
  const key = await aesKey(secret);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(ivb) }, key, unb64(ctb));
  return dec.decode(pt);
}
