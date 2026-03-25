#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("C:/Users/TEST4/qms.hesem.com.vn");

const replacements = [
  ["ANNEX-101 — Bản đồ quyền truy cập theo vai trò và hệ thống", "ANNEX-101 — Role-Based Access Map"],
  ["ANNEX-101 RBAC Map", "ANNEX-101 — Role-Based Access Map"],
  ["ANNEX-113 — Bảng điều khiển Deployment, Access, Refresh and Failure Control", "ANNEX-113 — Dashboard Deployment, Access and Refresh Control"],
  ["ANNEX-113 — Bảng điều khiển deployment, access, refresh and failure control", "ANNEX-113 — Dashboard Deployment, Access and Refresh Control"],
  ["ANNEX-115 — Bản đồ giao dịch và interface Epicor", "ANNEX-115 — Epicor Transaction and Interface Map"],
  ["ANNEX-118 — Bộ dự phòng ngoại tuyến, điều kiện continuity và trình tự nhập bù", "ANNEX-118 — Offline Fallback Kit"],
  ["ANNEX-118 Offline Kit", "ANNEX-118 — Offline Fallback Kit"],
  ["ANNEX-120 — Ma trận thẩm quyền quyết định và nhả giữ", "ANNEX-120 — Authority Matrix"],
  ["ANNEX-121 — RACI master ở mức hoạt động và tài liệu", "ANNEX-121 — RACI Master Matrix"],
  ["ANNEX-122 — Từ điển KPI cascade", "ANNEX-122 — KPI Cascade Dictionary"],
  ["ANNEX-122 KPI Cascade", "ANNEX-122 KPI Cascade Dictionary"],
  ["ANNEX-123 — Ma trận deputy / backup", "ANNEX-123 — Deputy Backup Matrix"],
  ["Deputy / Backup Matrix", "Deputy Backup Matrix"],
  ["ANNEX-503 — CNC Operating Model and Vai trò Boundary", "ANNEX-503 — CNC Operating Model and Role Boundary"],
  ["SOP-902 — Xem xét của lãnh đạo và cơ chế chốt quyết định hệ thống", "SOP-902 — Management Review"],
  ["WI-901 — Chuẩn bị bảng điều khiển hiệu suất, freeze-date và pack dữ liệu quản trị", "WI-901 — Performance Dashboard"],
  ["WI-901 — Chuẩn bị bảng điều khiển hiệu suất, ngày khóa số liệu và bộ dữ liệu quản trị", "WI-901 — Performance Dashboard"],
  ["wi-901-performance — WI-901 — Chuẩn bị bảng điều khiển hiệu suất, freeze-date và pack dữ liệu quản trị", "WI-901 — Performance Dashboard"],
  ["wi-901-performance — WI-901 — Chuẩn bị bảng điều khiển hiệu suất, ngày khóa số liệu và bộ dữ liệu quản trị", "WI-901 — Performance Dashboard"],
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === ".git" || entry.name === "node_modules") {
        continue;
      }
      walk(abs, files);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(abs);
    }
  }
  return files;
}

let changedFiles = 0;
let totalReplacements = 0;

for (const file of walk(ROOT)) {
  let html = fs.readFileSync(file, "utf8");
  const before = html;

  for (const [from, to] of replacements) {
    if (!html.includes(from)) {
      continue;
    }
    const count = html.split(from).length - 1;
    totalReplacements += count;
    html = html.split(from).join(to);
  }

  if (html !== before) {
    fs.writeFileSync(file, html, "utf8");
    changedFiles += 1;
  }
}

console.log(`files changed: ${changedFiles}`);
console.log(`total replacements: ${totalReplacements}`);
