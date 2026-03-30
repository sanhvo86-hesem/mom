# 03 — Quy tắc ngôn ngữ và dịch thuật

> Quy tắc đầy đủ cho việc dịch và biên tập nội dung QMS từ tiếng Anh sang tiếng Việt.
> Áp dụng cho cả dịch thủ công và dịch tự động bằng `context_translate_engine.py`.

---

## A. Nguyên tắc tổng quát

### A1. Ngôn ngữ chính: Tiếng Việt

- Nội dung tài liệu QMS được viết bằng tiếng Việt thuần, rõ ràng, ngắn gọn
- Viết tắt tiếng Anh giữ nguyên (xem danh sách đầy đủ tại mục C)
- Thuật ngữ ngành không có tương đương chính xác giữ nguyên tiếng Anh (xem mục D)
- Không viết hàn lâm, không viết dài dòng — mỗi câu phục vụ vận hành thật
- Mọi nội dung hiển thị trong SOP/WI/ANNEX/JD PHẢI ưu tiên tiếng Việt, trừ các ngoại lệ đã khóa tại mục C, D và A4

### A1a. Quy tắc glossary khi giữ viết tắt tiếng Anh

- Trong glossary, `meaning` PHẢI chứa tên đầy đủ tiếng Anh của term.
- Nếu `term` là viết tắt, không được để `meaning` chỉ lặp lại chính viết tắt đó.
- Nếu query hoặc tài liệu dùng dạng `Full Term (ABBR)`, glossary canonical vẫn phải trả về `ABBR`.
- Khi một role code/JD code được đưa vào glossary, `meaning` vẫn phải là English title đầy đủ, còn `vi` là nhãn tiếng Việt chuẩn hóa.

Chuẩn canonical đầy đủ: xem `25-glossary-canonical-abbreviation-standard.md`.

### A4. Ngoại lệ khóa cứng đã được xác nhận

- Giữ nguyên toàn bộ viết tắt chuẩn ở mục C.
- Giữ nguyên 3 thuật ngữ ngành: `Setup`, `Traveler`, `Balloon`.
- Giữ nguyên các phương pháp/tên học thuyết: `Kaizen`, `Dreyfus`, `Pareto`, `Kolb`, `Poka-yoke`.
- Giữ nguyên tên riêng hệ thống, thương hiệu và danh xưng kỹ thuật như `Epicor`, `Epicor Kinetic`, `SharePoint`, `M365`, `Microsoft 365`, `Entra ID`, `Power Automate`, `Power BI`, `Azure`, `HESEM`, `Zalo`.
- Ngoài các nhóm ngoại lệ trên, phần văn xuôi hiển thị cho người đọc phải được Việt hóa theo đúng ngữ cảnh vận hành.
- Không được vin vào ngoại lệ để giữ lại các cụm nửa Anh nửa Việt như `review plan`, `shipment pack`, `tool readiness`, `change logic`, `route control` nếu đã có bản Việt chuẩn trong mục E và F.

### A2. Quy tắc vàng

| Phần tử | Dịch? | Lý do |
|---------|-------|-------|
| Nội dung text (giữa `>` và `<`) | **CÓ** — dịch sang tiếng Việt | Đây là nội dung người dùng đọc |
| Thẻ `<title>` (tài liệu kiểm soát) | **KHÔNG** — giữ chuẩn English SSOT theo filename | Đồng bộ với `Tên file / tiêu đề chuẩn` trong Portal và tránh mất link khi rename |
| Thuộc tính `href` | **KHÔNG** — giữ nguyên | Đường dẫn file, không phải nội dung |
| Thuộc tính `class` | **KHÔNG** — giữ nguyên | Tên CSS class |
| Thuộc tính `id` | **KHÔNG** — giữ nguyên | Định danh phần tử |
| Thuộc tính `src` | **KHÔNG** — giữ nguyên | Đường dẫn tài nguyên |
| Thuộc tính `style` | **KHÔNG** — giữ nguyên | CSS inline |
| Thuộc tính `data-*` | **KHÔNG** — giữ nguyên | Dữ liệu kỹ thuật |
| Thuộc tính `alt` (ảnh) | **CÓ** — dịch sang tiếng Việt | Mô tả ảnh cho accessibility |
| Thuộc tính `title` (tooltip) | **CÓ** — dịch sang tiếng Việt | Tooltip người dùng đọc |
| Thuộc tính `placeholder` | **CÓ** — dịch sang tiếng Việt | Hướng dẫn nhập liệu |
| Khối `<style>...</style>` | **KHÔNG** — giữ nguyên toàn bộ | Mã CSS |
| Logic/định danh trong `<script>...</script>` | **KHÔNG** — giữ nguyên | Hàm, biến, selector, key kỹ thuật |
| Chuỗi hiển thị trong JavaScript / template literal / JSON UI | **CÓ** — viết tiếng Việt có dấu | Đây là nội dung người dùng nhìn thấy |
| Tên file trong `href`/`download` | **KHÔNG** — giữ nguyên | Tên file thực trên hệ thống |
| Comment HTML `<!-- -->` | **KHÔNG** — giữ nguyên | Comment kỹ thuật |

