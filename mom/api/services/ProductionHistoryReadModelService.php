<?php
declare(strict_types=1);

namespace MOM\Api\Services;

final class ProductionHistoryReadModelService
{
    /** @var array<string, int> */
    private array $metrics = [
        'history_query' => 0,
        'history_query_failure' => 0,
    ];

    public function __construct(
        private readonly ManufacturingEventBackboneService $events,
        private readonly CanonicalManufacturingSpineService $spine,
    ) {
    }

    /**
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    public function packet(array $filters): array
    {
        try {
            $this->metrics['history_query']++;
            $timeline = $this->events->productionTimeline($filters);
            $events = $this->sortEvents((array)$timeline['events']);
            $references = $this->references($events);
            $sections = $this->sections($events);
            $spineProbe = $this->spine->probe();

            return [
                'packet_id' => $this->packetId($timeline['filters'], $events),
                'generated_at' => gmdate(DATE_ATOM),
                'filters' => $timeline['filters'],
                'event_count' => count($events),
                'canonical_spine_state' => $spineProbe['readiness_state'] ?? 'unknown',
                'deterministic_order' => 'occurred_at, recorded_at, event_id',
                'references' => $references,
                'sections' => $sections,
                'events' => $events,
                'probe' => $this->probe(),
            ];
        } catch (\Throwable $e) {
            $this->metrics['history_query_failure']++;
            throw $e;
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function probe(): array
    {
        return [
            'slice' => 'production_history_read_model',
            'backend' => 'manufacturing_event_ledger',
            'primary_backend' => 'manufacturing_event_ledger',
            'readiness_state' => 'authoritative_ready',
            'authority_mode' => 'event_ledger_read_model',
            'authoritative' => true,
            'packet_sections' => [
                'execution',
                'quality',
                'evidence',
                'genealogy',
                'approvals',
                'workforce',
            ],
            'metrics' => $this->metrics,
        ];
    }

    /**
     * @param list<array<string, mixed>> $events
     * @return list<array<string, mixed>>
     */
    private function sortEvents(array $events): array
    {
        usort($events, static function (array $left, array $right): int {
            foreach (['occurred_at', 'recorded_at', 'event_id'] as $field) {
                $cmp = strcmp((string)($left[$field] ?? ''), (string)($right[$field] ?? ''));
                if ($cmp !== 0) {
                    return $cmp;
                }
            }
            return 0;
        });
        return array_values($events);
    }

    /**
     * @param list<array<string, mixed>> $events
     * @return array<string, list<array<string, mixed>>>
     */
    private function sections(array $events): array
    {
        $sections = [
            'execution' => [],
            'quality' => [],
            'evidence' => [],
            'genealogy' => [],
            'approvals' => [],
            'workforce' => [],
        ];

        foreach ($events as $event) {
            $summary = $this->eventSummary($event);
            $type = (string)($event['event_type'] ?? '');
            $payload = is_array($event['payload'] ?? null) ? $event['payload'] : [];

            if ($type === ManufacturingEventBackboneService::EVENT_ORDER_WORK_EXECUTION) {
                $sections['execution'][] = $summary;
                if (($payload['qualification_gate']['outcome'] ?? null) !== null) {
                    $sections['workforce'][] = $summary;
                }
            } elseif (str_starts_with($type, 'quality.')) {
                $sections['quality'][] = $summary;
            } elseif ($type === ManufacturingEventBackboneService::EVENT_EVIDENCE_ATTACHMENT) {
                $sections['evidence'][] = $summary;
            } elseif ($type === ManufacturingEventBackboneService::EVENT_TRACE_GENEALOGY_RELATION) {
                $sections['genealogy'][] = $summary;
            } elseif ($type === ManufacturingEventBackboneService::EVENT_APPROVAL_DECISION) {
                $sections['approvals'][] = $summary;
            }
        }

        return $sections;
    }

