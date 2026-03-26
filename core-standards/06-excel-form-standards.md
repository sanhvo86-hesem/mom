# 06 — Tiêu chuẩn thiết kế biểu mẫu Excel

> Phiên bản: V0 | Hiệu lực: 2025-06-01 | Chủ sở hữu: QMS Engineer
> Tổng hợp từ: CLAUDE-MAX-FORM-TEMPLATE-BRIEF-v1 + LEAN_FORM_SPECS

---

## 1. Mục tiêu

- Thống nhất bố cục, phong cách và cấu trúc cho toàn bộ 111 biểu mẫu Excel của HESEM.
- Đảm bảo mọi form in được trên A4/A3, điền được bằng tay hoặc trên máy, ai cầm vào cũng biết phải làm gì.
- Đồng bộ header, màu sắc, font chữ với hệ thống SOP/WI/ANNEX hiện hành.
- Sẵn sàng cho ISO 9001:2026 và AS9100D ở mức thực tế HESEM.

---

## 2. Phân loại biểu mẫu — 6 loại

### 2.1 TYPE A: Checklist / Gate (38 forms)

**Cấu trúc chuẩn:**

```
Header (brand row + tiêu đề)
Ref (2 dòng tối đa): Job/WO | Part/Rev + Date | Owner
Checklist (6-12 mục): # | Cat | Item | Criteria | Result | Owner
Gate = kết quả tổng hợp từ checklist (KHÔNG tách section gate riêng)
Approval (2 hoặc 3 cột): Prepared | Approved (| thêm cột nếu cần)
Notice
```

**Nguyên tắc:**
- Gate KHÔNG có section riêng — gate chính là kết quả tổng hợp từ checklist.
- Action tracker KHÔNG tách tab riêng — ghi trực tiếp trong checklist nếu HOLD/FAIL.
- Ref fields tối đa 4 field (Job/WO, Part/Rev, Date, Owner).
- Checklist items: 6-12 mục, mỗi mục có criteria rõ ràng và ô Result dạng dropdown.

**Danh sách form TYPE A:**

| Mã | Tên | Ref fields | Số mục check | Approval |
|----|-----|-----------|-------------|----------|
| FRM-102 | Document Change Request | Job/Doc# + Date/Owner | 6 | 2-col |
| FRM-104 | Document Deployment Checklist | Doc# + Date/Owner | 6 | 2-col |
| FRM-110 | M365 Configuration Checklist | System + Date/Owner | 8 | 2-col |
| FRM-111 | Quarterly Access Review | Period + Date/Reviewer | 6 | 2-col |
| FRM-141 | IT Access Request | Requester + Date/Approver | 0 (ref+approval) | 2-col |
| FRM-163 | Configuration Audit Checklist | Job/WO + Date/Auditor | 8 | 2-col |
| FRM-202 | Contract Review Checklist | Customer+PO + Part/Rev | 12 | 3-col |
| FRM-204 | Order Kickoff Checklist | Job/WO + Part/Rev | 8 | 2-col |
| FRM-206 | Job Completion Checklist | Job/WO + Part/Rev | 8 | 2-col |
| FRM-207 | Operational Risk Control | Job/WO + Part/Rev | 8 | 2-col |
| FRM-209 | High-Risk Job Readiness | Job/WO + Part/Rev | 8 | 2-col |
| FRM-212 | Customer Change Request | Job/WO + Customer | 6 | 2-col |
| FRM-303 | DFM Review Checklist | Part/Rev + Customer | 10 | 3-col |
| FRM-304 | Semiconductor Part Classification | Part/Rev + Customer | 6 | 2-col |
| FRM-305 | Inspection Program Release | Part/Rev + Program | 6 | 2-col |
| FRM-403 | Outsourced Process Request | Job/WO + Supplier | 6 | 2-col |
| FRM-404 | Outsource Dispatch Checklist | Job/WO + Supplier | 6 | 2-col |
| FRM-406 | SCAR | Supplier + NCR ref | 5 | 2-col |
| FRM-408 | Requirements Flow-Down | PO# + Supplier | 8 | 2-col |
| FRM-409 | Supplier Audit Checklist | Supplier + Date | 10 | 2-col |
| FRM-411 | Outsource Incoming Verification | Job/WO + Supplier | 6 | 2-col |
| FRM-501 | Planning Release Checklist | Job/WO + Part/Rev | 8 | 2-col |
| FRM-511 | Setup & First-Piece Record | Job/WO+Machine + Part/Rev+Program | 10 | 3-col |
| FRM-518 | Work Transfer Validation | Job/WO + From/To machine | 6 | 2-col |
| FRM-519 | Job Packet Pre-Run Verification | Job/WO + Part/Rev | 6 | 2-col |
| FRM-521 | Preventive Maintenance Checklist | Machine + Date/Tech | 8 | 2-col |
| FRM-522 | Crash Report | Machine + Date/Operator | 5 | 2-col |
| FRM-654 | Customer Satisfaction Survey | Customer + Period | 6 | 2-col |
| FRM-702 | Shipping Checklist | Job/WO + Customer | 8 | 2-col |
| FRM-707 | Packaging Checklist | Job/WO + Part/Rev | 8 | 2-col |
| FRM-709 | Clean Packaging Checklist | Job/WO + Part/Rev | 8 | 2-col |
| FRM-711 | Cleanliness Verification | Job/WO + Part/Rev | 6 | 2-col |
| FRM-715 | Vacuum Clean Build & Bagging | Job/WO + Part/Rev | 8 | 2-col |
| FRM-721 | FOD Line Clearance | Area + Date/Operator | 6 | 2-col |
| FRM-803 | OJT Checklist | Trainee + Skill/Task | 6 | 2-col |
| FRM-821 | Invoice Request | Job/WO + Customer | 0 (ref only) | 2-col |
| FRM-901 | Internal Audit Checklist | Audit# + Scope/Date | 10 | 2-col |
| FRM-902 | Layered Process Audit | Area + Date/Auditor | 8 | 2-col |

