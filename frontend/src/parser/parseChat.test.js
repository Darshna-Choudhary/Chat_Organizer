import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseChat } from './parseChat.js';

const sample = (name) =>
  readFileSync(fileURLToPath(new URL('../../../samples/' + name, import.meta.url)), 'utf8');

describe('Android format (MM/DD/YY, 12h, narrow no-break space)', () => {
  const { messages, report } = parseChat(sample('fake-android-mdy.txt'));

  it('keeps every timestamped line and the accounting adds up', () => {
    expect(report.ok).toBe(true);
    expect(messages.length).toBe(report.timestampedLines);
    expect(report.linesRead).toBe(report.timestampedLines + report.continuationLines + report.leadingUnparsedLines);
    expect(report.timestampedLines).toBe(12);
  });

  it('detects MM/DD from a value above 12', () => {
    expect(report.dateOrder).toBe('MDY');
    expect(messages[0].date).toBe('2024-11-18');
    expect(messages.at(-1).date).toBe('2024-11-19');
  });

  it('treats lines without a sender as system messages', () => {
    expect(messages[0].type).toBe('system');
    expect(messages[0].sender).toBe('');
    expect(messages.find((m) => m.text.includes('changed their phone number')).type).toBe('system');
    expect(report.systemMessages).toBe(2);
  });

  it('keeps multi-line messages together, including a date-like line inside', () => {
    const m = messages.find((x) => x.text.startsWith('first line'));
    expect(m.text).toBe('first line\nsecond line\n12/03/2025 was the day (date-like text inside a message)');
    expect(report.dateLikeContinuationLines).toBe(1);
  });

  it('keeps colons inside messages and "~" inside sender names', () => {
    const m = messages[2];
    expect(m.sender).toBe('Ravi ~ Test');
    expect(m.text).toBe('hi, reading this: it works');
  });

  it('flags edited, deleted and media messages', () => {
    const edited = messages.find((m) => m.text === 'edited message');
    expect(edited.edited).toBe(true);
    expect(messages.find((m) => m.type === 'deleted').sender).toBe('Asha');
    const omitted = messages.find((m) => m.type === 'media' && !m.mediaFile);
    expect(omitted).toBeTruthy();
    const attached = messages.find((m) => m.mediaFile);
    expect(attached.mediaFile).toBe('IMG-20241118-WA0003.jpg');
    expect(report.media).toBe(2);
    expect(report.mediaWithFile).toBe(1);
  });

  it('converts 12 AM and 12 PM correctly', () => {
    expect(messages.find((m) => m.text === 'midnight check').time).toBe('00:05');
    expect(messages.find((m) => m.text === 'noon check').time).toBe('12:30');
  });

  it('counts messages per sender', () => {
    expect(report.senders['Asha']).toBe(5);
    expect(report.senders['Ravi ~ Test']).toBe(5);
  });
});

describe('iPhone format ([DD/MM/YY, h:mm:ss PM], invisible marks)', () => {
  const { messages, report } = parseChat(sample('fake-iphone-dmy.txt'));

  it('parses bracketed lines with seconds and strips invisible characters', () => {
    expect(report.ok).toBe(true);
    expect(messages.length).toBe(4);
    expect(messages[0].text).toBe('Hello from a fake iPhone export');
  });

  it('detects DD/MM from a value above 12', () => {
    expect(report.dateOrder).toBe('DMY');
    expect(messages[0].date).toBe('2024-11-18');
    expect(messages[2].date).toBe('2024-11-19');
  });

  it('recognises iPhone attachments and omitted media', () => {
    expect(messages[1].type).toBe('media');
    expect(messages[1].mediaFile).toBe('00000012-PHOTO-2024-11-18-21-26-10.jpg');
    expect(messages[3].type).toBe('media');
    expect(messages[3].mediaFile).toBeNull();
  });

  it('joins multi-line messages', () => {
    expect(messages[2].text).toBe('multi\nline\nmessage');
  });
});

