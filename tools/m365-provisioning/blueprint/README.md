# M365 SharePoint Folder Blueprint — Canonical (per ANNEX-133)

Filesystem materialization của blueprint trong [`ANNEX-133`](../../../mom/docs/operations/references/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-133-m365-records-site-topology-library-and-folder-blueprint.html).

**Đây không phải runtime data store.** Mục đích: reference + PnP provisioning input + drift-detection target.

## Topology

```
blueprint/
├── 06-Archive/             — Cross-site archive (closed years, superseded, legal hold, locked job pack)
├── 07-Working-Templates/   — Master template & shared drafts (per {Function}/{TemplateType})
├── hesem-records/          — SITE 1: QMS-Governance, Quality-Records, Training-Records, Department-Ops
├── hesem-job-evidence/     — SITE 2: Part-REV-Master, Job-Dossiers, Customer-Received, Tooling-Fixture-Gage
├── hesem-people/           — SITE 3: Employee-Records, HR-Operations
└── hesem-digital/          — SITE 4: System-Records, QMS-Source-Control
```

## Cấu trúc chi tiết

### `hesem-records/QMS-Governance/` (14 numbered folders)
01-Management-Review/{YYYY}/, 02-Internal-Audits, 03-External-Audits-and-CB, 04-Risk-and-Opportunity, 05-Change-Control, 06-Document-Control-and-Issuance, 07-Communication-and-Leadership, 08-Context-and-Interested-Parties, 09-Continual-Improvement-and-Kaizen, 10-Contingency-and-Disruption, 11-Legal-and-Compliance, **12-Knowledge-and-Lessons-Learned** (no year), **13-Authority-RACI-Deputy** (no year), 14-KPI-and-Dashboard-Control/{YYYY}/

### `hesem-records/Quality-Records/` (12 numbered folders, all `{YYYY}`)
01-Quality-Planning, 02-Inspection-Execution, 03-Calibration-and-MSA, 04-NCR, 05-CAPA, 06-Customer-Complaints, 07-FAI-and-First-Article, 08-SPC-and-Capability, 09-Product-Safety-and-FOD, 10-Ship-Release-and-CoC, 11-Supplier-Quality-and-SCAR, 12-Audit-and-MR-Quality-Inputs

### `hesem-records/Training-Records/` (8 numbered folders)
01-Training-Plan, 02-Attendance-and-Class-Records, 03-OJT-Evidence, 04-Competence-Assessment, 05-Certification-Register, 06-Skill-Matrix-and-Coverage, **07-Academy-Content-Control** (no year), 08-Safety-Induction-and-Special-Briefings

### `hesem-records/Department-Ops/DEP-{CODE}/` — 12 phòng × 9 zones × custom sub

**12 mã phòng:** DEP-EXEC, DEP-QMS, DEP-QA, DEP-ENG, DEP-PROD, DEP-SCM, DEP-SCS, DEP-FIN, DEP-HR, DEP-EHS, DEP-IT, DEP-ERP.

**Lưu ý chức năng phụ** (per ANNEX-133 §12 token table): D-PPC (Production Planning Control) thuộc DEP-PROD, D-WHS (Warehouse) + D-PUR (Purchasing) + D-TCR (Tool Crib) + D-LOG (Logistics) thuộc DEP-SCM. **Không tạo folder riêng** cho 5 chức năng này — chúng được dùng làm RoleCode bên trong dept cha.

**9 zone bắt buộc cho mọi dept:**
- `00-Live-Control-and-Master-Data/` — 7 sub (01-Boards-and-Queues, 02-Master-Lists-and-Mappings, 03-Dashboards-and-Views, 04-Open-Issues-and-Action-Trackers, 05-Link-Indexes-and-Controlled-Views, 06-Department-Calendar-and-Roster, 07-Shared-Reference-Indexes)
- `01-Governance/{00-Current, {YYYY}}/`
- `02-Operations/{00-Current, {YYYY}}/` — sub-folder custom theo dept (ANNEX-133 §8)
- `03-Registers-and-Logs/{00-Current, {YYYY}}/` — sub-folder custom theo dept
- `04-Projects-and-Improvement/{00-Active, {YYYY}}/`
- `05-Interfaces-and-Released-Packs/{00-Current, {YYYY}}/` — sub-folder custom theo dept
- `06-Working-Transitory-and-Draft/ROLE-{RoleCode}/` — 7 team sub (00-Team-Inbox, 01-Team-Draft, 02-Team-Review, 03-Team-Promote, 04-Team-Offline, 05-Team-Ref) + `90-Employee-WB/{EmployeeID}-{DisplayName}/{00-My-Inbox, 03-My-Handoffs}/` + `91-Deputy-Handoffs/` + `99-Clear-90d/`
- `07-Reference-and-Received-External/` — 7 sub (01-Customer-Received, 02-Supplier-Received, 03-Standards-and-Manuals, 04-Department-Work-Aids-and-Visuals, 05-Portal-Exports-and-System-Downloads, 06-Convenience-Copies, 07-To-Be-Culled)
- `99-Archive/`

