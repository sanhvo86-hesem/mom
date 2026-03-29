# Unicode Encoding Governance Audit - 20260329

## Scope
- Sources scanned: `01-QMS-Portal`, `02-Tai-Lieu-He-Thong`, `03-Tai-Lieu-Van-Hanh`, `04-Bieu-Mau`, `10-Training-Academy`, `11-Glossary`, `core-standards`, `assets`, root docs.
- Extensions: `.html`, `.md`, `.js`, `.css`, `.php`, `.json`, `.txt`, `.svg`.
- Excluded: `.git`, `.claude`, `node_modules`, `_build`, `_reports`, `_Deleted`, `tools/php82`.

## Snapshot
- Files scanned: **655**
- Files with encoding residue: **0**
- Total marker hits: **0**
- Total line-level patch points: **0**

## Root-Cause Signal Mix
- Double-encoded mojibake files: **0**
- Single-encoded mojibake files: **0**
- Replacement/control leakage files: **0**

## Cluster Inventory (All Patch-Point Clusters)
| Cluster | Class | Files | Markers |
|---|---:|---:|---:|

## Top Affected Files
| File | Class | Markers | Line Hits |
|---|---:|---:|---:|

## Bundle Remediation Plan (Fast + Low Risk)
| Bundle | Files | Markers | Strategy |
|---|---:|---:|---|

## Artifacts
- File-level inventory: `_reports/encoding/unicode-audit-20260329-files.csv`
- Line-level patch points: `_reports/encoding/unicode-audit-20260329-lines.csv`

## Immediate Governance Actions
1. Stop-the-bleed: khóa đường tạo nội dung mới nếu file không đạt UTF-8/NFC gate.
2. Remove patchwork: loại bỏ dần runtime decode latin1/cp1252 sau khi bundle B1 được canonicalize.
3. Batch repair by cluster: triển khai B2 -> B1 -> B3 -> B4, mỗi bundle đều có smoke-test render.
4. Enforce forever: đưa audit script vào pipeline kiểm tra trước khi merge/publish.
