# 18 — Online Form vs Offline Form (Excel) Decision Framework

> Rules for classifying which forms to fill out online (web portal), which forms to fill out in Excel.
> Based on research on best practices in aerospace (AS9100D), automotive (IATF 16949), pharma (GxP/FDA 21 CFR Part 11), and precision CNC machining practices.

---

## 1. Core principles

```
ONLINE = dữ liệu chảy VÀO hệ thống ngay lập tức → dashboard, alert, workflow
OFFLINE = template chảy RA cho người dùng → điền tại bàn → upload lại khi xong
```

| # | Principles | Explanation |
|---|-----------|------------|
| 1 | **Frequency of first decision** | Fill out form ≥1 time/day → online. Form filled out ≤1 time/month → offline. |
| 2 | **Second decision complexity** | ≤20 simple fields → online. >20 fields or matrix/formula → offline. |
| 3 | **Where to fill out the third decision** | Production floor (phone/tablet) → online. Engineer desk (desktop + Excel) → offline. |
| 4 | **Each form has only 1 original** | If online → web portal is original (PDF auto-gen). If offline → Excel is the original (uploaded again). There are NO 2 sources. |
| 5 | **Excel fallback is always available** | All online forms MUST have a corresponding Excel version. When the portal crashes, the user downloads Excel → fills in → uploads later. |
| 6 | **Hybrid = antipattern** | The form cannot be both online and offline at the same time. Select only 1 channel. |

---

## 2. Decision Scoring Matrix

Each form is scored on 7 criteria. **Total > 60 → ONLINE. Total ≤ 60 → OFFLINE (Excel).**

| # | Criteria | Weight | ONLINE score (+) | OFFLINE score (−) | How to evaluate |
|---|----------|---------|-----------------|------------------|---------------|
| 1 | **Fill frequency** | 25 | Daily/per-shift: +25 · Per-event: +20 · Weekly: +15 | Monthly: −5 · Quarterly+: −15 | Frequency field in schema |
| 2 | **Number of fields + complexity** | 20 | ≤15 fields: +20 · 16-25: +10 | 26-50: −5 · >50 / multi-tab: −20 | Count fields in form template |
| 3 | **Place to fill** | 15 | Production floor / at the machine: +15 · QC department: +10 | Technical rooms: 0 · Meeting rooms: −5 | See who fills in (role) |
| 4 | **Real-time dashboard** | 15 | KPI live / escalation: +15 · Status tracking: +10 | Batch report only: −5 · No dashboard: −10 | Is the data needed immediately? |
| 5 | **Approval workflow** | 10 | Multi-step e-signature: +10 · Manager notify: +5 | No workflow: 0 · Paper sign-off: −5 | Is there an escalation gate? |
| 6 | **Attachments** | 10 | On-site photo/scan: +10 · None: +5 | CMM data file / CAM link: −5 · Multi-file package: −10 | Attachment file type |
| 7 | **Formula / Calculation** | 5 | No need: +5 · Simple addition/counting: +3 | Conditional logic: −3 · Matrix / VLOOKUP: −5 | Formula in template |

### Scoring example

**FRM-512 (Downtime Log):**

| Criteria | Score | Reason |
|----------|------|-------|
| Frequency | +20 | Per-event (every time the machine stops) |
| Complexity | +20 | 14 fields, all dropdown/text |
| Place to fill | +15 | Operator at CNC machine, phone |
| Dashboard | +15 | Real-time OTD impact, OEE tracking |
| Workflow | +5 | Auto-notify maintenance + manager |
| Attachments | +10 | Photo error on site |
| Formula | +5 | No need |
| **TOTAL** | **90** | **→ ONLINE** ✓ |

**FRM-302 (Setup Sheet & Tool List):**

| Criteria | Score | Reason |
|----------|------|-------|
| Frequency | −5 | Per-job (~2-3/week, not urgent) |
| Complexity | −20 | 40+ fields, tool matrix, conditional |
| Place to fill | 0 | Engineering office, desktop |
| Dashboard | −10 | Pre-planning, no live tracking |
| Workflow | 0 | Engineering sign-off, pre-run |
| Attachments | −10 | Links to NC/CAM/Model files |
| Formula | −5 | VLOOKUP tool database, IF conditions |
| **TOTAL** | **−50** | **→ OFFLINE (Excel)** ✓ |

---

## 3. Quick Rules — No grading required

Clear cases, no need to go through scoring matrix:

### 3.1 ALWAYS ONLINE (no rating needed)

| Conditions | Form example |
|-----------|-----------|
| Fill out ≥2 times/day or per shift | FRM-504 (shift handover), FRM-208 (tier meeting) |
| Escalation/notification required | FRM-631 (NCR → notify manager), FRM-721 (complaint) |
| Data flows into the OEE/OTD dashboard | FRM-512 (downtime), FRM-505 (utilization) |
| Fill in at the machine using phone/tablet | FRM-511 (first-piece), FRM-521 (PM checklist) |

### 3.2 ALWAYS OFFLINE (no rating needed)

