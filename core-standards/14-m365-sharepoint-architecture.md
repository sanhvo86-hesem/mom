# 14 — Kiến trúc M365 SharePoint và lưu trữ hồ sơ vận hành

> Thiết kế kiến trúc SharePoint 4-site cho lưu trữ hồ sơ, backup tài liệu, và đồng bộ với web portal.
> Web portal (qms.hesem.com.vn) = nơi ĐỌC duy nhất. SharePoint = backup + lưu trữ hồ sơ vận hành.

---

## 1. Nguyên tắc kiến trúc

| # | Nguyên tắc | Mô tả |
|---|-----------|-------|
| 1 | **Web portal = đọc, SharePoint = lưu** | Mọi người đọc tài liệu trên web. SharePoint chỉ lưu hồ sơ vận hành (form đã điền, evidence) và backup source. |
| 2 | **Site = security boundary** | Mỗi site = 1 mức nhạy cảm, 1 nhóm người dùng chính. Tách IP khách hàng ra site riêng. |
| 3 | **Epicor = SoR, SharePoint = SSOT** | Epicor quản lý transaction (job, PO, inventory). SharePoint quản lý documents và evidence. Link, không copy. |
| 4 | **Flat folder + metadata** | Tối đa 3 tầng folder. Dùng SharePoint metadata columns thay vì sub-folder sâu. |
| 5 | **OneDrive cho file cá nhân** | Không tạo Employee Workbench trong SharePoint. Mỗi user dùng OneDrive (1TB/user trong Business Basic). |
| 6 | **Group-based permission** | Phân quyền theo Entra ID Security Groups, không gán per-user. |
| 7 | **Form blank tải từ web** | Form template (.xlsx) phục vụ từ web server. SharePoint chỉ chứa form đã điền và evidence. |

---

## 2. Topology 4 sites

```
SITE 1: HESEM-Records             ← Hồ sơ vận hành (form đã điền, evidence chung)
SITE 2: HESEM-Job-Evidence        ← Job dossier + Part baseline + IP khách hàng (TÁCH RIÊNG)
SITE 3: HESEM-People              ← HR restricted
SITE 4: HESEM-Digital             ← Source control (backup web portal) + IT governance
```

**Tại sao 4 sites thay vì 3?**

| Lý do | Giải thích |
|-------|-----------|
| IP khách hàng | Lam Research IP (bản vẽ, spec, CAM data) PHẢI tách site riêng — audit hỏi "How do you protect our IP?" |
| Permission isolation | SharePoint site-level isolation = security boundary cứng nhất trong M365 Business Basic |
| Performance | Job dossier volume lớn nhất (2000-5000 files/năm) — tách ra không ảnh hưởng site khác |
| Compliance | AS9100 §8.5.2 traceability + ISO 9001 §7.5.3 record protection |

---

## 3. SITE 1: HESEM-Records — Hồ sơ vận hành

**Mục đích:** Chứa form đã điền, evidence, records phát sinh trong vận hành hàng ngày (KHÔNG gắn job).

### 3.1 Document Libraries

| Library | Nội dung | Cấu trúc folder |
|---------|---------|-----------------|
| **Quality-Records** | NCR, CAPA, FAI, Calibration, SPC, IQC, Complaint, Ship-Release, Supplier | `{YYYY}/{RecordType}/` |
| **QMS-Governance** | Management Review, Audit, Risk, Change Control, KPI, Improvement | `{YYYY}/{RecordType}/` |
| **Training-Records** | Attendance, OJT, Assessment, Certification | `{YYYY}/{RecordType}/` + `Skill-Matrix/00-Current/` |
| **Department-Ops** | Per-department operational records | `{DeptCode}/{00-Current hoặc YYYY}/` |

### 3.2 SharePoint Lists (tracking dashboards)

| List | Dữ liệu |
|------|---------|
| LST-NCR-Log | Tracker NCR status, link to file in Quality-Records |
| LST-CAPA-Log | Tracker CAPA status |
| LST-FAI-Tracker | FAI completion per job |
| LST-Calibration-Schedule | Equipment + due dates + alerts |
| LST-Supplier-Scorecard | Supplier performance |
| LST-Maintenance-Schedule | Machine PM schedule |
| LST-Change-Request-Log | ECR/ECO tracking |

### 3.3 Online form sync

Mỗi online form (~25 forms) sync vào 1 SharePoint List riêng + auto PDF vào Document Library:

