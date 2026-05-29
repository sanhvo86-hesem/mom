# P23 Gap Severity Reclassification And Blocker Policy

REPO_ROOT=/Users/a10/Documents/mom-mda-v3-runtime-20260529
REPORT_DIR=_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29
PROMPT_ID=P23
IMPLEMENTATION_MODE=apply_patch_report_and_policy
DATE=2026-05-29
PREVIOUS_HANDOFF=_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/P22_HANDOFF_PACKET.md

## 1. Executive Verdict

P23 reclassified all 71 prior controlled gaps. The V1/V2 `P2 controlled_gap` labels are no longer accepted for authority-path issues. Current result:

| Severity | Count | Meaning |
|---|---:|---|
| P0 | 15 | Runtime authority blockers. |
| P1 | 52 | Pre-production, regulated-mode, cutover, UI, observability, or final-acceptance blockers. |
| P2 | 4 | Benchmark/documentation refresh debt only. |

Decision token:

```text
P23_PASS_WITH_CONTROLLED_GAPS
```

Rationale: No P0 remains mislabeled as P2, every P0/P1 blocker has owner prompt, dependent prompt, acceptance criterion, and expiry/exception rule, and the policy aligns with `docs/backend/RUNTIME_AUTHORITY_MAP.md`. Open P0 blockers prevent runtime-authority claims but do not block P24 from creating the runtime proof matrix.

## 2. Source Truth Audit

| Source | Evidence Summary | P23 Use |
|---|---|---|
| `P22_HANDOFF_PACKET.md` | Required P23 to reclassify prior P2 authority-path gaps. | Start condition. |
| `MDA_CONTROLLED_GAP_LEDGER.csv` | 71 gap rows. | Reclassification source. |
| `MDA_EXTERNAL_REDTEAM_REPORT.md` | Prior pack is planning material, not runtime-complete. | Prevent false readiness. |
| `MDA_FINAL_MASTER_BUILD_PLAN.md` | Identifies implementation waves. | Owner prompt mapping. |
| `docs/backend/RUNTIME_AUTHORITY_MAP.md` | States PostgreSQL authority, command mutation, JSON compatibility, Generic CRUD non-authority. | Severity policy anchor. |
| `docs/backend/DOMAIN_COMMAND_SPEC.md` | Command layer must replace direct business mutation and includes e-sign/idempotency/outbox expectations. | P0/P1 command blockers. |
| `docs/backend/POSTGRES_MIGRATION_AND_SYNC_SPEC.md` | Defines JSON_ONLY, SHADOW_WRITE, POSTGRES_PRIMARY, POSTGRES_ONLY and cutover exit criteria. | Cutover blocker policy. |
| `mom/contracts/table-registry.json` | Confirms runtime registry exists but is not business authority. | Prevent registry-only readiness claims. |
| `mom/database/migrations/` | UOM, inventory, quality, workflow, and governance schemas exist in pieces. | Distinguish schema existence from runtime authority. |
| `mom/api/services/` and `mom/api/controllers/` | MasterDataService still reports `compatibility_only`; GenericCrudController is a guard; dedicated command coverage remains incomplete. | P0/P1 evidence. |
| `mom/tests/` | Existing tests cover some guards but not full runtime authority proof. | P24 proof matrix input. |

## 3. Runtime Evidence Probe

Required command summaries:

```text
pwd -> /Users/a10/Documents/mom-mda-v3-runtime-20260529
git status --short -> clean before P23 edits
git rev-parse --short HEAD -> a1e296b70
gap rows -> 71
```

Discovery results:

| Probe | Result |
|---|---|
| Prior report inventory | Required prior MDA files present. |
| Token/runtime grep | Prior pack repeatedly uses `PASS_WITH_CONTROLLED_GAPS`; red-team explicitly says not runtime-complete. |
| Master data probe | `MasterDataService::authorityProbe()` maps JSON to `compatibility_only`; `JsonMasterDataRepository` is still present. |
| Generic CRUD probe | `GenericCrudController` guard exists and tests exist, but docs say this is mitigation not command authority. |
| UOM probe | UOM and conversion schema/registry exist, but V1/V2 ledger says runtime authority chain is intentionally not closed in this branch. |
| Quality hold probe | `DOMAIN_COMMAND_SPEC.md` defines `ApplyQualityHold` and `ReleaseQualityHold`, while `RUNTIME_AUTHORITY_MAP.md` still reports fragmented JSON/JSONL/PG authority. |
| Inventory probe | `RUNTIME_AUTHORITY_MAP.md` says inventory is schema/generic-heavy with no complete inventory command service found. |
| MES readiness probe | No implemented `ResourceReadinessService` was found; prior P08/P14 mark it design-only. |
| Simulation probe | Scenario libraries reconcile by count, but executable DSL runner is absent and reclassified P1. |

## 4. Files Changed / Files Intentionally Not Changed

Files created:

| File | Purpose |
|---|---|
| `P23_MAIN.md` | Main P23 execution report. |
| `MDA_V3_GAP_SEVERITY_RECLASSIFICATION.csv` | Reclassifies all 71 gaps. |
| `MDA_V3_RUNTIME_BLOCKER_POLICY.md` | Authoritative P23 blocker policy for V3 reports. |
| `MDA_V3_P0_P1_BLOCKER_REGISTER.csv` | P0/P1 blocker register with owner and acceptance gates. |
| `P23_HANDOFF_PACKET.md` | Handoff to P24. |
| `docs/backend/MDA_RUNTIME_BLOCKER_POLICY.md` | Stable backend policy mirror for implementation prompts. |

