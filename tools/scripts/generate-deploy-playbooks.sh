#!/usr/bin/env bash
# Generate 12 empty deployment playbook scaffolds for Codex authors to fill.
#
# Output: mom/docs/training/system-ops/03-Deploy-Playbook/TRN-DEP-W01.html ... W12.html
# Each scaffold:
#   - Carries the DCC header bootstrap so it renders standalone in the portal.
#   - Has 12 section placeholders matching the cadence agreed with the user.
#   - Includes <!-- TODO Codex: ... --> markers explaining what to fill, so the
#     spawned AI authors do not need to invent structure (only content).
# After Codex fills the docs, re-run the DCC migrate.php tool to upsert rows
# into dcc_document_header.

set -euo pipefail

OUT_DIR="$(dirname "$0")/../../mom/docs/training/system-ops/03-Deploy-Playbook"
mkdir -p "$OUT_DIR"

# Week metadata. Order: n|date|day|phase|label|attendees|pillar_focus
# Keep label short — Codex will write the full prose.
weeks=(
  "01|2026-05-16|Saturday|P0|Công bố chính thức · MAN-001 + POL-QMS-001/002 hiệu lực|all_departments|gov+doc"
  "02|2026-05-23|Saturday|P1|Chốt sổ tay phòng ban + JD + RACI master|all_departments|doc+train"
  "03|2026-05-30|Saturday|P2|Pilot QA — Tuần 1 (dual-run SOP-605 + WI-201)|qa_team+champions|pilot"
  "04|2026-06-06|Saturday|P2|Pilot QA gate Go/No-Go cho Wave 2|steering+champions|pilot"
  "05|2026-06-13|Saturday|P3|Wave 2 go-live — SCM + Sales|scm+sales+champions|golive"
  "06|2026-06-20|Saturday|P3|Wave 2 mid-review + Wave Production prep|steering+wave2+wave-prod|golive"
  "07|2026-06-27|Saturday|P3|Wave Production go-live — Tuần 1 (PROD + ENG)|production+engineering+hypercare|golive"
  "08|2026-07-04|Saturday|P3|Production hypercare — Tuần 2|production+engineering+hypercare|golive"
  "09|2026-07-11|Saturday|P3|Wave 3 khởi động — HR / FIN / IT / EHS / Epicor|wave3-depts+champions|train"
  "10|2026-07-18|Saturday|P4|Wave 3 stabilize + dashboard governance review|wave3-depts+qms|dash"
  "11|2026-07-25|Saturday|P4|Lessons learned + tài liệu hậu triển khai|all_departments+steering|doc"
  "12|2026-08-01|Saturday|P4|Bàn giao chính thức · vận hành thường xuyên|steering+all_departments|gov"
)

for w in "${weeks[@]}"; do
  IFS='|' read -r n date day phase label attendees pillar <<<"$w"
  code="TRN-DEP-W${n}"
  file="$OUT_DIR/${code}.html"

  cat > "$file" <<HTML
<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta content="width=device-width, initial-scale=1.0" name="viewport">
<title>${code} — Playbook tuần ${n} (${date}) | HESEM MOM</title>
<script>
/* DCC Header bootstrap — copy verbatim from TRN-OPS-09 pattern.
 * Computes absolute URLs so the stylesheet + renderer load correctly
 * regardless of how the document is served (direct, portal iframe, …). */
