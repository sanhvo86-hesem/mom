import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const scanRoots = [
  '02-Tai-Lieu-He-Thong',
  '03-Tai-Lieu-Van-Hanh',
  '04-Bieu-Mau',
  '10-Training-Academy'
].map((p) => path.join(repoRoot, p));

const processRoots = [
  '02-Tai-Lieu-He-Thong',
  '03-Tai-Lieu-Van-Hanh',
  '04-Bieu-Mau',
  '10-Training-Academy'
].map((p) => path.join(repoRoot, p));

const excludedDirNames = new Set([
  '.git',
  '.claude',
  '_reports',
  'M365-SharePoint-Upload-Template',
  'M365-SharePoint-Upload-Template-CustomerScoped',
  'M365-SharePoint-Upload-Template-Operational',
  'assets',
  'php82',
  '__pycache__'
]);

const reportDir = path.join(repoRoot, '_reports');
const formControlRegister = path.join(
  repoRoot,
  '04-Bieu-Mau',
  '00-FORM-DESIGN-SYSTEM',
  'form-control-register.html'
);
const formSeriesAliases = [
  ['FRM-100', path.join(repoRoot, '04-Bieu-Mau', '01-FRM-100', 'index.html')],
  ['FRM-200', path.join(repoRoot, '04-Bieu-Mau', '02-FRM-200', 'index.html')],
  ['FRM-300', path.join(repoRoot, '04-Bieu-Mau', '03-FRM-300', 'index.html')],
  ['FRM-400', path.join(repoRoot, '04-Bieu-Mau', '04-FRM-400', 'index.html')],
  ['FRM-500', path.join(repoRoot, '04-Bieu-Mau', '05-FRM-500', 'index.html')],
  ['FRM-600', path.join(repoRoot, '04-Bieu-Mau', '06-FRM-600', 'index.html')],
  ['FRM-700', path.join(repoRoot, '04-Bieu-Mau', '07-FRM-700', 'index.html')],
  ['FRM-800', path.join(repoRoot, '04-Bieu-Mau', '08-FRM-800', 'index.html')],
  ['FRM-900', path.join(repoRoot, '04-Bieu-Mau', '09-FRM-900', 'index.html')]
];
const formCodeAliases = new Map([
  ['FRM-007', 'FRM-807']
]);

const docMap = new Map();
const htmlFiles = [];
const unresolvedByFile = new Map();
const replacementsByFile = new Map();

function walk(dir, fileHandler) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (excludedDirNames.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, fileHandler);
      continue;
    }
    fileHandler(fullPath);
  }
}

function addDocMap(code, fullPath, kind) {
  if (!docMap.has(code)) {
    docMap.set(code, { fullPath, kind });
    return;
  }

  // Prefer a native released form file over a fallback register anchor.
  const existing = docMap.get(code);
  if (existing.kind === 'form-fallback' && kind !== 'form-fallback') {
    docMap.set(code, { fullPath, kind });
  }
}

function scanForDocs(fullPath) {
  const fileName = path.basename(fullPath);
  const relative = path.relative(repoRoot, fullPath);
  const htmlMatch = fileName.match(/^(sop|wi|annex)-(\d{3})/i);
  if (htmlMatch && fullPath.toLowerCase().endsWith('.html')) {
    const code = `${htmlMatch[1].toUpperCase()}-${htmlMatch[2]}`;
    addDocMap(code, fullPath, htmlMatch[1].toLowerCase());
  }

  const formMatch = fileName.match(/^(FRM-\d{3})(?:[_\-.].*)?\.(xlsx|xlsm|xls|docx|pdf)$/i);
  if (formMatch) {
    addDocMap(formMatch[1].toUpperCase(), fullPath, 'form');
  }

  if (fullPath.toLowerCase().endsWith('.html')) {
    htmlFiles.push(fullPath);
  }
}

for (const root of scanRoots) {
  if (fs.existsSync(root)) {
    walk(root, scanForDocs);
  }
}

for (const [code, fullPath] of formSeriesAliases) {
  if (fs.existsSync(fullPath) && !docMap.has(code)) {
    addDocMap(code, fullPath, 'form-series');
  }
}

if (fs.existsSync(formControlRegister)) {
  const registerHtml = fs.readFileSync(formControlRegister, 'utf8');
  const ids = [...registerHtml.matchAll(/\bid="(FRM-\d{3})"/g)];
  for (const match of ids) {
    const code = match[1].toUpperCase();
    if (!docMap.has(code)) {
      addDocMap(code, `${formControlRegister}#${code}`, 'form-fallback');
    }
  }
}

for (const [aliasCode, targetCode] of formCodeAliases.entries()) {
  const target = docMap.get(targetCode);
  if (target && !docMap.has(aliasCode)) {
    addDocMap(aliasCode, target.fullPath, 'form-alias');
  }
}

function toRelativeHref(fromFile, targetPath) {
  const [filePath, hash = ''] = targetPath.split('#');
  let relative = path.relative(path.dirname(fromFile), filePath).replace(/\\/g, '/');
  if (!relative) relative = path.basename(filePath);
  return hash ? `${relative}#${hash}` : relative;
}

