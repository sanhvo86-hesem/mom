# Portal access regression results — Phase 2F

- Executed against: ROLE_DOCS + normalizeDocPattern + override logic + hidden-doc filter + custom-doc registry + canCreateDocs flags
- Generated at: 2026-03-20T05:25:31.123Z
- Total scenarios: 23
- PASS: 23
- FAIL: 0
- Hidden docs in config: 1
- Custom docs in registry: 2

## Scenario groups
- alias: 3/3 PASS
- authority: 2/2 PASS
- custom-create: 2/2 PASS
- custom-doc: 2/2 PASS
- digital-admin: 2/2 PASS
- hidden-doc: 2/2 PASS
- jd-access: 2/2 PASS
- kpi: 1/1 PASS
- maintenance: 1/1 PASS
- measurement: 1/1 PASS
- override-deny: 1/1 PASS
- override-grant: 1/1 PASS
- production-gate: 1/1 PASS
- supply-chain: 1/1 PASS
- warehouse: 1/1 PASS

## Detailed results

| ID | Kind | Role/Pattern | Doc code | Expected | Actual | Result |
|---|---|---|---|---:|---:|---|
| ROLE-001 | doc-access | ceo | ANNEX-120 | TRUE | TRUE | PASS |
| ROLE-002 | doc-access | cnc_operator | ANNEX-120 | FALSE | FALSE | PASS |
| ROLE-003 | doc-access | finance_manager | ANNEX-122 | TRUE | TRUE | PASS |
| ROLE-004 | doc-access | qa_manager | ANNEX-124 | TRUE | TRUE | PASS |
| ROLE-005 | doc-access | cnc_operator | ANNEX-124 | FALSE | FALSE | PASS |
| ROLE-006 | doc-access | buyer | FRM-412 | TRUE | TRUE | PASS |
| ROLE-007 | doc-access | warehouse_clerk | FRM-413 | TRUE | TRUE | PASS |
| ROLE-008 | doc-access | shift_leader | FRM-511 | TRUE | TRUE | PASS |
| ROLE-009 | doc-access | maintenance_technician | FRM-521 | TRUE | TRUE | PASS |
| ROLE-010 | doc-access | qc_inspector | FRM-602 | TRUE | TRUE | PASS |
| ROLE-011 | doc-access | cnc_operator | JD-FINANCE-MANAGER | FALSE | FALSE | PASS |
| ROLE-012 | doc-access | hr_manager | JD-FINANCE-MANAGER | TRUE | TRUE | PASS |
| CUST-001 | doc-access | shift_leader | WI-519-CUSTOM-PRE-RUN-GATE-CHEATSHEET | TRUE | TRUE | PASS |
| CUST-002 | doc-access | buyer | WI-519-CUSTOM-PRE-RUN-GATE-CHEATSHEET | FALSE | FALSE | PASS |
| HIDE-001 | doc-access | shift_leader | WI-519-CUSTOM-HIDDEN-PILOT-NOTE | FALSE | FALSE | PASS |
| HIDE-002 | doc-access | ceo | WI-519-CUSTOM-HIDDEN-PILOT-NOTE | FALSE | FALSE | PASS |
| CREATE-001 | custom-create | qa_manager |  | TRUE | TRUE | PASS |
| CREATE-002 | custom-create | cnc_operator |  | FALSE | FALSE | PASS |
| ALIAS-001 | alias-match | REF-012* | ANNEX-113 | TRUE | TRUE | PASS |
| ALIAS-002 | alias-match | REF-020* | ANNEX-503 | TRUE | TRUE | PASS |
| ALIAS-003 | alias-match | REF-021* | ANNEX-119 | TRUE | TRUE | PASS |
| OVR-001 | doc-access | production_planner | ANNEX-124 | TRUE | TRUE | PASS |
| OVR-002 | doc-access | qa_manager | ANNEX-113 | FALSE | FALSE | PASS |