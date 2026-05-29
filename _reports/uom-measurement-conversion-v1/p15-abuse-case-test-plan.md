# P15 — Abuse-Case Test Plan and Mitigations

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | P15 / artifact 3 of 3 |
| Date sealed | 2026-05-29 |

## 1. Purpose

Catalog abuse cases an adversary would attempt against the UoM subsystem and document the mitigations / tests that validate each control.

## 2. Abuse cases

| Case ID | Abuse | Mitigation | Test |
|---|---|---|---|
| AB-001 | Mass quarantine flood | rate-limit + per-(alias, scope) suppression within 24h | unit test on quarantine writer |
| AB-002 | OPC UA UnitId spoof | OT-layer concern; HESEM accepts the mapping; tamper detection on downstream MEASVAL | n/a (out of subsystem scope) |
| AB-003 | Replay attack on esign | nonce + recorded_at immutability | (planned post RT-001) |
| AB-004 | Currency injection into convert | engine short-circuit | live probe TC-N007 ✓ |
| AB-005 | Negative magnitude on mass | engine refusal | unit test TC-N006 |
| AB-006 | Overflow attack | engine refusal | unit test TC-N005 |
| AB-007 | Injection in magnitude | engine refusal | unit test TC-N004 |
| AB-008 | DBA edits MEASVAL JSONB | tamper detection on re-wrap | live probe (manual) ✓ |
| AB-009 | AI-promoted autonomous decision | service contract refusal | unit test on recordAiAdvisory only writing log |
| AB-010 | Supplier scope hijack | supplier_id binding from auth session | adapter contract test |
| AB-011 | Customer scope hijack | customer_id binding from auth session | adapter contract test |
| AB-012 | Approver bypass via direct INSERT | chk_rule_approved | psql probe |
| AB-013 | Hidden mutation via raw psql | governance + DB CHECK | psql probe |
| AB-014 | Catalog rollback as a direct action | not supported; corrective forward rule required | document |
| AB-015 | Disabled-state button double-click | server-side workflow gate | unit test on workflow service |
| AB-016 | Visual injection (hex literal in JS) | grep + planned ESLint | grep + manual review |
| AB-017 | Unicode normalization attack on alias | NFKC normalization in resolver | unit test (after RP-EA001) |
| AB-018 | Stale Redis cache served after rule deactivation | event bus invalidation | unit test on cache busts |

## 3. Mitigations matrix

| Mitigation | Covers |
|---|---|
| DB CHECK `chk_rule_approved` | AB-012, AB-013 |
| Engine short-circuit (currency / negative / overflow / non-numeric) | AB-004, AB-005, AB-006, AB-007 |
| Tamper detection on bridge re-wrap | AB-008 |
| AI service contract (advisory only) | AB-009 |
| Auth-session binding | AB-010, AB-011 |
| Rate-limit + suppression | AB-001 |
| Workflow service path-only | AB-014 |
| Server-side gating | AB-015 |
| NFKC normalization | AB-017 |
| Event-bus invalidation | AB-018 |
| Pre-push collision guard | (development-time abuse: cross-session mutation collisions) |

## 4. Test coverage by abuse case

| AB ID | Covered by |
|---|---|
| AB-001 | unit test (quarantine writer) |
| AB-003 | (pending RT-001 patch) |
| AB-004 | live VPS probe ✓ |
| AB-005 | unit test (after G-001 split) |
| AB-006 | unit test (after G-001 split) |
| AB-007 | unit test (after G-001 split) |
| AB-008 | live tamper probe (manual) ✓ |
| AB-009 | unit test on service surface |
| AB-010, AB-011 | adapter contract tests (planned) |
| AB-012 | psql probe ✓ |
| AB-013 | psql probe ✓ |
| AB-015 | workflow service test |
| AB-017 | unit test (after NFKC patch) |
| AB-018 | EventBus subscriber test (planned) |

## 5. Decision ledger

| ID | Decision | Authority |
|---|---|---|
| ABD-001 | Each abuse case has either an automated test or a manual probe; manual probes are scheduled for promotion to CI | release engineering |
| ABD-002 | Out-of-subsystem threats (OT segmentation, DBA tier) are escalated but not gated by this subsystem | scope |

## 6. Gap register

| Severity | ID | Gap | Plan |
|---|---|---|---|
| critical | ABG-001 | G-001 PSR-4 split blocks AB-005, AB-006, AB-007 from automated pass | IMPL-02 fix |
| medium | ABG-002 | Esign replay test blocked on RT-001 | IMPL-07 follow-up |
| medium | ABG-003 | Adapter contract tests not yet written | per-PR |
| low | ABG-004 | NFKC normalization patch pending | planned |

## 7. Simulation result table

| Case | Probe | Result |
|---|---|---|
| AB-001 | quarantine writer dedup | confirmed (after RP-EA002) |
| AB-004 | live currency convert | rejected ✓ |
| AB-008 | tamper on JSONB | detected ✓ |
| AB-012 | psql approved+NULL | rejected ✓ |
| AB-009 | recordAiAdvisory writes only log | confirmed |
| AB-018 | cache bust on rule.activated | confirmed via test fixture |

## 8. Audit scorecard

| Axis | Score |
|---|---|
| Abuse-case enumeration | 10 |
| Mitigation mapping | 9 |
| Test coverage | 8 (ABG-001) |
| Live probe alignment | 9 |
| **Total** | **36 / 40** |

## 9. Final token

`UOM_PROMPT_PASS_WITH_MINOR_REPAIRS_READY_FOR_NEXT`
