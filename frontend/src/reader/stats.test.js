import { describe, it, expect } from 'vitest';
import { computeStats } from './stats.js';

const HOUR = 3600000;
const base = Date.UTC(2024, 10, 18, 9, 0, 0);
const date = (ts) => new Date(ts).toISOString().slice(0, 10);
const msg = (hoursFromBase, sender, text, type = 'text') => {
  const ts = base + hoursFromBase * HOUR;
  return { ts, date: date(ts), time: '09:00', sender, text, type };
};

describe('computeStats', () => {
  const messages = [
    msg(0, 'Asha', 'good morning \u2764\uFE0F'),
    msg(0.1, 'Ravi', 'morning!! \u2764 \u{1F602}\u{1F602}'),
    msg(0.2, 'Asha', 'IMG-1.jpg (file attached)', 'media'),
    msg(0.3, '', 'Ravi changed the subject', 'system'),
    msg(10, 'Ravi', 'hello again \u{1F44D}\u{1F3FD} \u{1F1EE}\u{1F1F3}'), // 10h of quiet: Ravi starts
    msg(10.1, 'Asha', 'This message was deleted', 'deleted'),
    msg(34, 'Asha', '\u00A9 not an emoji but \u{1F468}\u200D\u{1F469}\u200D\u{1F467} is'), // next day, Asha starts
  ];
  const s = computeStats(messages);

  it('counts messages, words and media per sender, leaving out system lines', () => {
    expect(s.totals.messages).toBe(6);
    expect(s.totals.media).toBe(1);
    const asha = s.senders.find((x) => x.name === 'Asha');
    expect(asha.messages).toBe(4);
    expect(asha.media).toBe(1);
    expect(asha.words).toBe(2 + 8);
    expect(s.senders.map((x) => x.name)).toEqual(['Asha', 'Ravi']);
  });

  it('works out who starts a conversation after a quiet gap', () => {
    const by = Object.fromEntries(s.senders.map((x) => [x.name, x.starts]));
    expect(by).toEqual({ Asha: 2, Ravi: 1 });
  });

  it('counts emojis, merging heart variants and keeping skin tones, flags and family sequences whole', () => {
    const e = Object.fromEntries(s.topEmojis.map((x) => [x.emoji.replace(/\uFE0F/g, ''), x.count]));
    expect(e['\u2764']).toBe(2);
    expect(e['\u{1F602}']).toBe(2);
    expect(e['\u{1F44D}\u{1F3FD}']).toBe(1);
    expect(e['\u{1F1EE}\u{1F1F3}']).toBe(1);
    expect(e['\u{1F468}\u200D\u{1F469}\u200D\u{1F467}']).toBe(1);
    expect(Object.keys(e).some((k) => k.includes('\u00A9'))).toBe(false);
    expect(s.senders.find((x) => x.name === 'Ravi').topEmojis[0].count).toBe(2);
  });

  it('summarises days: active days and the longest streak', () => {
    expect(s.totals.activeDays).toBe(2);
    expect(s.totals.firstDate).toBe('2024-11-18');
    expect(s.totals.longestStreak).toEqual({ length: 2, start: '2024-11-18', end: '2024-11-19' });
    expect(s.busiestDays[0]).toEqual({ date: '2024-11-18', count: 5 });
  });

  it('fills empty months between the first and last so the chart has no gaps', () => {
    const r = computeStats([msg(0, 'A', 'x'), { ...msg(0, 'A', 'y'), ts: Date.UTC(2025, 1, 3), date: '2025-02-03' }]);
    expect(r.months.map((m) => m.key)).toEqual(['2024-11', '2024-12', '2025-01', '2025-02']);
    expect(r.months.map((m) => m.total)).toEqual([1, 0, 0, 1]);
    expect(r.months[0].bySender).toEqual({ A: 1 });
  });

  it('handles an empty chat', () => {
    const r = computeStats([]);
    expect(r.totals.messages).toBe(0);
    expect(r.months).toEqual([]);
    expect(r.totals.longestStreak.length).toBe(0);
  });

  it('streak breaks on a missed day', () => {
    const r = computeStats([msg(0, 'A', 'a'), msg(24, 'A', 'b'), msg(72, 'A', 'c')]);
    expect(r.totals.longestStreak.length).toBe(2);
  });

  it('handles 100k messages quickly', () => {
    const many = [];
    for (let i = 0; i < 100000; i++) many.push(msg(i * 0.05, i % 2 ? 'A' : 'B', 'hello world \u{1F602} number ' + i));
    const t = Date.now();
    const r = computeStats(many);
    expect(r.totals.messages).toBe(100000);
    expect(Date.now() - t).toBeLessThan(4000);
  });
});