### `hesem-job-evidence/Job-Dossiers/{YYYY}/{JobNum}-{PartNo}-REV-{Revision}/` (11 gates G0-G7 + 3 admin)

```
00_Admin-Control                  ← FRM-205 evidence index + status + change log
01_G0-Contract-Kickoff            ← Owner: D-SCS / D-PPC
02_G1-Engineering-Release         ← Owner: D-ENG
03_G2-IQC-Receiving               ← Owner: D-SCM / QA / D-WHS
04_G3-Setup-Release               ← Owner: D-ENG / D-PROD
05_G4-FAI-First-Article           ← Owner: QA / D-ENG
06_G5-IPQC-Production             ← Owner: D-PROD / QA
07_G6-Final-QC-Packaging          ← Owner: QA / D-PROD / D-WHS
08_G7-Ship-Release                ← Owner: D-WHS / D-LOG / QA
09_NCR-CAPA-Deviation             ← Owner: QA
99_Archive-Locked                 ← Owner: QA / QMS
```

**Optional customer separation:** `Job-Dossiers/{YYYY}/{CustomerID}/{JobNum}-{PartNo}-REV-{Revision}/` (insert {CustomerID} layer trước job folder).

### `hesem-job-evidence/Part-REV-Master/{CustomerID}/{PartNo}/REV-{Rev}/`

Engineering baseline master per customer/part/revision. Cấu trúc sub bên trong tùy theo workflow engineering của HESEM — không bị khóa bởi ANNEX-133. Production phải link/extract có kiểm soát, không sửa tại chỗ.

### `hesem-job-evidence/Customer-Received/{CustomerID}/`

Tài liệu nhận từ khách hàng (drawings, spec, quality requirements, customer PO scan).

### `hesem-job-evidence/Tooling-Fixture-Gage/{AssetType}/`

4 asset type: Fixture, Gage, Jig, Tool-Crib.

### `hesem-people/Employee-Records/` (6 top-level + 14 per-person sub)

**6 top-level:**
- `01-Active-Employees/{EmployeeID}-{FullName}/`
- `02-Pending-Starters/{YYYY}/{Population}/{CandidateOrPersonID}-{Name}/`
- `03-Former-Employees/{YYYY}/{EmployeeID}-{FullName}/`
- `04-Contractors-Interns-Temps/{YYYY}/{Population}/{ID-Name}/`
- `05-Visitors-and-Vendors/{YYYY}/{VisitType}/{VisitorName}/`
- `06-Restricted-Shared-Ops/{RestrictedProcess}/00-Current/`

**14 sub per person** (trong 01-Active và 03-Former):
00-Identity-and-Employment-Profile, 01-Recruitment-and-Offer, 02-Employment-Contract-and-Legal, 03-Onboarding-Role-and-Access, 04-Training-and-Certification-Link, 05-Probation-Performance-and-Development, 06-Payroll-and-Benefits-Restricted, 07-Leave-Attendance-and-Time-Case, 08-Medical-and-Fit-to-Work-Restricted, 09-Assets-Access-and-Issued-Items, 10-Role-Change-Transfer-and-Promotion, 11-Disciplinary-and-Legal-Restricted, 12-Offboarding-and-Exit, 13-Sealed-Copies-and-Legal-Hold

### `hesem-digital/System-Records/` (8 numbered)
01-Access-and-Identity, 02-M365-and-SharePoint-Configuration, 03-Epicor-Master-Data-and-Role-Control, 04-Deployment-UAT-and-Cutover, 05-Backup-Restore-and-Recovery, 06-Incident-and-Problem-Management, 07-Asset-and-Endpoint-Control, 08-Automation-Run-Logs — all với `{YYYY}/` partition.

### `hesem-digital/QMS-Source-Control/` (4 numbered)
01-Controlled-Source/qms.hesem.com.vn/, 02-Release-Manifests/{YYYY}/, 03-Server-Deploy-Receipts/{YYYY}/, 04-Reverse-Sync-Intake/{YYYY}/

### `06-Archive/` (cross-site)
- `01-Closed-Year-Archive/{YYYY}/`
- `02-Superseded-and-Obsolete/`
- `03-Legal-Hold/`
- `04-Locked-Job-Pack/{YYYY}/`

### `07-Working-Templates/{Function}/{TemplateType}/`

## Token đặt tên (ANNEX-133 §12)

