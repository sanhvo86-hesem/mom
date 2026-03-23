#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOTS = [
  "02-Tai-Lieu-He-Thong",
  "03-Tai-Lieu-Van-Hanh",
  "10-Training-Academy",
];

const OUTPUT_DIR = "_reports";
const OUTPUT_STEM = "mixed-language-term-inventory-20260324";

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "if",
  "in",
  "into",
  "is",
  "it",
  "of",
  "on",
  "onto",
  "or",
  "per",
  "than",
  "that",
  "the",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "this",
  "those",
  "to",
  "via",
  "when",
  "where",
  "while",
  "with",
  "without",
]);

const CONNECTORS = new Set(["and", "of", "for", "to", "with", "vs"]);

const VIETNAMESE_ASCII_STOPWORDS = new Set([
  "ai",
  "anh",
  "bao",
  "ban",
  "bang",
  "bi",
  "bo",
  "buoc",
  "ca",
  "cac",
  "cai",
  "can",
  "cho",
  "chu",
  "chung",
  "co",
  "con",
  "cua",
  "da",
  "dang",
  "de",
  "den",
  "di",
  "do",
  "du",
  "duoc",
  "giao",
  "giu",
  "gom",
  "hang",
  "hau",
  "hay",
  "he",
  "hieu",
  "hoa",
  "hoac",
  "hom",
  "huong",
  "kha",
  "khi",
  "khong",
  "kho",
  "lam",
  "lan",
  "lai",
  "len",
  "lieu",
  "lo",
  "luc",
  "luu",
  "ly",
  "ma",
  "mau",
  "moi",
  "mot",
  "nam",
  "nay",
  "nen",
  "neu",
  "ngay",
  "nguoi",
  "nhan",
  "noi",
  "nuoc",
  "o",
  "phan",
  "phai",
  "phat",
  "phu",
  "qua",
  "quy",
  "ra",
  "rang",
  "ro",
  "roi",
  "sau",
  "san",
  "se",
  "so",
  "tai",
  "tai",
  "tao",
  "ten",
  "the",
  "theo",
  "them",
  "thi",
  "thoi",
  "thuc",
  "thu",
  "tren",
  "trong",
  "truoc",
  "tu",
  "tung",
  "ung",
  "vao",
  "va",
  "ve",
  "vi",
  "viec",
  "voi",
  "xac",
  "yeu",
]);

const DOC_CODE_PATTERNS = [
  /^(?:SOP|WI|FRM|ANNEX|JD|POL|TRN|SYS|REF|DOC|FORM|R)-?[A-Z0-9-]+$/i,
  /^C\d{2}(?:-L\d+)?$/i,
  /^L\d+$/i,
  /^V\d+$/i,
  /^[A-Z]{2,}-\d+(?:-\d+)*$/i,
];

const WORD_RE = /^[A-Za-z][A-Za-z0-9.+/&-]*$/;
const VIETNAMESE_RE = /[\u00C0-\u1EF9]/;

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
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, " - ")
    .replace(/[\/|&]/g, " ; ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitSegments(text) {
  return text
    .split(/[.!?;:,()[\]{}]/)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function tokenize(segment) {
  return segment.match(/[A-Za-zÀ-ỹ0-9.+/&-]+/g) || [];
}

function looksLikeDocCode(token) {
  return DOC_CODE_PATTERNS.some((pattern) => pattern.test(token));
}

function classifyToken(token) {
  if (!WORD_RE.test(token)) {
    return { kind: "other", normalized: null };
  }

  if (looksLikeDocCode(token)) {
    return { kind: "doc_code", normalized: null };
  }

  const clean = token.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, "");
  if (!clean) {
    return { kind: "other", normalized: null };
  }

  const lower = clean.toLowerCase();
  if (VIETNAMESE_ASCII_STOPWORDS.has(lower)) {
    return { kind: "vn_ascii", normalized: null };
  }

  if (STOPWORDS.has(lower)) {
    return { kind: "stopword", normalized: lower };
  }

  if (/^[A-Z0-9]{2,}$/.test(clean) || /^(?:[A-Z]{1,}[0-9]+|[0-9]+[A-Z]{1,})$/.test(clean)) {
    return { kind: "acronym", normalized: clean };
  }

  if (clean.length <= 1) {
    return { kind: "other", normalized: null };
  }

  return { kind: "word", normalized: lower };
}

