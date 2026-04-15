# 14 — M365 SharePoint architecture and operational record keeping

## 0. Authority correction - portal-first control plane

This standard is superseded wherever it describes SharePoint as the system of
record, SSOT, save location, or user upload channel for controlled evidence.
The current authority model is:

- Portal/database/evidence package = authoritative record and retention object.
- SharePoint = asynchronous read-only publication and discovery target only.
- End users must not upload controlled evidence directly to SharePoint.
- Offline Excel is a controlled capture carrier issued by the portal; it is not
  the source of truth.
- Final evidence must be accepted, locked, packaged, retained, and audited in
  the portal before any SharePoint publication attempt.

> Design a SharePoint publication architecture for read-only distribution,
> discovery, and receipt tracking after portal acceptance/finalization.

---

## 1. Architectural principles

| # | Principle | Describe |
|---|-----------|-------|
| 1 | **Portal = create/accept/finalize, SharePoint = read-only publication** | People work through the portal. SharePoint receives only controlled publication copies after portal finalization. |
| 2 | **Site = security boundary** | Each site = 1 sensitivity level, 1 main user group. Separate customer IPs to separate sites. |
| 3 | **Epicor = ERP SoR, portal = QMS/evidence SoR, SharePoint = publication replica** | Epicor manages ERP transactions. The portal manages controlled records and evidence. SharePoint links back to the authoritative portal record. |
| 4 | **Flat folder + metadata** | Maximum 3 levels of folders. Use SharePoint metadata columns instead of deep sub-folders. |
| 5 | **OneDrive for personal files** | Do not create Employee Workbench in SharePoint. Each user uses OneDrive (1TB/user in Business Basic). |
| 6 | **Group-based permission** | Delegate permissions according to Entra ID Security Groups, do not assign per-user. |
| 7 | **Blank/offline forms issued by portal** | Form template (.xlsx) is issued by the portal. Completed forms are uploaded to the portal and may later be published to SharePoint as read-only copies. |

---

## 2. Topology 4 sites

```
SITE 1: HESEM-Records             ← Hồ sơ vận hành (form đã điền, evidence chung)
SITE 2: HESEM-Job-Evidence        ← Job dossier + Part baseline + IP khách hàng (TÁCH RIÊNG)
SITE 3: HESEM-People              ← HR restricted
SITE 4: HESEM-Digital             ← Source control (backup web portal) + IT governance
```

**Why 4 sites instead of 3?**

| Reason | Explain |
|-------|-----------|
| Customer IP | Lam Research IP (drawings, spec, CAM data) MUST separate site — audit asks "How do you protect our IP?" |
| Permission isolation | SharePoint site-level isolation = the hardest security boundary in M365 Business Basic |
| Performance | Job dossier largest volume (2000-5000 files/year) — separated without affecting other sites |
| Compliance | AS9100 §8.5.2 traceability + ISO 9001 §7.5.3 record protection |

---

## 3. SITE 1: HESEM-Records — Operational records

**Purpose:** Contains read-only publication copies and discovery metadata for completed forms, evidence, and records arising in daily operations. Authoritative records remain in the portal.

### 3.1 Document Libraries

| Library | Content | Folder structure |
|---------|---------|-----------------|
| **Quality-Records** | NCR, CAPA, FAI, Calibration, SPC, IQC, Complaint, Ship-Release, Supplier | `{YYYY}/{RecordType}/` |
| **QMS-Governance** | Management Review, Audit, Risk, Change Control, KPI, Improvement | `{YYYY}/{RecordType}/` |
| **Training-Records** | Attendance, OJT, Assessment, Certification | `{YYYY}/{RecordType}/` + `Skill-Matrix/00-Current/` |
| **Department-Ops** | Per-department operational records | `{DeptCode}/{00-Current hoặc YYYY}/` |

### 3.2 SharePoint Lists (tracking dashboards)

| List | Data |
|------|---------|
| LST-NCR-Log | Tracker NCR status, link to file in Quality-Records |
| LST-CAPA-Log | Tracker CAPA status |
| LST-FAI-Tracker | FAI completion per job |
| LST-Calibration-Schedule | Equipment + due dates + alerts |
| LST-Supplier-Scorecard | Supplier performance |
| LST-Maintenance-Schedule | Machine PM schedule |
| LST-Change-Request-Log | ECR/ECO tracking |

### 3.3 Online form sync

Each online form may publish a read-only receipt/list row and PDF snapshot to SharePoint after portal finalization:

