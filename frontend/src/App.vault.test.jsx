// @vitest-environment jsdom
/* global Buffer */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { webcrypto } from 'node:crypto';
import { packVault } from '../scripts/vault/pack.mjs';

vi.mock('./parser/parseInWorker.js', async () => {
  const { parseChat } = await import('./parser/parseChat.js');
  return { parseChatText: async (t, o) => parseChat(t, o), parseChatInWorker: async (t, o) => parseChat(t, o) };
});

import App from './App.jsx';

const PHRASE = 'blue door at the quiet harbour';
const NN = '\u202f';
const CHAT = [
  `11/18/24, 9:26${NN}PM - Asha: Hello! The secret garden is open`,
  `11/18/24, 9:27${NN}PM - Ravi: IMG-1.jpg (file attached)`,
  `11/18/24, 9:28${NN}PM - Ravi: see you soon, my love`,
  '',
].join('\n');

let tmp;
afterEach(cleanup);
afterAll(async () => fs.rm(tmp, { recursive: true, force: true }));

beforeAll(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'vault-app-'));
  const src = path.join(tmp, 'src');
  await fs.mkdir(src);
  await fs.writeFile(path.join(src, 'chat.txt'), CHAT);
  await fs.writeFile(path.join(src, 'IMG-1.jpg'), new Uint8Array([1, 2, 3]));
  await packVault({
    source: src, out: path.join(tmp, 'vault'), passphrase: PHRASE, iterations: 1000,
    config: { lockTitle: 'For you', hint: 'where we first met', lockTheme: 'moonlit', me: 'Ravi', title: 'Asha', openAt: 'start', welcome: { enabled: true, title: 'Our story', message: 'Hello, you.', showOnce: true } },
  });

  vi.stubGlobal('crypto', webcrypto);
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  window.scrollTo = () => {};
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 800 });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 800 });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get: () => 40 });
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get: () => 800 });
  HTMLElement.prototype.getBoundingClientRect = () => ({ x: 0, y: 0, top: 0, left: 0, right: 800, bottom: 40, width: 800, height: 40 });
  URL.createObjectURL = vi.fn(() => 'blob:fake');
  URL.revokeObjectURL = vi.fn();
  // serve the packed vault the way a static host would
  globalThis.fetch = async (url) => {
    try {
      const buf = await fs.readFile(path.join(tmp, 'vault', String(url).replace(/^\/?vault\//, '')));
      return { ok: true, status: 200, json: async () => JSON.parse(buf.toString('utf8')), arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) };
    } catch {
      return { ok: false, status: 404 };
    }
  };
});

describe('a published vault', () => {
  it('asks for the phrase, refuses a wrong one, and opens the chat, welcome message and photos with the right one', async () => {
    render(<App />);
    expect(await screen.findByRole('form', { name: 'Unlock' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'For you' })).toBeTruthy();
    expect(screen.getByText(/where we first met/)).toBeTruthy();
    expect(screen.queryByText(/secret garden/)).toBeNull(); // nothing readable before unlocking

    fireEvent.change(screen.getByLabelText('Secret phrase'), { target: { value: 'a completely wrong phrase here' } });
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/isn't it/);
    expect(screen.queryByText(/secret garden/)).toBeNull();

    fireEvent.change(screen.getByLabelText('Secret phrase'), { target: { value: '  Blue DOOR at the quiet harbour ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));

    // the welcome message chosen when the vault was packed
    expect(await screen.findByRole('dialog', { name: 'Welcome' }, { timeout: 5000 })).toBeTruthy();
    expect(screen.getByText('Hello, you.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Start reading' }));

    // the chat, from his side, with the photo decrypted
    expect((await screen.findAllByText(/secret garden/))[0]).toBeTruthy();
    expect(screen.getByText('Asha')).toBeTruthy(); // title chosen when packing
    expect(document.querySelector('.row.me')).toBeTruthy(); // "me" is Ravi
    expect((await screen.findAllByRole('img'))[0].getAttribute('src')).toBe('blob:fake');
  });

  it('has a Lock button and no importing or deleting', async () => {
    render(<App />);
    fireEvent.change(await screen.findByLabelText('Secret phrase'), { target: { value: PHRASE } });
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));
    await screen.findAllByText(/secret garden/, {}, { timeout: 5000 });
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByRole('button', { name: 'Lock this device' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Open another chat' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete saved chat' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add from a zip file' })).toBeNull();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Welcome screen...' })).toBeTruthy());
  });
});

describe('a site without a vault', () => {
  it('shows the normal "open a chat" screen', async () => {
    globalThis.fetch = async () => ({ ok: false, status: 404 });
    render(<App />);
    expect(await screen.findByText(/Choose a .txt or .zip/)).toBeTruthy();
    expect(Buffer.from('x').length).toBe(1);
  });
});