### A3. Ví dụ minh họa

**Trước (tiếng Anh):**
```html
<h2 class="h2">1) Document Control Procedure</h2>
<p>The document responsible person shall review all changes before release.</p>
<a href="../sop-101-document-and-data-control.html" class="doc-link">
  See SOP-101 — Document and Data Control
</a>
```

**Sau (tiếng Việt):**
```html
<h2 class="h2">1) Quy trình kiểm soát tài liệu</h2>
<p>Người phụ trách tài liệu phải rà soát tất cả thay đổi trước khi phát hành.</p>
<a href="../sop-101-document-and-data-control.html" class="doc-link">
  Xem SOP-101 — Kiểm soát tài liệu và dữ liệu
</a>
```

**Lưu ý:**
- `class="h2"` → giữ nguyên
- `href="../sop-101-document-and-data-control.html"` → giữ nguyên
- `class="doc-link"` → giữ nguyên
- `SOP-101` → giữ nguyên (mã tài liệu)
- Nội dung text → dịch sang tiếng Việt

---

## A+. Danh từ riêng nội bộ — TUYỆT ĐỐI KHÔNG dịch

> ⚠ Xem chi tiết đầy đủ tại `01-immutable-rules.md` mục B3.

Các loại tên sau là **danh từ riêng hệ thống** — dịch sẽ phá vỡ liên kết:

| Loại | Ví dụ | Lý do không dịch |
|------|-------|------------------|
| Tên SharePoint Site | `HESEM-QMS-Cốt lõi`, `HESEM-Con người-Hạn chế`, `HESEM-Số hóa-Control` | Tên định danh site trên M365 |
| Chủ sở hữu site | `QMS-Chủ sở hữu` | Tên nhóm bảo mật M365 |
| Tên cột CamelCase | `RecordType`, `StatusCode`, `JobNum`, `CustomerID`, `EvidenceUrl` | Tên cột kỹ thuật trong M365 Lists/Epicor |
| Tên cột tiếng Việt đặt sẵn | `Người phê duyệt`, `Phiên bản` (khi là tên cột) | Tên cột đã cấu hình trong hệ thống |
| Tên tài khoản/nhóm | `QMS-Chủ sở hữu`, `HESEM-Admin` | Tên security group |

**Cách nhận dạng:** Từ viết dạng CamelCase (chữ hoa xen kẽ) → tên cột kỹ thuật → KHÔNG dịch.

---

## B. Quy tắc chi tiết cho từng loại phần tử

### B1. Heading và tiêu đề

```html
<!-- Dịch nội dung, giữ nguyên class -->
<h1 class="h1">Quy trình kiểm soát tài liệu và dữ liệu</h1>
<h2 class="h2">1) Mục đích và phạm vi</h2>
<h3 class="h3">1.1 Phạm vi áp dụng</h3>
```

### B2. Bảng (table)

```html
<!-- Dịch nội dung ô, giữ nguyên class/id -->
<table class="table">
  <thead>
    <tr>
      <th>Bước</th>
      <th>Hành động</th>
      <th>Người chịu trách nhiệm</th>
      <th>Hồ sơ / Bằng chứng</th>
    </tr>
  </thead>
</table>
```

