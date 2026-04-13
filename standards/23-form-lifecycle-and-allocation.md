# 23 — Form Lifecycle, Allocation & Order Linking

## 0. Authority correction - issuance/submission/evidence separation

The allocation lifecycle in this standard is superseded where it says the final
official archive is SharePoint. The current control-plane model is:

- `frm_issuance` tracks issuance/download/expiry/void/supersession.
- `frm_submission_attempt` tracks each online/offline submission attempt.
- `evidence_record` and `evidence_version` are the authoritative business
  records after acceptance/finalization.
- `evidence_publication` tracks asynchronous SharePoint publication state.
- SharePoint publication never replaces portal acceptance, immutable package
  building, retention, audit trail, or change authority.

> Form lifecycle rules, Record-ID allocation, version control, and SO/JO/WO linking.
> Complies with ISO 9001:2015 clause 7.5 (Documented Information), AS9100D clause 8.5.2 (Traceability),
> and FDA 21 CFR Part 11 (Electronic Records) when applicable.

---

## 1. Form Lifecycle (Form Blank Lifecycle)

### 1.1 State diagram

```
 DRAFT ──→ REVIEW ──→ APPROVED ──→ ACTIVE ──→ OBSOLETE
   │          │            │           │
   └──────────┘            │           └──→ SUPERSEDED (bởi version mới)
   (Reject → quay lại)     │
                            └──→ ACTIVE khi có ≥1 user download
```

### 1.2 Details of each status

| # | Status | Describe | Who does it? | Continue action |
|---|-----------|-------|-------------|---------------|
| 1 | **DRAFT** | The form is being drafted and is not complete | Form Author (ENG, QA) | Submit for review |
| 2 | **REVIEW** | Waiting for reviewer to approve content + layout | Assigned Reviewer | Approve or Reject |
| 3 | **APPROVED** | Approved but not officially released yet | Document Controller | Activate when ready |
| 4 | **ACTIVE** | In use, users can download/fill in | System | Obsolete when the new version replaces it |
| 5 | **OBSOLETE** | No longer in use, only kept for audit trail | Document Controller | Only view, do not download |
| 6 | **SUPERSEDED** | Replaced by new version, automatically switched | System (auto) | Read-only archive |

### 1.3 State transition rules

| From | Luxurious | Condition | Who approves? |
|----|------|-----------|----------|
| DRAFT → REVIEW | Author submit + all required fields in full | Author |
| REVIEW → APPROVED | Reviewer approved | Reviewer (role: doc_reviewer) |
| REVIEW → DRAFT | Reviewer reject + write reason | Reviewer |
| APPROVED → ACTIVE | Document Controller released | DC (role: doc_controller) |
| ACTIVE → OBSOLETE | Manual obsolete or superseded by new version | DC or System |
| ACTIVE → SUPERSEDED | The new version is ACTIVE → the old version is automatically SUPERSEDED | System (auto) |

---

## 2. Allocation Lifecycle (Record-ID Allocation Lifecycle)

### 2.1 State diagram

```
 ALLOCATED ──→ DOWNLOADED ──→ SUBMITTED ──→ RECEIVED ──→ FINALIZED
     │              │               │
     │              │               └──→ REJECTED (upload lỗi → sửa lại)
     │              │
     │              └──→ VOIDED (user hủy, không dùng)
     │
     └──→ VOIDED (chưa download, hủy bỏ)
     │
     └──→ AUTO-VOIDED (quá 90 ngày không submit)
```

### 2.2 Details of each status

| # | Status | Describe | Trigger |
|---|-----------|-------|---------|
| 1 | **ALLOCATED** | Record-ID issued, file not downloaded yet | User request → server issues code |
| 2 | **DOWNLOADED** | User downloaded .txt placeholder or Excel blank | User clicks download |
| 3 | **SUBMITTED** | The user has uploaded the completed file to the portal | User upload action |
| 4 | **RECEIVED** | Document Controller verifies that the file is valid | DC review + accept |
| 5 | **FINALIZED** | Accepted, locked, packaged, and retained as the authoritative portal evidence record/version | DC acceptance/finalization command |
| 6 | **VOIDED** | User or admin cancels, does not use | Manual void + reason |
| 7 | **AUTO-VOIDED** | Overdue 90 days from ALLOCATED without SUBMITTED | Cron jobs daily |
| 8 | **REJECTED** | Invalid uploaded file (wrong version, missing data) | DC reject + write reason |

