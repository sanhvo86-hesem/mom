#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DOC_ROOTS = [
  "mom/docs/operations/sops",
  "mom/docs/operations/work-instructions",
  "mom/docs/operations/references",
];

const EXCLUDED_BLOCK_PATTERNS = [
  /<script\b[\s\S]*?<\/script>/gi,
  /<style\b[\s\S]*?<\/style>/gi,
  /<code\b[\s\S]*?<\/code>/gi,
  /<pre\b[\s\S]*?<\/pre>/gi,
  /<a\b[\s\S]*?<\/a>/gi,
  /<div\b[^>]*class="dcc-header"[\s\S]*?<\/div>/gi,
  /<div\b[^>]*class='dcc-header'[\s\S]*?<\/div>/gi,
];

const STOPWORDS = new Set([
  "theo", "trong", "nghi", "thay", "danh", "khung", "gian", "giao", "tham", "sung",
  "truy", "chung", "nguy", "ranh", "xong", "sinh", "nhau", "cung", "quan", "doanh",
  "a/ch", "o/ch", "p/lo", "n/th", "c/tham", "i/kh", "xanh-v", "code/b", "target/ng",
  "ca/ng", "html", "head", "body", "class", "style", "script", "title", "link",
  "meta", "href", "src", "https", "http", "owner", "appr", "rev", "eff", "portal",
  "annex", "sop", "wi", "frm", "jd", "qa", "ceo", "qms", "ppl", "scm", "hr", "fin",
  "ehs", "ita", "esa", "wkm", "engm", "mcs", "pur", "ops", "erp", "kpi", "wip", "sla",
  "otd", "fai", "iqc", "ipqc", "oqc", "spc", "cmm", "capa", "ncr", "rfq", "fifo",
  "apqp", "fmea", "ctq", "coc", "coa", "grr", "dso", "mrr", "lam", "semsysco",
]);

function walk(dir, files) {
  if (!fs.existsSync(dir)) {
    return;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (/\.html$/i.test(entry.name)) {
      files.push(full);
    }
  }
}

function shieldBlocks(html) {
  let next = html;
  for (const pattern of EXCLUDED_BLOCK_PATTERNS) {
    next = next.replace(pattern, " ");
  }
  return next;
}

function normalizeText(html) {
  return shieldBlocks(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

const files = [];
for (const root of DOC_ROOTS) {
  walk(path.join(ROOT, root), files);
}

const flagged = [];
for (const file of files) {
  const text = normalizeText(fs.readFileSync(file, "utf8"));
  const tokens = text.match(/\b[A-Za-z][A-Za-z0-9_./+-]*\b/g) || [];
  const leftovers = [...new Set(tokens.filter((token) => {
    const word = token.toLowerCase();
    if (word.length < 4) {
      return false;
    }
    if (STOPWORDS.has(word)) {
      return false;
    }
    if (/^[A-Z0-9_./-]+$/.test(token) && token.length <= 8) {
      return false;
    }
    return true;
  }))];
  if (leftovers.length > 0) {
    flagged.push({
      file: path.relative(ROOT, file).replace(/\\/g, "/"),
      count: leftovers.length,
      sample: leftovers.slice(0, 30),
    });
  }
}

flagged.sort((a, b) => b.count - a.count);

console.log(JSON.stringify({
  scanned_files: files.length,
  flagged_files: flagged.length,
  top_files: flagged.slice(0, 50),
}, null, 2));
