#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("C:/Users/TEST4/qms.hesem.com.vn");

function replaceLiteral(html, from, to, stats, label) {
  if (!html.includes(from)) {
    return html;
  }
  const count = html.split(from).length - 1;
  stats.total += count;
  stats.rules[label] = (stats.rules[label] || 0) + count;
  return html.split(from).join(to);
}

function replaceRegex(html, pattern, to, stats, label) {
  let count = 0;
  const next = html.replace(pattern, (...args) => {
    count += 1;
    return typeof to === "function" ? to(...args) : to;
  });
  if (count > 0) {
    stats.total += count;
    stats.rules[label] = (stats.rules[label] || 0) + count;
  }
  return next;
}

function applyFile(rel, transform) {
  const abs = path.join(ROOT, rel);
  const before = fs.readFileSync(abs, "utf8");
  const stats = { path: rel, total: 0, rules: {} };
  const after = transform(before, stats);
  if (after !== before) {
    fs.writeFileSync(abs, after, "utf8");
  }
  return stats;
}

const reports = [];

const formSeriesIndexes = [
  "04-Bieu-Mau/01-FRM-100/index.html",
  "04-Bieu-Mau/02-FRM-200/index.html",
  "04-Bieu-Mau/03-FRM-300/index.html",
  "04-Bieu-Mau/04-FRM-400/index.html",
  "04-Bieu-Mau/05-FRM-500/index.html",
  "04-Bieu-Mau/06-FRM-600/index.html",
  "04-Bieu-Mau/07-FRM-700/index.html",
  "04-Bieu-Mau/08-FRM-800/index.html",
  "04-Bieu-Mau/09-FRM-900/index.html",
];

for (const rel of formSeriesIndexes) {
  reports.push(
    applyFile(rel, (html, stats) => {
      html = replaceLiteral(
        html,
        "<b>Model:</b>",
        "<b>Mô hình kiểm soát:</b>",
        stats,
        "translate_model_label"
      );
      html = replaceLiteral(
        html,
        "Excel-only active / direct download",
        "Chỉ dùng workbook Excel hiện hành / tải trực tiếp",
        stats,
        "translate_model_value"
      );
      html = replaceRegex(
        html,
        /<div class="note-soft"><b>Xem thêm:<\/b>\s*<a href="\.\.\/00-FORM-DESIGN-SYSTEM\/form-control-register\.html">Form Control Register<\/a>[\s\S]*?<\/div>/g,
        '<div class="note-soft"><b>Xem thêm:</b> <a href="../00-FORM-DESIGN-SYSTEM/form-control-register.html">Form Control Register</a> • <a href="../00-FORM-DESIGN-SYSTEM/form-versioning-model.html">Form Versioning Model</a> • <a href="../00-FORM-DESIGN-SYSTEM/form-release-checklist.html">Form Release Checklist</a>.</div>',
        stats,
        "repair_form_index_note"
      );
      return html;
    })
  );
}

reports.push(
  applyFile("04-Bieu-Mau/04-FRM-400/index.html", (html, stats) => {
    html = replaceLiteral(
      html,
      "Supplier Performance Thẻ điểm (scorecard) &amp; Source Trạng thái Review",
      "Supplier Scorecard",
      stats,
      "restore_doc_title"
    );
    html = replaceLiteral(
      html,
      "Supplier / Processor Đánh giá Bảng kiểm &amp; Recovery Bảng theo dõi",
      "Supplier Audit Checklist",
      stats,
      "restore_doc_title"
    );
    html = replaceLiteral(
      html,
      "Outsourced Processing Return Xác minh &amp; Kiểm tra đầu vào",
      "Outsourced Process Incoming Verification",
      stats,
      "restore_doc_title"
    );
    html = replaceLiteral(
      html,
      "Supplier control, outsource dispatch, đánh giá, xác minh đầu vào and hold/disposition support forms.",
      "Các workbook hỗ trợ kiểm soát nhà cung cấp, điều phối outsource, đánh giá, xác minh đầu vào và xử lý HOLD/disposition.",
      stats,
      "polish_summary"
    );
    html = replaceLiteral(
      html,
      "Supplier bằng chứng retrieval is now controlled by ANNEX-403 dossier structure plus active supplier hồ sơ FRM-405 / FRM-409 / FRM-411; no standalone workbook was issued for FRM-407.",
      "Việc truy xuất bằng chứng nhà cung cấp hiện được kiểm soát qua cấu trúc hồ sơ tại ANNEX-403 cùng các hồ sơ hiện hành FRM-405 / FRM-409 / FRM-411; không phát hành workbook riêng cho FRM-407.",
      stats,
      "polish_nonissued_note"
    );
    html = replaceLiteral(
      html,
      "Receipt / IQC gating logic was ported into FRM-701 workbook. HOLD / disposition / release remain controlled through FRM-413.",
      "Logic tiếp nhận / cổng kiểm soát IQC đã được chuyển sang workbook FRM-701. HOLD / disposition / release tiếp tục được kiểm soát qua FRM-413.",
      stats,
      "polish_nonissued_note"
    );
    return html;
  })
);

