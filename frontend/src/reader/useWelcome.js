import { useCallback, useEffect, useRef, useState } from 'react';
import { kvGet, kvSet } from './storage.js';
import { DEFAULT_WELCOME } from './config.js';

// The optional welcome screen's text and on/off switch, plus whether it was already shown on this device.
export function useWelcome() {
  const [welcome, setWelcome] = useState(DEFAULT_WELCOME);
  const [seen, setSeen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef(DEFAULT_WELCOME);
  const hadSaved = useRef(false);

  useEffect(() => {
    let alive = true;
    Promise.all([kvGet('welcome').catch(() => null), kvGet('welcomeSeen').catch(() => null)])
      .then(([saved, wasSeen]) => {
        if (!alive) return;
        if (saved) {
          hadSaved.current = true;
          ref.current = { ...DEFAULT_WELCOME, ...saved };
          setWelcome(ref.current);
        }
        if (wasSeen) setSeen(true);
      })
      .finally(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const change = useCallback((patch) => {
    ref.current = { ...ref.current, ...patch };
    setWelcome(ref.current);
    kvSet('welcome', ref.current).catch(() => {});
  }, []);

  // First visit only: the message chosen when the vault was packed.
  const seed = useCallback((partial) => {
    if (hadSaved.current || !partial || !Object.keys(partial).length) return;
    hadSaved.current = true;
    change(partial);
  }, [change]);

  const markSeen = useCallback(() => {
    setSeen(true);
    kvSet('welcomeSeen', true).catch(() => {});
  }, []);

  // Should it open with the welcome screen right now?
  const showOnOpen = welcome.enabled && !(welcome.showOnce && seen);

  return { welcome, loaded, change, seed, seen, markSeen, showOnOpen };
}
