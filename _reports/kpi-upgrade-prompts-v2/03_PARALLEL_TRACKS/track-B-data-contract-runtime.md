# Track B — Data contract và runtime calculators

## Phạm vi

Được sửa:
- `mom/api/services/KpiEngine.php`
- migrations nếu cần
- registry fields cho KPI batch
- dashboard API tests/report
- ANNEX-122/128 nếu KPI status đổi

Không sửa:
- Console architecture
- JD rewrite toàn diện
- Gate/CDR mapping ngoài KPI batch

## Nhiệm vụ

1. Chạy prompt 04 data contract verification cho batch P0.
2. Chọn 3–6 KPI verified source để graduate.
3. Viết `calc*` theo chuẩn.
4. API/trend/snapshot verify.
5. Update registry/docs/matrix.

## Batch gợi ý

Batch 1:
- FAI_FIRST_PASS
- FINAL_RELEASE_RFT
- CAPA_EFFECTIVENESS
- REPEAT_NCR_RATE

Batch 2:
- MTBF
- MTTR
- UNPLANNED_DOWNTIME_RATE
- CYCLE_TIME_VARIANCE

Batch 3:
- RFQ_TURNAROUND_TIME
- ENGINEERING_RELEASE_ON_TIME
- SHIP_READY_TO_INVOICE_LT

Chỉ làm nếu data source verified.

## Output

- `_reports/kpi/kpi-data-contract-verification-<date>.md`
- `_reports/kpi/kpi-runtime-graduation-<date>.md`
- API evidence snippets.

## Merge handoff

- list new runtime metrics;
- source tables/columns;
- sample API responses;
- known data quality flags.
