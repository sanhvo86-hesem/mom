#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOTS = [
  "02-Tai-Lieu-He-Thong",
  "03-Tai-Lieu-Van-Hanh",
  "10-Training-Academy",
];

const TERMS = [
  "job",
  "job dossier",
  "job order",
  "job breakdown",
  "job traveler",
  "job instruction",
  "evidence",
  "owner",
  "checklist",
  "authority",
  "lead time",
  "aging",
  "contract review",
  "drill",
  "ship release",
  "ship packet",
  "ship confirm",
  "review pack",
  "position id",
  "first piece",
];

function walk(dir, files) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
      continue;
    }
    if (/\.html?$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }
}

function normalizeHtml(raw) {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function scanTerm(files, term) {
  let occurrences = 0;
  const matchedFiles = new Set();

  for (const file of files) {
    const text = normalizeHtml(fs.readFileSync(file, "utf8")).toLowerCase();
    let index = 0;

    while ((index = text.indexOf(term, index)) !== -1) {
      occurrences += 1;
      matchedFiles.add(file);
      index += term.length;
    }
  }

  return {
    term,
    occurrences,
    files: matchedFiles.size,
  };
}

const files = [];
for (const root of ROOTS) {
  walk(root, files);
}

const results = TERMS.map((term) => scanTerm(files, term));

console.log(JSON.stringify({ files_scanned: files.length, results }, null, 2));