---

### 2.2 TYPE B: Report / Event (15 forms)

**Cấu trúc chuẩn:**

```
Header (brand row + tiêu đề)
Ref (2-3 dòng): ID + Job/WO + Date + Source/Severity
Description (vùng nhập tự do, 3 dòng merge)
Disposition / Decision (2 dòng)
Approval (2 cột)
Notice
```

**Nguyên tắc:**
- Containment table KHÔNG tách riêng — gộp vào description.
- Action tracker KHÔNG tách tab — ghi action trong description hoặc liên kết CAPA.
- Description phải đủ rộng để ghi chi tiết sự kiện.

**Danh sách form TYPE B:**

| Mã | Tên | Ref fields | Ghi chú |
|----|-----|-----------|---------|
| FRM-121 | Context Analysis SWOT/PESTLE | Period + Date | A4L |
| FRM-124 | Climate Change Assessment | Period + Date | 1 tab |
| FRM-161 | ECR/ECO | ECR# + Part/Rev + Date | 1 tab |
| FRM-181 | Business Disruption Event | Event# + Date | 1 tab |
| FRM-402 | Supplier Evaluation | Supplier + Date | 1 tab |
| FRM-514 | SMED Changeover Record | Machine+Job + Date | 1 tab |
| FRM-651 | NCR Report | NCR#+Job + Date+Source | 1 tab |
| FRM-652 | CAPA / 8D Report | CAPA#+NCR ref + Date | A4L |
| FRM-653 | A3 PDCA Form | Topic + Date | A3L |
| FRM-712 | Helium Leak Test Record | Job/WO + Part/Rev | 1 tab |
| FRM-714 | Ultrasonic Cleaning Batch | Batch# + Date | 1 tab |
| FRM-801 | Training Plan | Year + Dept | A4L |
| FRM-804 | Competence Assessment | Employee + Skill | 1 tab |
| FRM-808 | Performance Review | Employee + Period | 1 tab |
| FRM-811 | Incident Report | Incident# + Date | 1 tab |
| FRM-911 | Management Review Minutes | Date + Attendees | A4L |

---

### 2.3 TYPE C: Data Log / Register (30 forms)

**Cấu trúc chuẩn:**

