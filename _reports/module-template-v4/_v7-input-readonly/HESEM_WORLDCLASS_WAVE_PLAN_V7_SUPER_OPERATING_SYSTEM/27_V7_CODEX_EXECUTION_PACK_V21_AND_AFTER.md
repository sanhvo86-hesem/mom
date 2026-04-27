# 27 — Codex Execution Pack: V21 and After
## Immediate execution order

1. Run V21 Phase 2 integration review and repair coordinator.
2. Classify stream status.
3. Fix or defer Chromium baseline with explicit decision.
4. Re-run full HMV4 E2E.
5. Review CAPA, NQCASE live API, Backend C2 warnings.
6. Produce go/no-go report.
7. Only then start Phase 3 planning.

## V21 output files

- `_reports/module-template-v4/V21_PHASE2_CURRENT_MAIN_VERIFICATION_REPORT.md`
- `_reports/module-template-v4/V21_PHASE2_STREAM_STATUS_MATRIX.md`
- `_reports/module-template-v4/V21_CROSS_BROWSER_CHROMIUM_BASELINE_REPAIR_PLAN.md`
- `_reports/module-template-v4/V21_PHASE2_INTEGRATION_REVIEW_REPORT.md`

## Post-V21 prompt sequence

| Prompt | When to use |
| --- | --- |
| CODEX_V21_PHASE2_INTEGRATION_REVIEW_AND_REPAIR_COORDINATOR | now |
| CODEX_SLICE_FACTORY_TEMPLATE | after V21 pass |
| ROOT_SCOPE_CONTRACT_TEMPLATE | before each root/slice |
| WAVE_GATE_REPORT_TEMPLATE | end of every wave |
