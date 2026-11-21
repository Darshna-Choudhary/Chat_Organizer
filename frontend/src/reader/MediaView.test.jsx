// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeAll, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import MediaView from './MediaView.jsx';
import { MediaContext } from './MediaContext.js';

beforeAll(() => {
  URL.createObjectURL = vi.fn(() => 'blob:fake');
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function fakeStore(entries) {
  return {
    get: (n) => entries[n] || null,
    has: (n) => !!entries[n],
    getBlob: vi.fn(async () => new Blob(['x'])),
  };
}
const show = (name, store, openImage = vi.fn()) => {
  render(<MediaContext.Provider value={{ store, openImage }}><MediaView name={name} /></MediaContext.Provider>);
  return openImage;
};
const MB = 1024 * 1024;

describe('MediaView', () => {
  it('shows just the file name when no media is attached', () => {
    show('IMG-1.jpg', null);
    expect(screen.getByText(/IMG-1\.jpg/)).toBeTruthy();
  });

  it('says so when the file is not in the media source', () => {
    show('IMG-1.jpg', fakeStore({}));
    expect(screen.getByText(/not in your media files/)).toBeTruthy();
  });

  it('shows an on-disk photo right away and opens the viewer on click', async () => {
    const open = show('IMG-1.jpg', fakeStore({ 'IMG-1.jpg': { name: 'IMG-1.jpg', size: 5 * MB, cheap: true } }));
    const img = await screen.findByRole('img');
    expect(img.getAttribute('src')).toBe('blob:fake');
    fireEvent.click(img);
    expect(open).toHaveBeenCalledWith('IMG-1.jpg');
  });

  it('waits for a tap before unpacking a big photo from a zip', async () => {
    const store = fakeStore({ 'IMG-1.jpg': { name: 'IMG-1.jpg', size: 20 * MB, cheap: false } });
    show('IMG-1.jpg', store);
    fireEvent.click(screen.getByRole('button', { name: /tap to load/ }));
    expect(await screen.findByRole('img')).toBeTruthy();
    expect(store.getBlob).toHaveBeenCalledTimes(1);
  });

  it('loads a small photo from a zip automatically', async () => {
    const store = fakeStore({ 'IMG-1.jpg': { name: 'IMG-1.jpg', size: 2 * MB, cheap: false } });
    show('IMG-1.jpg', store);
    expect(await screen.findByRole('img')).toBeTruthy();
  });

  it('keeps videos behind a tap when they come from a zip', async () => {
    const store = fakeStore({ 'VID-1.mp4': { name: 'VID-1.mp4', size: 2 * MB, cheap: false } });
    const { container } = render(<MediaContext.Provider value={{ store, openImage: vi.fn() }}><MediaView name="VID-1.mp4" /></MediaContext.Provider>);
    expect(store.getBlob).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Video/ }));
    await screen.findByText((_, el) => el?.tagName === 'VIDEO');
    expect(container.querySelector('video').getAttribute('src')).toBe('blob:fake');
  });

  it('plays voice notes with an audio element', async () => {
    const { container } = render(<MediaContext.Provider value={{ store: fakeStore({ 'PTT-1.opus': { name: 'PTT-1.opus', size: 30000, cheap: false } }), openImage: vi.fn() }}><MediaView name="PTT-1.opus" /></MediaContext.Provider>);
    expect(screen.getByText(/Voice message/)).toBeTruthy();
    await screen.findByText((_, el) => el?.tagName === 'AUDIO');
    expect(container.querySelector('audio')).toBeTruthy();
  });

  it('offers documents as a save chip', () => {
    show('Report.pdf', fakeStore({ 'Report.pdf': { name: 'Report.pdf', size: 2048, cheap: false } }));
    expect(screen.getByRole('button', { name: /Report\.pdf/ })).toBeTruthy();
  });

  it('falls back to a save chip when the browser cannot show the photo', async () => {
    show('IMG-1.heic', fakeStore({ 'IMG-1.heic': { name: 'IMG-1.heic', size: 1000, cheap: true } }));
    fireEvent.error(await screen.findByRole('img'));
    expect(screen.getByRole('button', { name: /can't preview/ })).toBeTruthy();
  });

  it('releases the object URL when the row leaves the screen', async () => {
    show('IMG-1.jpg', fakeStore({ 'IMG-1.jpg': { name: 'IMG-1.jpg', size: 1000, cheap: true } }));
    await screen.findByRole('img');
    cleanup();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake');
  });
});
