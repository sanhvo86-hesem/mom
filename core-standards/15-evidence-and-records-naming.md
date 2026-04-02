# 15 — Rules for naming documents, evidence and completed forms

> Naming convention is consistent for EVERY file saved to SharePoint: completed forms, produced evidence,
> engineering baseline, training records, audits, and assets.
> Complies with AS9100 §8.5.2 (traceability), ISO 9001 §7.5.3 (record control).

---

## 1. General rules (applies to EVERY file)

| # | Rules | Detail |
|---|---------|---------|
| 1 | English only | No Vietnamese accents, no Unicode other than ASCII |
| 2 | Allowed characters | `A-Z`, `a-z`, `0-9`, hyphen (`-`), underscore (`_`), dot (`.`) |
| 3 | Segment separation | Underscore (`_`) |
| 4 | Separate words in segment | Hyphen (`-`) |
| 5 | Day | `YYYYMMDD` (compact, sorted well) |
| 6 | Time | `HHMM` (24h format) |
| 7 | Maximum filename | 120 characters |
| 8 | Do not have | Spaces, brackets, special characters |

---

## 2. Six naming patterns

### PATTERN 1 — Filled Form Record

**Template:**
```
FRM-{code}_V{ver}_{scope}_{YYYYMMDD}_{HHMM}-{UserID}.{ext}
```

| Segment | Obligatory | Describe | For example |
|---------|---------|-------|-------|
| `FRM-{code}` | Always | Form code according to registry | FRM-631 |
| `V{ver}` | Always | Version blank form used | V2.1 |
| `{scope}` | Always | Scope (see Scope Code table) | JOB-2026-0042 |
| `{YYYYMMDD}` | Always | Date filled/completed | 20260327 |
| `{HHMM}-{UserID}` | Always | Hour, minute + person code | 0830-NVA |
| `.{ext}` | Always | .xlsx or .pdf (online auto) | .xlsx |

**For example:**
```
FRM-631_V2.1_NCR-2026-043_20260327_0830-NVA.xlsx        ← NCR Excel đã điền
FRM-631_V2.1_NCR-2026-043_20260327_0830-NVA.pdf         ← NCR online (auto PDF)
FRM-302_V3.2_JOB-2026-0042-OP10_20260327_0900-SET1.xlsx ← Setup Sheet per op
FRM-641_V1.0_CAPA-2026-008_20260327_1400-QA1.xlsx       ← CAPA
FRM-601_V2.0_CAL-MICR-005_20260327_0800-QC1.xlsx        ← Calibration
FRM-802_V1.1_TRN-2026-015_20260327_1330-HR1.xlsx        ← Training attendance
FRM-911_V1.0_MR-2026-Q1_20260327_0900-QMS1.xlsx         ← MR Minutes
FRM-504_V1.0_PRO-SHIFT-A_20260327_0600-SL1.pdf          ← Shift Handover (online)
```

### PATTERN 2 — Evidence attached to Job

**Template:**
```
{RecordType}_{JobNum}_{PartRev}_{YYYYMMDD}_{HHMM}-{UserID}.{ext}
```

**For example:**
```
PHOTO-SETUP_JOB-2026-0042_714XXXX-REVA-OP10_20260327_0830-SET1.jpg
CMM_JOB-2026-0042_714XXXX-REVA-OP10_20260327_0900-QC1.csv
MTR_JOB-2026-0042_714XXXX-REVA_20260327_0800-SCM1.pdf
COC_JOB-2026-0042_714XXXX-REVA_20260328_1500-QA1.pdf
TRV_JOB-2026-0042_714XXXX-REVA_20260327_1000-PRO1.pdf
PACK_JOB-2026-0042_714XXXX-REVA_20260328_1600-WH1.pdf
POD_JOB-2026-0042_714XXXX-REVA_20260330_0900-WH1.pdf
OFFSET-LOG_JOB-2026-0042_714XXXX-REVA-OP10_20260327_1100-OPR1.xlsx
TOOL-WEAR_JOB-2026-0042_714XXXX-REVA-OP10_20260327_1500-OPR1.xlsx
PROVEOUT_JOB-2026-0042_714XXXX-REVA-OP10_20260327_0845-SET1.pdf
```

### PATTERN 3 — Engineering Baseline (Part-REV-Master)

**Template:**
```
{FileType}_{PartRev}_{Operation}_{MachineFamily}_V{ver}.{ext}
```

