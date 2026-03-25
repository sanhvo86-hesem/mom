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
  "deep-operational-vietnamese-pass-20260324c.md"
);

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
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

function escapeRe(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function applyCase(source, target) {
  const letters = source.replace(/[^A-Za-zÀ-ỹ]/g, "");
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

function commonRule(key, pattern, replacement) {
  return {
    key,
    pattern,
    replace(match) {
      return applyCase(match, replacement);
    },
  };
}

function uncommonRule(key, pattern, firstReplacement, laterReplacement) {
  return {
    key,
    pattern,
    replace(match, state) {
      if (!state.firstSeen.has(key)) {
        state.firstSeen.add(key);
        return applyCase(match, firstReplacement);
      }
      return applyCase(match, laterReplacement);
    },
  };
}

function exactRule(key, pattern, replacement) {
  return {
    key,
    pattern,
    replace() {
      return replacement;
    },
  };
}

function runRules(text, rules, state, counts) {
  let next = text;

  for (const rule of rules) {
    next = next.replace(rule.pattern, (match) => {
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

function applyHtmlReplacements(html, rules, counts) {
  let next = html;
  for (const rule of rules) {
    next = next.replace(rule.pattern, (...args) => {
      counts.set(rule.key, (counts.get(rule.key) || 0) + 1);
      return typeof rule.replacement === "function"
        ? rule.replacement(...args)
        : rule.replacement;
    });
  }
  return next;
}

const SHARED_TEXT_RULES = [
  exactRule("hold_upper", /\bHOLD\b/g, "TẠM GIỮ"),
  exactRule("hold_lower", /\bhold\b/g, "tạm giữ"),
  exactRule("pass_upper", /\bPASS\b/g, "ĐẠT"),
  exactRule("fail_upper", /\bFAIL\b/g, "KHÔNG ĐẠT"),
  commonRule("new_part", /\bnew part\b/gi, "chi tiết mới"),
  commonRule("repeat_part", /\brepeat part\b/gi, "chi tiết lặp lại"),
  commonRule("sample_build", /\bsample build\b/gi, "đơn mẫu"),
  commonRule("clarify", /\bclarify\b/gi, "làm rõ"),
  commonRule("review", /\breview\b/gi, "rà soát"),
  commonRule("summary", /\bsummary\b/gi, "tóm tắt"),
  commonRule("timeline", /\btimeline\b/gi, "tiến độ"),
  commonRule("action", /\baction\b/gi, "hành động"),
  commonRule("actions", /\bactions\b/gi, "hành động"),
  commonRule("latest", /\blatest\b/gi, "mới nhất"),
  commonRule("request_completeness", /\brequest completeness\b/gi, "độ đầy đủ của yêu cầu"),
  commonRule(
    "document_completeness",
    /\bdocument completeness\b/gi,
    "độ đầy đủ của chứng từ"
  ),
  commonRule("risk_note", /\brisk note\b/gi, "ghi chú rủi ro"),
  commonRule("missing_item", /\bmissing items?\b/gi, "hạng mục còn thiếu"),
  commonRule("completion_logic", /\bcompletion logic\b/gi, "logic hoàn tất"),
  commonRule("approval_history", /\bapproval history\b/gi, "lịch sử phê duyệt"),
  commonRule("approval_log", /\bapproval log\b/gi, "nhật ký phê duyệt"),
  commonRule("approval_note", /\bapproval note\b/gi, "ghi chú phê duyệt"),
  commonRule("approval_notes", /\bapproval notes\b/gi, "ghi chú phê duyệt"),
  commonRule("issue_log", /\bissue log\b/gi, "nhật ký sự việc"),
  commonRule("register", /\bregister\b/gi, "sổ theo dõi"),
  commonRule("tracking", /\btracking\b/gi, "theo dõi"),
  commonRule("logic", /\blogic\b/gi, "logic"),
  commonRule("cadence", /\bcadence\b/gi, "nhịp"),
  commonRule("support_noun", /\bsupport\b/gi, "hỗ trợ"),
  commonRule("rule", /\brule\b/gi, "quy tắc"),
  commonRule("rules", /\brules\b/gi, "quy tắc"),
  commonRule("spec", /\bspec\b/gi, "yêu cầu kỹ thuật"),
  commonRule("specs", /\bspecs\b/gi, "yêu cầu kỹ thuật"),
  commonRule("package_lower", /\bpackage\b/gi, "bộ hồ sơ"),
  uncommonRule(
    "flow_down",
    /\bflow-down\b/gi,
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
    "legal_hold",
    /\blegal hold\b/gi,
    "tạm khóa phục vụ pháp lý (legal hold)",
    "tạm khóa phục vụ pháp lý"
  ),
];

const FILE_TEXT_RULES = new Map([
  [
    "03-Tai-Lieu-Van-Hanh/01-SOPs/02-SOP-200/sop-201-order-fulfillment-rfq-to-cash.html",
    [
      commonRule(
        "s201_job_dossier_body",
        /\bjob dossier\b/gi,
        "hồ sơ công việc"
      ),
      commonRule("s201_invoice_request", /\binvoice request\b/gi, "yêu cầu lập hóa đơn"),
      commonRule("s201_hoa_don_request", /\bhóa đơn request\b/gi, "yêu cầu lập hóa đơn"),
      commonRule("s201_pack_evidence", /\bbằng chứng pack\b/gi, "bằng chứng đóng gói"),
      commonRule("s201_ship_evidence", /\bshipping bằng chứng\b/gi, "bằng chứng giao hàng"),
      commonRule("s201_planning_hold", /\bplanning hold\b/gi, "tạm giữ ở khâu kế hoạch"),
      commonRule("s201_commit_ready", /\bcommit-ready\b/gi, "sẵn sàng cam kết"),
      commonRule("s201_commit", /\bcommit\b/gi, "cam kết"),
      commonRule("s201_chain", /\bchain\b/gi, "chuỗi"),
      commonRule("s201_assumption", /\bassumptions?\b/gi, "giả định"),
      commonRule("s201_workbook", /\bworkbook\b/gi, "tệp Excel"),
      commonRule("s201_order_management", /\border management\b/gi, "quản trị đơn hàng"),
      commonRule("s201_customer_update", /\bcustomer updates?\b/gi, "cập nhật cho khách hàng"),
      commonRule("s201_outsource_support", /\boutsource support\b/gi, "hỗ trợ thuê ngoài"),
      commonRule("s201_outsource_assist", /\boutsource assist\b/gi, "hỗ trợ thuê ngoài"),
      commonRule("s201_dossier", /\bdossier\b/gi, "hồ sơ công việc"),
      commonRule("s201_summary", /\bsummary\b/gi, "tóm tắt"),
      commonRule("s201_dispatch", /\bdispatch\b/gi, "điều độ"),
      commonRule("s201_boundary", /\bboundary\b/gi, "ranh giới"),
      commonRule("s201_matrix", /\bmatrix\b/gi, "ma trận"),
      commonRule("s201_lessons_learned", /\blessons learned\b/gi, "bài học kinh nghiệm"),
      commonRule("s201_risk_knowledge", /\brisk\/knowledge\b/gi, "rủi ro/tri thức"),
      commonRule("s201_split_doc", /\bsplit hồ sơ\b/gi, "hồ sơ tách riêng"),
      commonRule("s201_customer_approval", /\bcustomer approval\b/gi, "chấp thuận của khách hàng"),
      commonRule("s201_concession", /\bconcession\b/gi, "chấp thuận ngoại lệ"),
      commonRule("s201_disposition", /\bdisposition\b/gi, "hướng xử lý"),
      commonRule("s201_claimable_cost", /\bclaimable cost\b/gi, "chi phí có thể yêu cầu bồi hoàn"),
      commonRule("s201_capacity_impact", /\bcapacity impact\b/gi, "tác động năng lực"),
      commonRule("s201_accept_po", /\baccept PO\b/gi, "chấp nhận PO"),
      commonRule("s201_partial_shipment", /\bpartial shipment\b/gi, "giao hàng từng phần"),
      commonRule("s201_partial_lot", /\bpartial lot\b/gi, "lô giao hàng từng phần"),
      commonRule("s201_split_lot", /\bsplit lot\b/gi, "tách lô"),
      commonRule("s201_customer_specific", /\bcustomer-specific\b/gi, "theo yêu cầu riêng của khách hàng"),
      commonRule("s201_first_piece", /\bfirst piece\b/gi, "mẫu đầu"),
      commonRule("s201_clean", /\bclean\b/gi, "sạch"),
      commonRule("s201_items", /\bitems\b/gi, "hạng mục"),
      commonRule("s201_opened", /\bopened\b/gi, "đã mở"),
      commonRule("s201_risk_action_log", /\brisk\/nhật ký hành động\b/gi, "nhật ký rủi ro/hành động"),
      commonRule("s201_quality_gate_text", /\bgiao hàng phê duyệt\b/gi, "phê duyệt giao hàng"),
      commonRule("s201_holds", /\bHOLD–T\b/g, "TẠM GIỮ – KỸ THUẬT"),
      commonRule("s201_holds_c", /\bHOLD–C\b/g, "TẠM GIỮ – THƯƠNG MẠI"),
      commonRule("s201_holds_q", /\bHOLD–Q\b/g, "TẠM GIỮ – CHẤT LƯỢNG"),
      commonRule("s201_holds_cap", /\bHOLD–CAP\b/g, "TẠM GIỮ – NĂNG LỰC"),
      commonRule(
        "s201_hold_clarify",
        /\bHOLD–NỘI DUNG LÀM RÕ\b/g,
        "TẠM GIỮ – CHỜ LÀM RÕ"
      ),
    ],
  ],
  [
    "03-Tai-Lieu-Van-Hanh/01-SOPs/03-SOP-300/sop-303-engineering-release-baseline-package-and-job-snapshot-control.html",
    [
      commonRule("s303_job", /\bjob\b/gi, "lệnh sản xuất"),
      commonRule("s303_jobs", /\bjobs\b/gi, "các lệnh sản xuất"),
      commonRule("s303_build", /\bbuild\b/gi, "lập"),
      commonRule("s303_issue", /\bissue\b/gi, "phát hành"),
      commonRule("s303_distribution", /\bdistribution\b/gi, "phân phối"),
      commonRule("s303_handling", /\bhandling\b/gi, "xử lý"),
      commonRule("s303_formal", /\bformal\b/gi, "chính thức"),
      commonRule("s303_governance", /\bgovernance\b/gi, "quản trị"),
      commonRule("s303_source_data", /\bsource data\b/gi, "dữ liệu nguồn"),
      commonRule("s303_source_files", /\bsource files\b/gi, "tệp nguồn"),
      commonRule("s303_technical_package", /\btechnical package\b/gi, "bộ hồ sơ kỹ thuật"),
      commonRule(
        "s303_technical_package_completeness",
        /\btechnical package completeness\b/gi,
        "độ đầy đủ của bộ hồ sơ kỹ thuật"
      ),
      commonRule("s303_job_level", /\bjob-level\b/gi, "theo từng lệnh sản xuất"),
      commonRule("s303_quality_gate", /\bquality gate\b/gi, "cổng kiểm soát chất lượng"),
      commonRule("s303_measurement_clarity", /\bmeasurement phương pháp clarity\b/gi, "làm rõ phương pháp đo"),
      commonRule(
        "s303_package_classes",
        /\bpackage classes needing QA approval\b/gi,
        "nhóm bộ hồ sơ cần QA phê duyệt"
      ),
      commonRule("s303_audit_trail", /\baudit trail\b/gi, "dấu vết kiểm toán"),
      commonRule("s303_program_release", /\bprogram release\b/gi, "phát hành chương trình"),
      commonRule("s303_source_list", /\bsource list\b/gi, "danh mục nguồn"),
      commonRule("s303_open_items", /\bopen items\b/gi, "hạng mục mở"),
      commonRule("s303_required", /\brequired\b/gi, "bắt buộc"),
      commonRule("s303_conditional", /\bconditional\b/gi, "có điều kiện"),
      commonRule("s303_identifier", /\bidentifier\b/gi, "mã nhận diện"),
      commonRule("s303_operator", /\boperator\b/gi, "người vận hành"),
      commonRule("s303_lane", /\blane\b/gi, "luồng"),
      commonRule("s303_obsolete", /\bobsolete\b/gi, "lỗi thời"),
      commonRule("s303_superseded", /\bsuperseded\b/gi, "đã được thay thế"),
      commonRule("s303_supersedure", /\bsupersedure\b/gi, "việc thay thế hiệu lực"),
      commonRule("s303_withdrawal", /\bwithdrawal\b/gi, "thu hồi"),
      commonRule("s303_closure", /\bclosure\b/gi, "hoàn tất"),
      commonRule("s303_naming", /\bnaming\b/gi, "đặt tên"),
      commonRule("s303_date_issue", /\bissue date\b/gi, "ngày phát hành"),
      commonRule("s303_quick_check", /\bquick-check\b/gi, "kiểm tra nhanh"),
      commonRule("s303_quick_check_card", /\bquick-check card\b/gi, "thẻ kiểm tra nhanh"),
      commonRule("s303_revalidation", /\brevalidation\b/gi, "xác nhận lại"),
      commonRule("s303_hold_g3", /\bHold G3\/G4\b/g, "Tạm giữ tại G3/G4"),
      commonRule("s303_hold_g2", /\bHold G2\/G4\b/g, "Tạm giữ tại G2/G4"),
      commonRule("s303_hold_word", /\bHold\b/g, "Tạm giữ"),
    ],
  ],
  [
    "03-Tai-Lieu-Van-Hanh/01-SOPs/05-SOP-500/sop-501-production-planning-scheduling-and-dispatch-control.html",
    [
      commonRule("s501_hold_word", /\bHOLD\b/g, "TẠM GIỮ"),
      commonRule("s501_review", /\breview\b/gi, "rà soát"),
    ],
  ],
  [
    "03-Tai-Lieu-Van-Hanh/01-SOPs/06-SOP-600/sop-605-final-inspection-coc-and-shipment-release.html",
    [
      commonRule("s605_hold_word", /\bHOLD\b/g, "TẠM GIỮ"),
      commonRule("s605_review", /\breview\b/gi, "rà soát"),
    ],
  ],
  [
    "03-Tai-Lieu-Van-Hanh/01-SOPs/08-SOP-800/sop-803-invoicing-job-costing-and-arap.html",
    [
      commonRule("s803_invoice", /\binvoice\b/gi, "hóa đơn"),
      commonRule("s803_margin", /\bmargin\b/gi, "biên lợi nhuận"),
      commonRule("s803_management", /\bmanagement\b/gi, "quản trị"),
      commonRule("s803_costing", /\bcosting\b/gi, "tính giá thành"),
      commonRule("s803_instruction", /\binstruction\b/gi, "hướng dẫn"),
      commonRule("s803_condition", /\bcondition\b/gi, "điều kiện"),
      commonRule("s803_conditions", /\bconditions\b/gi, "điều kiện"),
      commonRule("s803_accuracy", /\baccuracy\b/gi, "độ chính xác"),
      commonRule("s803_ship_evidence", /\bship bằng chứng\b/gi, "bằng chứng giao hàng"),
      commonRule("s803_ship_docs", /\bship documents\b/gi, "chứng từ giao hàng"),
      commonRule("s803_shipment_proof", /\bshipment proof\b/gi, "bằng chứng giao hàng"),
      commonRule("s803_document_pack", /\binvoice package\b/gi, "bộ hồ sơ hóa đơn"),
      commonRule("s803_margin_pack", /\bmargin pack\b/gi, "bộ hồ sơ rà soát biên lợi nhuận"),
      commonRule("s803_bridge", /\bmargin bridge\b/gi, "bảng cầu nối biên lợi nhuận"),
      commonRule("s803_review_pack", /\breview pack\b/gi, "bộ hồ sơ rà soát"),
      commonRule("s803_request", /\brequest\b/gi, "yêu cầu"),
      commonRule("s803_dispatch", /\bdispatch\b/gi, "điều độ"),
      commonRule("s803_dossier", /\bdossier\b/gi, "hồ sơ công việc"),
      commonRule("s803_close", /\bclose\b/gi, "đóng"),
      commonRule("s803_closed", /\bclosed\b/gi, "đã đóng"),
      commonRule("s803_claim", /\bclaim\b/gi, "khiếu nại"),
      commonRule("s803_claims", /\bclaims\b/gi, "khiếu nại"),
      commonRule("s803_claim_cost", /\bclaim cost\b/gi, "chi phí khiếu nại"),
      commonRule("s803_delay", /\bdelay\b/gi, "chậm"),
      commonRule("s803_vendor_invoice", /\bvendor invoice\b/gi, "hóa đơn nhà cung cấp"),
      commonRule("s803_support", /\bsupport\b/gi, "hỗ trợ"),
      commonRule("s803_pricing_terms", /\bpricing\/terms\b/gi, "giá/điều khoản"),
      commonRule("s803_debit_credit", /\bdebit \/ credit\b/gi, "ghi nợ / ghi có"),
      commonRule("s803_credit_note", /\bcredit note\b/gi, "phiếu ghi có"),
      commonRule("s803_debit_note", /\bdebit note\b/gi, "phiếu ghi nợ"),
      commonRule("s803_segregation", /\bSegregation of duties\b/g, "Phân tách nhiệm vụ"),
      commonRule("s803_effect", /\beffect\b/gi, "tác động"),
      commonRule("s803_provisional", /\bprovisional\b/gi, "tạm tính"),
      commonRule("s803_manual_adjustment", /\bmanual adjustment\b/gi, "điều chỉnh thủ công"),
      commonRule("s803_period_close", /\bperiod close discipline\b/gi, "kỷ luật chốt kỳ"),
      commonRule("s803_execution_drift", /\bexecution drift\b/gi, "độ lệch trong quá trình thực hiện"),
      commonRule("s803_after_ship", /\bafter-ship\b/gi, "sau giao hàng"),
      commonRule("s803_commercial_leakage", /\bcommercial leakage\b/gi, "thất thoát thương mại"),
      commonRule("s803_overdue_ar", /\boverdue AR\b/gi, "AR quá hạn"),
      commonRule("s803_ap_handoff", /\bAP handoff\b/gi, "bàn giao sang AP"),
      commonRule("s803_post_ship", /\bpost-ship\b/gi, "sau giao hàng"),
      commonRule("s803_job_specific", /\bjob\b/gi, "lệnh sản xuất"),
    ],
  ],
  [
    "03-Tai-Lieu-Van-Hanh/02-Work-Instructions/02-WI-200/wi-203-job-dossier-evidence-pack-and-record-completeness.html",
    [
      commonRule("w203_review", /\breview\b/gi, "rà soát"),
      commonRule("w203_pack", /\bpack\b/gi, "bộ hồ sơ"),
    ],
  ],
  [
    "03-Tai-Lieu-Van-Hanh/02-Work-Instructions/02-WI-200/wi-206-ship-release-pack-sscc-label-and-pack-reconciliation.html",
    [
      commonRule("w206_inner_outer", /\binner pack \/ outer pack\b/gi, "kiện trong / kiện ngoài"),
      commonRule("w206_inner_pack", /\binner pack\b/gi, "kiện trong"),
      commonRule("w206_outer_pack", /\bouter pack\b/gi, "kiện ngoài"),
      commonRule("w206_shipment_data", /\bshipment data\b/gi, "dữ liệu lô giao hàng"),
      commonRule("w206_human_readable", /\bhuman-readable text\b/gi, "chuỗi ký tự đọc được"),
      commonRule("w206_hold_ncr", /\bhold\/NCR\b/gi, "tạm giữ/NCR"),
      commonRule("w206_pack_spec", /\bpack spec\b/gi, "quy cách đóng gói"),
      commonRule("w206_shipment_core", /\bshipment core\b/gi, "hồ sơ cốt lõi của lô giao hàng"),
      commonRule("w206_shipment", /\bshipment\b/gi, "lô giao hàng"),
      commonRule("w206_packid", /\bPackID\b/g, "PackID"),
      commonRule("w206_full_shipment", /\bfull shipment\b/gi, "lô giao hàng đầy đủ"),
      commonRule("w206_trace_chain", /\btrace chain\b/gi, "chuỗi truy xuất"),
      commonRule("w206_clean_pack", /\bclean pack\b/gi, "bao gói sạch"),
      commonRule("w206_preservation", /\bpreservation window\b/gi, "thời hạn bảo quản"),
      commonRule("w206_ship_escape", /\bship escape\b/gi, "lọt lỗi giao hàng"),
      commonRule("w206_pack_doc", /\bpack\/doc\b/gi, "đóng gói/chứng từ"),
      commonRule("w206_pack_folder", /\bpack hồ sơ\b/gi, "hồ sơ đóng gói"),
      commonRule("w206_ship_checklist", /\bship bảng kiểm\b/gi, "bảng kiểm giao hàng"),
      commonRule("w206_review_lai", /\breview lại\b/gi, "rà soát lại"),
      commonRule("w206_review_all", /\bReview lại\b/g, "Rà soát lại"),
      commonRule("w206_hold_word", /\bHOLD\b/g, "TẠM GIỮ"),
      commonRule("w206_hold_word_lower", /\bhold\b/gi, "tạm giữ"),
      commonRule("w206_on_time", /\bOn-time\b/g, "Đúng hạn"),
    ],
  ],
  [
    "03-Tai-Lieu-Van-Hanh/02-Work-Instructions/02-WI-200/wi-207-high-risk-job-readiness-control-tower.html",
    [
      commonRule("w207_job", /\bjob\b/gi, "lệnh sản xuất"),
      commonRule("w207_review", /\breview\b/gi, "rà soát"),
      commonRule("w207_hold", /\bHOLD\b/g, "TẠM GIỮ"),
    ],
  ],
]);

const FILE_HTML_RULES = new Map([
  [
    "03-Tai-Lieu-Van-Hanh/01-SOPs/02-SOP-200/sop-201-order-fulfillment-rfq-to-cash.html",
    [
      {
        key: "s201_restore_frm204",
        pattern: /FRM-204\s+(?:Order Kickoff Checklist|Job Họp triển khai Bảng kiểm|Bảng kiểm khởi động đơn hàng)/g,
        replacement: "FRM-204 Order Kickoff Checklist",
      },
      {
        key: "s201_restore_frm205",
        pattern: /FRM-205\s+(?:Job Dossier Evidence Index|Hồ sơ đơn hàng Index|Hồ sơ công việc Index)/g,
        replacement: "FRM-205 Job Dossier Evidence Index",
      },
      {
        key: "s201_restore_frm206",
        pattern: /FRM-206\s+(?:Job Completion Checklist|Bảng kiểm hoàn tất lệnh sản xuất)/g,
        replacement: "FRM-206 Job Completion Checklist",
      },
      {
        key: "s201_restore_frm207",
        pattern: /FRM-207\s+(?:Operational Risk Control Sheet|Operational Phiếu theo dõi rủi ro)/g,
        replacement: "FRM-207 Operational Risk Control Sheet",
      },
      {
        key: "s201_restore_frm821",
        pattern: /FRM-821\s+(?:Invoice Request|Hóa đơn Request)/g,
        replacement: "FRM-821 Invoice Request",
      },
      {
        key: "s201_cleanup_double_ship_release",
        pattern: /phê duyệt giao hàng\s+\(phê duyệt giao hàng\)/g,
        replacement: "phê duyệt giao hàng",
      },
      {
        key: "s201_cleanup_shipping_pack",
        pattern: /Lô giao hàng bằng chứng pack/g,
        replacement: "bộ bằng chứng giao hàng",
      },
      {
        key: "s201_cleanup_glyph1",
        pattern: /Cập nhật cho khách hàngs/g,
        replacement: "Cập nhật cho khách hàng",
      },
      {
        key: "s201_cleanup_glyph2",
        pattern: /danh mục phát hànhs/g,
        replacement: "danh mục phát hành",
      },
      {
        key: "s201_cleanup_title13",
        pattern: /Bộ workbook điều hành RFQ \/ order điều phối/g,
        replacement: "Bộ tệp Excel điều hành RFQ / điều phối đơn hàng",
      },
    ],
  ],
  [
    "03-Tai-Lieu-Van-Hanh/01-SOPs/03-SOP-300/sop-303-engineering-release-baseline-package-and-job-snapshot-control.html",
    [
      {
        key: "s303_restore_frm306",
        pattern: /FRM-306\b[^<\n]*?(?:Approval|Phê duyệt|approval)/g,
        replacement: "FRM-306 Engineering Release and Baseline Package Approval",
      },
      {
        key: "s303_restore_frm307",
        pattern: /FRM-307\b[^<\n]*?(?:Notice|Thu hồi Notice|Withdrawal Notice)/g,
        replacement: "FRM-307 Package Supersedure and Withdrawal Notice",
      },
      {
        key: "s303_cleanup_baseline",
        pattern: /bộ hồ sơ chuẩn \(bộ hồ sơ chuẩn \(mốc chuẩn \(baseline\) package\)\)/g,
        replacement: "bộ hồ sơ chuẩn (baseline package)",
      },
      {
        key: "s303_cleanup_double_baseline",
        pattern: /gói mốc chuẩn chuẩn/g,
        replacement: "bộ hồ sơ chuẩn",
      },
      {
        key: "s303_cleanup_snapshot",
        pattern: /bản chụp trạng thái theo lệnh sản xuất \(lệnh sản xuất bản chụp trạng thái\)/g,
        replacement: "bản chụp trạng thái theo lệnh sản xuất",
      },
      {
        key: "s303_cleanup_entry",
        pattern: /\bEntry criteria\b/g,
        replacement: "Tiêu chí vào",
      },
      {
        key: "s303_cleanup_exit",
        pattern: /\bExit criteria\b/g,
        replacement: "Tiêu chí ra",
      },
      {
        key: "s303_cleanup_control_gate",
        pattern: /control cổng kiểm soát/gi,
        replacement: "cổng kiểm soát",
      },
      {
        key: "s303_cleanup_support",
        pattern: /support operational touchpoints/gi,
        replacement: "điểm chạm vận hành hỗ trợ",
      },
      {
        key: "s303_cleanup_approval_log",
        pattern: /Approval nhật ký/g,
        replacement: "nhật ký phê duyệt",
      },
    ],
  ],
  [
    "03-Tai-Lieu-Van-Hanh/01-SOPs/08-SOP-800/sop-803-invoicing-job-costing-and-arap.html",
    [
      {
        key: "s803_restore_frm821",
        pattern: /FRM-821\s+(?:Invoice Request|Yêu cầu lập hóa đơn)/g,
        replacement: "FRM-821 Invoice Request",
      },
      {
        key: "s803_restore_frm206",
        pattern: /FRM-206\s+(?:Job Completion Checklist|Bảng kiểm hoàn tất lệnh sản xuất)/g,
        replacement: "FRM-206 Job Completion Checklist",
      },
      {
        key: "s803_restore_frm301",
        pattern: /FRM-301\s+(?:Costing Sheet|Bảng tính giá thành)/g,
        replacement: "FRM-301 Costing Sheet",
      },
      {
        key: "s803_restore_frm642",
        pattern: /FRM-642\s+(?:Final Inspection and CoC Register|Sổ theo dõi kiểm tra cuối và CoC)/g,
        replacement: "FRM-642 Final Inspection and CoC Register",
      },
      {
        key: "s803_cleanup_gate",
        pattern: /control cổng kiểm soát/gi,
        replacement: "cổng kiểm soát",
      },
      {
        key: "s803_cleanup_review_pack",
        pattern: /bộ hồ sơ rà soát \(bộ hồ sơ rà soát\)/g,
        replacement: "bộ hồ sơ rà soát",
      },
      {
        key: "s803_cleanup_ship_release_pack",
        pattern: /bộ hồ sơ phê duyệt giao hàng \(bộ hồ sơ phê duyệt giao hàng\)/g,
        replacement: "bộ hồ sơ phê duyệt giao hàng",
      },
      {
        key: "s803_cleanup_final_title",
        pattern: /support Bảng tính giá thành/g,
        replacement: "hỗ trợ Bảng tính giá thành",
      },
    ],
  ],
  [
    "03-Tai-Lieu-Van-Hanh/02-Work-Instructions/02-WI-200/wi-206-ship-release-pack-sscc-label-and-pack-reconciliation.html",
    [
      {
        key: "w206_cleanup_pack_term",
        pattern: /pack tương đương/g,
        replacement: "đơn vị tương đương",
      },
      {
        key: "w206_cleanup_double_pack",
        pattern: /Bộ bộ hồ sơ phê duyệt giao hàng/g,
        replacement: "Bộ hồ sơ phê duyệt giao hàng",
      },
      {
        key: "w206_cleanup_double_pack_lower",
        pattern: /bộ bộ hồ sơ phê duyệt giao hàng/g,
        replacement: "bộ hồ sơ phê duyệt giao hàng",
      },
      {
        key: "w206_cleanup_pack_phrase",
        pattern: /shipment\/pack hồ sơ/g,
        replacement: "hồ sơ lô giao hàng/đóng gói",
      },
      {
        key: "w206_cleanup_customer_pack",
        pattern: /nhãn theo yêu cầu khách hàng pack/g,
        replacement: "nhãn theo yêu cầu khách hàng",
      },
      {
        key: "w206_cleanup_ship_checklist",
        pattern: /ship bảng kiểm/g,
        replacement: "bảng kiểm giao hàng",
      },
      {
        key: "w206_cleanup_hold_log",
        pattern: /Hold nhật ký/g,
        replacement: "nhật ký tạm giữ",
      },
      {
        key: "w206_cleanup_hold_kpi",
        pattern: /shipment TẠM GIỮ do pack\/doc không khớp/g,
        replacement: "lô giao hàng bị TẠM GIỮ do đóng gói/chứng từ không khớp",
      },
      {
        key: "w206_cleanup_escape",
        pattern: /ship escape/g,
        replacement: "lọt lỗi giao hàng",
      },
      {
        key: "w206_cleanup_on_time",
        pattern: /Đúng hạn phê duyệt giao hàng \(phê duyệt giao hàng\)/g,
        replacement: "Phê duyệt giao hàng đúng hạn",
      },
    ],
  ],
]);

const results = [];

for (const target of TARGETS) {
  const fullPath = path.join(ROOT, target.relPath);
  const original = fs.readFileSync(fullPath, "utf8");
  const protectedBlocks = protectBlocks(original);
  const counts = new Map();
  const state = { firstSeen: new Set() };

  const textRules = [
    ...(FILE_TEXT_RULES.get(target.relPath) || []),
    ...SHARED_TEXT_RULES,
  ];

  let updated = mapTextNodes(protectedBlocks.html, (text) =>
    runRules(text, textRules, state, counts)
  );

  updated = protectedBlocks.restore(updated);
  updated = restoreDocTitle(updated, target.docTitle);
  updated = applyHtmlReplacements(updated, FILE_HTML_RULES.get(target.relPath) || [], counts);
  updated = restoreDocTitle(updated, target.docTitle);

  if (updated !== original) {
    fs.writeFileSync(fullPath, updated, "utf8");
  }

  results.push({
    relPath: target.relPath,
    docTitle: target.docTitle,
    changed: updated !== original,
    replacements: [...counts.entries()].sort((a, b) => b[1] - a[1]),
  });
}

ensureDir(REPORT_PATH);

const reportLines = [
  "# Deep Operational Vietnamese Pass — 2026-03-24 (batch c)",
  "",
  `Target files: ${TARGETS.length}`,
  "",
];

for (const result of results) {
  const total = result.replacements.reduce((sum, [, count]) => sum + count, 0);
  reportLines.push(`## ${result.docTitle}`);
  reportLines.push(`- File: \`${result.relPath}\``);
  reportLines.push(`- Changed: ${result.changed ? "yes" : "no"}`);
  reportLines.push(`- Replacements: ${total}`);
  if (result.replacements.length) {
    reportLines.push("- Top rules:");
    for (const [key, count] of result.replacements.slice(0, 15)) {
      reportLines.push(`  - ${key}: ${count}`);
    }
  }
  reportLines.push("");
}

fs.writeFileSync(REPORT_PATH, reportLines.join("\n"), "utf8");

console.log(`Updated ${results.filter((item) => item.changed).length}/${results.length} files.`);
console.log(`Report: ${REPORT_PATH}`);
