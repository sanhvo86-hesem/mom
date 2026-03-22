const fs = require('fs');
const path = require('path');

const ROOT = path.resolve('C:/Users/TEST4/qms.hesem.com.vn');
const REPORT_PATH = path.join(
  ROOT,
  '_reports',
  'nonform-language-normalization-2026-03-22.md'
);

const SKIP_DIR_PARTS = [
  `${path.sep}04-Bieu-Mau${path.sep}`,
  `${path.sep}_build${path.sep}`,
  `${path.sep}_Deleted${path.sep}`,
];

const SKIP_FILES = new Set([
  path.join(ROOT, '01-QMS-Portal', 'portal.html'),
]);

const KEYWORD_AUDIT = [
  'sai revision',
  'HOLD khi',
  'ship khi',
  'khi fail',
  'audit fail',
  'backup coverage',
  'deputy rule',
  'route sạch',
  'Deputy / backup rule',
  'trigger escalation',
  'PASS khi',
  'FAIL khi',
  'BLOCK ship khi',
  'NCR khi fail',
  'owner xử lý',
  'Evidence Pack chuẩn quốc tế',
  'Audit Drill 60 giây',
];

const alwaysReplace = [
  {
    re: /No evidence = No gate/gi,
    repl: 'không có bằng chứng thì không qua cổng kiểm soát (No evidence = No gate)',
  },
  {
    re: /Evidence Pack chuẩn quốc tế/gi,
    repl: 'bộ bằng chứng chuẩn quốc tế (Evidence Pack)',
  },
  {
    re: /Audit Drill 60 giây/gi,
    repl: 'bài diễn tập đánh giá 60 giây (60-second audit drill)',
  },
  {
    re: /\bsai revision\b/gi,
    repl: 'sai phiên bản (wrong revision)',
  },
  {
    re: /\bHOLD khi\b/g,
    repl: 'tạm giữ khi',
  },
  {
    re: /\bship khi\b/gi,
    repl: 'giao hàng khi',
  },
  {
    re: /\bpass khi\b/gi,
    repl: 'đạt khi',
  },
  {
    re: /\bPASS khi\b/gi,
    repl: 'Đạt khi',
  },
  {
    re: /\bFAIL khi\b/gi,
    repl: 'Không đạt khi',
  },
  {
    re: /\bkhi fail\b/gi,
    repl: 'khi không đạt',
  },
  {
    re: /\bNCR khi fail\b/gi,
    repl: 'NCR khi không đạt',
  },
  {
    re: /\baudit fail\b/gi,
    repl: 'đánh giá không đạt',
  },
  {
    re: /\broute sạch\b/gi,
    repl: 'tuyến sạch (clean route)',
  },
  {
    re: /\bbackup coverage\b/gi,
    repl: 'mức bao phủ dự phòng (backup coverage)',
  },
  {
    re: /\bdeputy rule\b/gi,
    repl: 'quy tắc người thay thế (deputy rule)',
  },
  {
    re: /\bDeputy \/ backup rule\b/g,
    repl: 'quy tắc người thay thế và dự phòng',
  },
  {
    re: /\btrigger escalation\b/gi,
    repl: 'điều kiện kích hoạt escalation',
  },
  {
    re: /\bBLOCK ship khi\b/gi,
    repl: 'chặn giao hàng khi',
  },
  {
    re: /\bowner xử lý\b/gi,
    repl: 'người phụ trách xử lý',
  },
  {
    re: /\bSTOP-SHIP\b/g,
    repl: 'dừng giao hàng (STOP-SHIP)',
  },
  {
    re: /\bBLOCK SHIP\b/g,
    repl: 'chặn giao hàng (BLOCK SHIP)',
  },
  {
    re: /\bSupplier hành động khắc phục \(corrective action\) Request\b/g,
    repl: 'Supplier Corrective Action Request (SCAR)',
  },
  {
    re: /\bquarterly access review\b/gi,
    repl: 'rà soát quyền truy cập hàng quý (quarterly access review)',
  },
  {
    re: /\baudit-ready\b/gi,
    repl: 'sẵn sàng cho audit',
  },
];

