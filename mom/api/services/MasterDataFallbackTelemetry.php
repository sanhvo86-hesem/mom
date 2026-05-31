<?php

declare(strict_types=1);

namespace MOM\Services;

final class MasterDataFallbackTelemetry
{
    public function __construct(private readonly string $dataDir)
    {
    }

    /**
     * @param array<string, mixed> $context
     */
    public function recordFallbackRead(string $entityType, string $reason, array $context = []): void
    {
        $this->append('master_data_fallback_read', $entityType, $reason, $context);
    }

    /**
     * @param array<string, mixed> $context
     */
    public function recordDriftIncident(string $entityType, string $reason, array $context = []): void
    {
        $this->append('master_data_drift_incident', $entityType, $reason, $context);
    }

    /**
     * @return array<string, mixed>
     */
    public function summary(): array
    {
        $fallback = 0;
        $drift = 0;
        foreach ($this->events() as $event) {
            $type = (string)($event['event_type'] ?? '');
            if ($type === 'master_data_fallback_read') {
                $fallback++;
            }
            if ($type === 'master_data_drift_incident') {
                $drift++;
            }
        }

        return [
            'fallback_read_total' => $fallback,
            'drift_incident_total' => $drift,
            'telemetry_path' => $this->path(),
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function events(): array
    {
        $path = $this->path();
        if (!is_file($path)) {
            return [];
        }

        $events = [];
        foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
            $decoded = json_decode((string)$line, true);
            if (is_array($decoded)) {
                $events[] = $decoded;
            }
        }

        return $events;
    }

    /**
     * @param array<string, mixed> $context
     */
    private function append(string $eventType, string $entityType, string $reason, array $context): void
    {
        $dir = $this->dataDir . '/logs';
        if (!is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) {
            return;
        }

        $event = [
            'event_type' => $eventType,
            'occurred_at' => gmdate('c'),
            'entity_type' => $entityType,
            'reason' => $reason,
            'context' => $context,
        ];
        $json = json_encode($event, JSON_UNESCAPED_SLASHES);
        if (is_string($json)) {
            @file_put_contents($this->path(), $json . "\n", FILE_APPEND | LOCK_EX);
        }
    }

    private function path(): string
    {
        return $this->dataDir . '/logs/master-data-fallback-telemetry.jsonl';
    }
}