### 2.3 Tracking Requirements

Each allocation record MUST save:

| Field | Obligatory | Describe |
|-------|---------|-------|
| `allocation_id` | HAVE | UUID v4 unique |
| `record_id` | HAVE | Case code (e.g. NCR-2026-043) |
| `record_type` | HAVE | Document type (NCR, CAPA, FAI...) |
| `department` | HAVE | Department request |
| `requested_by` | HAVE | Requester UserID |
| `requested_at` | HAVE | ISO 8601 timestamp |
| `status` | HAVE | Current status |
| `job_number` | Depends | JO number if job is attached |
| `form_code` | Depends | Related form code |
| `downloaded_at` | Depends | Download time |
| `submitted_at` | Depends | Upload time |
| `received_at` | Depends | DC acceptance time |
| `voided_at` | Depends | Void moment |
| `void_reason` | Depends | Reason void |
| `status_history` | HAVE | Array of state transitions |

### 2.4 eQMS Record Instance Rules (Required for online/offline forms)

| # | Rules | Required details |
|---|---------|-------------------|
| 1 | **One instance = one Record-ID** | Each time the user presses `Tạo mới online` or `Tạo mới offline`, the system grants a unique **1** `allocation_id` + `record_id` for the entire life of that profile. |
| 2 | **Reopening draft without new codes** | If you already have `allocation_id`/`record_id`, any reopening of the draft MUST reuse the same code. `Save draft` absolutely DO NOT increase the counter. |
| 3 | **Code Generation tab is not used for forms** | Online/offline forms automatically provide code during the form's runtime. Tab `Tạo mã` only serves entities outside the form such as ANNEX number, material code, workpiece, tooling, assets or other reference records. |
| 4 | **Online submission retains Record-ID** | The online form when submitted for the first time creates `submission_count = 1`. Subsequent re-submissions on the same profile remain the same `record_id`, only increasing `submission_count` / `resubmission_count`. |
| 5 | **Controlled edit after submission does not create a new profile** | Once the online application has been submitted and the user enters `Chỉnh sửa có kiểm soát`, the system must reopen the same `allocation_id`/`record_id`, create a new `submission_revision` and increase `amendment_count` if this is an edit after submit/review/approve. |
| 6 | **Offline resubmission retains Record-ID** | After being issued a code and downloaded, the offline form must be re-uploaded according to the old `allocation_id`. Each valid upload increases `receipt_version`; A new Record-ID will not be issued just because the workbook is returned. |
| 7 | **Rejected / Reopen still uses the same code** | If the profile is rejected or reopened, the system keeps `record_id`; Just change the workflow status and generate a new revision/receipt. |
| 8 | **Only issue new codes when it is a new business case** | Only create a new Record-ID when the user actively `Tạo mới` or the old record has `VOIDED` and the business requires another record. |

### 2.5 Mandatory Registry Fields (eQMS code management book)

Every eQMS form system MUST have a registry to track at least:

```
allocation_id | record_id | form_code | delivery_mode | workflow_state | created_by | created_at
last_action_at | submission_count | resubmission_count | amendment_count | receipt_version
draft_exists | latest_filename | latest_submission_ref | completed_flag
```

Mandatory regulations:

1. Registry must be displayed both online and offline in the same lookup screen.
2. Registry must clearly distinguish `draft`, `allocated`, `submitted`, `approved`, `closed`, `received`, `rejected`, `void`.
3. The Registry must indicate the number of submissions and resubmissions of each application.
4. The Registry must reopen the correct current profile, not create a new one when the user selects `Mở` or `Chỉnh sửa`.

### 2.6 Cancel Creation / Withdraw Before First Submission

| Situation | Mandatory handling |
|-----------|---------------------|
| The user presses `Hủy tạo form` before submitting for the first time | The system must **clear the draft payload**, leave `allocation_id` / `record_id` intact, and move the allocation to state `void` |
| Code issued but not submitted yet | **Code may not be reused** for another profile |
| Cancel creating form | Required to enter **reason for cancellation** |
| Registry | Must display canceled records with `void_reason`, `voided_by`, `voided_at` |
| Profile submitted / approved / closed | Do not use `Hủy tạo form`; Only follow `Controlled Edit / Resubmission` |

Required rules:

