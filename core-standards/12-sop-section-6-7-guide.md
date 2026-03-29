# 12. Hướng dẫn xây dựng Section 6 (Cổng kiểm soát nội bộ) & Section 7 (Quy trình chi tiết)

> **Version:** v2 · **Date:** 2026-03-27 · **ISO:** 9001:2026 / AS9100D-ready

---

## 1. Nguyên tắc cốt lõi

Section 6 và Section 7 phục vụ **hai câu hỏi khác nhau**:

| Section | Câu hỏi phải trả lời | Bản chất |
|---|---|---|
| **6. Cổng kiểm soát nội bộ (IG)** | Ở đâu phải **HOLD / RELEASE**? Ai có quyền mở cổng? Điều kiện gì là bắt buộc? | **Control architecture** |
| **7. Quy trình chi tiết** | Công việc thực tế diễn ra **theo trình tự nào**? Ai làm gì, ở đâu, bằng gì, bàn giao ra sao? | **Operating sequence** |

### 1.1 Quy tắc bất biến

1. **Số lượng IG và số lượng bước chi tiết là độc lập.**
2. **Không có quy tắc nào bắt SOP phải có 5 cổng hoặc 5 bước.**
3. Cặp duy nhất bắt buộc phải khớp là:
   - **Số bước flowchart trong Section 7**
   - **Số heading bước chi tiết trong Section 7**
4. Một **IG có thể bao trùm nhiều bước chi tiết**.
5. Một SOP tốt có thể có:
   - 4 IG và 9 bước
   - 6 IG và 12 bước
   - 7 IG và 10 bước
   - 8 IG và 14 bước
6. Không được chốt số IG hoặc số bước trước khi đọc tài liệu cũ và đối chiếu nguồn chính thức bên ngoài.
7. Việc viết lại Section 6 và Section 7 PHẢI tuân theo `13-sop-research-redraft-method.md`.

### 1.2 Khi nào 5 bước là sai

Nén SOP còn 5 bước thường tạo ra một trong các lỗi sau:

- Gộp nhiều lần bàn giao khác vai trò vào cùng một bước.
- Gộp `setup`, `prove-out`, `first-piece`, `FAI`, `release` vào một khối mơ hồ.
- Mất các điểm đổi trạng thái quan trọng như `HOLD`, `revalidation`, `move to next op`, `final release`.
- Làm tài liệu đẹp về hình thức nhưng yếu về điều hành thực tế.

### 1.3 5 cổng dùng khi nào

Mốc 5 là **phù hợp cho dashboard, executive summary, cổng điều hành cấp cao**, không phải để giới hạn mọi SOP vận hành.

Nếu cần một sơ đồ điều hành ngắn gọn ở portal, có thể dùng 5 cổng cấp cao. Nhưng trong SOP thực thi, số IG và số bước phải do **rủi ro vận hành thật** quyết định.

---

## 2. Section 6 — Cổng kiểm soát nội bộ (IG)

### 2.1 Định nghĩa

**IG** là điểm mà quy trình **không được phép đi tiếp** nếu chưa có:

- điều kiện đầu vào đúng,
- bằng chứng tối thiểu đúng,
- người có thẩm quyền đúng,
- quyết định `PASS / CONDITIONAL PASS / HOLD / FAIL` rõ ràng.

**Không nhầm lẫn:**

| Ký hiệu | Nghĩa | Phạm vi |
|---|---|---|
| **G0→G7** | System gates | Toàn bộ vòng đời đơn hàng |
| **IG1, IG2...** | Cổng kiểm soát nội bộ | Bên trong một SOP cụ thể |

### 2.2 Khi nào phải tạo một IG

Chỉ tạo IG khi có **điểm mở cổng thật sự**. Một IG là hợp lệ nếu có đủ 4 yếu tố:

1. Có quyết định `HOLD / RELEASE`.
2. Có owner rõ ràng.
3. Có điều kiện đo được.
4. Có bằng chứng hoặc hồ sơ tối thiểu để chứng minh.