const vietnameseContextReplace = [
  {
    re: /special process outsource/gi,
    repl: 'công đoạn đặc biệt thuê ngoài (special process outsource)',
  },
  {
    re: /receipt evidence/gi,
    repl: 'bằng chứng nhận hàng (receipt evidence)',
  },
  {
    re: /\bcontrol gate\b/gi,
    repl: 'cổng kiểm soát (control gate)',
  },
  {
    re: /\bship packet\b/gi,
    repl: 'bộ hồ sơ giao hàng (ship packet)',
  },
  {
    re: /\bship release\b/gi,
    repl: 'phê duyệt giao hàng (ship release)',
  },
  {
    re: /\bfinal inspection\b/gi,
    repl: 'kiểm tra cuối (final inspection)',
  },
  {
    re: /\bmanagement review\b/gi,
    repl: 'xem xét của lãnh đạo (management review)',
  },
  {
    re: /\baudit trail\b/gi,
    repl: 'dấu vết kiểm toán (audit trail)',
  },
  {
    re: /\brisk register\b/gi,
    repl: 'sổ đăng ký rủi ro (risk register)',
  },
  {
    re: /\baction log\b/gi,
    repl: 'nhật ký hành động (action log)',
  },
  {
    re: /\bpacking list\b/gi,
    repl: 'phiếu kê đóng gói (packing list)',
  },
  {
    re: /\btool life\b/gi,
    repl: 'tuổi dao (tool life)',
  },
  {
    re: /\bmachine family\b/gi,
    repl: 'nhóm máy (machine family)',
  },
  {
    re: /\binspection plan\b/gi,
    repl: 'kế hoạch kiểm tra (inspection plan)',
  },
  {
    re: /\bfreeze window\b/gi,
    repl: 'cửa sổ khóa kế hoạch (freeze window)',
  },
  {
    re: /\bcontrol point\b/gi,
    repl: 'điểm kiểm soát (control point)',
  },
  {
    re: /\bskill matrix\b/gi,
    repl: 'ma trận kỹ năng (skill matrix)',
  },
  {
    re: /\btraining matrix\b/gi,
    repl: 'ma trận đào tạo (training matrix)',
  },
  {
    re: /\bKPI Dictionary\b/g,
    repl: 'từ điển KPI (KPI dictionary)',
  },
  {
    re: /\blead time\b/gi,
    repl: 'thời gian dẫn (lead time)',
  },
  {
    re: /\bcontract review\b/gi,
    repl: 'rà soát hợp đồng (contract review)',
  },
  {
    re: /\bCorrective Action\b/g,
    repl: 'hành động khắc phục (corrective action)',
  },
  {
    re: /\bTest blueprint\b/g,
    repl: 'bản thiết kế kiểm thử (test blueprint)',
  },
  {
    re: /\bWIP aging\b/g,
    repl: 'tuổi tồn WIP (WIP aging)',
  },
  {
    re: /\bOJT checklist\b/gi,
    repl: 'danh mục OJT (OJT checklist)',
  },
  {
    re: /\bAccess Review\b/g,
    repl: 'rà soát quyền truy cập (access review)',
  },
  {
    re: /\bDecision Rights\b/g,
    repl: 'quyền ra quyết định (decision rights)',
  },
  {
    re: /\bJob Instruction\b/g,
    repl: 'hướng dẫn công việc (job instruction)',
  },
  {
    re: /\bship confirm\b/gi,
    repl: 'xác nhận giao hàng (ship confirm)',
  },
  {
    re: /\bsingle-source\b/gi,
    repl: 'nguồn đơn (single-source)',
  },
  {
    re: /\bsource-control\b/gi,
    repl: 'kiểm soát nguồn (source control)',
  },
  {
    re: /\bmaster data\b/gi,
    repl: 'dữ liệu gốc (master data)',
  },
  {
    re: /\breview pack\b/gi,
    repl: 'bộ hồ sơ rà soát (review pack)',
  },
  {
    re: /\bfile local\b/gi,
    repl: 'tệp cục bộ (local file)',
  },
  {
    re: /\blocal file\b/gi,
    repl: 'tệp cục bộ (local file)',
  },
  {
    re: /\bissue register\b/gi,
    repl: 'sổ đăng ký vấn đề (issue register)',
  },
];

const dedupePairs = [
  ['bộ bằng chứng chuẩn quốc tế', 'Evidence Pack'],
  ['bài diễn tập đánh giá 60 giây', '60-second audit drill'],
  ['cổng kiểm soát', 'control gate'],
  ['bộ hồ sơ giao hàng', 'ship packet'],
  ['phê duyệt giao hàng', 'ship release'],
  ['kiểm tra cuối', 'final inspection'],
  ['xem xét của lãnh đạo', 'management review'],
  ['dấu vết kiểm toán', 'audit trail'],
  ['sổ đăng ký rủi ro', 'risk register'],
  ['nhật ký hành động', 'action log'],
  ['phiếu kê đóng gói', 'packing list'],
  ['tuổi dao', 'tool life'],
  ['nhóm máy', 'machine family'],
  ['kế hoạch kiểm tra', 'inspection plan'],
  ['điểm kiểm soát', 'control point'],
  ['ma trận kỹ năng', 'skill matrix'],
  ['ma trận đào tạo', 'training matrix'],
  ['dữ liệu gốc', 'master data'],
  ['bộ hồ sơ rà soát', 'review pack'],
  ['tệp cục bộ', 'local file'],
  ['sổ đăng ký vấn đề', 'issue register'],
  ['mức bao phủ dự phòng', 'backup coverage'],
  ['quy tắc người thay thế', 'deputy rule'],
];

