#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DOC_ROOTS = [
  "mom/docs/operations/sops",
  "mom/docs/operations/work-instructions",
  "mom/docs/operations/references",
];

const EXCLUDED_BLOCK_PATTERNS = [
  /<script\b[\s\S]*?<\/script>/gi,
  /<style\b[\s\S]*?<\/style>/gi,
  /<code\b[\s\S]*?<\/code>/gi,
  /<pre\b[\s\S]*?<\/pre>/gi,
  /<a\b[\s\S]*?<\/a>/gi,
  /<span\b[^>]*class="[^"]*\b(?:code|path|role-code|dept-code|entity-code)\b[^"]*"[\s\S]*?<\/span>/gi,
  /<span\b[^>]*class='[^']*\b(?:code|path|role-code|dept-code|entity-code)\b[^']*'[\s\S]*?<\/span>/gi,
  /<div\b[^>]*class="dcc-header"[\s\S]*?<\/div>/gi,
  /<div\b[^>]*class='dcc-header'[\s\S]*?<\/div>/gi,
  /<!--[\s\S]*?-->/g,
];

const GLOBAL_REPLACEMENTS = [
  ["Department × Role × Scenario × File Master Matrix", "Ma trận tổng thể phòng ban × vai trò × tình huống × nhóm tệp"],
  ["KPI Cascade Dictionary", "Từ điển KPI phân tầng"],
  ["Dispatch Capacity and WIP Control", "Kiểm soát điều độ, năng lực và WIP"],
  ["Supplier Control and Special Process", "Kiểm soát nhà cung cấp và công đoạn đặc biệt"],
  ["too generic", "quá chung chung"],
  ["part-centric", "xoay quanh mã chi tiết"],
  ["HR-centric", "xoay quanh nhân sự"],
  ["folder trở thành nghĩa địa", "thư mục trở thành nơi chất đống khó tra cứu"],
  ["file xong không biết bỏ đâu", "tệp xong không biết lưu vào đâu"],
  ["file class", "nhóm tệp"],
  ["role nào tạo, ai duyệt, ai đọc, retention bao lâu, sensitivity label nào", "vai trò nào tạo, ai duyệt, ai đọc, thời hạn lưu giữ bao lâu, nhãn độ nhạy nào"],
  ["site", "không gian"],
  ["folder", "thư mục"],
  ["library", "thư viện"],
  ["record", "hồ sơ"],
  ["records", "hồ sơ"],
  ["metadata", "siêu dữ liệu"],
  ["cross-reference", "tham chiếu chéo"],
  ["approval", "phê duyệt"],
  ["workflow", "luồng công việc"],
  ["exception control", "kiểm soát ngoại lệ"],
  ["permission model", "mô hình phân quyền"],
  ["register catalog", "danh mục sổ đăng ký"],
  ["file plan", "kế hoạch hồ sơ"],
  ["runtime boundary", "ranh giới môi trường chạy"],
  ["naming convention", "quy ước đặt tên"],
  ["architecture", "kiến trúc"],
  ["blueprint", "bản thiết kế"],
  ["operating mechanism", "cơ chế vận hành"],
  ["performance operating system", "hệ điều hành hiệu suất"],
  ["system matrix", "ma trận hệ thống"],
  ["document usage", "cách dùng tài liệu"],
  ["authority registry", "sổ đăng ký thẩm quyền"],
  ["operational metrics", "chỉ số vận hành"],
  ["change roadmap", "lộ trình thay đổi"],
  ["priority register", "sổ đăng ký ưu tiên"],
  ["data model", "mô hình dữ liệu"],
  ["offline fallback kit", "bộ dự phòng ngoại tuyến"],
  ["role-based access map", "bản đồ truy cập theo vai trò"],
  ["source-of-record", "nguồn ghi nhận gốc"],
  ["freeze-date", "ngày khóa số liệu"],
  ["manual-governed", "được kiểm soát thủ công"],
  ["cross-reference policy", "quy định tham chiếu chéo"],
  ["legal basis", "cơ sở pháp lý"],
  ["three-tier", "ba tầng"],
  ["workflow data", "dữ liệu luồng công việc"],
  ["structured data", "dữ liệu có cấu trúc"],
  ["document file", "tệp tài liệu"],
  ["working evidence", "bằng chứng làm việc"],
  ["reference key", "khóa tham chiếu"],
  ["default retention label", "nhãn lưu giữ mặc định"],
  ["physical file", "tệp vật lý"],
  ["authoritative", "có thẩm quyền gốc"],
  ["Decision note", "Ghi chú quyết định"],
  ["Hold code", "Mã tạm giữ"],
  ["Material ready", "Vật tư sẵn sàng"],
  ["Setup / tool / fixture ready", "Setup / dao cụ / đồ gá đã sẵn sàng"],
  ["Machine / capacity ready", "Máy / năng lực đã sẵn sàng"],
  ["Outsource / downstream coupling ready", "Khớp nối outsource / công đoạn sau đã sẵn sàng"],
  ["machine family", "nhóm máy"],
  ["freeze window", "cửa sổ khóa kế hoạch"],
  ["split lot", "tách lô"],
  ["special release", "phát hành đặc biệt"],
  ["working evidence", "bằng chứng làm việc"],
  ["working pack", "bộ hồ sơ làm việc"],
  ["navigation aid", "công cụ điều hướng"],
  ["physical file", "tệp vật lý"],
  ["delivery", "giao hàng"],
  ["scorecard", "thẻ điểm"],
  ["counter metric", "chỉ số đối trọng"],
  ["official KPI", "KPI chính thức"],
  ["operating metric", "chỉ số vận hành"],
  ["gate control metric", "chỉ số kiểm soát cổng"],
  ["role measure", "chỉ số theo vai trò"],
  ["health metric", "chỉ số sức khỏe hệ thống"],
  ["customer profile", "hồ sơ khách hàng"],
  ["Admin Console KPI Registry", "KPI Registry trên bảng quản trị"],
  ["Performance Dashboard", "Bảng điều khiển hiệu suất"],
  ["escalation", "chuyển cấp"],
  ["review", "rà soát"],
  ["owner", "chủ sở hữu"],
  ["evidence", "bằng chứng"],
  ["ship", "giao hàng"],
  ["pack", "bộ hồ sơ"],
];

