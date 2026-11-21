import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseChat } from '../parser/parseChat.js';
import { buildIndex, dayStartRow, findDayIndex, fmtTime, monthLabel, msgAtRow, pickStart, searchMessages } from './rows.js';

const sample = (n) => readFileSync(fileURLToPath(new URL('../../../samples/' + n, import.meta.url)), 'utf8');
const { messages } = parseChat(sample('fake-android-mdy.txt'));
const index = buildIndex(messages);

describe('buildIndex', () => {
  it('adds one date chip per day and one row per message', () => {
    const chips = index.rows.filter((r) => r.kind === 'date');
    expect(chips.map((c) => c.date)).toEqual(['2024-11-18', '2024-11-19']);
    expect(index.rows.length).toBe(messages.length + 2);
    expect(index.msgRow.length).toBe(messages.length);
  });

  it('marks the first bubble of each run for the tail, and system lines break runs', () => {
    const msg = (sender, type = 'text') => ({ date: '2024-11-18', time: '10:00', sender, text: 'x', type });
    const idx = buildIndex([msg('A'), msg('A'), msg('B'), { ...msg(''), type: 'system' }, msg('B')]);
    const firsts = idx.rows.filter((r) => r.kind === 'msg').map((r) => r.first);
    expect(firsts).toEqual([true, false, true, true]); // A, A(same run), B, B(after a system line)
    expect(idx.rows.filter((r) => r.kind === 'sys').length).toBe(1);
  });

  it('tracks days, months and group-chat detection', () => {
    expect(index.days).toEqual(['2024-11-18', '2024-11-19']);
    expect(index.dayCount.get('2024-11-18')).toBe(10);
    expect(index.months).toEqual([{ key: '2024-11', count: 12, firstIdx: 0 }]);
    expect(index.groupChat).toBe(false);
  });
});

describe('navigation helpers', () => {
  it('finds the first message on or after a date, clamped to the chat', () => {
    expect(findDayIndex(index, '2024-11-19')).toBe(index.dayFirst.get('2024-11-19'));
    expect(findDayIndex(index, '2020-01-01')).toBe(0);
    expect(findDayIndex(index, '2030-01-01')).toBe(index.dayFirst.get('2024-11-19'));
  });

  it('maps rows back to messages and scrolls to the date chip', () => {
    expect(msgAtRow(index, 0)).toBe(0); // row 0 is a date chip
    expect(index.rows[dayStartRow(index, 0)].kind).toBe('date');
  });

  it('picks the opening position', () => {
    const total = messages.length;
    expect(pickStart(index, 'last', 7, total, '2024-11')).toBe(7);
    expect(pickStart(index, 'last', null, total, '2024-11')).toBe(0); // month 2024-11 starts at message 0
    expect(pickStart(index, 'last', 9999, total, '2024-11')).toBe(0);
    expect(pickStart(index, 'start', 7, total, '2024-11')).toBe(0);
    expect(pickStart(index, '2025-03', null, total, '2024-11')).toBe(0); // missing month falls back to the start
  });
});

describe('search and formatting', () => {
  it('searches case-insensitively and ignores very short queries', () => {
    expect(searchMessages(messages, 'MIDNIGHT').length).toBe(1);
    expect(searchMessages(messages, 'a')).toEqual([]);
    expect(searchMessages(messages, 'zzzz-no-match')).toEqual([]);
  });

  it('formats times and months', () => {
    expect(fmtTime('00:05')).toBe('12:05 AM');
    expect(fmtTime('12:30')).toBe('12:30 PM');
    expect(fmtTime('21:05')).toBe('9:05 PM');
    expect(monthLabel('2024-11')).toBe('November 2024');
  });

  it('handles 100k messages quickly enough to build the index', () => {
    const many = [];
    for (let i = 0; i < 100000; i++) many.push({ id: i, date: '2024-' + String((i % 12) + 1).padStart(2, '0') + '-01', time: '10:00', sender: i % 2 ? 'A' : 'B', text: 'm' + i, type: 'text' });
    const t = Date.now();
    const idx = buildIndex(many);
    expect(idx.msgRow.length).toBe(100000);
    expect(Date.now() - t).toBeLessThan(3000);
  });
});
