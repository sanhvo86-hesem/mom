import fs from 'node:fs';
import path from 'node:path';

const repoRoot = 'C:/Users/TEST4/qms.hesem.com.vn';
const updated = [];

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

function write(relPath, content) {
  fs.writeFileSync(path.join(repoRoot, relPath), content, 'utf8');
  updated.push(path.join(repoRoot, relPath));
}

function replaceOne(content, pattern, replacement, label) {
  const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern, 's');
  if (!regex.test(content)) {
    throw new Error(`Pattern not found: ${label}`);
  }
  return content.replace(regex, replacement);
}

function updateFile(relPath, mutator) {
  const current = read(relPath);
  const next = mutator(current);
  if (next !== current) {
    write(relPath, next);
  }
}

updateFile(
  '03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/annex-111-document-writing-and-cross-reference-rules.html',
  (content) => {
    const marker = 'Mọi mã SOP, WI, ANNEX và FRM xuất hiện trong HTML PHẢI được gắn link nội bộ trực tiếp';
    if (content.includes(marker)) return content;
    const insert = `
<p>Mọi mã SOP, WI, ANNEX và FRM xuất hiện trong HTML PHẢI được gắn link nội bộ trực tiếp tới tài liệu hiện hành, trang chỉ mục hiện hành hoặc register hiện hành. Mã FRM chưa phát hành file riêng PHẢI trỏ về <a href="../../../../04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/form-control-register.html">Biểu mẫu Control Sổ Đăng ký</a>. Cửa vào điều hướng cho người dùng cuối là <a href="../../../../02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/index.html">Department Handbooks Index</a>; quy tắc đọc theo vai trò và tình huống thực hiện theo <a href="../../../02-Work-Instructions/01-WI-100/wi-105-qms-document-navigation-role-based-reading-path-and-deployment.html">WI-105</a>.</p>`;
    return replaceOne(
      content,
      /(<h2 class="h2">3\. Quy [\s\S]*?<\/h2>\s*<p>[\s\S]*?<\/p>)/s,
      `$1\n${insert}`,
      'ANNEX-111 section 3'
    );
  }
);