| Token | Quy tắc | Ví dụ |
|---|---|---|
| `{YYYY}` | Năm 4 chữ số | 2026 |
| `{DeptCode}` | D-EXEC, D-SCS, D-ENG, D-PROD, D-PPC, D-QUAL, D-SCM, D-PUR, D-WHS, D-TCR, D-LOG, D-FIN, D-HR, D-EHS, D-IT, D-ERP | D-ENG |
| `{EmployeeID}` | Mã NV duy nhất | E0247 |
| `{JobNum}` | Mã job Epicor | J240315 |
| `{CustomerID}` | Mã khách hàng | CUST-ABC |
| `{PartNo}` | Mã part chuẩn | PN7788 |
| `{Revision}` | Phiên bản kỹ thuật | B |
| `{RecordType}` | Mã hồ sơ theo ANNEX-131 | NCR, CAPA, RFQ, INCIDENT |
| `{DescriptionSlug}` | Slug không dấu, gạch nối | khach-hang-thay-doi-pack |

**Mẫu tên file phát hành** (ANNEX-133 §12 keyline):
- `REC-{DeptCode}-{YYYY}-{NNNN}-{DescriptionSlug}.pdf`
- `{RecordType}-{JobNum}-{PartNo}-{DescriptionSlug}.pdf`
- `Photos-{YYYYMMDD}-{JobNum}-{DescriptionSlug}.jpg`

**RoleCode vs UserID** (đặc biệt quan trọng — không nhầm lẫn):
- **RoleCode** dùng cho **thư mục** trong `06-Working-Transitory-and-Draft/ROLE-{RoleCode}/` (vd ROLE-QAM, ROLE-SET, ROLE-CNC)
- **UserID** dùng cho **nhãn trong tên file** (vd NCR-2026-043-NVA.pdf)
- Không bao giờ trộn lẫn.

## Quy tắc cứng (ANNEX-133)

1. **SSOT duy nhất:** một loại hồ sơ chỉ có 1 SSOT path. Department-Ops chỉ giữ log/link, không duplicate Quality-Records/Training-Records.
2. **Khung sườn 9-zone bắt buộc cho mọi DEP:** không bỏ zone, không thêm zone tự phát.
3. **Year partition `{YYYY}/`:** chỉ dùng cho hồ sơ chốt kỳ + snapshot. Bảng điều hành / queue đang sống nằm trong `00-Live`/`00-Current`/`00-Active`.
4. **`06-Working` và `07-Reference` là bắt buộc**, không phải tùy chọn.
5. **Tối đa 3 nơi lưu cho 1 nhân viên:** Department-Ops workbench, Training-Records SSOT, Employee-Records dossier (nếu thuộc diện hạn chế).
6. **Path length safe:** segment ngắn (90-Employee-WB, 02-Pending-Starters, …); không ghép câu dài; phân luồng bằng metadata thay vì depth.
7. **Đào tạo SSOT ở Training-Records**, Employee-Records chỉ link/index → không sao chép bằng chứng.
8. **Job-Dossiers gate logic không phá:** không skip G0-G7, không rút gọn tên, không thêm folder phá gate.

## Tài liệu liên quan

- [ANNEX-131](../../../mom/docs/operations/references/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-131-m365-records-metadata-list-schema-and-register-catalog.html) — Metadata schema + register catalog
- [ANNEX-133](../../../mom/docs/operations/references/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-133-m365-records-site-topology-library-and-folder-blueprint.html) — **Canonical spec (this blueprint mirrors)**
- [ANNEX-134](../../../mom/docs/operations/references/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-134-m365-records-provisioning-permissions-and-automation-architecture.html) — Provisioning + permissions
- [ANNEX-135](../../../mom/docs/operations/references/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-135-m365-operational-records-file-plan-by-department-role-and-job.html) — File plan by dept/role/job
- [ANNEX-136](../../../mom/docs/operations/references/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-136-m365-sharepoint-git-server-source-sync-promotion-and-runtime-boundary.html) — Sync + runtime boundary
- [ANNEX-137](../../../mom/docs/operations/references/01-ANNEX-100/13-ANNEX-130-M365-Records-Control/annex-137-evidence-and-records-naming-convention.html) — Naming convention

## Stats

- **4 sites + 2 special libs** (06-Archive, 07-Working-Templates)
- **12 libraries** (QMS-Governance, Quality-Records, Training-Records, Department-Ops, Part-REV-Master, Job-Dossiers, Customer-Received, Tooling-Fixture-Gage, Employee-Records, HR-Operations, System-Records, QMS-Source-Control)
- **12 dept codes** (DEP-EXEC/QMS/QA/ENG/PROD/SCM/SCS/FIN/HR/EHS/IT/ERP)
- **~1050 directories** at blueprint depth
