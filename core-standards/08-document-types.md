# 08 — Cấu trúc chuẩn theo loại tài liệu

> Phiên bản: V0 | Hiệu lực: 2025-06-01 | Chủ sở hữu: QMS Engineer

---

## 1. SOP — Standard Operating Procedure (10 section)

Mọi SOP của HESEM PHẢI có đủ 10 section theo thứ tự sau. KHÔNG được bỏ section, KHÔNG được đổi thứ tự.

### Cấu trúc bắt buộc

| Section | Tiêu đề | Nội dung chính |
|---------|---------|---------------|
| 1 | Mục đích | 3-5 bullet, mỗi bullet bắt đầu bằng động từ |
| 2 | Phạm vi | "Có bao phủ" + "Không thay thế" |
| 3 | Thuật ngữ & nguyên tắc | Bảng 2 cột: Thuật ngữ \| Quy định sử dụng |
| 4 | Vai trò, quyền hạn & RACI | Bảng 3 cột: Vai trò \| Trách nhiệm \| Quyền/Điểm chặn |
| 5 | Đầu vào, đầu ra & điều kiện tiên quyết | 4 field boxes: Input, Output, Prerequisites, Trigger |
| 6 | Cổng kiểm soát, điểm dừng bắt buộc & KPI | Gate cards + KPI metrics table |
| 7 | Quy trình chi tiết | Mọi gate: h3 + mô tả + ul + note-soft + role-note |
| 8 | Ngoại lệ, thay đổi & làm lại | Bulleted list: tình huống + hành động + người quyết định |
| 9 | Hệ thống, hồ sơ & dữ liệu | Table mapping: Hệ thống -> Dữ liệu -> Trách nhiệm -> Lưu trữ |
| 10 | Biểu mẫu, WI, SOP & JD liên kết | Bảng mã tài liệu + tên + link |

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
  <div class="gate-card">
    <h3>G2 — Tên gate</h3>
    <p><strong>PASS:</strong> điều kiện</p>
    <p><strong>HOLD/FAIL:</strong> điều kiện</p>
    <p><strong>Vai trò:</strong> ai quyết định</p>
    <p><strong>Hồ sơ:</strong> FRM-XXX</p>
  </div>
  <table class="kpi-table">
    <thead><tr><th>KPI</th><th>Mục tiêu</th><th>Đo lường</th><th>Tần suất</th></tr></thead>
    <tbody>...</tbody>
  </table>
</section>

<section id="s7-procedure" class="sop-section">
  <h2>7. Quy trình chi tiết</h2>
  <h3>G2 — Tên gate</h3>
  <p>Mô tả ngắn.</p>
  <ul>
    <li>Bước 1...</li>
    <li>Bước 2...</li>
  </ul>
  <div class="note-soft">Ghi chú bổ sung.</div>
  <div class="role-note">Vai trò: tên vai trò</div>
</section>

<section id="s8-exceptions" class="sop-section">
  <h2>8. Ngoại lệ, thay đổi & làm lại</h2>
  <ul>
    <li>Khi [tình huống]: [vai trò] [hành động]. Ghi lý do vào [hồ sơ].</li>
  </ul>
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

## 2. WI — Work Instruction (7 section)

WI là hướng dẫn thao tác cụ thể, chi tiết hơn SOP. Viết dạng bước-by-bước.

### Cấu trúc bắt buộc

| Section | Tiêu đề | Nội dung chính |
|---------|---------|---------------|
| 1 | Mục đích | 2-3 bullet, mô tả WI này giúp gì |
| 2 | Phạm vi & đối tượng áp dụng | Áp dụng cho ai, ở đâu, khi nào |
| 3 | Công cụ, vật tư & tài liệu cần thiết | Danh sách công cụ, vật tư, tài liệu tham chiếu |
| 4 | Điều kiện tiên quyết | Điều kiện PHẢI thỏa mãn trước khi bắt đầu |
| 5 | Các bước thực hiện | Step-by-step, mỗi bước 1 hành động |
| 6 | Hồ sơ & bằng chứng | Hồ sơ nào cần ghi, lưu ở đâu |
| 7 | Tài liệu liên quan | Bảng mã + tên + link |

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

### Nguyên tắc viết WI

- Mọi bước BẮT ĐẦU bằng động từ mệnh lệnh: "Đặt", "Mở", "Kiểm tra", "Ghi", "Báo cáo".
- Mọi bước chỉ có 1 hành động. KHÔNG gộp nhiều hành động.
- Nếu bước có điều kiện: viết "Nếu [điều kiện], thì [hành động]."
- Nếu bước có cảnh báo: dùng `<div class="note-warning">` trước bước.
- Kết thúc bằng hồ sơ cần ghi + người kiểm tra.

---

## 3. ANNEX — Phụ lục tham chiếu (Rule-pack format)

ANNEX la tài liệu tham chiếu chứa quy tắc, bảng, phương pháp, ma trận. Cấu trúc linh hoạt theo nội dung.

### Thành phần bắt buộc

| Thành phần | Mô tả | Bắt buộc |
|-----------|-------|---------|
| iso-map | Bảng liên kết clause ISO 9001/AS9100D | PHẢI |
| Sections | Các phần nội dung, đánh số | PHẢI |
| Tables | Bảng dữ liệu, quy tắc, ma trận | PHẢI (tối thiểu 1) |
| Header (meta) | Ma, rev, hiệu lực, owner | PHẢI |

### Cac dang ANNEX

