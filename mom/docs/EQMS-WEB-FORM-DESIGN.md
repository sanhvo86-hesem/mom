# eQMS Web Form System — Design Document

> **HESEM QMS Portal** — Aerospace CNC Manufacturing
> ISO 9001:2015 / AS9100D / 21 CFR Part 11 aligned
> Version: 1.0 — 2026-03-31

---

## 1. Architecture Overview

```
                    +---------------------------+
                    |    Evidence Control Tab    |
                    |  (Kiem soat chung cu)      |
                    +---------------------------+
                              |
              +---------------+---------------+
              |               |               |
         [Viec cua toi]  [Bieu mau]    [Tai len] [Tao ma]
              |               |
              |    +----------+----------+
              |    |                     |
              | File Explorer       Form Viewer
              | (04-Bieu-Mau/)     (eQMS Runtime)
              |    |                     |
              |    +-- FRM-xxx.xlsx      +-- Render form from schema
              |    +-- FRM-xxx.html      +-- Fill + Validate
              |                          +-- E-signature
              |                          +-- Submit -> Workflow
              |                          +-- Audit Trail
              |                          +-- PDF Export
              +--------- Work Queue + Approvals
```

### Core Principle
Form online (eQMS web form) la **tai lieu duoc kiem soat** — giong nhu SOP/WI/ANNEX.
- Moi form co form_code, version, status, owner, approver
- Form online mo ra giong SOP: co toolbar Edit/Details/Back/New Tab
- Form Excel download-only, ten file tuan thu naming convention
- Tat ca nam trong folder `04-Bieu-Mau/` va hien trong File Explorer

---

## 2. Form Schema Standard (JSON)

### 2.1 Schema Structure

```json
{
  "$schema": "hesem-eqms-form/v1",
  "form_code": "FRM-403-SCAR",
  "title": "Supplier Corrective Action Request",
  "title_vi": "Yeu cau hanh dong khac phuc nha cung cap",
  "version": "V1",
  "version_int": 1,
  "category": "quality",
  "sop_ref": "SOP-401",
  "record_type": "SCAR",
  "delivery_mode": "online",
  "status": "released",
  "owner": "QA",
  "approver": "QA",
  "effective_date": "2026-03-31",
  "retention_years": 10,
  "linked_excel": "FRM-403",

  "roles_allowed": {
    "create": ["qa_manager", "quality_engineer", "buyer"],
    "fill": ["qa_manager", "quality_engineer", "buyer", "supply_chain_manager"],
    "review": ["qa_manager", "supply_chain_manager"],
    "approve": ["qa_manager"],
    "view": ["all"]
  },

  "workflow": {
    "type": "sequential",
    "states": ["draft", "submitted", "in_review", "approved", "closed", "voided"],
    "transitions": {
      "draft": { "next": ["submitted"], "roles": ["fill"] },
      "submitted": { "next": ["in_review"], "roles": ["review"] },
      "in_review": { "next": ["approved", "draft"], "roles": ["approve"] },
      "approved": { "next": ["closed", "voided"], "roles": ["approve"] },
      "closed": { "next": [], "terminal": true },
      "voided": { "next": [], "terminal": true }
    }
  },

  "sections": [
    {
      "id": "identification",
      "title": "Nhan dien ho so va nha cung cap",
      "title_en": "Record identification and supplier",
      "description": "Khoa du ngu canh phat hanh...",
      "field_ids": ["scar_date", "supplier_name", "supplier_id", "po_number"]
    }
  ],

  "fields": [
    {
      "id": "scar_date",
      "type": "date",
      "label": "Ngay phat hanh SCAR",
      "label_en": "SCAR Date",
      "required": true,
      "default": "today",
      "permissions": {
        "edit": ["fill"],
        "view": ["all"]
      },
      "state_permissions": {
        "draft": { "edit": ["fill"] },
        "submitted": { "edit": [] },
        "approved": { "edit": [] }
      },
      "audit_tracked": true,
      "print_visible": true
    },
    {
      "id": "severity",
      "type": "select",
      "label": "Muc do",
      "label_en": "Severity",
      "required": true,
      "options": [
        { "value": "critical", "label": "Nghiem trong", "color": "#dc2626" },
        { "value": "major", "label": "Lon", "color": "#d97706" },
        { "value": "minor", "label": "Nho", "color": "#16a34a" }
      ],
      "conditional_required": {
        "field": "scar_status",
        "operator": "not_equals",
        "value": "cancelled"
      }
    }
  ],

  "signature_blocks": [
    {
      "id": "originator",
      "label": "Nguoi phat hanh",
      "label_en": "Originator",
      "meaning": "Authored",
      "required_on_submit": true,
      "roles": ["fill"]
    },
    {
      "id": "reviewer",
      "label": "Nguoi xem xet",
      "label_en": "Reviewer",
      "meaning": "Reviewed",
      "required_on_submit": false,
      "required_on_approve": true,
      "roles": ["review"]
    },
    {
      "id": "approver",
      "label": "Nguoi phe duyet",
      "label_en": "Approver",
      "meaning": "Approved",
      "required_on_approve": true,
      "roles": ["approve"]
    }
  ],

  "auto_fields": ["record_id", "submitted_by", "submitted_at", "entry_id"],

  "computed_fields": [
    {
      "id": "days_overdue",
      "formula": "DATEDIFF(NOW(), supplier_response_due, 'days')",
      "label": "So ngay qua han"
    }
  ],

  "linked_record_types": ["NCR", "CAPA"],

  "notifications": {
    "on_submit": { "roles": ["review"], "template": "form_submitted" },
    "on_approve": { "roles": ["fill"], "template": "form_approved" },
    "on_overdue": { "roles": ["review", "approve"], "template": "form_overdue" }
  },

  "pdf_template": {
    "header": { "logo": true, "form_code": true, "version": true },
    "footer": { "page_numbers": true, "uncontrolled_warning": true },
    "watermark_on_draft": "DRAFT — NOT FOR PRODUCTION USE"
  }
}
```