function upsert(map, key, display, file) {
  if (!map.has(key)) {
    map.set(key, {
      key,
      count: 0,
      files: new Set(),
      variants: new Map(),
      sampleFiles: new Set(),
      display,
    });
  }

  const item = map.get(key);
  item.count += 1;
  item.files.add(file);
  item.sampleFiles.add(file);
  item.variants.set(display, (item.variants.get(display) || 0) + 1);
}

function finalizeItems(map) {
  const out = [];
  for (const item of map.values()) {
    const display = Array.from(item.variants.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
    out.push({
      term: display,
      canonical: item.key,
      occurrences: item.count,
      files: item.files.size,
      sample_files: Array.from(item.sampleFiles).sort().slice(0, 3),
      in_glossary: glossaryTerms.has(item.key.toLowerCase()),
    });
  }
  return out;
}

function csvEscape(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function buildMarkdownSection(items, title) {
  const lines = [`## ${title}`, "", "| Term | Occurrences | Files | Sample files |", "| --- | ---: | ---: | --- |"];
  for (const item of items) {
    lines.push(
      `| \`${item.term}\` | ${item.occurrences} | ${item.files} | ${item.sample_files.join(" ; ")} |`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

function readGlossaryTerms() {
  const glossaryPath = path.join("11-Glossary", "dict-data.json");
  if (!fs.existsSync(glossaryPath)) {
    return new Set();
  }

  const glossary = JSON.parse(fs.readFileSync(glossaryPath, "utf8"));
  const terms = new Set();
  for (const item of glossary) {
    if (!item || typeof item.term !== "string") {
      continue;
    }
    terms.add(item.term.trim().toLowerCase());
  }
  return terms;
}

const files = [];
for (const root of ROOTS) {
  walk(root, files);
}

const glossaryTerms = readGlossaryTerms();

const words = new Map();
const acronyms = new Map();
const phrases = new Map();

for (const file of files) {
  const raw = fs.readFileSync(file, "utf8");
  const text = normalizeHtml(raw);

  for (const segment of splitSegments(text)) {
    if (!VIETNAMESE_RE.test(segment) || !/[A-Za-z]/.test(segment)) {
      continue;
    }

    const tokens = tokenize(segment);
    let phraseBuffer = [];

    function flushPhraseBuffer() {
      const meaningful = phraseBuffer.filter((token) => token.kind !== "stopword");
      if (meaningful.length >= 2 && meaningful.length <= 5) {
        const canonical = phraseBuffer.map((token) => token.normalized).join(" ");
        const display = phraseBuffer.map((token) => token.display).join(" ");
        upsert(phrases, canonical, display, file);
      }
      phraseBuffer = [];
    }

    for (const rawToken of tokens) {
      if (VIETNAMESE_RE.test(rawToken)) {
        flushPhraseBuffer();
        continue;
      }

      const token = classifyToken(rawToken);
      if (token.kind === "doc_code" || token.kind === "other" || token.kind === "vn_ascii") {
        flushPhraseBuffer();
        continue;
      }

      const display = rawToken.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, "");
      if (!display) {
        flushPhraseBuffer();
        continue;
      }

      if (token.kind === "word") {
        upsert(words, token.normalized, display, file);
        phraseBuffer.push({ kind: token.kind, normalized: token.normalized, display });
        if (phraseBuffer.length > 5) {
          flushPhraseBuffer();
        }
        continue;
      }

      if (token.kind === "acronym") {
        upsert(acronyms, token.normalized, display, file);
        phraseBuffer.push({ kind: token.kind, normalized: token.normalized, display });
        if (phraseBuffer.length > 5) {
          flushPhraseBuffer();
        }
        continue;
      }

      if (token.kind === "stopword") {
        if (!phraseBuffer.length) {
          continue;
        }
        const previous = phraseBuffer[phraseBuffer.length - 1];
        if (!previous || previous.kind === "stopword") {
          flushPhraseBuffer();
          continue;
        }
        if (!CONNECTORS.has(token.normalized)) {
          flushPhraseBuffer();
          continue;
        }
        phraseBuffer.push({ kind: token.kind, normalized: token.normalized, display: token.normalized });
        continue;
      }

      flushPhraseBuffer();
    }

    flushPhraseBuffer();
  }
}

let wordItems = finalizeItems(words).filter((item) => item.occurrences >= 2);
let acronymItems = finalizeItems(acronyms).filter((item) => item.occurrences >= 2);
let phraseItems = finalizeItems(phrases).filter((item) => item.occurrences >= 2);

wordItems.sort((a, b) => a.term.localeCompare(b.term) || b.occurrences - a.occurrences);
acronymItems.sort((a, b) => a.term.localeCompare(b.term) || b.occurrences - a.occurrences);
phraseItems.sort((a, b) => a.term.localeCompare(b.term) || b.occurrences - a.occurrences);

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const jsonOutput = {
  files_scanned: files.length,
  words: wordItems,
  acronyms: acronymItems,
  phrases: phraseItems,
};

fs.writeFileSync(
  path.join(OUTPUT_DIR, `${OUTPUT_STEM}.json`),
  JSON.stringify(jsonOutput, null, 2),
  "utf8",
);

const wordCsv = [
  "term,canonical,occurrences,files,in_glossary,sample_files",
  ...wordItems.map((item) =>
    [
      csvEscape(item.term),
      csvEscape(item.canonical),
      item.occurrences,
      item.files,
      item.in_glossary,
      csvEscape(item.sample_files.join(" | ")),
    ].join(","),
  ),
].join("\n");

const acronymCsv = [
  "term,canonical,occurrences,files,in_glossary,sample_files",
  ...acronymItems.map((item) =>
    [
      csvEscape(item.term),
      csvEscape(item.canonical),
      item.occurrences,
      item.files,
      item.in_glossary,
      csvEscape(item.sample_files.join(" | ")),
    ].join(","),
  ),
].join("\n");

const phraseCsv = [
  "term,canonical,occurrences,files,in_glossary,sample_files",
  ...phraseItems.map((item) =>
    [
      csvEscape(item.term),
      csvEscape(item.canonical),
      item.occurrences,
      item.files,
      item.in_glossary,
      csvEscape(item.sample_files.join(" | ")),
    ].join(","),
  ),
].join("\n");

fs.writeFileSync(path.join(OUTPUT_DIR, `${OUTPUT_STEM}.words.csv`), wordCsv, "utf8");
fs.writeFileSync(path.join(OUTPUT_DIR, `${OUTPUT_STEM}.acronyms.csv`), acronymCsv, "utf8");
fs.writeFileSync(path.join(OUTPUT_DIR, `${OUTPUT_STEM}.phrases.csv`), phraseCsv, "utf8");

const masterRows = [
  ...wordItems.map((item) => ({ type: "word", ...item })),
  ...acronymItems.map((item) => ({ type: "acronym", ...item })),
  ...phraseItems.map((item) => ({ type: "phrase", ...item })),
].sort((a, b) => a.type.localeCompare(b.type) || a.term.localeCompare(b.term));

const masterCsv = [
  "type,term,canonical,occurrences,files,in_glossary,sample_files",
  ...masterRows.map((item) =>
    [
      csvEscape(item.type),
      csvEscape(item.term),
      csvEscape(item.canonical),
      item.occurrences,
      item.files,
      item.in_glossary,
      csvEscape(item.sample_files.join(" | ")),
    ].join(","),
  ),
].join("\n");

fs.writeFileSync(path.join(OUTPUT_DIR, `${OUTPUT_STEM}.master.csv`), masterCsv, "utf8");

const summaryLines = [
  `# Mixed-Language Term Inventory - 2026-03-24`,
  "",
  `- Files scanned: ${files.length}`,
  `- Single-word terms (occurrences >= 2): ${wordItems.length}`,
  `- Acronyms / abbreviations (occurrences >= 2): ${acronymItems.length}`,
  `- Multi-word phrases (occurrences >= 2): ${phraseItems.length}`,
  "",
  `Use this inventory as the user approval list before bulk translation.`,
  "",
  buildMarkdownSection(wordItems, "Single-Word Terms"),
  buildMarkdownSection(acronymItems, "Acronyms"),
  buildMarkdownSection(phraseItems, "Multi-Word Phrases"),
];

fs.writeFileSync(path.join(OUTPUT_DIR, `${OUTPUT_STEM}.md`), summaryLines.join("\n"), "utf8");

console.log(
  JSON.stringify(
    {
      files_scanned: files.length,
      word_terms: wordItems.length,
      acronyms: acronymItems.length,
      phrases: phraseItems.length,
    },
    null,
    2,
  ),
);