1. `Hủy tạo form` is a business action of type `withdraw before first submission`, not a hard delete.
2. All issued numbers must still be traced in the registry so that audit does not see "lost numbers".
3. If the draft exists on the server or local browser, the system must clean up that draft when canceling.
4. If the user reopens a new business case after canceling, the system must issue a **new code**, and cannot reactivate the void code.

---

## 3. Version Control Rules

### 3.1 Online Forms

| Rules | Detail |
|---------|---------|
| Version format | `{major}.{minor}` (e.g. 2.1) |
| Major bump | Change structure (add/remove fields, change logic) |
| Minor bump | Edit typo, label, help text (does not affect data) |
| Active version | Only 1 ACTIVE version at a time per form code |
| Backward compatibility | Minor bump: old data is still valid. Major bump: required migration script |
| Schema storage | `qms-data/online-forms/schemas/FRM-XXX_V{ver}.json` |

### 3.2 Offline Forms (Excel)

| Rules | Detail |
|---------|---------|
| Version stamp | Hidden sheet `_QMS_CONTROL` contains version + checksum |
| Download tracking | Server logs each download: who, when, which version |
| Upload validation | Compare the version in `_QMS_CONTROL` with the active version |
| Obsolete warning | Upload old form version → FLAG `Version-Valid = OBSOLETE` |
| Grace period | 30 days after the new version is ACTIVE, the old version form is still accepted (warning only) |

### 3.3 Excel Hidden Sheet `_QMS_CONTROL` Verification Rules

Every blank Excel form MUST have a hidden sheet `_QMS_CONTROL` with:

| Cell | Content | For example |
|------|---------|-------|
| A1 | `form_code` | FRM-302 |
| A2 | `version` | 3.2 |
| A3 | `checksum` | SHA256 of form structure |
| A4 | `downloaded_by` | NVA |
| A5 | `downloaded_at` | 2026-03-28T08:30:00Z |
| A6 | `source` | HESEM-QMS-Portal |
| A7 | `allocation_id` | UUID if available |

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

| Situation | Record-ID | Internal revision | Request an audit trail |
|-----------|-----------|-----------------|---------------------|
| Save draft online | Keep it the same | Does not increase submission revision | Record `draft_saved_at`, `saved_by` |
| Submit for the first time online | Keep it the same | `submission_revision = 1` | Record `submitted_by`, `submitted_at`, signature |
| Edit after submitting online | Keep it the same | `submission_revision + 1` | Record the reason for editing, who edited it, when it was edited, and the revision source |
| Upload offline for the first time | Keep it the same | `receipt_version = 1` | Record `uploaded_by`, `uploaded_at`, the received file name |
| Upload offline and submit again | Keep it the same | `receipt_version + 1` | Record new version, keep old receipt history |

Required rules:

1. Old versions must not be obscured or untraceable when controlled edit / resubmission occurs.
2. The system must retain enough metadata to identify which `ai`, `khi nào`, `vì sao`, and `bản nào` are being replaced.
3. If the workflow requires reopening, the reopen action must be recorded separately in the history and must not reset the counter to 0.

---

## 4. Form Builder Governance

### 4.1 Who can do what

| Act | Roles are allowed | Approval needed |
|-----------|---------------|-------------|
| Create a new blank form (DRAFT) | `doc_author`, `admin` | Are not |
| Edit DRAFT form | `doc_author` (owner), `admin` | Are not |
| Submit for REVIEW | `doc_author` (owner) | Are not |
| Approve/Reject form | `doc_reviewer`, `admin` | Are not |
| Release (ACTIVE) | `doc_controller`, `admin` | Reviewer approved |
| Obsolete form | `doc_controller`, `admin` | Are not |
| Edit ACTIVE form | NO ONE — must create a new version | N/A |
| Delete form | `admin` only, only if DRAFT | Are not |

### 4.3 Form Template Editing Rules

1. The `Chỉnh sửa mẫu form` button must open **builder with version control**, do not directly edit live schema that is ACTIVE.
2. The form's builder must be located within the `Online Form` module, not jumping to a separate module.
3. `Tạo mẫu form online` must generate a new draft schema, then follow the `Save Draft -> Submit Review -> Approve / Publish` cycle.
4. Any edits to the ACTIVE form template must create a new working draft and keep the published revision intact until published.

### 4.2 Form Code Assignment

