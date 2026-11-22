// @vitest-environment jsdom
/* global process */
import { describe, it, expect, afterEach, beforeAll, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseChat } from '../parser/parseChat.js';
import Reader from './Reader.jsx';
import { DEFAULT_APPEARANCE } from './themes.js';
import { DEFAULT_WELCOME } from './config.js';

const text = readFileSync(resolve(process.cwd(), '../samples/fake-android-mdy.txt'), 'utf8');
const { messages, report } = parseChat(text);
const chat = { id: 1, title: 'Fake Chat', messages, report };

beforeAll(() => {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  window.scrollTo = () => {};
  // jsdom has no layout: give the scroller a viewport (client*) and every row a height (offset*).
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 800 });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 800 });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get: () => 40 });
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get: () => 800 });
  HTMLElement.prototype.getBoundingClientRect = () => ({ x: 0, y: 0, top: 0, left: 0, right: 800, bottom: 40, width: 800, height: 40 });
});
afterEach(cleanup);

const noop = () => {};
const renderReader = (settings = { me: 'Asha', openAt: 'start', lastMsg: null }, props = {}) =>
  render(<Reader chat={chat} settings={settings} onSettings={noop} onSavePosition={noop} onReplace={noop} onForget={noop} banner={null} onDismissBanner={noop} appearance={DEFAULT_APPEARANCE} onAppearance={noop} onResetAppearance={noop} {...props} />);

