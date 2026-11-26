// Usage:
//   npm run pack-vault -- --source "<export .zip or folder>" --out ../vault-out [--config ../vault.config.json]
// Options: --iterations N (default 600000), --chunk-mb N (default 8), --force, --allow-weak
// Keep the config file and the output folder OUTSIDE the git repository.
import fs from 'node:fs/promises';
import path from 'node:path';
import { DEFAULT_ITERATIONS, DEFAULT_CHUNK, packVault, verifyVault } from './vault/pack.mjs';
import { checkPassphrase, promptHidden } from './vault/passphrase.mjs';

function parseArgs(argv) {
  const o = { force: false, 'allow-weak': false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--force' || a === '--allow-weak' || a === '--help') o[a.slice(2)] = true;
    else if (a.startsWith('--')) o[a.slice(2)] = argv[++i];
  }
  return o;
}

const args = parseArgs(process.argv.slice(2));
if (args.help || !args.source || !args.out) {
  console.log('Usage: npm run pack-vault -- --source "<export .zip or folder>" --out <empty folder> [--config vault.config.json] [--force] [--allow-weak]');
  process.exit(args.help ? 0 : 1);
}

const iterations = args.iterations ? Number(args.iterations) : DEFAULT_ITERATIONS;
if (!Number.isInteger(iterations) || iterations < 300_000) {
  console.error('--iterations must be a whole number of at least 300000.');
  process.exit(1);
}
const chunkSize = args['chunk-mb'] ? Math.round(Number(args['chunk-mb']) * 1024 * 1024) : DEFAULT_CHUNK;
if (!(chunkSize >= 1024 * 1024 && chunkSize <= 20 * 1024 * 1024)) {
  console.error('--chunk-mb must be between 1 and 20 (the host has a 25 MB per-file limit).');
  process.exit(1);
}

let config = {};
if (args.config) {
  try {
    config = JSON.parse(await fs.readFile(args.config, 'utf8'));
  } catch (err) {
    console.error('Could not read the config file:', err.message);
    process.exit(1);
  }
}

try {
  let phrase = process.env.VAULT_PASSPHRASE;
  if (!phrase) {
    phrase = await promptHidden('Passphrase (letters are hidden): ');
    const again = await promptHidden('Type it again: ');
    if (phrase !== again) throw new Error('The two entries do not match.');
  }
  const problems = checkPassphrase(phrase);
  if (problems.length) {
    console.error('\nThis passphrase is too easy to guess:\n - ' + problems.join('\n - '));
    if (!args['allow-weak']) {
      console.error('\nAnyone who finds the link can try guesses forever, so choose a longer, unusual phrase. (Override with --allow-weak.)');
      process.exit(1);
    }
    console.error('\nContinuing because of --allow-weak.');
  }

  const out = path.resolve(args.out);
  console.log('\nEncrypting. The key is slow to compute on purpose; a large export takes a few minutes.\n');
  const s = await packVault({ source: path.resolve(args.source), out, passphrase: phrase, config, iterations, chunkSize, force: args.force, log: (m) => console.log(m) });
  console.log('\nChecking that the vault opens with your passphrase...');
  const v = await verifyVault(out, phrase);

  const mb = (s.bytes / 1024 / 1024).toFixed(0);
  console.log(`
Done.
  Files written:      ${s.files.toLocaleString()} (about ${mb} MB) in ${out}
  Chat:               ${s.chat.messages.toLocaleString()} messages from ${s.chat.senders.join(', ')}
  Dates:              ${s.chat.firstDate} to ${s.chat.lastDate} (read as ${s.chat.dateOrder})
  Photos and files:   ${s.media.toLocaleString()} packed; ${s.matched.toLocaleString()} of ${s.referenced.toLocaleString()} used in the chat were found
  Check:              the vault opened, the chat text and ${v.mediaChecked} sample media files decrypted correctly`);
  if (s.missing.length) console.log(`  Not found (${s.missing.length}): ${s.missing.slice(0, 8).join(', ')}${s.missing.length > 8 ? ', ...' : ''}`);
  if (s.duplicates) console.log(`  Skipped ${s.duplicates} duplicate file name(s).`);
  console.log('\nNext: npm run build, then npm run assemble -- --vault "' + out + '"');
} catch (err) {
  console.error('\nCould not create the vault: ' + err.message);
  process.exit(1);
}