    /**
     * @param list<array<string, mixed>> $events
     * @return array<string, list<string>>
     */
    private function references(array $events): array
    {
        $fields = [
            'so_number',
            'jo_number',
            'wo_number',
            'operation_seq',
            'part_number',
            'part_revision',
            'lot_number',
            'serial_number',
            'parent_lot_number',
            'child_lot_number',
            'parent_serial_number',
            'child_serial_number',
            'inspection_id',
            'ncr_id',
            'capa_id',
            'scar_id',
            'evidence_id',
            'approval_id',
            'actor_id',
            'source_aggregate_type',
            'source_aggregate_id',
            'org_company_code',
            'org_legal_entity_code',
            'org_plant_id',
            'org_site_id',
            'work_center_id',
        ];

        $references = array_fill_keys($fields, []);
        foreach ($events as $event) {
            foreach ($fields as $field) {
                $value = trim((string)($event[$field] ?? ''));
                if ($value !== '') {
                    $references[$field][$value] = $value;
                }
            }
        }

        return array_map(static fn(array $values): array => array_values($values), $references);
    }

    /**
     * @param array<string, mixed> $event
     * @return array<string, mixed>
     */
    private function eventSummary(array $event): array
    {
        $payload = is_array($event['payload'] ?? null) ? $event['payload'] : [];
        $summary = [
            'event_id' => (string)($event['event_id'] ?? ''),
            'event_type' => (string)($event['event_type'] ?? ''),
            'event_category' => (string)($event['event_category'] ?? ''),
            'occurred_at' => (string)($event['occurred_at'] ?? ''),
            'source_aggregate_type' => (string)($event['source_aggregate_type'] ?? ''),
            'source_aggregate_id' => (string)($event['source_aggregate_id'] ?? ''),
            'wo_number' => $event['wo_number'] ?? null,
            'operation_seq' => $event['operation_seq'] ?? null,
            'lot_number' => $event['lot_number'] ?? null,
            'serial_number' => $event['serial_number'] ?? null,
            'inspection_id' => $event['inspection_id'] ?? null,
            'ncr_id' => $event['ncr_id'] ?? null,
            'capa_id' => $event['capa_id'] ?? null,
            'evidence_id' => $event['evidence_id'] ?? null,
            'actor_id' => $event['actor_id'] ?? null,
            'event_hash' => $event['event_hash'] ?? null,
        ];

        if (is_array($payload['qualification_gate'] ?? null)) {
            $summary['qualification_gate'] = [
                'action' => (string)($payload['qualification_gate']['action'] ?? ''),
                'outcome' => (string)($payload['qualification_gate']['outcome'] ?? $payload['qualification_gate']['status'] ?? ''),
                'reason_code' => (string)($payload['qualification_gate']['reason_code'] ?? ''),
            ];
        }

        if (is_array($payload['connected_governance'] ?? null)) {
            $governance = $payload['connected_governance'];
            $summary['connected_governance'] = [
                'event' => (string)($governance['event'] ?? ''),
                'action' => (string)($governance['action'] ?? ''),
                'outcome' => (string)($governance['outcome'] ?? ''),
                'reason_code' => (string)($governance['reason_code'] ?? ''),
                'entitlement_decision_id' => (string)($governance['entitlement_decision_id'] ?? ''),
                'active_revision' => is_array($governance['active_revision'] ?? null) ? $governance['active_revision'] : [],
                'training_obligation' => is_array($governance['training_obligation'] ?? null) ? $governance['training_obligation'] : [],
                'qualification_assertion' => is_array($governance['qualification_assertion'] ?? null) ? $governance['qualification_assertion'] : [],
            ];
        }

        return $summary;
    }

    /**
     * @param array<string, mixed> $filters
     * @param list<array<string, mixed>> $events
     */
    private function packetId(array $filters, array $events): string
    {
        $hashInput = [
            'filters' => $filters,
            'event_hashes' => array_values(array_filter(array_column($events, 'event_hash'))),
        ];
        return 'history-' . substr(hash('sha256', ManufacturingEventCodec::canonicalJson($hashInput)), 0, 24);
    }
}

if (!class_exists('MOM\\Services\\ProductionHistoryReadModelService', false)) {
    class_alias(ProductionHistoryReadModelService::class, 'MOM\\Services\\ProductionHistoryReadModelService');
}
