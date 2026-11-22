// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { WelcomeEditor, WelcomeScreen } from './WelcomeScreen.jsx';
import { DEFAULT_WELCOME } from './config.js';

afterEach(cleanup);
const welcome = { ...DEFAULT_WELCOME, enabled: true, title: 'Happy anniversary', message: 'Line one\nLine two <b>not bold</b>' };

describe('WelcomeScreen', () => {
  it('shows the title, summary and message, and starts reading on click', () => {
    const onStart = vi.fn();
    render(<WelcomeScreen welcome={welcome} summary="18 Nov 2024 to 19 Feb 2025" onStart={onStart} />);
    expect(screen.getByRole('heading', { name: 'Happy anniversary' })).toBeTruthy();
    expect(screen.getByText('18 Nov 2024 to 19 Feb 2025')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Start reading' }));
    expect(onStart).toHaveBeenCalled();
  });

  it('shows the message as plain text, never as HTML', () => {
    const { container } = render(<WelcomeScreen welcome={welcome} summary="" onStart={() => {}} />);
    expect(container.querySelector('b')).toBeNull();
    expect(container.textContent).toContain('<b>not bold</b>');
  });

  it('can hide the summary and use a custom button label', () => {
    render(<WelcomeScreen welcome={{ ...welcome, showSummary: false, button: 'Open our story' }} summary="hidden" onStart={() => {}} />);
    expect(screen.queryByText('hidden')).toBeNull();
    expect(screen.getByRole('button', { name: 'Open our story' })).toBeTruthy();
  });
});

describe('WelcomeEditor', () => {
  it('passes each edit up and offers a preview', () => {
    const onChange = vi.fn();
    const onPreview = vi.fn();
    render(<WelcomeEditor welcome={welcome} onChange={onChange} onPreview={onPreview} onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Us' } });
    expect(onChange).toHaveBeenLastCalledWith({ title: 'Us' });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'hello' } });
    expect(onChange).toHaveBeenLastCalledWith({ message: 'hello' });
    fireEvent.click(screen.getByLabelText(/Show it every time/));
    expect(onChange).toHaveBeenLastCalledWith({ enabled: false });
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    expect(onPreview).toHaveBeenCalled();
  });
});
