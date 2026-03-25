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

function walkWorkbookFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || entry.name === ".backups") {
        continue;
      }
      walkWorkbookFiles(path.join(dir, entry.name), files);
      continue;
    }
    if (/\.xlsx$/i.test(entry.name)) {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
}

function normalizeRel(targetPath) {
  return path.relative(ROOT, targetPath).replace(/\\/g, "/");
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripTags(text) {
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function getHtmlTitle(filePath) {
  const html = fs.readFileSync(filePath, "utf8");
  const titleMatch = html.match(/<title>\s*([^<]+?)(?:\s*\|\s*HESEM QMS)?\s*<\/title>/i);
  if (titleMatch) {
    return titleMatch[1].trim();
  }
  const strongMatch = html.match(/<div class="title">\s*<strong>([\s\S]*?)<\/strong>/i);
  if (strongMatch) {
    return stripTags(strongMatch[1]);
  }
  return "";
}

function deriveWorkbookTitle(filePath) {
  return path
    .basename(filePath, path.extname(filePath))
    .replace(/^FRM-[A-Z0-9-]+_/, "")
    .replace(/_/g, " ");
}

function resolveTarget(filePath, href) {
  if (!href || href.startsWith("http://") || href.startsWith("https://") || href.startsWith("mailto:") || href.startsWith("#") || href.startsWith("javascript:")) {
    return null;
  }
  const cleanHref = href.split("#")[0].split("?")[0];
  if (!cleanHref) {
    return null;
  }
  return normalizeRel(path.resolve(path.dirname(filePath), cleanHref));
}

const htmlFiles = walk(ROOT);
const htmlTitleMap = new Map();
for (const filePath of htmlFiles) {
  const title = getHtmlTitle(filePath);
  if (title) {
    htmlTitleMap.set(normalizeRel(filePath), title);
  }
}

const workbookTitleMap = new Map();
for (const filePath of walkWorkbookFiles(path.join(ROOT, "04-Bieu-Mau"))) {
  workbookTitleMap.set(normalizeRel(filePath), deriveWorkbookTitle(filePath));
}

let changed = 0;
let total = 0;

for (const filePath of htmlFiles) {
  const html = fs.readFileSync(filePath, "utf8");
  let fileCount = 0;
  const next = html.replace(
    /<a\b([^>]*?)href="([^"]+)"([^>]*)>([\s\S]*?)<\/a>/gi,
    (full, beforeHref, href, afterHref, innerHtml) => {
      const strippedText = stripTags(innerHtml);
      if (!strippedText.startsWith("$1")) {
        return full;
      }
      const targetRel = resolveTarget(filePath, href);
      const officialTitle =
        (targetRel && (htmlTitleMap.get(targetRel) || workbookTitleMap.get(targetRel))) ||
        strippedText.replace(/^\$1\s*[—–-]?\s*/, "").trim();
      if (!officialTitle) {
        return full;
      }
      fileCount += 1;
      return `<a${beforeHref}href="${href}"${afterHref}>${escapeHtml(officialTitle)}</a>`;
    }
  );
  if (next !== html) {
    fs.writeFileSync(filePath, next, "utf8");
    changed += 1;
    total += fileCount;
  }
}

console.log(`files changed: ${changed}`);
console.log(`total replacements: ${total}`);
