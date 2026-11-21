// @vitest-environment jsdom
/* global process */
import { describe, it, expect, afterEach, beforeAll, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseChat } from '../parser/parseChat.js';
import Reader from './Reader.jsx';
import { DEFAULT_APPEARANCE } from './themes.js';

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
    fireEvent.click(screen.getByRole('button', { name: 'Midnight' }));
    expect(onAppearance).toHaveBeenCalledWith({ theme: 'midnight' });
  });
});
