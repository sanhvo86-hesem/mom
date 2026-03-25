# 07 — Hướng dẫn viết nội dung tài liệu QMS

> Phiên bản: V0 | Hiệu lực: 2025-06-01 | Chủ sở hữu: QMS Engineer

---

## 1. Nguyên tắc viết

### 1.1 Nguyên tắc nền tảng

| # | Nguyên tắc | Giải thích |
|---|-----------|-----------|
| 1 | Câu ngắn, rõ ràng, dùng để thi hành | Mỗi câu tối đa 25 từ. Người đọc phải hiểu ngay phải làm gì. |
| 2 | Chủ ngữ + hành động + đối tượng | Luôn nêu rõ AI làm, làm GÌ, với CÁI GÌ. |
| 3 | Không dùng câu diễn giải mơ hồ | Không viết "nhằm đảm bảo", "góp phần nâng cao", "hướng tới mục tiêu". |
| 4 | Không meta-text | Không viết "tài liệu này nhằm mục đích...", "phần này mô tả...". |
| 5 | Không "AI generated" | Không ghi "được tạo bởi AI", "AI generated", "auto-generated". |
| 6 | Mỗi câu phải phục vụ vận hành thật | Xóa mọi câu không dẫn đến hành động hoặc quyết định cụ thể. |
| 7 | Một ý một câu | Không nhồi nhiều ý vào một câu bằng dấu phẩy liên tiếp. |
| 8 | Ưu tiên dạng liệt kê | Khi có 3 mục trở lên, dùng bullet hoặc bảng thay cho đoạn văn. |

### 1.2 Giọng văn

- Giọng mệnh lệnh, chuyên nghiệp, không suồng sã.
- Không dùng "bạn", "chúng ta", "mình".
- Dùng tên vai trò cụ thể: "QMS Engineer", "QC Inspector", "Production Planner".
- Khi nói chung, dùng "người thực hiện" hoặc "người được giao".

---

## 2. Cấu trúc câu lệnh

### 2.1 Cấu trúc đúng

Mỗi câu lệnh trong SOP/WI tuân theo pattern:

```
[Vai trò] + [hành động] + [đối tượng] + [điều kiện/thời điểm nếu có].
```

### 2.2 Ví dụ đúng vs sai

| Loại | Câu |
|------|-----|
| ĐÚNG | QMS Engineer rà soát cấu trúc tài liệu trước khi gửi phê duyệt. |
| SAI | Tài liệu này được thiết kế để hỗ trợ việc rà soát cấu trúc... |
| ĐÚNG | Không phát hành tài liệu khi chưa có rà soát chéo. |
| SAI | Nên đảm bảo rằng tài liệu đã được rà soát chéo trước khi phát hành. |
| ĐÚNG | QC Inspector đo 5 điểm theo bản vẽ trước khi chấp nhận lô. |
| SAI | Việc đo lường cần được thực hiện một cách cẩn thận để đảm bảo chất lượng. |
| ĐÚNG | Shift Leader dừng máy ngay khi phát hiện phế phẩm liên tiếp 3 chi tiết. |
| SAI | Trong trường hợp phát hiện sự cố, cần xem xét việc dừng máy để xử lý. |

### 2.3 Quy tắc viết lệnh phủ định

- Dùng "KHÔNG" + động từ: "Không phát hành khi chưa có chữ ký."
- Không dùng "Không nên", "Cần tránh" — quá yếu, không ràng buộc.

### 2.4 Quy tắc viết điều kiện

- Dùng "Khi" hoặc "Nếu" ở đầu câu cho điều kiện.
- "Khi NCR mở quá 5 ngày, QA Manager báo cáo CEO."
- Không dùng "Trong trường hợp", "Đối với tình huống" — dài và mơ hồ.

---

## 3. Từ ngữ chuẩn — Mức độ bắt buộc

### 3.1 Ba cấp độ

| Từ khóa | Tiếng Anh | Ý nghĩa | Cách dùng |
|---------|-----------|---------|-----------|
| **PHẢI** | shall | Bắt buộc thực hiện. Vi phạm = non-conformance. | Dùng cho yêu cầu ISO, khách hàng, luật. |
| **NÊN** | should | Khuyến nghị mạnh. Cho phép ngoại lệ có lý do. | Dùng cho best practice, khuyến nghị nội bộ. |
| **CÓ THỂ** | may | Tùy chọn. Người thực hiện tự quyết định. | Dùng cho phương pháp thay thế, bổ sung. |

### 3.2 Cách đánh dấu trong HTML

```html
<span class="req-tag shall">PHẢI</span>
<span class="req-tag should">NÊN</span>
<span class="req-tag may">CÓ THỂ</span>
```

### 3.3 Quy tắc sử dụng

- Mọi SOP PHẢI có ít nhất 1 yêu cầu "PHẢI" trong mỗi gate.
- KHÔNG dùng "PHẢI" cho mức khuyến nghị — sẽ gây non-conformance khi audit.
- Khi không chắc chắn mức độ, mặc định dùng "NÊN" và để QA Manager xác nhận nâng cấp.

