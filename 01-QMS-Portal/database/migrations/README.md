# HESEM QMS Portal - Database Migrations

## Overview

This directory contains ordered PostgreSQL migration files that compose the full HESEM QMS Portal database schema. The monolithic `schema.sql` has been split into 24 independently runnable migration files.

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

### Manual execution

Run each file in numerical order:

```bash
for f in migrations/0*.sql; do
    echo "Running $f..."
    psql -h localhost -d qms_portal -f "$f"
done
```

## Rolling Back

Each migration file contains rollback instructions in comments at the bottom of the file. To rollback, execute the rollback SQL statements in reverse order (024 first, then 023, etc.).

## Notes

- All migrations use `BEGIN;` / `COMMIT;` for transactional safety
- Each migration is independently runnable given its dependencies are met
- The `020_indexes.sql` file creates all indexes; if running tables and indexes together, you can skip the inline index creation in table files (they are duplicated in 020 for the split-file approach)
- Partitioned tables (audit_events, inventory_transactions, labor_transactions) include partition definitions in their respective migration files
- The schema covers 86+ tables, 8 views, 5 functions, and ~80 ENUM types mapping 1,061 variables across 53 categories
