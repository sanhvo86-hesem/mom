# PROMPT: Backend AI Integration cho HESEM MOM Portal

> Copy toàn bộ nội dung file này làm prompt cho một Claude Code session riêng.

---

## Mục tiêu

Xây dựng lớp AI integration cho HESEM MOM Portal backend: tích hợp Claude API (Anthropic), migrate dữ liệu AI từ JSON sang PostgreSQL, tạo prediction pipeline tự động, xây dựng async worker cho inference, và kết nối AI predictions với hành động tự động (auto-NCR, auto-maintenance).

## Context Loading Protocol

**BẮT BUỘC đọc các file index TRƯỚC khi mở bất kỳ source file nào:**
1. `.ai/repo-map.json` — Project topology, namespace map, infra services, file counts
2. `.ai/route-map.json` — Route → controller + method mapping
3. `.ai/db-map.json` — Table → migration mapping
4. `.ai/contracts-map.json` — Domain → resource → table mapping
5. `.ai/module-summaries/analytics.md` — AI/analytics domain overview
6. `.ai/module-summaries/mes-execution.md` — MES domain overview
7. `.ai/module-summaries/planning-production.md` — Planning domain overview
8. `.ai/module-summaries/quality-improvement.md` — Quality domain overview

## Critical Files — Đọc trước khi code

| File | Vai trò |
|------|---------|
| `mom/api/index.php` | Bootstrap: DataLayer, Router, middleware pipeline, EventBus init |
| `mom/api/Router.php` | Route registration patterns (action routes + REST routes) |
| `mom/api/controllers/BaseController.php` | Auth, CSRF, response helpers, audit logging |
| `mom/api/controllers/AiSchedulingController.php` | **AI controller hiện tại** (file-backed JSON, cần migrate sang DB) |
| `mom/api/services/EventBus.php` | Event publishing: RabbitMQ + Redis Pub/Sub + in-process listeners |
| `mom/api/services/EventBroadcaster.php` | Real-time SSE channels (workflow, notifications, mes, dashboard, dispatch) |
| `mom/api/services/QueueService.php` | RabbitMQ với JSONL fallback, exchange/queue topology |
| `mom/api/services/CacheService.php` | Redis với file fallback, L1/L2/L3 cache layers |
| `mom/api/services/PredictiveQualityEngine.php` | ML hiện tại: SPC anomaly (Western Electric + Nelson rules) + tool-wear linear regression (file-backed) |
| `mom/api/services/SchedulingService.php` | APS Lite scheduling: slot management, conflict detection (file-backed) |
| `mom/api/services/DomainEvent.php` | Event type constants |
| `mom/api/services/ScheduledJobs.php` | Cron job definitions pattern |
| `mom/api/services/WorkflowEngine.php` | State machine engine cho approval workflows |
| `mom/api/services/CircuitBreaker.php` | Circuit breaker pattern (dùng cho external API calls) |
| `mom/api/controllers/EventStreamController.php` | SSE endpoint cho real-time push |
| `mom/database/DataLayer.php` | 4-mode strategy (JSON_ONLY → SHADOW_WRITE → POSTGRES_PRIMARY → POSTGRES_ONLY) |
| `mom/database/Connection.php` | PostgreSQL PDO wrapper |
| `mom/database/migrations/041_ai_predictive_quality_aps.sql` | AI tables hiện có (quality_predictions, prediction_models, spc_anomaly_rules, production_schedule_slots, schedule_conflicts, capacity_snapshots) |
| `mom/api/routes/operations-routes.php` | Nơi đăng ký AI routes |
| `mom/composer.json` | Dependencies hiện tại (predis, php-amqplib, lcobucci/jwt, symfony/console) |

## Conventions bắt buộc

