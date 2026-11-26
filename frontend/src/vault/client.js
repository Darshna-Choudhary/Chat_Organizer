// Reads an encrypted vault that is published next to the app (vault/vault.json, vault/i.bin, vault/d/...).
// Everything is decrypted here, in the browser; the host only ever serves scrambled files.
import { VaultError, MAX_ITERATIONS, MIN_ITERATIONS, chunkAad, concatBytes, decryptChunk, deriveKey, fromB64, gunzip } from './crypto.js';

const NAME = /^[a-f0-9]{8,64}$/;
const INDEX_NAME = /^[a-z0-9._-]{1,40}$/i;
const clip = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');

export function validateMeta(m) {
  if (!m || m.v !== 1 || m.kdf !== 'PBKDF2-SHA256') return null;
  if (!Number.isInteger(m.iterations) || m.iterations < MIN_ITERATIONS || m.iterations > MAX_ITERATIONS) return null;
  if (typeof m.salt !== 'string' || typeof m.index !== 'string' || !INDEX_NAME.test(m.index)) return null;
  return { v: 1, kdf: m.kdf, iterations: m.iterations, salt: m.salt, index: m.index, lockTitle: clip(m.lockTitle, 120), hint: clip(m.hint, 240), lockTheme: clip(m.lockTheme, 40) };
}

// null when this site has no vault (normal use of the app).
export async function readVaultMeta({ base = '/', fetchFn = globalThis.fetch } = {}) {
  try {
    const res = await fetchFn(base + 'vault/vault.json', { cache: 'no-store' });
    if (!res.ok) return null;
    return validateMeta(await res.json());
  } catch {
    return null;
  }
}

export async function fetchBytes(url, { tries = 3, fetchFn = globalThis.fetch } = {}) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetchFn(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return new Uint8Array(await res.arrayBuffer());
    } catch (err) {
      last = err;
      await new Promise((r) => setTimeout(r, 300 * (i + 1)));
    }
  }
  throw new VaultError('network', 'Could not download a file. Check the connection and try again. ' + (last?.message || ''));
}

async function readIndex(meta, key, ctx) {
  const raw = await ctx.fetchBytes(ctx.base + 'vault/' + meta.index);
  let plain;
  try {
    plain = await decryptChunk(key, raw, 'index');
  } catch {
    throw new VaultError('wrong-passphrase', "That isn't it.");
  }
  const index = JSON.parse(new TextDecoder().decode(await gunzip(plain)));
  if (!index || index.v !== 1 || !index.chat || !Array.isArray(index.chat.c) || !Array.isArray(index.media)) throw new VaultError('corrupt', 'The vault index is not valid.');
  return index;
}

const ctxOf = (opts = {}) => ({ base: opts.base ?? '/', fetchBytes: opts.fetchBytes ?? ((u) => fetchBytes(u)) });

// With the passphrase (slow on purpose, ~a second).
export async function unlockWithPassphrase(meta, passphrase, opts) {
  const ctx = ctxOf(opts);
  const key = await deriveKey(passphrase, fromB64(meta.salt), meta.iterations);
  return { key, index: await readIndex(meta, key, ctx), ctx };
}

// With a key remembered on this device (instant). Throws wrong-passphrase if the vault was re-packed with a new phrase.
export async function unlockWithKey(meta, key, opts) {
  const ctx = ctxOf(opts);
  return { key, index: await readIndex(meta, key, ctx), ctx };
}

async function readFileChunks(key, ctx, fid, names, concurrency = 3) {
  const out = new Array(names.length);
  let next = 0;
  async function worker() {
    while (next < names.length) {
      const i = next++;
      if (!NAME.test(names[i])) throw new VaultError('corrupt', 'The vault index is not valid.');
      out[i] = await decryptChunk(key, await ctx.fetchBytes(ctx.base + 'vault/d/' + names[i]), chunkAad(fid, i, names.length));
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, names.length) }, worker));
  return out;
}

export async function readChat(session) {
  const { key, index, ctx } = session;
  const parts = await readFileChunks(key, ctx, index.chat.f, index.chat.c);
  const bytes = index.chat.gz ? await gunzip(concatBytes(parts)) : concatBytes(parts);
  return { chatText: new TextDecoder().decode(bytes), chatName: index.chat.name, dateOrder: index.chat.dateOrder || 'auto' };
}

// Same shape the app uses for media from a zip or folder, so photos, videos and voice notes work unchanged.
export function mediaEntries(session) {
  const { key, index, ctx } = session;
  return index.media.map((m) => ({
    name: m.n,
    size: m.s,
    cheap: false,
    getBlob: async () => new Blob(await readFileChunks(key, ctx, m.f, m.c)),
  }));
}

// Settings chosen when the vault was packed (who "I" am, title, welcome message, theme...). All optional.
export function vaultDefaults(session) {
  return session.index.defaults || {};
}