---

## 4. Quy tắc nội dung SOP — 10 section

### Section 1: Mục đích

- 3-5 bullet points.
- Mọi bullet bắt đầu bằng **động từ** (Thiết lập, Kiểm soát, Đảm bảo, Quy định, Ngăn ngừa).
- KHÔNG bắt đầu bằng danh từ ("Quy trình này...", "Tài liệu này...").

**Ví dụ:**
```
- Thiết lập quy trình kiểm soát tài liệu từ tạo mới đến phê duyệt.
- Đảm bảo mọi tài liệu phát hành đều có rà soát chéo.
- Ngăn ngừa sử dụng tài liệu hết hiệu lực tại nơi làm việc.
```

### Section 2: Phạm vi

Chia thành 2 phần rõ ràng:

**Có bao phủ:**
- Liệt kê các đối tượng, quy trình, khu vực áp dụng.

**Không thay thế:**
- Liệt kê các tài liệu/quy trình KHÔNG nằm trong phạm vi SOP này.

**Ví dụ:**
```
Có bao phủ:
- Tất cả tài liệu QMS nội bộ: SOP, WI, ANNEX, FRM, JD.
- Tài liệu gốc từ khách hàng khi được nội bộ hóa.

Không thay thế:
- SOP-104 (bảo mật dữ liệu và IP).
- Quy trình kiểm soát bản vẽ khách hàng do Engineering quản lý.
```

### Section 3: Thuật ngữ & nguyên tắc

Bảng 2 cột:

| Thuật ngữ | Quy định sử dụng |
|-----------|-----------------|
| DCR | Document Change Request — yêu cầu thay đổi tài liệu chính thức |
| SoR | System of Record — hệ thống lưu trữ gốc (Epicor hoặc M365) |
| SSOT | Single Source of Truth — nguồn dữ liệu duy nhất được công nhận |

- Chỉ liệt kê thuật ngữ dùng trong SOP này.
- KHÔNG copy toàn bộ glossary hệ thống vào mỗi SOP.

### Section 4: Vai trò, quyền hạn & RACI

Bảng 3 cột:

| Vai trò | Trách nhiệm | Quyền / Điểm chặn |
|---------|------------|------------------|
| QMS Engineer | Rà soát cấu trúc, kiểm tra cross-ref | Quyền từ chối phát hành nếu thiếu cross-review |
| QA Manager | Phê duyệt tài liệu cấp SOP | Điểm chặn: Không phê duyệt = không phát hành |
| Document Owner | Soạn thảo, cập nhật, theo dõi hiệu lực | Chịu trách nhiệm nội dung chính xác |

- Cột "Quyền / Điểm chặn" rất quan trọng — cho biết ai có quyền dừng quy trình.

### Section 5: Đầu vào, đầu ra & điều kiện tiên quyết

4 field boxes:

| Box | Nội dung |
|-----|---------|
| **Đầu vào** | Tài liệu nào cần có trước khi bắt đầu quy trình này |
| **Đầu ra** | Sản phẩm/hồ sơ nào được tạo ra khi hoàn thành |
| **Điều kiện tiên quyết** | Điều kiện nào PHẢI thỏa mãn trước khi bắt đầu |
| **Trigger** | Sự kiện nào kích hoạt quy trình này |

### Section 6: Cổng kiểm soát, điểm dừng bắt buộc & KPI

**Gate cards:**

Mọi gate là 1 card chứa:
- Tên gate (ví dụ: G2 — Kiểm tra cấu trúc)
- Điều kiện PASS
- Điều kiện HOLD/FAIL
- Vai trò quyết định
- Hồ sơ ghi nhận

**KPI metrics:**

| KPI | Mục tiêu | Đo lường | Tần suất |
|-----|---------|---------|---------|
| Thời gian phê duyệt tài liệu | <= 5 ngày làm việc | Ngày từ submit đến approve | Hằng tháng |
| Tỷ lệ tài liệu hết hiệu lực còn lưu hành | 0% | Số tài liệu hết hiệu lực / tổng | Hằng quý |

### Section 7: Quy trình chi tiết

Mọi gate có:
- `<h3>` — Tên gate
- Mô tả ngắn (1-2 câu)
- `<ul>` — Các bước thực hiện
- `<div class="note-soft">` — Ghi chú bổ sung (nếu có)
- `<div class="role-note">` — Vai trò chịu trách nhiệm

**Ví dụ:**
```html
<h3>G3 — Rà soát chéo</h3>
<p>Người được chỉ định rà soát chéo kiểm tra nội dung và cross-reference.</p>
<ul>
  <li>Đọc toàn bộ tài liệu, đối chiếu với SOP/WI liên quan.</li>
  <li>Kiểm tra mọi liên kết nội bộ còn hoạt động.</li>
  <li>Ghi nhận kết quả vào FRM-105 Peer Review Log.</li>
</ul>
<div class="note-soft">Thời gian rà soát chéo: tối đa 3 ngày làm việc.</div>
<div class="role-note">Vai trò: Peer Reviewer (do Document Owner chỉ định)</div>
```

