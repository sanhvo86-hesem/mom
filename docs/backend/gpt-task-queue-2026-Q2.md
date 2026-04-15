# GPT Task Queue — Evidence Control & Order Management
## HESEM QMS Portal — Giao việc cho GPT Pro

**Context:** Claude Opus đang làm P0-01 → P0-04 (backend services + AllocationTracker + diacritics). GPT Pro nhận P1-01 → P1-07 theo thứ tự dưới đây. Không chồng lấn file với Claude.

**Nguyên tắc:**
- Vietnamese frontend phải có dấu (CS-024 Section 21)
- Backend PHP/SQL bằng tiếng Anh
- Dùng `apiCall()` từ `02-state-auth-ui.js` cho API calls
- Follow IIFE pattern cho JS modules
- PHP 8.1+, PSR-12, PHPDoc
- Commit message tiếng Anh, có `Co-Authored-By:` footer

---

## BATCH 1 (Tuần 2) — Wiring & Auto-Link

### Task G1: P1-05 — Wire Tab 2 Form Fill & Submit
**Priority:** HIGH — Tab 2 hiện không hoạt động
**Files SỬA:** `09b-form-fill-download.js`, `api.php`
**Files KHÔNG CHẠM:** `09h-allocation-tracker.js` (Claude đang sửa), `09-online-forms.js`

**Yêu cầu:**
1. Thêm endpoints vào `api.php`:
   - `form_fill_load_schema` (GET, ?form_code=FRM-631) → đọc từ `qms-data/online-forms/schemas/{CODE}.json`
   - `form_fill_save_draft` (POST) → lưu draft vào `qms-data/online-forms/drafts/{allocation_id}.json`
   - `form_fill_submit_online` (POST) → validate (FormEngine) → lưu entry → tạo allocation → trigger workflow
   - `form_fill_history` (GET, ?user=&form_code=&page=) → lịch sử điền form
2. Trong `09b-form-fill-download.js`:
   - Khi user chọn form → gọi `form_fill_load_schema` → render fields từ schema
   - Khi user nhấn "Lưu nháp" → gọi `form_fill_save_draft`
   - Khi user nhấn "Gửi" → gọi `form_fill_submit_online`
   - Hiển thị lịch sử điền form ở bottom panel

**Acceptance Test:**
- Chọn FRM-631 → form hiển thị đầy đủ fields
- Điền → lưu nháp → reload → nháp vẫn còn
- Gửi → entry tạo thành công → record_id hiển thị

---

### Task G2: P1-01 — Auto-Link Evidence to Order
**Priority:** HIGH — Traceability hiện hoàn toàn thủ công
**Files SỬA:** `api.php` (thêm logic vào allocation_allocate + form_fill_submit_online), `09e-so-jo-wo-dashboard.js` (thêm linked forms panel)
**Files KHÔNG CHẠM:** `09h-allocation-tracker.js`, `09c-record-id-generator.js`

**Yêu cầu:**
1. Trong `api.php`:
   - Khi `allocation_allocate` nhận `job_number` hoặc `work_order` → tự động gọi `order_link_form` internally
   - Khi `form_fill_submit_online` nhận context (JO/WO) → auto-link
   - Thêm endpoint `order_get_linked_forms` (GET, ?order_type=jo&order_id=JO-2026-00001) → trả về danh sách forms linked
   - Validate: record_id phải tồn tại, đúng loại, đúng context
2. Trong `09e-so-jo-wo-dashboard.js`:
   - Trong order detail panel → thêm section "Hồ sơ liên kết" (Linked Evidence)
   - Hiển thị: Record ID, Form Code, Status, Date, Người tạo
   - Nút "Liên kết hồ sơ" → dropdown chọn record → link

**Acceptance Test:**
- Tạo NCR với JO-2026-00001 → tự động xuất hiện trong JO detail
- Xem JO detail → thấy panel "Hồ sơ liên kết" với NCR đó

---

## BATCH 2 (Tuần 3) — Approval Engine & Order CRUD

### Task G3: P1-02 — Approval Engine cho Evidence Control
**Priority:** HIGH — Không có duyệt = không vận hành production
**Files SỬA:** `api.php`, `09b-form-fill-download.js`, `11-e-signature.js`
**Files KHÔNG CHẠM:** `WorkflowEngine.php` (dùng nhưng không rewrite)