const REGEX_REPLACEMENTS = [
  [/\bbộ hồ sơage\b/gi, "bộ hồ sơ"],
  [/\bhồ sơage\b/gi, "hồ sơ"],
  [/\bbộ hồ sơet\b/gi, "bộ hồ sơ"],
  [/\bBộ hồ sơs\b/g, "Bộ hồ sơ"],
  [/\bbộ hồ sơs\b/g, "bộ hồ sơ"],
  [/\bcross-không gian\b/gi, "liên không gian"],
  [/\bsource\/runtime\b/gi, "nguồn / môi trường chạy"],
  [/\bworkflow\b/gi, "luồng công việc"],
  [/\bready-for-use\b/gi, "sẵn dùng"],
  [/\bquá generic\b/gi, "quá chung chung"],
  [/\bconsumer portal\b/gi, "cổng mà HESEM sử dụng để làm việc với khách hàng"],
  [/\bconsumer\b/gi, "bên sử dụng"],
  [/\bGIAO HÀNGMENT\b/g, "GIAO HÀNG"],
  [/\bgiao hàngment\b/gi, "giao hàng"],
  [/\bngment\b/g, ""],
  [/\bcompokhông gian\b/gi, "kết hợp"],
  [/\bchủ sở hữugiao hàng\b/gi, "chủ sở hữu"],
  [/\binner bộ hồ sơage\b/gi, "bao gói bên trong"],
  [/\bMọi vật liệu đã có trong AML này hoặc đã được bổ sung bằng đúng đường phê duyệt\b/g, "được dùng khi vật liệu đã có trong AML này hoặc đã được bổ sung đúng quy trình phê duyệt"],
  [/\bđiểm giữ \(điểm giữ \(điểm giữ \(điểm giữ \(điểm giữ lại\)\)\)\)\)/g, "điểm giữ bắt buộc"],
  [/\bđiểm giữ \(điểm giữ \(điểm giữ \(điểm giữ \(điểm chặn\)\)\)\)\)/g, "điểm chặn bắt buộc"],
  [/\bđiểm giữ \(điểm giữ \(điểm giữ \(điểm chặn\)\)\)\b/g, "điểm chặn bắt buộc"],
  [/\bđiểm giữ \(điểm giữ \(điểm giữ \(điểm giữ \(điểm chặn\)\)\) và/gi, "điểm chặn bắt buộc và"],
  [/\bđiểm giữ \(điểm giữ \(điểm giữ \(điểm giữ \(điểm chặn\)\)\)\)/gi, "điểm chặn bắt buộc"],
  [/\bkhông gian restriction\b/gi, "hạn chế theo không gian"],
  [/\bHồ sơ Integrity\b/g, "Tính toàn vẹn hồ sơ"],
  [/\bBẰNG CHỨNG\b/g, "BẰNG CHỨNG"],
  [/\bBoundary\b/g, "Ranh giới"],
  [/\bPolicy\b/g, "Quy định"],
  [/\bBasis\b/g, "Cơ sở"],
  [/\bLegal\b/g, "Pháp lý"],
  [/\brole\b/gi, "vai trò"],
  [/\bscenario\b/gi, "tình huống"],
  [/\bdepartment\b/gi, "phòng ban"],
  [/\bmatrix\b/gi, "ma trận"],
  [/\blist\b/gi, "danh sách"],
  [/\bflow\b/gi, "luồng"],
  [/\brelease\b/gi, "phát hành"],
  [/\bcurrent\b/gi, "hiện tại"],
  [/\bcustomer\b/gi, "khách hàng"],
  [/\bsupplier\b/gi, "nhà cung cấp"],
  [/\bquality\b/gi, "chất lượng"],
  [/\brisk\b/gi, "rủi ro"],
  [/\bmodel\b/gi, "mô hình"],
  [/\bcontrol\b/gi, "kiểm soát"],
  [/\bmachine\b/gi, "máy"],
  [/\bmaterial\b/gi, "vật liệu"],
  [/\bapproved\b/gi, "được phê duyệt"],
  [/\bprocessor\b/gi, "đơn vị xử lý"],
  [/\btrace\b/gi, "truy xuất"],
  [/\bcondition\b/gi, "trạng thái"],
  [/\bgrade\b/gi, "cấp vật liệu"],
  [/\btreatment\b/gi, "xử lý"],
  [/\bapplication\b/gi, "ứng dụng"],
  [/\bretention\b/gi, "lưu giữ"],
  [/\bdefault\b/gi, "mặc định"],
  [/\bmajor\b/gi, "chính"],
  [/\bphysical\b/gi, "vật lý"],
  [/\breference\b/gi, "tham chiếu"],
  [/\bworking\b/gi, "làm việc"],
  [/\bonline\b/gi, "trực tuyến"],
  [/\boffline\b/gi, "ngoại tuyến"],
  [/\bfallback\b/gi, "dự phòng"],
  [/\bdeployment\b/gi, "triển khai"],
  [/\brefresh\b/gi, "làm mới"],
  [/\bruntime\b/gi, "môi trường chạy"],
  [/\bsource\b/gi, "nguồn"],
  [/\bgovernance\b/gi, "quản trị"],
  [/\bcatalog\b/gi, "danh mục"],
  [/\btraining\b/gi, "đào tạo"],
  [/\bperformance\b/gi, "hiệu suất"],
  [/\boperating\b/gi, "vận hành"],
  [/\bassessment\b/gi, "đánh giá"],
  [/\bforms\b/gi, "biểu mẫu"],
  [/\bquick\b/gi, "nhanh"],
  [/\bcard\b/gi, "thẻ"],
  [/\bnote\b/gi, "ghi chú"],
  [/\bpermissions\b/gi, "phân quyền"],
  [/\bprovisioning\b/gi, "cấp phát"],
  [/\bautomation\b/gi, "tự động hóa"],
  [/\bsubstitution\b/gi, "thay thế"],
  [/\bequivalent\b/gi, "tương đương"],
  [/\bvacuum\b/gi, "chân không"],
  [/\bcleanliness\b/gi, "độ sạch"],
  [/\bbaseline\b/gi, "chuẩn nền"],
  [/\bsnapshot\b/gi, "ảnh chụp trạng thái"],
  [/\broute\b/gi, "tuyến công nghệ"],
  [/\bdispatch\b/gi, "điều độ"],
  [/\bcapacity\b/gi, "năng lực"],
  [/\bdecision\b/gi, "quyết định"],
  [/\bdocument\b/gi, "tài liệu"],
  [/\bdocuments\b/gi, "tài liệu"],
  [/\bregister\b/gi, "sổ đăng ký"],
  [/\btier\b/gi, "tầng"],
  [/\bprocess\b/gi, "quy trình"],
  [/\bspecial\b/gi, "đặc biệt"],
  [/\bcompetence\b/gi, "năng lực"],
  [/\badoption\b/gi, "mức độ áp dụng"],
];