const docTitleRestores = [
  {
    rel: "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/annex-101-role-based-access-map.html",
    from: "ANNEX-101 — Bản đồ quyền truy cập theo vai trò và hệ thống",
    to: "ANNEX-101 — Role-Based Access Map",
  },
  {
    rel: "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/annex-113-dashboard-deployment-access-and-refresh-control.html",
    from: "ANNEX-113 — Bảng điều khiển deployment, access, refresh and failure control",
    to: "ANNEX-113 — Dashboard Deployment, Access and Refresh Control",
  },
  {
    rel: "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/annex-115-epicor-transaction-and-interface-map.html",
    from: "ANNEX-115 — Bản đồ giao dịch và interface Epicor",
    to: "ANNEX-115 — Epicor Transaction and Interface Map",
  },
  {
    rel: "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/annex-118-offline-fallback-kit.html",
    from: "ANNEX-118 — Bộ dự phòng ngoại tuyến, điều kiện continuity và trình tự nhập bù",
    to: "ANNEX-118 — Offline Fallback Kit",
  },
  {
    rel: "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/annex-120-authority-matrix.html",
    from: "ANNEX-120 — Ma trận thẩm quyền quyết định và nhả giữ",
    to: "ANNEX-120 — Authority Matrix",
  },
  {
    rel: "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/annex-121-raci-master-matrix.html",
    from: "ANNEX-121 — RACI master ở mức hoạt động và tài liệu",
    to: "ANNEX-121 — RACI Master Matrix",
  },
  {
    rel: "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/annex-122-kpi-cascade-dictionary.html",
    from: "ANNEX-122 — Từ điển KPI cascade",
    to: "ANNEX-122 — KPI Cascade Dictionary",
  },
  {
    rel: "03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/annex-123-deputy-backup-matrix.html",
    from: "ANNEX-123 — Ma trận deputy / backup",
    to: "ANNEX-123 — Deputy Backup Matrix",
  },
  {
    rel: "03-Tai-Lieu-Van-Hanh/03-Reference/05-ANNEX-500/annex-503-cnc-operating-model-and-role-boundary.html",
    from: "ANNEX-503 — CNC Operating Model and Vai trò Boundary",
    to: "ANNEX-503 — CNC Operating Model and Role Boundary",
  },
  {
    rel: "03-Tai-Lieu-Van-Hanh/01-SOPs/09-SOP-900/sop-902-management-review.html",
    from: "SOP-902 — Xem xét của lãnh đạo và cơ chế chốt quyết định hệ thống",
    to: "SOP-902 — Management Review",
  },
  {
    rel: "03-Tai-Lieu-Van-Hanh/02-Work-Instructions/09-WI-900/wi-901-performance-dashboard.html",
    from: "WI-901 — Chuẩn bị bảng điều khiển hiệu suất, freeze-date và pack dữ liệu quản trị",
    to: "WI-901 — Performance Dashboard",
  },
];

for (const item of docTitleRestores) {
  reports.push(
    applyFile(item.rel, (html, stats) => {
      html = replaceLiteral(html, item.from, item.to, stats, "restore_document_name");
      return html;
    })
  );
}