### 2.3 Khi nào KHÔNG nên tạo IG

Không biến mọi vi thao tác thành một cổng. Không tạo IG nếu đó chỉ là:

- thao tác con trong cùng một vai trò,
- hành động không tạo quyết định mở cổng,
- bước ghi chép đơn thuần,
- kiểm tra phụ không làm đổi trạng thái job.

### 2.4 Số lượng IG

| Loại SOP | Khoảng IG thực tế khuyến nghị |
|---|---|
| SOP điều hành/corporate | 4–6 |
| SOP engineering / release / quality gating | 5–7 |
| SOP CNC job-order / execution / shop-floor control | 5–8 |
| SOP kiểm tra cuối / giao hàng / closeout | 4–6 |

**Nguyên tắc:** số IG không giới hạn, nhưng phải đủ ít để giữ được tính điều hành và đủ nhiều để không bỏ lọt quyết định kiểm soát.

### 2.5 Format bắt buộc

Section 6 **PHẢI** dùng **TABLE**, không dùng `gate-card`, không dùng `gate-grid`.

```html
<h2 class="h2" id="p6">6. Cổng kiểm soát, điểm dừng bắt buộc & KPI</h2>

<div class="table-card"><table class="table">
<colgroup>
  <col class="col-ig"/>
  <col class="col-desc"/>
  <col class="col-owner"/>
  <col class="col-hold"/>
  <col class="col-kpi"/>
</colgroup>
<thead><tr>
  <th>IG</th>
  <th>Cổng kiểm soát & mục tiêu</th>
  <th>Chủ trì</th>
  <th>Điểm dừng bắt buộc</th>
  <th>KPI / hồ sơ tối thiểu</th>
</tr></thead>
<tbody>
<tr>
  <td class="ig-center"><span class="step-tag">IG1</span></td>
  <td><b>Tên cổng</b><br/>Mục tiêu kiểm soát, phạm vi mở cổng, đầu ra mong đợi.</td>
  <td>Vai trò chủ trì</td>
  <td>Không được đi tiếp nếu chưa có điều kiện mở cổng đo được.</td>
  <td>100%, ≤ 24h, = 0 lỗi; FRM/WI/SOP tham chiếu khi cần.</td>
</tr>
</tbody>
</table></div>
```

### 2.5A Quy tắc thay section an toàn

- Khi cập nhật Section 6, chỉ thay phần nội dung nằm giữa `p6` và `p7`.
- Không được xóa nhầm heading `p6`.
- Không được xóa nhầm heading `p7`.
- Nếu SOP cũ có logic gate hữu ích, phải giữ lại tư duy vận hành đúng rồi mới chuẩn hóa cấu trúc bảng.

### 2.6 Quy tắc viết nội dung IG

| Thành phần | Yêu cầu |
|---|---|
| IG badge | `IG1`, `IG2`, `IG3`... liên tục, bắt đầu từ 1 |
| Tên cổng | Phải là ngôn ngữ điều hành, không mơ hồ |
| Chủ trì | Vai trò có quyền giữ/mở cổng |
| Điểm dừng | Cụ thể, đo được, có thể audit |
| KPI | Có target số hoặc trạng thái đóng/mở |
| Hồ sơ | Chỉ nêu hồ sơ tối thiểu cần có để mở cổng |

### 2.6A KPI thực chiến

KPI của từng IG nên rơi vào một hoặc nhiều nhóm sau:

- `Đúng ngay lần đầu` như `% receipt accepted without re-open`, `% setup release first-pass`.
- `Tốc độ phản ứng` như `≤ 30 phút`, `≤ 1 ca`, `≤ 24 giờ`.
- `Tính đầy đủ bằng chứng` như `100% hồ sơ đủ trường bắt buộc`, `0 lot không truy được`.
- `Hiệu lực containment` như `% suspect range được khoanh trong 1 giờ`.
- `Tính ổn định` như `Cpk tối thiểu`, `% on-time calibration`, `% action đóng đúng hạn`.

