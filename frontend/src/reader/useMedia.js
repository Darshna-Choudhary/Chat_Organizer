import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { kvDel, kvGet, kvSet } from './storage.js';
import { createMediaStore, matchMedia } from '../media/mediaStore.js';
import { openPicked, restoreRecord } from '../media/sources.js';
import { pickDirectory, pickZip } from '../media/pickers.js';

// Attached photos/videos/etc. status: 'none' | 'loading' | 'ready' | 'needs-permission' | 'error'.
// A remembered zip/folder handle is kept in IndexedDB so media comes back on the next visit (Chrome/Edge).
export function useMedia(chat) {
  const [store, setStore] = useState(null);
  const [status, setStatus] = useState('none');
  const [error, setError] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const recordRef = useRef(null);
  const adopted = useRef(false); // a source chosen this visit wins over the remembered one

  const install = useCallback((entries, { record = null, persist = false, banner = false } = {}) => {
    setStore(entries.length ? createMediaStore(entries) : null);
    setStatus(entries.length ? 'ready' : 'none');
    setError(null);
    setShowBanner(banner && entries.length > 0);
    if (persist) {
      recordRef.current = record;
      (record ? kvSet('mediaHandle', record) : kvDel('mediaHandle')).catch(() => {});
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const rec = await kvGet('mediaHandle');
        if (!alive || adopted.current || !rec) return;
        recordRef.current = rec;
        setStatus('loading');
        const r = await restoreRecord(rec);
        if (!alive || adopted.current) return;
        if (r.needsPermission) setStatus('needs-permission');
        else install(r.src.entries);
      } catch {
        if (alive && !adopted.current) {
          setStatus('error');
          setError('Could not reopen your media. Add it again from the settings menu.');
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [install]);

  // Called after a chat is opened from a zip/folder: uses the media that came with it (or clears old media).
  const adopt = useCallback(async (src) => {
    adopted.current = true;
    install(src.entries || [], { record: src.handleRecord || null, persist: true, banner: true });
  }, [install]);

  // Media served from an encrypted vault: nothing to remember, nothing to pick.
  const attachEntries = useCallback((entries) => {
    adopted.current = true;
    install(entries, { banner: false });
  }, [install]);

  const attach = useCallback(async (kind) => {
    try {
      const picked = await (kind === 'zip' ? pickZip() : pickDirectory());
      if (!picked) return;
      setStatus('loading');
      const src = await openPicked(picked, { readChat: false });
      adopted.current = true;
      install(src.entries, { record: src.handleRecord, persist: true, banner: true });
    } catch (err) {
      setStatus(store ? 'ready' : 'error');
      setError(err.message || 'Could not open that.');
    }
  }, [install, store]);

  const reconnect = useCallback(async () => {
    if (!recordRef.current) return;
    try {
      setStatus('loading');
      const r = await restoreRecord(recordRef.current, { request: true });
      if (r.needsPermission) setStatus('needs-permission');
      else install(r.src.entries, { banner: true });
    } catch {
      setStatus('error');
      setError('Could not reopen your media. Add it again from the settings menu.');
    }
  }, [install]);

  const clear = useCallback(async () => {
    adopted.current = true;
    install([], { persist: true });
  }, [install]);

  const info = useMemo(() => (store && chat ? matchMedia(chat.messages, store) : null), [store, chat]);

  return { store, status, error, info, showBanner, dismissBanner: () => setShowBanner(false), adopt, attachEntries, attach, reconnect, clear };
}
