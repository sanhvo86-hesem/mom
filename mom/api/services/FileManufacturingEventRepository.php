<?php
declare(strict_types=1);

namespace MOM\Api\Services;

use RuntimeException;

final class FileManufacturingEventRepository implements ManufacturingEventRepository
{
    private readonly string $eventFile;

    public function __construct(string $dataDir)
    {
        $base = rtrim(str_replace('\\', '/', $dataDir), '/') . '/manufacturing-events';
        $this->eventFile = $base . '/events.jsonl';
        if (!is_dir($base)) {
            @mkdir($base, 0775, true);
        }
    }

    public function append(array $event): array
    {
        $handle = @fopen($this->eventFile, 'c+');
        if (!is_resource($handle)) {
            throw new RuntimeException('Unable to open manufacturing event fallback store.');
        }

        try {
            if (!flock($handle, LOCK_EX)) {
                throw new RuntimeException('Unable to lock manufacturing event fallback store.');
            }

            $events = $this->readEventsFromHandle($handle);
            $duplicate = $this->findDuplicate($events, $event);
            if ($duplicate !== null) {
                if (($duplicate['fingerprint_hash'] ?? '') !== ($event['fingerprint_hash'] ?? '')) {
                    throw new RecordConflictException('manufacturing_event_idempotency_conflict');
                }
                return ['event' => ManufacturingEventCodec::normalizeRow($duplicate), 'replayed' => true];
            }

            $event['previous_event_hash'] = $this->previousHash($events, $event);
            $event['recorded_at'] = $event['recorded_at'] ?? gmdate(DATE_ATOM);
            $event['event_hash'] = ManufacturingEventCodec::eventHash($event);

            $line = json_encode($event, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            if (!is_string($line) || fwrite($handle, $line . "\n") === false) {
                throw new RuntimeException('Unable to append manufacturing event fallback row.');
            }
            fflush($handle);

            return ['event' => ManufacturingEventCodec::normalizeRow($event), 'replayed' => false];
        } finally {
            @flock($handle, LOCK_UN);
            @fclose($handle);
        }
    }

    public function timeline(array $filters = []): array
    {
        $events = $this->readEventsFromFile();
        $events = array_values(array_filter($events, fn(array $event): bool => $this->matchesFilters($event, $filters)));
        usort($events, static function (array $left, array $right): int {
            $cmp = strcmp((string)($left['occurred_at'] ?? ''), (string)($right['occurred_at'] ?? ''));
            return $cmp !== 0 ? $cmp : strcmp((string)($left['recorded_at'] ?? ''), (string)($right['recorded_at'] ?? ''));
        });

        $limit = min(500, max(1, (int)($filters['limit'] ?? 100)));
        if (count($events) > $limit) {
            $events = array_slice($events, 0, $limit);
        }

        return array_map([ManufacturingEventCodec::class, 'normalizeRow'], array_values($events));
    }

    public function probe(): array
    {
        return [
            'slice' => 'manufacturing_events',
            'backend' => 'file',
            'primary_backend' => 'json',
            'readiness_state' => 'compatibility_only',
            'authority_mode' => 'json_fallback',
            'authoritative' => false,
            'fallback_only' => true,
            'table_available' => false,
            'event_count' => count($this->readEventsFromFile()),
            'store' => $this->eventFile,
        ];
    }

    /**
     * @param resource $handle
     * @return list<array<string, mixed>>
     */
    private function readEventsFromHandle($handle): array
    {
        rewind($handle);
        $events = [];
        while (($line = fgets($handle)) !== false) {
            $decoded = json_decode(trim($line), true);
            if (is_array($decoded)) {
                $events[] = $decoded;
            }
        }
        fseek($handle, 0, SEEK_END);
        return $events;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function readEventsFromFile(): array
    {
        if (!is_file($this->eventFile)) {
            return [];
        }

        $handle = @fopen($this->eventFile, 'r');
        if (!is_resource($handle)) {
            return [];
        }

        try {
            @flock($handle, LOCK_SH);
            return $this->readEventsFromHandle($handle);
        } finally {
            @flock($handle, LOCK_UN);
            @fclose($handle);
        }
    }

    /**
     * @param list<array<string, mixed>> $events
     * @param array<string, mixed> $event
     * @return array<string, mixed>|null
     */
    private function findDuplicate(array $events, array $event): ?array
    {
        foreach ($events as $existing) {
            if (($existing['event_id'] ?? '') === ($event['event_id'] ?? '')) {
                return $existing;
            }
            if ($this->sameIdempotencyIdentity($existing, $event)) {
                return $existing;
            }
        }
        return null;
    }

    /**
     * @param list<array<string, mixed>> $events
     * @param array<string, mixed> $event
     */
    private function previousHash(array $events, array $event): ?string
    {
        for ($i = count($events) - 1; $i >= 0; $i--) {
            $existing = $events[$i];
            if (
                ($existing['source_system'] ?? '') === ($event['source_system'] ?? '') &&
                ($existing['source_aggregate_type'] ?? '') === ($event['source_aggregate_type'] ?? '') &&
                ($existing['source_aggregate_id'] ?? '') === ($event['source_aggregate_id'] ?? '')
            ) {
                return (string)($existing['event_hash'] ?? '');
            }
        }
        return null;
    }

    /**
     * @param array<string, mixed> $left
     * @param array<string, mixed> $right
     */
    private function sameIdempotencyIdentity(array $left, array $right): bool
    {
        if (trim((string)($right['idempotency_key'] ?? '')) === '') {
            return false;
        }

        foreach (['source_system', 'source_aggregate_type', 'source_aggregate_id', 'event_type', 'idempotency_key'] as $field) {
            if (($left[$field] ?? null) !== ($right[$field] ?? null)) {
                return false;
            }
        }
        return true;
    }

    /**
     * @param array<string, mixed> $event
     * @param array<string, mixed> $filters
     */
    private function matchesFilters(array $event, array $filters): bool
    {
        foreach (ManufacturingEventBackboneService::timelineFilterFields() as $field) {
            $value = trim((string)($filters[$field] ?? ''));
            if ($value === '') {
                continue;
            }
            if ((string)($event[$field] ?? '') !== $value) {
                return false;
            }
        }
        return true;
    }
}

if (!class_exists('MOM\\Services\\FileManufacturingEventRepository', false)) {
    class_alias(FileManufacturingEventRepository::class, 'MOM\\Services\\FileManufacturingEventRepository');
}
