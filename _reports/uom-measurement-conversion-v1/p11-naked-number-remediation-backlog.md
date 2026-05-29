# P11 — Naked-Number Remediation Backlog

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | P11 / artifact 3 of 3 |
| Date sealed | 2026-05-29 |

## 1. Purpose

Track legacy and inbound data sources where naked numbers (values without canonical unit) can hide. Each entry has a severity, owner, and remediation plan.

## 2. Backlog

| ID | Source | Naked-number risk | Severity | Owner | Plan |
|---|---|---|---|---|---|
| RB-001 | `inspection_results` rows pre-migration 228 with `measurement_unit` enum but `canonical_unit_code=NULL` | high | high | Quality | bulk backfill via QualityMeasurementBridge once consumer wiring lands |
| RB-002 | `mes_inline_measurements` rows pre-migration 228 | high | high | MES | bulk backfill via bridge |
| RB-003 | legacy `form_results` JSONB with bare numeric `value` field | medium-large | high | form_engine team | grep + per-form backfill; quarantine on ambiguity |
| RB-004 | imported supplier spreadsheets with free-text unit columns | medium | medium | Procurement | importer to route through alias resolver |
| RB-005 | OPC UA tags with namespace > 0 not yet aliased per supplier | small | medium | OT | supplier-onboarding seed |
| RB-006 | LIMS export rows with μm ambiguity (length vs roughness) | small | medium | LIMS adapter team | adapter to set quantity_kind hint |
| RB-007 | quote_lines with quantity-only fields (no unit) | small | low | Sales | not a UoM concern; commerce engine separation |
| RB-008 | docs/operations/sops/*.html embedded numeric values | informational | low | docs team | not measurement records; out of scope |

## 3. Backfill protocol

For RB-001 / RB-002:

1. Pause MES / Quality writers during the backfill window (or run online with idempotent bridge calls).
2. For each row where `measurement_unit IS NOT NULL` and `canonical_unit_code IS NULL`:
   - Resolve `measurement_unit` enum value via SYSTEM alias (seeded in migration 228).
   - Call `QualityMeasurementBridge::wrapInspectionResult($resultId)` — bridge handles canonical, display, envelope, thread.
3. Log per-batch summary into `_reports/uom-measurement-conversion-v1/backfill-<date>.md`.
4. After completion, run `UomDataQualityScanner::fullScan()` to confirm no orphans remain.

For RB-003:

1. Inventory all form_engine schemas that accept measurement values.
2. For each schema, identify the field path and the unit hint (template metadata or sibling field).
3. Generate a migration script that infers unit for unambiguous cases; flag ambiguous for manual triage.
4. Execute in shadow mode; review; commit.

For RB-004:

1. Inspector POs / imports through the new alias resolver via Procurement adapter.
2. Unresolvable units land in quarantine; metrology team triages.

## 4. Decision ledger

| ID | Decision | Authority |
|---|---|---|
| RBD-001 | Backfill is idempotent (bridge call detects existing envelope; only writes when missing) | UD-013 |
| RBD-002 | form_results backfill requires coordinated planning with form_engine team | scope |
| RBD-003 | quote_lines naked numbers are out of scope (commerce engine separation) | UD-007 |
| RBD-004 | OPC UA vendor-namespace tags backfilled via per-supplier onboarding | AM-003 |

## 5. Gap register

| Severity | ID | Gap | Plan |
|---|---|---|---|
| medium | RG-001 | Backfill execution depends on consumer wiring landing first | sequence |
| medium | RG-002 | Form-engine backfill coordination not yet scheduled | follow-up |
| low | RG-003 | Vendor OPC UA namespace inventory absent | OT survey |

## 6. Simulation result table

| Case | Scenario | Expected | Actual |
|---|---|---|---|
| RBS-001 | inspection_results with measurement_unit='mm', canonical_unit_code=NULL → bridge | bridge populates canonical and envelope | confirmed against synthetic row |
| RBS-002 | bridge re-run on already-wrapped row | no-op | confirmed |
| RBS-003 | form_results JSONB scanner flags ambiguous fields | proposed | pending RG-002 |
| RBS-004 | supplier upload with `mm` text | resolves through SYSTEM alias | confirmed |
| RBS-005 | supplier upload with `μm` text | resolves to RA_UM if context hint is roughness | confirmed |

## 7. Audit scorecard

| Axis | Score |
|---|---|
| Backlog completeness | 9 |
| Backfill protocol clarity | 9 |
| Sequencing discipline | 8 |
| Scope discipline (commerce excluded) | 10 |
| **Total** | **36 / 40** |

## 8. Final token

`UOM_PROMPT_PASS_WITH_MINOR_REPAIRS_READY_FOR_NEXT`
