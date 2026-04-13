# HESEM MOM Portal - AI Prompt: Tiep Tuc Nang Cap Backend

> **Muc dich:** Cung cap day du context cho AI (Claude, Codex, Copilot) de tiep tuc nang cap he thong HESEM MOM Portal tu trang thai hien tai len world-class ERP/MOM/MES/EQMS.

---

## 1. TONG QUAN HE THONG

**HESEM MOM Portal** la he thong quan ly san xuat (Manufacturing Operations Management) toan dien, xay dung 100% bang **PHP 8.5.2 + PostgreSQL 16+**, khong su dung bat ky framework nao (khong Laravel, khong Symfony). He thong hoat dong dang ky thuat modular monolith voi PSR-4 autoloading qua Composer.

### Quy Mo Hien Tai

| Metric | So Lieu |
|--------|---------|
| Tong so dong code PHP | ~127,000 LOC |
| Services (api/services/) | 80 files, ~50,761 LOC |
| Controllers (api/controllers/) | 43 files, ~33,082 LOC |
| Middleware (api/middleware/) | 5 files, ~882 LOC |
| Database layer (database/) | 12 files, ~8,501 LOC |
| CLI Scripts (scripts/) | 6 files, ~1,184 LOC |
| Unit Tests (tests/) | 24 files, 92 tests, 205 assertions |
| Legacy api.php | 25,252 LOC (dang duoc phan ra dan) |
| SQL Migrations | 96 files (658+ tables) |
| i18n Locales | 2 files (en.json, vi.json) |

### Namespace Map (PSR-4)
```
MOM\Api\Controllers\  → api/controllers/
MOM\Api\Middleware\   → api/middleware/
MOM\Api\Validators\   → api/validators/
MOM\Api\Services\     → api/services/
MOM\Database\         → database/
MOM\Tests\            → tests/
```

### Cong Nghe Stack
- **Runtime:** PHP 8.5.2, PHP-FPM, Nginx
- **Database:** PostgreSQL 16+ (hien tai JSON_ONLY mode, 4-stage migration sap san)
- **Cache:** Redis (predis/predis) voi L1 in-memory + L2 Redis + L3 file fallback
- **Queue:** RabbitMQ (php-amqplib) voi JSONL file fallback
- **Auth:** PHP Sessions + TOTP 2FA + JWT (lcobucci/jwt) + API Keys
- **Real-time:** Server-Sent Events (SSE) qua Redis Pub/Sub
- **Logging:** Grafana Loki (HTTP push) voi file fallback
- **Testing:** PHPUnit 10.5, PHPStan level 5
- **Storage:** Local filesystem + S3-compatible (AWS Signature V4)

---

## 2. KIEN TRUC DA HOAN THANH (v2.1.0)

### 2.1 Infrastructure Services (Phase 0+1) ✅

| Service | File | Chuc nang |
|---------|------|-----------|
| **CacheService** | `api/services/CacheService.php` (398 LOC) | Redis L1/L2/L3 cache. Methods: get/set/delete/invalidatePrefix/increment/setNx/publish |
| **QueueService** | `api/services/QueueService.php` (389 LOC) | RabbitMQ 3 exchanges (events/commands/notifications), 6 queues. Methods: publish/consume/publishNotification/publishCommand |
| **EventBus** | `api/services/EventBus.php` (281 LOC) | Publish DomainEvents -> RabbitMQ + Redis Pub/Sub + in-process listeners. Buffering: startBuffering/flush/discard |
| **DomainEvent** | `api/services/DomainEvent.php` (185 LOC) | Immutable value object. 30+ event type constants. Factory methods: workflowTransitioned/recordCreated/recordUpdated/recordDeleted |
| **EventBroadcaster** | `api/services/EventBroadcaster.php` (115 LOC) | Redis Pub/Sub → SSE. 5 channels: workflow/notifications/mes/dashboard/dispatch |
| **LogTransport** | `api/services/LogTransport.php` (238 LOC) | Structured logs → Grafana Loki HTTP API. Methods: audit/slowQuery/error/observability/info |
| **ApiKeyMiddleware** | `api/middleware/ApiKeyMiddleware.php` (248 LOC) | JWT + API Key auth cho service-to-service. SHA-256 hashed keys, scope-based |
| **ApiKeyController** | `api/controllers/ApiKeyController.php` (246 LOC) | Admin CRUD API keys + JWT generation |
| **EventStreamController** | `api/controllers/EventStreamController.php` (135 LOC) | SSE endpoint /api/events/stream?channels=workflow,mes,notifications |
| **HealthController** | `api/controllers/HealthController.php` (120 LOC) | /api/health/live, /ready, /status. Kubernetes-ready |

