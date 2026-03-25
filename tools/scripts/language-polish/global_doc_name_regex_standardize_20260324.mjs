#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("C:/Users/TEST4/qms.hesem.com.vn");

const regexReplacements = [
  { re: /ANNEX-101\s*(?:—\s*[^<\n|]+|Role-Based Access Map)/g, to: "ANNEX-101 — Role-Based Access Map" },
  { re: /ANNEX-113\s*—\s*[^<\n|]+/g, to: "ANNEX-113 — Dashboard Deployment, Access and Refresh Control" },
  { re: /ANNEX-115\s*—\s*[^<\n|]+/g, to: "ANNEX-115 — Epicor Transaction and Interface Map" },
  { re: /ANNEX-118\s*(?:—\s*[^<\n|]+|Offline Fallback Kit)/g, to: "ANNEX-118 — Offline Fallback Kit" },
  { re: /ANNEX-120\s*—\s*[^<\n|]+/g, to: "ANNEX-120 — Authority Matrix" },
  { re: /ANNEX-121\s*—\s*[^<\n|]+/g, to: "ANNEX-121 — RACI Master Matrix" },
  { re: /ANNEX-122\s*(?:—\s*[^<\n|]+|KPI Cascade Dictionary)/g, to: "ANNEX-122 — KPI Cascade Dictionary" },
  { re: /ANNEX-123\s*(?:—\s*[^<\n|]+|Deputy Backup Matrix)/g, to: "ANNEX-123 — Deputy Backup Matrix" },
  { re: /ANNEX-503\s*—\s*[^<\n|]+/g, to: "ANNEX-503 — CNC Operating Model and Role Boundary" },
  { re: /SOP-902\s*—\s*[^<\n|]+/g, to: "SOP-902 — Management Review" },
  { re: /(?:wi-901-performance\s*—\s*)?WI-901\s*—\s*[^<\n|]+/g, to: "WI-901 — Performance Dashboard" },
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === ".git" || entry.name === "node_modules") {
        continue;
      }
      walk(abs, files);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(abs);
    }
  }
  return files;
}

let changedFiles = 0;
let totalReplacements = 0;

for (const file of walk(ROOT)) {
  let html = fs.readFileSync(file, "utf8");
  const before = html;

  for (const item of regexReplacements) {
    html = html.replace(item.re, () => {
      totalReplacements += 1;
      return item.to;
    });
  }

  if (html !== before) {
    fs.writeFileSync(file, html, "utf8");
    changedFiles += 1;
  }
}

console.log(`files changed: ${changedFiles}`);
console.log(`total replacements: ${totalReplacements}`);
