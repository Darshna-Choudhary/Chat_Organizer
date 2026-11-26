// Encryption helpers shared by the packer (Node) and the app (browser). Uses only the Web Crypto API.
//
// Scheme: the passphrase is stretched with PBKDF2-SHA256 (salted, many iterations) into an AES-256-GCM key.
// Every stored piece (chat, each chunk of each media file, the index) is encrypted with a fresh random IV, and its
// position is bound in as "additional data", so pieces can't be swapped, reordered or silently altered.
const enc = new TextEncoder();

export const IV_BYTES = 12;
export const TAG_BYTES = 16;
export const MIN_ITERATIONS = 1000; // sanity range for what the app will accept from a vault file
export const MAX_ITERATIONS = 10_000_000;

export class VaultError extends Error {
  constructor(code, message) {
    super(message || code);
    this.code = code; // 'wrong-passphrase' | 'corrupt' | 'network' | 'invalid'
  }
}

// Forgiving on purpose: phone keyboards capitalise the first letter and add spaces.
export function normalizePassphrase(p) {
  return String(p ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function toB64(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

export function fromB64(str) {
  const s = atob(str);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export const randomBytes = (n) => crypto.getRandomValues(new Uint8Array(n));
export const randomHex = (n) => Array.from(randomBytes(n), (b) => b.toString(16).padStart(2, '0')).join('');

export async function deriveKey(passphrase, salt, iterations) {
  if (!Number.isInteger(iterations) || iterations < MIN_ITERATIONS || iterations > MAX_ITERATIONS) throw new VaultError('invalid', 'Unsupported key settings.');
  const base = await crypto.subtle.importKey('raw', enc.encode(normalizePassphrase(passphrase)), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export const chunkAad = (fileId, i, n) => `${fileId}:${i}/${n}`;

export async function encryptChunk(key, plain, aad) {
  const iv = randomBytes(IV_BYTES);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(aad) }, key, plain));
  const out = new Uint8Array(IV_BYTES + ct.length);
  out.set(iv, 0);
  out.set(ct, IV_BYTES);
  return out;
}

export async function decryptChunk(key, data, aad) {
  if (!data || data.length < IV_BYTES + TAG_BYTES) throw new VaultError('corrupt', 'A file is damaged.');
  try {
    return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: data.subarray(0, IV_BYTES), additionalData: enc.encode(aad) }, key, data.subarray(IV_BYTES)));
  } catch {
    throw new VaultError('corrupt', 'A file is damaged or does not belong here.');
  }
}

async function pipe(bytes, stream) {
  const writer = stream.writable.getWriter();
  writer.write(bytes).then(() => writer.close()).catch(() => {}); // a failure shows up when reading
  return new Uint8Array(await new Response(stream.readable).arrayBuffer());
}
export const gzip = (bytes) => pipe(bytes, new CompressionStream('gzip'));
export const gunzip = (bytes) => pipe(bytes, new DecompressionStream('gzip'));

export function concatBytes(parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}
