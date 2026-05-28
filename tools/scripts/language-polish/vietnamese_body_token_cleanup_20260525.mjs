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
  /<div\b[^>]*class="dcc-header"[\s\S]*?<\/div>/gi,
  /<div\b[^>]*class='dcc-header'[\s\S]*?<\/div>/gi,
];

const GLOBAL_REPLACEMENTS = [
  ["Department × Role × Scenario × File Master Matrix", "Ma trận tổng thể phòng ban × vai trò × tình huống × nhóm tệp"],
  ["KPI Cascade Dictionary", "Từ điển phân tầng KPI"],
  ["Dispatch Capacity and WIP Control", "Kiểm soát điều độ, năng lực và WIP"],
  ["Supplier Control and Quy trình đặc biệt", "Kiểm soát nhà cung cấp và công đoạn đặc biệt"],
  ["EQMS-M365 Three-Tier SSOT Boundary, Cross-Reference Policy and Legal Basis", "Ranh giới SSOT ba tầng EQMS-M365, chính sách tham chiếu chéo và cơ sở pháp lý"],
  ["Three-Tier", "ba tầng"],
  ["Cross-Reference", "tham chiếu chéo"],
  ["Legal Basis", "cơ sở pháp lý"],
  ["File Master Matrix", "ma trận tổng thể nhóm tệp"],
  ["Stress Test", "kiểm thử sức chịu tải"],
  ["Workflow-Lists", "danh sách luồng công việc"],
  ["Site Topology Library and Folder Blueprint", "bản thiết kế site, thư viện và cấu trúc thư mục"],
  ["Metadata List Schema and Register Catalog", "lược đồ danh sách siêu dữ liệu và danh mục sổ đăng ký"],
  ["Provisioning Permissions and Automation Architecture", "kiến trúc cấp phát, phân quyền và tự động hóa"],
  ["Operational Records File Plan by Department Role and Job", "kế hoạch hồ sơ vận hành theo phòng ban, vai trò và công việc"],
  ["SharePoint Git Server Source Sync Promotion and Runtime Boundary", "ranh giới đồng bộ nguồn SharePoint, Git, máy chủ và môi trường chạy"],
  ["Evidence and Records Naming Convention", "quy ước đặt tên bằng chứng và hồ sơ"],
  ["Permission Model for Semi Supplier Audit", "mô hình phân quyền cho đánh giá nhà cung cấp bán dẫn"],
  ["SSOT 3 Axis Job Part Asset Architecture", "kiến trúc SSOT ba trục: lệnh việc, chi tiết và tài sản"],
  ["Customer IP Segregated", "tách biệt sở hữu trí tuệ khách hàng"],
  ["Unified Workspace", "không gian làm việc thống nhất"],
  ["Lifecycle Architecture", "kiến trúc vòng đời"],
  ["Semi-Equipment CNC Hub-Spoke Architecture", "kiến trúc trung tâm-vệ tinh cho CNC linh kiện bán dẫn"],
  ["Approved Materials List", "danh mục vật liệu được phê duyệt"],
  ["Approved Processor List", "danh mục nhà xử lý được phê duyệt"],
  ["Performance Dashboard", "bảng điều khiển hiệu suất"],
  ["Operating Mechanism Assessment", "đánh giá cơ chế vận hành"],
  ["Performance Operating System", "hệ điều hành hiệu suất"],
  ["System Matrix and Document Usage", "ma trận hệ thống và cách dùng tài liệu"],
  ["Authority Registry and Operational Metrics", "sổ đăng ký thẩm quyền và chỉ số vận hành"],
  ["Change Roadmap and Priority Register", "lộ trình thay đổi và sổ đăng ký ưu tiên"],
  ["Dashboard KPI Dictionary and Data Model", "từ điển KPI bảng điều khiển và mô hình dữ liệu"],
  ["Deployment Access and Refresh Control", "kiểm soát triển khai, truy cập và làm mới"],
  ["Epicor Transaction and Interface Map", "bản đồ giao dịch và giao diện Epicor"],
  ["Offline Fallback Kit", "bộ dự phòng ngoại tuyến"],
  ["Role-Based Access Map", "bản đồ truy cập theo vai trò"],
  ["Source of record", "nguồn ghi nhận gốc"],
  ["source of record", "nguồn ghi nhận gốc"],
  ["source-of-record", "nguồn ghi nhận gốc"],
  ["freeze-date", "ngày khóa số liệu"],
  ["Manual-governed", "được kiểm soát thủ công"],
  ["manual-governed", "được kiểm soát thủ công"],
  ["Decision note", "ghi chú quyết định"],
  ["decision note", "ghi chú quyết định"],
  ["Hold code", "mã tạm giữ"],
  ["Material ready", "vật tư sẵn sàng"],
  ["Setup / tool / fixture ready", "setup / dao cụ / đồ gá đã sẵn sàng"],
  ["Machine / capacity ready", "máy / năng lực đã sẵn sàng"],
  ["Outsource / downstream coupling ready", "khớp nối outsource / công đoạn sau đã sẵn sàng"],
  ["Current", "hiện tại"],
  ["Released", "đã phát hành"],
  ["machine family", "nhóm máy"],
  ["freeze window", "cửa sổ khóa kế hoạch"],
  ["split lot", "tách lô"],
  ["working day", "ngày làm việc"],
  ["special release", "phát hành đặc biệt"],
  ["customer keyed", "gắn theo khách hàng"],
  ["hub spoke", "trung tâm-vệ tinh"],
  ["part-centric", "xoay quanh mã chi tiết"],
  ["HR-centric", "xoay quanh nhân sự"],
  ["too generic", "quá chung chung"],
  ["generic", "chung chung"],
  ["navigation aid", "công cụ điều hướng"],
  ["physical file", "tệp vật lý"],
  ["working evidence", "bằng chứng làm việc"],
  ["working pack", "bộ hồ sơ làm việc"],
  ["content type", "loại nội dung"],
  ["daily tier", "họp tầng hằng ngày"],
  ["line", "chuyền"],
  ["part", "chi tiết"],
  ["file class", "nhóm tệp"],
  ["scenario folder", "thư mục tình huống"],
  ["sensitivity label", "nhãn độ nhạy"],
  ["Sensitivity", "Mức nhạy cảm"],
  ["Scenario folder", "Thư mục tình huống"],
  ["File class", "Nhóm tệp"],
  ["Notes", "Ghi chú"],
  ["Note", "Ghi chú"],
  ["Workflow", "Luồng công việc"],
  ["Blueprint", "Bản thiết kế"],
  ["Architecture", "Kiến trúc"],
  ["Policy", "Chính sách"],
  ["Register", "Sổ đăng ký"],
  ["Catalog", "Danh mục"],
  ["Dictionary", "Từ điển"],
  ["Matrix", "Ma trận"],
  ["Dashboard", "Bảng điều khiển"],
  ["Operating", "Vận hành"],
  ["Architecture", "Kiến trúc"],
  ["Role", "Vai trò"],
  ["Scenario", "Tình huống"],
  ["Department", "Phòng ban"],
  ["File", "Tệp"],
  ["Review", "Rà soát"],
  ["review", "rà soát"],
  ["ship", "giao hàng"],
  ["Ship", "Giao hàng"],
  ["owner", "chủ sở hữu"],
  ["Owner", "Chủ sở hữu"],
  ["evidence", "bằng chứng"],
  ["Evidence", "Bằng chứng"],
  ["rule", "quy tắc"],
  ["Rule", "Quy tắc"],
  ["gate", "cổng"],
  ["Gate", "Cổng"],
  ["control", "kiểm soát"],
  ["Control", "Kiểm soát"],
  ["record", "hồ sơ"],
  ["Record", "Hồ sơ"],
  ["records", "hồ sơ"],
  ["Records", "Hồ sơ"],
  ["register", "sổ đăng ký"],
  ["metric", "chỉ số"],
  ["Metric", "Chỉ số"],
  ["metrics", "chỉ số"],
  ["Metrics", "Chỉ số"],
  ["runtime", "môi trường chạy"],
  ["Runtime", "Môi trường chạy"],
  ["sync", "đồng bộ"],
  ["Sync", "Đồng bộ"],
  ["server", "máy chủ"],
  ["Server", "Máy chủ"],
  ["path", "đường dẫn"],
  ["Path", "Đường dẫn"],
  ["link", "liên kết"],
  ["Link", "Liên kết"],
  ["state", "trạng thái"],
  ["State", "Trạng thái"],
  ["status", "trạng thái"],
  ["Status", "Trạng thái"],
  ["snapshot", "ảnh chụp trạng thái"],
  ["Snapshot", "Ảnh chụp trạng thái"],
  ["plan", "kế hoạch"],
  ["Plan", "Kế hoạch"],
  ["release", "phát hành"],
  ["Release", "Phát hành"],
  ["hold", "tạm giữ"],
  ["Hold", "Tạm giữ"],
  ["folder", "thư mục"],
  ["Folder", "Thư mục"],
  ["site", "không gian"],
  ["Site", "Không gian"],
  ["library", "thư viện"],
  ["Library", "Thư viện"],
  ["metadata", "siêu dữ liệu"],
  ["Metadata", "Siêu dữ liệu"],
  ["approval", "phê duyệt"],
  ["Approval", "Phê duyệt"],
  ["audit", "đánh giá"],
  ["Audit", "Đánh giá"],
  ["manager", "quản lý"],
  ["Manager", "Quản lý"],
  ["operator", "người vận hành"],
  ["Operator", "Người vận hành"],
  ["customer", "khách hàng"],
  ["Customer", "Khách hàng"],
  ["supplier", "nhà cung cấp"],
  ["Supplier", "Nhà cung cấp"],
  ["processor", "nhà xử lý"],
  ["Processor", "Nhà xử lý"],
  ["special process", "công đoạn đặc biệt"],
  ["Special Process", "Công đoạn đặc biệt"],
  ["cleanroom", "phòng sạch"],
  ["gowning", "mặc đồ phòng sạch"],
  ["material", "vật liệu"],
  ["Material", "Vật liệu"],
  ["setup", "chuẩn bị máy"],
  ["Setup", "Chuẩn bị máy"],
  ["tool", "dao cụ"],
  ["Tool", "Dao cụ"],
  ["fixture", "đồ gá"],
  ["Fixture", "Đồ gá"],
  ["gage", "thiết bị đo"],
  ["Gage", "Thiết bị đo"],
  ["leak", "rò rỉ"],
  ["clean", "làm sạch"],
  ["baseline", "mốc chuẩn"],
  ["copy", "bản sao"],
  ["portal", "cổng"],
  ["Portal", "Cổng"],
  ["change", "thay đổi"],
  ["Change", "Thay đổi"],
  ["final", "cuối cùng"],
  ["Final", "Cuối cùng"],
  ["only", "chỉ"],
  ["access", "truy cập"],
  ["Access", "Truy cập"],
  ["process", "quá trình"],
  ["Process", "Quá trình"],
  ["form", "biểu mẫu"],
  ["Form", "Biểu mẫu"],
];

