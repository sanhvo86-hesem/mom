# 23 — Form Lifecycle, Allocation & Order Linking

> Quy chuẩn vòng đời form, cấp phát Record-ID, kiểm soát phiên bản, và liên kết SO/JO/WO.
> Tuân thủ ISO 9001:2015 clause 7.5 (Documented Information), AS9100D clause 8.5.2 (Traceability),
> và FDA 21 CFR Part 11 (Electronic Records) khi áp dụng.

---

## 1. Form Lifecycle (Vòng đời Form Blank)

### 1.1 Sơ đồ trạng thái

```
 DRAFT ──→ REVIEW ──→ APPROVED ──→ ACTIVE ──→ OBSOLETE
   │          │            │           │
   └──────────┘            │           └──→ SUPERSEDED (bởi version mới)
   (Reject → quay lại)     │
                            └──→ ACTIVE khi có ≥1 user download
```

### 1.2 Chi tiết từng trạng thái

| # | Trạng thái | Mô tả | Ai thực hiện | Hành động tiếp |
|---|-----------|-------|-------------|---------------|
| 1 | **DRAFT** | Form đang soạn, chưa hoàn chỉnh | Form Author (ENG, QA) | Submit for review |
| 2 | **REVIEW** | Đang chờ reviewer duyệt nội dung + layout | Assigned Reviewer | Approve hoặc Reject |
| 3 | **APPROVED** | Đã duyệt nhưng chưa phát hành chính thức | Document Controller | Activate khi sẵn sàng |
| 4 | **ACTIVE** | Đang sử dụng, user có thể download/điền | Hệ thống | Obsolete khi version mới thay thế |
| 5 | **OBSOLETE** | Không còn sử dụng, chỉ giữ lại cho audit trail | Document Controller | Chỉ xem, không download |
| 6 | **SUPERSEDED** | Bị thay thế bởi version mới, tự động chuyển | Hệ thống (auto) | Read-only archive |

### 1.3 Quy tắc chuyển trạng thái

| Từ | Sang | Điều kiện | Ai duyệt |
|----|------|-----------|----------|
| DRAFT → REVIEW | Author submit + tất cả required fields đầy đủ | Author |
| REVIEW → APPROVED | Reviewer approve | Reviewer (role: doc_reviewer) |
| REVIEW → DRAFT | Reviewer reject + ghi lý do | Reviewer |
| APPROVED → ACTIVE | Document Controller phát hành | DC (role: doc_controller) |
| ACTIVE → OBSOLETE | Manual obsolete hoặc superseded bởi version mới | DC hoặc System |
| ACTIVE → SUPERSEDED | Version mới được ACTIVE → version cũ tự SUPERSEDED | System (auto) |

---

## 2. Allocation Lifecycle (Vòng đời Cấp phát Record-ID)

### 2.1 Sơ đồ trạng thái

```
 ALLOCATED ──→ DOWNLOADED ──→ SUBMITTED ──→ RECEIVED ──→ ARCHIVED
     │              │               │
     │              │               └──→ REJECTED (upload lỗi → sửa lại)
     │              │
     │              └──→ VOIDED (user hủy, không dùng)
     │
     └──→ VOIDED (chưa download, hủy bỏ)
     │
     └──→ AUTO-VOIDED (quá 90 ngày không submit)
```

### 2.2 Chi tiết từng trạng thái

| # | Trạng thái | Mô tả | Trigger |
|---|-----------|-------|---------|
| 1 | **ALLOCATED** | Record-ID đã cấp, chưa download file | User request → server cấp mã |
| 2 | **DOWNLOADED** | User đã download .txt placeholder hoặc Excel blank | User click download |
| 3 | **SUBMITTED** | User đã upload file đã điền lên portal | User upload action |
| 4 | **RECEIVED** | Document Controller xác nhận file hợp lệ | DC review + accept |
| 5 | **ARCHIVED** | Hồ sơ đã lưu trữ chính thức trên SharePoint | Auto sau 30 ngày RECEIVED |
| 6 | **VOIDED** | User hoặc admin hủy bỏ, không sử dụng | Manual void + reason |
| 7 | **AUTO-VOIDED** | Quá hạn 90 ngày kể từ ALLOCATED mà không SUBMITTED | Cron job hàng ngày |
| 8 | **REJECTED** | File upload không hợp lệ (sai version, thiếu data) | DC reject + ghi lý do |

