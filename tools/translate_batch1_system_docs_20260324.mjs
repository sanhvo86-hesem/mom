#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("C:/Users/TEST4/qms.hesem.com.vn");
const TARGET_DIR = process.argv[2]
  ? path.resolve(ROOT, process.argv[2])
  : path.join(ROOT, "02-Tai-Lieu-He-Thong");
const TARGET_SLUG = path
  .relative(ROOT, TARGET_DIR)
  .replace(/\\/g, "-")
  .toLowerCase()
  .replace(/[^a-z0-9-]+/g, "-")
  .replace(/-+/g, "-")
  .replace(/^-|-$/g, "");

const REPORT_JSON = path.join(
  ROOT,
  "_reports",
  `translation-${TARGET_SLUG}-20260324.json`
);
const REPORT_MD = path.join(
  ROOT,
  "_reports",
  `translation-${TARGET_SLUG}-20260324.md`
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
    /không có bằng chứng thì không qua cổng kiểm soát\s*\([\s\S]{0,180}?No (?:evidence|bằng chứng) = No (?:gate|cổng kiểm soát(?:\s*\(\s*gate\s*\))?)[\s\S]{0,180}?\)|No bằng chứng = No cổng kiểm soát(?:\s*\(\s*gate\s*\))?(?:\s*\/\s*không có bằng chứng thì không qua cổng kiểm soát)?|No evidence = No gate/gi,
    "không có bằng chứng thì không qua cổng kiểm soát (No evidence = No gate)"
  ),
  commonRule(
    "cleanup_no_evidence_suffix",
    /không có bằng chứng thì không qua cổng kiểm soát\s*\(No evidence = No gate\)(?:\s*\(cổng kiểm soát\)\))?(?:\s*\(cổng kiểm soát\))?(?:\s*\/\s*không có bằng chứng thì không qua cổng kiểm soát)?/gi,
    "không có bằng chứng thì không qua cổng kiểm soát (No evidence = No gate)"
  ),
  commonRule(
    "cleanup_no_evidence_double_paren",
    /không có bằng chứng thì không qua cổng kiểm soát\s*\(No evidence = No gate\)\)/gi,
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
    "cleanup_training_no_gate_label",
    /No bằng chứng = No cổng kiểm soát(?:\s*\(\s*gate\s*\))?/gi,
    "No evidence = No gate"
  ),
  commonRule(
    "cleanup_in_process",
    /in-quy trình/gi,
    "trong quá trình"
  ),
  commonRule(
    "cleanup_job_order_process_title",
    /CNC Lệnh sản xuất Quy trình/gi,
    "Quy trình Lệnh sản xuất CNC"
  ),
  commonRule(
    "cleanup_competency_metric",
    /competency-chỉ số/gi,
    "chỉ số năng lực"
  ),
  commonRule(
    "cleanup_evidence_standards",
    /Bộ bằng chứng Tiêu chuẩn|bộ bằng chứng chuẩn quốc tế\s*\(\s*Bộ bằng chứng\s*\)/gi,
    "Tiêu chuẩn Bộ bằng chứng"
  ),
  commonRule(
    "cleanup_audit_drill_dup",
    /bài diễn tập đánh giá 60 giây\s*\(\s*diễn tập đánh giá 60 giây\s*\)/gi,
    "bài diễn tập đánh giá 60 giây"
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
    /\bcổng kiểm soát\s*\(\s*gate\s*\)|(?<!No evidence = No )(?<!No bằng chứng = No )(?<!quality )(?<!stage-)\bgate\b/gi,
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
    "cleanup_job_dossier_creation",
    /\b(?:CP1\s*[—-]\s*)?hồ sơ công việc creation\b/gi,
    "tạo hồ sơ công việc"
  ),
  commonRule(
    "cleanup_locked_signed",
    /\blocked\/signed\b/gi,
    "đã khóa/đã ký"
  ),
  commonRule(
    "cleanup_signed_locked",
    /\bsigned\/locked\b/gi,
    "đã ký/đã khóa"
  ),
  commonRule(
    "cleanup_technical_controls",
    /\bkỹ thuật controls\b/gi,
    "kiểm soát kỹ thuật"
  ),
  commonRule(
    "cleanup_stop_work_dup",
    /\bDừng việc\s*\(\s*Stop Work\s*\)\s*\(\s*dừng việc\s*\)/g,
    "Dừng việc (Stop Work)"
  ),
  commonRule(
    "cleanup_coolant_nested",
    /\bChất lỏng làm mát\s*\(\s*dung dịch làm mát\s*\(\s*coolant\s*\)\s*\)/g,
    "Dung dịch làm mát (coolant)"
  ),
  commonRule(
    "cleanup_leading_signs",
    /\bTín hiệu sớm\s*\(\s*dấu hiệu sớm\s*\)/g,
    "Dấu hiệu sớm"
  ),
  commonRule(
    "cleanup_job_shop_cnc",
    /\b(?:xưởng|Xưởng)\s+CNC\s+(?:xưởng|Xưởng)\s+gia công theo đơn(?:\s*\(\s*job shop\s*\))?/g,
    "xưởng CNC gia công theo đơn (job shop)"
  ),
  commonRule(
    "cleanup_deliverables_dup",
    /\bđầu ra\s*\(\s*đầu ra yêu cầu\s*\)/gi,
    "đầu ra yêu cầu"
  ),
  commonRule(
    "cleanup_mix_up_prevention",
    /\blẫn lộn prevention\b/gi,
    "phòng ngừa lẫn lộn"
  ),
  commonRule(
    "cleanup_mix_up_dup",
    /\bLẫn lộn\/lẫn lộn\b/g,
    "Lẫn lộn"
  ),
  commonRule(
    "cleanup_job_shop_nested",
    /\bxưởng CNC gia công theo đơn\s*\(\s*xưởng gia công theo đơn\s*\(\s*job shop\s*\)\s*\)/gi,
    "xưởng CNC gia công theo đơn (job shop)"
  ),
  commonRule(
    "cleanup_job_shop_plain_dup",
    /\bxưởng CNC gia công theo đơn\s*\(\s*xưởng gia công theo đơn\s*\)/gi,
    "xưởng CNC gia công theo đơn"
  ),
  commonRule(
    "cleanup_output_note",
    /\bđầu ra(?: yêu cầu)?\s*\(\s*đầu ra yêu cầu\s*\)/gi,
    "đầu ra yêu cầu"
  ),
  commonRule(
    "cleanup_major_step_header",
    /\bBước công việc\s*\(\s*Bước chính\s*\)/g,
    "Bước công việc"
  ),
  commonRule(
    "cleanup_key_points_dup",
    /\bĐiểm then chốt\s*\(\s*Điểm then chốt\s*\)/g,
    "Điểm then chốt"
  ),
  commonRule(
    "cleanup_reasons_dup",
    /\bLý do\s*\(\s*Lý do\s*\)/g,
    "Lý do"
  ),
  commonRule(
    "cleanup_assessment_dup",
    /\bĐánh giá\s*\(\s*Đánh giá\s*\)/g,
    "Đánh giá"
  ),
  commonRule(
    "cleanup_quiz_dup",
    /\bBài kiểm tra nhanh\s*\(\s*Bài kiểm tra nhanh\s*\)/g,
    "Bài kiểm tra nhanh"
  ),
  commonRule(
    "cleanup_standalone_stop_work_note",
    /^\s*\(\s*dừng việc\s*\)\s*$/g,
    ""
  ),
  commonRule(
    "cleanup_mix_up_note",
    /\blẫn lộn\s*\(\s*lẫn lộn lô\/phiên bản\s*\)/gi,
    "lẫn lộn lô/phiên bản"
  ),
  commonRule(
    "cleanup_internal_drill",
    /\bnội bộ drill\b/gi,
    "diễn tập nội bộ"
  ),
  commonRule(
    "cleanup_audit_drill_label",
    /\bđánh giá drill\b/gi,
    "diễn tập đánh giá"
  ),
  commonRule(
    "cleanup_planning_kickoff",
    /\bPlanning khởi động\b/g,
    "khởi động Planning"
  ),
  commonRule(
    "cleanup_common_findings",
    /\btrending common phát hiện\b/gi,
    "theo dõi xu hướng các phát hiện phổ biến"
  ),
  commonRule(
    "cleanup_right_first_time_nested",
    /\bĐúng ngay từ lần đầu\s*\(\s*Đúng ngay từ lần đầu\s*\(\s*Đúng ngay từ lần đầu\s*\(\s*Right First Time\s*\)\s*\)\s*\)/g,
    "Đúng ngay từ lần đầu (Right First Time)"
  ),
  commonRule(
    "cleanup_right_first_time_dup",
    /\bĐúng ngay từ lần đầu\s*\(\s*Đúng ngay từ lần đầu\s*\(\s*Right First Time\s*\)\s*\)/g,
    "Đúng ngay từ lần đầu (Right First Time)"
  ),
  commonRule(
    "cleanup_mix_up_nested",
    /\blẫn lộn\s*\(\s*mix-up\s*\)\s*\(\s*lẫn lộn lô\/phiên bản\s*\)/gi,
    "lẫn lộn (mix-up)"
  ),
  commonRule(
    "cleanup_stop_work_inline_note",
    /\(\s*dừng việc\s*\)\s*(?=và)/gi,
    ""
  ),
  commonRule(
    "cleanup_anti_mix_up",
    /\banti[-‑]lẫn lộn\b/gi,
    "chống lẫn lộn"
  ),
  uncommonRule(
    "job_shop",
    /\bxưởng gia công theo đơn\s*\(\s*job shop\s*\)|(?<!xưởng gia công theo đơn \()(?<!xưởng CNC gia công theo đơn \()\bjob shop\b/gi,
    "xưởng gia công theo đơn (job shop)",
    "xưởng gia công theo đơn"
  ),
  uncommonRule(
    "right_first_time",
    /\bđúng ngay từ lần đầu\s*\(\s*Right First Time\s*\)|\bRight First Time\b/gi,
    "đúng ngay từ lần đầu (Right First Time)",
    "đúng ngay từ lần đầu"
  ),
  uncommonRule(
    "kpi_gating",
    /\bcơ chế chặn theo KPI\s*\(\s*KPI gating\s*\)|\bKPI gating\b/gi,
    "cơ chế chặn theo KPI (KPI gating)",
    "cơ chế chặn theo KPI"
  ),
  uncommonRule(
    "scorecard",
    /\bthẻ điểm\s*\(\s*scorecards?\s*\)|\bscorecards?\b/gi,
    "thẻ điểm (scorecard)",
    "thẻ điểm"
  ),
  uncommonRule(
    "playbook",
    /\bcẩm nang triển khai\s*\(\s*playbooks?\s*\)|\bplaybooks?\b/gi,
    "cẩm nang triển khai (playbook)",
    "cẩm nang triển khai"
  ),
  uncommonRule(
    "coaching",
    /\bkèm cặp phát triển\s*\(\s*coaching\s*\)|\bcoaching\b/gi,
    "kèm cặp phát triển (coaching)",
    "kèm cặp phát triển"
  ),
  uncommonRule(
    "mentoring",
    /\bcố vấn phát triển\s*\(\s*mentoring\s*\)|\bmentoring\b/gi,
    "cố vấn phát triển (mentoring)",
    "cố vấn phát triển"
  ),
  uncommonRule(
    "near_miss",
    /\bsự cố suýt xảy ra\s*\(\s*near[-‑ ]miss\s*\)|\bnear[-‑ ]miss\b/gi,
    "sự cố suýt xảy ra (near-miss)",
    "sự cố suýt xảy ra"
  ),
  uncommonRule(
    "mix_up",
    /\blẫn lộn\s*\(\s*mix[-‑ ]up\s*\)|\bmix[-‑ ]up\b/gi,
    "lẫn lộn (mix-up)",
    "lẫn lộn"
  ),
  uncommonRule(
    "visual_management",
    /\bquản lý trực quan\s*\(\s*Visual Management\s*\)|\bVisual Management\b/gi,
    "quản lý trực quan (Visual Management)",
    "quản lý trực quan"
  ),
  uncommonRule(
    "hierarchy_of_controls",
    /\bthứ bậc biện pháp kiểm soát\s*\(\s*Hierarchy of Controls\s*\)|\bHierarchy of Controls\b/gi,
    "thứ bậc biện pháp kiểm soát (Hierarchy of Controls)",
    "thứ bậc biện pháp kiểm soát"
  ),
  uncommonRule(
    "stop_work",
    /\bdừng việc\s*\(\s*Stop Work\s*\)|\bStop Work\b/gi,
    "dừng việc (Stop Work)",
    "dừng việc"
  ),
  uncommonRule(
    "coolant",
    /\bdung dịch làm mát\s*\(\s*coolant\s*\)|\bcoolant\b/gi,
    "dung dịch làm mát (coolant)",
    "dung dịch làm mát"
  ),
  uncommonRule(
    "interlock",
    /\bliên động an toàn\s*\(\s*interlock\s*\)|\binterlock\b/gi,
    "liên động an toàn (interlock)",
    "liên động an toàn"
  ),
  uncommonRule(
    "shadow_board",
    /\bbảng treo bóng dụng cụ\s*\(\s*shadow board\s*\)|\bshadow board\b/gi,
    "bảng treo bóng dụng cụ (shadow board)",
    "bảng treo bóng dụng cụ"
  ),
  uncommonRule(
    "zero_energy",
    /\btrạng thái cô lập năng lượng\s*\(\s*Zero energy\s*\)|\bZero energy\b/gi,
    "trạng thái cô lập năng lượng (Zero energy)",
    "trạng thái cô lập năng lượng"
  ),
  uncommonRule(
    "work_order",
    /\blệnh công việc\s*\(\s*Work Order\s*\)|\bWork Order\b/gi,
    "lệnh công việc (Work Order)",
    "lệnh công việc"
  ),
  uncommonRule(
    "dispatch_packet",
    /\bbộ hồ sơ gửi nhà cung cấp\s*\(\s*dispatch packet\s*\)|\bdispatch packet\b/gi,
    "bộ hồ sơ gửi nhà cung cấp (dispatch packet)",
    "bộ hồ sơ gửi nhà cung cấp"
  ),
  uncommonRule(
    "program_release",
    /\bphát hành chương trình\s*\(\s*program release\s*\)|\bprogram release\b/gi,
    "phát hành chương trình (program release)",
    "phát hành chương trình"
  ),
  uncommonRule(
    "inspection_package",
    /\bbộ hồ sơ kiểm tra\s*\(\s*Inspection Package\s*\)|\bInspection Package\b/gi,
    "bộ hồ sơ kiểm tra (Inspection Package)",
    "bộ hồ sơ kiểm tra"
  ),
  uncommonRule(
    "dry_run",
    /\bchạy thử khô\s*\(\s*Dry run\s*\)|\bDry run\b/gi,
    "chạy thử khô (dry run)",
    "chạy thử khô"
  ),
  uncommonRule(
    "first_article",
    /\bkiểm tra sản phẩm đầu tiên\s*\(\s*first article\s*\)|\bfirst article\b/gi,
    "kiểm tra sản phẩm đầu tiên (first article)",
    "kiểm tra sản phẩm đầu tiên"
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
  commonRule("control_point", /\bcontrol points?\b/gi, "điểm kiểm soát"),
  commonRule("failure_point", /\bfailure points?\b/gi, "điểm đứt gãy"),
  commonRule("risk_control", /\brisk controls?\b/gi, "biện pháp kiểm soát rủi ro"),
  commonRule("dispatch_plan", /\bdispatch plan\b/gi, "kế hoạch điều phối"),
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
  commonRule("handoff", /\bhandoffs?\b/gi, "bàn giao"),
  commonRule("input", /\binputs?\b/gi, "đầu vào"),
  commonRule("output", /\boutputs?\b/gi, "đầu ra"),
  commonRule("kickoff", /\bkickoff\b/gi, "khởi động"),
  commonRule("incoming_verification", /\bincoming verification\b/gi, "xác minh đầu vào"),
  commonRule("prevention", /\bprevention\b/gi, "phòng ngừa"),
  commonRule("findings", /\bfindings\b/gi, "phát hiện"),
  commonRule("revision_reference", /\brevision reference\b/gi, "tham chiếu revision"),
  commonRule("master_data", /\bmaster data\b/gi, "dữ liệu gốc"),
  commonRule("escapes", /\bescapes\b/gi, "lọt lỗi"),
  commonRule("chip_guard", /\bchip guard\b/gi, "tấm chắn phoi"),
  commonRule("visual", /\bvisual\b/gi, "trực quan"),
  commonRule("complete", /\bcomplete\b/gi, "đầy đủ"),
  commonRule("bypass", /\bbypass\b/gi, "vượt qua"),
  commonRule("calibration", /\bcalibration\b/gi, "hiệu chuẩn"),
  commonRule("incoming_inspection", /\bincoming inspection\b/gi, "kiểm tra đầu vào"),
  commonRule("roadmap", /\broadmaps?\b/gi, "lộ trình"),
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
  commonRule("hesem_style", /\bHESEM-style\b/g, "theo phong cách HESEM"),
  commonRule("assessment", /\bAssessment\b/g, "Đánh giá"),
  commonRule("assessment_lower", /\bassessment\b/gi, "đánh giá"),
  commonRule("quiz", /\bQuiz\b/g, "Bài kiểm tra nhanh"),
  commonRule("quiz_lower", /\bquiz\b/gi, "bài kiểm tra nhanh"),
  commonRule("case_study", /\bcase study\b/gi, "nghiên cứu tình huống"),
  commonRule("case_heading", /\bCase (?=\d)/g, "Tình huống "),
  commonRule("case_lower", /\bcase\b/gi, "tình huống"),
  commonRule("pre_test", /\bpre-test\b/gi, "kiểm tra trước"),
  commonRule("post_test", /\bpost-test\b/gi, "kiểm tra sau"),
  commonRule("key_points", /\bKey Points\b/g, "Điểm then chốt"),
  commonRule("key_points_lower", /\bkey points\b/gi, "điểm then chốt"),
  commonRule("reasons", /\bReasons\b/g, "Lý do"),
  commonRule("reasons_lower", /\breasons\b/gi, "lý do"),
  commonRule("drill_pack", /\bDrill Pack\b/g, "Bộ diễn tập"),
  commonRule("run_drill", /\bchạy drill\b/gi, "thực hiện diễn tập"),
  commonRule("drill_index", /\bdanh mục drill\b/gi, "danh mục diễn tập"),
  commonRule("drill_tap", /\bdrill\/tap\b/gi, "khoan/taro"),
  commonRule("test_drill", /\btest drill\b/gi, "diễn tập thử"),
  commonRule("document_control_drill", /\bDocument control drill\b/g, "diễn tập kiểm soát tài liệu"),
  commonRule("drill_record", /\bhồ sơ drill\b/gi, "hồ sơ diễn tập"),
  commonRule("prepare_the_learner", /\bPrepare the learner\b/g, "Chuẩn bị người học"),
  commonRule("present_the_operation", /\bPresent the operation\b/g, "Trình bày thao tác"),
  commonRule("try_out_performance", /\bTry-out performance\b/g, "Thực hành thử"),
  commonRule("safety_observation", /\bSafety Observation\b/g, "Quan sát an toàn"),
  commonRule("incident_log", /\bIncident log\b/g, "Nhật ký sự cố"),
  commonRule("ergonomics", /\bergonomics\b/gi, "công thái học"),
  commonRule("module_code", /\bModuleCode\b/g, "Mã mô-đun"),
  commonRule("module_title", /\bModuleTitle\b/g, "Tên mô-đun"),
  commonRule("cross_functional", /\bCross‑functional\b/g, "liên phòng ban"),
  commonRule("tracker", /\btracker\b/gi, "bảng theo dõi"),
  commonRule("module", /\bmodule\b/gi, "mô-đun"),
  commonRule("roles", /\broles\b/gi, "vai trò"),
  commonRule("role", /\brole\b/gi, "vai trò"),
  commonRule("flow", /\bflow\b/gi, "luồng"),
  commonRule("feedback", /\bfeedback\b/gi, "phản hồi"),
  commonRule("contract_cap", /\bContract\b/g, "Hợp đồng"),
  commonRule("assessment_ready", /đánh giá[-‑]ready/gi, "sẵn sàng cho đánh giá"),
  commonRule("update_master_data_vn", /update dữ liệu gốc/gi, "cập nhật dữ liệu gốc"),
  commonRule("release_record_vn", /\brelease hồ sơ\b/gi, "phát hành hồ sơ"),
  commonRule("in_process_record_check", /In[-‑]quy trình check hồ sơ/gi, "kiểm tra hồ sơ trong quá trình"),
  commonRule("incoming_verification_plan", /xác minh đầu vào plan/gi, "kế hoạch xác minh đầu vào"),
  commonRule("calibrated_gages", /\bcalibrated gages\b/gi, "dụng cụ đo đã hiệu chuẩn"),
  commonRule("action_log", /\baction log\b/gi, "nhật ký hành động"),
  commonRule("pass_fail", /\bpass\/fail\b/gi, "đạt/không đạt"),
  commonRule("quote", /\bquote\b/gi, "báo giá"),
  commonRule("international_grade", /\bInternational-grade\b/gi, "chuẩn quốc tế"),
  commonRule("verify_effectiveness", /\bverify effectiveness\b/gi, "xác minh hiệu lực"),
  commonRule("verify", /\bverify\b/gi, "xác minh"),
  commonRule("simulation", /\bsimulation\b/gi, "mô phỏng"),
  commonRule("deliverables", /\bdeliverables\b/gi, "đầu ra yêu cầu"),
  commonRule("major_steps", /\bmajor steps\b/gi, "các bước chính"),
  commonRule("major_step", /\bMajor Step\b/g, "Bước chính"),
  commonRule("leading_signs", /\bleading signs\b/gi, "dấu hiệu sớm"),
  commonRule("contamination", /\bcontamination\b/gi, "nhiễm bẩn"),
  commonRule("elimination", /\bElimination\b/g, "Loại bỏ"),
  commonRule("substitution", /\bSubstitution\b/g, "Thay thế"),
  commonRule("administrative", /\bAdministrative\b/g, "Biện pháp hành chính"),
  commonRule("locked", /\blocked\b/gi, "đã khóa"),
  commonRule("source_revision", /\bsource revision\b/gi, "phiên bản nguồn"),
  commonRule("evidence_driven", /\bevidence-driven\b/gi, "dựa trên bằng chứng"),
  commonRule("evidence_requirements", /\bevidence requirements?\b/gi, "yêu cầu bằng chứng"),
  commonRule("evidence", /(?<!No )\bevidence\b(?!\s*pack(?:age)?\b)/gi, "bằng chứng"),
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
  customRule(
    "drill_title_suffix",
    /([—-]\s*)([^<>\n]{1,120}?)\s+Drill\b/g,
    (_, prefix, title) => `${prefix}Bài diễn tập ${title.trim()}`
  ),
  commonRule("drill_generic", /\bdrill\b/gi, "diễn tập"),
  commonRule(
    "cleanup_post_job_shop_nested",
    /\bxưởng CNC gia công theo đơn\s*\(\s*xưởng gia công theo đơn\s*\(\s*job shop\s*\)\s*\)/gi,
    "xưởng CNC gia công theo đơn (job shop)"
  ),
  commonRule(
    "cleanup_post_job_shop_plain_dup",
    /\bxưởng CNC gia công theo đơn\s*\(\s*xưởng gia công theo đơn\s*\)/gi,
    "xưởng CNC gia công theo đơn"
  ),
  commonRule(
    "cleanup_post_output_note",
    /đầu ra\s*\(\s*đầu ra yêu cầu\s*\)/gi,
    "đầu ra yêu cầu"
  ),
  commonRule(
    "cleanup_post_key_points_dup",
    /Điểm then chốt\s*\(\s*Điểm then chốt\s*\)/gi,
    "Điểm then chốt"
  ),
  commonRule(
    "cleanup_post_assessment_dup",
    /Đánh giá\s*\(\s*Đánh giá\s*\)/gi,
    "Đánh giá"
  ),
  commonRule(
    "cleanup_post_case_dup",
    /\btình huống\s*\(\s*tình huống\s*\)/gi,
    "tình huống"
  ),
  commonRule(
    "cleanup_post_right_first_time_nested",
    /\bĐúng ngay từ lần đầu\s*\(\s*Đúng ngay từ lần đầu\s*\(\s*Right First Time\s*\)\s*\)/g,
    "Đúng ngay từ lần đầu (Right First Time)"
  ),
  commonRule(
    "cleanup_post_mix_up_nested",
    /\blẫn lộn\s*\(\s*mix-up\s*\)\s*\(\s*lẫn lộn lô\/phiên bản\s*\)/gi,
    "lẫn lộn (mix-up)"
  ),
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
    `# Translation Batch - ${path.relative(ROOT, TARGET_DIR)} - 2026-03-24`,
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