const FILE_SPECIFIC_REPLACEMENTS = {
  "mom/docs/operations/work-instructions/05-WI-500/wi-501-dispatch-capacity-and-wip-control.html": [
    ["Job/Rev/Op đúng SoR", "Mã lệnh / phiên bản / công đoạn đúng với nguồn ghi nhận gốc"],
    ["Không có mismatch giữa phiếu công nghệ, dispatch, snapshot và phát hành kỹ thuật", "Không có sai lệch giữa phiếu công nghệ, bảng điều phối, ảnh chụp trạng thái và phát hành kỹ thuật"],
    ["HOLD job; trả về", "TẠM GIỮ lệnh; trả về"],
    ["để sửa packet", "để sửa bộ hồ sơ"],
    ["Đủ qty, đúng lot/heat/condition, reservation hoặc staging đã xác nhận", "Đủ số lượng, đúng lô / mẻ / tình trạng, và phần giữ chỗ hoặc khu chuẩn bị đã được xác nhận"],
    ["Có phiếu setup, danh mục dao cụ, chạy kiểm chứng plan, fixture/jaw đúng", "Có phiếu chuẩn bị máy, danh mục dao cụ, chạy kiểm chứng kế hoạch, đồ gá / chấu kẹp đúng"],
    ["Machine không down/hard hold; queued hours sau khi thêm job vẫn trong cap", "Máy không dừng, không bị tạm giữ cứng; số giờ hàng chờ sau khi thêm lệnh vẫn trong ngưỡng năng lực"],
    ["Dừng phát hành thêm; review resequence hoặc rebalance", "Dừng phát hành thêm; rà soát sắp xếp lại thứ tự hoặc cân bằng lại tải"],
    ["Job không đẩy nghẽn sang công đoạn sau hoặc outsource chưa có slot", "Lệnh không làm nghẽn công đoạn sau và công đoạn thuê ngoài đã có chỗ nhận việc"],
    ["Giữ lại hoặc phát hành có điều kiện kèm quyết định rõ", "Giữ lại hoặc phát hành có điều kiện kèm quyết định rõ ràng"],
    ["Ưu tiên job có mức sẵn sàng đầy đủ", "Ưu tiên lệnh có mức sẵn sàng đầy đủ"],
    ["Không xếp xen job mới", "Không chèn lệnh mới"],
    ["Ưu tiên theo due + setup nhóm sản phẩm", "Ưu tiên theo hạn giao và chuẩn bị máy theo nhóm sản phẩm"],
    ["job P1 đã ready đầy đủ", "lệnh P1 đã sẵn sàng đầy đủ"],
    ["part đã Cần ship", "chi tiết đã cần giao hàng"],
    ["ship cửa sổ / khung thời gian", "cửa sổ / khung thời gian giao hàng"],
    ["P0 mới", "P0 mới phát sinh"],
    ["Dừng phát thêm job; clear job đỏ trước; nếu cần tách / chia lot / sắp xếp lại phải có note", "Dừng phát thêm lệnh; xử lý hết lệnh đỏ trước; nếu cần tách lô hoặc sắp xếp lại thì phải có ghi chú"],
    ["Chỉ giữ lượng đã sắp xếp cần cho ca Current", "Chỉ giữ lượng đã sắp xếp cần cho ca hiện tại"],
    ["next hành động", "hành động kế tiếp"],
    ["rule chen ngang", "quy tắc chen ngang"],
    ["Reference:", "Tham chiếu:"],
    ["start.", "bắt đầu chạy."],
    ["slot", "khe nhận việc"],
    ["job", "lệnh"],
    ["cell", "công đoạn / cell"],
    ["cap", "ngưỡng năng lực"],
    ["note", "ghi chú"],
    ["clear", "giải tỏa"],
    ["list", "danh sách"],
    ["abnormality", "bất thường"],
    ["shortage", "thiếu hụt"],
  ],
  "mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-122-kpi-cascade-dictionary.html": [
    ["Từ điển KPI cascade", "Từ điển KPI phân tầng"],
    ["định nghĩa, công thức, owner, source-of-record, freeze-date và ngưỡng escalation", "định nghĩa, công thức, chủ sở hữu, nguồn ghi nhận gốc, ngày khóa số liệu và ngưỡng chuyển cấp"],
    ["Mỗi KPI phải có", "Mỗi KPI phải có đủ"],
    ["role xác nhận nguồn dữ liệu", "vai trò xác nhận nguồn dữ liệu"],
    ["KPI nên được thiết kế theo tầng", "KPI nên được thiết kế theo từng tầng"],
    ["Official KPI", "KPI chính thức"],
    ["Operating metric", "chỉ số vận hành"],
    ["Gate control metric", "chỉ số kiểm soát cổng"],
    ["Role measure", "chỉ số theo vai trò"],
    ["Health metric", "chỉ số sức khỏe hệ thống"],
    ["Counter metric", "chỉ số đối trọng"],
    ["scorecard", "thẻ điểm"],
    ["reward", "thưởng"],
    ["counter-metric", "chỉ số đối trọng"],
    ["gaming", "thao túng số liệu"],
    ["Profile", "Hồ sơ"],
    ["metric liên kết", "chỉ số liên kết"],
    ["registry", "sổ đăng ký"],
    ["runtime", "môi trường chạy"],
    ["drift", "trôi chuẩn"],
    ["operating mới đi kèm profile LAM", "chỉ số vận hành mới đi kèm hồ sơ LAM"],
    ["CSR map", "bản đồ CSR"],
  ],
  "mom/docs/operations/references/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-130-m365-eqms-ssot-boundary-and-cross-reference-policy.html": [
    ["Ranh giới SSOT 3 tầng EQMS-M365", "Ranh giới SSOT ba tầng EQMS-M365"],
    ["cross-reference register", "sổ đăng ký tham chiếu chéo"],
    ["version drift", "trôi phiên bản"],
    ["cross-site mismatch", "sai lệch liên site"],
    ["working evidence thô", "bằng chứng làm việc thô"],
    ["physical file", "tệp vật lý"],
    ["Power Automate weekly job", "tác vụ Power Automate chạy hằng tuần"],
    ["Power Automate guard", "luật chặn Power Automate"],
    ["Schema enforcement", "cơ chế cưỡng bức theo lược đồ"],
    ["readonly", "chỉ đọc"],
  ],
  "mom/docs/operations/references/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-143-department-role-scenario-file-master-matrix.html": [
    ["quá generic", "quá chung chung"],
    ["người dùng tạo file xong không biết bỏ đâu", "người dùng tạo tệp xong không biết lưu vào đâu"],
    ["folder trở thành nghĩa địa", "thư mục trở thành nơi chất đống khó tra cứu"],
    ["mô phỏng đầy đủ nghiệp vụ thực chiến", "mô phỏng đầy đủ nghiệp vụ thực tế"],
    ["retention bao lâu", "thời hạn lưu giữ bao lâu"],
    ["Liệt kê mỗi file class", "Liệt kê từng nhóm tệp"],
    ["Roles:", "Vai trò:"],
    ["Scenario folder", "Thư mục tình huống"],
    ["Sensitivity", "Mức nhạy cảm"],
    ["Notes", "Ghi chú"],
  ],
};