### 2.3 Tracking Requirements

Mỗi allocation record PHẢI lưu:

| Field | Bắt buộc | Mô tả |
|-------|---------|-------|
| `allocation_id` | CÓ | UUID v4 unique |
| `record_id` | CÓ | Mã hồ sơ (e.g. NCR-2026-043) |
| `record_type` | CÓ | Loại hồ sơ (NCR, CAPA, FAI...) |
| `department` | CÓ | Phòng ban yêu cầu |
| `requested_by` | CÓ | UserID người yêu cầu |
| `requested_at` | CÓ | ISO 8601 timestamp |
| `status` | CÓ | Trạng thái hiện tại |
| `job_number` | Tùy | Số JO nếu gắn job |
| `form_code` | Tùy | Mã form liên quan |
| `downloaded_at` | Tùy | Thời điểm download |
| `submitted_at` | Tùy | Thời điểm upload |
| `received_at` | Tùy | Thời điểm DC accept |
| `voided_at` | Tùy | Thời điểm void |
| `void_reason` | Tùy | Lý do void |
| `status_history` | CÓ | Array các lần chuyển trạng thái |

### 2.4 eQMS Record Instance Rules (Bắt buộc cho form online/offline)

| # | Quy tắc | Chi tiết bắt buộc |
|---|---------|-------------------|
| 1 | **Một instance = một Record-ID** | Mỗi lần người dùng bấm `Tạo mới online` hoặc `Tạo mới offline`, hệ thống cấp **1** `allocation_id` + `record_id` duy nhất cho toàn bộ vòng đời hồ sơ đó. |
| 2 | **Mở lại bản nháp không được cấp mã mới** | Nếu đã có `allocation_id`/`record_id`, mọi lần mở lại draft PHẢI tái sử dụng đúng mã cũ. `Save draft` tuyệt đối KHÔNG được tăng counter. |
| 3 | **Tab Tạo mã không dùng cho form** | Form online/offline tự cấp mã trong runtime của form. Tab `Tạo mã` chỉ phục vụ thực thể ngoài form như ANNEX number, mã vật tư, phôi, tooling, tài sản hoặc các record tham khảo khác. |
| 4 | **Online submit giữ nguyên Record-ID** | Form online khi submit lần đầu tạo `submission_count = 1`. Các lần nộp lại tiếp theo trên cùng hồ sơ vẫn giữ nguyên `record_id`, chỉ tăng `submission_count` / `resubmission_count`. |
| 5 | **Controlled edit sau submit không tạo hồ sơ mới** | Khi hồ sơ online đã nộp và người dùng vào `Chỉnh sửa có kiểm soát`, hệ thống phải mở lại cùng `allocation_id`/`record_id`, tạo `submission_revision` mới và tăng `amendment_count` nếu đây là sửa sau submit/review/approve. |
| 6 | **Offline resubmission giữ nguyên Record-ID** | Form offline sau khi được cấp mã và tải về phải upload lại theo đúng `allocation_id` cũ. Mỗi lần upload hợp lệ làm tăng `receipt_version`; không được cấp Record-ID mới chỉ vì nộp lại workbook. |
| 7 | **Rejected / Reopen vẫn dùng cùng mã** | Nếu hồ sơ bị reject hoặc reopen, hệ thống giữ nguyên `record_id`; chỉ thay đổi trạng thái workflow và sinh revision/receipt mới. |
| 8 | **Chỉ cấp mã mới khi là business case mới** | Chỉ tạo Record-ID mới khi người dùng chủ động `Tạo mới` hoặc hồ sơ cũ đã `VOIDED` và nghiệp vụ yêu cầu lập hồ sơ khác. |

### 2.5 Mandatory Registry Fields (Sổ quản lý mã eQMS)

Mọi hệ thống eQMS form PHẢI có một registry để theo dõi tối thiểu:

```
allocation_id | record_id | form_code | delivery_mode | workflow_state | created_by | created_at
last_action_at | submission_count | resubmission_count | amendment_count | receipt_version
draft_exists | latest_filename | latest_submission_ref | completed_flag
```

Quy định bắt buộc:

