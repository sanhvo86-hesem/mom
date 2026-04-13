<?php
declare(strict_types=1);

namespace MOM\Api\Services;

use RuntimeException;

final class FileConnectedGovernanceRepository implements ConnectedGovernanceRepository
{
    private readonly string $storeFile;

    public function __construct(string $dataDir)
    {
        $base = rtrim(str_replace('\\', '/', $dataDir), '/') . '/connected-governance';
        $this->storeFile = $base . '/governance.json';
        if (!is_dir($base)) {
            @mkdir($base, 0775, true);
        }
    }

    public function saveRollout(array $rollout): array
    {
        $rolloutId = $this->requiredId($rollout, 'rollout_id', 'missing_connected_governance_rollout_id');
        return $this->mutate(function (array $store) use ($rolloutId, $rollout): array {
            $existing = is_array($store['rollouts'][$rolloutId] ?? null) ? $store['rollouts'][$rolloutId] : null;
            $store['rollouts'][$rolloutId] = $this->versionedRow($rollout, $existing);
            return [$store, $store['rollouts'][$rolloutId]];
        });
    }

    public function findRollout(string $rolloutId): ?array
    {
        $store = $this->readStore();
        $row = $store['rollouts'][$rolloutId] ?? null;
        return is_array($row) ? $this->normalizeRow($row) : null;
    }

    public function listRollouts(array $filters = []): array
    {
        return $this->listRows('rollouts', $filters, ConnectedGovernanceService::rolloutFilterFields());
    }

    public function saveTrainingObligation(array $obligation): array
    {
        $obligationId = $this->requiredId($obligation, 'training_obligation_id', 'missing_training_obligation_id');
        return $this->mutate(function (array $store) use ($obligationId, $obligation): array {
            $existing = is_array($store['training_obligations'][$obligationId] ?? null) ? $store['training_obligations'][$obligationId] : null;
            $store['training_obligations'][$obligationId] = $this->versionedRow($obligation, $existing);
            return [$store, $store['training_obligations'][$obligationId]];
        });
    }

    public function listTrainingObligations(array $filters = []): array
    {
        return $this->listRows('training_obligations', $filters, ConnectedGovernanceService::obligationFilterFields());
    }

    public function appendEntitlementDecision(array $decision): array
    {
        $decisionId = $this->requiredId($decision, 'decision_id', 'missing_entitlement_decision_id');
        $decisionKey = trim((string)($decision['decision_key'] ?? ''));
        if ($decisionKey === '') {
            throw new RuntimeException('missing_entitlement_decision_key');
        }

        return $this->mutate(function (array $store) use ($decisionId, $decisionKey, $decision): array {
            foreach ($store['entitlement_decisions'] as $existing) {
                if (!is_array($existing) || (string)($existing['decision_key'] ?? '') !== $decisionKey) {
                    continue;
                }
                if ((string)($existing['decision_fingerprint_hash'] ?? '') !== (string)($decision['decision_fingerprint_hash'] ?? '')) {
                    throw new RecordConflictException('execution_entitlement_decision_conflict');
                }
                return [$store, $existing];
            }

            $store['entitlement_decisions'][$decisionId] = $this->versionedRow($decision, null);
            return [$store, $store['entitlement_decisions'][$decisionId]];
        });
    }

    public function listEntitlementDecisions(array $filters = []): array
    {
        return $this->listRows('entitlement_decisions', $filters, ConnectedGovernanceService::decisionFilterFields());
    }

    public function probe(): array
    {
        $store = $this->readStore();
        return [
            'slice' => 'connected_governance',
            'backend' => 'file',
            'primary_backend' => 'json',
            'readiness_state' => count($store['rollouts']) > 0 ? 'authority_partial' : 'authority_partial',
            'authority_mode' => 'json_fallback',
            'authoritative' => false,
            'fallback_only' => true,
            'table_available' => false,
            'rollout_count' => count($store['rollouts']),
            'training_obligation_count' => count($store['training_obligations']),
            'entitlement_decision_count' => count($store['entitlement_decisions']),
            'store' => $this->storeFile,
        ];
    }