| Dạng | Ví dụ | Đặc điểm |
|------|-------|---------|
| Reference data | ANNEX-302 Approved Materials List | Bang danh sach, co filter |
| Matrix | ANNEX-120 Authority Matrix | Bảng 2 chiều: vai trò x quyền |
| Method | ANNEX-601 AQL Method Reference | Quy trinh tinh toan, bang tra |
| Rules | ANNEX-501 Dispatch Capacity WIP Rules | Dieu kien + hanh dong |
| Map | ANNEX-106 ISO 9001 Matrix Full | Clause -> tài liệu -> trach nhiem |
| Topology | ANNEX-133 M365 Site Topology | Cấu trúc thư mục, site, library |

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

### Nguyen tac viet ANNEX

- KHÔNG viet dang tuong thuat. Dung bang và danh sach.
- Mọi bảng PHẢI có header rõ ràng.
- Ghi nguon/can cu cho moi quy tac (ISO clause, tiêu chuẩn, yêu cầu khách hàng).
- Dat ten section theo nội dung, không theo so thu tu co dinh.

---

## 4. JD — Job Description (6 section)

### Cấu trúc bắt buộc

| Section | Tiêu đề | CSS class | Nội dung |
|---------|---------|-----------|---------|
| 1 | Mục đích & su menh | `jd-purpose`, `jd-mission` | 2-3 cau: vi tri nay ton tai de lam gi |
| 2 | Trách nhiệm chính | `resp-table` | Bảng: STT \| Trách nhiệm \| Tần suất \| Hồ sơ |
| 3 | Thẩm quyền | `auth-grid` | Bảng: Quyết định \| Phạm vi \| Giới hạn \| Báo cáo cho |
| 4 | Nang luc yeu cau | `comp-grid` | Bang: Nang luc \| Muc do (Dreyfus) \| Bắt buộc/Uu tien |
| 5 | Người dự phòng | `backup-card` | Card: Vai trò dự phòng + dieu kien kích hoạt |
| 6 | Tài liệu liên quan | `link-table` | Bảng mã + tên + link |

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

### Nguyen tac viet JD

- Trách nhiệm viet dang bang, KHÔNG viet đoạn văn.
- Mọi dòng trách nhiệm có tần suất (Hằng ngày / Hằng tuần / Hằng tháng / Khi cần).
- Auth-grid ghi ro gioi han: "Duoc duyet PO duoi $5,000" thay vi "Duoc duyet PO".
- Nang luc dung thang Dreyfus 5 bac: Novice, Advanced Beginner, Competent, Proficient, Expert.

---

## 5. Department Handbook (6 section)

### Cấu trúc bắt buộc

| Section | Tiêu đề | Nội dung |
|---------|---------|---------|
| 1 | Tổng quan phòng ban | Sứ mệnh, mục tiêu, vị trí trong tổ chức |
| 2 | Phạm vi chức năng | Các chức năng chính phòng ban đảm nhận |
| 3 | Sơ đồ tổ chức | Cây tổ chức (org-tree) của phòng ban |
| 4 | Quy trình chính | Danh sách SOP chính phòng ban sở hữu hoặc tham gia |
| 5 | KPI phòng ban | Bảng KPI: chỉ số, mục tiêu, đo lường, tần suất |
| 6 | Liên kết SOP/WI/Form | Bang ma tài liệu liên quan |

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

## 6. Training Module — C01 đến C19 (6 section)

### Cấu trúc bắt buộc

| Section | Tiêu đề | Nội dung |
|---------|---------|---------|
| 1 | Thong tin triển khai | Đối tượng, thoi luong, dieu kien tham gia, hinh thuc |
| 2 | Muc luc nhanh | Danh sách cac phan trong module |
| 3 | Nội dung ly thuyet | Cac section kien thuc, bang, hinh anh |
| 4 | Vi du thuc te | Case study, tinh huong thuc te tai HESEM |
| 5 | Bai tap thuc hanh | Bai tap, tinh huong, cau hoi kiểm tra |
| 6 | Checklist danh gia | Checklist de danh gia người hoc dat/chưa dat |

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

- Nội dung ly thuyet viet ngắn, tap trung vao "can biet de lam" KHÔNG phai "can biet de biet".
- Vi du thuc te PHẢI lay tu boi canh HESEM (gia cong CNC, semiconductor parts, ISO 9001).
- Bai tap thuc hanh PHẢI lam được tai nơi làm việc voi tài liệu và cong cu hien co.
- Checklist danh gia bam sat nang luc can dat, dung thang Dreyfus lam tham chiếu.

---

## 7. Bang tom tat so sanh

| Đặc điểm | SOP | WI | ANNEX | JD | Dept HB | Training |
|----------|-----|----|-------|----|---------| ---------|
| So section | 10 | 7 | Linh hoat | 6 | 6 | 6 |
| Gate/checkpoint | Co | Không | Không | Không | Không | Co (checklist) |
| RACI | Co (Section 4) | Không | Không | Co (Section 3) | Không | Không |
| KPI | Co (Section 6) | Không | Không | Không | Co (Section 5) | Không |
| Step-by-step | Co (Section 7) | Co (Section 5) | Không | Không | Không | Co (Section 5) |
| iso-map | Không | Không | Co | Không | Không | Không |
| Bang dữ liệu | Co | Co | PHẢI co | Co | Co | Co |
| Liên kết tài liệu | Co (Section 10) | Co (Section 7) | Co | Co (Section 6) | Co (Section 6) | Không |