**For example:**
```
NC_714XXXX-REVA_OP10_5AX_V3.nc
NC_714XXXX-REVA_OP20_TURN_V3.nc
CAM_714XXXX-REVA_OP10_5AX_V3.mcam
CAM_714XXXX-REVA_OP20_TURN_V3.f3d
SETUP_714XXXX-REVA_OP10_5AX_V3.xlsx
INSP_714XXXX-REVA_ALL_CMM_V2.dcc
MODEL_714XXXX-REVA_ALL_V1.step
DWG_714XXXX-REVA_ALL_V1.pdf
FIXTURE_714XXXX-REVA_OP10_5AX_V1.pdf
SIM_714XXXX-REVA_OP10_5AX_V3.mp4
CTRL-PLAN_714XXXX-REVA_ALL_V2.xlsx
FRM-306_714XXXX-REVA_ALL_V3.xlsx
FRM-307_714XXXX-REVA_ALL_V2-to-V3_20260327.xlsx
```

**Note:** Engineering baseline DOES NOT use `{HHMM}-{UserID}` because only 1 person releases at a time (with approval gate FRM-306). Using `V{ver}` is unique enough.

### PATTERN 4 — Evidence without Job attached (Training, Audit, Department)

**Template:**
```
{RecordType}_{scope}_{YYYYMMDD}_{HHMM}-{UserID}.{ext}
```

**For example:**
```
REPORT_AUD-2026-IA03_20260327_0900-QMS1.pdf
CHECKLIST_AUD-2026-IA03_20260327_0900-QMS1.xlsx
MINUTES_MR-2026-Q1_20260327_0900-QMS1.pdf
INPUT-PACK_MR-2026-Q1_20260327_0830-QMS1.pdf
CAL-CERT_CAL-MICR-005_20260327_0800-QC1.pdf
MEETING-MIN_ENG_20260327_1000-ENG1.pdf
KPI-REPORT_PRO_20260327_0900-PRO1.xlsx
OJT_EMP-0123_C10L2_20260327_1400-SET1.pdf
GATE-TEST_EMP-0123_C10L2_20260327_1500-QA1.pdf
CERT-SCAN_EMP-0123_CNC-TURN_20260327_0800-HR1.pdf
SIGNOFF_TRN-2026-015_20260327_1400-HR1.pdf
```

### PATTERN 5 — Form Blank Download (version stamped)

**Template:**
```
FRM-{code}_{Title}_V{ver}.xlsx
```

**For example:**
```
FRM-302_Setup-Sheet-and-Tool-List_V3.2.xlsx
FRM-631_NCR-Report_V2.1.xlsx
FRM-311_FAI-Report_V1.0.xlsx
```

**Distinguish between blank vs filled:**
```
BLANK:  FRM-302_Setup-Sheet-and-Tool-List_V3.2.xlsx     ← Có Title, KHÔNG có scope/HHMM
FILLED: FRM-302_V3.2_JOB-2026-0042-OP10_20260327_0900-SET1.xlsx  ← Có scope/HHMM, KHÔNG có Title
```

### PATTERN 6 — Tooling / Fixture / Gage Records

**Template:**
```
{AssetType}-{AssetID}_{DocType}_{YYYYMMDD}_{HHMM}-{UserID}.{ext}
```

**For example:**
```
FIX-001_DWG_20260327_0800-ENG1.pdf
FIX-001_PHOTO_20260327_0830-SET1.jpg
GAGE-CMM-005_CAL-CERT_20260327_0800-QC1.pdf
```

### PATTERN 7 — Server-managed Received / Resubmitted Form Copy

Applies to the offline version the system **received** or the online/offline version repackaged by the system to save internal revision traces.

**Template:**
```
FRM-{code}_V{ver}_{record_id}_{YYYYMMDD}_R{nn}.{ext}
```

| Segment | Obligatory | Describe | For example |
|---------|---------|-------|-------|
| `FRM-{code}` | Always | Form code according to registry | FRM-403 |
| `V{ver}` | Always | Version blank form is in effect when the profile is created | V1 |
| `{record_id}` | Always | Record-ID of the record instance | SCAR-2026-012 |
| `{YYYYMMDD}` | Always | Receiving/packaging system date | 20260331 |
| `R{nn}` | Always | Internal reception/resubmission times | R01 |
| `.{ext}` | Always | .xlsx, .pdf, .zip... | .xlsx |

