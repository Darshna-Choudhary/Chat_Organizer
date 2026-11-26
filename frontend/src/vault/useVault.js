import { useCallback, useEffect, useRef, useState } from 'react';
import { kvDel, kvGet, kvSet } from '../reader/storage.js';
import { VaultError } from './crypto.js';
import { mediaEntries, readChat, readVaultMeta, unlockWithKey, unlockWithPassphrase, vaultDefaults } from './client.js';

const WORDS = {
  'wrong-passphrase': "That isn't it. Try again, slowly.",
  network: 'Could not reach the files. Check the internet connection and try again.',
  corrupt: 'Some of the files seem damaged. Please try again in a moment.',
};
const messageFor = (err) => WORDS[err?.code] || 'Something went wrong. Please try again.';

// status: 'checking' | 'none' (no vault here: normal app) | 'locked' | 'working' | 'open'
// onOpen(data) is supplied by the app: it loads the chat and returns true when everything is ready.
export function useVault({ onOpen, base = '/' }) {
  const [status, setStatus] = useState('checking');
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);
  const openRef = useRef(onOpen);
  useEffect(() => {
    openRef.current = onOpen;
  }, [onOpen]);

  const finish = useCallback(async (session) => {
    const chat = await readChat(session);
    const ok = await openRef.current({ ...chat, entries: mediaEntries(session), defaults: vaultDefaults(session) });
    if (!ok) throw new VaultError('corrupt', 'The chat could not be read.');
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const m = await readVaultMeta({ base });
      if (!alive) return;
      if (!m) {
        setStatus('none');
        return;
      }
      setMeta(m);
      // a key remembered on this device opens it without typing
      try {
        const saved = await kvGet('vaultKey');
        if (saved && saved.id === m.salt) {
          setStatus('working');
          await finish(await unlockWithKey(m, saved.key, { base }));
          if (alive) setStatus('open');
          return;
        }
      } catch {
        await kvDel('vaultKey').catch(() => {}); // the vault was re-packed with a new phrase: ask again
      }
      if (alive) setStatus('locked');
    })();
    return () => {
      alive = false;
    };
  }, [base, finish]);

  const unlock = useCallback(async (phrase, remember) => {
    setError(null);
    setStatus('working');
    try {
      const session = await unlockWithPassphrase(meta, phrase, { base });
      if (remember) await kvSet('vaultKey', { id: meta.salt, key: session.key }).catch(() => {});
      await finish(session);
      setStatus('open');
    } catch (err) {
      setError(messageFor(err));
      setStatus('locked');
    }
  }, [meta, base, finish]);

  const lock = useCallback(async () => {
    await kvDel('vaultKey').catch(() => {});
    window.location.reload();
  }, []);

  return { status, meta, error, unlock, lock };
}
