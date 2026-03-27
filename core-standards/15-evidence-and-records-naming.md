# 15 — Quy tắc đặt tên hồ sơ, evidence và form đã điền

> Naming convention thống nhất cho MỌI file lưu lên SharePoint: form đã điền, evidence sản xuất,
> engineering baseline, hồ sơ đào tạo, audit, và tài sản.
> Tuân thủ AS9100 §8.5.2 (traceability), ISO 9001 §7.5.3 (record control).

---

## 1. Quy tắc chung (áp dụng MỌI file)

| # | Quy tắc | Chi tiết |
|---|---------|---------|
| 1 | English only | Không dấu tiếng Việt, không Unicode ngoài ASCII |
| 2 | Ký tự cho phép | `A-Z`, `a-z`, `0-9`, hyphen (`-`), underscore (`_`), dot (`.`) |
| 3 | Phân cách segment | Underscore (`_`) |
| 4 | Phân cách từ trong segment | Hyphen (`-`) |
| 5 | Ngày | `YYYYMMDD` (compact, sort tốt) |
| 6 | Thời gian | `HHMM` (24h format) |
| 7 | Tên file tối đa | 120 ký tự |
| 8 | KHÔNG có | Dấu cách, dấu ngoặc, ký tự đặc biệt |

---

## 2. Sáu naming patterns

### PATTERN 1 — Form đã điền (Filled Form Record)

**Template:**
```
FRM-{code}_V{ver}_{scope}_{YYYYMMDD}_{HHMM}-{UserID}.{ext}
```

| Segment | Bắt buộc | Mô tả | Ví dụ |
|---------|---------|-------|-------|
| `FRM-{code}` | Luôn | Mã form theo registry | FRM-631 |
| `V{ver}` | Luôn | Version form blank đã dùng | V2.1 |
| `{scope}` | Luôn | Phạm vi (xem bảng Scope Code) | JOB-2026-0042 |
| `{YYYYMMDD}` | Luôn | Ngày điền/hoàn thành | 20260327 |
| `{HHMM}-{UserID}` | Luôn | Giờ phút + mã người điền | 0830-NVA |
| `.{ext}` | Luôn | .xlsx hoặc .pdf (online auto) | .xlsx |

**Ví dụ:**
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

### PATTERN 2 — Evidence gắn Job

**Template:**
```
{RecordType}_{JobNum}_{PartRev}_{YYYYMMDD}_{HHMM}-{UserID}.{ext}
```

**Ví dụ:**
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

**Ví dụ:**
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

**Lưu ý:** Engineering baseline KHÔNG dùng `{HHMM}-{UserID}` vì chỉ 1 người release tại 1 thời điểm (có approval gate FRM-306). Dùng `V{ver}` là đủ unique.

### PATTERN 4 — Evidence không gắn Job (Training, Audit, Department)

**Template:**
```
{RecordType}_{scope}_{YYYYMMDD}_{HHMM}-{UserID}.{ext}
```

**Ví dụ:**
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

**Ví dụ:**
```
FRM-302_Setup-Sheet-and-Tool-List_V3.2.xlsx
FRM-631_NCR-Report_V2.1.xlsx
FRM-311_FAI-Report_V1.0.xlsx
```

**Phân biệt blank vs filled:**
```
BLANK:  FRM-302_Setup-Sheet-and-Tool-List_V3.2.xlsx     ← Có Title, KHÔNG có scope/HHMM
FILLED: FRM-302_V3.2_JOB-2026-0042-OP10_20260327_0900-SET1.xlsx  ← Có scope/HHMM, KHÔNG có Title
```

### PATTERN 6 — Tooling / Fixture / Gage Records

**Template:**
```
{AssetType}-{AssetID}_{DocType}_{YYYYMMDD}_{HHMM}-{UserID}.{ext}
```

**Ví dụ:**
```
FIX-001_DWG_20260327_0800-ENG1.pdf
FIX-001_PHOTO_20260327_0830-SET1.jpg
GAGE-CMM-005_CAL-CERT_20260327_0800-QC1.pdf
```

---

## 3. RecordType Code Dictionary

### 3.1 Job Dossier Evidence

| Code | Tên | Mô tả |
|------|-----|-------|
| PO | Purchase Order | Scan PO khách hàng |
| CR | Contract Review | Kết quả xem xét hợp đồng |
| MTR | Material Test Report | Mill cert, heat cert, CoA |
| IQC | Incoming QC Result | Kết quả kiểm tra đầu vào |
| TRV | Traveler / Router | Scan phiếu theo dõi sản xuất |
| CMM | CMM / Measurement Data | Dữ liệu đo CMM, caliper, mic |
| FAI-BALLOON | Ballooned Drawing | Bản vẽ đánh số balloon |
| COC | Certificate of Conformance | Chứng nhận phù hợp |
| PACK | Packing List | Phiếu đóng gói |
| SHIP-LABEL | Shipping Label / SSCC | Nhãn vận chuyển |
| POD | Proof of Delivery | Bằng chứng giao hàng |
| CONCESSION | Deviation / Waiver | Phê duyệt nhượng bộ |
| REWORK | Rework Evidence | Bằng chứng làm lại + tái kiểm |
| CUST-APPR | Customer Approval | Email/doc khách hàng phê duyệt |
| PROVEOUT | Prove-out Evidence | Ghi chú chạy thử đầu tiên |
| OFFSET-LOG | Offset Change Log | Log thay đổi offset máy |
| TOOL-WEAR | Tool Wear Record | Ghi nhận mòn dao |
| DOWNTIME | Downtime Record | Ghi nhận dừng máy |