```
Header gọn (1 dòng title + 1 dòng subtitle, KHÔNG header 5 dòng đầy đủ)
Dòng tiêu đề cột
Dòng dữ liệu (mở rộng được)
```

**Nguyên tắc:**
- Log form = bảng dữ liệu tác nghiệp. Header tối thiểu. Mật độ dữ liệu tối đa.
- KHÔNG có section header, gate, approval (log không cần phê duyệt từng dòng).
- Định dạng mặc định: A4L (ngang).
- Cột phải đủ hẹp để in trên A4L, không vượt khổ.

**Danh sách form TYPE C:**

| Mã | Tên | Cột chính |
|----|-----|----------|
| FRM-101 | Master Document Register | Code, Title, Rev, Date, Owner, Status |
| FRM-105 | Peer Review Log | Doc#, Reviewer, Date, Result, Comments |
| FRM-106 | Pilot/Dry Run Log | Doc#, Date, Participants, Result, Issues |
| FRM-122 | Interested Parties Register | Party, Needs, Impact, Action |
| FRM-123 | Interested Party Req. Register | Party, Requirement, Source, Compliance |
| FRM-125 | Customer CSR Register | Customer, Requirement, Status, Evidence |
| FRM-131 | Risks & Opportunities Register | Risk/Opp, Likelihood, Impact, RPN, Action, Owner, Status |
| FRM-151 | Lessons Learned Register | Date, Job#, Lesson, Category, Action, Status |
| FRM-162 | Change Impact Matrix | Change#, Area, Impact, Severity, Action |
| FRM-171 | Communication Plan & Log | Topic, Audience, Method, Frequency, Owner |
| FRM-201 | RFQ Register | RFQ#, Customer, Part, Date, Status, Value |
| FRM-205 | Job Dossier Evidence Index | Job#, Document, Location, Status |
| FRM-211 | Complaint Log | Complaint#, Date, Customer, Description, Status, Action |
| FRM-213 | RMA Tracking Log | RMA#, Date, Customer, Part, Qty, Status |
| FRM-221 | Customer Property Register | Item, Customer, Received, Condition, Location, Status |
| FRM-401 | PO Exception Tracker | PO#, Supplier, Issue, Date, Status, Action |
| FRM-405 | Supplier Scorecard | Supplier, Quality%, Delivery%, Response, Score, Status |
| FRM-413 | HOLD & Disposition Log | Hold#, Date, Part, Qty, Reason, Disposition, Status |
| FRM-502 | Daily Dispatch List | Job#, Part, Qty, Machine, Priority, Status |
| FRM-503 | WIP Aging Report | Job#, Part, Age(days), Operation, Status |
| FRM-504 | Shift Handover Log | Date, Shift, Machine, Status, Issues, Handover |
| FRM-512 | Downtime Log | Date, Machine, Start, End, Duration, Category, Action |
| FRM-513 | Tool Life Log | Tool#, Machine, Part, Life(pcs), Replaced, Status |
| FRM-523 | Tooling Register | Tool#, Type, Machine, Location, Condition, Status |
| FRM-524 | Machine History Log | Date, Machine, Event, Action, Technician |
| FRM-525 | Gage & Measuring Equip Register | Gage#, Type, Range, Cal Due, Status |
| FRM-601 | Calibration Log | Gage#, Date, Source, Result, Next Due, Status |
| FRM-602 | Gage Verification Log | Gage#, Date, Check, Result, By |
| FRM-642 | Final Inspection & CoC Register | Job#, Date, Part, Result, CoC#, Shipped |
| FRM-643 | Safety/Special Char Register | Part, Char#, Description, Method, Frequency |
| FRM-708 | Environment Log | Date, Time, Temp, Humidity, Particle, By |
| FRM-713 | Cleanroom Entry & Gowning Log | Date, Time, Person, Gown#, Entry/Exit |
| FRM-802 | Attendance List | Date, Training, Attendee, Dept, Signature |
| FRM-806 | Certification Tracking Log | Employee, Cert, Issued, Expires, Status |
| FRM-812 | Lighting Log | Date, Area, Lux, Standard, Result, By |

---

### 2.4 TYPE D: Multi-tab ISO (8 forms)