### B3. Thẻ link và download

```html
<!-- href giữ nguyên, text hiển thị dịch -->
<a href="../../../04-Bieu-Mau/01-FRM-100/FRM-101_Master_Document_Register.xlsx" download>
  📥 FRM-101 — Sổ đăng ký tài liệu chủ
</a>

<!-- Tên file trong download KHÔNG dịch -->
❌ <a href="../FRM-101_So_Dang_Ky_Tai_Lieu.xlsx">
```

### B4. Thẻ meta header

```html
<div class="meta">
  <div class="row"><span><b>Mã:</b></span><span>SOP-101</span></div>
  <div class="row"><span><b>Phiên bản:</b></span><span>V0</span></div>
  <div class="row"><span><b>Ngày hiệu lực:</b></span><span>Theo quyết định ban hành</span></div>
  <div class="row"><span><b>Chủ sở hữu:</b></span><span>Phòng Chất lượng</span></div>
  <div class="row"><span><b>Phê duyệt:</b></span><span>Tổng Giám đốc</span></div>
</div>
```

### B5. Note và callout

```html
<div class="note">
  <strong>Ghi chú:</strong> Mọi thay đổi tài liệu phải được phê duyệt trước khi phát hành.
</div>
<div class="callout">
  <strong>⚠ Lưu ý quan trọng:</strong> Bản in không kiểm soát — luôn kiểm tra phiên bản hiện hành trên hệ thống.
</div>
```

---

## C. Danh sách viết tắt giữ nguyên tiếng Anh

### C1. Hệ thống quản lý chất lượng

| Viết tắt | Nghĩa đầy đủ | Ghi chú |
|----------|---------------|---------|
| QMS | Quality Management System | Hệ thống quản lý chất lượng |
| QA | Quality Assurance | Đảm bảo chất lượng |
| QC | Quality Control | Kiểm soát chất lượng |
| ISO | International Organization for Standardization | |
| AS9100D | Aerospace Quality Management System Standard | |
| PDCA | Plan-Do-Check-Act | Chu trình cải tiến |

### C2. Loại tài liệu và mã

| Viết tắt | Nghĩa | Dùng trong |
|----------|-------|------------|
| SOP | Standard Operating Procedure | Mã quy trình |
| WI | Work Instruction | Mã hướng dẫn |
| FRM | Form | Mã biểu mẫu |
| ANNEX | Annex / Reference Pack | Mã tài liệu tham chiếu |
| REC | Record | Mã hồ sơ |
| RPT | Report | Mã báo cáo |
| CERT | Certificate | Mã chứng chỉ |
| DCR | Document Change Request | Yêu cầu thay đổi tài liệu |

### C3. Thương mại và chuỗi cung ứng

| Viết tắt | Nghĩa |
|----------|-------|
| RFQ | Request for Quotation |
| PO | Purchase Order |
| CSR | Customer Service Representative |
| CoC | Certificate of Conformity |
| CoA | Certificate of Analysis |
| POD | Proof of Delivery |
| BOM | Bill of Materials |
| Incoterms | International Commercial Terms |

### C4. Chất lượng và đo lường

| Viết tắt | Nghĩa |
|----------|-------|
| NCR | Non-Conformance Report |
| CAPA | Corrective and Preventive Action |
| SCAR | Supplier Corrective Action Request |
| FAI | First Article Inspection |
| FMEA | Failure Mode and Effects Analysis |
| PFMEA | Process FMEA |
| MSA | Measurement System Analysis |
| SPC | Statistical Process Control |
| IPQC | In-Process Quality Control |
| AQL | Acceptable Quality Level |
| CTQ | Critical to Quality |
| ALCOA | Attributable, Legible, Contemporaneous, Original, Accurate |
| GR&R | Gage Repeatability & Reproducibility |

### C5. KPI và đo lường hiệu suất

| Viết tắt | Nghĩa |
|----------|-------|
| KPI | Key Performance Indicator |
| OTD | On-Time Delivery |
| FPY | First Pass Yield |
| COPQ | Cost of Poor Quality |
| MTTR | Mean Time to Repair |
| DPPM | Defective Parts Per Million |

### C6. Kỹ thuật và sản xuất

