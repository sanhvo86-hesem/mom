#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("C:/Users/TEST4/qms.hesem.com.vn");

function applyLiteral(html, from, to, label, fileReport) {
  if (!html.includes(from)) {
    return html;
  }
  const count = html.split(from).length - 1;
  fileReport.total += count;
  fileReport.rules[label] = (fileReport.rules[label] || 0) + count;
  return html.split(from).join(to);
}

function applyRegex(html, re, to, label, fileReport) {
  let count = 0;
  const next = html.replace(re, () => {
    count += 1;
    return to;
  });
  if (count > 0) {
    fileReport.total += count;
    fileReport.rules[label] = (fileReport.rules[label] || 0) + count;
  }
  return next;
}

const files = [
  {
    rel: "01-QMS-Portal/site-map.html",
    apply(html, fileReport) {
      html = applyLiteral(
        html,
        "TRN-ACA-RMAP-01 — TRN-ACA-RMAP-01 — Vai trò Lộ trình (30/60/90 ngày)",
        "TRN-ACA-RMAP-01 — Vai trò Lộ trình (30/60/90 ngày)",
        "dedupe_training_links",
        fileReport
      );
      html = applyLiteral(
        html,
        "OJT-VAI — OJT-VAI TRÒ-INDEX — OJT 1 trang theo vai trò",
        "OJT-VAI TRÒ-INDEX — OJT 1 trang theo vai trò",
        "dedupe_training_links",
        fileReport
      );
      html = applyRegex(
        html,
        /Các điểm vào chính là <a href="\.\.\/04-Bieu-Mau\/00-FORM-DESIGN-SYSTEM\/form-control-register\.html">Form Control Register<\/a>, và \.<div class="note-soft"><b>Tài liệu kiểm soát bắt buộc đọc:<\/b> Phải đọc đến để kiểm soát phát hành, máy trạm, máy chủ, xác nhận trước vận hành, kiểm tra toàn vẹn và khóa phạm vi sử dụng\.<\/div>/g,
        'Các điểm vào chính là <a href="../04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/form-control-register.html">Form Control Register</a>, <a href="../04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/form-versioning-model.html">Form Versioning Model</a> và <a href="../04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/form-release-checklist.html">Form Release Checklist</a>.<div class="note-soft"><b>Tài liệu kiểm soát bắt buộc đọc:</b> <a href="../04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/form-release-checklist.html">Form Release Checklist</a>, <a href="../04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/desktop-excel-endpoint-baseline.html">Desktop Excel Endpoint Baseline</a>, <a href="../04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/server-delivery-rollout-checklist.html">Server Delivery Rollout Checklist</a>, <a href="../04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/production-acceptance-uat-pack.html">Production Acceptance UAT Pack</a>, <a href="../04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/periodic-control-cadence.html">Periodic Control Cadence</a>, <a href="../04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/server-stack-profile-library.html">Server Stack Profile Library</a>, <a href="../04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/pilot-endpoint-rollout-pack.html">Pilot Endpoint Rollout Pack</a> và <a href="../04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/editorial-consistency-audit.html">Editorial Consistency Audit</a> là bộ tài liệu phải đọc khi kiểm soát phát hành, máy trạm, máy chủ, UAT, kiểm tra định kỳ và phạm vi sử dụng.</div>',
        "repair_workbook_note",
        fileReport
      );
      return html;
    },
  },
  {
    rel: "02-Tai-Lieu-He-Thong/01-Quality-Manual/qms-man-001-qms-manual.html",
    apply(html, fileReport) {
      html = applyRegex(
        html,
        /<h2 class="h2 phase3a-workbook-alignment" id="m14">14\. Cơ chế kiểm soát biểu mẫu Excel<\/h2><div class="note phase3a-workbook-alignment">[\s\S]*?<div class="table-card phase3a-workbook-alignment">/g,
        '<h2 class="h2 phase3a-workbook-alignment" id="m14">14. Cơ chế kiểm soát biểu mẫu Excel</h2><div class="note phase3a-workbook-alignment"><b>Nguyên tắc hệ thống</b><br/>Biểu mẫu FRM được kiểm soát theo mô hình <b>một workbook Excel hiện hành / tải trực tiếp</b>. File workbook trong thư mục series là nơi ghi nhận, ký xác nhận, theo dõi hành động và bảo toàn kiểm soát dữ liệu; các HTML form cũ không thuộc danh mục hiện hành. Việc chuẩn hóa mã và phạm vi bao phủ được tra tại <a href="../../04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/form-control-register.html">Form Control Register</a>. Quy tắc điều khiển được khóa tại <a href="../../04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/form-versioning-model.html">Form Versioning Model</a>, quy tắc phát hành tại <a href="../../04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/form-release-checklist.html">Form Release Checklist</a> và trung tâm kiểm soát tại <a href="../../04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/form-control-register.html">Form Control Register</a>.<div class="note-soft"><b>Tài liệu kiểm soát bắt buộc đọc:</b> <a href="../../04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/form-release-checklist.html">Form Release Checklist</a>, <a href="../../04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/desktop-excel-endpoint-baseline.html">Desktop Excel Endpoint Baseline</a>, <a href="../../04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/server-delivery-rollout-checklist.html">Server Delivery Rollout Checklist</a>, <a href="../../04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/production-acceptance-uat-pack.html">Production Acceptance UAT Pack</a>, <a href="../../04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/periodic-control-cadence.html">Periodic Control Cadence</a>, <a href="../../04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/server-stack-profile-library.html">Server Stack Profile Library</a>, <a href="../../04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/pilot-endpoint-rollout-pack.html">Pilot Endpoint Rollout Pack</a> và <a href="../../04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/editorial-consistency-audit.html">Editorial Consistency Audit</a> là bộ tài liệu phải đọc khi kiểm soát phát hành, máy trạm, máy chủ, UAT, kiểm tra định kỳ và phạm vi sử dụng. Mở trực tiếp trên trình duyệt không thuộc mô hình vận hành được phép.</div></div><div class="table-card phase3a-workbook-alignment">',
        "repair_workbook_section",
        fileReport
      );
      html = applyRegex(
        html,
        /<tr><td>Mã không phát hành trong danh mục hiện hành<\/td><td>[\s\S]*?<\/td><td>Các mã này chỉ còn dùng để tra phạm vi mã \/ phạm vi quy trình; không được xem là workbook hiện hành và không được dùng để tạo hồ sơ mới\.<\/td><\/tr>/g,
        '<tr><td>Mã không phát hành trong danh mục hiện hành</td><td>FRM-103, FRM-108, FRM-109, FRM-407, FRM-412 và các mã không phát hành khác được kiểm soát tại <a href="../../04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/form-control-register.html">Form Control Register</a></td><td>Các mã này chỉ dùng để tra phạm vi mã / phạm vi quy trình; không được xem là workbook hiện hành và không được dùng để tạo hồ sơ mới.</td></tr>',
        "repair_non_issued_row",
        fileReport
      );
      return html;
    },
  },
  {
    rel: "03-Tai-Lieu-Van-Hanh/01-SOPs/01-SOP-100/sop-101-document-and-data-control.html",
    apply(html, fileReport) {
      html = applyRegex(
        html,
        /<h2 class="h2 phase3a-workbook-alignment" id="phase3a-workbook-doccontrol">11\. Biểu mẫu Excel đang hiệu lực — Kiểm soát tài liệu khi FRM đã chuyển hoàn toàn sang workbook Excel<\/h2><div class="note phase3a-workbook-alignment">[\s\S]*?<div class="table-card phase3a-workbook-alignment">/g,
        '<h2 class="h2 phase3a-workbook-alignment" id="phase3a-workbook-doccontrol">11. Biểu mẫu Excel đang hiệu lực — Kiểm soát tài liệu khi FRM đã chuyển hoàn toàn sang workbook Excel</h2><div class="note phase3a-workbook-alignment"><b>Quy tắc bắt buộc</b><br/>Khi một FRM dùng workbook Excel làm biểu mẫu hiện hành duy nhất, gói kiểm soát không còn là trang HTML mà là <b>workbook hiện hành + Form Control Register + ghi chú phạm vi mã + liên kết hệ thống liên đới</b>. Mọi thay đổi cột dữ liệu, kiểm tra hợp lệ dữ liệu, trang tính ẩn, luồng phê duyệt, nhật ký hành động, đường dẫn lưu bằng chứng hoặc ranh giới sử dụng của workbook đều phải được xem là thay đổi có kiểm soát và kéo theo rà soát SOP/WI/ANNEX/handbook/JD liên quan.<div class="note-soft"><b>Tài liệu kiểm soát bắt buộc đọc:</b> dùng thêm <a href="../../../04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/form-versioning-model.html">Form Versioning Model</a> để kiểm soát revision/reissue, <a href="../../../04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/form-release-checklist.html">Form Release Checklist</a> để chốt cổng kiểm soát trước khi workbook phát hành, <a href="../../../04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/server-delivery-rollout-checklist.html">Server Delivery Rollout Checklist</a> để xác nhận hành vi tải file ở môi trường thật và <a href="../../../04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/production-acceptance-uat-pack.html">Production Acceptance UAT Pack</a> để ký nhận go-live.</div></div><div class="table-card phase3a-workbook-alignment">',
        "repair_workbook_section",
        fileReport
      );
      html = applyLiteral(
        html,
        "Mã không phát hành trong danh mục hiện hành codes",
        "Mã không phát hành trong danh mục hiện hành",
        "cleanup_header",
        fileReport
      );
      html = applyLiteral(
        html,
        "Khi logic của mã cũ được bao phủ bởi workbook hiện hành — ví dụ được bao phủ bởi <a download=\"\" href=\"../../../04-Bieu-Mau/07-FRM-700/FRM-701_Receiving_and_IQC_Log.xlsx\">FRM-701</a> và FRM-413 — phải cập nhật mọi tài liệu hệ thống còn mô tả mã cũ là active hồ sơ.",
        "Khi logic của mã cũ được bao phủ bởi workbook hiện hành — ví dụ được bao phủ bởi <a download=\"\" href=\"../../../04-Bieu-Mau/07-FRM-700/FRM-701_Receiving_and_IQC_Log.xlsx\">FRM-701</a> và FRM-413 — phải cập nhật mọi tài liệu hệ thống còn mô tả mã cũ là hồ sơ hiện hành.",
        "cleanup_active_record",
        fileReport
      );
      html = applyRegex(
        html,
        /<tr><td>HTML form cũ ngoài danh mục hiện hành<\/td><td>HTML form cũ không thuộc bộ tài liệu kiểm soát V0; không dùng làm nơi nhập liệu, xác nhận phê duyệt hoặc điều hướng luồng công việc hiện hành\. Khi cần chuẩn hóa mã\/phạm vi, dùng \.<\/td><\/tr>/g,
        '<tr><td>HTML form cũ ngoài danh mục hiện hành</td><td>HTML form cũ không thuộc bộ tài liệu kiểm soát V0; không dùng làm nơi nhập liệu, xác nhận phê duyệt hoặc điều hướng luồng công việc hiện hành. Khi cần chuẩn hóa mã/phạm vi, dùng <a href="../../../04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/form-control-register.html">Form Control Register</a> để tra mã hiện hành và phạm vi bao phủ.</td></tr>',
        "repair_html_form_row",
        fileReport
      );
      html = applyRegex(
        html,
        /<tr><td>Mã không phát hành trong danh mục hiện hành<\/td><td>Các mã như hoặc nhóm không phát hành trong danh mục hiện hành tại chỉ dùng để tra phạm vi mã \/ phạm vi quy trình và tham chiếu phạm vi mã \/ phạm vi quy trình, không được mô tả như workbook hiện hành\.<\/td><\/tr>/g,
        '<tr><td>Mã không phát hành trong danh mục hiện hành</td><td>Các mã như FRM-103, FRM-108, FRM-109, FRM-407, FRM-412 hoặc các mã không phát hành khác trong <a href="../../../04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/form-control-register.html">Form Control Register</a> chỉ dùng để tra phạm vi mã / phạm vi quy trình và tham chiếu phạm vi mã / phạm vi quy trình, không được mô tả như workbook hiện hành.</td></tr>',
        "repair_non_issued_row",
        fileReport
      );
      html = applyRegex(
        html,
        /<tr><td>Register bắt buộc<\/td><td>Dùng , và <a href="\.\.\/\.\.\/\.\.\/04-Bieu-Mau\/00-FORM-DESIGN-SYSTEM\/form-control-register\.html">Form Control Register<\/a> làm nguồn chuẩn khi kiểm revision, trạng thái phát hành, checksum và phạm vi ảnh hưởng\.<\/td><\/tr>/g,
        '<tr><td>Register bắt buộc</td><td>Dùng <a href="../../../04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/form-versioning-model.html">Form Versioning Model</a>, <a href="../../../04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/form-release-checklist.html">Form Release Checklist</a> và <a href="../../../04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/form-control-register.html">Form Control Register</a> làm nguồn chuẩn khi kiểm revision, trạng thái phát hành, checksum và phạm vi ảnh hưởng.</td></tr>',
        "repair_register_row",
        fileReport
      );
      return html;
    },
  },
  {
    rel: "03-Tai-Lieu-Van-Hanh/01-SOPs/01-SOP-100/sop-106-change-and-configuration-management.html",
    apply(html, fileReport) {
      html = applyRegex(
        html,
        /<h2 class="h2 phase3a-workbook-alignment" id="phase3a-workbook-config">13\. Biểu mẫu Excel đang hiệu lực — Workbook structure là đối tượng change\/configuration control<\/h2><div class="note phase3a-workbook-alignment">[\s\S]*?<div class="table-card phase3a-workbook-alignment">/g,
        '<h2 class="h2 phase3a-workbook-alignment" id="phase3a-workbook-config">13. Biểu mẫu Excel đang hiệu lực — Workbook structure là đối tượng change/configuration control</h2><div class="note phase3a-workbook-alignment"><b>Phân loại thay đổi</b><br/>Khi form đã chuyển hoàn toàn sang workbook Excel hiện hành, thay đổi không chỉ là đổi wording của biểu mẫu. Các thay đổi như thêm cột, đổi dropdown, đổi hidden logic, đổi sheet theo dõi tiếp, đổi luồng phê duyệt, hợp nhất form hoặc porting logic từ form cũ sang form mới đều được xem là <b>configuration-impacting change</b>.<div class="note-soft"><b>Tài liệu kiểm soát bắt buộc đọc:</b> mọi thay đổi workbook phải bám <a href="../../../04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/form-versioning-model.html">Form Versioning Model</a>, bảng kiểm thực thi tại <a href="../../../04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/form-release-checklist.html">Form Release Checklist</a>, kiểm soát rollout máy chủ tại <a href="../../../04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/server-delivery-rollout-checklist.html">Server Delivery Rollout Checklist</a> và UAT ký nhận tại <a href="../../../04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/production-acceptance-uat-pack.html">Production Acceptance UAT Pack</a>.</div></div><div class="table-card phase3a-workbook-alignment">',
        "repair_workbook_section",
        fileReport
      );
      html = applyLiteral(
        html,
        "Nếu workbook làm thay đổi ranh giới như port vào <a download=\"\" href=\"../../../04-Bieu-Mau/07-FRM-700/FRM-701_Receiving_and_IQC_Log.xlsx\">FRM-701</a>, phải cập nhật toàn bộ tài liệu còn mô tả ranh giới cũ và ghi lại trong .",
        "Nếu workbook làm thay đổi ranh giới như port vào <a download=\"\" href=\"../../../04-Bieu-Mau/07-FRM-700/FRM-701_Receiving_and_IQC_Log.xlsx\">FRM-701</a>, phải cập nhật toàn bộ tài liệu còn mô tả ranh giới cũ và ghi lại trong <a href=\"../../../04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/form-control-register.html\">Form Control Register</a>.",
        "repair_boundary_row",
        fileReport
      );
      html = applyLiteral(
        html,
        "Nếu một mã FRM không có workbook hiện hành trong danh mục hiện hành thì phải ghi là mã không phát hành trong V0, cập nhật phạm vi mã / phạm vi quy trình tại và không để portal hoặc SOP/WI tiếp tục xem đó là active hồ sơ.",
        "Nếu một mã FRM không có workbook hiện hành trong danh mục hiện hành thì phải ghi là mã không phát hành trong V0, cập nhật phạm vi mã / phạm vi quy trình tại <a href=\"../../../04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/form-control-register.html\">Form Control Register</a> và không để portal hoặc SOP/WI tiếp tục xem đó là hồ sơ hiện hành.",
        "repair_non_issued_row",
        fileReport
      );
      return html;
    },
  },
  {
    rel: "04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/form-control-register.html",
    apply(html, fileReport) {
      html = applyLiteral(html, "Supplier Performance Thẻ điểm (scorecard) &amp; Source Trạng thái Review", "Supplier Scorecard", "repair_titles", fileReport);
      html = applyLiteral(html, "Supplier / Processor Đánh giá Bảng kiểm &amp; Recovery Bảng theo dõi", "Supplier Audit Checklist", "repair_titles", fileReport);
      html = applyLiteral(html, "Outsourced Processing Return Xác minh &amp; Kiểm tra đầu vào", "Outsourced Process Incoming Verification", "repair_titles", fileReport);
      html = applyLiteral(html, "Environmental &amp; Storage Condition Nhật ký", "Environment Log", "repair_titles", fileReport);
      html = applyLiteral(html, "<tr id=\"FRM-103\"><td>FRM-103</td><td>Master Document Register</td>", "<tr id=\"FRM-103\"><td>FRM-103</td><td>Document Issue Control</td>", "repair_titles", fileReport);
      html = applyLiteral(html, "<tr id=\"FRM-108\"><td>FRM-108</td><td>Document Deployment Checklist</td>", "<tr id=\"FRM-108\"><td>FRM-108</td><td>Controlled Copy Register</td>", "repair_titles", fileReport);
      html = applyLiteral(html, "<tr id=\"FRM-109\"><td>FRM-109</td><td>IT Access Request Change Removal</td>", "<tr id=\"FRM-109\"><td>FRM-109</td><td>Access Rights and DCR Matrix</td>", "repair_titles", fileReport);
      html = applyLiteral(html, "<tr id=\"FRM-407\"><td>FRM-407</td><td>Supplier Scorecard</td>", "<tr id=\"FRM-407\"><td>FRM-407</td><td>Supplier Product Folder Index and Retrieval Register</td>", "repair_titles", fileReport);
      html = applyLiteral(html, "Release / vấn đề control is now covered by FRM-101 master register and FRM-104 deployment bảng kiểm; no standalone workbook was issued in the imported Excel packs.", "Việc kiểm soát phát hành / phát hành bản đã được bao phủ bởi FRM-101 Master Document Register và FRM-104 Document Deployment Checklist; không phát hành workbook riêng cho FRM-103 trong gói hiện hành.", "repair_explanations", fileReport);
      html = applyLiteral(html, "Controlled copy deployment / withdrawal is now governed by FRM-104 deployment bảng kiểm and FRM-101 master register; no standalone workbook was issued in the imported Excel packs.", "Việc triển khai / thu hồi controlled copy hiện được kiểm soát qua FRM-104 Document Deployment Checklist và FRM-101 Master Document Register; không phát hành workbook riêng cho FRM-108 trong gói hiện hành.", "repair_explanations", fileReport);
      html = applyLiteral(html, "Digital access / change thẩm quyền is now governed through FRM-141 IT access request-change-removal, FRM-111 rà soát quyền truy cập hàng quý, and FRM-110 M365 Configuration Checklist.", "Quyền truy cập số / quyền thay đổi hiện được kiểm soát qua FRM-141 IT Access Request Change Removal, FRM-111 Quarterly Access Review và FRM-110 M365 Configuration Checklist.", "repair_explanations", fileReport);
      html = applyLiteral(html, "Supplier bằng chứng retrieval is now controlled by ANNEX-403 dossier structure plus active supplier hồ sơ FRM-405 / FRM-409 / FRM-411; no standalone workbook was issued for FRM-407.", "Việc truy xuất bằng chứng nhà cung cấp hiện được kiểm soát qua cấu trúc hồ sơ nhà cung cấp cùng các hồ sơ hiện hành FRM-405 / FRM-409 / FRM-411; không phát hành workbook riêng cho FRM-407.", "repair_explanations", fileReport);
      html = applyLiteral(html, "Receipt / IQC gating logic was ported into FRM-701 workbook. HOLD / disposition / release remain controlled through FRM-413.", "Logic tiếp nhận / cổng kiểm soát IQC đã được chuyển sang workbook FRM-701. HOLD / disposition / release tiếp tục được kiểm soát qua FRM-413.", "repair_explanations", fileReport);
      html = applyLiteral(
        html,
        '<div class="note-soft"><b>Liên kết điều khiển:</b> <a href="form-versioning-model.html">Form Versioning Model</a> • <a href="form-release-checklist.html">Form Release Checklist</a> • .</div>',
        '<div class="note-soft"><b>Liên kết điều khiển:</b> <a href="form-versioning-model.html">Form Versioning Model</a> • <a href="form-release-checklist.html">Form Release Checklist</a> • <a href="periodic-control-cadence.html">Periodic Control Cadence</a>.</div>',
        "repair_control_links",
        fileReport
      );
      return html;
    },
  },
  {
    rel: "04-Bieu-Mau/index.html",
    apply(html, fileReport) {
      html = applyRegex(
        html,
        /<title>.*?<\/title>/g,
        "<title>Workbook Excel Active Form Library | HESEM QMS</title>",
        "repair_title",
        fileReport
      );
      html = applyRegex(
        html,
        /<div class="title"><strong>[\s\S]*?<\/strong><span class="sub-vn">[\s\S]*?<\/span><\/div>/g,
        '<div class="title"><strong>Workbook Excel Active Form Library</strong><span class="sub-vn">Thư viện biểu mẫu FRM hiện hành</span></div>',
        "repair_title",
        fileReport
      );
      html = applyRegex(
        html,
        /<div class="card"><h1 class="h1" style="margin-top:0">[\s\S]*?<\/h1>/g,
        '<div class="card"><h1 class="h1" style="margin-top:0">Workbook Excel Active Form Library — danh mục hiện hành</h1>',
        "repair_title",
        fileReport
      );
      html = applyRegex(
        html,
        /<tbody><tr><td>Form Control Register<\/td>[\s\S]*?<\/tbody>/g,
        '<tbody><tr><td>Form Control Register</td><td>SSOT cho register, versioning model, checksum, phạm vi mã và trạng thái phát hành của danh mục hiện hành.</td><td><a href="00-FORM-DESIGN-SYSTEM/form-control-register.html">Form Control Register</a></td></tr><tr><td>Form Versioning Model</td><td>Quy định cách quản lý phiên bản workbook, nguyên tắc phát hành lại và ranh giới thay đổi có kiểm soát.</td><td><a href="00-FORM-DESIGN-SYSTEM/form-versioning-model.html">Form Versioning Model</a></td></tr><tr><td>Form Release Checklist</td><td>Bảng kiểm bắt buộc trước khi phát hành hoặc phát hành lại workbook vào danh mục hiện hành.</td><td><a href="00-FORM-DESIGN-SYSTEM/form-release-checklist.html">Form Release Checklist</a></td></tr><tr><td>Kiểm soát máy chủ / máy trạm / UAT</td><td>Bộ tài liệu để kiểm soát rollout máy chủ, baseline endpoint desktop Excel, UAT, cadence kiểm tra định kỳ và tính nhất quán biên tập.</td><td><a href="00-FORM-DESIGN-SYSTEM/server-delivery-rollout-checklist.html">Server Delivery Rollout Checklist</a> • <a href="00-FORM-DESIGN-SYSTEM/desktop-excel-endpoint-baseline.html">Desktop Excel Endpoint Baseline</a> • <a href="00-FORM-DESIGN-SYSTEM/production-acceptance-uat-pack.html">Production Acceptance UAT Pack</a> • <a href="00-FORM-DESIGN-SYSTEM/periodic-control-cadence.html">Periodic Control Cadence</a> • <a href="00-FORM-DESIGN-SYSTEM/server-stack-profile-library.html">Server Stack Profile Library</a> • <a href="00-FORM-DESIGN-SYSTEM/pilot-endpoint-rollout-pack.html">Pilot Endpoint Rollout Pack</a> • <a href="00-FORM-DESIGN-SYSTEM/editorial-consistency-audit.html">Editorial Consistency Audit</a></td></tr></tbody>',
        "repair_control_table",
        fileReport
      );
      return html;
    },
  },
];

const report = [];

for (const file of files) {
  const abs = path.join(ROOT, file.rel);
  let html = fs.readFileSync(abs, "utf8");
  const fileReport = { path: file.rel, total: 0, rules: {} };
  const next = file.apply(html, fileReport);
  if (next !== html) {
    fs.writeFileSync(abs, next, "utf8");
  }
  report.push(fileReport);
}

for (const item of report) {
  console.log(`${item.path}: ${item.total} replacements`);
}
