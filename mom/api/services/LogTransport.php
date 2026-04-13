<?php

declare(strict_types=1);

namespace MOM\Api\Services;

/**
 * LogTransport - Centralized log shipping to Grafana Loki.
 *
 * Collects structured log entries and pushes them to Loki's HTTP API.
 * Falls back to local JSONL files when Loki is unreachable.
 *
 * Labels used for Loki stream identification:
 *   app=mom-portal, env={environment}, source={audit|query|error|observability}
 *
 * @package MOM\Api\Services
 * @since   2.1.0
 */
final class LogTransport
{
    private string $lokiUrl;
    private string $environment;
    private string $fallbackDir;
    private bool $lokiAvailable;

    /** @var array<int, array> Buffered log entries for batch push */
    private array $buffer = [];
    private int $bufferLimit;

    public function __construct(
        string $dataDir,
        ?string $lokiUrl = null,
        string $environment = 'production',
        int $bufferLimit = 50
    ) {
        $this->lokiUrl = $lokiUrl ?? (getenv('LOKI_URL') ?: 'http://localhost:3100');
        $this->environment = $environment;
        $this->bufferLimit = $bufferLimit;
        $this->fallbackDir = rtrim($dataDir, '/') . '/log-transport';
        $this->lokiAvailable = true; // Assume available until proven otherwise

        if (!is_dir($this->fallbackDir)) {
            @mkdir($this->fallbackDir, 0775, true);
        }
    }

    /**
     * Log an audit event (from AuditMiddleware).
     */
    public function audit(array $entry): void
    {
        $this->push('audit', $entry);
    }

    /**
     * Log a slow query (from Connection).
     */
    public function slowQuery(string $sql, float $durationMs, array $params = []): void
    {
        $this->push('query', [
            'sql'         => substr($sql, 0, 500), // Truncate long queries
            'duration_ms' => round($durationMs, 2),
            'params_count' => count($params),
            'slow'        => true,
        ]);
    }

    /**
     * Log an application error.
     */
    public function error(string $message, array $context = []): void
    {
        $this->push('error', array_merge([
            'message' => $message,
            'level'   => 'error',
        ], $context));
    }

    /**
     * Log an observability event (from SliceObservability).
     */
    public function observability(array $event): void
    {
        $this->push('observability', $event);
    }

    /**
     * Log a generic structured entry.
     */
    public function info(string $source, array $data): void
    {
        $this->push($source, $data);
    }

    /**
     * Push a log entry to buffer. Flushes when buffer is full.
     */
    private function push(string $source, array $data): void
    {
        $this->buffer[] = [
            'source'    => $source,
            'timestamp' => $this->nowNanos(),
            'data'      => $data,
        ];

        if (count($this->buffer) >= $this->bufferLimit) {
            $this->flush();
        }
    }

    /**
     * Flush buffered logs to Loki (or fallback file).
     */
    public function flush(): void
    {
        if (empty($this->buffer)) {
            return;
        }

        $entries = $this->buffer;
        $this->buffer = [];

        // Group by source for Loki streams
        $streams = [];
        foreach ($entries as $entry) {
            $source = $entry['source'];
            if (!isset($streams[$source])) {
                $streams[$source] = [];
            }
            $streams[$source][] = [
                (string)$entry['timestamp'],
                json_encode($entry['data'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            ];
        }

        if ($this->lokiAvailable) {
            $this->pushToLoki($streams);
        } else {
            $this->pushToFile($entries);
        }
    }

    /**
     * Push to Loki HTTP API (/loki/api/v1/push).
     */
    private function pushToLoki(array $streams): void
    {
        $lokiStreams = [];
        foreach ($streams as $source => $values) {
            $lokiStreams[] = [
                'stream' => [
                    'app'    => 'mom-portal',
                    'env'    => $this->environment,
                    'source' => $source,
                ],
                'values' => $values,
            ];
        }

        $payload = json_encode(['streams' => $lokiStreams], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $url = rtrim($this->lokiUrl, '/') . '/loki/api/v1/push';

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $payload,
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 5,
            CURLOPT_CONNECTTIMEOUT => 2,
        ]);

        $response = curl_exec($ch);
        $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($httpCode < 200 || $httpCode >= 300) {
            $this->lokiAvailable = false;
            @error_log("[LogTransport] Loki push failed (HTTP {$httpCode}): {$error}");

            // Fallback: write to file
            $allEntries = [];
            foreach ($streams as $values) {
                foreach ($values as [$ts, $data]) {
                    $allEntries[] = ['timestamp' => $ts, 'data' => json_decode($data, true)];
                }
            }
            $this->pushToFile($allEntries);
        }
    }

    /**
     * File fallback: append to JSONL.
     */
    private function pushToFile(array $entries): void
    {
        $date = gmdate('Y-m-d');
        $file = $this->fallbackDir . "/logs-{$date}.jsonl";

        $lines = '';
        foreach ($entries as $entry) {
            $lines .= json_encode($entry, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
        }

        @file_put_contents($file, $lines, FILE_APPEND | LOCK_EX);
    }

    /**
     * Get current time in nanoseconds (Loki timestamp format).
     */
    private function nowNanos(): string
    {
        $micro = microtime(true);
        return sprintf('%d', (int)($micro * 1_000_000_000));
    }

    /**
     * Ensure buffer is flushed on shutdown.
     */
    public function __destruct()
    {
        $this->flush();
    }

    /**
     * Health check.
     */
    public function getHealth(): array
    {
        return [
            'loki_url'       => $this->lokiUrl,
            'loki_available' => $this->lokiAvailable,
            'buffer_count'   => count($this->buffer),
            'fallback_dir'   => $this->fallbackDir,
        ];
    }
}