**Nguyên tắc:**
- Chỉ dùng multi-tab khi ISO/AS bắt buộc tách hoặc nội dung quá rộng cho 1 tab.
- Tối đa 2-3 tab. Hầu hết form "multi-tab" cũ giờ chỉ cần 1 tab format A4L/A3L.

| Mã | Tên | Tab 1 | Tab 2 | Lý do |
|----|-----|-------|-------|-------|
| FRM-132 | PFMEA Lite | PFMEA matrix (A3L) | — | 1 tab A3L đủ |
| FRM-133 | Control Plan | Control Plan (A3L) | — | 1 tab A3L đủ |
| FRM-302 | Setup Sheet | Setup (A3L) | Tool List (A4P) | 2 tabs: setup rộng + tool list riêng |
| FRM-311 | FAI Report | FAI+Char (A4L) | Matl/Proc (A4P) | 2 tabs: AS9102 yêu cầu tách |
| FRM-621 | AQL Inspection Record | Record (A4L) | — | 1 tab |
| FRM-631 | SPC/Process Capability | Data+Chart (A4L) | — | 1 tab |
| FRM-641 | Final Inspection Report | Report (A4L) | — | 1 tab |
| FRM-807 | Skills Matrix | Matrix (A3L) | — | 1 tab |

---

### 2.5 TYPE E: Print Labels (5 forms)

**Nguyên tắc:**
- Kích thước in cố định, phù hợp máy in nhãn hoặc cắt từ A4.
- Nội dung tối giản: chỉ thông tin cần thiết để nhận dạng.

| Mã | Tên | Fields |
|----|-----|--------|
| FRM-703 | WIP Tag | Job#, Part/Rev, Qty, Operation, Status |
| FRM-704 | Part ID Label | Part#, Rev, Material, Lot# |
| FRM-705 | Location Label | Location, Rack/Bin, Content |
| FRM-706 | Shipping Label | Customer, PO#, Part, Qty, Ship Date |
| FRM-805 | Skill Level Certificate | Employee, Skill, Level, Issued, Expires |

---

### 2.6 TYPE F: MSA / Statistical (3 forms)

**Nguyên tắc:**
- Form chứa nhiều phép tính, sử dụng công thức Excel auto-calc.
- Dữ liệu nhập vào grid, kết quả tự tính EV/AV/GRR%, bias, linearity, stability.

| Mã | Tên | Format | Ghi chú |
|----|-----|--------|---------|
| FRM-611 | GR&R Study | A4L | Data grid + auto-calc EV/AV/GRR% |
| FRM-612 | Bias/Linearity/Stability | A4L | Data grid + auto-calc |
| FRM-613 | Attribute MSA & CMM Qual | A4L | Data grid + auto-calc |

---

## 3. Quy cách thiết kế chung

### 3.1 Font chữ

| Mục đích | Font | Cỡ | Kiểu |
|----------|------|----|------|
| Tiêu đề form | Segoe UI | 16 pt | Bold |
| Section header | Segoe UI | 11 pt | Bold, chữ trắng |
| Label ô | Segoe UI | 9 pt | Regular |
| Dữ liệu nhập | Segoe UI | 10 pt | Regular |
| Notice / footer | Segoe UI | 8 pt | Italic |

### 3.2 Bảng màu chuẩn

| Thành phần | Mã màu | Mô tả |
|-----------|--------|-------|
| Brand row (dòng thương hiệu) | `#0C2D48` nền, chữ trắng | Navy đậm, dòng đầu tiên của form |
| Accent blue | `#1565C0` | Dùng cho đường kẻ nhấn, icon |
| Gold accent | `#F9A825` | Dùng tiết chế cho nhấn mạnh đặc biệt |
| Section header | Dark blue nền, chữ trắng | Phân chia section rõ ràng |
| Label cells | Light gray `#F5F5F5` hoặc table blue `#E8EAF6` | Ô mô tả, tiêu đề cột |
| Input cells | Very light blue `#E3F2FD` | Ô người dùng nhập liệu |
| Nền trống | Trắng `#FFFFFF` | Vùng không dùng |

### 3.3 Meta box (góc phải header)