| Series | Departments | For example |
|--------|----------|-------|
| 100-199 | QMS Governance / Executive | FRM-101 Document Register |
| 200-299 | Sales / Contract Review | FRM-201 Quotation Review |
| 300-399 | Engineering | FRM-302 Setup Sheet |
| 400-499 | Supply Chain / Purchasing | FRM-403 SCAR |
| 500-599 | Production | FRM-512 Downtime Log |
| 600-699 | Quality Control / Assurance | FRM-631 NCR Report |
| 700-799 | Logistics / Warehouse | FRM-711 Packing Checklist |
| 800-899 | HR/Training | FRM-802 Training Attendance |
| 900-999 | Audit / Management Review | FRM-913 Audit Finding |

---

## 5. Inter-form Formula Rules

### 5.1 Principles

| # | Rules | Explain |
|---|---------|-----------|
| 1 | **One way** | Form A can reference data from Form B, but Form B does NOT know Form A |
| 2 | **Read-only reference** | Cross-form data is only read, not written back |
| 3 | **Explicit declaration** | All cross-form references must be declared in the schema `dependencies[]` |
| 4 | **Fallback value** | If the reference form has no data → use default value, no crash |
| 5 | **Version-pinned** | Reference specifically attaches the source form version |

### 5.2 Dependency Map

| Target form | Word reference | Data took |
|-----------|-------------|---------|
| FRM-641 (CAPA) | FRM-631 (NCR) | ncr_id, defect_type, root_cause_category |
| FRM-651 (Final Insp) | FRM-511 (First Piece) | first_piece_result, setup_verified |
| FRM-715 (CoC) | FRM-651 (Final Insp) | inspection_result, lot_size, pass_qty |
| FRM-913 (Audit Finding) | FRM-631 (NCR) | related_ncr_ids[] |
| FRM-403 (SCAR) | FRM-701 (Receiving Insp) | iqc_result, supplier_code |

---

## 6. Cross-tab History Requirements

### 6.1 Cross-tab traceability

Every record must be traceable across different tables/tabs:

| From tab | Go to tab | Trace by |
|--------|---------|-------------|
| Allocation History | Form Submissions | `record_id` |
| Form Submissions | Job Dossier | `job_number` |
| Job Dossier | Order Hierarchy | `jo_number` → `so_number` |
| NCR Log | CAPA Log | `ncr_id` in CAPA `source_ref` |
| Audit Finding | NCR/CAPA | `finding_id` → `ncr_id` / `capa_id` |

### 6.2 Minimum History Fields

Every history view MUST display:

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

| # | Rules | Detail |
|---|---------|---------|
| 1 | **SO is the root** | Every JO must attach 1 SO. Every WO must have a JO attached. |
| 2 | **JO attachment form** | Form records (NCR, FAI, Inspection...) attached to JO level |
| 3 | **WO-level optional** | Form can be attached to WO if needed (per-operation tracking) |
| 4 | **Cascading status** | When SO is closed → all JOs must be completed or canceled |
| 5 | **Cross-job NCR** | NCR can reference multiple JOs if the error affects multiple jobs |
| 6 | **Linking immutable** | Once linked, it cannot be deleted — only void allocation |

### 7.3 Data Sources

| Entity | Source of Records | Sync |
|--------|-----------------|------|
| SO | Epicor ERP | Daily import or API |
| JO | Epicor ERP | Daily import or API |
| WO | Epicor ERP | Daily import or API |
| Form links | QMS Portal | Real-time |
| Record-IDs | QMS Portal | Real-time (atomic counter) |

### 7.4 SO/JO/WO Number Format

| Entity | Format | For example |
|--------|--------|-------|
| Sales Orders | `SO-{YYYY}-{4digit}` | SO-2026-0150 |
| Job Order | `JOB-{YYYY}-{4digit}` | JOB-2026-0042 |
| Work Order | `WO-{JOB}-OP{nn}` | WO-JOB-2026-0042-OP10 |

---

## 8. Audit Trail Requirements (ISO 9001 Clause 7.5)

### 8.1 Audit trail principles

| # | ISO 9001:2015 requirements | Implement HESEM |
|---|----------------------|-----------------|
| 7.5.1 | The organization must maintain documented information according to QMS requirements | All form changes are saved as canonical submission/evidence/audit events; legacy `status_history[]` is compatibility only |
| 7.5.2 | When creating/updating, make sure to identify, format, and review | Form lifecycle 6 states, reviewer gate |
| 7.5.3a | Documented information must be available and suitable for use | Active forms on portal, searchable |
| 7.5.3b | Adequately protected | Role-based access, CSRF, audit log |

