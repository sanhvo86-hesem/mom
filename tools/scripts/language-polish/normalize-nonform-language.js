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
  `${path.sep}.git${path.sep}`,
  `${path.sep}node_modules${path.sep}`,
];

const SKIP_FILES = new Set([
  path.join(ROOT, '01-QMS-Portal', 'portal.html'),
]);

const KEYWORD_AUDIT = [
  'sai revision',
  'HOLD khi',
  'ship khi',
  'audit fail',
  'route sạch',
  'Deputy / backup rule',
  'trigger escalation',
  'PASS khi',
  'FAIL khi',
  'BLOCK ship khi',
  'NCR khi fail',
  'document đầu mối',
  'revision mới',
  'controllables của từng owner',
  'Gate FAIL ở',
  'metric mức “Major Gate”',
  'cap skill bonus',
];

const rawHtmlReplace = [
  {
    re: /<b>Gate FAIL<\/b> ở bất kỳ <b>metric “Critical Gate”<\/b>/g,
    repl: '<b>Không đạt</b> ở bất kỳ <b>tiêu chí “Critical Gate”</b>',
  },
  {
    re: /<b>Gate FAIL<\/b> ở metric mức “Major Gate” ⇒ <b>cap<\/b> skill bonus/g,
    repl: '<b>Không đạt</b> ở <b>tiêu chí “Major Gate”</b> ⇒ <b>giới hạn</b> thưởng kỹ năng (skill bonus)',
  },
  {
    re: /Phối hợp HR và QA\/QMS để xây dựng ma trận kỹ năng \(skill matrix\), certification gates, OJT theo vai trò và đào tạo chéo nhằm giảm rủi ro phụ thuộc cá nhân\./g,
    repl: 'Phối hợp HR và QA/QMS để xây dựng ma trận kỹ năng (skill matrix), các cổng chứng nhận (certification gates), OJT theo vai trò và đào tạo chéo nhằm giảm rủi ro phụ thuộc cá nhân.',
  },
  {
    re: /Nhận mục tiêu ca, ưu tiên job, kế hoạch nhân lực \(manpower plan\) và các vấn đề cần follow-up đặc biệt\./g,
    repl: 'Nhận mục tiêu ca, ưu tiên job, kế hoạch nhân lực (manpower plan) và các vấn đề cần theo dõi đặc biệt (follow-up).',
  },
  {
    re: /<b>Documented Information \(ISO 7\.5\)<\/b>/g,
    repl: '<b>thông tin dạng văn bản (Documented Information, ISO 7.5)</b>',
  },
];