**For example:**
```
FRM-403_V1_SCAR-2026-012_20260331_R01.xlsx
FRM-403_V1_SCAR-2026-012_20260402_R02.xlsx
FRM-631_V2.1_NCR-2026-043_20260327_R01.pdf
```

---

## 3. RecordType Code Dictionary

### 3.1 Job Dossier Evidence

| Code | Name | Describe |
|------|-----|-------|
| PO | Purchase Order | Scan customer PO |
| CR | Contract Review | Contract review results |
| MTR | Material Test Report | Mill certificate, heat certificate, CoA |
| IQC | Incoming QC Result | Input test results |
| TRV | Traveler/Router | Scan the production tracking slip |
| CMM | CMM / Measurement Data | CMM, caliper, mic measurement data |
| FAI-BALLOON | Ballooned Drawing | Balloon numbering drawing |
| COC | Certificate of Conformance | Appropriate certification |
| PACK | Packing List | Packing slip |
| SHIP-LABEL | Shipping Label / SSCC | Shipping label |
| POD | Proof of Delivery | Proof of delivery |
| CONCESSION | Deviation/Waiver | Concession approval |
| REWORK | Rework Evidence | Evidence of rework + retest |
| CUST-APPR | Customer Approval | Email/doc customer approval |
| PROVOUT | Prove-out Evidence | First test run notes |
| OFFSET-LOG | Offset Change Log | Log machine offset changes |
| TOOL-WEAR | Tool Wear Record | Record knife wear |
| DOWNTIME | Downtime Record | Record machine stop |

### 3.2 Photos

| Code | Describe |
|------|-------|
| PHOTO-SETUP | Photo of machine setup status |
| PHOTO-FAI | FAI detailed photos |
| PHOTO-FINAL | Final inspection photo |
| PHOTO-PACK | Packaging photo |
| PHOTO-NCR | Error photo |
| PHOTO-GEN | General photo |

### 3.3 Engineering Baseline

| Code | Describe |
|------|-------|
| NC | NC Program (G-code) |
| ORANGE | CAM Source File |
| MODEL | CAD Model (STEP, IGES) |
| DWG | Drawing (PDF) |
| SETUP | Setup Sheet + Tool List (FRM-302) |
| INSP | Inspection Program |
| FIXTURE | Fixture / Jig Drawing |
| SIM | Simulation Evidence |
| CTRL-PLAN | Control Plan |

### 3.4 QMS Governance

| Code | Describe |
|------|-------|
| REPORT | Audit report, analysis report |
| CHECKLIST | Audit checklist, verify list |
| MINUTES | Meeting minutes (MR, dept) |
| INPUT-PACK | MR input, audit input package |
| ACTION-LOG | Follow-up actions |
| KPI-REPORT | Dashboard export, analysis |
| RISK-REG | Risk register snapshot |
| MEETING-MIN | Department meeting minutes |

### 3.5 Training & Competence

| Code | Describe |
|------|-------|
| O.J.T | On-the-Job Training evidence |
| GATE-TEST | Competency gate test result |
| CERT-SCAN | Certificate scan (external) |
| SIGNOFF | Wet signature sign-off sheet |

### 3.6 Calibration & Assets

| Code | Describe |
|------|-------|
| CAL-CERT | Calibration certificate |
| MAINT-LOG | Maintenance log |
| SPEC | Specification sheet |

### 3.7 Suppliers

| Code | Describe |
|------|-------|
| SUP-CERT | Supplier process certificate |
| SUP-AUDIT | Supplier audit report |
| SCAR | Supplier corrective action report |
| SUP-EVAL | Supplier evaluation |

---

## 4. Scope Code Dictionary

| Scope type | Format | For example |
|-----------|--------|-------|
| Job order | `JOB-{YYYY}-{4digit}` | JOB-2026-0042 |
| Job + Operation | `JOB-{YYYY}-{4d}-OP{nn}` | JOB-2026-0042-OP10 |
| NCR | `NCR-{YYYY}-{3digit}` | NCR-2026-043 |
| CAPA | `CAPA-{YYYY}-{3digit}` | CAPA-2026-008 |
| Training events | `TRN-{YYYY}-{3digit}` | TRN-2026-015 |
| Internal Audit | `AUD-{YYYY}-IA{2digit}` | AUD-2026-IA03 |
| External Audit | `AUD-{YYYY}-EA{2digit}` | AUD-2026-EA01 |
| Mgmt Review | `MR-{YYYY}-Q{n}` | MR-2026-Q1 |
| Calibration | `CAL-{EquipCode}-{3digit}` | CAL-MICR-005 |
| Risk review | `RISK-{YYYY}-R{2digit}` | RISK-2026-R02 |
| Change request | `ECR-{YYYY}-{3digit}` | ECR-2026-012 |
| Improvement | `IMP-{YYYY}-{code}` | IMP-2026-K05 |
| Employee | `EMP-{4digit}` | EMP-0123 |
| Department | `{DeptCode}` | ENG, PRO, QA, SCM |
| System-wide | `SYS` | SYS |
| Shift | `PRO-SHIFT-{A/B/C}` | PRO-SHIFT-A |
| Part baseline | `{PartNum}-REV{X}` | 714XXXX-REVA |

