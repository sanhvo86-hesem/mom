# P04 Defect And Repair Log

Prompt: P04
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P04 commit: 5a96dc7f0d2e82ef78a0f8bfe73d470a69293f08
Decision token: UOM_V5_P04_STANDARD_AUTHORITY_HUMAN_APPROVAL_LOCKED

| ID | Severity | Tag | Finding | Repair | Retest |
|---|---:|---|---|---|---|
| P04-D01 | P0 | REPO_EVIDENCE | `approveManifest()` accepted UUID without RBAC permission or signature meaning. | Added `v_user_canonical` actor load, `roles.permissions` check, signature meaning requirement, and audit write. | `UomStandardLibraryManifest` PASS. |
| P04-D02 | P0 | REPO_EVIDENCE | AI/system free-text actor could be passed as approver unless DB cast failed later. | Reject non-UUID actor before mutation and reject service/system-like usernames. | SIM-P04-01 PASS. |
| P04-D03 | P0 | REPO_EVIDENCE | Historical V3 bridge left manifest/rules active through development/prototype first-user impersonation. | Added migration 257 to quarantine bridge-activated manifest/rules to `pending_review`. | Static grep confirms no new first registered user selection in migration 257. |
| P04-D04 | P1 | REPO_EVIDENCE | `linkRuleToManifest()` did not enforce active/effective window or context-required category. | Added active/effective checks and blocked `density_based`, `potency_assay`, `packaging_policy`, plus non-eligible categories. | SIM-P04-04 and SIM-P04-05 PASS. |
| P04-D05 | P1 | REPO_EVIDENCE | Link SQL set `updated_at`, but `uom_conversion_rule` schema has no `updated_at`. | Removed non-existent column update. | PHPStan and focused tests PASS. |
| P04-D06 | P2 | TEST_EVIDENCE | First test run failed because actor was loaded before non-active manifest rejection. | Reordered `linkRuleToManifest()` to reject non-active/expired manifest before actor load. | Focused test rerun PASS. |
| P04-D07 | P2 | TEST_EVIDENCE | Full `composer check` fails on unrelated KPI registry count drift. | Recorded as warning, not repaired in P04 scope. | Existing failure persists: `148` vs `142`. |

Repair loop result: PASS_WITH_WARNINGS.
