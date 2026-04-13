<?php

declare(strict_types=1);

namespace MOM\Services\Traceability;

use RuntimeException;

/**
 * Builds derived digital-thread graph records from authoritative control-plane
 * objects. This service does not make genealogy records authoritative; it
 * produces deterministic nodes/edges for graph persistence/projection workers.
 */
final class UnifiedEvidenceGraphService
{
    private const NODE_TYPES = [
        'job',
        'work_order',
        'operation',
        'lot',
        'serial',
        'material',
        'equipment',
        'tool',
        'personnel',
        'document_revision',
        'evidence_record',
        'evidence_version',
        'change_order',
        'nonconformance',
        'shipment',
    ];

    private const EDGE_TYPES = [
        'consumed',
        'produced',
        'executed_by',
        'used_equipment',
        'used_tool',
        'documented_by',
        'evidenced_by',
        'authorized_by_change',
        'supersedes',
        'reworked_from',
        'shipped_as',
    ];

    /**
     * @param array<string, mixed> $context
     * @return array{nodes: list<array<string, mixed>>, edges: list<array<string, mixed>>, exceptions: list<array<string, mixed>>}
     */
    public function buildEvidenceContextGraph(array $context): array
    {
        $nodes = [];
        $edges = [];
        $exceptions = [];

        $evidenceRecord = $this->requiredNode('evidence_record', $context['evidence_record_id'] ?? '');
        $nodes[] = $evidenceRecord;

        if ($this->text($context['evidence_version_id'] ?? '') !== '') {
            $version = $this->requiredNode('evidence_version', $context['evidence_version_id']);
            $nodes[] = $version;
            $edges[] = $this->edge($version, $evidenceRecord, 'evidenced_by', $context);
        }

        foreach ($this->contextNodeMap() as $field => $nodeType) {
            $value = $context[$field] ?? null;
            if ($value === null || $value === '') {
                continue;
            }

            $values = is_array($value) ? $value : [$value];
            foreach ($values as $item) {
                $ref = $this->text($item);
                if ($ref === '') {
                    continue;
                }
                $node = $this->requiredNode($nodeType, $ref);
                $nodes[] = $node;
                $edges[] = $this->edge($node, $evidenceRecord, $this->edgeTypeFor($nodeType), $context);
            }
        }

        foreach (['job_id', 'work_order_id', 'operation_id', 'lot_id', 'serial_id'] as $criticalField) {
            if ($this->text($context[$criticalField] ?? '') === '') {
                $exceptions[] = [
                    'exception_type' => 'incomplete_5m_context',
                    'severity' => 'P1',
                    'missing_field' => $criticalField,
                    'object_type' => 'evidence_record',
                    'object_id' => $evidenceRecord['node_ref'],
                ];
            }
        }

        return [
            'nodes' => $this->uniqueNodes($nodes),
            'edges' => $this->uniqueEdges($edges),
            'exceptions' => $exceptions,
        ];
    }

    /**
     * @param list<array<string, mixed>> $edges
     * @return list<string>
     */
    public function impactClosure(string $startNodeRef, array $edges, int $maxDepth = 5): array
    {
        $adjacency = [];
        foreach ($edges as $edge) {
            $from = $this->text($edge['from_node_ref'] ?? '');
            $to = $this->text($edge['to_node_ref'] ?? '');
            if ($from !== '' && $to !== '') {
                $adjacency[$from][] = $to;
            }
        }

        $visited = [];
        $queue = [[$startNodeRef, 0]];
        while ($queue !== []) {
            [$node, $depth] = array_shift($queue);
            if (isset($visited[$node]) || $depth > $maxDepth) {
                continue;
            }
            $visited[$node] = true;
            foreach ($adjacency[$node] ?? [] as $next) {
                $queue[] = [$next, $depth + 1];
            }
        }

        unset($visited[$startNodeRef]);
        return array_keys($visited);
    }

    /**
     * @return array<string, string>
     */
    private function contextNodeMap(): array
    {
        return [
            'job_id' => 'job',
            'work_order_id' => 'work_order',
            'operation_id' => 'operation',
            'lot_id' => 'lot',
            'serial_id' => 'serial',
            'material_lot_ids' => 'material',
            'equipment_id' => 'equipment',
            'tool_ids' => 'tool',
            'operator_id' => 'personnel',
            'doc_revision_ids' => 'document_revision',
            'change_order_id' => 'change_order',
            'ncr_id' => 'nonconformance',
            'shipment_id' => 'shipment',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function requiredNode(string $type, mixed $ref): array
    {
        if (!in_array($type, self::NODE_TYPES, true)) {
            throw new RuntimeException('unsupported_genealogy_node_type');
        }
        $nodeRef = $this->text($ref);
        if ($nodeRef === '') {
            throw new RuntimeException('genealogy_node_ref_required');
        }
        return [
            'node_type' => $type,
            'node_ref' => $nodeRef,
            'canonical_label' => strtoupper($type) . ':' . $nodeRef,
        ];
    }

    /**
     * @param array<string, mixed> $from
     * @param array<string, mixed> $to
     * @param array<string, mixed> $context
     * @return array<string, mixed>
     */
    private function edge(array $from, array $to, string $type, array $context): array
    {
        if (!in_array($type, self::EDGE_TYPES, true)) {
            throw new RuntimeException('unsupported_genealogy_edge_type');
        }
        return [
            'from_node_type' => $from['node_type'],
            'from_node_ref' => $from['node_ref'],
            'to_node_type' => $to['node_type'],
            'to_node_ref' => $to['node_ref'],
            'edge_type' => $type,
            'source_event_id' => $this->text($context['source_event_id'] ?? ''),
        ];
    }

    private function edgeTypeFor(string $nodeType): string
    {
        return match ($nodeType) {
            'material' => 'consumed',
            'equipment' => 'used_equipment',
            'tool' => 'used_tool',
            'personnel' => 'executed_by',
            'document_revision' => 'documented_by',
            'change_order' => 'authorized_by_change',
            'shipment' => 'shipped_as',
            default => 'evidenced_by',
        };
    }

    /**
     * @param list<array<string, mixed>> $nodes
     * @return list<array<string, mixed>>
     */
    private function uniqueNodes(array $nodes): array
    {
        $seen = [];
        $out = [];
        foreach ($nodes as $node) {
            $key = $node['node_type'] . '|' . $node['node_ref'];
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $out[] = $node;
        }
        return $out;
    }

    /**
     * @param list<array<string, mixed>> $edges
     * @return list<array<string, mixed>>
     */
    private function uniqueEdges(array $edges): array
    {
        $seen = [];
        $out = [];
        foreach ($edges as $edge) {
            $key = implode('|', [
                $edge['from_node_type'],
                $edge['from_node_ref'],
                $edge['to_node_type'],
                $edge['to_node_ref'],
                $edge['edge_type'],
                $edge['source_event_id'],
            ]);
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $out[] = $edge;
        }
        return $out;
    }

    private function text(mixed $value): string
    {
        return is_scalar($value) ? trim((string)$value) : '';
    }
}