| Conditions | Form example |
|-----------|-----------|
| Multi-tab Excel with complex formula | FRM-131 (Risk register), FRM-132 (PFMEA) |
| Reference document (do not fill in new) | FRM-101 (document register), FRM-122 (interested parties) |
| Engineering baseline (CAM/NC linkage) | FRM-302 (setup sheet), FRM-306 (eng release) |
| Frequency ≤ Quarterly | FRM-911 (MR minutes), FRM-121 (SWOT) |
| Financial / costing data | FRM-301 (costing), FRM-111 (access review) |

### 3.3 NEED FOR EVALUATION (using scoring matrix)

| Conditions |
|-----------|
| Weekly filling form (center) |
| Form has 15-25 fields |
| Form filled out at office but requires workflow |
| Newly created form, no usage history |

---

## 3.4 Registry extended record types (42 record types)

The HESEM system currently manages **42 record types** (expanded from the original 11), defined at:

- **SSOT:** `01-QMS-Portal/qms-data/config/record_type_expanded.json`
- **Origin:** `qms-data/counters/_registry.json` + `qms-data/config/document_type_registry.json`

| Group | For example record types | Quantity |
|------|-------------------|---------|
| Quality | NCR, CAPA, FAI, SCAR, DEV, CON, ESC, MRB | 8 |
| Production | JO, WO, DTL, SHR, SPR, TWL, SCH | 7 |
| Engineering | ECR, ECO, BLN, DFM, PRV | 5 |
| HR / Training | TRN, OJT, CRT, SKL | 4 |
| Admin / Governance | DCR, MRV, AUD, RMA, IMP | 5 |
| Logistics | SHP, RCV, PKG, EXP | 4 |
| Finance | INV, CST, PO | 3 |
| Maintenance | CAL, PMO, MWO | 3 |
| Other | EHS, CCC, NPI | 3 |

When creating a new form, **MUST** check the corresponding record type in the extended registry to determine:
- `format_pattern` (profile model)
- `department_owner` (owner department)
- `linked_form` (link form)
- `category` (classification group for scoring matrix)

---

## 4. Classify the entire HESEM form

### 4.1 ONLINE — Phase 1 (deployed)

| Form | Name | Category | Frequency | Score |
|------|-----|----------|-----------|-------|
| FRM-208 | Daily Tier Meeting Report | production | daily | 80 |
| FRM-504 | Shift Handover Log | production | per_shift | 78 |
| FRM-512 | Machine Downtime Log | production | per_event | 90 |

### 4.2 ONLINE — Phase 2 (high priority, continue migrating)

| Form | Name | Category | Frequency | Score | Reason |
|------|-----|----------|-----------|-------|-------|
| FRM-631 | NCR Report | quality | per_event | 82 | Escalation gates, audit trail, KPI |
| FRM-641 | CAPA Request | quality | per_event | 78 | Approval workflow, corrective action tracking |
| FRM-651 | Final Inspection Release | quality | per_event | 75 | Quick pass/fail, mobile QC |
| FRM-701 | Receiving Inspection Log | quality | per_event | 72 | IQC at warehouse, mobile scan |
| FRM-711 | Packing & Shipping Checklist | logistics | per_event | 70 | Ship release gate, real-time |
| FRM-715 | Certificate of Conformance | quality | per_event | 68 | Lot completion, approval |
| FRM-511 | Setup & First-Piece Record | production | per_event | 76 | Quick checklist, camera prove-out |
| FRM-521 | PM Checklist | maintenance | per_event | 74 | Mobile inspection, maintenance history |
| FRM-802 | Training Attendance | hr | per_event | 72 | Real-time roll calls, compliance |
| FRM-913 | Audit Finding Report | quality | per_event | 70 | Finding workflow, CAPA link |
| FRM-403 | SCAR Report | logistics | per_event | 68 | Supplier corrective action workflow |
| FRM-601 | Calibration Record | quality | periodic | 65 | Equipment tracking, certificate |

### 4.3 ONLINE — Phase 3 (further expansion)

| Form | Name | Category | Frequency | Score |
|------|-----|----------|-----------|-------|
| FRM-501 | Planning Release Checklist | production | daily | 72 |
| FRM-502 | Daily Dispatch List | production | daily | 70 |
| FRM-505 | Machine Utilization Log | production | per_shift | 75 |
| FRM-507 | Job Progress Snapshot | production | per_event | 68 |
| FRM-513 | Tool Life & Wear Log | production | per_event | 70 |
| FRM-514 | SMED Quick Changeover | production | per_event | 66 |
| FRM-518 | Work Transfer Validation | production | per_event | 64 |
| FRM-519 | Job Packet Quick Check | production | per_event | 66 |
| FRM-721 | Customer Complaint Entry | quality | per_event | 72 |
| FRM-525 | Gage Equipment Check | quality | periodic | 62 |

### 4.4 OFFLINE (Excel) — Keep as is