updateFile(
  '03-Tai-Lieu-Van-Hanh/01-SOPs/01-SOP-100/sop-101-document-and-data-control.html',
  (content) => {
    let next = content;
    const topMarker = 'Đường đi bắt buộc cho người dùng:';
    if (!next.includes(topMarker)) {
      const topNote = `
<div class="note-blue"><b>Đường đi bắt buộc cho người dùng:</b> người dùng cuối bắt đầu từ <a href="../../../02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/index.html">Department Handbooks Index</a>, đi theo <a href="../../02-Work-Instructions/01-WI-100/wi-105-qms-document-navigation-role-based-reading-path-and-deployment.html">WI-105</a>, sau đó mở đúng SOP/WI/FRM/ANNEX theo tình huống công việc. Mọi mã tài liệu trong HTML PHẢI là link nội bộ. Mã FRM chưa phát hành file riêng PHẢI trỏ về <a href="../../../04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/form-control-register.html">Biểu mẫu Control Sổ Đăng ký</a>. Vùng lưu hồ sơ M365/SharePoint tuân theo <a href="../../03-Reference/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-133-m365-records-site-topology-library-and-folder-blueprint.html">ANNEX-133</a>, <a href="../../03-Reference/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-134-m365-records-provisioning-permissions-and-automation-architecture.html">ANNEX-134</a> và <a href="../../03-Reference/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-135-m365-operational-records-file-plan-by-department-role-and-job.html">ANNEX-135</a>.</div>`;
      next = replaceOne(
        next,
        /(<div class="preface-block">[\s\S]*?<\/div><\/div>)/s,
        `$1\n${topNote}`,
        'SOP-101 top note'
      );
    }
    const bottomNote = `<div class="note-blue"><b>Bổ sung bắt buộc về tài liệu liên kết:</b> SOP-101 phải được dùng cùng <a href="../../02-Work-Instructions/01-WI-100/wi-101-digital-online-forms-and-approvals.html">WI-101</a>, <a href="../../02-Work-Instructions/01-WI-100/wi-105-qms-document-navigation-role-based-reading-path-and-deployment.html">WI-105</a>, <a href="../../03-Reference/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/annex-111-document-writing-and-cross-reference-rules.html">ANNEX-111</a>, <a href="../../03-Reference/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/annex-114-go-live-runbook-and-cutover-control.html">ANNEX-114</a>, <a href="../../03-Reference/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/annex-115-epicor-transaction-and-interface-map.html">ANNEX-115</a>, <a href="../../03-Reference/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/annex-118-offline-fallback-kit.html">ANNEX-118</a>, <a href="../../03-Reference/01-ANNEX-100/10-ANNEX-100-Foundation-Maps-and-Control/annex-101-role-based-access-map.html">ANNEX-101</a>, <a href="../../03-Reference/01-ANNEX-100/10-ANNEX-100-Foundation-Maps-and-Control/annex-102-access-request-field-dictionary.html">ANNEX-102</a>, <a href="../../03-Reference/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-133-m365-records-site-topology-library-and-folder-blueprint.html">ANNEX-133</a>, <a href="../../03-Reference/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-134-m365-records-provisioning-permissions-and-automation-architecture.html">ANNEX-134</a> và <a href="../../03-Reference/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-135-m365-operational-records-file-plan-by-department-role-and-job.html">ANNEX-135</a>. Cửa vào điều hướng cho người dùng cuối là <a href="../../../02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/index.html">Department Handbooks Index</a>. Các biểu mẫu số <a href="../../../04-Bieu-Mau/01-FRM-100/FRM-110_M365_Configuration_Checklist.xlsx" download="">FRM-110</a> và <a href="../../../04-Bieu-Mau/01-FRM-100/FRM-111_Quarterly_Access_Review.xlsx" download="">FRM-111</a> là bằng chứng bắt buộc cho thay đổi cấu hình và rà soát quyền truy cập.</div>`;
    next = replaceOne(
      next,
      /<div class="note-blue"><b>Bổ sung bắt buộc về tài liệu liên kết:<\/b>[\s\S]*?<\/div>/s,
      bottomNote,
      'SOP-101 bottom note'
    );
    return next;
  }
);

updateFile(
  '03-Tai-Lieu-Van-Hanh/01-SOPs/01-SOP-100/sop-104-data-governance-records-security-and-ip-protection.html',
  (content) => {
    const marker = 'Mô hình M365 records bắt buộc:';
    if (content.includes(marker)) return content;
    const note = `
<div class="note-blue"><b>Mô hình M365 records bắt buộc:</b> toàn bộ hồ sơ vận hành số đi theo mô hình <b>3 site</b>: <b>HESEM-QMS-Core</b>, <b>HESEM-People-Restricted</b> và <b>HESEM-Digital-Control</b>. Cách tạo site/library/quyền triển khai theo <a href="../../02-Work-Instructions/01-WI-100/wi-102-sharepoint-record-sites-libraries-and-permissions-click-by-click.html">WI-102</a>. Đường đọc cho người dùng cuối đi từ <a href="../../../02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/index.html">Department Handbooks Index</a> và <a href="../../02-Work-Instructions/01-WI-100/wi-105-qms-document-navigation-role-based-reading-path-and-deployment.html">WI-105</a>. File plan, vị trí lưu hồ sơ và grammar folder chuẩn áp dụng theo <a href="../../03-Reference/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-135-m365-operational-records-file-plan-by-department-role-and-job.html">ANNEX-135</a>. Không phòng ban nào được tự tạo SSOT riêng ngoài kiến trúc này.</div>`;
    return replaceOne(
      content,
      /(<div class="preface-block">[\s\S]*?<\/div><\/div>)/s,
      `$1\n${note}`,
      'SOP-104 note'
    );
  }
);