| Online form | SharePoint List | PDF lưu tại |
|------------|----------------|-------------|
| FRM-208 Tier Meeting | LST-FRM-208 | Department-Ops/PRO/{YYYY}/ |
| FRM-504 Shift Handover | LST-FRM-504 | Department-Ops/PRO/{YYYY}/ |
| FRM-512 Downtime Log | LST-FRM-512 | Department-Ops/PRO/{YYYY}/ |
| FRM-631 NCR Report | LST-FRM-631 | Quality-Records/{YYYY}/NCR/ |
| FRM-641 CAPA Request | LST-FRM-641 | Quality-Records/{YYYY}/CAPA/ |
| FRM-651 Final Inspection | LST-FRM-651 | Quality-Records/{YYYY}/Ship-Release/ |
| FRM-701 Receiving Log | LST-FRM-701 | Quality-Records/{YYYY}/IQC/ |
| FRM-711 Packing/Ship | LST-FRM-711 | Quality-Records/{YYYY}/Ship-Release/ |
| FRM-802 Training Attend. | LST-FRM-802 | Training-Records/{YYYY}/Attendance/ |

### 3.4 Metadata columns (Quality-Records library)

| Column | Type | Bắt buộc | Mô tả |
|--------|------|---------|-------|
| Record-Type | Choice | Có | NCR, CAPA, FAI, Calibration, SPC, IQC, Complaint, Ship-Release, Supplier |
| Record-Number | Text (indexed) | Có | NCR-2026-043, FAI-2026-015 |
| Form-Code | Text | Có khi là form | FRM-631, FRM-311 |
| Form-Version | Text | Có khi là form | V2.1 |
| Job-Number | Text | Nếu có | JOB-2026-0042 |
| Part-Number | Text | Nếu có | 714-XXXXXX-001 |
| Customer | Choice | Nếu có | Lam-Research |
| Status | Choice | Có | Open, In-Review, Closed |
| Department | Choice | Có | QA, ENG, PRO, SCM... |
| Year | Text | Có | 2026 |
| Closed-Date | Date | Khi đóng | 2026-04-15 |

---

## 4. SITE 2: HESEM-Job-Evidence — IP khách hàng

**Mục đích:** Tất cả hồ sơ gắn job order + engineering baseline + tài liệu khách hàng. **NO external sharing.**

### 4.1 Document Libraries

| Library | Nội dung | Cấu trúc folder |
|---------|---------|-----------------|
| **Part-REV-Master** | Engineering baseline tái sử dụng: NC, CAM, Setup Sheet, Tool List, Inspection Program, Fixture, Simulation, Control Plan | `{CustomerID}/{PartNum}/{REV-X}/` |
| **Job-Dossiers** | Evidence thực thi per job: form đã điền, photos, CMM data, certs, traveler, CoC | `{YYYY}/{JobNum}_{PartRev}/` |
| **Customer-Received** | Tài liệu gốc khách hàng gửi (bản vẽ, spec, quality requirements) | `{CustomerID}/{DocType}/` |
| **Tooling-Fixture-Gage** | Tài sản tái sử dụng: fixture drawings, gage records, tool crib | `{AssetType}/{AssetID}/` |

### 4.2 Part-REV-Master — file categories

| File-Category | File types thực tế | Ví dụ |
|--------------|-------------------|-------|
| NC-Program | .nc, .tap, .mpf, .eia, .cnc | NC_714XXXX-REVA_OP10_5AX_V3.nc |
| CAM-Source | .mcam, .f3d, .emcam | CAM_714XXXX-REVA_OP10_5AX_V3.mcam |
| CAD-Model | .step, .stp, .igs, .x_t | MODEL_714XXXX-REVA_ALL_V1.step |
| Drawing | .pdf | DWG_714XXXX-REVA_ALL_V1.pdf |
| Setup-Sheet | .xlsx (FRM-302) | SETUP_714XXXX-REVA_OP10_5AX_V3.xlsx |
| Tool-List | .xlsx | (tích hợp trong FRM-302) |
| Inspection-Program | .dcc, .prg, .pcx | INSP_714XXXX-REVA_ALL_CMM_V2.dcc |
| Control-Plan | .xlsx (FRM-133) | CTRL-PLAN_714XXXX-REVA_ALL_V2.xlsx |
| Fixture-Drawing | .pdf, .step | FIXTURE_714XXXX-REVA_OP10_5AX_V1.pdf |
| Simulation-Evidence | .mp4, .png | SIM_714XXXX-REVA_OP10_5AX_V3.mp4 |
| Baseline-Manifest | .xlsx (FRM-306) | FRM-306_714XXXX-REVA_ALL_V3.xlsx |
| Supersedure-Record | .xlsx (FRM-307) | FRM-307_714XXXX-REVA_ALL_V2-to-V3_20260327.xlsx |

