# 06 — Gia cố gate metrics, CDR, chất lượng và customer escape

**Loại:** sửa registry + ANNEX-121/122/128 + KpiEngine/manual input nếu cần.  
**Mục tiêu:** Không gate nào G0→G7 được pass bằng cảm tính. Mỗi gate có metric pass/fail, linked CDR, evidence và action hold/release.

## 1. Đọc trước

- ANNEX-121 ma trận CDR/RACI.
- ANNEX-122 §9.
- Registry `gate_control_metrics`.
- Prompt 05 gốc baseline.
- `01_RESEARCH/02-cnc-kpi-library.md` phần gate.
- Data contract report.

## 2. Lập gate/CDR matrix

Tạo bảng:

| Gate | CDR | CDR owner A | Decision | Existing metric | Metric owner | Pass condition | Evidence | Status | Gap |
|---|---|---|---|---|---|---|---|---|---|

Tất cả CDR phải được parse/đọc từ ANNEX-121; không đoán.

## 3. Rule cho gate metrics

Mỗi metric phải có:

```json
{
  "metric_type": "gate_control_metric",
  "gate": "G4",
  "linked_cdr": ["D1", "D12"],
  "gate_pass_condition": "định lượng",
  "owner_role": "role A hoặc gate owner",
  "calculation_status": "runtime_calculated|manual_governed|staged_data_contract",
  "thresholds": {"green_point": ..., "yellow_point": ..., "direction": "..."},
  "decision_action": "Hold gate / conditional release / escalation",
  "counter_metric": {...},
  "evidence": "FRM/log/table"
}
```

## 4. Gate minimum set

### G0 — RFQ / Feasibility
- RFQ_TURNAROUND_TIME
- FEASIBILITY_REVIEW_COMPLETENESS
- QUOTE_RISK_REVIEW_RFT
- Counter: quote rework/low-margin win.

### G1 — Contract / Order Review
- ORDER_REVIEW_RFT
- CUSTOMER_REQUIREMENT_CLARITY
- Counter: missed requirement after release.

### G2 — Engineering Baseline
- ENGINEERING_RELEASE_ON_TIME
- CONTROL_PLAN_PFMEA_APPROVAL
- NC_PROGRAM_RELEASE_RFT if applicable.
- Counter: post-release engineering defect.

### G3 — Material / Supplier Readiness
- MATERIAL_AVAILABILITY_PLAN
- IQC_FIRST_PASS
- MILL_CERT_VERIFICATION
- Supplier readiness for critical material.
- Counter: partial kit release, cert mismatch.

### G4 — FAI / First Piece
- FAI_FIRST_PASS
- FAI_CYCLE_TIME
- FAI_PACKET_COMPLETENESS / PPAP if customer required.
- Counter: post-FAI production defect leakage.

### G5 — In-process Control
- IN_PROCESS_REJECT_RATE
- SPC_SIGNAL_REACTION_TIME
- NCR_OPEN_LT / containment within SLA.
- Counter: unauthorized criteria relaxation.

### G6 — Final Release
- FINAL_RELEASE_RFT
- SHIP_PACKET_COMPLETENESS
- TRACEABILITY_DRILL_TIME
- Counter: complete-but-wrong packet.

### G7 — Delivery / Post-delivery
- OTD gate view
- SHIP_READY_TO_INVOICE_LT
- CUSTOMER_ESCAPE_NOTIFICATION_LT
- Counter: premature/incomplete notification, invoice reissue.

## 5. Owner alignment

Owner metric should generally match CDR role with A/accountability. If different:
- explain why;
- CDR owner remains accountable for gate;
- data steward can differ.

## 6. ANNEX-122 §9

Ensure §9 table has columns:
- Local ID
- Canonical code
- Gate
- Linked CDR
- Gate pass condition
- Owner
- Cadence
- Data source/evidence
- Calculation status
- Counter-metric
- Action if not pass

Add markers `KPI-GATE:START/END` if missing.

## 7. Manual gate metrics

Per-event gates often use checklist/manual:
- Use `kpi_input_save`/manual input or form evidence.
- Require evidence_ref.
- Status should be manual_governed, not vague manual.
- Gate pass cannot rely on unapproved manual input if customer/regulatory critical.

## 8. Customer escape hardening

For D11/customer escape:
- Ensure metric `CUSTOMER_ESCAPE_NOTIFICATION_LT`.
- Start clock at detection time, not NCR creation if delayed.
- Require containment completeness.
- Counter: premature notification without containment or late/suppressed escape logging.
- Action: QA/CEO escalation and customer communication owner.

## 9. CI guard

Add/verify:
- P0: every G0-G7 has at least 1 metric.
- P0: linked_cdr exists in ANNEX-121.
- P0: gate_pass_condition not empty and includes numeric threshold/pass rule.
- P0: gate metric missing owner/evidence/counter.
- P1: gate metric staged for critical CDR without manual fallback.
- P1: owner not matching CDR A and no justification.

## 10. Tự phản biện

- Gate nào vẫn có thể pass không evidence?
- Metric nào đo sau sự kiện nên không bảo vệ gate?
- Có metric gate trùng KPI chính nhưng owner/pass condition lệch?
- Nếu khách audit hỏi “vì sao G4 pass?”, evidence ở đâu?

## 11. Definition of Done

- Gate/CDR matrix no P0 gap.
- ANNEX-122 §9 synced.
- Registry gate metrics đủ field.
- ANNEX-128 regenerated.
- Audit/guard PASS.
- Report `_reports/kpi/kpi-gate-cdr-hardening-<date>.md`.
