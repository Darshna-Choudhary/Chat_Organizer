import { useCallback, useEffect, useRef, useState } from 'react';
import { parseChatFile } from '../parser/parseInWorker.js';
import { kvDel, kvGet, kvSet } from './storage.js';
import { DEFAULT_SETTINGS } from './config.js';

function deriveTitle(fileName, report) {
  const m = /^WhatsApp Chat (?:with|-)\s*(.+?)(?:\s*\(\d+\))?\.txt$/i.exec(fileName || '');
  if (m) return m[1];
  const names = Object.keys(report.senders);
  return names.slice(0, 3).join(', ') || 'Chat';
}

// Loads/saves the chat and settings (IndexedDB) and parses new files (Web Worker).
export function useChat() {
  const [status, setStatus] = useState('loading'); // 'loading' | 'empty' | 'parsing' | 'ready'
  const [chat, setChat] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [error, setError] = useState(null);
  const [banner, setBanner] = useState(null);
  const settingsRef = useRef(DEFAULT_SETTINGS);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [savedChat, savedSettings] = await Promise.all([kvGet('chat'), kvGet('settings')]);
        if (!alive) return;
        if (savedChat) {
          setChat(savedChat);
          setSettings({ ...DEFAULT_SETTINGS, ...savedSettings });
          setStatus('ready');
        } else {
          setStatus('empty');
        }
      } catch {
        if (alive) setStatus('empty'); // storage unavailable (e.g. private mode): still usable, just not remembered
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const loadFile = useCallback(async (file, dateOrder = 'auto') => {
    setError(null);
    setStatus('parsing');
    try {
      const { messages, report } = await parseChatFile(file, { dateOrder });
      if (!messages.length) {
        setError(report.problems.join(' ') || 'No messages found in this file.');
        setStatus(chat ? 'ready' : 'empty');
        return;
      }
      const next = { id: Date.now(), title: deriveTitle(file.name, report), fileName: file.name, messages, report };
      setChat(next);
      setSettings(DEFAULT_SETTINGS);
      setBanner(report);
      setStatus('ready');
      try {
        await kvSet('chat', next);
        await kvSet('settings', DEFAULT_SETTINGS);
      } catch {
        setBanner({ ...report, problems: [...report.problems, 'Could not save this chat in the browser, so it will need to be loaded again next time.'] });
      }
    } catch (err) {
      setError(err.message || 'Could not read this file.');
      setStatus(chat ? 'ready' : 'empty');
    }
  }, [chat]);

  const updateSettings = useCallback((patch) => {
    const next = { ...settingsRef.current, ...patch };
    settingsRef.current = next;
    setSettings(next);
    kvSet('settings', next).catch(() => {});
  }, []);

  // Saves the reading position without re-rendering anything.
  const savePosition = useCallback((idx) => {
    settingsRef.current = { ...settingsRef.current, lastMsg: idx };
    kvSet('settings', settingsRef.current).catch(() => {});
  }, []);

  const replaceChat = useCallback(() => {
    setChat(null);
    setBanner(null);
    setStatus('empty');
  }, []);

  const forget = useCallback(async () => {
    try {
      await kvDel('chat');
      await kvDel('settings');
    } catch {
      /* nothing saved */
    }
    setChat(null);
    setBanner(null);
    setSettings(DEFAULT_SETTINGS);
    setStatus('empty');
  }, []);

  return { status, chat, settings, error, banner, dismissBanner: () => setBanner(null), loadFile, updateSettings, savePosition, replaceChat, forget };
}
