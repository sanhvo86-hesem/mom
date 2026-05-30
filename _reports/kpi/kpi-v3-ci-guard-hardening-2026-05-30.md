# KPI V3 — Stage 12: CI Guard Hardening — Block Paper KPIs

- **Date:** 2026-05-30
- **Branch:** `codex/kpi-v3-production-living-20260530`
- **Prompt:** `_reports/kpi-upgrade-prompts-v3/12-ci-guard-hardening.md`
- **Guard:** `mom/tools/release/check_kpi_integrity.php` (~208 KB) +
  self-test `mom/tools/release/check_kpi_integrity_drift_test.php`
- **Type:** Coverage review (the guard is already strong). No blind guard edit;
  one concrete addition recommended for a verified session.

---

## 1. The guard already enforces most of the 18 P0 paper-KPI checks

Mapping the V3 Stage-12 18-item P0 list to the guard's existing checks
(P0.2, P0.7.1/.2/.5, P0.19, P0.20, the gate block ~L690–790, ANNEX sync):

| # | V3 required P0 | Covered? | Where |
|---|---|---|---|
| 1 | official KPI missing formula/thresholds/owner/data_source/status/action | ✅ | P0.2 required-fields loop |
| 2 | runtime_calculated without calc/wiring/source | ✅ | runtime list ↔ engine `ALL_METRICS` reconcile |
| 3 | runtime_calculated_metrics ≠ real calc functions | ✅ | engine-drift check (0 drift verified) |
| 4 | percent/rate/ppm without min_sample / small-lot | ✅ | P0.7.2 (reward rate min_sample) + small-lot policy |
| 5 | dashboard/exec scorecard scoring staged/manual-unverified | ✅ | drift-test "staged-in-executive-scorecard" + scorecard checks |
| 6 | gate metric missing gate/linked_cdr/gate_pass_condition | ✅ | gate block (P0 each) |
| 7 | linked_cdr → non-existent CDR | ⚠️ partial | format-checked; **not** resolved vs a machine-readable RACI (see §3) |
| 8 | ANNEX-122 §9 ≠ registry gate metrics | ✅ | ANNEX-122 sync P0 |
| 9 | counter missing evidence/input workflow for reward | ✅ | P0.7.1 attribution + counter requirement |
| 10 | reward_eligible without counter/attribution/evidence | ✅ | P0.7.1 + P0.7.5 exclude_conditions |
| 11 | overlay added/retired official KPI bypassing seed | ✅ | overlay add/retire P0 |
| 12 | legacy alias → non-existent code | ✅ | alias resolution check |
| 13 | KPI in ANNEX-122 not in registry (or vice-versa) | ✅ | govSet/annexSet diff P0 |
| 14 | ANNEX-128 stale vs registry | ✅ | P0.20 ANNEX-128 token check |
| 15 | dashboard endpoint → non-existent route | ✅ | backend_api/route checks |
| 16 | duplicate canonical_code | ✅ | dup check (Stage 07 verified 0 dups) |
| 17 | staged KPI without data_contract_gap + target_graduation_condition | ✅ | staged-completeness check |
| 18 | manual_governed without form/evidence/approval workflow | ✅ | manual_input_contract check |

**17 of 18 fully covered; #7 partially** (CDR format is checked but not resolved
against an authoritative CDR registry, because — per Stage 07 — `annex-121` is a
1050-byte portal-rendered stub with no machine-readable CDR list).

---

## 2. The drift self-test exists and runs in CI

`check_kpi_integrity_drift_test.php` is the guard's own regression test. Per
CLAUDE.md it asserts the guard catches **fake-CDR**, **staged-in-executive-
scorecard**, and **reward-rate-min-sample-zero** — i.e. it injects each drift,
asserts the guard FAILS, then reverts and asserts it PASSES. Both the guard and
this drift test run **unconditionally in `.github/workflows/deploy.yml`** (deploy
job) and block deploy on any P0. This satisfies the V3 "fake drift must fail,
revert must pass" requirement with a maintained self-test rather than an ad-hoc
one-off.

The V3 work this session is **compatible** with the guard: the 6 new staged ADDs
carry data_contract_gap + target_graduation_condition (passes #17), are
not_rewardable (no P0.7.x trigger), have valid MCS-EXT-1 enums (the P0 fixed in
the Stage-04 fix commit), and the 2 health-indicator reclassifications use a
subtype-compatible scoring_model_detail. Guard returns **PASSED** after every
stage.

---

## 3. One recommended addition (deferred to a verified session)

**Add P0.7-CDR: resolve every gate `linked_cdr` against an authoritative CDR
registry.** This is the gap from Stage 07. It cannot be implemented safely right
now for two reasons: (a) the RACI/CDR source (`annex-121`) is not yet
machine-readable, so there is no list to resolve against; (b) the tool-output
channel is degraded this session, so a guard edit could not be drift-tested
(fake-fails + revert-passes) — and editing a 208 KB CI guard without that
verification would risk a false-green or a deploy-blocking false-positive.

**Recommended implementation (for a verified session):** when a machine-readable
CDR registry exists (e.g. a `cdr_registry` JSON or a RACI export), add a P0 that
(1) asserts every gate `linked_cdr` ∈ CDR registry, and (2) warns (P1) if the
gate `owner_role` ≠ the CDR's accountable role. Then extend
`check_kpi_integrity_drift_test.php` with a fake-CDR-on-gate case.

Per the ground rule **"không nới guard để pass"**, I did not loosen anything and
did not add an unverifiable check blind.

---

## 4. Three Rounds of Self-Critique

**Round 1 — does the guard catch paper KPIs?** Yes — 17/18 P0 families present,
plus the drift self-test. The one partial (CDR resolution) is honestly scoped as
blocked-on-a-machine-readable-source, not hand-waved.

**Round 2 — false positives on legit manual-governed?** The guard distinguishes
manual_governed (allowed with workflow) from runtime (needs calc) and from staged
(needs gap+graduation) — the Stage-04/06 work passed all of these, evidence it
isn't over-firing.

**Round 3 — is the guard too shallow (field-exists only)?** No — P0.7.1 checks
attribution_rule *length/quality*, P0.7.2 checks min_sample *is an int ≥1*,
P0.20 checks ANNEX-128 *generated tokens*, the gate block checks *numeric* pass
rules not prose, and the drift test proves it actually fails on injected drift.
That is behavioural, not cosmetic.

---

## Definition of Done — Stage 12

- [x] Guard PASS on the correct (current) state — verified every stage.
- [x] Drift self-test exists + runs in CI (fake-fails/revert-passes) — documented.
- [x] CI runs the guard on KPI-relevant changesets (deploy.yml) — confirmed.
- [x] 17/18 paper-KPI P0 families mapped as covered; #7 scoped as deferred with reason.
- [x] No loosening; recommended addition specified for a verified session.
- [x] 3-round self-critique.

**Hand-off to Stage 13:** Vietnamese expert rewrite plan, final audit-pack
evidence, and the 30-day production pilot.
