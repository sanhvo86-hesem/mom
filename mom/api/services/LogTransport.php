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
    private ?bool $lokiAvailable;
    private bool $lokiConfigured = false;
    private bool $lokiVerified = false;
    private string $lokiVerifiedAt = '';
    private int $fallbackWriteCount = 0;
    private int $fallbackEntryCount = 0;
    private string $lastFailureAt = '';
    private string $lastFailureMessage = '';

    /** @var array<int, array> Buffered log entries for batch push */
    private array $buffer = [];
    private int $bufferLimit;

    public function __construct(
        string $dataDir,
        ?string $lokiUrl = null,
        string $environment = 'production',
        int $bufferLimit = 50
    ) {
        $lokiUrl = $lokiUrl ?? (getenv('LOKI_URL') ?: 'http://localhost:3100');

        // Validate LOKI_URL to prevent SSRF attacks
        if (!filter_var($lokiUrl, FILTER_VALIDATE_URL)) {
            $this->lokiAvailable = false;
            $this->markFailure('Invalid LOKI_URL: ' . $lokiUrl);
            @error_log('[LogTransport] ' . $this->lastFailureMessage . ', disabling Loki');
            $this->lokiUrl = '';
        } else {
            $this->lokiUrl = $lokiUrl;
            $this->lokiConfigured = true;
            $this->lokiAvailable = null;
            $this->markFailure('Loki endpoint configured but not yet verified by a successful push');
        }

        $this->environment = $environment;
        $this->bufferLimit = $bufferLimit;
        $this->fallbackDir = rtrim($dataDir, '/') . '/log-transport';

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

        if ($this->lokiConfigured) {
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
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);

        $response = curl_exec($ch);
        $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        // curl_close() is deprecated and a no-op since PHP 8.0; under PHP 8.5
        // the strict engine raises it as Uncaught Deprecation. Skip the call.
        unset($ch);

        if ($httpCode < 200 || $httpCode >= 300) {
            $this->lokiAvailable = false;
            $this->lokiVerified = false;
            $message = "Loki push failed (HTTP {$httpCode})";
            if ($error !== '') {
                $message .= ': ' . $error;
            }
            $this->markFailure($message);
            @error_log('[LogTransport] ' . $this->lastFailureMessage);

            // Fallback: write to file
            $allEntries = [];
            foreach ($streams as $values) {
                foreach ($values as [$ts, $data]) {
                    $allEntries[] = ['timestamp' => $ts, 'data' => json_decode($data, true)];
                }
            }
            $this->pushToFile($allEntries);
            return;
        }

        $this->lokiAvailable = true;
        $this->lokiVerified = true;
        $this->lokiVerifiedAt = gmdate('c');
        $this->lastFailureAt = '';
        $this->lastFailureMessage = '';
    }

    /**
     * File fallback: append to JSONL.
     */
    private function pushToFile(array $entries): void
    {
        $date = gmdate('Y-m-d');
        $file = $this->fallbackDir . "/logs-{$date}.jsonl";

        $lines = '';
        $encodedEntryCount = 0;
        foreach ($entries as $entry) {
            // WRK-026: Validate log source field format to prevent CRLF injection
            $source = (string)($entry['source'] ?? 'unknown');
            if (!preg_match('/^[a-zA-Z0-9_\-\.]{1,64}$/', $source)) {
                $source = 'invalid_source';
            }
            $entry['source'] = $source;

            // OPS-R6-004: Validate log entries for injection attacks
            if (str_contains($source, "\n") || str_contains($source, "\r")) {
                @error_log('[LogTransport] Skipping entry with newline in source field');
                continue;
            }

            $encoded = json_encode($entry, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            if (!is_string($encoded)) {
                @error_log('[LogTransport] Skipping entry that cannot be JSON encoded');
                continue;
            }
            if (str_contains($encoded, "\r")) {
                @error_log('[LogTransport] Skipping entry with \\r in encoded JSON');
                continue;
            }

            $lines .= $encoded . "\n";
            $encodedEntryCount++;
        }

        if ($lines === '') {
            return;
        }

        $written = @file_put_contents($file, $lines, FILE_APPEND | LOCK_EX);
        if ($written === false) {
            $this->markFailure('Log fallback file write failed: ' . $file);
            return;
        }

        $this->fallbackWriteCount++;
        $this->fallbackEntryCount += $encodedEntryCount;
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
        $fallbackStats = $this->fallbackStats();
        $fallbackActive = !$this->lokiConfigured || $this->fallbackWriteCount > 0 || $fallbackStats['file_count'] > 0;
        return [
            'loki_url'       => $this->lokiUrl,
            'loki_configured' => $this->lokiConfigured,
            'loki_available' => $this->lokiAvailable,
            'loki_verified'  => $this->lokiVerified,
            'loki_probe_state' => $this->lokiVerified ? 'verified' : ($this->lokiConfigured ? 'unverified' : 'disabled'),
            'loki_verified_at' => $this->lokiVerifiedAt,
            'buffer_count'   => count($this->buffer),
            'fallback_dir'   => $this->fallbackDir,
            'fallback_active' => $fallbackActive,
            'fallback_write_count' => $this->fallbackWriteCount,
            'fallback_entry_count' => $this->fallbackEntryCount,
            'fallback_file_count' => $fallbackStats['file_count'],
            'fallback_bytes' => $fallbackStats['bytes'],
            'last_failure_at' => $this->lastFailureAt,
            'last_failure_message' => $this->lastFailureMessage,
        ];
    }

    private function markFailure(string $message): void
    {
        $this->lastFailureAt = gmdate('c');
        $this->lastFailureMessage = $message;
    }

    /**
     * @return array{file_count:int, bytes:int}
     */
    private function fallbackStats(): array
    {
        // WRK-032: Limit glob() file count to prevent memory exhaustion
        $files = is_dir($this->fallbackDir) ? array_slice(glob($this->fallbackDir . '/logs-*.jsonl') ?: [], 0, 1000) : [];
        $fileCount = 0;
        $bytes = 0;
        foreach ($files ?: [] as $file) {
            if (!is_file($file)) {
                continue;
            }
            $fileCount++;
            $size = filesize($file);
            if (is_int($size)) {
                $bytes += $size;
            }
        }

        return ['file_count' => $fileCount, 'bytes' => $bytes];
    }
}