1. **Namespaces**: Controllers → `MOM\Api\Controllers\`, Services → `MOM\Api\Services\` hoặc `MOM\Services\`
2. **Controller pattern**: Extend `BaseController`, inject `DataLayer $data`, dùng:
   - `$this->requireAuth()` — bắt buộc đăng nhập
   - `$this->requireCsrf()` — CSRF protection cho mutations
   - `$this->requireAnyRole([...])` — role-based access
   - `$this->jsonBody()` — parse JSON request body
   - `$this->query()` — get query parameters
   - `$this->success($data)` — return success response
   - `$this->error($message, $code)` — return error response
   - `$this->paginated($items, $total, $page, $perPage)` — paginated response
   - `$this->auditLog('action_name', $context, $userId)` — audit trail
3. **Service constructors**: Accept `string $dataDir` và optional `?object $db` cho database connection
4. **Route registration**: `$router->actions([...])` trong route files dưới `mom/api/routes/`
5. **Events**: Tạo constants trong `DomainEvent`, emit qua `EventBus::getInstance()->emit()`
6. **Migrations**: SQL files trong `mom/database/migrations/`, đánh số tuần tự (tiếp theo: 098), comments bilingual (EN + VI), bọc trong BEGIN/COMMIT, proper indexes
7. **Config**: Environment variables load trong `mom/api/config.php`, prefix `QMS_API_` hoặc service-specific (`REDIS_HOST`, `AMQP_HOST`)
8. **Error handling**: `try/catch (Throwable $e)`, gọi `$this->rethrowResponse($e)` rồi `$this->error()`
9. **Audit**: Mọi mutation PHẢI gọi `$this->auditLog('action_name', $context, $userId)`
10. **Bilingual**: Tất cả user-facing strings bằng English + Vietnamese
11. **`declare(strict_types=1)`** ở đầu mọi PHP file
12. **KHÔNG thêm Composer dependency mới** — dùng raw cURL cho Anthropic API

---

## PHASE 1: Foundation (Làm trước)

### 1A. Anthropic Service

**Tạo file:** `mom/api/services/AnthropicService.php`

Singleton service gọi Claude API qua raw cURL:

```
Config từ env variables:
- ANTHROPIC_API_KEY          — API key
- ANTHROPIC_MODEL            — default 'claude-sonnet-4-20250514'
- ANTHROPIC_MAX_TOKENS       — default 4096
- ANTHROPIC_TIMEOUT          — default 30 (seconds)

Methods:
- getInstance(): self                                          — singleton
- chat(array $messages, array $options = []): array            — Messages API call, trả parsed response
- chatStreaming(array $messages, callable $onChunk, array $options = []): array  — SSE streaming
- analyzeProdData(string $systemPrompt, string $userQuery, array $context = []): array — manufacturing wrapper

Features:
- Retry exponential backoff (max 3 attempts, delay: 1s, 2s, 4s)
- CircuitBreaker integration (reuse mom/api/services/CircuitBreaker.php)
- Token usage logging → data/ai-logs/usage.jsonl (append-only)
- Cache layer: dùng CacheService cho identical queries (hash messages → cache key, TTL configurable)
- Rate limiting: track requests/minute, queue excess
```

**Sửa file:** `mom/api/config.php` — thêm section `'ai'`:
```php
'ai' => [
    'anthropic_api_key'  => getenv('ANTHROPIC_API_KEY') ?: '',
    'anthropic_model'    => getenv('ANTHROPIC_MODEL') ?: 'claude-sonnet-4-20250514',
    'anthropic_max_tokens' => (int)(getenv('ANTHROPIC_MAX_TOKENS') ?: 4096),
    'anthropic_timeout'  => (int)(getenv('ANTHROPIC_TIMEOUT') ?: 30),
    'cache_ttl'          => (int)(getenv('AI_CACHE_TTL') ?: 300),
    'enabled'            => (bool)(getenv('AI_ENABLED') ?: false),
],
```

### 1B. Database Migrations

**Tạo file:** `mom/database/migrations/098_ai_integration_foundation.sql`

Bổ sung cho tables đã có ở migration 041. Follow style chính xác của migration 041:

```sql
-- =====================================================
-- Migration 098: AI Integration Foundation
-- Nền tảng tích hợp AI
-- =====================================================

BEGIN;

