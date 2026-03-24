#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("C:/Users/TEST4/qms.hesem.com.vn");
const DEFAULT_TARGETS = [
  "01-QMS-Portal",
  "02-Tai-Lieu-He-Thong",
  "03-Tai-Lieu-Van-Hanh",
  "04-Bieu-Mau",
  "10-Training-Academy",
];

const TARGET_DIRS =
  process.argv.length > 2
    ? process.argv.slice(2).map((segment) => path.resolve(ROOT, segment))
    : DEFAULT_TARGETS.map((segment) => path.resolve(ROOT, segment));

const REPORT_JSON = path.join(
  ROOT,
  "_reports",
  "polish-natural-vietnamese-20260324.json"
);
const REPORT_MD = path.join(
  ROOT,
  "_reports",
  "polish-natural-vietnamese-20260324.md"
);

const SKIP_DIRS = new Set([".git", "node_modules", "_build"]);

const MISSING_HTML_TITLES = new Map([
  ["04-Bieu-Mau/index.html", "Workbook Excel Active Form Library"],
  [
    "04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/form-release-checklist.html",
    "Form Release Checklist",
  ],
  [
    "04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/form-versioning-model.html",
    "Form Versioning Model",
  ],
  [
    "04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/server-delivery-rollout-checklist.html",
    "Server Delivery Rollout Checklist",
  ],
  [
    "04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/production-acceptance-uat-pack.html",
    "Production Acceptance UAT Pack",
  ],
  [
    "04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/desktop-excel-endpoint-baseline.html",
    "Desktop Excel Endpoint Baseline",
  ],
  [
    "04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/periodic-control-cadence.html",
    "Periodic Control Cadence",
  ],
  [
    "04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/server-stack-profile-library.html",
    "Server Stack Profile Library",
  ],
  [
    "04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/pilot-endpoint-rollout-pack.html",
    "Pilot Endpoint Rollout Pack",
  ],
  [
    "04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/editorial-consistency-audit.html",
    "Editorial Consistency Audit",
  ],
  [
    "10-Training-Academy/04-Templates-Tools/role-roadmaps.html",
    "TRN-ACA-RMAP-01 — Vai trò Lộ trình (30/60/90 ngày)",
  ],
  [
    "10-Training-Academy/02-Training-Content/02-OJT-Guides/ojt-role-index.html",
    "OJT-VAI TRÒ-INDEX — OJT 1 trang theo vai trò",
  ],
]);

const HARD_TITLE_CORRECTIONS = [
  ["Thư viện biểu mẫu workbook Excel", "Workbook Excel Active Form Library"],
  [
    "Thư viện biểu mẫu workbook Excel — danh mục hiện hành",
    "Workbook Excel Active Form Library — danh mục hiện hành",
  ],
  ["Trung tâm kiểm soát biểu mẫu", "Form Control Register"],
  ["Bảng kiểm phát hành biểu mẫu", "Form Release Checklist"],
  ["Mô hình kiểm soát phiên bản biểu mẫu", "Form Versioning Model"],
  ["Kiểm tra máy chủ", "Server Delivery Rollout Checklist"],
  ["Bảng kiểm rollout server", "Server Delivery Rollout Checklist"],
  ["Bộ xác nhận trước vận hành", "Production Acceptance UAT Pack"],
  ["Bộ xác nhận đưa vào vận hành", "Production Acceptance UAT Pack"],
  ["Chuẩn máy trạm", "Desktop Excel Endpoint Baseline"],
  ["Thư viện cấu hình máy chủ", "Server Stack Profile Library"],
  ["Bộ kiểm tra máy trạm biểu mẫu", "Pilot Endpoint Rollout Pack"],
  ["Kiểm tra đồng nhất tài liệu", "Editorial Consistency Audit"],
];

