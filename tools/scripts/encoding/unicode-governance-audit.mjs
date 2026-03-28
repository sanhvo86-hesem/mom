import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const now = new Date();
const dateStamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

const TARGETS = [
  '01-QMS-Portal',
  '02-Tai-Lieu-He-Thong',
  '03-Tai-Lieu-Van-Hanh',
  '04-Bieu-Mau',
  '10-Training-Academy',
  '11-Glossary',
  'core-standards',
  'assets',
  'general_note.md',
  'rule_update_content.md',
  'index.html',
  'index.php'
];

const INCLUDE_EXT = new Set(['.html', '.md', '.js', '.css', '.php', '.json', '.txt', '.svg']);

const EXCLUDED_SEGMENTS = [
  `${path.sep}.git${path.sep}`.toLowerCase(),
  `${path.sep}.claude${path.sep}`.toLowerCase(),
  `${path.sep}.vscode${path.sep}`.toLowerCase(),
  `${path.sep}node_modules${path.sep}`.toLowerCase(),
  `${path.sep}_build${path.sep}`.toLowerCase(),
  `${path.sep}_reports${path.sep}`.toLowerCase(),
  `${path.sep}_Deleted${path.sep}`.toLowerCase(),
  `${path.sep}__pycache__${path.sep}`.toLowerCase(),
  `${path.sep}tools${path.sep}php82${path.sep}`.toLowerCase()
];

const BAD_SEQ_RE =
  /(?:\u00c3[\u0080-\u00bfA-Za-z]|Â[^\p{L}\p{N}]|Ã‚[^\p{L}\p{N}]|Ã„[\u0080-\u00bf]|Ä[\u0080-\u00bf]|ÃƒÂ|Ã¡Â»|Ã¡Âº|Ã¢â‚¬|Ã¢â‚¬Â¢|Ã¢â‚¬â€œ|Ã¢â‚¬â€|Ã¢â‚¬Ëœ|Ã¢â‚¬â„¢|Ã¢â‚¬Å“|Ã¢â‚¬Â|Ã¯Â»Â¿|ï»¿|�|â€|â€™|â€œ|â€|â€“|â€”|áº|á»)/gu;
const BAD_SEQ_TEST_RE =
  /(?:\u00c3[\u0080-\u00bfA-Za-z]|Â[^\p{L}\p{N}]|Ã‚[^\p{L}\p{N}]|Ã„[\u0080-\u00bf]|Ä[\u0080-\u00bf]|ÃƒÂ|Ã¡Â»|Ã¡Âº|Ã¢â‚¬|Ã¢â‚¬Â¢|Ã¢â‚¬â€œ|Ã¢â‚¬â€|Ã¢â‚¬Ëœ|Ã¢â‚¬â„¢|Ã¢â‚¬Å“|Ã¢â‚¬Â|Ã¯Â»Â¿|ï»¿|�|â€|â€™|â€œ|â€|â€“|â€”|áº|á»)/u;
const C1_RE = /[\u0080-\u009f]/g;
const C1_TEST_RE = /[\u0080-\u009f]/;
const REPLACEMENT_RE = /\uFFFD/g;
const BOM_AT_START_RE = /^\uFEFF/u;