updateFile(
  '02-Tai-Lieu-He-Thong/01-Quality-Manual/qms-man-001-qms-manual.html',
  (content) => {
    const replacement = `<p>Các tài liệu chuẩn cho lớp kiểm soát số gồm <a href="../../03-Tai-Lieu-Van-Hanh/01-SOPs/01-SOP-100/sop-104-data-governance-records-security-and-ip-protection.html">SOP-104</a>, bộ <a href="../../03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-131-m365-records-metadata-list-schema-and-register-catalog.html">ANNEX-131</a> đến <a href="../../03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-135-m365-operational-records-file-plan-by-department-role-and-job.html">ANNEX-135</a>, <a href="../../03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/annex-113-dashboard-deployment-access-and-refresh-control.html">ANNEX-113</a>, <a href="../../03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/annex-115-epicor-transaction-and-interface-map.html">ANNEX-115</a>, <a href="../../03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/annex-118-offline-fallback-kit.html">ANNEX-118</a>, <a href="../../03-Tai-Lieu-Van-Hanh/02-Work-Instructions/01-WI-100/wi-102-sharepoint-record-sites-libraries-and-permissions-click-by-click.html">WI-102</a>, <a href="../../03-Tai-Lieu-Van-Hanh/02-Work-Instructions/01-WI-100/wi-103-m365-folder-routing-training-competence-and-adoption-for-cnc-job-orders.html">WI-103</a>, <a href="../../03-Tai-Lieu-Van-Hanh/02-Work-Instructions/01-WI-100/wi-104-m365-folder-routing-quick-cards-by-role-for-cnc-job-order.html">WI-104</a>, <a href="../../03-Tai-Lieu-Van-Hanh/02-Work-Instructions/01-WI-100/wi-105-qms-document-navigation-role-based-reading-path-and-deployment.html">WI-105</a>, <a href="../03-Organization/02-Department-Handbooks/index.html">Department Handbooks Index</a> và sổ tay của <a href="../03-Organization/02-Department-Handbooks/dept-it-handbook.html">IT</a> / <a href="../03-Organization/02-Department-Handbooks/dept-epicor-handbook.html">Epicor</a>. Bộ này quy định cả nơi lưu hồ sơ, mô hình phân quyền, đường đọc tài liệu theo vai trò và cách đào tạo người dùng dùng đúng hệ thống.</p>`;
    return replaceOne(
      content,
      /<p>Các tài liệu chuẩn cho lớp kiểm soát số gồm[\s\S]*?<\/p>/s,
      replacement,
      'QMS Manual paragraph'
    );
  }
);

updateFile(
  '02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/index.html',
  (content) => {
    const marker = 'Quy tắc lưu hồ sơ:';
    if (content.includes(marker)) return content;
    const note = `
<div class="note"><strong>Quy tắc lưu hồ sơ:</strong><br/>Sau khi biết mình phải đọc tài liệu nào, mọi hồ sơ và file vận hành phải được đặt vào đúng vị trí theo <a href="../../../03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-135-m365-operational-records-file-plan-by-department-role-and-job.html">ANNEX-135</a>. IT và chủ hệ thống triển khai site, library và permission boundary theo <a href="../../../03-Tai-Lieu-Van-Hanh/02-Work-Instructions/01-WI-100/wi-102-sharepoint-record-sites-libraries-and-permissions-click-by-click.html">WI-102</a>.</div>`;
    return replaceOne(
      content,
      /(<div class="keyline">[\s\S]*?<\/div>)/s,
      `$1\n${note}`,
      'Handbook index note'
    );
  }
);

