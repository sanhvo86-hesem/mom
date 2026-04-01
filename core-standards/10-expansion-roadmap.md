# 10 — QMS system expansion roadmap

> Version: V0 | Effective: 2025-06-01 | Owner: QMS Engineer

---

## 1. Purpose

- Specifies how to expand the QMS documentation system as HESEM develops.
- Ensure any new documents comply with current structure, numbering and rules.
- Prevent code conflicts, duplicate content and loss of consistency.

---

## 2. Backup slot for SOP

### 2.1 Current number range (used)

| Strip | Scope | Current quantity |
|-----|---------|------------------|
| SOP-100 | Foundation & Document Control | 8 SOPs (101-108) |
| SOP-200 | Sales & Customers | 3 SOPs (201-203) |
| SOP-300 | Engineering | 3 SOPs (301-303) |
| SOP-400 | Supply Chain | 2 SOPs (401-402) |
| SOP-500 | Production | 5 SOPs (501-505) |
| SOP-600 | Quality & Inspection | 6 SOPs (601-606) |
| SOP-700 | Warehouse & Packaging | 3 SOPs (701-703) |
| SOP-800 | HR, Training, Finance & EHS | 4 SOPs (801-804) |
| SOP-900 | Audit & Improvement | 3 SOPs (901-903) |

### 2.2 Spare slots in the current range

Each strip has spare slots from the last number + 1 to x99. For example:
- SOP-109 to SOP-199: reserve for Foundation.
- SOP-204 to SOP-299: provision for Sales & Customer.
- Similar for other strips.

### 2.3 Backup range for new fields (SOP-1000+)

| Strip | Expected field | When needed |
|-----|-----------------|------------|
| SOP-1000 | Automation & Robotics | When HESEM deploys robots or line automation |
| SOP-1100 | R&D & New Product Introduction | When having your own R&D department |
| SOP-1200 | Environmental Management (ISO 14001) | When implementing ISO 14001 |
| SOP-1300 | Information Security (ISO 27001) | When implementing ISO 27001 |
| SOP-1400 | Energy Management (ISO 50001) | When implementing ISO 50001 |
| SOP-1500 | Lean & Six Sigma Program | When there is an official Lean/6S program |

### 2.4 Procedure for adding new SOP

1. Determine which range the SOP belongs to (current or new).
2. Get the next number in the range (check FRM-101 Master Document Register).
3. Prepare SOP according to a 10-section structure (see 08-document-types.md).
4. Submit DCR (FRM-102) for approval.
5. Update FRM-101 and cross-reference table of related SOPs.

---

## 3. Backup slot for WI

### 3.1 Current number range

| Strip | Scope | Example |
|-----|---------|-------|
| WI-100 | Foundation | WI-102 |
| WI-200 | Sales & Customers | WI-201, WI-203, WI-206, WI-207 |
| WI-500 | Production | WI-501, WI-511-WI-519 |
| WI-600 | Quality | WI-602, WI-605, WI-606 |
| WI-700 | Warehouse & Packaging | WI-701, WI-702, WI-713-WI-721 |
| WI-900 | Improvements | WI-901 |

### 3.2 Backup range (WI-1000+)

| Strip | Expected field |
|-----|-----------------|
| WI-1000 | Automation & Robotics |
| WI-1100 | R&D work instructions |
| WI-1200 | Environmental procedures |
| WI-1300 | IT Security procedures |

### 3.3 Procedure for adding new WI

1. Determine which range WI belongs to.
2. Get the next number (check FRM-101).
3. Prepare WI according to the 7 section structure.
4. Submit DCR, approve, release.
5. Update the parent SOP (Section 10) to link the new WI.

---

## 4. Backup Slot for FRM (Form)

### 4.1 Current number range: FRM-100 to FRM-999

111 forms defined. Backup slots in each band:
- FRM-142 to FRM-199: Foundation.
- FRM-214 to FRM-299: Sales & Customer.
- Similar for other strips.

### 4.2 Redundant range (FRM-1000+)

| Strip | Field |
|-----|---------|
| FRM-1000 | Automation & Robotics |
| FRM-1100 | R&D |
| FRM-1200 | Environmental |
| FRM-1300 | IT Security |

### 4.3 Procedure for adding new form

1. Determine which TYPE the form belongs to (A-F) and which number range.
2. Get the next number.
3. Design the form according to 06-excel-form-standards.md standards.
4. Create 3 required sheets: MASTER-TEMPLATE, EXAMPLE, LISTS.
5. Submit DCR, approve.
6. Save the file to the `04-Bieu-Mau/XX-FRM-X00/` folder.
7. Update relevant SOP/WI (Section 10 / Section 7).

---

## 5. Expand Competency Module (C20+)

### 5.1 Present: C01 to C19

