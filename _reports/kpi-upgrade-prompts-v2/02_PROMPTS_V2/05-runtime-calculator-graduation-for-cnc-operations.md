# 05 — Graduate runtime calculators cho KPI CNC ưu tiên

**Loại:** sửa KpiEngine + tests/migration/registry/docs.  
**Mục tiêu:** Biến KPI quan trọng từ staged/manual không cần thiết thành số tính thật, có breakdown hành động.

## 1. Tiền điều kiện

- Prompt 04 đã verify data contract.
- Chỉ graduate KPI có source verified.
- Không viết calc function dựa trên cột đoán.

## 2. Chọn danh sách graduate theo P0/P1

Ưu tiên P0:
- FAI_FIRST_PASS
- FINAL_RELEASE_RFT
- CAPA_EFFECTIVENESS
- REPEAT_NCR_RATE
- MTBF
- MTTR
- UNPLANNED_DOWNTIME_RATE
- OEE_BOTTLENECK hoặc CONSTRAINT_LOST_HOURS nếu có constraint source
- CYCLE_TIME_VARIANCE
- SHIP_READY_TO_INVOICE_LT
- RFQ_TURNAROUND_TIME
- ENGINEERING_RELEASE_ON_TIME
- ORDER_REVIEW_RFT
- IQC_FIRST_PASS / MILL_CERT_VERIFICATION nếu có source
- CUSTOMER_ESCAPE_NOTIFICATION_LT nếu có complaint/customer-notice log; nếu không manual governed.

Không nhất thiết làm hết trong một commit. Chọn batch nhỏ, test chắc.

## 3. Mẫu hàm calc

Mỗi hàm:
- đặt constant metric code;
- thêm vào `ALL_METRICS`;
- thêm target/unit/lower_is_better nếu cần;
- map trong `getCalculator()`;
- tính bằng SQL parameterized;
- trả:
  - `value`;
  - `sample_size`;
  - tử/mẫu rõ;
  - breakdown theo reason/customer/product_family/machine/owner nếu có;
  - `empty_result` nếu sample_size=0;
  - `data_quality_flags` nếu thiếu dữ liệu phụ.
- Không hardcode threshold ngoài default fallback.

## 4. Các KPI và công thức gợi ý

### FAI_FIRST_PASS
- Denominator: FAI inspections completed in period.
- Numerator: FAI result pass first attempt.
- Filters: `inspection_type='FAI'`.
- Breakdown: product_family, job, engineer/programmer, failure reason.
- Edge: prototype small-lot uses min_sample grey for scoring but gate per-event still hold.

### FINAL_RELEASE_RFT
- Denominator: lots/jobs submitted to final release.
- Numerator: no reopen/correction/hold after first release review.
- Source: release records or final inspection/shipping packet records.
- Breakdown: missing CoC, cert, inspection, labeling, traceability.

### CAPA_EFFECTIVENESS
- Denominator: CAPA due for effectiveness verification in period.
- Numerator: verified effective, no repeat within window.
- Do not use closure date only.
- Breakdown by cause/process/owner.

### REPEAT_NCR_RATE
- Denominator: NCR in period.
- Numerator: same cause/product/process/customer as prior NCR within configured horizon.
- Need cause_code normalization.
- If cause_code missing, flag data quality.

### MTBF / MTTR
- Source: equipment downtime/failure logs.
- MTBF = operating hours between failures or total operating hours / failure count.
- MTTR = repair downtime / failure count.
- Separate planned maintenance, changeover, no material, operator absence.
- Breakdown by machine, failure mode.

### OEE_BOTTLENECK / CONSTRAINT_LOST_HOURS
- Need constraint registry: current bottleneck machine/workcenter by period.
- OEE only for constraint; do not average all machines.
- Lost hours split material, maintenance, setup, quality hold, no operator, programming, schedule gap.

### CYCLE_TIME_VARIANCE
- Actual cycle per operation vs standard routing cycle.
- Exclude first article/prototype if separate.
- Breakdown by part, operation, machine, program revision, tool.

### RFQ_TURNAROUND_TIME
- Start at RFQ complete, not initial incomplete email.
- End at quote sent.
- Exclude withdrawn RFQ.
- Breakdown by complexity/customer.

### SHIP_READY_TO_INVOICE_LT
- Start final release/ship ready.
- End invoice issued.
- Pair with invoice RFT.

## 5. Tests / verification

For each new runtime KPI:
- unit/smoke test if test harness exists;
- manual API call period with known/empty dates;
- verify grey status for empty period;
- verify min_sample;
- verify trend returns values or grey;
- saveSnapshot includes it if cron covers all.

Commands:
```bash
php -l mom/api/services/KpiEngine.php
php -r 'require "mom/api/bootstrap.php"; /* call KpiEngine metric period */'
curl/Chrome GET /api/kpi/<CODE>?start=YYYY-MM-DD&end=YYYY-MM-DD
```

Use repo’s actual bootstrap conventions.

## 6. Registry/docs sync

For each graduate:
- `calculation_status = runtime_calculated`;
- add to `runtime_calculated_metrics`;
- update data_source with verified tables/columns;
- update formula to exactly match SQL;
- update ANNEX-122;
- regenerate ANNEX-128;
- dashboard badge changes.

## 7. Tự phản biện

- SQL có thật sự đo đúng định nghĩa không?
- Có counter-metric/manual blocker chưa?
- Breakdown có giúp owner hành động không?
- Có nguy cơ KPI đỏ oan do missing data không?
- Có KPI nào nên manual/staged thay vì runtime không?

## 8. Definition of Done

- Batch KPI runtime mới chạy API thật.
- No fake runtime.
- Audit/guard PASS.
- Report `_reports/kpi/kpi-runtime-graduation-<date>.md` có bảng before/after.
