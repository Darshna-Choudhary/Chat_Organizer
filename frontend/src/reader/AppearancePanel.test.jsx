// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import AppearancePanel from './AppearancePanel.jsx';
import { DEFAULT_APPEARANCE, THEMES } from './themes.js';

afterEach(cleanup);

const setup = (appearance = DEFAULT_APPEARANCE) => {
  const fns = { onChange: vi.fn(), onReset: vi.fn(), onClose: vi.fn() };
  render(<AppearancePanel appearance={appearance} {...fns} />);
  return fns;
};

describe('AppearancePanel', () => {
  it('shows every theme and marks the current one', () => {
    setup();
    for (const t of THEMES) expect(screen.getByRole('button', { name: t.name })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'WhatsApp Light' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Love Letters' }).getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByText('Romantic')).toBeTruthy();
    expect(screen.getByText('Familiar')).toBeTruthy();
  });

  it('changes theme, wallpaper, font, size and spacing', () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'WhatsApp Dark' }));
    expect(onChange).toHaveBeenLastCalledWith({ theme: 'whatsapp-dark' });
    fireEvent.click(screen.getByRole('button', { name: 'Starry Night wallpaper' }));
    expect(onChange).toHaveBeenLastCalledWith({ wallpaper: { kind: 'preset', id: 'starry' } });
    fireEvent.click(screen.getByRole('button', { name: 'Plain wallpaper' }));
    expect(onChange).toHaveBeenLastCalledWith({ wallpaper: { kind: 'none' } });
    fireEvent.click(screen.getByRole('button', { name: 'Theme wallpaper' }));
    expect(onChange).toHaveBeenLastCalledWith({ wallpaper: { kind: 'theme' } });
    fireEvent.change(screen.getByDisplayValue('Theme default'), { target: { value: 'serif' } });
    expect(onChange).toHaveBeenLastCalledWith({ font: 'serif' });
    fireEvent.click(screen.getByRole('button', { name: 'Through the Day' }));
    expect(onChange).toHaveBeenLastCalledWith({ theme: 'daylight' });
    fireEvent.change(screen.getByLabelText('Text size'), { target: { value: '19' } });
    expect(onChange).toHaveBeenLastCalledWith({ fontSize: 19 });
    fireEvent.click(screen.getByRole('button', { name: 'Compact' }));
    expect(onChange).toHaveBeenLastCalledWith({ density: 'compact' });
  });

  it('sets custom bubble colors and can clear them', () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText('My bubble color'), { target: { value: '#ff00aa' } });
    expect(onChange).toHaveBeenLastCalledWith({ bubbleMe: '#ff00aa' });
    fireEvent.click(screen.getByRole('button', { name: 'Use theme colors' }));
    expect(onChange).toHaveBeenLastCalledWith({ bubbleMe: null, bubbleThem: null });
  });

  it('resets and closes', () => {
    const { onReset, onClose } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Reset appearance' }));
    expect(onReset).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Close appearance' }));
    expect(onClose).toHaveBeenCalled();
  });
});
