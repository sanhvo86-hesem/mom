#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("C:/Users/TEST4/qms.hesem.com.vn");

function applyLiteral(html, from, to) {
  return html.includes(from) ? html.split(from).join(to) : html;
}

const targets = [
  {
    rel: "01-QMS-Portal/site-map.html",
    replacements: [
      ["Forms &amp; hồ sơ", "Biểu mẫu và hồ sơ"],
      ["Training Academy overview", "Tổng quan Training Academy"],
      ["Competency framework / level / matrices", "Khung năng lực / cấp độ / ma trận"],
      [
        "Điểm vào điều hướng cho hội nhập nhân sự mới, đào tạo chéo, deputy mức sẵn sàng và đào tạo phục vụ đánh giá (đánh giá training).",
        "Điểm vào điều hướng cho hội nhập nhân sự mới, đào tạo chéo, mức sẵn sàng người thay thế và đào tạo phục vụ đánh giá (đánh giá đào tạo).",
      ],
      [
        "Khóa 19 competency, 4 level, ma trận đào tạo theo phòng ban và logic chứng nhận.",
        "Khóa 19 năng lực, 4 cấp độ, ma trận đào tạo theo phòng ban và logic chứng nhận.",
      ],
      ["Certification governance", "Quản trị chứng nhận"],
      [
        "Theo dõi trạng thái Active/Hold/Withdraw, bộ bằng chứng, recertification và deputy eligibility.",
        "Theo dõi trạng thái Active/Hold/Withdraw, bộ bằng chứng, tái chứng nhận và điều kiện đủ của người thay thế.",
      ],
      [
        "Competency, modules, OJT, drills, system guides, templates",
        "Năng lực, mô-đun, OJT, diễn tập, hướng dẫn hệ thống, bộ mẫu",
      ],
    ],
  },
  {
    rel: "02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/index.html",
    replacements: [["Giao việc, phân quyền, phân ca, chỉ định deputy", "Giao việc, phân quyền, phân ca, chỉ định người thay thế"]],
  },
  {
    rel: "01-QMS-Portal/index.html",
    replacements: [["Certification register", "Certification Register"]],
  },
];

for (const target of targets) {
  const abs = path.join(ROOT, target.rel);
  let html = fs.readFileSync(abs, "utf8");
  const before = html;
  for (const [from, to] of target.replacements) {
    html = applyLiteral(html, from, to);
  }
  if (html !== before) {
    fs.writeFileSync(abs, html, "utf8");
  }
}
