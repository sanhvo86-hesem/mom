# 05 — HTML Templates (Mẫu HTML cho từng loại tài liệu)

> Phiên bản: v7 | Cập nhật: 2026-03-24
> Dùng các template dưới đây làm khung xuất phát khi tạo tài liệu mới.

**Quy ước placeholder:**
- `{{CODE}}` — Mã tài liệu (VD: SOP-101, WI-511, ANNEX-301)
- `{{TITLE}}` — Tiêu đề tài liệu
- `{{SUBTITLE}}` — Phụ đề tiếng Việt
- `{{OWNER}}` — Vai trò chủ sở hữu tài liệu
- `{{RELATIVE_PATH}}` — Đường dẫn tương đối tới thư mục gốc (VD: `../../..`)

---

## Template 1: SOP (Quy trình vận hành chuẩn)

SOP có 10 mục chuẩn. Luôn có iso-map, preface-block, toc ở đầu.

```html
<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>{{CODE}} — {{TITLE}} | HESEM QMS</title>
<link href="{{RELATIVE_PATH}}/assets/style.css" rel="stylesheet"/>
<style>
/* ── Component-specific CSS ──
   Khai báo các class bổ sung chưa có trong style.css.
   Thường dùng: .chip, .grid-2, .grid-3, .toc, .toc-title, .toc-grid,
   .metric-grid, .metric-card, .gate-grid, .gate-card, .field-grid, .field,
   .mini-note, .note-soft, .note-blue, .role-note, .callout-grid, .callout-card,
   .step-band, .legend-row, .pill
*/
.chip{display:inline-block;padding:2px 10px;border-radius:999px;border:1px solid #d7dee7;background:#f8fafc;font-size:11px;margin-right:6px;margin-bottom:6px;font-weight:600;}
.tight li{margin:4px 0;}
.grid-2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;}
.grid-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;}
.toc{border:1px solid var(--ln);border-radius:var(--r);padding:16px;background:var(--bg2);margin:18px 0 24px;}
.toc-title{font-size:12px;font-weight:700;color:var(--navy);text-transform:uppercase;letter-spacing:.4px;margin-bottom:10px;}
.toc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;}
.toc-grid a{display:block;padding:8px 10px;border:1px solid var(--ln);border-radius:6px;background:var(--bg);font-size:12px;color:var(--ink);}
.metric-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;}
.metric-card{border:1px solid var(--ln);border-radius:var(--r);padding:14px;background:var(--bg);}
.metric-card .value{font-size:20px;font-weight:700;color:var(--navy);}
.metric-card .label{font-size:11px;color:var(--ink3);margin-top:4px;text-transform:uppercase;letter-spacing:.3px;}
.mini-note{font-size:12px;color:var(--ink2);line-height:1.6;}
.gate-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;}
.gate-card{border:1px solid var(--ln);border-left:4px solid var(--blue);border-radius:var(--r);padding:14px;background:var(--bg);}
.gate-card h3{margin:0 0 6px;font-size:14px;color:var(--navy);}
.field-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 16px;}
.field{padding:10px 12px;border:1px solid var(--ln);border-radius:var(--r-sm);background:var(--bg);}
.field b{display:block;font-size:11px;color:var(--ink3);text-transform:uppercase;letter-spacing:.3px;margin-bottom:6px;}
.field .blank{width:100%;min-height:22px;}
.legend-row{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 0;}
.note-soft{border-left:4px solid #eab308;background:#fffbeb;padding:12px 14px;border-radius:8px;margin:12px 0;}
.note-blue{border-left:4px solid var(--blue);background:var(--blue-l);padding:12px 14px;border-radius:8px;margin:12px 0;}
.callout-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;}
.callout-card{border:1px solid var(--ln);border-radius:var(--r);padding:14px;background:#fff;}
.callout-card h3{margin:0 0 8px;font-size:14px;color:var(--navy);}
.step-band{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 16px}
.step-band span{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--ln);background:var(--bg);padding:6px 10px;border-radius:999px;font-size:11px;font-weight:700}
.role-note{border-left:4px solid #94a3b8;background:#f8fafc;padding:12px 14px;border-radius:8px;margin-top:10px}
.pill{display:inline-block;padding:4px 8px;border-radius:999px;background:var(--blue-l);color:var(--navy);font-size:11px;font-weight:700;margin:0 6px 6px 0;}
.small{font-size:12px}
table{max-width:100%;table-layout:auto}
td,th{max-width:420px;overflow-wrap:break-word;word-wrap:break-word;vertical-align:top}
@media print{.card,.table-card,.callout,.note,.box,.iso-map,.preface-block,.form-sheet,.metric-card,.gate-card,.field,.callout-card{page-break-inside:avoid;break-inside:avoid}h1,h2,h3,.h1,.h2,.h3{page-break-after:avoid;break-after:avoid}tr{page-break-inside:avoid;break-inside:avoid}thead{display:table-header-group}tfoot{display:table-footer-group}}
@media(max-width:960px){.grid-2,.grid-3,.field-grid{grid-template-columns:1fr;}}
</style>
</head>
<body>
<div class="container"><div class="page"><div class="page-body">

<!-- ╔══════════════════════════════════════════════╗
     ║  FORM HEADER — Giống nhau cho mọi tài liệu  ║
     ╚══════════════════════════════════════════════╝ -->
<div class="form-header">
<div class="fh-left">
<a class="brand-logo" href="{{RELATIVE_PATH}}/01-QMS-Portal/portal.html"><img alt="HESEM Logo" src="{{RELATIVE_PATH}}/assets/hesem-logo.svg"/></a>
<div class="fh-company">
<a href="{{RELATIVE_PATH}}/01-QMS-Portal/portal.html">HESEM ENGINEERING</a>
<span>Tài liệu kiểm soát</span>
<!-- SOP: "Tài liệu kiểm soát" | WI: "Tài liệu vận hành • Công việc Hướng dẫn"
     ANNEX: "Tài liệu vận hành • Annex số hóa" | JD: "Tài liệu hệ thống" -->
</div>
</div>
<div class="title">
<strong>{{CODE}} — {{TITLE}}</strong>
<span class="sub-vn">{{SUBTITLE}}</span>
</div>
<div class="meta">
<div class="row"><span><b>Code:</b></span><span>{{CODE}}</span></div>
<div class="row"><span><b>Version:</b></span><span>V0</span></div>
<div class="row"><span><b>Effective Date:</b></span><span>Theo quyết định ban hành</span></div>
<div class="row"><span><b>Owner:</b></span><span>{{OWNER}}</span></div>
<div class="row"><span><b>Approved by:</b></span><span>Tổng Giám đốc</span></div>
</div>
</div>

<!-- ╔══════════════════════════════════════════════╗
     ║  DOC CONTENT — Nội dung tài liệu bắt đầu    ║
     ╚══════════════════════════════════════════════╝ -->
<div class="doc-content" id="docContent"><div class="form-sheet">

<!-- ── 0A. ISO MAP — Chuẩn mực áp dụng ── -->
<div class="iso-map">
<div class="iso-title">Chuẩn mực áp dụng / nguyên tắc bắt buộc</div>
<!-- Liệt kê 2-5 yêu cầu SHALL/SHOULD/MAY quan trọng nhất -->
<div class="req"><span class="req-tag shall">PHẢI</span><div>Yêu cầu bắt buộc thứ nhất.</div></div>
<div class="req"><span class="req-tag shall">PHẢI</span><div>Yêu cầu bắt buộc thứ hai.</div></div>
<div class="req"><span class="req-tag should">NÊN</span><div>Khuyến nghị.</div></div>
</div>

<!-- ── 0B. PREFACE BLOCK — Lệnh điều hành ── -->
<div class="preface-block">
<div class="callout">
<div class="card-title">Lệnh điều hành</div>
<p>Tóm tắt mục đích và phạm vi điều hành của SOP này.</p>
<div class="legend-row">
<span class="chip">Cổng kiểm soát: IG1 → IGn (không giới hạn)</span>
<span class="chip">Biểu mẫu bắt buộc: FRM-xxx</span>
<span class="chip">Tham chiếu: ANNEX-xxx</span>
<span class="chip">SOP liên đới: SOP-xxx</span>
</div>
</div>
</div>

<!-- ── 0C. TABLE OF CONTENTS — Mục lục ── -->
<div class="toc">
<div class="toc-title">Mục lục</div>
<div class="toc-grid">
<a href="#p1">1. Mục đích</a>
<a href="#p2">2. Phạm vi</a>
<a href="#p3">3. Thuật ngữ &amp; nguyên tắc</a>
<a href="#p4">4. Vai trò, quyền hạn &amp; RACI</a>
<a href="#p5">5. Đầu vào, đầu ra &amp; điều kiện tiên quyết</a>
<a href="#p6">6. Cổng kiểm soát, điểm dừng bắt buộc &amp; KPI</a>
<a href="#p7">7. Quy trình chi tiết</a>
<a href="#p8">8. Ngoại lệ, thay đổi &amp; làm lại</a>
<a href="#p9">9. Hệ thống, hồ sơ &amp; dữ liệu</a>
<a href="#p10">10. Biểu mẫu, WI, SOP &amp; JD liên kết</a>
</div>
</div>

<!-- ══════════════════════════════════════════════ -->
<!-- MỤC 1 — MỤC ĐÍCH                             -->
<!-- ══════════════════════════════════════════════ -->
<h2 class="h2" id="p1">1. Mục đích</h2>
<p>Thiết lập cơ chế ...</p>
<ul class="tight">
<li>Điểm 1.</li>
<li>Điểm 2.</li>
</ul>

<!-- ══════════════════════════════════════════════ -->
<!-- MỤC 2 — PHẠM VI                              -->
<!-- ══════════════════════════════════════════════ -->
<h2 class="h2" id="p2">2. Phạm vi</h2>
<p>Áp dụng cho ...</p>
<!-- Dùng callout-grid cho "Có bao phủ" / "Không thay thế" -->
<div class="callout-grid">
<div class="callout-card"><h3>Có bao phủ</h3><ul class="tight"><li>...</li></ul></div>
<div class="callout-card"><h3>Không thay thế / không được vượt quyền</h3><ul class="tight"><li>...</li></ul></div>
</div>

<!-- ══════════════════════════════════════════════ -->
<!-- MỤC 3 — THUẬT NGỮ & NGUYÊN TẮC              -->
<!-- ══════════════════════════════════════════════ -->
<h2 class="h2" id="p3">3. Thuật ngữ &amp; nguyên tắc</h2>
<div class="table-card"><table class="table">
<thead><tr><th>Thuật ngữ / nguyên tắc</th><th>Quy định sử dụng</th></tr></thead>
<tbody>
<tr><td><b>Traceability (truy xuất nguồn gốc)</b></td><td>Định nghĩa bằng tiếng Việt chuẩn, sau đó thân tài liệu ưu tiên dùng “truy xuất nguồn gốc”.</td></tr>
</tbody>
</table></div>

<!-- ══════════════════════════════════════════════ -->
<!-- MỤC 4 — VAI TRÒ, QUYỀN HẠN & RACI          -->
<!-- ══════════════════════════════════════════════ -->
<h2 class="h2" id="p4">4. Vai trò, quyền hạn &amp; RACI</h2>
<div class="table-card"><table class="table">
<thead><tr><th>Vai trò</th><th>Trách nhiệm chính</th><th>Quyền / điểm chặn</th></tr></thead>
<tbody>
<tr><td>Vai trò A</td><td>Trách nhiệm.</td><td>Quyền hạn.</td></tr>
</tbody>
</table></div>

<!-- ══════════════════════════════════════════════ -->
<!-- MỤC 5 — ĐẦU VÀO, ĐẦU RA & ĐIỀU KIỆN        -->
<!-- ══════════════════════════════════════════════ -->
<h2 class="h2" id="p5">5. Đầu vào, đầu ra &amp; điều kiện tiên quyết</h2>
<div class="field-grid">
<div class="field"><b>Đầu vào bắt buộc</b><div class="blank">...</div></div>
<div class="field"><b>Đầu ra bắt buộc</b><div class="blank">...</div></div>
<div class="field"><b>Điều kiện kích hoạt</b><div class="blank">...</div></div>
<div class="field"><b>Điều kiện không được chuyển bước</b><div class="blank">...</div></div>
</div>

<!-- ══════════════════════════════════════════════ -->
<!-- MỤC 6 — CỔNG KIỂM SOÁT & KPI                -->
<!-- ══════════════════════════════════════════════ -->
<h2 class="h2" id="p6">6. Cổng kiểm soát, điểm dừng bắt buộc &amp; KPI</h2>
<div class="table-card"><table class="table">
<colgroup>
<col class="col-ig"/><col class="col-desc"/><col class="col-owner"/><col class="col-hold"/><col class="col-kpi"/>
</colgroup>
<thead><tr><th>IG</th><th>Cổng kiểm soát &amp; mục tiêu</th><th>Chủ trì</th><th>Điểm dừng bắt buộc</th><th>KPI / hồ sơ tối thiểu</th></tr></thead>
<tbody>
<tr><td class="ig-center"><span class="step-tag">IG1</span></td><td><b>Tên cổng 1</b><br/>Mô tả mục tiêu cổng.</td><td>Vai trò</td><td>Điều kiện HOLD đo được.</td><td>100% / ≤ 24h / FRM-xxx</td></tr>
<tr><td class="ig-center"><span class="step-tag">IG2</span></td><td><b>Tên cổng 2</b><br/>Mô tả mục tiêu cổng.</td><td>Vai trò</td><td>Điều kiện HOLD đo được.</td><td>= 0 lỗi / FRM-yyy</td></tr>
</tbody>
</table></div>
<!-- Dùng metric-grid cho KPI -->
<div class="note-soft"><b>Quy tắc:</b> chỉ tạo IG khi có điểm HOLD/RELEASE thật; KPI phải có ngưỡng số hoặc SLA, nguồn dữ liệu và trigger phản ứng khi lệch.</div>
<h3 class="h3">KPI vận hành</h3>
<div class="metric-grid">
<div class="metric-card"><div class="value">95%</div><div class="label">Tên KPI</div></div>
<div class="metric-card"><div class="value">&le; 2 ngày</div><div class="label">Tên KPI</div></div>
</div>

<!-- ══════════════════════════════════════════════ -->
<!-- MỤC 7 — QUY TRÌNH CHI TIẾT                   -->
<!-- ══════════════════════════════════════════════ -->
<h2 class="h2" id="p7">7. Quy trình chi tiết</h2>
<div class="flowchart">
<div class="flow-step" style="border-color:rgba(21,101,192,0.28);background:linear-gradient(135deg,rgba(21,101,192,0.10) 0%, rgba(255,255,255,0.98) 64%);"><div class="flow-num" style="background:linear-gradient(135deg,#1565c0,#1976d2)">1</div><div class="flow-text"><div class="flow-title">Tên bước 1</div></div></div>
<div class="flow-arrow" style="color:rgba(25,118,210,0.45)">→</div>
<div class="flow-step" style="border-color:rgba(5,150,105,0.28);background:linear-gradient(135deg,rgba(5,150,105,0.10) 0%, rgba(255,255,255,0.98) 64%);"><div class="flow-num" style="background:linear-gradient(135deg,#059669,#10b981)">2</div><div class="flow-text"><div class="flow-title">Tên bước 2</div></div></div>
</div>

<h3><span class="proc-num" style="background:linear-gradient(135deg,#1565c0,#1976d2)">1</span> Tên bước 1</h3>
<p>Mô tả chi tiết bước 1.</p>
<ul class="tight">
<li>Hành động cụ thể.</li>
</ul>

<h3><span class="proc-num" style="background:linear-gradient(135deg,#059669,#10b981)">2</span> Tên bước 2</h3>
<p>Mô tả chi tiết bước 2.</p>
<ul class="tight">
<li>Hành động cụ thể.</li>
</ul>

<div class="note-soft"><b>Quy tắc:</b> số bước flowchart phải khớp số heading bước chi tiết; bubble flowchart phải cùng palette với <code>proc-num</code> của bước tương ứng.</div>
<div class="note-blue"><b>Phương pháp:</b> trước khi chốt số bước, phải đọc tài liệu cũ, nghiên cứu nguồn chính thức bên ngoài và xác định rõ các điểm bàn giao, revalidation, containment, restart.</div>

<!-- ══════════════════════════════════════════════ -->
<!-- MỤC 8 — NGOẠI LỆ, THAY ĐỔI & LÀM LẠI       -->
<!-- ══════════════════════════════════════════════ -->
<h2 class="h2" id="p8">8. Ngoại lệ, thay đổi &amp; làm lại</h2>
<div class="table-card"><table class="table">
<thead><tr><th>Tình huống</th><th>Xử lý</th><th>Ai phê duyệt</th></tr></thead>
<tbody>
<tr><td>...</td><td>...</td><td>...</td></tr>
</tbody>
</table></div>

<!-- ══════════════════════════════════════════════ -->
<!-- MỤC 9 — HỆ THỐNG, HỒ SƠ & DỮ LIỆU          -->
<!-- ══════════════════════════════════════════════ -->
<h2 class="h2" id="p9">9. Hệ thống, hồ sơ &amp; dữ liệu</h2>
<div class="table-card"><table class="table">
<thead><tr><th>Hệ thống / Hồ sơ</th><th>Mục đích</th><th>Nơi lưu</th><th>Thời gian lưu</th></tr></thead>
<tbody>
<tr><td>...</td><td>...</td><td>...</td><td>...</td></tr>
</tbody>
</table></div>

<!-- ══════════════════════════════════════════════ -->
<!-- MỤC 10 — BIỂU MẪU, WI, SOP & JD LIÊN KẾT    -->
<!-- ══════════════════════════════════════════════ -->
<h2 class="h2" id="p10">10. Biểu mẫu, WI, SOP &amp; JD liên kết</h2>
<div class="table-card"><table class="table">
<thead><tr><th>Loại</th><th>Mã</th><th>Tên tài liệu</th></tr></thead>
<tbody>
<tr><td>Biểu mẫu</td><td><a href="...">FRM-xxx</a></td><td>Tên biểu mẫu</td></tr>
<tr><td>WI</td><td><a href="...">WI-xxx</a></td><td>Tên WI</td></tr>
<tr><td>SOP</td><td><a href="...">SOP-xxx</a></td><td>Tên SOP</td></tr>
<tr><td>ANNEX</td><td><a href="...">ANNEX-xxx</a></td><td>Tên ANNEX</td></tr>
</tbody>
</table></div>

</div></div>
<!-- Kết thúc .doc-content > .form-sheet -->

</div></div></div>
<!-- Kết thúc .page-body > .page > .container -->

<div class="no-screen print-disclaimer">Bản in không có đóng dấu kiểm soát phiên bản thì tài liệu này không có giá trị. Chỉ sử dụng phiên bản hiện hành trên hệ thống HESEM QMS.</div>
</body>
</html>
```