---

## 5. UserID Registry

### 5.1 Rules for creating UserID

| # | Rules |
|---|---------|
| 1 | 3-4 characters abbreviation from first name-first name-middle name |
| 2 | Priority: first letter of last name + first letter of middle name + first letter of first name (NVA, TBH, LMC) |
| 3 | If duplicate: add number (NVA → NVA2) |
| 4 | Register once in SharePoint List `Employee-Registry` or Epicor Employee Master |
| 5 | NO changes when employees change rooms/positions |
| 6 | DO NOT reuse UserID after employee leaves |

### 5.2 Why use `{HHMM}-{UserID}` instead of `{seq}_{RoleCode}`

| Problem with `{seq}` | Solution `{HHMM}-{UserID}` |
|--------------------|-----------------------------|
| Many people upload at the same time → who manages the seq? | HHMM + UserID are unique, no need to coordinate |
| 2 QC inspectors with the same role code "QC" → overlap | UserID unique per person → NVA ≠ TBH |
| Must count existing files before naming | Just look at the clock + know your UserID |

### 5.3 Uniqueness guarantee

| Situation | HHMM | UserID | Result |
|-----------|------|--------|---------|
| Same person, same minute, same RecordType, same scope | Alike | Alike | **Does not happen** — 1 person does not create 2 files of the same type at the same minute |
| Different people, same minute | Alike | **Other** | Unique |
| Same person, different minutes | **Other** | Alike | Unique |

---

## 6. Record-ID — Server-assigned for formal records

### 6.1 When do you need Record-ID?

| Type | Need Record-ID? | For example ID | Who issued it? |
|------|----------------|---------|---------|
| NCR | HAVE | NCR-2026-043 | Server atomic counter |
| CAPA | HAVE | CAPA-2026-008 | Server atomic counter |
| FAI | HAVE | FAI-2026-016 | Server atomic counter |
| Training events | HAVE | TRN-2026-028 | Server atomic counter |
| Audit | HAVE | AUD-2026-IA03 | Server atomic counter |
| ECR/ECO | HAVE | ECR-2026-012 | Server atomic counter |
| Job order | YES (from Epicor) | JOB-2026-0042 | Epicor SoR |
| Photos, scans | ARE NOT | (use HHMM-UserID) | Uploader |
| CMM data | ARE NOT | (use HHMM-UserID) | Uploader |

### 6.2 Server atomic counter

```
qms-data/counters/
├── NCR-2026.txt      → "043"
├── CAPA-2026.txt     → "008"
├── FAI-2026.txt      → "016"
├── TRN-2026.txt      → "028"
├── AUD-2026.txt      → "003"
├── ECR-2026.txt      → "012"
└── IMP-2026.txt      → "005"
```

**Mechanism:** File lock (LOCK_EX) ensures only 1 process reads/writes at a time → no race condition.

---

### 6.3 eQMS Record-ID Reuse Rules

| # | Rules | Required details |
|---|---------|-------------------|
| 1 | **Draft does not generate new names/codes** | When reopening a draft, the system must continue to use the existing `record_id` and naming lineage; Do not generate a new file name/code just because the user saved the draft and then reopened it. |
| 2 | **Resubmission retains Record-ID** | Online controlled edit and offline resubmission must remain `record_id`; only increase `submission_count`, `resubmission_count` or `receipt_version`. |
| 3 | **Filled copy user-side using Pattern 1** | User-downloaded file to fill out or user-exported PDF snapshot using PATTERN 1. |
| 4 | **Server-managed received copy using Pattern 7** | The system receives and locks records using PATTERN 7 to reflect the number of internal submissions. |
| 5 | **Do not overwrite the old name** | Every resubmission must generate a new archive name; Absolutely do not overwrite the previous receipt file. |