### 4.3 Quan hệ Part-REV-Master vs Job Dossier

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

| List | Dữ liệu |
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

| Library | Cấu trúc |
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

| Library | Nội dung |
|---------|---------|
| **QMS-Source-Control** | Backup toàn bộ web portal: `01-Controlled-Source/qms.hesem.com.vn/` + Release Manifests + Deploy Receipts |
| **System-Records** | IT governance: Access-Control, M365-Config, Epicor-Control, Backup-Recovery |

### 6.2 Sync flow (đã định nghĩa trong WI-107)

```
SharePoint (source) → OneDrive sync → Local edit → Git → Server deploy
```

---

## 7. Permission model

### 7.1 Entra ID Security Groups

| Group | Thành viên |
|-------|-----------|
| HESEM-AllStaff | Toàn bộ nhân viên |
| HESEM-Management | Trưởng phòng trở lên |
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
| HESEM-Records | Department-Ops | AllStaff (own dept) | Own Dept Group |
| HESEM-Job-Evidence | Part-REV-Master | Job-Core | Engineering |
| HESEM-Job-Evidence | Job-Dossiers | Job-Core | Job-Core |
| HESEM-Job-Evidence | Customer-Received | Job-Core | Engineering + Sales |
| HESEM-Job-Evidence | Tooling-Fixture-Gage | Job-Core | Engineering + Production |
| HESEM-People | All | HR | HR |
| HESEM-Digital | QMS-Source-Control | QMS-Team + IT | IT |
| HESEM-Digital | System-Records | IT + QMS-Team | IT |

---

## 8. Online forms vs Excel forms

### 8.1 Tiêu chí phân loại

| Tiêu chí | → Online | → Excel |
|----------|---------|---------|
| Tần suất | Hàng ngày, mỗi ca, mỗi sự kiện | Hàng tháng, hàng quý, 1 lần/job |
| Độ phức tạp | < 20 fields, dữ liệu đơn giản | Matrix, multi-tab, công thức phức tạp |
| Nơi điền | Tại sàn SX (điện thoại/tablet) | Tại bàn làm việc (desktop) |
| Real-time tracking | Cần dashboard live | Không cần |

### 8.2 Danh sách online forms (~25 forms)

FRM-208, FRM-413, FRM-501, FRM-502, FRM-504, FRM-505, FRM-507, FRM-511, FRM-512, FRM-521, FRM-525, FRM-631, FRM-641, FRM-651, FRM-701, FRM-711, FRM-715, FRM-721, FRM-802, FRM-913.

### 8.3 Sync mechanism

```
Online form submit → api.php:
├── Save JSON (server, primary)
├── Generate PDF snapshot
├── Sync to SharePoint List (Graph API) → structured data
└── Upload PDF to SharePoint Library → evidence
```

### 8.4 Excel form version control

```
Download: api.php inject version stamp → filename FRM-302_Setup-Sheet_V3.2.xlsx
Upload:   SharePoint validate version vs registry → reject if obsolete
```

---

## 9. Storage estimate

| File type | Size trung bình | Volume/năm | Total/năm |
|-----------|----------------|-----------|-----------|
| NC program (.nc) | 50KB-2MB | 500 files | ~500MB |
| CAM source (.mcam, .f3d) | 5-50MB | 300 files | ~5GB |
| CAD model (.step) | 1-20MB | 200 files | ~2GB |
| Photos (.jpg) | 1-5MB | 2000 files | ~5GB |
| Forms + PDFs | 200KB-2MB | 3000 files | ~3GB |
| Scanned docs (.pdf) | 500KB-3MB | 1000 files | ~2GB |
| **Total/năm** | | | **~18GB** |

M365 Business Basic: 1TB + 10GB/user. Với 100 user = ~2TB. 18GB/năm = **100+ năm storage**.

---

> **Cập nhật lần cuối:** 2026-03-27
> **Áp dụng:** M365 SharePoint deployment — HESEM ENGINEERING
> **Tài liệu liên quan:** 15-evidence-and-records-naming.md, WI-102, WI-107, ANNEX-131 đến ANNEX-136