**Yêu cầu:**
1. Thêm endpoints vào `api.php`:
   - `evidence_submit_for_review` (POST, {allocation_id}) → chuyển status sang "in_review"
   - `evidence_review` (POST, {allocation_id, action: 'approve'|'reject', reason, signature_data}) → duyệt/từ chối
   - `evidence_reopen` (POST, {allocation_id, reason}) → mở lại form đã đóng
   - `evidence_get_pending` (GET, ?department=&form_code=) → danh sách chờ duyệt
2. Server-side:
   - Kiểm tra role trước khi approve (chỉ roles_allowed trong schema được duyệt)
   - Step-up re-auth: verify password/PIN trước khi approve (gọi `password_verify()`)
   - Lưu signature_data (base64 image + signer + timestamp + hash) vào allocation record
   - Ghi audit trail event: SUBMITTED → REVIEWED → APPROVED/REJECTED
3. Frontend:
   - Khi nhấn "Gửi" trên form → gọi `evidence_submit_for_review`
   - Manager thấy badge "Chờ duyệt" trên sidebar
   - Manager nhấn → danh sách chờ duyệt → chọn → xem form → Duyệt/Từ chối
   - Duyệt → hiện ESignature modal → ký → confirm password → gửi

**Acceptance Test:**
- Inspector gửi NCR → status "Chờ duyệt"
- Manager duyệt với chữ ký → status "Đã duyệt" + signature hiển thị
- Manager từ chối → Inspector thấy lý do + có thể sửa và gửi lại

---

### Task G4: P1-04 — Order CRUD UI (Create/Edit/Status)
**Priority:** HIGH — Không tạo được SO/JO/WO = không vận hành
**Files SỬA:** `09e-so-jo-wo-dashboard.js`
**Files KHÔNG CHẠM:** `api.php` (endpoints đã có), `OrderService.php`, `OrderWorkflowService.php` (Claude đang tạo)

**Yêu cầu:**
1. Thêm vào `09e-so-jo-wo-dashboard.js`:
   - **Create SO modal:** Customer dropdown (từ master-data), PO number, order date, due date, total qty, priority, notes
   - **Create JO modal:** Parent SO selector, part number (searchable), revision, qty, routing, FAI required checkbox
   - **Create WO modal:** Parent JO selector, operation (từ routing), machine, operator, est setup time, est run time
   - **Status transition modal:** Hiện allowed next states (từ config), reason field, role check trước khi gửi
   - **Inline edit:** Double-click qty/due_date/priority trên active orders → edit in place → save
   - **Status timeline:** Trong order detail → timeline hiển thị lịch sử chuyển trạng thái
2. Tất cả modal dùng:
   - `SearchableInput` (12-searchable-input.js) cho customer, part, SO, JO dropdowns
   - Vietnamese labels có dấu
   - Validation trước khi submit
   - Loading state khi gọi API

**Acceptance Test:**
- Tạo SO → hiển thị trong hierarchy
- Tạo JO dưới SO → linked đúng
- Chuyển JO sang "active" → logged trong timeline
- Double-click due_date → edit → save → cập nhật

---

## BATCH 3 (Tuần 4) — Security & Dashboard

### Task G5: P1-03 — Upload Hardening (OWASP)
**Priority:** MEDIUM-HIGH — Security production
**Files SỬA:** `api.php` (upload handlers), `MimeValidator.php`

**Yêu cầu:**
1. Tạo quarantine directory: `qms-data/uploads/quarantine/`
2. Upload flow mới:
   - File → quarantine (UUID renamed) → verify (MIME + magic bytes + hidden sheet) → accepted/ hoặc rejected/
3. Storage isolation: uploads KHÔNG nằm trong webroot
4. Exception queue: `qms-data/uploads/exceptions.json` — log failed uploads cho admin review
5. Size limits: 25MB Excel, 10MB images, 5MB PDF
6. Reject: exe, bat, cmd, sh, php, js, html, svg (SVG có thể chứa XSS)

**Acceptance Test:**
- Upload .exe đổi thành .xlsx → rejected (magic bytes)
- Upload valid xlsx → quarantine → verify → moved to accepted/
- Upload 30MB file → rejected (size limit)

---

