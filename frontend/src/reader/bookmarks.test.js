import { describe, it, expect } from 'vitest';
import { makeBookmark, resolveBookmarks, toggleBookmark } from './bookmarks.js';

const m = (ts, sender, text) => ({ ts, sender, text, type: 'text' });
const chat = [m(1, 'A', 'hi'), m(2, 'B', 'hello'), m(2, 'A', 'same time, other sender'), m(3, 'A', 'x'.repeat(200))];

describe('bookmarks', () => {
  it('adds, then removes, a bookmark', () => {
    const on = toggleBookmark([], chat[1]);
    expect(on).toEqual([{ ts: 2, sender: 'B', text: 'hello' }]);
    expect(toggleBookmark(on, chat[1])).toEqual([]);
  });

  it('finds the right message even when two share a timestamp', () => {
    const records = [makeBookmark(chat[2])];
    expect(resolveBookmarks(chat, records).map((r) => r.idx)).toEqual([2]);
  });

  it('survives a re-export where positions shift', () => {
    const records = [makeBookmark(chat[1])];
    const later = [m(0, 'A', 'new first message'), ...chat];
    expect(resolveBookmarks(later, records)[0].idx).toBe(2);
  });

  it('handles long messages and returns results in chat order', () => {
    const records = [makeBookmark(chat[3]), makeBookmark(chat[0])];
    expect(resolveBookmarks(chat, records).map((r) => r.idx)).toEqual([0, 3]);
  });

  it('drops bookmarks whose message is gone', () => {
    expect(resolveBookmarks(chat, [{ ts: 99, sender: 'A', text: 'gone' }])).toEqual([]);
    expect(resolveBookmarks(chat, [])).toEqual([]);
  });
});
