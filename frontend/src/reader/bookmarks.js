// Saved messages. A bookmark stores enough to find the message again even if the chat is re-exported
// with newer messages added (so positions shift): time, sender and the start of the text.
const PREFIX = 80;

export function makeBookmark(m) {
  return { ts: m.ts, sender: m.sender, text: m.text.slice(0, PREFIX) };
}

const same = (b, m) => b.ts === m.ts && b.sender === m.sender && b.text === m.text.slice(0, PREFIX);

export function toggleBookmark(records, m) {
  return records.some((b) => same(b, m)) ? records.filter((b) => !same(b, m)) : [...records, makeBookmark(m)];
}

// -> [{ idx, record }] in chat order; bookmarks whose message is no longer in the chat are skipped.
export function resolveBookmarks(messages, records) {
  if (!records.length) return [];
  const byTs = new Map();
  for (let i = 0; i < messages.length; i++) {
    const list = byTs.get(messages[i].ts);
    if (list) list.push(i);
    else byTs.set(messages[i].ts, [i]);
  }
  const out = [];
  for (const record of records) {
    const idx = (byTs.get(record.ts) || []).find((i) => same(record, messages[i]));
    if (idx !== undefined) out.push({ idx, record });
  }
  return out.sort((a, b) => a.idx - b.idx);
}