| Online form | SharePoint List | PDF saved at |
|------------|----------------|-------------|
| FRM-208 Tier Meeting | LST-FRM-208 | Department-Ops/PRO/{YYYY}/ |
| FRM-504 Shift Handover | LST-FRM-504 | Department-Ops/PRO/{YYYY}/ |
| FRM-512 Downtime Log | LST-FRM-512 | Department-Ops/PRO/{YYYY}/ |
| FRM-631 NCR Report | LST-FRM-631 | Quality-Records/{YYYY}/NCR/ |
| FRM-641 CAPA Request | LST-FRM-641 | Quality-Records/{YYYY}/CAPA/ |
| FRM-651 Final Inspection | LST-FRM-651 | Quality-Records/{YYYY}/Ship-Release/ |
| FRM-701 Receiving Log | LST-FRM-701 | Quality-Records/{YYYY}/IQC/ |
| FRM-711 Packing/Ship | LST-FRM-711 | Quality-Records/{YYYY}/Ship-Release/ |
| FRM-802 Training Attendance. | LST-FRM-802 | Training-Records/{YYYY}/Attendance/ |

### 3.4 Metadata columns (Quality-Records library)

| Column | Type | Obligatory | Describe |
|--------|------|---------|-------|
| Record-Type | Choice | Have | NCR, CAPA, FAI, Calibration, SPC, IQC, Complaint, Ship-Release, Supplier |
| Record-Number | Text (indexed) | Have | NCR-2026-043, FAI-2026-015 |
| Form-Code | Text | Sometimes it's a form | FRM-631, FRM-311 |
| Form-Version | Text | Sometimes it's a form | V2.1 |
| Job-Number | Text | If any | JOB-2026-0042 |
| Part-Number | Text | If any | 714-XXXX-001 |
| Customer | Choice | If any | Lam-Research |
| Status | Choice | Have | Open, In-Review, Closed |
| Department | Choice | Have | QA, ENG, PRO, SCM... |
| Year | Text | Have | 2026 |
| Closed-Date | Date | When closed | 2026-04-15 |

---

## 4. SITE 2: HESEM-Job-Evidence — Customer IP

**Purpose:** All records attach job order + engineering baseline + customer documents. **NO external sharing.**

### 4.1 Document Libraries

| Library | Content | Folder structure |
|---------|---------|-----------------|
| **Part-REV-Master** | Reusable engineering baseline: NC, CAM, Setup Sheet, Tool List, Inspection Program, Fixture, Simulation, Control Plan | `{CustomerID}/{PartNum}/{REV-X}/` |
| **Job-Dossiers** | Evidence of execution per job: filled out form, photos, CMM data, certs, traveler, CoC | `{YYYY}/{JobNum}_{PartRev}/` |
| **Customer-Received** | Original documents sent by customers (drawings, spec, quality requirements) | `{CustomerID}/{DocType}/` |
| **Tooling-Fixture-Gage** | Reusable assets: fixture drawings, gage records, tool crib | `{AssetType}/{AssetID}/` |

### 4.2 Part-REV-Master — file categories

| File-Category | Actual file types | For example |
|--------------|-------------------|-------|
| NC-Program | .nc, .tap, .mpf, .eia, .cnc | NC_714XXXX-REVA_OP10_5AX_V3.nc |
| CAM-Source | .mcam, .f3d, .emcam | CAM_714XXXX-REVA_OP10_5AX_V3.mcam |
| CAD-Model | .step, .stp, .igs, .x_t | MODEL_714XXXX-REVA_ALL_V1.step |
| Drawing | .pdf | DWG_714XXXX-REVA_ALL_V1.pdf |
| Setup-Sheet | .xlsx (FRM-302) | SETUP_714XXXX-REVA_OP10_5AX_V3.xlsx |
| Tool-List | .xlsx | (integrated in FRM-302) |
| Inspection-Program | .dcc, .prg, .pcx | INSP_714XXXX-REVA_ALL_CMM_V2.dcc |
| Control-Plan | .xlsx (FRM-133) | CTRL-PLAN_714XXXX-REVA_ALL_V2.xlsx |
| Fixture-Drawing | .pdf, .step | FIXTURE_714XXXX-REVA_OP10_5AX_V1.pdf |
| Simulation-Evidence | .mp4, .png | SIM_714XXXX-REVA_OP10_5AX_V3.mp4 |
| Baseline-Manifest | .xlsx (FRM-306) | FRM-306_714XXXX-REVA_ALL_V3.xlsx |
| Supersedure-Record | .xlsx (FRM-307) | FRM-307_714XXXX-REVA_ALL_V2-to-V3_20260327.xlsx |

### 4.3 Part-REV-Master vs Job Dossier relationship

