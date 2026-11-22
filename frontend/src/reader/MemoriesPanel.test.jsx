// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import MemoriesPanel from './MemoriesPanel.jsx';
import { buildIndex } from './rows.js';

afterEach(cleanup);

const msg = (id, date, hour, sender, text, type = 'text') => ({ id, date, time: `${String(hour).padStart(2, '0')}:00`, ts: Date.parse(`${date}T${String(hour).padStart(2, '0')}:00:00Z`), sender, text, type, mediaFile: null });
const messages = [
  msg(0, '2024-11-21', 9, 'Asha', 'good morning \u2764\uFE0F'),
  msg(1, '2024-11-21', 9, 'Ravi', 'morning, did you sleep well?'),
  msg(2, '2024-12-21', 20, 'Ravi', 'monthly anniversary! \u{1F602}'),
  msg(3, '2025-11-20', 8, 'Asha', 'new year of us'),
].map((m, i) => ({ ...m, id: i }));
const index = buildIndex(messages);

const setup = (props = {}) => {
  const fns = { onToggleSaved: vi.fn(), onJumpMessage: vi.fn(), onJumpDay: vi.fn(), onClose: vi.fn() };
  render(<MemoriesPanel index={index} messages={messages} me="Asha" saved={[]} {...fns} {...props} />);
  return fns;
};

describe('On this day', () => {
  it('lists the same date in other years and the same day in other months, with previews', () => {
    const { onJumpDay } = setup();
    fireEvent.change(screen.getByLabelText('Pick a day'), { target: { value: '2025-11-21' } });
    expect(screen.getByText('Same date, other years')).toBeTruthy();
    expect(screen.getByText('The 21st of other months')).toBeTruthy();
    expect(screen.getByText(/1 year earlier/)).toBeTruthy();
    expect(screen.getByText(/morning, did you sleep well/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /21 November 2024/ }));
    expect(onJumpDay).toHaveBeenCalledWith(0);
  });

  it('explains when nothing matches', () => {
    setup();
    fireEvent.change(screen.getByLabelText('Pick a day'), { target: { value: '2025-03-09' } });
    expect(screen.getByText(/No other day in this chat falls on the 9th/)).toBeTruthy();
  });
});

describe('Saved', () => {
  it('shows saved messages, jumps to one and removes one', () => {
    const { onJumpMessage, onToggleSaved } = setup({ saved: [{ idx: 1, record: {} }, { idx: 2, record: {} }] });
    fireEvent.click(screen.getByRole('tab', { name: 'Saved (2)' }));
    fireEvent.click(screen.getByRole('button', { name: /morning, did you sleep well/ }));
    expect(onJumpMessage).toHaveBeenCalledWith(1);
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove from saved' })[1]);
    expect(onToggleSaved).toHaveBeenCalledWith(2);
  });

  it('tells you how to save something when the list is empty', () => {
    setup();
    fireEvent.click(screen.getByRole('tab', { name: 'Saved' }));
    expect(screen.getByText(/Tap the star next to any message/)).toBeTruthy();
  });
});

describe('Stats', () => {
  it('shows totals, who texts first, busiest days and favorite emojis', () => {
    const { onJumpDay } = setup();
    fireEvent.click(screen.getByRole('tab', { name: 'Stats' }));
    expect(screen.getByText('messages')).toBeTruthy();
    expect(screen.getByText('Who talks more')).toBeTruthy();
    expect(screen.getByText('Who texts first')).toBeTruthy();
    expect(screen.getByText('Messages per month')).toBeTruthy();
    expect(screen.getAllByTitle(/times$/).length).toBe(2); // the heart and the laugh
    fireEvent.click(screen.getAllByRole('button', { name: /21 November 2024/ })[0]);
    expect(onJumpDay).toHaveBeenCalledWith(0);
  });

  it('draws one column per month, including empty months', () => {
    setup();
    fireEvent.click(screen.getByRole('tab', { name: 'Stats' }));
    const chart = screen.getByRole('img', { name: 'Messages per month' });
    expect(chart.children.length).toBe(13); // Nov 2024 .. Nov 2025
  });

  it('closes', () => {
    const { onClose } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Close memories' }));
    expect(onClose).toHaveBeenCalled();
  });
});