---

## Template 2: WI (Hướng dẫn công việc)

WI có 7 mục. Không có iso-map và preface-block. Thường có `.note` ở đầu thay vì iso-map.

```html
<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>{{CODE}} — {{TITLE}} | HESEM QMS</title>
<link href="{{RELATIVE_PATH}}/assets/style.css" rel="stylesheet"/>
<style>
/* ── WI-specific CSS ── */
.small{font-size:12px}
.tight li{margin:4px 0}
.kpi-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:10px 0}
.kpi-box{border:1px solid var(--ln);border-left:4px solid var(--blue);border-radius:var(--r);padding:12px;background:#fff}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.code{font-family:var(--mono);font-size:12px;background:#f1f3f5;padding:1px 6px;border-radius:4px}
.keyline{margin:10px 0;padding:10px 12px;border:1px dashed var(--th-bdr);border-radius:var(--r);background:#fcfcfd}
.callout-danger{border-left:4px solid #c92a2a;background:#fff5f5;padding:10px 12px;border-radius:var(--r);margin:10px 0}
.callout-info{border-left:4px solid #1971c2;background:#eef7ff;padding:10px 12px;border-radius:var(--r);margin:10px 0}
.callout-warn{border-left:4px solid #e67700;background:#fff9db;padding:10px 12px;border-radius:var(--r);margin:10px 0}
table{max-width:100%;table-layout:auto}
td,th{max-width:420px;overflow-wrap:break-word;word-wrap:break-word;vertical-align:top}
@media print{.card,.table-card,.callout,.note,.box,.lane,.legend,.req,.vstep{break-inside:avoid;page-break-inside:avoid}h1,h2,h3{break-after:avoid;page-break-after:avoid}tr{break-inside:avoid;page-break-inside:avoid}}
@media(max-width:960px){.two-col,.kpi-grid{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="container"><div class="page"><div class="page-body">

<!-- FORM HEADER -->
<div class="form-header">
<div class="fh-left">
<a class="brand-logo" href="{{RELATIVE_PATH}}/01-QMS-Portal/portal.html"><img alt="HESEM Logo" src="{{RELATIVE_PATH}}/assets/hesem-logo.svg"/></a>
<div class="fh-company">
<a href="{{RELATIVE_PATH}}/01-QMS-Portal/portal.html">HESEM ENGINEERING</a>
<span>Tài liệu vận hành &bull; Công việc Hướng dẫn</span>
</div>
</div>
<div class="title"><strong>{{CODE}} — {{TITLE}}</strong></div>
<div class="meta">
<div class="row"><span><b>Code:</b></span><span>{{CODE}}</span></div>
<div class="row"><span><b>Version:</b></span><span>V0</span></div>
<div class="row"><span><b>Effective Date:</b></span><span>Theo quyết định ban hành</span></div>
<div class="row"><span><b>Owner:</b></span><span>{{OWNER}}</span></div>
<div class="row"><span><b>Approved by:</b></span><span>Tổng Giám đốc</span></div>
</div>
</div>

<!-- ÁP DỤNG KHI — Note mở đầu thay vì iso-map -->
<div class="note"><strong>ÁP DỤNG KHI</strong><br/>Mô tả ngắn khi nào dùng WI này.</div>

<!-- TIÊU ĐỀ CHÍNH -->
<h1>{{CODE}} — {{TITLE}}</h1>

<!-- ── MỤC 1 — MỤC ĐÍCH VÀ CÁCH DÙNG ── -->
<div class="section">
<h2>1. Mục đích và cách dùng</h2>
<p>WI này hướng dẫn ...</p>
</div>

<!-- ── MỤC 2 — PHẠM VI ── -->
<div class="section">
<h2>2. Phạm vi</h2>
<p>Áp dụng cho ...</p>
</div>

<!-- ── MỤC 3 — CÔNG CỤ / VẬT TƯ / TÀI LIỆU CẦN CÓ ── -->
<div class="section">
<h2>3. Công cụ, vật tư và tài liệu cần có</h2>
<div class="table-card"><table class="table">
<thead><tr><th>Loại</th><th>Mô tả</th><th>Ghi chú</th></tr></thead>
<tbody>
<tr><td>Công cụ</td><td>...</td><td>...</td></tr>
</tbody>
</table></div>
</div>

<!-- ── MỤC 4 — ĐIỀU KIỆN TIÊN QUYẾT ── -->
<div class="section">
<h2>4. Điều kiện tiên quyết</h2>
<ul>
<li>Điều kiện 1.</li>
<li>Điều kiện 2.</li>
</ul>
<div class="callout-danger"><strong>DỪNG NGAY NẾU:</strong> Mô tả tình huống phải dừng.</div>
</div>

<!-- ── MỤC 5 — CÁC BƯỚC THỰC HIỆN ── -->
<div class="section">
<h2>5. Các bước thực hiện</h2>
<!-- Dùng vflow hoặc bảng tùy theo độ phức tạp -->
<div class="vflow">
<div class="vstep"><div class="vnum">1</div><div class="vtext"><b>Tên bước</b><p>Mô tả.</p></div></div>
<div class="vstep"><div class="vnum">2</div><div class="vtext"><b>Tên bước</b><p>Mô tả.</p></div></div>
</div>
</div>

<!-- ── MỤC 6 — HỒ SƠ & BẰNG CHỨNG ── -->
<div class="section">
<h2>6. Hồ sơ &amp; bằng chứng</h2>
<div class="table-card"><table class="table">
<thead><tr><th>Hồ sơ</th><th>Nội dung</th><th>Nơi lưu</th></tr></thead>
<tbody>
<tr><td>...</td><td>...</td><td>...</td></tr>
</tbody>
</table></div>
</div>

<!-- ── MỤC 7 — TÀI LIỆU LIÊN QUAN ── -->
<div class="section">
<h2>7. Tài liệu liên quan</h2>
<div class="table-card"><table class="table">
<thead><tr><th>Loại</th><th>Mã</th><th>Tên tài liệu</th></tr></thead>
<tbody>
<tr><td>SOP</td><td><a href="...">SOP-xxx</a></td><td>Tên SOP</td></tr>
<tr><td>WI</td><td><a href="...">WI-xxx</a></td><td>Tên WI</td></tr>
</tbody>
</table></div>
</div>

</div></div></div>
<div class="no-screen print-disclaimer">Bản in không có đóng dấu kiểm soát phiên bản thì tài liệu này không có giá trị. Chỉ sử dụng phiên bản hiện hành trên hệ thống HESEM QMS.</div>
</body>
</html>
```