### 2.6B Benchmark và ngưỡng số

KPI của Section 6 không được viết kiểu mô tả chung chung. Mỗi KPI phải chỉ ra:

1. **Ngưỡng số hoặc SLA**: ví dụ `>= 98%`, `<= 24 giờ`, `= 0 escape`.
2. **Nguồn dữ liệu chuẩn**: ERP, MES, QMS register, calibration log, audit log, backup log...
3. **Trigger phản ứng**: lệch bao nhiêu thì giữ cổng, mở escalation hoặc mở action.
4. **Căn cứ chốt số**:
   - benchmark chính thức bên ngoài,
   - yêu cầu khách hàng / luật / chuẩn kỹ thuật,
   - hoặc mục tiêu nội bộ được thiết kế chặt hơn benchmark vì mức rủi ro của HESEM.

Không copy số benchmark bên ngoài vào SOP nếu chưa chuyển hóa thành ngưỡng vận hành thực tế của HESEM.

### 2.6C Công thức viết KPI

Mỗi ô KPI nên đọc được theo một trong các mẫu sau:

- `Metric + threshold + trigger`
- `Metric + threshold + source + trigger`
- `Threshold 1 + threshold 2 + zero-defect / zero-escape rule`

Ví dụ đạt chuẩn:

- `100% contract review hoàn tất trước commit; mismatch sau commit = 0; ACK thay đổi khách hàng <= 1 ngày làm việc.`
- `Backup success >= 99%; restore test dữ liệu critical = 100% theo quý; failed restore không có action = 0.`
- `100% tín hiệu out-of-control phản ứng trước lot kế tiếp hoặc <= 1 giờ; đặc tính trọng yếu giữ Cpk/Ppk >= 1.33 hoặc có reaction plan được duyệt.`

Ví dụ không đạt chuẩn:

- `Được kiểm soát tốt.`
- `Đúng hạn và đủ hồ sơ.`
- `Cải thiện liên tục.`

### 2.6D Thư viện KPI khởi điểm theo family

Các ngưỡng dưới đây là starting points thực chiến để viết SOP mới. Không copy mù quáng; phải điều chỉnh theo risk, customer requirement và năng lực HESEM.

| Family | KPI khởi điểm thường dùng |
|---|---|
| Contract review / quotation | `ACK <= 1 ngày làm việc`, `mismatch sau commit = 0`, `100% review trước commit` |
| Engineering release | `100% quyết định phát hành có approver + evidence`, `release sai revision = 0` |
| Receiving / material readiness | `dock-to-ready critical <= 24 giờ`, `supplier document escape = 0`, `100% cert trước setup` |
| Planning / dispatch | `schedule attainment >= 90%`, `0 job dừng vì thiếu readiness planning` |
| Setup / first-piece / FAI | `first-piece pass >= 95%`, `100% mở sản lượng có sign-off + data đo bắt buộc` |
| Production control / restart | `restart không re-authorization = 0`, `suspect range phải khoanh trước restart` |
| Final release / shipping | `document accuracy >= 99.5%`, `thiếu chứng từ bắt buộc = 0`, `100% release map đúng lot/sản phẩm` |
| Invoice / closeout | `first-time-right invoicing >= 98%`, `invoice <= 1 ngày làm việc sau ship release` |
| Access control | `cấp/đổi/thu hồi quyền <= 1 ngày làm việc`, `orphan account = 0`, `privileged review = 100% theo quý` |
| Backup / resilience | `backup success >= 99%`, `restore test = 100% theo chu kỳ`, `failed restore không có action = 0` |
| Records / retention / disposal | `SoR/SSOT xác định = 100%`, `duplicate live record = 0`, `sanitization compliance = 100%` |
| MSA / capability | `GRR < 10%` là tốt, `10–30%` chỉ dùng có điều kiện, `>30%` không chấp nhận nếu không có rationale; `Cpk/Ppk >= 1.33` là ngưỡng tham chiếu phổ biến |

### 2.7 KHÔNG được làm