### 2.2 Application Services (Phase 3.1 + 4.x) ✅

| Service | File | Chuc nang |
|---------|------|-----------|
| **TranslationService** | `api/services/TranslationService.php` (276 LOC) | i18n: 9 locales, dot-notation keys, parameter interpolation, bilingual EN/VI, locale detection |
| **StorageService** | `api/services/StorageService.php` (497 LOC) | LocalDriver + S3Driver (AWS Sig V4). Auto-detect qua env vars. put/get/delete/list/temporaryUrl |
| **PluginManager** | `api/services/PluginManager.php` (364 LOC) | Plugin framework: discover→load→activate lifecycle. Topological sort dependencies. Routes + events + jobs |
| **WorkflowDefinitionRegistry** | `api/services/WorkflowDefinitionRegistry.php` (172 LOC) | Static registry workflow state machines. Extracted tu WorkflowEngine. all/get/types/stepRequirements/validateStepData |
| **UserRepository** | `api/services/UserRepository.php` (190 LOC) | Extracted tu api.php. loadStore/saveStore/findByUsername/updateUser/listUsers/getSettings/userHasRole/isActive |
| **InputSanitizer** | `api/services/InputSanitizer.php` (116 LOC) | Extracted tu api.php. code/normalizePermissionList/rolePermissionRow/userForClient |
| **CsrfService** | `api/services/CsrfService.php` (45 LOC) | Extracted tu api.php. token/validate |
| **SessionService** | `api/services/SessionService.php` (395 LOC) | Extracted tu api.php. 12 methods: init/destroy/clearAuthState/setPreauth/setAuthenticated/passwordPolicy... |
| **ResponseHelper** | `api/services/ResponseHelper.php` (64 LOC) | Extracted tu api.php. json/streamEvent |
| **FileHelper** | `api/services/FileHelper.php` (106 LOC) | Extracted tu api.php. ensureDir/readJson/writeJson/tsCompact/humanDt/nowIso |
| **AuthGuard** | `api/services/AuthGuard.php` (77 LOC) | Extracted tu api.php. requireLoggedIn (session + idle timeout + MFA check) |

### 2.3 Database Migration Tooling (Phase 2.1) ✅

| Component | File | Chuc nang |
|-----------|------|-----------|
| **MigrationStageManager** | `database/MigrationStageManager.php` (668 LOC) | 4-stage transition manager: preflight checks, data parity reports, shadow sync backfill, env vars guidance, runbooks |
| **migration-cli.php** | `scripts/migration-cli.php` (250 LOC) | CLI: status/preflight/parity/backfill/runbook/env |
| **DataLayer** | `database/DataLayer.php` (2,805 LOC) | Strategy pattern: JSON_ONLY→SHADOW_WRITE→POSTGRES_PRIMARY→POSTGRES_ONLY. Per-domain read mode overrides |
| **RuntimeShadowSync** | `database/RuntimeShadowSync.php` (1,780 LOC) | 50+ sync methods. INSERT ON CONFLICT upsert. JSONB handling. Transaction-wrapped |
| **Connection** | `database/Connection.php` (505 LOC) | Singleton, lazy PDO, auto-reconnect, SAVEPOINT nesting, query logging |
| **QueryBuilder** | `database/QueryBuilder.php` (744 LOC) | Fluent SQL builder: JOINs, JSONB, RETURNING, pagination |

### 2.4 Testing & Quality ✅

