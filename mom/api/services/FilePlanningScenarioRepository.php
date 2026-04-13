<?php
declare(strict_types=1);

namespace MOM\Api\Services;

use RuntimeException;

final class FilePlanningScenarioRepository implements PlanningScenarioRepository
{
    private readonly string $storeFile;

    public function __construct(string $dataDir)
    {
        $base = rtrim(str_replace('\\', '/', $dataDir), '/') . '/planning';
        $this->storeFile = $base . '/planning-scenarios.json';
        if (!is_dir($base)) {
            @mkdir($base, 0775, true);
        }
    }

    public function saveScenario(array $scenario): array
    {
        $scenarioId = $this->requiredId($scenario, 'scenario_id', 'missing_planning_scenario_id');
        return $this->mutate(function (array $store) use ($scenarioId, $scenario): array {
            $existing = is_array($store['scenarios'][$scenarioId] ?? null) ? $store['scenarios'][$scenarioId] : null;
            $store['scenarios'][$scenarioId] = $this->versionedRow($scenario, $existing);
            return [$store, $store['scenarios'][$scenarioId]];
        });
    }

    public function findScenario(string $scenarioIdOrKey): ?array
    {
        $needle = trim($scenarioIdOrKey);
        if ($needle === '') {
            return null;
        }

        foreach ($this->readStore()['scenarios'] as $row) {
            if (!is_array($row)) {
                continue;
            }
            if ((string)($row['scenario_id'] ?? '') === $needle || (string)($row['scenario_key'] ?? '') === $needle) {
                return $this->normalizeRow($row);
            }
        }

        return null;
    }

    public function listScenarios(array $filters = []): array
    {
        return $this->listRows('scenarios', $filters, PlanningScenarioService::scenarioFilterFields(), 'scenario_id');
    }

    public function saveReplanningSignal(array $signal): array
    {
        $signalId = $this->requiredId($signal, 'signal_id', 'missing_replanning_signal_id');
        return $this->mutate(function (array $store) use ($signalId, $signal): array {
            $existing = is_array($store['replanning_signals'][$signalId] ?? null) ? $store['replanning_signals'][$signalId] : null;
            $store['replanning_signals'][$signalId] = $this->versionedRow($signal, $existing);
            return [$store, $store['replanning_signals'][$signalId]];
        });
    }

    public function listReplanningSignals(array $filters = []): array
    {
        return $this->listRows('replanning_signals', $filters, PlanningScenarioService::signalFilterFields(), 'signal_id');
    }

    public function probe(): array
    {
        $store = $this->readStore();
        return [
            'slice' => 'planning_scenario',
            'backend' => 'file',
            'primary_backend' => 'json',
            'readiness_state' => 'authority_partial',
            'authority_mode' => 'json_fallback',
            'authoritative' => false,
            'fallback_only' => true,
            'table_available' => false,
            'scenario_count' => count($store['scenarios']),
            'replanning_signal_count' => count($store['replanning_signals']),
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
            throw new RuntimeException('Unable to open planning scenario fallback store.');
        }

        try {
            if (!flock($handle, LOCK_EX)) {
                throw new RuntimeException('Unable to lock planning scenario fallback store.');
            }

            $store = $this->readStoreFromHandle($handle);
            [$store, $row] = $callback($store);

            rewind($handle);
            ftruncate($handle, 0);
            $json = json_encode($this->storeForWrite($store), JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
            if (!is_string($json) || fwrite($handle, $json . "\n") === false) {
                throw new RuntimeException('Unable to persist planning scenario fallback store.');
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
            'scenarios' => 'scenario_id',
            'replanning_signals' => 'signal_id',
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
            'scenarios' => [],
            'replanning_signals' => [],
        ];
    }

    /**
     * @param array<string, mixed> $store
     * @return array<string, mixed>
     */
    private function storeForWrite(array $store): array
    {
        return [
            'scenarios' => array_values($store['scenarios']),
            'replanning_signals' => array_values($store['replanning_signals']),
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
    private function listRows(string $bucket, array $filters, array $filterFields, string $idField): array
    {
        $rows = array_values($this->readStore()[$bucket] ?? []);
        $rows = array_values(array_filter($rows, fn(array $row): bool => $this->matchesFilters($row, $filters, $filterFields)));
        usort($rows, static function (array $left, array $right) use ($idField): int {
            $cmp = strcmp((string)($right['updated_at'] ?? $right['created_at'] ?? ''), (string)($left['updated_at'] ?? $left['created_at'] ?? ''));
            return $cmp !== 0 ? $cmp : strcmp((string)($left[$idField] ?? ''), (string)($right[$idField] ?? ''));
        });

        $limit = min(500, max(1, (int)($filters['limit'] ?? 100)));
        return array_map(fn(array $row): array => $this->normalizeRow($row), array_slice($rows, 0, $limit));
    }

    /**
     * @param list<string> $filterFields
     */
    private function matchesFilters(array $row, array $filters, array $filterFields): bool
    {
        foreach ($filterFields as $field) {
            if (!array_key_exists($field, $filters) || $filters[$field] === null || $filters[$field] === '') {
                continue;
            }
            if ((string)($row[$field] ?? '') !== (string)$filters[$field]) {
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
        foreach (['constraints', 'schedule', 'blockers', 'capacity_load', 'promise', 'published_schedule', 'metadata', 'impact_payload'] as $field) {
            if (is_string($row[$field] ?? null)) {
                $decoded = json_decode((string)$row[$field], true);
                $row[$field] = is_array($decoded) ? $decoded : [];
            }
        }
        return $row;
    }
}

if (!class_exists('MOM\\Services\\FilePlanningScenarioRepository', false)) {
    class_alias(FilePlanningScenarioRepository::class, 'MOM\\Services\\FilePlanningScenarioRepository');
}