1. Registry phải hiển thị được cả online và offline trong cùng một màn hình tra cứu.
2. Registry phải phân biệt rõ `draft`, `allocated`, `submitted`, `approved`, `closed`, `received`, `rejected`, `void`.
3. Registry phải cho biết số lần nộp và số lần nộp lại của từng hồ sơ.
4. Registry phải mở lại đúng hồ sơ hiện hành, không tạo bản mới khi người dùng chọn `Mở` hoặc `Chỉnh sửa`.

---

## 3. Version Control Rules

### 3.1 Online Forms

| Quy tắc | Chi tiết |
|---------|---------|
| Version format | `{major}.{minor}` (e.g. 2.1) |
| Major bump | Thay đổi structure (thêm/xóa field, đổi logic) |
| Minor bump | Sửa typo, label, help text (không ảnh hưởng data) |
| Active version | Chỉ 1 version ACTIVE tại mỗi thời điểm per form code |
| Backward compatibility | Minor bump: dữ liệu cũ vẫn hợp lệ. Major bump: migration script bắt buộc |
| Schema storage | `qms-data/online-forms/schemas/FRM-XXX_V{ver}.json` |

### 3.2 Offline Forms (Excel)

| Quy tắc | Chi tiết |
|---------|---------|
| Version stamp | Sheet ẩn `_QMS_CONTROL` chứa version + checksum |
| Download tracking | Server log mỗi lần download: who, when, which version |
| Upload validation | So sánh version trong `_QMS_CONTROL` với active version |
| Obsolete warning | Upload form version cũ → FLAG `Version-Valid = OBSOLETE` |
| Grace period | 30 ngày sau khi version mới ACTIVE, form version cũ vẫn accepted (warning only) |

### 3.3 Excel Hidden Sheet `_QMS_CONTROL` Verification Rules

Mỗi form Excel blank PHẢI có sheet ẩn `_QMS_CONTROL` với:

| Cell | Nội dung | Ví dụ |
|------|---------|-------|
| A1 | `form_code` | FRM-302 |
| A2 | `version` | 3.2 |
| A3 | `checksum` | SHA256 của form structure |
| A4 | `downloaded_by` | NVA |
| A5 | `downloaded_at` | 2026-03-28T08:30:00Z |
| A6 | `source` | HESEM-QMS-Portal |
| A7 | `allocation_id` | UUID nếu có |

**Upload verification flow:**

```
1. Đọc sheet _QMS_CONTROL
2. So sánh form_code + version với form_control_registry
3. Nếu version = current active → ACCEPT
4. Nếu version = previous + trong grace period → ACCEPT + WARNING
5. Nếu version = previous + hết grace period → REJECT + notify
6. Nếu không có _QMS_CONTROL → REJECT (không phải form HESEM)
7. Nếu checksum không khớp → FLAG (form bị sửa structure)
```

### 3.4 Controlled Edit / Resubmission Rules

| Tình huống | Record-ID | Revision nội bộ | Yêu cầu audit trail |
|-----------|-----------|-----------------|---------------------|
| Lưu nháp online | Giữ nguyên | Không tăng submission revision | Ghi `draft_saved_at`, `saved_by` |
| Submit lần đầu online | Giữ nguyên | `submission_revision = 1` | Ghi `submitted_by`, `submitted_at`, chữ ký |
| Chỉnh sửa sau submit online | Giữ nguyên | `submission_revision + 1` | Ghi lý do sửa, người sửa, thời điểm sửa, source revision |
| Upload offline lần đầu | Giữ nguyên | `receipt_version = 1` | Ghi `uploaded_by`, `uploaded_at`, tên file đã nhận |
| Upload offline nộp lại | Giữ nguyên | `receipt_version + 1` | Ghi version mới, giữ lịch sử receipt cũ |

Quy tắc bắt buộc:

1. Bản cũ không được bị che khuất hoặc mất truy vết khi có controlled edit / resubmission.
2. Hệ thống phải giữ đủ metadata để xác định `ai`, `khi nào`, `vì sao`, và `bản nào` bị thay thế.
3. Nếu workflow yêu cầu reopen, hành động reopen phải được ghi riêng trong history và không được reset counter về 0.

---

## 4. Form Builder Governance

### 4.1 Ai có thể làm gì

