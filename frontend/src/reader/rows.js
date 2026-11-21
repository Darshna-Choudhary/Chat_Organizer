// Pure helpers: turn parsed messages into virtual-list rows plus lookup tables. No React here.

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function monthLabel(key) {
  const [y, m] = key.split('-');
  return MONTHS[+m - 1] + ' ' + y;
}

export function fmtDate(date) {
  const [y, m, d] = date.split('-');
  return +d + ' ' + MONTHS[+m - 1] + ' ' + y;
}

export function fmtTime(time) {
  const [h, m] = time.split(':').map(Number);
  return ((h + 11) % 12) + 1 + ':' + String(m).padStart(2, '0') + ' ' + (h < 12 ? 'AM' : 'PM');
}

export function buildIndex(messages) {
  const rows = [];
  const msgRow = new Array(messages.length);
  const dayFirst = new Map();
  const dayCount = new Map();
  const monthInfo = new Map();
  const senders = new Set();
  let prevDate = null;
  let prevSender = null;

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (m.date && m.date !== prevDate) {
      rows.push({ kind: 'date', date: m.date });
      prevDate = m.date;
      prevSender = null;
    }
    if (m.date) {
      if (!dayFirst.has(m.date)) dayFirst.set(m.date, i);
      dayCount.set(m.date, (dayCount.get(m.date) || 0) + 1);
      const key = m.date.slice(0, 7);
      const mi = monthInfo.get(key);
      if (mi) mi.count++;
      else monthInfo.set(key, { key, count: 1, firstIdx: i });
    }
    if (m.type === 'system') {
      rows.push({ kind: 'sys', idx: i });
      prevSender = null;
    } else {
      rows.push({ kind: 'msg', idx: i, first: m.sender !== prevSender });
      prevSender = m.sender;
      senders.add(m.sender);
    }
    msgRow[i] = rows.length - 1;
  }

  const days = [...dayFirst.keys()].sort();
  const months = [...monthInfo.values()].sort((a, b) => (a.key < b.key ? -1 : 1));
  return { rows, msgRow, dayFirst, dayCount, days, months, groupChat: senders.size > 2 };
}

// First message on or after the given YYYY-MM-DD (clamped to the last day in the chat).
export function findDayIndex(index, date) {
  const { days, dayFirst } = index;
  if (!days.length) return 0;
  let lo = 0;
  let hi = days.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (days[mid] < date) lo = mid + 1;
    else hi = mid;
  }
  return dayFirst.get(days[lo]);
}

// Message index shown at (or just after) a virtual row.
export function msgAtRow(index, row) {
  for (let r = Math.max(0, row); r < index.rows.length; r++) {
    if (index.rows[r].idx !== undefined) return index.rows[r].idx;
  }
  return null;
}

// Row to scroll to so the date chip above a message is visible too.
export function dayStartRow(index, idx) {
  const row = index.msgRow[idx];
  return row > 0 && index.rows[row - 1].kind === 'date' ? row - 1 : row;
}

export function pickStart(index, openAt, lastMsg, total, defaultMonth) {
  if (openAt === 'last' && Number.isInteger(lastMsg) && lastMsg >= 0 && lastMsg < total) return lastMsg;
  const month = /^\d{4}-\d{2}$/.test(openAt || '') ? openAt : openAt === 'start' ? null : defaultMonth;
  const found = month && index.months.find((m) => m.key === month);
  return found ? found.firstIdx : 0;
}

export function searchMessages(messages, query, limit = 1000) {
  const q = (query || '').trim().toLowerCase();
  if (q.length < 2) return [];
  const hits = [];
  for (let i = 0; i < messages.length && hits.length < limit; i++) {
    if (messages[i].text.toLowerCase().includes(q)) hits.push(i);
  }
  return hits;
}