Mỗi form PHẢI có meta box ở góc trên bên phải chứa:

| Field | Ví dụ |
|-------|-------|
| Mã biểu mẫu | FRM-511 |
| Phiên bản | Rev 0 |
| Ngày hiệu lực | 2025-06-01 |
| Chủ sở hữu | Production Manager |
| Người phê duyệt | QA Manager |

### 3.4 Bố cục và in ấn

- **Khổ giấy:** A4 Portrait (mặc định) hoặc A4 Landscape / A3 Landscape (ghi rõ trong danh mục).
- **Chiều rộng:** PHẢI vừa 1 trang chiều ngang. Không cho phép tràn sang trang 2 theo chiều ngang.
- **Gridlines:** TẮT khi in. Dùng border ô thay cho gridlines.
- **Margins:** Gọn — Top/Bottom: 1.5 cm, Left/Right: 1.0 cm.
- **Footer:** Mã form + "Page X of Y" ở góc phải dưới.
- **Signature boxes:** Đủ rộng để ký tay khi in (tối thiểu 2.5 cm cao, 5 cm rộng).

### 3.5 Border

- Dùng border mảnh (thin), đều, chuyên nghiệp.
- Border ngoài section: medium.
- KHÔNG dùng border dày (thick) tràn lan.
- KHÔNG để ô trống không có border trong vùng dữ liệu.

---

## 4. Sheet bắt buộc trong mỗi file Excel

Mỗi file `.xlsx` PHẢI có tối thiểu 3 sheet:

### Sheet 1: MASTER-TEMPLATE

- Sheet chính chứa biểu mẫu trống, sẵn sàng sử dụng.
- Tên sheet: `MASTER-TEMPLATE`
- Đây là bản gốc. Người dùng copy sheet này để điền dữ liệu mới.

### Sheet 2: EXAMPLE-FRM-XXX

- Sheet ví dụ đã điền mẫu, giúp người dùng hiểu cách điền.
- Tên sheet: `EXAMPLE-FRM-XXX` (thay XXX bằng mã form, ví dụ: `EXAMPLE-FRM-511`).
- Dữ liệu ví dụ phải thực tế, không dùng "test", "abc", "xxx".

### Sheet 3: LISTS (ẩn)

- Sheet chứa danh sách giá trị cho dropdown (Data Validation).
- Tên sheet: `LISTS`
- Trạng thái: **Hidden** (ẩn, người dùng không thấy).
- Cột A trở đi: mỗi cột là một danh sách dropdown.

---

## 5. Dropdown chuẩn

Các danh sách dropdown sau PHẢI nhất quán trên toàn bộ 111 form:

### 5.1 Kết quả kiểm tra

```
PASS
HOLD
FAIL
NA
```

### 5.2 Quyết định phê duyệt

```
APPROVED
REJECTED
CONDITIONAL
ON HOLD
```

### 5.3 Trạng thái mục

```
OPEN
IN PROGRESS
CLOSED
MONITORING
```

### 5.4 Mức độ nghiêm trọng / ưu tiên

```
LOW
MEDIUM
HIGH
CRITICAL
```

### 5.5 Dropdown bổ sung theo loại form

| Ngữ cảnh | Giá trị |
|-----------|---------|
| Disposition (NCR) | USE AS IS / REWORK / SCRAP / RETURN TO SUPPLIER / MRB |
| Shift | DAY / NIGHT / A / B / C |
| Cleanliness class | CLASS 100 / CLASS 1000 / CLASS 10000 / STANDARD |
| Risk level (FMEA) | 1 / 2 / 3 / 4 / 5 / 6 / 7 / 8 / 9 / 10 |

---

## 6. Điều cấm