| Viết tắt | Nghĩa |
|----------|-------|
| CNC | Computer Numerical Control |
| NC | Numerical Control |
| DFM | Design for Manufacturability |
| CAM | Computer-Aided Manufacturing |
| CMM | Coordinate Measuring Machine |
| 3D | Three-Dimensional |
| ASME | American Society of Mechanical Engineers |
| ASTM | American Society for Testing and Materials |
| SMED | Single-Minute Exchange of Die |
| LOTO | Lock Out / Tag Out |
| GD&T | Geometric Dimensioning & Tolerancing |

### C7. Hệ thống thông tin và quản trị

| Viết tắt | Nghĩa |
|----------|-------|
| ERP | Enterprise Resource Planning |
| MES | Manufacturing Execution System |
| SSOT | Single Source of Truth |
| SoR | System of Record |
| RACI | Responsible, Accountable, Consulted, Informed |
| RBAC | Role-Based Access Control |
| PDF | Portable Document Format |
| M365 | Microsoft 365 |
| API | Application Programming Interface |

### C8. Quản lý vận hành

| Viết tắt | Nghĩa |
|----------|-------|
| FIFO | First In, First Out |
| FEFO | First Expired, First Out |
| SBAR | Situation, Background, Assessment, Recommendation |
| TIMWOODS | Transport, Inventory, Motion, Waiting, Overprocessing, Overproduction, Defects, Skills |
| SSCC | Serial Shipping Container Code |
| FOD | Foreign Object Debris/Damage |

### C9. Phiên bản

| Viết tắt | Nghĩa |
|----------|-------|
| V0 | Draft / Version 0 |
| V1, V2, V3... | Released versions |

### C10. Hành chính và pháp lý (Việt Nam)

| Viết tắt | Nghĩa |
|----------|-------|
| BHXH | Bảo hiểm xã hội |
| BHYT | Bảo hiểm y tế |
| BHTN | Bảo hiểm thất nghiệp |
| PCCC | Phòng cháy chữa cháy |

### C11. Vật liệu chuyên ngành

| Viết tắt | Nghĩa |
|----------|-------|
| PEEK | Polyether Ether Ketone |
| Vespel | DuPont Vespel polyimide |
| PTFE | Polytetrafluoroethylene |
| SEMI | Semiconductor Equipment and Materials International |

---

## D. Thuật ngữ ngành giữ nguyên tiếng Anh

Các thuật ngữ sau **KHÔNG** dịch khi dùng trong văn bản tiếng Việt vì không có tương đương chính xác hoặc đã trở thành thuật ngữ thông dụng trong ngành:

### D1. Sản xuất CNC

| Thuật ngữ | Ngữ cảnh sử dụng |
|-----------|-------------------|
| **Setup** | Cài đặt máy, chuẩn bị gia công — "hoàn thành Setup trước khi chạy" |
| **Traveler** | Phiếu theo dõi công việc di chuyển cùng sản phẩm — "ghi nhận trên Traveler" |
| **Balloon** | Đánh số đặc tính trên bản vẽ FAI — "Balloon #3 tương ứng kích thước D1" |

### D2. Phần mềm và hệ thống

| Thuật ngữ | Ngữ cảnh sử dụng |
|-----------|-------------------|
| **Epicor** | Phần mềm ERP — "nhập đơn hàng vào Epicor" |
| **SharePoint** | Nền tảng lưu trữ tài liệu — "upload lên SharePoint" |
| **M365** | Microsoft 365 — "cấu hình quyền trên M365" |
| **Zalo** | Ứng dụng nhắn tin — "thông báo qua Zalo" |

### D3. Phương pháp và mô hình

| Thuật ngữ | Ngữ cảnh sử dụng |
|-----------|-------------------|
| **Kaizen** | Cải tiến liên tục — "tổ chức Kaizen event" |
| **Dreyfus** | Mô hình phát triển năng lực 5 cấp — "đánh giá theo Dreyfus" |
| **Pareto** | Phân tích 80/20 — "lập biểu đồ Pareto" |
| **Kolb** | Chu trình học tập — "áp dụng Kolb learning cycle" |
| **Poka-yoke** | Thiết kế chống lỗi — "áp dụng Poka-yoke tại trạm kiểm tra" |

