<?php
declare(strict_types=1);

namespace MOM\Api\Services;

use MOM\Database\Connection;
use MOM\Database\DataLayer;
use InvalidArgumentException;

final class ManufacturingEventBackboneService
{
    public const EVENT_ORDER_WORK_EXECUTION = 'order.work_execution';
    public const EVENT_QUALITY_INSPECTION = 'quality.inspection';
    public const EVENT_QUALITY_NCR_CAPA_LINKAGE = 'quality.ncr_capa_linkage';
    public const EVENT_EVIDENCE_ATTACHMENT = 'evidence.attachment';
    public const EVENT_APPROVAL_DECISION = 'approval.decision';
    public const EVENT_TRACE_GENEALOGY_RELATION = 'trace.genealogy_relation';

    /** @var array<string, string> */
    private const TAXONOMY = [
        self::EVENT_ORDER_WORK_EXECUTION => 'order',
        self::EVENT_QUALITY_INSPECTION => 'quality',
        self::EVENT_QUALITY_NCR_CAPA_LINKAGE => 'quality',
        self::EVENT_EVIDENCE_ATTACHMENT => 'evidence',
        self::EVENT_APPROVAL_DECISION => 'approval',
        self::EVENT_TRACE_GENEALOGY_RELATION => 'trace',
    ];

    /** @var array<string, int> */
    private array $metrics = [
        'append' => 0,
        'replay' => 0,
        'conflict' => 0,
        'postgres_append' => 0,
        'fallback_append' => 0,
        'timeline_query' => 0,
    ];

    private ManufacturingEventRepository $repository;

    public function __construct(
        private readonly string $dataDir,
        private readonly ?DataLayer $dataLayer = null,
        ?ManufacturingEventRepository $repository = null,
        private readonly ?array $databaseConfig = null,
    ) {
        $this->repository = $repository ?? $this->defaultRepository();
    }

    /**
     * @return list<string>
     */
    public static function timelineFilterFields(): array
    {
        return [
            'correlation_id',
            'request_id',
            'enterprise_id',
            'company_id',
            'site_id',
            'plant_id',
            'org_company_code',
            'org_legal_entity_code',
            'org_plant_id',
            'org_site_id',
            'work_center_id',
            'equipment_id',
            'operator_id',
            'tool_id',
            'process_id',
            'source_system',
            'source_aggregate_type',
            'source_aggregate_id',
            'source_record_id',
            'so_number',
            'jo_number',
            'wo_number',
            'part_number',
            'part_revision',
            'lot_number',
            'material_id',
            'material_lot_id',
            'material_batch_id',
            'batch_number',
            'serial_number',
            'parent_lot_number',
            'parent_serial_number',
            'child_lot_number',
            'child_serial_number',
            'routing_id',
            'setup_sheet_id',
            'inspection_plan_id',
            'nc_program_id',
            'cnc_program_id',
            'inspection_id',
            'ncr_id',
            'capa_id',
            'scar_id',
            'evidence_id',
            'approval_id',
        ];
    }

    /**
     * @return array<string, string>
     */
    public static function taxonomy(): array
    {
        return self::TAXONOMY;
    }

    /**
     * @param array<string, mixed> $input
     * @return array{event: array<string, mixed>, replayed: bool}
     */
    public function appendEvent(array $input): array
    {
        $event = $this->normalizeEvent($input);
        try {
            $result = $this->repository->append($event);
        } catch (RecordConflictException $e) {
            $this->increment('conflict');
            throw $e;
        }

        $this->increment($result['replayed'] ? 'replay' : 'append');
        $probe = $this->repository->probe();
        $this->increment(($probe['backend'] ?? '') === 'postgres' ? 'postgres_append' : 'fallback_append');
        return $result;
    }

    /**
     * @param array<string, mixed> $context
     * @return array{event: array<string, mixed>, replayed: bool}
     */
    public function recordWorkExecutionEvent(array $context): array
    {
        return $this->appendEvent(array_merge([
            'event_type' => self::EVENT_ORDER_WORK_EXECUTION,
            'source_aggregate_type' => 'work_order',
            'source_aggregate_id' => (string)($context['wo_number'] ?? $context['source_aggregate_id'] ?? ''),
        ], $context));
    }

    /**
     * @param array<string, mixed> $context
     * @return array{event: array<string, mixed>, replayed: bool}
     */
    public function recordInspectionEvent(array $context): array
    {
        return $this->appendEvent(array_merge([
            'event_type' => self::EVENT_QUALITY_INSPECTION,
            'source_aggregate_type' => 'inspection',
            'source_aggregate_id' => (string)($context['inspection_id'] ?? $context['source_aggregate_id'] ?? ''),
        ], $context));
    }