| Group | Forms | Main reason |
|------|-------|------------|
| Engineering baseline | FRM-302, 303, 304, 305, 306, 307 | Complex matrix, CAM links, multi-tab |
| Risk & compliance | FRM-131, 132, 133 | Scoring matrix, PFMEA tables, multi-tab |
| Costing & planning | FRM-201, 202, 203, 204, 205, 206, 207, 209 | Financial formulas, multi-section |
| Customer/Supplier admin | FRM-211, 212, 213, 221 | Detailed analysis, batch |
| QMS governance | FRM-101, 102, 104, 105, 106 | Reference, periodic review |
| Strategic | FRM-110, 111, 121, 122, 123, 124, 125 | Annual/quarterly, SWOT/PESTLE |
| Change management | FRM-141, 151, 161 | Office-based, detailed specs |
| Management review | FRM-911 | Quarterly, detailed agenda |
| FAI (AS9102) | FRM-311 | CMM data, complex measurement tables |

---

## 5. World best practices

### 5.1 Aerospace (AS9100D / Nadcap)

| Rules | Apply |
|---------|---------|
| **"If it affects flight safety → electronic approval chain"** | NCR, CAPA, deviation, concession → ONLINE with e-signature |
| **"First Article = complete data package"** | Complex FAI report → OFFLINE Excel (AS9102 template) |
| **"Configuration baseline must be version-controlled"** | Engineering release → OFFLINE Excel + formal release workflow |
| **Real-time production status** | Shift logs, downtime → ONLINE with dashboard |

### 5.2 Automotive (IATF 16949)

| Rules | Apply |
|---------|---------|
| **"Layered Process Audit = quick checklist"** | Audit checklist → ONLINE (mobile, per-shift) |
| **"PFMEA/Control Plan = cross-functional document"** | PFMEA, Control Plan → OFFLINE Excel (multi-discipline editing) |
| **"Customer complaint = 24h response"** | Complaint log → ONLINE (escalation timer) |

### 5.3 Pharma (GxP / FDA 21 CFR Part 11)

| Rules | Apply |
|---------|---------|
| **"Electronic records must have audit trail"** | All manufacturing records → ONLINE with timestamp + user ID |
| **"Batch record = single source of truth"** | Batch forms → ONLINE (no Excel copies floating) |
| **"Deviation = immediate escalation"** | Deviation report → ONLINE (within 24h) |

### 5.4 CNC Job Shop (HESEM context)

| Rules | Apply |
|---------|---------|
| **"Operator at machine = phone/tablet"** | Downtime, setup check, tool change → ONLINE |
| **"Engineer at workstation = full Excel"** | Setup sheet, tool list, NC release → OFFLINE |
| **"Quality gate = immediate decision"** | First-piece, final inspection, NCR → ONLINE |
| **"Planning = before production run"** | Costing, DFM, job planning → OFFLINE |

---

## 6. When to change the form from OFFLINE → ONLINE

### 6.1 Checklist before migrating

- [ ] Has the form passed the scoring matrix? Score > 60?
- [ ] Designed form schema (fields, validation, defaults)?
- [ ] SharePoint List defined structure (metadata column)?
- [ ] PDF template created (auto-gen from data)?
- [ ] Mobile responsive tested (phone simulator)?
- [ ] Excel fallback still works (download → fill → upload)?
- [ ] Pilot test 5 users, 2 weeks, measure adoption rate?
- [ ] Training session scheduled?
- [ ] Rollback plan if adoption < 80%?

### 6.2 Go-live criteria

| Metrics | Target | Rollback if |
|--------|--------|-------------|
| Adoption rate | ≥80% online vs offline | <60% after 2 weeks of pilot |
| Time-to-complete | ≤ 150% Excel time | >200% (form too complicated for web) |
| Data quality | ≤5% missing required fields | >10% missing → schema needs fixing |
| User satisfaction | ≥7/10 surveys | <5/10 → UX needs redesign |

---

## 7. Form schema checklist for Online forms

When creating a new form schema (`qms-data/online-forms/schemas/FRM-XXX.json`):

```json
{
  "form_code": "FRM-XXX",
  "title": "Title in English",
  "title_vi": "Tên tiếng Việt",
  "version": "1.0",
  "category": "production|quality|maintenance|hr|logistics|safety",
  "frequency": "daily|per_shift|per_event|weekly|monthly|periodic",
  "online": true,
  "sop_ref": "SOP-XXX",
  "description": "Mô tả ngắn",
  "decision_score": 75,
  "decision_rationale": "High frequency, simple fields, shop floor usage",
  "fields": [...]
}
```

**Required for online forms:**
- `online: true` (or `false` for Excel-only)
- `decision_score` — score from scoring matrix
- `decision_rationale` — brief reason
- `frequency` — must be exact
- `category` — 1 of 6 FORM_COLORS groups

---

> **Last updated:** 2026-03-29
> **Apply:** Any decision to create a new form or migrate a form from offline → online
> **Related documents:** 14-m365-sharepoint-architecture.md (§8), 15-evidence-and-records-naming.md, WI-101, ANNEX-137, record_type_expanded.json (42 record types)