reports.push(
  applyFile("01-QMS-Portal/index.html", (html, stats) => {
    const replacements = [
      ["entry page điều hướng", "trang điều hướng đầu mối"],
      ["auditor, trưởng bộ phận và deputy", "auditor, trưởng bộ phận và người thay thế"],
      ["boundary giữa handbook, thẩm quyền, RACI, KPI và deputy", "ranh giới giữa handbook, thẩm quyền, RACI, KPI và người thay thế"],
      ["freeze-date và pack dữ liệu quản trị", "ngày khóa số liệu và bộ dữ liệu quản trị"],
      ["tìm kiếm library, review/approval và lối vào hệ thống", "tìm kiếm thư viện, rà soát/phê duyệt và lối vào hệ thống"],
      ["Forms & hồ sơ", "Biểu mẫu và hồ sơ"],
      ["Biểu mẫu làm bằng chứng, pack công việc và hồ sơ quản trị", "Biểu mẫu làm bằng chứng, bộ hồ sơ công việc và hồ sơ quản trị"],
      ["Khung năng lực, level, ma trận đào tạo, OJT, bài kiểm tra cổng và quy tắc chứng nhận", "Khung năng lực, cấp độ, ma trận đào tạo, OJT, bài kiểm tra cổng và quy tắc chứng nhận"],
      ["Org chart &amp; vai trò dictionary", "Org chart và từ điển vai trò"],
      ["Thẩm quyền / RACI / KPI / Deputy", "Thẩm quyền / RACI / KPI / người thay thế"],
      ["Dùng SOP/WI/FRM của value stream và bản đồ giao dịch cùng cơ chế kiểm soát dữ liệu để không lệch giữa Epicor, M365 và bằng chứng.", "Dùng SOP/WI/FRM của dòng giá trị và bản đồ giao dịch cùng cơ chế kiểm soát dữ liệu để không lệch giữa Epicor, M365 và bằng chứng."],
      ["ANNEX-115 — Bản đồ giao dịch và interface Epicor", "ANNEX-115 — Epicor Transaction and Interface Map"],
      ["Tôi cần chuẩn bị cho review lãnh đạo hoặc đánh giá", "Tôi cần chuẩn bị cho xem xét của lãnh đạo hoặc đánh giá"],
      ["Dùng pack quản trị và bảng điều khiển người phụ trách/kiểm soát nguồn (kiểm soát nguồn) đã chốt, không dựng số từ file riêng.", "Dùng bộ dữ liệu quản trị và bảng điều khiển đã chốt người phụ trách nguồn, không dựng số từ file riêng."],
      ["ANNEX-113 — Bảng điều khiển Deployment, Access, Refresh and Failure Control", "ANNEX-113 — Dashboard Deployment, Access and Refresh Control"],
      ["logic deputy tại", "quy tắc người thay thế tại"],
      ["Thẩm quyền/RACI/KPI/Deputy", "Thẩm quyền/RACI/KPI/người thay thế"],
      ["Entry pages", "Trang đầu mối"],
      ["Organization governance", "Quản trị tổ chức"],
      ["Deputy Matrix", "Deputy Backup Matrix"],
      ["ANNEX-101 RBAC Map", "ANNEX-101 — Role-Based Access Map"],
      ["ANNEX-118 Offline Kit", "ANNEX-118 — Offline Fallback Kit"],
      ["KPI Cascade</a>", "KPI Cascade Dictionary</a>"],
      ["ANNEX-120-authority-matrix.html\">Ma trận thẩm quyền</a>", "ANNEX-120-authority-matrix.html\">Authority Matrix</a>"],
      ["annex-123-deputy-backup-matrix.html\">Deputy / Backup Matrix</a>", "annex-123-deputy-backup-matrix.html\">Deputy Backup Matrix</a>"],
      ["ANNEX-50490 entry page", "ANNEX-50490"],
      ["Organization / Org chart", "Org Chart"],
    ];

    for (const [from, to] of replacements) {
      html = replaceLiteral(html, from, to, stats, "portal_polish");
    }

    return html;
  })
);

