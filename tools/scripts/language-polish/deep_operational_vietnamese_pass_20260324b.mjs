#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("C:/Users/TEST4/qms.hesem.com.vn");

const TARGETS = [
  {
    relPath:
      "03-Tai-Lieu-Van-Hanh/01-SOPs/02-SOP-200/sop-201-order-fulfillment-rfq-to-cash.html",
    docTitle: "SOP-201 — Order Fulfillment, RFQ-to-Cash",
  },
  {
    relPath:
      "03-Tai-Lieu-Van-Hanh/01-SOPs/03-SOP-300/sop-303-engineering-release-baseline-package-and-job-snapshot-control.html",
    docTitle: "SOP-303 — Engineering Release, Baseline Package and Job Snapshot Control",
  },
  {
    relPath:
      "03-Tai-Lieu-Van-Hanh/01-SOPs/05-SOP-500/sop-501-production-planning-scheduling-and-dispatch-control.html",
    docTitle: "SOP-501 — Production Planning, Scheduling and Dispatch Control",
  },
  {
    relPath:
      "03-Tai-Lieu-Van-Hanh/01-SOPs/06-SOP-600/sop-605-final-inspection-coc-and-shipment-release.html",
    docTitle: "SOP-605 — Final Inspection, CoC and Shipment Release",
  },
  {
    relPath:
      "03-Tai-Lieu-Van-Hanh/01-SOPs/08-SOP-800/sop-803-invoicing-job-costing-and-arap.html",
    docTitle: "SOP-803 — Invoicing, Job Costing and AR/AP",
  },
  {
    relPath:
      "03-Tai-Lieu-Van-Hanh/02-Work-Instructions/02-WI-200/wi-203-job-dossier-evidence-pack-and-record-completeness.html",
    docTitle: "WI-203 — Job Dossier, Evidence Pack and Record Completeness",
  },
  {
    relPath:
      "03-Tai-Lieu-Van-Hanh/02-Work-Instructions/02-WI-200/wi-206-ship-release-pack-sscc-label-and-pack-reconciliation.html",
    docTitle: "WI-206 — Ship Release Pack, SSCC Label and Pack Reconciliation",
  },
  {
    relPath:
      "03-Tai-Lieu-Van-Hanh/02-Work-Instructions/02-WI-200/wi-207-high-risk-job-readiness-control-tower.html",
    docTitle: "WI-207 — High-Risk Job Readiness Control Tower",
  },
];

const REPORT_PATH = path.join(
  ROOT,
  "_reports",
  "deep-operational-vietnamese-pass-20260324b.md"
);