- ❌ Cố định 5 IG cho mọi SOP.
- ❌ Bắt `số IG = số bước chi tiết`.
- ❌ Dùng `gate-card / gate-grid` cho Section 6.
- ❌ Viết điểm dừng kiểu “đảm bảo chất lượng”, “đúng yêu cầu”.
- ❌ Dùng owner không có quyền mở cổng.

---

## 3. Section 7 — Quy trình chi tiết

### 3.1 Định nghĩa

Section 7 mô tả **trình tự công việc thực tế**. Đây là nơi SOP phải chỉ ra:

- ai làm,
- làm ở đâu,
- làm bằng hệ thống / tài liệu / máy / dụng cụ nào,
- kiểm gì,
- bàn giao gì,
- khi nào dừng,
- khi nào phải quay lại hoặc revalidate.

### 3.2 Số lượng bước chi tiết

**Không giới hạn.** Với SOP vận hành thật, số bước nên do các yếu tố sau quyết định:

- đổi vai trò,
- đổi khu vực / cell / công đoạn,
- đổi trạng thái hệ thống,
- đổi resource chính (`machine`, `program`, `fixture`, `gage`, `material`),
- phát sinh quyết định kiểm soát,
- phát sinh bằng chứng / hồ sơ quan trọng,
- phát sinh `revalidation`, `containment`, `handover`.

### 3.3 Khoảng bước thực tế khuyến nghị

| Loại SOP | Khoảng bước chi tiết thực tế khuyến nghị |
|---|---|
| SOP điều hành/corporate | 7–10 |
| SOP engineering / release / quality planning | 8–12 |
| SOP CNC job-order / machine execution / first-piece / transfer | 10–14 |
| SOP final inspection / shipment / closeout | 8–10 |

### 3.4 Cấu trúc bắt buộc

Section 7 gồm 2 phần:

1. **Flowchart tổng quan**
2. **Chi tiết từng bước**

```html
<h2 class="h2" id="p7">7. Quy trình chi tiết</h2>

<div class="flowchart">
  <div class="flow-step" style="border-color:rgba(21,101,192,0.28);background:linear-gradient(135deg,rgba(21,101,192,0.10) 0%, rgba(255,255,255,0.98) 64%);">
    <div class="flow-num" style="background:linear-gradient(135deg,#1565c0,#1976d2)">1</div>
    <div class="flow-text"><div class="flow-title">Tên bước 1</div></div>
  </div>
  <div class="flow-arrow" style="color:rgba(25,118,210,0.45)">→</div>
  <div class="flow-step" style="border-color:rgba(5,150,105,0.28);background:linear-gradient(135deg,rgba(5,150,105,0.10) 0%, rgba(255,255,255,0.98) 64%);">
    <div class="flow-num" style="background:linear-gradient(135deg,#059669,#10b981)">2</div>
    <div class="flow-text"><div class="flow-title">Tên bước 2</div></div>
  </div>
</div>

<h3>
  <span class="proc-num" style="background:linear-gradient(135deg,#1565c0,#1976d2)">1</span>
  Tên bước 1
</h3>
<p>Mô tả mục tiêu, phạm vi và đầu ra của bước.</p>
<ul class="tight">
  <li>Hành động cụ thể 1</li>
  <li>Hành động cụ thể 2</li>
</ul>
<div class="role-note"><b>Bàn giao bắt buộc:</b> ai giao gì cho ai.</div>
```

### 3.4A Quy tắc thay section an toàn

- Khi cập nhật Section 7, chỉ thay phần nội dung nằm giữa `p7` và `p8`.
- Không được xóa nhầm heading `p7`.
- Không được xóa nhầm heading `p8`.
- Nếu flow cũ và detailed steps cũ không còn phản ánh vận hành thật, phải xóa toàn bộ phần giữa `p7 → p8` và viết lại hoàn toàn.

### 3.5 Cặp duy nhất phải khớp

