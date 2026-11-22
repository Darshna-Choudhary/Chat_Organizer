import { describe, it, expect } from 'vitest';
import { buildIndex } from './rows.js';
import { monthsApart, onThisDay, ordinal, previewForDay, relativeLabel, todayISO } from './memories.js';

const msg = (date, text = 'hello there', sender = 'A', type = 'text') => ({ date, time: '10:00', ts: Date.parse(date + 'T10:00:00Z'), sender, text, type });
const chat = [
  msg('2024-11-21', 'first year'), msg('2024-11-21', 'second line'),
  msg('2024-12-21', 'monthly one'),
  msg('2025-01-21', 'monthly two'),
  msg('2025-01-22', 'not matching'),
  msg('2025-11-21', 'one year later'),
  msg('2025-02-03', 'other'),
];
const index = buildIndex(chat);

describe('onThisDay', () => {
  it('finds the same date in other years and the same day in other months', () => {
    const r = onThisDay(index, '2025-11-21');
    expect(r.sameDate.map((x) => x.date)).toEqual(['2024-11-21']);
    expect(r.sameDay.map((x) => x.date)).toEqual(['2024-12-21', '2025-01-21']);
    expect(r.sameDate[0].count).toBe(2);
    expect(r.sameDate[0].idx).toBe(index.dayFirst.get('2024-11-21'));
  });

  it('never lists the chosen day itself', () => {
    const r = onThisDay(index, '2024-11-21');
    expect([...r.sameDate, ...r.sameDay].some((x) => x.date === '2024-11-21')).toBe(false);
    expect(r.sameDate.map((x) => x.date)).toEqual(['2025-11-21']);
  });

  it('returns nothing when no day shares the date', () => {
    expect(onThisDay(index, '2025-03-09')).toEqual({ sameDate: [], sameDay: [] });
  });
});

describe('labels and previews', () => {
  it('describes how far apart days are', () => {
    expect(monthsApart('2025-11-21', '2024-11-21')).toBe(12);
    expect(relativeLabel('2025-11-21', '2024-11-21')).toBe('1 year earlier');
    expect(relativeLabel('2026-11-21', '2024-11-21')).toBe('2 years earlier');
    expect(relativeLabel('2025-11-21', '2025-09-21')).toBe('2 months earlier');
    expect(relativeLabel('2025-01-21', '2025-02-21')).toBe('1 month later');
  });

  it('previews the first real text messages of a day, skipping media and system lines', () => {
    const msgs = [msg('2024-11-21', 'x', 'A', 'media'), msg('2024-11-21', '', 'A', 'system'), msg('2024-11-21', 'good   morning', 'B'), msg('2024-11-21', 'a'), msg('2024-11-21', 'how are you?'), msg('2024-11-22', 'tomorrow')];
    expect(previewForDay(msgs, 0, 3)).toEqual([{ sender: 'B', text: 'good morning' }, { sender: 'A', text: 'how are you?' }]);
  });

  it('shortens long lines', () => {
    const p = previewForDay([msg('2024-11-21', 'word '.repeat(60))], 0);
    expect(p[0].text.length).toBeLessThanOrEqual(93);
    expect(p[0].text.endsWith('...')).toBe(true);
  });

  it('formats today as YYYY-MM-DD', () => {
    expect(todayISO(new Date(2026, 10, 21))).toBe('2026-11-21');
    expect(todayISO(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('ordinal', () => {
  it('writes day numbers the way people say them', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 30, 31].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '30th', '31st']);
  });
});
