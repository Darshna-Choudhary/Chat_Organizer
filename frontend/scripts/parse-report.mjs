// Prints a parse report for a chat file. Never prints message text.
// Usage (keep your real chat OUTSIDE the repo folder):
//   npm run parse-report -- "/path/to/WhatsApp Chat.txt"
//   npm run parse-report -- "/path/to/chat.txt" --dayfirst
import { readFileSync } from 'node:fs';
import { parseChat } from '../src/parser/parseChat.js';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
if (!file) {
  console.error('Usage: npm run parse-report -- "<path to chat.txt>" [--dayfirst]');
  process.exit(1);
}
const dateOrder = args.includes('--dayfirst') ? 'DMY' : args.includes('--monthfirst') ? 'MDY' : 'auto';
const { report } = parseChat(readFileSync(file, 'utf8'), { dateOrder });

const { senders, problems, ...rest } = report;
console.log('--- Parse report ---');
for (const [k, v] of Object.entries(rest)) console.log(k.padEnd(26), v);
console.log('senders'.padEnd(26), Object.entries(senders).map(([n, c]) => `${n}: ${c}`).join(' | '));
console.log(problems.length ? '\nNotes:\n- ' + problems.join('\n- ') : '\nNo problems found.');
process.exit(report.ok ? 0 : 2);
