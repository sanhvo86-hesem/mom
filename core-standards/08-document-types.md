# 08 — Standard structure by document type

> Version: V0 | Effective: 2025-06-01 | Owner: QMS Engineer

---

## 1. SOP — Standard Operating Procedure (10 sections)

Every HESEM SOP MUST have 10 sections in the following order. Do NOT skip sections, DO NOT change the order.

Note the key:

- This document only locks `cấu trúc` and `format`.
- Do not use this file to legitimize mass content upgrades according to the same set of sample sentences.
- Graphics, palettes, table format and HTML skeleton can be standardized to a core-standard level.
- The content of Section 1 / 2 / 3 / 4 / 5 / 6 / 7 / 8 must be studied according to each SOP.

### Required structure

| Section | Title | Main content |
|---------|---------|---------------|
| 1 | Purpose | 1 opening sentence + 3-5 bullets, follow the risk of being blocked and the output must be locked of that SOP |
| 2 | Scope | `Có bao phủ` + `Không thay thế`, tracking start/end points and real handoff |
| 3 | Terminology & Principles | 2-column table: actual terms used in gate/step |
| 4 | Roles, Authority & RACI | Role table or RACI matrix, but must clearly show permission to block/remove hold |
| 5 | Inputs, Outputs & Prerequisites | 4 field boxes capture the state before the first step and after the last step |
| 6 | Control gates, mandatory stops & KPIs | IG table, actual KPIs with numbers/SLA, do not use gate cards |
| 7 | Detailed process | Flowchart + detailed step heading + hold/handoff follow the true flow |
| 8 | Exceptions, changes & redo | The exception situation table holds/restart/revalidation/change path |
| 9 | Systems, records & data | Table mapping: System -> Data -> Responsibilities -> Storage |
| 10 | Forms, WI, SOP & JD links | Document code table + name + link |

### HTML skeleton

```html
<section id="s1-purpose" class="sop-section">
  <h2>1. Mục đích</h2>
  <ul>
    <li>Động từ + nội dung...</li>
  </ul>
</section>

<section id="s2-scope" class="sop-section">
  <h2>2. Phạm vi</h2>
  <div class="scope-in">
    <h3>Có bao phủ</h3>
    <ul>...</ul>
  </div>
  <div class="scope-out">
    <h3>Không thay thế</h3>
    <ul>...</ul>
  </div>
</section>

<section id="s3-terms" class="sop-section">
  <h2>3. Thuật ngữ & nguyên tắc</h2>
  <table class="term-table">
    <thead><tr><th>Thuật ngữ</th><th>Quy định sử dụng</th></tr></thead>
    <tbody>...</tbody>
  </table>
</section>

<section id="s4-roles" class="sop-section">
  <h2>4. Vai trò, quyền hạn & RACI</h2>
  <table class="role-table">
    <thead><tr><th>Vai trò</th><th>Trách nhiệm</th><th>Quyền / Điểm chặn</th></tr></thead>
    <tbody>...</tbody>
  </table>
</section>

<section id="s5-io" class="sop-section">
  <h2>5. Đầu vào, đầu ra & điều kiện tiên quyết</h2>
  <div class="io-grid">
    <div class="io-box io-input"><h4>Đầu vào</h4><ul>...</ul></div>
    <div class="io-box io-output"><h4>Đầu ra</h4><ul>...</ul></div>
    <div class="io-box io-prereq"><h4>Điều kiện tiên quyết</h4><ul>...</ul></div>
    <div class="io-box io-trigger"><h4>Trigger</h4><ul>...</ul></div>
  </div>
</section>

<section id="s6-gates" class="sop-section">
  <h2>6. Cổng kiểm soát, điểm dừng bắt buộc & KPI</h2>
  <table class="table">
    <thead><tr><th>IG</th><th>Cổng kiểm soát & mục tiêu</th><th>Chủ trì</th><th>Điểm dừng bắt buộc</th><th>KPI / hồ sơ tối thiểu</th></tr></thead>
    <tbody>
      <tr><td>IG2</td><td>Tên cổng</td><td>Ai giữ cổng</td><td>Điều kiện HOLD/RELEASE</td><td>Ngưỡng số / SLA / FRM-XXX</td></tr>
    </tbody>
  </table>
</section>

<section id="s7-procedure" class="sop-section">
  <h2>7. Quy trình chi tiết</h2>
  <div class="flowchart">...</div>
  <h3><span class="proc-num">1</span> Tên bước</h3>
  <p>Mô tả ngắn.</p>
  <ul><li>Hành động thật.</li></ul>
  <div class="note-soft">Điểm dừng bắt buộc.</div>
  <div class="role-note">Bàn giao bắt buộc.</div>
</section>

<section id="s8-exceptions" class="sop-section">
  <h2>8. Ngoại lệ, thay đổi & làm lại</h2>
  <table class="table">
    <thead><tr><th>Tình huống</th><th>Quy tắc xử lý bắt buộc</th><th>Chủ trì</th><th>Người gỡ hold</th><th>Hồ sơ</th></tr></thead>
    <tbody><tr><td>...</td><td>...</td><td>...</td><td>...</td><td>...</td></tr></tbody>
  </table>
</section>

<section id="s9-systems" class="sop-section">
  <h2>9. Hệ thống, hồ sơ & dữ liệu</h2>
  <table class="system-table">
    <thead><tr><th>Hệ thống</th><th>Dữ liệu</th><th>Trách nhiệm</th><th>Lưu trữ</th></tr></thead>
    <tbody>...</tbody>
  </table>
</section>

<section id="s10-links" class="sop-section">
  <h2>10. Biểu mẫu, WI, SOP & JD liên kết</h2>
  <table class="link-table">
    <thead><tr><th>Ma</th><th>Tên tài liệu</th><th>Liên kết</th></tr></thead>
    <tbody>...</tbody>
  </table>
</section>
```