const FILE_SPECIFIC = {
  "mom/docs/operations/work-instructions/05-WI-500/wi-501-dispatch-capacity-and-wip-control.html": [
    ["Job/Rev/Op đúng SoR", "Mã lệnh / phiên bản / công đoạn đúng với nguồn ghi nhận gốc"],
    ["Không có mismatch giữa phiếu công nghệ, dispatch, snapshot và phát hành kỹ thuật", "Không có sai lệch giữa phiếu công nghệ, bảng điều phối, ảnh chụp trạng thái và phát hành kỹ thuật"],
    ["HOLD job; trả về", "TẠM GIỮ lệnh; trả về"],
    ["để sửa packet", "để sửa bộ hồ sơ"],
    ["Đủ qty, đúng lot/heat/condition, reservation hoặc staging đã xác nhận", "Đủ số lượng, đúng lô / mẻ / tình trạng, và phần giữ chỗ hoặc khu chuẩn bị đã được xác nhận"],
    ["Có phiếu setup, danh mục dao cụ, chạy kiểm chứng plan, fixture/jaw đúng", "Có phiếu setup, danh mục dao cụ, chạy kiểm chứng kế hoạch, và đồ gá / chấu kẹp đúng"],
    ["Machine không down/hard hold; queued hours sau khi thêm job vẫn trong cap", "Máy không dừng, không bị tạm giữ cứng; số giờ hàng chờ sau khi thêm lệnh vẫn trong ngưỡng năng lực"],
    ["Dừng phát hành thêm; review resequence hoặc rebalance", "Dừng phát hành thêm; rà soát sắp xếp lại thứ tự hoặc cân bằng lại tải"],
    ["Job không đẩy nghẽn sang công đoạn sau hoặc outsource chưa có slot", "Lệnh không làm nghẽn công đoạn sau và công đoạn thuê ngoài đã có chỗ nhận việc"],
    ["Giữ lại hoặc phát hành có điều kiện kèm quyết định rõ", "Giữ lại hoặc phát hành có điều kiện kèm quyết định rõ ràng"],
    ["Current", "hiện tại"],
    ["Released", "đã phát hành"],
    ["next hành động", "hành động kế tiếp"],
    ["machine down", "máy dừng"],
    ["Decision note", "Ghi chú quyết định"],
    ["rule chen ngang", "quy tắc chen ngang"],
    ["Reference:", "Tham chiếu:"],
  ],
  "mom/docs/operations/references/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-143-department-role-scenario-file-master-matrix.html": [
    ["HESEM là consumer portal của khách", "HESEM là cổng tiếp nhận làm việc với portal của khách"],
    ["KHÔNG host portal", "KHÔNG tự vận hành portal cho khách"],
    ["Evidence pull/push", "Luồng kéo/đẩy bằng chứng"],
    ["Mỗi dept Operations đào sâu", "Mỗi phòng ban vận hành được đào sâu"],
    ["scenario thực chiến", "tình huống thực tế"],
    ["Tổng directory blueprint", "Tổng bản thiết kế thư mục"],
    ["Tại sao folder", "Tại sao thư mục"],
    ["tiêu chuẩn không tạo file", "tiêu chuẩn không tạo tệp"],
  ],
  "mom/docs/operations/references/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-130-m365-eqms-ssot-boundary-and-cross-reference-policy.html": [
    ["cross-reference register", "sổ đăng ký tham chiếu chéo"],
    ["version drift", "trôi phiên bản"],
    ["cross-site mismatch", "sai lệch liên site"],
    ["working evidence thô", "bằng chứng làm việc thô"],
    ["Power Automate weekly job", "tác vụ Power Automate chạy hằng tuần"],
    ["Power Automate guard", "luật chặn Power Automate"],
    ["Schema enforcement", "cưỡng bức theo lược đồ"],
  ],
  "mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-122-kpi-cascade-dictionary.html": [
    ["Từ điển KPI cascade", "Từ điển KPI phân tầng"],
    ["định nghĩa, công thức, owner, source-of-record, freeze-date và ngưỡng escalation", "định nghĩa, công thức, chủ sở hữu, nguồn ghi nhận gốc, ngày khóa số liệu và ngưỡng chuyển cấp"],
    ["KPI nên được thiết kế theo tầng", "KPI nên được thiết kế theo từng tầng"],
    ["counter-metric", "chỉ số đối trọng"],
    ["customer profile", "hồ sơ khách hàng"],
  ],
};

