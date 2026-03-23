#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("C:/Users/TEST4/qms.hesem.com.vn");
const TARGET_DIR = process.argv[2]
  ? path.resolve(ROOT, process.argv[2])
  : path.join(ROOT, "02-Tai-Lieu-He-Thong");

const REPORT_JSON = path.join(
  ROOT,
  "_reports",
  "translation-batch1-system-docs-20260324.json"
);
const REPORT_MD = path.join(
  ROOT,
  "_reports",
  "translation-batch1-system-docs-20260324.md"
);

function walk(dir, files = []) {
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
  return files;
}

function escapeRe(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function applyCase(source, target) {
  const letters = source.replace(/[^A-Za-z\u00C0-\u1EF9]/g, "");
  if (!letters) {
    return target;
  }
  if (letters === letters.toUpperCase()) {
    return target.toUpperCase();
  }
  const first = letters.charAt(0);
  if (first === first.toUpperCase()) {
    return target.charAt(0).toUpperCase() + target.slice(1);
  }
  return target;
}

function protectBlocks(html) {
  const blocks = [];
  const protectedHtml = html.replace(
    /<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>|<!--[\s\S]*?-->/gi,
    (match) => {
      const token = `__PROTECTED_BLOCK_${blocks.length}__`;
      blocks.push(match);
      return token;
    }
  );

  return {
    html: protectedHtml,
    restore(value) {
      return value.replace(/__PROTECTED_BLOCK_(\d+)__/g, (_, index) => blocks[Number(index)]);
    },
  };
}

function commonRule(key, re, output) {
  return {
    key,
    re,
    replace(match) {
      return applyCase(match, output);
    },
  };
}

function uncommonRule(key, re, firstOutput, laterOutput) {
  return {
    key,
    re,
    replace(match, state) {
      if (!state.firstSeen.has(key)) {
        state.firstSeen.add(key);
        return applyCase(match, firstOutput);
      }
      return applyCase(match, laterOutput);
    },
  };
}

function customRule(key, re, handler) {
  return { key, re, replace: handler };
}

const RULES = [
  commonRule(
    "cleanup_quality_gate",
    /cổng kiểm soát chất lượng\s*\(\s*quality cổng kiểm soát(?:\s*\(\s*gate\s*\))?\s*\)/gi,
    "cổng kiểm soát chất lượng (quality gate)"
  ),
  commonRule(
    "cleanup_quality_gate_loose",
    /quality cổng kiểm soát(?:\s*\(\s*gate\s*\))?/gi,
    "quality gate"
  ),
  commonRule(
    "cleanup_stage_gate",
    /theo từng cổng kiểm soát\s*\(\s*stage-cổng kiểm soát\s*\)/gi,
    "theo từng cổng kiểm soát (stage-gate)"
  ),
  commonRule(
    "cleanup_evidence_pack",
    /bộ bằng chứng\s*\(\s*bằng chứng pack\s*\)|bằng chứng package/gi,
    "bộ bằng chứng (evidence pack)"
  ),
  commonRule(
    "cleanup_follow_up",
    /theo dõi tiếp\s*\(\s*theo dõi tiếp\s*\)/gi,
    "theo dõi tiếp"
  ),
  commonRule(
    "cleanup_ship_release_pack",
    /(?:bộ hồ sơ\s*)?(?:bộ hồ sơ\s*)?phê duyệt giao hàng\s*\(\s*phê duyệt giao hàng(?:\s*\(\s*ship release\s*\))?\s*pack(?:age)?\s*\)/gi,
    "bộ hồ sơ phê duyệt giao hàng (ship release pack)"
  ),
  commonRule(
    "cleanup_ship_confirm",
    /xác nhận giao hàng\s*\(\s*(?:xác nhận giao hàng(?:\s*\(\s*ship confirm\s*\))?\s*\/\s*xác nhận giao hàng|ship confirm(?:\s*\/\s*xác nhận giao hàng)?)\s*\)/gi,
    "xác nhận giao hàng (ship confirm)"
  ),
  commonRule(
    "cleanup_access_phrase",
    /quyền truy cậps,\s*access,\s*data governance,\s*contingency/gi,
    "quyền truy cập, quản trị truy cập, quản trị dữ liệu và ứng phó gián đoạn"
  ),
  commonRule(
    "cleanup_ksem",
    /Knowledge.?Skill.?Bằng chứng.?Metric(?:\s*\(K.?S.?E.?M\))?/gi,
    "Kiến thức – Kỹ năng – Bằng chứng – Chỉ số (K-S-E-M)"
  ),
  commonRule(
    "cleanup_no_evidence_no_gate",
    /không có bằng chứng thì không qua cổng kiểm soát\s*\(\s*No bằng chứng = No cổng kiểm soát(?:\s*\/\s*không có bằng chứng thì không qua cổng kiểm soát)?\s*\)|No bằng chứng = No cổng kiểm soát(?:\s*\/\s*không có bằng chứng thì không qua cổng kiểm soát)?|No evidence = No gate/gi,
    "không có bằng chứng thì không qua cổng kiểm soát (No evidence = No gate)"
  ),
  commonRule(
    "cleanup_system_of_record",
    /System of Hồ sơ/gi,
    "nguồn chuẩn"
  ),
  commonRule(
    "cleanup_60_second_audit_drill",
    /60-second Đánh giá Drill|60-second đánh giá drill|60-second audit drill/gi,
    "diễn tập đánh giá 60 giây"
  ),
  commonRule(
    "cleanup_readiness_before_run",
    /mức sẵn sàng\s+before run/gi,
    "mức sẵn sàng trước khi chạy"
  ),
  commonRule(
    "cleanup_gate_status",
    /cổng kiểm soát\s+status/gi,
    "trạng thái cổng kiểm soát"
  ),
  commonRule(
    "cleanup_setup_record",
    /setup\s+hồ sơ/gi,
    "hồ sơ thiết lập"
  ),
  commonRule(
    "cleanup_final_ship_release",
    /Final phê duyệt giao hàng/gi,
    "Phê duyệt giao hàng cuối cùng"
  ),
  uncommonRule(
    "stage_gate",
    /\btheo từng cổng kiểm soát\s*\(\s*stage-gate\s*\)|\bstage-gate\b/gi,
    "theo từng cổng kiểm soát (stage-gate)",
    "theo từng cổng kiểm soát"
  ),
  uncommonRule(
    "quality_gate",
    /\bcổng kiểm soát chất lượng\s*\(\s*quality gate\s*\)|\bquality gate\b/gi,
    "cổng kiểm soát chất lượng (quality gate)",
    "cổng kiểm soát chất lượng"
  ),
  uncommonRule(
    "gate",
    /\bcổng kiểm soát\s*\(\s*gate\s*\)|(?<!quality )(?<!stage-)\bgate\b/gi,
    "cổng kiểm soát (gate)",
    "cổng kiểm soát"
  ),
  uncommonRule(
    "hold_point",
    /\bđiểm giữ\s*\(\s*hold points?\s*\)|\bhold points?\b/gi,
    "điểm giữ (hold point)",
    "điểm giữ"
  ),
  uncommonRule(
    "lead_time",
    /\bthời gian dẫn\s*\(\s*lead time(?:\s*\/\s*thời gian dẫn)?\s*\)|\blead[ -]?time\b/gi,
    "thời gian dẫn (lead time)",
    "thời gian dẫn"
  ),
  uncommonRule(
    "review_pack",
    /\bbộ hồ sơ rà soát\s*\(\s*review pack\s*\)|\breview pack\b/gi,
    "bộ hồ sơ rà soát (review pack)",
    "bộ hồ sơ rà soát"
  ),
  uncommonRule(
    "baseline_package",
    /\bbộ hồ sơ chuẩn\s*\(\s*baseline package\s*\)|\bbaseline package\b/gi,
    "bộ hồ sơ chuẩn (baseline package)",
    "bộ hồ sơ chuẩn"
  ),
  uncommonRule(
    "evidence_pack",
    /\bbộ bằng chứng\s*\(\s*evidence (?:pack|package)\s*\)|\bevidence (?:pack|package)\b/gi,
    "bộ bằng chứng (evidence pack)",
    "bộ bằng chứng"
  ),
  uncommonRule(
    "action_tracker",
    /\bbảng theo dõi hành động\s*\(\s*action tracker\s*\)|\baction tracker\b/gi,
    "bảng theo dõi hành động (action tracker)",
    "bảng theo dõi hành động"
  ),
  uncommonRule(
    "ship_release_pack",
    /\bbộ hồ sơ phê duyệt giao hàng\s*\(\s*ship release pack\s*\)|\bphê duyệt giao hàng(?:\s*\(\s*ship release\s*\))?\s*pack(?:age)?\b|\bship release pack(?:age)?\b/gi,
    "bộ hồ sơ phê duyệt giao hàng (ship release pack)",
    "bộ hồ sơ phê duyệt giao hàng"
  ),
  uncommonRule(
    "ship_packet",
    /\bbộ hồ sơ giao hàng\s*\(\s*ship (?:packet|pack)\s*\)|\bship (?:packet|pack)\b/gi,
    "bộ hồ sơ giao hàng (ship packet)",
    "bộ hồ sơ giao hàng"
  ),
  uncommonRule(
    "ship_confirm",
    /\bxác nhận giao hàng\s*\(\s*(?:xác nhận giao hàng\s*\(\s*ship confirm\s*\)\s*\/\s*xác nhận giao hàng|ship confirm(?:\s*\/\s*xác nhận giao hàng)?)\s*\)|\bship confirm\b/gi,
    "xác nhận giao hàng (ship confirm)",
    "xác nhận giao hàng"
  ),
  uncommonRule(
    "ship_release",
    /\bphê duyệt giao hàng\s*\(\s*ship(?:ment)? release(?:\s*\/\s*phê duyệt giao hàng)?\s*\)(?!\s*pack(?:age)?\b)|\bship(?:ment)? release\b(?!\s*pack(?:age)?\b)/gi,
    "phê duyệt giao hàng (ship release)",
    "phê duyệt giao hàng"
  ),
  uncommonRule(
    "job_dossier",
    /\bhồ sơ công việc\s*\(\s*job dossier\s*\)|\bjob dossier\b/gi,
    "hồ sơ công việc (job dossier)",
    "hồ sơ công việc"
  ),
  uncommonRule(
    "job_traveler",
    /\bphiếu theo dõi công việc\s*\(\s*job traveler\s*\)|\bjob traveler\b/gi,
    "phiếu theo dõi công việc (job traveler)",
    "phiếu theo dõi công việc"
  ),
  uncommonRule(
    "job_packet",
    /\bbộ hồ sơ công việc\s*\(\s*job packet\s*\)|\bjob packet\b/gi,
    "bộ hồ sơ công việc (job packet)",
    "bộ hồ sơ công việc"
  ),
  uncommonRule(
    "first_piece",
    /\bmẫu đầu\s*\(\s*first[- ]piece\s*\)|\bfirst[- ]piece\b/gi,
    "mẫu đầu (first piece)",
    "mẫu đầu"
  ),
  uncommonRule(
    "control_tower",
    /\btrung tâm điều hành\s*\(\s*control tower\s*\)|\bcontrol tower\b/gi,
    "trung tâm điều hành (control tower)",
    "trung tâm điều hành"
  ),
  uncommonRule(
    "inspection_program_release",
    /\bphát hành chương trình kiểm tra\s*\(\s*inspection[- ]program release\s*\)|\binspection[- ]program release\b/gi,
    "phát hành chương trình kiểm tra (inspection program release)",
    "phát hành chương trình kiểm tra"
  ),
  uncommonRule(
    "high_mix",
    /\bchủng loại cao\s*\(\s*high-mix\s*\)|\bhigh-mix\b/gi,
    "chủng loại cao (high-mix)",
    "chủng loại cao"
  ),
  uncommonRule(
    "low_mid_volume",
    /\bsản lượng thấp đến trung bình\s*\(\s*low-to-mid volume\s*\)|\blow-to-mid volume\b/gi,
    "sản lượng thấp đến trung bình (low-to-mid volume)",
    "sản lượng thấp đến trung bình"
  ),
  uncommonRule(
    "aging",
    /\btuổi tồn\s*\(\s*aging\s*\)|\baging\b/gi,
    "tuổi tồn (aging)",
    "tuổi tồn"
  ),
  commonRule(
    "contract_review",
    /\brà soát hợp đồng\s*\(\s*contract review(?:\s*\/\s*rà soát hợp đồng)?\s*\)|\bcontract review\b/gi,
    "rà soát hợp đồng"
  ),
  commonRule(
    "management_review",
    /\bxem xét của lãnh đạo\s*\(\s*management review\s*\)|\bmanagement review\b/gi,
    "xem xét của lãnh đạo"
  ),
  commonRule(
    "internal_audit",
    /\bđánh giá nội bộ\s*\(\s*internal audit\s*\)|\binternal audit\b/gi,
    "đánh giá nội bộ"
  ),
  commonRule(
    "audit_evidence",
    /\bbằng chứng đánh giá\s*\(\s*audit evidence\s*\)|\baudit evidence\b/gi,
    "bằng chứng đánh giá"
  ),
  commonRule(
    "final_inspection",
    /\bkiểm tra cuối\s*\(\s*final inspection\s*\)|\bfinal inspection\b/gi,
    "kiểm tra cuối"
  ),
  commonRule(
    "job_instruction",
    /\bhướng dẫn công việc\s*\(\s*job instruction\s*\)|\bjob instruction\b/gi,
    "hướng dẫn công việc"
  ),
  commonRule(
    "job_order",
    /\blệnh sản xuất\s*\(\s*job[- ]order\s*\)|\bjob[- ]orders?\b/gi,
    "lệnh sản xuất"
  ),
  commonRule("readiness_before_run", /\breadiness before run\b/gi, "mức sẵn sàng trước khi chạy"),
  commonRule(
    "setup_first_piece",
    /\bsetup\s*(?:and|&)\s*first[- ]piece\b/gi,
    "thiết lập và kiểm tra mẫu đầu"
  ),
  commonRule("setup_record", /\bsetup record\b/gi, "hồ sơ thiết lập"),
  commonRule("gate_status", /\bgate status\b/gi, "trạng thái cổng kiểm soát"),
  commonRule("final_ship_release", /\bfinal ship(?:ment)? release\b/gi, "phê duyệt giao hàng cuối cùng"),
  commonRule("packing_list", /\bpacking list\b/gi, "phiếu kê đóng gói"),
  commonRule("quarterly_access_review", /\brà soát quyền truy cập hàng quý\s*\(\s*quarterly access review(?:\s*\/\s*rà soát quyền truy cập hàng quý)?\s*\)|\bquarterly access review\b/gi, "rà soát quyền truy cập hàng quý"),
  uncommonRule(
    "risk_register",
    /\bsổ đăng ký rủi ro\s*\(\s*risk register\s*\)|\brisk register\b/gi,
    "sổ đăng ký rủi ro (risk register)",
    "sổ đăng ký rủi ro"
  ),
  commonRule("access_control", /\baccess control\b/gi, "kiểm soát truy cập"),
  commonRule("approval_matrix", /\bapproval matrix\b/gi, "ma trận phê duyệt"),
  commonRule("authority_matrix", /\bauthority matrix\b/gi, "ma trận thẩm quyền"),
  commonRule("action_plan", /\baction plan\b/gi, "kế hoạch hành động"),
  commonRule("workflow", /\bworkflow\b/gi, "luồng công việc"),
  commonRule("record_integrity", /\brecord integrity\b/gi, "tính toàn vẹn hồ sơ"),
  commonRule("record_retention", /\brecord retention\b/gi, "lưu giữ hồ sơ"),
  commonRule("release_package", /\brelease package\b/gi, "bộ hồ sơ phát hành"),
  commonRule("technical_release", /\btechnical release\b/gi, "phát hành kỹ thuật"),
  commonRule("engineering_release", /\bengineering release\b/gi, "phát hành kỹ thuật"),
  commonRule("production_readiness", /\bproduction readiness\b/gi, "mức sẵn sàng sản xuất"),
  commonRule("due_date", /\bdue dates?\b/gi, "ngày đến hạn"),
  commonRule("signoff", /\bsignoff\b/gi, "xác nhận phê duyệt"),
  commonRule("effectivity", /\beffectivity\b/gi, "hiệu lực áp dụng"),
  commonRule("source_control", /\bsource control\b/gi, "kiểm soát nguồn"),
  commonRule("contract_screening", /\bcontract screening\b/gi, "sàng lọc hợp đồng"),
  commonRule("support_functions", /\bsupport functions?\b/gi, "khối hỗ trợ"),
  commonRule("assumption_log", /\bassumption log\b/gi, "nhật ký giả định"),
  commonRule("order_ack", /\border acknowledgement\b/gi, "xác nhận đơn hàng"),
  commonRule("quote_package", /\bquote package\b/gi, "bộ hồ sơ báo giá"),
  commonRule("cert_pack", /\bcert pack\b/gi, "bộ chứng từ chứng nhận"),
  commonRule("pack_reconciliation", /\bpack reconciliation\b/gi, "đối chiếu đóng gói"),
  commonRule("change_control", /\bchange control\b/gi, "kiểm soát thay đổi"),
  commonRule("pre_run_verification", /\bpre-run verification\b/gi, "xác minh trước khi chạy"),
  commonRule("work_transfer", /\bwork transfer\b/gi, "chuyển giao công việc"),
  commonRule("readiness", /\breadiness\b/gi, "mức sẵn sàng"),
  commonRule("root_cause", /\broot cause\b/gi, "nguyên nhân gốc"),
  commonRule("lesson_learned", /\blesson learned\b/gi, "bài học kinh nghiệm"),
  commonRule("change_history", /\bchange history\b/gi, "lịch sử thay đổi"),
  commonRule("reviewers", /\breviewers\b/gi, "người rà soát"),
  commonRule("reviewed_requirements", /\breviewed requirements\b/gi, "yêu cầu đã được rà soát"),
  commonRule("open_issues", /\bopen issues\b/gi, "vấn đề còn mở"),
  commonRule("hot_issues", /\bhot issues\b/gi, "vấn đề nóng"),
  commonRule("open_orders", /\bopen orders\b/gi, "đơn hàng đang mở"),
  commonRule("pending_approvals", /\bpending approvals\b/gi, "phê duyệt đang chờ"),
  commonRule("high_risk_job", /\bhigh[- ]risk job\b/gi, "lệnh sản xuất rủi ro cao"),
  commonRule("ship_risk", /\bship[- ]risk\b|\bship risk\b/gi, "rủi ro giao hàng"),
  commonRule("shipment_update", /\bshipment update\b/gi, "cập nhật giao hàng"),
  commonRule("delay_notice", /\bdelay notice\b/gi, "thông báo chậm"),
  commonRule("ship_mode", /\bmode ship\b/gi, "phương thức giao hàng"),
  commonRule(
    "follow_up",
    /\btheo dõi tiếp\s*\(\s*follow-up\s*\)|\bfollow-up\b/gi,
    "theo dõi tiếp"
  ),
  commonRule("workspace", /\bworkspace\b/gi, "không gian làm việc"),
  commonRule("offline_mode", /\boffline mode\b/gi, "chế độ ngoại tuyến"),
  commonRule("restore_test", /\brestore test\b/gi, "thử khôi phục"),
  commonRule("transaction", /\btransactions?\b/gi, "giao dịch"),
  commonRule("source_revision", /\bsource revision\b/gi, "phiên bản nguồn"),
  commonRule("evidence_driven", /\bevidence-driven\b/gi, "dựa trên bằng chứng"),
  commonRule("evidence_requirements", /\bevidence requirements?\b/gi, "yêu cầu bằng chứng"),
  commonRule("evidence", /\bevidence\b(?!\s*pack\b)/gi, "bằng chứng"),
  commonRule("checklists", /\bchecklists\b/gi, "bảng kiểm"),
  commonRule("checklist", /\bchecklist\b/gi, "bảng kiểm"),
  commonRule("authority", /\bauthority\b/gi, "thẩm quyền"),
  customRule("department_owners", /\bDepartment owners\b/g, () => "Người phụ trách bộ phận"),
  customRule("process_owners", /\bProcess owners\b/g, () => "Chủ quá trình"),
  customRule("process_owner", /\bprocess owners?\b/gi, () => "chủ quá trình"),
  customRule("business_owners", /\bbusiness owners?\b/gi, () => "chủ nghiệp vụ"),
  customRule("document_owner", /\bdocument owners?\b/gi, () => "chủ tài liệu"),
  customRule("data_owner", /\bdata owners?\b/gi, () => "chủ dữ liệu"),
  customRule("record_owner", /\brecord owners?\b/gi, () => "chủ hồ sơ"),
  customRule("owner_approval", /\bowner approval\b/gi, () => "phê duyệt của người phụ trách"),
  customRule("internal_owner", /\binternal owner\b/gi, () => "người phụ trách nội bộ"),
  customRule("owner_giao_dien", /\bowner giao diện\b/gi, () => "đầu mối phụ trách giao diện"),
  customRule("escalation_owner", /\bescalation owner\b/gi, () => "người phụ trách leo thang"),
  customRule("owner_main", /\bOwner chính\b/g, () => "Người phụ trách chính"),
  customRule("owner_main_lower", /\bowner chính\b/g, () => "người phụ trách chính"),
  customRule(
    "title_owner",
    /\b([A-Z][A-Za-z0-9/&.-]*(?: [A-Z][A-Za-z0-9/&.-]*){0,4}) owner\b/g,
    (_, title) => `Người phụ trách ${title}`
  ),
  commonRule("owners", /\bowners\b/gi, "người phụ trách"),
  commonRule("owner", /\bowner\b/gi, "người phụ trách"),
  commonRule("system_of_record", /\bSystem of Record\b/gi, "nguồn chuẩn"),
  commonRule("special_process", /\bspecial process\b/gi, "công đoạn đặc biệt"),
  commonRule("standards", /\bstandards\b/gi, "tiêu chuẩn"),
  commonRule("metrics", /\bmetrics\b/gi, "chỉ số"),
  commonRule("metric", /\bmetric\b/gi, "chỉ số"),
  commonRule("processes", /\bprocesses\b/gi, "quy trình"),
  commonRule("process", /\bprocess\b/gi, "quy trình"),
  commonRule("records", /\brecords\b/gi, "hồ sơ"),
  commonRule("record", /\brecord\b/gi, "hồ sơ"),
  commonRule("complaints", /\bcomplaints\b/gi, "khiếu nại"),
  commonRule("complaint", /\bcomplaint\b/gi, "khiếu nại"),
  commonRule("audit", /\baudit\b/gi, "đánh giá"),
];

function processText(text, state, fileStats) {
  let next = text;

  for (const rule of RULES) {
    next = next.replace(rule.re, (...args) => {
      const match = args[0];
      const replacement = rule.replace(...args.slice(0, -2), state);
      if (replacement === match) {
        return match;
      }
      fileStats.total += 1;
      fileStats.byRule[rule.key] = (fileStats.byRule[rule.key] || 0) + 1;
      return replacement;
    });
  }

  return next;
}

function processHtml(rawHtml) {
  const { html, restore } = protectBlocks(rawHtml);
  const chunks = html.split(/(<[^>]+>)/g);
  const state = { firstSeen: new Set() };
  const fileStats = { total: 0, byRule: {} };

  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i];
    if (!chunk || chunk.startsWith("<")) {
      continue;
    }
    chunks[i] = processText(chunk, state, fileStats);
  }

  return {
    html: restore(chunks.join("")),
    fileStats,
  };
}