### 2.2 Field Types Supported

| Type | Description | Validation | Aerospace Use |
|------|-------------|-----------|---------------|
| `text` | Single line | maxLength, pattern | Part numbers, descriptions |
| `number` | Numeric | min, max, precision | Quantities, measurements |
| `date` | Calendar | min, max | SCAR dates, due dates |
| `datetime` | Date + time | — | Timestamps |
| `select` | Dropdown | enum | Severity, status |
| `multi_select` | Multi-choice | minItems, maxItems | Root cause categories |
| `textarea` | Multi-line | maxLength | Descriptions |
| `checkbox` | Boolean | — | Confirmations |
| `file` | Attachment | maxSize, mimeTypes | Certs, photos, reports |
| `lookup` | Master data | source, cascading | Customer, part, order |
| `table` | Repeating rows | minRows, maxRows | Defect list, action items |
| `calculated` | Formula | formula | Overdue days, totals |
| `signature` | E-sign block | meaning, roles | Approval signatures |
| `section` | Group divider | — | Layout |
| `heading` | Title text | — | Layout |

---

## 3. Data Storage Model

### 3.1 Form Entry Structure

```json
{
  "entry_id": "FRM-403-SCAR-20260331-a1b2c3",
  "form_code": "FRM-403-SCAR",
  "form_version": 1,
  "record_id": "SCAR-2026-001",
  "allocation_id": "alloc-uuid-here",

  "data": {
    "scar_date": "2026-03-31",
    "supplier_name": "A-Coat Surface Treatment",
    "supplier_id": "SUP-001",
    "severity": "major",
    "description": "..."
  },

  "signatures": {
    "originator": {
      "signer_id": "sanh.vo",
      "printed_name": "Vo Ngoc Sanh",
      "meaning": "Authored",
      "timestamp": "2026-03-31T14:30:00Z",
      "record_hash": "sha256:abc..."
    }
  },

  "workflow_state": "submitted",
  "created_by": "sanh.vo",
  "created_at": "2026-03-31T14:25:00Z",
  "submitted_at": "2026-03-31T14:30:00Z",
  "approved_by": null,
  "approved_at": null,

  "linked_records": [
    { "type": "parent", "record_id": "NCR-2026-042", "relationship": "originated_from" }
  ],

  "attachments": [
    { "file_name": "defect-photo.jpg", "file_hash": "sha256:...", "uploaded_at": "..." }
  ],

  "metadata": {
    "ip": "192.168.1.45",
    "user_agent": "...",
    "server_time": "2026-03-31T14:30:01Z"
  }
}
```