---

## 2. WI — Work Instruction (7 sections)

WI is a specific operating instruction, more detailed than SOP. Write step-by-step.

### Required structure

| Section | Title | Main content |
|---------|---------|---------------|
| 1 | Purpose | 2-3 bullets, describe how this WI helps |
| 2 | Scope & object of application | Applies to whom, where, when |
| 3 | Necessary tools, supplies & documents | List of tools, supplies, reference documents |
| 4 | Prerequisites | Conditions MUST be satisfied before starting |
| 5 | Implementation steps | Step-by-step, 1 action per step |
| 6 | Records & Evidence | What records need to be recorded and where to save them |
| 7 | Related documents | Code table + name + link |

### HTML skeleton

```html
<section id="wi-s1" class="wi-section">
  <h2>1. Mục đích</h2>
  <ul>...</ul>
</section>

<section id="wi-s2" class="wi-section">
  <h2>2. Phạm vi & đối tượng áp dụng</h2>
  <ul>...</ul>
</section>

<section id="wi-s3" class="wi-section">
  <h2>3. Công cụ, vật tư & tài liệu cần thiết</h2>
  <table class="tool-table">
    <thead><tr><th>Hạng mục</th><th>Mô tả</th><th>Ghi chú</th></tr></thead>
    <tbody>...</tbody>
  </table>
</section>

<section id="wi-s4" class="wi-section">
  <h2>4. Điều kiện tiên quyết</h2>
  <ul>
    <li>Điều kiện 1...</li>
  </ul>
</section>

<section id="wi-s5" class="wi-section">
  <h2>5. Các bước thực hiện</h2>
  <div class="step-block">
    <h3>Bước 1: Tên bước</h3>
    <p>Mô tả hành động cụ thể.</p>
    <div class="note-soft">Ghi chú (nếu có).</div>
  </div>
  <!-- Lặp lại cho các bước tiếp theo -->
</section>

<section id="wi-s6" class="wi-section">
  <h2>6. Hồ sơ & bằng chứng</h2>
  <table class="record-table">
    <thead><tr><th>Hồ sơ</th><th>Nội dung</th><th>Lưu trữ</th><th>Trách nhiệm</th></tr></thead>
    <tbody>...</tbody>
  </table>
</section>

<section id="wi-s7" class="wi-section">
  <h2>7. Tài liệu liên quan</h2>
  <table class="link-table">
    <thead><tr><th>Ma</th><th>Tên tài liệu</th><th>Liên kết</th></tr></thead>
    <tbody>...</tbody>
  </table>
</section>
```