### 3.2 Photos

| Code | Mô tả |
|------|-------|
| PHOTO-SETUP | Ảnh trạng thái setup máy |
| PHOTO-FAI | Ảnh chi tiết FAI |
| PHOTO-FINAL | Ảnh kiểm tra cuối |
| PHOTO-PACK | Ảnh đóng gói |
| PHOTO-NCR | Ảnh lỗi |
| PHOTO-GEN | Ảnh chung |

### 3.3 Engineering Baseline

| Code | Mô tả |
|------|-------|
| NC | NC Program (G-code) |
| CAM | CAM Source File |
| MODEL | CAD Model (STEP, IGES) |
| DWG | Drawing (PDF) |
| SETUP | Setup Sheet + Tool List (FRM-302) |
| INSP | Inspection Program |
| FIXTURE | Fixture / Jig Drawing |
| SIM | Simulation Evidence |
| CTRL-PLAN | Control Plan |

### 3.4 QMS Governance

| Code | Mô tả |
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

| Code | Mô tả |
|------|-------|
| OJT | On-the-Job Training evidence |
| GATE-TEST | Competency gate test result |
| CERT-SCAN | Certificate scan (external) |
| SIGNOFF | Wet signature sign-off sheet |

### 3.6 Calibration & Assets

| Code | Mô tả |
|------|-------|
| CAL-CERT | Calibration certificate |
| MAINT-LOG | Maintenance log |
| SPEC | Specification sheet |

### 3.7 Supplier

| Code | Mô tả |
|------|-------|
| SUP-CERT | Supplier process certificate |
| SUP-AUDIT | Supplier audit report |
| SCAR | Supplier corrective action report |
| SUP-EVAL | Supplier evaluation |

---

## 4. Scope Code Dictionary

| Scope type | Format | Ví dụ |
|-----------|--------|-------|
| Job order | `JOB-{YYYY}-{4digit}` | JOB-2026-0042 |
| Job + Operation | `JOB-{YYYY}-{4d}-OP{nn}` | JOB-2026-0042-OP10 |
| NCR | `NCR-{YYYY}-{3digit}` | NCR-2026-043 |
| CAPA | `CAPA-{YYYY}-{3digit}` | CAPA-2026-008 |
| Training event | `TRN-{YYYY}-{3digit}` | TRN-2026-015 |
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

### 5.1 Quy tắc tạo UserID

| # | Quy tắc |
|---|---------|
| 1 | 3-4 ký tự viết tắt từ họ-tên đệm-tên |
| 2 | Ưu tiên: chữ đầu họ + chữ đầu tên đệm + chữ đầu tên (NVA, TBH, LMC) |
| 3 | Nếu trùng: thêm số (NVA → NVA2) |
| 4 | Đăng ký 1 lần trong SharePoint List `Employee-Registry` hoặc Epicor Employee Master |
| 5 | KHÔNG thay đổi khi nhân viên đổi phòng/chức vụ |
| 6 | KHÔNG tái sử dụng UserID sau khi nhân viên nghỉ việc |

### 5.2 Tại sao dùng `{HHMM}-{UserID}` thay vì `{seq}_{RoleCode}`

| Vấn đề với `{seq}` | Giải pháp `{HHMM}-{UserID}` |
|--------------------|-----------------------------|
| Nhiều người upload cùng lúc → ai quản seq? | HHMM + UserID tự unique, không cần phối hợp |
| 2 QC inspector cùng role code "QC" → trùng | UserID unique per person → NVA ≠ TBH |
| Phải đếm file hiện có trước khi đặt tên | Chỉ cần nhìn đồng hồ + biết UserID mình |

### 5.3 Uniqueness guarantee

| Tình huống | HHMM | UserID | Kết quả |
|-----------|------|--------|---------|
| Cùng người, cùng phút, cùng RecordType, cùng scope | Giống | Giống | **Không xảy ra** — 1 người không tạo 2 file cùng loại cùng phút |
| Khác người, cùng phút | Giống | **Khác** | Unique |
| Cùng người, khác phút | **Khác** | Giống | Unique |

---

## 6. Record-ID — Server-assigned cho formal records

### 6.1 Khi nào cần Record-ID

