<?php
declare(strict_types=1);

namespace MOM\Api\Services;

use RuntimeException;

final class FileTrustedReleaseRecordRepository implements TrustedReleaseRecordRepository
{
    private readonly string $packetFile;

    public function __construct(string $dataDir)
    {
        $base = rtrim(str_replace('\\', '/', $dataDir), '/') . '/trusted-release-records';
        $this->packetFile = $base . '/packets.json';
        if (!is_dir($base)) {
            @mkdir($base, 0775, true);
        }
    }

    public function save(array $packet): array
    {
        $packetId = trim((string)($packet['packet_id'] ?? ''));
        if ($packetId === '') {
            throw new RuntimeException('missing_release_record_packet_id');
        }

        $handle = @fopen($this->packetFile, 'c+');
        if (!is_resource($handle)) {
            throw new RuntimeException('Unable to open trusted release record fallback store.');
        }

        try {
            if (!flock($handle, LOCK_EX)) {
                throw new RuntimeException('Unable to lock trusted release record fallback store.');
            }

            $packets = $this->readPacketsFromHandle($handle);
            $existing = $packets[$packetId] ?? null;
            if (is_array($existing) && (string)($existing['packet_state'] ?? '') === 'released') {
                $sameHash = (string)($existing['packet_hash'] ?? '') === (string)($packet['packet_hash'] ?? '');
                if ((string)($packet['packet_state'] ?? '') !== 'released' || !$sameHash) {
                    throw new RecordConflictException('release_record_immutable');
                }
                return ManufacturingEventCodec::normalizeRow($existing);
            }

            $now = gmdate(DATE_ATOM);
            $packet['created_at'] = $existing['created_at'] ?? ($packet['created_at'] ?? $now);
            $packet['updated_at'] = $now;
            $packet['row_version'] = (int)($existing['row_version'] ?? 0) + 1;
            $packets[$packetId] = $packet;

            rewind($handle);
            ftruncate($handle, 0);
            $json = json_encode(array_values($packets), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
            if (!is_string($json) || fwrite($handle, $json . "\n") === false) {
                throw new RuntimeException('Unable to persist trusted release record fallback store.');
            }
            fflush($handle);

            return ManufacturingEventCodec::normalizeRow($packet);
        } finally {
            @flock($handle, LOCK_UN);
            @fclose($handle);
        }
    }

    public function find(string $packetId): ?array
    {
        $packets = $this->readPacketsFromFile();
        return isset($packets[$packetId]) && is_array($packets[$packetId])
            ? ManufacturingEventCodec::normalizeRow($packets[$packetId])
            : null;
    }

    public function list(array $filters = []): array
    {
        $packets = array_values($this->readPacketsFromFile());
        $packets = array_values(array_filter($packets, fn(array $packet): bool => $this->matchesFilters($packet, $filters)));
        usort($packets, static function (array $left, array $right): int {
            $cmp = strcmp((string)($right['updated_at'] ?? ''), (string)($left['updated_at'] ?? ''));
            return $cmp !== 0 ? $cmp : strcmp((string)($left['packet_id'] ?? ''), (string)($right['packet_id'] ?? ''));
        });

        $limit = min(500, max(1, (int)($filters['limit'] ?? 100)));
        return array_map([ManufacturingEventCodec::class, 'normalizeRow'], array_slice($packets, 0, $limit));
    }

    public function probe(): array
    {
        $packets = $this->readPacketsFromFile();
        return [
            'slice' => 'trusted_release_record',
            'backend' => 'file',
            'primary_backend' => 'json',
            'readiness_state' => 'compatibility_only',
            'authority_mode' => 'json_fallback',
            'authoritative' => false,
            'fallback_only' => true,
            'table_available' => false,
            'packet_count' => count($packets),
            'store' => $this->packetFile,
        ];
    }

    /**
     * @param resource $handle
     * @return array<string, array<string, mixed>>
     */
    private function readPacketsFromHandle($handle): array
    {
        rewind($handle);
        $raw = stream_get_contents($handle);
        $decoded = is_string($raw) && trim($raw) !== '' ? json_decode($raw, true) : [];
        $items = is_array($decoded) ? $decoded : [];
        $packets = [];
        foreach ($items as $item) {
            if (!is_array($item)) {
                continue;
            }
            $packetId = trim((string)($item['packet_id'] ?? ''));
            if ($packetId !== '') {
                $packets[$packetId] = $item;
            }
        }
        fseek($handle, 0, SEEK_END);
        return $packets;
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private function readPacketsFromFile(): array
    {
        if (!is_file($this->packetFile)) {
            return [];
        }

        $handle = @fopen($this->packetFile, 'r');
        if (!is_resource($handle)) {
            return [];
        }

        try {
            @flock($handle, LOCK_SH);
            return $this->readPacketsFromHandle($handle);
        } finally {
            @flock($handle, LOCK_UN);
            @fclose($handle);
        }
    }

    /**
     * @param array<string, mixed> $packet
     * @param array<string, mixed> $filters
     */
    private function matchesFilters(array $packet, array $filters): bool
    {
        foreach (TrustedReleaseRecordService::filterFields() as $field) {
            $value = trim((string)($filters[$field] ?? ''));
            if ($value === '') {
                continue;
            }
            if ((string)($packet[$field] ?? '') !== $value) {
                return false;
            }
        }
        return true;
    }
}

if (!class_exists('MOM\\Services\\FileTrustedReleaseRecordRepository', false)) {
    class_alias(FileTrustedReleaseRecordRepository::class, 'MOM\\Services\\FileTrustedReleaseRecordRepository');
}