const TEXT_RULES = [
  {
    key: "cleanup_onboarding_dup",
    re: /hội nhập nhân sự mới\s*\(\s*hội nhập nhân sự mới\s*\)/gi,
    out: "hội nhập nhân sự mới",
  },
  {
    key: "cleanup_evidence_pack_dup",
    re: /bộ bằng chứng\s*\(\s*bộ bằng chứng\s*\)/gi,
    out: "bộ bằng chứng",
  },
  {
    key: "cleanup_action_log_dup",
    re: /nhật ký hành động\s*\(\s*nhật ký hành động\s*\)/gi,
    out: "nhật ký hành động",
  },
  {
    key: "cleanup_workbook_active_dup",
    re: /workbook hiện hành hiện hành/gi,
    out: "workbook hiện hành",
  },
  {
    key: "cleanup_validation_phrase",
    re: /không lỗi xác nhận/gi,
    out: "không lỗi kiểm tra hợp lệ",
  },
  {
    key: "phrase_workbook_excel_active",
    re: /\bworkbook Excel active\b/gi,
    out: "workbook Excel hiện hành",
  },
  {
    key: "phrase_workbook_active",
    re: /\bworkbook active\b/gi,
    out: "workbook hiện hành",
  },
  {
    key: "phrase_active_workflow",
    re: /\bactive luồng công việc\b/gi,
    out: "luồng công việc hiện hành",
  },
  {
    key: "phrase_active_record",
    re: /\bactive hồ sơ\b/gi,
    out: "hồ sơ hiện hành",
  },
  {
    key: "phrase_active_path",
    re: /\bactive path\b/gi,
    out: "đường dẫn hiện hành",
  },
  {
    key: "phrase_html_landing",
    re: /\bHTML landing\b/gi,
    out: "trang đích HTML",
  },
  {
    key: "phrase_controlled_package",
    re: /\bcontrolled package\b/gi,
    out: "bộ tài liệu kiểm soát",
  },
  {
    key: "phrase_boundary_coverage",
    re: /\bboundary\s*\/\s*coverage\b/gi,
    out: "ranh giới / phạm vi bao phủ",
  },
  {
    key: "phrase_workbook_boundary",
    re: /\bWorkbook boundary\b/gi,
    out: "Ranh giới áp dụng workbook",
  },
  {
    key: "phrase_rule_responsibility",
    re: /\bRule trách nhiệm\b/gi,
    out: "Quy tắc trách nhiệm",
  },
  {
    key: "phrase_rule_required",
    re: /\bRule bắt buộc\b/gi,
    out: "Quy tắc bắt buộc",
  },
  {
    key: "phrase_rule_apply",
    re: /\bRule áp dụng\b/gi,
    out: "Quy tắc áp dụng",
  },
  {
    key: "phrase_rule_handling",
    re: /\bRule xử lý\b/gi,
    out: "Quy tắc xử lý",
  },
  {
    key: "phrase_rule_decision",
    re: /\bRule ra quyết định\b/gi,
    out: "Quy tắc ra quyết định",
  },
  {
    key: "phrase_review_access",
    re: /\breview quyền\b/gi,
    out: "rà soát quyền truy cập",
  },
  {
    key: "phrase_review_findings",
    re: /\breview audit findings\b/gi,
    out: "rà soát các phát hiện đánh giá",
  },
  {
    key: "phrase_peer_review",
    re: /\bpeer review\b/gi,
    out: "rà soát đồng cấp",
  },
  {
    key: "phrase_review_pack",
    re: /\breview pack\b/gi,
    out: "bộ hồ sơ rà soát",
  },
  {
    key: "phrase_release_pack",
    re: /\brelease pack\b/gi,
    out: "gói phát hành",
  },
  {
    key: "phrase_change_request",
    re: /\bchange request\b/gi,
    out: "yêu cầu thay đổi",
  },
  {
    key: "phrase_change_log",
    re: /\bchange log\b/gi,
    out: "nhật ký thay đổi",
  },
  {
    key: "phrase_clarification_log",
    re: /\bclarification log\b/gi,
    out: "nhật ký làm rõ",
  },
  {
    key: "phrase_toolpath",
    re: /\btoolpath\b/gi,
    out: "đường chạy dao",
  },
  {
    key: "phrase_release_path",
    re: /\brelease path\b/gi,
    out: "đường dẫn phát hành",
  },
  {
    key: "phrase_series_folder",
    re: /\bseries folder\b/gi,
    out: "thư mục series",
  },
  {
    key: "phrase_master_file",
    re: /\bMaster file\b/gi,
    out: "tệp gốc",
  },
  {
    key: "phrase_copy_local",
    re: /\bcopy local\b/gi,
    out: "sao chép về máy cục bộ",
  },
  {
    key: "phrase_hidden_sheet",
    re: /\bhidden sheet\b/gi,
    out: "trang tính ẩn",
  },
  {
    key: "phrase_data_validation",
    re: /\bdata validation\b/gi,
    out: "kiểm tra hợp lệ dữ liệu",
  },
  {
    key: "phrase_approval_lane",
    re: /\bapproval lane\b/gi,
    out: "luồng phê duyệt",
  },
  {
    key: "phrase_evidence_folder",
    re: /\bevidence folder\b/gi,
    out: "thư mục bằng chứng",
  },
  {
    key: "phrase_packet_folder",
    re: /\bpacket folder\b/gi,
    out: "thư mục bộ hồ sơ",
  },
  {
    key: "phrase_response_time",
    re: /\bresponse time\b/gi,
    out: "thời gian phản hồi",
  },
  {
    key: "phrase_workflow",
    re: /\bworkflow\b/gi,
    out: "luồng công việc",
  },
  {
    key: "phrase_runtime",
    re: /\bruntime\b/gi,
    out: "môi trường chạy",
  },
  {
    key: "word_evidence_pack",
    re: /\bevidence pack\b/gi,
    out: "bộ bằng chứng",
  },
  {
    key: "word_evidence",
    re: /\bevidence\b/gi,
    out: "bằng chứng",
  },
  {
    key: "word_checklist",
    re: /\bchecklists\b/gi,
    out: "các bảng kiểm",
  },
  {
    key: "word_checklist_singular",
    re: /\bchecklist\b/gi,
    out: "bảng kiểm",
  },
  {
    key: "word_log_plural",
    re: /\blogs\b/gi,
    out: "các nhật ký",
  },
  {
    key: "word_log",
    re: /\blog\b/gi,
    out: "nhật ký",
  },
  {
    key: "word_module",
    re: /\bmodule\b/gi,
    out: "mô-đun",
  },
  {
    key: "word_quiz",
    re: /\bquiz\b/gi,
    out: "bài kiểm tra nhanh",
  },
  {
    key: "word_drill",
    re: /\bdrill\b/gi,
    out: "diễn tập",
  },
  {
    key: "word_feedback",
    re: /\bfeedback\b/gi,
    out: "phản hồi",
  },
  {
    key: "word_dashboard",
    re: /\bdashboard\b/gi,
    out: "bảng điều khiển",
  },
  {
    key: "word_metric_plural",
    re: /\bmetrics\b/gi,
    out: "các chỉ số",
  },
  {
    key: "word_metric",
    re: /\bmetric\b/gi,
    out: "chỉ số",
  },
  {
    key: "word_inspection",
    re: /\binspection\b/gi,
    out: "kiểm tra",
  },
  {
    key: "word_verification",
    re: /\bverification\b/gi,
    out: "xác minh",
  },
  {
    key: "word_status",
    re: /\bstatus\b/gi,
    out: "trạng thái",
  },
  {
    key: "word_record_plural",
    re: /\brecords\b/gi,
    out: "các bản ghi",
  },
  {
    key: "word_record",
    re: /\brecord\b/gi,
    out: "bản ghi",
  },
  {
    key: "word_handoff",
    re: /\bhandoff\b/gi,
    out: "bàn giao",
  },
  {
    key: "word_manifest",
    re: /\bmanifest\b/gi,
    out: "bảng kê",
  },
  {
    key: "word_reviewer",
    re: /\breviewer\b/gi,
    out: "người rà soát",
  },
  {
    key: "word_approver",
    re: /\bapprover\b/gi,
    out: "người phê duyệt",
  },
  {
    key: "word_onboarding",
    re: /\bonboarding\b/gi,
    out: "hội nhập nhân sự mới",
  },
  {
    key: "word_cross_training",
    re: /\bcross-training\b/gi,
    out: "đào tạo chéo",
  },
];

