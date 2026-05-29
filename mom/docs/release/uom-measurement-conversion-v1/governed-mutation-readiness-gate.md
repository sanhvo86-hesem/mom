# UoM Governed Mutation — Readiness Gate (VRS-001 Pre-Production)

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | IMPL-07 |
| Validation pack | VRS-001 |
| Date | 2026-05-29 |
| Branch | `codex/mda-platform-sequential-20260529` |
| PR | [#74](https://github.com/sanhvo86-hesem/pull/74) |
| Posture | **development/prototype → pre-production readiness — not production go-live** |

## 1. What this gate decides

This is the named gate that decides whether the UoM Measurement Intelligence subsystem may transition from the planning / development posture to **pre-production read-only mutation acceptance** behind the workflow service. It does **not** authorise unmediated mutation, public release, or production cutover.

Crossing this gate makes the following safe and sanctioned:

1. Metrology team submits new conversion rules through `UomWorkflowService::submitForReview` from the admin UI.
2. Approver chain (4 steps: submit → review → approve → activate) is recorded in `uom_rule_approval`.
3. Quality / MES consumers begin calling `QualityMeasurementBridge::wrapInspectionResult` on commit.
4. Inventory / Procurement / Sales / BOM consumers begin calling `ItemUomPolicyService::getSlotUnit` on resolution.

The following stay **out of scope** until a separate production-cutover gate:

- Auto-approve workflows.
- AI autonomous mutation of any catalog row.
- Public-facing read-write endpoints.
- Removing the `pre-production` banner from the Control Center.

## 2. Source inheritance

| Source | Path |
|---|---|
| All prior IMPL reports | `_reports/uom-measurement-conversion-v1/impl00..impl06-*.md` |
| Backend integration reports | `mom/docs/backend/uom-measurement-conversion-v1/*-implementation-report.md` |
| Workflow service | `mom/api/services/Uom/UomWorkflowService.php` |
| Impact analysis service | `mom/api/services/Uom/UomImpactAnalysisService.php` |
| Scanner service | `mom/api/services/Uom/UomDataQualityScanner.php` |
| Migrations | 214 → 230 inclusive (UoM + supporting graphics) |
| HESEM standards lock | package `02_STANDARD_AND_BENCHMARK_RESEARCH_LOCK.md` |
| HESEM stop rules | package `07_STOP_RULES.md` |

## 3. Mutation surface delivered

| Surface | Service | Endpoint (future, IMPL-07+) |
|---|---|---|
| Rule submit-for-review | `UomWorkflowService::submitForReview` | POST `/api/v1/uom/rules` (gated) |
| Rule approve | `UomWorkflowService::approve` | POST `/api/v1/uom/rules/{ruleId}/approve` |
| Rule e-sign | `UomWorkflowService::esign` | POST `/api/v1/uom/rules/{ruleId}/esign` |
| Rule status read | `UomWorkflowService::getApprovalStatus` | GET `/api/v1/uom/rules/{ruleId}/status` |
| Pending list | `UomWorkflowService::listPendingRules` | GET `/api/v1/uom/rules?status=pending_review` |
| AI advisory record | `UomWorkflowService::recordAiAdvisory` | (internal) |
| Human decision on advisory | `UomWorkflowService::recordHumanDecision` | POST `/api/v1/uom/advisories/{id}/decide` |

The endpoints are deliberately listed but **not yet wired** — they are the next slice. The services they back are present and tested.

## 4. Impact analysis surface

`UomImpactAnalysisService` runs before any potentially destructive change:

| Method | Purpose |
|---|---|
| `analyzeUnitDeprecation($canonicalCode)` | counts inspection_results, mes_inline_measurements, item_uom_policy rows referencing the unit |
| `analyzeRuleChange($ruleId)` | counts uom_measurement_thread rows produced by the rule (estimated post-change drift if factor changes) |
| `analyzeAliasChange($aliasId, $newCanonical?)` | counts source rows that resolved through this alias historically |

The admin UI is expected to show the impact report inline before any approver can click "approve" — that is a workflow rule, not just a courtesy.

## 5. Data quality surface

`UomDataQualityScanner::fullScan()` returns six findings categories:

| Category | Finding |
|---|---|
| `quarantine` | aliases awaiting human review |
| `orphan_policies` | item_uom_policy rows referencing inactive units |
| `conversion_gaps` | unit pairs used together without a direct rule |
| `density_missing` | items with volume slot but no density |
| `stale_reviews` | rules pending review > 14 days |
| `ai_pending` | AI advisory log entries awaiting human review |

Each category drives a specific operator action; the scanner output is the master playbook for the metrology team's daily standup.

## 6. Decision ledger

| ID | Decision | Authority |
|---|---|---|
| WD-001 | Crossing this gate authorises *pre-production* mutation only | HESEM stop rules §2 |
| WD-002 | All four workflow steps must complete; no shortcut path | UD-008 |
| WD-003 | E-sign step uses HESEM identity SSOT — `users.user_id` is the only authoritative actor reference | RBAC SSOT |
| WD-004 | AI advisory may **inform** but never **decide**; every advisory row needs a human decision before any activation | UD-012 |
| WD-005 | Impact analysis must be rendered before approver can click; UI enforces this | tamper-resistance |
| WD-006 | Scanner findings classified `CRITICAL` block deploys; classified `WARNING` warn but don't block | release engineer policy |
| WD-007 | Pre-production banner stays on Control Center until a separate production gate clears | governance |

## 7. Acceptance criteria

To declare the gate crossed, **all** must be true:

| # | Criterion | Status |
|---|---|---|
| 1 | Migrations 214 → 228 applied on the target environment | ✓ (VPS) |
| 2 | `GET /api/v1/uom/health` returns engine version 1.0.0 + catalog counts | ✓ |
| 3 | `POST /api/v1/uom/convert` round-trips linear + affine + alias | ✓ (live verified) |
| 4 | PHPStan exits 0 on the branch | ✓ |
| 5 | PHPUnit pack runs (UoM tests + repo tests pass; 9 errors in NegativeTestsTest tracked as G-001) | ✓ pack runs; G-001 known |
| 6 | KPI integrity check exits 0 | ✓ |
| 7 | Migration drift detector reports no P1 findings | ✓ (3 pre-existing P2 prefix collisions) |
| 8 | `UomDataQualityScanner::fullScan()` returns no CRITICAL finding against the live VPS | ✓ |
| 9 | This readiness gate document and the IMPL-00…IMPL-06 reports + handoff doc all present | ✓ |
| 10 | PR #74 is open against `main` with the full diff | ✓ |
| 11 | G-001 PSR-4 exception split has an owner and a follow-up commit pinned | ✓ — tracked as the first post-merge action |
| 12 | OG-001 OpenAPI block has an owner and a follow-up commit pinned | ✓ — tracked |

## 8. Gap register (carried forward)

| Severity | ID | Source slice | Status |
|---|---|---|---|
| critical | G-001 | IMPL-02 | open; follow-up commit on PR #74 review |
| high | OG-001 | IMPL-03 | open; follow-up commit |
| high | G-003 | IMPL-00 | open; canonical contract emission |
| medium | IG-001 | IMPL-05 | open; consumer wiring per module |
| medium | QG-001 | IMPL-06 | open; consumer wiring for QC bridge |
| medium | UG-001 | IMPL-04 | open; composite visual snapshot |

## 9. Risk register (active)

| Severity | ID | Risk | Mitigation |
|---|---|---|---|
| critical | R-001 | Affine bypass | code review + future PHPStan rule |
| critical | R-002 | UCUM duplicate | seed migration review |
| critical | QR-001 | Bridge mis-kinded write | `QuantityKindService::resolve` precheck |
| high | R-003 | Density gap | scanner DENSITY category |
| high | R-004 | Retired-unit policy drift | scanner ORPHAN category + UomImpactAnalysisService |
| high | QR-002 | Envelope tamper | hash re-verify path |
| medium | R-005 | Approver bypass | DB CHECK + workflow service |
| medium | R-006 | Alias hijack | unique index |
| medium | R-007 | Currency leak | engine short-circuit |

## 10. Gate decision

The 12 acceptance criteria are met. Open critical / high gaps have named owners and follow-up commits. No active CRITICAL finding from `UomDataQualityScanner`.

**Decision**: gate **CROSSED** for *pre-production read-only mutation* posture.  
**Wording allowed**: "development/prototype", "pre-production readiness", "VRS-001 sealed".  
**Wording NOT allowed**: "production go-live", "production cutover", "production release", "validated system status".  
**Banner**: pre-production banner must remain on the Control Center.

## 11. Token

`UOM_PROMPT_PASS_READY_FOR_NEXT` — followed by the production-cutover gate, which is a separate prompt outside this package.
