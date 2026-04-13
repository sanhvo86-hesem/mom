<?php
declare(strict_types=1);

namespace MOM\Api\Services;

use MOM\Database\DataLayer;
use RuntimeException;

final class TraceabilityGenealogyService
{
    private const LINK_TYPES = [
        'supplier_receipt',
        'inspection_release',
        'production_consumption',
        'production_output',
        'shipment_pack',
        'quality_containment',
    ];

    private const CLOSED_QUALITY_STATES = [
        'accepted',
        'accept',
        'approved',
        'closed',
        'released',
        'resolved',
        'contained_released',
        'cancelled',
        'canceled',
        'void',
    ];

    /** @var array<string, int> */
    private array $metrics = [
        'genealogy_link_append' => 0,
        'upstream_trace_query' => 0,
        'downstream_trace_query' => 0,
        'genealogy_broken_link_rejected' => 0,
        'supplier_quality_issue' => 0,
        'supplier_quality_block' => 0,
        'shipment_eligibility_block' => 0,
        'containment_packet' => 0,
        'containment_blocked' => 0,
        'probe' => 0,
    ];

    private ManufacturingEventBackboneService $events;

    public function __construct(
        private readonly string $dataDir,
        private readonly ?DataLayer $dataLayer = null,
        ?ManufacturingEventBackboneService $events = null,
    ) {
        $this->events = $events ?? new ManufacturingEventBackboneService($this->dataDir, $this->dataLayer);
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function recordGenealogyLink(array $input): array
    {
        $link = $this->normalizeGenealogyLink($input);
        $event = $this->events->recordGenealogyRelationEvent($this->eventPayloadForLink($link, $input));
        $this->metrics['genealogy_link_append']++;

        return [
            'link' => array_merge($link, [
                'event_id' => (string)($event['event']['event_id'] ?? ''),
                'event_hash' => (string)($event['event']['event_hash'] ?? ''),
            ]),
            'event' => $event['event'],
            'replayed' => $event['replayed'],
            'probe' => $this->probe(),
        ];
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function recordProductionConsumption(array $input): array
    {
        $eligibility = $this->consumptionEligibility([
            'lot_number' => $this->firstString($input, ['parent_lot_number', 'input_lot_number', 'material_lot_number', 'supplier_lot_number', 'receipt_lot_number']),
            'serial_number' => $this->firstString($input, ['parent_serial_number', 'input_serial_number', 'material_serial_number']),
        ] + $this->scopeFields($input));

        if (!$eligibility['eligible']) {
            $this->metrics['supplier_quality_block']++;
            throw new RuntimeException('material_consumption_blocked_by_supplier_quality');
        }

        return $this->recordGenealogyLink(array_merge($input, ['link_type' => 'production_consumption']));
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function recordSupplierQualityIssue(array $input): array
    {
        $issue = $this->normalizeSupplierQualityIssue($input);
        $event = $this->events->recordNcrCapaLinkageEvent(array_merge($this->scopeFields($input), [
            'event_id' => $this->nullableString($input['event_id'] ?? null),
            'correlation_id' => $this->correlationId($input),
            'request_id' => $this->nullableString($input['request_id'] ?? null),
            'traceparent' => $this->nullableString($input['traceparent'] ?? null),
            'source_system' => (string)($input['source_system'] ?? 'mom_traceability'),
            'source_aggregate_type' => 'supplier_quality_issue',
            'source_aggregate_id' => $issue['issue_id'],
            'source_record_id' => $issue['issue_id'],
            'lot_number' => $issue['affected_lot_number'],
            'serial_number' => $issue['affected_serial_number'] !== '' ? $issue['affected_serial_number'] : null,
            'inspection_id' => $issue['inspection_id'] !== '' ? $issue['inspection_id'] : null,
            'ncr_id' => $issue['ncr_id'] !== '' ? $issue['ncr_id'] : null,
            'capa_id' => $issue['capa_id'] !== '' ? $issue['capa_id'] : null,
            'scar_id' => $issue['scar_id'] !== '' ? $issue['scar_id'] : null,
            'evidence_id' => $issue['evidence_id'] !== '' ? $issue['evidence_id'] : null,
            'actor_id' => $this->nullableString($input['actor_id'] ?? $input['created_by'] ?? null),
            'actor_role' => $this->nullableString($input['actor_role'] ?? null),
            'occurred_at' => (string)($input['occurred_at'] ?? gmdate(DATE_ATOM)),
            'payload_schema_version' => 'traceability_supplier_quality.v1',
            'payload' => ['supplier_quality_issue' => $issue],
            'metadata' => [
                'traceability_slice' => 'supplier_quality_linkage',
                'source_payload' => $input,
            ],
        ]));
        $this->metrics['supplier_quality_issue']++;

        return [
            'issue' => array_merge($issue, [
                'event_id' => (string)($event['event']['event_id'] ?? ''),
                'event_hash' => (string)($event['event']['event_hash'] ?? ''),
            ]),
            'event' => $event['event'],
            'replayed' => $event['replayed'],
        ];
    }

    /**
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    public function upstreamTrace(array $filters): array
    {
        $this->metrics['upstream_trace_query']++;
        return $this->trace($filters, 'upstream');
    }

    /**
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    public function downstreamTrace(array $filters): array
    {
        $this->metrics['downstream_trace_query']++;
        return $this->trace($filters, 'downstream');
    }

    /**
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    public function impactedOutputs(array $filters): array
    {
        $trace = $this->downstreamTrace($filters);
        $startKey = (string)($trace['start_node']['node_key'] ?? '');
        $outputNodes = [];
        $shipments = [];

        foreach ((array)$trace['nodes'] as $node) {
            if (!is_array($node) || (string)($node['node_key'] ?? '') === $startKey) {
                continue;
            }
            if (in_array((string)($node['node_type'] ?? ''), ['lot', 'serial', 'shipment'], true)) {
                $outputNodes[(string)$node['node_key']] = $node;
            }
        }

        foreach ((array)$trace['edges'] as $edge) {
            if (!is_array($edge)) {
                continue;
            }
            $shipment = is_array($edge['shipment'] ?? null) ? $edge['shipment'] : [];
            if ($shipment !== []) {
                $key = (string)($shipment['shipment_id'] ?? $shipment['shipment_number'] ?? $shipment['packing_id'] ?? $shipment['package_number'] ?? '');
                if ($key !== '') {
                    $shipments[$key] = $shipment;
                }
            }
        }

        return [
            'generated_at' => gmdate(DATE_ATOM),
            'filters' => $this->publicFilters($filters),
            'start_node' => $trace['start_node'],
            'impacted_output_count' => count($outputNodes),
            'impacted_outputs' => array_values($outputNodes),
            'shipment_count' => count($shipments),
            'shipments' => array_values($shipments),
            'trace' => $trace,
        ];
    }

    /**
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    public function supplierIssueImpactSummary(array $filters): array
    {
        $events = $this->allEvents($filters);
        $issues = $this->matchingSupplierIssueEvents($events, $filters);
        $summaries = [];

        foreach ($issues as $event) {
            $issue = $this->supplierIssuePayload($event);
            $lot = (string)($issue['affected_lot_number'] ?? $event['lot_number'] ?? '');
            if ($lot === '') {
                continue;
            }
            $impact = $this->impactedOutputs(['lot_number' => $lot] + $this->scopeFields($filters));
            $summaries[] = [
                'issue_id' => (string)($issue['issue_id'] ?? $event['source_aggregate_id'] ?? ''),
                'issue_status' => (string)($issue['issue_status'] ?? ''),
                'affected_lot_number' => $lot,
                'open' => !$this->isClosedQualityState((string)($issue['issue_status'] ?? '')),
                'impacted_output_count' => $impact['impacted_output_count'],
                'shipment_count' => $impact['shipment_count'],
                'impacted_outputs' => $impact['impacted_outputs'],
                'shipments' => $impact['shipments'],
            ];
        }

        usort($summaries, static fn(array $left, array $right): int => strcmp((string)$left['issue_id'], (string)$right['issue_id']));

        return [
            'generated_at' => gmdate(DATE_ATOM),
            'filters' => $this->publicFilters($filters),
            'issue_count' => count($summaries),
            'issues' => $summaries,
        ];
    }

    /**
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    public function consumptionEligibility(array $filters): array
    {
        $node = $this->targetNode($filters);
        $events = $this->allEvents($filters);
        $lot = $this->nodeLot($node);
        $issues = $lot !== '' ? $this->unresolvedSupplierIssuesForLots([$lot], $events) : [];
        $blockers = $this->issueBlockers($issues, 'supplier_quality_consumption_block');

        return [
            'generated_at' => gmdate(DATE_ATOM),
            'filters' => $this->publicFilters($filters),
            'target_node' => $node,
            'eligible' => $blockers === [],
            'blocker_count' => count($blockers),
            'blockers' => $blockers,
        ];
    }

    /**
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    public function shipmentEligibility(array $filters): array
    {
        $upstream = $this->upstreamTrace($filters);
        $events = $this->allEvents($filters);
        $lots = [];
        foreach ((array)$upstream['nodes'] as $node) {
            if (is_array($node) && (string)($node['node_type'] ?? '') === 'lot') {
                $lots[(string)$node['lot_number']] = (string)$node['lot_number'];
            }
        }

        $issues = $this->unresolvedSupplierIssuesForLots(array_values($lots), $events);
        $blockers = $this->issueBlockers($issues, 'supplier_quality_shipment_block');
        if ($blockers !== []) {
            $this->metrics['shipment_eligibility_block']++;
        }

        return [
            'generated_at' => gmdate(DATE_ATOM),
            'filters' => $this->publicFilters($filters),
            'eligible' => $blockers === [],
            'blocker_count' => count($blockers),
            'blockers' => $blockers,
            'upstream_trace' => $upstream,
        ];
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function assembleContainmentPacket(array $input): array
    {
        $packet = $this->buildContainmentPacket($input, 'assembled');
        $this->appendContainmentPacketEvent($packet, $input);
        $this->metrics['containment_packet']++;
        if ((int)$packet['blocker_count'] > 0) {
            $this->metrics['containment_blocked']++;
        }
        return $packet;
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function resolveContainmentPacket(array $input): array
    {
        $packet = $this->buildContainmentPacket($input, 'resolved');
        if ((int)$packet['blocker_count'] > 0) {
            $this->metrics['containment_blocked']++;
            throw new RuntimeException('containment_packet_blocked');
        }

        $packet['packet_state'] = 'resolved';
        $packet['resolved_at'] = gmdate(DATE_ATOM);
        $packet['resolved_by'] = (string)($input['resolved_by'] ?? $input['actor_id'] ?? 'system');
        $packet['packet_hash'] = $this->packetHash($packet);
        $this->appendContainmentPacketEvent($packet, $input);
        $this->metrics['containment_packet']++;
        return $packet;
    }

    /**
     * @return array<string, mixed>
     */
    public function probe(): array
    {
        $this->metrics['probe']++;
        $eventProbe = $this->events->authorityProbe();
        return [
            'slice' => 'traceability_genealogy',
            'backend' => (string)($eventProbe['backend'] ?? 'manufacturing_event_ledger'),
            'primary_backend' => (string)($eventProbe['primary_backend'] ?? $eventProbe['backend'] ?? 'manufacturing_event_ledger'),
            'readiness_state' => (string)($eventProbe['readiness_state'] ?? 'authority_partial'),
            'authority_mode' => 'event_ledger_traceability_read_model',
            'authoritative' => (bool)($eventProbe['authoritative'] ?? false),
            'fallback_only' => (bool)($eventProbe['fallback_only'] ?? false),
            'read_models' => [
                'upstream_trace',
                'downstream_trace',
                'impacted_outputs',
                'supplier_issue_impact_summary',
                'consumption_eligibility',
                'shipment_eligibility',
                'containment_packet',
            ],
            'link_types' => self::LINK_TYPES,
            'metrics' => $this->metrics,
        ];
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    private function normalizeGenealogyLink(array $input): array
    {
        $linkType = strtolower(trim((string)($input['link_type'] ?? $input['relation_type'] ?? 'production_consumption')));
        if (!in_array($linkType, self::LINK_TYPES, true)) {
            $this->metrics['genealogy_broken_link_rejected']++;
            throw new RuntimeException('unknown_genealogy_link_type');
        }

        if ($linkType === 'shipment_pack') {
            $parent = $this->nodeFromLotSerial(
                $this->firstString($input, ['parent_lot_number', 'output_lot_number', 'lot_number']),
                $this->firstString($input, ['parent_serial_number', 'output_serial_number', 'serial_number']),
            );
            $shipmentId = $this->firstString($input, ['shipment_id', 'shipment_number', 'packing_id', 'package_number']);
            $child = $shipmentId !== '' ? $this->node('shipment', $shipmentId, [
                'shipment_id' => $this->firstString($input, ['shipment_id', 'shipment_number']),
                'packing_id' => $this->firstString($input, ['packing_id']),
                'package_number' => $this->firstString($input, ['package_number']),
            ]) : null;
        } else {
            $parent = $this->nodeFromLotSerial(
                $this->firstString($input, ['parent_lot_number', 'input_lot_number', 'supplier_lot_number', 'receipt_lot_number', 'material_lot_number']),
                $this->firstString($input, ['parent_serial_number', 'input_serial_number', 'supplier_serial_number', 'receipt_serial_number', 'material_serial_number']),
            );
            $child = $this->nodeFromLotSerial(
                $this->firstString($input, ['child_lot_number', 'output_lot_number', 'production_lot_number', 'internal_lot_number']),
                $this->firstString($input, ['child_serial_number', 'output_serial_number', 'production_serial_number', 'internal_serial_number']),
            );
        }

        if ($parent === null || $child === null || (string)$parent['node_key'] === (string)$child['node_key']) {
            $this->metrics['genealogy_broken_link_rejected']++;
            throw new RuntimeException('broken_genealogy_reference');
        }

        $linkId = $this->firstString($input, ['link_id', 'genealogy_link_id']);
        if ($linkId === '') {
            $linkId = 'trace-link-' . substr(hash('sha256', implode('|', [
                $linkType,
                $parent['node_key'],
                $child['node_key'],
                $this->firstString($input, ['source_aggregate_id', 'wo_number', 'inspection_id', 'shipment_id']),
            ])), 0, 24);
        }

        return [
            'link_id' => $linkId,
            'link_type' => $linkType,
            'parent_node' => $parent,
            'child_node' => $child,
            'source_refs' => $this->sourceRefs($input),
            'shipment' => [
                'shipment_id' => $this->firstString($input, ['shipment_id', 'shipment_number']),
                'packing_id' => $this->firstString($input, ['packing_id']),
                'package_number' => $this->firstString($input, ['package_number']),
                'customer_id' => $this->firstString($input, ['customer_id']),
                'customer_name' => $this->firstString($input, ['customer_name']),
            ],
            'scope' => $this->scopeFields($input),
        ];
    }

    /**
     * @param array<string, mixed> $link
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    private function eventPayloadForLink(array $link, array $input): array
    {
        $parent = $link['parent_node'];
        $child = $link['child_node'];
        return array_merge($this->scopeFields($input), [
            'event_id' => $this->nullableString($input['event_id'] ?? null),
            'correlation_id' => $this->correlationId($input),
            'request_id' => $this->nullableString($input['request_id'] ?? null),
            'traceparent' => $this->nullableString($input['traceparent'] ?? null),
            'source_system' => (string)($input['source_system'] ?? 'mom_traceability'),
            'source_aggregate_type' => (string)($input['source_aggregate_type'] ?? 'genealogy_link'),
            'source_aggregate_id' => (string)($input['source_aggregate_id'] ?? $link['link_id']),
            'source_record_id' => (string)($input['source_record_id'] ?? $link['link_id']),
            'so_number' => $this->nullableString($input['so_number'] ?? null),
            'jo_number' => $this->nullableString($input['jo_number'] ?? null),
            'wo_number' => $this->nullableString($input['wo_number'] ?? null),
            'operation_seq' => $this->nullableString($input['operation_seq'] ?? null),
            'work_center_id' => $this->nullableString($input['work_center_id'] ?? null),
            'part_number' => $this->nullableString($input['part_number'] ?? $input['item_id'] ?? null),
            'part_revision' => $this->nullableString($input['part_revision'] ?? $input['revision'] ?? null),
            'lot_number' => $this->nullableString($child['lot_number'] ?? $parent['lot_number'] ?? null),
            'serial_number' => $this->nullableString($child['serial_number'] ?? $parent['serial_number'] ?? null),
            'parent_lot_number' => $this->nullableString($parent['lot_number'] ?? null),
            'parent_serial_number' => $this->nullableString($parent['serial_number'] ?? null),
            'child_lot_number' => $this->nullableString($child['lot_number'] ?? null),
            'child_serial_number' => $this->nullableString($child['serial_number'] ?? null),
            'inspection_id' => $this->nullableString($input['inspection_id'] ?? null),
            'ncr_id' => $this->nullableString($input['ncr_id'] ?? null),
            'capa_id' => $this->nullableString($input['capa_id'] ?? null),
            'scar_id' => $this->nullableString($input['scar_id'] ?? null),
            'evidence_id' => $this->nullableString($input['evidence_id'] ?? null),
            'actor_id' => $this->nullableString($input['actor_id'] ?? $input['created_by'] ?? null),
            'actor_role' => $this->nullableString($input['actor_role'] ?? null),
            'occurred_at' => (string)($input['occurred_at'] ?? gmdate(DATE_ATOM)),
            'idempotency_key' => $this->nullableString($input['idempotency_key'] ?? null),
            'payload_schema_version' => 'traceability_genealogy.v1',
            'payload' => ['traceability_genealogy' => $link],
            'metadata' => [
                'traceability_slice' => 'genealogy',
                'source_payload' => $input,
            ],
        ]);
    }

    /**
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    private function trace(array $filters, string $direction): array
    {
        $start = $this->targetNode($filters);
        $events = $this->allEvents($filters);
        $edges = $this->edgesFromEvents($events);
        $visited = [$start['node_key'] => $start];
        $frontier = [$start['node_key']];
        $traceEdges = [];
        $edgeSeen = [];
        $maxDepth = min(50, max(1, (int)($filters['max_depth'] ?? 20)));

        for ($depth = 0; $depth < $maxDepth && $frontier !== []; $depth++) {
            $next = [];
            foreach ($edges as $edge) {
                $from = (string)$edge[$direction === 'upstream' ? 'child_key' : 'parent_key'];
                $to = (string)$edge[$direction === 'upstream' ? 'parent_key' : 'child_key'];
                if (!in_array($from, $frontier, true)) {
                    continue;
                }
                if (!isset($edgeSeen[$edge['edge_id']])) {
                    $traceEdges[] = $edge;
                    $edgeSeen[$edge['edge_id']] = true;
                }
                if (!isset($visited[$to])) {
                    $node = $direction === 'upstream' ? $edge['parent_node'] : $edge['child_node'];
                    $visited[$to] = $node;
                    $next[] = $to;
                }
            }
            sort($next);
            $frontier = array_values(array_unique($next));
        }

        usort($traceEdges, static function (array $left, array $right): int {
            $cmp = strcmp((string)$left['occurred_at'], (string)$right['occurred_at']);
            return $cmp !== 0 ? $cmp : strcmp((string)$left['edge_id'], (string)$right['edge_id']);
        });
        ksort($visited);

        return [
            'generated_at' => gmdate(DATE_ATOM),
            'direction' => $direction,
            'filters' => $this->publicFilters($filters),
            'start_node' => $start,
            'node_count' => count($visited),
            'edge_count' => count($traceEdges),
            'nodes' => array_values($visited),
            'edges' => array_values($traceEdges),
            'provenance' => [
                'source' => 'mes_operational_event_ledger',
                'deterministic_order' => 'occurred_at, recorded_at, event_id',
                'event_ids' => array_values(array_unique(array_map(static fn(array $edge): string => (string)$edge['event_id'], $traceEdges))),
            ],
        ];
    }

    /**
     * @param array<string, mixed> $filters
     * @return list<array<string, mixed>>
     */
    private function allEvents(array $filters): array
    {
        $query = $this->scopeFields($filters);
        foreach (['correlation_id', 'request_id', 'source_system'] as $field) {
            $value = trim((string)($filters[$field] ?? ''));
            if ($value !== '') {
                $query[$field] = $value;
            }
        }
        $query['limit'] = min(500, max(1, (int)($filters['limit'] ?? 500)));
        return (array)($this->events->productionTimeline($query)['events'] ?? []);
    }

    /**
     * @param list<array<string, mixed>> $events
     * @return list<array<string, mixed>>
     */
    private function edgesFromEvents(array $events): array
    {
        $edges = [];
        foreach ($events as $event) {
            if (!is_array($event) || (string)($event['event_type'] ?? '') !== ManufacturingEventBackboneService::EVENT_TRACE_GENEALOGY_RELATION) {
                continue;
            }
            $edge = $this->edgeFromEvent($event);
            if ($edge !== null) {
                $edges[] = $edge;
            }
        }
        usort($edges, static function (array $left, array $right): int {
            $cmp = strcmp((string)$left['occurred_at'], (string)$right['occurred_at']);
            return $cmp !== 0 ? $cmp : strcmp((string)$left['edge_id'], (string)$right['edge_id']);
        });
        return $edges;
    }

    /**
     * @param array<string, mixed> $event
     * @return array<string, mixed>|null
     */
    private function edgeFromEvent(array $event): ?array
    {
        $payload = is_array($event['payload'] ?? null) ? $event['payload'] : [];
        $link = is_array($payload['traceability_genealogy'] ?? null) ? $payload['traceability_genealogy'] : [];
        $parent = is_array($link['parent_node'] ?? null)
            ? $link['parent_node']
            : $this->nodeFromLotSerial((string)($event['parent_lot_number'] ?? ''), (string)($event['parent_serial_number'] ?? ''));
        $child = is_array($link['child_node'] ?? null)
            ? $link['child_node']
            : $this->nodeFromLotSerial((string)($event['child_lot_number'] ?? ''), (string)($event['child_serial_number'] ?? ''));

        if (!is_array($parent) || !is_array($child)) {
            return null;
        }

        $edgeId = (string)($link['link_id'] ?? $event['event_id'] ?? '');
        return [
            'edge_id' => $edgeId,
            'event_id' => (string)($event['event_id'] ?? ''),
            'event_hash' => (string)($event['event_hash'] ?? ''),
            'link_type' => (string)($link['link_type'] ?? 'trace.genealogy_relation'),
            'parent_key' => (string)$parent['node_key'],
            'child_key' => (string)$child['node_key'],
            'parent_node' => $parent,
            'child_node' => $child,
            'occurred_at' => (string)($event['occurred_at'] ?? ''),
            'recorded_at' => (string)($event['recorded_at'] ?? ''),
            'source_refs' => is_array($link['source_refs'] ?? null) ? $link['source_refs'] : $this->sourceRefs($event),
            'shipment' => is_array($link['shipment'] ?? null) ? $link['shipment'] : [],
        ];
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    private function normalizeSupplierQualityIssue(array $input): array
    {
        $affectedLot = $this->firstString($input, ['affected_lot_number', 'lot_number', 'supplier_lot_number', 'receipt_lot_number', 'material_lot_number']);
        $affectedSerial = $this->firstString($input, ['affected_serial_number', 'serial_number']);
        $issueId = $this->firstString($input, ['supplier_issue_id', 'scar_id', 'ncr_id', 'inspection_id', 'issue_id']);
        if ($affectedLot === '' && $affectedSerial === '') {
            throw new RuntimeException('missing_supplier_quality_affected_lot');
        }
        if ($issueId === '') {
            throw new RuntimeException('missing_supplier_quality_issue_reference');
        }

        $status = strtolower($this->firstString($input, ['issue_status', 'status', 'disposition', 'result']));
        if ($status === '') {
            $status = 'open';
        }

        return [
            'issue_id' => $issueId,
            'issue_type' => (string)($input['issue_type'] ?? 'supplier_quality'),
            'issue_status' => $status,
            'block_consumption' => !$this->isClosedQualityState($status) && $this->truthy($input['block_consumption'] ?? true),
            'affected_lot_number' => $affectedLot,
            'affected_serial_number' => $affectedSerial,
            'vendor_id' => $this->firstString($input, ['vendor_id', 'supplier_id']),
            'supplier_id' => $this->firstString($input, ['supplier_id', 'vendor_id']),
            'inspection_id' => $this->firstString($input, ['inspection_id']),
            'scar_id' => $this->firstString($input, ['scar_id']),
            'ncr_id' => $this->firstString($input, ['ncr_id']),
            'capa_id' => $this->firstString($input, ['capa_id']),
            'evidence_id' => $this->firstString($input, ['evidence_id']),
            'reason_code' => (string)($input['reason_code'] ?? 'supplier_quality_issue'),
            'description' => (string)($input['description'] ?? ''),
        ];
    }

    /**
     * @param list<array<string, mixed>> $events
     * @param array<string, mixed> $filters
     * @return list<array<string, mixed>>
     */
    private function matchingSupplierIssueEvents(array $events, array $filters): array
    {
        $matches = [];
        foreach ($events as $event) {
            $issue = $this->supplierIssuePayload($event);
            if ($issue === []) {
                continue;
            }
            $matched = true;
            foreach (['scar_id', 'ncr_id', 'capa_id', 'inspection_id'] as $field) {
                $filter = trim((string)($filters[$field] ?? ''));
                if ($filter !== '' && (string)($issue[$field] ?? $event[$field] ?? '') !== $filter) {
                    $matched = false;
                    break;
                }
            }
            $issueFilter = $this->firstString($filters, ['supplier_issue_id', 'issue_id']);
            if ($issueFilter !== '' && (string)($issue['issue_id'] ?? '') !== $issueFilter) {
                $matched = false;
            }
            if ($matched) {
                $matches[] = $event;
            }
        }
        return $this->latestIssueEvents($matches);
    }

    /**
     * @param list<string> $lots
     * @param list<array<string, mixed>> $events
     * @return list<array<string, mixed>>
     */
    private function unresolvedSupplierIssuesForLots(array $lots, array $events): array
    {
        $lots = array_values(array_filter(array_unique($lots), static fn(string $lot): bool => trim($lot) !== ''));
        $issues = [];
        foreach ($events as $event) {
            $issue = $this->supplierIssuePayload($event);
            if ($issue === []) {
                continue;
            }
            $lot = (string)($issue['affected_lot_number'] ?? $event['lot_number'] ?? '');
            if (!in_array($lot, $lots, true)) {
                continue;
            }
            $issues[] = $event;
        }

        return array_values(array_filter($this->latestIssueEvents($issues), function (array $event): bool {
            $issue = $this->supplierIssuePayload($event);
            return !$this->isClosedQualityState((string)($issue['issue_status'] ?? ''))
                && $this->truthy($issue['block_consumption'] ?? true);
        }));
    }

    /**
     * @param list<array<string, mixed>> $events
     * @return list<array<string, mixed>>
     */
    private function latestIssueEvents(array $events): array
    {
        usort($events, static function (array $left, array $right): int {
            $cmp = strcmp((string)($left['occurred_at'] ?? ''), (string)($right['occurred_at'] ?? ''));
            return $cmp !== 0 ? $cmp : strcmp((string)($left['event_id'] ?? ''), (string)($right['event_id'] ?? ''));
        });

        $latest = [];
        foreach ($events as $event) {
            $issue = $this->supplierIssuePayload($event);
            $issueId = (string)($issue['issue_id'] ?? $event['source_aggregate_id'] ?? '');
            if ($issueId !== '') {
                $latest[$issueId] = $event;
            }
        }
        ksort($latest);
        return array_values($latest);
    }

    /**
     * @param array<string, mixed> $event
     * @return array<string, mixed>
     */
    private function supplierIssuePayload(array $event): array
    {
        $payload = is_array($event['payload'] ?? null) ? $event['payload'] : [];
        $issue = is_array($payload['supplier_quality_issue'] ?? null) ? $payload['supplier_quality_issue'] : [];
        return $issue;
    }

    /**
     * @param list<array<string, mixed>> $issues
     * @return list<array<string, mixed>>
     */
    private function issueBlockers(array $issues, string $reasonCode): array
    {
        $blockers = [];
        foreach ($issues as $event) {
            $issue = $this->supplierIssuePayload($event);
            $blockers[] = [
                'blocker_id' => 'trace-block-' . substr(hash('sha256', (string)($event['event_id'] ?? '') . $reasonCode), 0, 20),
                'category' => 'supplier_quality',
                'reason_code' => $reasonCode,
                'severity' => 'release_blocking',
                'issue_id' => (string)($issue['issue_id'] ?? $event['source_aggregate_id'] ?? ''),
                'issue_status' => (string)($issue['issue_status'] ?? ''),
                'affected_lot_number' => (string)($issue['affected_lot_number'] ?? $event['lot_number'] ?? ''),
                'scar_id' => (string)($issue['scar_id'] ?? $event['scar_id'] ?? ''),
                'ncr_id' => (string)($issue['ncr_id'] ?? $event['ncr_id'] ?? ''),
                'inspection_id' => (string)($issue['inspection_id'] ?? $event['inspection_id'] ?? ''),
                'message' => 'Unresolved supplier quality issue blocks downstream consumption or shipment eligibility.',
            ];
        }
        return $blockers;
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    private function buildContainmentPacket(array $input, string $targetState): array
    {
        $events = $this->allEvents($input);
        $issueEvents = $this->matchingSupplierIssueEvents($events, $input);
        $issueEvent = $issueEvents[0] ?? null;
        $issue = is_array($issueEvent) ? $this->supplierIssuePayload($issueEvent) : [];
        $issueId = $this->firstString($input, ['supplier_issue_id', 'issue_id', 'scar_id', 'ncr_id', 'inspection_id']);
        if ($issueId === '' && $issue !== []) {
            $issueId = (string)($issue['issue_id'] ?? '');
        }
        $affectedLot = $this->firstString($input, ['affected_lot_number', 'lot_number']);
        if ($affectedLot === '' && $issue !== []) {
            $affectedLot = (string)($issue['affected_lot_number'] ?? '');
        }

        if ($issueId === '' || $affectedLot === '') {
            throw new RuntimeException('missing_containment_trigger_reference');
        }

        $impact = $this->impactedOutputs(['lot_number' => $affectedLot] + $this->scopeFields($input));
        $evidenceIds = $this->stringList($input['evidence_ids'] ?? $input['evidence_id'] ?? []);
        $approvalIds = $this->stringList($input['approval_ids'] ?? $input['approval_id'] ?? []);
        $requiredEvidence = $this->stringList($input['required_evidence_ids'] ?? []);
        $requiredApprovals = $this->stringList($input['required_approval_ids'] ?? []);
        $blockers = [];

        if (!$this->truthy($input['impact_assessment_completed'] ?? false)) {
            $blockers[] = $this->packetBlocker('impact_assessment_incomplete', 'Impact assessment must be completed before containment closure.');
        }
        if ($this->truthy($input['require_impacted_outputs'] ?? false) && (int)$impact['impacted_output_count'] === 0) {
            $blockers[] = $this->packetBlocker('no_impacted_outputs_identified', 'Containment packet requires at least one impacted downstream object or an explicit no-impact assessment.');
        }
        foreach ($requiredEvidence as $required) {
            if (!in_array($required, $evidenceIds, true)) {
                $blockers[] = $this->packetBlocker('required_evidence_missing', 'Required containment evidence is missing.', ['evidence_id' => $required]);
            }
        }
        foreach ($requiredApprovals as $required) {
            if (!in_array($required, $approvalIds, true)) {
                $blockers[] = $this->packetBlocker('required_approval_missing', 'Required containment approval is missing.', ['approval_id' => $required]);
            }
        }

        $packet = [
            'packet_id' => 'containment-' . substr(hash('sha256', $issueId . '|' . $affectedLot), 0, 24),
            'packet_type' => 'traceability_containment_response',
            'payload_schema_version' => 'containment_response.v1',
            'packet_state' => $blockers === [] ? $targetState : 'blocked',
            'triggering_issue' => [
                'issue_id' => $issueId,
                'issue_status' => (string)($issue['issue_status'] ?? $input['issue_status'] ?? ''),
                'scar_id' => (string)($issue['scar_id'] ?? $input['scar_id'] ?? ''),
                'ncr_id' => (string)($issue['ncr_id'] ?? $input['ncr_id'] ?? ''),
                'inspection_id' => (string)($issue['inspection_id'] ?? $input['inspection_id'] ?? ''),
                'affected_lot_number' => $affectedLot,
                'event_id' => is_array($issueEvent) ? (string)($issueEvent['event_id'] ?? '') : '',
            ],
            'impact_summary' => [
                'impacted_output_count' => $impact['impacted_output_count'],
                'shipment_count' => $impact['shipment_count'],
                'impacted_outputs' => $impact['impacted_outputs'],
                'shipments' => $impact['shipments'],
            ],
            'evidence_ids' => $evidenceIds,
            'approval_ids' => $approvalIds,
            'blocker_count' => count($blockers),
            'blockers' => $blockers,
            'provenance' => [
                'generated_at' => gmdate(DATE_ATOM),
                'source' => 'traceability_genealogy_service',
                'trace_event_ids' => $impact['trace']['provenance']['event_ids'] ?? [],
                'deterministic_order' => 'occurred_at, recorded_at, event_id',
            ],
            'retention_metadata' => [
                'structured_packet_is_authority' => true,
                'record_retention_class' => 'traceability_containment_lifetime',
                'export_copy_authority' => false,
            ],
            'scope' => $this->scopeFields($input),
            'correlation_id' => $this->correlationId($input),
            'request_id' => $this->nullableString($input['request_id'] ?? null),
        ];
        $packet['packet_hash_algorithm'] = 'sha256';
        $packet['packet_hash'] = $this->packetHash($packet);
        return $packet;
    }

    /**
     * @param array<string, mixed> $packet
     * @param array<string, mixed> $input
     */
    private function appendContainmentPacketEvent(array $packet, array $input): void
    {
        $issue = is_array($packet['triggering_issue'] ?? null) ? $packet['triggering_issue'] : [];
        $this->events->recordNcrCapaLinkageEvent(array_merge($this->scopeFields($input), [
            'correlation_id' => (string)($packet['correlation_id'] ?? $this->correlationId($input)),
            'request_id' => $this->nullableString($packet['request_id'] ?? $input['request_id'] ?? null),
            'source_system' => (string)($input['source_system'] ?? 'mom_traceability'),
            'source_aggregate_type' => 'containment_packet',
            'source_aggregate_id' => (string)$packet['packet_id'],
            'source_record_id' => (string)$packet['packet_id'],
            'lot_number' => $this->nullableString($issue['affected_lot_number'] ?? null),
            'inspection_id' => $this->nullableString($issue['inspection_id'] ?? null),
            'ncr_id' => $this->nullableString($issue['ncr_id'] ?? null),
            'scar_id' => $this->nullableString($issue['scar_id'] ?? null),
            'evidence_id' => $this->nullableString(((array)($packet['evidence_ids'] ?? []))[0] ?? null),
            'actor_id' => $this->nullableString($input['actor_id'] ?? null),
            'actor_role' => $this->nullableString($input['actor_role'] ?? null),
            'occurred_at' => gmdate(DATE_ATOM),
            'payload_schema_version' => 'containment_response.v1',
            'payload' => ['containment_response_packet' => $packet],
            'metadata' => ['traceability_slice' => 'containment_response'],
        ]));
    }

    /**
     * @param array<string, mixed> $details
     * @return array<string, mixed>
     */
    private function packetBlocker(string $reasonCode, string $message, array $details = []): array
    {
        return [
            'blocker_id' => 'containment-block-' . substr(hash('sha256', $reasonCode . ManufacturingEventCodec::canonicalJson($details)), 0, 20),
            'category' => 'containment',
            'reason_code' => $reasonCode,
            'severity' => 'closure_blocking',
            'message' => $message,
            'details' => $details,
        ];
    }

    /**
     * @param array<string, mixed> $node
     */
    private function nodeLot(array $node): string
    {
        return (string)($node['lot_number'] ?? '');
    }

    /**
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    private function targetNode(array $filters): array
    {
        $shipment = $this->firstString($filters, ['shipment_id', 'shipment_number', 'packing_id', 'package_number']);
        if ($shipment !== '') {
            return $this->node('shipment', $shipment, [
                'shipment_id' => $this->firstString($filters, ['shipment_id', 'shipment_number']),
                'packing_id' => $this->firstString($filters, ['packing_id']),
                'package_number' => $this->firstString($filters, ['package_number']),
            ]);
        }

        $node = $this->nodeFromLotSerial(
            $this->firstString($filters, ['lot_number', 'affected_lot_number', 'input_lot_number', 'output_lot_number']),
            $this->firstString($filters, ['serial_number', 'affected_serial_number', 'input_serial_number', 'output_serial_number']),
        );
        if ($node === null) {
            throw new RuntimeException('missing_traceability_target');
        }
        return $node;
    }

    private function nodeFromLotSerial(string $lotNumber, string $serialNumber): ?array
    {
        if ($serialNumber !== '') {
            return $this->node('serial', $serialNumber, ['serial_number' => $serialNumber, 'lot_number' => $lotNumber]);
        }
        if ($lotNumber !== '') {
            return $this->node('lot', $lotNumber, ['lot_number' => $lotNumber]);
        }
        return null;
    }

    /**
     * @param array<string, mixed> $details
     * @return array<string, mixed>
     */
    private function node(string $type, string $id, array $details = []): array
    {
        $id = trim($id);
        return array_merge($details, [
            'node_type' => $type,
            'node_id' => $id,
            'node_key' => $type . ':' . $id,
        ]);
    }

    /**
     * @param array<string, mixed> $source
     * @return array<string, string>
     */
    private function scopeFields(array $source): array
    {
        $fields = [
            'enterprise_id',
            'company_id',
            'site_id',
            'plant_id',
            'org_company_code',
            'org_legal_entity_code',
            'org_plant_id',
            'org_site_id',
        ];
        $scope = [];
        foreach ($fields as $field) {
            $value = trim((string)($source[$field] ?? ''));
            if ($value !== '') {
                $scope[$field] = $value;
            }
        }
        return $scope;
    }

    /**
     * @param array<string, mixed> $source
     * @return array<string, string>
     */
    private function sourceRefs(array $source): array
    {
        $fields = [
            'vendor_id',
            'supplier_id',
            'po_number',
            'receipt_id',
            'inspection_id',
            'scar_id',
            'ncr_id',
            'capa_id',
            'so_number',
            'jo_number',
            'wo_number',
            'operation_seq',
            'shipment_id',
            'packing_id',
            'package_number',
            'part_number',
            'part_revision',
        ];
        $refs = [];
        foreach ($fields as $field) {
            $value = trim((string)($source[$field] ?? ''));
            if ($value !== '') {
                $refs[$field] = $value;
            }
        }
        return $refs;
    }

    /**
     * @param array<string, mixed> $source
     * @param list<string> $keys
     */
    private function firstString(array $source, array $keys): string
    {
        foreach ($keys as $key) {
            $value = trim((string)($source[$key] ?? ''));
            if ($value !== '') {
                return $value;
            }
        }
        return '';
    }

    /**
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    private function publicFilters(array $filters): array
    {
        $fields = [
            'lot_number',
            'serial_number',
            'affected_lot_number',
            'shipment_id',
            'shipment_number',
            'packing_id',
            'package_number',
            'supplier_issue_id',
            'issue_id',
            'scar_id',
            'ncr_id',
            'capa_id',
            'inspection_id',
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
        ];
        $public = [];
        foreach ($fields as $field) {
            $value = trim((string)($filters[$field] ?? ''));
            if ($value !== '') {
                $public[$field] = $value;
            }
        }
        return $public;
    }

    private function correlationId(array $input): string
    {
        $value = trim((string)($input['correlation_id'] ?? ''));
        return $value !== '' ? $value : 'trace-' . substr(hash('sha256', ManufacturingEventCodec::canonicalJson($input)), 0, 20);
    }

    private function nullableString(mixed $value): ?string
    {
        $value = trim((string)($value ?? ''));
        return $value !== '' ? $value : null;
    }

    private function isClosedQualityState(string $state): bool
    {
        return in_array(strtolower(trim($state)), self::CLOSED_QUALITY_STATES, true);
    }

    private function truthy(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }
        if (is_numeric($value)) {
            return (int)$value === 1;
        }
        return in_array(strtolower(trim((string)$value)), ['1', 'true', 'yes', 'y', 'active', 'required'], true);
    }

    /**
     * @return list<string>
     */
    private function stringList(mixed $value): array
    {
        if (is_string($value)) {
            $value = [$value];
        }
        if (!is_array($value)) {
            return [];
        }
        $strings = [];
        foreach ($value as $entry) {
            $string = trim((string)$entry);
            if ($string !== '') {
                $strings[$string] = $string;
            }
        }
        return array_values($strings);
    }

    /**
     * @param array<string, mixed> $packet
     */
    private function packetHash(array $packet): string
    {
        $copy = $packet;
        unset($copy['packet_hash'], $copy['packet_hash_algorithm']);
        return hash('sha256', ManufacturingEventCodec::canonicalJson($copy));
    }
}

if (!class_exists('MOM\\Services\\TraceabilityGenealogyService', false)) {
    class_alias(TraceabilityGenealogyService::class, 'MOM\\Services\\TraceabilityGenealogyService');
}