function walk(dir, files) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.html$/i.test(entry.name)) files.push(full);
  }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceCaseAware(input, from, to) {
  const pattern = new RegExp(escapeRegex(from), "gi");
  return input.replace(pattern, (match) => {
    if (match.toUpperCase() === match) return to.toUpperCase();
    if (match[0] === match[0].toUpperCase()) return to[0].toUpperCase() + to.slice(1);
    return to;
  });
}

function shield(html) {
  const saved = [];
  let next = html;
  for (const pattern of EXCLUDED_BLOCK_PATTERNS) {
    next = next.replace(pattern, (m) => {
      const key = `__SHIELD_${saved.length}__`;
      saved.push(m);
      return key;
    });
  }
  return { next, saved };
}

function unshield(html, saved) {
  let next = html;
  saved.forEach((m, i) => {
    next = next.replace(`__SHIELD_${i}__`, m);
  });
  return next;
}

function transformDocument(html, rel) {
  const replacements = [...GLOBAL_REPLACEMENTS, ...(FILE_SPECIFIC[rel] || [])].sort((a, b) => b[0].length - a[0].length);
  const { next, saved } = shield(html);
  const parts = next.split(/(<[^>]+>)/g);
  const rewritten = parts.map((part) => {
    if (!part || part.startsWith("<")) return part;
    let text = part;
    for (const [from, to] of replacements) {
      text = replaceCaseAware(text, from, to);
    }
    for (const [pattern, to] of REGEX_REPLACEMENTS) {
      text = text.replace(pattern, to);
    }
    text = text
      .replace(/\b and \b/gi, " và ")
      .replace(/\b or \b/gi, " hoặc ")
      .replace(/\b vs \b/gi, " so với ")
      .replace(/\s{2,}/g, " ");
    return text;
  }).join("");
  return unshield(rewritten, saved);
}

const files = [];
for (const root of DOC_ROOTS) walk(path.join(ROOT, root), files);

let changed = 0;
for (const file of files) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  const before = fs.readFileSync(file, "utf8");
  const after = transformDocument(before, rel);
  if (after !== before) {
    fs.writeFileSync(file, after, "utf8");
    changed += 1;
    console.log(`updated\t${rel}`);
  }
}

console.log(`files_changed\t${changed}`);
