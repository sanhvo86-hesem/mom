#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("C:/Users/TEST4/qms.hesem.com.vn");
const ANNEX_DIR = path.join(ROOT, "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100");
const TARGETS = new Set([
  "annex-104-org-chart-fullpage.html",
  "annex-120-authority-matrix.html",
  "annex-121-raci-master-matrix.html",
  "annex-122-kpi-cascade-dictionary.html",
  "annex-123-deputy-backup-matrix.html",
]);

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
  const fileDir = path.dirname(file);

  html = html.replace(/href="([^"]+)"/g, (_match, href) => {
    const filename = href.split("/").pop();
    if (!TARGETS.has(filename)) {
      return `href="${href}"`;
    }

    const targetAbs = path.join(ANNEX_DIR, filename);
    if (!fs.existsSync(targetAbs)) {
      return `href="${href}"`;
    }

    const nextHref = path
      .relative(fileDir, targetAbs)
      .split(path.sep)
      .join("/");

    if (nextHref !== href) {
      totalReplacements += 1;
    }

    return `href="${nextHref}"`;
  });

  if (html !== before) {
    fs.writeFileSync(file, html, "utf8");
    changedFiles += 1;
  }
}

console.log(`files changed: ${changedFiles}`);
console.log(`total replacements: ${totalReplacements}`);
