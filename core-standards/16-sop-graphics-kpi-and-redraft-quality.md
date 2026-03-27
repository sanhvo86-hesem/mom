# 16. SOP Graphics, KPI và Redraft Quality Gate

> Version: v1 | Date: 2026-03-27 | Owner: QMS Engineer

---

## 1. Mục tiêu

Tài liệu này khóa các bài học vận hành và lỗi gốc đã gặp trong đợt chuẩn hóa SOP ngày 2026-03-27 để:

- không tái diễn lỗi flowchart chỉ còn một màu bubble,
- không tái diễn KPI viết cho có, không có giá trị điều hành,
- không tái diễn note biên tập lọt vào body SOP,
- không tái diễn việc tăng version cơ học hoặc để sót version cũ trong tài liệu chưa phát hành,
- không tái diễn cập nhật Section 6 / 7 theo template máy móc mà không bám logic SOP thật.

Tài liệu này bắt buộc đọc khi:

- tạo SOP mới,
- viết lại Section 6,
- viết lại Section 7,
- sửa generator/script sinh SOP,
- rà chất lượng trước khi coi một SOP là hoàn tất.

---

## 2. Bài học gốc phải khóa

### 2.1 Lỗi đồ họa flowchart từng xảy ra

Lỗi đã gặp:

- `proc-num` ở phần bước chi tiết có màu xoay đúng,
- nhưng `flow-num` ở flowchart rơi về một màu mặc định hoặc không có màu balloon tương ứng.

Nguyên nhân gốc có thể đến từ một hoặc nhiều điểm:

1. Generator không sinh inline style cho từng `flow-step` / `flow-num` / `flow-arrow`.
2. CSS fallback không có hoặc viết sai logic child position.
3. Flowchart có `.flow-arrow` nằm xen giữa `.flow-step`, nên nếu chọn `nth-child` ngây thơ sẽ map sai màu.
4. `.active` hoặc `.critical` ghi đè bubble màu của step thay vì chỉ bổ trợ border/background.

### 2.2 Lỗi KPI từng xảy ra

Lỗi đã gặp:

- KPI chỉ viết kiểu `được kiểm soát`, `đúng hạn`, `đủ hồ sơ`,
- KPI không có ngưỡng số,
- KPI không có nguồn dữ liệu,
- KPI không có trigger phản ứng,
- KPI copy từ family khác sang mà không bám đúng nature của gate đó.

### 2.3 Lỗi hygiene từng xảy ra

Lỗi đã gặp:

- note kiểu `Bổ sung theo note`, `Liên kết note`, `Quy tắc dùng thuật ngữ`, `so với bản trước` lọt vào SOP,
- header còn sót `V1` trong khi tài liệu chưa phát hành,
- rationale benchmark hoặc note biên tập bị lẫn vào body tài liệu vận hành.

---

## 3. Chuẩn đồ họa flowchart phải giữ

### 3.1 Hai lớp bảo vệ bắt buộc

Đồ họa flowchart đúng chuẩn phải được bảo vệ bởi cả hai lớp:

1. **Lớp 1: inline style do generator sinh ra**
2. **Lớp 2: CSS fallback toàn cục trong `assets/style.css`**

Không được chỉ dựa vào một lớp.

### 3.2 Lớp 1: quy tắc cho generator / HTML sinh mới

Với SOP sinh mới bằng script, mỗi bước flowchart nên có:

- `flow-step` có inline `border-color` và `background`
- `flow-num` có inline `background:linear-gradient(...)`
- `flow-arrow` có inline `color`

Ví dụ tối thiểu:

```html
<div class="flow-step" style="border-color:rgba(21,101,192,0.28);background:linear-gradient(135deg,rgba(21,101,192,0.10) 0%, rgba(255,255,255,0.98) 64%);">
  <div class="flow-num" style="background:linear-gradient(135deg,#1565c0,#1976d2)">1</div>
  <div class="flow-text"><div class="flow-title">Tên bước</div></div>
</div>
<div class="flow-arrow" style="color:rgba(25,118,210,0.45)">→</div>
```

### 3.3 Lớp 2: quy tắc cho CSS fallback

CSS fallback phải:

- áp lên `.flowchart > .flow-step`,
- map màu theo vị trí child thực tế của `.flow-step`,
- nhớ rằng `.flow-arrow` nằm xen giữa các step.

Vì vậy selector fallback thường phải đi theo pattern kiểu:

- `20n+1`
- `20n+3`
- `20n+5`
- ...

Không được viết fallback như thể mọi child trong `.flowchart` đều là step.

### 3.4 Quan hệ với `.active` và `.critical`

`.active` và `.critical` chỉ để:

- nhấn border,
- nhấn nền block,
- thêm ngữ nghĩa thị giác cho bước quyết định / bước kiểm tra.

