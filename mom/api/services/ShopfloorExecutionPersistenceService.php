<?php

declare(strict_types=1);

namespace MOM\Services;

use MOM\Database\Connection;
use MOM\Database\DataLayer;
use Throwable;

/**
 * PostgreSQL bridge for the Phase 1 dispatch compatibility store.
 *
 * JSON remains the live fallback path, but when PostgreSQL is enabled this
 * service mirrors accepted dispatch facts into transactional MES tables so the
 * DB execution spine can be validated before it becomes primary authority.
 */
final class ShopfloorExecutionPersistenceService
{
    private const SOURCE_SYSTEM = 'mom.dispatch';

    public function __construct(private readonly ?DataLayer $dataLayer = null)
    {
    }

    /**
     * @param array<string, mixed> $target
     * @return array<string, mixed>
     */
    public function shadowTarget(array $target): array
    {
        return $this->withConnection(function (Connection $db) use ($target): array {
            $targetUuid = $this->upsertTarget($db, $target);
            return [
                'backend' => 'postgres',
                'status' => $targetUuid !== '' ? 'mirrored' : 'skipped',
                'target_uuid' => $targetUuid,
            ];
        });
    }

    /**
     * @param array<string, mixed> $target
     * @param array<string, mixed> $log
     * @param array<string, mixed> $event
     * @return array<string, mixed>
     */
    public function shadowProductionReport(array $target, array $log, array $event): array
    {
        return $this->withConnection(function (Connection $db) use ($target, $log, $event): array {
            $targetUuid = $this->upsertTarget($db, $target);
            $logUuid = $this->upsertProductionLog($db, $log, $targetUuid);
            $eventUuid = $this->upsertProductionReportEvent($db, $event);

            return [
                'backend' => 'postgres',
                'status' => ($targetUuid !== '' && $logUuid !== '' && $eventUuid !== '') ? 'mirrored' : 'partial',
                'target_uuid' => $targetUuid,
                'log_uuid' => $logUuid,
                'event_uuid' => $eventUuid,
            ];
        });
    }

    /**
     * @param array<string, mixed> $event
     * @return array<string, mixed>
     */
    public function shadowExecutionEvent(array $event): array
    {
        return $this->withConnection(function (Connection $db) use ($event): array {
            $eventUuid = $this->upsertDispatchExecutionEvent($db, $event);

            return [
                'backend' => 'postgres',
                'status' => $eventUuid !== '' ? 'mirrored' : 'skipped',
                'event_uuid' => $eventUuid,
            ];
        });
    }

    /**
     * @param callable(Connection): array<string, mixed> $operation
     * @return array<string, mixed>
     */
    private function withConnection(callable $operation): array
    {
        if ($this->dataLayer === null || $this->dataLayer->getMode() === DataLayer::MODE_JSON_ONLY) {
            return ['backend' => 'json_only', 'status' => 'skipped'];
        }

        $connection = $this->dataLayer->getConnection();
        if ($connection === null) {
            return ['backend' => 'json_only', 'status' => 'skipped'];
        }

        try {
            /** @var array<string, mixed> $result */
            $result = $connection->transactional(fn(): array => $operation($connection));
            return $result;
        } catch (Throwable $e) {
            @error_log('[ShopfloorExecutionPersistenceService] postgres bridge failed: ' . $e->getMessage());
            return [
                'backend' => 'postgres',
                'status' => 'failed',
                'error' => 'postgres_bridge_failed',
            ];
        }
    }

