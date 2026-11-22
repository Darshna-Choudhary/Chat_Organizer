import { useMemo, useState } from 'react';
import { fmtDate, fmtTime, monthLabel } from './rows.js';
import { onThisDay, ordinal, previewForDay, relativeLabel, todayISO } from './memories.js';
import { computeStats } from './stats.js';

function DayCard({ item, refDate, messages, onJump }) {
  const lines = previewForDay(messages, item.idx);
  return (
    <button className="day-card" onClick={() => onJump(item.idx)}>
      <b>{fmtDate(item.date)}</b>
      <small>{relativeLabel(refDate, item.date)} {'\u00B7'} {item.count} message{item.count === 1 ? '' : 's'}</small>
      {lines.map((l, i) => <span key={i} className="line"><i>{l.sender}:</i> {l.text}</span>)}
    </button>
  );
}

function OnThisDayTab({ index, messages, onJumpDay }) {
  const [refDate, setRefDate] = useState(() => todayISO());
  const { sameDate, sameDay } = useMemo(() => onThisDay(index, refDate), [index, refDate]);
  const [, rm, rd] = refDate.split('-');
  const first = index.days[0];
  const last = index.days[index.days.length - 1];

  return (
    <div className="tab-body">
      <div className="color-row">
        <label>Pick a day
          <input type="date" aria-label="Pick a day" value={refDate} onChange={(e) => e.target.value && setRefDate(e.target.value)} />
        </label>
        <button onClick={() => setRefDate(todayISO())}>Today</button>
      </div>

      {sameDate.length > 0 && (
        <>
          <h3>Same date, other years</h3>
          {sameDate.map((it) => <DayCard key={it.date} item={it} refDate={refDate} messages={messages} onJump={onJumpDay} />)}
        </>
      )}
      {sameDay.length > 0 && (
        <>
          <h3>The {ordinal(Number(rd))} of other months</h3>
          {sameDay.map((it) => <DayCard key={it.date} item={it} refDate={refDate} messages={messages} onJump={onJumpDay} />)}
        </>
      )}
      {!sameDate.length && !sameDay.length && (
        <p className="muted">
          No other day in this chat falls on the {ordinal(Number(rd))} (month {Number(rm)}). Your chat runs from {first ? fmtDate(first) : '?'} to {last ? fmtDate(last) : '?'}, so try a day inside that range.
        </p>
      )}
    </div>
  );
}

function SavedTab({ saved, messages, onJump, onToggle }) {
  if (!saved.length) return <p className="muted tab-body">Nothing saved yet. Tap the star next to any message to keep it here.</p>;
  return (
    <div className="tab-body">
      {saved.map(({ idx }) => {
        const m = messages[idx];
        const preview = m.type === 'media' ? '\u{1F4CE} ' + (m.mediaFile || 'Media') : m.type === 'deleted' ? 'Deleted message' : m.text.slice(0, 160);
        return (
          <div key={idx} className="saved-item">
            <button className="saved-go" onClick={() => onJump(idx)}>
              <small>{m.date ? fmtDate(m.date) : ''} {m.time ? '\u00B7 ' + fmtTime(m.time) : ''} {'\u00B7'} {m.sender}</small>
              <span>{preview}</span>
            </button>
            <button className="saved-x" aria-label="Remove from saved" onClick={() => onToggle(idx)}>{'\u2715'}</button>
          </div>
        );
      })}
    </div>
  );
}