    /**
     * @param array<string, mixed> $context
     * @return array{event: array<string, mixed>, replayed: bool}
     */
    public function recordNcrCapaLinkageEvent(array $context): array
    {
        return $this->appendEvent(array_merge([
            'event_type' => self::EVENT_QUALITY_NCR_CAPA_LINKAGE,
            'source_aggregate_type' => 'quality_case',
            'source_aggregate_id' => (string)($context['ncr_id'] ?? $context['capa_id'] ?? $context['source_aggregate_id'] ?? ''),
        ], $context));
    }

    /**
     * @param array<string, mixed> $context
     * @return array{event: array<string, mixed>, replayed: bool}
     */
    public function recordEvidenceAttachmentEvent(array $context): array
    {
        return $this->appendEvent(array_merge([
            'event_type' => self::EVENT_EVIDENCE_ATTACHMENT,
            'source_aggregate_type' => 'evidence',
            'source_aggregate_id' => (string)($context['evidence_id'] ?? $context['source_aggregate_id'] ?? ''),
        ], $context));
    }

    /**
     * @param array<string, mixed> $context
     * @return array{event: array<string, mixed>, replayed: bool}
     */
    public function recordGenealogyRelationEvent(array $context): array
    {
        return $this->appendEvent(array_merge([
            'event_type' => self::EVENT_TRACE_GENEALOGY_RELATION,
            'source_aggregate_type' => 'genealogy_relation',
            'source_aggregate_id' => (string)($context['lot_number'] ?? $context['serial_number'] ?? $context['source_aggregate_id'] ?? ''),
        ], $context));
    }

