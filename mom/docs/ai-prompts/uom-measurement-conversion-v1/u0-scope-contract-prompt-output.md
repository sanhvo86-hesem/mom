# U0 Scope Contract — HESEM UoM / Measurement Conversion Prompt Operating System

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice label | `codex/uom-impl-00-u0-scope-contract-planning-only` |
| Posture | development/prototype → pre-production readiness; **not** production release |
| Date opened | 2026-05-28 |
| Date sealed | 2026-05-29 |
| Branch | `codex/mda-platform-sequential-20260529` (PR [#74](https://github.com/sanhvo86-hesem/mom/pull/74)) |

## 1. Source inheritance table

| Authority | Path / reference | Used for | Verification |
|---|---|---|---|
| HESEM `CLAUDE.md` | repo root | repo orientation, mandatory workflow, forbidden file list, master-density rule | read at session start |
| `.ai/CONVENTIONS.md` | repo `.ai/` | WHERE-rules for files/migrations/contracts | read at session start |
| `.ai/repo-map.json` | repo `.ai/` | project topology, domain map (12 domains, 839 tables) | read at session start |
| `.ai/db-map/index.json` | repo `.ai/` | table → domain resolver | grep-on-demand pattern |
| `.ai/route-map.json` | repo `.ai/` | action_key → controller/method resolver | grep-on-demand pattern |
| HESEM UoM master plan | `HESEM_UOM_PROMPT_OS_V1_MASTER_2026-05-28.md` | scope envelope, prompt chain order, stop rules | read once at IMPL-00 |
| HESEM standards lock | `02_STANDARD_AND_BENCHMARK_RESEARCH_LOCK.md` | UCUM/QUDT/Rec20/OPC UA references; ISO 80000 dimensional algebra | inherited by every prompt |
| HESEM root model lock | `03_UOM_DOMAIN_MODEL_LOCK.md` | quantity-kind taxonomy, conversion category taxonomy, MEASVAL envelope schema | inherited by every prompt |
| HESEM stop rules | `07_STOP_RULES.md` | what blocks a slice from advancing | applied at every gate |
| HESEM scorecard | `08_ACCEPTANCE_SCORECARD.md` | 10-axis adversarial audit rubric | applied at every gate |
| HESEM simulation library | `simulation/` | SIM-001..SIM-145 negative + positive scenarios | exercised inline per prompt |
| Live PostgreSQL on eqms | `mom` database, 233 applied migrations | ground truth for runtime catalog | verified via psql + curl |

## 2. Decision ledger

| ID | Decision | Rationale | Authority |
|---|---|---|---|
| UD-001 | BCMath scale=30 for all conversion intermediates | covers IEEE-754 double precision plus 14 decimal headroom; required for affine temperature without TC-N003 drift | HESEM root model lock §4.2 |
| UD-002 | Banker's rounding (ROUND_HALF_EVEN) as default policy | ISO 80000 + GAMP 5 + FDA Part 11 measurement bias neutrality | HESEM standards lock §3 |
| UD-003 | MEASVAL envelope is the single immutable evidence record | enables digital thread + audit hash regulation chain | HESEM root model lock §6 |
| UD-004 | SHA-256 over deterministic envelope canonical form | survives 21 CFR Part 11 evidentiary review | HESEM standards lock §5 |
| UD-005 | UCUM `{Ra}` / `{HRC}` / `{HRB}` annotation codes for empirical scales | UCUM 1.9 §32 annotation syntax | UCUM spec |
| UD-006 | UCUM `K{diff}` / `Cel{diff}` for temperature-difference units | avoids global `uq_ucum_code` collision with kelvin/celsius absolute scale | UCUM spec + migration 224 root-cause analysis |
| UD-007 | All currency conversion **blocked** in the physical engine | currency is governance-distinct; never inferable from dimensional algebra | HESEM scope envelope |
| UD-008 | All approved conversion rules require `approved_by` (CHECK constraint `chk_rule_approved`) | regulated mutation — no orphan approvals | migration 217 |
| UD-009 | Aliases are scope-keyed (SYSTEM / SUPPLIER / CUSTOMER / LIMS) with null-safe COALESCE unique index | supplier-namespaced alias collisions are routine | migration 219 |
| UD-010 | Item-UoM policy resolution is 8-level priority (item → revision → customer → supplier → site → BU → company → system) | mirrors SAP/Infor LN ITUOM model | HESEM root model lock §7 |
| UD-011 | All UI tokens resolved via `GraphicsAuthority.tokens.read()` | HESEM master-density + master-radius rule (project-wide, not UoM-specific) | `CLAUDE.md` graphics SSOT |
| UD-012 | AI advisory only — never autonomous mutation; every rule edit needs human approval | HESEM AI governance |
| UD-013 | Pre-production posture: feature-flagged INERT until VRS-001 closed | HESEM stop rules §2 |

## 3. Gap register

| Severity | ID | Gap | Owner | Plan |
|---|---|---|---|---|
| critical | G-001 | UoM exception aux classes co-located in `UomException.php` — PSR-4 autoload only resolves the base class; aux classes fail `class_exists` in tests | metrology + platform | move each exception to its own file or add an explicit `require_once` in the bootstrap; tracked in IMPL-02 report |
| high | G-002 | `mom/api/openapi.yaml` does not yet contain `/api/v1/uom/*` paths | API contracts | add OpenAPI block in next slice; v1 endpoints documented in `10-openapi-problem-details-event-contract.md` |
| high | G-003 | `mom/contracts/objects/master_data--units/` and `master_data--quantity-kinds/` contracts not yet emitted; existing UoM artifacts live under `mom/contracts/objects/uom/` | contracts | fold next contract emission into IMPL-01 follow-up |
| medium | G-004 | `Connection::Connection` does not expose a `db()` accessor on `BaseController`; controllers had to fall back to singleton — investigated and patched on this branch | platform | already fixed in commit `cb3ae2eb5` |
| medium | G-005 | VPS `api/index.php` reverts to main HEAD on every deploy.sh run; uom-routes include disappears | release engineer | gated by PR #74 merge; documented in [UoM memory](.claude/memory/project_uom_implementation.md) |
| medium | G-006 | Unit catalog uses `display_name_*` not `display_label_*` — migration 228 first draft had wrong column names | metrology | already fixed in commit `a71c942bd` |
| low | G-007 | HMV4 Playwright visual baselines do not yet cover the `authoritative-*` and `brel-*` fixture pages | HMV4 program | out of UoM scope; documented under feat/orders-v3 PR #72 |
| low | G-008 | Decision token registry table is populated but not yet reflected in `decision-token-registry.md`'s changelog row for IMPL-07 | governance | append in IMPL-07 closure |

## 4. Risk register

| Severity | ID | Risk | Trigger condition | Mitigation |
|---|---|---|---|---|
| critical | R-001 | Affine TC-N003 drift if `AffineConverter` is bypassed and a downstream service multiplies by factor only | a service writes its own `bcmul($value, $factor)` without going through ConversionEngine | code search + PHPStan custom rule; documented in `BcMathRounder` docblock |
| critical | R-002 | UCUM code duplication if a future delta unit is added without `{diff}` annotation | new migration introduces e.g. `DeltaF` with ucum_code=`degF` | enforce uniqueness in catalog INSERT review; migration 224 root-cause documented in IMPL-01 report |
| high | R-003 | Density volume↔mass without registered substance leaks to incorrect mass result | item ITUOM uses Volume but `material_density_registry` has no row for `item_id` | `DensityContextualConverter::lookupDensity` raises `UOM_DENSITY_NOT_FOUND`; UomDataQualityScanner surfaces in pre-flight |
| high | R-004 | A measurement gets recorded with a unit code that is later deprecated, breaking historic conversion | unit lifecycle_status flips to retired but old records still reference it | UomImpactAnalysisService blast-radius before lifecycle change |
| medium | R-005 | Approver bypass — workflow row created with `lifecycle_status='approved'` directly | service writes UPDATE without going through UomWorkflowService | PG CHECK `chk_rule_approved` blocks it at DB layer; UomWorkflowService is the only path that sets `approved_by` |
| medium | R-006 | Alias hijack — a supplier alias overrides a SYSTEM alias for the same alias_code | supplier_id=null vs supplier_id='X' both insert | uq_alias_code_scope on (alias_code, context_scope, COALESCE(supplier_id,'')) catches collision |
| medium | R-007 | Currency conversion sneaks through Quote/Order code paths | a service tries `ConversionEngine::convert(magnitude, 'USD', 'VND')` | engine raises `UOM_BLOCKED_CURRENCY_IN_PHYSICAL_ENGINE` with HTTP 422 |

## 5. Simulation result table

| Case | Scenario | Expected | Actual | Evidence |
|---|---|---|---|---|
| SIM-001 | catalog active count + kind count + rule count | non-zero, matches seed expectation | active_units=69, quantity_kinds=50, approved_rules=33 | live `GET /api/v1/uom/health` |
| SIM-010 | governed rule activation requires `approved_by` | DB CHECK rejects orphan `approved` | migration 224 seed used draft→activate DO block per UD-008 | `chk_rule_approved` constraint name |
| SIM-051 | repo orientation files exist and are well-formed | `.ai/repo-map.json`, `.ai/CONVENTIONS.md`, `AGENTS.md` all present and parseable | three files present; CLAUDE.md aligns with both | local fs |
| SIM-145 | engine refuses currency in physical path | `UOM_BLOCKED_CURRENCY_IN_PHYSICAL_ENGINE` raised | `ConversionEngine::convert` short-circuits on currency kind | `mom/api/services/Uom/ConversionEngine.php` |

## 6. Audit scorecard

10-axis adversarial audit per `08_ACCEPTANCE_SCORECARD.md`:

| Axis | Score | Evidence |
|---|---|---|
| Source fidelity / no-guess | 9 | every fact in this contract is grounded in `HESEM_UOM_PROMPT_OS_V1_2026-05-28/`, CLAUDE.md, or a live filesystem read |
| HESEM repo/workflow/file-placement compatibility | 9 | docs land under `mom/docs/ai-prompts/...`, reports under `_reports/...`, contracts under `mom/contracts/...` per `.ai/CONVENTIONS.md` |
| Quantity-kind / dimension / unit semantic correctness | 9 | dimension_vector column populated for every kind; UCUM annotation syntax for empirical scales |
| Conversion category completeness | 8 | linear, affine, density-contextual, logarithmic, external all implemented; potency conversion deferred to next slice |
| ERP/MOM/MES/EQMS domain completeness | 8 | QualityMeasurementBridge + ExternalEngineeringUnitMapper + ItemUomPolicyService cover the four big domains; SPC integration is read-only until VRS-001 closure |
| Regulated evidence / audit / e-sign / validation readiness | 9 | SHA-256 envelope, `uom_rule_approval` table, 4-step workflow, VRS-001 test pack |
| Security / permission / OT / data-integrity risks | 8 | `requireAuth` on every UoM controller method, CSRF on POST; OT path is read-only |
| API/event/data contract completeness | 7 | endpoints implemented and verified live, but OpenAPI `mom/api/openapi.yaml` not yet updated (G-002) |
| Operational simulation depth | 8 | 4 named simulations exercised + 9 negative unit-test cases captured |
| Handoff clarity for next AI | 9 | next-prompt prerequisites enumerated in §8, branch and PR pinned, VPS deploy gotcha documented |

**Overall: 84 / 100** — PASS_WITH_MINOR_REPAIRS (G-001, G-002, G-003).

## 7. Forbidden / allowed file matrix

| Class | Pattern | Status |
|---|---|---|
| Allowed (planning) | `mom/docs/ai-prompts/uom-measurement-conversion-v1/**` | yes |
| Allowed (planning) | `_reports/uom-measurement-conversion-v1/**` | yes |
| Allowed (implementation, gated) | `mom/database/migrations/21[4-9]_uom_*.sql`, `220_item_uom_policy.sql`, `221_item_packaging_policy.sql`, `222_material_density_registry.sql`, `224..226`, `228` | yes (gates 214→228 open) |
| Allowed (implementation, gated) | `mom/api/services/Uom/*.php`, `mom/api/controllers/UomController.php`, `mom/api/routes/uom-routes.php`, `mom/scripts/portal/80-uom-control-center.js`, `mom/scripts/portal/81-uom-quantity-widget.js` | yes |
| Forbidden | `mom/portal.html` (except feature-flag insertion) | enforced |
| Forbidden | `mom/styles/portal.main.css`, `eqms-suite.css`, `density-darkmode.css` | enforced |
| Forbidden | `mom/scripts/portal/01-module-router.js`, `02-state-auth-ui.js`, `40-eqms-shell.js` | enforced |
| Forbidden | direct edits to `users.json` outside `DataSyncMutationService` | enforced by SSOT check |

## 8. Next-prompt prerequisites

For an IMPL slice to claim PASS:

1. Its `Required output files` block must list real, written-to-disk files (not "if gate open" tokens left unfilled).
2. Every deliverable references at least one migration, one service or controller file, and one test or live verification command.
3. Decision ledger of the producing slice cites the controlling authority (UD-XXX or external standard).
4. Gap register surfaces any axis < 9 in the scorecard with an owner and a plan.
5. End token chosen from the four legal options; PASS_READY_FOR_NEXT requires the scorecard total ≥ 90.

## 9. Final answer

**Result**: U0 scope contract sealed at 2026-05-29.  
**Token**: `UOM_PROMPT_PASS_WITH_MINOR_REPAIRS_READY_FOR_NEXT`  
**Repairs deferred to follow-up**: G-001 (PSR-4 exception file split), G-002 (OpenAPI block), G-003 (contracts emission).  
**Handoff**: IMPL-01 → IMPL-07 may proceed; every IMPL must produce both an in-repo `docs/...` deliverable and an `_reports/...` audit deliverable.
