#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const JSON_PATH = path.join(ROOT, '11-Glossary', 'dict-data.json');
const JS_PATH = path.join(ROOT, '11-Glossary', 'dict-data.js');
const REPORT_DIR = path.join(ROOT, '_reports', 'glossary');

const STATUS_WORDS = new Set(['PASS', 'FAIL', 'REJECT', 'REWORK']);
const ROLE_CODE_RE = /^[A-Z]{2,}-\d{2,}$/;
const ABBR_RE = /^[A-Z0-9][A-Z0-9/&+.\-]{1,}$/;
const ALIAS_RE = /^(.*?)\s*\(([A-Z0-9][A-Z0-9/&+.\-]{1,})\)$/;

const MANUAL_PRIMARY_OVERRIDES = {
  AD: {
    meaning: 'Active Directory',
    vi: 'Dịch vụ thư mục Active Directory',
  },
  ABC: {
    meaning: 'Activity-Based Costing / Dry Chemical ABC Extinguisher',
    vi: 'Phương pháp tính giá theo hoạt động / Bình chữa cháy bột ABC',
    def: 'Trong HESEM, ABC có hai ngữ cảnh độc lập: (1) phương pháp tính giá theo hoạt động của Finance; (2) bình chữa cháy bột đa dụng ABC trong HSE. Khi sử dụng phải bám đúng bối cảnh để tránh hiểu sai.',
    ctx: 'Finance dùng ABC khi phân tích giá thành và phân bổ chi phí. HSE dùng ABC khi bố trí thiết bị ứng phó khẩn cấp, kiểm tra định kỳ và đào tạo an toàn.',
    rec: 'Costing workbook / báo cáo giá thành; Fire extinguisher inspection log; Emergency response checklist; Training record',
    cat: 'Finance / HSE',
  },
  'B/L': {
    meaning: 'Bill of Lading',
    vi: 'Vận đơn đường biển',
  },
  CCC: {
    meaning: 'Cash Conversion Cycle',
    vi: 'Chu kỳ chuyển đổi tiền mặt',
  },
  CO2: {
    meaning: 'CO2 Extinguisher',
    vi: 'Bình chữa cháy CO2',
  },
  DL: {
    meaning: 'Direct Labor',
    vi: 'Lao động trực tiếp',
  },
  DM: {
    meaning: 'Direct Material',
    vi: 'Vật tư trực tiếp',
  },
  DR: {
    meaning: 'Disaster Recovery',
    vi: 'Khôi phục sau thảm họa',
  },
  EC: {
    meaning: 'Engineering Change',
    vi: 'Thay đổi kỹ thuật',
  },
  'EXE-01': {
    meaning: 'General Manager',
    vi: 'Tổng quản lý',
  },
  HPC: {
    meaning: 'High Pressure Coolant',
    vi: 'Dung dịch làm mát áp suất cao',
  },
  HEM: {
    meaning: 'High-Efficiency Machining',
    vi: 'Gia công hiệu suất cao',
  },
  IDP: {
    meaning: 'Individual Development Plan',
    vi: 'Kế hoạch phát triển cá nhân',
  },
  MDM: {
    meaning: 'Mobile Device Management',
    vi: 'Quản lý thiết bị di động',
  },
  MOH: {
    meaning: 'Manufacturing Overhead',
    vi: 'Chi phí sản xuất chung',
  },
  'PLA-02': {
    meaning: 'Production Planner',
    vi: 'Điều độ sản xuất',
  },
  'PUR-02': {
    meaning: 'Purchasing Manager',
    vi: 'Quản lý mua hàng',
  },
  'QA-01': {
    meaning: 'Quality Assurance / QMS Manager',
    vi: 'Quản lý QA/QMS',
  },
  SCN: {
    meaning: 'Supplier Change Notice',
    vi: 'Thông báo thay đổi nhà cung cấp',
  },
  SDE: {
    meaning: 'Supplier Development Engineer',
    vi: 'Kỹ sư phát triển nhà cung cấp',
  },
};

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function writeJsPayload(filePath, data) {
  const payload = JSON.stringify(data);
  const js = `window.HESEM_GLOSSARY = ${payload};\nwindow.DICT_DATA = window.HESEM_GLOSSARY;\n`;
  fs.writeFileSync(filePath, js, 'utf8');
}