function csvEscape(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function mdEscapeCell(value) {
  return String(value).replace(/\|/g, '\\|');
}

function isExcluded(fullPath) {
  const normalized = fullPath.toLowerCase();
  return EXCLUDED_SEGMENTS.some((seg) => normalized.includes(seg));
}

function classifyText(text) {
  if (/ÃƒÂ|Ã¡Â»|Ã¡Âº|Ã¢â‚¬|Ã¯Â»Â¿/.test(text)) return 'double-encoded';
  if (REPLACEMENT_RE.test(text) || C1_TEST_RE.test(text)) return 'replacement-or-control';
  return 'single-encoded';
}

function markerStats(text) {
  return {
    badSeq: (text.match(BAD_SEQ_RE) || []).length,
    c1: (text.match(C1_RE) || []).length,
    replacement: (text.match(REPLACEMENT_RE) || []).length,
    bomStart: BOM_AT_START_RE.test(text) ? 1 : 0
  };
}

function topClusterFromFile(relPath) {
  const norm = relPath.replace(/\\/g, '/');
  const first = norm.split('/')[0];
  return first || '(root)';
}

async function walkTarget(absPath, outFiles) {
  const st = await fs.stat(absPath);
  if (st.isFile()) {
    const ext = path.extname(absPath).toLowerCase();
    if (INCLUDE_EXT.has(ext) && !isExcluded(absPath)) outFiles.push(absPath);
    return;
  }
  const entries = await fs.readdir(absPath, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(absPath, entry.name);
    if (isExcluded(full + (entry.isDirectory() ? path.sep : ''))) continue;
    if (entry.isDirectory()) {
      await walkTarget(full, outFiles);
      continue;
    }
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (INCLUDE_EXT.has(ext)) outFiles.push(full);
  }
}

async function collectFiles() {
  const files = [];
  for (const target of TARGETS) {
    const abs = path.join(ROOT, target);
    try {
      await walkTarget(abs, files);
    } catch {
      // ignore missing targets to keep script resilient
    }
  }
  files.sort((a, b) => a.localeCompare(b));
  return files;
}

function buildRepairBundles(clusterRows) {
  const bundleDefs = [
    {
      id: 'B1-portal-runtime-and-generator',
      scopeMatch: (cluster) => cluster === '01-QMS-Portal',
      strategy:
        'Sửa literal nguồn trong portal/API về UTF-8 chuẩn; khóa đường tạo tài liệu mới; bỏ dần hàm fix runtime cp1252/latin1.'
    },
    {
      id: 'B2-core-standards-and-guides',
      scopeMatch: (cluster) => cluster === 'core-standards',
      strategy:
        'Chuẩn hóa toàn bộ markdown chuẩn vận hành sang UTF-8 NFC; cập nhật rule bắt buộc và checklist pre-merge.'
    },
    {
      id: 'B3-operational-documents',
      scopeMatch: (cluster) =>
        cluster === '02-Tai-Lieu-He-Thong' ||
        cluster === '03-Tai-Lieu-Van-Hanh' ||
        cluster === '04-Bieu-Mau' ||
        cluster === '10-Training-Academy' ||
        cluster === '11-Glossary',
      strategy:
        'Sửa theo batch bằng script canonical decoder có ngưỡng an toàn, chạy validate diff + render smoke test theo nhóm tài liệu.'
    },
    {
      id: 'B4-root-shared-assets',
      scopeMatch: (cluster) => cluster === 'assets' || cluster === '(root)',
      strategy:
        'Chuẩn hóa file dùng chung; chạy kiểm tra BOM, C1 controls và replacement char trước khi phát hành.'
    }
  ];

  const bundles = [];
  for (const def of bundleDefs) {
    const matched = clusterRows.filter((row) => def.scopeMatch(row.cluster));
    if (!matched.length) continue;
    const files = matched.reduce((acc, row) => acc + row.files, 0);
    const markers = matched.reduce((acc, row) => acc + row.markers, 0);
    bundles.push({
      id: def.id,
      files,
      markers,
      strategy: def.strategy
    });
  }
  return bundles;
}

function summarizeRootCause(fileRows) {
  let double = 0;
  let single = 0;
  let replacementOrControl = 0;
  for (const row of fileRows) {
    if (row.classification === 'double-encoded') double++;
    else if (row.classification === 'replacement-or-control') replacementOrControl++;
    else single++;
  }
  return { double, single, replacementOrControl };
}

async function main() {
  const files = await collectFiles();
  const fileRows = [];
  const lineRows = [];

  for (const file of files) {
    let text = '';
    try {
      text = await fs.readFile(file, 'utf8');
    } catch {
      continue;
    }
    const stats = markerStats(text);
    const markers = stats.badSeq + stats.c1 + stats.replacement + stats.bomStart;
    if (markers <= 0) continue;

    const relPath = path.relative(ROOT, file);
    const lines = text.split(/\r?\n/);
    let matchedLineCount = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!(BAD_SEQ_TEST_RE.test(line) || C1_TEST_RE.test(line))) continue;
      matchedLineCount++;
      const lineStats = markerStats(line);
      const lineMarkers = lineStats.badSeq + lineStats.c1 + lineStats.replacement + lineStats.bomStart;
      lineRows.push({
        file: relPath,
        line: i + 1,
        classification: classifyText(line),
        markers: lineMarkers,
        snippet: line.trim().slice(0, 280)
      });
    }

    fileRows.push({
      file: relPath,
      cluster: topClusterFromFile(relPath),
      classification: classifyText(text),
      markers,
      badSeq: stats.badSeq,
      c1: stats.c1,
      replacement: stats.replacement,
      bomStart: stats.bomStart,
      lineHits: matchedLineCount
    });
  }

  fileRows.sort((a, b) => b.markers - a.markers || a.file.localeCompare(b.file));
  lineRows.sort((a, b) => b.markers - a.markers || a.file.localeCompare(b.file) || a.line - b.line);

  const clusterMap = new Map();
  for (const row of fileRows) {
    const key = `${row.cluster}||${row.classification}`;
    const current = clusterMap.get(key) || { cluster: row.cluster, classification: row.classification, files: 0, markers: 0 };
    current.files += 1;
    current.markers += row.markers;
    clusterMap.set(key, current);
  }
  const clusterRows = [...clusterMap.values()].sort((a, b) => b.markers - a.markers || b.files - a.files);

  const bundles = buildRepairBundles(clusterRows);
  const rootCauseStats = summarizeRootCause(fileRows);

  const reportDir = path.join(ROOT, '_reports', 'encoding');
  await fs.mkdir(reportDir, { recursive: true });

  const filesCsvPath = path.join(reportDir, `unicode-audit-${dateStamp}-files.csv`);
  const linesCsvPath = path.join(reportDir, `unicode-audit-${dateStamp}-lines.csv`);
  const summaryMdPath = path.join(reportDir, `unicode-audit-${dateStamp}-summary.md`);

  const filesCsvHeader = 'File,Cluster,Classification,Markers,BadSeq,C1,Replacement,BOMStart,LineHits';
  const filesCsvBody = fileRows
    .map((row) =>
      [
        csvEscape(row.file),
        csvEscape(row.cluster),
        csvEscape(row.classification),
        row.markers,
        row.badSeq,
        row.c1,
        row.replacement,
        row.bomStart,
        row.lineHits
      ].join(',')
    )
    .join('\n');
  await fs.writeFile(filesCsvPath, `${filesCsvHeader}\n${filesCsvBody}\n`, 'utf8');

  const linesCsvHeader = 'File,Line,Classification,Markers,Snippet';
  const linesCsvBody = lineRows
    .map((row) =>
      [
        csvEscape(row.file),
        row.line,
        csvEscape(row.classification),
        row.markers,
        csvEscape(row.snippet)
      ].join(',')
    )
    .join('\n');
  await fs.writeFile(linesCsvPath, `${linesCsvHeader}\n${linesCsvBody}\n`, 'utf8');

  const totalMarkers = fileRows.reduce((acc, row) => acc + row.markers, 0);
  const totalLineHits = fileRows.reduce((acc, row) => acc + row.lineHits, 0);
  const topFiles = fileRows.slice(0, 25);

  const summaryLines = [
    `# Unicode Encoding Governance Audit - ${dateStamp}`,
    '',
    '## Scope',
    '- Sources scanned: `01-QMS-Portal`, `02-Tai-Lieu-He-Thong`, `03-Tai-Lieu-Van-Hanh`, `04-Bieu-Mau`, `10-Training-Academy`, `11-Glossary`, `core-standards`, `assets`, root docs.',
    '- Extensions: `.html`, `.md`, `.js`, `.css`, `.php`, `.json`, `.txt`, `.svg`.',
    '- Excluded: `.git`, `.claude`, `node_modules`, `_build`, `_reports`, `_Deleted`, `tools/php82`.',
    '',
    '## Snapshot',
    `- Files scanned: **${files.length}**`,
    `- Files with encoding residue: **${fileRows.length}**`,
    `- Total marker hits: **${totalMarkers}**`,
    `- Total line-level patch points: **${totalLineHits}**`,
    '',
    '## Root-Cause Signal Mix',
    `- Double-encoded mojibake files: **${rootCauseStats.double}**`,
    `- Single-encoded mojibake files: **${rootCauseStats.single}**`,
    `- Replacement/control leakage files: **${rootCauseStats.replacementOrControl}**`,
    '',
    '## Cluster Inventory (All Patch-Point Clusters)',
    '| Cluster | Class | Files | Markers |',
    '|---|---:|---:|---:|',
    ...clusterRows.map((row) => `| ${mdEscapeCell(row.cluster)} | ${row.classification} | ${row.files} | ${row.markers} |`),
    '',
    '## Top Affected Files',
    '| File | Class | Markers | Line Hits |',
    '|---|---:|---:|---:|',
    ...topFiles.map((row) => `| ${mdEscapeCell(row.file)} | ${row.classification} | ${row.markers} | ${row.lineHits} |`),
    '',
    '## Bundle Remediation Plan (Fast + Low Risk)',
    '| Bundle | Files | Markers | Strategy |',
    '|---|---:|---:|---|',
    ...bundles.map((b) => `| ${b.id} | ${b.files} | ${b.markers} | ${b.strategy} |`),
    '',
    '## Artifacts',
    `- File-level inventory: \`${path.relative(ROOT, filesCsvPath).replace(/\\/g, '/')}\``,
    `- Line-level patch points: \`${path.relative(ROOT, linesCsvPath).replace(/\\/g, '/')}\``,
    '',
    '## Immediate Governance Actions',
    '1. Stop-the-bleed: khóa đường tạo nội dung mới nếu file không đạt UTF-8/NFC gate.',
    '2. Remove patchwork: loại bỏ dần runtime decode latin1/cp1252 sau khi bundle B1 được canonicalize.',
    '3. Batch repair by cluster: triển khai B2 -> B1 -> B3 -> B4, mỗi bundle đều có smoke-test render.',
    '4. Enforce forever: đưa audit script vào pipeline kiểm tra trước khi merge/publish.'
  ];

  await fs.writeFile(summaryMdPath, `${summaryLines.join('\n')}\n`, 'utf8');

  console.log(`files_scanned=${files.length}`);
  console.log(`files_with_residue=${fileRows.length}`);
  console.log(`markers_total=${totalMarkers}`);
  console.log(`line_patch_points=${totalLineHits}`);
  console.log(`report_files=${filesCsvPath}`);
  console.log(`report_lines=${linesCsvPath}`);
  console.log(`report_summary=${summaryMdPath}`);
  for (const row of topFiles.slice(0, 15)) {
    console.log(`${row.markers}\t${row.classification}\t${row.file}`);
  }
}

await main();