### Guidelines for writing WI

- Every step STARTS with an imperative verb: "Set", "Open", "Check", "Record", "Report".
- Every step has only 1 action. DO NOT combine multiple actions.
- If the step is conditional: write "If [condition], then [action]."
- If the step has a warning: use `<div class="note-warning">` before the step.
- Finish with the documents to be recorded + the person checking.

---

## 3. ANNEX — Reference appendix (Rule-pack format)

ANNEX is a reference document containing rules, tables, methods, matrices. Flexible structure according to content.

### Required component

| Ingredients | Description | Required |
|-----------|-------|---------|
| iso-map | Clause linkage table ISO 9001/AS9100D | MUST |
| Sections | Content sections, numbered | MUST |
| Tables | Data tables, rules, matrices | MUST (min 1) |
| Header (meta) | Ma, rev, effect, owner | MUST |

### ANNEX forms

| Format | Example | Features |
|------|-------|---------|
| Reference data | ANNEX-302 Approved Materials List | Bang list, have filter |
| Matrix | ANNEX-120 Authority Matrix | 2-way table: roles x permissions |
| Method | ANNEX-601 AQL Method Reference | Calculation and investigation process |
| Rules | ANNEX-501 Dispatch Capacity WIP Rules | Conditions + performance |
| Map | ANNEX-106 ISO 9001 Matrix Full | Clause -> documents -> documents |
| Topology | ANNEX-133 M365 Site Topology | Directory structure, site, library |

### HTML skeleton

```html
<section id="annex-iso-map" class="annex-section">
  <h2>Liên kết ISO</h2>
  <table class="iso-map">
    <thead><tr><th>Clause</th><th>Yêu cầu</th><th>Tài liệu liên quan</th></tr></thead>
    <tbody>...</tbody>
  </table>
</section>

<section id="annex-s1" class="annex-section">
  <h2>1. Ten phan</h2>
  <!-- Nội dung: bang, danh sach, quy tac -->
</section>
```

### Nguyen Tac Viet ANNEX

- DO NOT write in the same manner. Dung state and list.
- Every table MUST have a clear header.
- Record source/source for each rule (ISO clause, standard, customer requirement).
- Name sections according to content, not according to revenue and structure.

---

## 4. JD — Job Description (6 sections)

### Required structure

| Section | Title | CSS class | Content |
|---------|---------|-----------|---------|
| 1 | Purpose & mission | `jd-purpose`, `jd-mission` | 2-3 sentences: why the role exists and what business purpose it serves |
| 2 | Main Responsibilities | `resp-table` | Table: STT \| Responsibility \| Frequency \| Profile |
| 3 | Authority | `auth-grid` | Table: Decision \| Range \| Limit \| Report to |
| 4 | Competency & capability | `comp-grid` | Grid: current level \| Dreyfus stage \| required/premium expectation |
| 5 | Backup person | `backup-card` | Card: Backup role + activation condition |
| 6 | Related documents | `link-table` | Code table + name + link |

### HTML skeleton

