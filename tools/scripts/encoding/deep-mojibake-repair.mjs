import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const REPORT_PATH = path.join(ROOT, '_reports', 'encoding_autofix_round2.csv');
const INCLUDE_EXT = new Set(['.html', '.js', '.css']);
const EXCLUDED_SEGMENTS = [
  `${path.sep}tools${path.sep}php82${path.sep}`.toLowerCase(),
  `${path.sep}_reports${path.sep}`.toLowerCase(),
  `${path.sep}.git${path.sep}`.toLowerCase(),
  `${path.sep}node_modules${path.sep}`.toLowerCase()
];

const BAD_SEQ_RE =
  /(?:Ã[\u0080-\u00bfA-Za-z]|Â[^\p{L}\p{N}]|Ä[\u0080-\u00bf]|ðŸ|á»|áº|ï»¿|�|â€|â€¢|â€“|â€”|â†|â˜|âœ|â•|â‹|â„|â€¦|â€˜|â€™|â€œ|â€)/gu;
const BAD_SEQ_TEST_RE =
  /(?:Ã[\u0080-\u00bfA-Za-z]|Â[^\p{L}\p{N}]|Ä[\u0080-\u00bf]|ðŸ|á»|áº|ï»¿|�|â€|â€¢|â€“|â€”|â†|â˜|âœ|â•|â‹|â„|â€¦|â€˜|â€™|â€œ|â€)/u;
const VIET_RE = /[\u0102\u0103\u00C2\u00E2\u00CA\u00EA\u00D4\u00F4\u01A0\u01A1\u01AF\u01B0\u0110\u0111\u1EA0-\u1EF9]/g;
const DELIM_RE = /^([ \t\r\n]+|[<>"'=])$/;

const utf8DecoderFatal = new TextDecoder('utf-8', { fatal: true });
const CP1252_EXT = new Map([
  [0x20ac, 0x80],
  [0x201a, 0x82],
  [0x0192, 0x83],
  [0x201e, 0x84],
  [0x2026, 0x85],
  [0x2020, 0x86],
  [0x2021, 0x87],
  [0x02c6, 0x88],
  [0x2030, 0x89],
  [0x0160, 0x8a],
  [0x2039, 0x8b],
  [0x0152, 0x8c],
  [0x017d, 0x8e],
  [0x2018, 0x91],
  [0x2019, 0x92],
  [0x201c, 0x93],
  [0x201d, 0x94],
  [0x2022, 0x95],
  [0x2013, 0x96],
  [0x2014, 0x97],
  [0x02dc, 0x98],
  [0x2122, 0x99],
  [0x0161, 0x9a],
  [0x203a, 0x9b],
  [0x0153, 0x9c],
  [0x017e, 0x9e],
  [0x0178, 0x9f]
]);

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
    const ext = path.extname(entry.name).toLowerCase();
    if (INCLUDE_EXT.has(ext)) out.push(full);
  }
}

function markerCount(s) {
  let bad = (s.match(BAD_SEQ_RE) || []).length;
  bad += (s.match(/[\u0080-\u009f]/g) || []).length;
  return bad;
}

function vietCount(s) {
  return (s.match(VIET_RE) || []).length;
}

function encodeAsWindows1252Bytes(str) {
  const out = [];
  for (const ch of str) {
    const cp = ch.codePointAt(0);
    if (cp <= 0xff) {
      out.push(cp);
      continue;
    }
    if (CP1252_EXT.has(cp)) {
      out.push(CP1252_EXT.get(cp));
      continue;
    }
    return null;
  }
  return Uint8Array.from(out);
}

function decodeOnePass(str) {
  const bytes = encodeAsWindows1252Bytes(str);
  if (!bytes) return null;
  try {
    return utf8DecoderFatal.decode(bytes);
  } catch {
    return null;
  }
}