const alwaysReplace = [
  {
    re: /Đo controllables của từng owner: readiness, closure discipline, data hygiene, mức bao phủ dự phòng \(backup coverage\), system availability\./g,
    repl: 'Đo các yếu tố trong phạm vi kiểm soát của từng người phụ trách: mức sẵn sàng, kỷ luật đóng việc, độ sạch dữ liệu, mức bao phủ dự phòng (backup coverage) và mức sẵn sàng hệ thống.',
  },
  {
    re: /Quy tắc bắt buộc \(PHẢI\) — Gate FAIL thì xử lý như sau:/g,
    repl: 'Quy tắc bắt buộc (PHẢI) — nếu không đạt cổng kiểm soát (gate) thì xử lý như sau:',
  },
  {
    re: /Gate FAIL ở bất kỳ metric “Critical Gate”/g,
    repl: 'Không đạt ở bất kỳ tiêu chí “Critical Gate”',
  },
  {
    re: /Gate FAIL ở metric mức “Major Gate”/g,
    repl: 'Không đạt ở tiêu chí “Major Gate”',
  },
  {
    re: /\bcap\b skill bonus/gi,
    repl: 'giới hạn skill bonus',
  },
  {
    re: /document đầu mối/gi,
    repl: 'đầu mối kiểm soát tài liệu',
  },
  {
    re: /revision mới/gi,
    repl: 'phiên bản mới',
  },
  {
    re: /manpower plan \/ certification gate \/ discipline/gi,
    repl: 'kế hoạch nhân lực (manpower plan) / cổng chứng nhận (certification gate) / kỷ luật vận hành',
  },
  {
    re: /theo dõi đặc biệt \(theo dõi tiếp \(follow-up\)\)/gi,
    repl: 'theo dõi đặc biệt (follow-up)',
  },
  {
    re: /thưởng kỹ năng \(thưởng kỹ năng \(skill bonus\)\)/gi,
    repl: 'thưởng kỹ năng (skill bonus)',
  },
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
    repl: 'điều kiện kích hoạt leo thang (escalation)',
  },
  {
    re: /\bBLOCK ship khi\b/gi,
    repl: 'chặn giao hàng khi',
  },
  {
    re: /owner xử lý/gi,
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
    repl: 'sẵn sàng cho đánh giá (audit-ready)',
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
    repl: 'từ điển KPI (KPI Dictionary)',
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
    repl: 'kiểm soát nguồn (source-control)',
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
  {
    re: /\bmanpower plan\b/gi,
    repl: 'kế hoạch nhân lực (manpower plan)',
  },
  {
    re: /\bmanpower planning\b/gi,
    repl: 'kế hoạch nhân lực (manpower planning)',
  },
  {
    re: /\brecruitment\b/gi,
    repl: 'tuyển dụng (recruitment)',
  },
  {
    re: /\bonboarding\b/gi,
    repl: 'hội nhập nhân sự mới (onboarding)',
  },
  {
    re: /\btraining administration\b/gi,
    repl: 'điều phối đào tạo (training administration)',
  },
  {
    re: /\baudit training\b/gi,
    repl: 'đào tạo phục vụ đánh giá (audit training)',
  },
  {
    re: /\bcertification gate\b/gi,
    repl: 'cổng chứng nhận (certification gate)',
  },
  {
    re: /\bcertification gates\b/gi,
    repl: 'các cổng chứng nhận (certification gates)',
  },
  {
    re: /\bclosure discipline\b/gi,
    repl: 'kỷ luật đóng việc (closure discipline)',
  },
  {
    re: /\bdata hygiene\b/gi,
    repl: 'độ sạch dữ liệu (data hygiene)',
  },
  {
    re: /\bsystem availability\b/gi,
    repl: 'mức sẵn sàng hệ thống (system availability)',
  },
  {
    re: /\bCritical system availability\b/g,
    repl: 'mức sẵn sàng hệ thống trọng yếu (critical system availability)',
  },
  {
    re: /\bJD library\b/g,
    repl: 'thư viện JD (JD library)',
  },
  {
    re: /\bskill\/certification matrices\b/gi,
    repl: 'ma trận kỹ năng/chứng nhận (skill/certification matrices)',
  },
  {
    re: /\bpayroll input\b/gi,
    repl: 'dữ liệu đầu vào tính lương (payroll input)',
  },
  {
    re: /\bpayroll inputs\b/gi,
    repl: 'dữ liệu đầu vào tính lương (payroll inputs)',
  },
  {
    re: /\bfollow-up\b/gi,
    repl: 'theo dõi tiếp (follow-up)',
  },
  {
    re: /\bskill bonus\b/gi,
    repl: 'thưởng kỹ năng (skill bonus)',
  },
  {
    re: /\bDocumented Information\b/g,
    repl: 'thông tin dạng văn bản (Documented Information)',
  },
  {
    re: /\bincident log\b/gi,
    repl: 'nhật ký sự cố (incident log)',
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
  ['kế hoạch nhân lực', 'manpower plan'],
  ['kế hoạch nhân lực', 'manpower planning'],
  ['tuyển dụng', 'recruitment'],
  ['hội nhập nhân sự mới', 'onboarding'],
  ['điều phối đào tạo', 'training administration'],
  ['đào tạo phục vụ đánh giá', 'audit training'],
  ['cổng chứng nhận', 'certification gate'],
  ['các cổng chứng nhận', 'certification gates'],
  ['kỷ luật đóng việc', 'closure discipline'],
  ['độ sạch dữ liệu', 'data hygiene'],
  ['mức sẵn sàng hệ thống', 'system availability'],
  ['mức sẵn sàng hệ thống trọng yếu', 'critical system availability'],
  ['thư viện JD', 'JD library'],
  ['ma trận kỹ năng/chứng nhận', 'skill/certification matrices'],
  ['dữ liệu đầu vào tính lương', 'payroll input'],
  ['dữ liệu đầu vào tính lương', 'payroll inputs'],
  ['theo dõi tiếp', 'follow-up'],
  ['thưởng kỹ năng', 'skill bonus'],
  ['thông tin dạng văn bản', 'Documented Information'],
  ['nhật ký sự cố', 'incident log'],
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

function replaceRawHtml(html) {
  let next = html;
  for (const { re, repl } of rawHtmlReplace) {
    next = next.replace(re, repl);
  }
  return next;
}

function collapseNestedPairs(text) {
  let next = text;
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
  next = next.replace(
    /theo dõi đặc biệt \(theo dõi tiếp \(follow-up\)\)/gi,
    'theo dõi đặc biệt (follow-up)'
  );
  next = next.replace(
    /thưởng kỹ năng \(thưởng kỹ năng \(skill bonus\)\)/gi,
    'thưởng kỹ năng (skill bonus)'
  );
  next = next.replace(
    /thông tin dạng văn bản \(thông tin dạng văn bản \(Documented Information\), ISO 7\.5\)/g,
    'thông tin dạng văn bản (Documented Information, ISO 7.5)'
  );
  return next;
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
    if (hasVietnamese(next)) {
      for (const { re, repl } of vietnameseContextReplace) {
        next = next.replace(re, repl);
      }
    }
    next = collapseNestedPairs(next);
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
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    counts[key] = (text.match(new RegExp(escaped, 'g')) || []).length;
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
  const normalized = replaceVisibleText(replaceRawHtml(original));
  afterCounts.push(auditCounts(normalized));
  if (normalized !== original) {
    fs.writeFileSync(file, normalized, 'utf8');
    changedFiles.push(path.relative(ROOT, file).replace(/\\/g, '/'));
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