| Strip | Scope |
|-----|---------|
| C01-C05 | Foundation & QMS awareness |
| C06-C10 | Production & machining |
| C11-C15 | Quality & inspection |
| C16-C19 | Support functions (HR, EHS, IT) |

### 5.2 Backup (C20+)

| Strip | Expected field |
|-----|-----------------|
| C20-C24 | Advanced machining (5-axis, mill-turn, micro-machining) |
| C25-C29 | Automation & robotics operations |
| C30-C34 | Leadership & management skills |
| C35-C39 | Lean / Six Sigma certification |
| C40-C44 | Semiconductor-specific skills |
| C45-C49 | IT & digital skills |

### 5.3 Procedure for adding new training modules

1. HR Manager + Line Manager identify new capacity needs.
2. Prepare the module according to the 6-section structure (see 08-document-types.md).
3. Take the next C number.
4. Submit DCR, approve.
5. Update FRM-807 Skills Matrix and FRM-809 Skills & KPI Matrix.
6. Implement training and record it on FRM-802 Attendance List.

---

## 6. Expanding new departments

### 6.1 When do you need more departments?

- HESEM established new departments (eg: R&D, Automation).
- The current department is divided into 2 separate departments.
- Merger or organizational restructuring.

### 6.2 List of documents to create for new department

| STT | Documents | Type | Required |
|-----|---------|------|---------|
| 1 | Department Handbook | Handbook | MUST |
| 2 | JD for each position | JD | MUST |
| 3 | SOP for main process | SOP | MUST (min 1) |
| 4 | WI for specific operations | WI | SHOULD |
| 5 | Form for department records | FRM | SHOULD |
| 6 | Training module for specific competencies | Training | SHOULD |

### 6.3 Procedure for adding departments

1. CEO approves the establishment of new departments.
2. HR Manager + QMS Engineer determine the required document structure.
3. Create Department Handbook with 6 section structure.
4. Create a JD for deployment according to a 6-section structure.
5. Determine which SOPs the department owns and which SOPs are only involved.
6. Update ANNEX-120 Authority Matrix, ANNEX-122 KPI Cascade, ANNEX-123 Deputy Backup Matrix.
7. Update org chart on QMS site.
8. Deploy training for new department personnel.

---

## 7. Expand ANNEX series

### 7.1 Current number range

| Strip | Scope |
|-----|---------|
| ANNEX-100 | Foundation, digital control, authority, M365 |
| ANNEX-300 | Engineering reference |
| ANNEX-400 | Supply chain reference |
| ANNEX-500 | Production reference |
| ANNEX-600 | Quality reference |
| ANNEX-700 | Warehouse & packaging reference |
| ANNEX-800 | HR, training reference |

### 7.2 Them ANNEX new

1. Determine which range ANNEX belongs to.
2. Get the next number in the dai.
3. Prepare in rule-pack format (see 08-document-types.md).
4. MUST have iso-map, sections, tables.
5. Submit DCR, approve.
6. Update relevant SOP/WI.

### 7.3 Backup strip

| Strip | Field |
|-----|---------|
| ANNEX-900 | Audit & improvement reference |
| ANNEX-1000 | Automation reference |
| ANNEX-1100 | R&D reference |
| ANNEX-1200 | Environmental reference |

---

## 8. QMS Portal — Digitalization platform (qms.hesem.com.vn)

### 8.1 Current Status (2026-03-29)

| Category | Description | Status |
|----------|-------|-----------|
| **PostgreSQL schema** | 103 tables, 80+ enum types, pgvector, partitioned audit/inventory/labor | COMPLETE |
| **MVC API** | Router, 9 domain controllers, middleware stack, service layer, validators | COMPLETE |
| **Form Engine** | 6 services: FormEngine, WorkflowEngine, RecordIdGenerator, AuditTrail, AttachmentService, ESignatureService | COMPLETE |
| **KPI / SPC** | KpiEngine (OEE, OTD, DPMO, COPQ, FPY, Scrap, OQL), SpcEngine (control charts, Cpk/Ppk, run rules) | COMPLETE |
| **PWA / Offline** | Service Worker, IndexedDB sync queue, conflict resolution, barcode scanner, mobile layouts | COMPLETE |
| **Form Hub** | 4-tab redesign: Form Control, Evidence Fill/Download, Record ID Assistant, Allocation Tracker | COMPLETE |
| **Master Data** | Reference module for customer, supplier, part, revision, SO, JO, WO | COMPLETE |
| **E-Signature** | Reusable components: identity-bound, re-auth, audit trail, meaning capture | COMPLETE |
| **Record Types** | Expanded from 11 to 42 record types (record_type_expanded.json) | COMPLETE |
| **Intelligence Layer** | Semantic search, auto-fill, anomaly detection, RCA assistant | NOT STARTED |
| **Production Integration** | Phases A-H: master data, schema-driven forms, form builder, record ID, offline packages, e-signature flow, order management, documentation update | NEXT |

### 8.2 Manufacturing Integration Roadmap (Phases A-H)

