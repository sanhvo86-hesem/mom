# Domain: core-infrastructure

> **Human-maintained.** Re-running `generate.php` will NOT overwrite this file.

## Purpose
Provides authentication, session management, CSRF protection, document/form management, workflow state-machine engine, generic CRUD, plugin system, and cross-cutting infrastructure (caching, queuing, events, logging) so all domains enforce consistent security, audit, and lifecycle rules.

## Canonical Objects (Contracts)
*(Core infrastructure does not have domain contract objects — it provides the runtime for all other domains.)*

## Controllers
- `AuthController` → `mom/api/controllers/AuthController.php`
- `ApiKeyController` → `mom/api/controllers/ApiKeyController.php`
- `UserController` → `mom/api/controllers/UserController.php`
- `DocumentController` → `mom/api/controllers/DocumentController.php`
- `FormController` → `mom/api/controllers/FormController.php`
- `FileController` → `mom/api/controllers/FileController.php`
- `AdminController` → `mom/api/controllers/AdminController.php`
- `AdminMetadataStudioController` → `mom/api/controllers/AdminMetadataStudioController.php`
- `ModuleSchemaController` → `mom/api/controllers/ModuleSchemaController.php`
- `SchemaStudioController` → `mom/api/controllers/SchemaStudioController.php`
- `DictController` → `mom/api/controllers/DictController.php`
- `HealthController` → `mom/api/controllers/HealthController.php`
- `EventStreamController` → `mom/api/controllers/EventStreamController.php`
- `VpsController` → `mom/api/controllers/VpsController.php`
- `GenericCrudController` → `mom/api/controllers/GenericCrudController.php`
- `RegistryController` → `mom/api/controllers/RegistryController.php`
- `KnowledgeController` → `mom/api/controllers/KnowledgeController.php`

## Key Services
- **AuthGuard** — Session validation, idle timeout, MFA check; called by `AuthMiddleware`
- **CsrfService** — CSRF token generation/validation; required for all state-changing requests
- **SessionService** — Session lifecycle management
- **WorkflowEngine** — State-machine gateway for all QMS record types (NCR, CAPA, FAI, Calibration, Audit, Training, ECR, SCAR, Risk, Improvement, Management Review, Document); enforces role-based transitions, automatic actions, escalation, parallel approvals, delegation
- **WorkflowDefinitionRegistry** — Stores workflow definitions (states, transitions, preconditions, automatic actions) per record type
- **EventBus** — Domain event pub/sub; integrates with RabbitMQ via `QueueService`
- **EventBroadcaster** — Broadcasts events to multiple subscribers
- **CacheService** — Redis-backed distributed cache with file fallback
- **QueueService** — RabbitMQ message queue management
- **NotificationService** — Email/SMS/webhook notifications
- **LogTransport** — Centralized structured logging
- **FormEngine** — Dynamic form rendering and submission
- **GenericCrudService** — Reusable CRUD operations for any entity
- **IdempotencyService** — Request deduplication (fingerprint + 120s retry window)
- **CircuitBreaker** — Fault tolerance for external integrations (MES, ERP)
- **StorageService** — File storage abstraction (local/S3/Azure)
- **InputSanitizer** — XSS and injection prevention
- **UploadHardeningService** — Secure file upload validation (MIME, size, name)
- **TranslationService** / **i18n** — Vietnamese UI translations
- **PluginManager** — Plugin system for extensibility
- **RecordIdGenerator** — Unique record ID generation per domain/type/sequence

## Key Tables / Files
- `users.json` (or `users` PostgreSQL table) — User accounts (`username`, `password_hash`, `role`, `department`, `mfa_secret`, `employee_id`)
- `form_control_registry.json` — Master registry for all form types (`code`, `title`, `control_status`, `rev`, `online_form`, `json_schema`)
- `docs_custom.json` — Document registry (`code`, `title`, `folder`, `revision`, `cat`, `status`)
- `role_permissions.json` — RBAC permission matrix per role
- `settings.json` — System settings (`mfa_required`, rate limits, feature flags)
- `audit.log` — Audit trail (all state-changing operations logged by `AuditMiddleware`)

## Workflow States

**Authentication:** unauthenticated → {mfa_pending | enroll_pending} → logged_in

**Document:** draft → review → {approved | rejected} → released | archived

**Form entry:** submitted → retained (per `retention_class`)

**Generic QMS records** (NCR, CAPA, etc.): state machine defined per record type in `WorkflowDefinitionRegistry`

## Common Tasks & Entry Points
- **Login:** `AuthController::login(username, password, otp?)` → rate limit check → validate password → check MFA → set session → return csrf_token
- **Check auth status:** `AuthController::status()` → reads `$_SESSION['user']`, returns `logged_in` | `mfa_pending` | `enroll_pending`
- **Create document:** `DocumentController::create(code, title, cat, folder, revision)` → validates uniqueness, folder, revision format → persists HTML file
- **Submit form:** `FormController::submit(code, data)` → lookup `code` in registry → add `submitted_by`/`submitted_at`/`form_code` → persist entry
- **Transition workflow:** `WorkflowEngine::transition(record_type, record_id, to_state, actor_role, context)` → checks allowed_transitions + preconditions → executes automatic actions → returns `TransitionResult`
- **Emit domain event:** `EventBus::publish(DomainEvent)` → routes to queue or direct broadcast depending on event type
- **Cache read/write:** `CacheService::get(key)` / `CacheService::set(key, value, ttl)` → Redis first, file fallback
- **Secure file upload:** `UploadHardeningService::validate(file)` → MIME check + size check + name sanitization

## Business Rules
- **Rate limiting**: 30 login failures per IP / 300s; 30 per username / 300s — after limit, returns 429
- **MFA required** if `settings['mfa_required']=true` AND `user['mfa_secret']` exists — TOTP via RFC 6238
- **Document code must be globally unique** across all documents; `DocController` checks before write
- **Document revision format**: must match `/^\d+(?:\.\d+)?$/` (e.g., `1.0`, `2.3`); auto-appended with `.0` if minor missing
- **Document title must be ASCII-only**: `portal_title_has_non_ascii` check; rejects non-ASCII characters
- **Form code must exist in registry**: `FormController::submit()` looks up `code` in `form_control_registry.json`; `online_form=false` forms are hidden from UI listing but schema is still retrievable
- **CSRF token required** for all state-changing operations (POST create/update/delete); middleware enforces this
- **Workflow transitions check preconditions**: `WorkflowEngine` enforces preconditions; absent precondition returns error with `error_vi` (Vietnamese error message for UX)

## Notes / Gotchas
- **MFA enrollment is time-limited**: `pending_auth_remaining_seconds > 0` check; expired pending enrollments auto-clear via `clear_pending_auth_session_state()` — user must restart login
- **Document folder is category-resolved**: if not explicitly specified, folder is derived from `cat`; must not use reserved root segments or `_Archive` path
- **Workflow delegation requires both fields**: `approver_role` + `delegate_to_actor`; missing one silently ignores delegation
- **Parallel approvals** require `all_approvers_done` check — transition only completes when all parallel approvers have confirmed
- **`WorkflowEngine` is the single transition authority**: all domain controllers must use `WorkflowEngine::transition()` for state changes; bypassing it breaks audit trail and automatic actions
- **Vietnamese error messages** in `WorkflowEngine`: precondition failure returns `error_vi` field — this is the display message for the UI; do not remove it