| Phần | Quy tắc |
|---|---|
| Flowchart Section 7 | Số bubble phải khớp số bước chi tiết |
| Chi tiết từng bước | Mỗi bước phải có heading tương ứng |

**Lưu ý:** quy tắc này **không liên quan** đến số lượng IG ở Section 6.

### 3.5A Quy tắc đồ họa flowchart

- Bubble số ở flowchart phải dùng đúng palette màu xoay của `proc-num`.
- Không để tình trạng cùng một SOP có `proc-num` nhiều màu nhưng balloon flowchart chỉ một màu mặc định.
- Nên có cả hai lớp bảo vệ:
  - HTML sinh ra sẵn inline style cho bubble.
  - CSS toàn cục có fallback palette theo vị trí để file cũ hoặc file viết tay không mất màu.
- Với SOP sinh tự động, nên sinh inline style đồng thời cho `flow-step`, `flow-num` và `flow-arrow`.
- `.active` và `.critical` là lớp ngữ nghĩa bổ trợ; không được thay đổi số thứ tự hay phá vỡ mapping màu theo step index.
- Khi dùng fallback palette trong CSS, phải nhớ `.flow-arrow` nằm xen giữa các `.flow-step`; selector phải map đúng vị trí child thực tế của `.flow-step`.

### 3.5B Kiểm tra kỹ thuật tối thiểu cho flowchart

Trước khi coi là đạt chuẩn, phải xác nhận đồng thời:

1. `flow-num count = proc-num count`
2. Các số bước tăng liên tục từ `1...n`
3. Mỗi bước chi tiết có `h3` tương ứng
4. Với SOP sinh tự động: mỗi `flow-num` có inline style
5. Không có SOP nào rơi về một màu bubble duy nhất chỉ vì thiếu inline style hoặc thiếu fallback CSS

### 3.6 Khi nào phải tách thành bước mới

Phải tách thành bước riêng nếu có một trong các dấu hiệu sau:

1. Đổi vai trò chủ trì.
2. Đổi nguồn dữ liệu hoặc hệ thống chuẩn.
3. Đổi máy / đồ gá / chương trình / phương pháp đo.
4. Bắt đầu hoặc kết thúc một kiểm soát chất lượng riêng.
5. Có handover thực sự giữa các bên.
6. Có điểm `HOLD / review / approval / revalidation`.
7. Có risk window cần xác định `last-known-good` hoặc `suspect range`.

### 3.7 KHÔNG được làm

- ❌ Flowchart 5 bước nhưng phần chi tiết 9 bước.
- ❌ Gộp `setup`, `prove-out`, `first-piece`, `FAI`, `release` vào một bước duy nhất.
- ❌ Viết bước kiểu “thực hiện theo quy định”.
- ❌ Gò số bước cho đẹp bố cục.
- ❌ Bắt Section 7 đi theo đúng số IG.

---

## 4. Mapping giữa Section 6 và Section 7

### 4.1 Quy tắc mapping

Mỗi SOP phải có tư duy mapping như sau:

- **Section 6** = kiểm soát theo **điểm mở cổng**
- **Section 7** = mô tả theo **dòng công việc thực thi**

Vì vậy:

- một IG có thể bao trùm nhiều bước,
- nhiều bước có thể cùng đi tới một IG,
- một SOP vẫn có thể dùng ít IG nhưng nhiều bước chi tiết nếu quy trình có nhiều bàn giao nội bộ,
- chỉ khi quy trình thật sự rất ngắn thì số IG và số bước mới vô tình bằng nhau.

### 4.2 Ví dụ mapping tốt

| IG | Mục tiêu cổng | Bước chi tiết thường nằm dưới cổng này |
|---|---|---|
| IG1 | Khóa đầu vào đúng | B1 tiếp nhận, B2 rà soát yêu cầu |
| IG2 | Baseline / route / package sẵn sàng | B3 release package, B4 hoạch định nguồn lực |
| IG3 | Readiness tại hiện trường | B5 material/tool/fixture/gage ready, B6 setup ready |
| IG4 | Chứng minh process trước chạy loạt | B7 prove-out, B8 first-piece / FAI |
| IG5 | Kiểm soát chạy loạt | B9 production execution, B10 in-process reaction / revalidation |
| IG6 | Release cuối | B11 final inspection + ship release |
| IG7 | Closeout | B12 shipment close + costing + learn-back |

