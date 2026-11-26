// Turns a WhatsApp export (a .zip or a folder with the chat .txt and its media) into an encrypted vault:
//   vault.json   (public: key settings, an optional hint)
//   i.bin        (encrypted index: chat and media names, sizes, your chosen defaults)
//   d/<random>   (encrypted pieces of the chat and every media file, each at most `chunkSize` bytes)
// Nothing readable is left: not the chat, not the media, not even the file names.
import fs from 'node:fs/promises';
import { openAsBlob } from 'node:fs';
import path from 'node:path';
import { BlobReader, BlobWriter, ZipReader, configure } from '@zip.js/zip.js';
import { chunkAad, deriveKey, encryptChunk, gzip, randomBytes, randomHex, toB64 } from '../../src/vault/crypto.js';
import { readVaultMeta, readChat, unlockWithPassphrase, mediaEntries } from '../../src/vault/client.js';
import { parseChat } from '../../src/parser/parseChat.js';
import { FONTS, THEMES, WALLPAPERS } from '../../src/reader/themes.js';

configure({ useWebWorkers: false });

export const DEFAULT_ITERATIONS = 600_000;
export const DEFAULT_CHUNK = 8 * 1024 * 1024;
const OWN_FILES = new Set(['vault.json', 'i.bin', 'd']);

const baseName = (p) => String(p).split(/[\\/]/).pop();
const isJunk = (p) => /(^|[\\/])(__MACOSX|\.DS_Store|Thumbs\.db)([\\/]|$)/i.test(p) || baseName(p).startsWith('._');

function pickChat(cands) {
  const named = cands.filter((c) => /^(_chat|WhatsApp Chat.*)\.txt$/i.test(c.name));
  const pool = named.length ? named : cands;
  return pool.reduce((best, c) => (!best || c.size > best.size ? c : best), null);
}

function slices(bytes, size) {
  return (async function* () {
    for (let at = 0; at < bytes.length; at += size) yield bytes.subarray(at, at + size);
  })();
}

async function readSource(source) {
  const stat = await fs.stat(source);
  const files = []; // { name, size, pieces(chunkSize) -> async iterable, all() -> Uint8Array }
  if (stat.isDirectory()) {
    const walk = async (dir, depth) => {
      for (const e of await fs.readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (depth < 4 && !isJunk(full)) await walk(full, depth + 1);
        } else if (e.isFile() && !isJunk(full)) {
          const size = (await fs.stat(full)).size;
          files.push({
            name: e.name, size, depth,
            all: async () => new Uint8Array(await fs.readFile(full)),
            pieces: (n) => (async function* () {
              const fh = await fs.open(full, 'r');
              try {
                for (let at = 0; at < size; at += n) {
                  const len = Math.min(n, size - at);
                  const buf = new Uint8Array(len);
                  await fh.read(buf, 0, len, at);
                  yield buf;
                }
              } finally {
                await fh.close();
              }
            })(),
          });
        }
      }
    };
    await walk(source, 0);
  } else if (/\.zip$/i.test(source)) {
    const reader = new ZipReader(new BlobReader(await openAsBlob(source)));
    for (const e of await reader.getEntries()) {
      if (e.directory || isJunk(e.filename)) continue;
      const all = async () => new Uint8Array(await (await e.getData(new BlobWriter())).arrayBuffer());
      files.push({ name: baseName(e.filename), size: e.uncompressedSize, depth: e.filename.split('/').length - 1, all, pieces: (n) => (async function* () { yield* slices(await all(), n); })() });
    }
  } else if (/\.txt$/i.test(source)) {
    files.push({ name: baseName(source), size: stat.size, depth: 0, all: async () => new Uint8Array(await fs.readFile(source)), pieces: () => { throw new Error('unused'); } });
  } else {
    throw new Error('The source must be a .zip export, a folder, or a .txt file.');
  }
  const chat = pickChat(files.filter((f) => /\.txt$/i.test(f.name) && f.depth <= 1));
  return { chat, media: files.filter((f) => f !== chat && f.size > 0) };
}

const str = (v, n) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : undefined);
const bool = (v) => (typeof v === 'boolean' ? v : undefined);
const hex = (v) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : undefined);
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && !(typeof v === 'object' && v !== null && !Object.keys(v).length)));

// Only known, harmless settings survive; anything else in the config file is dropped.
export function sanitizeConfig(cfg = {}) {
  const themeIds = new Set(THEMES.map((t) => t.id));
  const a = cfg.appearance || {};
  const wp = a.wallpaper || {};
  const w = cfg.welcome || {};
  const appearance = clean({
    theme: themeIds.has(a.theme) ? a.theme : undefined,
    wallpaper: wp.kind === 'theme' || wp.kind === 'none' ? { kind: wp.kind } : wp.kind === 'preset' && WALLPAPERS.some((p) => p.id === wp.id) ? { kind: 'preset', id: wp.id } : undefined,
    font: a.font === 'theme' || (a.font && FONTS[a.font]) ? a.font : undefined,
    fontSize: Number.isFinite(a.fontSize) ? Math.min(22, Math.max(13, a.fontSize)) : undefined,
    density: a.density === 'cozy' || a.density === 'compact' ? a.density : undefined,
    bubbleMe: hex(a.bubbleMe),
    bubbleThem: hex(a.bubbleThem),
  });
  const welcome = clean({ enabled: bool(w.enabled), title: str(w.title, 80), message: str(w.message, 2000), button: str(w.button, 30), showSummary: bool(w.showSummary), showOnce: bool(w.showOnce) });
  return {
    lock: clean({ title: str(cfg.lockTitle, 120), hint: str(cfg.hint, 240), theme: themeIds.has(cfg.lockTheme) ? cfg.lockTheme : undefined }),
    defaults: clean({ me: str(cfg.me, 100), title: str(cfg.title, 100), openAt: typeof cfg.openAt === 'string' && /^(last|start|\d{4}-\d{2})$/.test(cfg.openAt) ? cfg.openAt : undefined, appearance, welcome }),
  };
}