function StatsTab({ index, messages, me, onJumpDay }) {
  const st = useMemo(() => computeStats(messages), [messages]);
  const t = st.totals;
  if (!t.messages) return <p className="muted tab-body">No messages to count.</p>;
  const maxMonth = Math.max(1, ...st.months.map((m) => m.total));
  const totalStarts = st.senders.reduce((n, s) => n + s.starts, 0) || 1;
  const pct = (n, of) => Math.round((n / of) * 100);
  const streak = t.longestStreak;

  return (
    <div className="tab-body">
      <div className="tiles">
        <div><b>{t.messages.toLocaleString()}</b><small>messages</small></div>
        <div><b>{t.activeDays.toLocaleString()}</b><small>days with chat</small></div>
        <div><b>{streak.length}</b><small>day longest streak</small></div>
        <div><b>{t.avgPerActiveDay}</b><small>messages on a typical day</small></div>
      </div>
      {streak.length > 1 && <p className="muted small">Longest streak: {fmtDate(streak.start)} to {fmtDate(streak.end)}.</p>}

      <h3>Who talks more</h3>
      {st.senders.map((s) => (
        <div key={s.name} className="statrow">
          <div className="statline"><span>{s.name}</span><span>{s.messages.toLocaleString()} ({pct(s.messages, t.messages)}%)</span></div>
          <div className="track"><i className={s.name === me ? 'me' : 'other'} style={{ width: pct(s.messages, t.messages) + '%' }} /></div>
          <small className="muted">{s.words.toLocaleString()} words {'\u00B7'} {s.media.toLocaleString()} photos, videos and files</small>
        </div>
      ))}

      <h3>Who texts first</h3>
      {st.senders.map((s) => (
        <div key={s.name} className="statrow">
          <div className="statline"><span>{s.name}</span><span>{s.starts.toLocaleString()} ({pct(s.starts, totalStarts)}%)</span></div>
          <div className="track"><i className={s.name === me ? 'me' : 'other'} style={{ width: pct(s.starts, totalStarts) + '%' }} /></div>
        </div>
      ))}
      <p className="muted small">A new conversation starts with the first message after 6 hours of quiet.</p>

      <h3>Messages per month</h3>
      <div className="mchart" role="img" aria-label="Messages per month">
        {st.months.map((m) => {
          const mine = m.bySender[me] || 0;
          return (
            <div key={m.key} className="mcol" title={`${monthLabel(m.key)}: ${m.total.toLocaleString()} messages`}>
              <div className="mbar">
                <i className="other" style={{ height: ((m.total - mine) / maxMonth) * 100 + '%' }} />
                <i className="me" style={{ height: (mine / maxMonth) * 100 + '%' }} />
              </div>
              <small>{monthLabel(m.key).slice(0, 3)}</small>
            </div>
          );
        })}
      </div>

      <h3>Busiest days</h3>
      {st.busiestDays.map((d) => (
        <button key={d.date} className="busy" onClick={() => onJumpDay(index.dayFirst.get(d.date))}>
          <span>{fmtDate(d.date)}</span><b>{d.count.toLocaleString()}</b>
        </button>
      ))}

      <h3>Favorite emojis</h3>
      {st.topEmojis.length === 0 && <p className="muted">No emojis found.</p>}
      <div className="emojis">
        {st.topEmojis.map((e) => <span key={e.key} className="emo" title={`${e.count} times`}>{e.emoji}<small>{e.count.toLocaleString()}</small></span>)}
      </div>
      {st.senders.map((s) => s.topEmojis.length > 0 && (
        <p key={s.name} className="muted small">{s.name}: {s.topEmojis.map((e) => e.emoji).join(' ')}</p>
      ))}
    </div>
  );
}

export default function MemoriesPanel({ index, messages, me, saved, onToggleSaved, onJumpMessage, onJumpDay, onClose }) {
  const [tab, setTab] = useState('day');
  const tabs = [['day', 'On this day'], ['saved', saved.length ? `Saved (${saved.length})` : 'Saved'], ['stats', 'Stats']];
  return (
    <aside className="drawer wide" role="dialog" aria-label="Memories">
      <div className="modal-head">
        <b>Memories</b>
        <button onClick={onClose} aria-label="Close memories">{'\u2715'}</button>
      </div>
      <div className="tabs" role="tablist">
        {tabs.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      {tab === 'day' && <OnThisDayTab index={index} messages={messages} onJumpDay={onJumpDay} />}
      {tab === 'saved' && <SavedTab saved={saved} messages={messages} onJump={onJumpMessage} onToggle={onToggleSaved} />}
      {tab === 'stats' && <StatsTab index={index} messages={messages} me={me} onJumpDay={onJumpDay} />}
    </aside>
  );
}