updateFile(
  '03-Tai-Lieu-Van-Hanh/02-Work-Instructions/01-WI-100/wi-101-digital-online-forms-and-approvals.html',
  (content) => {
    const marker = 'Điểm vào và nơi lưu bắt buộc:';
    if (content.includes(marker)) return content;
    const callout = `
<div class="callout-strong"><b>Điểm vào và nơi lưu bắt buộc:</b> người dùng cuối bắt đầu từ <a href="../../../02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/index.html">Department Handbooks Index</a> và <a href="wi-105-qms-document-navigation-role-based-reading-path-and-deployment.html">WI-105</a> để biết khi nào phải mở WI-101. Mô hình site/library/permission cho M365 records nằm tại <a href="../../03-Reference/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-134-m365-records-provisioning-permissions-and-automation-architecture.html">ANNEX-134</a>. Vị trí lưu hồ sơ, bằng chứng và grammar folder thực thi theo <a href="../../03-Reference/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-135-m365-operational-records-file-plan-by-department-role-and-job.html">ANNEX-135</a>.</div>`;
    return replaceOne(
      content,
      /(<div class="doc-link-row">[\s\S]*?<\/div>)/s,
      `$1\n${callout}`,
      'WI-101 callout'
    );
  }
);

updateFile(
  '03-Tai-Lieu-Van-Hanh/01-SOPs/03-SOP-300/sop-303-engineering-release-baseline-package-and-job-snapshot-control.html',
  (content) => {
    const marker = 'Kết nối bắt buộc với M365 records:';
    if (content.includes(marker)) return content;
    const note = `
<div class="note-blue"><b>Kết nối bắt buộc với M365 records:</b> gói master của SOP-303 đi theo nhánh <b>CustomerID → PartNo → REV</b> và gói đóng băng theo Job đi theo grammar của <a href="../../03-Reference/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-133-m365-records-site-topology-library-and-folder-blueprint.html">ANNEX-133</a>, <a href="../../03-Reference/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-134-m365-records-provisioning-permissions-and-automation-architecture.html">ANNEX-134</a> và <a href="../../03-Reference/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-135-m365-operational-records-file-plan-by-department-role-and-job.html">ANNEX-135</a>. Job evidence pack nạp theo <a href="../../02-Work-Instructions/02-WI-200/wi-203-job-dossier-evidence-pack-and-record-completeness.html">WI-203</a>. Người dùng cuối đi từ <a href="../../../02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/index.html">Department Handbooks Index</a> và <a href="../../02-Work-Instructions/01-WI-100/wi-105-qms-document-navigation-role-based-reading-path-and-deployment.html">WI-105</a> để mở đúng tuyến đọc.</div>`;
    return replaceOne(
      content,
      /(<div class="preface-block">[\s\S]*?<\/div><\/div>)/s,
      `$1\n${note}`,
      'SOP-303 note'
    );
  }
);

updateFile(
  '03-Tai-Lieu-Van-Hanh/02-Work-Instructions/07-WI-700/wi-701-receiving-iqc-traceability-and-put-away.html',
  (content) => {
    let next = replaceOne(
      content,
      /<tr><td>Liên kết bắt buộc<\/td><td>[\s\S]*?<\/td><\/tr>/s,
      '<tr><td>Liên kết bắt buộc</td><td><a href="../../01-SOPs/04-SOP-400/sop-401-supplier-control-and-special-process.html">SOP-401</a>, <a href="../../01-SOPs/04-SOP-400/sop-402-material-verification-traceability-and-counterfeit-prevention.html">SOP-402</a>, <a href="../../01-SOPs/07-SOP-700/sop-701-receiving-packaging-handling-and-storage.html">SOP-701</a>, <a href="../../01-SOPs/01-SOP-100/sop-104-data-governance-records-security-and-ip-protection.html">SOP-104</a>, <a href="../../03-Reference/03-ANNEX-300/annex-302-approved-materials-list.html">ANNEX-302</a>, <a href="../../03-Reference/04-ANNEX-400/annex-403-approved-processor-list.html">ANNEX-403</a>, <a href="../../03-Reference/07-ANNEX-700/annex-703-warehouse-location-fifo-rules.html">ANNEX-703</a>, <a href="../../03-Reference/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-135-m365-operational-records-file-plan-by-department-role-and-job.html">ANNEX-135</a>, <a href="../02-WI-200/wi-205-barcode-labeling-and-scan-to-action.html">WI-205</a>, <a href="../06-WI-600/wi-603-aql-sampling-inspection-execution.html">WI-603</a>, <a href="../06-WI-600/wi-606-suspect-product-containment-segregation-and-reaction.html">WI-606</a>, <a href="../01-WI-100/wi-105-qms-document-navigation-role-based-reading-path-and-deployment.html">WI-105</a>.</td></tr>',
      'WI-701 related docs'
    );
    const marker = 'SoR / SSOT bắt buộc:';
    if (!next.includes(marker)) {
      const callout = `
<div class="callout-info"><strong>SoR / SSOT bắt buộc:</strong> Epicor giữ giao dịch phiếu nhận, hold, phát hành và location movement. Ảnh kiện hàng, cert, MTC, biên bản IQC và bằng chứng ngoại lệ lưu trên M365/SharePoint theo <a href="../../03-Reference/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-135-m365-operational-records-file-plan-by-department-role-and-job.html">ANNEX-135</a>. Người dùng tìm đúng folder qua <a href="../../../02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/index.html">Department Handbooks Index</a> và <a href="../01-WI-100/wi-105-qms-document-navigation-role-based-reading-path-and-deployment.html">WI-105</a>.</div>`;
      next = replaceOne(
        next,
        /(<tr><td>Liên kết bắt buộc<\/td><td>[\s\S]*?<\/td><\/tr>\s*<\/tbody><\/table><\/div>)/s,
        `$1\n${callout}`,
        'WI-701 callout'
      );
    }
    return next;
  }
);

