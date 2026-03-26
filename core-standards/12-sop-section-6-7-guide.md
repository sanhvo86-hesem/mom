# 12. Hướng dẫn xây dựng Section 6 (Cổng kiểm soát nội bộ) & Section 7 (Quy trình chi tiết)

> **Version:** v1 · **Date:** 2026-03-26 · **ISO:** 9001:2026

---

## 1. Tổng quan cấu trúc SOP

Mọi SOP đều có 10 sections chuẩn. Section 6 và Section 7 là **phần vận hành cốt lõi**:

| Section | Tên | Mục đích |
|---------|-----|----------|
| 1 | Mục đích | Tại sao SOP tồn tại |
| 2 | Phạm vi | Áp dụng cho ai, ở đâu |
| 3 | Thuật ngữ & nguyên tắc | Definitions |
| 4 | Vai trò, quyền hạn & RACI | Ai làm gì |
| 5 | Đầu vào, đầu ra & điều kiện | Pre/post conditions |
| **6** | **Cổng kiểm soát, điểm dừng & KPI** | **IG table — HOLD/RELEASE gates** |
| **7** | **Quy trình chi tiết** | **Flowchart + procedure steps** |
| 8 | Ngoại lệ & thay đổi | Edge cases |
| 9 | Hệ thống, hồ sơ & dữ liệu | Records/systems |
| 10 | Tài liệu liên kết | Cross-references |

---

## 2. Section 6 — Cổng kiểm soát nội bộ (Internal Gates)

### 2.1 Khái niệm

**Internal Gate (IG)** = Điểm kiểm soát bên trong 1 SOP nơi phải **HOLD** cho đến khi đạt điều kiện rồi mới **RELEASE** sang bước tiếp.

**KHÔNG nhầm lẫn:**
| Ký hiệu | Nghĩa | Phạm vi |
|----------|--------|---------|
| **G0→G7** | 8 System Gates | Toàn bộ vòng đời đơn hàng |
| **IG1, IG2...** | Internal Gates | Bên trong 1 SOP cụ thể |

### 2.2 Format bắt buộc: TABLE

Section 6 **PHẢI** dùng format TABLE (không dùng cards, không dùng grid).

```html
<h2 class="h2" id="p6">6. Cổng kiểm soát, điểm dừng bắt buộc & KPI</h2>

<div class="table-card"><table class="table">
<thead><tr>
  <th>IG</th>
  <th>Tên cổng</th>
  <th>Mô tả hoạt động</th>
  <th>Chủ trì</th>
  <th>Điểm dừng bắt buộc</th>
  <th>KPI chính</th>
</tr></thead>
<tbody>
<tr>
  <td><span class="step-tag">IG1</span></td>
  <td><b>Tên cổng</b></td>
  <td>Mô tả ngắn gọn hoạt động tại cổng này</td>
  <td>Vai trò chịu trách nhiệm</td>
  <td>Điều kiện HOLD cụ thể, đo được</td>
  <td>Metric đo lường + target</td>
</tr>
<!-- Thêm rows tùy số IG -->
</tbody>
</table></div>
```

### 2.3 Quy tắc IG

| Quy tắc | Chi tiết |
|---------|----------|
| Số lượng IG | **Không giới hạn** — tùy quy trình (3 đến 10+) |
| Đánh số | IG1, IG2, IG3... (liên tục, bắt đầu từ 1) |
| Badge | `<span class="step-tag">IG1</span>` — navy gradient pill |
| Mỗi IG phải có | Tên + Mô tả + Chủ trì + Điểm dừng + KPI |
| Điểm dừng | Phải **cụ thể, đo được** (không viết "đảm bảo chất lượng") |
| KPI | Phải **có target số** (VD: ≥ 95%, ≤ 24h, 100%, = 0) |
| Chủ trì | Tên vai trò bằng tiếng Anh (VD: QMS Engineer, QA Lead) |

### 2.4 KHÔNG được làm

- ❌ Dùng gate-card / gate-grid (đã deprecated)
- ❌ Cố định 5 IG cho mọi SOP
- ❌ Viết điểm dừng mơ hồ: "Không cho phép khi chưa đạt"
- ❌ Viết KPI không đo được: "Tốt", "Đạt yêu cầu"
- ❌ Thiếu cột Chủ trì
- ❌ Nhầm IG với G (System Gate)

### 2.5 Ví dụ tốt vs xấu

**❌ XẤU:**
| IG1 | Tiếp nhận | ... | QMS | Không cho phép | Đạt yêu cầu |

**✅ TỐT:**
| IG1 | Tiếp nhận & phân loại DCR | Log DCR, gán scope, xác định Responsible Person | QMS Engineer | Không mở soạn thảo nếu chưa rõ scope, tài liệu bị kéo theo và Point-of-use bị ảnh hưởng | 100% DCR có Responsible Person trong 24h |

---

## 3. Section 7 — Quy trình chi tiết

### 3.1 Cấu trúc bắt buộc

Section 7 gồm 2 phần:

