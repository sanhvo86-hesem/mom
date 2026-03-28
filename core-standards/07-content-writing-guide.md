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
| 9 | Không đưa ghi chú biên tập vào thân SOP | Không chèn note kiểu "bổ sung theo note", "liên kết note", "quy tắc dùng thuật ngữ", "khác bản trước" vào tài liệu vận hành. |
| 10 | Không ghi “mới so với bản trước” trong SOP chưa phát hành | Khi tài liệu còn là bản nháp trước phát hành đầu tiên, giữ `V0` và không mô tả khác biệt so với draft cũ trong body. |
| 11 | Không nhét rationale benchmark vào thân SOP | Lý do chọn KPI, benchmark nguồn và ghi chú suy luận để ở working note / core-standard / hồ sơ soạn thảo, không đưa vào body SOP. |
| 12 | Chuẩn hóa format được phép làm ở lõi, nội dung phải nâng cấp theo từng SOP | Palette, layout, table structure, checklist kỹ thuật có thể khóa trong core-standard; nhưng nội dung Section 1-8 phải nghiên cứu và viết theo từng tài liệu, không copy hàng loạt. |

### 1.2 Giọng văn

- Giọng mệnh lệnh, chuyên nghiệp, không suồng sã.
- Không dùng "bạn", "chúng ta", "mình".
- Dùng tên vai trò cụ thể: "QMS Engineer", "QC Inspector", "Production Planner".
- Khi nói chung, dùng "người thực hiện" hoặc "người được giao".
- Với tài liệu chưa phát hành chính thức lần đầu, header phiên bản luôn là `V0`.

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
- Phải được suy từ rủi ro bị chặn, quyết định được giữ và đầu ra phải khóa trong Section 6 / 7 của chính SOP đó.
- Không dùng lại nguyên một bộ bullet cho nhiều SOP chỉ bằng cách thay danh từ.

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
- Boundary phải bám đúng handoff upstream / downstream thật trong Section 7, không dùng danh sách tài liệu trang trí.

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
| Traceability (truy xuất nguồn gốc) | Dùng để chỉ khả năng truy xuôi/truy ngược có bằng chứng |
| System of Record - SoR (hệ thống ghi nhận chuẩn) | Dùng cho hệ thống giao dịch gốc như ERP |
| Single Source of Truth - SSOT (nguồn chuẩn duy nhất) | Dùng cho nơi lưu hồ sơ chuẩn đã kiểm soát |

- Chỉ liệt kê thuật ngữ dùng trong SOP này.
- KHÔNG copy toàn bộ glossary hệ thống vào mỗi SOP.
- Cột tên thuật ngữ PHẢI theo mẫu `English term (thuật ngữ tiếng Việt chuẩn)`.
- Trong thân tài liệu, ưu tiên dùng bản tiếng Việt đã chốt ở Section 3.
- Thuật ngữ chỉ được giữ lại khi thật sự cần để hiểu gate, step, hold, release hoặc exception của SOP đó.
- KHÔNG viết kiểu nửa Anh nửa Việt như `mixed source kiểm soát`, `job close tài chính`, `trace gap`, `first-piece release` nếu SOP đã có bản Việt chuẩn.
- Chỉ giữ nguyên chữ viết tắt hoặc mã chuẩn khi đây là ngôn ngữ vận hành phổ biến và không làm mờ nghĩa, ví dụ `FAI`, `SPC`, `Cpk`, `NCR`.
- Không thêm note giải thích quy tắc viết thuật ngữ ngay trong thân SOP; quy tắc thuộc `core-standard`, không thuộc tài liệu vận hành.

### Section 4: Vai trò, quyền hạn & RACI

Bảng 3 cột:

| Vai trò | Trách nhiệm | Quyền / Điểm chặn |
|---------|------------|------------------|
| QMS Engineer | Rà soát cấu trúc, kiểm tra cross-ref | Quyền từ chối phát hành nếu thiếu cross-review |
| QA Manager | Phê duyệt tài liệu cấp SOP | Điểm chặn: Không phê duyệt = không phát hành |
| QMS[DC] hoặc role bundle JD-linked phù hợp | Soạn thảo, cập nhật, theo dõi hiệu lực theo phạm vi SOP | Chịu trách nhiệm nội dung theo đúng role boundary đã chốt |

