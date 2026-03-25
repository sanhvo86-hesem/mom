import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const REPORT_PATH = path.join(ROOT, '_reports', 'mojibake_after_round2_true_top.csv');
const INCLUDE_EXT = new Set(['.html', '.js', '.css']);
const EXCLUDED_SEGMENTS = [
  `${path.sep}tools${path.sep}php82${path.sep}`.toLowerCase(),
  `${path.sep}_reports${path.sep}`.toLowerCase(),
  `${path.sep}.git${path.sep}`.toLowerCase(),
  `${path.sep}node_modules${path.sep}`.toLowerCase()
];

const BAD_SEQ_RE =
  /(?:Ã[\u0080-\u00bfA-Za-z]|Â[^\p{L}\p{N}]|Ä[\u0080-\u00bf]|ðŸ|á»|áº|ï»¿|�|â€|â€¢|â€“|â€”|â†|â˜|âœ|â•|â‹|â„|â€¦|â€˜|â€™|â€œ|â€)/gu;
const C1_RE = /[\u0080-\u009f]/g;

function isExcluded(fullPath) {
  const normalized = fullPath.toLowerCase();
  return EXCLUDED_SEGMENTS.some((seg) => normalized.includes(seg));
}

async function walk(dir, out) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!isExcluded(full + path.sep)) await walk(full, out);
      continue;
    }
    if (!entry.isFile()) continue;
    if (isExcluded(full)) continue;
    if (!INCLUDE_EXT.has(path.extname(entry.name).toLowerCase())) continue;
    out.push(full);
  }
}

function csvEscape(v) {
  return `"${String(v).replace(/"/g, '""')}"`;
}

async function main() {
  const files = [];
  await walk(ROOT, files);
  const rows = [];
  let total = 0;

  for (const file of files) {
    let text = '';
    try {
      text = await fs.readFile(file, 'utf8');
    } catch {
      continue;
    }
    const count = (text.match(BAD_SEQ_RE) || []).length + (text.match(C1_RE) || []).length;
    if (count <= 0) continue;
    rows.push({ file, count });
    total += count;
  }
  rows.sort((a, b) => b.count - a.count);

  await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
  const header = 'File,Count';
  const body = rows.map((r) => `${csvEscape(r.file)},${r.count}`).join('\n');
  await fs.writeFile(REPORT_PATH, `${header}\n${body}\n`, 'utf8');

  console.log(`files_scanned=${files.length}`);
  console.log(`files_with_mojibake=${rows.length}`);
  console.log(`mojibake_total=${total}`);
  console.log(`report=${REPORT_PATH}`);
  for (const row of rows.slice(0, 20)) {
    console.log(`${row.count}\t${row.file}`);
  }
}

await main();