**Phần A — Flowchart** (sơ đồ tổng quan các bước)
**Phần B — Chi tiết từng bước** (proc-num headings + nội dung)

### 3.2 Phần A: Flowchart

```html
<h2 class="h2" id="p7">7. Quy trình chi tiết</h2>

<div class="flowchart">
  <div class="flow-step">
    <div class="flow-num" style="background:linear-gradient(135deg,#1565c0,#1976d2)">1</div>
    <div class="flow-text"><div class="flow-title">Tên bước</div></div>
  </div>
  <div class="flow-arrow">→</div>
  <div class="flow-step">
    <div class="flow-num" style="background:linear-gradient(135deg,#059669,#10b981)">2</div>
    <div class="flow-text"><div class="flow-title">Tên bước</div></div>
  </div>
  <!-- ... tiếp tục -->
</div>
```

### 3.3 Quy tắc flowchart

| Quy tắc | Chi tiết |
|---------|----------|
| Số bước | **PHẢI khớp** với số h3 procedure steps bên dưới |
| Màu balloon | **Xoay vòng 10 màu** (xem bảng dưới) |
| Kích thước | flow-num: 32×32px circle, font-size 14px |
| Spacing | gap: 10px giữa steps, không chồng lấn |
| Wrap | Tự xuống hàng khi không đủ chiều ngang |

### 3.4 Bảng màu proc-num (xoay vòng)

| Bước | Color 1 | Color 2 | Tên màu |
|------|---------|---------|---------|
| 1 | #1565c0 | #1976d2 | Blue |
| 2 | #059669 | #10b981 | Green |
| 3 | #d97706 | #f59e0b | Amber |
| 4 | #7c3aed | #8b5cf6 | Purple |
| 5 | #dc2626 | #ef4444 | Red |
| 6 | #0891b2 | #06b6d4 | Teal |
| 7 | #c2410c | #ea580c | Orange |
| 8 | #4338ca | #6366f1 | Indigo |
| 9 | #15803d | #22c55e | Emerald |
| 10 | #be185d | #ec4899 | Pink |

Bước 11+ quay lại từ Blue.

### 3.5 Phần B: Chi tiết từng bước

```html
<h3>
  <span class="proc-num" style="background:linear-gradient(135deg,COLOR1,COLOR2)">N</span>
  Tên bước quy trình
</h3>
<p>Mô tả tổng quan: AI làm gì, KHI NÀO, Ở ĐÂU, BẰNG GÌ.</p>
<ul class="tight">
  <li>Hành động cụ thể 1</li>
  <li>Hành động cụ thể 2</li>
</ul>
<div class="note-soft">
  <b>Điểm dừng bắt buộc:</b> Điều kiện HOLD cụ thể.
</div>
<div class="role-note">
  <b>Bàn giao bắt buộc:</b> Ai giao gì cho ai.
</div>
```

### 3.6 Quy tắc viết nội dung bước

| Quy tắc | Chi tiết |
|---------|----------|
| Ngôn ngữ | Tiếng Việt, câu lệnh thi hành (imperative) |
| Mỗi bước phải có | Tiêu đề + mô tả + danh sách hành động |
| Điểm dừng | Không bắt buộc mọi bước — chỉ khi có HOLD point thực sự |
| Bàn giao | Chỉ khi bước này chuyển giao cho người/phòng ban khác |
| Tham chiếu form | Ghi rõ mã form (VD: FRM-101, FRM-302) |
| ISO clause | Ghi trích dẫn nếu bước liên quan trực tiếp đến điều khoản |
| Độ dài | 3-8 bullet points mỗi bước (không quá dài, không quá ngắn) |

### 3.7 KHÔNG được làm

- ❌ Flowchart N bước nhưng procedure N+X bước (không khớp)
- ❌ Dùng IG badge trong section 7 (IG chỉ dùng section 6)
- ❌ Đánh số cơ học không kiểm tra nội dung
- ❌ Copy nội dung từ SOP khác mà không điều chỉnh bối cảnh
- ❌ Viết bước mơ hồ: "Thực hiện theo quy định" (phải ghi rõ quy định nào)
- ❌ Tất cả bước cùng 1 màu balloon
- ❌ Thiếu flowchart ở đầu section 7

---

## 4. Phân biệt 4 loại badge trong tài liệu

| Badge | Class | Màu | Dùng ở |
|-------|-------|-----|--------|
| **PHẢI** / **NÊN** / **CÓ THỂ** | `req-tag shall/should/may` | Đỏ/Vàng/Xanh lá | ISO map (section trước section 1) |
| **BẮT BUỘC** | `req-tag must` | Đỏ | ISO map requirements |
| **§7.5** | `iso-clause` | Xanh dương đậm pill | Sau mỗi PHẢI/NÊN (ISO clause ref) |
| **IG1, IG2...** | `step-tag` | Navy gradient pill | Section 6 IG table |
| **①②③...** | `proc-num` | Rotating gradient circle | Section 7 procedure steps |
| **G0, G1...G7** | Inline badge | Teal pill | Dashboard, gate flow |

### 4.1 Hình ảnh minh họa format