function writeReports(report) {
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2), "utf8");

  const lines = [
    "# Translation Batch 1 - 02-Tai-Lieu-He-Thong - 2026-03-24",
    "",
    `- Target directory: \`${path.relative(ROOT, TARGET_DIR)}\``,
    `- Files scanned: ${report.filesScanned}`,
    `- Files changed: ${report.filesChanged}`,
    `- Total replacements: ${report.totalReplacements}`,
    "",
    "## Top Rules",
    "",
  ];

  for (const item of report.topRules) {
    lines.push(`- \`${item.rule}\`: ${item.count}`);
  }

  lines.push("", "## Top Changed Files", "");

  for (const item of report.changedFiles.slice(0, 25)) {
    lines.push(
      `- \`${item.path}\`: ${item.total} thay thế (${Object.entries(item.byRule)
        .slice(0, 6)
        .map(([rule, count]) => `${rule}=${count}`)
        .join(", ")})`
    );
  }

  fs.writeFileSync(REPORT_MD, lines.join("\n"), "utf8");
}

function main() {
  if (!fs.existsSync(TARGET_DIR)) {
    throw new Error(`Target directory not found: ${TARGET_DIR}`);
  }

  const files = walk(TARGET_DIR);
  const changedFiles = [];
  const totals = new Map();

  for (const filePath of files) {
    const original = fs.readFileSync(filePath, "utf8");
    const { html, fileStats } = processHtml(original);

    if (html !== original) {
      fs.writeFileSync(filePath, html, "utf8");
      changedFiles.push({
        path: path.relative(ROOT, filePath).replace(/\\/g, "/"),
        total: fileStats.total,
        byRule: Object.fromEntries(
          Object.entries(fileStats.byRule).sort((a, b) => b[1] - a[1])
        ),
      });
    }

    for (const [rule, count] of Object.entries(fileStats.byRule)) {
      totals.set(rule, (totals.get(rule) || 0) + count);
    }
  }

  changedFiles.sort((a, b) => b.total - a.total);
  const topRules = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([rule, count]) => ({ rule, count }));

  const report = {
    filesScanned: files.length,
    filesChanged: changedFiles.length,
    totalReplacements: topRules.reduce((sum, item) => sum + item.count, 0),
    topRules,
    changedFiles,
  };

  writeReports(report);

  console.log(
    JSON.stringify(
      {
        filesScanned: report.filesScanned,
        filesChanged: report.filesChanged,
        totalReplacements: report.totalReplacements,
        topRules: report.topRules.slice(0, 20),
      },
      null,
      2
    )
  );
}

main();