### 3.2 Audit Trail Entry

```json
{
  "audit_id": "AUD-20260331-143001-001",
  "entry_id": "FRM-403-SCAR-20260331-a1b2c3",
  "form_code": "FRM-403-SCAR",
  "timestamp": "2026-03-31T14:30:01Z",
  "user_id": "sanh.vo",
  "user_name": "Vo Ngoc Sanh",
  "action": "FIELD_MODIFY",
  "field_id": "severity",
  "previous_value": "minor",
  "new_value": "major",
  "reason": "Updated per QA assessment",
  "ip": "192.168.1.45"
}
```

---

## 4. Frontend Architecture

### 4.1 Form Renderer (inside Evidence Control workspace)

When user clicks an eQMS form HTML file in the File Explorer:
1. Document viewer opens (same as SOP)
2. Toolbar shows: Edit | Details | Back | New Tab
3. Form renders from JSON schema (NOT from static HTML)
4. User fills fields, validates inline
5. Save Draft / Submit / Sign / Approve

### 4.2 Form States & UI

| State | UI Behavior | Actions Available |
|-------|------------|-------------------|
| **New** | All fields editable | Save Draft, Submit |
| **Draft** | All fields editable | Save Draft, Submit, Discard |
| **Submitted** | Fields locked | Review, Reject |
| **In Review** | Fields locked | Approve, Reject |
| **Approved** | All locked, green banner | Close, Void, Export PDF |
| **Closed** | All locked, archive state | View, Export PDF |

### 4.3 Field Rendering Pattern

```
+------------------------------------------+
| FIELD LABEL                    [Required] |
| +--------------------------------------+ |
| |  Field input (text/select/date/...)  | |
| +--------------------------------------+ |
| Helper text / validation error           |
+------------------------------------------+
```

- Draft: White background, blue border on focus
- Submitted: Gray background, locked icon
- Error: Red border, error message below
- Audit-tracked fields: Small clock icon

### 4.4 Signature Block Pattern

```
+------------------------------------------+
| ORIGINATOR SIGNATURE          [Authored]  |
| ┌──────────────────────────────────────┐ |
| │  [Sign] button  OR  Signed display  │ |
| │  Name: Vo Ngoc Sanh                 │ |
| │  Date: 2026-03-31 14:30            │ |
| │  Meaning: Authored                  │ |
| └──────────────────────────────────────┘ |
+------------------------------------------+
```

---

## 5. Implementation Roadmap

### Phase 1: Core Form Engine (Week 1-2)
- [ ] Form schema validator (validate schema JSON before use)
- [ ] Form renderer in workspace (render fields from schema)
- [ ] Field types: text, number, date, select, textarea, checkbox
- [ ] Save draft (localStorage + server)
- [ ] Submit workflow (draft -> submitted)
- [ ] Basic audit trail (log submissions)

### Phase 2: Compliance Features (Week 3-4)
- [ ] E-signature integration (reuse existing ESignature component)
- [ ] Approval workflow (submit -> review -> approve)
- [ ] Field-level audit trail (log every change)
- [ ] Role-based field permissions
- [ ] Conditional field visibility
- [ ] Calculated fields