reports.push(
  applyFile("01-QMS-Portal/site-map.html", (html, stats) => {
    const replacements = [
      ["Entry pages chính thức", "Trang đầu mối chính thức"],
      ["Hệ organization &amp; governance", "Hệ tổ chức và quản trị"],
      ["Hệ digital / ERP / contingency", "Hệ dữ liệu số / ERP / ứng phó gián đoạn"],
      ["Hệ training &amp; certification", "Hệ đào tạo và chứng nhận"],
      ["Portal &amp; entry pages", "Portal và trang đầu mối"],
      ["3 core pages", "3 trang lõi"],
      ["System documents", "Tài liệu hệ thống"],
      ["Operational documents", "Tài liệu vận hành"],
      ["SOP, WI, ANNEX vận hành và digital governance", "SOP, WI, ANNEX vận hành và quản trị dữ liệu số"],
      ["Biểu mẫu tác nghiệp, chất lượng, đào tạo, review", "Biểu mẫu tác nghiệp, chất lượng, đào tạo và xem xét"],
      ["111 active workbooks", "111 workbook hiện hành"],
      ["274 academy pages", "274 trang Academy"],
      ["Điểm vào cho đánh giá / review", "Điểm vào cho đánh giá / xem xét"],
      ["WI-901 — Chuẩn bị bảng điều khiển hiệu suất, freeze-date và pack dữ liệu quản trị", "WI-901 — Performance Dashboard"],
      ["Cơ cấu tổ chức &amp; vai trò family", "Cơ cấu tổ chức &amp; nhóm vai trò"],
      ["10 handbook library", "Thư viện 10 handbook"],
      ["Thẩm quyền / RACI / KPI / Deputy", "Thẩm quyền / RACI / KPI / người thay thế"],
      ["ANNEX-120</a> • <a href=\"../02-Tai-Lieu-He-Thong/03-Organization/01-ANNEX-100/annex-121-raci-master-matrix.html\">026</a> • <a href=\"../02-Tai-Lieu-He-Thong/03-Organization/01-ANNEX-100/annex-122-kpi-cascade-dictionary.html\">027</a> • <a href=\"../02-Tai-Lieu-He-Thong/03-Organization/01-ANNEX-100/annex-123-deputy-backup-matrix.html\">028</a>", "ANNEX-120</a> • <a href=\"../02-Tai-Lieu-He-Thong/03-Organization/01-ANNEX-100/annex-121-raci-master-matrix.html\">ANNEX-121</a> • <a href=\"../02-Tai-Lieu-He-Thong/03-Organization/01-ANNEX-100/annex-122-kpi-cascade-dictionary.html\">ANNEX-122</a> • <a href=\"../02-Tai-Lieu-He-Thong/03-Organization/01-ANNEX-100/annex-123-deputy-backup-matrix.html\">ANNEX-123</a>"],
      ["Khóa least privilege, SoD, deputy activation, privileged access và rà soát quyền truy cập.", "Khóa least privilege, SoD, kích hoạt người thay thế, quyền truy cập đặc quyền và rà soát quyền truy cập."],
      ["Từ điển field cho yêu cầu cấp/đổi/thu hồi quyền", "Từ điển trường dữ liệu cho yêu cầu cấp/đổi/thu hồi quyền"],
      ["Khóa dữ liệu tối thiểu, approval route, reject code và dấu vết kiểm toán (audit trail).", "Khóa dữ liệu tối thiểu, luồng phê duyệt, mã từ chối và dấu vết kiểm toán (audit trail)."],
      ["Bản đồ giao dịch và interface Epicor", "Epicor Transaction and Interface Map"],
      ["Khóa SoR, người phụ trách giao dịch, reconciliation, mismatch handling, freeze date.", "Khóa SoR, người phụ trách giao dịch, đối chiếu, xử lý lệch và ngày khóa số liệu."],
      ["Offline fallback kit", "Offline Fallback Kit"],
      ["Khóa trigger kích hoạt, form giấy, USB reference, backfill sequence và deputy/continuity rules.", "Khóa điều kiện kích hoạt, biểu mẫu giấy, USB tham chiếu, trình tự nhập bù và quy tắc người thay thế/duy trì hoạt động."],
      ["SOP nền cho data governance / change / contingency", "SOP nền cho quản trị dữ liệu / thay đổi / ứng phó gián đoạn"],
      ["Gói review lãnh đạo", "Gói xem xét của lãnh đạo"],
      ["ANNEX-113 — Bảng điều khiển Deployment, Access, Refresh and Failure Control", "ANNEX-113 — Dashboard Deployment, Access and Refresh Control"],
      ["Pack phải có người phụ trách nguồn, freeze date, ghi chú điều hành và quy tắc đóng action rõ ràng.", "Bộ hồ sơ phải có người phụ trách nguồn, ngày khóa số liệu, ghi chú điều hành và quy tắc đóng hành động rõ ràng."],
      ["Điểm vào điều hướng cho hội nhập nhân sự mới, đào tạo chéo, mức sẵn sàng người thay thế và đào tạo phục vụ đánh giá (đánh giá đào tạo).", "Điểm vào điều hướng cho hội nhập nhân sự mới, đào tạo chéo, mức sẵn sàng người thay thế và đánh giá năng lực."],
      ["Lộ trình 30/60/90 ngày, OJT 1 trang theo vai trò và cổng kiểm soát (gate) thực chứng.", "Lộ trình 30/60/90 ngày, OJT 1 trang theo vai trò và cổng kiểm soát thực hành."],
      ["Theo dõi trạng thái Active/Hold/Withdraw, bộ bằng chứng, tái chứng nhận và điều kiện đủ của người thay thế.", "Theo dõi trạng thái hiệu lực / tạm giữ / thu hồi, bộ bằng chứng, tái chứng nhận và điều kiện đủ của người thay thế."],
      ["ANNEX-115 — Epicor Transaction and Interface Map", "ANNEX-115 — Epicor Transaction and Interface Map"],
      ["ANNEX-50490 entry page", "ANNEX-50490"],
    ];

    for (const [from, to] of replacements) {
      html = replaceLiteral(html, from, to, stats, "sitemap_polish");
    }

    return html;
  })
);

