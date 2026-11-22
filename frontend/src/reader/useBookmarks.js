import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { kvGet, kvSet } from './storage.js';
import { resolveBookmarks, toggleBookmark } from './bookmarks.js';

// Saved messages for this chat, kept in this browser. Shared by every export of the same chat (same title).
export function useBookmarks(chat) {
  const { messages, title } = chat;
  const key = 'bookmarks:' + title;
  const [records, setRecords] = useState([]);
  const ref = useRef([]);

  useEffect(() => {
    let alive = true;
    kvGet(key)
      .then((saved) => {
        if (!alive || !Array.isArray(saved)) return;
        ref.current = saved;
        setRecords(saved);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [key]);

  const resolved = useMemo(() => resolveBookmarks(messages, records), [messages, records]);
  const set = useMemo(() => new Set(resolved.map((r) => r.idx)), [resolved]);

  const toggle = useCallback((idx) => {
    const next = toggleBookmark(ref.current, messages[idx]);
    ref.current = next;
    setRecords(next);
    kvSet(key, next).catch(() => {});
  }, [messages, key]);

  return { resolved, set, toggle };
}
