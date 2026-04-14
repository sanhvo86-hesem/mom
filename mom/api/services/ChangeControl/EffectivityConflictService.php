<?php

declare(strict_types=1);

namespace MOM\Services\ChangeControl;

use RuntimeException;

/**
 * Active effectivity conflict detector for change-order release gates.
 */
final class EffectivityConflictService
{
    public function __construct(private readonly ?object $db = null)
    {
    }

    /**
     * @param list<array<string, mixed>> $effectivities
     * @return list<array<string, mixed>>
     */
    public function detectAndPersist(string $changeOrderId, array $effectivities): array
    {
        $conflicts = $this->detectInPackageConflicts($effectivities);
        foreach ($conflicts as $conflict) {
            $this->persistConflict($changeOrderId, $conflict);
        }

        return $conflicts;
    }

    /**
     * @param list<array<string, mixed>> $effectivities
     * @return list<array<string, mixed>>
     */
    private function detectInPackageConflicts(array $effectivities): array
    {
        $conflicts = [];
        $count = count($effectivities);
        for ($i = 0; $i < $count; $i++) {
            for ($j = $i + 1; $j < $count; $j++) {
                $left = $effectivities[$i];
                $right = $effectivities[$j];
                if (!$this->sameObjectAndScope($left, $right) || !$this->dateRangesOverlap($left, $right)) {
                    continue;
                }
                $conflicts[] = [
                    'conflict_type' => 'overlap',
                    'conflict_state' => 'open',
                    'object_type' => $this->text($left['object_type'] ?? ''),
                    'object_id' => $this->text($left['object_id'] ?? ''),
                    'left_effectivity' => $this->summarizeEffectivity($left),
                    'right_effectivity' => $this->summarizeEffectivity($right),
                    'conflict_hash_sha256' => hash('sha256', $this->canonicalJson([
                        'left' => $this->summarizeEffectivity($left),
                        'right' => $this->summarizeEffectivity($right),
                    ])),
                ];
            }
        }

        return $conflicts;
    }

    /**
     * @param array<string, mixed> $left
     * @param array<string, mixed> $right
     */
    private function sameObjectAndScope(array $left, array $right): bool
    {
        if (strtolower($this->text($left['object_type'] ?? '')) !== strtolower($this->text($right['object_type'] ?? ''))) {
            return false;
        }
        if ($this->text($left['object_id'] ?? '') !== $this->text($right['object_id'] ?? '')) {
            return false;
        }

        return $this->canonicalJson($this->scope($left)) === $this->canonicalJson($this->scope($right));
    }

    /**
     * @param array<string, mixed> $left
     * @param array<string, mixed> $right
     */
    private function dateRangesOverlap(array $left, array $right): bool
    {
        $leftStart = strtotime($this->text($left['effective_from'] ?? ''));
        $rightStart = strtotime($this->text($right['effective_from'] ?? ''));
        if ($leftStart === false || $rightStart === false) {
            return true;
        }
        $leftEnd = $this->text($left['effective_to'] ?? '') === '' ? PHP_INT_MAX : strtotime($this->text($left['effective_to']));
        $rightEnd = $this->text($right['effective_to'] ?? '') === '' ? PHP_INT_MAX : strtotime($this->text($right['effective_to']));
        $leftEnd = $leftEnd === false ? PHP_INT_MAX : $leftEnd;
        $rightEnd = $rightEnd === false ? PHP_INT_MAX : $rightEnd;

        return $leftStart < $rightEnd && $rightStart < $leftEnd;
    }

    /**
     * @param array<string, mixed> $effectivity
     * @return array<string, mixed>
     */
    private function summarizeEffectivity(array $effectivity): array
    {
        return [
            'object_type' => $this->text($effectivity['object_type'] ?? ''),
            'object_id' => $this->text($effectivity['object_id'] ?? ''),
            'effectivity_type' => $this->text($effectivity['effectivity_type'] ?? ''),
            'effectivity_scope' => $this->scope($effectivity),
            'effective_from' => $this->text($effectivity['effective_from'] ?? ''),
            'effective_to' => $this->text($effectivity['effective_to'] ?? ''),
        ];
    }

    /**
     * @param array<string, mixed> $effectivity
     * @return array<string, mixed>
     */
    private function scope(array $effectivity): array
    {
        $scope = $effectivity['effectivity_scope'] ?? [];
        if (is_string($scope) && trim($scope) !== '') {
            $decoded = json_decode($scope, true);
            $scope = is_array($decoded) ? $decoded : ['raw' => $scope];
        }
        return is_array($scope) ? $scope : [];
    }

    /**
     * @param array<string, mixed> $conflict
     */
    private function persistConflict(string $changeOrderId, array $conflict): void
    {
        if ($this->db === null || !method_exists($this->db, 'queryOne')) {
            return;
        }
        $row = $this->db->queryOne(
            "INSERT INTO effectivity_conflicts
                (plm_change_order_id, conflict_type, conflict_state, object_type, object_id, conflict_payload, idempotency_key, metadata)
             VALUES
                (CAST(:change_order_id AS uuid), :conflict_type, :conflict_state, :object_type, :object_id,
                 CAST(:conflict_payload AS jsonb), :idempotency_key, CAST(:metadata AS jsonb))
             ON CONFLICT (idempotency_key) DO NOTHING
             RETURNING *",
            [
                ':change_order_id' => $this->nullableUuid($changeOrderId),
                ':conflict_type' => $this->text($conflict['conflict_type'] ?? 'overlap'),
                ':conflict_state' => $this->text($conflict['conflict_state'] ?? 'open'),
                ':object_type' => $this->text($conflict['object_type'] ?? ''),
                ':object_id' => $this->text($conflict['object_id'] ?? ''),
                ':conflict_payload' => $this->canonicalJson($conflict),
                ':idempotency_key' => (string)$conflict['conflict_hash_sha256'],
                ':metadata' => $this->canonicalJson(['authority' => 'EffectivityConflictService']),
            ],
        );
        if (!is_array($row)) {
            throw new RuntimeException('effectivity_conflict_persist_failed');
        }
    }

    private function text(mixed $value): string
    {
        return is_scalar($value) ? trim((string)$value) : '';
    }

    private function nullableUuid(mixed $value): ?string
    {
        $text = $this->text($value);
        return preg_match('/^[a-f0-9-]{36}$/i', $text) === 1 ? $text : null;
    }

    /**
     * @param array<string, mixed> $data
     */
    private function canonicalJson(array $data): string
    {
        $this->ksortRecursive($data);
        $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if (!is_string($json)) {
            throw new RuntimeException('json_encode_failed');
        }
        return $json;
    }

    /**
     * @param array<string, mixed> $data
     */
    private function ksortRecursive(array &$data, int $depth = 0): void
    {
        if ($depth > 10) {
            return;
        }
        ksort($data);
        foreach ($data as &$value) {
            if (is_array($value)) {
                $this->ksortRecursive($value, $depth + 1);
            }
        }
    }
}
