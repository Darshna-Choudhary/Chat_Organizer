/* global Buffer */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { BlobReader, BlobWriter, TextReader, ZipWriter } from '@zip.js/zip.js';
import { packVault, sanitizeConfig, verifyVault } from '../../scripts/vault/pack.mjs';
import { checkPassphrase } from '../../scripts/vault/passphrase.mjs';
import { VaultError } from './crypto.js';
import { mediaEntries, readChat, readVaultMeta, unlockWithPassphrase, vaultDefaults } from './client.js';
import { createMediaStore, matchMedia } from '../media/mediaStore.js';
import { parseChat } from '../parser/parseChat.js';

const PHRASE = 'blue door at the quiet harbour';
const NN = '\u202f';
const CHAT = [
  `11/18/24, 9:25${NN}PM - Messages and calls are end-to-end encrypted.`,
  `11/18/24, 9:26${NN}PM - Asha: Hello! The secret garden is open \u{1F338}`,
  `11/18/24, 9:27${NN}PM - Ravi: IMG-20241118-WA0001.jpg (file attached)`,
  'look at this',
  `11/18/24, 9:28${NN}PM - Ravi: PTT-20241118-WA0002.opus (file attached)`,
  `11/18/24, 9:29${NN}PM - Asha: VID-20241118-WA0003.mp4 (file attached)`,
  `11/18/24, 9:30${NN}PM - Asha: Trip plan.pdf (file attached)`,
  `11/18/24, 9:31${NN}PM - Asha: IMG-20241118-WA0099.jpg (file attached)`,
  '',
].join('\n');

const bytes = (n, seed) => Uint8Array.from({ length: n }, (_, i) => (i * 31 + seed) % 256);
const MEDIA = {
  'IMG-20241118-WA0001.jpg': bytes(25000, 1), // several 10 KB pieces
  'PTT-20241118-WA0002.opus': bytes(3000, 2), // one piece
  'VID-20241118-WA0003.mp4': bytes(10000, 3), // exactly one piece
  'Trip plan.pdf': bytes(10001, 4), // one byte over: two pieces
};
const CONFIG = {
  lockTitle: 'For you', hint: 'where we first met', lockTheme: 'moonlit', me: 'Ravi', title: 'Asha', openAt: 'start',
  appearance: { theme: 'moonlit', fontSize: 16, evil: 'x', wallpaper: { kind: 'preset', id: 'starry' } },
  welcome: { enabled: true, title: 'Our story', message: 'Hello, you.', showOnce: true, extra: 1 },
  somethingElse: 'dropped',
};

let tmp;
let folderSource;
let zipSource;
let out;

beforeAll(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'vault-test-'));
  folderSource = path.join(tmp, 'export');
  await fs.mkdir(path.join(folderSource, 'Media'), { recursive: true });
  await fs.mkdir(path.join(folderSource, '__MACOSX'));
  await fs.writeFile(path.join(folderSource, 'WhatsApp Chat with Asha.txt'), CHAT);
  await fs.writeFile(path.join(folderSource, '__MACOSX', '._junk'), 'junk');
  for (const [name, b] of Object.entries(MEDIA)) await fs.writeFile(path.join(folderSource, 'Media', name), b);

  const w = new ZipWriter(new BlobWriter('application/zip'), { level: 0 });
  await w.add('WhatsApp Chat with Asha.txt', new TextReader(CHAT));
  for (const [name, b] of Object.entries(MEDIA)) await w.add(name, new BlobReader(new Blob([b])));
  zipSource = path.join(tmp, 'export.zip');
  await fs.writeFile(zipSource, new Uint8Array(await (await w.close()).arrayBuffer()));

  out = path.join(tmp, 'out');
});
afterAll(async () => fs.rm(tmp, { recursive: true, force: true }));