---

## Template 3: ANNEX (Tài liệu tham chiếu / Rule Pack)

ANNEX linh hoạt về cấu trúc. Luôn có iso-map (dùng nguyên tắc bắt buộc), toc, và các section đánh số.

```html
<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>{{CODE}} — {{TITLE}} | HESEM QMS</title>
<link href="{{RELATIVE_PATH}}/assets/style.css" rel="stylesheet"/>
<style>
/* ── ANNEX-specific CSS ── */
.metric-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin:14px 0}
.metric-card{border:1px solid var(--ln);border-radius:var(--r);padding:14px;background:var(--bg)}
.metric-card .value{font-weight:800;font-size:18px;color:var(--navy);margin:6px 0}
.metric-card .label{font-size:11px;text-transform:uppercase;letter-spacing:.4px;color:var(--ink2);font-weight:700}
.grid-2{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}
.grid-3{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}
.tight{margin:0;padding-left:18px}
.tight li{margin:4px 0}
.toc{border:1px solid var(--ln);border-radius:var(--r);padding:16px;background:var(--bg2);margin:18px 0 24px}
.toc-title{font-size:12px;font-weight:700;color:var(--navy);text-transform:uppercase;letter-spacing:.4px;margin-bottom:10px}
.toc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px}
.toc-grid a{display:block;padding:8px 10px;border:1px solid var(--ln);border-radius:6px;background:var(--bg);font-size:12px;color:var(--ink)}
.mini-note{font-size:12px;color:var(--ink2);line-height:1.6}
.chip{display:inline-flex;padding:3px 10px;border-radius:999px;border:1px solid var(--ln);background:var(--bg2);font-size:11px;font-weight:600;margin-right:6px;margin-bottom:6px}
.legend-box{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}
.notice-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin:12px 0}
.notice-item{padding:10px 12px;border:1px solid var(--ln);border-left:4px solid var(--blue);border-radius:var(--r-sm);background:var(--bg);font-size:12px}
.small{font-size:12px}
.footer-note{margin-top:18px;padding:12px 14px;border-top:1px solid var(--ln);font-size:12px;color:var(--ink2)}
table{max-width:100%;table-layout:auto}
td,th{max-width:420px;overflow-wrap:break-word;word-wrap:break-word;vertical-align:top}
@media print{.card,.table-card,.callout,.note,.box,.iso-map,.preface-block,.metric-card,.notice-item{page-break-inside:avoid;break-inside:avoid}h1,h2,h3,.h1,.h2,.h3{page-break-after:avoid;break-after:avoid}tr{page-break-inside:avoid;break-inside:avoid}thead{display:table-header-group}}
@media(max-width:960px){.grid-2,.grid-3{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="container"><div class="page"><div class="page-body">

<!-- FORM HEADER -->
<div class="form-header">
<div class="fh-left">
<a class="brand-logo" href="{{RELATIVE_PATH}}/01-QMS-Portal/portal.html"><img alt="HESEM Logo" src="{{RELATIVE_PATH}}/assets/hesem-logo.svg"/></a>
<div class="fh-company">
<a href="{{RELATIVE_PATH}}/01-QMS-Portal/portal.html">HESEM ENGINEERING</a>
<span>Tài liệu vận hành &bull; Annex số hóa</span>
</div>
</div>
<div class="title">
<strong>{{CODE}} — {{TITLE}}</strong>
<span class="sub-vn">{{SUBTITLE}}</span>
</div>
<div class="meta">
<div class="row"><span><b>Code:</b></span><span>{{CODE}}</span></div>
<div class="row"><span><b>Version:</b></span><span>V0</span></div>
<div class="row"><span><b>Effective Date:</b></span><span>Theo quyết định ban hành</span></div>
<div class="row"><span><b>Owner:</b></span><span>{{OWNER}}</span></div>
<div class="row"><span><b>Approved by:</b></span><span>Tổng Giám đốc</span></div>
</div>
</div>

<div class="doc-content" id="docContent"><div class="form-sheet">

<!-- ISO MAP — Nguyên tắc bắt buộc -->
<div class="iso-map">
<div class="iso-title">Nguyên tắc bắt buộc</div>
<div class="req"><span class="req-tag shall">PHẢI</span><div>Nguyên tắc bắt buộc 1.</div></div>
<div class="req"><span class="req-tag shall">PHẢI</span><div>Nguyên tắc bắt buộc 2.</div></div>
</div>

<!-- TOC -->
<div class="toc"><div class="toc-title">Mục lục nhanh</div><div class="toc-grid">
<a href="#a1">1. Mục đích và phạm vi</a>
<a href="#a2">2. Section tiếp theo</a>
<!-- Thêm section tùy theo nội dung ANNEX -->
</div></div>

<!-- SECTIONS — Đánh số linh hoạt -->
<h2 class="h2" id="a1">1. Mục đích và phạm vi</h2>
<p>ANNEX này cung cấp ...</p>

<h2 class="h2" id="a2">2. Nội dung chính</h2>
<!-- Dùng bảng, grid, card tùy theo loại annex -->
<div class="table-card"><table class="table">
<thead><tr><th>Cột 1</th><th>Cột 2</th><th>Cột 3</th></tr></thead>
<tbody>
<tr><td>...</td><td>...</td><td>...</td></tr>
</tbody>
</table></div>

<!-- FOOTER NOTE — thường có ở cuối ANNEX -->
<div class="footer-note">Ghi chú: Tài liệu này là phần phụ trợ của SOP liên quan. Mọi thay đổi phải đi qua DCR.</div>

</div></div>
</div></div></div>
<div class="no-screen print-disclaimer">Bản in không có đóng dấu kiểm soát phiên bản thì tài liệu này không có giá trị. Chỉ sử dụng phiên bản hiện hành trên hệ thống HESEM QMS.</div>
</body>
</html>
```

