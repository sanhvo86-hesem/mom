#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(".");
const TARGET_DIRS = [
  "mom/docs/operations/sops",
  "mom/docs/operations/work-instructions",
  "mom/docs/operations/references",
];

const TEXT_REPLACEMENTS = [
  [/đóng băng cửa sổ \/ khung thời gian \/ cửa sổ khóa kế hoạch/gi, "cửa sổ khóa kế hoạch"],
  [/mẫu đầu\s*\(tiên chi tiết \/ sản phẩm\)/gi, "mẫu đầu"],
  [/machine xuống \/ Từng/gi, "máy dừng / ngừng bất thường"],
  [/Photos trạng thái/gi, "ảnh chụp trạng thái"],
  [/\bSupplier Hành động khắc phục Request - SCAR\b/g, "Yêu cầu hành động khắc phục nhà cung cấp (SCAR)"],
  [/\bSupplier Corrective Action Request\b/g, "Yêu cầu hành động khắc phục nhà cung cấp"],
  [/\bevidence-pack\b/gi, "bộ bằng chứng"],
  [/\bevidence pack\b/gi, "bộ bằng chứng"],
  [/\bworkflow\b/gi, "luồng công việc"],
  [/\bdashboard\b/gi, "bảng điều khiển"],
  [/\bpolicy\b/gi, "chính sách"],
  [/\bcontrol tower\b/gi, "trung tâm điều hành"],
  [/\bhot-job\b/gi, "lệnh gấp"],
  [/\bhot job\b/gi, "lệnh gấp"],
  [/\bship-ready queue\b/gi, "hàng chờ giao"],
  [/tier cuộc họp/gi, "cuộc họp theo tầng"],
  [/escalation log/gi, "nhật ký chuyển cấp"],
  [/customer escalation/gi, "chuyển cấp từ khách hàng"],
  [/outsource trả lại/gi, "hàng gia công ngoài trả về"],
  [/hold measurement\/release/gi, "tạm giữ kết quả đo\/không cho phát hành"],
  [/silent default/gi, "mặc định ngầm"],
  [/actor\/time\/evidence/gi, "người thực hiện\/thời điểm\/bằng chứng"],
];

const FILE_SPECIFIC_REPLACEMENTS = new Map([
  [
    "mom/docs/operations/work-instructions/05-WI-500/wi-501-dispatch-capacity-and-wip-control.html",
    [
      [/job mở\/Released\/WIP/gi, "lệnh sản xuất đang mở\/đã phát hành\/đang dở dang"],
      [/job cần chạy/gi, "lệnh sản xuất cần chạy"],
      [/Mọi thay đổi thứ tự phải có lý do, Người quyết định và job bị ảnh hưởng\./g, "Mọi thay đổi thứ tự phải ghi rõ lý do, người quyết định và lệnh sản xuất bị ảnh hưởng."],
      [/Lấy Job\/Op mở, Ngày đến hạn, hàng đợi, hold trạng thái, machine trạng thái, nguyên vật liệu mức sẵn sàng, hàng gia công ngoài trả về và lô giao ưu tiên từ SoR tại thời điểm cut-off của ca\./g, "Lấy danh sách lệnh sản xuất\/công đoạn đang mở, ngày đến hạn, hàng chờ, trạng thái tạm giữ, trạng thái máy, mức sẵn sàng vật tư, hàng gia công ngoài trả về và lô giao ưu tiên từ SoR tại thời điểm chốt ca."],
      [/Top list/gi, "danh sách ưu tiên"],
      [/Không dùng lệnh gấp để che lập kế hoạch yếu/gi, "Không dùng lệnh gấp để che giấu năng lực lập kế hoạch yếu"],
      [/Một job chỉ được Mọi là hot khi có kích hoạt thực sự\./g, "Một lệnh sản xuất chỉ được xem là lệnh gấp khi có kích hoạt thực sự."],
      [/trong hàng đợi giờ vượt cap/gi, "số giờ hàng chờ vượt ngưỡng năng lực"],
      [/part-range\/qty\/document pack\/label logic/gi, "dải mã chi tiết\/số lượng\/bộ hồ sơ\/quy tắc nhãn"],
      [/job nào chạy trước, job nào chờ, job nào cần setup song song/gi, "lệnh sản xuất nào chạy trước, lệnh sản xuất nào chờ, lệnh sản xuất nào cần setup song song"],
      [/Tên job bị lùi/gi, "Tên lệnh sản xuất bị lùi"],
      [/một job còn thiếu/gi, "một lệnh sản xuất còn thiếu"],
      [/Nếu job chen ngang/gi, "Nếu lệnh sản xuất chen ngang"],
      [/job đang chạy, job đang chờ/gi, "lệnh sản xuất đang chạy, lệnh sản xuất đang chờ"],
    ],
  ],
  [
    "mom/docs/operations/sops/04-SOP-400/sop-401-supplier-control-and-special-process.html",
    [
      [/Liên kết nhà cung cấp hiệu suất với SCAR, phê duyệt lại, ngăn chặn và lựa chọn nguồn thay thế\./g, "Liên kết hiệu suất nhà cung cấp với SCAR, quyết định phê duyệt lại, biện pháp ngăn chặn và lựa chọn nguồn thay thế."],
      [/nhà cung cấp đánh giá, đánh giá, PO rà soát, triển khai xuống dưới, gia công ngoài điều phối lệnh, đầu vào xác minh và hiệu suất rà soát\./gi, "Đánh giá nhà cung cấp, rà soát PO, triển khai yêu cầu xuống dưới, điều độ gia công ngoài, xác minh đầu vào và theo dõi hiệu suất."],
      [/Supplier Hành động khắc phục Request - SCAR \(yêu cầu hành động khắc phục nhà cung cấp\)/g, "Yêu cầu hành động khắc phục nhà cung cấp (SCAR)"],
      [/Approved Supplier \(nhà cung cấp đã phê duyệt\)/g, "Nhà cung cấp đã phê duyệt"],
      [/công đoạn đặc biệt bộ hồ sơ/gi, "bộ hồ sơ công đoạn đặc biệt"],
      [/nguồn quyết định rõ trạng thái/gi, "Quyết định nguồn phải nêu rõ trạng thái"],
      [/đầu vào xác minh kế hoạch/gi, "kế hoạch xác minh đầu vào"],
      [/bảng điểm, SCAR hoặc phê duyệt lại hành động/gi, "thẻ điểm, SCAR hoặc hành động phê duyệt lại"],
      [/sự kiện kích hoạt/gi, "Sự kiện kích hoạt"],
      [/PO phiên bản nhật ký/gi, "nhật ký phiên bản PO"],
      [/Naming quy tắc/gi, "Quy tắc đặt tên"],
      [/FRM-402 nhà cung cấp Biểu mẫu đánh giá/gi, "FRM-402 Biểu mẫu đánh giá nhà cung cấp"],
      [/FRM-403 gia công ngoài quy trình yêu cầu/gi, "FRM-403 Phiếu yêu cầu gia công ngoài"],
      [/FRM-404 gia công ngoài điều phối lệnh bảng kiểm/gi, "FRM-404 Bảng kiểm điều độ gia công ngoài"],
      [/FRM-405 nhà cung cấp bảng điểm/gi, "FRM-405 Thẻ điểm nhà cung cấp"],
    ],
  ],
  [
    "mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-122-kpi-cascade-dictionary.html",
    [
      [/value-luồng/gi, "luồng giá trị"],
      [/RACI-MASTER-MATRIX/g, "RACI Master Matrix"],
      [/Target \/ ngưỡng/gi, "Mục tiêu / ngưỡng"],
      [/ad hoc/gi, "tạm thời ngoài chuẩn"],
      [/Admin Console KPI Registry/gi, "KPI Registry trên Admin Console"],
      [/Gate metric/gi, "chỉ số theo cổng"],
      [/map registry/gi, "liên kết vào registry"],
      [/runtime\/gate/gi, "runtime\/cổng"],
      [/không làm tăng số đếm runtime\/cổng/gi, "không làm tăng số đếm ở runtime\/cổng"],
      [/binary, blocker_only/gi, "nhị phân, chỉ có tác dụng chặn"],
      [/counter:/gi, "bộ đếm:"],
      [/blocking/gi, "có tác dụng chặn"],
      [/special release/gi, "phát hành đặc biệt"],
      [/timing\/protection/gi, "thời gian\/bảo vệ"],
      [/complaint/gi, "khiếu nại"],
      [/pack dữ liệu/gi, "bộ dữ liệu"],
      [/evidence/gi, "bằng chứng"],
      [/protection of customer-supplied tools/gi, "bảo vệ dụng cụ do khách hàng cấp"],
    ],
  ],
]);