### Phase 3: Advanced Features (Week 5-6)
- [ ] PDF export (server-side, controlled copy)
- [ ] Table/repeating section fields
- [ ] Lookup fields (master data integration)
- [ ] File attachments
- [ ] Linked records (NCR -> CAPA)
- [ ] Offline capability (PWA)

### Phase 4: Polish & Audit (Week 7-8)
- [ ] Version control UI for form schemas
- [ ] Admin: form schema editor
- [ ] Admin: workflow configuration
- [ ] Full audit trail viewer
- [ ] Print layout matching web layout
- [ ] Validation suite / test cases

---

## 6. File Structure

```
01-QMS-Portal/
  qms-data/
    online-forms/
      schemas/          -> Form schema JSON files
        FRM-403.json
      entries/           -> Form submissions (JSON, transitional)
        FRM-403-SCAR/
          entry-uuid.json
      audit/             -> Audit trail logs
        FRM-403-SCAR/
          2026-03.jsonl  -> Append-only monthly log
  scripts/portal/
    09b-form-fill-download.js  -> Form renderer + workspace
    09f-form-builder-engine.js -> Schema editor (admin)
  api/
    services/
      FormEngine.php     -> Validation, submission, enrichment
      FormulaEngine.php  -> Calculated fields
  database/
    migrations/
      004_form_system.sql -> PostgreSQL schema (ready)

04-Bieu-Mau/              -> Physical form files (file explorer)
  04-FRM-400/
    FRM-403_Outsourced_Process_Request.xlsx    -> Excel version
    FRM-403-SCAR_Supplier_Corrective_Action_Request.html -> Online HTML
```

---

## 7. Naming Convention for Forms

### 7.1 Form Code

| Pattern | Example | Description |
|---------|---------|-------------|
| `FRM-NNN` | `FRM-403` | Excel form (offline) |
| `FRM-NNN-SUFFIX` | `FRM-403-SCAR` | Online form (eQMS web form) |

### 7.2 File Naming

| Type | Pattern | Example |
|------|---------|---------|
| Excel template | `FRM-NNN_Title.xlsx` | `FRM-403_Outsourced_Process_Request.xlsx` |
| Online HTML | `FRM-NNN-SUFFIX_Title.html` | `FRM-403-SCAR_Supplier_Corrective_Action_Request.html` |
| Schema JSON | `FRM-NNN-SUFFIX.json` | `FRM-403-SCAR.json` |
| Submission | `FRM-NNN-SUFFIX-YYYYMMDD-uuid` | (internal, not a file) |
| PDF export | `FRM-NNN-SUFFIX_V1_RECORD-ID_DATE.pdf` | `FRM-403-SCAR_V1_SCAR-2026-001_20260331.pdf` |

### 7.3 Record ID

| Type | Pattern | Example |
|------|---------|---------|
| SCAR | `SCAR-YYYY-NNN` | `SCAR-2026-001` |
| NCR | `NCR-YYYY-NNN` | `NCR-2026-042` |
| CAPA | `CAPA-YYYY-NNN` | `CAPA-2026-015` |

---

## 8. Standards Compliance Matrix

| Requirement | Standard | Implementation |
|-------------|----------|----------------|
| Audit trail | 21 CFR 11.10(e) | Append-only log, field-level tracking |
| E-signature | 21 CFR 11.50-100 | Name + time + meaning, re-auth at signing |
| Record integrity | 21 CFR 11.10(c) | SHA-256 hash, immutable after approval |
| Access control | 21 CFR 11.10(d) | Role + state based field permissions |
| Retention | AS9100D 7.5.3 | Configurable per record type (10-40 years) |
| Version control | ISO 9001 7.5.2 | Schema versioning, entry links to version |
| Traceability | AS9100D 8.5.2 | Record ID, linked records, master context |
| Change control | ISO 9001 7.5.3 | Workflow states, reason for change |
| Availability | ISO 9001 7.5.3 | Offline PWA, PDF export |
```