### Task G6: P1-06 — Exception Dashboard
**Priority:** MEDIUM — Operational visibility
**Files TẠO MỚI:** `01-QMS-Portal/scripts/portal/14-exception-dashboard.js`
**Files SỬA:** `portal.html` (thêm script tag), `02-state-auth-ui.js` (thêm sidebar item)

**Yêu cầu:**
1. Trang mới "Bảng ngoại lệ" (Exception Dashboard) trong sidebar, dưới "Kiểm soát chứng cứ"
2. Cards hiển thị:
   - 🔴 Allocation quá hạn (>30 ngày downloaded chưa nộp)
   - 🟡 Upload thất bại/bị từ chối (30 ngày gần nhất)
   - 🔴 SO/JO/WO quá hạn (due_date < today, chưa completed)
   - 🟡 CAPA mở quá hạn (>60 ngày)
   - 🟠 WO đang chạy thiếu evidence gate
   - 🔵 Orphan record links (link đến order không tồn tại)
3. Mỗi card click → expand danh sách chi tiết
4. Nút "Xuất Excel" cho từng loại ngoại lệ
5. Auto-refresh mỗi 5 phút

**Acceptance Test:**
- Tạo allocation, không nộp 31 ngày (mock date) → hiện trong overdue
- Upload fail → hiện trong rejected list
- SO quá hạn → hiện trong overdue orders

---

### Task G7: P1-07 — PostgreSQL Migration (Phase 1)
**Priority:** MEDIUM — Scalability
**Files SỬA:** `api.php`, `database/DataLayer.php`, `database/config.php`

**Yêu cầu:**
1. Trong `database/config.php`: đổi `use_postgres` → `true`, `shadow_write` → `true`
2. Trong `api.php`: thay direct `file_get_contents`/`file_put_contents` bằng `DataLayer` methods cho:
   - Master data (customers, vendors, items)
   - Orders (sales_orders, job_orders)
   - Allocations (records, record_counters)
   - Form entries (form_entries)
3. DataLayer shadow-write: ghi cả JSON (backward compatible) + PostgreSQL
4. Test với `docker-compose.yml` cho PostgreSQL local
5. `JsonImporter.php` chạy được: import tất cả JSON → PostgreSQL

**Acceptance Test:**
- Tạo NCR → data xuất hiện trong cả JSON file VÀ PostgreSQL table
- Query allocation history từ PostgreSQL → < 200ms
- Tắt PostgreSQL → system fallback JSON → vẫn hoạt động

---

## QUY TẮC CHO GPT

1. **Không chạm files Claude đang sửa (sẽ commit sớm):**
   - `09h-allocation-tracker.js` — Claude đang REWRITE full implementation (allocate, getHistory, void, inspectUpload, receiveUpload, renderHistoryTable, renderPagination, renderStatusBadge, copyToClipboard, downloadRecordTxt)
   - `api/services/MasterDataService.php` — Claude đang TẠO MỚI (lifecycle, duplicate detection, referential integrity, change history, approval, archive)
   - `api/services/OrderWorkflowService.php` — Claude đang TẠO MỚI (validate transitions from so_jo_wo_config.json, role-based guards, controlled field edit, cancel/reopen, change history)
   - `allocation_rules.json` — Claude đang fix Vietnamese diacritics
   - `so_jo_wo_config.json` — Claude đang fix Vietnamese diacritics
   - `FRM-631.json` — Claude đang fix mojibake

   **Khi Claude commit xong, GPT có thể DỰA VÀO các files này (import, gọi methods) nhưng KHÔNG REWRITE chúng.**

2. **Commit format:**
```
<type>(<scope>): <description>

<body with details>

Co-Authored-By: GPT-4o <noreply@openai.com>
```

3. **Self-check trước mỗi commit:**
   - `php -l` trên tất cả PHP files mới/sửa
   - Verify JSON hợp lệ: `python -m json.tool < file.json`
   - grep Vietnamese không dấu: tìm "Khong", "Chua", "Dang" trong strings
   - Không có `console.log` debug trong JS production

4. **Thứ tự thực thi:**
```
G1 (Tab 2 wiring) → G2 (auto-link) → G3 (approval engine) → G4 (order CRUD) → G5 (upload hardening) → G6 (exception dashboard) → G7 (PostgreSQL)
```

G1+G2 có thể song song. G3+G4 có thể song song. G5+G6 có thể song song. G7 cuối cùng.