function walk(dir, files) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".DS_Store") continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
      continue;
    }
    if (entry.isFile() && fullPath.endsWith(".html")) files.push(fullPath);
  }
}

function applyReplacements(text, replacements) {
  let next = text;
  for (const [pattern, replacement] of replacements) {
    next = next.replace(pattern, replacement);
  }
  return next;
}

function rewriteVisibleText(html, replacements) {
  const bodyStart = html.search(/<body\b/i);
  if (bodyStart === -1) return html;

  const prefix = html.slice(0, bodyStart);
  const body = html.slice(bodyStart);
  const parts = body.split(/(<[^>]+>)/g);

  let skipDepth = 0;

  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    if (!part) continue;

    if (part.startsWith("<")) {
      const closeMatch = part.match(/^<\s*\/\s*([a-z0-9:-]+)/i);
      if (closeMatch) {
        const tag = closeMatch[1].toLowerCase();
        if (["script", "style", "title", "a", "code"].includes(tag) && skipDepth > 0) {
          skipDepth -= 1;
        }
        continue;
      }

      const openMatch = part.match(/^<\s*([a-z0-9:-]+)/i);
      if (openMatch) {
        const tag = openMatch[1].toLowerCase();
        const selfClosing = /\/\s*>$/.test(part);
        if (["script", "style", "title", "a", "code"].includes(tag) && !selfClosing) {
          skipDepth += 1;
        }
      }
      continue;
    }

    if (skipDepth > 0) continue;
    parts[i] = applyReplacements(part, replacements);
  }

  return prefix + parts.join("");
}

const files = [];
for (const dir of TARGET_DIRS) walk(path.join(ROOT, dir), files);

const changedFiles = [];

for (const filePath of files) {
  const relativePath = path.relative(ROOT, filePath).replaceAll(path.sep, "/");
  const original = fs.readFileSync(filePath, "utf8");
  const replacements = [
    ...TEXT_REPLACEMENTS,
    ...(FILE_SPECIFIC_REPLACEMENTS.get(relativePath) || []),
  ];
  const next = rewriteVisibleText(original, replacements);
  if (next !== original) {
    fs.writeFileSync(filePath, next, "utf8");
    changedFiles.push(relativePath);
  }
}

console.log(`Updated ${changedFiles.length} files`);
for (const file of changedFiles.sort()) console.log(file);
