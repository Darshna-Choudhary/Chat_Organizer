import { useCallback, useEffect, useRef, useState } from 'react';
import { kvGet, kvSet } from './storage.js';
import { DEFAULT_APPEARANCE } from './themes.js';

// Theme and look settings. Saved in this browser (IndexedDB), separate from any chat, so they survive switching chats.
export function useAppearance() {
  const [appearance, setAppearance] = useState(DEFAULT_APPEARANCE);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef(DEFAULT_APPEARANCE);

  useEffect(() => {
    let alive = true;
    kvGet('appearance')
      .then((saved) => {
        if (!alive || !saved) return;
        const merged = { ...DEFAULT_APPEARANCE, ...saved };
        ref.current = merged;
        setAppearance(merged);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const change = useCallback((patch) => {
    const next = { ...ref.current, ...patch };
    ref.current = next;
    setAppearance(next);
    kvSet('appearance', next).catch(() => {});
  }, []);

  const reset = useCallback(() => {
    ref.current = DEFAULT_APPEARANCE;
    setAppearance(DEFAULT_APPEARANCE);
    kvSet('appearance', DEFAULT_APPEARANCE).catch(() => {});
  }, []);

  return { appearance, loaded, change, reset };
}