Không được dùng `.active` hoặc `.critical` để làm mất:

- số thứ tự thật,
- mapping màu thật giữa flowchart và `proc-num`,
- tính nhất quán của palette theo step index.

### 3.5 Palette chuẩn

Palette xoay chuẩn hiện hành:

| Step | Gradient |
|---|---|
| 1 | `#1565c0 → #1976d2` |
| 2 | `#059669 → #10b981` |
| 3 | `#d97706 → #f59e0b` |
| 4 | `#7c3aed → #8b5cf6` |
| 5 | `#dc2626 → #ef4444` |
| 6 | `#0891b2 → #06b6d4` |
| 7 | `#c2410c → #ea580c` |
| 8 | `#4338ca → #6366f1` |
| 9 | `#15803d → #22c55e` |
| 10 | `#be185d → #ec4899` |

### 3.6 Kiểm tra đồ họa tối thiểu

Trước khi coi flowchart là đạt chuẩn, phải xác nhận:

1. `flow-num count = proc-num count`
2. Số bước tăng liên tục `1...n`
3. Mỗi `flow-num` map đúng một `proc-num`
4. SOP sinh tự động có inline style trên `flow-num`
5. File cũ / file viết tay vẫn có màu nhờ CSS fallback
6. Không còn SOP nào rơi về một màu mặc định chỉ vì thiếu inline style

---

## 4. Chuẩn KPI Section 6 phải giữ

### 4.1 Mỗi IG phải trả lời đủ 5 câu hỏi

Mỗi hàng IG phải trả lời đủ:

1. Giữ cổng này để làm gì.
2. Ai có quyền giữ / mở cổng.
3. Khi nào bắt buộc HOLD.
4. Đo hiệu lực cổng bằng chỉ số nào.
5. Nếu lệch, hệ thống phải phản ứng ra sao.

### 4.2 Công thức KPI đạt chuẩn

Một câu KPI đạt chuẩn nên đọc được theo dạng:

`metric + threshold + source or operating context + reaction trigger`

Ví dụ:

- `100% contract review hoàn tất trước commit; mismatch sau commit = 0; ACK thay đổi khách hàng <= 1 ngày làm việc.`
- `Backup success >= 99%; restore test dữ liệu critical = 100% theo quý; failed restore không có action = 0.`
- `100% tín hiệu out-of-control phản ứng trước lot kế tiếp hoặc <= 1 giờ; đặc tính trọng yếu giữ Cpk/Ppk >= 1.33 hoặc có reaction plan được duyệt.`

### 4.3 KPI không đạt chuẩn nếu

- không có số,
- không có SLA,
- không có nguồn đo,
- không có trigger phản ứng,
- không nói lên hiệu lực của cổng,
- chỉ là câu mô tả đẹp.

Ví dụ không đạt chuẩn:

- `được kiểm soát`
- `đúng hạn`
- `đủ hồ sơ`
- `cải thiện liên tục`
- `đảm bảo an toàn dữ liệu`

### 4.4 Căn cứ chốt số KPI

Mỗi KPI nên được chốt từ một trong ba nguồn:

1. **Yêu cầu cứng**: luật, chuẩn, customer requirement, technical standard
2. **Benchmark chính thức**: APQC, Minitab, NIST, tài liệu chính thức ERP/MES/QMS, hoặc nguồn kỹ thuật tương đương
3. **Target nội bộ suy luận**: chặt hơn benchmark vì risk hoặc cách vận hành của HESEM

Nếu là target nội bộ suy luận, phải ghi rationale trong working note hoặc hồ sơ soạn thảo, không ghi vào body SOP.

### 4.5 KPI family khởi điểm nên nhớ

Các số dưới đây là điểm khởi đầu thực chiến, không phải luật cứng cho mọi SOP:

| Family | Starting point nên cân nhắc |
|---|---|
| Contract review / ACK | `ACK <= 1 ngày làm việc`, `mismatch sau commit = 0` |
| Engineering release | `100% có approver + evidence`, `release sai revision = 0` |
| Receiving / material readiness | `dock-to-ready critical <= 24 giờ`, `supplier document escape = 0` |
| Planning / dispatch | `schedule attainment >= 90%` |
| First-piece / FAI | `pass ngay lần đầu >= 95%` |
| Production restart / hold | `restart không re-authorization = 0` |
| Final release / shipping | `document accuracy >= 99.5%`, `thiếu chứng từ = 0` |
| Invoice / closeout | `first-time-right invoicing >= 98%`, `invoice <= 1 ngày làm việc` |
| Access control | `cấp/đổi/thu hồi quyền <= 1 ngày làm việc`, `orphan account = 0` |
| Backup / restore | `backup success >= 99%`, `restore test = 100% theo chu kỳ` |
| Records / retention / disposal | `duplicate live record = 0`, `sanitization compliance = 100%` |
| MSA / capability | `GRR < 10%` là tốt, `10–30%` chỉ dùng có điều kiện, `Cpk/Ppk >= 1.33` là ngưỡng tham chiếu phổ biến |

