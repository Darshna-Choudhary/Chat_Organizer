// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import UnlockScreen from './UnlockScreen.jsx';

afterEach(cleanup);
const meta = { lockTitle: 'For you', hint: 'where we first met' };

describe('UnlockScreen', () => {
  it('shows the title and the hint', () => {
    render(<UnlockScreen meta={meta} onUnlock={() => {}} />);
    expect(screen.getByRole('heading', { name: 'For you' })).toBeTruthy();
    expect(screen.getByText(/where we first met/)).toBeTruthy();
  });

  it('hides the phrase while typing, and can show it', () => {
    render(<UnlockScreen meta={meta} onUnlock={() => {}} />);
    const input = screen.getByLabelText('Secret phrase');
    expect(input.getAttribute('type')).toBe('password');
    expect(input.getAttribute('autocapitalize')).toBe('off'); // phone keyboards must not capitalise it
    fireEvent.click(screen.getByRole('button', { name: 'Show phrase' }));
    expect(input.getAttribute('type')).toBe('text');
  });

  it('sends the phrase and the keep-unlocked choice, and ignores an empty phrase', () => {
    const onUnlock = vi.fn();
    render(<UnlockScreen meta={meta} onUnlock={onUnlock} />);
    expect(screen.getByRole('button', { name: 'Unlock' }).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Secret phrase'), { target: { value: 'blue door at the harbour' } });
    fireEvent.click(screen.getByLabelText(/Keep this device unlocked/));
    fireEvent.submit(screen.getByRole('form', { name: 'Unlock' }));
    expect(onUnlock).toHaveBeenCalledWith('blue door at the harbour', false);
  });

  it('shows a wrong-phrase message and locks the form while working', () => {
    const { rerender } = render(<UnlockScreen meta={meta} onUnlock={() => {}} error="That isn't it." />);
    expect(screen.getByRole('alert').textContent).toBe("That isn't it.");
    rerender(<UnlockScreen meta={meta} onUnlock={() => {}} busy />);
    expect(screen.getByLabelText('Secret phrase').disabled).toBe(true);
    expect(screen.getByRole('button', { name: 'Opening...' })).toBeTruthy();
  });

  it('works without a hint or a custom title', () => {
    render(<UnlockScreen meta={{}} onUnlock={() => {}} />);
    expect(screen.getByRole('heading', { name: 'Welcome' })).toBeTruthy();
    expect(screen.queryByText(/little hint/)).toBeNull();
  });
});