```
Part-REV-Master (tái sử dụng)          Job Dossier (1 lần/đơn hàng)
Setup Sheet v3 ──── sử dụng ──────►    WI-519 checklist đã điền
NC Program v3  ──── chạy ─────────►    Prove-out evidence
Tool List v3   ──── chuẩn bị ─────►    Tool wear log
Insp. Prog. v2 ──── đo ──────────►    FAI report + CMM data

RULE: Job Dossier KHÔNG chứa copy NC/Setup/Tool List.
      Job Dossier chỉ chứa EVIDENCE (đã chạy, đã đo, đã kiểm).
      Metadata ghi "Used Setup v3, NC v3" → link ngược Part-REV-Master.
```

### 4.4 SharePoint Lists

| List | Data |
|------|---------|
| LST-Job-Board | Status per job (sync Epicor) |
| LST-Gate-Tracker | Which gate each job is at |
| LST-Program-Change-Log | NC/Setup version changes |
| LST-Open-Deviation-Log | NCR/Concession per job |
| LST-Tooling-Register | Fixture/gage inventory + status |

### 4.5 Site security

```
External sharing: OFF (TUYỆT ĐỐI — Lam Research IP)
Download: Allowed (cần cho sàn sản xuất)
Sync: Restricted to managed devices only
```

---

## 5. SITE 3: HESEM-People — HR restricted

### 5.1 Libraries

| Library | Structure |
|---------|----------|
| **Employee-Records** | `Active/{EmpID}-{Name}/`, `Former/{YYYY}/`, `Contractors/{YYYY}/` |
| **HR-Operations** | `{YYYY}/{RecordType}/` (Recruitment, Payroll, Leave, Onboarding) |

### 5.2 Security

```
Access: HR group only at site level
External sharing: OFF
```

---

## 6. SITE 4: HESEM-Digital — IT + Source Control

### 6.1 Libraries

| Library | Content |
|---------|---------|
| **QMS-Source-Control-Publication** | Read-only publication copies of approved release manifests and deploy receipts. Git/control-plane records remain authoritative. |
| **System-Records** | IT governance: Access-Control, M365-Config, Epicor-Control, Backup-Recovery |

### 6.2 Sync flow (defined in WI-107)

```
Git/control plane source → release manifest → server deploy → promotion receipt → optional SharePoint read-only publication
```

---

## 7. Permission model

### 7.1 Entra ID Security Groups

| Group | Member |
|-------|-----------|
| HESEM-AllStaff | All staff |
| HESEM-Management | Head of department or higher |
| HESEM-QMS-Team | QMS Manager + QMS Engineer + QA Manager |
| HESEM-Quality | QA/QC team |
| HESEM-Engineering | Engineering dept |
| HESEM-Production | Production + operators |
| HESEM-SCM | Supply chain |
| HESEM-Sales | Sales/CS |
| HESEM-Finance | Finance |
| HESEM-HR | HR only |
| HESEM-IT | IT only |
| HESEM-EHS | EHS |
| HESEM-Job-Core | ENG + QA + PRO + SCM (job-related roles) |

### 7.2 Permission matrix

| Site | Library | Read | Edit |
|------|---------|------|------|
| HESEM-Records | Quality-Records | Management + QMS | Quality |
| HESEM-Records | QMS-Governance | Management | QMS-Team |
| HESEM-Records | Training-Records | AllStaff | QMS-Team + Dept Mgrs |
| HESEM-Records | Department-Ops | AllStaff (own department) | Own Dept Group |
| HESEM-Job-Evidence | Part-REV-Master | Job-Core | Engineering |
| HESEM-Job-Evidence | Job-Dossiers | Job-Core | Job-Core |
| HESEM-Job-Evidence | Customer-Received | Job-Core | Engineering + Sales |
| HESEM-Job-Evidence | Tooling-Fixture-Gage | Job-Core | Engineering + Production |
| HESEM-People | All | HR | HR |
| HESEM-Digital | QMS-Source-Control | QMS-Team + IT | IT |
| HESEM-Digital | System-Records | IT + QMS-Team | IT |

---

## 8. Master Data Module and Order Management

### 8.1 Master Data Control

QMS Portal includes a **Master Data Control** module that manages the underlying data on which all forms and orders depend:

| Object | Describe | Cascading relationships |
|-----------|-------|----------------------|
| **Customer** | Customer approved | Customer -> SO, Customer -> Part |
| **Supplier** | Supplier/outsourcing | Customer -> Approved Supplier |
| **Part** | Detailed code | Customer -> Part -> Revision |
| **Part Revision** | Detailed versions (REV-A, REV-B...) | Part -> Revision -> Engineering baseline |
| **Sales Order (SO)** | Sales order | Customer -> SO -> JO |
| **Job Order (JO)** | Production order | SO -> JO -> WO |
| **Work Order (WO)** | Worksheet per operation | JO -> WO (per routing operation) |