function resolveHref(fromFile, href) {
  const [hrefPath] = href.split('#');
  return path.resolve(path.dirname(fromFile), hrefPath.replace(/\//g, path.sep));
}

function isHtmlProcessTarget(fullPath) {
  if (!fullPath.toLowerCase().endsWith('.html')) return false;
  return processRoots.some((root) => fullPath.startsWith(root + path.sep) || fullPath === root);
}

function replaceCodesInText(text, currentFile) {
  return text.replace(/\b(?:SOP|WI|ANNEX|FRM)-\d{3}\b/g, (code) => {
    const target = docMap.get(code);
    if (!target) {
      if (!unresolvedByFile.has(currentFile)) unresolvedByFile.set(currentFile, new Set());
      unresolvedByFile.get(currentFile).add(code);
      return code;
    }

    const [targetFile, targetHash = ''] = target.fullPath.split('#');
    if (path.resolve(targetFile) === path.resolve(currentFile) && !targetHash) {
      return code;
    }

    const href = toRelativeHref(currentFile, target.fullPath);
    const anchor =
      target.kind === 'form'
        ? `<a download="" href="${href}">${code}</a>`
        : `<a href="${href}">${code}</a>`;

    replacementsByFile.set(currentFile, (replacementsByFile.get(currentFile) || 0) + 1);
    return anchor;
  });
}

function processHtml(fullPath) {
  const original = fs.readFileSync(fullPath, 'utf8');
  const parts = original.split(/(<[^>]+>)/g);
  let inAnchor = false;
  let inScript = false;
  let inStyle = false;
  let inTitle = false;
  let inCode = false;
  let inPre = false;
  let changed = false;
  const nextParts = [];

  for (const part of parts) {
    if (part.startsWith('<')) {
      const normalized = part.toLowerCase();
      if (/^<a\b/.test(normalized)) inAnchor = true;
      if (/^<\/a\b/.test(normalized)) inAnchor = false;
      if (/^<script\b/.test(normalized)) inScript = true;
      if (/^<\/script\b/.test(normalized)) inScript = false;
      if (/^<style\b/.test(normalized)) inStyle = true;
      if (/^<\/style\b/.test(normalized)) inStyle = false;
      if (/^<title\b/.test(normalized)) inTitle = true;
      if (/^<\/title\b/.test(normalized)) inTitle = false;
      if (/^<code\b/.test(normalized)) inCode = true;
      if (/^<\/code\b/.test(normalized)) inCode = false;
      if (/^<pre\b/.test(normalized)) inPre = true;
      if (/^<\/pre\b/.test(normalized)) inPre = false;
      nextParts.push(part);
      continue;
    }

    if (inAnchor || inScript || inStyle || inTitle || inCode || inPre || !part.trim()) {
      nextParts.push(part);
      continue;
    }

    const replaced = replaceCodesInText(part, fullPath);
    if (replaced !== part) changed = true;
    nextParts.push(replaced);
  }

  let output = nextParts.join('');
  output = output.replace(/<a\b([^>]*?)href="([^"#]+)"([^>]*)>((?:SOP|WI|ANNEX|FRM)-\d{3})<\/a>/g, (full, before, href, after, code) => {
    try {
      return path.resolve(resolveHref(fullPath, href)) === path.resolve(fullPath) ? code : full;
    } catch {
      return full;
    }
  });

  if (output !== original) {
    fs.writeFileSync(fullPath, output, 'utf8');
  }

  return output !== original;
}

const changedFiles = [];
for (const fullPath of htmlFiles) {
  if (!isHtmlProcessTarget(fullPath)) continue;
  if (processHtml(fullPath)) {
    changedFiles.push(fullPath);
  }
}

fs.mkdirSync(reportDir, { recursive: true });

const changedReportPath = path.join(reportDir, 'bulk-link-doc-codes-updated-files-20260325.txt');
const unresolvedReportPath = path.join(reportDir, 'bulk-link-doc-codes-unresolved-20260325.txt');
const summaryReportPath = path.join(reportDir, 'bulk-link-doc-codes-summary-20260325.txt');

fs.writeFileSync(changedReportPath, changedFiles.sort().join('\n'), 'utf8');

const unresolvedLines = [];
for (const [file, codes] of [...unresolvedByFile.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  unresolvedLines.push(`${file}: ${[...codes].sort().join(', ')}`);
}
fs.writeFileSync(unresolvedReportPath, unresolvedLines.join('\n'), 'utf8');

const replacementTotal = [...replacementsByFile.values()].reduce((sum, count) => sum + count, 0);
const summaryLines = [
  `changed_files=${changedFiles.length}`,
  `replacement_count=${replacementTotal}`,
  `unresolved_files=${unresolvedByFile.size}`,
  `doc_map_size=${docMap.size}`
];
fs.writeFileSync(summaryReportPath, summaryLines.join('\n'), 'utf8');

console.log(summaryLines.join('\n'));