updateFile(
  '02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/10-JD-IT/jd-epicor-system-administrator.html',
  (content) => {
    return content.replace(
      'System admin log; <a href="../../../../03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/annex-115-epicor-transaction-and-interface-map.html">ANNEX-115</a>/ANNEX-021 hồ sơ; phiếu yêu cầu bảng theo dõi.',
      'System admin log; <a href="../../../../03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/11-ANNEX-110-Digital-Control-and-Resilience/annex-115-epicor-transaction-and-interface-map.html">ANNEX-115</a>/<a href="../../../../03-Tai-Lieu-Van-Hanh/03-Reference/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-132-m365-records-flow-approval-sharing-and-exception-control.html">ANNEX-132</a> hồ sơ; phiếu yêu cầu bảng theo dõi.'
    );
  }
);

updateFile(
  '03-Tai-Lieu-Van-Hanh/01-SOPs/01-SOP-100/sop-107-communication-management.html',
  (content) => {
    return content.replace(
      '<a href="../../03-Reference/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-120-authority-matrix.html">ANNEX-120</a>/ANNEX-020/ANNEX-009',
      '<a href="../../03-Reference/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-120-authority-matrix.html">ANNEX-120</a>/<a href="../../03-Reference/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-121-raci-master-matrix.html">ANNEX-121</a>/<a href="../../03-Reference/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-123-deputy-backup-matrix.html">ANNEX-123</a>'
    );
  }
);

updateFile(
  '03-Tai-Lieu-Van-Hanh/03-Reference/06-ANNEX-600/annex-608-semi-standards-and-csr-matrix.html',
  (content) => {
    return content.replace(
      'công thái học design — liên quan con người yếu tố SOP-024.',
      'công thái học design — liên quan con người yếu tố <a href="../../01-SOPs/08-SOP-800/sop-804-human-factors-and-error-proofing.html">SOP-804</a>.'
    );
  }
);

updateFile(
  '03-Tai-Lieu-Van-Hanh/03-Reference/08-ANNEX-800/annex-803-ppe-and-hazard-matrix.html',
  (content) => {
    return content.replace(
      'các biểu mẫu tại nhóm <a href="../../../04-Bieu-Mau/08-FRM-800/index.html">FRM-800</a>.',
      'các biểu mẫu tại nhóm <a href="../../../04-Bieu-Mau/08-FRM-800/index.html">FRM-800</a>.'
    );
  }
);

const reportPath = path.join(repoRoot, '_reports/sharepoint-crossref-governance-updated-files-20260325.txt');
fs.writeFileSync(reportPath, `${updated.sort().join('\n')}\n`, 'utf8');
console.log(`updated_files=${updated.length}`);
console.log(`report=${reportPath}`);
