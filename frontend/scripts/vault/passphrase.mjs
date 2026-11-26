// Passphrase rules and a hidden-input prompt for the packer.
import { normalizePassphrase } from '../../src/vault/crypto.js';

const COMMON = ['password', 'iloveyou', 'i love you', '123456', 'qwerty', 'letmein', 'happy anniversary', 'happy birthday'];

// -> list of problems; empty means the phrase is long and unusual enough.
export function checkPassphrase(phrase) {
  const p = normalizePassphrase(phrase);
  const problems = [];
  const words = p ? p.split(' ').length : 0;
  if (p.length < 20) problems.push(`It is only ${p.length} characters. Use at least 20.`);
  if (words < 4) problems.push(`It has ${words} word${words === 1 ? '' : 's'}. Use at least 4, like a short sentence.`);
  if (/\d{1,2}\s*[/.\-]\s*\d{1,2}\s*[/.\-]\s*\d{2,4}/.test(p) || /^\d+$/.test(p.replace(/\s/g, ''))) problems.push('It looks like a date or a number. Those are easy to guess.');
  if (/^(.)\1+$/.test(p.replace(/\s/g, ''))) problems.push('It repeats one character.');
  if (COMMON.some((c) => p === c)) problems.push('It is a very common phrase.');
  return problems;
}

export function promptHidden(question) {
  return new Promise((resolve, reject) => {
    const { stdin, stdout } = process;
    if (!stdin.isTTY) return reject(new Error('A terminal is needed to type the passphrase safely (or set VAULT_PASSPHRASE).'));
    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let value = '';
    const done = (fn, arg) => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener('data', onData);
      stdout.write('\n');
      fn(arg);
    };
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') return done(resolve, value);
        if (ch === '\u0003') return done(reject, new Error('Cancelled.'));
        if (ch === '\u007f' || ch === '\b') value = value.slice(0, -1);
        else value += ch;
      }
    };
    stdin.on('data', onData);
  });
}