function normalizeSpaces(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractAlias(term) {
  const match = normalizeSpaces(term).match(ALIAS_RE);
  if (!match) return null;
  return {
    phrase: normalizeSpaces(match[1]),
    abbr: normalizeSpaces(match[2]).toUpperCase(),
  };
}

function isStatusWord(term) {
  return STATUS_WORDS.has(normalizeSpaces(term).toUpperCase());
}

function isRoleCode(term) {
  return ROLE_CODE_RE.test(normalizeSpaces(term));
}

function isAbbreviationTerm(term) {
  const value = normalizeSpaces(term);
  if (!value || value.includes(' ') || isStatusWord(value)) return false;
  if (isRoleCode(value)) return true;
  return ABBR_RE.test(value);
}

function sanitizeMeaning(term, meaning) {
  const cleanTerm = normalizeSpaces(term);
  let cleanMeaning = normalizeSpaces(meaning).replace(/\s*\/\s*/g, ' / ');
  if (!cleanMeaning) return '';
  if (isAbbreviationTerm(cleanTerm)) {
    const escaped = escapeRegExp(cleanTerm);
    cleanMeaning = cleanMeaning.replace(new RegExp(`\\s*\\(${escaped}\\)\\s*$`, 'i'), '').trim();
  }
  return cleanMeaning;
}

function sanitizeVietnamese(term, value) {
  const cleanTerm = normalizeSpaces(term);
  let cleanValue = normalizeSpaces(value);
  if (!cleanValue || !isAbbreviationTerm(cleanTerm)) return cleanValue;
  const escaped = escapeRegExp(cleanTerm);
  cleanValue = cleanValue.replace(new RegExp(`^${escaped}\\s*[–—:-]\\s*`, 'i'), '');
  cleanValue = cleanValue.replace(new RegExp(`\\s*\\(${escaped}\\)\\s*$`, 'i'), '').trim();
  return cleanValue;
}

function sanitizeItem(item) {
  const term = normalizeSpaces(item.term);
  return {
    term,
    meaning: sanitizeMeaning(term, item.meaning),
    vi: sanitizeVietnamese(term, item.vi),
    def: String(item.def || '').trim(),
    ctx: String(item.ctx || '').trim(),
    rec: String(item.rec || '').trim(),
    cat: normalizeSpaces(item.cat || 'General') || 'General',
  };
}

function isGenericDefinition(value) {
  const clean = String(value || '').trim();
  return /Khái niệm chuẩn dùng trong môi trường nhà máy|Dùng như thuật ngữ chuẩn trong SOP\/WI\/biểu mẫu|Khái niệm CNTT\/điều khiển|Thuật ngữ logistics\/bao gói\/vận chuyển/i.test(clean);
}

function pickBetterMeaning(term, current, candidate) {
  const a = sanitizeMeaning(term, current);
  const b = sanitizeMeaning(term, candidate);
  if (!a) return b;
  if (!b) return a;
  if (isAbbreviationTerm(term) && a.toUpperCase() === normalizeSpaces(term).toUpperCase()) return b;
  if (b.length > a.length && /\([A-Z0-9/&+.\-]+\)$/.test(a) && !/\([A-Z0-9/&+.\-]+\)$/.test(b)) return b;
  return a;
}

function pickBetterVietnamese(term, current, candidate) {
  const a = sanitizeVietnamese(term, current);
  const b = sanitizeVietnamese(term, candidate);
  if (!a) return b;
  if (!b) return a;
  if (a.length >= b.length) return a;
  return b;
}

function pickBetterCategory(current, candidate) {
  const a = normalizeSpaces(current);
  const b = normalizeSpaces(candidate);
  if (!a) return b || 'General';
  if (!b) return a;
  if (a === 'General' && b !== 'General') return b;
  return a;
}

function mergePrimaryWithAlias(primary, aliasRow) {
  const primaryItem = sanitizeItem(primary);
  const aliasItem = sanitizeItem(aliasRow);
  const merged = {
    ...primaryItem,
    meaning: pickBetterMeaning(primaryItem.term, primaryItem.meaning, aliasItem.meaning || extractAlias(aliasItem.term)?.phrase || ''),
    vi: pickBetterVietnamese(primaryItem.term, primaryItem.vi, aliasItem.vi),
    def: primaryItem.def,
    ctx: primaryItem.ctx,
    rec: primaryItem.rec,
    cat: pickBetterCategory(primaryItem.cat, aliasItem.cat),
  };

  if (!merged.def || (isGenericDefinition(merged.def) && aliasItem.def && aliasItem.def.length > merged.def.length)) {
    merged.def = aliasItem.def || merged.def;
  }
  if (!merged.ctx && aliasItem.ctx) merged.ctx = aliasItem.ctx;
  if (!merged.rec && aliasItem.rec) merged.rec = aliasItem.rec;

  return applyOverride(merged);
}

function buildPrimaryFromAliasGroup(abbr, rows) {
  const override = MANUAL_PRIMARY_OVERRIDES[abbr] || {};
  const sanitizedRows = rows.map(sanitizeItem);
  const first = sanitizedRows[0];
  const uniqueMeanings = Array.from(
    new Set(
      sanitizedRows
        .map(row => sanitizeMeaning(abbr, row.meaning || extractAlias(row.term)?.phrase || ''))
        .filter(Boolean),
    ),
  );

  const item = {
    term: abbr,
    meaning: override.meaning || uniqueMeanings.join(' / ') || first.meaning || extractAlias(first.term)?.phrase || '',
    vi: override.vi || pickBetterVietnamese(abbr, '', first.vi),
    def: override.def || first.def,
    ctx: override.ctx || first.ctx,
    rec: override.rec || first.rec,
    cat: override.cat || first.cat || 'General',
  };

  if (!item.vi) {
    item.vi = sanitizedRows.map(row => sanitizeVietnamese(abbr, row.vi)).find(Boolean) || '';
  }
  if (!item.def) {
    item.def = sanitizedRows.map(row => row.def).find(Boolean) || '';
  }
  if (!item.ctx) {
    item.ctx = sanitizedRows.map(row => row.ctx).find(Boolean) || '';
  }
  if (!item.rec) {
    item.rec = sanitizedRows.map(row => row.rec).find(Boolean) || '';
  }
  if (!item.cat) {
    item.cat = sanitizedRows.map(row => row.cat).find(Boolean) || 'General';
  }

  return applyOverride(sanitizeItem(item));
}

function applyOverride(item) {
  const override = MANUAL_PRIMARY_OVERRIDES[(item.term || '').toUpperCase()];
  if (!override) return sanitizeItem(item);
  return sanitizeItem({
    ...item,
    meaning: override.meaning || item.meaning,
    vi: override.vi || item.vi,
    def: override.def || item.def,
    ctx: override.ctx || item.ctx,
    rec: override.rec || item.rec,
    cat: override.cat || item.cat,
  });
}

function sortItems(items) {
  return items.slice().sort((a, b) => String(a.term || '').localeCompare(String(b.term || ''), 'en', { sensitivity: 'base' }));
}

function auditGlossary(items) {
  const sanitized = items.map(sanitizeItem);
  const byTerm = new Map(sanitized.map(item => [item.term.toUpperCase(), item]));
  const aliasRows = [];
  const aliasWithPrimary = [];
  const aliasWithoutPrimary = [];
  const slashDualMeaning = [];
  const roleCodes = [];
  const statusWords = [];
  const weakFullEnglish = [];

  for (const item of sanitized) {
    const alias = extractAlias(item.term);
    if (alias) {
      aliasRows.push({ term: item.term, abbr: alias.abbr, meaning: item.meaning, cat: item.cat });
      if (byTerm.has(alias.abbr)) {
        aliasWithPrimary.push({ term: item.term, abbr: alias.abbr });
      } else {
        aliasWithoutPrimary.push({ term: item.term, abbr: alias.abbr, meaning: item.meaning, vi: item.vi, cat: item.cat });
      }
    }

    if (isRoleCode(item.term)) {
      roleCodes.push({ term: item.term, meaning: item.meaning, vi: item.vi });
    }
    if (isStatusWord(item.term)) {
      statusWords.push({ term: item.term, meaning: item.meaning });
    }
    if (isAbbreviationTerm(item.term) && item.meaning.includes(' / ')) {
      slashDualMeaning.push({ term: item.term, meaning: item.meaning });
    }
    if (isAbbreviationTerm(item.term) && (!item.meaning || sanitizeMeaning(item.term, item.meaning).toUpperCase() === item.term.toUpperCase())) {
      weakFullEnglish.push({ term: item.term, meaning: item.meaning, vi: item.vi });
    }
  }

  const aliasCollisionMap = new Map();
  for (const row of aliasWithoutPrimary) {
    if (!aliasCollisionMap.has(row.abbr)) aliasCollisionMap.set(row.abbr, []);
    aliasCollisionMap.get(row.abbr).push(row);
  }
  const aliasCollisions = Array.from(aliasCollisionMap.entries())
    .filter(([, rows]) => rows.length > 1)
    .map(([abbr, rows]) => ({ abbr, rows }));

  return {
    total: sanitized.length,
    abbreviationLikeCount: sanitized.filter(item => isAbbreviationTerm(item.term)).length,
    aliasCount: aliasRows.length,
    aliasWithPrimaryCount: aliasWithPrimary.length,
    aliasWithoutPrimaryCount: aliasWithoutPrimary.length,
    aliasWithoutPrimaryUniqueCount: new Set(aliasWithoutPrimary.map(row => row.abbr)).size,
    slashDualMeaningCount: slashDualMeaning.length,
    roleCodeCount: roleCodes.length,
    statusWordCount: statusWords.length,
    weakFullEnglishCount: weakFullEnglish.length,
    aliasRows,
    aliasWithPrimary,
    aliasWithoutPrimary,
    aliasCollisions,
    slashDualMeaning,
    roleCodes,
    statusWords,
    weakFullEnglish,
  };
}

function remediateGlossary(items) {
  const sanitized = items.map(sanitizeItem);
  const primaryMap = new Map();
  const aliasGroups = new Map();

  for (const item of sanitized) {
    const alias = extractAlias(item.term);
    if (alias) {
      if (!aliasGroups.has(alias.abbr)) aliasGroups.set(alias.abbr, []);
      aliasGroups.get(alias.abbr).push(item);
      continue;
    }
    primaryMap.set(item.term.toUpperCase(), applyOverride(item));
  }

  const createdCanonicalTerms = [];
  const mergedAliasTerms = [];

  for (const [abbr, rows] of aliasGroups.entries()) {
    if (primaryMap.has(abbr)) {
      let primary = primaryMap.get(abbr);
      for (const row of rows) {
        primary = mergePrimaryWithAlias(primary, row);
        mergedAliasTerms.push({ aliasTerm: row.term, canonicalTerm: abbr });
      }
      primaryMap.set(abbr, primary);
      continue;
    }

    const created = buildPrimaryFromAliasGroup(abbr, rows);
    primaryMap.set(abbr, created);
    createdCanonicalTerms.push({
      term: created.term,
      meaning: created.meaning,
      sourceTerms: rows.map(row => row.term),
    });
  }

  const remediated = sortItems(Array.from(primaryMap.values()).map(applyOverride));

  return {
    items: remediated,
    createdCanonicalTerms,
    mergedAliasTerms,
  };
}

function buildMarkdownReport(beforeAudit, afterAudit, remediation, writeMode, dataChanged) {
  const lines = [];
  lines.push('# Glossary Abbreviation Audit');
  lines.push('');
  lines.push(`- Generated: ${new Date().toISOString()}`);
  lines.push(`- Mode: ${writeMode ? 'write' : 'check'}`);
  lines.push(`- Data changed: ${dataChanged ? 'yes' : 'no'}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Total terms before: ${beforeAudit.total}`);
  lines.push(`- Total terms after: ${afterAudit.total}`);
  lines.push(`- Abbreviation-like terms before: ${beforeAudit.abbreviationLikeCount}`);
  lines.push(`- Alias rows \`Full Term (ABBR)\` before: ${beforeAudit.aliasCount}`);
  lines.push(`- Alias rows with existing primary before: ${beforeAudit.aliasWithPrimaryCount}`);
  lines.push(`- Alias rows without primary before: ${beforeAudit.aliasWithoutPrimaryCount}`);
  lines.push(`- Unique missing primaries created: ${remediation.createdCanonicalTerms.length}`);
  lines.push(`- Alias rows merged into existing canonical terms: ${remediation.mergedAliasTerms.length}`);
  lines.push(`- Dual-meaning abbreviation rows after: ${afterAudit.slashDualMeaningCount}`);
  lines.push(`- Role/JD code terms after: ${afterAudit.roleCodeCount}`);
  lines.push(`- Weak abbreviation meanings after: ${afterAudit.weakFullEnglishCount}`);
  lines.push('');

  lines.push('## Created Canonical Terms');
  lines.push('');
  if (!remediation.createdCanonicalTerms.length) {
    lines.push('- None');
  } else {
    for (const row of remediation.createdCanonicalTerms) {
      lines.push(`- \`${row.term}\` -> ${row.meaning} | source: ${row.sourceTerms.join(' ; ')}`);
    }
  }
  lines.push('');

  lines.push('## Alias Collisions Before Remediation');
  lines.push('');
  if (!beforeAudit.aliasCollisions.length) {
    lines.push('- None');
  } else {
    for (const collision of beforeAudit.aliasCollisions) {
      const members = collision.rows.map(row => `${row.term} -> ${row.meaning}`).join(' ; ');
      lines.push(`- \`${collision.abbr}\`: ${members}`);
    }
  }
  lines.push('');

  lines.push('## Remaining Weak Full-English After Remediation');
  lines.push('');
  if (!afterAudit.weakFullEnglish.length) {
    lines.push('- None');
  } else {
    for (const row of afterAudit.weakFullEnglish) {
      lines.push(`- \`${row.term}\` -> ${row.meaning || '(missing)'}`);
    }
  }
  lines.push('');

  lines.push('## Status Words');
  lines.push('');
  if (!afterAudit.statusWords.length) {
    lines.push('- None');
  } else {
    for (const row of afterAudit.statusWords) {
      lines.push(`- \`${row.term}\` -> ${row.meaning}`);
    }
  }
  lines.push('');

  return lines.join('\n');
}

function writeAuditFiles(reportBaseName, auditPayload, markdown) {
  ensureDir(REPORT_DIR);
  const jsonPath = path.join(REPORT_DIR, `${reportBaseName}.json`);
  const mdPath = path.join(REPORT_DIR, `${reportBaseName}.md`);
  const latestJsonPath = path.join(REPORT_DIR, 'glossary-abbreviation-audit-latest.json');
  const latestMdPath = path.join(REPORT_DIR, 'glossary-abbreviation-audit-latest.md');
  writeJson(jsonPath, auditPayload);
  fs.writeFileSync(mdPath, markdown + '\n', 'utf8');
  writeJson(latestJsonPath, auditPayload);
  fs.writeFileSync(latestMdPath, markdown + '\n', 'utf8');
  return { jsonPath, mdPath, latestJsonPath, latestMdPath };
}

function main() {
  const writeMode = process.argv.includes('--write');
  const originalItems = readJson(JSON_PATH);
  const beforeAudit = auditGlossary(originalItems);
  const remediation = remediateGlossary(originalItems);
  const afterAudit = auditGlossary(remediation.items);

  const originalSerialized = JSON.stringify(sortItems(originalItems.map(sanitizeItem)));
  const remediatedSerialized = JSON.stringify(remediation.items);
  const dataChanged = originalSerialized !== remediatedSerialized;

  if (writeMode && dataChanged) {
    writeJson(JSON_PATH, remediation.items);
    writeJsPayload(JS_PATH, remediation.items);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportBaseName = `glossary-abbreviation-audit-${timestamp}`;
  const auditPayload = {
    generated_at: new Date().toISOString(),
    mode: writeMode ? 'write' : 'check',
    data_changed: dataChanged,
    before: beforeAudit,
    after: afterAudit,
    remediation: {
      created_canonical_terms: remediation.createdCanonicalTerms,
      merged_alias_terms: remediation.mergedAliasTerms,
    },
  };
  const markdown = buildMarkdownReport(beforeAudit, afterAudit, remediation, writeMode, dataChanged);
  const reportPaths = writeAuditFiles(reportBaseName, auditPayload, markdown);

  console.log(JSON.stringify({
    ok: true,
    mode: writeMode ? 'write' : 'check',
    dataChanged,
    totals: {
      before: beforeAudit.total,
      after: afterAudit.total,
      aliasBefore: beforeAudit.aliasCount,
      weakAfter: afterAudit.weakFullEnglishCount,
    },
    reports: reportPaths,
  }, null, 2));
}

main();