```html
<section id="jd-s1" class="jd-section">
  <div class="jd-purpose">
    <h2>1. Mục đích</h2>
    <p>Vi tri nay chiu trach nhiem...</p>
  </div>
  <div class="jd-mission">
    <p><strong>Su menh:</strong> Mô tả ngắn su menh cua vi tri.</p>
  </div>
</section>

<section id="jd-s2" class="jd-section">
  <h2>2. Trách nhiệm chinh</h2>
  <table class="resp-table">
    <thead><tr><th>#</th><th>Trách nhiệm</th><th>Tần suất</th><th>Hồ sơ</th></tr></thead>
    <tbody>
      <tr><td>1</td><td>Nội dung trach nhiem</td><td>Hang ngay</td><td>FRM-XXX</td></tr>
    </tbody>
  </table>
</section>

<section id="jd-s3" class="jd-section">
  <h2>3. Thẩm quyền</h2>
  <div class="auth-grid">
    <table>
      <thead><tr><th>Quyết định</th><th>Phạm vi</th><th>Giới hạn</th><th>Báo cáo cho</th></tr></thead>
      <tbody>...</tbody>
    </table>
  </div>
</section>

<section id="jd-s4" class="jd-section">
  <h2>4. Nang luc yeu cau</h2>
  <div class="comp-grid">
    <table>
      <thead><tr><th>Nang luc</th><th>Muc do (Dreyfus)</th><th>Bắt buộc / Uu tien</th></tr></thead>
      <tbody>...</tbody>
    </table>
  </div>
</section>

<section id="jd-s5" class="jd-section">
  <h2>5. Người dự phòng</h2>
  <div class="backup-card">
    <p><strong>Dự phòng chinh:</strong> Ten vai trò</p>
    <p><strong>Dieu kien kích hoạt:</strong> Khi người giu vi tri vắng mặt tren 1 ngay lam viec.</p>
    <p><strong>Phạm vi dự phòng:</strong> Toan bo / Chi cac muc uu tien cao.</p>
  </div>
</section>

<section id="jd-s6" class="jd-section">
  <h2>6. Tài liệu liên quan</h2>
  <table class="link-table">
    <thead><tr><th>Ma</th><th>Tên tài liệu</th><th>Liên kết</th></tr></thead>
    <tbody>...</tbody>
  </table>
</section>
```

### Nguyen tac writes JD

- Responsibility for writing is complete, DO NOT write paragraphs.
- Every line of responsibility has a frequency (Daily / Weekly / Monthly / As needed).
- Auth-grid records the limit: "Approved PO under $5,000" instead of "Approved PO".
- Instructions for using the Dreyfus scale in 5 steps: Novice, Advanced Beginner, Competent, Proficient, Expert.

---

## 5. Department Handbook (6 sections)

### Required structure

| Section | Title | Content |
|---------|---------|---------|
| 1 | Department overview | Mission, goals, position in the organization |
| 2 | Functional scope | Main functions undertaken by the department |
| 3 | Organization chart | Organizational tree (org-tree) of the department |
| 4 | Main process | List of main SOPs that departments own or participate in |
| 5 | Departmental KPI | KPI table: indicators, goals, measurements, frequency |
| 6 | SOP/WI/Form Link | Bang ma related documents |

### HTML skeleton

```html
<section id="dept-s1" class="dept-section">
  <h2>1. Tổng quan phòng ban</h2>
  <div class="dept-overview">
    <p><strong>Su menh:</strong> ...</p>
    <p><strong>Bao cao cho:</strong> ...</p>
    <p><strong>So nhan su:</strong> ...</p>
  </div>
</section>

<section id="dept-s2" class="dept-section">
  <h2>2. Phạm vi chuc nang</h2>
  <ul>
    <li>Chuc nang 1</li>
    <li>Chuc nang 2</li>
  </ul>
</section>

<section id="dept-s3" class="dept-section">
  <h2>3. So do to chuc</h2>
  <div class="org-tree">
    <!-- Cấu trúc cay to chuc -->
  </div>
</section>

<section id="dept-s4" class="dept-section">
  <h2>4. Quy trinh chinh</h2>
  <table>
    <thead><tr><th>SOP</th><th>Tên</th><th>Vai trò phòng ban</th></tr></thead>
    <tbody>...</tbody>
  </table>
</section>

<section id="dept-s5" class="dept-section">
  <h2>5. KPI phòng ban</h2>
  <table class="kpi-table">
    <thead><tr><th>KPI</th><th>Mục tiêu</th><th>Đo lường</th><th>Tần suất</th></tr></thead>
    <tbody>...</tbody>
  </table>
</section>

<section id="dept-s6" class="dept-section">
  <h2>6. Liên kết SOP/WI/Form</h2>
  <table class="link-table">
    <thead><tr><th>Ma</th><th>Tên tài liệu</th><th>Liên kết</th></tr></thead>
    <tbody>...</tbody>
  </table>
</section>
```

