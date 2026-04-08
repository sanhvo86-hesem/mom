# HESEM QMS Portal - Database Migrations

## Overview

This directory contains ordered PostgreSQL migration files that compose the full HESEM QMS Portal database schema. The migration set now spans `001` through `078`, and the current world-class manufacturing expansion brings the stack to roughly `518` operational tables plus a new canonical `ERP + MES + eQMS` backbone across ERP, QMS, MES, APS, PLM, WMS, HCM, CRM, TMS, trade, SRM, tooling, EHS, service, and analytics domains.

## Prerequisites

- PostgreSQL 16+
- Extensions available on the server: `uuid-ossp`, `pgcrypto`, `pg_trgm`, `btree_gist`, `pgvector`
- A database created and ready to receive the schema
- `psql` client installed

## Migration File Order

| File | Description |
|------|-------------|
| `001_extensions_and_types.sql` | PostgreSQL extensions and all ENUM types (~80 types) |
| `002_core_system.sql` | departments, users, roles, user_roles, sessions, audit_events (partitioned) |
| `003_document_management.sql` | documents, document_versions, document_embeddings, document_distribution |
| `004_form_system.sql` | form_schemas, form_entries, form_attachments |
| `005_record_management.sql` | record_counters, records, record_links |
| `006_erp_master_data.sql` | items, item_revisions, bill_of_materials, bom_components, work_centers, routings, routing_operations |
| `007_customers_sales.sql` | customers, sales_orders, sales_order_lines |
| `008_vendors_purchasing.sql` | vendors, purchase_orders, purchase_order_lines, vendor_ratings |
| `009_inventory.sql` | warehouses, inventory_locations, lot_master, serial_master, inventory_transactions (partitioned) |
| `010_production.sql` | job_orders, job_operations, labor_transactions (partitioned), production_schedule |
| `011_quality.sql` | inspection_plans, inspection_results, spc_data, ncr_records, capa_records, fai_records, fai_characteristics, certificates, npi_projects, ehs_incidents, contamination_checks |
| `012_calibration_equipment.sql` | equipment, calibration_records, maintenance_work_orders, tools, tool_transactions |
| `013_training_hr.sql` | employees, training_records, skills_matrix, employee_certifications |
| `014_audit_risk.sql` | audits, audit_findings, audit_actions, risk_register, improvement_projects, management_reviews |
| `015_finance.sql` | cost_elements, job_costing, gl_transactions, ap_ar_invoices |
| `016_shipping_compliance.sql` | shipments, shipment_packages, compliance_records, export_licenses |
| `017_subcontracting_rma.sql` | subcontract_orders, subcontract_receipts, rma_orders |
| `018_projects_kpi.sql` | projects, project_milestones, project_resources, kpi_definitions, kpi_snapshots, mrp_planned_orders |
| `019_system_tables.sql` | variable_registry, naming_patterns, notifications, file_attachments, tags, comments, workflow_definitions, workflow_instances |
| `020_indexes.sql` | ALL indexes (B-tree, GIN, GiST, trigram, ivfflat) |
| `021_views.sql` | ALL views (8 views) |
| `022_functions_triggers.sql` | ALL functions and triggers |
| `023_rls_policies.sql` | ALL Row Level Security policies |
| `024_seed_data.sql` | ALL seed data (departments, roles, naming patterns, KPI definitions, record counters) |

## Latest Expansion Waves

| Range | Description |
|------|-------------|
| `025`-`031` | MES world-class foundations, alarms, DPP, energy, cost |
| `032`-`039` | Order management, exceptions, supplier quality, quoting, evidence vault, portal, CNC program management |
| `040`-`045` | Digital product passport, AI quality + APS lite, FMEA/APQP/control plan, dispatch, shift calendar, OQC/packing |
| `046`-`055` | Plant maintenance, APS, PLM, HCM, WMS, multi-currency/trade, project system, CRM, TMS, BI/DWH |
| `056`-`060` | SRM, tooling lifecycle, S&OP, service/warranty, treasury/assets |
| `061`-`068` | Quality lab/compliance, EHS/ESG, manufacturing engineering, MDM, pricing/contracts, traceability, outsource execution, advanced trade compliance |
| `069`-`071` | Lean manufacturing uplift, enterprise governance uplift, and MES identity hardening |
| `072`-`078` | Canonical ERP + MES + eQMS 7-layer backbone: foundation, master data, engineering, planning, MES execution, inventory/traceability, and eQMS compliance |

## Running Migrations

### Using the migration script

```bash
# Run all migrations against a local database
./migrate.sh -d qms_portal

# Specify host, port, and user
./migrate.sh -h localhost -p 5432 -U postgres -d qms_portal

# Run a single migration
psql -h localhost -d qms_portal -f migrations/001_extensions_and_types.sql
```

The script auto-discovers all `*.sql` files in `migrations/` and executes them in lexical order, so newly added zero-padded migrations do not require manual edits to the runner.

### Regenerating the schema snapshot

The checked-in [schema.sql](/C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/database/schema.sql) is now generated from the migration directory instead of being maintained manually.

```bash
php database/build_schema_snapshot.php
```

This rebuilds the snapshot from `001` through the latest migration in lexical order, which keeps `schema.sql` aligned with the actual migration source of truth.

### Manual execution

Run each file in numerical order:

```bash
for f in $(ls migrations/*.sql | sort); do
    echo "Running $f..."
    psql -h localhost -d qms_portal -f "$f"
done
```

## Rolling Back

Each migration file contains rollback instructions in comments at the bottom of the file. To rollback, execute the rollback SQL statements in reverse order (`078` first, then `077`, and so on).

## Notes

- The canonical wave `072` through `078` uses `BEGIN;` / `COMMIT;` for transactional safety. Older one-off hotfix migrations may remain single-statement and idempotent by design.
- Each migration is independently runnable given its dependencies are met
- The `020_indexes.sql` file creates all indexes; if running tables and indexes together, you can skip the inline index creation in table files (they are duplicated in 020 for the split-file approach)
- Partitioned tables (audit_events, inventory_transactions, labor_transactions) include partition definitions in their respective migration files
- The current migration set expands the platform to roughly 518 tables and pushes HESEM into full-stack manufacturing ERP territory rather than a partial ERP/QMS portal