-- ai_conversations: Chat history cho Natural Language query interface
-- Lịch sử trò chuyện cho giao diện truy vấn ngôn ngữ tự nhiên
CREATE TABLE IF NOT EXISTS ai_conversations (
    conversation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    context_type VARCHAR(50) NOT NULL DEFAULT 'production_query',
    -- context_type: 'production_query', 'ncr_analysis', 'scheduling', 'document_summary'
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- messages format: [{role: 'user'|'assistant', content: string, timestamp: ISO8601}]
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_conversations_user ON ai_conversations(user_id, created_at DESC);
CREATE INDEX idx_ai_conversations_context ON ai_conversations(context_type, created_at DESC);

-- ai_feedback_loops: Operator/manager feedback on AI predictions
-- Phản hồi từ người vận hành/quản lý về dự đoán AI
CREATE TABLE IF NOT EXISTS ai_feedback_loops (
    feedback_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prediction_id UUID NOT NULL,
    user_id UUID NOT NULL,
    feedback_type VARCHAR(30) NOT NULL,
    -- feedback_type: 'correct', 'incorrect', 'partially_correct', 'not_applicable'
    confidence_adjustment NUMERIC(5,2) DEFAULT 0,
    notes TEXT,
    actual_outcome JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_feedback_prediction ON ai_feedback_loops(prediction_id, created_at DESC);
CREATE INDEX idx_ai_feedback_user ON ai_feedback_loops(user_id, created_at DESC);
CREATE INDEX idx_ai_feedback_type ON ai_feedback_loops(feedback_type);

-- ai_training_datasets: ETL snapshots for model training
-- Bản chụp ETL cho huấn luyện mô hình
CREATE TABLE IF NOT EXISTS ai_training_datasets (
    dataset_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_name VARCHAR(200) NOT NULL,
    model_type VARCHAR(50) NOT NULL,
    source_query TEXT,
    row_count INT DEFAULT 0,
    feature_columns JSONB DEFAULT '[]'::jsonb,
    label_column VARCHAR(100),
    date_range_start DATE,
    date_range_end DATE,
    file_path VARCHAR(500),
    status VARCHAR(30) NOT NULL DEFAULT 'preparing',
    -- status: 'preparing', 'ready', 'training', 'archived'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID
);
CREATE INDEX idx_ai_datasets_model ON ai_training_datasets(model_type, status);
CREATE INDEX idx_ai_datasets_status ON ai_training_datasets(status, created_at DESC);

-- machine_telemetry_extended: Extended sensor data for ML analysis
-- Dữ liệu cảm biến mở rộng cho phân tích ML
CREATE TABLE IF NOT EXISTS machine_telemetry_extended (
    telemetry_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    machine_id VARCHAR(50) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    vibration_x NUMERIC(10,4),
    vibration_y NUMERIC(10,4),
    vibration_z NUMERIC(10,4),
    spindle_temperature NUMERIC(8,2),
    coolant_temperature NUMERIC(8,2),
    spindle_load_pct NUMERIC(5,2),
    feed_rate_actual NUMERIC(10,4),
    spindle_speed_actual NUMERIC(10,2),
    power_consumption_kw NUMERIC(8,3),
    tool_id VARCHAR(50),
    operation_seq INT,
    wo_number VARCHAR(50),
    metadata JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX idx_telemetry_machine_time ON machine_telemetry_extended(machine_id, timestamp DESC);
CREATE INDEX idx_telemetry_tool ON machine_telemetry_extended(tool_id, timestamp DESC);
CREATE INDEX idx_telemetry_wo ON machine_telemetry_extended(wo_number, timestamp DESC);

-- ai_recommendation_actions: Track automated actions triggered by predictions
-- Theo dõi hành động tự động được kích hoạt bởi dự đoán
CREATE TABLE IF NOT EXISTS ai_recommendation_actions (
    action_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prediction_id UUID NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    -- action_type: 'auto_ncr', 'maintenance_request', 'schedule_adjustment', 'alert_sent', 'tool_change_order'
    action_payload JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    -- status: 'pending', 'executed', 'failed', 'cancelled'
    executed_at TIMESTAMPTZ,
    result JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_actions_prediction ON ai_recommendation_actions(prediction_id);
CREATE INDEX idx_ai_actions_status ON ai_recommendation_actions(status, created_at DESC);
CREATE INDEX idx_ai_actions_type ON ai_recommendation_actions(action_type, status);

COMMIT;
```

### 1C. Async Worker Daemon

**Tạo file:** `mom/scripts/ai_worker.php`

Long-running PHP process consume RabbitMQ AI queues:

```
Features:
- Subscribe to queue: ai.inference (new queue, declare in QueueService)
- Message types: ai.predict, ai.analyze, ai.train_snapshot, ai.feedback_process
- PCNTL signal handling: graceful shutdown on SIGTERM/SIGINT
- Heartbeat logging every 60 seconds
- Error isolation: one failed message does NOT crash the worker
- Dead-letter queue after 3 retries per message
- Memory limit check: restart if exceeding 256MB
- PID file: data/ai-worker.pid
```

**Sửa file:** `mom/api/services/QueueService.php` — thêm AI queue topology:
```
New exchange: mom.ai (type: topic, durable: true)
New queues:
- ai.inference  — bound to mom.ai with routing key 'ai.predict.#'
- ai.analysis   — bound to mom.ai with routing key 'ai.analyze.#'
- ai.feedback   — bound to mom.ai with routing key 'ai.feedback.#'
- ai.training   — bound to mom.ai with routing key 'ai.train.#'
Dead-letter exchange: mom.ai.dlx
```

**Tạo file:** `mom/ops/ai-worker.service` — systemd service template

---

## PHASE 2: Core AI Services

### 2A. AI Prediction Pipeline

**Tạo file:** `mom/api/services/AiPredictionPipeline.php`

Orchestrates prediction lifecycle: creation → storage → action-triggering → feedback → expiry.

```
Methods:
- createPrediction(array $data): array
    → Validate required fields (prediction_type, severity, machine_id/entity_id)
    → Store in quality_predictions table (NOT JSON file!)
    → Emit DomainEvent::AI_PREDICTION_CREATED via EventBus
    → Broadcast via EventBroadcaster on CHANNEL_AI
    → If severity = 'critical', auto-call triggerActions()

- triggerActions(string $predictionId): array
    → Load prediction from DB
    → Based on prediction_type + severity:
      - quality_anomaly + critical → auto-create NCR via ExceptionController logic
      - equipment_failure + critical/warning → create maintenance request
      - spc_out_of_control → send notification to QA manager
      - tool_wear_critical → create tool change order
    → Store action in ai_recommendation_actions table
    → Emit DomainEvent::AI_PREDICTION_ACTIONED

- recordFeedback(string $predictionId, string $userId, string $feedbackType, array $details): array
    → Store in ai_feedback_loops table
    → Update prediction confidence score in quality_predictions
    → Emit DomainEvent::AI_FEEDBACK_RECORDED

- expireStale(): int
    → Find predictions older than X days with status='active'
    → Set status='expired'
    → Return count of expired predictions
    → (Called by ScheduledJobs daily)
```

**Sửa file:** `mom/api/services/EventBroadcaster.php` — thêm:
```php
public const CHANNEL_AI = 'realtime:ai';

public function aiPredictionUpdated(string $type, array $data): void {
    $this->broadcast(self::CHANNEL_AI, [
        'type'      => 'ai.prediction.' . $type,
        'data'      => $data,
        'timestamp' => gmdate('c'),
    ]);
}
```

**Sửa file:** `mom/api/controllers/EventStreamController.php` — thêm channel mapping `'ai' => EventBroadcaster::CHANNEL_AI`

### 2B. Natural Language Query Service

**Tạo file:** `mom/api/services/NaturalLanguageQueryService.php`

Cho phép user truy vấn dữ liệu sản xuất bằng ngôn ngữ tự nhiên qua Claude API.

```
Methods:
- query(string $userQuestion, string $userId, array $context = []): array
    → Build system prompt chứa:
      - Available table schemas (items, work_orders, job_orders, ncr_records, mes_oee_snapshots, quality_predictions, production_schedule_slots)
      - Available KPI calculations (OEE, OTD, FPY, scrap rate)
      - Date/time conventions (factory timezone, shift definitions)
      - Current context (machine being viewed, date range, etc.)
    → Send to AnthropicService::analyzeProdData()
    → Parse response: extract SQL query if generated
    → SAFETY: ALL generated SQL MUST be:
      - SELECT only (reject INSERT/UPDATE/DELETE/DROP/ALTER/TRUNCATE)
      - Parameterized (no string interpolation)
      - Row-limited (max 1000 rows)
      - Timeout-limited (max 5 seconds)
    → Execute query if valid, format results
    → Store conversation in ai_conversations table
    → Return structured answer + raw data

- suggestFollowUps(string $conversationId): array
    → Load conversation context
    → Generate 3-5 related questions based on previous queries and results

- getConversationHistory(string $userId, int $limit = 20): array
    → Return recent conversations for user
```

### 2C. Root Cause Analysis Service

**Tạo file:** `mom/api/services/RootCauseAnalysisService.php`

Phân tích nguyên nhân gốc cho NCR/CAPA bằng Claude API.

```
Methods:
- analyzeNcr(string $ncrId): array
    → Load NCR record + all related data:
      - SPC history for affected part/characteristic
      - Machine telemetry at time of defect detection
      - Operator time entries and shift info
      - Previous NCRs on same part/machine combination
      - FMEA failure modes for this part/process
      - Material lot/batch information
    → Build analysis prompt with manufacturing domain context
    → Send to AnthropicService::analyzeProdData()
    → Parse response into structured format:
      - root_causes: [{description, probability, evidence, category}]
      - contributing_factors: [...]
      - recommended_actions: [{description, priority, estimated_impact}]
      - similar_historical_issues: [...]
    → Cache result for 24 hours (CacheService, keyed by ncr_id)

- suggestActions(string $ncrId, array $rootCauses): array
    → Given identified root causes, suggest CAPA actions
    → Reference FMEA action database for similar failure modes

- findSimilarIssues(string $ncrId): array
    → Query historical NCRs matching same part, machine, defect type, or failure mode
    → Score similarity based on shared attributes
    → Return top 10 most similar issues with resolution details
```

---

## PHASE 3: Enhanced Predictions + Scheduling

### 3A. Migrate AiSchedulingController to Database

**Sửa file:** `mom/api/controllers/AiSchedulingController.php`

Replace ALL `$this->readJsonFile()` / `$this->writeJsonFile()` calls với database queries:

```
Existing actions to migrate (keep same action names + response shapes for backward compatibility):
- prediction_list      → SELECT from quality_predictions
- prediction_create    → INSERT into quality_predictions via AiPredictionPipeline
- prediction_update    → UPDATE quality_predictions
- spc_anomalies       → SELECT from spc_anomaly_rules + quality_predictions
- tool_wear_data      → SELECT from machine_telemetry_extended + quality_predictions
- schedule_slots      → SELECT from production_schedule_slots
- schedule_conflicts  → SELECT from schedule_conflicts
- capacity_heatmap    → SELECT from capacity_snapshots
- promise_suggest     → Calculate from production_schedule_slots + work_orders

New actions to add:
- ai_nl_query              → POST {question, context_type} → NaturalLanguageQueryService::query()
- ai_rca_analyze           → POST {ncr_id} → RootCauseAnalysisService::analyzeNcr()
- ai_feedback_submit       → POST {prediction_id, feedback_type, notes} → AiPredictionPipeline::recordFeedback()
- ai_model_list            → GET → SELECT from prediction_models
- ai_conversation_history  → GET → NaturalLanguageQueryService::getConversationHistory()
- ai_document_summarize    → POST {document_id} → AnthropicService::analyzeProdData()
- ai_dashboard             → GET → Aggregated AI metrics (prediction counts, accuracy, active anomalies)
```

**Sửa file:** `mom/api/routes/operations-routes.php` — register new actions

### 3B. Enhanced PredictiveQualityEngine

**Sửa file:** `mom/api/services/PredictiveQualityEngine.php`

```
New methods:
- predictFromTelemetry(string $machineId): array
    → Query machine_telemetry_extended for recent data
    → Analyze vibration patterns (trend, amplitude, frequency changes)
    → Analyze temperature trends (spindle + coolant)
    → Analyze spindle load patterns
    → Generate multi-parameter prediction
    → If critical anomaly → use AnthropicService for contextual explanation

- buildTrainingDataset(string $modelType, string $dateFrom, string $dateTo): array
    → ETL: join work_orders + quality_predictions + machine_telemetry + spc_data
    → Store metadata in ai_training_datasets table
    → Export data to CSV file in data/ai-training/

Changes:
- Migrate ALL file reads/writes to database (quality_predictions table)
- Connect prediction creation to AiPredictionPipeline::createPrediction()
- Add Claude-enhanced analysis when critical anomaly detected
```

### 3C. Scheduling Optimization

**Sửa file:** `mom/api/services/SchedulingService.php`

```
New methods:
- optimizeSchedule(string $startDate, string $endDate, array $constraints = []): array
    → Load current schedule from production_schedule_slots
    → Apply constraint satisfaction:
      - Minimize total setup time (group similar parts on same machine)
      - Balance machine load (even utilization distribution)
      - Respect maintenance windows (avoid scheduling during PM)
      - Priority-weighted due date compliance
    → Return optimized schedule + improvement metrics

- aiSuggestResequence(array $slots): array
    → Send current schedule to AnthropicService with constraints
    → Parse suggestions: [{slot_id, suggested_machine, suggested_time, reason, impact}]
    → Return ranked suggestions

Changes:
- Migrate ALL file reads/writes to PostgreSQL
- Use production_schedule_slots, schedule_conflicts, capacity_snapshots tables
```

---

## PHASE 4: Data Pipeline + Integration

### 4A. AI Data ETL Service

**Tạo file:** `mom/api/services/AiDataEtlService.php`

```
Methods:
- extractTrainingData(string $modelType, array $options): array
    → Based on modelType:
      - 'tool_wear': join machine_telemetry + mes_tool_life_events + work_orders
      - 'quality_prediction': join spc_data + ncr_records + inspection_results + machine_telemetry
      - 'scheduling': join work_orders + production_schedule_slots + mes_time_entries
      - 'demand_forecast': join sales_orders + sales_order_lines + work_orders
    → Apply date range filter, feature selection, null handling
    → Return formatted dataset

- snapshotForModel(string $modelType): string
    → Create timestamped training dataset snapshot
    → Store metadata in ai_training_datasets
    → Export to data/ai-training/{modelType}_{date}.csv
    → Return dataset_id
```

**Sửa file:** `mom/api/services/ScheduledJobs.php` — thêm:
```php
public function runAiDataEtl(): array {
    // Daily ETL for AI training datasets
    // Gọi AiDataEtlService::snapshotForModel() for each active model type
}

public function runAiPredictionExpiry(): array {
    // Daily expiry of stale predictions
    // Gọi AiPredictionPipeline::expireStale()
}
```

### 4B. EventBus AI Reactive Rules

**Sửa file:** `mom/api/services/EventBus.php` — thêm vào `registerDefaultRules()`:

```
New AI reactive rules:

1. On SPC_OUT_OF_CONTROL event:
   → AiPredictionPipeline::createPrediction([
       'prediction_type' => 'spc_anomaly',
       'severity' => based on rule violation count,
       'entity_type' => 'spc_observation',
       'entity_id' => $event->data['observation_id'],
       'details' => $event->data
   ])

2. On MACHINE_STATE_CHANGED (state = 'alarm' or 'fault'):
   → AiPredictionPipeline::createPrediction([
       'prediction_type' => 'equipment_failure',
       'severity' => 'critical',
       'machine_id' => $event->data['machine_id'],
       ...
   ])

3. On INSPECTION_FAILED:
   → Recalculate defect probability for affected part/machine
   → Update quality_predictions if existing active prediction

4. On JOB_COMPLETED:
   → Update capacity_snapshots for the machine
   → Recalculate scheduling optimization suggestions

5. On ai.prediction.created (severity = 'critical'):
   → Auto-create NCR via existing NCR creation logic
   → Log action in ai_recommendation_actions
```

**Sửa file:** `mom/api/services/DomainEvent.php` — thêm constants:
```php
public const AI_PREDICTION_CREATED = 'ai.prediction.created';
public const AI_PREDICTION_ACTIONED = 'ai.prediction.actioned';
public const AI_FEEDBACK_RECORDED = 'ai.feedback.recorded';
public const AI_ANALYSIS_COMPLETED = 'ai.analysis.completed';
public const AI_SCHEDULE_OPTIMIZED = 'ai.schedule.optimized';
```

---

## Verification Steps

Sau mỗi phase, kiểm tra:

1. **Static analysis:** `php mom/composer analyse` — PHPStan phải pass
2. **Unit tests:** `php mom/composer test` — PHPUnit phải pass
3. **Endpoint tests:**
   ```bash
   # Test NL query
   curl -X POST "localhost/mom/api.php?action=ai_nl_query" \
     -H "Content-Type: application/json" \
     -d '{"question":"OEE hiện tại máy CNC-001?"}'

   # Test RCA
   curl -X POST "localhost/mom/api.php?action=ai_rca_analyze" \
     -H "Content-Type: application/json" \
     -d '{"ncr_id":"test-ncr-001"}'

   # Test prediction pipeline
   curl -X POST "localhost/mom/api.php?action=prediction_create" \
     -H "Content-Type: application/json" \
     -d '{"prediction_type":"tool_wear","severity":"warning","machine_id":"CNC-001"}'

   # Test feedback
   curl -X POST "localhost/mom/api.php?action=ai_feedback_submit" \
     -H "Content-Type: application/json" \
     -d '{"prediction_id":"xxx","feedback_type":"correct","notes":"Accurate prediction"}'

   # Test AI dashboard
   curl "localhost/mom/api.php?action=ai_dashboard"
   ```
4. **Event verification:** Check `data/audit.log` for AI events
5. **SSE verification:** `curl -N "localhost/mom/api.php?action=events_stream&channels=ai"`
6. **Smoke tests:** `php mom/tests/backend_smoke.php`
7. **Worker test:** `php mom/scripts/ai_worker.php` — verify RabbitMQ connection and heartbeat

---

## File Summary

### Tạo mới (8 files):
| File | Mục đích |
|------|----------|
| `mom/api/services/AnthropicService.php` | Claude API wrapper với retry, cache, circuit breaker |
| `mom/api/services/AiPredictionPipeline.php` | Prediction lifecycle: create → action → feedback → expiry |
| `mom/api/services/NaturalLanguageQueryService.php` | NL query → SQL → structured answer |
| `mom/api/services/RootCauseAnalysisService.php` | NCR root cause analysis via Claude |
| `mom/api/services/AiDataEtlService.php` | Training data ETL from production tables |
| `mom/database/migrations/098_ai_integration_foundation.sql` | 5 new tables: conversations, feedback, datasets, telemetry, actions |
| `mom/scripts/ai_worker.php` | Async RabbitMQ consumer for AI inference |
| `mom/ops/ai-worker.service` | Systemd service template |

### Sửa đổi (11 files):
| File | Thay đổi |
|------|----------|
| `mom/api/controllers/AiSchedulingController.php` | Migrate file→DB, thêm 7 endpoints mới |
| `mom/api/services/EventBus.php` | Thêm 5 AI reactive rules |
| `mom/api/services/EventBroadcaster.php` | Thêm CHANNEL_AI + aiPredictionUpdated() |
| `mom/api/services/DomainEvent.php` | Thêm 5 AI event constants |
| `mom/api/services/QueueService.php` | Thêm mom.ai exchange + 4 queues |
| `mom/api/services/PredictiveQualityEngine.php` | Migrate file→DB, thêm telemetry analysis |
| `mom/api/services/SchedulingService.php` | Migrate file→DB, thêm optimization |
| `mom/api/services/ScheduledJobs.php` | Thêm AI ETL + prediction expiry jobs |
| `mom/api/controllers/EventStreamController.php` | Thêm 'ai' channel mapping |
| `mom/api/routes/operations-routes.php` | Register new AI action routes |
| `mom/api/config.php` | Thêm 'ai' configuration section |