describe('date order handling', () => {
  // As DD/MM this runs 10, 11, 12 Nov then 1 Dec. As MM/DD it would jump back from Dec 2024 to Jan 2024.
  const chronological = [
    '10/11/24, 10:00 - A: one',
    '11/11/24, 10:00 - B: two',
    '12/11/24, 10:00 - A: three',
    '01/12/24, 10:00 - B: four',
  ].join('\n');

  it('uses chronology when no value exceeds 12', () => {
    const { report, messages } = parseChat(chronological);
    expect(report.dateOrder).toBe('DMY');
    expect(report.dateOrderMethod).toBe('chronology');
    expect(report.dateOrderAmbiguous).toBe(false);
    expect(messages[0].date).toBe('2024-11-10');
    expect(messages[3].date).toBe('2024-12-01');
  });

  it('flags a truly ambiguous file and defaults to MM/DD', () => {
    const { report } = parseChat('01/02/24, 10:00 - A: only one line');
    expect(report.dateOrder).toBe('MDY');
    expect(report.dateOrderAmbiguous).toBe(true);
    expect(report.problems.join(' ')).toContain('ambiguous');
  });

  it('honours a manual override', () => {
    const { report, messages } = parseChat('01/02/24, 10:00 - A: only one line', { dateOrder: 'DMY' });
    expect(report.dateOrder).toBe('DMY');
    expect(report.dateOrderMethod).toBe('manual');
    expect(messages[0].date).toBe('2024-02-01');
  });

  it('supports 24-hour times and year-first dates', () => {
    const { messages, report } = parseChat('2024/11/18, 21:05 - A: hi');
    expect(report.dateOrder).toBe('YMD');
    expect(messages[0].date).toBe('2024-11-18');
    expect(messages[0].time).toBe('21:05');
  });
});

describe('robustness', () => {
  it('ignores text before the first timestamp but reports it', () => {
    const { report, messages } = parseChat('junk line\n11/18/24, 9:25 PM - A: hi\n');
    expect(messages.length).toBe(1);
    expect(report.leadingUnparsedLines).toBe(1);
    expect(report.ok).toBe(true);
  });

  it('handles an empty or non-chat file without throwing', () => {
    expect(parseChat('').messages).toEqual([]);
    const r = parseChat('hello\nworld');
    expect(r.messages).toEqual([]);
    expect(r.report.problems.join(' ')).toContain('No messages found');
  });

  it('handles CRLF line endings and a BOM', () => {
    const { messages, report } = parseChat('\uFEFF11/18/24, 9:25 PM - A: hi\r\n11/18/24, 9:26 PM - B: yo\r\n');
    expect(messages.map((m) => m.sender)).toEqual(['A', 'B']);
    expect(report.ok).toBe(true);
  });

  it('keeps emoji and a sender name that contains a colon when senders are provided', () => {
    const { messages } = parseChat('11/18/24, 9:25 PM - Team: Alpha: hello 🎉', { senders: ['Team: Alpha'] });
    expect(messages[0].sender).toBe('Team: Alpha');
    expect(messages[0].text).toBe('hello 🎉');
  });

  it('never drops messages in a large chat', () => {
    const lines = [];
    for (let i = 0; i < 50000; i++) lines.push(`11/18/24, 9:25 PM - ${i % 2 ? 'A' : 'B'}: msg ${i}`);
    const { messages, report } = parseChat(lines.join('\n'));
    expect(messages.length).toBe(50000);
    expect(report.ok).toBe(true);
  });
});

describe('media captions (Android)', () => {
  it('splits a photo and its caption', () => {
    const t = '11/18/24, 9:25 PM - A: IMG-20241118-WA0001.jpg (file attached)\nlook at this\nsecond line\n11/18/24, 9:26 PM - B: nice';
    const { messages, report } = parseChat(t);
    expect(messages[0].type).toBe('media');
    expect(messages[0].mediaFile).toBe('IMG-20241118-WA0001.jpg');
    expect(messages[0].caption).toBe('look at this\nsecond line');
    expect(messages[1].type).toBe('text');
    expect(report.mediaWithFile).toBe(1);
    expect(report.ok).toBe(true);
  });

  it('leaves a photo without a caption as before', () => {
    const { messages } = parseChat('11/18/24, 9:25 PM - A: IMG-1.jpg (file attached)');
    expect(messages[0].mediaFile).toBe('IMG-1.jpg');
    expect(messages[0].caption).toBeUndefined();
  });
});