- Cột "Quyền / Điểm chặn" rất quan trọng — cho biết ai có quyền dừng quy trình.
- Mọi owner giữ gate trong Section 6 và mọi vai trò có quyền bàn giao / gỡ hold trong Section 7 đều phải xuất hiện ở Section 4.
- Nếu SOP dùng RACI matrix thay cho bảng 3 cột, vẫn PHẢI thể hiện rõ ai có quyền chặn và ai có quyền gỡ hold.
- Không dùng placeholder mơ hồ như `Process Owner`, `Department Head`, `Responsible Person`, `Data Owner`, `Top Management` trong dòng vai trò của Section 4; phải resolve thành role code JD-linked hoặc explicit role bundle.
- Header, Section 4, Section 6 và Section 8 ưu tiên role code chip/link JD; thân đoạn văn mới dùng tên English đầy đủ khi cần.

### Section 5: Đầu vào, đầu ra & điều kiện tiên quyết

4 field boxes:

| Box | Nội dung |
|-----|---------|
| **Đầu vào** | Tài liệu nào cần có trước khi bắt đầu quy trình này |
| **Đầu ra** | Sản phẩm/hồ sơ nào được tạo ra khi hoàn thành |
| **Điều kiện tiên quyết** | Điều kiện nào PHẢI thỏa mãn trước khi bắt đầu |
| **Trigger** | Sự kiện nào kích hoạt quy trình này |

- Đầu vào phải map được về trạng thái trước `IG1 / B1`.
- Đầu ra phải map được về trạng thái sau gate cuối hoặc bước cuối.
- Trigger phải phản ánh đúng sự kiện kích hoạt, restart, transfer, change hoặc escalation thật trong SOP.
- Không viết box chung chung kiểu `khi cần`, `theo yêu cầu`, `tài liệu liên quan`.

### Section 6: Cổng kiểm soát, điểm dừng bắt buộc & KPI

**Internal Gates (IG):**

Section 6 không phải nơi kể lại toàn bộ quy trình. Section này chỉ mô tả:
- cổng nào phải giữ / mở,
- ai có quyền mở cổng,
- điều kiện HOLD đo được,
- KPI hoặc hồ sơ tối thiểu.

**Quy tắc viết:**
- Dùng **IG table**, không dùng gate cards.
- Không cố định 5 IG.
- Không bắt số IG phải bằng số bước chi tiết ở Section 7.
- Chỉ tạo IG khi có điểm `HOLD / RELEASE` thật sự.
- KPI phải gắn với hiệu lực kiểm soát của từng cổng, không phải KPI trang trí.
- Mỗi KPI PHẢI có tối thiểu một ngưỡng số hoặc SLA, một nguồn dữ liệu chuẩn và một trigger phản ứng khi lệch.
- Khi dùng benchmark bên ngoài, phải chốt rõ đây là benchmark tham chiếu hay mục tiêu nội bộ; không copy số bên ngoài vào SOP mà không giải thích logic vận hành.
- Trước khi viết lại Section 6, PHẢI đọc tài liệu cũ và chốt control architecture theo `13-sop-research-redraft-method.md`.
- Câu KPI nên đọc được theo cấu trúc: `metric + ngưỡng + nguồn dữ liệu hoặc operating context + trigger phản ứng`.
- Mỗi KPI nên ưu tiên bám một trong các nhóm: `đúng ngay lần đầu`, `tốc độ phản ứng`, `độ đầy đủ bằng chứng`, `ổn định quá trình`, `đóng action đúng hạn`, `độ chính xác dữ liệu/chứng từ`, `zero-escape / zero-orphan / zero-unauthorized`.
- KPI mẫu theo family thường gặp:
  - Contract review / ACK: `<= 1 ngày làm việc`, `mismatch sau commit = 0`.
  - Planning / dispatch: `schedule attainment >= 90%`.
  - First-piece / FAI: `pass ngay lần đầu >= 95%`.
  - Final release / chứng từ: `document accuracy >= 99.5%`, `thiếu chứng từ bắt buộc = 0`.
  - Access control: `cấp/đổi/thu hồi quyền <= 1 ngày làm việc`, `orphan account = 0`.
  - Backup / restore: `backup success >= 99%`, `restore test = 100% theo chu kỳ`.
  - MSA / capability: `GRR < 10%` là tốt, `10–30%` chỉ dùng có điều kiện; `Cpk/Ppk >= 1.33` là mức tham chiếu phổ biến.
