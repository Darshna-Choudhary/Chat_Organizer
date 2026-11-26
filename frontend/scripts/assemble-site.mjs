// Usage: npm run assemble -- --vault ../vault-out   (run `npm run build` first)
// Copies the encrypted vault into dist/vault and checks the host's limits.
import fs from 'node:fs/promises';
import path from 'node:path';

const MAX_FILE = 25 * 1024 * 1024; // Cloudflare Pages: 25 MiB per file
const MAX_FILES = 20000; // Cloudflare Pages: 20,000 files per site

const a = process.argv.slice(2);
const get = (flag, fallback) => (a.includes(flag) ? a[a.indexOf(flag) + 1] : fallback);
const vault = get('--vault');
const dist = path.resolve(get('--dist', 'dist'));

async function listFiles(dir) {
  const out = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await listFiles(full)));
    else out.push(full);
  }
  return out;
}

try {
  if (!vault) throw new Error('Pass the vault folder: --vault <folder>');
  await fs.access(path.join(dist, 'index.html')).catch(() => {
    throw new Error('dist/index.html is missing. Run "npm run build" first.');
  });
  await fs.access(path.join(vault, 'vault.json')).catch(() => {
    throw new Error('That folder has no vault.json. Run "npm run pack-vault" first.');
  });

  await fs.rm(path.join(dist, 'vault'), { recursive: true, force: true });
  await fs.cp(vault, path.join(dist, 'vault'), { recursive: true });

  const files = await listFiles(dist);
  let bytes = 0;
  const tooBig = [];
  for (const f of files) {
    const size = (await fs.stat(f)).size;
    bytes += size;
    if (size > MAX_FILE) tooBig.push(path.relative(dist, f));
  }
  if (tooBig.length) throw new Error(`These files are over the 25 MB limit: ${tooBig.slice(0, 5).join(', ')}. Re-run pack-vault with a smaller --chunk-mb.`);
  if (files.length > MAX_FILES) throw new Error(`The site has ${files.length} files; the limit is ${MAX_FILES}. Re-run pack-vault with a larger --chunk-mb.`);

  console.log(`Ready: ${files.length.toLocaleString()} files, ${(bytes / 1024 / 1024).toFixed(0)} MB in ${dist}`);
  console.log('Every file is under 25 MB and the file count is within the limit.');
  console.log('\nDeploy it (see docs/DEPLOY.md):\n  npx wrangler pages deploy dist --project-name <your-project-name>');
} catch (err) {
  console.error('Could not assemble the site: ' + err.message);
  process.exit(1);
}
