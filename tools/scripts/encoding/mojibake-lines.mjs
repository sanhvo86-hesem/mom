import fs from 'node:fs/promises';
import path from 'node:path';

const targetArg = process.argv[2];
if (!targetArg) {
  console.error('Usage: node tools/mojibake-lines.mjs <file-or-directory>');
  process.exit(1);
}

const ROOT = process.cwd();
const target = path.resolve(ROOT, targetArg);
const BAD_SEQ_RE =
  /(?:\u00c3[\u0080-\u00bfA-Za-z]|Â[^\p{L}\p{N}]|Ä[\u0080-\u00bf]|\u00f0\u0178|á»|áº|ï»¿|�|â€|â€¢|â€“|â€”|â†|â˜|âœ|â•|â‹|â„|â€¦|â€˜|â€™|â€œ|â€|[\u0080-\u009f])/u;
const INCLUDE_EXT = new Set(['.html', '.js', '.css']);

async function walk(dir, out) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, out);
      continue;
    }
    if (entry.isFile() && INCLUDE_EXT.has(path.extname(entry.name).toLowerCase())) out.push(full);
  }
}

async function inspectFile(file) {
  let text = '';
  try {
    text = await fs.readFile(file, 'utf8');
  } catch {
    return;
  }
  const lines = text.split(/\r?\n/);
  let found = 0;
  for (let i = 0; i < lines.length; i++) {
    if (!BAD_SEQ_RE.test(lines[i])) continue;
    found++;
    console.log(`${file}:${i + 1}:${lines[i]}`);
  }
  if (found === 0) console.log(`${file}:0:(clean)`);
}

const stat = await fs.stat(target);
if (stat.isFile()) {
  await inspectFile(target);
} else {
  const files = [];
  await walk(target, files);
  for (const file of files) await inspectFile(file);
}
