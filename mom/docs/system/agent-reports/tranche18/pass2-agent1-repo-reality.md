# Tranche 18 Pass 2 - Agent 1 Repo Reality Reaudit

Date: 2026-04-15

Scope: current integration branch `codex/tranche18-zero-trust-signoff-20260415`.

## Pass-2 Findings

| Area | Verdict before fix | Pass-2 issue | Fixed in this run |
| --- | --- | --- | --- |
| BaseController scope helpers | VERIFIED_COMPLETE | No defect after helper rename avoided `EqmsControlPlaneController` collision | Yes |
| Planning scenario scope | PARTIAL | Read/write paths still used org-only checks | Yes: controller now passes partition scope; service enforces site/plant on detail, feasibility, capacity, approve, publish |
| Trusted release scope | PARTIAL | `verifyPacketScope()` allowed missing packet scope fields | Yes: missing session or packet site/plant now fails closed |
| Queue fallback health | PARTIAL | `json_encode()` failure and queue rewrite/swap failures could be hidden | Yes: encoding/rewrite/truncate failures increment health counters |
| Tranche16 docs | DOC_DRIFT | Stale 256/256 evidence needed current re-verification context | Yes: docs now record tranche16 evidence and tranche18 271/271 re-verification |

## Verification

- Focused tests after fixes: `PlanningReleaseScopeAuthorityTest|PlanningScenarioServiceTest|HealthControllerRuntimeAuthorityTest|QueueServiceFallbackTest|AuditMiddlewareFallbackHealthTest` -> 31 tests, 175 assertions.
- PHPStan after fixes: no errors.

## Verdict

Pass-2 code-fixable repo-reality findings are closed on the integration branch.
