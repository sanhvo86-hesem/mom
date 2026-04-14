# Agent 6 - AI / Analytics / Security / Reliability / DevEx

Date: 2026-04-15

Scope: AI advisory boundaries, analytics projections, scheduler/copilot routes, security/CSRF/roles/audit/replay safety, DevEx validation, tests, docs, and artifacts.

## Findings

| hypothesis | result | severity | evidence | disposition |
|---|---|---:|---|---|
| H1 execution truth file-backed | Confirmed | P1 | JSON compatibility and DB shadow writes still coexist. | Staged bridge retained. |
| H2 mutable snapshot risk | Partially confirmed | P1 | Snapshots remain for compatibility; journals exist. | Explicit event/snapshot docs retained. |
| H3 lifecycle weak | Partially confirmed | P2 | Broader release governance remains staged. | Dispatch redispatch fixed now. |
| H4 validation weak | Mostly refuted | P2 | Dispatch, evidence, NLQ, and schedule validation are present. | No broad change. |
| H5 repeated scans | Partially confirmed | P2 | Operator retrieval is indexed/single-pass; manufacturing-event append fallback was memory-heavy. | Fixed now for append fallback. |
| H6 unsafe authorization | Mostly refuted | P2 | AI reads/writes are role/CSRF/audit gated. | No change. |
| H7 reason-code gaps | Partially confirmed | P2 | EQMS exception reason-code unification remains staged. | Blocked by EQMS workflow consolidation. |
| H8 qualification gaps | Partially confirmed | P2 | Dispatch-report skill policy remains staged. | Blocked by governed skill matrix. |
| H9 inspection gates | Partially refuted | P2 | First-piece gate exists; outbound/OQC gates remain staged. | Staged. |
| H10 digital thread | Mostly refuted | P1 | CNC/setup/inspection fields are carried through execution. | CNC DB authority remains blocker. |
| H11 source drift | Confirmed | P1 | JSON, DB, projection stores are documented and bounded. | No silent promotion. |
| H12 AI detached/unsafe | Mostly refuted | P1 | Advisory routes are explicit; session-local NLQ throttle was residual. | Fixed now: shared user/hour rate ledger. |
| H13 OT/IT controls | Mostly refuted | P1 | CSRF, role gates, XML parser hardening, audit, and replay controls are present. | No broad change. |
| H14 prior debt | Partially confirmed | P1 | Safe AI/security debt mostly closed; NLQ throttle remained. | Fixed now. |
| H15 DevEx validation drift | Confirmed | P2 | Broader `composer check` still has existing debt in mobile work-queue expectation. | Documented blocker. |
| H16 tests too narrow | Confirmed | P2 | Focused tests exist, but full enterprise suite remains fragile. | Added focused lifecycle test; broader coverage staged. |

## Paths inspected

- `mom/api/controllers/AiSchedulingController.php`
- `mom/api/services/NaturalLanguageQueryService.php`
- `mom/api/services/AiPredictionPipeline.php`
- `mom/api/routes/operations-routes.php`
- `mom/tests/Unit/Controllers/SecurityHardeningRegressionTest.php`
- `mom/tests/Unit/Services/MobileWorkQueueServiceTest.php`
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`