(function () {
  var DCC_VERSION = '2026-04-24-1';
  var appBase = (location.pathname.indexOf('/mom/') === 0) ? '/mom' : '';
  var css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = appBase + '/styles/dcc-header.css?v=' + DCC_VERSION;
  css.setAttribute('data-dcc-header-stylesheet', '1');
  document.head.appendChild(css);
  var js = document.createElement('script');
  js.defer = true;
  js.src = appBase + '/scripts/portal/11-dcc-header-renderer.js?v=' + DCC_VERSION;
  document.head.appendChild(js);
})();
</script>
<link href="../../../../assets/style.css" rel="stylesheet">
<style>
 .role-chip{display:inline-block;padding:2px 8px;border-radius:999px;background:#f3f4f6;margin:2px 6px 2px 0;font-size:12px}
 .tight li{margin:2px 0}
 .pending-fill{background:#fef3c7;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:8px;color:#78350f;margin:12px 0;font-size:13px}
 .pending-fill strong{color:#92400e;font-weight:700}
 .pending-fill code{background:rgba(146,64,14,.10);padding:1px 5px;border-radius:4px;font-size:12px}
 table { width:100%; table-layout:fixed; border-collapse:collapse; word-wrap:break-word; overflow-wrap:break-word; }
 td,th { word-wrap:break-word; overflow-wrap:break-word; padding:8px 10px; border:1px solid #e2e8f0; vertical-align:top; }
 th { background:#f1f5f9; text-align:left; font-weight:700; }
</style>
</head>
<body>
<div class="container"><div class="page"><div class="page-body">

<!-- DCC Document Change Control header (preview seed; live values served by /api/v1/dcc) -->
<div class="dcc-header"
     data-dcc-doc-code="${code}"
     data-dcc-locale="vi"
     data-dcc-logo="../../../../assets/hesem-logo.svg"
     data-dcc-bootstrap='{"header":{"doc_code":"${code}","title":"Playbook tuần ${n} — ${label}","subtitle":"Triển khai vận hành QMS · Phase ${phase} · ${date} (${day})","doc_type":"TRN","revision":"V0","effective_date":"${date}","owner_role_code":"QMS","approver_role_code":"CEO","iso_clause":null,"status":"draft"}}'></div>

<div class="doc-content" id="docContent">

<div class="pending-fill" id="codex-marker">
  <strong>⚠ Tài liệu khung — Codex chưa viết nội dung chi tiết.</strong>
  Đây là scaffold do <code>generate-deploy-playbooks.sh</code> sinh ra với 12 section placeholder.
  Phần nội dung do AI author điền theo prompt pack tương ứng (tham chiếu <code>_reports/deploy-playbook/PROMPT_PACK_${n}.md</code>).
  Sau khi Codex viết xong sẽ xoá khung cảnh báo này.
</div>

<!-- ─────────────────────────────────────────────────────────────────────
     SECTION 1 — COVER
     Codex fill: kicker (Phase ${phase}), large title, một câu mô tả intent,
     khối "QUICK FACTS" 6 ô (Ngày · Thứ · Phase · Pillar · Attendees · Owner)
     ───────────────────────────────────────────────────────────────────── -->
<section class="card" id="sec-cover">
  <h1 class="h2" style="margin-top:0;">W${n} · ${date} — ${label}</h1>
  <p class="lead"><!-- TODO Codex W${n}/SEC-COVER: 2–3 câu mô tả mục đích chiến lược của tuần ${n} trong tổng thể 12 tuần. --></p>
  <!-- TODO Codex W${n}/SEC-COVER: bảng QUICK FACTS với 6 ô (grid-3, 2 hàng): Ngày · Thứ · Phase · Pillar · Attendees · Owner -->
</section>

<!-- ─────────────────────────────────────────────────────────────────────
     SECTION 2 — MỤC TIÊU TUẦN + KPI BASELINE
     ───────────────────────────────────────────────────────────────────── -->
<section class="card" id="sec-objective">
  <h2 class="h2">Mục tiêu tuần ${n}</h2>
  <!-- TODO Codex W${n}/SEC-OBJECTIVE: viết 3–5 mục tiêu SMART (Specific, Measurable, Achievable, Relevant, Time-bound).
       Sau đó liệt kê KPI baseline cần đo TRƯỚC khi tuần bắt đầu (con số khởi điểm).
       Tham chiếu ANNEX-110 (KPI dictionary) cho mọi KPI ID. -->
</section>

<!-- ─────────────────────────────────────────────────────────────────────
     SECTION 3 — PREP CHECKLIST T-7 / T-3 / T-1 / T-0
     ───────────────────────────────────────────────────────────────────── -->
<section class="card" id="sec-prep">
  <h2 class="h2">Prep checklist — T-7 / T-3 / T-1 / T-0</h2>
  <!-- TODO Codex W${n}/SEC-PREP: 4 bảng prep (T-7, T-3, T-1 ngày trước, T-0 sáng họp).
       Mỗi item: WHO (role code) · WHAT · EVIDENCE · DEADLINE.
       Mỗi T-window tối thiểu 4 item; T-0 là pre-meeting sanity check 30' trước họp. -->
</section>

<!-- ─────────────────────────────────────────────────────────────────────
     SECTION 4 — AGENDA TIMED (60 phút)
     ───────────────────────────────────────────────────────────────────── -->
<section class="card" id="sec-agenda">
  <h2 class="h2">Agenda · 09:00–10:00 (60 phút)</h2>
  <!-- TODO Codex W${n}/SEC-AGENDA: bảng 8–10 dòng. Cột: Thời gian · Phút · Đề mục · Owner · Output kỳ vọng.
       Đảm bảo có: opening (5'), KPI review (10'), main content (~30'), gate decision (10'), closing + next week preview (5'). -->
</section>

<!-- ─────────────────────────────────────────────────────────────────────
     SECTION 5 — NỘI DUNG HỌP TUẦN NÀY (slide-by-slide)
     ───────────────────────────────────────────────────────────────────── -->
<section class="card" id="sec-slides">
  <h2 class="h2">Nội dung họp tuần ${n} — slide-by-slide</h2>
  <!-- TODO Codex W${n}/SEC-SLIDES: 8–12 slide block, mỗi block:
         <div class="card"> hoặc <div class="note-blue">
           <h3>Slide N — Tiêu đề</h3>
           <p>Talking points 3–5 câu (Vietnamese with diacritics).</p>
           <ul class="tight">các bullet cụ thể, có CON SỐ và DOC CODE.</ul>
         </div>
       Cấm dùng "đảm bảo chất lượng" generic. Phải có con số, doc code, role code cụ thể.
       Vận dụng Hofstede (Vietnam high power-distance): CEO speaks first, seniority order, bilingual VN/EN slides. -->
</section>

<!-- ─────────────────────────────────────────────────────────────────────
     SECTION 6 — QUYẾT ĐỊNH CẦN LẤY TẠI HỌP
     ───────────────────────────────────────────────────────────────────── -->
<section class="card" id="sec-decisions">
  <h2 class="h2">Quyết định cần lấy trong cuộc họp này</h2>
  <!-- TODO Codex W${n}/SEC-DECISIONS: bảng 3–6 quyết định. Cột: # · Quyết định · Người ký · Cơ sở (doc/data) · Fallback nếu deferred.
       Mỗi quyết định phải có Plan-B nếu không lấy được trong cuộc họp. -->
</section>

<!-- ─────────────────────────────────────────────────────────────────────
     SECTION 7 — GO/NO-GO GATE — ĐIỀU KIỆN CẦN VÀ ĐỦ
     ───────────────────────────────────────────────────────────────────── -->
<section class="card" id="sec-gate">
  <h2 class="h2">Gate Go/No-Go — Điều kiện CẦN và ĐỦ</h2>
  <!-- TODO Codex W${n}/SEC-GATE: 2 bảng tách biệt:
       (A) ĐIỀU KIỆN CẦN (necessary): nếu thiếu BẤT KỲ → No-Go. Tối thiểu 4 item.
       (B) ĐIỀU KIỆN ĐỦ (sufficient): nếu (A) đủ VÀ tất cả (B) đạt → Go. Tối thiểu 4 item.
       Mỗi điều kiện: Câu mô tả · Cách đo · Threshold · Bằng chứng (table/file/system).
       Vận dụng "Go/No-Go gate condition library" của research pack — boilerplate 10 item, chọn lọc cho tuần ${n}. -->
</section>

<!-- ─────────────────────────────────────────────────────────────────────
     SECTION 8 — PHÂN CÔNG NHIỆM VỤ SAU HỌP (RACI)
     ───────────────────────────────────────────────────────────────────── -->
<section class="card" id="sec-tasks">
  <h2 class="h2">Phân công nhiệm vụ sau họp · RACI · deadline</h2>
  <!-- TODO Codex W${n}/SEC-TASKS: bảng 8–15 task. Cột: # · Task · R · A · C · I · Deadline · Evidence · KPI ảnh hưởng.
       R/A/C/I dùng role code (CEO, QMS_MGR, QA_MGR, PROD_DIR, …) — không tên người.
       Deadline phải absolute date (không "tuần sau"); evidence phải point đến doc_code hoặc table_name. -->
</section>

<!-- ─────────────────────────────────────────────────────────────────────
     SECTION 9 — NỘI DUNG HỌP TUẦN SAU (PREVIEW)
     ───────────────────────────────────────────────────────────────────── -->
<section class="card" id="sec-next-week">
  <h2 class="h2">Preview tuần $((10#${n}+1)) · nhiệm vụ chuẩn bị</h2>
  <!-- TODO Codex W${n}/SEC-NEXT-WEEK: tóm tắt 1 đoạn về tuần kế tiếp, sau đó bảng "chuẩn bị" — mỗi item: Role · Task · Deadline (trong tuần ${n}).
       Mục đích: cuối họp W${n} mỗi người biết rõ tuần sau họ cần đến với gì. -->
</section>

<!-- ─────────────────────────────────────────────────────────────────────
     SECTION 10 — TÀI LIỆU LIÊN QUAN
     ───────────────────────────────────────────────────────────────────── -->
<section class="card" id="sec-docs">
  <h2 class="h2">Tài liệu liên quan · click để mở</h2>
  <!-- TODO Codex W${n}/SEC-DOCS: liệt kê 6–12 doc code dạng:
         <a href="#" onclick="if(window.openDoc)openDoc('CODE');return false;" class="role-chip">CODE</a>
       Bắt buộc bao gồm doc trong requiredDocs của tuần ${n} (xem program.bootstrap.json). -->
</section>

<!-- ─────────────────────────────────────────────────────────────────────
     SECTION 11 — RỦI RO + ESCALATION
     ───────────────────────────────────────────────────────────────────── -->
<section class="card" id="sec-risks">
  <h2 class="h2">Rủi ro tuần ${n} + escalation</h2>
  <!-- TODO Codex W${n}/SEC-RISKS: bảng 5–8 rủi ro. Cột: # · Mô tả rủi ro · Likelihood (L/M/H) · Impact (L/M/H) · Mitigation · Trigger escalation · Escalation owner.
       Bao gồm ít nhất 1 rủi ro Hofstede (VN cultural): vd "trưởng phòng không feedback openly tại all-hands" → mitigation: anonymous feedback box. -->
</section>

<!-- ─────────────────────────────────────────────────────────────────────
     SECTION 12 — LESSONS LEARNED (FILL POST-MEETING)
     ───────────────────────────────────────────────────────────────────── -->
<section class="card" id="sec-lessons">
  <h2 class="h2">Lessons learned · điền sau họp (Lean Change cycle)</h2>
  <!-- TODO Codex W${n}/SEC-LESSONS: chừa 3 khối Insights / Options / Experiments (Jason Little Lean Change Canvas) với placeholder text.
       Sau cuộc họp thật, owner sẽ điền vào 3 ô này. -->
</section>

</div><!-- /doc-content -->
</div></div></div>
</body>
</html>
HTML

  echo "  ✓ $file"
done

echo ""
echo "Generated 12 playbook scaffolds in:"
echo "  $OUT_DIR"
echo ""
echo "Next steps:"
echo "  1. Run the 4 Codex prompt packs in _reports/deploy-playbook/PROMPT_PACK_*.md (parallel)"
echo "  2. After Codex fills the docs, run: php mom/tools/dcc-batch/migrate.php --filter-prefix=TRN-DEP"
echo "  3. Deploy: rsync the 12 files to VPS, then reload"