    /**
     * @param array<string, mixed> $target
     */
    private function upsertTarget(Connection $db, array $target): string
    {
        if (!$this->tableAvailable($db, 'shift_targets') || !$this->columnAvailable($db, 'shift_targets', 'source_record_id')) {
            return '';
        }

        $targetId = $this->stringValue($target['target_id'] ?? '');
        if ($targetId === '') {
            return '';
        }

        $this->advisoryLock($db, 'shift_target:' . $targetId);

        $params = [
            ':wo_number' => $this->stringValue($target['wo_number'] ?? ''),
            ':jo_number' => $this->nullableString($target['jo_number'] ?? null),
            ':item_id' => $this->nullableString($target['item_id'] ?? $target['part_number'] ?? null),
            ':item_description' => $this->nullableString($target['item_description'] ?? null),
            ':machine_id' => $this->stringValue($target['machine_id'] ?? $target['equipment_id'] ?? ''),
            ':operator_id' => $this->shortNullableString($target['operator_id'] ?? null, 20),
            ':shift_date' => $this->stringValue($target['shift_date'] ?? ''),
            ':shift_code' => $this->stringValue($target['shift_code'] ?? 'morning'),
            ':cycle_time_minutes' => (float)($target['cycle_time_minutes'] ?? 0),
            ':setup_time_minutes' => (float)($target['setup_time_minutes'] ?? 0),
            ':shift_duration_minutes' => (float)($target['shift_duration_minutes'] ?? 480),
            ':target_quantity' => (int)($target['target_quantity'] ?? 0),
            ':priority' => (int)($target['priority'] ?? 50),
            ':dispatch_sequence' => (int)($target['dispatch_sequence'] ?? 1),
            ':status' => $this->stringValue($target['status'] ?? 'planned'),
            ':dispatched_at' => $this->nullableString($target['dispatched_at'] ?? null),
            ':started_at' => $this->nullableString($target['started_at'] ?? null),
            ':completed_at' => $this->nullableString($target['completed_at'] ?? null),
            ':notes' => $this->nullableString($target['notes'] ?? null),
            ':metadata' => $this->json($target),
            ':created_by' => $this->shortNullableString($target['created_by'] ?? null, 50),
            ':created_at' => $this->nullableString($target['created_at'] ?? null),
            ':updated_at' => $this->nullableString($target['updated_at'] ?? null),
            ':source_system' => self::SOURCE_SYSTEM,
            ':source_record_id' => $targetId,
            ':payload_schema_version' => 'phase1_dispatch_target.v1',
        ] + $this->governanceScopeParams($target);

        $row = $db->queryOne(
            "UPDATE shift_targets
                SET wo_number = :wo_number,
                    jo_number = :jo_number,
                    item_id = :item_id,
                    item_description = :item_description,
                    machine_id = :machine_id,
                    operator_id = :operator_id,
                    shift_date = :shift_date,
                    shift_code = :shift_code,
                    cycle_time_minutes = :cycle_time_minutes,
                    setup_time_minutes = :setup_time_minutes,
                    shift_duration_minutes = :shift_duration_minutes,
                    target_quantity = :target_quantity,
                    priority = :priority,
                    dispatch_sequence = :dispatch_sequence,
                    status = :status,
                    dispatched_at = :dispatched_at,
                    started_at = :started_at,
                    completed_at = :completed_at,
                    notes = :notes,
                    metadata = :metadata::jsonb,
                    created_by = COALESCE(created_by, :created_by),
                    created_at = COALESCE(created_at, :created_at, now()),
                    updated_at = COALESCE(:updated_at, now()),
                    org_company_code = :org_company_code,
                    org_legal_entity_code = :org_legal_entity_code,
                    org_plant_id = :org_plant_id,
                    org_site_id = :org_site_id,
                    payload_schema_version = :payload_schema_version
              WHERE source_system = :source_system
                AND source_record_id = :source_record_id
              RETURNING target_id::text AS target_id",
            $params,
        );

        if ($row !== null) {
            return $this->stringValue($row['target_id'] ?? '');
        }

        $insert = $db->insertReturning(
            "INSERT INTO shift_targets (
                wo_number, jo_number, item_id, item_description, machine_id, operator_id,
                shift_date, shift_code, cycle_time_minutes, setup_time_minutes,
                shift_duration_minutes, target_quantity, priority, dispatch_sequence,
                status, dispatched_at, started_at, completed_at, notes, metadata,
                created_by, created_at, updated_at,
                org_company_code, org_legal_entity_code, org_plant_id, org_site_id,
                source_system, source_record_id,
                payload_schema_version
             ) VALUES (
                :wo_number, :jo_number, :item_id, :item_description, :machine_id, :operator_id,
                :shift_date, :shift_code, :cycle_time_minutes, :setup_time_minutes,
                :shift_duration_minutes, :target_quantity, :priority, :dispatch_sequence,
                :status, :dispatched_at, :started_at, :completed_at, :notes, :metadata::jsonb,
                :created_by, COALESCE(:created_at, now()), COALESCE(:updated_at, now()),
                :org_company_code, :org_legal_entity_code, :org_plant_id, :org_site_id,
                :source_system, :source_record_id, :payload_schema_version
             )
             RETURNING target_id::text AS target_id",
            $params,
        );