Intentionally not changed:

| File Class | Reason |
|---|---|
| Runtime PHP services/controllers | P23 scope is report and policy generation only. |
| Database migrations | Physical schema remediation starts in later owner prompts. |
| UOM implementation files | User explicitly warned not to touch concurrent UOM work. P23 only classifies UOM as P0. |
| Existing V1/V2 reports | Prior evidence remains immutable history. |

## 5. Design Or Code Delta

The key design delta is a harder severity model:

| Old Treatment | V3 P23 Treatment |
|---|---|
| P2 controlled gaps could pass as planning debt. | Authority-path gaps are P0/P1 blockers. |
| Generic CRUD guard could be considered partial mitigation. | Guard is not mutation authority and remains P0 until command coverage is proven. |
| Schema existence could support readiness language. | Schema without command/evidence/test chain is not runtime proof. |
| Scenario count could support simulation coverage. | Narrative scenarios are P1 until executable runner evidence exists. |

## 6. Operational Simulation Matrix

| scenario_id | initial_state | actor | command/action | expected_gate | data_written | event_written | audit/evidence | rollback/retry | expected_result | failure_if_missing | test_to_add |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SIM-P23-001 | JSON primary gap marked P2 | P23 reviewer | Reclassify gap | JSON-primary governed path is P0 | Reclassification CSV | None | P0 register row | Re-run classifier | P0 owner P27 | False PG readiness | P24 classifier parity check |
| SIM-P23-002 | UOM deferred but inventory work starts | P23 reviewer | Check dependency | UOM ambiguity blocks runtime authority | Reclassification CSV | None | P0 register row | Re-run after P25 | P25 owns P0 | Inventory converts with local defaults | P25 UOM authority proof |
| SIM-P23-003 | Generic CRUD guard exists but commands incomplete | P23 reviewer | Compare guard and command spec | Guard cannot satisfy mutation authority | Policy doc | None | P0 register row | Re-run after P26/P31 | P0 remains until command APIs own mutations | Guard mistaken for authority | P26 mutation-deny test |
| SIM-P23-004 | E-sign design exists but generator absent | P23 reviewer | Apply regulated-mode rule | E-sign generator absence is P1 | P1 register row | None | Regulated-mode expiry | Re-run after P32 | Regulated claims blocked | Part 11 evidence incomplete | P32 parity/e-sign test |
| SIM-P23-005 | Simulation is paper-only | P23 reviewer | Check scenario evidence | Executable runner absence is P1 | P1 register row | None | P38 owner mapping | Re-run after P38 | Final acceptance blocked until executable | Narrative-only final scorecard | P38 runner smoke test |
| SIM-P23-006 | Inventory balance can mutate without command ledger proof | P23 reviewer | Apply inventory authority rule | Ledger/reconciliation gap is P0 | P0 register row | None | P36 owner mapping | Re-run after P36 | Runtime inventory claim blocked | Financial inventory drift | P36 ledger invariant test |
| SIM-P23-007 | Resource readiness service missing | P23 reviewer | Apply MES readiness rule | Readiness absence is P0 | P0 register row | None | P34 owner mapping | Re-run after P34 | MES runtime claim blocked | WO start bypasses PM calibration operator tool gates | P34 release/start gate test |

## 7. Multi-Role Adversarial Audit

| Role | Challenge | Result |
|---|---|---|
| Manufacturing architect | P0 inflation could block too much. | Accepted only for runtime authority claims; remediation prompts may still proceed. |
| Database authority reviewer | Schema existence may be mistaken for authority. | Policy requires command plus reconciliation plus evidence. |
| MES reviewer | Readiness service absence must be P0. | Classified P0 for P08/P14 readiness gaps. |
| Quality reviewer | Canonical hold absence must block shipment and inventory movement claims. | Classified P0 for quality hold fragmentation. |
| Finance/inventory reviewer | Balance mutation without ledger proof must block runtime. | Classified inventory reconciliation as P0. |
| Security reviewer | Generic CRUD guard is not enough. | Classified command coverage and Generic CRUD risks as P0. |
| Regulatory reviewer | E-sign/audit generator absence must block regulated mode. | Classified P13 generator and approval policy as P1. |
| SRE reviewer | Narrative scenarios cannot be final validation. | Classified runner and dashboard gaps as P1. |
| Release manager | P23 should not stop all progress. | Decision allows P24 and remediation prompts while blocking readiness claims. |

## 8. Gap Ledger Update

| Severity | Count | Owner Prompts |
|---|---:|---|
| P0 | 15 | P25 P26 P27 P30 P31 P33 P34 P36 |
| P1 | 52 | P27 P29 P30 P31 P32 P33 P34 P35 P36 P37 P38 P39 P40 P41 |
| P2 | 4 | P23 P24 |

P2 is now restricted to benchmark/documentation refresh work that does not affect runtime authority.

## 9. CI/Test Evidence

Commands run:

```text
python3 gap row count -> gap rows 71
rg authority probes over docs/backend mom contracts migrations tests
find migrations and tests inventory
```

P23 has no runtime PHP code changes. Full `composer test` was not run for this report-only policy prompt. `git diff --check` is run after artifact creation before commit.

## 10. Decision Token

```text
P23_PASS_WITH_CONTROLLED_GAPS
```

## 11. Handoff Packet

```text
_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/P23_HANDOFF_PACKET.md
```