const open = async (dir, phrase = PHRASE) => {
  const read = (url) => fs.readFile(path.join(dir, url.replace(/^\/?vault\//, ''))).then((b) => new Uint8Array(b));
  const meta = await readVaultMeta({ base: '/', fetchFn: async () => ({ ok: true, json: async () => JSON.parse(await fs.readFile(path.join(dir, 'vault.json'), 'utf8')) }) });
  return { meta, session: await unlockWithPassphrase(meta, phrase, { base: '/', fetchBytes: read }) };
};

describe('packing a folder', () => {
  let summary;
  beforeAll(async () => {
    summary = await packVault({ source: folderSource, out, passphrase: PHRASE, config: CONFIG, iterations: 1000, chunkSize: 10000 });
  });

  it('reports what it packed', () => {
    expect(summary.media).toBe(4);
    expect(summary.chat.messages).toBe(6);
    expect(summary.referenced).toBe(5);
    expect(summary.matched).toBe(4);
    expect(summary.missing).toEqual(['IMG-20241118-WA0099.jpg']);
    expect(summary.chat.senders.sort()).toEqual(['Asha', 'Ravi']);
  });

  it('writes only vault.json, i.bin and random-named pieces, each within the piece size', async () => {
    expect((await fs.readdir(out)).sort()).toEqual(['d', 'i.bin', 'vault.json']);
    const pieces = await fs.readdir(path.join(out, 'd'));
    expect(pieces.length).toBe(summary.files - 2);
    for (const p of pieces) {
      expect(p).toMatch(/^[0-9a-f]{24}$/);
      expect((await fs.stat(path.join(out, 'd', p))).size).toBeLessThanOrEqual(10000 + 28);
    }
  });

  it('leaves nothing readable behind: no chat text, no file names, no sender names', async () => {
    const files = [path.join(out, 'i.bin'), ...(await fs.readdir(path.join(out, 'd'))).map((f) => path.join(out, 'd', f))];
    for (const f of files) {
      const text = Buffer.from(await fs.readFile(f)).toString('latin1');
      for (const secret of ['Hello', 'secret garden', 'IMG-2024', 'PTT-', 'Trip plan', 'WhatsApp', 'Asha', 'Ravi', 'jpg', 'moonlit']) expect(text.includes(secret), `${secret} in ${path.basename(f)}`).toBe(false);
    }
  });

  it('keeps only the lock-screen words in the public file, nothing about the chat', async () => {
    const meta = JSON.parse(await fs.readFile(path.join(out, 'vault.json'), 'utf8'));
    expect(Object.keys(meta).sort()).toEqual(['hint', 'index', 'iterations', 'kdf', 'lockTheme', 'lockTitle', 'salt', 'v']);
    expect(meta.hint).toBe('where we first met');
    expect(JSON.stringify(meta)).not.toMatch(/Asha|Ravi|garden/);
  });

  it('opens with the right passphrase, in any capitalisation', async () => {
    const { session } = await open(out, '  BLUE Door at the QUIET harbour ');
    const chat = await readChat(session);
    expect(chat.chatText).toBe(CHAT);
    expect(chat.chatName).toBe('WhatsApp Chat with Asha.txt');
    expect(chat.dateOrder).toBe('MDY');
  });

  it('refuses the wrong passphrase', async () => {
    await expect(open(out, 'a completely different phrase here')).rejects.toMatchObject({ code: 'wrong-passphrase' });
  });

  it('gives back every media file byte for byte, joining the pieces', async () => {
    const { session } = await open(out);
    const entries = mediaEntries(session);
    expect(entries.map((e) => e.name).sort()).toEqual(Object.keys(MEDIA).sort());
    const store = createMediaStore(entries);
    for (const [name, b] of Object.entries(MEDIA)) {
      const blob = await store.getBlob(name);
      expect(Array.from(new Uint8Array(await blob.arrayBuffer()))).toEqual(Array.from(b));
    }
    expect((await store.getBlob('PTT-20241118-WA0002.opus')).type).toBe('audio/ogg');
    const { messages } = parseChat((await readChat(session)).chatText);
    expect(matchMedia(messages, store)).toMatchObject({ referenced: 5, matched: 4 });
  });

  it('carries the chosen defaults and drops anything unknown', async () => {
    const { session } = await open(out);
    expect(vaultDefaults(session)).toEqual({
      me: 'Ravi', title: 'Asha', openAt: 'start',
      appearance: { theme: 'moonlit', fontSize: 16, wallpaper: { kind: 'preset', id: 'starry' } },
      welcome: { enabled: true, title: 'Our story', message: 'Hello, you.', showOnce: true },
    });
  });

  it('notices a damaged piece', async () => {
    const copy = path.join(tmp, 'tampered');
    await fs.cp(out, copy, { recursive: true });
    const { session } = await open(copy);
    const target = session.index.media.find((m) => m.n === 'IMG-20241118-WA0001.jpg').c[1];
    const file = path.join(copy, 'd', target);
    const b = new Uint8Array(await fs.readFile(file));
    b[40] ^= 1;
    await fs.writeFile(file, b);
    await expect(createMediaStore(mediaEntries(session)).getBlob('IMG-20241118-WA0001.jpg')).rejects.toBeInstanceOf(VaultError);
  });

  it('notices two pieces swapped with each other', async () => {
    const copy = path.join(tmp, 'swapped');
    await fs.cp(out, copy, { recursive: true });
    const { session } = await open(copy);
    const [a, b] = session.index.media.find((m) => m.n === 'IMG-20241118-WA0001.jpg').c;
    const fa = path.join(copy, 'd', a);
    const fb = path.join(copy, 'd', b);
    const [da, db] = [await fs.readFile(fa), await fs.readFile(fb)];
    await fs.writeFile(fa, db);
    await fs.writeFile(fb, da);
    await expect(createMediaStore(mediaEntries(session)).getBlob('IMG-20241118-WA0001.jpg')).rejects.toBeInstanceOf(VaultError);
  });

  it('can verify itself the way the packer does', async () => {
    expect(await verifyVault(out, PHRASE)).toMatchObject({ mediaChecked: 3, mediaTotal: 4 });
    await expect(verifyVault(out, 'nope nope nope nope nope')).rejects.toBeTruthy();
  });

  it('will not overwrite an existing vault unless told to, nor write into a folder with other files', async () => {
    await expect(packVault({ source: folderSource, out, passphrase: PHRASE, iterations: 1000 })).rejects.toThrow('--force');
    const other = path.join(tmp, 'other');
    await fs.mkdir(other);
    await fs.writeFile(path.join(other, 'holiday.jpg'), 'x');
    await expect(packVault({ source: folderSource, out: other, passphrase: PHRASE, iterations: 1000, force: true })).rejects.toThrow('other files');
    expect(await fs.readFile(path.join(other, 'holiday.jpg'), 'utf8')).toBe('x');
    await packVault({ source: folderSource, out: path.join(tmp, 'again'), passphrase: PHRASE, iterations: 1000 });
    await packVault({ source: folderSource, out: path.join(tmp, 'again'), passphrase: PHRASE, iterations: 1000, force: true });
  });
});

describe('packing a zip', () => {
  it('produces an equivalent vault', async () => {
    const zout = path.join(tmp, 'zip-out');
    const s = await packVault({ source: zipSource, out: zout, passphrase: PHRASE, iterations: 1000, chunkSize: 10000 });
    expect(s.media).toBe(4);
    const { session } = await open(zout);
    expect((await readChat(session)).chatText).toBe(CHAT);
    const blob = await createMediaStore(mediaEntries(session)).getBlob('Trip plan.pdf');
    expect(Array.from(new Uint8Array(await blob.arrayBuffer()))).toEqual(Array.from(MEDIA['Trip plan.pdf']));
  });

  it('works for a chat with no media at all', async () => {
    const txt = path.join(tmp, 'solo.txt');
    await fs.writeFile(txt, CHAT);
    const s = await packVault({ source: txt, out: path.join(tmp, 'solo-out'), passphrase: PHRASE, iterations: 1000 });
    expect(s.media).toBe(0);
    expect(s.matched).toBe(0);
  });

  it('explains a source with no chat', async () => {
    const empty = path.join(tmp, 'empty');
    await fs.mkdir(empty);
    await fs.writeFile(path.join(empty, 'a.jpg'), 'x');
    await expect(packVault({ source: empty, out: path.join(tmp, 'e-out'), passphrase: PHRASE, iterations: 1000 })).rejects.toThrow('No chat');
  });
});

describe('config and passphrase rules', () => {
  it('rejects unsafe or unknown config values', () => {
    const c = sanitizeConfig({ lockTheme: 'not-a-theme', openAt: 'sometime', appearance: { theme: 'nope', fontSize: 99, bubbleMe: 'red;x', density: 'huge' }, welcome: { message: 5 }, hint: 'a'.repeat(500) });
    expect(c.lock).toEqual({ hint: 'a'.repeat(240) });
    expect(c.defaults).toEqual({ appearance: { fontSize: 22 } });
    expect(sanitizeConfig(undefined)).toEqual({ lock: {}, defaults: {} });
  });

  it('asks for long, unusual passphrases', () => {
    expect(checkPassphrase(PHRASE)).toEqual([]);
    expect(checkPassphrase('18/11/2024').length).toBeGreaterThan(0);
    expect(checkPassphrase('short one').join(' ')).toMatch(/at least 20/);
    expect(checkPassphrase('onelongwordwithnospacesatall').join(' ')).toMatch(/at least 4/);
    expect(checkPassphrase('').length).toBeGreaterThan(0);
  });
});
