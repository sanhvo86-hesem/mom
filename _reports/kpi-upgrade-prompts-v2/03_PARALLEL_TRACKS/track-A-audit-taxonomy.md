# Track A — Audit, taxonomy, scorecard rationalization

## Phạm vi

Được sửa:
- `_reports/kpi/**`
- registry taxonomy/status nếu coordinator cho phép
- ANNEX-127/-129 governance text nếu stage 02 đã duyệt

Không sửa:
- KpiEngine calculators
- Admin Console JS
- CI guard trừ khi chỉ ghi đề xuất

## Nhiệm vụ

1. Chạy prompt `02_PROMPTS_V2/01-current-state-audit-and-gap-map.md`.
2. Chạy prompt `02_PROMPTS_V2/02-metric-taxonomy-and-scorecard-rationalization.md`.
3. Tạo bảng final:
   - KPI official;
   - operating metrics;
   - gate metrics;
   - role measures;
   - health indicators;
   - staged backlog;
   - retired.
4. Đề xuất executive_scorecard 12–18 KPI.

## Output

- `_reports/kpi/kpi-current-state-gap-map-<date>.md`
- `_reports/kpi/kpi-taxonomy-scorecard-rationalization-<date>.md`
- patch registry/docs nếu được phép.

## Merge handoff

Cung cấp:
- danh sách canonical_code status cuối cùng;
- danh sách staged không được score;
- role measures phải đổi label trong JD;
- KPI cần Track B graduate.
