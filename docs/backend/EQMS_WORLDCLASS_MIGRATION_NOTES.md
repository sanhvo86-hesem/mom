# EQMS World-Class Surface — Migration Notes
**Date:** 2026-04-15  
**Author:** HESEM MOM AI Architect  
**Status:** Deliverable 6 of 6 from `eqms-worldclass-research-and-endpoint-plan.md`  
**Migration file:** `mom/database/migrations/136_eqms_worldclass_surface.sql`

---

## Summary

Migration 136 is a **purely additive** migration. It creates new tables under the `eqms_` prefix, adds partial indexes, and defines cross-cutting infrastructure (audit trail, signatures, export jobs, comments, attachments, record links). It does **not** modify any existing table, drop any column, or change any existing index.

**Safe to run on a live system with zero downtime** — all statements are guarded with `IF NOT EXISTS`.

---

## Prerequisites

### 1. Migration 078 (canonical EQMS backbone) must be applied
Migration 136 does not depend on migration 078 structurally (it uses its own table names), but the `quality_case_link` and `nonconformance` tables from 078 are referenced by `eqms_record_links` via application logic. Ensure 078 is applied before 136.

### 2. Migration 101 (control plane foundation) must be applied
Migration 101 creates:
- `domain_outbox_events` — used by `emitQualityEvent()` in all EQMS controllers
- `eqms_electronic_signature_event` — base signature table (migration 136 creates `eqms_esig_events` as a v4.0 supplement; both can coexist)
- `pgcrypto` extension — used for `gen_random_uuid()`

**Verify before running 136:**
```sql
SELECT EXISTS (
  SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto'
) AS pgcrypto_installed;

SELECT EXISTS (
  SELECT 1 FROM information_schema.tables WHERE table_name = 'domain_outbox_events'
) AS outbox_table_exists;
```

### 3. Extensions required
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS btree_gin; -- for partial GIN indexes (optional, for JSONB perf)
```

---

## New Tables Created

### Cross-Cutting Infrastructure (shared by all modules)

| Table | Purpose |
|-------|---------|
| `eqms_audit_events` | Append-only audit trail; immutability enforced by UPDATE/DELETE trigger |
| `eqms_comments` | Comments on any EQMS entity (entity_type + entity_id polymorphic) |
| `eqms_attachments` | File attachments on any EQMS entity |
| `eqms_record_links` | Cross-module links (e.g., deviation → CAPA, NCR → batch release) |
| `eqms_esig_events` | Electronic signature events (21 CFR Part 11); stores action, signer, hash |
| `eqms_export_jobs` | Async export job queue; POST /export returns 202 + job_id |

### Domain Tables

| Table | Module | Key Columns |
|-------|--------|------------|
| `eqms_deviations` | Deviations | status, classification, severity, root_cause_description, esig_on_close |
| `eqms_complaints` | Customer Complaints | status, customer_id, product_id, severity, regulatory_reportable |
| `eqms_ncr_records` | NCR / MRB | status, disposition, use_as_is_justification, engineering_justification |
| `eqms_capa_records` | CAPA | status, root_cause_description, action_plan JSONB, effectiveness_review |
| `eqms_change_controls` | Formal Change Control | status, approval_route JSONB, impact_assessment JSONB, training_impact JSONB |
| `eqms_engineering_changes` | Engineering Change Orders | status, change_type, affected_parts JSONB, approval_route JSONB |
| `eqms_documents` | Document Control | status, version, checked_out_by, checkout_at, controlled_copy_count |
| `eqms_training_records` | Training | status, curriculum_id, employee_id, due_date, completion_date |
| `eqms_training_curricula` | Training Curricula | name, required_roles JSONB, modules JSONB |
| `eqms_audits` | Internal Audits | status, audit_type, scope, findings JSONB |
| `eqms_audit_findings` | Audit Findings | finding_type (major/minor/observation), status, linked_capa_id |
| `eqms_supplier_qualifications` | Supplier Quality | status, qualification_level, last_audit_date, score |
| `eqms_supplier_quality_agreements` | Quality Agreements | status, partner_id, terms JSONB, review_date |
| `eqms_supplier_audits` | Supplier Audits | status, supplier_id, audit_date, scar_ids JSONB |
| `eqms_scar_records` | Supplier SCAR 8D | status, supplier_id, linked_audit_id, root_cause, corrective_actions JSONB |
| `eqms_risk_register` | Quality Risk Register | status, likelihood, severity, risk_score (GENERATED), controls JSONB |
| `eqms_fmea_records` | FMEA (DFMEA/PFMEA) | status, fmea_type, process_step, failure_modes JSONB |
| `eqms_calibration_records` | Calibration | status, instrument_id, calibration_date, next_due_date, result |
| `eqms_msa_studies` | MSA / GR&R | status, instrument_id, grr_percent, ndc_count, passed |
| `eqms_lab_investigations` | OOS / OOT | status, phase (phase1/phase2), lab_error_identified, final_conclusion |
| `eqms_batch_release_records` | Batch Release | status, lot_number, release_package JSONB, approved_by, market_ship_at |
| `eqms_validation_projects` | Validation (GAMP 5) | status, validation_type (IQ/OQ/PQ/CSV), gamp_category |
| `eqms_validation_requirements` | Validation Requirements | project_id, requirement_text, acceptance_criteria |
| `eqms_validation_protocols` | Validation Protocols | project_id, protocol_type, approved_by |
| `eqms_validation_executions` | Protocol Executions | protocol_id, executed_by, pass_fail, deviations JSONB |
| `eqms_field_actions` | Field Actions / Recall | status, action_type (recall/advisory/correction), urgency, affected_lots JSONB |
| `eqms_genealogy_trace_reports` | Genealogy Freeze | status (active/frozen), lot_number, trace_data JSONB, frozen_by |
| `eqms_iqc_lots` | IQC Inspections | status, supplier_id, po_number, sample_size, accept_reject |
| `eqms_inprocess_inspections` | In-Process Inspections | status, work_order_id, operation_id, characteristics JSONB |
| `eqms_spc_observations` | SPC | chart_type, measurement_value, control_chart_data JSONB, deviation_id |
| `eqms_quality_tower_snapshots` | Quality Control Tower | snapshot_at, open_ncr_count, open_capa_count, overdue_actions JSONB, kpi_data JSONB |

---

## Generated Columns

```sql
-- Risk score auto-computed, never writable directly
risk_score INTEGER GENERATED ALWAYS AS (likelihood * severity) STORED
```

Any `INSERT` or `UPDATE` that includes `risk_score` as an explicit column will fail with a PostgreSQL error. Application code must never set `risk_score` directly.

---

## Triggers

### `eqms_audit_events` — Immutability Trigger
```sql
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Audit events are immutable. Record ID: %', OLD.id;
END;
$$;