---

## E. Từ điển dịch thuật — Thuật ngữ QMS cốt lõi

### E1. Bảng dịch chuẩn

| Tiếng Anh | Tiếng Việt | Ghi chú |
|-----------|------------|---------|
| document | tài liệu | |
| record | hồ sơ | danh từ |
| release | phát hành | tài liệu |
| approval | phê duyệt | |
| review | rà soát | |
| revision | phiên bản | |
| inspection | kiểm tra | |
| requirement | yêu cầu | |
| evidence | bằng chứng | |
| compliance | tuân thủ | |
| deviation | sai lệch | |
| traceability | truy xuất nguồn gốc | |
| calibration | hiệu chuẩn | |
| competence | năng lực | |
| training | đào tạo | |
| production | sản xuất | |
| quality | chất lượng | |
| customer | khách hàng | |
| supplier | nhà cung cấp | |
| complaint | khiếu nại | |
| incident | sự cố | |
| equipment | thiết bị | |
| maintenance | bảo trì | |
| material | nguyên vật liệu | |
| measurement | đo lường | |
| warehouse | kho | |
| delivery | giao hàng | |
| packaging | đóng gói | |
| operation | vận hành | |
| workshop | phân xưởng | |
| form | biểu mẫu | |
| checklist | bảng kiểm | |
| engineering | kỹ thuật | |
| department | phòng ban | |
| scrap | phế phẩm | |
| rework | làm lại | |
| recall | thu hồi | |
| containment | ngăn chặn | |
| finding | phát hiện | |
| obsolete | hết hiệu lực | |
| superseded | được thay thế | |
| retention | lưu giữ | |
| register | sổ đăng ký | |
| input | đầu vào | |
| output | đầu ra | |

### E2. Chức danh và vai trò

Chức danh JD không đi theo rule dịch thuật thông thường. Phải áp dụng:
- JD title chuẩn giữ bằng tiếng Anh;
- header/RACI/owner/approver dùng role code rút gọn có link JD;
- các hat như `QMR`, `Document Controller`, `Lead Auditor`, `CI Lead`, `Product Safety Officer`, `Incident Commander` không đứng độc lập, mà phải gắn lên host role thật;
- không dùng nửa Anh nửa Việt kiểu `QA Lead`, `Customer Dịch vụ`, `Production Engineer-IE`, `Governance viên hệ thống Epicor`.

| Tiếng Anh | Tiếng Việt |
|-----------|------------|
| General Director | Tổng Giám đốc |
| Production Director | Giám đốc Sản xuất |
| Document Responsible Person | Người phụ trách tài liệu |
| Team Leader | Tổ trưởng |
| Shift Leader | Trưởng ca |
| Cell Leader | Tổ trưởng |
| Foreman | Quản đốc |
| Operator | Người vận hành |
| Inspector | Người kiểm tra |
| Approver | Người phê duyệt |
| Reviewer | Người rà soát |
| Author | Người soạn |
| Performer | Người thực hiện |
| Specialist | Chuyên viên |
| Worker | Công nhân |
| Administrator | Quản trị viên |

### E3. Phòng ban

| Tiếng Anh | Tiếng Việt |
|-----------|------------|
| Quality Department | Phòng Chất lượng |
| Engineering Department | Phòng Kỹ thuật |
| Production Department | Phòng Sản xuất |
| Supply Chain | Chuỗi cung ứng |
| Finance Department | Phòng Tài chính |
| HR Department | Phòng Nhân sự |
| EHS Department | Phòng An toàn – Sức khỏe – Môi trường |

### E4. Cụm từ thường gặp

