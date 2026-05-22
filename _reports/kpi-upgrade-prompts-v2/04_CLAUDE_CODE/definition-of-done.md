# Definition of Done — KPI thực chiến

## KPI-level DoD

Một KPI official đạt DoD khi:

- Code canonical duy nhất.
- Classification đúng.
- Purpose rõ: đo để quyết định gì.
- Formula định lượng.
- Thresholds numeric + basis.
- Source/evidence verified.
- Owner có quyền xử lý.
- Cadence/review forum.
- Action rule cụ thể.
- Counter-metric cụ thể.
- Attribution rule công bằng.
- Calculation status trung thực.
- Dashboard/ANNEX/JD dùng đúng.
- CI guard không báo P0.

## Runtime KPI DoD

- Có `calc*` trong KpiEngine.
- Map trong calculator.
- Có unit/default target fallback.
- `runtime_calculated_metrics` includes code.
- Formula registry khớp SQL.
- Handles empty period/divide by zero.
- Handles min_sample.
- Returns actionable breakdown.
- Trend/snapshot works.
- API tested.

## Manual-governed KPI DoD

- Có form/input endpoint.
- Có evidence_ref.
- Có entered_by/entered_at.
- Có approval/review if reward/gate.
- Dashboard badge manual.
- Counter visible.
- Audit trail.

## Gate metric DoD

- Gate Gx declared.
- linked_cdr exists.
- pass condition quantitative.
- owner aligned to CDR/gate.
- evidence defined.
- hold/release action.
- counter metric.
- appears in ANNEX-122 §9.
- guard validates.

## Scorecard DoD

- 12–18 executive KPIs.
- No staged scoring.
- Weights total 100 if weighted.
- Reward block rules.
- Counter metrics reviewed.
- Safety/customer/data integrity blockers.
- Attribution and min_sample.

## System DoD

- 3 audit scripts PASS.
- KPI integrity PASS.
- Docs synced.
- Admin Console safe.
- Dashboard honest.
- Reports generated.
- Vietnamese technical writing clean.
- Git status clean.