---

## Template 4: JD (Mô tả công việc)

JD có 12 mục chuẩn. Dùng các component đặc thù: `.jd-purpose`, `.jd-mission`, `.auth-grid`, `.comp-grid`, `.backup-card`.

```html
<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>{{JOB_TITLE}} | HESEM QMS</title>
<link href="{{RELATIVE_PATH}}/assets/style.css" rel="stylesheet"/>
<style>
/* ── JD-specific CSS ── */
@media print{
 .card,.table-card,.callout,.note,.box,.iso-map,.preface-block,.form-sheet,.lane,.legend,.req,.vstep,.auth-grid,.jd-purpose,.jd-mission,.comp-grid,.comp-card,.backup-card{page-break-inside:avoid;break-inside:avoid}
 h1,h2,h3,.h1,.h2,.h3{page-break-after:avoid;break-after:avoid}
 .form-header{page-break-inside:avoid;break-inside:avoid}
 tr{page-break-inside:avoid;break-inside:avoid}
 thead{display:table-header-group}tfoot{display:table-footer-group}p{orphans:3;widows:3}
 .table-card{overflow:visible !important}
}
.page-body{overflow-x:hidden}
.table-card,.table-block,.table-wrap{overflow-x:auto;max-width:100%}
table{max-width:100%;table-layout:auto}
td,th{max-width:420px;overflow-wrap:break-word;word-wrap:break-word}

/* Role code */
.role-code{font-family:var(--mono);font-size:11px;background:var(--bg3);padding:2px 6px;border-radius:5px}

/* RACI cells & badges */
.raci-cell{text-align:center;font-weight:700;width:34px;min-width:34px;padding:6px 4px !important}
.raci-badge{display:inline-block;min-width:26px;text-align:center;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700}
.raci-a{background:#fff3e0;color:#b45309}
.raci-r{background:#e0f2fe;color:#0369a1}
.raci-c{background:#f3e8ff;color:#7e22ce}
.raci-i{background:#ecfdf5;color:#047857}

/* JD Layout */
.jd-purpose{margin:12px 0 18px;background:var(--bg2);border:1px solid var(--ln);border-left:4px solid #1d4ed8;border-radius:8px;padding:12px 14px}
.jd-mission{background:#eef6ff;border:1px solid #cfe0ff;border-left:4px solid #2563eb;border-radius:8px;padding:14px 16px;margin:8px 0 18px}
.jd-mission p:last-child,.auth-item p:last-child,.backup-card p:last-child,.comp-card p:last-child{margin-bottom:0}

/* Authority & Competency grids */
.auth-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:10px 0 16px}
.auth-item{padding:12px 14px;border:1px solid var(--ln);border-radius:8px;background:var(--bg2)}
.backup-card{padding:14px 16px;border:1px solid var(--ln);border-left:4px solid #0f766e;border-radius:8px;background:var(--bg2);margin:10px 0 0}
.comp-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:10px}
.comp-card{padding:12px 14px;border:1px solid var(--ln);border-radius:8px;background:#ffffff}
.comp-card ul{margin-bottom:0}

/* Misc */
.require-table th{width:24%}
.inline-note{margin-top:8px;font-size:12px;color:var(--ink2)}
.muted-note{font-size:12px;color:var(--ink2)}
.doc-link-list{list-style:none;margin:0;padding:0}
.doc-link-list li{padding:6px 0 6px 16px;position:relative}
.doc-link-list li:before{content:"\2022";position:absolute;left:0;color:var(--blue)}

@media(max-width:960px){.auth-grid,.comp-grid{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="container"><div class="page"><div class="page-body">

<!-- FORM HEADER -->
<div class="form-header">
<div class="fh-left">
<a class="brand-logo" href="{{RELATIVE_PATH}}/01-QMS-Portal/portal.html"><img alt="HESEM Logo" src="{{RELATIVE_PATH}}/assets/hesem-logo.svg"/></a>
<div class="fh-company">
<a href="{{RELATIVE_PATH}}/01-QMS-Portal/portal.html">HESEM ENGINEERING</a>
<span>Tài liệu kiểm soát</span>
</div>
</div>
<div class="title">
<strong>{{CODE}} — {{JOB_TITLE}}</strong>
<span class="sub-vn">{{JOB_TITLE_VN}}</span>
</div>
<div class="meta">
<div class="row"><span><b>Code:</b></span><span>{{CODE}}</span></div>
<div class="row"><span><b>Version:</b></span><span>V0</span></div>
<div class="row"><span><b>Effective Date:</b></span><span>Theo quyết định ban hành</span></div>
<div class="row"><span><b>Owner:</b></span><span>HR Manager</span></div>
<div class="row"><span><b>Approved by:</b></span><span>Tổng Giám đốc</span></div>
</div>
</div>

<div class="doc-content" id="docContent"><div class="form-sheet">

<!-- PREFACE — Mục đích JD -->
<div class="preface-block">
<div class="jd-purpose">
<p><b>Mục đích:</b> Mô tả công việc này xác lập ranh giới trách nhiệm, quyền hạn, đầu ra bắt buộc và năng lực cần có để người giữ vị trí biết rõ phải làm gì, được quyền gì, và bàn giao gì.</p>
</div>
</div>

<!-- MỤC 1 — THÔNG TIN VỊ TRÍ -->
<h2 class="h2">1. Thông tin vị trí</h2>
<div class="table-card"><table class="table require-table"><tbody>
<tr><th>Chức danh</th><td>{{JOB_TITLE}}</td></tr>
<tr><th>Mã vị trí</th><td>{{CODE}}</td></tr>
<tr><th>Phòng ban</th><td>{{DEPARTMENT}}</td></tr>
<tr><th>Cấp quản lý</th><td>{{LEVEL}}</td></tr>
<tr><th>Nơi làm việc</th><td>Nhà máy HESEM</td></tr>
</tbody></table></div>

<!-- MỤC 2 — SỨ MỆNH VỊ TRÍ -->
<h2 class="h2">2. Sứ mệnh vị trí</h2>
<div class="jd-mission">
<p>Mô tả sứ mệnh cốt lõi của vị trí trong 1-2 câu.</p>
</div>

<!-- MỤC 3 — TUYẾN BÁO CÁO -->
<h2 class="h2">3. Tuyến báo cáo &amp; phạm vi quản lý</h2>
<div class="table-card"><table class="table require-table"><tbody>
<tr><th>Báo cáo trực tiếp</th><td>{{REPORTS_TO}}</td></tr>
<tr><th>Quản lý trực tiếp</th><td>{{DIRECT_REPORTS}}</td></tr>
<tr><th>Phó / Backup</th><td>{{BACKUP}}</td></tr>
</tbody></table></div>

<!-- MỤC 4 — TRÁCH NHIỆM CHÍNH -->
<h2 class="h2">4. Trách nhiệm chính</h2>
<div class="table-card"><table class="table">
<thead><tr><th style="width:26%">Nhóm trách nhiệm</th><th>Nội dung trách nhiệm</th></tr></thead>
<tbody>
<tr><td>Nhóm 1</td><td>Mô tả trách nhiệm.</td></tr>
</tbody>
</table></div>
<p class="inline-note">Nguyên tắc phân vai: khi công việc chạm tới quyết định vượt thẩm quyền của chức danh, người giữ vị trí phải chuyển đúng người phụ trách.</p>

<!-- MỤC 5 — QUYỀN HẠN -->
<h2 class="h2">5. Quyền hạn</h2>
<div class="auth-grid">
<!-- Mỗi auth-item = 1 nhóm quyền -->
<div class="auth-item"><b>Quyền nhóm 1:</b> Mô tả quyền.</div>
<div class="auth-item"><b>Quyền nhóm 2:</b> Mô tả quyền.</div>
</div>

<!-- MỤC 6 — RACI -->
<h2 class="h2">6. Giao diện liên phòng ban — RACI / Bàn giao</h2>
<div class="table-card"><table class="table">
<thead><tr><th>Quy trình / bàn giao</th><th>Đối tác</th><th style="width:10%;text-align:center">RACI</th><th>Ghi chú</th></tr></thead>
<tbody>
<tr><td>Quy trình A</td><td>Phòng X</td><td style="width:10%;text-align:center"><span class="raci-badge raci-r">R</span></td><td>...</td></tr>
</tbody>
</table></div>
<p class="inline-note">R = thực hiện; A = chịu trách nhiệm; C = tham vấn; I = thông tin.</p>

<!-- MỤC 7 — ĐẦU RA BẮT BUỘC -->
<h2 class="h2">7. Đầu ra bắt buộc / hồ sơ quản trị</h2>
<div class="table-card"><table class="table">
<thead><tr><th>Đầu ra / hồ sơ</th><th>Nội dung bắt buộc</th><th>Chu kỳ</th><th>Nơi lưu</th></tr></thead>
<tbody>
<tr><td>...</td><td>...</td><td>...</td><td>...</td></tr>
</tbody>
</table></div>

<!-- MỤC 8 — KPI -->
<h2 class="h2">8. KPI cá nhân</h2>
<div class="table-card"><table class="table">
<thead><tr><th>KPI trọng yếu</th><th>Cách đo / nguồn dữ liệu</th><th>Chu kỳ theo dõi</th></tr></thead>
<tbody>
<tr><td>...</td><td>...</td><td>...</td></tr>
</tbody>
</table></div>

<!-- MỤC 9 — NĂNG LỰC -->
<h2 class="h2">9. Yêu cầu năng lực</h2>
<div class="comp-grid">
<div class="comp-card"><p><b>Kiến thức chuyên môn</b></p><ul><li>Yêu cầu 1.</li></ul></div>
<div class="comp-card"><p><b>Kỹ năng vận hành</b></p><ul><li>Yêu cầu 1.</li></ul></div>
<div class="comp-card"><p><b>Kỹ năng mềm</b></p><ul><li>Yêu cầu 1.</li></ul></div>
<div class="comp-card"><p><b>Thái độ &amp; giá trị</b></p><ul><li>Yêu cầu 1.</li></ul></div>
</div>

<!-- MỤC 10 — HỌC VẤN & KINH NGHIỆM -->
<h2 class="h2">10. Học vấn, kinh nghiệm &amp; yêu cầu tuyển dụng</h2>
<div class="table-card"><table class="table require-table"><tbody>
<tr><th>Học vấn</th><td>...</td></tr>
<tr><th>Kinh nghiệm</th><td>...</td></tr>
<tr><th>Chứng chỉ</th><td>...</td></tr>
<tr><th>Ngoại ngữ</th><td>...</td></tr>
</tbody></table></div>

<!-- MỤC 11 — ĐIỀU KIỆN LÀM VIỆC -->
<h2 class="h2">11. Điều kiện làm việc</h2>
<div class="table-card"><table class="table require-table"><tbody>
<tr><th>Giờ làm việc</th><td>...</td></tr>
<tr><th>Môi trường</th><td>...</td></tr>
<tr><th>PPE</th><td>...</td></tr>
</tbody></table></div>

<!-- MỤC 12 — TÀI LIỆU LIÊN KẾT -->
<h2 class="h2">12. SOP, WI &amp; tài liệu liên kết</h2>
<div class="table-card"><table class="table">
<thead><tr><th>Mã</th><th>Tên tài liệu</th><th>Vai trò trong JD</th></tr></thead>
<tbody>
<tr><td><a href="...">SOP-xxx</a></td><td>Tên SOP</td><td>R/A/C/I</td></tr>
</tbody>
</table></div>

</div></div>
</div></div></div>
<div class="no-screen print-disclaimer">Bản in không có đóng dấu kiểm soát phiên bản thì tài liệu này không có giá trị. Chỉ sử dụng phiên bản hiện hành trên hệ thống HESEM QMS.</div>
</body>
</html>
```