| Tiếng Anh | Tiếng Việt |
|-----------|------------|
| point-of-use | điểm sử dụng |
| cross-review | rà soát chéo |
| hold point | điểm chặn |
| control gate | cổng kiểm soát |
| controlled copy | bản kiểm soát |
| master copy | bản gốc |
| release copy | bản phát hành |
| job dossier | hồ sơ công việc |
| readiness level | mức sẵn sàng |
| lead department | bộ phận chủ trì |
| internal audit | đánh giá nội bộ |
| management review | xem xét của lãnh đạo |
| continual improvement | cải tiến liên tục |
| change control | kiểm soát thay đổi |
| control plan | kế hoạch kiểm soát |
| setup sheet | phiếu cài đặt |
| tool list | danh sách dao cụ |
| lessons learned | bài học kinh nghiệm |
| production line | dây chuyền sản xuất |
| tracking register | bảng theo dõi |
| audit trail | dấu vết kiểm toán |
| mandatory hold point | điểm dừng bắt buộc |
| emergency release | phát hành khẩn cấp |
| legal hold | giữ pháp lý |
| wrong revision | sai phiên bản |
| related documents | tài liệu liên quan |
| revision history | lịch sử sửa đổi |
| responsible person | người phụ trách |
| Per issuance decision | Theo quyết định ban hành |

---

## F. Từ đa nghĩa — Dịch theo ngữ cảnh

Một số từ tiếng Anh có nhiều nghĩa tiếng Việt tùy ngữ cảnh. **PHẢI** chọn đúng nghĩa:

### F1. "process"

| Ngữ cảnh | Dịch | Ví dụ |
|-----------|------|-------|
| Danh từ (quy trình) | **quy trình** | "the manufacturing process" → "quy trình sản xuất" |
| Động từ (xử lý) | **xử lý** | "process the order" → "xử lý đơn hàng" |
| Danh từ (quá trình) | **quá trình** | "the audit process" → "quá trình đánh giá" |

### F2. "release"

| Ngữ cảnh | Dịch | Ví dụ |
|-----------|------|-------|
| Tài liệu | **phát hành** | "release the document" → "phát hành tài liệu" |
| Sản phẩm tạm giữ | **giải phóng** | "release from hold" → "giải phóng khỏi tạm giữ" |
| Lô hàng | **cho xuất** | "release for shipment" → "cho xuất hàng" |

### F3. "record"

| Ngữ cảnh | Dịch | Ví dụ |
|-----------|------|-------|
| Danh từ | **hồ sơ** | "quality records" → "hồ sơ chất lượng" |
| Động từ | **ghi nhận** | "record the result" → "ghi nhận kết quả" |

### F4. "hold"

| Ngữ cảnh | Dịch | Ví dụ |
|-----------|------|-------|
| QMS (tạm giữ sản phẩm) | **tạm giữ** | "put on hold" → "đưa vào tạm giữ" |
| Hold point (điểm chặn) | **điểm chặn** | "mandatory hold point" → "điểm chặn bắt buộc" |
| Legal hold | **giữ pháp lý** | "legal hold" → "giữ pháp lý" |

### F5. "control"

| Ngữ cảnh | Dịch | Ví dụ |
|-----------|------|-------|
| Kiểm soát (quản lý) | **kiểm soát** | "document control" → "kiểm soát tài liệu" |
| Điều khiển (máy) | **điều khiển** | "CNC control" → "điều khiển CNC" |
| Kiểm tra (gate) | **kiểm soát** | "control gate" → "cổng kiểm soát" |

### F6. "review"

| Ngữ cảnh | Dịch | Ví dụ |
|-----------|------|-------|
| Rà soát (tài liệu) | **rà soát** | "peer review" → "rà soát chéo" |
| Xem xét (lãnh đạo) | **xem xét** | "management review" → "xem xét của lãnh đạo" |
| Đánh giá (hiệu suất) | **đánh giá** | "performance review" → "đánh giá hiệu suất" |

### F7. "audit"

| Ngữ cảnh | Dịch | Ví dụ |
|-----------|------|-------|
| Đánh giá (nội bộ/bên ngoài) | **đánh giá** | "internal audit" → "đánh giá nội bộ" |
| Kiểm toán (tài chính) | **kiểm toán** | "financial audit" → "kiểm toán tài chính" |
| Rà soát (dữ liệu) | **rà soát** | "audit trail" → "dấu vết kiểm toán" |

### F8. "verify" vs "validate"

| Từ | Dịch | Nghĩa |
|----|------|-------|
| verify | **xác minh** | Xác nhận đúng yêu cầu đã định (kiểm tra theo spec) |
| validate | **xác nhận giá trị sử dụng** | Xác nhận đáp ứng nhu cầu thực tế (dùng được thật) |

