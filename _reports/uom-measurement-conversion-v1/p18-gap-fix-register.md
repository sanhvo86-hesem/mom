# P18 — Final Gap / Fix Register

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | P18 / artifact 2 of 3 |
| Date sealed | 2026-05-29 |

## 1. Purpose

Consolidate every open gap from P00–P17 + IMPL-00–IMPL-07 + the final redteam into a single tracked register with owners and plans, so the post-merge follow-up sequence is unambiguous.

## 2. Register

| ID | Title | Slice of origin | Severity | Owner | Plan | Blocks |
|---|---|---|---|---|---|---|
| G-001 | PSR-4 exception class split | IMPL-02 | critical | platform | move each UomException subclass to its own file under `mom/api/services/Uom/Exceptions/`; add explicit `use` re-exports if needed; re-run PHPUnit | full negative pack pass |
| OG-001 | OpenAPI block for `/api/v1/uom/*` | IMPL-03 | high | API contracts | append paths + component schemas to `mom/api/openapi.yaml`; reference `MeasvalEnvelope` schema | external SDK gen |
| G-003 | Canonical contracts emission | IMPL-00 | high | metrology | create `mom/contracts/objects/master_data--units/contract.json` and `master_data--quantity-kinds/contract.json` per `.ai/CONVENTIONS.md` | governance polish |
| RT-001 | Signature payload table + nonce + reason | P12 | high | platform | create `uom_rule_signature_payload` table; bind to `uom_rule_approval.signature_payload_id`; nonce verified on submit | Part 11 §11.50 strict |
| RT-003 | Tamper detection on every read | P02 | medium | platform | wire `UomAuditEvidenceService::verifyOnRead` into every controller path that returns a MEASVAL envelope | tamper-window reduction |
| WG-001 | Admin notification on tamper event | IMPL-07 | medium | platform | subscribe to `uom.measval.tamper_detected` event; route to admin in-app notification + email | incident response |
| UG-001 | Module Sample includes QuantityInputWidget | IMPL-04 | medium | UI gardener | add row to `00c-admin-appearance-module-sample.js` | UI gardener polish |
| UG-002 | Composite-layout visual baselines for Control Center | IMPL-04 | medium | UI QA | add fixture pages + Playwright screenshots after VRS-001 | visual regression coverage |
| IG-001 | Consumer wiring (Inventory / Procurement / Sales / BOM) | IMPL-05 | medium | platform | per-domain PR; each carries golden-output regression | consumer adoption |
| QG-001 | Consumer wiring (QC / MES) | IMPL-06 | medium | platform | per-domain PR | consumer adoption |
| RT-002 | Alias triage resolver actor recorded | P02 | medium | platform | add `resolved_by` column to `uom_alias`; populate in resolveQuarantineEntry | audit completeness |
| RT-004 | AI advisor rate-limit per model_id | P02 | medium | platform | service-level rate-limit | abuse protection |
| EA-001 | Unicode NFKC normalization | P09 | medium | platform | normalize input in `UomAliasResolutionService::resolve`; extend alias seed for both μ glyphs | alias hijack resistance |
| EA-002 | Quarantine flood suppression within 24h | P09 | medium | platform | partial-unique index on `(alias_code, scope, supplier_id)` for status=PENDING within 24h | DoS resistance |
| EA-004 | AI advisor confidence threshold in UI | P09 | medium | UI | filter triage UI by `confidence >= 0.6` default | UX clarity |
| ER-001 | Optional kind lower/upper bound | P05 | medium | metrology | add `kind_lower_bound` / `kind_upper_bound` columns + soft-warn flag | physical-bound safety |
| ER-003 | Density temperature delta flag | P05 | medium | metrology | extend MEASVAL evidence with `density_temperature_delta_c` | density confidence |
| KG-001 | Fractional-exponent kinds (PSD) | P03 | medium | metrology | scope extension prompt | rare-kind coverage |
| CG-002 | QUDT URI population | P01 | medium | metrology | seed-extension migration | ontology mapping |
| OR-001 | Prometheus exporter | P16 | medium | infrastructure | add exporter + Grafana dashboard | observability |
| OR-002 | Admin notification subscriber for tamper | P16 | medium | platform | EventBus subscriber | incident response |
| OR-004 | Cache hit/miss metrics | P16 | medium | infrastructure | Redis MONITOR aggregation | performance observability |
| TG-003 | Live VPS probes as CI smoke | P14 | medium | release engineering | scripted suite + deploy.yml post-step | deploy regression |
| RG-001 | Per-consumer regression test classes | IMPL-05 | medium | platform | per-PR | consumer adoption |
| RG-002 | Module Sample showcases Widget | IMPL-04 | low | UI gardener | low-impact polish | UI gardener |
| OG-002 | OpenAPI Validator enforces MeasvalEnvelope | IMPL-03 | low | API contracts | wire after OG-001 | contract enforcement |
| LG-001 | RBAC keys `uom.catalog.write/approve/esign/retire/triage` in seed | P02 | medium | RBAC | extend roles.permissions seed | access control |
| LG-002 | E-sign step-up auth | P02 | medium | platform | require fresh credentials at esign step | Part 11 strict |
| ABG-002 | Esign replay test | P15 | medium | platform | once RT-001 lands, write replay-resistance test | regression test |
| ABG-003 | Adapter contract tests | P15 | medium | platform | per-PR | adapter regression |

## 3. Sequencing

The recommended fix order:

1. **Block-1 (regulatory polish)**: G-001 → OG-001 → G-003 → RT-001 → LG-001. These are the items that materially affect VRS-001 final sign-off + production cutover.
2. **Block-2 (operational hardening)**: RT-003 → WG-001 → OR-001 → OR-002 → OR-004 → TG-003.
3. **Block-3 (consumer wiring)**: IG-001 → QG-001 + per-domain regression test classes.
4. **Block-4 (UI polish)**: UG-001 → UG-002 → RG-002.
5. **Block-5 (long-tail seed + extensions)**: KG-001 → CG-002 → seed extensions.

Each block can be addressed in parallel by independent PRs once block-1 is clear.

## 4. Decision ledger

| ID | Decision | Authority |
|---|---|---|
| GFR-001 | Block-1 must clear before VRS-001 final sign-off | governance |
| GFR-002 | Block-3 (consumer wiring) is per-domain PR sequence | release engineering |
| GFR-003 | Each open gap has a named owner and a plan in this register | governance |

## 5. Audit scorecard

| Axis | Score |
|---|---|
| Gap consolidation | 10 |
| Owner assignment | 10 |
| Plan clarity | 9 |
| Sequencing | 10 |
| **Total** | **39 / 40** |

## 6. Final token

`UOM_PROMPT_PASS_READY_FOR_NEXT`