    /**
     * @param callable(array<string, mixed>): array{0: array<string, mixed>, 1: array<string, mixed>} $callback
     * @return array<string, mixed>
     */
    private function mutate(callable $callback): array
    {
        $handle = @fopen($this->storeFile, 'c+');
        if (!is_resource($handle)) {
            throw new RuntimeException('Unable to open connected governance fallback store.');
        }

        try {
            if (!flock($handle, LOCK_EX)) {
                throw new RuntimeException('Unable to lock connected governance fallback store.');
            }

            $store = $this->readStoreFromHandle($handle);
            [$store, $row] = $callback($store);

            rewind($handle);
            ftruncate($handle, 0);
            $json = json_encode($this->storeForWrite($store), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
            if (!is_string($json) || fwrite($handle, $json . "\n") === false) {
                throw new RuntimeException('Unable to persist connected governance fallback store.');
            }
            fflush($handle);

            return $this->normalizeRow($row);
        } finally {
            @flock($handle, LOCK_UN);
            @fclose($handle);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function readStore(): array
    {
        if (!is_file($this->storeFile)) {
            return $this->emptyStore();
        }

        $handle = @fopen($this->storeFile, 'r');
        if (!is_resource($handle)) {
            return $this->emptyStore();
        }

        try {
            @flock($handle, LOCK_SH);
            return $this->readStoreFromHandle($handle);
        } finally {
            @flock($handle, LOCK_UN);
            @fclose($handle);
        }
    }

    /**
     * @param resource $handle
     * @return array<string, mixed>
     */
    private function readStoreFromHandle($handle): array
    {
        rewind($handle);
        $raw = stream_get_contents($handle);
        $decoded = is_string($raw) && trim($raw) !== '' ? json_decode($raw, true) : [];
        $decoded = is_array($decoded) ? $decoded : [];

        $store = $this->emptyStore();
        foreach ([
            'rollouts' => 'rollout_id',
            'training_obligations' => 'training_obligation_id',
            'entitlement_decisions' => 'decision_id',
        ] as $bucket => $idField) {
            $items = is_array($decoded[$bucket] ?? null) ? $decoded[$bucket] : [];
            foreach ($items as $item) {
                if (!is_array($item)) {
                    continue;
                }
                $id = trim((string)($item[$idField] ?? ''));
                if ($id !== '') {
                    $store[$bucket][$id] = $item;
                }
            }
        }

        fseek($handle, 0, SEEK_END);
        return $store;
    }

    /**
     * @return array<string, mixed>
     */
    private function emptyStore(): array
    {
        return [
            'rollouts' => [],
            'training_obligations' => [],
            'entitlement_decisions' => [],
        ];
    }

    /**
     * @param array<string, mixed> $store
     * @return array<string, mixed>
     */
    private function storeForWrite(array $store): array
    {
        return [
            'rollouts' => array_values($store['rollouts']),
            'training_obligations' => array_values($store['training_obligations']),
            'entitlement_decisions' => array_values($store['entitlement_decisions']),
        ];
    }

    /**
     * @param array<string, mixed> $row
     * @param array<string, mixed>|null $existing
     * @return array<string, mixed>
     */
    private function versionedRow(array $row, ?array $existing): array
    {
        $now = gmdate(DATE_ATOM);
        $row['created_at'] = $existing['created_at'] ?? ($row['created_at'] ?? $now);
        $row['updated_at'] = $now;
        $row['row_version'] = (int)($existing['row_version'] ?? 0) + 1;
        return $row;
    }

    /**
     * @param array<string, mixed> $row
     */
    private function requiredId(array $row, string $field, string $error): string
    {
        $id = trim((string)($row[$field] ?? ''));
        if ($id === '') {
            throw new RuntimeException($error);
        }
        return $id;
    }

    /**
     * @param list<string> $filterFields
     * @return list<array<string, mixed>>
     */
    private function listRows(string $bucket, array $filters, array $filterFields): array
    {
        $rows = array_values($this->readStore()[$bucket] ?? []);
        $rows = array_values(array_filter($rows, fn(array $row): bool => $this->matchesFilters($row, $filters, $filterFields)));
        usort($rows, static function (array $left, array $right): int {
            $cmp = strcmp((string)($right['updated_at'] ?? $right['created_at'] ?? ''), (string)($left['updated_at'] ?? $left['created_at'] ?? ''));
            return $cmp !== 0 ? $cmp : strcmp((string)($left['rollout_id'] ?? $left['decision_id'] ?? ''), (string)($right['rollout_id'] ?? $right['decision_id'] ?? ''));
        });

        $limit = min(500, max(1, (int)($filters['limit'] ?? 100)));
        return array_map([$this, 'normalizeRow'], array_slice($rows, 0, $limit));
    }

    /**
     * @param array<string, mixed> $row
     * @param array<string, mixed> $filters
     * @param list<string> $filterFields
     */
    private function matchesFilters(array $row, array $filters, array $filterFields): bool
    {
        foreach ($filterFields as $field) {
            $value = trim((string)($filters[$field] ?? ''));
            if ($value === '') {
                continue;
            }
            if ((string)($row[$field] ?? '') !== $value) {
                return false;
            }
        }
        return true;
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function normalizeRow(array $row): array
    {
        foreach (['metadata', 'scope', 'target', 'active_revision', 'training_obligation', 'qualification_assertion', 'decision_payload'] as $field) {
            if (isset($row[$field])) {
                $row[$field] = ManufacturingEventCodec::decodeJsonObject($row[$field]);
            }
        }

        foreach ($row as $key => $value) {
            if ($value === null) {
                continue;
            }
            if (is_scalar($value)) {
                $row[$key] = is_bool($value) ? $value : (string)$value;
            }
        }
        return $row;
    }
}

if (!class_exists('MOM\\Services\\FileConnectedGovernanceRepository', false)) {
    class_alias(FileConnectedGovernanceRepository::class, 'MOM\\Services\\FileConnectedGovernanceRepository');
}

