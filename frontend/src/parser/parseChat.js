// WhatsApp chat parser. Pure JS, no DOM, no network: safe to run in a Web Worker or in Node tests.
//
// parseChat(rawText, options) -> { messages, report }
//
// options:
//   dateOrder: 'auto' (default) | 'MDY' | 'DMY' | 'YMD'   manual override for the date order
//   senders:   optional array of known sender names (helps with names that contain ": ")
//
// Message shape:
//   { id, ts, date, time, sender, text, type, edited, mediaFile }
//   ts        wall-clock time as a UTC-style epoch (Date.UTC of the printed time); use new Date(ts) with getUTC*()
//   date      "YYYY-MM-DD"
//   time      "HH:MM" (24h)
//   type      'text' | 'media' | 'deleted' | 'system'
//   mediaFile file name when the chat names it, else null
//
// Guarantee: no timestamped line is dropped. report.ok is false if the line accounting does not add up.

const AMPM = '([AaPp]\\.?\\s?[Mm]\\.?)?';
// Android: 11/18/24, 9:25 PM - Name: text
const ANDROID = new RegExp(
  '^(\\d{1,4})[/.\\-](\\d{1,2})[/.\\-](\\d{1,4}),?\\s+(\\d{1,2})[:.](\\d{2})(?::(\\d{2}))?\\s*' + AMPM + '\\s+[-\\u2013]\\s(.*)$'
);
// iPhone: [18/11/24, 9:25:03 PM] Name: text
const IOS = new RegExp(
  '^\\[(\\d{1,4})[/.\\-](\\d{1,2})[/.\\-](\\d{1,4}),?\\s+(\\d{1,2})[:.](\\d{2})(?::(\\d{2}))?\\s*' + AMPM + '\\]\\s(.*)$'
);
const DATE_LIKE_START = /^\[?\d{1,4}[/.-]\d{1,2}[/.-]\d{1,4}/;

const EDITED = '<This message was edited>';
const DELETED = new Set(['this message was deleted', 'you deleted this message']);
const MEDIA_OMITTED = /^(<media omitted>|(image|video|audio|sticker|gif|document|contact card|video note) omitted)$/i;
const MEDIA_ATTACHED_IOS = /^<attached:\s*(.+?)>$/i;
const MEDIA_ATTACHED_ANDROID = /^(.+?)\s*\(file attached\)$/i;

function normalize(raw) {
  return raw
    .replace(/^\uFEFF/, '')
    .replace(/[\u202F\u00A0]/g, ' ')
    .replace(/[\u200E\u200F\u202A-\u202E]/g, '')
    .replace(/\r\n?/g, '\n');
}

function detectOrder(heads, override) {
  if (override && override !== 'auto') {
    return { order: override, ambiguous: false, method: 'manual' };
  }
  if (!heads.length) return { order: 'MDY', ambiguous: true, method: 'default' };

  const yearFirst = heads.filter((h) => h.a.length === 4).length > heads.length / 2;
  if (yearFirst) return { order: 'YMD', ambiguous: false, method: 'year-first' };

  let aBig = 0;
  let bBig = 0;
  for (const h of heads) {
    if (+h.a > 12) aBig++;
    if (+h.b > 12) bBig++;
  }
  if (aBig && !bBig) return { order: 'DMY', ambiguous: false, method: 'value>12' };
  if (bBig && !aBig) return { order: 'MDY', ambiguous: false, method: 'value>12' };

  // Ambiguous by value (or contradictory): the chat is chronological, so pick the order with fewer backwards steps.
  const score = (order) => {
    let prev = -1;
    let back = 0;
    for (const h of heads) {
      const m = order === 'DMY' ? +h.b : +h.a;
      const d = order === 'DMY' ? +h.a : +h.b;
      let y = +h.c;
      if (y < 100) y += 2000;
      const key = m < 1 || m > 12 || d < 1 || d > 31 ? -2 : y * 10000 + m * 100 + d;
      if (key < prev) back++;
      if (key >= 0) prev = key;
    }
    return back;
  };
  const dmy = score('DMY');
  const mdy = score('MDY');
  if (dmy < mdy) return { order: 'DMY', ambiguous: false, method: 'chronology' };
  if (mdy < dmy) return { order: 'MDY', ambiguous: false, method: 'chronology' };
  return { order: 'MDY', ambiguous: true, method: 'default' };
}

function splitSender(body, knownSenders) {
  if (knownSenders && knownSenders.length) {
    let best = null;
    for (const name of knownSenders) {
      if (body.startsWith(name + ': ') && (!best || name.length > best.length)) best = name;
    }
    if (best) return { sender: best, text: body.slice(best.length + 2) };
  }
  const i = body.indexOf(': ');
  if (i > 0 && i <= 100) return { sender: body.slice(0, i).trim(), text: body.slice(i + 2) };
  return null;
}

export function parseChat(rawText, options = {}) {
  const text = normalize(String(rawText ?? ''));
  const lines = text.split('\n');
  if (lines.length && lines[lines.length - 1] === '') lines.pop(); // final newline is not a line

  // Pass 1: find message heads.
  const heads = []; // { idx, a, b, c, h, mi, s, ap, body }
  for (let i = 0; i < lines.length; i++) {
    const m = ANDROID.exec(lines[i]) || IOS.exec(lines[i]);
    if (m) heads.push({ idx: i, a: m[1], b: m[2], c: m[3], h: m[4], mi: m[5], s: m[6], ap: m[7], body: m[8] });
  }

  const { order, ambiguous, method } = detectOrder(heads, options.dateOrder);

  // Pass 2: attach continuation lines and build messages.
  const messages = [];
  const report = {
    linesRead: lines.length,
    timestampedLines: heads.length,
    continuationLines: 0,
    leadingUnparsedLines: heads.length ? heads[0].idx : lines.length,
    dateLikeContinuationLines: 0,
    messages: 0,
    systemMessages: 0,
    edited: 0,
    deleted: 0,
    media: 0,
    mediaWithFile: 0,
    invalidTimestamps: 0,
    outOfOrderSteps: 0,
    longestMessageLines: 0,
    dateOrder: order,
    dateOrderAmbiguous: ambiguous,
    dateOrderMethod: method,
    firstDate: null,
    lastDate: null,
    senders: {},
    problems: [],
    ok: true,
  };

  let lastTs = null;
  let lastDate = null;
  let lastTime = '00:00';

  for (let k = 0; k < heads.length; k++) {
    const hd = heads[k];
    const endIdx = k + 1 < heads.length ? heads[k + 1].idx : lines.length;
    let body = hd.body;
    for (let j = hd.idx + 1; j < endIdx; j++) {
      body += '\n' + lines[j];
      report.continuationLines++;
      if (DATE_LIKE_START.test(lines[j])) report.dateLikeContinuationLines++;
    }
    report.longestMessageLines = Math.max(report.longestMessageLines, endIdx - hd.idx);

    // --- timestamp ---
    let y;
    let mo;
    let d;
    if (order === 'YMD') {
      y = +hd.a; mo = +hd.b; d = +hd.c;
    } else {
      y = +hd.c;
      if (y < 100) y += 2000;
      if (order === 'DMY') { d = +hd.a; mo = +hd.b; } else { mo = +hd.a; d = +hd.b; }
    }
    let hh = +hd.h;
    const mm = +hd.mi;
    const ss = hd.s ? +hd.s : 0;
    if (hd.ap) {
      const pm = hd.ap.toLowerCase().startsWith('p');
      if (pm && hh < 12) hh += 12;
      if (!pm && hh === 12) hh = 0;
    }
    const valid = mo >= 1 && mo <= 12 && d >= 1 && d <= 31 && hh <= 23 && mm <= 59 && ss <= 59;
    let ts;
    let date;
    let time;
    if (valid) {
      ts = Date.UTC(y, mo - 1, d, hh, mm, ss);
      const dt = new Date(ts);
      date = dt.toISOString().slice(0, 10);
      time = String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
      if (lastTs !== null && ts < lastTs) report.outOfOrderSteps++;
      lastTs = ts;
      lastDate = date;
      lastTime = time;
    } else {
      report.invalidTimestamps++;
      ts = lastTs;
      date = lastDate;
      time = lastTime;
    }
    if (date) {
      if (!report.firstDate || date < report.firstDate) report.firstDate = date;
      if (!report.lastDate || date > report.lastDate) report.lastDate = date;
    }

    // --- sender / type ---
    const split = splitSender(body, options.senders);
    const msg = { id: messages.length, ts, date, time, sender: '', text: '', type: 'text', edited: false, mediaFile: null };

    if (!split) {
      msg.type = 'system';
      msg.text = body.trim();
      report.systemMessages++;
    } else {
      msg.sender = split.sender;
      let t = split.text.replace(/\s+$/, '');
      if (t.endsWith(EDITED)) {
        t = t.slice(0, -EDITED.length).replace(/\s+$/, '');
        msg.edited = true;
        report.edited++;
      }
      const probe = t.trim();
      let m;
      if (DELETED.has(probe.toLowerCase())) {
        msg.type = 'deleted';
        report.deleted++;
      } else if (MEDIA_OMITTED.test(probe)) {
        msg.type = 'media';
        report.media++;
      } else if ((m = MEDIA_ATTACHED_IOS.exec(probe)) || (m = MEDIA_ATTACHED_ANDROID.exec(probe))) {
        msg.type = 'media';
        msg.mediaFile = m[1].trim();
        report.media++;
        report.mediaWithFile++;
      }
      msg.text = t;
      report.messages++;
      report.senders[split.sender] = (report.senders[split.sender] || 0) + 1;
    }
    messages.push(msg);
  }

  // --- self-checks ---
  const accounted = report.timestampedLines + report.continuationLines + report.leadingUnparsedLines;
  if (messages.length !== report.timestampedLines) {
    report.ok = false;
    report.problems.push('Message count does not match timestamped lines.');
  }
  if (accounted !== report.linesRead) {
    report.ok = false;
    report.problems.push('Line accounting mismatch.');
  }
  if (report.messages + report.systemMessages !== messages.length) {
    report.ok = false;
    report.problems.push('Message/system split does not add up.');
  }
  if (!messages.length) report.problems.push('No messages found. Is this a WhatsApp .txt export?');
  if (ambiguous && messages.length) report.problems.push('Date order is ambiguous (assumed MM/DD). Re-run with dateOrder: "DMY" if dates look wrong.');
  if (report.dateLikeContinuationLines > 0) report.problems.push(report.dateLikeContinuationLines + ' continuation line(s) start like a date. They may be messages in a format the parser missed.');
  if (report.leadingUnparsedLines > 0) report.problems.push(report.leadingUnparsedLines + ' line(s) before the first timestamp were ignored.');
  if (report.invalidTimestamps > 0) report.problems.push(report.invalidTimestamps + ' message(s) had an invalid date or time and reuse the previous valid one.');
  if (report.outOfOrderSteps > Math.max(5, messages.length * 0.001)) report.problems.push('Dates go backwards ' + report.outOfOrderSteps + ' times. The date order may be wrong.');

  return { messages, report };
}
