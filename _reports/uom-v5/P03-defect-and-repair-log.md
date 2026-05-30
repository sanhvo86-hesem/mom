# P03 Defect And Repair Log

Branch: codex/uom-v5-no-guess-20260530
SHA at start: 8574a9c3660eb28d27d2bcc52cf254fb945fdf45

| ID | Severity | Defect | Repair | Retest |
|---|---|---|---|---|
| P03-D01 | P0 | Service SQL selected `rule_version` from `uom_conversion_rule` even though DB canonical column is `version`. | Patched workflow, impact analysis, and data-quality scanner SQL to use `version AS rule_version` or join on `r.version`. | `UomLifecycleResolutionTest`, rg verification, focused UoM PHPUnit pass. |
| P03-D02 | P0 | Resolver used only `lifecycle_status = 'approved'` while workflow activates to `active`. | Resolver now uses `lifecycle_status IN ('active', 'approved')` as active target plus legacy compatibility. | Focused unit test verifies SQL predicate. |
| P03-D03 | P0 | Resolver did not enforce `effective_from <= as_of` and used `effective_to >= CURRENT_DATE`. | Resolver now accepts `asOf` and uses `effective_from <= :as_of::date` plus exclusive `effective_to > :as_of::date`. | Focused unit test verifies SQL and parameter. |
| P03-D04 | P0 | Cache key was only from/to. | Cache key now includes from, to, as_of, context hash, lifecycle policy version. | PHPStan and focused tests pass. |
| P03-D05 | Warning | Cache invalidation cannot delete every historic/context key without Redis pattern strategy. | Deletes legacy and current no-context v5 direct/reverse keys; logs TTL residual. | P13 owner for stronger invalidation. |
| P03-D06 | Warning | Full `composer check` red from unrelated KPI test. | Recorded exact failure; focused UoM and PHPStan pass. | KPI owner path outside P03. |

No P03-scoped blocker remains.
