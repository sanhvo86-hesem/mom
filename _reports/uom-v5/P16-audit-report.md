# P16 Audit Report

Prompt: P16  
Branch: `codex/uom-v5-no-guess-20260530`  
Current SHA before P16 commit: `7ce0f8539`  
Decision token: `UOM_V5_P16_FINAL_REDTEAM_PASS_PREPROD_READY_CANDIDATE`

## Static Audit

1. REPO_EVIDENCE: No UoM hidden authority path was found. Mutation authority remains service/controller/migration governed.
2. REPO_EVIDENCE: UI remains projection-first. API fetch is gated by `localStorage.getItem('uom_live_api') === '1'`.
3. REPO_EVIDENCE: Manifest approval rejects AI/system actors and users without explicit permission.
4. REPO_EVIDENCE: External/free-text aliases resolve to canonical code or quarantine.
5. REPO_EVIDENCE: Conversion rule resolution filters lifecycle status and effective date.
6. REPO_EVIDENCE: Contextual conversions require density, potency, or item-packaging evidence.
7. TEST_EVIDENCE: UoM focused tests passed.
8. TEST_EVIDENCE: PHPStan passed.
9. TEST_EVIDENCE: Report wording scan over `_reports/uom-v5` passed after repair.
10. OUT_OF_SCOPE_WARNING: Full `composer check` failed only on KPI registry drift.

## Required Questions

1. Multi-site, multi-supplier, multi-language weakness: CONTROLLED_GAP. Domain contracts exist, but site/customer-specific enforcement must still be implemented in domain command paths.
2. Factor-only affine/log/contextual unit risk: TEST_EVIDENCE. Affine/log/contextual negative tests and dispatch prevent factor-only shortcuts.
3. Naked number leakage: TEST_EVIDENCE. UI, MEASVAL scanner, and P12/P15 backlog block or classify naked numbers.
4. Canonical/quarantine bypass: TEST_EVIDENCE. Alias tests and OpenAPI contract require quarantine for ambiguous or unknown external values.
5. AI authority: TEST_EVIDENCE. AI actor approval is rejected; AI is advisory only.
6. Fake permissions: TEST_EVIDENCE. Manifest tests require explicit permission and do not select a first user.
7. Schema/service drift: TEST_EVIDENCE. Lifecycle tests lock `version AS rule_version` use.
8. Cache stale rule risk: REPO_EVIDENCE. Rule lookup includes lifecycle and effective window; P13 cache contract requires effective context.
9. Rollback: REPO_EVIDENCE. P16 rollback is source-only; prior migration rollbacks are documented.
10. Historical replay evidence: TEST_EVIDENCE. MEASVAL hash and rule version tests pass.

## Diff Audit

- Forbidden files changed: PASS. P16 only adds reports and rewords report posture lines.
- Hidden authority: PASS.
- Live API default: PASS. UI remains fixture-default.
- AI authority: PASS.
- Wrong posture wording: PASS after repair.

## Acceptance Gates

- Audit complete: PASS.
- Residual defects repaired or classified: PASS.
- No hard gate red: PASS.

## Decision

PASS_WITH_WARNINGS. UoM V5 is a pre-production readiness candidate with one unrelated full-suite warning.