| # | Điều cấm | Lý do |
|---|---------|-------|
| 1 | Không tô quá nhiều màu | Gây rối mắt, khó in, không chuyên nghiệp |
| 2 | Không để text nhỏ hơn 8pt | Không đọc được khi in |
| 3 | Không merge ô tràn lan | Gây khó nhập liệu, khó copy, lỗi khi lọc |
| 4 | Không để bảng rộng vượt A4 | Phải in được trên 1 trang chiều ngang |
| 5 | Không nhắc "AI", "generated", "from merged document" | Form là tài liệu chính thức, không ghi nguồn gốc tạo |
| 6 | Không dùng icon, shape, watermark gây nhiễu | Giữ layout sạch, chuyên nghiệp |
| 7 | Không tạo layout đẹp nhưng khó nhập | Ưu tiên dùng được trước, đẹp sau |
| 8 | Không duplicate dữ liệu đã có trong Epicor/M365 | Chỉ ghi dữ liệu cần để ra quyết định và lưu bằng chứng |
| 9 | Không tạo chồng lấn giữa form này với form khác | Mỗi form một mục đích, không trùng scope |
| 10 | Không tự bịa logic không có trong SOP/WI/ANNEX | Form PHẢI bám quy trình active |

---

## 7. Quy tắc đặt tên file

### 7.1 Pattern

```
FRM-XXX_Description_With_Underscores.xlsx
```

**Ví dụ:**
- `FRM-511_Setup_And_First_Piece_Record.xlsx`
- `FRM-651_NCR_Report.xlsx`
- `FRM-101_Master_Document_Register.xlsx`

### 7.2 Quy tắc

- Mã form luôn viết hoa: `FRM-XXX`.
- Dấu gạch dưới `_` giữa các từ trong phần mô tả.
- Không dấu tiếng Việt trong tên file.
- Không khoảng trắng trong tên file.
- Phần mở rộng luôn `.xlsx`.

### 7.3 Thư mục lưu trữ

```
04-Bieu-Mau/
├── 01-FRM-100/     ← Foundation & Document Control (FRM-1xx)
├── 02-FRM-200/     ← Sales & Customer (FRM-2xx)
├── 03-FRM-300/     ← Engineering (FRM-3xx)
├── 04-FRM-400/     ← Supply Chain (FRM-4xx)
├── 05-FRM-500/     ← Production (FRM-5xx)
├── 06-FRM-600/     ← Quality & Inspection (FRM-6xx)
├── 07-FRM-700/     ← Warehouse & Packaging (FRM-7xx)
├── 08-FRM-800/     ← HR, Training & Finance (FRM-8xx)
└── 09-FRM-900/     ← Audit & Improvement (FRM-9xx)
```

---

## 8. Quy tắc bổ sung cho form tác nghiệp xưởng

Form dùng ngoài xưởng (TYPE A liên quan production) PHẢI có các field sau trong Ref block:

| Field | Bắt buộc | Ghi chú |
|-------|---------|---------|
| Job No / WO | PHẢI | Mã công việc từ Epicor |
| Part No | PHẢI | Mã chi tiết |
| Rev | PHẢI | Phiên bản bản vẽ |
| Operation | NÊN | Nguyên công hiện tại |
| Shift | NÊN | Ca làm việc |
| Date | PHẢI | Ngày thực hiện |
| Operator | PHẢI | Người thực hiện |
| QA Hold logic | PHẢI (nếu có gate) | Điều kiện dừng / giữ hàng |

---

## 9. Quy tắc kế thừa từ hệ thống tài liệu

- Giữ cấu trúc thư viện hiện hành làm khung đích.
- Không dịch tên file, slug, mã tài liệu sang tiếng Việt.
- Chỉ Việt hóa nội dung bên trong form.
- Giọng văn ngắn, rõ, dùng để thi hành. Không meta text.
- Form PHẢI bám SOP/WI/ANNEX active, không tự bịa logic.
- Form PHẢI có gate, owner, evidence, decision và approval khi cần.
- Thiết kế PHẢI phù hợp ISO 9001:2026 và sẵn sàng cho AS9100D.

---

## 10. Tổng kết tinh gọn

| Chỉ số | Cũ | Mới | Giảm |
|--------|-----|------|------|
| Tổng visible tabs | ~200+ | 111 (1 tab/form) | -50% |
| Ref fields trung bình | 8-16 | 2-4 | -65% |
| Sections trung bình | 5 | 3 | -40% |
| Forms có Gate section riêng | 38 | 0 (gate = checklist result) | -100% |
| Forms có Action tab riêng | 40+ | 0 (action trong form hoặc link CAPA) | -100% |
