# P17 — UoM Implementation Slice Roadmap with Gates

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | P17 / artifact 2 of 3 |
| Date sealed | 2026-05-29 |

## 1. Purpose

Sequence the IMPL slices in execution order with the gates each must clear, plus the post-VRS-001 phase 2 work that follows.

## 2. Slice sequence

| Order | Slice | Gate to advance |
|---|---|---|
| 1 | IMPL-00 (U0 scope) | scope contract sealed |
| 2 | IMPL-01 (fixture catalog + skeleton) | migrations 214–222, 224, 226 applied + seed verified |
| 3 | IMPL-02 (engine core) | converters + tests pass; engine returns deterministic MEASVAL |
| 4 | IMPL-03 (read-only API) | 10 endpoints live + verified |
| 5 | IMPL-04 (read-only UI) | Control Center + Widget render with Graphics Authority |
| 6 | IMPL-05 (ITUOM resolver) | resolver returns match_level for 8-level chain |
| 7 | IMPL-06 (QC / MES bridge) | bridge wraps a synthetic inspection_result successfully |
| 8 | IMPL-07 (workflow + scanner + VRS-001) | readiness gate document sealed |

## 3. Phase 2 (post-VRS-001)

| Theme | Work |
|---|---|
| Gap repairs | G-001 PSR-4 split; OG-001 OpenAPI block; G-003 canonical contracts; RT-001 signature payload; RT-003 tamper-on-read; WG-001 admin tamper notification |
| Consumer wiring | Inventory, Procurement, Sales, BOM, QC, MES per-domain PRs |
| Extended seed | UNECE Rec20 long-tail; OPC UA vendor namespaces; LIMS extensions; substance density extensions |
| Bench harness | engine throughput + latency benches under load |
| Tracing | W3C Trace Context propagation through bridge |
| Visual regression | composite Control Center baselines |
| Production cutover gate | separate prompt; not in this package |

## 4. Critical paths

- G-001 (PSR-4 exception split) blocks 9 negative-test cases from auto-passing → blocks full VRS-001 sign-off.
- OG-001 (OpenAPI block) blocks external SDK generation → does not block live operations.
- RT-001 (signature payload) blocks formal Part 11 §11.50 e-sign compliance → blocks production cutover.
- RT-003 (tamper-on-read) materially reduces tamper-detection window → improvement, not blocker.

## 5. Decision ledger

| ID | Decision | Authority |
|---|---|---|
| RM-001 | Slice order is strict; out-of-order IMPL is not permitted | runbook |
| RM-002 | Phase 2 work is owned by separate per-PR follow-ups | scope |
| RM-003 | Production cutover gate is a separate prompt, outside this package | scope |
| RM-004 | Critical path items are ordered by regulatory blocker first | governance |

## 6. Gap register

| Severity | ID | Gap | Plan |
|---|---|---|---|
| medium | RG-001 | Phase 2 work items not yet ticketed | release engineering |
| low | RG-002 | Production cutover gate prompt not yet authored | future package |

## 7. Audit scorecard

| Axis | Score |
|---|---|
| Sequencing clarity | 10 |
| Gate definition | 10 |
| Phase 2 enumeration | 9 |
| Critical-path identification | 10 |
| **Total** | **39 / 40** |

## 8. Final token

`UOM_PROMPT_PASS_READY_FOR_NEXT`

## 9. Cross-references

- Sibling: `mom/docs/ai-prompts/uom-measurement-conversion-v1/implementation-slice-factory.md` (P17 / 1)
- Audit: `_reports/uom-measurement-conversion-v1/p17-implementation-readiness-audit.md` (P17 / 3)