const jdTargets = [
  {
    rel: "02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/05-JD-Supply-Chain/jd-buyer-purchasing.html",
    replacements: [
      ["<li></li>", ""],
      [
        "Buyer/Purchasing phải hiểu ranh giới áp dụng: risk/source decision đi xuống receipt cổng kiểm soát qua FRM-701 workbook, còn FRM-412 chỉ còn trong ghi chú phạm vi mã. Khi tham chiếu form trong JD, hiểu theo thứ tự ưu tiên: workbook hiện hành → Form Control Register / . Xem thêm , , <a download=\"\" href=\"../../../../04-Bieu-Mau/07-FRM-700/FRM-701_Receiving_and_IQC_Log.xlsx\">FRM-701</a> và <a download=\"\" href=\"../../../../04-Bieu-Mau/04-FRM-400/FRM-413_HOLD_and_Disposition_Log.xlsx\">FRM-413</a>.",
        "Buyer / Purchasing phải hiểu rõ ranh giới áp dụng: quyết định rủi ro/chọn nguồn đi xuống cổng tiếp nhận qua workbook FRM-701, còn FRM-412 chỉ còn là mã tham chiếu phạm vi. Khi tham chiếu form trong JD, áp dụng thứ tự ưu tiên: workbook hiện hành → Form Control Register → Form Versioning Model → Form Release Checklist. Xem thêm <a download=\"\" href=\"../../../../04-Bieu-Mau/07-FRM-700/FRM-701_Receiving_and_IQC_Log.xlsx\">FRM-701</a> và <a download=\"\" href=\"../../../../04-Bieu-Mau/04-FRM-400/FRM-413_HOLD_and_Disposition_Log.xlsx\">FRM-413</a>."
      ],
      ["ANNEX-503 — CNC Operating Model and Vai trò Boundary", "ANNEX-503 — CNC Operating Model and Role Boundary"],
      ["ANNEX-120</b> — Ma trận thẩm quyền quyết định và nhả giữ", "ANNEX-120</b> — Authority Matrix"],
      ["ANNEX-121</b> — RACI master ở mức hoạt động và tài liệu", "ANNEX-121</b> — RACI Master Matrix"],
      ["ANNEX-122</b> — Từ điển KPI cascade", "ANNEX-122</b> — KPI Cascade Dictionary"],
      ["ANNEX-123</b> — Ma trận deputy / backup", "ANNEX-123</b> — Deputy Backup Matrix"],
    ],
  },
  {
    rel: "02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/05-JD-Supply-Chain/jd-supply-chain-manager.html",
    replacements: [
      ["<li></li>", ""],
      [
        "Supply Chain Manager phải quản trị mô hình workbook Excel hiện hành hoàn toàn, đặc biệt là FRM-701 thay FRM-412 trong luồng công việc hiện hành và FRM-407 là mã không phát hành trong danh mục hiện hành; phạm vi được bao phủ bởi ANNEX-403, FRM-405, FRM-409 và FRM-411. Khi tham chiếu form trong JD, hiểu theo thứ tự ưu tiên: workbook hiện hành → Form Control Register / . Xem thêm , , <a download=\"\" href=\"../../../../04-Bieu-Mau/07-FRM-700/FRM-701_Receiving_and_IQC_Log.xlsx\">FRM-701</a> và <a download=\"\" href=\"../../../../04-Bieu-Mau/04-FRM-400/FRM-413_HOLD_and_Disposition_Log.xlsx\">FRM-413</a>.",
        "Supply Chain Manager phải quản trị trọn vẹn mô hình workbook Excel hiện hành, đặc biệt là việc FRM-701 thay FRM-412 trong luồng công việc hiện hành và việc FRM-407 chỉ còn là mã không phát hành trong danh mục hiện hành; phạm vi được bao phủ bởi ANNEX-403, FRM-405, FRM-409 và FRM-411. Khi tham chiếu form trong JD, áp dụng thứ tự ưu tiên: workbook hiện hành → Form Control Register → Form Versioning Model → Form Release Checklist. Xem thêm <a download=\"\" href=\"../../../../04-Bieu-Mau/07-FRM-700/FRM-701_Receiving_and_IQC_Log.xlsx\">FRM-701</a> và <a download=\"\" href=\"../../../../04-Bieu-Mau/04-FRM-400/FRM-413_HOLD_and_Disposition_Log.xlsx\">FRM-413</a>."
      ],
      ["ANNEX-503 — CNC Operating Model and Vai trò Boundary", "ANNEX-503 — CNC Operating Model and Role Boundary"],
      ["ANNEX-120</b> — Ma trận thẩm quyền quyết định và nhả giữ", "ANNEX-120</b> — Authority Matrix"],
      ["ANNEX-121</b> — RACI master ở mức hoạt động và tài liệu", "ANNEX-121</b> — RACI Master Matrix"],
      ["ANNEX-122</b> — Từ điển KPI cascade", "ANNEX-122</b> — KPI Cascade Dictionary"],
      ["ANNEX-123</b> — Ma trận deputy / backup", "ANNEX-123</b> — Deputy Backup Matrix"],
    ],
  },
  {
    rel: "02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/05-JD-Supply-Chain/jd-warehouse-clerk.html",
    replacements: [
      ["<li></li>", ""],
      [
        "Warehouse Clerk phải vận hành theo mô hình FRM-701 workbook hiện hành cho receiving/IQC + put-away bàn giao; FRM-413 cho HOLD/disposition; FRM-412 là mã không phát hành trong danh mục hiện hành và chỉ tra tại . Khi tham chiếu form trong JD, hiểu theo thứ tự ưu tiên: workbook hiện hành → Form Control Register / . Xem thêm , , <a download=\"\" href=\"../../../../04-Bieu-Mau/07-FRM-700/FRM-701_Receiving_and_IQC_Log.xlsx\">FRM-701</a> và <a download=\"\" href=\"../../../../04-Bieu-Mau/04-FRM-400/FRM-413_HOLD_and_Disposition_Log.xlsx\">FRM-413</a>.",
        "Warehouse Clerk phải vận hành theo mô hình workbook FRM-701 hiện hành cho nhận hàng/IQC và bàn giao put-away; FRM-413 dùng cho HOLD/disposition; FRM-412 là mã không phát hành trong danh mục hiện hành và chỉ tra tại Form Control Register. Khi tham chiếu form trong JD, áp dụng thứ tự ưu tiên: workbook hiện hành → Form Control Register → Form Versioning Model → Form Release Checklist. Xem thêm <a download=\"\" href=\"../../../../04-Bieu-Mau/07-FRM-700/FRM-701_Receiving_and_IQC_Log.xlsx\">FRM-701</a> và <a download=\"\" href=\"../../../../04-Bieu-Mau/04-FRM-400/FRM-413_HOLD_and_Disposition_Log.xlsx\">FRM-413</a>."
      ],
      ["ANNEX-503 — CNC Operating Model and Vai trò Boundary", "ANNEX-503 — CNC Operating Model and Role Boundary"],
      ["ANNEX-120</b> — Ma trận thẩm quyền quyết định và nhả giữ", "ANNEX-120</b> — Authority Matrix"],
      ["ANNEX-121</b> — RACI master ở mức hoạt động và tài liệu", "ANNEX-121</b> — RACI Master Matrix"],
      ["ANNEX-122</b> — Từ điển KPI cascade", "ANNEX-122</b> — KPI Cascade Dictionary"],
      ["ANNEX-123</b> — Ma trận deputy / backup", "ANNEX-123</b> — Deputy Backup Matrix"],
    ],
  },
];

for (const target of jdTargets) {
  reports.push(
    applyFile(target.rel, (html, stats) => {
      for (const [from, to] of target.replacements) {
        html = replaceLiteral(html, from, to, stats, "jd_repair");
      }
      return html;
    })
  );
}

for (const report of reports) {
  if (report.total > 0) {
    console.log(`${report.path}: ${report.total} replacements`);
  }
}