| Component | Chi Tiet |
|-----------|----------|
| **PHPUnit** | 92 tests, 205 assertions, ALL PASSING |
| **phpunit.xml** | Unit + Integration suites, strict mode, coverage config |
| **phpstan.neon** | Level 5 analysis, targets api/ + database/ |
| **composer.json** | PSR-4 autoloading, 4 production + 2 dev dependencies |
| **CI/CD workflows** | ci.yml (lint+analyse+test+openapi), deploy.yml (SSH deploy + healthcheck) |

### 2.5 Configuration & Tooling ✅

| File | Muc Dich |
|------|----------|
| `composer.json` | Dependency management, PSR-4 autoloading |
| `phpunit.xml` | Test suite configuration |
| `phpstan.neon` | Static analysis configuration |
| `scripts/worker.php` | Long-lived queue consumer voi signal handling |
| `api/docs/index.html` | Swagger UI cho OpenAPI spec (171KB) |
| `data/i18n/en.json` + `vi.json` | Translation files (~300 keys) |

---

## 3. TRANG THAI HIEN TAI CUA 4-STAGE MIGRATION

```
[x] Stage 1: JSON_ONLY (HIEN TAI - dang chay)
    - Tat ca doc/ghi deu qua JSON files
    - USE_POSTGRES=false

[ ] Stage 2: SHADOW_WRITE
    - Doc tu JSON, ghi ca JSON + PostgreSQL
    - USE_POSTGRES=true, SHADOW_WRITE=true
    - Can: chay migrations, backfill data

[ ] Stage 3: POSTGRES_PRIMARY
    - Doc tu PostgreSQL (retry 3 lan), fallback JSON
    - USE_POSTGRES=true, JSON_FALLBACK=true
    - Can: 2+ tuan SHADOW_WRITE on dinh

[ ] Stage 4: POSTGRES_ONLY
    - Chi PostgreSQL, JSON thanh archive
    - USE_POSTGRES=true, SHADOW_WRITE=false, JSON_FALLBACK=false
    - Can: 2+ tuan POSTGRES_PRIMARY khong co fallback events
```

**CLI tool da san:** `php scripts/migration-cli.php status|preflight|parity|backfill|runbook|env`

---

## 4. NHUNG GI CON THIEU - CAN NANG CAP TIEP

### 4.1 DATA MIGRATION: Bat SHADOW_WRITE (Uu tien: CRITICAL)

**Hien trang:** DataLayer, RuntimeShadowSync, Connection, 96 migrations da co day du. Chi can:

1. Setup PostgreSQL tren VPS (da co install script)
2. Chay `php database/migrate.php` de apply 96 migrations
3. `php scripts/migration-cli.php preflight` - kiem tra tat ca checks
4. Set env `USE_POSTGRES=true SHADOW_WRITE=true` + restart PHP-FPM
5. `php scripts/migration-cli.php backfill` - sync JSON data sang PG
6. Monitor 2-4 tuan truoc khi chuyen sang POSTGRES_PRIMARY

**Khong can viet code moi** - chi can thuc hien operational steps.

### 4.2 LEGACY api.php CON 25,252 DONG (Uu tien: HIGH)

**Da extract 7 services** (UserRepository, InputSanitizer, CsrfService, SessionService, ResponseHelper, FileHelper, AuthGuard), nhung legacy api.php van con:

- **~800 dong helper functions** chua extract: `default_role_permissions()`, `migrate_legacy_data_dir()`, `normalize_permission_value_list()` (da extract nhung global function van ton tai), `random_password()`, etc.
- **~20,000 dong route handlers** (switch/case actions) chua migrate sang controllers
- **api.php van duoc load** qua `API_HELPERS_ONLY` guard trong index.php (line 84-90)

**Can lam:**
- Tiep tuc extract helpers con lai thanh services
- Migrate tung action trong switch/case sang controllers tuong ung
- Muc tieu: xoa `API_HELPERS_ONLY` guard khi 100% actions da mapped

### 4.3 PHAN RA FILE LON (Uu tien: MEDIUM)