---

## G. Công cụ dịch tự động

### G2. Engine chính: `context_translate_engine.py`

**Vị trí:** `tools/context_translate_engine.py`

**Chức năng:**
- Dịch text node trong file HTML từ tiếng Anh sang tiếng Việt
- Chỉ dịch nội dung text — không động đến HTML tag, thuộc tính, CSS, JS
- Dùng thuật toán longest-match-first để xử lý cụm từ nhiều từ
- Tôn trọng danh sách viết tắt (giữ nguyên tiếng Anh)
- Load từ điển từ file Excel

**Cách chạy:**
```bash
# Dịch một file
python tools/context_translate_engine.py path/to/file.html

# Dịch nhiều file (dùng glob)
python tools/context_translate_engine.py "03-Tai-Lieu-Van-Hanh/01-SOPs/**/*.html"
```

**Thứ tự ưu tiên từ điển:**
1. `CORE_DICT` — từ điển cốt lõi trong code (ưu tiên cao nhất)
2. `tools/qms-terminology-dictionary.xlsx` — từ điển thuật ngữ QMS
3. `tools/remaining-english-words.xlsx` — danh sách từ bổ sung (5008 entries)

### G3. File từ điển

| File | Vị trí | Mô tả | Số lượng |
|------|--------|-------|---------|
| `qms-terminology-dictionary.xlsx` | `tools/` | Từ điển thuật ngữ QMS chính | ~200+ entries |
| `remaining-english-words.xlsx` | `tools/` | Danh sách từ tiếng Anh cần dịch | 5008 entries |
| `remaining-english-words-v2.xlsx` | `tools/` | Phiên bản cập nhật | Cập nhật |

### G4. Danh sách viết tắt giữ nguyên (trong engine)

Engine tự động nhận diện và bỏ qua các viết tắt sau (trích từ `KEEP_ENGLISH` set):

```
QMS, QA, QC, IT, HR, EHS, ENG, PRO, PUR, WHS, MNT, SAL, FIN, HSE,
CNC, OPS, PLA, NCR, CAPA, DCR, SOP, WI, FRM, ANNEX, REC, RPT, CERT,
RFQ, PO, CSR, CoC, CoA, POD, BOM, KPI, OTD, FPY, COPQ, MSA, SPC,
IPQC, FAI, FMEA, PFMEA, SSOT, SoR, RACI, ISO, CTQ, AS9100D, PDCA,
FIFO, FEFO, ALCOA, SCAR, LOTO, SMED, ASME, ASTM, RBAC, MTTR, BHXH,
BHYT, BHTN, PCCC, PTFE, SEMI, Kaizen, Dreyfus, Pareto, Kolb,
Epicor, SharePoint, M365, HESEM, Zalo, Incoterms, PEEK, Vespel,
Setup, Traveler, Balloon, NC, CAM, 3D, CMM, DFM, PDF, USB, URL, API,
ERP, MES, TIMWOODS, SBAR, SSCC, YYYYMMDD
```

---

## H. Quy tắc phong cách viết

### H0. Tiếng Việt BẮT BUỘC có dấu đầy đủ

> ⚠ **QUY TẮC BẮT BUỘC:** Mọi nội dung tiếng Việt trong tài liệu **PHẢI** có dấu đầy đủ, chính xác.

- **KHÔNG** viết tiếng Việt không dấu: ~~"Kiem tra chat luong"~~ → ✅ "Kiểm tra chất lượng"
- **KHÔNG** viết thiếu dấu: ~~"Kiêm tra"~~ → ✅ "Kiểm tra"
- **KHÔNG** viết sai dấu: ~~"Kiểm trà"~~ → ✅ "Kiểm tra"
- Áp dụng cho: tiêu đề, nội dung, bảng, ghi chú, tooltip, alt text — mọi nơi hiển thị tiếng Việt
- Ngoại lệ DUY NHẤT: viết tắt tiếng Anh (SOP, NCR, CAPA...) và danh từ riêng

### H0.1 Danh từ riêng — KHÔNG dịch

> ⚠ Xem danh sách đầy đủ tại `01-immutable-rules.md` mục B3.

