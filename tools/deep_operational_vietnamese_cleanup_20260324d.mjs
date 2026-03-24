#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("C:/Users/TEST4/qms.hesem.com.vn");

const TARGETS = [
  {
    relPath:
      "03-Tai-Lieu-Van-Hanh/01-SOPs/02-SOP-200/sop-201-order-fulfillment-rfq-to-cash.html",
    docTitle: "SOP-201 — Order Fulfillment, RFQ-to-Cash",
    replacements: [
      [/Supply Chuỗi/g, "Supply Chain"],
      [/FRM-201 RFQ Sổ theo dõi/g, "FRM-201 RFQ Register"],
      [/FRM-202 Hợp đồng Rà soát Bảng kiểm/g, "FRM-202 Contract Review Checklist"],
      [/FRM-821 Yêu cầu lập hóa đơn/g, "FRM-821 Invoice Request"],
      [/kiểm tra cuối &amp; lô phê duyệt giao hàng/g, "kiểm tra cuối &amp; phê duyệt lô giao hàng"],
      [/mẫu đầu \((?:mẫu đầu \()?mẫu đầu\)\)?/g, "mẫu đầu"],
      [/tệp Excel Excel/g, "tệp Excel"],
      [/Tạm giữ notice/g, "thông báo tạm giữ"],
      [/Cancellation\/hướng xử lý note/g, "ghi chú hủy đơn/xử lý"],
      [/Lô giao hàng split hồ sơ/g, "Hồ sơ tách riêng cho lô giao hàng"],
      [/pack outsource/g, "bộ hồ sơ thuê ngoài"],
      [/job rủi ro cao \/ job gấp/g, "lệnh sản xuất rủi ro cao / lệnh sản xuất gấp"],
      [/job sạch \/ urgent \/ outsource-heavy \/ technical-risk/g, "lệnh sản xuất sạch / khẩn / thiên về thuê ngoài / rủi ro kỹ thuật"],
      [/bộ bằng chứng giao hàng/g, "bộ bằng chứng giao hàng"],
      [/lô giao hàng bằng chứng đóng gói/g, "bộ bằng chứng giao hàng"],
      [/yêu cầu lập hóa đơn sổ theo dõi/g, "sổ theo dõi Invoice Request"],
      [/sẵn sàng cam kết trạng thái/g, "trạng thái sẵn sàng cam kết"],
      [/hồ sơ công việc index/g, "chỉ mục hồ sơ công việc"],
      [/lệnh sản xuất rủi ro cao mức sẵn sàng rà soát/g, "lệnh sản xuất rủi ro cao mức sẵn sàng"],
      [/packaging\/label/g, "đóng gói/nhãn"],
      [/control plan/g, "kế hoạch kiểm soát"],
      [/shipping theo đúng ngữ cảnh sử dụng/g, "Shipping theo đúng ngữ cảnh sử dụng"],
      [/job\b/g, "lệnh sản xuất"],
      [/urgent\b/g, "khẩn"],
      [/outsource-heavy/g, "thiên về thuê ngoài"],
      [/technical-risk/g, "rủi ro kỹ thuật"],
      [/legal tạm giữ/g, "legal hold"],
    ],
  },
  {
    relPath:
      "03-Tai-Lieu-Van-Hanh/01-SOPs/03-SOP-300/sop-303-engineering-release-baseline-package-and-job-snapshot-control.html",
    docTitle: "SOP-303 — Engineering Release, Baseline Package and Job Snapshot Control",
    replacements: [
      [/Lệnh sản xuất Description — Chief Executive Officer/g, "Job Description — Chief Executive Officer"],
      [/(<a\b[^>]*FRM-306_Engineering_Release_and_Baseline_Package_Approval\.xlsx[^>]*>FRM-306<\/a>)\s*Bộ hồ sơ chuẩn Danh mục phát hành &amp; Mốc chuẩn Approval/g, "$1 Engineering Release and Baseline Package Approval"],
      [/(<a\b[^>]*FRM-307_Package_Supersedure_and_Withdrawal_Notice\.xlsx[^>]*>FRM-307<\/a>)\s*Bộ hồ sơ Việc thay thế hiệu lực and Thu hồi Notice/g, "$1 Package Supersedure and Withdrawal Notice"],
      [/FRM-307 Package Supersedure and Withdrawal Notice/g, "FRM-307 Package Supersedure and Withdrawal Notice"],
      [/cổng kiểm soát \(cổng kiểm soát\)/g, "cổng kiểm soát"],
      [/dấu vết kiểm toán \(dấu vết kiểm toán\)/g, "dấu vết kiểm toán"],
      [/Tạm giữ mốc chuẩn lập/g, "Tạm giữ việc lập mốc chuẩn"],
      [/Sổ theo dõi phát hànhed/g, "Sổ theo dõi phát hành"],
      [/for nhóm bộ hồ sơ cần QA phê duyệt/g, "đối với nhóm bộ hồ sơ cần QA phê duyệt"],
      [/and phê duyệt nhật ký/g, "và nhật ký phê duyệt"],
      [/lệnh sản xuất-level/g, "theo từng lệnh sản xuất"],
      [/controlled việc thay thế hiệu lực/g, "thay thế có kiểm soát"],
      [/bộ hồ sơ kỹ thuật completeness/g, "độ đầy đủ của bộ hồ sơ kỹ thuật"],
      [/gói chuẩn completeness/g, "độ đầy đủ của gói chuẩn"],
      [/approval cổng kiểm soát/g, "phê duyệt cổng kiểm soát"],
      [/không khớp xử lý/g, "xử lý không khớp"],
      [/chính thức change quản trị/g, "quản trị thay đổi chính thức"],
      [/yêu cầu kỹ thuật\/ghi chú của khách hàng/g, "yêu cầu kỹ thuật và ghi chú của khách hàng"],
      [/requirements/g, "yêu cầu"],
      [/requirement/g, "yêu cầu"],
      [/history/g, "lịch sử"],
      [/approval/g, "phê duyệt"],
      [/approvals/g, "phê duyệt"],
      [/sweep/g, "quét thu hồi"],
      [/withdraw/g, "thu hồi"],
      [/build/g, "lập"],
      [/notify/g, "thông báo"],
      [/triggered/g, "đã kích hoạt"],
      [/trigger/g, "kích hoạt"],
      [/complex/g, "phức tạp"],
      [/simple/g, "đơn giản"],
      [/core technical set/g, "bộ nội dung kỹ thuật cốt lõi"],
      [/quick-check card/g, "thẻ kiểm tra nhanh"],
      [/quick-check/g, "kiểm tra nhanh"],
      [/distribution/g, "phân phối"],
      [/handling/g, "xử lý"],
      [/formalize/g, "chuẩn hóa chính thức"],
      [/formal/g, "chính thức"],
      [/lệnh sản xuất transfer/g, "chuyển lệnh sản xuất"],
      [/repeat lệnh sản xuất/g, "lệnh sản xuất lặp lại"],
      [/clean\/truy xuất đặc biệt/g, "sạch/truy xuất đặc biệt"],
      [/program/g, "chương trình"],
      [/packaging\/label note/g, "ghi chú đóng gói/nhãn"],
      [/control plan/g, "kế hoạch kiểm soát"],
      [/open items/g, "hạng mục mở"],
      [/có điều kiện phê duyệt/g, "phê duyệt có điều kiện"],
      [/quality gates/g, "các cổng kiểm soát chất lượng"],
      [/quality gate/g, "cổng kiểm soát chất lượng"],
    ],
  },
  {
    relPath:
      "03-Tai-Lieu-Van-Hanh/01-SOPs/08-SOP-800/sop-803-invoicing-job-costing-and-arap.html",
    docTitle: "SOP-803 — Invoicing, Job Costing and AR/AP",
    replacements: [
      [/Giao hàng bộ bằng chứng/g, "Bộ bằng chứng giao hàng"],
      [/Pack tối thiểu/g, "Bộ chứng từ tối thiểu"],
      [/hóa đơn, AR, lệnh sản xuất cost đóng/g, "hóa đơn, AR và đóng chi phí lệnh sản xuất"],
      [/xuất hóa đơn độ chính xác/g, "độ chính xác xuất hóa đơn"],
      [/giao hàng ref/g, "tham chiếu giao hàng"],
      [/customer xuất hóa đơn hướng dẫn rõ/g, "hướng dẫn xuất hóa đơn của khách hàng rõ ràng"],
      [/completion bảng kiểm/g, "bảng kiểm hoàn tất"],
      [/hành động list/g, "danh sách hành động"],
      [/chênh lệch explanation/g, "giải thích chênh lệch"],
      [/giao hàng bộ hồ sơ links/g, "liên kết hồ sơ giao hàng"],
      [/hóa đơn\/receipt\/tranh chấp/g, "hóa đơn/thu tiền/tranh chấp"],
      [/lệnh sản xuất hồ sơ công việc/g, "hồ sơ lệnh sản xuất"],
      [/Hóa đơn bộ hồ sơ/g, "Bộ hồ sơ hóa đơn"],
      [/biên lợi nhuận pack/g, "bộ hồ sơ rà soát biên lợi nhuận"],
      [/AP bàn giao pack/g, "bộ hồ sơ bàn giao AP"],
      [/Ship đủ/g, "Giao hàng đủ"],
      [/ship đúng/g, "giao hàng đúng"],
      [/giao hàng line/g, "dòng giao hàng"],
      [/special xuất hóa đơn hướng dẫn/g, "hướng dẫn xuất hóa đơn đặc biệt"],
      [/partial giao hàng/g, "giao hàng từng phần"],
      [/tranh chấp quản trị/g, "quản trị tranh chấp"],
      [/Yêu cầu completeness/g, "độ đầy đủ của yêu cầu"],
      [/Ghi nhận chi phí completeness/g, "độ đầy đủ của ghi nhận chi phí"],
      [/lệnh sản xuất cost/g, "chi phí lệnh sản xuất"],
      [/cost bucket/g, "nhóm chi phí"],
      [/timeliness/g, "đúng hạn"],
      [/stop-bill/g, "dừng xuất hóa đơn"],
      [/Đóng-lệnh sản xuất/g, "Đóng lệnh sản xuất"],
      [/hóa đơn data/g, "dữ liệu hóa đơn"],
      [/chi phí pack/g, "bộ hồ sơ chi phí"],
      [/processor control/g, "kiểm soát nhà gia công ngoài"],
      [/control plan/g, "kế hoạch kiểm soát"],
      [/proof/g, "bằng chứng"],
      [/packing\/bằng chứng bàn giao/g, "đóng gói/bằng chứng bàn giao"],
      [/packing\/chứng từ giao hàng/g, "đóng gói/chứng từ giao hàng"],
      [/payment terms/g, "điều khoản thanh toán"],
      [/terms/g, "điều khoản"],
      [/price\/terms/g, "giá/điều khoản"],
      [/price/g, "giá"],
      [/quantity/g, "số lượng"],
      [/cost/g, "chi phí"],
      [/condition/g, "điều kiện"],
      [/conditions/g, "điều kiện"],
    ],
  },
  {
    relPath:
      "03-Tai-Lieu-Van-Hanh/02-Work-Instructions/02-WI-200/wi-206-ship-release-pack-sscc-label-and-pack-reconciliation.html",
    docTitle: "WI-206 — Ship Release Pack, SSCC Label and Pack Reconciliation",
    replacements: [
      [/kiểm tra cuối pass/g, "kiểm tra cuối đạt"],
      [/Packaging condition/g, "Tình trạng bao gói"],
      [/Xác định cấu trúc pack/g, "Xác định cấu trúc kiện"],
      [/khi job áp dụng GS1/g, "khi lô áp dụng GS1"],
      [/shipment\/pack hồ sơ/g, "hồ sơ lô giao hàng/đóng gói"],
      [/pack hồ sơ/g, "hồ sơ đóng gói"],
      [/scan mở đúng pack hồ sơ/g, "quét mở đúng hồ sơ đóng gói"],
      [/khóa pack/g, "khóa hồ sơ đóng gói"],
      [/QPL-driven bằng chứng/g, "bằng chứng theo QPL"],
      [/outsource pack/g, "bộ hồ sơ thuê ngoài"],
      [/lô giao hàng\/pack hồ sơ/g, "hồ sơ lô giao hàng/đóng gói"],
      [/bộ ship riêng/g, "bộ hồ sơ giao hàng riêng"],
      [/label\/doc/g, "nhãn/chứng từ"],
      [/control plan/g, "kế hoạch kiểm soát"],
      [/special acceptance/g, "chấp thuận đặc biệt"],
      [/heat\/lot chain/g, "chuỗi heat/lot"],
      [/traceability/g, "truy xuất nguồn gốc"],
      [/quantity/g, "số lượng"],
      [/reason code/g, "mã lý do"],
      [/rule/g, "quy tắc"],
      [/rules/g, "quy tắc"],
      [/reference dữ liệu/g, "tham chiếu dữ liệu"],
      [/full lô giao hàng/g, "lô giao hàng đầy đủ"],
    ],
  },
];

const REPORT_PATH = path.join(
  ROOT,
  "_reports",
  "deep-operational-vietnamese-cleanup-20260324d.md"
);

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

const report = [
  "# Deep Operational Vietnamese Cleanup — 2026-03-24 (batch d)",
  "",
];

for (const target of TARGETS) {
  const fullPath = path.join(ROOT, target.relPath);
  const original = fs.readFileSync(fullPath, "utf8");
  let updated = original;
  let changes = 0;

  for (const [pattern, replacement] of target.replacements) {
    const before = updated;
    updated = updated.replace(pattern, replacement);
    if (updated !== before) {
      changes += 1;
    }
  }

  updated = restoreDocTitle(updated, target.docTitle);

  if (updated !== original) {
    fs.writeFileSync(fullPath, updated, "utf8");
  }

  report.push(`## ${target.docTitle}`);
  report.push(`- File: \`${target.relPath}\``);
  report.push(`- Changed: ${updated !== original ? "yes" : "no"}`);
  report.push(`- Rules applied: ${changes}`);
  report.push("");
}

fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
fs.writeFileSync(REPORT_PATH, report.join("\n"), "utf8");

console.log(`Report: ${REPORT_PATH}`);
