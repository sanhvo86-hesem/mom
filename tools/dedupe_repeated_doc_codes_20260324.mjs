#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("C:/Users/TEST4/qms.hesem.com.vn");
const SKIP_DIRS = new Set([".git", "node_modules", "_build"]);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) {
        continue;
      }
      walk(path.join(dir, entry.name), files);
      continue;
    }
    if (/\.html?$/i.test(entry.name)) {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
}

function replaceWithCount(text, re, replacement) {
  let count = 0;
  const next = text.replace(re, (...args) => {
    count += 1;
    return typeof replacement === "function" ? replacement(...args) : replacement;
  });
  return { next, count };
}

const htmlFiles = walk(ROOT);
let changed = 0;
let total = 0;

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  let next = html;

  const dedupe = replaceWithCount(
    next,
    /((?:[A-Z]{2,}(?:-[A-Z0-9]+)+|FRM-\d{3}|SOP-\d{3}|WI-\d{3}|ANNEX-\d{3}|C\d{2}))\s*[—–-]\s*\1\s*[—–-]\s*/g,
    (_match, code) => `${code} — `
  );
  next = dedupe.next;
  total += dedupe.count;

  const ojt = replaceWithCount(
    next,
    /OJT-VAI\s*[—–-]\s*OJT-VAI TRÒ-INDEX\s*[—–-]\s*/g,
    "OJT-VAI TRÒ-INDEX — "
  );
  next = ojt.next;
  total += ojt.count;

  if (next !== html) {
    fs.writeFileSync(file, next, "utf8");
    changed += 1;
  }
}

console.log(`files changed: ${changed}`);
console.log(`total replacements: ${total}`);
