import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { buildIndex, dayStartRow, findDayIndex, fmtDate, monthLabel, msgAtRow, pickStart, searchMessages } from './rows.js';
import { DEFAULT_START_MONTH } from './config.js';
import MessageRow from './MessageRow.jsx';
import Heatmap from './Heatmap.jsx';
import './reader.css';

export default function Reader({ chat, settings, onSettings, onSavePosition, onReplace, onForget, banner, onDismissBanner }) {
  'use no memo'; // @tanstack/react-virtual is not compatible with the React Compiler's memoization
  const { messages, title } = chat;
  const index = useMemo(() => buildIndex(messages), [messages]);
  const senders = useMemo(() => Object.entries(chat.report.senders).sort((a, b) => b[1] - a[1]).map(([n]) => n), [chat.report]);

  const scrollerRef = useRef(null);
  const searchRef = useRef(null);
  const saveTimer = useRef(null);
  const flashTimer = useRef(null);
  const armed = useRef(false); // don't save a position until the initial jump has settled

  const [curDate, setCurDate] = useState(null);
  const [query, setQuery] = useState('');
  const [hitPos, setHitPos] = useState(-1);
  const [panelOpen, setPanelOpen] = useState(false);
  const [flash, setFlash] = useState(null);
  const [heatOpen, setHeatOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  const deferredQuery = useDeferredValue(query);
  const hits = useMemo(() => searchMessages(messages, deferredQuery), [messages, deferredQuery]);
  const highlightQuery = deferredQuery.trim().length >= 2 ? deferredQuery.trim() : '';

  const virtualizer = useVirtualizer({
    count: index.rows.length,
    getScrollElement: () => scrollerRef.current,
    estimateSize: (i) => (index.rows[i].kind === 'date' ? 44 : 64),
    overscan: 10,
    initialRect: { width: 800, height: 800 },
    onChange: (inst) => {
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        const top = inst.scrollOffset ?? 0;
        const first = inst.getVirtualItems().find((it) => it.end > top + 4);
        const idx = first ? msgAtRow(index, first.index) : null;
        if (idx === null) return;
        setCurDate(messages[idx].date);
        if (armed.current) onSavePosition(idx);
      }, 300);
    },
  });

  function scrollRow(row, align) {
    virtualizer.scrollToIndex(row, { align });
    requestAnimationFrame(() => virtualizer.scrollToIndex(row, { align })); // rows are measured lazily, so settle once more
  }
  function goMessage(idx) {
    scrollRow(index.msgRow[idx], 'center');
    setFlash(idx);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 2500);
  }
  function goDay(idx) {
    scrollRow(dayStartRow(index, idx), 'start');
  }

  // Open at the remembered position, else the start month, else the beginning.
  useEffect(() => {
    const start = pickStart(index, settings.openAt, settings.lastMsg, messages.length, DEFAULT_START_MONTH);
    const row = dayStartRow(index, start);
    virtualizer.scrollToIndex(row, { align: 'start' });
    const raf = requestAnimationFrame(() => virtualizer.scrollToIndex(row, { align: 'start' }));
    const timer = setTimeout(() => { armed.current = true; }, 1200);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      clearTimeout(saveTimer.current);
    };
    // Runs once per loaded chat (Reader is remounted for a new chat).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ctrl/Cmd+F searches the whole chat (the browser's own find only sees the rows on screen).
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === 'Escape') {
        setPanelOpen(false);
        setMenuOpen(false);
        setHeatOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function stepHit(dir) {
    if (!hits.length) return;
    const next = hitPos < 0 ? (dir > 0 ? 0 : hits.length - 1) : (hitPos + dir + hits.length) % hits.length;
    setHitPos(next);
    setPanelOpen(false);
    goMessage(hits[next]);
  }

  const monthValue = curDate && index.months.some((m) => m.key === curDate.slice(0, 7)) ? curDate.slice(0, 7) : '';
  const first = messages[0]?.date;
  const last = messages[messages.length - 1]?.date;

  return (
    <div className="reader">
      <header className="bar">
        <div className="avatar" aria-hidden="true">{(title[0] || '?').toUpperCase()}</div>
        <div className="who">
          <b>{title}</b>
          <small>{curDate ? fmtDate(curDate) : first && fmtDate(first)} {'\u00B7'} {messages.length.toLocaleString()} messages</small>
        </div>

        <div className="search">
          <input
            ref={searchRef}
            type="search"
            placeholder="Search chat"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setHitPos(-1); setPanelOpen(true); }}
            onFocus={() => setPanelOpen(true)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); stepHit(e.shiftKey ? -1 : 1); } }}
            aria-label="Search chat"
          />
          {highlightQuery && (
            <span className="hitnav">
              <small>{hits.length ? `${hitPos < 0 ? 0 : hitPos + 1}/${hits.length}${hits.length >= 1000 ? '+' : ''}` : 'No matches'}</small>
              <button onClick={() => stepHit(-1)} aria-label="Previous match">{'\u2039'}</button>
              <button onClick={() => stepHit(1)} aria-label="Next match">{'\u203A'}</button>
            </span>
          )}
          {panelOpen && highlightQuery && hits.length > 0 && (
            <div className="results" role="listbox">
              {hits.slice(0, 200).map((i, n) => {
                const m = messages[i];
                return (
                  <button key={i} role="option" onClick={() => { setHitPos(n); setPanelOpen(false); goMessage(i); }}>
                    <small>{m.date ? fmtDate(m.date) : ''}{m.sender ? ' \u00B7 ' + m.sender : ''}</small>
                    <span>{m.text.slice(0, 140)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <select className="jump" value={monthValue} onChange={(e) => { const m = index.months.find((x) => x.key === e.target.value); if (m) goDay(m.firstIdx); }} aria-label="Jump to month">
          {!monthValue && <option value="">Month</option>}
          {index.months.map((m) => <option key={m.key} value={m.key}>{monthLabel(m.key)} ({m.count})</option>)}
        </select>
        <input className="jump" type="date" min={first || undefined} max={last || undefined} value={curDate || ''} onChange={(e) => e.target.value && goDay(findDayIndex(index, e.target.value))} aria-label="Jump to date" />
        <button className="icon" onClick={() => setHeatOpen(true)} title="Calendar" aria-label="Calendar">{'\u{1F4C5}'}</button>
        <button className="icon" onClick={() => setMenuOpen((o) => !o)} title="Settings" aria-label="Settings">{'\u2699'}</button>

        {menuOpen && (
          <div className="menu" role="dialog" aria-label="Settings">
            <label>I am
              <select value={settings.me || ''} onChange={(e) => onSettings({ me: e.target.value })}>
                {senders.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label>Open the chat at
              <select value={settings.openAt} onChange={(e) => onSettings({ openAt: e.target.value })}>
                <option value="last">Where I left off</option>
                <option value="start">Start of chat</option>
                {index.months.map((m) => <option key={m.key} value={m.key}>{monthLabel(m.key)}</option>)}
              </select>
            </label>
            <button onClick={() => { setMenuOpen(false); onReplace(); }}>Open another chat</button>
            <button className="danger" onClick={() => { if (window.confirm('Delete the saved chat from this browser?')) onForget(); }}>Delete saved chat</button>
          </div>
        )}
      </header>

      {banner && (
        <div className={`banner${banner.ok ? '' : ' bad'}`}>
          <span>
            Loaded {banner.messages.toLocaleString()} messages and {banner.systemMessages.toLocaleString()} system lines
            {' \u00B7 '}dates read as {banner.dateOrder === 'DMY' ? 'DD/MM' : banner.dateOrder === 'YMD' ? 'YYYY/MM/DD' : 'MM/DD'}
            {banner.problems.length > 0 && <button className="link" onClick={() => setNotesOpen((o) => !o)}>{notesOpen ? 'Hide notes' : `${banner.problems.length} note(s)`}</button>}
          </span>
          <button className="icon" onClick={onDismissBanner} aria-label="Dismiss">{'\u2715'}</button>
          {notesOpen && <ul>{banner.problems.map((p) => <li key={p}>{p}</li>)}</ul>}
        </div>
      )}

      <div className="scroller" ref={scrollerRef}>
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map((item) => {
            const r = index.rows[item.index];
            let content;
            if (r.kind === 'date') content = <div className="chip date"><span>{fmtDate(r.date)}</span></div>;
            else if (r.kind === 'sys') content = <div className="chip sys"><span>{messages[r.idx].text}</span></div>;
            else {
              const m = messages[r.idx];
              const isMe = m.sender === settings.me;
              content = <MessageRow m={m} first={r.first} isMe={isMe} showName={index.groupChat && !isMe && r.first} query={highlightQuery} flashed={flash === r.idx} />;
            }
            return (
              <div key={item.key} data-index={item.index} ref={virtualizer.measureElement} className="vrow" style={{ transform: `translateY(${item.start}px)` }}>
                {content}
              </div>
            );
          })}
        </div>
      </div>

      {heatOpen && <Heatmap index={index} onClose={() => setHeatOpen(false)} onPick={(idx) => { setHeatOpen(false); goDay(idx); }} />}

      {!settings.me && (
        <div className="modal-back">
          <div className="modal" role="dialog" aria-label="Who are you?">
            <div className="modal-head"><b>Which one are you?</b></div>
            <p className="muted">Your messages appear on the right.</p>
            <div className="choices">
              {senders.slice(0, 8).map((s) => <button key={s} onClick={() => onSettings({ me: s })}>{s}</button>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