| Phase | Content | Depends |
|-------|---------|-----------|
| A | Master Data Control: customer, supplier, part, revision, SO/JO/WO | Platform |
| B | FRM-631 NCR moves from demo to production schema-driven | Phase A |
| C | Form Builder / Form Version Control module | Phase B |
| D | Record ID Assistant is separate from the full release log | Phase A |
| E | Offline form package: hidden metadata, upload verification, receipt lifecycle | Phase D |
| F | Production e-signature approval flow with audit trail | Phase B |
| G | Order Management (SO -> JO -> WO) integrates form context | Phase A |
| H | Update control documents: core standards, WI, ANNEX | Phases A-G |

---

## 9. System integration roadmap (Epicor / M365 / Power BI)

### 9.1 Epicor ERP

| Phase | Content | Expected time |
|-----------|---------|-------------------|
| Current | Import data, export report | Deployment skin |
| Phase 1 | Report Job/WO from Epicor into QMS form | Q3 2025 |
| Phase 2 | Create Job Dossier from Epicor data | Q4 2025 |
| Phase 3 | Dashboard KPI read directly from Epicor | Q1 2026 |
| Phase 4 | Epicor-M365 integration approval workflow | Q2 2026 |

### 9.2 Microsoft 365

| Phase | Content | Expected time |
|-----------|---------|-------------------|
| Current | SharePoint document storage, Teams information | Deployment skin |
| Phase 1 | Power Automate for DCR workflows | Q3 2025 |
| Phase 2 | SharePoint lists replace some FRM logs | Q4 2025 |
| Phase 3 | Teams integration: updates when documents change | Q1 2026 |
| Phase 4 | Retention labels custom on SharePoint | Q2 2026 |

### 9.3 Power BI

| Phase | Content | Expected time |
|-----------|---------|-------------------|
| Current | Dashboard collected, updated weekly | Deployment skin |
| Phase 1 | Dashboard verbs Epicor data | Q3 2025 |
| Phase 2 | Dashboard QMS KPI (NCR, CAPA, OTD, FPY) | Q4 2025 |
| Phase 3 | Dashboard with face-to-face information | Q1 2026 |
| Phase 4 | Embedded dashboard in QMS site | Q2 2026 |

---

## 10. Roadmap for converting V0 to V1

### 10.1 Current status

- Complete QMS documentation is in V0 (first release).
- Structure, content, and format are standardized.
- There is no official signature on the printed board.

### 10.2 Conversion conditions V0 -> V1.0

| # | Conditions | Status |
|---|----------|-----------|
| 1 | Complete SOP has been cross-reviewed | Sour |
| 2 | FRM-101 Master Document Register day du | Sour |
| 3 | FRM-102 DCR is available for every SOP | Sour |
| 4 | QA Manager has signed and approved | Sour |
| 5 | How to create a complete QMS | Sour |
| 6 | Internal audit spreads across the country | Sour |
| 7 | Management review lan dau thanh hoa | Sour |

### 10.3 Conversion instructions

| Giai doan | Content | Time |
|-----------|---------|-----------|
| 1. Compassion | Complete cross-review of entire SOP/WI | 4 weeks |
| 2. Approval | QA Manager + CEO signs approval | 2 weeks |
| 3. Knife | How to create a QMS for factory management | 2 weeks |
| 4. Release V1.0 | Updated version, officially released | 1 week |
| 5. Internal Audit | Carry out internal audit at the beginning | 2 weeks |
| 6. Management Review | Hop to consider spreading the knife | 1 week |
| 7. Certification audit | Signing up for a general audit of ISO 9001 | According to the code |

### 10.4 Rules of transfer

- DO NOT convert V0 -> V1.0 from document release. DONG LOAT transfer of the entire system.
- All documents MUST have a DCR and approval signature before transferring to V1.0.
- After converting to V1.0, any further changes follow the DCR maintenance process.
- Update V0 on SharePoint Archive as archive.

---

## 11. General extension principle

| # | Principle | Description |
|---|-----------|-------|
| 1 | Check numbering first | Check FRM-101 before assigning any new code |
| 2 | Check scope first | Check the current SOP scope before creating a new SOP |
| 3 | Preserve structure | All new documents MUST follow the standard structure (`08-document-types.md`) |
| 4 | Design Tuan | All new forms MUST follow the standards (06-excel-form-standards.md) |
| 5 | Tuan Thu is delicious | All content MUST follow Vietnamese guidelines (07-content-writing-sendide.md) |
| 6 | Cross-reference | All new documents MUST be linked to related documents
| 7 | Training | Any new material MUST have an accompanying training plan |
| 8 | DCR | All new documents MUST have an approved DCR |
| 9 | Backward compatible | New documents must NOT create old document links
| 10 | Learn English | Keep all English articles according to a standard list (see reference/abbreviations-keep-english.md) |