CREATE TRIGGER eqms_audit_immutable
  BEFORE UPDATE OR DELETE ON eqms_audit_events
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();
```

This trigger fires on both UPDATE and DELETE. It cannot be bypassed from application code. To correct a wrongly written audit event in an emergency, a database superuser must `DISABLE TRIGGER` — this action should itself be audited at the OS/DBA level.

---

## Partial Indexes (Performance)

Migration 136 creates partial indexes optimized for the most common dashboard queries. These only index qualifying rows, keeping index size small on large tables.

| Index | Table | Condition | Query Pattern |
|-------|-------|-----------|---------------|
| `idx_eqms_deviations_open` | eqms_deviations | status NOT IN ('closed','voided') | Dashboard open deviations |
| `idx_eqms_capa_open` | eqms_capa_records | status NOT IN ('closed') | Open CAPA count |
| `idx_eqms_batch_pending_release` | eqms_batch_release_records | status = 'pending_release' | Release queue |
| `idx_eqms_calibration_overdue` | eqms_calibration_records | next_due_date < NOW() | Calibration compliance calendar |
| `idx_eqms_training_overdue` | eqms_training_records | due_date < NOW() AND status != 'completed' | Training compliance |
| `idx_eqms_field_actions_active` | eqms_field_actions | status NOT IN ('closed') | Active recall/advisory monitoring |

---

## Data Migration (None Required)

Migration 136 creates only new tables. No data is migrated from legacy tables (`ncr_records`, `capa_records`, `fmea_records`, `complaint_records`, `mrb_records`, `deviation_records`, etc.).

**Legacy tables remain untouched.** The legacy EQMS APIs (via `ExceptionController`, `FmeaController`) continue to write to legacy tables. The new world-class EQMS surface writes exclusively to `eqms_*` tables.

### Dual-write strategy (optional)
If it is necessary to unify legacy and new records over time, implement a background migration script that:
1. Reads from legacy tables
2. Inserts into corresponding `eqms_*` tables with `legacy_id` cross-reference
3. Marks legacy records as `migrated_to_eqms_v4 = true`

This is optional and not part of the v4.0 scope.

---

## Rollback Plan

Since all statements are `IF NOT EXISTS` and no existing objects are modified, rollback is safe:

```sql
-- Drop all v4.0 EQMS tables (in reverse dependency order)
DROP TABLE IF EXISTS eqms_spc_observations CASCADE;
DROP TABLE IF EXISTS eqms_inprocess_inspections CASCADE;
DROP TABLE IF EXISTS eqms_iqc_lots CASCADE;
DROP TABLE IF EXISTS eqms_genealogy_trace_reports CASCADE;
DROP TABLE IF EXISTS eqms_field_actions CASCADE;
DROP TABLE IF EXISTS eqms_validation_executions CASCADE;
DROP TABLE IF EXISTS eqms_validation_protocols CASCADE;
DROP TABLE IF EXISTS eqms_validation_requirements CASCADE;
DROP TABLE IF EXISTS eqms_validation_projects CASCADE;
DROP TABLE IF EXISTS eqms_batch_release_records CASCADE;
DROP TABLE IF EXISTS eqms_lab_investigations CASCADE;
DROP TABLE IF EXISTS eqms_msa_studies CASCADE;
DROP TABLE IF EXISTS eqms_calibration_records CASCADE;
DROP TABLE IF EXISTS eqms_fmea_records CASCADE;
DROP TABLE IF EXISTS eqms_risk_register CASCADE;
DROP TABLE IF EXISTS eqms_scar_records CASCADE;
DROP TABLE IF EXISTS eqms_supplier_audits CASCADE;
DROP TABLE IF EXISTS eqms_supplier_quality_agreements CASCADE;
DROP TABLE IF EXISTS eqms_supplier_qualifications CASCADE;
DROP TABLE IF EXISTS eqms_audit_findings CASCADE;
DROP TABLE IF EXISTS eqms_audits CASCADE;
DROP TABLE IF EXISTS eqms_training_curricula CASCADE;
DROP TABLE IF EXISTS eqms_training_records CASCADE;
DROP TABLE IF EXISTS eqms_documents CASCADE;
DROP TABLE IF EXISTS eqms_engineering_changes CASCADE;
DROP TABLE IF EXISTS eqms_change_controls CASCADE;
DROP TABLE IF EXISTS eqms_capa_records CASCADE;
DROP TABLE IF EXISTS eqms_ncr_records CASCADE;
DROP TABLE IF EXISTS eqms_complaints CASCADE;
DROP TABLE IF EXISTS eqms_deviations CASCADE;
DROP TABLE IF EXISTS eqms_quality_tower_snapshots CASCADE;
-- Cross-cutting (drop last)
DROP TABLE IF EXISTS eqms_export_jobs CASCADE;
DROP TABLE IF EXISTS eqms_esig_events CASCADE;
DROP TABLE IF EXISTS eqms_record_links CASCADE;
DROP TABLE IF EXISTS eqms_attachments CASCADE;
DROP TABLE IF EXISTS eqms_comments CASCADE;
DROP TABLE IF EXISTS eqms_audit_events CASCADE;
```

**Note:** This rollback will also remove all new EQMS records. Only execute after confirming no production data has been written to these tables.

---

## Deployment Checklist

```
[ ] Verify pgcrypto extension installed
[ ] Verify migrations 078 and 101 applied
[ ] Run migration 136 on staging, verify 0 errors
[ ] Confirm eqms_audit_events immutability trigger fires (test UPDATE)
[ ] Confirm risk_score generated column computed on INSERT
[ ] Confirm all 15+ partial indexes created (pg_indexes check)
[ ] Run php -l on all 19 Eqms*Controller.php files — 0 syntax errors
[ ] Run composer --working-dir=mom run ai:index to refresh .ai/ index
[ ] Run migration 136 on production during low-traffic window
[ ] Smoke-test: POST /api/v1/eqms/customer-complaints/query → 200
[ ] Smoke-test: POST /api/v1/eqms/batch-release/query → 200
[ ] Smoke-test: POST /api/v1/eqms/validation/projects/query → 200
[ ] Monitor error logs for 10 minutes post-deploy
```

---

## Sequence in Migration History

| Migration | Description |
|-----------|-------------|
| 078 | Canonical EQMS compliance backbone (legacy tables) |
| 101 | EQMS control plane foundation (domain_outbox, esig) |
| 133 | (Previous — scope key cast fix) |
| **136** | **EQMS World-Class Surface v4.0 (this migration)** |
| 137 | (Next available slot) |