function hasVietnamese(text) {
  return /[À-ỹà-ỹĐđ]/.test(text);
}

function shouldSkip(filePath) {
  if (SKIP_FILES.has(filePath)) {
    return true;
  }
  return SKIP_DIR_PARTS.some((part) => filePath.includes(part));
}

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!shouldSkip(full + path.sep)) {
        walk(full, acc);
      }
      continue;
    }
    if (!entry.name.endsWith('.html')) {
      continue;
    }
    if (!shouldSkip(full)) {
      acc.push(full);
    }
  }
  return acc;
}

function replaceVisibleText(html) {
  let out = '';
  let cursor = 0;
  let inScript = false;
  let inStyle = false;
  const tagRe = /<[^>]+>/g;
  let match;

  function normalizeText(text) {
    if (!text) {
      return text;
    }
    let next = text;
    for (const { re, repl } of alwaysReplace) {
      next = next.replace(re, repl);
    }
    if (!hasVietnamese(next)) {
      return next;
    }
    for (const { re, repl } of vietnameseContextReplace) {
      next = next.replace(re, repl);
    }
    for (const [vi, en] of dedupePairs) {
      const escapedVi = vi.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const escapedEn = en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const nested = new RegExp(
        `${escapedVi}\\s*\\(${escapedVi}\\s*\\(${escapedEn}\\)\\)`,
        'gi'
      );
      while (nested.test(next)) {
        next = next.replace(nested, `${vi} (${en})`);
      }
    }
    return next;
  }

  while ((match = tagRe.exec(html)) !== null) {
    const textChunk = html.slice(cursor, match.index);
    out += inScript || inStyle ? textChunk : normalizeText(textChunk);

    const tag = match[0];
    const lower = tag.toLowerCase();
    if (/^<script\b/.test(lower) && !/^<\/script/.test(lower)) {
      inScript = true;
    } else if (/^<\/script/.test(lower)) {
      inScript = false;
    }
    if (/^<style\b/.test(lower) && !/^<\/style/.test(lower)) {
      inStyle = true;
    } else if (/^<\/style/.test(lower)) {
      inStyle = false;
    }

    out += tag;
    cursor = match.index + tag.length;
  }

  const tail = html.slice(cursor);
  out += inScript || inStyle ? tail : normalizeText(tail);
  return out;
}

function auditCounts(text) {
  const counts = {};
  for (const key of KEYWORD_AUDIT) {
    counts[key] = (text.match(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  }
  return counts;
}

function summarize(allCounts) {
  const totals = {};
  for (const key of KEYWORD_AUDIT) {
    totals[key] = 0;
  }
  for (const perFile of allCounts) {
    for (const key of KEYWORD_AUDIT) {
      totals[key] += perFile[key] || 0;
    }
  }
  return totals;
}

const files = walk(ROOT);
const beforeCounts = [];
const afterCounts = [];
const changedFiles = [];

for (const file of files) {
  const original = fs.readFileSync(file, 'utf8');
  beforeCounts.push(auditCounts(original));
  const normalized = replaceVisibleText(original);
  afterCounts.push(auditCounts(normalized));
  if (normalized !== original) {
    fs.writeFileSync(file, normalized, 'utf8');
    changedFiles.push(path.relative(ROOT, file));
  }
}

const beforeSummary = summarize(beforeCounts);
const afterSummary = summarize(afterCounts);

let report = '';
report += '# Non-Form Language Normalization\n\n';
report += `- Date: 2026-03-22\n`;
report += `- Scope: HTML documents outside \`04-Bieu-Mau\`\n`;
report += `- Changed files: ${changedFiles.length}\n\n`;
report += '## Audit Summary\n\n';
report += '| Pattern | Before | After |\n';
report += '|---|---:|---:|\n';
for (const key of KEYWORD_AUDIT) {
  report += `| ${key} | ${beforeSummary[key]} | ${afterSummary[key]} |\n`;
}
report += '\n## Changed Files\n\n';
for (const file of changedFiles) {
  report += `- ${file}\n`;
}

fs.writeFileSync(REPORT_PATH, report, 'utf8');

console.log(`FILES_CHANGED=${changedFiles.length}`);
console.log(`REPORT=${REPORT_PATH}`);