function normalizeRel(targetPath) {
  return path.relative(ROOT, targetPath).replace(/\\/g, "/");
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) {
        continue;
      }
      walk(path.join(dir, entry.name), files);
      continue;
    }
    if (/\.html?$/i.test(entry.name)) {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
}

function walkWorkbookFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || entry.name === ".backups") {
        continue;
      }
      walkWorkbookFiles(path.join(dir, entry.name), files);
      continue;
    }
    if (/\.xlsx$/i.test(entry.name) && !/\.bak$/i.test(entry.name)) {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
}

function escapeRe(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function decodeEntities(text) {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripTags(text) {
  return decodeEntities(text.replace(/<[^>]+>/g, " "));
}

function normalizeText(text) {
  return text.replace(/\s+/g, " ").trim();
}

function containsVietnamese(text) {
  return /[À-Ỵà-ỵĂăÂâĐđÊêÔôƠơƯư]/.test(text);
}

function looksLikeCodeOnly(text) {
  return /^(?:[A-Z]{2,}(?:-[A-Z0-9]+)+|FRM-\d{3}|SOP-\d{3}|WI-\d{3}|ANNEX-\d{3}|C\d{2}|SYS-OPS-\d+|TRN-OPS-\d+|QMS-MAN-\d+|[0-9]{2}-[A-Z0-9-]+)$/i.test(
    text
  );
}

function applyCase(source, target) {
  const letters = source.replace(/[^A-Za-zÀ-Ỵà-ỵĂăÂâĐđÊêÔôƠơƯư]/g, "");
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

function protectBlocks(html) {
  const blocks = [];
  const protectedHtml = html.replace(
    /<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>|<!--[\s\S]*?-->/gi,
    (match) => {
      const token = `__PROTECTED_BLOCK_${blocks.length}__`;
      blocks.push(match);
      return token;
    }
  );

  return {
    html: protectedHtml,
    restore(value) {
      return value.replace(
        /__PROTECTED_BLOCK_(\d+)__/g,
        (_, index) => blocks[Number(index)]
      );
    },
  };
}

function deriveWorkbookTitle(filePath) {
  return path
    .basename(filePath, path.extname(filePath))
    .replace(/^FRM-[A-Z0-9-]+_/, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getHtmlTitle(filePath) {
  const html = fs.readFileSync(filePath, "utf8");
  const titleMatch = html.match(
    /<title>\s*([^<]+?)(?:\s*\|\s*HESEM QMS)?\s*<\/title>/i
  );
  if (titleMatch) {
    return normalizeText(titleMatch[1]);
  }
  const strongMatch = html.match(
    /<div class="title">\s*<strong>([\s\S]*?)<\/strong>/i
  );
  if (strongMatch) {
    return normalizeText(stripTags(strongMatch[1]));
  }
  return "";
}

function buildWorkbookTitleMap() {
  const workbookMap = new Map();
  const workbookFiles = walkWorkbookFiles(path.join(ROOT, "04-Bieu-Mau"));
  for (const filePath of workbookFiles) {
    workbookMap.set(normalizeRel(filePath), deriveWorkbookTitle(filePath));
  }
  return workbookMap;
}

function buildHtmlTitleMap(htmlFiles) {
  const htmlMap = new Map();
  for (const filePath of htmlFiles) {
    const rel = normalizeRel(filePath);
    const title = MISSING_HTML_TITLES.get(rel) || getHtmlTitle(filePath);
    if (title) {
      htmlMap.set(rel, title);
    }
  }
  for (const [rel, title] of MISSING_HTML_TITLES.entries()) {
    htmlMap.set(rel, title);
  }
  return htmlMap;
}

function buildRegisterCorrections(workbookTitleMap) {
  const corrections = new Map();
  const registerPath = path.join(
    ROOT,
    "04-Bieu-Mau",
    "00-FORM-DESIGN-SYSTEM",
    "form-control-register.html"
  );
  const html = fs.readFileSync(registerPath, "utf8");
  const rowRe =
    /<tr\b[^>]*>\s*<td[^>]*>(FRM-[A-Z0-9-]+)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<a[^>]+href="([^"]+\.xlsx)"/gi;

  function registerTitleCorrection(bad, good) {
    corrections.set(bad, good);
    const htmlBad = escapeHtml(bad);
    const htmlGood = escapeHtml(good);
    if (htmlBad !== bad || htmlGood !== good) {
      corrections.set(htmlBad, htmlGood);
    }
  }

  for (const [bad, good] of HARD_TITLE_CORRECTIONS) {
    registerTitleCorrection(bad, good);
  }

  let match;
  while ((match = rowRe.exec(html))) {
    const rowCode = match[1];
    const currentTitle = normalizeText(stripTags(match[2]));
    const resolved = normalizeRel(
      path.resolve(path.dirname(registerPath), match[3].split("#")[0])
    );
    const officialTitle = workbookTitleMap.get(resolved);
    const linkedCode = path.basename(resolved).match(/^(FRM-[A-Z0-9-]+)_/i)?.[1] || "";
    if (rowCode !== linkedCode) {
      continue;
    }
    if (currentTitle && officialTitle && currentTitle !== officialTitle) {
      registerTitleCorrection(currentTitle, officialTitle);
    }
  }

  return corrections;
}

function simulateRules(text) {
  let next = text;
  for (const rule of TEXT_RULES) {
    next = next.replace(rule.re, (match) => applyCase(match, rule.out));
  }
  return next;
}

function buildGeneratedTitleCorrections(workbookTitleMap, htmlTitleMap) {
  const generated = new Map();
  const officialTitles = new Set([
    ...workbookTitleMap.values(),
    "Form Control Register",
    "Form Release Checklist",
    "Form Versioning Model",
    "Server Delivery Rollout Checklist",
    "Production Acceptance UAT Pack",
    "Desktop Excel Endpoint Baseline",
    "Periodic Control Cadence",
    "Server Stack Profile Library",
    "Pilot Endpoint Rollout Pack",
    "Editorial Consistency Audit",
    htmlTitleMap.get(
      "04-Bieu-Mau/00-FORM-DESIGN-SYSTEM/form-control-register.html"
    ) || "",
  ]);

  for (const title of officialTitles) {
    if (!title) {
      continue;
    }
    const mutated = simulateRules(title);
    if (mutated && mutated !== title) {
      generated.set(mutated, title);
    }
  }

  return generated;
}

function applyTextRules(text, fileStats) {
  let next = text;
  for (const rule of TEXT_RULES) {
    next = next.replace(rule.re, (match) => {
      const replacement = applyCase(match, rule.out);
      if (replacement === match) {
        return match;
      }
      if (fileStats) {
        fileStats.total += 1;
        fileStats.byRule[rule.key] = (fileStats.byRule[rule.key] || 0) + 1;
      }
      return replacement;
    });
  }
  return next;
}

function applyTitleCorrections(text, corrections, fileStats) {
  let next = text;
  for (const [bad, good] of corrections) {
    const re = new RegExp(escapeRe(bad), "gi");
    next = next.replace(re, (match) => {
      if (match === good) {
        return match;
      }
      if (fileStats) {
        fileStats.total += 1;
        fileStats.byRule.title_restore = (fileStats.byRule.title_restore || 0) + 1;
      }
      return good;
    });
  }
  return next;
}

function resolveTarget(filePath, href) {
  if (
    !href ||
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("#") ||
    href.startsWith("javascript:")
  ) {
    return null;
  }

  const cleanHref = href.split("#")[0].split("?")[0];
  if (!cleanHref) {
    return null;
  }

  const resolvedPath = path.resolve(path.dirname(filePath), cleanHref);
  return normalizeRel(resolvedPath);
}

function buildAnchorText(strippedText, officialTitle) {
  if (!strippedText) {
    return officialTitle;
  }

  const aliasPrefix = strippedText.match(
    /^([A-Z]{1,}(?:-[A-Z0-9]+)+|FRM-\d{3}|SOP-\d{3}|WI-\d{3}|ANNEX-\d{3}|C\d{2}|SYS-OPS-\d+|TRN-OPS-\d+|QMS-MAN-\d+)\s*(?:[—–-]\s*|\s+)(.+)$/i
  );
  if (aliasPrefix) {
    return `${aliasPrefix[1]} — ${officialTitle}`;
  }

  return officialTitle;
}

function normalizeAnchors(html, filePath, htmlTitleMap, workbookTitleMap, fileStats) {
  return html.replace(
    /<a\b([^>]*?)href="([^"]+)"([^>]*)>([\s\S]*?)<\/a>/gi,
    (full, beforeHref, href, afterHref, innerHtml) => {
      if (/<img\b|<svg\b|<div\b|<table\b|<tr\b|<td\b/i.test(innerHtml)) {
        return full;
      }

      const targetRel = resolveTarget(filePath, href);
      if (!targetRel) {
        return full;
      }

      const officialTitle =
        htmlTitleMap.get(targetRel) || workbookTitleMap.get(targetRel) || "";
      if (!officialTitle) {
        return full;
      }

      const strippedText = normalizeText(stripTags(innerHtml));
      if (looksLikeCodeOnly(strippedText)) {
        return full;
      }

      if (strippedText && !containsVietnamese(strippedText)) {
        return full;
      }

      const newText = buildAnchorText(strippedText, officialTitle);
      if (!newText || newText === strippedText) {
        return full;
      }

      fileStats.total += 1;
      fileStats.byRule.anchor_title_normalize =
        (fileStats.byRule.anchor_title_normalize || 0) + 1;

      return `<a${beforeHref}href="${href}"${afterHref}>${escapeHtml(
        newText
      )}</a>`;
    }
  );
}

function processHtml(rawHtml, filePath, titleCorrections, htmlTitleMap, workbookTitleMap) {
  const { html, restore } = protectBlocks(rawHtml);
  const fileStats = { total: 0, byRule: {} };

  let chunks = html.split(/(<[^>]+>)/g);
  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i];
    if (!chunk || chunk.startsWith("<")) {
      continue;
    }
    chunks[i] = applyTextRules(chunk, fileStats);
    chunks[i] = applyTitleCorrections(chunks[i], titleCorrections, fileStats);
  }

  let nextHtml = chunks.join("");
  nextHtml = normalizeAnchors(
    nextHtml,
    filePath,
    htmlTitleMap,
    workbookTitleMap,
    fileStats
  );

  return {
    html: restore(nextHtml),
    fileStats,
  };
}

