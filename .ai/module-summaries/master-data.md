# Domain: master-data

> **Human-maintained.** Re-running `generate.php` will NOT overwrite this file.

## Purpose
Controls lifecycle management of all reference entities: customers, suppliers, employees, equipment, tools, measuring devices, parts/revisions, work centers, BOM/routing library, control plans, and inspection plans. Enforces duplicate detection, referential-integrity checks, change-history logging, and pending-approval workflows before any downstream operational process can use the data.

## Canonical Objects (Contracts)
- **Customer** (`master_data--customers`): primary table `customers`
- **Supplier** (`master_data--suppliers`): primary table `suppliers`
- **Employee** (`master_data--employees`): primary table `employees` (alias `hcm_employees`)
- **Equipment / Machine** (`master_data--equipment`): primary table `machines`
- **Tool** (`master_data--tools`): primary table `tools`
- **Measuring Device** (`master_data--measuring-devices`): primary table `measuring_devices`
- **Compliance Obligation** (`master_data--compliance-obligations`): primary table `compliance_obligations`

## Controllers
- `MasterDataController` → `mom/api/controllers/MasterDataController.php`
- `CncProgramController` → `mom/api/controllers/CncProgramController.php`

## Key Services
- **MasterDataService** — Primary CRUD for 30+ entity types; duplicate detection; lifecycle status transitions; pending-approval queueing; archive management
- **FoundationGovernanceService** — Organization hierarchy, party identity, calendar, and shift governance
- **CncProgramController** (also acts as a specialized handler) — CNC program version management and approval workflow

## Key Tables
- `customers` — Customer master (`customer_id` PK, `customer_status`)
- `suppliers` — Vendor master (`supplier_id` PK, `supplier_status`)
- `employees` — HR master (`employee_id` PK, `employment_status`)
- `machines` — Equipment (`machine_id` PK, `machine_status`)
- `tools` — Tool management (`tool_id` PK, `tool_status`)
- `measuring_devices` — Calibration-eligible devices (`device_id` PK, `calibration_due_date`)

## Workflow States
Each entity type has its own status field and transition map (defined in `MasterDataService::STATUS_MAP`):

| Entity | Lifecycle |
|--------|-----------|
| Customers | Prospective → Active → On Hold → Inactive → Archived |
| Suppliers | Pending → Qualified → Spend Authorized → On Hold → Blocked → Archived |
| Tools / Devices | New → Qualified → In Use → Worn → Broken → Retired → Archived |
| Employees | Preboarding → Active → Suspended → Inactive → Terminated → Archived |
| Parts | Draft → Active → Inactive → Obsolete |
| Revisions | Released → Superseded → Obsolete |

## Common Tasks & Entry Points
- **Create record:** `MasterDataController::createRecord()` → `MasterDataService::create()` → entity table, status = `draft`
- **Update active record:** `MasterDataController::updateRecord()` → routes to pending-approval queue if status ∈ {active, approved, released}
- **Transition status:** `MasterDataController::changeStatus()` → `MasterDataService::changeStatus()` → validates `TRANSITIONS` map
- **Archive:** status → `obsolete` first → then explicit `archive` command
- **CNC program approval:** `CncProgramController::approve()` → version-controlled approval workflow

## Business Rules
- **Duplicate detection on natural key**: blocked if `DUPLICATE_FIELDS[entity_type]` already exists (e.g., `part_number`, `customer_name`) — not on PK
- **Changes to live records enter pending-approval queue silently**: no error returned; approvers must explicitly confirm
- **Status transitions are enum-validated** against `TRANSITIONS` map; no skip/reverse allowed
- **Qualified tools and measuring devices require current calibration** before activation
- **Soft delete only**: `obsolete` → `archived`; hard delete blocked; referential integrity check runs before archival
- **Status field name varies by entity**: `customer_status`, `supplier_status`, `employment_status`, `tool_status` — never use generic `status`

## Notes / Gotchas
- The pending-approval workflow is **silent** — changes to active/approved/released records queue without returning an error; easy to mistake for a successful direct edit
- Natural-key duplicate check uses a different field from PK — verify `DUPLICATE_FIELDS` map in `MasterDataService` before adding a new entity type
- Legacy aliases exist: `vendors` → `suppliers`, `hcm_employees` → `employees` — use canonical table names in new code
- Entity types not registered in `ENTITY_KEYS` / `STATUS_MAP` will fail validation; the enum is defined as constants in `MasterDataService`