| File | LOC | Goi Y Split |
|------|-----|------------|
| **SchemaStudioController** | 6,970 | → SchemaDesignController + SchemaDiagnosticsService + SchemaReportingService + ReleaseManagementService (24 public methods, 91+ private methods) |
| **DataSchemaService** | 3,580 | → SchemaValidation + SchemaProjection + SchemaCompilation |
| **WorkflowEngine** | 3,009 | Da extract WorkflowDefinitionRegistry (1,400 LOC definitions). Con lai: transition logic + escalation + delegation + step data |
| **VpsService** | 2,609 | → VpsFileService + VpsTerminalService + VpsObservabilityService |

### 4.4 TANG DO PHU TEST (Uu tien: HIGH)

**Hien tai:** 92 unit tests cho infrastructure services. **Chua co tests cho:**

- **WorkflowEngine::transition()** - state machine transition logic (cuc ky quan trong)
- **GenericCrudService** - CRUD operations core
- **CircuitBreaker** - state transitions (closed→open→half_open)
- **RateLimitMiddleware** - rate limiting accuracy
- **DataLayer** - read/write strategy routing theo mode
- **RegistryService** - metadata-driven CRUD
- **FormEngine** - form validation/submission
- **DashboardService** - KPI calculations
- **OrderService** - order lifecycle

**Muc tieu:** Tu 92 → 200+ tests, coverage 40%+ tren services layer.

### 4.5 CI/CD HOAN THIEN (Uu tien: HIGH)

