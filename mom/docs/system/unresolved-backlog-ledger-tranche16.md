# Unresolved Backlog Ledger - Tranche 16

Date: 2026-04-15

| Source Prompt / Doc | Original Expected Outcome | Current Verified Status | Evidence | Why Still Open | Code-Fixable Now | Action In This Run |
| --- | --- | --- | --- | --- | --- | --- |
| User screenshots: Registry vs PostgreSQL | Runtime DB connects cleanly to frontend; no missing migration/publishability blockers. | CLOSED_LOCAL | Schema authority 9/9; publication truth 256/256; migration 132 present. | VPS proof remains pending until deploy. | Yes | Added/verified migration and proof gates. |
| User screenshots: release blocked by registry quality report | Publishability blockers reflect real code state and do not overstate readiness. | CLOSED_LOCAL | Publication truth gates J/K/W pass. | None locally. | Yes | Strengthened publication truth script and diagnostics. |
| User report: File Explorer admin tab cannot return | File Explorer behaves like other admin tabs. | ALREADY_FIXED | Prior portal route/navigation changes retained; not regressed by tranche16. | None locally. | Already fixed | Preserved behavior. |
| Tranche15/closure docs | E-signature records require challenge trust linkage. | CLOSED_LOCAL | Migration 132 FK and orphan precheck; migration unit test. | External Part 11 validation remains. | Yes | Implemented relational integrity proof. |
| Tranche15/closure docs | Explicit field changes after release require one-shot authority. | CLOSED_LOCAL | Change authority tests and unconsumed index. | None locally. | Yes | Added lookup/index/test proof. |
| Pass-1 Agent 5 | Rate-limit fallback must not fail open. | CLOSED_LOCAL | `RateLimitMiddlewareTest::testFileStoreUnavailableFailsClosed`. | None locally. | Yes | Added 503 fail-closed path. |
| Pass-1 Agent 5 | Cache fallback and deploy health must expose runtime write failures. | CLOSED_LOCAL | Cache fallback health test; postdeploy critical dirs. | VPS deploy proof pending. | Yes | Added health fields/logs and hard health gates. |
| Pass-1 Agent 4/6 | Genealogy reads must not allow broad enterprise-only leakage. | CLOSED_LOCAL | Traceability tests reject broad enterprise-only scope. | Full multisite rollout proof remains. | Yes | Added/kept partition-scope guards. |
| Standards benchmark | OTel collector, live trace context, metrics/logs correlation. | BLOCKED_EXTERNAL | No collector/exporter deployment in repo. | Requires external telemetry backend and operational config. | No | Document blocker only. |
| Standards benchmark | Full Part 11 compliance package and WORM retention. | BLOCKED_EXTERNAL | Code has scoped controls, not validation package. | Requires SOPs, validation, identity/retention/audit process. | No | Document blocker only. |
| Vendor benchmark | Full APS/SPC/SCAR/connected training suite parity. | PRODUCT_DECISION_REQUIRED | Repo contains slices, not full vendor-suite feature scope. | Requires roadmap/product ownership. | Not as a closure bug | No broad rewrite. |

