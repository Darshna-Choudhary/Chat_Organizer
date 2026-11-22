// "On this day": other days in the chat that share a date with a chosen day. Pure helpers.
const pad = (n) => String(n).padStart(2, '0');

export function todayISO(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function monthsApart(refDate, date) {
  const [ry, rm] = refDate.split('-').map(Number);
  const [y, m] = date.split('-').map(Number);
  return ry * 12 + rm - (y * 12 + m); // positive = `date` is earlier
}

export function relativeLabel(refDate, date) {
  const diff = monthsApart(refDate, date);
  if (diff === 0) return 'same month';
  const n = Math.abs(diff);
  const when = diff > 0 ? 'earlier' : 'later';
  if (n % 12 === 0) return `${n / 12} year${n === 12 ? '' : 's'} ${when}`;
  return `${n} month${n === 1 ? '' : 's'} ${when}`;
}

// sameDate: same month and day in other years. sameDay: same day of the month in other months.
export function onThisDay(index, refDate) {
  const [, rm, rd] = refDate.split('-');
  const sameDate = [];
  const sameDay = [];
  for (const date of index.days) {
    if (date === refDate) continue;
    const [, m, d] = date.split('-');
    if (d !== rd) continue;
    const item = { date, count: index.dayCount.get(date), idx: index.dayFirst.get(date) };
    if (m === rm) sameDate.push(item);
    else sameDay.push(item);
  }
  return { sameDate, sameDay };
}

// A few lines from that day: the first real text messages.
export function previewForDay(messages, startIdx, n = 3) {
  const date = messages[startIdx]?.date;
  const out = [];
  for (let i = startIdx; i < messages.length && i < startIdx + 400 && out.length < n; i++) {
    const m = messages[i];
    if (m.date !== date) break;
    if (m.type !== 'text') continue;
    const text = m.text.trim().replace(/\s+/g, ' ');
    if (text.length >= 2) out.push({ sender: m.sender, text: text.length > 90 ? text.slice(0, 90) + '...' : text });
  }
  return out;
}

export function ordinal(n) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return n + 'th';
  return n + (['th', 'st', 'nd', 'rd'][n % 10] || 'th');
}