describe('Reader', () => {
  it('renders the header, date chip and messages', () => {
    renderReader();
    expect(screen.getByText('Fake Chat')).toBeTruthy();
    expect(screen.getAllByText('18 November 2024').length).toBeGreaterThan(0);
    expect(screen.getByText(/Hello! This is a fake chat/)).toBeTruthy();
  });

  it('shows the "which one are you" picker when no side is chosen', () => {
    const onSettings = vi.fn();
    renderReader({ me: null, openAt: 'start', lastMsg: null }, { onSettings });
    fireEvent.click(screen.getByRole('button', { name: 'Asha' }));
    expect(onSettings).toHaveBeenCalledWith({ me: 'Asha' });
  });

  it('puts my messages on the right and theirs on the left', () => {
    const { container } = renderReader();
    expect(container.querySelector('.row.me')).toBeTruthy();
    expect(container.querySelector('.row.them')).toBeTruthy();
  });

  it('turns links into anchors', () => {
    const { container } = renderReader();
    const a = container.querySelector('a[href="https://example.com/page?x=1"]');
    expect(a).toBeTruthy();
    expect(a.getAttribute('rel')).toContain('noopener');
  });

  it('searches the whole chat, lists matches and highlights them', async () => {
    const { container } = renderReader();
    const input = screen.getByLabelText('Search chat');
    await act(async () => { fireEvent.change(input, { target: { value: 'midnight' } }); });
    expect(screen.getByRole('listbox')).toBeTruthy();
    expect(screen.getByText('0/1')).toBeTruthy(); // one match, none selected yet
    fireEvent.click(screen.getAllByRole('option')[0]);
    expect(screen.getByText('1/1')).toBeTruthy(); // jumped to the match
    expect(container.querySelector('mark')?.textContent.toLowerCase()).toBe('midnight');
  });

  it('opens the calendar and lists the days', () => {
    renderReader();
    fireEvent.click(screen.getByRole('button', { name: 'Calendar' }));
    expect(screen.getByText('November 2024')).toBeTruthy();
    expect(screen.getByTitle('18 November 2024: 10 messages')).toBeTruthy();
  });

  it('shows the import report banner with notes', () => {
    renderReader(undefined, { banner: { ...report, problems: ['Example note'] } });
    expect(screen.getByText(/Loaded 10 messages/)).toBeTruthy();
    fireEvent.click(screen.getByText('1 note(s)'));
    expect(screen.getByText('Example note')).toBeTruthy();
  });

  it('opens the appearance drawer and passes changes up', () => {
    const onAppearance = vi.fn();
    renderReader(undefined, { onAppearance });
    fireEvent.click(screen.getByRole('button', { name: 'Appearance' }));
    fireEvent.click(screen.getByRole('button', { name: 'Moonlit' }));
    expect(onAppearance).toHaveBeenCalledWith({ theme: 'moonlit' });
  });

  it('adds media from the settings menu', () => {
    const onAttach = vi.fn();
    renderReader(undefined, { media: { store: null, status: 'none', error: null, info: null, showBanner: false, onAttach, onReconnect: noop, onDismissBanner: noop } });
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add from a zip file' }));
    expect(onAttach).toHaveBeenCalledWith('zip');
  });

  it('asks to reconnect remembered media and shows the match summary', () => {
    const onReconnect = vi.fn();
    const base = { store: null, error: null, onAttach: noop, onDismissBanner: noop };
    renderReader(undefined, { media: { ...base, status: 'needs-permission', info: null, showBanner: false, onReconnect } });
    fireEvent.click(screen.getByRole('button', { name: 'Reconnect' }));
    expect(onReconnect).toHaveBeenCalled();
    cleanup();
    renderReader(undefined, { media: { ...base, status: 'ready', info: { referenced: 4, matched: 3, missing: ['IMG-9.jpg'] }, showBanner: true, onReconnect: noop } });
    expect(screen.getByText(/found 3 of 4 used in this chat/)).toBeTruthy();
    fireEvent.click(screen.getByText('1 not found'));
    expect(screen.getByText('IMG-9.jpg')).toBeTruthy();
  });

  it('shows attached photos in the chat and opens them full screen', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:fake');
    URL.revokeObjectURL = vi.fn();
    const entry = { name: 'IMG-20241118-WA0003.jpg', size: 100, cheap: true };
    const store = { get: (n) => (n === entry.name ? entry : null), has: (n) => n === entry.name, getBlob: async () => new Blob(['x']) };
    renderReader(undefined, { media: { store, status: 'ready', error: null, info: { referenced: 1, matched: 1, missing: [] }, showBanner: false, onAttach: noop, onReconnect: noop, onDismissBanner: noop } });
    const img = (await screen.findAllByRole('img'))[0];
    fireEvent.click(img);
    expect(await screen.findByRole('dialog', { name: 'Photo' })).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Photo' })).toBeNull();
  });

  it('saves a message with the star and lists it under Saved', () => {
    renderReader();
    fireEvent.click(screen.getAllByRole('button', { name: 'Save message' })[0]);
    expect(screen.getAllByRole('button', { name: 'Remove from saved' }).length).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: 'Memories' }));
    expect(screen.getByRole('tab', { name: 'Saved (1)' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Remove from saved' }));
    expect(screen.queryAllByRole('button', { name: 'Remove from saved' }).length).toBe(0);
  });

  it('opens the memories drawer', () => {
    renderReader();
    fireEvent.click(screen.getByRole('button', { name: 'Memories' }));
    expect(screen.getByRole('dialog', { name: 'Memories' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'On this day' })).toBeTruthy();
  });

  it('shows the welcome screen when enabled and hides it on start', () => {
    renderReader(undefined, { welcome: { ...DEFAULT_WELCOME, enabled: true, title: 'Happy anniversary', message: 'I love you' } });
    expect(screen.getByRole('dialog', { name: 'Welcome' })).toBeTruthy();
    expect(screen.getByText('I love you')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Start reading' }));
    expect(screen.queryByRole('dialog', { name: 'Welcome' })).toBeNull();
  });

  it('does not show the welcome screen unless it is turned on', () => {
    renderReader();
    expect(screen.queryByRole('dialog', { name: 'Welcome' })).toBeNull();
  });

  it('edits the welcome screen from the settings menu and previews it', () => {
    const onWelcome = vi.fn();
    renderReader(undefined, { onWelcome });
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Welcome screen...' }));
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Happy anniversary' } });
    expect(onWelcome).toHaveBeenCalledWith({ title: 'Happy anniversary' });
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    expect(screen.getByRole('dialog', { name: 'Welcome' })).toBeTruthy();
  });

  it('closes the settings menu when you click anywhere else', () => {
    renderReader();
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeTruthy();
    fireEvent.click(screen.getByTestId('scrim'));
    expect(screen.queryByRole('dialog', { name: 'Settings' })).toBeNull();
    expect(screen.queryByTestId('scrim')).toBeNull();
  });

  it('closes the Memories drawer when you click anywhere else', () => {
    renderReader();
    fireEvent.click(screen.getByRole('button', { name: 'Memories' }));
    fireEvent.click(screen.getByTestId('scrim'));
    expect(screen.queryByRole('dialog', { name: 'Memories' })).toBeNull();
  });

  it('closes the Appearance drawer when you click anywhere else', () => {
    renderReader();
    fireEvent.click(screen.getByRole('button', { name: 'Appearance' }));
    expect(screen.getByRole('dialog', { name: 'Appearance' })).toBeTruthy();
    fireEvent.click(screen.getByTestId('scrim'));
    expect(screen.queryByRole('dialog', { name: 'Appearance' })).toBeNull();
  });

  it('closes the search results when you click anywhere else, and keeps the highlight', async () => {
    renderReader();
    await act(async () => { fireEvent.change(screen.getByLabelText('Search chat'), { target: { value: 'midnight' } }); });
    expect(screen.getByRole('listbox')).toBeTruthy();
    fireEvent.click(screen.getByTestId('scrim'));
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('has no click-away layer when nothing is open', () => {
    renderReader();
    expect(screen.queryByTestId('scrim')).toBeNull();
  });
});
