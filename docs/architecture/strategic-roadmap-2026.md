# HESEM QMS Portal -- Strategic Development Roadmap 2026

**Document ID:** ROADMAP-2026-001
**Date:** 2026-03-28
**Owner:** IT / QMS Engineering
**Status:** Active (Phases 1-5 Complete, Phase 7 in progress)
**Scope:** Migrate the QMS Portal from JSON file storage to PostgreSQL, modernize the API, and add analytics, offline, and intelligence capabilities. Production integration (Phase 7) converts demo components into governed production modules.

---

## Table of Contents

1. [Current State Baseline](#1-current-state-baseline)
2. [Target Architecture](#2-target-architecture)
3. [Dependency Graph](#3-dependency-graph)
4. [Phase 1: Database Migration Layer (Weeks 1-4)](#phase-1-database-migration-layer-weeks-1-4)
5. [Phase 2: API Modernization (Weeks 5-8)](#phase-2-api-modernization-weeks-5-8)
6. [Phase 3: Form Engine Enhancement (Weeks 9-12)](#phase-3-form-engine-enhancement-weeks-9-12)
7. [Phase 4: Dashboard and Analytics (Weeks 13-16)](#phase-4-dashboard-and-analytics-weeks-13-16)
8. [Phase 5: Offline and Mobile (Weeks 17-20)](#phase-5-offline-and-mobile-weeks-17-20)
9. [Phase 6: Intelligence Layer (Weeks 21-24)](#phase-6-intelligence-layer-weeks-21-24)
10. [Phase 7: Production Integration (Phases A-H)](#phase-7-production-integration-phases-a-h)
11. [Risk Register](#7-risk-register)
12. [Resource Summary](#8-resource-summary)

---

## 1. Current State Baseline

### 1.1 Backend

| Component | Detail |
|-----------|--------|
| API | `01-QMS-Portal/api.php` -- single file, 6,876 lines, 55+ action cases |
| Workflow helpers | `01-QMS-Portal/form_workflow.php` -- 339 lines, form versioning & state |
| Auth | Session-based with TOTP 2FA (Authenticator app), CSRF tokens |
| Data storage | JSON files under `01-QMS-Portal/qms-data/config/` |
| User store | `qms-data/config/users.json` |
| Role permissions | `qms-data/config/role_permissions.json` |
| Form registry | `qms-data/config/form_control_registry.json` (84k+ tokens, all forms) |
| Form workflow state | `qms-data/form-workflow/{CODE}/state.json` + `manifest.json` per form |
| Document type registry | `qms-data/config/document_type_registry.json` (10 departments, 13 record types) |
| Variable library | `qms-data/config/variable_library.json` (1,061 variables, 53 categories) |
| Dictionary | `11-Glossary/dict-data.json` + `dict-data.js` |
| Deployment | Ubuntu VPS, GitHub Actions SSH into `tools/vps-setup/scripts/deploy.sh`; portal only exposes read-only `admin_git_status` |

### 1.2 API Endpoint Inventory (selected action cases)

**Authentication (4):** `status`, `auth_login`, `auth_mfa_verify`, `auth_enroll_verify`, `auth_logout`

**Admin -- Users (4):** `admin_users_list`, `admin_user_upsert`, `admin_user_delete`, `admin_user_reset_password`

**Admin -- System (6):** `admin_git_status`, `admin_clear_site_cache`, `role_perms_get`, `admin_role_perms_save`, `get_data_settings`, `save_data_settings`

**Admin -- Display (4):** `docs_visibility_get`, `admin_docs_visibility_save`, `admin_portal_display_config_get`, `admin_portal_display_config_save`

**Documents -- CRUD (8):** `doc_create`, `docs_snapshot`, `doc_versions_list`, `doc_start_new_revision`, `doc_save_draft`, `doc_update_meta`, `doc_delete_drafts`, `doc_delete_version`

**Documents -- Workflow (3):** `doc_submit_review`, `doc_approve`, `doc_reject`

**Documents -- Files (5):** `delete_doc`, `delete_folder`, `create_folder`, `move_doc`, `rename_doc`, `rename_folder`

**Documents -- Navigation (4):** `scan_folders`, `folder_descriptions`, `doc_descriptions_get`, `save_doc_description`

**Documents -- Streaming (3):** `doc_stream`, `form_version_stream`, `docs_custom_list`

**Forms -- Upload (1):** `form_upload_draft`

**Forms -- Online (4):** `online_form_list`, `online_form_schema`, `online_form_submit`, `online_form_entries`

**Record IDs (3):** `record_id_registry`, `record_id_next`, `record_id_peek`

**Dictionary (3):** `dict_list`, `dict_upsert`, `dict_delete`

### 1.3 Frontend

| Component | Detail |
|-----------|--------|
| Entry point | `01-QMS-Portal/index.html` (gateway landing) |
| Portal | `01-QMS-Portal/portal.html` (SPA shell with login) |
| JS modules | 14 files under `scripts/portal/` and `scripts/` |
| Key scripts | `01-data-config.js` (config), `02-state-auth-ui.js` (auth + UI state), `03-editor-core.js` (document editor), `04-workflow-actions.js`, `05-workflow-panel.js`, `08-deploy-dashboard.js`, `09-online-forms.js` (form hub), `10-upload-validator.js` |
| Styling | `styles/portal.main.css`, `styles/deploy-dashboard.css`, `styles/online-forms.css`, `styles/gateway-landing.css` |
| Framework | Vanilla JS -- no React/Vue/Angular |

### 1.4 New Foundation (Ready but Not Connected)

| Asset | Detail |
|-------|--------|
| PostgreSQL schema | `01-QMS-Portal/database/schema.sql` -- 3,516 lines, 103 tables, 80+ enum types |
| Technology report | `01-QMS-Portal/docs/database-schema-technology-report-2025-2026.md` |
| Variable library | 1,061 variables across 53 categories, fully typed with validation patterns |
| Document type registry | 10 departments, 13 record types with naming patterns and SharePoint paths |
| Target DB | PostgreSQL 16+ (Neon Serverless recommended) with pgvector, pg_trgm, btree_gist, pgcrypto |

### 1.5 Schema Table Groups (103 Tables)

**Core system (8):** departments, roles, users, user_roles, sessions, audit_events (partitioned quarterly), documents, document_versions

**Document management (4):** document_embeddings, document_distribution, form_schemas, form_entries

**Form and record (5):** form_attachments, record_counters, records, record_links, variable_registry

**ERP master data (8):** items, item_revisions, bill_of_materials, bom_components, work_centers, routings, routing_operations, customers

**Sales and purchasing (6):** sales_orders, sales_order_lines, vendors, vendor_ratings, purchase_orders, purchase_order_lines

**Inventory and warehouse (8):** warehouses, inventory_locations, lot_master, serial_master, inventory_transactions (partitioned), job_orders, job_operations, labor_transactions (partitioned)

**Production and scheduling (2):** production_schedule, naming_patterns

**Quality (10):** inspection_plans, inspection_results, spc_data, ncr_records, capa_records, fai_records, fai_characteristics, certificates, npi_projects, contamination_checks

**Equipment and maintenance (5):** equipment, calibration_records, maintenance_work_orders, tools, tool_transactions

**HR and training (4):** employees, training_records, skills_matrix, employee_certifications

**Audit and improvement (4):** audits, audit_findings, audit_actions, risk_register, improvement_projects

**Management and finance (5):** management_reviews, cost_elements, job_costing, gl_transactions, ap_ar_invoices

**Logistics (4):** shipments, shipment_packages, compliance_records, export_licenses

**Subcontracting (2):** subcontract_orders, subcontract_receipts

**Projects and RMA (4):** rma_orders, projects, project_milestones, project_resources

**MRP (1):** mrp_planned_orders

**EHS (1):** ehs_incidents

**Platform (6):** kpi_definitions, kpi_snapshots, notifications, file_attachments, tags, comments, workflow_definitions, workflow_instances

---

## 2. Target Architecture

```
+----------------------------------------------------------+
|                    CLIENT TIER                            |
|  portal.html (SPA)   |  PWA + Service Worker  |  Tablet  |
|  Vanilla JS modules   |  IndexedDB / libSQL    |  Scanner |
+----------------------------------------------------------+
             |                    |                |
             v                    v                v
+----------------------------------------------------------+
|                   API GATEWAY TIER                        |
|  api/Router.php  -->  Middleware Stack                    |
|  (Auth, CORS, RateLimit, CSRF, Logging)                  |
+----------------------------------------------------------+
             |
             v
+----------------------------------------------------------+
|                 CONTROLLER TIER                           |
|  AuthController  |  DocumentController  |  FormController |
|  RecordController  |  AdminController  |  DictController  |
|  UserController  |  DashboardController                   |
+----------------------------------------------------------+
             |
             v
+----------------------------------------------------------+
|                  SERVICE TIER                             |
|  FormEngine  |  WorkflowEngine  |  RecordIdGenerator     |
|  AuditTrail  |  KpiEngine  |  SpcEngine                  |
|  NotificationService  |  SearchService                    |
+----------------------------------------------------------+
             |
             v
+----------------------------------------------------------+
|                 DATA ACCESS TIER                          |
|  DataLayer.php (abstraction)                             |
|   - JsonAdapter.php   (reads/writes JSON files)          |
|   - PostgresAdapter.php (reads/writes PostgreSQL)        |
|   - Feature flags control primary/shadow source          |
+----------------------------------------------------------+
         |                          |
         v                          v
  +-------------+          +------------------+
  | JSON Files  |          | PostgreSQL 16+   |
  | (qms-data/) |          | (Neon Serverless)|
  | [LEGACY]    |          | 103 tables       |
  +-------------+          | pgvector         |
                           | partitioned      |
                           +------------------+
```

---

## 3. Dependency Graph

```
Phase 1 (Weeks 1-4)        Phase 2 (Weeks 5-8)
Database Migration    ----->  API Modernization
Layer                         |
  |                           |
  |   +-----------------------+
  |   |
  v   v
Phase 3 (Weeks 9-12)
Form Engine Enhancement
  |
  +-----+------+
  |            |
  v            v
Phase 4       Phase 5
(Weeks 13-16) (Weeks 17-20)
Dashboard &   Offline &
Analytics     Mobile
  |            |
  +-----+------+
        |
        v
Phase 6 (Weeks 21-24)
Intelligence Layer
```

**Parallelism opportunities:**
- Phase 4 and Phase 5 can run in parallel after Phase 3 completes.
- Phase 1 tasks 1.1-1.2 can begin while the schema.sql is finalized.
- Phase 2 controller refactoring (2.2) can start in week 4 alongside Phase 1 completion.
- Phase 6 document embedding prep (6.1) can start in week 16 alongside Phase 4/5.

**Strict dependencies:**
- Phase 2 requires Phase 1 (DataLayer must exist before controllers use it).
- Phase 3 requires Phase 2 (controllers must be split before the form engine integrates).
- Phase 4 requires Phase 3 (KPI calculations need the form/record data in PostgreSQL).
- Phase 5 requires Phase 3 (offline sync needs the form engine's validation pipeline).
- Phase 6 requires Phase 4 (anomaly detection needs KPI/SPC data flowing).

---

## Phase 1: Database Migration Layer (Weeks 1-4) -- COMPLETE

**Status:** COMPLETE (2026-03-29) -- PostgreSQL schema (103 tables, 80+ enums) deployed; DataLayer abstraction operational; JSON-to-PG import scripts verified; feature flags controlling read/write source.

**Goal:** Shadow-write all data operations to PostgreSQL while keeping JSON files as the primary read/write source. Zero disruption to the running portal.

**Estimated effort:** 28 person-days

### Task 1.1: Create Migration Files

**Effort:** 3 person-days

Split `database/schema.sql` (3,516 lines) into ordered, idempotent migration files.

**Files to create:**
```
01-QMS-Portal/database/migrations/
  001_extensions.sql          -- uuid-ossp, pgcrypto, pg_trgm, btree_gist, vector
  002_enum_types.sql          -- all 80+ CREATE TYPE statements
  003_core_tables.sql         -- departments, roles, users, user_roles, sessions
  004_audit_events.sql        -- audit_events (partitioned) + partitions
  005_documents.sql           -- documents, document_versions, document_embeddings, document_distribution
  006_forms.sql               -- form_schemas, form_entries, form_attachments
  007_records.sql             -- record_counters, records, record_links
  008_erp_master.sql          -- items, item_revisions, bom, bom_components, work_centers, routings, routing_operations
  009_customers_vendors.sql   -- customers, sales_orders, sales_order_lines, vendors, vendor_ratings, purchase_orders, purchase_order_lines
  010_inventory.sql           -- warehouses, inventory_locations, lot_master, serial_master, inventory_transactions (partitioned)
  011_production.sql          -- job_orders, job_operations, labor_transactions (partitioned), production_schedule
  012_quality.sql             -- inspection_plans, inspection_results, spc_data, ncr_records, capa_records, fai_records, fai_characteristics, certificates, npi_projects
  013_equipment.sql           -- equipment, calibration_records, maintenance_work_orders, tools, tool_transactions
  014_hr_training.sql         -- employees, training_records, skills_matrix, employee_certifications
  015_audit_improvement.sql   -- audits, audit_findings, audit_actions, risk_register, improvement_projects, management_reviews
  016_finance.sql             -- cost_elements, job_costing, gl_transactions, ap_ar_invoices
  017_logistics.sql           -- shipments, shipment_packages, compliance_records, export_licenses, subcontract_orders, subcontract_receipts
  018_projects_rma.sql        -- rma_orders, projects, project_milestones, project_resources, mrp_planned_orders
  019_ehs_kpi.sql             -- ehs_incidents, contamination_checks, kpi_definitions, kpi_snapshots
  020_platform.sql            -- variable_registry, naming_patterns, notifications, file_attachments, tags, comments, workflow_definitions, workflow_instances
  021_indexes.sql             -- all CREATE INDEX statements not embedded in table DDL
  022_row_level_security.sql  -- RLS policies per table
  023_seed_departments.sql    -- INSERT for 10 departments from document_type_registry.json
  024_seed_roles.sql          -- INSERT for role codes from users.json / role_permissions.json
  025_seed_variables.sql      -- INSERT 1,061 variables from variable_library.json
```

**Files to create:**
```
01-QMS-Portal/database/migrate.php    -- CLI runner: applies migrations in order, tracks applied in a migrations table
01-QMS-Portal/database/migrate.sh     -- Shell wrapper for cron/CI
```

**Database tables involved:** All 103 tables, plus a `schema_migrations` tracking table.

**Success criteria:**
- Running `php database/migrate.php` on an empty PostgreSQL database creates all 103 tables without errors.
- Running it again is a no-op (idempotent).
- Seed data inserts 10 departments, all roles, and 1,061 variables.

### Task 1.2: Create PostgreSQL Connection Manager

**Effort:** 3 person-days

**Files to create:**
```
01-QMS-Portal/database/connection.php
```

This file provides:
- PDO connection factory with connection pooling awareness (Neon Serverless supports connection pooling via PgBouncer).
- Environment-based configuration: `QMS_DB_HOST`, `QMS_DB_PORT`, `QMS_DB_NAME`, `QMS_DB_USER`, `QMS_DB_PASS`, `QMS_DB_SSLMODE`.
- Fallback to a `.env` file at `01-QMS-Portal/.env` (gitignored).
- Connection health check function (`db_ping()`).
- Prepared statement helper with parameter binding.
- Transaction wrapper with automatic rollback on exception.
- Connection lazy-initialization (only connect when first query is executed, not on every API request).

**Database tables involved:** None directly; this is infrastructure.

**Success criteria:**
- `db_ping()` returns true when PostgreSQL is reachable.
- `db_ping()` returns false (not throws) when PostgreSQL is unreachable.
- Prepared statements prevent SQL injection for all parameter types.
- Connection is reused within a single request; not reopened per query.

### Task 1.3: Create DataLayer Abstraction

**Effort:** 8 person-days

**Files to create:**
```
01-QMS-Portal/database/DataLayer.php
01-QMS-Portal/database/adapters/JsonAdapter.php
01-QMS-Portal/database/adapters/PostgresAdapter.php
01-QMS-Portal/database/adapters/AdapterInterface.php
01-QMS-Portal/database/FeatureFlags.php
```

**AdapterInterface.php** defines the contract:
```php
interface DataAdapter {
    // Users
    public function loadUsers(): array;
    public function saveUsers(array $users): void;
    public function findUserByUsername(string $username): ?array;

    // Documents
    public function loadDocumentTree(): array;
    public function saveDocument(array $doc): void;
    public function getDocumentVersions(string $docId): array;

    // Forms
    public function loadFormRegistry(): array;
    public function loadFormState(string $code): ?array;
    public function saveFormState(string $code, array $state): void;
    public function loadFormManifest(string $code): ?array;
    public function saveFormManifest(string $code, array $manifest): void;

    // Online forms
    public function loadFormSchemas(): array;
    public function loadFormSchema(string $formCode): ?array;
    public function saveFormEntry(array $entry): void;
    public function loadFormEntries(string $formCode): array;

    // Record IDs
    public function loadRecordCounters(): array;
    public function incrementRecordCounter(string $type, int $year): int;

    // Dictionary
    public function loadDictionary(): array;
    public function upsertDictEntry(array $entry): void;
    public function deleteDictEntry(string $id): void;

    // Config
    public function loadRolePermissions(): array;
    public function saveRolePermissions(array $perms): void;
    public function loadDocsVisibility(): array;
    public function saveDocsVisibility(array $vis): void;
    public function loadPortalDisplayConfig(): array;
    public function savePortalDisplayConfig(array $config): void;
}
```

**JsonAdapter.php** wraps the existing `read_json_file()` / `write_json_file()` functions from `api.php`, preserving exact current behavior.

**PostgresAdapter.php** implements the same interface using PDO queries against the schema.sql tables.

**DataLayer.php** orchestrates:
```php
class DataLayer {
    private JsonAdapter $json;
    private ?PostgresAdapter $pg;
    private FeatureFlags $flags;

    // Read: always from primary source (JSON by default)
    // Write: always to primary, plus shadow-write to secondary if enabled
    // Feature flag 'pg_primary' flips the source
}
```

**FeatureFlags.php** reads from `qms-data/config/feature_flags.json`:
```json
{
  "pg_shadow_write": true,
  "pg_primary_read": false,
  "pg_primary_write": false,
  "json_fallback_on_pg_error": true
}
```

**Files to modify:**
- `01-QMS-Portal/api.php` -- add `require_once __DIR__ . '/database/DataLayer.php';` at the top; create a global `$dataLayer` instance. Initially, no action handlers are changed (DataLayer defaults to JSON-only mode).

**Database tables involved:** users, roles, departments, documents, document_versions, form_schemas, form_entries, record_counters, records, audit_events.

**Success criteria:**
- With `pg_shadow_write: false`, the portal behaves identically to today.
- With `pg_shadow_write: true`, every JSON write also writes to PostgreSQL; any PostgreSQL error is logged but does not break the JSON write.
- With `pg_primary_read: true`, reads come from PostgreSQL; if PostgreSQL is down and `json_fallback_on_pg_error: true`, reads fall back to JSON.

### Task 1.4: Create JSON-to-PostgreSQL Import Scripts

**Effort:** 5 person-days

**Files to create:**
```
01-QMS-Portal/database/import/
  import_users.php             -- users.json -> users + user_roles tables
  import_role_permissions.php   -- role_permissions.json -> roles.permissions JSONB
  import_form_registry.php      -- form_control_registry.json -> form_schemas table
  import_documents.php          -- scan_folders output -> documents + document_versions
  import_variables.php          -- variable_library.json -> variable_registry table
  import_doc_types.php          -- document_type_registry.json -> departments + record_counters
  import_dictionary.php         -- dict-data.json -> a dictionary table (or JSONB in variables)
  import_form_entries.php       -- qms-data/online-forms/entries/ -> form_entries table
  import_all.php                -- orchestrator: runs all imports in dependency order
```

**Mapping details:**

| JSON Source | PostgreSQL Target | Notes |
|-------------|------------------|-------|
| `users.json` | `users`, `user_roles` | Map `role` field to `roles.role_code` via lookup; hash passwords already stored as bcrypt |
| `role_permissions.json` | `roles.permissions` JSONB | Merge into existing role rows |
| `form_control_registry.json` | `form_schemas` | Each entry becomes a row; `schema_json` stores the form definition as JSONB |
| `variable_library.json` | `variable_registry` | One row per variable key; 1,061 rows |
| `document_type_registry.json` | `departments`, `record_counters` | 10 department rows, 13 record type counter rows |
| `qms-data/form-workflow/*/state.json` | `records` | Each form workflow state maps to a record row |
| `11-Glossary/dict-data.json` | Custom or JSONB column | Dictionary entries as rows |

**Database tables involved:** users, user_roles, roles, departments, form_schemas, variable_registry, record_counters, documents, form_entries.

**Success criteria:**
- `php database/import/import_all.php` completes without errors.
- Row counts in PostgreSQL match JSON source counts (users, variables, form entries).
- Re-running import is idempotent (upsert, not duplicate).

### Task 1.5: Add Database Health Check Endpoint

**Effort:** 1 person-day

**Files to modify:**
- `01-QMS-Portal/api.php` -- add action case `db_health_check` (admin-only).

Response format:
```json
{
  "ok": true,
  "postgres": {
    "connected": true,
    "latency_ms": 12,
    "version": "PostgreSQL 16.2",
    "tables_count": 103,
    "migrations_applied": 25
  },
  "json_files": {
    "users_count": 24,
    "forms_count": 87,
    "variables_count": 1061
  },
  "feature_flags": {
    "pg_shadow_write": true,
    "pg_primary_read": false
  },
  "sync_status": {
    "users_in_sync": true,
    "forms_in_sync": true,
    "last_sync_check": "2026-04-15T08:30:00Z"
  }
}
```

**Database tables involved:** `schema_migrations`, plus COUNT queries on key tables.

**Success criteria:**
- Endpoint returns accurate connection status even when PostgreSQL is down.
- Non-admin users receive 403.

### Task 1.6: Unit Tests for DataLayer

**Effort:** 8 person-days

**Files to create:**
```
01-QMS-Portal/tests/
  bootstrap.php                -- test autoloader, test database config
  DataLayerTest.php            -- tests for DataLayer orchestration
  JsonAdapterTest.php          -- tests for JSON read/write
  PostgresAdapterTest.php      -- tests for PostgreSQL read/write
  FeatureFlagsTest.php         -- tests for flag toggling
  ImportTest.php               -- tests for import scripts
  fixtures/
    users.json                 -- minimal test user data
    form_control_registry.json -- minimal test form data
    variable_library.json      -- subset of variables for testing
```

Testing approach: PHPUnit 10+ with a dedicated test PostgreSQL database (can use Neon branching for isolated test environments).

**Success criteria:**
- All adapter methods have at least one positive and one negative test.
- Shadow-write tests verify data lands in both JSON and PostgreSQL.
- Feature flag toggle tests verify read source switches correctly.
- CI pipeline runs tests on every push.

### Phase 1 Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| PostgreSQL connection failures on shared hosting | Medium | Low | Feature flags default to JSON-only; shadow writes fail silently |
| Data format mismatches between JSON and PostgreSQL | High | Medium | Import scripts include validation; discrepancies logged to `qms-data/sync_errors.log` |
| Performance overhead from dual writes | Low | Low | Shadow writes are async-style (fire and forget with error logging) |
| Schema.sql has untested constraints | Medium | Medium | Migration files are tested against empty DB before production |

---

## Phase 2: API Modernization (Weeks 5-8) -- COMPLETE

**Status:** COMPLETE (2026-03-29) -- MVC router, 9 domain controllers, middleware stack (Auth, CORS, CSRF, RateLimit, Logging), service layer, and server-side validators all operational. Legacy `?action=` routing preserved.

**Goal:** Refactor the monolithic `api.php` (6,876 lines) into a proper MVC structure with domain controllers, middleware, and server-side validation. Maintain backward compatibility for the existing `?action=` query parameter routing.

**Estimated effort:** 35 person-days

### Task 2.1: Create Router

**Effort:** 3 person-days

**Files to create:**
```
01-QMS-Portal/api/Router.php
```

The router supports two styles simultaneously:
- **Legacy:** `api.php?action=doc_create` (existing, keep working)
- **RESTful:** `api.php/v1/documents` with HTTP verbs (new)

Implementation:
```php
class Router {
    private array $routes = [];

    public function register(string $method, string $pattern, callable $handler): void;
    public function dispatch(string $method, string $uri, array $query): void;

    // Legacy compatibility: maps action= to controller methods
    private function legacyDispatch(string $action): void;
}
```

Action-to-route mapping (subset):
```
action=status            -> GET    /v1/auth/status
action=auth_login        -> POST   /v1/auth/login
action=doc_create        -> POST   /v1/documents
action=docs_snapshot     -> GET    /v1/documents
action=doc_approve       -> POST   /v1/documents/{id}/approve
action=online_form_list  -> GET    /v1/forms
action=record_id_next    -> POST   /v1/records/next-id
```

**Files to modify:**
- `01-QMS-Portal/api.php` -- replace the giant `switch ($action)` with `$router->dispatch()`. The switch body is extracted into controller methods.
- `01-QMS-Portal/.htaccess` -- add RewriteRule for clean URLs (optional, legacy `?action=` continues to work).

**Success criteria:**
- All 55 existing `?action=` calls continue to work identically.
- New `/v1/` routes are available in parallel.
- 404 response for unknown routes/actions.

### Task 2.2: Create Domain Controllers

**Effort:** 12 person-days

**Files to create:**
```
01-QMS-Portal/api/controllers/
  AuthController.php          -- status, auth_login, auth_mfa_verify, auth_enroll_verify, auth_logout
  DocumentController.php      -- doc_create, docs_snapshot, doc_versions_list, doc_start_new_revision,
                                 doc_save_draft, doc_submit_review, doc_approve, doc_reject,
                                 doc_update_meta, doc_delete_drafts, doc_delete_version,
                                 doc_stream, docs_custom_list
  FileController.php          -- delete_doc, delete_folder, create_folder, move_doc,
                                 rename_folder, rename_doc, scan_folders
  FormController.php          -- form_upload_draft, form_version_stream,
                                 online_form_list, online_form_schema, online_form_submit, online_form_entries
  RecordController.php        -- record_id_registry, record_id_next, record_id_peek
  AdminController.php         -- admin_git_status, admin_clear_site_cache,
                                 admin_docs_visibility_save, admin_portal_display_config_get,
                                 admin_portal_display_config_save, get_data_settings, save_data_settings,
                                 db_health_check
  UserController.php          -- admin_users_list, admin_user_upsert, admin_user_delete,
                                 admin_user_reset_password, role_perms_get, admin_role_perms_save
  DictController.php          -- dict_list, dict_upsert, dict_delete
  DescriptionController.php   -- folder_descriptions, doc_descriptions_get, save_doc_description
```

Each controller receives the `DataLayer` instance via constructor injection. Controller methods extract their logic verbatim from the existing `api.php` switch cases, then gradually refactor to use DataLayer methods instead of direct `read_json_file()` / `write_json_file()`.

**Database tables involved:** All tables accessed by the corresponding endpoints.

**Success criteria:**
- `api.php` is reduced from 6,876 lines to under 200 lines (bootstrap + dispatch only).
- Every controller method produces identical JSON responses as the original switch case for the same input.
- No regressions in the portal UI.

### Task 2.3: Create Middleware Stack

**Effort:** 5 person-days

**Files to create:**
```
01-QMS-Portal/api/middleware/
  AuthMiddleware.php        -- session validation, MFA enforcement, idle timeout (existing logic from require_logged_in)
  CorsMiddleware.php        -- CORS headers (existing logic from api.php header block)
  CsrfMiddleware.php        -- CSRF token validation (existing logic)
  RateLimitMiddleware.php   -- rate limiting (existing file-based, later Redis/PG)
  LoggingMiddleware.php     -- request/response logging to audit_events table
  JsonResponseMiddleware.php -- standard JSON response formatting, error handling
```

Middleware pipeline:
```
Request -> CORS -> RateLimit -> CSRF -> Auth -> Controller -> Logging -> Response
```

**Files to modify:**
- `01-QMS-Portal/api.php` -- replace inline middleware logic with pipeline calls.

**Success criteria:**
- Auth middleware rejects unauthenticated requests with 401 (same as current behavior).
- Rate limiting works identically to current file-based approach.
- Logging middleware writes to audit_events in PostgreSQL (when shadow write is enabled).

### Task 2.4: Create Server-Side Validators

**Effort:** 5 person-days

**Files to create:**
```
01-QMS-Portal/api/validators/
  ValidatorFactory.php       -- builds validators from variable_library.json definitions
  DocumentValidator.php      -- validates doc_create, doc_update_meta inputs
  FormValidator.php          -- validates online_form_submit against JSON Schema
  UserValidator.php          -- validates admin_user_upsert inputs
  RecordIdValidator.php      -- validates record_id_next inputs (type, department)
```

**ValidatorFactory.php** reads `variable_library.json` at startup and creates validation rules:
- For each variable with a `validation` regex: compile a pattern matcher.
- For each variable with `enum_values`: create an allowed-values check.
- For each variable with `required: true`: create a presence check.
- For `date` type variables: validate ISO 8601 format.

**Database tables involved:** `variable_registry` (reads validation rules when in PG-primary mode).

**Success criteria:**
- All form submissions are validated server-side against the variable library rules.
- Validation errors return structured JSON with field-level error messages.
- No valid current request is rejected (backward compatible).

### Task 2.5: Create Service Layer

**Effort:** 5 person-days

**Files to create:**
```
01-QMS-Portal/api/services/
  AuthService.php            -- login logic, MFA verification, session management
  DocumentService.php        -- document CRUD business logic
  FormWorkflowService.php    -- form version control (refactored from form_workflow.php)
  FileService.php            -- file operations with path safety checks
  RecordIdService.php        -- record ID generation with counter management
  DictionaryService.php      -- dictionary CRUD
```

Services contain business logic extracted from controllers. Controllers become thin dispatchers.

**Success criteria:**
- Business logic is testable independently of HTTP request/response.
- Services use DataLayer for all data access (no direct file I/O).

### Task 2.6: Switch DataLayer to PostgreSQL Primary

**Effort:** 3 person-days

**Files to modify:**
- `01-QMS-Portal/database/FeatureFlags.php` -- change defaults:
  ```json
  {
    "pg_shadow_write": true,
    "pg_primary_read": true,
    "pg_primary_write": true,
    "json_fallback_on_pg_error": true
  }
  ```

**Prerequisite:** Phase 1 complete; import scripts have been run; data verified.

Rollback plan: Toggle `pg_primary_read` and `pg_primary_write` back to `false` in the feature flags JSON file. The portal immediately reverts to JSON file reads/writes with zero downtime.

**Success criteria:**
- Portal reads and writes to PostgreSQL as primary.
- JSON files continue to be written as backup (shadow-write reversed).
- All portal functionality works identically.
- Response times are within 20% of JSON-based performance.

### Task 2.7: API Documentation (OpenAPI 3.1)

**Effort:** 2 person-days

**Files to create:**
```
01-QMS-Portal/api/openapi.yaml
01-QMS-Portal/api/docs/index.html    -- Swagger UI viewer
```

The OpenAPI spec documents all 55+ endpoints with:
- Request/response schemas referencing variable_library.json types.
- Authentication requirements (session cookie + CSRF header).
- Error response formats.
- Examples from actual portal usage.

**Success criteria:**
- OpenAPI spec validates with no errors.
- Swagger UI renders all endpoints with try-it-out capability.

### Phase 2 Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Controller extraction breaks existing behavior | High | High | Every controller method gets a 1:1 comparison test against original api.php output |
| Frontend JS relies on undocumented response quirks | Medium | Medium | Run full portal regression before and after; compare network traces |
| Middleware ordering causes auth/CORS issues | Low | High | Middleware tests with explicit ordering verification |

---

## Phase 3: Form Engine Enhancement (Weeks 9-12) -- COMPLETE

**Status:** COMPLETE (2026-03-29) -- FormEngine, WorkflowEngine, RecordIdGenerator, AuditTrail, AttachmentService, and ESignatureService all built. 4-tab Form Hub UI (Form Control, Evidence Fill/Download, Record ID Assistant, Allocation Tracker) deployed. 42 record types defined in record_type_expanded.json.

**Goal:** Build a robust form system with JSON Schema validation, state-machine workflow, atomic record ID generation, comprehensive audit trail, and file attachment integrity.

**Estimated effort:** 40 person-days

### Task 3.1: FormEngine -- JSON Schema Validation

**Effort:** 6 person-days

**Files to create:**
```
01-QMS-Portal/api/services/FormEngine.php
01-QMS-Portal/api/schemas/
  form-base.schema.json       -- base form schema (JSON Schema 2020-12)
  field-types.schema.json     -- shared field type definitions ($dynamicAnchor)
  FRM-631-ncr.schema.json     -- NCR form schema
  FRM-641-capa.schema.json    -- CAPA form schema
  FRM-601-cal.schema.json     -- Calibration form schema
  FRM-802-trn.schema.json     -- Training form schema
  FRM-913-aud.schema.json     -- Audit form schema
  FRM-403-scar.schema.json    -- SCAR form schema
```

**FormEngine.php** implementation:
- Uses `opis/json-schema` PHP library (JSON Schema 2020-12 compliant).
- Loads form schema from `form_schemas` PostgreSQL table (or from JSON file fallback).
- Validates submitted data against schema before persisting.
- Returns structured validation errors with field paths.
- Supports `$dynamicRef` for shared field types defined in `variable_library.json`.

**Database tables involved:** `form_schemas`, `form_entries`, `variable_registry`.

**Dependencies:** Requires `composer require opis/json-schema` (PHP 8.1+).

**Success criteria:**
- All existing online form submissions pass validation.
- Invalid submissions return descriptive errors (field path + rule violated).
- New form schemas can be added by creating a JSON file -- no PHP changes needed.

### Task 3.2: WorkflowEngine -- State Machine

**Effort:** 8 person-days

**Files to create:**
```
01-QMS-Portal/api/services/WorkflowEngine.php
01-QMS-Portal/api/services/workflows/
  DocumentWorkflow.php       -- draft -> review -> approved / rejected -> superseded
  FormWorkflow.php           -- draft -> submitted -> in_review -> approved / rejected -> closed
  NcrWorkflow.php            -- open -> contained -> investigating -> capa_assigned -> closed -> verified
  CapaWorkflow.php           -- open -> in_progress -> implemented -> verification -> closed_effective / closed_not_effective
  CalibrationWorkflow.php    -- scheduled -> in_progress -> completed (pass/fail/limited)
```

**WorkflowEngine.php** is a generic state machine:
```php
class WorkflowEngine {
    // Define allowed transitions
    public function canTransition(string $currentState, string $targetState, array $context): bool;
    // Execute transition with side effects
    public function transition(string $entityType, string $entityId, string $targetState, array $context): array;
    // Get available next states
    public function availableTransitions(string $entityType, string $currentState, array $userRoles): array;
}
```

Transition rules are defined in `workflow_definitions` PostgreSQL table, seeded from workflow PHP classes.

**Database tables involved:** `workflow_definitions`, `workflow_instances`, `audit_events`, `records`.

**Success criteria:**
- Document approval flow works identically to current behavior.
- NCR and CAPA workflows enforce the correct state sequence.
- Unauthorized transitions are rejected with 403.
- Every transition creates an audit event.

### Task 3.3: RecordIdGenerator -- Atomic Counters

**Effort:** 3 person-days

**Files to create:**
```
01-QMS-Portal/api/services/RecordIdGenerator.php
```

Replaces the current file-based counter system (`qms-data/counters/`) with PostgreSQL sequences for atomic, race-condition-free ID generation.

```php
class RecordIdGenerator {
    // Generate next ID atomically using PostgreSQL advisory locks + sequences
    public function next(string $recordType, ?int $year = null): string;
    // Peek at next ID without consuming it
    public function peek(string $recordType, ?int $year = null): string;
    // Get registry of all record types with their current counters
    public function registry(): array;
}
```

Naming patterns from `document_type_registry.json`:
- `NCR-{YYYY}-{NNN}` -> `NCR-2026-001`
- `CAPA-{YYYY}-{NNN}` -> `CAPA-2026-001`
- `CAL-{EquipCode}-{NNN}` -> `CAL-CMM01-001`
- `AUD-{YYYY}-IA{NN}` -> `AUD-2026-IA01`

**Database tables involved:** `record_counters`, `naming_patterns`.

**Success criteria:**
- Concurrent ID generation (10 simultaneous requests) produces unique, sequential IDs with no gaps.
- IDs follow the naming patterns defined in `document_type_registry.json`.
- `peek` returns the next ID without incrementing.

### Task 3.4: AuditTrail -- Event Sourcing

**Effort:** 8 person-days

**Files to create:**
```
01-QMS-Portal/api/services/AuditTrail.php
01-QMS-Portal/api/events/
  EventTypes.php             -- enum of all event types
  FormSubmitted.php          -- event payload for form submission
  FormApproved.php           -- event payload for form approval
  DocumentRevised.php        -- event payload for document revision
  RecordStateChanged.php     -- event payload for NCR/CAPA state changes
  UserLoggedIn.php           -- event payload for login
```

**AuditTrail.php** writes to the partitioned `audit_events` table:
```php
class AuditTrail {
    public function record(string $eventType, string $streamId, array $data, ?string $userId = null): void;
    public function getHistory(string $streamId, ?int $limit = null): array;
    public function getByType(string $eventType, ?string $from = null, ?string $to = null): array;
    public function getByUser(string $userId, ?int $limit = null): array;
}
```

Every state change in the system creates an immutable audit event. The `audit_events` table is append-only -- no UPDATE or DELETE is permitted.

**Database tables involved:** `audit_events` (partitioned by quarter: `audit_events_2026_q1` through `audit_events_2027_q1`).

**Success criteria:**
- Every form submission, approval, rejection, and login creates an audit event.
- Events are queryable by stream (entity), type, user, and time range.
- No audit events can be modified or deleted via the API.
- Audit trail is AS9100D / ISO 9001:2015 compliant (who, what, when, from-state, to-state).

### Task 3.5: Conditional Logic and Cross-Field Validation

**Effort:** 5 person-days

**Files to modify:**
- `01-QMS-Portal/api/services/FormEngine.php` -- add conditional field rules.
- Form schema JSON files -- add `if/then/else` blocks and `dependentRequired`.

Example: In the NCR form (FRM-631), if `disposition` = "Rework", then `rework_instructions` becomes required.

```json
{
  "if": {
    "properties": { "disposition": { "const": "Rework" } }
  },
  "then": {
    "required": ["rework_instructions", "rework_operation"]
  }
}
```

**Success criteria:**
- Conditional required fields are enforced server-side.
- Client-side form rendering respects `if/then/else` for show/hide.

### Task 3.6: Form Versioning with Backward Compatibility

**Effort:** 4 person-days

**Files to modify:**
- `01-QMS-Portal/api/services/FormEngine.php` -- add schema version migration.

When a form schema is updated (new fields added, validations changed):
- New entries are validated against the new schema version.
- Existing entries remain valid against the schema version they were submitted under.
- A migration function can upgrade old entries to the new schema.

**Database tables involved:** `form_schemas` (version column), `form_entries` (schema_version column).

**Success criteria:**
- Old entries are readable and displayable even after schema changes.
- New entries are validated against the current schema version.
- Schema version is recorded on every form entry.

### Task 3.7: File Attachment Management

**Effort:** 4 person-days

**Files to create:**
```
01-QMS-Portal/api/services/AttachmentService.php
```

Features:
- SHA-256 hash computed on upload and stored with the attachment record.
- Hash verified on download to detect corruption.
- Virus scanning hook (placeholder for ClamAV integration).
- Maximum file size enforcement (25 MB, from existing `$MAX_FORM_UPLOAD_BYTES`).
- Allowed file types whitelist: pdf, xlsx, xlsm, docx, jpg, png, csv.
- Storage: files stored under `qms-data/attachments/{YYYY}/{MM}/` with UUID filenames; metadata in `file_attachments` table.

**Database tables involved:** `file_attachments`.

**Success criteria:**
- Upload/download cycle preserves file integrity (SHA-256 match).
- Oversized files are rejected with descriptive error.
- Disallowed file types are rejected.

### Task 3.8: Electronic Signature Preparation (21 CFR Part 11)

**Effort:** 2 person-days

**Files to create:**
```
01-QMS-Portal/api/services/ESignatureService.php
```

This is preparation only (full e-signature requires legal review):
- Re-authentication before signing (user must enter password again).
- Signature meaning recorded (e.g., "Approved", "Reviewed", "Authored").
- Signature timestamp from server (not client).
- Signature record is immutable (stored in audit_events).
- Non-repudiation: signature linked to user_id + timestamp + document hash.

**Database tables involved:** `audit_events`, `form_entries` (signature metadata in JSONB).

**Success criteria:**
- Signing requires re-authentication.
- Signature record includes: user, meaning, timestamp, document content hash.
- Signature records cannot be modified after creation.

### Phase 3 Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| JSON Schema 2020-12 library incompatibility | Medium | High | `opis/json-schema` is the most mature PHP implementation; fallback to draft-07 if needed |
| State machine complexity for NCR/CAPA | Medium | Medium | Start with simple linear workflows; add branching in iteration |
| Concurrent record ID generation race conditions | Low | High | PostgreSQL advisory locks guarantee atomicity |
| 21 CFR Part 11 compliance scope creep | High | Medium | Phase 3.8 is explicitly preparation only; full compliance is a separate project |

---

## Phase 4: Dashboard and Analytics (Weeks 13-16) -- COMPLETE

**Status:** COMPLETE (2026-03-29) -- KpiEngine (7 calculators: OEE, OTD, DPMO, COPQ, FPY, Scrap, OQL), SpcEngine (control charts, Cpk/Ppk, run rules), DashboardController, NotificationService, ReportGenerator, and cron jobs all built.

**Goal:** Real-time KPI dashboards, SPC analytics, and reporting for management review. Replace static Excel reports with live portal dashboards.

**Estimated effort:** 30 person-days

### Task 4.1: KPI Calculation Engine

**Effort:** 8 person-days

**Files to create:**
```
01-QMS-Portal/api/services/KpiEngine.php
01-QMS-Portal/api/services/kpi/
  OeeCalculator.php        -- Overall Equipment Effectiveness (Availability x Performance x Quality)
  OtdCalculator.php        -- On-Time Delivery percentage
  DpmoCalculator.php       -- Defects Per Million Opportunities
  CopqCalculator.php       -- Cost of Poor Quality
  FpyCalculator.php        -- First Pass Yield
  ScrapRateCalculator.php  -- Scrap rate by machine/part/department
  OqlCalculator.php        -- Outgoing Quality Level
```

Each calculator reads from PostgreSQL tables:
- OEE: `job_operations` (planned vs actual time), `maintenance_work_orders` (downtime)
- OTD: `sales_orders` + `shipments` (promised vs actual ship date)
- DPMO: `inspection_results` (defect count / opportunities)
- COPQ: `ncr_records` + `job_costing` (rework, scrap, warranty costs)
- FPY: `inspection_results` (pass on first inspection / total inspected)

**Database tables involved:** `kpi_definitions`, `kpi_snapshots`, `job_operations`, `inspection_results`, `ncr_records`, `sales_orders`, `shipments`, `maintenance_work_orders`, `job_costing`.

**Success criteria:**
- KPI calculations match manual Excel calculations for the same data period.
- Results are cached in `kpi_snapshots` for fast dashboard rendering.
- KPI definitions are configurable (targets, thresholds) via `kpi_definitions` table.

### Task 4.2: Dashboard API Endpoints

**Effort:** 5 person-days

**Files to create:**
```
01-QMS-Portal/api/controllers/DashboardController.php
```

Endpoints:
```
GET /v1/dashboard/kpi-summary          -- all KPIs for current period
GET /v1/dashboard/kpi/{kpi_code}/trend -- time-series for a specific KPI
GET /v1/dashboard/quality-overview     -- NCR/CAPA/FAI summary
GET /v1/dashboard/production-overview  -- OEE, job status, machine utilization
GET /v1/dashboard/calibration-status   -- overdue, upcoming, by equipment type
GET /v1/dashboard/training-status      -- competency gaps, expiring certifications
GET /v1/dashboard/audit-status         -- open findings, overdue CAPAs
```

**Frontend files to create:**
```
01-QMS-Portal/scripts/portal/11-dashboard-kpi.js    -- KPI dashboard rendering
01-QMS-Portal/styles/dashboard-kpi.css               -- dashboard styling
```

**Success criteria:**
- Dashboard loads in under 2 seconds.
- KPI cards show current value, target, trend arrow, and sparkline.
- Drill-down from KPI to underlying records is available.

### Task 4.3: SPC Engine

**Effort:** 8 person-days

**Files to create:**
```
01-QMS-Portal/api/services/SpcEngine.php
01-QMS-Portal/api/services/spc/
  ControlChart.php          -- Xbar-R, Xbar-S, IMR, p, np, c, u charts
  CapabilityStudy.php       -- Cp, Cpk, Pp, Ppk calculation
  RunRules.php              -- Western Electric / Nelson run rules
  SpcDataCollector.php      -- aggregates measurement data from inspection_results
```

**SPC calculations:**
- Control limits: UCL = Xbar + A2*Rbar, LCL = Xbar - A2*Rbar (for Xbar-R).
- Capability: Cpk = min((USL - Xbar) / (3*sigma), (Xbar - LSL) / (3*sigma)).
- Run rules: 1 point > 3 sigma, 2 of 3 > 2 sigma, 4 of 5 > 1 sigma, 8 consecutive on one side, etc.

**Database tables involved:** `spc_data`, `inspection_results`, `inspection_plans`, `fai_characteristics`.

**Success criteria:**
- Control charts render correctly for sample data.
- Cpk/Ppk values match Minitab calculations for the same dataset.
- Run rule violations are flagged in real-time.

### Task 4.4: Report Generation

**Effort:** 4 person-days

**Files to create:**
```
01-QMS-Portal/api/services/ReportGenerator.php
01-QMS-Portal/api/services/reports/
  ManagementReviewReport.php   -- monthly/quarterly management review pack
  QualityReport.php            -- NCR/CAPA/FAI summary report
  CalibrationReport.php        -- calibration status and overdue report
```

PDF generation using `dompdf` or `tcpdf` (PHP libraries, no external dependencies).

**Success criteria:**
- Management review report generates as PDF with KPI charts, trend data, and action items.
- Reports include the HESEM logo and standard document header.

### Task 4.5: Notification System

**Effort:** 3 person-days

**Files to create:**
```
01-QMS-Portal/api/services/NotificationService.php
```

Notification triggers:
- Calibration due in 30 / 14 / 7 days.
- Employee certification expiring in 60 / 30 days.
- NCR open for more than 30 days without CAPA.
- CAPA target date approaching or overdue.
- Form pending approval for more than 3 business days.
- Training record requiring competency re-assessment.

Delivery channels (Phase 4 scope: in-portal only):
- Portal notification bell with unread count.
- Notification stored in `notifications` table.

**Database tables involved:** `notifications`, `calibration_records`, `employee_certifications`, `ncr_records`, `capa_records`, `form_entries`.

**Success criteria:**
- Overdue calibrations generate notifications to QA Manager.
- Notification bell shows unread count; clicking opens notification panel.

### Task 4.6: Scheduled Jobs

**Effort:** 2 person-days

**Files to create:**
```
01-QMS-Portal/cron/
  daily_kpi_snapshot.php       -- runs daily at 06:00, captures KPI values
  weekly_quality_report.php    -- runs Monday 07:00, generates quality summary
  check_overdue.php            -- runs daily at 08:00, creates notifications for overdue items
  crontab.txt                  -- reference crontab entries
```

These scripts are standalone CLI scripts that use `DataLayer` to access PostgreSQL.

**Success criteria:**
- Cron jobs complete within 60 seconds.
- KPI snapshots accumulate daily in `kpi_snapshots` table.
- Overdue notifications are created exactly once per item (not duplicated on re-run).

### Phase 4 Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| No production data in PostgreSQL yet | High | High | Use sample/synthetic data for development; real data flows after Phase 3 |
| SPC calculations incorrect | Medium | High | Validate against known statistical software (Minitab) with reference datasets |
| PDF generation performance on shared hosting | Medium | Medium | Cache generated PDFs; generate on-demand only |
| Cron job reliability on cPanel | Low | Medium | Implement idempotent jobs; health check endpoint to verify last run |

---

## Phase 5: Offline and Mobile (Weeks 17-20) -- COMPLETE

**Status:** COMPLETE (2026-03-29) -- PWA manifest, Service Worker with cache strategies, IndexedDB offline store, sync queue, conflict resolution, barcode/QR scanner, and mobile-optimized form layouts all built.

**Goal:** Enable QC inspectors and operators on the shop floor to fill forms on tablets without network connectivity. Data syncs when connectivity is restored.

**Estimated effort:** 32 person-days

### Task 5.1: Progressive Web App Configuration

**Effort:** 3 person-days

**Files to create:**
```
01-QMS-Portal/manifest.json           -- PWA manifest
01-QMS-Portal/sw.js                    -- Service Worker entry point
01-QMS-Portal/scripts/portal/12-pwa-install.js  -- install prompt handler
```

**manifest.json** content:
```json
{
  "name": "HESEM QMS Portal",
  "short_name": "HESEM QMS",
  "start_url": "/01-QMS-Portal/portal.html",
  "display": "standalone",
  "background_color": "#1a1a2e",
  "theme_color": "#2099d5",
  "icons": [...]
}
```

**Files to modify:**
- `01-QMS-Portal/portal.html` -- add `<link rel="manifest">` and SW registration.

**Success criteria:**
- Portal is installable on Android tablets and iOS devices.
- App icon appears on home screen.
- App opens in standalone mode (no browser chrome).

### Task 5.2: Service Worker for Offline Caching

**Effort:** 6 person-days

**Files to create:**
```
01-QMS-Portal/sw.js                -- Service Worker with cache strategies
01-QMS-Portal/scripts/portal/13-sw-bridge.js  -- SW communication bridge
```

Caching strategy:
- **Cache-first** for static assets: CSS, JS, images, fonts.
- **Network-first** for API calls: try network, fall back to cached response.
- **Stale-while-revalidate** for form schemas: serve cached, update in background.
- **Offline queue** for form submissions: store in IndexedDB, sync when online.

Cached resources:
- `portal.html` + all CSS and JS files.
- Form schemas for all online-capable forms.
- Variable library and document type registry.
- Last 50 form entries per form type (for reference).

**Success criteria:**
- Portal loads when device is offline (airplane mode test).
- Form schemas are available offline.
- Previously viewed documents are cached and viewable offline.

### Task 5.3: IndexedDB Local Storage with Sync Queue

**Effort:** 8 person-days

**Files to create:**
```
01-QMS-Portal/scripts/portal/14-offline-store.js   -- IndexedDB wrapper
01-QMS-Portal/scripts/portal/15-sync-queue.js       -- sync queue manager
```

**IndexedDB stores:**
```
hesem-qms-offline
  |-- form_schemas      -- cached form schemas
  |-- form_drafts       -- in-progress form entries
  |-- sync_queue        -- pending submissions
  |-- cached_records    -- recently viewed records
  |-- user_profile      -- cached user info for offline auth
```

**Sync queue entry:**
```json
{
  "id": "uuid",
  "entity_type": "form_entry",
  "action": "create",
  "form_code": "FRM-631",
  "data": { ... },
  "created_at": "2026-05-15T08:30:00Z",
  "attempts": 0,
  "last_error": null
}
```

**Success criteria:**
- Forms can be filled and saved locally while offline.
- Sync queue shows pending items count to the user.
- Syncing starts automatically when connectivity is restored.
- Failed syncs are retried with exponential backoff (max 5 attempts).

### Task 5.4: Conflict Resolution Strategy

**Effort:** 5 person-days

**Files to create:**
```
01-QMS-Portal/api/services/SyncResolver.php        -- server-side conflict resolution
01-QMS-Portal/scripts/portal/16-conflict-ui.js      -- client-side conflict display
```

Conflict types:
1. **No conflict** (most common): offline form submitted, server accepts.
2. **Duplicate ID**: two offline devices generate the same record ID. Resolution: server generates a new ID and returns it.
3. **Schema version mismatch**: form schema was updated while device was offline. Resolution: server validates against the schema version recorded on the entry.
4. **Concurrent edit**: same record modified on two devices. Resolution: last-write-wins with full history in audit trail; user is notified of the overwrite.

**Success criteria:**
- Duplicate record IDs are resolved automatically without data loss.
- Users are notified when their offline submission conflicted with another.
- Conflict resolution history is recorded in audit events.

### Task 5.5: Barcode/QR Scanning Integration

**Effort:** 5 person-days

**Files to create:**
```
01-QMS-Portal/scripts/portal/17-scanner.js   -- camera-based barcode/QR scanner
```

Uses the browser's `BarcodeDetector` API (or `zxing-js` polyfill) to scan:
- **Part labels:** decode part number, lot number, serial number for form auto-fill.
- **Equipment labels:** decode equipment ID for calibration forms.
- **Job order labels:** decode job number for production forms.
- **QR codes on documents:** open the controlled document directly.

**Success criteria:**
- Scanning a part label auto-fills part_number, lot_number in the active form.
- Scanning works on Android tablets and iPads.
- Scanning works in offline mode (local processing, no server needed).

### Task 5.6: Mobile-Optimized Form Layouts

**Effort:** 5 person-days

**Files to create:**
```
01-QMS-Portal/styles/mobile-forms.css    -- responsive form styles for tablets
```

**Files to modify:**
- `01-QMS-Portal/scripts/portal/09-online-forms.js` -- responsive form rendering.

Design principles:
- Touch targets minimum 44x44px.
- Single-column layout on screens < 768px.
- Large input fields for gloved hands (shop floor).
- Swipe navigation between form sections.
- Camera button next to file/photo fields.

**Success criteria:**
- All online forms are usable on a 10-inch tablet in portrait mode.
- No horizontal scrolling required.
- Touch targets pass WCAG 2.5.5 (minimum 44px).

### Phase 5 Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| IndexedDB storage limits on iOS Safari | Medium | Medium | Monitor storage usage; prompt user to sync before storage is full |
| Service Worker cache invalidation issues | High | Medium | Version-based cache busting; manual cache clear in settings |
| Conflict resolution edge cases | Medium | High | Log all conflicts; manual review queue for unresolved conflicts |
| Barcode scanner hardware compatibility | Medium | Low | Fallback to manual entry; test on target tablet hardware early |

---

## Phase 6: Intelligence Layer (Weeks 21-24) -- NOT STARTED

**Status:** NOT STARTED -- Deferred pending completion of Phase 7 production integration. Prerequisite KPI/SPC data pipelines exist from Phase 4.

**Goal:** Add AI-powered search, auto-fill suggestions, and anomaly detection to the QMS portal. Leverage pgvector embeddings for semantic document search.

**Estimated effort:** 28 person-days

### Task 6.1: Document Embedding Pipeline

**Effort:** 6 person-days

**Files to create:**
```
01-QMS-Portal/api/services/EmbeddingService.php
01-QMS-Portal/cron/generate_embeddings.php          -- batch embedding generator
01-QMS-Portal/api/services/embedding/
  ChunkSplitter.php        -- split HTML documents into semantic chunks
  EmbeddingClient.php      -- API client for embedding model (OpenAI, or local)
```

Pipeline:
1. Scan all HTML documents in the QMS repo (300+ documents).
2. Strip HTML tags, extract text content.
3. Split into chunks of approximately 500 tokens with 50-token overlap.
4. Generate embeddings using an embedding model (OpenAI `text-embedding-3-small` or local `all-MiniLM-L6-v2`).
5. Store in `document_embeddings` table with pgvector.

**Database tables involved:** `document_embeddings` (pgvector, HNSW index).

**Success criteria:**
- All 300+ QMS documents are embedded (estimated 3,000-5,000 chunks).
- Embedding generation completes in under 30 minutes.
- Re-running only processes new or modified documents.

### Task 6.2: Semantic Search

**Effort:** 6 person-days

**Files to create:**
```
01-QMS-Portal/api/controllers/SearchController.php
01-QMS-Portal/scripts/portal/18-semantic-search.js    -- search UI
```

Search capabilities:
- **Semantic search:** "procedures for handling nonconforming material" finds SOP-606, WI-606, SOP-703 even without exact keyword match.
- **Hybrid search:** combine pgvector similarity with pg_trgm trigram matching for best results.
- **Filtered search:** restrict by document type, department, or date range.
- **Bilingual search:** queries in Vietnamese find English documents and vice versa.

API endpoint:
```
GET /v1/search?q=contamination+control&type=SOP,WI&limit=10
```

Response includes relevance score, document snippet, and direct link.

**Database tables involved:** `document_embeddings`, `documents`.

**Success criteria:**
- Top-5 search results contain the relevant document for 90% of test queries.
- Search response time under 500ms.
- Results include highlighted text snippets showing the matching context.

### Task 6.3: Smart Form Auto-Fill

**Effort:** 5 person-days

**Files to create:**
```
01-QMS-Portal/api/services/AutoFillService.php
01-QMS-Portal/scripts/portal/19-auto-fill.js     -- client-side auto-fill UI
```

Auto-fill sources:
- **Previous entries:** When opening a form for the same part number, pre-fill recurring fields (customer, material, tolerances).
- **Record links:** When creating a CAPA from an NCR, auto-fill the NCR reference, part info, and defect details.
- **User profile:** Auto-fill department, name, role from the logged-in user.
- **Equipment data:** When selecting an equipment ID, auto-fill equipment type, location, last calibration date.

**Database tables involved:** `form_entries`, `records`, `record_links`, `users`, `equipment`.

**Success criteria:**
- Auto-fill suggestions appear within 200ms of field focus.
- User can accept, modify, or dismiss suggestions.
- Auto-filled data is clearly marked as "suggested" until confirmed.

### Task 6.4: Anomaly Detection for SPC Data

**Effort:** 6 person-days

**Files to create:**
```
01-QMS-Portal/api/services/AnomalyDetector.php
```

Detection methods:
- **Statistical:** Z-score > 3 for individual measurements.
- **Trend:** 7+ consecutive points trending in one direction.
- **Shift:** Process mean shift detection using CUSUM or EWMA.
- **Correlation:** Detect when two normally correlated measurements diverge.

When anomalies are detected:
- Flag the measurement in `spc_data` with anomaly metadata.
- Create a notification for the responsible QC inspector.
- If severity is high, automatically create a draft NCR.

**Database tables involved:** `spc_data`, `inspection_results`, `notifications`, `ncr_records`.

**Success criteria:**
- Known anomalies in test data are detected with less than 5% false positive rate.
- Notifications are created within 1 minute of anomaly detection.
- Auto-created NCR drafts contain the anomaly details and measurement data.

### Task 6.5: Root Cause Analysis Assistant

**Effort:** 5 person-days

**Files to create:**
```
01-QMS-Portal/api/services/RcaAssistant.php
01-QMS-Portal/scripts/portal/20-rca-assistant.js   -- interactive RCA UI
```

Features:
- **Fishbone diagram builder:** Interactive UI for categorizing causes (Man, Machine, Material, Method, Measurement, Environment).
- **5-Why guided workflow:** Step-by-step prompting through the 5-Why analysis.
- **Similar NCR lookup:** When investigating a new NCR, find similar past NCRs and their root causes using semantic similarity on `ncr_records.defect_description`.
- **Suggested root causes:** Based on the defect type and part characteristics, suggest likely root causes from historical data.

**Database tables involved:** `ncr_records`, `capa_records`, `document_embeddings`.

**Success criteria:**
- Similar NCR lookup returns relevant past cases for 80% of test queries.
- 5-Why workflow produces a structured analysis document storable in the CAPA record.
- Fishbone diagram is exportable as image for inclusion in reports.

### Phase 6 Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Embedding API costs | Medium | Medium | Use local model (MiniLM) for development; OpenAI for production with cost cap |
| pgvector performance at scale | Low | Medium | HNSW index handles 100k+ vectors efficiently; monitor query times |
| False positive anomaly detections | High | Medium | Start with conservative thresholds; tuning period with human review |
| AI suggestion liability for quality decisions | Medium | High | All AI outputs are suggestions only; human approval required; clear disclaimer |

---

## Phase 7: Production Integration (Phases A-H) -- IN PROGRESS

**Status:** IN PROGRESS (started 2026-03-29) -- Converting demo components and reference-grade assets into governed production modules. See `01-QMS-Portal/docs/pro-handoff-next-implementation-spec-2026-03-29.md` for full build specification.

**Goal:** Bridge the gap between the completed infrastructure (Phases 1-5) and real production use. Convert the NCR demo, reusable UI components, and master data stubs into fully integrated, schema-driven, audit-backed production modules.

**Estimated effort:** 50-60 person-days

### Phase A: Master Data Control

Build the production master data module that all forms and orders depend on. Covers: customers, suppliers, parts, part revisions, sales orders, job orders, work orders, CAPA references. Provides cascading lookups (Customer -> SO -> JO -> WO; Customer -> Part -> Revision).

### Phase B: FRM-631 NCR Production Schema-Driven Form

Convert the NCR demo (`form-ncr-demo.html`) into a governed, schema-driven production form. Runtime rendering from `FRM-631.json` schema with searchable lookups, multi-select 6M root cause, CAPA linkage, and master-data-backed fields.

### Phase C: Form Builder / Form Version Control

Build Tab 1 of Evidence Control as a real form builder: create, revise, clone, submit for review, approve/reject, and obsolete form definitions. Output matches CS-024 design system. Immutable released revisions with audit trail.

### Phase D: Record ID Assistant

Separate code issuance from form fill/download. Filter chain (department -> family -> type -> subtype), preview, confirm, log issuance, copy to clipboard, track status (issued / used / received / superseded / cancelled). Atomic, non-duplicating counters across 42 record types.

### Phase E: Offline Form Package and Return Flow

System-issued offline packages with hidden Excel metadata (form code, revision, allocation ID, timestamp, issuer, checksum). Upload verification checks system origin, metadata integrity, revision match, and duplicate receipt. Controlled submission versioning.

### Phase F: Production E-Signature Approval Flow

Identity-bound signatures with re-authentication, meaning capture, timestamp, hash evidence. Supports Reported By, Checked By, Approved By roles. Signature event and approval state change are atomic.

### Phase G: Order Management Integration

Production `Quan ly don hang` module for SO -> JO -> WO hierarchy with customer, part, revision, quantity, due date, status. Forms bind to real order records instead of manual text entry.

### Phase H: Controlled Documentation Update

Synchronize core standards, WI, and ANNEX documents with actual portal behavior. Minimum targets: CS-024, CS-018, WI-101, ANNEX-137, and any SOP/WI governing NCR/CAPA and online forms.

### Phase 7 Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Master data schema changes during integration | Medium | High | Lock master data API contract before Phase B starts |
| Form builder scope creep | High | Medium | Strict scope per phase; defer advanced builder features |
| Offline metadata injection compatibility across Excel versions | Medium | Medium | Test on Excel 2019+, LibreOffice, Google Sheets |
| Parallel GPT/Claude work creating merge conflicts | Medium | Medium | Clear file ownership boundaries in handoff spec |

---

## 7. Risk Register (Cross-Phase)

| ID | Risk | Phase | Likelihood | Impact | Mitigation | Owner |
|----|------|-------|-----------|--------|------------|-------|
| R01 | Shared hosting limits PostgreSQL access | 1 | Medium | Critical | Use Neon Serverless (external); connect via SSL. Verify cPanel allows outbound PG connections. | IT |
| R02 | Data loss during migration | 1-2 | Low | Critical | JSON files remain the source of truth until Phase 2.6. Git history preserves all states. | QMS Eng |
| R03 | Portal downtime during API refactor | 2 | Medium | High | Feature flags enable instant rollback. New router falls through to legacy switch if controller not found. | IT |
| R04 | PHP 8.1+ requirement | 1 | Low | Medium | Verify cPanel PHP version; upgrade if needed (most hosts support 8.1+ as of 2026). | IT |
| R05 | Composer dependency management on shared hosting | 2-3 | Medium | Medium | Commit vendor/ directory to git; deploy via git pull (current approach). | IT |
| R06 | Performance degradation with PostgreSQL over network | 1-2 | Medium | Medium | Connection pooling, prepared statements, query optimization. Neon Serverless has global edge endpoints. | IT |
| R07 | Scope creep in form engine | 3 | High | Medium | Strict scope per task; defer nice-to-haves to backlog. | PM |
| R08 | Mobile browser compatibility | 5 | Medium | Medium | Test on target hardware (specific tablet models) in week 17. | QA |
| R09 | AI model accuracy for manufacturing domain | 6 | Medium | Low | Phase 6 is additive (not replacing existing functionality); low risk of regression. | QMS Eng |

---

## 8. Resource Summary

| Phase | Weeks | Person-Days | Key Skills Required | Status |
|-------|-------|-------------|-------------------|--------|
| Phase 1: Database Migration Layer | 1-4 | 28 | PHP, PostgreSQL, SQL, data migration | COMPLETE |
| Phase 2: API Modernization | 5-8 | 35 | PHP OOP, API design, testing | COMPLETE |
| Phase 3: Form Engine Enhancement | 9-12 | 40 | PHP, JSON Schema, state machines, security | COMPLETE |
| Phase 4: Dashboard and Analytics | 13-16 | 30 | PHP, SQL analytics, SPC statistics, PDF generation | COMPLETE |
| Phase 5: Offline and Mobile | 17-20 | 32 | JavaScript, Service Workers, IndexedDB, responsive CSS | COMPLETE |
| Phase 6: Intelligence Layer | 21-24 | 28 | ML/embeddings, pgvector, PHP, JavaScript | NOT STARTED |
| Phase 7: Production Integration (A-H) | 25-32 | 55 | Full-stack PHP/JS, form engine, master data, Excel processing | IN PROGRESS |
| **Total** | **32 weeks** | **248 person-days** | | |

**Recommended team:** 2 full-time developers (1 backend PHP/PostgreSQL, 1 frontend JS/PWA) plus 1 part-time QMS domain expert for validation and acceptance testing.

**Timeline with 2 developers:** 24 weeks (6 months) assuming parallel work where the dependency graph allows.

---

## Appendix A: File Tree (New Files Created by This Roadmap)

```
01-QMS-Portal/
  .env                                  -- [P1] database credentials (gitignored)
  manifest.json                         -- [P5] PWA manifest
  sw.js                                 -- [P5] Service Worker
  api.php                               -- [P2] refactored to ~200 lines (bootstrap + dispatch)
  form_workflow.php                     -- [P3] deprecated, logic moved to FormWorkflowService
  api/
    Router.php                          -- [P2]
    openapi.yaml                        -- [P2]
    docs/
      index.html                        -- [P2] Swagger UI
    controllers/
      AuthController.php                -- [P2]
      DocumentController.php            -- [P2]
      FileController.php                -- [P2]
      FormController.php                -- [P2]
      RecordController.php              -- [P2]
      AdminController.php               -- [P2]
      UserController.php                -- [P2]
      DictController.php                -- [P2]
      DescriptionController.php         -- [P2]
      DashboardController.php           -- [P4]
      SearchController.php              -- [P6]
    middleware/
      AuthMiddleware.php                -- [P2]
      CorsMiddleware.php                -- [P2]
      CsrfMiddleware.php                -- [P2]
      RateLimitMiddleware.php           -- [P2]
      LoggingMiddleware.php             -- [P2]
      JsonResponseMiddleware.php        -- [P2]
    validators/
      ValidatorFactory.php              -- [P2]
      DocumentValidator.php             -- [P2]
      FormValidator.php                 -- [P2]
      UserValidator.php                 -- [P2]
      RecordIdValidator.php             -- [P2]
    services/
      AuthService.php                   -- [P2]
      DocumentService.php               -- [P2]
      FormWorkflowService.php           -- [P2]
      FileService.php                   -- [P2]
      RecordIdService.php               -- [P2]
      DictionaryService.php             -- [P2]
      FormEngine.php                    -- [P3]
      WorkflowEngine.php                -- [P3]
      RecordIdGenerator.php             -- [P3]
      AuditTrail.php                    -- [P3]
      AttachmentService.php             -- [P3]
      ESignatureService.php             -- [P3]
      KpiEngine.php                     -- [P4]
      SpcEngine.php                     -- [P4]
      ReportGenerator.php               -- [P4]
      NotificationService.php           -- [P4]
      SyncResolver.php                  -- [P5]
      EmbeddingService.php              -- [P6]
      AutoFillService.php               -- [P6]
      AnomalyDetector.php               -- [P6]
      RcaAssistant.php                  -- [P6]
      kpi/
        OeeCalculator.php               -- [P4]
        OtdCalculator.php               -- [P4]
        DpmoCalculator.php              -- [P4]
        CopqCalculator.php              -- [P4]
        FpyCalculator.php               -- [P4]
        ScrapRateCalculator.php         -- [P4]
        OqlCalculator.php               -- [P4]
      spc/
        ControlChart.php                -- [P4]
        CapabilityStudy.php             -- [P4]
        RunRules.php                    -- [P4]
        SpcDataCollector.php            -- [P4]
      reports/
        ManagementReviewReport.php      -- [P4]
        QualityReport.php               -- [P4]
        CalibrationReport.php           -- [P4]
      workflows/
        DocumentWorkflow.php            -- [P3]
        FormWorkflow.php                -- [P3]
        NcrWorkflow.php                 -- [P3]
        CapaWorkflow.php                -- [P3]
        CalibrationWorkflow.php         -- [P3]
      embedding/
        ChunkSplitter.php              -- [P6]
        EmbeddingClient.php            -- [P6]
    events/
      EventTypes.php                    -- [P3]
      FormSubmitted.php                 -- [P3]
      FormApproved.php                  -- [P3]
      DocumentRevised.php               -- [P3]
      RecordStateChanged.php            -- [P3]
      UserLoggedIn.php                  -- [P3]
    schemas/
      form-base.schema.json             -- [P3]
      field-types.schema.json           -- [P3]
      FRM-631-ncr.schema.json           -- [P3]
      FRM-641-capa.schema.json          -- [P3]
      FRM-601-cal.schema.json           -- [P3]
      FRM-802-trn.schema.json           -- [P3]
      FRM-913-aud.schema.json           -- [P3]
      FRM-403-scar.schema.json          -- [P3]
  database/
    connection.php                      -- [P1]
    DataLayer.php                       -- [P1]
    FeatureFlags.php                    -- [P1]
    migrate.php                         -- [P1]
    migrate.sh                          -- [P1]
    adapters/
      AdapterInterface.php              -- [P1]
      JsonAdapter.php                   -- [P1]
      PostgresAdapter.php               -- [P1]
    migrations/
      001_extensions.sql                -- [P1]
      002_enum_types.sql                -- [P1]
      ... (025 files total)             -- [P1]
    import/
      import_all.php                    -- [P1]
      import_users.php                  -- [P1]
      import_role_permissions.php       -- [P1]
      import_form_registry.php          -- [P1]
      import_documents.php              -- [P1]
      import_variables.php              -- [P1]
      import_doc_types.php              -- [P1]
      import_dictionary.php             -- [P1]
      import_form_entries.php           -- [P1]
  cron/
    daily_kpi_snapshot.php              -- [P4]
    weekly_quality_report.php           -- [P4]
    check_overdue.php                   -- [P4]
    generate_embeddings.php             -- [P6]
    crontab.txt                         -- [P4]
  tests/
    bootstrap.php                       -- [P1]
    DataLayerTest.php                   -- [P1]
    JsonAdapterTest.php                 -- [P1]
    PostgresAdapterTest.php             -- [P1]
    FeatureFlagsTest.php                -- [P1]
    ImportTest.php                      -- [P1]
    fixtures/
      users.json                        -- [P1]
      form_control_registry.json        -- [P1]
      variable_library.json             -- [P1]
  scripts/portal/
    11-dashboard-kpi.js                 -- [P4]
    12-pwa-install.js                   -- [P5]
    13-sw-bridge.js                     -- [P5]
    14-offline-store.js                 -- [P5]
    15-sync-queue.js                    -- [P5]
    16-conflict-ui.js                   -- [P5]
    17-scanner.js                       -- [P5]
    18-semantic-search.js               -- [P6]
    19-auto-fill.js                     -- [P6]
    20-rca-assistant.js                 -- [P6]
  styles/
    dashboard-kpi.css                   -- [P4]
    mobile-forms.css                    -- [P5]
  qms-data/config/
    feature_flags.json                  -- [P1]
```

---

## Appendix B: Database Tables by Phase

| Phase | Tables Used (Read) | Tables Used (Write) |
|-------|-------------------|-------------------|
| P1 | -- | All 103 (schema creation + seed) |
| P2 | users, roles, departments, documents, document_versions, form_schemas, form_entries, record_counters, audit_events | Same (DataLayer switch) |
| P3 | form_schemas, form_entries, variable_registry, workflow_definitions, workflow_instances, record_counters, naming_patterns, file_attachments, audit_events | form_entries, records, record_links, record_counters, workflow_instances, file_attachments, audit_events |
| P4 | kpi_definitions, kpi_snapshots, job_operations, inspection_results, ncr_records, capa_records, sales_orders, shipments, maintenance_work_orders, job_costing, spc_data, calibration_records, employee_certifications, notifications | kpi_snapshots, notifications |
| P5 | form_schemas, form_entries, users (cached locally) | form_entries (via sync), audit_events |
| P6 | document_embeddings, documents, ncr_records, capa_records, form_entries, records, equipment, spc_data, inspection_results, notifications | document_embeddings, notifications, ncr_records (draft auto-create) |

---

*End of document.*
