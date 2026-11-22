import { useCallback, useEffect, useRef, useState } from 'react';
import { kvGet, kvSet } from './storage.js';
import { DEFAULT_WELCOME } from './config.js';

// The optional welcome screen's text and on/off switch. Saved in this browser.
export function useWelcome() {
  const [welcome, setWelcome] = useState(DEFAULT_WELCOME);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef(DEFAULT_WELCOME);

  useEffect(() => {
    let alive = true;
    kvGet('welcome')
      .then((saved) => {
        if (!alive || !saved) return;
        ref.current = { ...DEFAULT_WELCOME, ...saved };
        setWelcome(ref.current);
      })
      .catch(() => {})
      .finally(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, []);

  const change = useCallback((patch) => {
    ref.current = { ...ref.current, ...patch };
    setWelcome(ref.current);
    kvSet('welcome', ref.current).catch(() => {});
  }, []);

  return { welcome, loaded, change };
}
