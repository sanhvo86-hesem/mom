# Production Backlog — Evidence Control & Order Management
## HESEM QMS Portal — Q2 2026

**Sources:** Claude Opus audit (2026-03-29) + GPT Pro audit (2026-03-29)
**Last updated:** 2026-03-29

---

## P0 — BLOCKERS (Must fix before pilot)

### P0-01: Master Data Governance
**Problem:** master-data.json has 3 customers/3 suppliers/3 parts (seed only). No lifecycle, no duplicate control, no referential integrity, no approval, no history.
**Files:** `api.php` (L8358), `qms-data/master-data/master-data.json`, `13-master-data-control.js`
**Acceptance Criteria:**
- [ ] Master data entities have lifecycle: draft → active → inactive → obsolete
- [ ] Duplicate detection on create (customer_name, part_number)
- [ ] Parent-child validation: customer → part → revision, SO → JO → WO
- [ ] Change history (who changed what, when, old value → new value)
- [ ] Owner + approval for changes to active records
- [ ] Archive mechanism for obsolete records
**Test:** Create duplicate customer → system rejects. Change active part → requires approval. View history → shows all changes.

### P0-02: Server-Side Order Workflow Enforcement
**Problem:** `so_jo_wo_config.json` defines transitions but `api.php` L8512 just writes new status without validation.
**Files:** `api.php` (order_*_update_status), `so_jo_wo_config.json`
**Acceptance Criteria:**
- [ ] Server validates transition against config (e.g., cannot jump from "draft" to "shipped")
- [ ] Role-based guards enforced server-side (not just UI)
- [ ] Controlled edit for: qty, due_date, revision, machine, routing, operator
- [ ] Cancel requires reason + role check
- [ ] Reopen from closed requires manager approval
- [ ] Full change_history (not just status_history) — tracks field-level changes
**Test:** POST invalid transition → 400 error. POST valid transition with wrong role → 403. Change qty on active JO → logged in change_history.

### P0-03: AllocationTracker Implementation
**Problem:** 09h-allocation-tracker.js is STUB — all methods empty. Tabs 3+4 non-functional.
**Files:** `09h-allocation-tracker.js`, `api.php` (allocation_* endpoints)
**Acceptance Criteria:**
- [ ] `allocate()` → POST to allocation_allocate → returns record_id
- [ ] `getHistory()` → POST to allocation_history → returns filtered/paginated list
- [ ] `void()` → POST to allocation_void → updates status
- [ ] `inspectUpload()` → POST multipart to upload_inspect → returns verification result
- [ ] `receiveUpload()` → POST multipart to upload_receive → accepts file
- [ ] `renderHistoryTable()` → renders sortable table with status badges
- [ ] `renderPagination()` → page controls
- [ ] `copyToClipboard()` → copies record ID
- [ ] `downloadRecordTxt()` → downloads empty .txt named with ID
**Test:** Generate NCR ID → appears in history. Upload Excel → verify → accept. Void unused allocation → status changes.

### P0-04: Vietnamese Diacritics Cleanup
**Problem:** FRM-631.json has mojibake at L133/L454. allocation_rules.json L18 and so_jo_wo_config.json L114 have ASCII Vietnamese.
**Files:** `FRM-631.json`, `allocation_rules.json`, `so_jo_wo_config.json`
**Acceptance Criteria:**
- [ ] Zero mojibake in any JSON config or form schema
- [ ] All label_vi, title_vi, description_vi have proper dấu
- [ ] All status labels in Vietnamese have proper dấu
- [ ] grep -rP '[\x80-\xff]{3,}' finds no mojibake sequences
**Test:** Open FRM-631 form → all labels render correctly. Filter forms by Vietnamese name → works.

---

## P1 — 30-Day Priority (Before production rollout)

### P1-01: Auto-Link Evidence to Order Context
**Problem:** Traceability is manual. form_links in orders.json has 0 entries.
**Files:** `api.php` (order_link_form L8556), `09c-record-id-generator.js`, `09b-form-fill-download.js`
**Acceptance Criteria:**
- [ ] When allocating record ID with JO context → auto-link to JO
- [ ] When submitting online form with JO context → auto-link
- [ ] Validate: record exists, correct type, correct SO/JO/WO context
- [ ] Reverse query: GET order_get_linked_forms → returns all evidence for an order
- [ ] UI: Order detail shows linked forms panel
**Test:** Create NCR with JO-2026-00001 → form auto-appears in JO detail.

### P1-02: Approval Engine for Evidence Control
**Problem:** E-signature captures payload but no server-side review/approve/reject/reopen actions.
**Files:** `api.php`, `WorkflowEngine.php`, `11-e-signature.js`, `09b-form-fill-download.js`
**Acceptance Criteria:**
- [ ] Separate actions: submit_for_review, review, approve, reject, reopen
- [ ] Role-based: only authorized roles can approve (per form schema roles_allowed)
- [ ] Step-up re-auth: PIN/password confirm on approve action (server-side verify)
- [ ] E-signature data stored with approval event (signer, timestamp, hash, reason)
- [ ] Audit trail: complete chain from submit → review → approve with all metadata
- [ ] Rejected forms return to author with reason; can be revised and resubmitted
**Test:** Submit NCR → manager sees pending. Manager approves with e-signature → status changes. Reject → author can edit and resubmit.