function walk(dir, files) {
  if (!fs.existsSync(dir)) {
    return;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (/\.html$/i.test(entry.name)) {
      files.push(full);
    }
  }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function capitalizeFirst(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

function replaceCaseAware(input, from, to) {
  const pattern = new RegExp(escapeRegex(from), "gi");
  return input.replace(pattern, (match) => {
    if (match.toUpperCase() === match) {
      return to.toUpperCase();
    }
    if (match.charAt(0) === match.charAt(0).toUpperCase()) {
      return capitalizeFirst(to);
    }
    return to;
  });
}

function shieldBlocks(html) {
  const placeholders = [];
  let next = html;
  for (const pattern of EXCLUDED_BLOCK_PATTERNS) {
    next = next.replace(pattern, (match) => {
      const key = `__SHIELD_${placeholders.length}__`;
      placeholders.push(match);
      return key;
    });
  }
  return { html: next, placeholders };
}

function unshieldBlocks(html, placeholders) {
  let next = html;
  placeholders.forEach((value, index) => {
    next = next.replace(`__SHIELD_${index}__`, value);
  });
  return next;
}

function applyTextReplacements(text, replacements) {
  let next = text;
  for (const [from, to] of replacements) {
    next = replaceCaseAware(next, from, to);
  }
  return next;
}

function processHtml(html, file) {
  const scoped = FILE_SPECIFIC_REPLACEMENTS[file] || [];
  const replacements = [...GLOBAL_REPLACEMENTS, ...scoped].sort((a, b) => b[0].length - a[0].length);
  const { html: shielded, placeholders } = shieldBlocks(html);
  const parts = shielded.split(/(<[^>]+>)/g);
  const rewritten = parts
    .map((part) => {
      if (!part || part.startsWith("<")) {
        return part;
      }
      return applyTextReplacements(part, replacements);
    })
    .join("");
  return unshieldBlocks(rewritten, placeholders);
}

const files = [];
for (const root of DOC_ROOTS) {
  walk(path.join(ROOT, root), files);
}

let changed = 0;
for (const file of files) {
  const before = fs.readFileSync(file, "utf8");
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  const after = processHtml(before, rel);
  if (after !== before) {
    fs.writeFileSync(file, after, "utf8");
    changed += 1;
    console.log(`updated\t${rel}`);
  }
}

console.log(`files_changed\t${changed}`);
