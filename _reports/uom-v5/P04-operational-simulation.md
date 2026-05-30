# P04 Operational Simulation

Prompt: P04
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P04 commit: 5a96dc7f0d2e82ef78a0f8bfe73d470a69293f08
Decision token: UOM_V5_P04_STANDARD_AUTHORITY_HUMAN_APPROVAL_LOCKED

## Required P04 Simulations

- SIM-P04-01 AI actor tries to approve manifest:
  - TEST_EVIDENCE: `testApproveManifestRejectsAiOrSystemActor`
  - Result: PASS, `UOM_MANIFEST_AI_OR_SYSTEM_ACTOR_FORBIDDEN`.

- SIM-P04-02 User without permission tries to approve:
  - TEST_EVIDENCE: `testApproveManifestRejectsUserWithoutPermission`
  - Result: PASS, `UOM_MANIFEST_APPROVE_FORBIDDEN`.

- SIM-P04-03 Permissioned human approves BIPM_SI manifest:
  - TEST_EVIDENCE: `testApproveManifestAllowsPermissionedHumanAndWritesAudit`
  - Result: PASS, lifecycle becomes active and audit event is written.

- SIM-P04-04 `packaging_policy` rule tries to link BIPM SI manifest:
  - TEST_EVIDENCE: `testLinkRuleToManifestRefusesPackagingPolicyRule`
  - Result: PASS, `UOM_MANIFEST_RULE_CONTEXT_REQUIRED`.

- SIM-P04-05 Expired manifest sponsors a rule:
  - TEST_EVIDENCE: `testLinkRuleToManifestRefusesExpiredManifest`
  - Result: PASS, `UOM_MANIFEST_NOT_EFFECTIVE`.

## Generic Simulation Matrix

- Golden case pass:
  - Permissioned human + active manifest + audit write passes.
- Negative case:
  - AI actor and no-permission actor fail with explicit UoM problem codes.
- Boundary precision/overflow:
  - CONTROLLED_GAP: P04 does not touch numeric conversion. Covered by focused UoM/Decimal tests and assigned to P05.
- Permission denied:
  - PASS, `UOM_MANIFEST_APPROVE_FORBIDDEN`.
- Stale cache/effective date:
  - PASS for manifest effective date. Conversion cache remains P05/P13.
- Audit hash replay:
  - PASS for audit payload content. No hash chain was added in P04.
- External alias quarantine:
  - OUT_OF_SCOPE_BLOCKER: P06.
- UI/API parity:
  - OUT_OF_SCOPE_BLOCKER: P10/P11.

## Commands

- `composer --working-dir=mom run test -- --filter UomStandardLibraryManifest`: PASS, 11 tests, 16 assertions.
- `composer --working-dir=mom run test -- --filter 'UomStandardLibraryManifest|UomLifecycleResolution|Uom|Decimal|Conversion'`: PASS, 110 tests, 194 assertions, 1 skipped.

Simulation result: PASS_WITH_WARNINGS.
