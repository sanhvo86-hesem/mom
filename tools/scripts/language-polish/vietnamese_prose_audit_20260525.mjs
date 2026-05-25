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
  /<table\b[\s\S]*?<\/table>/gi,
  /<div\b[^>]*class="dcc-header"[\s\S]*?<\/div>/gi,
  /<div\b[^>]*class='dcc-header'[\s\S]*?<\/div>/gi,
  /<!--[\s\S]*?-->/g,
];

const ALLOW = new Set([
  "api", "qms", "mom", "mes", "erp", "eqms", "m365", "epicor", "sharepoint", "power",
  "automate", "purview", "excel", "json", "schema", "portal", "dashboard", "kpi", "otd",
  "sla", "wip", "fai", "iqc", "ipqc", "oqc", "spc", "cmm", "rfq", "mrr", "fifo", "ehs",
  "postgresql", "redis", "rabbitmq", "ariba", "coupa", "myasml", "vericut", "mastercam",
  "keyence", "calypso", "nist", "as9100d", "iso", "aiag", "semi", "astm", "ams", "uns",
  "qa", "dfm", "cam", "nc", "pdf", "po", "bom", "mtr", "coc", "coa", "xps", "esd", "og",
  "cl", "ra", "xrf", "ftir", "lpc", "nvr", "ic", "uai", "mrb", "capa", "ncr", "fmea",
  "pfmea", "ppap", "oee", "raci", "jd", "frm", "sop", "wi", "annex", "hold", "pass", "fail",
  "tier", "baseline", "snapshot", "register", "boundary", "decision", "document", "documents",
  "route", "dispatch", "capacity", "vacuum", "cleanliness", "process", "special", "system",
  "current", "working", "legal", "catalog", "competence", "adoption", "forms", "digital",
  "versioning", "approved", "substitution", "equivalent", "materials", "material",
  "training", "role", "roles", "customer", "provisioning", "release", "operation", "operations",
  "usage", "basis", "source", "department", "governance", "deployment", "ready",
]);

const SUSPECT = [
  "approved", "materials", "material", "processor", "supplier", "special", "process", "dispatch",
  "capacity", "control", "baseline", "package", "snapshot", "shipment", "handoff", "quick", "card",
  "route", "routing", "release", "current", "ready", "owner", "review", "decision", "note", "source",
  "record", "records", "cross", "reference", "policy", "legal", "basis", "tier", "boundary",
  "library", "folder", "blueprint", "architecture", "provisioning", "permissions", "automation",
  "flow", "training", "competence", "adoption", "online", "forms", "approvals", "system", "matrix",
  "usage", "operating", "mechanism", "assessment", "risk", "scorecard", "quality", "evidence",
  "register", "catalog", "deployment", "refresh", "offline", "fallback", "kit", "machine", "operation",
  "customer", "portal", "governance", "document", "documents", "digital", "performance", "model",
  "scenario", "role", "department", "list", "trace", "grade", "condition", "treatment", "application",
  "substitution", "equivalent", "vacuum", "cleanliness", "runtime", "working", "physical", "default",
  "retention", "major", "versioning", "readonly", "authoritative",
];

function walk(dir, files) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.html$/i.test(entry.name)) files.push(full);
  }
}

function normalize(html) {
  let next = html;
  for (const pattern of EXCLUDED_BLOCK_PATTERNS) next = next.replace(pattern, " ");
  return next
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function findLeftovers(text) {
  const words = text.match(/\b[A-Za-z][A-Za-z-]{3,}\b/g) || [];
  const found = new Set();
  for (const word of words) {
    const lower = word.toLowerCase();
    if (ALLOW.has(lower)) continue;
    if (SUSPECT.includes(lower)) {
      found.add(word);
    }
  }
  return [...found];
}

const files = [];
for (const root of DOC_ROOTS) walk(path.join(ROOT, root), files);

const results = [];
for (const file of files) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  const text = normalize(fs.readFileSync(file, "utf8"));
  const leftovers = findLeftovers(text);
  if (leftovers.length > 0) {
    results.push({ file: rel, count: leftovers.length, sample: leftovers.slice(0, 30) });
  }
}

results.sort((a, b) => b.count - a.count || a.file.localeCompare(b.file));
console.log(JSON.stringify({
  scanned_files: files.length,
  flagged_files: results.length,
  top_files: results.slice(0, 50),
}, null, 2));