---

## 6. Training Module — C01 to C19 (6 sections)

### Required structure

| Section | Title | Content |
|---------|---------|---------|
| 1 | Deployment information | Subjects, salary, participation conditions, form |
| 2 | Fast times | List of components in module |
| 3 | Content of divorce | Sections: facts, states, images |
| 4 | Because of the fact | Case study, practical situation at HESEM |
| 5 | Exercises | Test questions, instructions, test questions |
| 6 | Checklist of famous people | Checklist of registered/unregistered students |

### HTML skeleton

```html
<section id="train-s1" class="train-section">
  <h2>1. Thong tin triển khai</h2>
  <table class="deploy-info">
    <tr><th>Đối tượng</th><td>...</td></tr>
    <tr><th>Thoi luong</th><td>... gio</td></tr>
    <tr><th>Dieu kien</th><td>...</td></tr>
    <tr><th>Hinh thuc</th><td>Truc tiep / Online / Tu hoc</td></tr>
    <tr><th>Danh gia</th><td>Quiz + OJT checklist</td></tr>
  </table>
</section>

<section id="train-s2" class="train-section">
  <h2>2. Muc luc nhanh</h2>
  <ol>
    <li><a href="#train-s3-1">Phan 1: ...</a></li>
    <li><a href="#train-s3-2">Phan 2: ...</a></li>
  </ol>
</section>

<section id="train-s3" class="train-section">
  <h2>3. Nội dung ly thuyet</h2>
  <div id="train-s3-1">
    <h3>3.1 Ten phan</h3>
    <p>Nội dung...</p>
  </div>
</section>

<section id="train-s4" class="train-section">
  <h2>4. Vi du thuc te</h2>
  <div class="case-study">
    <h3>Tình huống 1</h3>
    <p><strong>Boi canh:</strong> ...</p>
    <p><strong>Van de:</strong> ...</p>
    <p><strong>Giai phap:</strong> ...</p>
    <p><strong>Kết quả:</strong> ...</p>
  </div>
</section>

<section id="train-s5" class="train-section">
  <h2>5. Bai tap thuc hanh</h2>
  <div class="exercise">
    <h3>Bai tap 1</h3>
    <p>Yêu cầu: ...</p>
    <p>Tài liệu can: ...</p>
    <p>Thời gian: ... phut</p>
  </div>
</section>

<section id="train-s6" class="train-section">
  <h2>6. Checklist danh gia</h2>
  <table class="eval-checklist">
    <thead><tr><th>#</th><th>Tiêu chí</th><th>Dat</th><th>Chua dat</th><th>Ghi chú</th></tr></thead>
    <tbody>
      <tr><td>1</td><td>Tiêu chí 1</td><td></td><td></td><td></td></tr>
    </tbody>
  </table>
</section>
```

### Nguyen tac viet Training Module

- The content of the essay is short, focusing on "need to know to do" NOT "need to know to know".
- Because the equipment MUST be made from HESEM (CNC machining, semiconductor parts, ISO 9001).
- The work report MUST be done in the workplace with documents and current documents.
- Checklist of names to check when necessary, using the Dreyfus scale as reference.

---

## 7. State of totality

| Features | SOP | WI | ANNEX | JD | Dept HB | Training |
|----------|-----|----|-------|----|---------| ---------|
| So section | 10 | 7 | Flexibility | 6 | 6 | 6 |
| Gate/checkpoint | Co | No | No | No | No | Co (checklist) |
| RACI | Co (Section 4) | No | No | Co (Section 3) | No | No |
| KPI | Co (Section 6) | No | No | No | Co (Section 5) | No |
| Step-by-step | Co (Section 7) | Co (Section 5) | No | No | No | Co (Section 5) |
| iso-map | No | No | Co | No | No | No |
| State data | Co | Co | MUST have | Co | Co | Co |
| Documentation link | Co (Section 10) | Co (Section 7) | Co | Co (Section 6) | Co (Section 6) | No |