        return is_array($insert) ? $this->stringValue($insert['target_id'] ?? '') : '';
    }

    /**
     * @param array<string, mixed> $log
     */
    private function upsertProductionLog(Connection $db, array $log, string $targetUuid): string
    {
        if (
            !$this->tableAvailable($db, 'shift_production_log')
            || !$this->columnAvailable($db, 'shift_production_log', 'source_record_id')
        ) {
            return '';
        }

        $logId = $this->stringValue($log['log_id'] ?? '');
        if ($logId === '') {
            return '';
        }

        $this->advisoryLock($db, 'shift_production_log:' . $logId);
        $hasTraceability5MColumns = $this->columnAvailable($db, 'shift_production_log', 'traceability_5m_gate')
            && $this->columnAvailable($db, 'shift_production_log', 'traceability_5m_waiver_signature_event_id');
        $traceability5MGate = is_array($log['traceability_5m_gate'] ?? null) ? $log['traceability_5m_gate'] : [];
        $traceability5MWaiver = is_array($traceability5MGate['waiver'] ?? null) ? $traceability5MGate['waiver'] : [];

        $params = [
            ':target_id' => $targetUuid !== '' ? $targetUuid : null,
            ':wo_number' => $this->stringValue($log['wo_number'] ?? ''),
            ':jo_number' => $this->nullableString($log['jo_number'] ?? null),
            ':machine_id' => $this->stringValue($log['machine_id'] ?? $log['equipment_id'] ?? ''),
            ':operator_id' => $this->shortNullableString($log['operator_id'] ?? null, 20) ?? 'unknown',
            ':shift_date' => $this->stringValue($log['shift_date'] ?? ''),
            ':shift_code' => $this->stringValue($log['shift_code'] ?? 'morning'),
            ':quantity_good' => (int)($log['quantity_good'] ?? 0),
            ':quantity_ng' => (int)($log['quantity_ng'] ?? 0),
            ':quantity_rework' => (int)($log['quantity_rework'] ?? 0),
            ':actual_start' => $this->nullableString($log['actual_start'] ?? null),
            ':actual_end' => $this->nullableString($log['actual_end'] ?? null),
            ':actual_setup_minutes' => (float)($log['actual_setup_minutes'] ?? 0),
            ':actual_run_minutes' => (float)($log['actual_run_minutes'] ?? 0),
            ':actual_idle_minutes' => (float)($log['actual_idle_minutes'] ?? 0),
            ':actual_cycle_time_avg' => isset($log['actual_cycle_time_avg']) ? (float)$log['actual_cycle_time_avg'] : null,
            ':target_quantity' => (int)($log['target_quantity'] ?? 0),
            ':ng_details' => $this->json((array)($log['ng_details'] ?? [])),
            ':notes' => $this->nullableString($log['notes'] ?? null),
            ':issues_encountered' => $this->nullableString($log['issues_encountered'] ?? null),
            ':offline_created' => (bool)($log['offline_created'] ?? false),
            ':sync_status' => $this->stringValue($log['sync_status'] ?? 'synced'),
            ':device_id' => $this->nullableString($log['device_id'] ?? null),
            ':metadata' => $this->json($log),
            ':created_at' => $this->nullableString($log['created_at'] ?? null),
            ':updated_at' => $this->nullableString($log['updated_at'] ?? null),
            ':source_system' => self::SOURCE_SYSTEM,
            ':source_record_id' => $logId,
            ':payload_schema_version' => 'phase1_dispatch_production_log.v1',
            ':execution_event_type' => $this->stringValue($log['execution_event_type'] ?? 'progress'),
            ':report_mode' => $this->stringValue($log['report_mode'] ?? 'snapshot'),
            ':idempotency_key' => $this->nullableString($log['idempotency_key'] ?? null),
            ':report_fingerprint' => $this->nullableString($log['report_fingerprint'] ?? null),
            ':client_report_id' => $this->nullableString($log['client_report_id'] ?? null),
            ':traceability_5m_gate' => $this->json($traceability5MGate),
            ':traceability_5m_waiver_signature_event_id' => $this->nullableString($traceability5MWaiver['waiver_signature_event_id'] ?? null),
        ] + $this->governanceScopeParams($log);
        $traceabilityUpdateSql = $hasTraceability5MColumns
            ? ",
                    traceability_5m_gate = :traceability_5m_gate::jsonb,
                    traceability_5m_waiver_signature_event_id = CAST(:traceability_5m_waiver_signature_event_id AS uuid)"
            : '';
        $traceabilityInsertColumns = $hasTraceability5MColumns
            ? ',
                traceability_5m_gate, traceability_5m_waiver_signature_event_id'
            : '';
        $traceabilityInsertValues = $hasTraceability5MColumns
            ? ',
                :traceability_5m_gate::jsonb, CAST(:traceability_5m_waiver_signature_event_id AS uuid)'
            : '';

        $row = $db->queryOne(
            "UPDATE shift_production_log
                SET target_id = :target_id,
                    wo_number = :wo_number,
                    jo_number = :jo_number,
                    machine_id = :machine_id,
                    operator_id = :operator_id,
                    shift_date = :shift_date,
                    shift_code = :shift_code,
                    quantity_good = :quantity_good,
                    quantity_ng = :quantity_ng,
                    quantity_rework = :quantity_rework,
                    actual_start = :actual_start,
                    actual_end = :actual_end,
                    actual_setup_minutes = :actual_setup_minutes,
                    actual_run_minutes = :actual_run_minutes,
                    actual_idle_minutes = :actual_idle_minutes,
                    actual_cycle_time_avg = :actual_cycle_time_avg,
                    target_quantity = :target_quantity,
                    ng_details = :ng_details::jsonb,
                    notes = :notes,
                    issues_encountered = :issues_encountered,
                    offline_created = :offline_created,
                    sync_status = :sync_status,
                    device_id = :device_id,
                    metadata = :metadata::jsonb,
                    updated_at = COALESCE(:updated_at, now()),
                    payload_schema_version = :payload_schema_version,
                    execution_event_type = :execution_event_type,
                    report_mode = :report_mode,
                    idempotency_key = :idempotency_key,
                    report_fingerprint = :report_fingerprint,
                    client_report_id = :client_report_id,
                    org_company_code = :org_company_code,
                    org_legal_entity_code = :org_legal_entity_code,
                    org_plant_id = :org_plant_id,
                    org_site_id = :org_site_id
                    {$traceabilityUpdateSql}
              WHERE source_system = :source_system
                AND source_record_id = :source_record_id
              RETURNING log_id::text AS log_id",
            $params,
        );

        if ($row !== null) {
            return $this->stringValue($row['log_id'] ?? '');
        }

        $insert = $db->insertReturning(
            "INSERT INTO shift_production_log (
                target_id, wo_number, jo_number, machine_id, operator_id, shift_date, shift_code,
                quantity_good, quantity_ng, quantity_rework, actual_start, actual_end,
                actual_setup_minutes, actual_run_minutes, actual_idle_minutes,
                actual_cycle_time_avg, target_quantity, ng_details, notes,
                issues_encountered, offline_created, sync_status, device_id, metadata,
                created_at, updated_at, source_system, source_record_id, payload_schema_version,
                execution_event_type, report_mode, idempotency_key, report_fingerprint,
                client_report_id, org_company_code, org_legal_entity_code, org_plant_id, org_site_id
                {$traceabilityInsertColumns}
             ) VALUES (
                :target_id, :wo_number, :jo_number, :machine_id, :operator_id, :shift_date, :shift_code,
                :quantity_good, :quantity_ng, :quantity_rework, :actual_start, :actual_end,
                :actual_setup_minutes, :actual_run_minutes, :actual_idle_minutes,
                :actual_cycle_time_avg, :target_quantity, :ng_details::jsonb, :notes,
                :issues_encountered, :offline_created, :sync_status, :device_id, :metadata::jsonb,
                COALESCE(:created_at, now()), COALESCE(:updated_at, now()),
                :source_system, :source_record_id, :payload_schema_version,
                :execution_event_type, :report_mode, :idempotency_key, :report_fingerprint,
                :client_report_id, :org_company_code, :org_legal_entity_code, :org_plant_id, :org_site_id
                {$traceabilityInsertValues}
             )
             RETURNING log_id::text AS log_id",
            $params,
        );

        return is_array($insert) ? $this->stringValue($insert['log_id'] ?? '') : '';
    }

    /**
     * @param array<string, mixed> $event
     */
    private function upsertProductionReportEvent(Connection $db, array $event): string
    {
        if (!$this->tableAvailable($db, 'shift_production_report_events')) {
            return '';
        }

        $eventId = $this->stringValue($event['event_id'] ?? '');
        if ($eventId === '') {
            return '';
        }

        $this->advisoryLock($db, 'shift_production_report_event:' . $eventId);

        $params = [
            ':source_system' => self::SOURCE_SYSTEM,
            ':source_event_id' => $eventId,
            ':source_record_id' => $this->nullableString($event['source_record_id'] ?? $eventId),
            ':target_source_record_id' => $this->stringValue($event['target_id'] ?? ''),
            ':log_source_record_id' => $this->nullableString($event['log_id'] ?? null),
            ':event_type' => $this->stringValue($event['event_type'] ?? 'dispatch.production_report_recorded'),
            ':execution_event_type' => $this->stringValue($event['execution_event_type'] ?? 'progress'),
            ':report_mode' => $this->stringValue($event['report_mode'] ?? 'snapshot'),
            ':idempotency_key' => $this->nullableString($event['idempotency_key'] ?? null),
            ':report_fingerprint' => $this->nullableString($event['report_fingerprint'] ?? null),
            ':occurred_at' => $this->nullableString($event['occurred_at'] ?? null),
            ':recorded_at' => $this->nullableString($event['recorded_at'] ?? null),
            ':payload' => $this->json($event),
        ] + $this->governanceScopeParams($event);

        $row = $db->queryOne(
            "UPDATE shift_production_report_events
                SET target_source_record_id = :target_source_record_id,
                    source_record_id = :source_record_id,
                    org_company_code = :org_company_code,
                    org_legal_entity_code = :org_legal_entity_code,
                    org_plant_id = :org_plant_id,
                    org_site_id = :org_site_id,
                    log_source_record_id = :log_source_record_id,
                    event_type = :event_type,
                    execution_event_type = :execution_event_type,
                    report_mode = :report_mode,
                    idempotency_key = :idempotency_key,
                    report_fingerprint = :report_fingerprint,
                    occurred_at = :occurred_at,
                    recorded_at = COALESCE(:recorded_at, now()),
                    payload = :payload::jsonb
              WHERE source_system = :source_system
                AND source_event_id = :source_event_id
              RETURNING production_report_event_id::text AS production_report_event_id",
            $params,
        );

        if ($row !== null) {
            return $this->stringValue($row['production_report_event_id'] ?? '');
        }

        $insert = $db->insertReturning(
            "INSERT INTO shift_production_report_events (
                source_system, source_event_id, source_record_id,
                org_company_code, org_legal_entity_code, org_plant_id, org_site_id,
                target_source_record_id, log_source_record_id,
                event_type, execution_event_type, report_mode, idempotency_key,
                report_fingerprint, occurred_at, recorded_at, payload
             ) VALUES (
                :source_system, :source_event_id, :source_record_id,
                :org_company_code, :org_legal_entity_code, :org_plant_id, :org_site_id,
                :target_source_record_id, :log_source_record_id,
                :event_type, :execution_event_type, :report_mode, :idempotency_key,
                :report_fingerprint, :occurred_at, COALESCE(:recorded_at, now()), :payload::jsonb
             )
             RETURNING production_report_event_id::text AS production_report_event_id",
            $params,
        );

        return is_array($insert) ? $this->stringValue($insert['production_report_event_id'] ?? '') : '';
    }

    /**
     * @param array<string, mixed> $event
     */
    private function upsertDispatchExecutionEvent(Connection $db, array $event): string
    {
        if (!$this->tableAvailable($db, 'shift_dispatch_execution_events')) {
            return '';
        }

        $eventId = $this->stringValue($event['event_id'] ?? '');
        if ($eventId === '') {
            return '';
        }

        $this->advisoryLock($db, 'shift_dispatch_execution_event:' . $eventId);

        $params = [
            ':source_system' => self::SOURCE_SYSTEM,
            ':source_event_id' => $eventId,
            ':source_record_id' => $this->nullableString($event['source_record_id'] ?? $eventId),
            ':target_source_record_id' => $this->nullableString($event['target_id'] ?? null),
            ':event_type' => $this->stringValue($event['event_type'] ?? 'dispatch.event'),
            ':target_status' => $this->nullableString($event['status'] ?? null),
            ':execution_state' => $this->nullableString($event['execution_state'] ?? null),
            ':actor_id' => $this->shortNullableString($event['actor_id'] ?? null, 80),
            ':occurred_at' => $this->nullableString($event['occurred_at'] ?? null),
            ':recorded_at' => $this->nullableString($event['recorded_at'] ?? null),
            ':payload' => $this->json($event),
            ':payload_schema_version' => $this->stringValue($event['event_schema_version'] ?? 'phase1_dispatch_execution_event.v1'),
        ] + $this->governanceScopeParams($event);

        $row = $db->queryOne(
            "UPDATE shift_dispatch_execution_events
                SET target_source_record_id = :target_source_record_id,
                    source_record_id = :source_record_id,
                    org_company_code = :org_company_code,
                    org_legal_entity_code = :org_legal_entity_code,
                    org_plant_id = :org_plant_id,
                    org_site_id = :org_site_id,
                    event_type = :event_type,
                    target_status = :target_status,
                    execution_state = :execution_state,
                    actor_id = :actor_id,
                    occurred_at = :occurred_at,
                    recorded_at = COALESCE(:recorded_at, now()),
                    payload = :payload::jsonb,
                    payload_schema_version = :payload_schema_version,
                    updated_at = now()
              WHERE source_system = :source_system
                AND source_event_id = :source_event_id
              RETURNING dispatch_execution_event_id::text AS dispatch_execution_event_id",
            $params,
        );

        if ($row !== null) {
            return $this->stringValue($row['dispatch_execution_event_id'] ?? '');
        }

        $insert = $db->insertReturning(
            "INSERT INTO shift_dispatch_execution_events (
                source_system, source_event_id, source_record_id,
                org_company_code, org_legal_entity_code, org_plant_id, org_site_id,
                target_source_record_id, event_type,
                target_status, execution_state, actor_id, occurred_at, recorded_at,
                payload, payload_schema_version
             ) VALUES (
                :source_system, :source_event_id, :source_record_id,
                :org_company_code, :org_legal_entity_code, :org_plant_id, :org_site_id,
                :target_source_record_id, :event_type,
                :target_status, :execution_state, :actor_id, :occurred_at,
                COALESCE(:recorded_at, now()), :payload::jsonb, :payload_schema_version
             )
             RETURNING dispatch_execution_event_id::text AS dispatch_execution_event_id",
            $params,
        );

        return is_array($insert) ? $this->stringValue($insert['dispatch_execution_event_id'] ?? '') : '';
    }

    private function advisoryLock(Connection $db, string $key): void
    {
        $db->queryOne('SELECT pg_advisory_xact_lock(hashtext(:lock_key))', [':lock_key' => $key]);
    }

    private function tableAvailable(Connection $db, string $table): bool
    {
        $row = $db->queryOne("SELECT to_regclass(:table_name) AS table_name", [':table_name' => $table]);
        return $this->stringValue($row['table_name'] ?? '') !== '';
    }

    private function columnAvailable(Connection $db, string $table, string $column): bool
    {
        $row = $db->queryOne(
            'SELECT 1 AS ok
               FROM information_schema.columns
              WHERE table_schema = current_schema()
                AND table_name = :table_name
                AND column_name = :column_name
              LIMIT 1',
            [
                ':table_name' => $table,
                ':column_name' => $column,
            ],
        );

        return (int)($row['ok'] ?? 0) === 1;
    }

    /**
     * @param array<string, mixed> $record
     * @return array<string, ?string>
     */
    private function governanceScopeParams(array $record): array
    {
        return [
            ':org_company_code' => $this->nullableString($record['org_company_code'] ?? $record['company_code'] ?? null),
            ':org_legal_entity_code' => $this->nullableString($record['org_legal_entity_code'] ?? $record['legal_entity_code'] ?? null),
            ':org_plant_id' => $this->nullableString($record['org_plant_id'] ?? $record['plant_id'] ?? null),
            ':org_site_id' => $this->nullableString($record['org_site_id'] ?? $record['site_id'] ?? null),
        ];
    }

    private function stringValue(mixed $value): string
    {
        if (is_scalar($value) || $value === null) {
            return trim((string)$value);
        }

        return '';
    }

    private function nullableString(mixed $value): ?string
    {
        $text = $this->stringValue($value);
        return $text !== '' ? $text : null;
    }

    private function shortNullableString(mixed $value, int $maxLength): ?string
    {
        $text = $this->nullableString($value);
        if ($text === null) {
            return null;
        }

        return substr($text, 0, max(1, $maxLength));
    }

    /**
     * @param array<string, mixed> $value
     */
    private function json(array $value): string
    {
        $json = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        return is_string($json) ? $json : '{}';
    }
}