### Section 8: Ngoại lệ, thay đổi & làm lại

- Bulleted list các tình huống ngoại lệ.
- Mọi bullet ghi: tình huống + hành động + người quyết định.

**Ví dụ:**
```
- Khi tài liệu khẩn cấp (an toàn, pháp luật): CEO có thể phê duyệt
  ngay, bỏ qua bước rà soát chéo. Ghi lý do vào DCR.
- Khi người rà soát chéo vắng mặt quá 3 ngày: Document Owner đề xuất
  người thay thế, QA Manager chấp thuận.
```

### Section 9: Hệ thống, hồ sơ & dữ liệu

Bảng mapping:

| He thong | Du lieu | Trách nhiệm | Lưu trữ |
|----------|--------|------------|---------|
| SharePoint | Tài liệu QMS gốc (PDF) | QMS Engineer | QMS Records Site |
| Epicor | So lieu san xuat | Production Planner | Job Module |
| Power BI | Dashboard KPI | QMS Engineer | QMS Dashboard |

### Section 10: Liên kết

Bảng mã tài liệu + tên + link:

| Ma | Tên tài liệu | Liên kết |
|----|-------------|---------|
| SOP-102 | Quality Policy, Objectives & Context | [Link] |
| WI-102 | SharePoint Record Sites & Permissions | [Link] |
| FRM-101 | Master Document Register | [Link] |
| FRM-102 | Document Change Request | [Link] |
| ANNEX-106 | ISO 9001 Matrix Full | [Link] |

---

## 5. Quy tắc đặc biệt theo loại tài liệu

### 5.1 WI (Work Instruction)

- Viet theo dang **bước-by-bước** (step 1, step 2...).
- Mọi buoc bắt đầu bằng động từ menh lenh.
- Mọi buoc chi 1 hanh dong. KHÔNG gộp nhiều hành động vao 1 buoc.
- Co hình ảnh / sơ đồ neu buoc phức tạp.
- Kết thúc bằng: hồ sơ can ghi + người kiểm tra.

### 5.2 ANNEX

- Viết dạng **rule-pack**: bang, dieu kien, quy tac.
- KHÔNG viet dang tường thuat.
- Mọi bảng PHẢI có header rõ ràng và ghi chú nguồn.
- Dung `iso-map` de liên kết clause ISO.

### 5.3 JD (Job Description)

- Trách nhiệm viet dang bang, không viet đoạn văn.
- Mọi dong trach nhiem co: nội dung + tần suất + hồ sơ liên quan.
- Phần thẩm quyền (auth-grid) ghi rõ: được quyết định gì, đến mức nào.

### 5.4 Form (Excel)

- Chi co ten cot, label ngắn, dropdown.
- KHÔNG viết giải thích dài trong form.
- Giai thich nam trong SOP/WI tuong ung, KHÔNG nam trong form.

---

## 6. Kiem tra trước khi phát hành

Truoc khi gửi tài liệu để phê duyệt, kiểm tra:

| # | Hạng mục | Kiem tra |
|---|---------|---------|
| 1 | Mọi câu có chủ ngữ rõ ràng | Không có câu bị động không rõ ai làm |
| 2 | Mọi gate có điều kiện PASS/FAIL | Không có gate mơ hồ |
| 3 | Mọi vai trò trong Section 4 xuất hiện trong Section 7 | Không có vai trò "ma" |
| 4 | Mọi form/WI liên kết tồn tại | Không có liên kết chết |
| 5 | Không co meta-text | Xoa het "tài liệu nay nham muc dich..." |
| 6 | Không co "AI", "generated" | Kiem tra toan van ban |
| 7 | Từ khóa PHẢI/NÊN/CÓ THỂ dùng đúng cấp độ | QA Manager xác nhận |
| 8 | Thuật ngữ nhất quán voi Glossary | Không dung 2 tu cho 1 khai niem |
| 9 | A4 printable | In thu, kiểm tra layout |
| 10 | Cross-reference chính xác | Mọi ma tài liệu dung và link hoat dong |

---

## 7. Tu ngu cam su dung

| Cam | Thay bang |
|-----|----------|
| "Tài liệu nay nham muc dich..." | (Xoa, bat dau bang nội dung thuc.) |
| "Nhu đã de cap ở tren..." | (Xoa hoặc ghi lai nội dung cụ thể.) |
| "Can luu y rang..." | (Viet thang nội dung can luu y.) |
| "Mot cach tong quat..." | (Xoa, viet cụ thể.) |
| "Có thể nói rằng..." | (Xóa, khẳng định trực tiếp.) |
| "Duoc tao boi AI" | (KHÔNG BAO GIO dung.) |
| "Generated", "auto-generated" | (KHÔNG BAO GIO dung.) |
| "Ban", "chung ta", "minh" | Dung ten vai trò cụ thể. |
| "Nên đảm bảo rằng..." | Dùng "PHẢI" hoặc "NÊN" + hành động cụ thể. |
| "Trong trường hợp" | Dung "Khi" hoặc "Nếu". |