### 6.4 Stream to get Record-ID

**Online form:** Server automatically provided when submitting → embedded in PDF filename.

**Excel form:** User goes to portal → "Ask for new profile code" → server returns code → user used in file name when saving.

---

## 7. Form version control

### 7.1 Form blank download — version stamp

When a user loads a blank form from the web portal:
- Filename MUST include `V{ver}`: `FRM-302_Setup-Sheet-and-Tool-List_V3.2.xlsx`
- Server injects metadata into hidden sheet `_QMS_CONTROL`:
  - form_code, version, checksum, downloaded_by, downloaded_at, source

### 7.2 Form filled upload — version validation

When the user uploads the completed form to SharePoint:
- SharePoint metadata column `Form-Version` must match the active version in form_control_registry
- If old version → FLAG `Version-Valid = OBSOLETE` + notify uploader
- Monthly audit: query files where Version-Valid = OBSOLETE → action required

### 7.3 Distinguishing blank vs filled from the file name

```
BLANK:  FRM-{code}_{Title}_V{ver}.xlsx                              ← Có Title
FILLED: FRM-{code}_V{ver}_{scope}_{YYYYMMDD}_{HHMM}-{UserID}.xlsx  ← Có scope + time
```

---

## 8. Validation rules (fail-fast)

| Check | Result |
|----------|---------|
| The file name contains spaces or special characters | REJECT |
| File name without date segment (YYYYMMDD) | REJECT |
| Filled form without V{ver} | REJECT |
| Filled form version ≠ current active version | FLAG OBSOLETE |
| Job evidence no JOB-{YYYY}-{nnnn} | REJECT |
| Engineering baseline does not have V{ver} | REJECT |
| File with the same name already exists (same name, same folder) | REJECT |
| File name > 120 characters | WARN |
| RecordType code not in dictionary (Section 3) | FLAG |
| Date format is wrong (not YYYYMMDD) | REJECT |
| Part number in file ≠ Part number in folder | REJECT |

---

## 9. 60-second traceability test (AS9100 compliance)

**Scenario:** Auditor asks "Show me the FAI report for job 0042, part 714XXXX rev A"

```
1. Mở HESEM-Job-Evidence → Job-Dossiers → 2026                     (5s)
2. Tìm folder JOB-2026-0042_714XXXX-REVA                           (5s)
3. Filter metadata: Gate = G4-FAI hoặc search "FRM-311"             (5s)
4. Thấy: FRM-311_V1.0_JOB-2026-0042_20260327_0900-QC1.xlsx         (ngay)
   → Biết: FAI form V1.0, ngày 27/3/2026 lúc 9:00, QC1 điền
5. Kèm: CMM_JOB-2026-0042_714XXXX-REVA-OP10_20260327_0905-QC1.csv
   → CMM data OP10, cùng ngày, cùng inspector
TỔNG: < 20 giây ✓ (yêu cầu < 60 giây)
```

**Scenario 2:** "Show me all NCRs for Lam Research in Q1 2026"
```
1. Mở HESEM-Records → Quality-Records                               (3s)
2. Filter: Record-Type = NCR, Customer = Lam-Research, Year = 2026   (5s)
3. Sort by date → thấy danh sách tất cả NCR                         (ngay)
TỔNG: < 10 giây ✓
```

---

## 10. Multiple files with 1 Record — grouping rules

An NCR can have many evidence files. All use the SAME Record-ID:

```
FRM-631_V2.1_NCR-2026-043_20260327_0830-NVA.xlsx      ← Form NCR đã điền
PHOTO-NCR_NCR-2026-043_20260327_0831-NVA.jpg           ← Ảnh lỗi #1
PHOTO-NCR_NCR-2026-043_20260327_0831-TBH.jpg           ← Ảnh lỗi #2 (người khác)
PHOTO-NCR_NCR-2026-043_20260327_0832-NVA.jpg           ← Ảnh lỗi #3
CMM_NCR-2026-043_20260327_0835-QC1.csv                 ← Dữ liệu đo

SharePoint search: "NCR-2026-043" → tìm thấy TẤT CẢ files ← traceability
```

---

> **Last updated:** 2026-03-27
> **Applies:** All files saved to SharePoint — HESEM ENGINEERING
> **Related documents:** 14-m365-sharepoint-architecture.md, evidence-naming-rule.html (Training Academy), ANNEX-131