```
ISO Map:     [PHẢI]  Nội dung requirement (ISO 9001:2026 § 7.5.1).  [§7.5]
Section 6:   [IG1]   Tên cổng | Mô tả | Chủ trì | Điểm dừng | KPI
Section 7:   ① Tên bước — mô tả chi tiết...
Dashboard:   [G0] → [G1] → [G2] → ... → [G7]
```

---

## 5. Checklist trước khi submit SOP

### 5.1 Section 6 checklist
- [ ] Có IG table với đầy đủ 6 cột
- [ ] Mỗi IG có KPI đo được (có target số)
- [ ] Mỗi IG có điểm dừng cụ thể
- [ ] Mỗi IG có Chủ trì rõ ràng (tên vai trò)
- [ ] Số IG phù hợp với quy trình (không cố định 5)
- [ ] Badge `step-tag` cho IG number
- [ ] Không còn gate-card / gate-grid

### 5.2 Section 7 checklist
- [ ] Có flowchart ở đầu section 7
- [ ] Số bước flowchart = số h3 procedure steps
- [ ] Mỗi bước có proc-num balloon với màu xoay
- [ ] Mỗi bước có tiêu đề + mô tả + bullet actions
- [ ] Điểm dừng chỉ ở bước có HOLD point thực sự
- [ ] Tham chiếu form/SOP/WI cụ thể (không nói chung chung)
- [ ] Nội dung thực chiến, phù hợp CNC precision machining
- [ ] Không trùng lặp nội dung với section 6

### 5.3 Cross-check
- [ ] ISO clause badges trong ISO map chính xác
- [ ] IG numbers không trùng với System Gate numbers (G0-G7)
- [ ] Nội dung section 7 không lệch so với flowchart
- [ ] Tất cả form numbers tồn tại thực (không bịa)

---

## 6. Khi chỉnh sửa SOP hiện có

### 6.1 Quy trình cập nhật section 6
1. Đọc kỹ toàn bộ SOP hiện tại
2. Nghiên cứu ISO 9001:2026 clause liên quan
3. Nghiên cứu best practices quốc tế cho quy trình cụ thể
4. Xác định số IG phù hợp (KHÔNG copy từ SOP khác)
5. Viết IG table với đầy đủ 6 cột
6. Verify: mỗi KPI có target số, mỗi điểm dừng cụ thể

### 6.2 Quy trình cập nhật section 7
1. Đọc kỹ nội dung procedure hiện tại
2. Xác định SỐ BƯỚC THỰC TẾ (không ép vào 5 hay 6)
3. Tạo flowchart khớp số bước
4. Viết từng bước: hấp thụ nội dung cũ + bổ sung nghiên cứu mới
5. Đánh số liên tục, màu xoay vòng
6. Verify: flowchart khớp h3 count, nội dung không bị lệch

### 6.3 Lưu ý quan trọng
- **KHÔNG đánh số cơ học** — phải kiểm tra nội dung phù hợp
- **KHÔNG giới hạn số bước** — SOP phức tạp có thể 12+ bước
- **KHÔNG copy-paste giữa SOPs** — mỗi SOP có bối cảnh riêng
- **Kiểm tra heading numbering** — 7.1, 7.2... phải liên tục
- **Khi thêm/bớt bước** — phải cập nhật lại flowchart

---

## 7. CSS Classes Reference (Section 6 & 7)

### 7.1 Section 6
```css
.step-tag {
  display: inline-flex; padding: 3px 10px;
  border-radius: var(--r-sm); font-size: 10px;
  font-weight: 800; color: #fff;
  background: linear-gradient(135deg, #0C2D48, #1565c0);
  text-transform: uppercase; letter-spacing: .3px;
}
```

### 7.2 Section 7
```css
.flowchart {
  display: flex; flex-wrap: wrap; gap: 10px;
  padding: 16px 20px; margin: 16px 0;
  background: linear-gradient(135deg, #f8faff, #eef4fb);
  border: 1px solid var(--th-bdr); border-radius: var(--r);
}
.flow-step {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 14px; background: #fff;
  border: 1px solid rgba(21,101,192,0.15);
  border-radius: 20px; min-width: 0;
}
.flow-num {
  width: 28px; height: 28px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 13px; font-weight: 700;
  flex-shrink: 0;
}
.proc-num {
  display: inline-flex; width: 32px; height: 32px;
  border-radius: 50%; align-items: center; justify-content: center;
  color: #fff; font-size: 15px; font-weight: 800;
  flex-shrink: 0; margin-right: 8px;
}
```

---

## 8. Tham chiếu nhanh

| Cần làm | Xem file |
|---------|----------|
| CSS variables & colors | `04-html-design-system.md` |
| HTML templates copy-paste | `05-html-templates.md` |
| Viết nội dung tiếng Việt | `07-content-writing-guide.md` |
| Cấu trúc HTML file | `11-html-structure-guide.md` |
| Danh sách CSS classes | `reference/css-classes-reference.md` |
| Bảng màu | `reference/color-palette.md` |
| Quy tắc bất biến | `01-immutable-rules.md` |
