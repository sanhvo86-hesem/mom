# Translation Progress Summary - 2026-03-24

## Scope

- `02-Tai-Lieu-He-Thong`
- `03-Tai-Lieu-Van-Hanh`
- `10-Training-Academy`

## Batch results

- `02-Tai-Lieu-He-Thong`
  - Initial controlled pass: 54 files scanned, 54 files changed, 2,806 replacements.
  - QA correction passes after first run: 134 more corrective replacements to remove rule-overlap artifacts.
  - Directional result: foundational system manuals, handbooks and JD corpus moved to a much cleaner Vietnamese baseline with first-mention English only on lower-frequency translated terms.

- `03-Tai-Lieu-Van-Hanh`
  - Initial controlled pass: 155 files scanned, 152 files changed, 5,468 replacements.
  - QA correction pass: 14 targeted corrective replacements for `quality gate`, `ship release pack`, `gate status` and related overlap artifacts.
  - Directional result: SOP/WI/ANNEX operational layer now follows the same terminology policy as the system layer.

- `10-Training-Academy`
  - Initial controlled pass: 197 files scanned, 192 files changed, 11,507 replacements.
  - Training-oriented semantic cleanup pass: 1,508 more replacements focused on `K-S-E-M`, `metric`, `process`, `No evidence = No gate`, and related learning-content phrasing.
  - Directional result: training content has been pulled significantly toward Vietnamese, though this block still has the highest remaining volume of pedagogical mixed-language phrases and will need another semantic refinement pass.

## Translation policy applied

- Translate fully to Vietnamese by default.
- Do not intentionally translate department names and job titles.
- For translated terms that are understandable in Vietnamese but still less common on Vietnamese websites, use first-mention form `Vietnamese (English)` once per document, then keep Vietnamese only.
- Normalize hybrid Anh-Viet phrases into one controlled form instead of leaving half-translated compounds.

## Terms intentionally handled with first-mention English

- `thời gian dẫn (lead time)`
- `phê duyệt giao hàng (ship release)`
- `bộ hồ sơ phê duyệt giao hàng (ship release pack)`
- `bộ hồ sơ giao hàng (ship packet)`
- `xác nhận giao hàng (ship confirm)`
- `hồ sơ công việc (job dossier)`
- `phiếu theo dõi công việc (job traveler)`
- `mẫu đầu (first piece)`
- `bộ hồ sơ rà soát (review pack)`
- `bộ hồ sơ chuẩn (baseline package)`
- `bộ bằng chứng (evidence pack)`
- `trung tâm điều hành (control tower)`

## Current status

- A full first-pass translation has now been applied across all 3 primary document blocks.
- The highest remaining cleanup need is in `10-Training-Academy`, because that block contains many teaching labels, slogans, module titles, and bilingual pedagogy phrases beyond ordinary QMS operations language.