**.github/workflows/** da co ci.yml + deploy.yml nhung:
- CI chua thuc su chay (chua push len GitHub)
- Can verify ci.yml chay dung tren GitHub Actions
- Can them: PHPUnit coverage report, PHPStan badge, deploy notification

### 4.6 REDIS + RABBITMQ TICH HOP THUC TE (Uu tien: HIGH)

CacheService va QueueService da co nhung **chua wire vao cac services cu:**

- **RateLimitMiddleware** (`api/middleware/RateLimitMiddleware.php`) - van dung file-based, can chuyen sang Redis INCR+EXPIRE
- **CircuitBreaker** (`api/services/CircuitBreaker.php`) - van dung JSON file, can chuyen sang Redis
- **IdempotencyService** (`api/services/IdempotencyService.php`) - van dung file, can chuyen sang Redis SETNX
- **DashboardService** (`api/services/DashboardService.php`) - cache results trong file, can chuyen sang Redis voi TTL
- **OutboxWorker** (`api/services/OutboxWorker.php`) - doc tu JSON arrays, can consume tu RabbitMQ
- **NotificationGateway** (`api/services/NotificationGateway.php`) - ghi JSONL, can publish len RabbitMQ
- **ScheduledJobs** (`api/services/ScheduledJobs.php`) - chay synchronous, can dispatch qua queue

### 4.7 EVENT-DRIVEN TICH HOP THUC TE (Uu tien: HIGH)

EventBus + DomainEvent da co nhung **chua wire vao business services:**

- **WorkflowEngine::transition()** - can emit `DomainEvent::workflowTransitioned()` sau moi transition
- **GenericCrudService** - can emit `recordCreated/recordUpdated/recordDeleted` events
- **AuditTrail** - can publish audit events len EventBus thay vi chi ghi file
- **Auto-CAPA creation** - EventBus da co `registerDefaultRules()` nhung chua ket noi thuc te

### 4.8 i18n TICH HOP VAO API RESPONSES (Uu tien: MEDIUM)

TranslationService + locale files da co nhung:
- API error messages van hardcoded English
- Can them `_locale` field vao API responses
- Can wire `TranslationService::detectLocale()` vao request lifecycle
- Frontend strings van hardcoded, can extract sang `window.HmI18n.t(key)`

### 4.9 MULTI-TENANT (Uu tien: LOW - Phase 5)

- Them `tenant_id` vao core PostgreSQL tables
- Row-Level Security (RLS) policies
- Tenant context tu JWT claim hoac subdomain
- Tenant provisioning workflow

### 4.10 KUBERNETES (Uu tien: LOW - Phase 5)

- Dockerfile cho PHP-FPM
- docker-compose.yml (dev): PHP-FPM + Nginx + PostgreSQL + Redis + RabbitMQ
- Kubernetes manifests: Deployment, Service, ConfigMap, HPA
- Health endpoints da co: /api/health/live, /ready, /status

---

## 5. FILE QUAN TRONG CAN DOC TRUOC KHI CODE

### Core Entry Point
```
api/index.php (120+ lines) - Bootstrap, middleware stack, route registration, legacy fallback
```

### Infrastructure Services (doc de hieu pattern)
```
api/services/CacheService.php     - L1/L2/L3 fallback pattern
api/services/QueueService.php     - AMQP + file fallback pattern
api/services/EventBus.php         - Event publishing + buffering pattern
api/services/DomainEvent.php      - Value object + factory methods
```

### Database Layer
```
database/config.php               - Feature flags (use_postgres, shadow_write, json_fallback)
database/DataLayer.php            - 4-stage strategy pattern (read/write routing)
database/Connection.php           - PDO singleton + auto-reconnect
database/MigrationStageManager.php - Operational transition tooling
```

### Legacy Code
```
api.php (25,252 lines)            - Legacy monolith, duoc load qua API_HELPERS_ONLY guard
```

### Tests
```
tests/Unit/Services/              - 8 test files cho infrastructure services
tests/Unit/Database/              - 1 test file cho MigrationStageManager
phpunit.xml                       - Test suite config
```

### Configuration
```
composer.json                     - Dependencies + PSR-4 autoloading
phpstan.neon                      - Static analysis config
.github/workflows/ci.yml          - CI pipeline
.github/workflows/deploy.yml      - CD pipeline
```

---

## 6. PATTERNS VA CONVENTIONS BAT BUOC

### Code Style
- `declare(strict_types=1)` moi file
- Namespace: `MOM\Api\Services\`, `MOM\Database\`, `MOM\Api\Controllers\`
- Class: `final class` cho services, `extends BaseController` cho controllers
- PHPDoc: `@package`, `@since`, moi public method co `@param` va `@return`

### Service Pattern
```php
final class MyService
{
    // Optional singleton for legacy compatibility
    private static ?self $instance = null;
    public static function getInstance(): self { ... }
    public static function setInstance(self $instance): void { ... }

    // Constructor injection
    public function __construct(private readonly string $dataDir, ...) { }

    // Graceful fallback when infrastructure unavailable
    // Example: Redis unavailable → file fallback
}
```

### Fallback Pattern (bat buoc cho infrastructure services)
```php
try {
    // Primary: Redis/RabbitMQ/Loki
    $result = $this->redis->get($key);
} catch (\Throwable $e) {
    @error_log("[ServiceName] Primary failed: {$e->getMessage()}");
    // Fallback: file-based
    $result = $this->fileGet($key);
}
```

### Atomic Write Pattern (bat buoc cho JSON files)
```php
$tmp = $path . '.tmp';
$written = @file_put_contents($tmp, $json, LOCK_EX);
if ($written !== false) {
    @rename($tmp, $path); // atomic on same filesystem
}
```

### Event Pattern
```php
// Emit domain event after business operation
$event = DomainEvent::recordCreated('quality', 'ncr_records', $id, $record);
$this->eventBus->publish($event);
```

### Test Pattern
```php
class MyServiceTest extends TestCase
{
    private string $tmpDir;
    protected function setUp(): void {
        $this->tmpDir = sys_get_temp_dir() . '/mom_test_' . bin2hex(random_bytes(4));
        // Setup test data
    }
    protected function tearDown(): void {
        $this->removeDir($this->tmpDir); // Always cleanup
    }
}
```

---

## 7. LENH KIEM TRA NHANH

```bash
# Chay tests
php vendor/bin/phpunit --testdox

# Static analysis
php vendor/bin/phpstan analyse

# Migration status
php scripts/migration-cli.php status

# Pre-flight check truoc khi chuyen stage
php scripts/migration-cli.php preflight

# Data parity JSON vs PostgreSQL
php scripts/migration-cli.php parity

# Syntax check tat ca PHP files
find api/ database/ scripts/ -name '*.php' -exec php -l {} \;
```

---

## 8. PROMPT MAU CHO TUNG LOAI TASK

### Task: Wire Redis vao mot service cu
```
Chuyen [ServiceName] tu file-based sang Redis.

Doc file: api/services/[ServiceName].php
Tham khao pattern: api/services/CacheService.php (L1/L2/L3 fallback)

Yeu cau:
- Inject CacheService qua constructor
- Dung Redis lam primary, giu file fallback khi Redis khong kha dung
- Key prefix: "mom:[domain]:"
- TTL phu hop voi use case
- Viet unit test
```

### Task: Migrate mot action tu api.php sang controller
```
Migrate action "[action_name]" tu api.php sang controller.

Doc: api.php, tim switch case cho action "[action_name]"
Doc: api/controllers/[Controller].php (neu da co)
Doc: api/index.php (line 120+) de hieu route registration

Yeu cau:
- Tao hoac update controller method
- Dang ky route trong index.php
- Giu chinh xac cung logic, khong thay doi behavior
- Test manual voi curl
```

### Task: Emit domain events tu business service
```
Wire DomainEvent publishing vao [ServiceName].

Doc: api/services/DomainEvent.php (event types + factory methods)
Doc: api/services/EventBus.php (publish pattern)
Doc: api/services/[ServiceName].php

Yeu cau:
- Import EventBus::getInstance()
- Emit event SAU khi business operation thanh cong
- Su dung factory methods tuong ung (recordCreated, workflowTransitioned, etc.)
- Viet test verify event duoc emit
```

### Task: Viet unit test cho service
```
Viet PHPUnit tests cho [ServiceName].

Doc: api/services/[ServiceName].php
Tham khao: tests/Unit/Services/CacheServiceTest.php hoac EventBusTest.php

Yeu cau:
- File: tests/Unit/Services/[ServiceName]Test.php
- Dung tmpDir pattern voi random suffix
- Test happy path + edge cases + error handling
- Cleanup trong tearDown()
- Chay: php vendor/bin/phpunit --testdox --filter [ServiceName]
```

---

## 9. THU TU UU TIEN NANG CAP TIEP THEO

| # | Task | Effort | Impact | Dependencies |
|---|------|--------|--------|-------------|
| 1 | Wire Redis vao RateLimitMiddleware + CircuitBreaker + IdempotencyService | 3 ngay | Cao | CacheService da co |
| 2 | Wire EventBus vao WorkflowEngine + GenericCrudService | 3 ngay | Cao | EventBus da co |
| 3 | Viet tests cho WorkflowEngine, GenericCrudService, CircuitBreaker | 5 ngay | Cao | Khong |
| 4 | Wire QueueService vao OutboxWorker + NotificationGateway | 3 ngay | Cao | QueueService da co |
| 5 | Tiep tuc migrate actions tu api.php sang controllers | 10 ngay | Cao | Khong |
| 6 | Bat SHADOW_WRITE tren staging server | 2 ngay | Critical | PostgreSQL setup |
| 7 | Wire i18n vao API error responses | 2 ngay | TB | TranslationService da co |
| 8 | Split SchemaStudioController (6,970 LOC) | 5 ngay | TB | Khong |
| 9 | Split DataSchemaService (3,580 LOC) | 3 ngay | TB | Khong |
| 10 | Setup PgBouncer connection pooling | 1 ngay | TB | SHADOW_WRITE stable |

---

## 10. CANH BAO QUAN TRONG

1. **KHONG rewrite sang framework khac** - 127K dong PHP da co domain logic san xuat phuc tap. Chi modernize infrastructure.
2. **KHONG thay doi behavior** khi migrate actions tu api.php - phai giu chinh xac cung ket qua.
3. **LUON co fallback** khi tich hop Redis/RabbitMQ - he thong phai hoat dong khi infrastructure services khong kha dung.
4. **KHONG xoa api.php** cho den khi 100% actions da mapped sang controllers va tat ca tests pass.
5. **Atomic writes** cho moi file JSON - dung pattern tmp + rename.
6. **SHADOW_WRITE truoc** - khong nhay thang sang POSTGRES_PRIMARY ma khong co giai doan shadow write.