function writeReport(report) {
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2), "utf8");

  const lines = [
    "# Natural Vietnamese Polish - 2026-03-24",
    "",
    `- Target roots: ${report.targets.map((item) => `\`${item}\``).join(", ")}`,
    `- Files scanned: ${report.filesScanned}`,
    `- Files changed: ${report.filesChanged}`,
    `- Total replacements: ${report.totalReplacements}`,
    "",
    "## Top Rules",
    "",
  ];

  for (const item of report.topRules.slice(0, 25)) {
    lines.push(`- \`${item.rule}\`: ${item.count}`);
  }

  lines.push("", "## Top Changed Files", "");

  for (const item of report.changedFiles.slice(0, 30)) {
    lines.push(
      `- \`${item.path}\`: ${item.total} thay đổi (${Object.entries(item.byRule)
        .slice(0, 6)
        .map(([rule, count]) => `${rule}=${count}`)
        .join(", ")})`
    );
  }

  fs.writeFileSync(REPORT_MD, lines.join("\n"), "utf8");
}

function main() {
  const files = [];
  for (const dir of TARGET_DIRS) {
    if (!fs.existsSync(dir)) {
      throw new Error(`Target directory not found: ${dir}`);
    }
    walk(dir, files);
  }

  const htmlTitleMap = buildHtmlTitleMap(files);
  const workbookTitleMap = buildWorkbookTitleMap();
  const titleCorrections = new Map([
    ...buildRegisterCorrections(workbookTitleMap),
    ...buildGeneratedTitleCorrections(workbookTitleMap, htmlTitleMap),
  ]);
  const sortedCorrections = [...titleCorrections.entries()].sort(
    (a, b) => b[0].length - a[0].length
  );

  const changedFiles = [];
  const totals = new Map();

  for (const filePath of files) {
    const original = fs.readFileSync(filePath, "utf8");
    const { html, fileStats } = processHtml(
      original,
      filePath,
      sortedCorrections,
      htmlTitleMap,
      workbookTitleMap
    );

    if (html !== original) {
      fs.writeFileSync(filePath, html, "utf8");
      changedFiles.push({
        path: normalizeRel(filePath),
        total: fileStats.total,
        byRule: Object.fromEntries(
          Object.entries(fileStats.byRule).sort((a, b) => b[1] - a[1])
        ),
      });
    }

    for (const [rule, count] of Object.entries(fileStats.byRule)) {
      totals.set(rule, (totals.get(rule) || 0) + count);
    }
  }

  changedFiles.sort((a, b) => b.total - a.total);
  const topRules = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([rule, count]) => ({ rule, count }));

  const report = {
    targets: TARGET_DIRS.map((dir) => normalizeRel(dir)),
    filesScanned: files.length,
    filesChanged: changedFiles.length,
    totalReplacements: topRules.reduce((sum, item) => sum + item.count, 0),
    topRules,
    changedFiles,
  };

  writeReport(report);
  console.log(JSON.stringify(report, null, 2));
}

main();