**Rule:** When the field on the form has master data managed, the form **DOES NOT allow free hand input. Must use searchable lookup from master data source.

### 8.2 Order Management (SO -> JO -> WO)

Module `Quản lý đơn hàng` on the sidebar portal manages hierarchical relationships:

```
Sales Order (SO)
  └── Job Order (JO)
        └── Work Order (WO) per operation
```

Each record contains: customer, part number, revision, quantity, due date, status, route/operation context.

Evidence forms (FRM-631 NCR, FRM-651 Final Inspection, FRM-511 Setup...) **bind** to the order record instead of entering text manually. Status changes or revisions on the order are reflected in the form context.

**SharePoint sync:** Order data is synced to `LST-Job-Board` and `LST-Gate-Tracker` on SITE 2 (HESEM-Job-Evidence) via Graph API.

---

## 9. Online forms vs Excel forms

> **Full details:** core-standards/18-online-vs-offline-form-decision-framework.md

### 9.1 Classification criteria (7 criteria, total 100 points)

| # | Criteria | Weight | → Online (+) | → Excel (−) |
|---|----------|---------|-------------|------------|
| 1 | **Frequency** | 25 | Daily/per-shift: +25 · Per-event: +20 | Monthly: −5 · Quarterly+: −15 |
| 2 | **Number of fields** | 20 | ≤15: +20 · 16-25: +10 | 26-50: −5 · >50/multi-tab: −20 |
| 3 | **Place of filling** | 15 | Production floor/at machine: +15 | Technical rooms: 0 · Meeting rooms: −5 |
| 4 | **Dashboard** | 15 | KPI live/escalation: +15 | Batch report: −5 · None: −10 |
| 5 | **Approval workflow** | 10 | Multi-step e-sig: +10 | No workflow: 0 |
| 6 | **Attachments** | 10 | On-site photo: +10 | CMM/CAM files: −5 · Multi-file: −10 |
| 7 | **Formula** | 5 | No need: +5 | Matrix/VLOOKUP: −5 |

**Rules:** Total > 60 → **ONLINE**. Total ≤ 60 → **OFFLINE (Excel)**.

### 9.2 Quick Rules (no grading required)

| ALWAYS ONLINE | ALWAYS OFFLINE |
|-------------|-------------|
| Fill ≥2 times/day or per shift | Multi-tab Excel with complex formula |
| Escalation/notification required | Reference document, do not fill in new ones |
| Data flows into the OEE/OTD dashboard | Engineering baseline (CAM/NC linkage) |
| Fill in at the machine using phone/tablet | Frequency ≤ Quarterly |

### 9.3 List of online forms (3 phases, ~25 forms)

**Phase 1 (deployed):** FRM-208, FRM-504, FRM-512

**Phase 2 (high priority):** FRM-631, FRM-641, FRM-651, FRM-701, FRM-711, FRM-715, FRM-511, FRM-521, FRM-802, FRM-913, FRM-403, FRM-601

**Phase 3 (expansion):** FRM-501, FRM-502, FRM-505, FRM-507, FRM-513, FRM-514, FRM-518, FRM-519, FRM-721, FRM-525

### 9.3b Sync mechanism

```
Online form submit → api.php:
├── Accept/finalize in portal canonical records
├── Generate PDF snapshot
├── Queue Graph publication asynchronously
└── Store publication receipt/state; SharePoint is not the evidence authority
```

### 9.4 Excel form version control

```
Download: api.php inject version stamp → filename FRM-302_Setup-Sheet_V3.2.xlsx
Upload:   Portal validates issuance/template/schema version → reject if obsolete
```

---

## 10. Storage estimates

| File type | Medium size | Volume/year | Total/year |
|-----------|----------------|-----------|-----------|
| NC program (.nc) | 50KB-2MB | 500 files | ~500MB |
| CAM source (.mcam, .f3d) | 5-50MB | 300 files | ~5GB |
| CAD model (.step) | 1-20MB | 200 files | ~2GB |
| Photos (.jpg) | 1-5MB | 2000 files | ~5GB |
| Forms + PDFs | 200KB-2MB | 3000 files | ~3GB |
| Scanned documents (.pdf) | 500KB-3MB | 1000 files | ~2GB |
| **Total/year** | | | **~18GB** |

M365 Business Basic: 1TB + 10GB/user. With 100 users = ~2TB. 18GB/year = **100+ years of storage**.

---

> **Last updated:** 2026-03-29
> **Applies:** M365 SharePoint deployment — HESEM ENGINEERING
> **Related documents:** 15-evidence-and-records-naming.md, WI-102, WI-107, ANNEX-131 to ANNEX-136, 23-form-lifecycle-and-allocation.md, record_type_expanded.json
