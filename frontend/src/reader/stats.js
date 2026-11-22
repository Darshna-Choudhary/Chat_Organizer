// Chat statistics. Pure; runs once when the Stats tab opens.
const EMOJI = /\p{Regional_Indicator}{2}|\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*/gu;
const TEXT_SYMBOLS = /^[\u00A9\u00AE\u2122]\uFE0F?$/; // (c) (r) (tm) are text, not emoji
const DAY = 86400000;

const top = (map, n) => [...map.entries()].sort((a, b) => b[1].count - a[1].count || (a[0] < b[0] ? -1 : 1)).slice(0, n).map(([k, v]) => ({ emoji: v.shown, count: v.count, key: k }));

function addEmoji(map, text) {
  for (const raw of text.match(EMOJI) || []) {
    if (TEXT_SYMBOLS.test(raw)) continue;
    const key = raw.replace(/\uFE0F/g, '');
    const hit = map.get(key);
    if (hit) hit.count++;
    else map.set(key, { shown: raw, count: 1 });
  }
}

const dayNumber = (date) => {
  const [y, m, d] = date.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY);
};

export function computeStats(messages, { gapHours = 6 } = {}) {
  const senders = new Map();
  const months = new Map();
  const days = new Map();
  const emojiAll = new Map();
  const gap = gapHours * 3600000;
  let words = 0;
  let media = 0;
  let total = 0;
  let prevTs = null;

  for (const m of messages) {
    if (m.type === 'system') continue;
    total++;
    let s = senders.get(m.sender);
    if (!s) senders.set(m.sender, (s = { name: m.sender, messages: 0, words: 0, media: 0, starts: 0, emoji: new Map() }));
    s.messages++;
    if (m.type === 'media') {
      media++;
      s.media++;
    } else if (m.type === 'text') {
      const w = m.text.trim() ? m.text.trim().split(/\s+/).length : 0;
      words += w;
      s.words += w;
      addEmoji(emojiAll, m.text);
      addEmoji(s.emoji, m.text);
    }
    if (m.date) {
      days.set(m.date, (days.get(m.date) || 0) + 1);
      const key = m.date.slice(0, 7);
      let mo = months.get(key);
      if (!mo) months.set(key, (mo = { key, total: 0, bySender: {} }));
      mo.total++;
      mo.bySender[m.sender] = (mo.bySender[m.sender] || 0) + 1;
    }
    if (m.ts != null) {
      if (prevTs === null || m.ts - prevTs >= gap) s.starts++;
      prevTs = m.ts;
    }
  }

  const dayList = [...days.keys()].sort();
  let best = { length: 0, start: null, end: null };
  let run = { length: 0, start: null, end: null };
  let prevNum = null;
  for (const d of dayList) {
    const n = dayNumber(d);
    run = prevNum !== null && n - prevNum === 1 ? { ...run, length: run.length + 1, end: d } : { length: 1, start: d, end: d };
    if (run.length > best.length) best = run;
    prevNum = n;
  }

  // every month between first and last, so the chart has no gaps
  const filled = [];
  if (months.size) {
    const keys = [...months.keys()].sort();
    let [y, mo] = keys[0].split('-').map(Number);
    const [ly, lm] = keys[keys.length - 1].split('-').map(Number);
    while (y < ly || (y === ly && mo <= lm)) {
      const key = `${y}-${pad2(mo)}`;
      filled.push(months.get(key) || { key, total: 0, bySender: {} });
      if (++mo > 12) {
        mo = 1;
        y++;
      }
    }
  }

  return {
    totals: {
      messages: total,
      words,
      media,
      activeDays: dayList.length,
      avgPerActiveDay: dayList.length ? Math.round(total / dayList.length) : 0,
      firstDate: dayList[0] || null,
      lastDate: dayList[dayList.length - 1] || null,
      longestStreak: best,
    },
    senders: [...senders.values()].sort((a, b) => b.messages - a.messages).map((s) => ({ name: s.name, messages: s.messages, words: s.words, media: s.media, starts: s.starts, topEmojis: top(s.emoji, 5) })),
    months: filled,
    busiestDays: [...days.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 10).map(([date, count]) => ({ date, count })),
    topEmojis: top(emojiAll, 12),
  };
}

function pad2(n) {
  return String(n).padStart(2, '0');
}
