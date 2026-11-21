// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

const CHAT = '11/18/24, 9:25 PM - Asha: hello\n';
vi.mock('../media/pickers.js', () => ({
  pickChatFile: vi.fn(async () => ({ kind: 'file', file: new File([CHAT], 'WhatsApp Chat with Asha.txt', { type: 'text/plain' }) })),
  pickDirectory: vi.fn(async () => null),
  pickZip: vi.fn(async () => null),
}));

import StartScreen from './StartScreen.jsx';
afterEach(cleanup);

describe('StartScreen', () => {
  it('opens a chosen file and passes the chat text and date format on', async () => {
    const onOpen = vi.fn(async () => {});
    render(<StartScreen onOpen={onOpen} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'DMY' } });
    fireEvent.click(screen.getByRole('button', { name: /Choose a .txt or .zip/ }));
    await waitFor(() => expect(onOpen).toHaveBeenCalled());
    const [src, order] = onOpen.mock.calls[0];
    expect(src.chatText).toBe(CHAT);
    expect(src.chatName).toBe('WhatsApp Chat with Asha.txt');
    expect(order).toBe('DMY');
  });

  it('does nothing when the picker is cancelled', async () => {
    const onOpen = vi.fn();
    render(<StartScreen onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('button', { name: /Choose a folder/ }));
    await Promise.resolve();
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('rejects a dropped file of the wrong type with a clear message', () => {
    render(<StartScreen onOpen={vi.fn()} />);
    const zone = screen.getByRole('button', { name: /Choose a .txt or .zip/ });
    fireEvent.drop(zone, { dataTransfer: { files: [new File(['x'], 'photo.jpg')] } });
    expect(screen.getByRole('alert').textContent).toContain('.txt or .zip');
  });

  it('shows errors from reading the chat', () => {
    render(<StartScreen onOpen={vi.fn()} error="No messages found." />);
    expect(screen.getByRole('alert').textContent).toBe('No messages found.');
  });
});