### 8.2 Audit trail fields (required for all records)

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

| Record type | Holding time | Afterward |
|-----------|-------------|-------|
| Quality records (NCR, CAPA, FAI) | 10 years | Archive → cold storage |
| Production records | 7 years | Archive → cold storage |
| Training records | Until the employee leaves + 3 years | Archive |
| Audit records | 10 years | Archive |
| Allocation logs | 5 years | Purge |
| Voided allocations | 3 years | Purge |

---

## 9. Record Type Expansion Catalog (CNC Manufacturing)

### 9.1 Quality Records

| Code | Name | Format | Counter Digits | Scope |
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

| Code | Name | Format | Counter Digits | Scope |
|------|-----|--------|---------------|-------|
| DOWNTIME | Machine Downtime | `DT-{YYYY}-{4d}` | 4 | Per-event |
| SETUP | Setup Record | `SETUP-{YYYY}-{4d}` | 4 | Per-job-op |
| TOOL-CHG | Tool Change Record | `TC-{YYYY}-{4d}` | 4 | Per-event |
| SHIFT | Shift Handover | `SH-{YYYY}-{4d}` | 4 | Per-shift |
| IMP | Improvement Suggestion | `IMP-{YYYY}-{code}` | 3 | Per-event |

### 9.3 Engineering Records

| Code | Name | Format | Counter Digits | Scope |
|------|-----|--------|---------------|-------|
| ECR | Engineering Change Request | `ECR-{YYYY}-{3d}` | 3 | Per-event |
| ECO | Engineering Change Order | `ECO-{YYYY}-{3d}` | 3 | Per-ECR |
| DFM | Design for Manufacturing | `DFM-{YYYY}-{3d}` | 3 | Per-part |
| PROVOUT | Prove-out Record | `PO-{YYYY}-{3d}` | 3 | Per-part-rev |

### 9.4 Logistics & Supply Chain Records

| Code | Name | Format | Counter Digits | Scope |
|------|-----|--------|---------------|-------|
| PO-EXCEPTION | PO Exception | `POE-{YYYY}-{3d}` | 3 | Per-event |
| IQC | Incoming QC | `IQC-{YYYY}-{4d}` | 4 | Per-lot |
| SHIP | Shipping Record | `SHIP-{YYYY}-{4d}` | 4 | Per-shipment |

### 9.5 HR & Training Records

| Code | Name | Format | Counter Digits | Scope |
|------|-----|--------|---------------|-------|
| TRN | Training Event | `TRN-{YYYY}-{3d}` | 3 | Per-event |
| COMP | Competency Assessment | `COMP-{YYYY}-{3d}` | 3 | Per-employee |

### 9.6 Management Records

| Code | Name | Format | Counter Digits | Scope |
|------|-----|--------|---------------|-------|
| MR | Management Review | `MR-{YYYY}-Q{n}` | 1 | Quarterly |
| RISK | Risk Assessment | `RISK-{YYYY}-R{2d}` | 2 | Per-review |

---

## 10. Auto-Void Rules for Unused Allocations

### 10.1 Trigger Conditions

| # | Condition | Act | Grace Period |
|---|----------|-----------|-------------|
| 1 | ALLOCATED > 90 days, not yet DOWNLOADED | AUTO-VOID | 90 days |
| 2 | DOWNLOADED > 90 days, not yet SUBMITTED | AUTO-VOID | 90 days |
| 3 | REJECTED > 30 days, not re-SUBMITTED | AUTO-VOID | 30 days |

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

Auto-void monthly report:
- Total number of auto-voided allocations
- Breakdown by record_type
- Breakdown by department
- Top 5 users with the most auto-voids → training target

---

## 11. Legacy JSON Storage Structure

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

The JSON structure above is retained only for migration and compatibility
documentation. New controlled issuance, submission, finalization, amendment, and
evidence version state must be persisted in canonical `frm_*`, `evidence_*`,
`signature_events`, and audit/outbox tables.

---

> **Last cap:** 2026-03-29
> **Application:** All Record-ID generation process, lifecycle form management, and SO/JO/WO connection
> **Related documents:** 15-evidence-and-records-naming.md, 18-online-vs-offline-form-decision-framework.md, RecordIdGenerator.php, FormEngine.php
