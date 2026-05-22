# Track C — Gate/CDR, quality và customer escape

## Phạm vi

Được sửa:
- registry `gate_control_metrics`
- ANNEX-121 references if only cross-reference columns
- ANNEX-122 §9
- ANNEX-128 regenerate
- CI guard gate checks if needed

Không sửa:
- KpiEngine calculators trừ khi gate KPI batch agreed
- Admin Console general UI
- JD rewrite

## Nhiệm vụ

1. Lập gate/CDR matrix G0→G7.
2. Bảo đảm every gate has metrics.
3. Add/harden metrics:
   - CONTROL_PLAN_PFMEA_APPROVAL
   - IQC_FIRST_PASS
   - MILL_CERT_VERIFICATION
   - CUSTOMER_ESCAPE_NOTIFICATION_LT
   - FAI_PACKET_COMPLETENESS
   - SHIP_PACKET_COMPLETENESS
4. Ensure linked_cdr exists.
5. Ensure pass condition quantitative.

## Output

- `_reports/kpi/kpi-gate-cdr-hardening-<date>.md`
- gate/CDR matrix
- ANNEX-122 §9 regenerated.

## Merge handoff

- Gate metric list;
- linked CDR list;
- manual/runtime/staged status;
- CDR owner mismatch exceptions.