### 4.6 KPI family không được copy ngang

Không được lấy KPI từ family này gán cơ học sang family khác.

Ví dụ sai:

- lấy KPI setup-machine gán cho `Retention và secure disposal`
- lấy KPI finance gán cho gate `learn-back` chỉ vì có chữ `close`
- lấy KPI FAI vì substring `fai` vô tình match từ `failure`

Vì vậy mọi script map title → KPI family phải:

- ưu tiên token-aware matching,
- không dùng substring ngây thơ,
- có audit sau khi sinh.

---

## 5. Hygiene bắt buộc cho SOP chưa phát hành

### 5.1 Version

- Tài liệu chưa phát hành lần đầu luôn giữ `V0`.
- Không được nâng `V1`, `V1.x`, `V2` chỉ vì draft đã qua nhiều vòng sửa.

### 5.2 Những gì không được xuất hiện trong body

- `Bổ sung theo note`
- `Liên kết note`
- `Quy tắc dùng thuật ngữ`
- `so với bản trước`
- `điểm mới`
- note benchmark
- note reasoning của AI
- note editorial / implementation

### 5.3 Nơi được phép giữ dấu vết soạn thảo

Nếu cần lưu:

- benchmark sources,
- lý do chọn số KPI,
- khác biệt giữa draft cũ và draft mới,
- mapping logic của script,

thì lưu ở:

- DCR,
- review log,
- working memo,
- core-standard,
- generator profile,
- commit history.

Không lưu trong body SOP vận hành.

---

## 6. Quality gate khi viết lại Section 6 / 7

### 6.1 Trước khi sửa

Phải làm xong:

1. đọc tài liệu cũ,
2. xác định logic vận hành nào phải giữ,
3. nghiên cứu nguồn ngoài phù hợp,
4. chốt số IG theo control architecture,
5. chốt số bước theo operating sequence.

### 6.2 Khi sửa Section 6

- chỉ thay phần giữa `p6` và `p7`,
- không xóa nhầm heading `p6`,
- không xóa nhầm heading `p7`,
- xóa toàn bộ logic cũ nếu nó sai bản chất, không “vá” nửa vời.

### 6.3 Khi sửa Section 7

- chỉ thay phần giữa `p7` và `p8`,
- không xóa nhầm heading `p7`,
- không xóa nhầm heading `p8`,
- nếu flow cũ và detailed steps cũ không còn đúng, xóa và viết lại toàn bộ Section 7.

### 6.4 Sau khi sửa

Phải kiểm:

1. `flowchart steps = detailed steps`
2. bubble màu đúng
3. KPI numeric thật
4. không còn editorial notes
5. header version đúng `V0` nếu chưa issue
6. Section 6 và Section 7 không bị cập nhật cơ học theo template

---

## 7. Yêu cầu với generator / script

Generator tạo SOP không được chỉ “đẻ HTML”, mà phải có self-check tối thiểu:

1. kiểm `flow-num count = proc-num count`
2. kiểm tất cả `flow-num` sinh mới có inline style
3. kiểm không còn chuỗi editorial cấm
4. kiểm KPI của các hàng IG có số hoặc SLA
5. kiểm mapping title family không còn `NONE`
6. dùng token-aware matching, không dùng substring ngây thơ cho family classification

Nếu một generator không vượt các kiểm này, không được dùng để tái sinh hàng loạt.

---

## 8. Checklist chốt cuối cho người viết hoặc QA

- [ ] Header version đúng `V0` nếu tài liệu chưa phát hành lần đầu
- [ ] Không còn note biên tập trong body
- [ ] Không còn note benchmark / note thuật ngữ trong body
- [ ] Flowchart bubble có palette đúng
- [ ] Flowchart không rơi về một màu duy nhất
- [ ] Flowchart steps = detailed steps
- [ ] KPI của từng IG có số hoặc SLA thật
- [ ] KPI nói lên hiệu lực cổng, không chỉ là câu mô tả
- [ ] KPI family hợp logic SOP, không copy ngang
- [ ] Section 6 và Section 7 bám tài liệu cũ + research, không làm máy móc

---

## 9. Quan hệ với các core-standard khác

Tài liệu này không thay thế các file dưới đây, mà khóa lớp kiểm soát chất lượng bổ sung:

- `07-content-writing-guide.md`
- `09-versioning-and-workflow.md`
- `11-html-structure-guide.md`
- `12-sop-section-6-7-guide.md`
- `13-sop-research-redraft-method.md`

Nếu có mâu thuẫn giữa template tiện lợi và quality gate trong tài liệu này, quality gate trong tài liệu này được ưu tiên.