Danh từ riêng là tên **định danh duy nhất** trong hệ thống. Dịch sẽ phá vỡ liên kết.

| Loại | Ví dụ | Quy tắc |
|------|-------|---------|
| Tên SharePoint Site | `HESEM-QMS-Cốt lõi`, `HESEM-Con người-Hạn chế` | Giữ nguyên 100% |
| Tên chủ sở hữu | `QMS-Chủ sở hữu` | Giữ nguyên 100% |
| Tên cột CamelCase | `RecordType`, `JobNum`, `CustomerID` | Giữ nguyên 100% |
| Tên cột VN đặt sẵn | `Người phê duyệt`, `Phiên bản` (khi là tên cột) | Giữ nguyên 100% |
| Tên thương hiệu | Epicor, Epicor Kinetic, SharePoint, M365, Microsoft 365, HESEM | Giữ nguyên 100% |
| Tên phần mềm/hệ thống | Entra ID, Power Automate, Power BI, Azure | Giữ nguyên 100% |

**Cách nhận dạng danh từ riêng:**
1. Viết CamelCase (chữ hoa xen kẽ) → tên cột kỹ thuật
2. Có tiền tố `HESEM-` → tên site/nhóm
3. Kết thúc bằng `ID`, `Num`, `Date`, `Code`, `Type`, `Status`, `Url` → tên cột
4. Là tên sản phẩm/thương hiệu → danh từ riêng

### H1. Giọng văn

- **Ngắn gọn:** Mỗi câu tối đa 25-30 từ. Câu dài hơn phải tách.
- **Chủ động:** "Người vận hành kiểm tra áp suất" thay vì "Áp suất được kiểm tra bởi người vận hành"
- **Cụ thể:** "Kiểm tra 3 điểm: đường kính, độ sâu, độ nhám" thay vì "Kiểm tra các thông số"
- **Thực chiến:** Viết để người nhà máy đọc hiểu ngay, không cần giải thích thêm

### H2. Quy tắc viết hoa

| Đối tượng | Quy tắc | Ví dụ |
|-----------|---------|-------|
| Tên phòng ban | Viết hoa | Phòng Chất lượng, Phòng Sản xuất |
| Chức danh | Viết hoa | Tổng Giám đốc, Trưởng ca |
| Viết tắt | Viết hoa toàn bộ | SOP, WI, NCR, CAPA |
| Mã tài liệu | Giữ nguyên format | SOP-101, WI-201, FRM-301 |
| Tên phần mềm | Viết hoa chữ cái đầu | Epicor, SharePoint |

### H3. Dấu câu và format

- Dùng dấu `—` (em dash) thay `–` (en dash) khi nối mệnh đề
- Danh sách dùng `•` hoặc `-`
- Số thứ tự: `1)`, `2)`, `3)` cho heading; `a)`, `b)`, `c)` cho sub-item
- Ngày tháng: `DD/MM/YYYY` hoặc `YYYY-MM-DD` (theo ngữ cảnh)
- Số: dùng dấu chấm cho phần thập phân (`3.14`), dấu phẩy cho phân cách hàng nghìn (`1,000`)

---

## I. Kiểm tra sau dịch

Sau khi dịch hoặc biên tập, kiểm tra:

- [ ] Tất cả thuộc tính HTML (href, class, id, src) giữ nguyên tiếng Anh
- [ ] Tất cả tên file trong link giữ nguyên
- [ ] CSS và JS không bị dịch
- [ ] Viết tắt giữ nguyên tiếng Anh
- [ ] Mã tài liệu giữ nguyên (SOP-101, WI-201...)
- [ ] Từ đa nghĩa dịch đúng ngữ cảnh
- [ ] Thuật ngữ ngành giữ nguyên (Setup, Traveler, Balloon, Epicor...)
- [ ] Giọng văn ngắn, rõ, thực chiến
- [ ] Không có meta text hoặc ghi chú "AI generated"
- [ ] Encoding UTF-8, hiển thị đúng dấu tiếng Việt

---

> **Cập nhật lần cuối:** 2026-03-24
> **Áp dụng:** Toàn bộ tài liệu QMS — HESEM ENGINEERING
