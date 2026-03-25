import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const REPORT_DIR = path.join(ROOT, '_reports');
const HTML_REPORT = path.join(REPORT_DIR, 'html_structure_audit.csv');
const DOMAIN_REPORT = path.join(REPORT_DIR, 'external_domains_audit.csv');
const EXCLUDED_SEGMENTS = [
  `${path.sep}tools${path.sep}php82${path.sep}`.toLowerCase(),
  `${path.sep}_reports${path.sep}`.toLowerCase(),
  `${path.sep}.git${path.sep}`.toLowerCase(),
  `${path.sep}node_modules${path.sep}`.toLowerCase()
];
const SAFE_DOMAINS = new Set([
  'hesem.com.vn',
  'www.hesem.com.vn'
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
    if (!entry.isFile() || isExcluded(full)) continue;
    if (path.extname(entry.name).toLowerCase() !== '.html') continue;
    out.push(full);
  }
}

function csvEscape(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function uniqueCount(values) {
  return new Set(values).size;
}

await fs.mkdir(REPORT_DIR, { recursive: true });

const files = [];
await walk(ROOT, files);

const htmlRows = [];
const domainRows = [];

for (const file of files) {
  let text = '';
  try {
    text = await fs.readFile(file, 'utf8');
  } catch {
    continue;
  }

  const hasCharset = /<meta[^>]+charset\s*=\s*["']?utf-8["']?/i.test(text);
  const hasLang = /<html[^>]+\blang\s*=\s*["'][^"']+["']/i.test(text);
  const hasViewport = /<meta[^>]+name\s*=\s*["']viewport["']/i.test(text);
  const suspiciousInject =
    /abn_style|gc\.kis\.v2\.scr\.kaspersky-labs\.com|marketgid\.com|runetki\.com|xlovecam\.com|sexcams\.plus/i.test(text);

  const ids = [...text.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
  const dupMap = new Map();
  for (const id of ids) dupMap.set(id, (dupMap.get(id) || 0) + 1);
  const dupIds = [...dupMap.entries()].filter(([, count]) => count > 1);

  if (!hasCharset || !hasLang || !hasViewport || suspiciousInject || dupIds.length > 0) {
    htmlRows.push({
      file,
      hasCharset,
      hasLang,
      hasViewport,
      suspiciousInject,
      idCount: ids.length,
      uniqueIdCount: uniqueCount(ids),
      duplicateIds: dupIds.map(([id, count]) => `${id}(${count})`).join('; ')
    });
  }

  const urlMatches = text.matchAll(/\b(?:href|src)\s*=\s*["'](https?:\/\/[^"']+)["']/gi);
  for (const match of urlMatches) {
    try {
      const url = new URL(match[1]);
      const domain = url.hostname.toLowerCase();
      if (SAFE_DOMAINS.has(domain)) continue;
      domainRows.push({ file, domain, url: match[1] });
    } catch {
      // ignore malformed URLs here; link audit covers local paths
    }
  }
}

await fs.writeFile(
  HTML_REPORT,
  [
    'File,HasCharsetUtf8,HasLang,HasViewport,SuspiciousInject,IdCount,UniqueIdCount,DuplicateIds',
    ...htmlRows.map((row) =>
      [
        csvEscape(row.file),
        row.hasCharset,
        row.hasLang,
        row.hasViewport,
        row.suspiciousInject,
        row.idCount,
        row.uniqueIdCount,
        csvEscape(row.duplicateIds)
      ].join(',')
    )
  ].join('\n') + '\n',
  'utf8'
);

const uniqDomainRows = [];
const seen = new Set();
for (const row of domainRows) {
  const key = `${row.file}__${row.domain}__${row.url}`;
  if (seen.has(key)) continue;
  seen.add(key);
  uniqDomainRows.push(row);
}

await fs.writeFile(
  DOMAIN_REPORT,
  [
    'File,Domain,Url',
    ...uniqDomainRows.map((row) =>
      [csvEscape(row.file), csvEscape(row.domain), csvEscape(row.url)].join(',')
    )
  ].join('\n') + '\n',
  'utf8'
);

console.log(`html_files=${files.length}`);
console.log(`html_findings=${htmlRows.length}`);
console.log(`external_domain_refs=${uniqDomainRows.length}`);
console.log(`html_report=${HTML_REPORT}`);
console.log(`domain_report=${DOMAIN_REPORT}`);
