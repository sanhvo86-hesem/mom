# Unicode Encoding Governance Audit - 20260328

## Scope
- Sources scanned: `01-QMS-Portal`, `02-Tai-Lieu-He-Thong`, `03-Tai-Lieu-Van-Hanh`, `04-Bieu-Mau`, `10-Training-Academy`, `11-Glossary`, `core-standards`, `assets`, root docs.
- Extensions: `.html`, `.md`, `.js`, `.css`, `.php`, `.json`, `.txt`, `.svg`.
- Excluded: `.git`, `.claude`, `node_modules`, `_build`, `_reports`, `_Deleted`, `tools/php82`.

## Snapshot
- Files scanned: **570**
- Files with encoding residue: **9**
- Total marker hits: **2407**
- Total line-level patch points: **269**

## Root-Cause Signal Mix
- Double-encoded mojibake files: **0**
- Single-encoded mojibake files: **5**
- Replacement/control leakage files: **4**

## Cluster Inventory (All Patch-Point Clusters)
| Cluster | Class | Files | Markers |
|---|---:|---:|---:|
| 03-Tai-Lieu-Van-Hanh | replacement-or-control | 2 | 2394 |
| 01-QMS-Portal | single-encoded | 5 | 5 |
| 11-Glossary | replacement-or-control | 1 | 4 |
| general_note.md | replacement-or-control | 1 | 4 |

## Top Affected Files
| File | Class | Markers | Line Hits |
|---|---:|---:|---:|
| 03-Tai-Lieu-Van-Hanh\03-Reference\01-ANNEX-100\13-ANNEX-130-M365-Records-Control\annex-135-m365-operational-records-file-plan-by-department-role-and-job.html | replacement-or-control | 1585 | 187 |
| 03-Tai-Lieu-Van-Hanh\02-Work-Instructions\01-WI-100\wi-102-sharepoint-record-sites-libraries-and-permissions-click-by-click.html | replacement-or-control | 809 | 78 |
| 11-Glossary\dict-data.json | replacement-or-control | 4 | 2 |
| general_note.md | replacement-or-control | 4 | 2 |
| 01-QMS-Portal\docs\editor-modernization-tiptap-roadmap.md | single-encoded | 1 | 0 |
| 01-QMS-Portal\docs\editor-wordlike-test-checklist.md | single-encoded | 1 | 0 |
| 01-QMS-Portal\docs\excel-form-version-control-architecture.md | single-encoded | 1 | 0 |
| 01-QMS-Portal\docs\form-server-delivery-rollout-baseline.md | single-encoded | 1 | 0 |
| 01-QMS-Portal\docs\portal-document-display-convention.md | single-encoded | 1 | 0 |

## Bundle Remediation Plan (Fast + Low Risk)
| Bundle | Files | Markers | Strategy |
|---|---:|---:|---|
| B1-portal-runtime-and-generator | 5 | 5 | Sửa literal nguồn trong portal/API về UTF-8 chuẩn; khóa đường tạo tài liệu mới; bỏ dần hàm fix runtime cp1252/latin1. |
| B3-operational-documents | 3 | 2398 | Sửa theo batch bằng script canonical decoder có ngưỡng an toàn, chạy validate diff + render smoke test theo nhóm tài liệu. |

## Artifacts
- File-level inventory: `_reports/encoding/unicode-audit-20260328-files.csv`
- Line-level patch points: `_reports/encoding/unicode-audit-20260328-lines.csv`

## Immediate Governance Actions
1. Stop-the-bleed: khóa đường tạo nội dung mới nếu file không đạt UTF-8/NFC gate.
2. Remove patchwork: loại bỏ dần runtime decode latin1/cp1252 sau khi bundle B1 được canonicalize.
3. Batch repair by cluster: triển khai B2 -> B1 -> B3 -> B4, mỗi bundle đều có smoke-test render.
4. Enforce forever: đưa audit script vào pipeline kiểm tra trước khi merge/publish.