### P1-03: Upload Hardening
**Problem:** File upload has baseline security but no defense-in-depth per OWASP.
**Files:** `api.php`, `MimeValidator.php`, `ExcelVerificationService.php`
**Acceptance Criteria:**
- [ ] Files stored OUTSIDE webroot (not in qms-data/allocations/uploads)
- [ ] Quarantine directory: uploads go to quarantine first, then move to accepted
- [ ] Allow-list strict: only xlsx, pdf, jpg, png, csv (no docx, pptx)
- [ ] File renamed to UUID on storage (original name in metadata)
- [ ] Size limit enforced: 25MB for Excel, 10MB for images
- [ ] Hidden sheet hash verified before acceptance
- [ ] Exception queue: failed uploads logged for admin review
**Test:** Upload .exe renamed to .xlsx → rejected (magic bytes mismatch). Upload valid xlsx → quarantine → verify → accept.

### P1-04: Order CRUD UI (Create/Edit/Status)
**Problem:** API endpoints exist but no frontend modals to create SO/JO/WO or transition status.
**Files:** `09e-so-jo-wo-dashboard.js`
**Acceptance Criteria:**
- [ ] Create SO modal: customer dropdown (from master data), PO number, dates, qty, priority
- [ ] Create JO modal: parent SO selector, part number, revision, routing, qty
- [ ] Create WO modal: parent JO selector, operation, machine, operator
- [ ] Status transition modal: shows allowed next states, reason field, role check
- [ ] Inline edit for: qty, due_date, priority on active orders
- [ ] Status history timeline in order detail
**Test:** Create SO → shows in hierarchy. Create JO under SO → linked. Transition JO to active → logged in history.

### P1-05: Tab 2 Form Fill & Submit Wiring
**Problem:** Form fill tab exists but form loading and submission not wired to API.
**Files:** `09b-form-fill-download.js`, `api.php`
**Acceptance Criteria:**
- [ ] Load form schema from API on form selection
- [ ] Render form fields dynamically from JSON schema
- [ ] Auto-fill context fields (Job, Part, Customer) from searchable dropdowns
- [ ] Save draft to server (not just localStorage)
- [ ] Submit form → create allocation → save entry → trigger workflow
- [ ] Show form fill history per user
**Test:** Select FRM-631 → form renders. Fill fields → save draft → reload → draft persists. Submit → entry created with record ID.

### P1-06: Exception Dashboard
**Problem:** No operational dashboard for overdue/failed/orphan items.
**Files:** New JS module or integrated into existing tabs
**Acceptance Criteria:**
- [ ] Allocations quá hạn chưa nộp (>30 days downloaded, not submitted)
- [ ] Upload failures/rejections (last 30 days)
- [ ] SO/JO/WO overdue (due_date < today, not completed)
- [ ] Orphan record links (linked to non-existent order)
- [ ] CAPA mở quá hạn (>60 days)
- [ ] WO đang chạy nhưng chưa có evidence gate cần thiết
**Test:** Create allocation, wait 31 days simulation → appears in overdue list.

### P1-07: Migrate Critical Data to PostgreSQL
**Problem:** JSON flat files don't scale for concurrent users.
**Files:** `database/DataLayer.php`, `api.php`, `database/config.php`
**Acceptance Criteria:**
- [ ] Master data → PostgreSQL (customers, vendors, items tables)
- [ ] Orders → PostgreSQL (sales_orders, job_orders, work_orders tables)
- [ ] Allocations → PostgreSQL (records, record_counters tables)
- [ ] Form entries → PostgreSQL (form_entries table)
- [ ] Audit events → PostgreSQL (audit_events table)
- [ ] DataLayer mode switched to SHADOW_WRITE (writes to both JSON + PG)
- [ ] JSON fallback still works if PG connection fails
**Test:** Create NCR with 5 concurrent users → no data loss. Query allocation history → < 200ms response.

---

## P2 — 60-Day (Post-launch improvements)

### P2-01: Expand form coverage around order flow
- FRM-302 Setup Sheet verify, FRM-311 FAI, FRM-651 Final Inspection
- FRM-711 Packing/Ship, FRM-701 Receiving/IQC

### P2-02: SharePoint sync implementation
- Graph API connector for document upload
- Bidirectional sync for master data

### P2-03: Epicor ERP integration
- API connector for SO/JO/WO data
- Part master sync
- Customer/vendor sync

### P2-04: Advanced search & export
- Full-text search across form entries
- Export to Excel with allocation log
- Audit trail report for compliance

### P2-05: Performance monitoring
- Request logging with latency tracking
- Slow query detection
- Concurrent user load testing

---

## Execution Priority

```
Week 1: P0-03 (AllocationTracker) + P0-04 (diacritics) + P0-01 (master data governance)
Week 2: P0-02 (order workflow) + P1-01 (auto-link) + P1-05 (form fill wiring)
Week 3: P1-02 (approval engine) + P1-04 (order CRUD UI)
Week 4: P1-03 (upload hardening) + P1-06 (exception dashboard) + P1-07 (PostgreSQL migration)
```