| Hành động | Roles được phép | Approval cần |
|-----------|---------------|-------------|
| Tạo form blank mới (DRAFT) | `doc_author`, `admin` | Không |
| Chỉnh sửa form DRAFT | `doc_author` (owner), `admin` | Không |
| Submit for REVIEW | `doc_author` (owner) | Không |
| Approve/Reject form | `doc_reviewer`, `admin` | Không |
| Phát hành (ACTIVE) | `doc_controller`, `admin` | Reviewer đã approve |
| Obsolete form | `doc_controller`, `admin` | Không |
| Chỉnh sửa form ACTIVE | KHÔNG AI — phải tạo version mới | N/A |
| Xóa form | `admin` only, chỉ khi DRAFT | Không |

### 4.2 Form Code Assignment

| Series | Phòng ban | Ví dụ |
|--------|----------|-------|
| 100-199 | QMS Governance / Executive | FRM-101 Document Register |
| 200-299 | Sales / Contract Review | FRM-201 Quotation Review |
| 300-399 | Engineering | FRM-302 Setup Sheet |
| 400-499 | Supply Chain / Purchasing | FRM-403 SCAR |
| 500-599 | Production | FRM-512 Downtime Log |
| 600-699 | Quality Control / Assurance | FRM-631 NCR Report |
| 700-799 | Logistics / Warehouse | FRM-711 Packing Checklist |
| 800-899 | HR / Training | FRM-802 Training Attendance |
| 900-999 | Audit / Management Review | FRM-913 Audit Finding |

---

## 5. Inter-form Formula Rules

### 5.1 Nguyên tắc

| # | Quy tắc | Giải thích |
|---|---------|-----------|
| 1 | **Một chiều** | Form A có thể tham chiếu data từ Form B, nhưng Form B KHÔNG biết Form A |
| 2 | **Read-only reference** | Cross-form data chỉ đọc, không ghi ngược |
| 3 | **Explicit declaration** | Mọi cross-form reference phải khai báo trong schema `dependencies[]` |
| 4 | **Fallback value** | Nếu form tham chiếu không có data → dùng default value, không crash |
| 5 | **Version-pinned** | Reference gắn cụ thể version form nguồn |

### 5.2 Dependency Map

| Form đích | Tham chiếu từ | Data lấy |
|-----------|-------------|---------|
| FRM-641 (CAPA) | FRM-631 (NCR) | ncr_id, defect_type, root_cause_category |
| FRM-651 (Final Insp) | FRM-511 (First Piece) | first_piece_result, setup_verified |
| FRM-715 (CoC) | FRM-651 (Final Insp) | inspection_result, lot_size, pass_qty |
| FRM-913 (Audit Finding) | FRM-631 (NCR) | related_ncr_ids[] |
| FRM-403 (SCAR) | FRM-701 (Receiving Insp) | iqc_result, supplier_code |

---

## 6. Cross-tab History Requirements

### 6.1 Truy vết xuyên tab (Cross-tab traceability)

Mọi record phải truy vết được qua các bảng/tab khác nhau:

| Từ tab | Sang tab | Truy vết bằng |
|--------|---------|-------------|
| Allocation History | Form Submissions | `record_id` |
| Form Submissions | Job Dossier | `job_number` |
| Job Dossier | Order Hierarchy | `jo_number` → `so_number` |
| NCR Log | CAPA Log | `ncr_id` trong CAPA `source_ref` |
| Audit Finding | NCR / CAPA | `finding_id` → `ncr_id` / `capa_id` |

### 6.2 Minimum History Fields

Mọi history view PHẢI hiển thị:

```
record_id | record_type | status | requested_by | requested_at | department | job_number
```

---

## 7. SO / JO / WO Linking Rules

### 7.1 Order Hierarchy

```
Sales Order (SO)
  └── Job Order (JO) — 1 SO có thể có nhiều JO
        └── Work Order (WO) — 1 JO có thể có nhiều WO (per operation)
              └── Form Records — link qua job_number
```

### 7.2 Linking Rules

| # | Quy tắc | Chi tiết |
|---|---------|---------|
| 1 | **SO là gốc** | Mọi JO phải gắn 1 SO. Mọi WO phải gắn 1 JO. |
| 2 | **Form gắn JO** | Form records (NCR, FAI, Inspection...) gắn vào JO level |
| 3 | **WO-level optional** | Form có thể gắn đến WO nếu cần (per-operation tracking) |
| 4 | **Cascading status** | Khi SO closed → tất cả JO phải completed hoặc cancelled |
| 5 | **Cross-job NCR** | NCR có thể reference nhiều JO nếu lỗi ảnh hưởng nhiều job |
| 6 | **Linking immutable** | Sau khi link, không xóa được — chỉ void allocation |