---

## Template 5: Training Module (Tài liệu đào tạo)

Training module dùng `.badge` cho cấp độ, `.toc` cho mục lục, `.vflow` cho các bước.

```html
<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>{{CODE}} — {{TITLE}} | HESEM QMS</title>
<link href="{{RELATIVE_PATH}}/assets/style.css" rel="stylesheet"/>
<style>
/* ── Training-specific CSS ── */
.chip{display:inline-block;padding:2px 10px;border-radius:999px;border:1px solid #d7dee7;background:#f8fafc;font-size:11px;margin-right:6px;margin-bottom:6px;font-weight:600}
.tight li{margin:4px 0}
.grid-2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.toc{border:1px solid var(--ln);border-radius:var(--r);padding:16px;background:var(--bg2);margin:18px 0 24px}
.toc-title{font-size:12px;font-weight:700;color:var(--navy);text-transform:uppercase;letter-spacing:.4px;margin-bottom:10px}
.toc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px}
.toc-grid a{display:block;padding:8px 10px;border:1px solid var(--ln);border-radius:6px;background:var(--bg);font-size:12px;color:var(--ink)}
.objective-list{list-style:none;margin:0;padding:0}
.objective-list li{padding:8px 12px;border:1px solid var(--ln);border-left:4px solid var(--blue);border-radius:var(--r-sm);margin:6px 0;background:var(--bg);font-size:13px}
.quiz-card{border:1px solid var(--ln);border-radius:var(--r);padding:16px;margin:12px 0;background:var(--bg)}
.quiz-card h3{margin:0 0 8px;font-size:14px;color:var(--navy)}
.duration-badge{display:inline-flex;padding:4px 12px;border-radius:var(--r-sm);font-size:11px;font-weight:700;background:var(--blue-l);color:var(--blue)}
.small{font-size:12px}
table{max-width:100%;table-layout:auto}
td,th{max-width:420px;overflow-wrap:break-word;word-wrap:break-word;vertical-align:top}
@media print{.card,.table-card,.callout,.note,.box,.quiz-card,.objective-list li,.vstep{page-break-inside:avoid;break-inside:avoid}h1,h2,h3,.h1,.h2,.h3{page-break-after:avoid;break-after:avoid}tr{page-break-inside:avoid;break-inside:avoid}thead{display:table-header-group}}
@media(max-width:960px){.grid-2{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="container"><div class="page"><div class="page-body">

<!-- FORM HEADER -->
<div class="form-header">
<div class="fh-left">
<a class="brand-logo" href="{{RELATIVE_PATH}}/01-QMS-Portal/portal.html"><img alt="HESEM Logo" src="{{RELATIVE_PATH}}/assets/hesem-logo.svg"/></a>
<div class="fh-company">
<a href="{{RELATIVE_PATH}}/01-QMS-Portal/portal.html">HESEM ENGINEERING</a>
<span>Tài liệu đào tạo</span>
</div>
</div>
<div class="title">
<strong>{{CODE}} — {{TITLE}}</strong>
<span class="sub-vn">{{SUBTITLE}}</span>
</div>
<div class="meta">
<div class="row"><span><b>Code:</b></span><span>{{CODE}}</span></div>
<div class="row"><span><b>Version:</b></span><span>V0</span></div>
<div class="row"><span><b>Effective Date:</b></span><span>Theo quyết định ban hành</span></div>
<div class="row"><span><b>Owner:</b></span><span>{{OWNER}}</span></div>
<div class="row"><span><b>Approved by:</b></span><span>Tổng Giám đốc</span></div>
</div>
</div>

<div class="doc-content" id="docContent"><div class="form-sheet">

<!-- BADGE + THÔNG TIN KHÓA HỌC -->
<div class="card">
<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:12px">
<span class="badge">{{LEVEL}}</span>
<!-- Level: NHẬP MÔN / CƠ BẢN / NÂNG CAO / CHUYÊN GIA -->
<span class="duration-badge">Thời lượng: {{DURATION}}</span>
</div>
<p class="lead">Mô tả ngắn về khóa đào tạo.</p>
<div class="grid-2" style="margin-top:12px">
<div><b class="small">Đối tượng:</b><p class="small">{{TARGET_AUDIENCE}}</p></div>
<div><b class="small">Điều kiện tiên quyết:</b><p class="small">{{PREREQUISITES}}</p></div>
</div>
</div>

<!-- MỤC TIÊU HỌC TẬP -->
<h2 class="h2">Mục tiêu học tập</h2>
<ul class="objective-list">
<li>Sau khóa học, học viên có thể ...</li>
<li>Sau khóa học, học viên có thể ...</li>
</ul>

<!-- MỤC LỤC -->
<div class="toc"><div class="toc-title">Nội dung khóa học</div><div class="toc-grid">
<a href="#m1">Bài 1: ...</a>
<a href="#m2">Bài 2: ...</a>
<a href="#m3">Bài 3: ...</a>
<a href="#quiz">Kiểm tra</a>
</div></div>

<!-- BÀI HỌC -->
<h2 class="h2" id="m1">Bài 1: Tên bài</h2>
<p>Nội dung bài học ...</p>
<!-- Dùng .note cho lưu ý, .callout cho quan trọng, .vflow cho bước thực hành -->

<h2 class="h2" id="m2">Bài 2: Tên bài</h2>
<p>Nội dung bài học ...</p>

<!-- KIỂM TRA -->
<h2 class="h2" id="quiz">Kiểm tra kiến thức</h2>
<div class="quiz-card">
<h3>Câu 1</h3>
<p>Nội dung câu hỏi?</p>
<ul class="tight">
<li>A. Phương án A</li>
<li>B. Phương án B</li>
<li>C. Phương án C</li>
</ul>
</div>

<!-- TIÊU CHÍ ĐẠT -->
<h2 class="h2">Tiêu chí đạt</h2>
<div class="table-card"><table class="table">
<thead><tr><th>Hạng mục</th><th>Điều kiện đạt</th></tr></thead>
<tbody>
<tr><td>Lý thuyết</td><td>Trả lời đúng &ge; 80% câu kiểm tra</td></tr>
<tr><td>Thực hành</td><td>Hoàn thành bài thực hành dưới giám sát</td></tr>
</tbody>
</table></div>

</div></div>
</div></div></div>
<div class="no-screen print-disclaimer">Bản in không có đóng dấu kiểm soát phiên bản thì tài liệu này không có giá trị. Chỉ sử dụng phiên bản hiện hành trên hệ thống HESEM QMS.</div>
</body>
</html>
```

