# P02 Contradiction Ledger

Prompt: P02 Repo Reality Lock and Contradiction Ledger
Branch: codex/uom-v5-no-guess-20260530
SHA at start: 247b1fbeabfe8bd07feb3d2265a8c2ec0ec625a4
Posture: development/prototype -> pre-production readiness candidate only; not a live regulated release.

## Confirmed Contradictions

| ID | Severity | Evidence | Impact | Owner prompt | Proposed repair |
|---|---|---|---|---|---|
| P02-C01 | P0 | `mom/database/migrations/217_uom_conversion_rule.sql:8` defines `version`; `mom/api/services/Uom/UomWorkflowService.php:151`, `:193`, `:196`, `:298`, `:309`, `:426` use `rule_version` from `uom_conversion_rule`. | Approval status/list/create path can fail against DB column reality. | P03 | SELECT `version AS rule_version`; join approvals on `a.rule_version = r.version`; update manifest builder row mapping and tests. |
| P02-C02 | P0 | `ConversionRuleService.php:80` and `:102` filter `lifecycle_status = 'approved'`; `UomWorkflowService.php:394` activates rules to `active`; migration 231 broadens lifecycle to include `active`. | Newly e-signed active rules may not resolve. | P03 | Define runtime lifecycle policy; prefer active plus documented legacy approved compatibility; add tests for active/pending/future/expired. |
| P02-C03 | P0 | `ConversionRuleService.php:54` cache key is `uom:rule:{from}:{to}`; comments at `:17` describe same; no as-of/context/lifecycle component. | Future/expired/context-bound rule can leak through cache. | P03/P13 | Include from/to/as_of/lifecycle policy/context hash; invalidate direct/reverse keys after activation/deprecation/retirement. |
| P02-C04 | P0 | Migration 224 uses first-user approval at lines 267-274; migration 231 comments at 215-218 and update at 218 still use first registered user as transitional manifest approver. | Manifest approval can still impersonate a human; regulated/high-risk authority not locked. | P04 | Replace bridge with permissioned human workflow or keep manifest blocked/pending when evidence absent; add audit and tests. |
| P02-C05 | P1 | `UomStandardLibraryManifestService.php:128-154` approves manifest with only UUID parameter and lifecycle check; no permission check for `uom.standard_library_manifest.approve`, signer meaning, or non-AI/system actor. | Any caller with service access and UUID could activate manifest. | P04 | Require AuthGuard/permission service, real user lookup, non-AI actor guard, signature meaning, audit event. |
| P02-C06 | P1 | `UomAliasResolutionService.php` resolves exact/catalog, alias, UNECE and unknown quarantine, but returns a string and does not produce candidate-rich ambiguous result shape; `submitToQuarantine` silently ignores write failure. | Ambiguous aliases like `M` may not produce governed candidates/status; quarantine evidence can be lost if DB write fails. | P06/P10 | Implement structured result statuses, candidates, trace_id, durable quarantine failure handling and Problem Details mapping. |
| P02-C07 | P1 | `ConversionEngine.php:122-157` dispatch handles identity, affine, exact/defined/si-base-hop, logarithmic and default throw, while migration 217 allows density_based, potency_assay, packaging_policy, arbitrary, device_display, ratio, dimensionless_strict, approximate_linear, derived_expression. | Category behavior is not fully explicit/tested; unsupported categories need deterministic code and matrix. | P05/P08 | Create P05 category dispatch matrix and deterministic unsupported category exception; leave contextual categories to P08. |
| P02-C08 | P1 | `UnitCatalogService.php` listRules uses status param; `UomController.php:218` default status is approved and health counts approved rules at `:287`. | API/health may misrepresent active runtime truth. | P03/P10 | Align default status and health metrics with lifecycle policy and OpenAPI. |
| P02-C09 | P1 | `80-uom-control-center.js:13-31` enables admin workspace via `window.UOM_ADMIN_ENABLED` or localStorage, and live fetch calls directly to UoM APIs. | UI can look like authority; guard may be frontend-only for workspace availability. | P11/P10 | Treat UI as projection only; mutation must go through governed API with backend auth and clear readonly fallback. |
| P02-C10 | P2 | `.ai/db-map/index.json` classifies all UoM tables as `unclassified`. | Domain ownership and integration routing are unclear to future agents. | P02/P12 | Record as source-truth gap; regenerate/improve AI index after significant code changes if repo conventions permit. |

## Non-Contradictions / Existing Strengths

- REPO_EVIDENCE: `MeasurementValueFactory.php` and `MeasurementEvidenceVerifier.php` already implement deterministic evidence hash patterns.
- REPO_EVIDENCE: `DecimalString.php`, `ExactLinearConverter.php`, and existing unit tests indicate precision hardening exists.
- REPO_EVIDENCE: `UomWorkflowService.php` has explicit comments that AI is advisory only and records AI advisory logs.
- REPO_EVIDENCE: API controller has Problem Details helper and UoM-specific error title mapping.

## Root Maturity Scores

| Root | Score | Evidence summary |
|---|---:|---|
| QKIND | 3 | Schema/service present; compatibility matrix not confirmed. |
| UOM | 4 | Catalog schema/service/seeds present; standards authority gaps remain. |
| UOMCONV | 2 | Rule schema/engine exists but lifecycle/version/cache contradictions are P0. |
| MEASVAL | 5 | Envelope/hash/replay service and tests exist. |
| ITUOM | 3 | Item policy resolver exists; domain integration not complete. |
| UOMALIAS | 3 | Alias resolver/quarantine exists; ambiguous structured result absent. |
| EXTCODE | 3 | UNECE/OPC mapper exists; active/effective/trust rules need P06. |
| PACKPOL | 3 | Packaging policy schema/service exists; contextual tests need P08. |
| DENSITY | 3 | Density schema/converter exists; evidence/context gating needs P08. |
| SLM | 2 | Manifest table/service exists but first-user/permission bridge remains. |
| UOMAPPROVAL | 2 | E-sign table/service exists but `rule_version` column drift blocks. |
| UOMDQ | 3 | Scanner service exists; P09/P15 need naked-number report. |

## P02 Decision

P02 can advance because its job is to lock repo reality and assign contradictions, not repair runtime. P03 must not start until these P0 contradictions are treated as source truth.
