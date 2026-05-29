# P02 — UoM Authority Lattice

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | P02 / artifact 2 of 3 |
| Date sealed | 2026-05-29 |

## 1. Purpose

Map every authority class (regulatory, vendor, internal, AI) and every surface (CLI, admin UI, REST, MES, MQTT) to which roots they may read, propose, or mutate. The lattice closes the question "who can do what to which root" so no hidden authority can slip in via tool change, UI redesign, or AI promotion.

## 2. Authority classes

| Class | Examples | Privilege |
|---|---|---|
| Regulatory | ISO 80000, UCUM, 21 CFR Part 11 | read-only **on HESEM**; defines invariants the engine must honour |
| Vendor pattern | SAP S/4HANA, Oracle EBS, Siemens Opcenter | informational; not a privilege grant |
| Metrology team (internal) | Quality engineer, metrologist | propose + approve + e-sign within RBAC |
| Catalog admin (internal) | Senior metrologist | activate + retire (with workflow) |
| Operations user (internal) | Inspector, MES operator | read + record measurements; no catalog mutation |
| AI advisory | LLM-backed advisor (Claude / Ollama / OpenAI) | propose only; cannot approve, e-sign, or activate |
| Public API consumer (external) | none in scope for v1 | read-only convert + alias resolve at most |

## 3. Lattice (rows = authority class, columns = root)

| Authority \\ Root | QuantityKind | Unit | ConversionRule | Alias | ExternalCode | ITUOM Policy | Packaging | MaterialDensity | MEASVAL | AIAdvisory |
|---|---|---|---|---|---|---|---|---|---|---|
| Regulatory | constrain | constrain | constrain | constrain | constrain | constrain | constrain | constrain | constrain | constrain |
| Vendor pattern | inform | inform | inform | inform | inform | inform | inform | inform | inform | inform |
| Metrology team | propose | propose | propose / approve | triage | propose | propose | propose | propose | n/a | review |
| Catalog admin | activate / retire | activate / retire | activate / retire / e-sign | accept / reject | activate / retire | activate / retire | activate / retire | activate | n/a | review |
| Operations user | read | read | read | read | read | read | read | read | write (via bridge) | n/a |
| AI advisory | suggest | suggest | suggest | suggest | suggest | suggest | suggest | suggest | n/a | author |
| Public API consumer | read (paginated) | read | read | resolve | read | read | read | read | n/a | n/a |

"constrain" = the standard fixes invariants that other authorities cannot violate.

## 4. Surface assignment

| Surface | Authority required | What it does |
|---|---|---|
| `mom/scripts/portal/80-uom-control-center.js` (Admin UI) | catalog admin | read-only browse in v1; mutation surface gated to IMPL-07 follow-up |
| `mom/scripts/portal/81-uom-quantity-widget.js` (form widget) | operations user | live preview convert; persists MEASVAL through host form |
| `POST /api/v1/uom/convert` | authenticated user | read-only convert |
| `POST /api/v1/uom/aliases/resolve` | authenticated user | read-only alias resolve |
| `GET /api/v1/uom/units` etc. | authenticated user | read-only catalog browse |
| (future) `POST /api/v1/uom/rules` | metrology team | submit rule for review (goes to workflow) |
| (future) `POST /api/v1/uom/rules/{id}/approve` | catalog admin | approve workflow step |
| (future) `POST /api/v1/uom/rules/{id}/esign` | catalog admin (with e-sign credential) | e-sign workflow step |
| `QualityMeasurementBridge::wrapInspectionResult` | service-internal | only called from QC writers |
| `ExternalEngineeringUnitMapper::*` | service-internal | called from OT / EDI / LIMS adapters |
| `UomWorkflowService::recordAiAdvisory` | service-internal called by AI advisor | informational only |

## 5. Route / surface rules

| Rule | Mechanism |
|---|---|
| No mutation without `requireAuth` | every controller method invokes `BaseController::requireAuth` |
| No mutation without CSRF | `CsrfMiddleware` is in the pipeline; POST routes are not in the `$csrfExempt` list |
| No catalog mutation by operations user | future mutation endpoints will check `roles.permissions JSONB` for `uom.catalog.write` |
| No AI direct activation | `UomWorkflowService::recordAiAdvisory` is the only AI-callable mutator; it cannot transition lifecycle |
| No raw SQL writes against `uom_*` tables outside `Uom/` services | enforced by repo convention + grep audit |
| No alias activation without resolved canonical | service contract |

## 6. Decision ledger

| ID | Decision | Authority |
|---|---|---|
| LD-001 | AI advisory is a separate authority class, never collapsed into "metrology" or "admin" | UD-012 |
| LD-002 | Public API does not include catalog mutation in v1 | UD-013 |
| LD-003 | Metrology / admin split is by RBAC permission, not by user role name | RBAC SSOT |
| LD-004 | Surface-level rules are enforceable by middleware + repo grep, not by audit alone | tamper-resistance |
| LD-005 | Regulatory authority "constrains" but does not "mutate" — invariants are baked into DB constraints / engine code, not into the lattice itself | architectural clarity |

## 7. Gap register

| Severity | ID | Gap | Plan |
|---|---|---|---|
| medium | LG-001 | `uom.catalog.write` permission key not yet present in `roles.permissions` JSONB | add in IMPL-07 follow-up |
| medium | LG-002 | E-sign credential check is currently the same as auth; needs a separate step-up auth | extend `UomWorkflowService::esign` |
| low | LG-003 | Public API surface for v1 not yet differentiated from internal surface in OpenAPI | add `x-internal` extension in OpenAPI |

## 8. Audit scorecard

| Axis | Score |
|---|---|
| Authority class enumeration | 10 |
| Lattice completeness | 9 |
| Surface assignment | 9 |
| Rule enforceability | 9 |
| **Total** | **37 / 40** |

## 9. Final token

`UOM_PROMPT_PASS_READY_FOR_NEXT`

## 10. Cross-references

- Sibling: `mom/docs/architecture/uom-measurement-conversion-v1/uom-root-scope-contract.md` (P02 / 1)
- Audit: `_reports/uom-measurement-conversion-v1/p02-undermodeling-redteam.md` (P02 / 3)