---

## Template 6: Department Handbook (Sổ tay phòng ban)

Handbook dùng `.org-tree`, `.org-card`, `.org-level` cho sơ đồ tổ chức, `.phase-card` cho giai đoạn, `.kpi-box` cho KPI.

```html
<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>{{DEPARTMENT}} — Phòng ban Sổ tay | HESEM QMS</title>
<link href="{{RELATIVE_PATH}}/assets/style.css" rel="stylesheet"/>
<style>
/* ── Dept Handbook CSS ── */
@media print{
 .card,.table-card,.callout,.note,.box,.iso-map,.preface-block,.form-sheet,.lane,.legend,.req,.vstep,.auth-grid,.backup-card,.org-row{page-break-inside:avoid;break-inside:avoid}
 h1,h2,h3,.h1,.h2,.h3{page-break-after:avoid;break-after:avoid}
 .form-header{page-break-inside:avoid;break-inside:avoid}
 tr{page-break-inside:avoid;break-inside:avoid}
 thead{display:table-header-group}tfoot{display:table-footer-group}p{orphans:3;widows:3}
 .table-card{overflow:visible !important}
}
.page-body{overflow-x:hidden}
.table-card,.table-block,.table-wrap{overflow-x:auto;max-width:100%}
table{max-width:100%;table-layout:auto}
td,th{max-width:420px;overflow-wrap:break-word;word-wrap:break-word}

/* Org tree */
.org-tree{display:flex;flex-direction:column;gap:16px;margin:8px 0}
.org-level{display:grid;gap:14px}
.org-level.cols-1{grid-template-columns:1fr}
.org-level.cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}
.org-level.cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}
.org-level.cols-4{grid-template-columns:repeat(4,minmax(0,1fr))}
.org-level.cols-5{grid-template-columns:repeat(5,minmax(0,1fr))}
.org-card{border:1px solid var(--ln);border-top:4px solid var(--blue);border-radius:var(--r);padding:14px;background:var(--bg)}
.org-card h3{font-size:14px;color:var(--navy);margin:0 0 4px}
.org-card p{margin:4px 0;font-size:12px}
.org-row{border:1px solid var(--ln);border-radius:var(--r);padding:14px;background:var(--bg);margin:12px 0}
.org-row h3{margin:0 0 8px;font-size:13px;color:var(--navy)}

/* Authority & Backup */
.auth-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:10px 0 16px}
.auth-item{padding:12px 14px;border:1px solid var(--ln);border-radius:8px;background:var(--bg2)}
.backup-card{padding:14px 16px;border:1px solid var(--ln);border-left:4px solid #0f766e;border-radius:8px;background:var(--bg2);margin:10px 0 0}

/* Phase card */
.phase-card{border:1px solid var(--ln);border-left:4px solid var(--gold);border-radius:var(--r);padding:14px;background:#fffdf5;margin:12px 0}
.phase-card h3{margin:0 0 6px;font-size:14px;color:var(--navy)}

/* Misc */
.badge-soft{display:inline-block;padding:2px 8px;border-radius:999px;background:var(--blue-l);color:var(--navy);font-size:10px;font-weight:700;margin-right:6px;margin-bottom:6px}
.kpi-box{border:1px solid var(--ln);border-radius:var(--r);padding:12px;background:var(--bg);margin:8px 0}
.kpi-box b{display:block;font-size:11px;color:var(--navy);text-transform:uppercase;letter-spacing:.3px;margin-bottom:4px}
.small-note{font-size:12px;color:var(--ink2)}
.doc-link-list{list-style:none;margin:0;padding:0}
.doc-link-list li{padding:6px 0 6px 16px;position:relative}
.doc-link-list li:before{content:"\2022";position:absolute;left:0;color:var(--blue)}
.toc{border:1px solid var(--ln);border-radius:var(--r);padding:16px;background:var(--bg);margin:0 0 18px}
.toc-title{font-weight:700;color:var(--navy);margin-bottom:10px}
.toc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}
.toc-grid a{display:block;padding:10px 12px;border:1px solid var(--ln);border-radius:8px;background:var(--bg2)}
.metric-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin:14px 0}
.metric-card{border:1px solid var(--ln);border-radius:var(--r);padding:14px;background:var(--bg)}
.metric-card .value{font-weight:800;font-size:18px;color:var(--navy);margin:6px 0}
.metric-card .label{font-size:11px;text-transform:uppercase;letter-spacing:.4px;color:var(--ink2);font-weight:700}
@media(max-width:960px){.auth-grid,.org-level{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="container"><div class="page"><div class="page-body">

<!-- FORM HEADER -->
<div class="form-header">
<div class="fh-left">
<a class="brand-logo" href="{{RELATIVE_PATH}}/01-QMS-Portal/portal.html"><img alt="HESEM Logo" src="{{RELATIVE_PATH}}/assets/hesem-logo.svg"/></a>
<div class="fh-company">
<a href="{{RELATIVE_PATH}}/01-QMS-Portal/portal.html">HESEM ENGINEERING</a>
<span>Tài liệu kiểm soát</span>
</div>
</div>
<div class="title">
<strong>{{DEPARTMENT}} — Phòng ban Sổ tay</strong>
<span class="sub-vn">Sổ tay vận hành phòng {{DEPARTMENT}}</span>
</div>
<div class="meta">
<div class="row"><span><b>Code:</b></span><span>DEPT-{{DEPT_CODE}}-HANDBOOK</span></div>
<div class="row"><span><b>Version:</b></span><span>V0</span></div>
<div class="row"><span><b>Effective Date:</b></span><span>Theo quyết định ban hành</span></div>
<div class="row"><span><b>Owner:</b></span><span>{{DEPT_HEAD}}</span></div>
<div class="row"><span><b>Approved by:</b></span><span>Tổng Giám đốc</span></div>
</div>
</div>

<div class="doc-content" id="docContent"><div class="form-sheet">

<!-- TOC -->
<div class="toc"><div class="toc-title">Mục lục</div><div class="toc-grid">
<a href="#s1">1. Sứ mệnh &amp; phạm vi</a>
<a href="#s2">2. Sơ đồ tổ chức</a>
<a href="#s3">3. Vai trò &amp; trách nhiệm</a>
<a href="#s4">4. Quy trình chính</a>
<a href="#s5">5. KPI phòng ban</a>
<a href="#s6">6. Tài liệu &amp; JD liên kết</a>
</div></div>

<!-- 1. SỨ MỆNH -->
<h2 class="h2" id="s1">1. Sứ mệnh &amp; phạm vi</h2>
<div class="jd-mission">
<p>Sứ mệnh của phòng {{DEPARTMENT}}: ...</p>
</div>

<!-- 2. SƠ ĐỒ TỔ CHỨC — dùng org-tree -->
<h2 class="h2" id="s2">2. Sơ đồ tổ chức</h2>
<div class="org-tree">
<!-- Cấp 1: Trưởng phòng -->
<div class="org-level cols-1">
<div class="org-card">
<h3>{{DEPT_HEAD_TITLE}}</h3>
<p>Quản lý toàn bộ hoạt động phòng.</p>
<p class="small-note">JD: <a href="...">JD-xxx</a></p>
</div>
</div>
<!-- Cấp 2: Nhóm trưởng / chuyên viên -->
<div class="org-level cols-3">
<div class="org-card"><h3>Vị trí A</h3><p>Mô tả ngắn.</p></div>
<div class="org-card"><h3>Vị trí B</h3><p>Mô tả ngắn.</p></div>
<div class="org-card"><h3>Vị trí C</h3><p>Mô tả ngắn.</p></div>
</div>
</div>

<!-- 3. VAI TRÒ & TRÁCH NHIỆM -->
<h2 class="h2" id="s3">3. Vai trò &amp; trách nhiệm</h2>
<!-- Dùng org-row cho từng nhóm vai trò -->
<div class="org-row">
<h3>Nhóm vai trò A</h3>
<p>Mô tả trách nhiệm chính của nhóm.</p>
<div style="margin-top:8px">
<span class="badge-soft">SOP liên quan</span>
<span class="badge-soft">WI liên quan</span>
</div>
</div>

<!-- 4. QUY TRÌNH CHÍNH -->
<h2 class="h2" id="s4">4. Quy trình chính</h2>
<!-- Dùng phase-card cho từng quy trình / giai đoạn -->
<div class="phase-card">
<h3>Giai đoạn 1: Tên giai đoạn</h3>
<p>Mô tả. Tham chiếu: <a href="...">SOP-xxx</a>.</p>
</div>
<div class="phase-card">
<h3>Giai đoạn 2: Tên giai đoạn</h3>
<p>Mô tả.</p>
</div>

<!-- 5. KPI PHÒNG BAN -->
<h2 class="h2" id="s5">5. KPI phòng ban</h2>
<div class="metric-grid">
<div class="metric-card"><div class="value">95%</div><div class="label">KPI 1</div></div>
<div class="metric-card"><div class="value">&le; 2 ngày</div><div class="label">KPI 2</div></div>
<div class="metric-card"><div class="value">100%</div><div class="label">KPI 3</div></div>
</div>

<!-- 6. TÀI LIỆU LIÊN KẾT -->
<h2 class="h2" id="s6">6. Tài liệu &amp; JD liên kết</h2>
<div class="grid-2">
<div>
<h3 class="h3">SOP / WI</h3>
<ul class="doc-link-list">
<li><a href="...">SOP-xxx — Tên SOP</a></li>
<li><a href="...">WI-xxx — Tên WI</a></li>
</ul>
</div>
<div>
<h3 class="h3">JD</h3>
<ul class="doc-link-list">
<li><a href="...">JD-xxx — Tên JD</a></li>
</ul>
</div>
</div>

</div></div>
</div></div></div>
<div class="no-screen print-disclaimer">Bản in không có đóng dấu kiểm soát phiên bản thì tài liệu này không có giá trị. Chỉ sử dụng phiên bản hiện hành trên hệ thống HESEM QMS.</div>
</body>
</html>
```