### 4.3 Dấu hiệu mapping xấu

- 5 IG và 5 bước lặp y hệt tên nhau.
- IG chỉ là bản sao rút gọn của procedure heading.
- Không có bước riêng cho `handover`, `revalidation`, `containment`, `closeout`.

---

## 5. Mô hình tham chiếu cho CNC job-order

HESEM **không dùng giới hạn 5 cổng / 5 bước** cho SOP job-order CNC.

### 5.1 Mốc tham chiếu mặc định

Đối với SOP CNC job-order end-to-end hoặc SOP có nhiều bàn giao giữa Engineering, Planning, QA, Setup, Machining, QC và Shipping:

- **IG tham chiếu tốt:** `6–7`
- **Bước chi tiết tham chiếu tốt:** `10–14`

### 5.2 Mô hình khuyến nghị nền

Mô hình tham chiếu hiện hành của core standard là:

- **7 Internal Gates**
- **12 bước chi tiết**

Chi tiết đầy đủ xem file:

- `core-standards/reference/cnc-job-order-reference-model.md`

### 5.3 Ý nghĩa của mô hình 7/12

Mô hình này cho phép tách riêng:

- khóa yêu cầu,
- khóa baseline package,
- readiness vật tư / dụng cụ / máy / đồ gá,
- setup & prove-out,
- first-piece / FAI,
- chạy loạt có reaction plan,
- final release và closeout.

Đây là mức phân rã phù hợp hơn nhiều cho job-shop CNC so với mô hình 5/5 nén cơ học.

---

## 6. Checklist trước khi submit SOP

### 6.1 Section 6

- [ ] Dùng IG table, không dùng gate-card/gate-grid
- [ ] Số IG do quy trình quyết định, không áp số cứng
- [ ] Mỗi IG có owner, hold point, KPI/hồ sơ tối thiểu
- [ ] Không dùng từ mơ hồ cho điều kiện mở cổng
- [ ] KPI trong từng IG có số/SLA thật, không chỉ là câu mô tả

### 6.2 Section 7

- [ ] Có flowchart ở đầu section 7
- [ ] Flowchart steps = detailed steps
- [ ] Detailed steps không bị ép bằng số IG
- [ ] Có đủ bước cho setup, prove-out, first-piece, release, reaction, closeout khi SOP cần
- [ ] Có handover rõ ở các điểm đổi vai trò
- [ ] Bubble flowchart có màu đúng từng bước, không rơi về một màu mặc định

### 6.3 Logic tổng thể

- [ ] Section 6 trả lời đúng câu hỏi kiểm soát
- [ ] Section 7 trả lời đúng câu hỏi vận hành
- [ ] SOP không bị “đẹp để trình bày” nhưng thiếu logic thực thi

---

## 7. Anti-patterns cần chặn ở mức core standard

1. Đồng nhất `IG = step`.
2. Đồng nhất `số gate dashboard = số gate trong SOP`.
3. Dùng 5 bước cho mọi quy trình để dễ dựng flowchart.
4. Dùng cùng một cụm từ cho tên gate và tên step mà không có ý nghĩa vận hành khác nhau.
5. Bỏ qua `revalidation`, `containment`, `work transfer`, `closeout`.

---

## 8. Kết luận chuẩn áp dụng

Từ ngày **2026-03-27**, core standard của HESEM áp dụng rõ ràng như sau:

- **Không giới hạn số cổng kiểm soát nội bộ.**
- **Không giới hạn số bước quy trình chi tiết.**
- **Nghiêm cấm ép cơ học số IG bằng số bước chi tiết.**
- **SOP CNC job-order phải được mô hình hóa theo thực tế vận hành, không theo bố cục hình thức.**