function isBetterCandidate(src, cand) {
  if (!cand || cand === src) return false;
  if (cand.includes('\uFFFD')) return false;
  const srcMarkers = markerCount(src);
  const candMarkers = markerCount(cand);
  if (candMarkers < srcMarkers) return true;
  if (candMarkers > srcMarkers) return false;
  return vietCount(cand) > vietCount(src);
}

function decodeIterative(str, maxPasses = 3) {
  let cur = str;
  for (let i = 0; i < maxPasses; i++) {
    const next = decodeOnePass(cur);
    if (!next || next === cur) break;
    if (!isBetterCandidate(cur, next)) break;
    cur = next;
  }
  return cur;
}

function fixLine(line) {
  if (!BAD_SEQ_TEST_RE.test(line)) return line;
  const parts = line.split(/([ \t\r\n]+|[<>"'=])/);
  let changed = false;
  for (let i = 0; i < parts.length; i++) {
    const token = parts[i];
    if (!token || DELIM_RE.test(token)) continue;
    if (!BAD_SEQ_TEST_RE.test(token)) continue;
    const fixed = decodeIterative(token);
    if (fixed !== token) {
      parts[i] = fixed;
      changed = true;
    }
  }
  let out = changed ? parts.join('') : line;
  if (BAD_SEQ_TEST_RE.test(out)) {
    const lineCandidate = decodeIterative(out);
    if (lineCandidate !== out && isBetterCandidate(out, lineCandidate)) {
      out = lineCandidate;
    }
  }
  return out;
}

function csvEscape(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

async function main() {
  const files = [];
  await walk(ROOT, files);

  let touchedFiles = 0;
  let touchedLines = 0;
  let markersBeforeAll = 0;
  let markersAfterAll = 0;
  const reportRows = [];

  for (const file of files) {
    let raw;
    try {
      raw = await fs.readFile(file, 'utf8');
    } catch {
      continue;
    }
    const beforeMarkers = markerCount(raw);
    if (beforeMarkers === 0) continue;
    const beforeViet = vietCount(raw);
    const eol = raw.includes('\r\n') ? '\r\n' : '\n';
    const hasFinalNewline = /\r?\n$/.test(raw);
    const lines = raw.split(/\r?\n/);
    let changedLines = 0;
    const fixedLines = lines.map((line) => {
      const fixed = fixLine(line);
      if (fixed !== line) changedLines++;
      return fixed;
    });
    let next = fixedLines.join(eol);
    if (hasFinalNewline && !next.endsWith(eol)) next += eol;
    const afterMarkers = markerCount(next);
    const afterViet = vietCount(next);
    const improved =
      next !== raw &&
      (afterMarkers < beforeMarkers ||
        (afterMarkers === beforeMarkers && afterViet > beforeViet));
    if (!improved) continue;
    await fs.writeFile(file, next, 'utf8');
    touchedFiles++;
    touchedLines += changedLines;
    markersBeforeAll += beforeMarkers;
    markersAfterAll += afterMarkers;
    reportRows.push({
      file,
      changedLines,
      beforeMarkers,
      afterMarkers,
      beforeViet,
      afterViet
    });
  }

  await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
  const header = [
    'File',
    'ChangedLines',
    'BeforeMarkers',
    'AfterMarkers',
    'BeforeViet',
    'AfterViet'
  ].join(',');
  const body = reportRows
    .map((r) =>
      [
        csvEscape(r.file),
        r.changedLines,
        r.beforeMarkers,
        r.afterMarkers,
        r.beforeViet,
        r.afterViet
      ].join(',')
    )
    .join('\n');
  await fs.writeFile(REPORT_PATH, `${header}\n${body}\n`, 'utf8');

  console.log(`files_scanned=${files.length}`);
  console.log(`files_touched=${touchedFiles}`);
  console.log(`lines_touched=${touchedLines}`);
  console.log(`markers_before=${markersBeforeAll}`);
  console.log(`markers_after=${markersAfterAll}`);
  console.log(`report=${REPORT_PATH}`);
}

await main();