function escapeRe(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function applyCase(source, target) {
  const letters = source.replace(/[^A-Za-z]/g, "");
  if (!letters) {
    return target;
  }
  if (letters === letters.toUpperCase()) {
    return target.toUpperCase();
  }
  if (letters.charAt(0) === letters.charAt(0).toUpperCase()) {
    return target.charAt(0).toUpperCase() + target.slice(1);
  }
  return target;
}

function protectBlocks(html) {
  const blocks = [];
  const protectedHtml = html.replace(
    /<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>|<!--[\s\S]*?-->|<title\b[^>]*>[\s\S]*?<\/title>/gi,
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

function mapTextNodes(html, handler) {
  return html
    .split(/(<[^>]+>)/g)
    .map((part) => (part.startsWith("<") ? part : handler(part)))
    .join("");
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

const GLOBAL_RULES = [
  commonRule(
    "cleanup_gate_phrase",
    /cổng kiểm soát\s*\(control cổng kiểm soát\s*\(gate\)\)|control cổng kiểm soát\s*\(gate\)/gi,
    "cổng kiểm soát"
  ),
  commonRule(
    "cleanup_double_packlist",
    /phiếu kê đóng gói\s*\(\s*phiếu kê đóng gói\s*\)/gi,
    "phiếu kê đóng gói"
  ),
  commonRule(
    "cleanup_ship_release_pack_phrase",
    /ship gói phát hành/gi,
    "bộ hồ sơ phê duyệt giao hàng"
  ),
  commonRule(
    "cleanup_job_dossier_label",
    /hồ sơ công việc\s*\(job dossier\)/gi,
    "hồ sơ công việc"
  ),
  uncommonRule(
    "flow_down",
    /\bluồng-down\b|\bflow-down\b/gi,
    "triển khai đầy đủ yêu cầu (flow-down)",
    "triển khai đầy đủ yêu cầu"
  ),
  uncommonRule(
    "baseline_package",
    /\bbaseline package\b/gi,
    "bộ hồ sơ chuẩn (baseline package)",
    "bộ hồ sơ chuẩn"
  ),
  uncommonRule(
    "job_snapshot",
    /\bjob snapshot\b/gi,
    "bản chụp trạng thái theo lệnh sản xuất (job snapshot)",
    "bản chụp trạng thái theo lệnh sản xuất"
  ),
  uncommonRule(
    "snapshot",
    /\bsnapshot\b/gi,
    "bản chụp trạng thái (snapshot)",
    "bản chụp trạng thái"
  ),
  uncommonRule(
    "baseline",
    /\bbaseline\b/gi,
    "mốc chuẩn (baseline)",
    "mốc chuẩn"
  ),
  uncommonRule(
    "legal_hold",
    /\blegal hold\b/gi,
    "tạm khóa phục vụ pháp lý (legal hold)",
    "tạm khóa phục vụ pháp lý"
  ),
  uncommonRule(
    "first_piece",
    /\bfirst piece\b/gi,
    "mẫu đầu (first piece)",
    "mẫu đầu"
  ),
  commonRule("job_dossier", /\bjob dossier\b/gi, "hồ sơ công việc"),
  commonRule("ship_release", /\bship release\b/gi, "phê duyệt giao hàng"),
  commonRule("ship_confirm", /\bship confirm\b/gi, "xác nhận giao hàng"),
  commonRule("ship_packet", /\bship packet\b/gi, "bộ hồ sơ giao hàng"),
  commonRule("shipment_pack", /\bshipment pack\b/gi, "bộ hồ sơ giao hàng"),
  commonRule("ship_pack", /\bship pack\b/gi, "bộ hồ sơ giao hàng"),
  commonRule("invoice_request", /\binvoice request\b/gi, "yêu cầu lập hóa đơn"),
  commonRule("invoice_packet", /\binvoice packet\b/gi, "bộ hồ sơ hóa đơn"),
  commonRule("job_close", /\bjob close\b/gi, "đóng lệnh sản xuất"),
  commonRule("job_closed", /\bjob closed\b/gi, "đã đóng lệnh sản xuất"),
  commonRule("job_costing", /\bjob costing\b/gi, "tính giá thành lệnh sản xuất"),
  commonRule("cost_capture", /\bcost capture\b/gi, "ghi nhận chi phí"),
  commonRule("margin_review", /\bmargin review\b/gi, "rà soát biên lợi nhuận"),
  commonRule(
    "gross_margin_variance",
    /\bgross margin variance\b/gi,
    "chênh lệch biên lợi nhuận gộp"
  ),
  commonRule("cost_of_poor_quality", /\bcost of poor quality\b/gi, "chi phí do chất lượng kém"),
  commonRule("variance", /\bvariance\b/gi, "chênh lệch"),
  commonRule("dispute", /\bdispute\b/gi, "tranh chấp"),
  commonRule("partial_shipment", /\bpartial shipment\b|\bpartial ship\b/gi, "giao hàng từng phần"),
  commonRule("split_lot", /\bsplit lot\b/gi, "tách lô"),
  commonRule("split_shipment", /\bsplit shipment\b/gi, "chia lô giao hàng"),
  commonRule("hot_job", /\bhot-job\b|\bhot job\b/gi, "đơn gấp"),
  commonRule("kickoff", /\bkick-off\b|\bkick off\b/gi, "khởi động"),
  commonRule("replan", /\breplan\b/gi, "lập lại kế hoạch"),
  commonRule("resequence", /\bresequence\b/gi, "xếp lại thứ tự ưu tiên"),
  commonRule("mismatch", /\bmismatch\b/gi, "không khớp"),
  commonRule("working_file", /\bworking file\b/gi, "tệp làm việc tạm"),
  commonRule("risk_worksheet", /\brisk worksheet\b/gi, "phiếu theo dõi rủi ro"),
  commonRule("customer_updates", /\bcustomer updates?\b/gi, "cập nhật cho khách hàng"),
  commonRule("customer_communication", /\bcustomer communication\b/gi, "trao đổi với khách hàng"),
  commonRule("customer_notification", /\bcustomer notification\b/gi, "thông báo cho khách hàng"),
  commonRule("customer_specific", /\bcustomer-specific\b/gi, "theo yêu cầu riêng của khách hàng"),
  commonRule("customer_label", /\bcustomer label\b/gi, "nhãn theo yêu cầu khách hàng"),
  commonRule("customer_package", /\bcustomer package\b/gi, "bộ hồ sơ giao khách"),
  commonRule("customer_instruction", /\bcustomer instructions?\b/gi, "hướng dẫn của khách hàng"),
  commonRule("customer_notes", /\bcustomer notes?\b/gi, "ghi chú của khách hàng"),
  commonRule("customer_supplied", /\bcustomer-supplied\b/gi, "do khách hàng cung cấp"),
  commonRule("customer_service_phrase", /Sales\/Customer Service/gi, "Sales/Customer Service"),
  commonRule("orchestration", /\borchestration\b/gi, "điều phối"),
  commonRule("clarif_abbrev", /\bclarif\./gi, "làm rõ"),
  commonRule("clarifications", /\bclarifications?\b/gi, "nội dung làm rõ"),
  commonRule("acknowledgement", /\backnowledgement\b/gi, "phản hồi ban đầu"),
  commonRule("right_first_time", /\bright-first-time\b/gi, "đúng ngay từ đầu"),
  commonRule("expedite", /\bexpedite\b/gi, "đẩy nhanh tiến độ"),
  commonRule("cash_trigger", /\bcash trigger\b/gi, "điều kiện kích hoạt lập hóa đơn"),
  commonRule("reconciliation", /\breconciliation\b/gi, "đối soát"),
  commonRule("inner_pack", /\binner-pack\b/gi, "kiện trong"),
  commonRule("outer_pack", /\bouter-pack\b/gi, "kiện ngoài"),
  commonRule("logistic_unit", /\blogistic unit\b/gi, "đơn vị logistics"),
  commonRule("relabel", /\brelabel\b/gi, "dán nhãn lại"),
  commonRule("repack", /\brepack\b/gi, "đóng gói lại"),
  commonRule("void_upper", /\bVOID\b/g, "ĐÁNH DẤU HỦY"),
  commonRule("void_lower", /\bvoid\b/gi, "đánh dấu hủy"),
  commonRule("approval_history", /\bapproval history\b/gi, "lịch sử phê duyệt"),
  commonRule("approval_chain", /\bapproval chain\b/gi, "chuỗi phê duyệt"),
  commonRule("approval_ladder", /\bapproval ladder\b/gi, "thang phê duyệt"),
  commonRule("pack_structure", /\bpack structure\b/gi, "cấu trúc kiện"),
  commonRule("pack_completeness", /\bpack completeness\b/gi, "độ đầy đủ của bộ hồ sơ"),
  commonRule("pack_count", /\bpack count\b/gi, "số lượng kiện"),
  commonRule("ship_to", /\bship-to\b/gi, "địa điểm giao hàng"),
  commonRule("after_hours", /\bafter-hours\b/gi, "ngoài giờ"),
  commonRule("dock_discipline", /\bdock discipline\b/gi, "kỷ luật khu vực xuất hàng"),
  commonRule("dock_freeze", /\bdock freeze\b/gi, "khóa khu vực xuất hàng"),
  commonRule("control_tower", /\bcontrol tower\b/gi, "trung tâm điều hành"),
  commonRule("alternate_machine", /\balternate machine\b/gi, "máy thay thế"),
  commonRule("staged_material", /\bstaged material\b/gi, "vật tư cấp theo đợt"),
  commonRule("carry_over", /\bcarry-over\b/gi, "chuyển sang ngày hôm sau"),
  commonRule("ship_mode", /\bship mode\b/gi, "phương thức giao hàng"),
  commonRule("read_only", /\bread-only\b/gi, "chỉ đọc"),
  commonRule("controlled_copy", /\bcontrolled copy\b/gi, "bản sao kiểm soát"),
  commonRule(
    "controlled_pou_copy",
    /\bcontrolled point-of-use copy\b/gi,
    "bản sao kiểm soát tại điểm sử dụng"
  ),
  commonRule("point_of_use", /\bpoint-of-use\b/gi, "điểm sử dụng"),
  commonRule("supersede", /\bsupersede\b/gi, "thay thế hiệu lực"),
  commonRule("emergency_release", /\bemergency release\b/gi, "phát hành khẩn"),
  commonRule("snapshot_mismatch", /\bsnapshot mismatch\b/gi, "không khớp bản chụp trạng thái"),
  commonRule(
    "part_rev_standard_package",
    /\bpart\/rev standard package\b/gi,
    "bộ hồ sơ chuẩn Part/Rev"
  ),
  commonRule("job_frozen_package", /\bjob-frozen package\b/gi, "bộ hồ sơ đóng băng theo Job"),
  commonRule("planning_release", /\bplanning release\b/gi, "phê duyệt đưa vào kế hoạch"),
  commonRule("final_release", /\bfinal release\b/gi, "phê duyệt cuối cùng"),
  commonRule("invoice_release", /\binvoice release\b/gi, "phê duyệt hóa đơn"),
  commonRule("release_tham_quyen", /\brelease thẩm quyền\b/gi, "thẩm quyền phê duyệt"),
  commonRule("release_status", /\brelease trạng thái\b/gi, "trạng thái phê duyệt"),
  commonRule("release_decision", /\brelease decision\b/gi, "quyết định phê duyệt"),
  commonRule("release_copy", /\brelease copy\b/gi, "bản phát hành"),
  commonRule("re_release", /\bre-release\b/gi, "phê duyệt lại"),
  commonRule("released", /\breleased\b/gi, "đã phê duyệt"),
  commonRule("release", /\brelease\b/gi, "phê duyệt"),
  commonRule("ready_to_ship", /\bready to ship\b/gi, "sẵn sàng giao hàng"),
  commonRule("issue_register", /\bissue register\b/gi, "sổ theo dõi"),
  commonRule("route_summary", /\broute summary\b/gi, "tóm tắt lộ trình công đoạn"),
  commonRule("proof_sent", /\bsent proof\b/gi, "bằng chứng gửi"),
  commonRule("handoff_proof", /\bhand-?off proof\b/gi, "bằng chứng bàn giao"),
  commonRule("shipping_proof", /\bship(?:ping)? proof\b/gi, "bằng chứng giao hàng"),
  commonRule("clean_pack", /\bclean-pack\b/gi, "bao gói sạch"),
  commonRule("chargeback", /\bchargeback\b/gi, "khoản truy thu"),
  commonRule("write_off", /\bwrite-off\b/gi, "xóa nợ"),
  commonRule("rebate", /\brebate\b/gi, "khoản hoàn giảm"),
  commonRule("short_ship", /\bshort-ship\b/gi, "giao thiếu"),
  commonRule("month_end", /\bmonth-end\b/gi, "cuối kỳ"),
  commonRule("front_end", /\bfront-end\b/gi, "đầu nguồn"),
  commonRule("commercial_leakage", /\bcommercial leakage\b/gi, "thất thoát thương mại"),
  commonRule("commercial_discipline", /\bcommercial discipline\b/gi, "kỷ luật thương mại"),
];

const FILE_RULES = new Map([
  [
    "03-Tai-Lieu-Van-Hanh/01-SOPs/02-SOP-200/sop-201-order-fulfillment-rfq-to-cash.html",
    [
      commonRule(
        "s201_chain",
        /Chuỗi RFQ → Báo giá → PO → Họp triển khai → Release → Giao hàng → Hóa đơn/gi,
        "Chuỗi RFQ → Báo giá → PO → Họp triển khai → Phê duyệt thực hiện → Giao hàng → Lập hóa đơn"
      ),
      commonRule(
        "s201_scope_cover",
        /RFQ, khả thi thương mại – kỹ thuật, giả định báo giá, rà soát cam kết đơn hàng, họp triển khai, hồ sơ đơn hàng opening, orchestration mức sẵn sàng, execution theo dõi tiếp, lô giao hàng bàn giao, hóa đơn request và job đóng sự kiện\./gi,
        "RFQ, đánh giá khả thi thương mại – kỹ thuật, giả định báo giá, rà soát cam kết đơn hàng, họp triển khai, mở hồ sơ đơn hàng, điều phối mức sẵn sàng, theo dõi quá trình thực hiện, bàn giao lô giao hàng, yêu cầu lập hóa đơn và đóng lệnh sản xuất."
      ),
      commonRule(
        "s201_scope_exclusion",
        /baseline\/snapshot release ở SOP-303; planning điều độ cấp việc ở/gi,
        "phát hành bộ hồ sơ chuẩn và bản chụp trạng thái tại SOP-303; điều độ cấp việc tại"
      ),
      commonRule(
        "s201_scope_exclusion2",
        /kiểm tra cuối & lô giao hàng release ở/gi,
        "kiểm tra cuối và phê duyệt lô giao hàng tại"
      ),
      commonRule("s201_header_clarif", /RFQ &amp; làm rõ\./gi, "RFQ &amp; làm rõ"),
      commonRule("s201_header_dossier", /Họp triển khai &amp; dossier/gi, "Họp triển khai &amp; hồ sơ công việc"),
      commonRule("s201_header_execution", /Execution orchestration/gi, "Điều phối thực hiện"),
      commonRule("s201_header_release_auth", /Release thẩm quyền điển hình/gi, "Thẩm quyền phê duyệt điển hình"),
      commonRule(
        "s201_g2",
        /Họp triển khai &amp; dossier opened/gi,
        "Họp triển khai và mở hồ sơ công việc"
      ),
      commonRule("s201_g3", /Mức sẵn sàng released/gi, "Mức sẵn sàng đã được phê duyệt"),
      commonRule("s201_g4", /Execution controlled/gi, "Thực hiện có kiểm soát"),
      commonRule(
        "s201_g5",
        /Giao hàng\/hóa đơn bàn giao completed/gi,
        "Hoàn tất bàn giao giao hàng và lập hóa đơn"
      ),
      commonRule("s201_entry", /Entry criteria/gi, "Tiêu chí vào"),
      commonRule("s201_exit", /Exit criteria/gi, "Tiêu chí ra"),
      commonRule("s201_ack", /RFQ acknowledgement/gi, "Phản hồi RFQ ban đầu"),
      commonRule("s201_dossier_g2", /Dossier completeness at G2/gi, "Độ đầy đủ hồ sơ tại G2"),
      commonRule("s201_customer_update", /Customer update/gi, "Cập nhật cho khách hàng"),
      commonRule(
        "s201_title_glossary1",
        /Control cổng kiểm soát/gi,
        "Cổng kiểm soát"
      ),
      commonRule("s201_title_glossary2", /Hồ sơ công việc \(job dossier\)/gi, "Hồ sơ công việc"),
      commonRule("s201_title_glossary3", /Luồng-down/gi, "Triển khai đầy đủ yêu cầu"),
      commonRule("s201_title_glossary4", /\bHold\b/g, "Tạm giữ"),
      commonRule("s201_title_glossary5", /\bExpedite\b/g, "Đẩy nhanh tiến độ"),
      commonRule("s201_title_glossary6", /Cash trigger/gi, "Điều kiện kích hoạt lập hóa đơn"),
      commonRule("s201_po_award", /\bPO award\b/gi, "PO được khách chốt"),
      commonRule(
        "s201_latest_drawing",
        /\blatest drawing\/spec\b/gi,
        "bản vẽ/đặc tính kỹ thuật mới nhất"
      ),
      commonRule("s201_customer_milestones", /\bcustomer milestones\b/gi, "các mốc cam kết với khách hàng"),
      commonRule("s201_dossier_index", /\bdossier index\b/gi, "chỉ mục hồ sơ công việc"),
      commonRule(
        "s201_baseline_combo",
        /\bbaseline\/snapshot\/material\/tool\/gage\b/gi,
        "mốc chuẩn/bản chụp trạng thái/vật tư/dụng cụ/thiết bị đo"
      ),
      commonRule("s201_ship_pack_rule", /\bpack\/ship rule\b/gi, "quy tắc đóng gói/giao hàng"),
      commonRule("s201_material_source", /\bmaterial source\b/gi, "nguồn vật tư"),
      commonRule("s201_change_path", /\bchange path\b/gi, "luồng thay đổi"),
      commonRule("s201_release_path", /\brelease path\b/gi, "luồng phê duyệt"),
      commonRule("s201_until_clean", /\buntil clean\b/gi, "cho đến khi hồ sơ khớp sạch"),
      commonRule("s201_claim_open_point", /\bclaim\/open point\b/gi, "khiếu nại/điểm còn mở"),
      commonRule("s201_history", /\bhistory\b/gi, "lịch sử"),
      commonRule("s201_review_hoc_lai", /\breview học lại\b/gi, "rà soát bài học"),
      commonRule("s201_missed_date", /\bmissed date\b/gi, "trễ hẹn giao"),
      commonRule("s201_premium_freight", /\bpremium freight\b/gi, "cước vận chuyển phát sinh"),
      commonRule("s201_margin_deviation", /\bmargin deviation\b/gi, "lệch biên lợi nhuận"),
      commonRule("s201_risk_action", /\brisk\/action\b/gi, "rủi ro/hành động"),
      commonRule("s201_completion_checklist", /\bcompletion bảng kiểm\b/gi, "bảng kiểm hoàn tất"),
    ],
  ],
  [
    "03-Tai-Lieu-Van-Hanh/01-SOPs/03-SOP-300/sop-303-engineering-release-baseline-package-and-job-snapshot-control.html",
    [
      commonRule("s303_job_frozen_row", /Job-frozen package Number/gi, "Bộ hồ sơ đóng băng theo Job"),
      commonRule("s303_register_row", /Vấn đề register/gi, "Sổ theo dõi phát hành"),
      commonRule(
        "s303_point_of_use_copy",
        /Controlled point-of-use copy/gi,
        "Bản sao kiểm soát tại điểm sử dụng"
      ),
      commonRule("s303_supersede_row", /\bSupersede\b/gi, "Thay thế hiệu lực"),
      commonRule("s303_read_only_release_copy", /Read-only release copy/gi, "Bản phát hành chỉ đọc"),
      commonRule("s303_snapshot_issued", /Snapshot issued to điểm sử dụng/gi, "Phát hành bản chụp trạng thái tới điểm sử dụng"),
      commonRule("s303_wrong_revision", /Wrong-revision at điểm sử dụng/gi, "Sai revision tại điểm sử dụng"),
      commonRule("s303_registered_snapshot", /Vấn đề registered snapshot/gi, "Bản chụp trạng thái đã được ghi nhận"),
      commonRule("s303_issue_to_pou", /Vấn đề to điểm sử dụng/gi, "Phát hành tới điểm sử dụng"),
      commonRule("s303_snapshot_issue_log", /Snapshot vấn đề nhật ký/gi, "Nhật ký phát hành bản chụp trạng thái"),
      commonRule("s303_issue_time", /vấn đề time/gi, "thời điểm phát hành"),
      commonRule("s303_obsolete_sweep", /obsolete sweep/gi, "quét thu hồi bản cũ"),
      commonRule("s303_withdrawal", /\bwithdrawal\b/gi, "thu hồi"),
      commonRule("s303_effective", /\beffective\b/gi, "có hiệu lực"),
      commonRule("s303_no_release", /\bno-release\b/gi, "không được phê duyệt"),
      commonRule("s303_packet", /\bpacket\b/gi, "bộ hồ sơ"),
    ],
  ],
  [
    "03-Tai-Lieu-Van-Hanh/01-SOPs/05-SOP-500/sop-501-production-planning-scheduling-and-dispatch-control.html",
    [
      commonRule("s501_freeze_window", /freeze window \/ cửa sổ khóa kế hoạch/gi, "cửa sổ khóa kế hoạch"),
      commonRule("s501_hot_job_ladder", /hot-job ladder/gi, "thang xử lý đơn gấp"),
      commonRule("s501_quality_gate", /\bquality gate\b/gi, "cổng kiểm soát chất lượng"),
      commonRule("s501_wip_cap_breach", /\bWIP cap breach\b/gi, "vượt ngưỡng WIP cap"),
      commonRule("s501_fail_start", /\bfail-start\b/gi, "khởi động không thành công"),
      commonRule("s501_ready_with_controls", /READY WITH CONTROLS/gi, "SẴN SÀNG KÈM KIỂM SOÁT"),
      commonRule("s501_blocked", /\bBLOCKED\b/g, "BỊ CHẶN"),
      commonRule("s501_ship_window", /\bship window\b/gi, "khung giao hàng"),
      commonRule("s501_review72", /Review chân trời 72 giờ/gi, "Rà soát chân trời 72 giờ"),
    ],
  ],
  [
    "03-Tai-Lieu-Van-Hanh/01-SOPs/06-SOP-600/sop-605-final-inspection-coc-and-shipment-release.html",
    [
      commonRule("s605_ship_packet_term", /Bộ hồ sơ phê duyệt giao hàng \(ship gói phát hành\)/gi, "Bộ hồ sơ phê duyệt giao hàng"),
      commonRule("s605_final_release_heading", /Kích hoạt final release/gi, "Kích hoạt phê duyệt cuối cùng"),
      commonRule("s605_release_hold", /\bRelease hold\b/gi, "Tạm giữ phê duyệt"),
      commonRule("s605_ready_for_final", /Ready-for-final quality rate/gi, "Tỷ lệ sẵn sàng cho kiểm tra cuối"),
      commonRule("s605_after_ship", /\bafter ship\b/gi, "sau giao hàng"),
      commonRule("s605_no_release", /No release/gi, "Không được phê duyệt"),
      commonRule("s605_release_allowed", /Release allowed/gi, "Được phép phê duyệt"),
      commonRule(
        "s605_release_under_exception",
        /Release under approved exception/gi,
        "Phê duyệt theo ngoại lệ đã được chấp thuận"
      ),
      commonRule("s605_same_release_gates", /same release gates/gi, "cùng các cổng phê duyệt"),
      commonRule("s605_trace_ready", /trace-ready/gi, "sẵn sàng truy xuất"),
    ],
  ],
  [
    "03-Tai-Lieu-Van-Hanh/01-SOPs/08-SOP-800/sop-803-invoicing-job-costing-and-arap.html",
    [
      commonRule("s803_job_word", /\bjob\b/gi, "lệnh sản xuất"),
      commonRule("s803_ship_done", /\bship xong\b/gi, "giao hàng xong"),
      commonRule("s803_invoice_request_term", /Invoice request/gi, "Yêu cầu lập hóa đơn"),
      commonRule("s803_invoice_cycle_time", /Invoice cycle time/gi, "Thời gian chu trình lập hóa đơn"),
      commonRule("s803_billing_accuracy", /Billing accuracy/gi, "Độ chính xác xuất hóa đơn"),
      commonRule("s803_job_close_timeliness", /Job close timeliness/gi, "Thời gian đóng lệnh sản xuất"),
      commonRule("s803_invoice_discipline", /Invoice discipline/gi, "Kỷ luật lập hóa đơn"),
      commonRule("s803_margin_real", /Margin review thực chiến/gi, "Rà soát biên lợi nhuận thực chiến"),
      commonRule("s803_invoice_release", /\bhold invoice\b/gi, "tạm giữ hóa đơn"),
      commonRule("s803_packet", /\bpacket\b/gi, "bộ hồ sơ"),
      commonRule("s803_costing_sheet_phrase", /\bCosting /gi, "Bảng tính giá thành "),
    ],
  ],
  [
    "03-Tai-Lieu-Van-Hanh/02-Work-Instructions/02-WI-200/wi-203-job-dossier-evidence-pack-and-record-completeness.html",
    [
      commonRule("w203_jobnum", /Một JobNum = một dossier điều hành chính thức/gi, "Một JobNum = một hồ sơ điều hành chính thức"),
      commonRule("w203_gate_equals", /Thiếu bằng chứng bắt buộc theo cổng kiểm soát \(gate\) = không đóng cổng kiểm soát/gi, "Thiếu bằng chứng bắt buộc theo cổng kiểm soát = không được đóng cổng kiểm soát"),
      commonRule("w203_ship_specific", /ship-specific hoặc lot\/job-specific/gi, "theo lô giao hàng hoặc theo lô/lệnh sản xuất"),
      commonRule("w203_customer_pack", /Customer Pack đầu ra/gi, "Bộ hồ sơ giao khách đầu ra"),
      commonRule("w203_ship_release_folder", /06_G5-Ship-Release/gi, "06_G5-Phê-duyệt-giao-hàng"),
      commonRule("w203_archive", /99_Archive-Đã khóa/gi, "99_Lưu trữ-Đã khóa"),
      commonRule("w203_pack_build", /pack build/gi, "cấu hình đóng gói"),
      commonRule("w203_trace_chain", /trace chain/gi, "chuỗi truy xuất"),
      commonRule("w203_source_inspect", /source kiểm tra/gi, "kiểm tra tại nguồn"),
      commonRule("w203_class", /Hồ sơ class/gi, "Nhóm hồ sơ"),
      commonRule("w203_content_type", /content type/gi, "loại nội dung"),
    ],
  ],
  [
    "03-Tai-Lieu-Van-Hanh/02-Work-Instructions/02-WI-200/wi-206-ship-release-pack-sscc-label-and-pack-reconciliation.html",
    [
      commonRule("w206_packid_shipment", /PackID\/Shipment/gi, "PackID/lô giao hàng"),
      commonRule("w206_quality_release", /Quality release/gi, "Phê duyệt chất lượng"),
      commonRule("w206_source_data", /Source data/gi, "Dữ liệu nguồn"),
      commonRule("w206_pack_rule", /Tình huống pack/gi, "Tình huống đóng gói"),
      commonRule("w206_customer_overlay", /customer label overlay/gi, "nhãn bổ sung theo yêu cầu khách hàng"),
      commonRule("w206_pack_completeness", /review lại pack completeness/gi, "rà soát lại độ đầy đủ của bộ hồ sơ"),
      commonRule("w206_mixed_lot", /Mixed lot \/ mixed part rule/gi, "Quy tắc trộn lô / trộn mã"),
      commonRule("w206_release_data", /release data/gi, "dữ liệu phê duyệt"),
      commonRule("w206_hold_shipment", /HOLD shipment/gi, "TẠM GIỮ lô giao hàng"),
    ],
  ],
  [
    "03-Tai-Lieu-Van-Hanh/02-Work-Instructions/02-WI-200/wi-207-high-risk-job-readiness-control-tower.html",
    [
      commonRule("w207_job_word", /\bJob\b/g, "Lệnh sản xuất"),
      commonRule("w207_job_lower", /\bjob\b/g, "lệnh sản xuất"),
      commonRule("w207_open_hold", /open hold/gi, "tạm giữ đang mở"),
      commonRule("w207_commercial_customer", /Commercial \/ customer/gi, "Thương mại / khách hàng"),
      commonRule("w207_engineering_baseline", /Engineering baseline/gi, "Mốc chuẩn kỹ thuật"),
      commonRule("w207_quality_release", /Quality &amp; release/gi, "Chất lượng và phê duyệt"),
      commonRule("w207_ready", /\bREADY\b/g, "SẴN SÀNG"),
      commonRule("w207_blocked", /\bBLOCKED\b/g, "BỊ CHẶN"),
      commonRule("w207_ship_risk", /RỦI RO GIAO HÀNG/gi, "RỦI RO GIAO HÀNG"),
      commonRule("w207_daily_tier", /daily tier\/escalation/gi, "daily tier/chuyển cấp xử lý"),
    ],
  ],
]);

function applyRules(text, rules, state, counts) {
  let next = text;

  for (const rule of rules) {
    next = next.replace(rule.re, (match) => {
      const replacement = rule.replace(match, state);
      if (replacement !== match) {
        counts.set(rule.key, (counts.get(rule.key) || 0) + 1);
      }
      return replacement;
    });
  }

  return next;
}

function restoreDocTitle(html, docTitle) {
  const fullTitle = `${docTitle} | HESEM QMS`;

  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${fullTitle}</title>`);
  html = html.replace(
    /(<div class="title">[\s\S]*?<strong>)[\s\S]*?(<\/strong>)/i,
    `$1${docTitle}$2`
  );
  html = html.replace(/(<h1>)[\s\S]*?(<\/h1>)/i, `$1${docTitle}$2`);

  return html;
}

function ensureReportDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

const results = [];

for (const target of TARGETS) {
  const fullPath = path.join(ROOT, target.relPath);
  const original = fs.readFileSync(fullPath, "utf8");
  const protectedBlocks = protectBlocks(original);
  const state = { firstSeen: new Set() };
  const counts = new Map();
  const fileRules = FILE_RULES.get(target.relPath) || [];
  const combinedRules = [...fileRules, ...GLOBAL_RULES];

  let updated = mapTextNodes(protectedBlocks.html, (text) =>
    applyRules(text, combinedRules, state, counts)
  );
  updated = protectedBlocks.restore(updated);
  updated = restoreDocTitle(updated, target.docTitle);

  if (updated !== original) {
    fs.writeFileSync(fullPath, updated, "utf8");
  }

  const totalReplacements = [...counts.values()].reduce((sum, value) => sum + value, 0);

  results.push({
    relPath: target.relPath,
    docTitle: target.docTitle,
    changed: updated !== original,
    totalReplacements,
    topRules: [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12),
  });
}

ensureReportDir(REPORT_PATH);

const reportLines = [
  "# Deep Operational Vietnamese Pass — 2026-03-24 (batch b)",
  "",
  `Target files: ${TARGETS.length}`,
  "",
];

for (const result of results) {
  reportLines.push(`## ${result.docTitle}`);
  reportLines.push(`- File: \`${result.relPath}\``);
  reportLines.push(`- Changed: ${result.changed ? "yes" : "no"}`);
  reportLines.push(`- Replacements: ${result.totalReplacements}`);
  if (result.topRules.length) {
    reportLines.push("- Top rules:");
    for (const [key, count] of result.topRules) {
      reportLines.push(`  - ${key}: ${count}`);
    }
  }
  reportLines.push("");
}

fs.writeFileSync(REPORT_PATH, reportLines.join("\n"), "utf8");

console.log(`Updated ${results.filter((item) => item.changed).length}/${results.length} files.`);
console.log(`Report: ${REPORT_PATH}`);