### 7.3 Data Sources

| Entity | Source of Record | Sync |
|--------|-----------------|------|
| SO | Epicor ERP | Daily import hoặc API |
| JO | Epicor ERP | Daily import hoặc API |
| WO | Epicor ERP | Daily import hoặc API |
| Form links | QMS Portal | Real-time |
| Record-IDs | QMS Portal | Real-time (atomic counter) |

### 7.4 SO/JO/WO Number Format

| Entity | Format | Ví dụ |
|--------|--------|-------|
| Sales Order | `SO-{YYYY}-{4digit}` | SO-2026-0150 |
| Job Order | `JOB-{YYYY}-{4digit}` | JOB-2026-0042 |
| Work Order | `WO-{JOB}-OP{nn}` | WO-JOB-2026-0042-OP10 |

---

## 8. Audit Trail Requirements (ISO 9001 Clause 7.5)

### 8.1 Nguyên tắc audit trail

| # | Yêu cầu ISO 9001:2015 | Triển khai HESEM |
|---|----------------------|-----------------|
| 7.5.1 | Tổ chức phải duy trì documented information theo yêu cầu QMS | Mọi form change lưu trong `status_history[]` |
| 7.5.2 | Khi tạo/cập nhật, phải đảm bảo identification, format, review | Form lifecycle 6 trạng thái, reviewer gate |
| 7.5.3a | Documented info phải available và suitable for use | Active forms trên portal, searchable |
| 7.5.3b | Adequately protected | Role-based access, CSRF, audit log |

### 8.2 Audit trail fields (bắt buộc mọi record)

```json
{
  "action": "status_change",
  "from_status": "ALLOCATED",
  "to_status": "DOWNLOADED",
  "performed_by": "NVA",
  "performed_at": "2026-03-28T08:30:00Z",
  "ip_address": "192.168.1.50",
  "reason": null,
  "metadata": {}
}
```

### 8.3 Retention Requirements

| Loại hồ sơ | Thời gian giữ | Sau đó |
|-----------|-------------|-------|
| Quality records (NCR, CAPA, FAI) | 10 năm | Archive → cold storage |
| Production records | 7 năm | Archive → cold storage |
| Training records | Đến khi nhân viên nghỉ + 3 năm | Archive |
| Audit records | 10 năm | Archive |
| Allocation logs | 5 năm | Purge |
| Voided allocations | 3 năm | Purge |

---

## 9. Record Type Expansion Catalog (CNC Manufacturing)

### 9.1 Quality Records

| Code | Tên | Format | Counter Digits | Scope |
|------|-----|--------|---------------|-------|
| NCR | Nonconformance Report | `NCR-{YYYY}-{3d}` | 3 | Per-event |
| CAPA | Corrective/Preventive Action | `CAPA-{YYYY}-{3d}` | 3 | Per-event |
| FAI | First Article Inspection | `FAI-{YYYY}-{3d}` | 3 | Per-part-rev |
| SCAR | Supplier Corrective Action | `SCAR-{YYYY}-{3d}` | 3 | Per-event |
| AUD | Internal/External Audit | `AUD-{YYYY}-{type}{2d}` | 2 | Scheduled |
| CAL | Calibration Record | `CAL-{EquipCode}-{3d}` | 3 | Per-equipment |
| CONC | Concession/Deviation | `CONC-{YYYY}-{3d}` | 3 | Per-event |
| MRB | Material Review Board | `MRB-{YYYY}-{3d}` | 3 | Per-event |

### 9.2 Production Records

| Code | Tên | Format | Counter Digits | Scope |
|------|-----|--------|---------------|-------|
| DOWNTIME | Machine Downtime | `DT-{YYYY}-{4d}` | 4 | Per-event |
| SETUP | Setup Record | `SETUP-{YYYY}-{4d}` | 4 | Per-job-op |
| TOOL-CHG | Tool Change Record | `TC-{YYYY}-{4d}` | 4 | Per-event |
| SHIFT | Shift Handover | `SH-{YYYY}-{4d}` | 4 | Per-shift |
| IMP | Improvement Suggestion | `IMP-{YYYY}-{code}` | 3 | Per-event |