async function prepareOut(out, force) {
  let entries = [];
  try {
    entries = await fs.readdir(out);
  } catch {
    /* does not exist yet */
  }
  const foreign = entries.filter((e) => !OWN_FILES.has(e));
  if (foreign.length) throw new Error(`The output folder already contains other files (${foreign.slice(0, 3).join(', ')}). Choose an empty folder.`);
  if (entries.length && !force) throw new Error('The output folder already holds a vault. Use --force to replace it.');
  for (const e of entries) await fs.rm(path.join(out, e), { recursive: true, force: true });
  await fs.mkdir(path.join(out, 'd'), { recursive: true });
}

export async function packVault({ source, out, passphrase, config = {}, iterations = DEFAULT_ITERATIONS, chunkSize = DEFAULT_CHUNK, force = false, log = () => {} }) {
  const src = await readSource(source);
  if (!src.chat) throw new Error('No chat .txt file found in the source.');
  const { lock, defaults } = sanitizeConfig(config);
  await prepareOut(out, force);

  const salt = randomBytes(16);
  const key = await deriveKey(passphrase, salt, iterations);
  const stats = { files: 0, bytes: 0 };

  async function put(plain, fid, i, n) {
    const name = randomHex(12);
    const sealed = await encryptChunk(key, plain, chunkAad(fid, i, n));
    await fs.writeFile(path.join(out, 'd', name), sealed);
    stats.files++;
    stats.bytes += sealed.length;
    return name;
  }

  // chat: parse once for the report, store compressed
  const chatBytes = await src.chat.all();
  const parsed = parseChat(new TextDecoder().decode(chatBytes));
  const report = parsed.report;
  const gz = await gzip(chatBytes);
  const chatFid = randomHex(8);
  const chatN = Math.max(1, Math.ceil(gz.length / chunkSize));
  const chatNames = [];
  for await (const piece of slices(gz, chunkSize)) chatNames.push(await put(piece, chatFid, chatNames.length, chatN));
  log(`Chat: ${report.messages.toLocaleString()} messages, dates read as ${report.dateOrder}`);

  // media
  const seen = new Set();
  const media = [];
  let duplicates = 0;
  for (const f of src.media) {
    if (seen.has(f.name.toLowerCase())) {
      duplicates++;
      continue;
    }
    seen.add(f.name.toLowerCase());
    const fid = randomHex(8);
    const n = Math.ceil(f.size / chunkSize);
    const names = [];
    for await (const piece of f.pieces(chunkSize)) names.push(await put(piece, fid, names.length, n));
    if (names.length !== n) throw new Error(`Size mismatch while reading ${f.name}.`);
    media.push({ n: f.name, s: f.size, f: fid, c: names });
    if (media.length % 50 === 0) log(`  ${media.length} of ${src.media.length} media files...`);
  }

  const index = { v: 1, created: new Date().toISOString(), chat: { name: src.chat.name, f: chatFid, c: chatNames, gz: true, size: chatBytes.length, dateOrder: report.dateOrder }, media, defaults };
  const sealedIndex = await encryptChunk(key, await gzip(new TextEncoder().encode(JSON.stringify(index))), 'index');
  await fs.writeFile(path.join(out, 'i.bin'), sealedIndex);
  const meta = { v: 1, kdf: 'PBKDF2-SHA256', iterations, salt: toB64(salt), index: 'i.bin', ...(lock.title && { lockTitle: lock.title }), ...(lock.hint && { hint: lock.hint }), ...(lock.theme && { lockTheme: lock.theme }) };
  await fs.writeFile(path.join(out, 'vault.json'), JSON.stringify(meta, null, 2));

  // how many media references in the chat have a file?
  const names = new Set(media.map((m) => m.n.toLowerCase()));
  const referenced = parsed.messages.filter((m) => m.type === 'media' && m.mediaFile);
  const missing = [...new Set(referenced.filter((m) => !names.has(m.mediaFile.toLowerCase())).map((m) => m.mediaFile))];

  return {
    files: stats.files + 2,
    bytes: stats.bytes + sealedIndex.length,
    media: media.length,
    duplicates,
    chat: { messages: report.messages, system: report.systemMessages, dateOrder: report.dateOrder, firstDate: report.firstDate, lastDate: report.lastDate, senders: Object.keys(report.senders) },
    referenced: referenced.length,
    matched: referenced.filter((m) => names.has(m.mediaFile.toLowerCase())).length,
    missing,
  };
}

// Opens the vault the way the app will, to prove the passphrase and files work.
export async function verifyVault(out, passphrase, { checkMedia = 3 } = {}) {
  const read = (url) => fs.readFile(path.join(out, url.replace(/^\/?vault\//, ''))).then((b) => new Uint8Array(b));
  const meta = await readVaultMeta({ base: '/', fetchFn: async () => ({ ok: true, json: async () => JSON.parse(await fs.readFile(path.join(out, 'vault.json'), 'utf8')) }) });
  if (!meta) throw new Error('vault.json is not valid.');
  const session = await unlockWithPassphrase(meta, passphrase, { base: '/', fetchBytes: read });
  const chat = await readChat(session);
  const entries = mediaEntries(session);
  let checked = 0;
  for (const e of entries.slice(0, checkMedia)) {
    const blob = await e.getBlob();
    if (blob.size !== e.size) throw new Error(`Media check failed for ${e.name}.`);
    checked++;
  }
  return { chatCharacters: chat.chatText.length, mediaChecked: checked, mediaTotal: entries.length };
}