    /**
     * @param array<string, mixed> $filters
     * @return array{events: list<array<string, mixed>>, count: int, filters: array<string, mixed>, generated_at: string, probe: array<string, mixed>}
     */
    public function productionTimeline(array $filters = []): array
    {
        $this->increment('timeline_query');
        $events = $this->repository->timeline($filters);
        return [
            'events' => $events,
            'count' => count($events),
            'filters' => $this->publicFilters($filters),
            'generated_at' => gmdate(DATE_ATOM),
            'probe' => $this->authorityProbe(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function authorityProbe(): array
    {
        return array_merge($this->repository->probe(), [
            'taxonomy' => array_keys(self::TAXONOMY),
            'required_event_families' => [
                self::EVENT_ORDER_WORK_EXECUTION,
                self::EVENT_QUALITY_INSPECTION,
                self::EVENT_QUALITY_NCR_CAPA_LINKAGE,
                self::EVENT_EVIDENCE_ATTACHMENT,
                self::EVENT_TRACE_GENEALOGY_RELATION,
            ],
            'metrics' => $this->metrics,
        ]);
    }

    /**
     * @return array<string, int>
     */
    public function metrics(): array
    {
        return $this->metrics;
    }

    private function defaultRepository(): ManufacturingEventRepository
    {
        if ($this->dataLayer !== null && $this->dataLayer->getMode() !== DataLayer::MODE_JSON_ONLY) {
            $connection = $this->dataLayer->getConnection();
            if ($connection !== null) {
                return new PostgresManufacturingEventRepository($connection);
            }
        }

        $config = $this->databaseConfig ?? $this->loadDatabaseConfig();
        if ((bool)($config['use_postgres'] ?? false)) {
            return new PostgresManufacturingEventRepository(Connection::getInstance($config));
        }

        return new FileManufacturingEventRepository($this->dataDir);
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    private function normalizeEvent(array $input): array
    {
        $eventType = strtolower(trim((string)($input['event_type'] ?? '')));
        if (!isset(self::TAXONOMY[$eventType])) {
            throw new InvalidArgumentException('unknown_manufacturing_event_type');
        }

        $sourceAggregateType = trim((string)($input['source_aggregate_type'] ?? ''));
        $sourceAggregateId = trim((string)($input['source_aggregate_id'] ?? ''));
        if ($sourceAggregateType === '' || $sourceAggregateId === '') {
            throw new InvalidArgumentException('missing_source_aggregate_reference');
        }

        $payload = is_array($input['payload'] ?? null) ? (array)$input['payload'] : [];
        $metadata = is_array($input['metadata'] ?? null) ? (array)$input['metadata'] : [];

        $event = [
            'event_id' => $this->stringOrGenerated($input['event_id'] ?? null, 'mfg_evt'),
            'event_type' => $eventType,
            'event_category' => self::TAXONOMY[$eventType],
            'event_version' => trim((string)($input['event_version'] ?? '1.0')) ?: '1.0',
            'payload_schema_version' => trim((string)($input['payload_schema_version'] ?? '1.0')) ?: '1.0',
            'fingerprint_hash' => '',
            'event_hash' => null,
            'previous_event_hash' => null,
            'correlation_id' => $this->stringOrGenerated($input['correlation_id'] ?? null, 'corr'),
            'request_id' => $this->nullableString($input['request_id'] ?? null),
            'causation_event_id' => $this->nullableString($input['causation_event_id'] ?? null),
            'traceparent' => $this->nullableString($input['traceparent'] ?? null),
            'enterprise_id' => $this->nullableString($input['enterprise_id'] ?? null),
            'company_id' => $this->nullableString($input['company_id'] ?? null),
            'site_id' => $this->nullableString($input['site_id'] ?? null),
            'plant_id' => $this->nullableString($input['plant_id'] ?? null),
            'org_company_code' => $this->nullableString($input['org_company_code'] ?? $input['company_id'] ?? null),
            'org_legal_entity_code' => $this->nullableString($input['org_legal_entity_code'] ?? null),
            'org_plant_id' => $this->nullableString($input['org_plant_id'] ?? $input['plant_id'] ?? null),
            'org_site_id' => $this->nullableString($input['org_site_id'] ?? $input['site_id'] ?? null),
            'work_center_id' => $this->nullableString($input['work_center_id'] ?? null),
            'equipment_id' => $this->nullableString($input['equipment_id'] ?? $input['machine_id'] ?? null),
            'operator_id' => $this->nullableString($input['operator_id'] ?? $input['actor_id'] ?? null),
            'tool_id' => $this->nullableString($input['tool_id'] ?? $input['tool_id_used'] ?? null),
            'process_id' => $this->nullableString($input['process_id'] ?? $input['method_id'] ?? null),
            'source_system' => trim((string)($input['source_system'] ?? 'mom')) ?: 'mom',
            'source_aggregate_type' => $sourceAggregateType,
            'source_aggregate_id' => $sourceAggregateId,
            'source_event_id' => $this->nullableString($input['source_event_id'] ?? null),
            'source_record_id' => $this->nullableString($input['source_record_id'] ?? $input['source_event_id'] ?? null),
            'so_number' => $this->nullableString($input['so_number'] ?? null),
            'jo_number' => $this->nullableString($input['jo_number'] ?? null),
            'wo_number' => $this->nullableString($input['wo_number'] ?? null),
            'operation_seq' => $this->nullableString($input['operation_seq'] ?? null),
            'part_number' => $this->nullableString($input['part_number'] ?? null),
            'part_revision' => $this->nullableString($input['part_revision'] ?? null),
            'lot_number' => $this->nullableString($input['lot_number'] ?? null),
            'material_id' => $this->nullableString($input['material_id'] ?? null),
            'material_lot_id' => $this->nullableString($input['material_lot_id'] ?? $input['material_lot_number'] ?? null),
            'material_batch_id' => $this->nullableString($input['material_batch_id'] ?? $input['batch_id'] ?? null),
            'batch_number' => $this->nullableString($input['batch_number'] ?? null),
            'serial_number' => $this->nullableString($input['serial_number'] ?? null),
            'parent_lot_number' => $this->nullableString($input['parent_lot_number'] ?? null),
            'parent_serial_number' => $this->nullableString($input['parent_serial_number'] ?? null),
            'child_lot_number' => $this->nullableString($input['child_lot_number'] ?? null),
            'child_serial_number' => $this->nullableString($input['child_serial_number'] ?? null),
            'routing_id' => $this->nullableString($input['routing_id'] ?? $input['route_id'] ?? null),
            'setup_sheet_id' => $this->nullableString($input['setup_sheet_id'] ?? null),
            'inspection_plan_id' => $this->nullableString($input['inspection_plan_id'] ?? null),
            'nc_program_id' => $this->nullableString($input['nc_program_id'] ?? null),
            'cnc_program_id' => $this->nullableString($input['cnc_program_id'] ?? null),
            'inspection_id' => $this->nullableString($input['inspection_id'] ?? null),
            'ncr_id' => $this->nullableString($input['ncr_id'] ?? null),
            'capa_id' => $this->nullableString($input['capa_id'] ?? null),
            'scar_id' => $this->nullableString($input['scar_id'] ?? null),
            'evidence_id' => $this->nullableString($input['evidence_id'] ?? null),
            'approval_id' => $this->nullableString($input['approval_id'] ?? null),
            'electronic_signature_id' => $this->nullableString($input['electronic_signature_id'] ?? null),
            'actor_id' => $this->nullableString($input['actor_id'] ?? null),
            'actor_role' => $this->nullableString($input['actor_role'] ?? null),
            'occurred_at' => $this->normalizeTimestamp($input['occurred_at'] ?? null),
            'recorded_at' => null,
            'idempotency_key' => $this->nullableString($input['idempotency_key'] ?? null),
            'payload' => $payload,
            'metadata' => $metadata,
            'row_version' => max(1, (int)($input['row_version'] ?? 1)),
        ];

        $event['fingerprint_hash'] = hash('sha256', ManufacturingEventCodec::canonicalJson([
            'event_type' => $event['event_type'],
            'event_category' => $event['event_category'],
            'payload_schema_version' => $event['payload_schema_version'],
            'source_system' => $event['source_system'],
            'source_aggregate_type' => $event['source_aggregate_type'],
            'source_aggregate_id' => $event['source_aggregate_id'],
            'business_refs' => $this->businessReferences($event),
            'payload' => $payload,
            'metadata' => $metadata,
        ]));

        return $event;
    }

    /**
     * @param array<string, mixed> $event
     * @return array<string, mixed>
     */
    private function businessReferences(array $event): array
    {
        $refs = [];
        $transportFields = ['correlation_id', 'request_id', 'source_system', 'source_aggregate_type', 'source_aggregate_id'];
        foreach (self::timelineFilterFields() as $field) {
            if (in_array($field, $transportFields, true)) {
                continue;
            }
            $value = $event[$field] ?? null;
            if ($value !== null && $value !== '') {
                $refs[$field] = $value;
            }
        }
        return $refs;
    }

    /**
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    private function publicFilters(array $filters): array
    {
        $out = [];
        foreach (self::timelineFilterFields() as $field) {
            $value = trim((string)($filters[$field] ?? ''));
            if ($value !== '') {
                $out[$field] = $value;
            }
        }
        $out['limit'] = min(500, max(1, (int)($filters['limit'] ?? 100)));
        return $out;
    }

    private function nullableString(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $string = trim((string)$value);
        return $string !== '' ? $string : null;
    }

    private function stringOrGenerated(mixed $value, string $prefix): string
    {
        $string = $this->nullableString($value);
        if ($string !== null) {
            return $string;
        }
        // MES-R6-020 FIX: Use 8 bytes instead of 6 for stronger entropy
        return $prefix . '-' . gmdate('YmdHis') . '-' . bin2hex(random_bytes(8));
    }

    private function normalizeTimestamp(mixed $value): string
    {
        $raw = $this->nullableString($value);
        if ($raw === null) {
            return gmdate(DATE_ATOM);
        }
        $ts = strtotime($raw);
        if ($ts === false) {
            throw new InvalidArgumentException('invalid_event_timestamp');
        }

        // MES-R6-006 FIX: Reject timestamps in the future (allow 5-minute clock skew)
        $now = time();
        $maxFutureWindow = $now + (5 * 60); // 5 minutes
        if ($ts > $maxFutureWindow) {
            throw new InvalidArgumentException('event_timestamp_in_future');
        }

        // MES-R6-006 FIX: Reject timestamps older than 30 days
        $minPastWindow = $now - (86400 * 30); // 30 days
        if ($ts < $minPastWindow) {
            throw new InvalidArgumentException('event_timestamp_too_old_cannot_create_historical_events');
        }

        return gmdate(DATE_ATOM, $ts);
    }

    private function increment(string $key): void
    {
        if (!array_key_exists($key, $this->metrics)) {
            $this->metrics[$key] = 0;
        }
        $this->metrics[$key]++;
    }

    /**
     * @return array<string, mixed>
     */
    private function loadDatabaseConfig(): array
    {
        $path = dirname(__DIR__, 2) . '/database/config.php';
        return is_file($path) ? (array)(require $path) : ['use_postgres' => false];
    }
}

if (!class_exists('MOM\\Services\\ManufacturingEventBackboneService', false)) {
    class_alias(ManufacturingEventBackboneService::class, 'MOM\\Services\\ManufacturingEventBackboneService');
}