### 9.3 Engineering Records

| Code | Tên | Format | Counter Digits | Scope |
|------|-----|--------|---------------|-------|
| ECR | Engineering Change Request | `ECR-{YYYY}-{3d}` | 3 | Per-event |
| ECO | Engineering Change Order | `ECO-{YYYY}-{3d}` | 3 | Per-ECR |
| DFM | Design for Manufacturing | `DFM-{YYYY}-{3d}` | 3 | Per-part |
| PROVEOUT | Prove-out Record | `PO-{YYYY}-{3d}` | 3 | Per-part-rev |

### 9.4 Logistics & Supply Chain Records

| Code | Tên | Format | Counter Digits | Scope |
|------|-----|--------|---------------|-------|
| PO-EXCEPTION | PO Exception | `POE-{YYYY}-{3d}` | 3 | Per-event |
| IQC | Incoming QC | `IQC-{YYYY}-{4d}` | 4 | Per-lot |
| SHIP | Shipping Record | `SHIP-{YYYY}-{4d}` | 4 | Per-shipment |

### 9.5 HR & Training Records

| Code | Tên | Format | Counter Digits | Scope |
|------|-----|--------|---------------|-------|
| TRN | Training Event | `TRN-{YYYY}-{3d}` | 3 | Per-event |
| COMP | Competency Assessment | `COMP-{YYYY}-{3d}` | 3 | Per-employee |

### 9.6 Management Records

| Code | Tên | Format | Counter Digits | Scope |
|------|-----|--------|---------------|-------|
| MR | Management Review | `MR-{YYYY}-Q{n}` | 1 | Quarterly |
| RISK | Risk Assessment | `RISK-{YYYY}-R{2d}` | 2 | Per-review |

---

## 10. Auto-Void Rules for Unused Allocations

### 10.1 Trigger Conditions

| # | Điều kiện | Hành động | Grace Period |
|---|----------|-----------|-------------|
| 1 | ALLOCATED > 90 ngày, chưa DOWNLOADED | AUTO-VOID | 90 ngày |
| 2 | DOWNLOADED > 90 ngày, chưa SUBMITTED | AUTO-VOID | 90 ngày |
| 3 | REJECTED > 30 ngày, chưa re-SUBMITTED | AUTO-VOID | 30 ngày |

### 10.2 Auto-Void Process

```
1. Cron job chạy daily lúc 02:00 UTC
2. Query allocations WHERE:
   - status IN ('ALLOCATED', 'DOWNLOADED') AND requested_at < NOW() - 90 days
   - OR status = 'REJECTED' AND rejected_at < NOW() - 30 days
3. Với mỗi allocation:
   a. Set status = 'AUTO-VOIDED'
   b. Set void_reason = 'auto_expired_90d' hoặc 'auto_expired_rejected_30d'
   c. Ghi audit log
   d. Notify user qua email (nếu có)
4. Counter KHÔNG được tái sử dụng (ID sequence vẫn tăng)
```

### 10.3 Reporting

Auto-void report hàng tháng:
- Tổng số allocations auto-voided
- Breakdown theo record_type
- Breakdown theo department
- Top 5 users có nhiều auto-void nhất → training target

---

## 11. JSON Storage Structure

```
qms-data/
├── allocations/
│   ├── allocation_log.json        ← Master allocation log
│   └── archive/
│       └── allocations_2025.json  ← Yearly archive
├── orders/
│   ├── index.json                 ← SO/JO/WO master index
│   ├── so/
│   │   └── SO-2026-0150.json     ← Per-SO detail
│   └── links/
│       └── form_links.json        ← Form-to-JO linking
├── counters/
│   ├── NCR-2026.txt
│   ├── CAPA-2026.txt
│   └── ...
└── config/
    ├── document_type_registry.json
    ├── form_control_registry.json
    └── so_jo_wo_config.json
```

---

> **Cap nhat lan cuoi:** 2026-03-29
> **Ap dung:** Moi quy trinh cap phat Record-ID, quan ly form lifecycle, va lien ket SO/JO/WO
> **Tai lieu lien quan:** 15-evidence-and-records-naming.md, 18-online-vs-offline-form-decision-framework.md, RecordIdGenerator.php, FormEngine.php