| Loại | Cần Record-ID? | Ví dụ ID | Ai cấp? |
|------|----------------|---------|---------|
| NCR | CÓ | NCR-2026-043 | Server atomic counter |
| CAPA | CÓ | CAPA-2026-008 | Server atomic counter |
| FAI | CÓ | FAI-2026-016 | Server atomic counter |
| Training event | CÓ | TRN-2026-028 | Server atomic counter |
| Audit | CÓ | AUD-2026-IA03 | Server atomic counter |
| ECR/ECO | CÓ | ECR-2026-012 | Server atomic counter |
| Job order | CÓ (từ Epicor) | JOB-2026-0042 | Epicor SoR |
| Photos, scans | KHÔNG | (dùng HHMM-UserID) | Người upload |
| CMM data | KHÔNG | (dùng HHMM-UserID) | Người upload |

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

**Cơ chế:** File lock (LOCK_EX) đảm bảo chỉ 1 process đọc/ghi tại 1 thời điểm → không race condition.

### 6.3 Luồng lấy Record-ID

**Online form:** Server tự cấp khi submit → nhúng vào filename PDF.

**Excel form:** User vào portal → "Xin mã hồ sơ mới" → server trả mã → user dùng trong tên file khi save.

---

## 7. Form version control

### 7.1 Form blank download — version stamp

Khi user tải form blank từ web portal:
- Filename BẮT BUỘC có `V{ver}`: `FRM-302_Setup-Sheet-and-Tool-List_V3.2.xlsx`
- Server inject metadata vào sheet ẩn `_QMS_CONTROL`:
  - form_code, version, checksum, downloaded_by, downloaded_at, source

### 7.2 Form filled upload — version validation

Khi user upload form đã điền lên SharePoint:
- SharePoint metadata column `Form-Version` phải khớp active version trong form_control_registry
- Nếu version cũ → FLAG `Version-Valid = OBSOLETE` + notify uploader
- Monthly audit: query files where Version-Valid = OBSOLETE → action required

### 7.3 Phân biệt blank vs filled nhìn từ tên file

```
BLANK:  FRM-{code}_{Title}_V{ver}.xlsx                              ← Có Title
FILLED: FRM-{code}_V{ver}_{scope}_{YYYYMMDD}_{HHMM}-{UserID}.xlsx  ← Có scope + time
```

---

## 8. Validation rules (fail-fast)

| Kiểm tra | Kết quả |
|----------|---------|
| Tên file chứa dấu cách hoặc ký tự đặc biệt | REJECT |
| Tên file không có date segment (YYYYMMDD) | REJECT |
| Filled form không có V{ver} | REJECT |
| Filled form version ≠ current active version | FLAG OBSOLETE |
| Job evidence không có JOB-{YYYY}-{nnnn} | REJECT |
| Engineering baseline không có V{ver} | REJECT |
| File trùng tên đã tồn tại (cùng tên, cùng folder) | REJECT |
| Tên file > 120 ký tự | WARN |
| RecordType code không trong dictionary (Section 3) | FLAG |
| Date format sai (không phải YYYYMMDD) | REJECT |
| Part number trong file ≠ Part number trong folder | REJECT |

---

## 9. 60-second traceability test (AS9100 compliance)

**Kịch bản:** Auditor hỏi "Show me the FAI report for job 0042, part 714XXXX rev A"

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

**Kịch bản 2:** "Show me all NCRs for Lam Research in Q1 2026"
```
1. Mở HESEM-Records → Quality-Records                               (3s)
2. Filter: Record-Type = NCR, Customer = Lam-Research, Year = 2026   (5s)
3. Sort by date → thấy danh sách tất cả NCR                         (ngay)
TỔNG: < 10 giây ✓
```

---

## 10. Nhiều file cùng 1 Record — quy tắc nhóm

Một NCR có thể có nhiều file evidence. Tất cả dùng CÙNG Record-ID:

```
FRM-631_V2.1_NCR-2026-043_20260327_0830-NVA.xlsx      ← Form NCR đã điền
PHOTO-NCR_NCR-2026-043_20260327_0831-NVA.jpg           ← Ảnh lỗi #1
PHOTO-NCR_NCR-2026-043_20260327_0831-TBH.jpg           ← Ảnh lỗi #2 (người khác)
PHOTO-NCR_NCR-2026-043_20260327_0832-NVA.jpg           ← Ảnh lỗi #3
CMM_NCR-2026-043_20260327_0835-QC1.csv                 ← Dữ liệu đo

SharePoint search: "NCR-2026-043" → tìm thấy TẤT CẢ files ← traceability
```

---

> **Cập nhật lần cuối:** 2026-03-27
> **Áp dụng:** Mọi file lưu lên SharePoint — HESEM ENGINEERING
> **Tài liệu liên quan:** 14-m365-sharepoint-architecture.md, evidence-naming-rule.html (Training Academy), ANNEX-131