---

## Ghi chú chung cho tất cả template

### Form Header

- `fh-company > span` thay đổi theo loại tài liệu:
  - SOP, JD, Handbook: `Tài liệu kiểm soát`
  - WI: `Tài liệu vận hành &bull; Công việc Hướng dẫn`
  - ANNEX: `Tài liệu vận hành &bull; Annex số hóa`
  - Training: `Tài liệu đào tạo`

### Relative Path

- SOP (trong `03-Tai-Lieu-Van-Hanh/01-SOPs/xx-SOP-xxx/`): `../../..`
- WI (trong `03-Tai-Lieu-Van-Hanh/02-Work-Instructions/xx-WI-xxx/`): `../../..`
- ANNEX (trong `03-Tai-Lieu-Van-Hanh/03-Reference/xx-ANNEX-xxx/`): `../../..` hoặc `../../../..`
- JD (trong `02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/xx-JD-xxx/`): `../../../..`
- Handbook (trong `02-Tai-Lieu-He-Thong/03-Organization/02-Department-Handbooks/`): `../../..`

### Print disclaimer

Luôn đặt ngay trước `</body>`:

```html
<div class="no-screen print-disclaimer">Bản in không có đóng dấu kiểm soát phiên bản thì tài liệu này không có giá trị. Chỉ sử dụng phiên bản hiện hành trên hệ thống HESEM QMS.</div>
```

### In-page CSS

Mỗi tài liệu có block `<style>` riêng trong `<head>` để khai báo các class bổ sung chưa có trong `style.css`. Lý do: style.css chỉ chứa class cốt lõi; các class chuyên dụng (metric-grid, gate-grid, comp-grid...) được khai báo inline để giữ style.css gọn nhẹ.