- Các số trên là điểm khởi đầu để thiết kế KPI thực chiến; được phép siết chặt hơn theo risk, nhưng không được nới lỏng vô căn cứ.

**KPI metrics:**

| KPI | Mục tiêu | Đo lường | Tần suất |
|-----|---------|---------|---------|
| Thời gian phê duyệt tài liệu | <= 5 ngày làm việc | Ngày từ submit đến approve | Hằng tháng |
| Tỷ lệ tài liệu hết hiệu lực còn lưu hành | 0% | Số tài liệu hết hiệu lực / tổng | Hằng quý |

KPI không đạt chuẩn nếu chỉ viết kiểu:
- `đúng hạn`, `được kiểm soát`, `đủ hồ sơ`, `cải thiện liên tục`

KPI đạt chuẩn nên trả lời được cùng lúc:
- Ngưỡng là bao nhiêu.
- Đo từ hệ thống hoặc hồ sơ nào.
- Lệch bao nhiêu thì giữ cổng, escalation hoặc mở action.

### Section 7: Quy trình chi tiết

Section 7 là **dòng công việc thực thi**. Mỗi bước chi tiết nên tách theo:
- đổi vai trò,
- đổi khu vực / công đoạn / hệ thống,
- đổi resource chính (material / machine / tool / fixture / gage / program),
- điểm kiểm soát chất lượng,
- điểm bàn giao hoặc revalidation.

**Quy tắc viết:**
- Có flowchart ở đầu Section 7.
- Số bubble flowchart phải khớp số heading bước chi tiết.
- Không ép số bước theo số IG.
- Với SOP vận hành thật, 8–14 bước là bình thường nếu quy trình có nhiều bàn giao.
- Chỉ tách bước khi có thay đổi vai trò, resource chính, trạng thái hệ thống, điểm kiểm soát, revalidation, containment hoặc bàn giao thật.
- Trước khi viết lại Section 7, PHẢI đọc tài liệu cũ và nghiên cứu nguồn chính thức bên ngoài cho SOP đó.
- Bubble flowchart phải dùng palette màu xoay và cùng logic màu với `proc-num` của các heading chi tiết.
- Với SOP sinh mới bằng script, mỗi `flow-step`, `flow-num` và `flow-arrow` nên mang sẵn inline style theo palette; CSS toàn cục chỉ là lớp fallback, không phải lớp duy nhất.
- Class `.active` và `.critical` chỉ là lớp bổ trợ cho ngữ nghĩa quyết định / kiểm tra; không được làm hỏng logic đánh số và palette theo từng bước.
- Trước khi coi là hoàn tất, phải kiểm `flowchart steps = proc-num headings = số bước thực thi`.

**Ví dụ:**
```html
<h3><span class="proc-num">3</span> Rà soát chéo</h3>
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

- Dùng bảng ngoại lệ thay vì bullet list khi SOP có nhiều hold/restart/change path.
- Mỗi dòng phải ghi: `tình huống + quy tắc xử lý bắt buộc + chủ trì + người gỡ hold hoặc phê duyệt tiếp + hồ sơ`.
- Tình huống ngoại lệ phải được suy từ điểm hold, restart, revalidation, partial release, waiver, system-down hoặc change path thật trong Section 6 / 7.
- Không thêm ngoại lệ trang trí không xuất phát từ vận hành thực của SOP.

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
