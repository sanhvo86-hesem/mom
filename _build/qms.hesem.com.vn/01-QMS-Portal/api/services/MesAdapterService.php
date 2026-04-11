<?php

declare(strict_types=1);

namespace MOM\Services;

use RuntimeException;

/**
 * Governance helpers for machine connectivity adapters and edge events.
 */
final class MesAdapterService
{
    public function normalizeConfig(array $payload, string $userId): array
    {
        $adapterId = trim((string)($payload['adapter_id'] ?? ''));
        $machineId = trim((string)($payload['machine_id'] ?? ''));
        if ($adapterId === '' || $machineId === '') {
            throw new RuntimeException('missing_adapter_identity');
        }

        $adapterType = strtolower(trim((string)($payload['adapter_type'] ?? $payload['connector_type'] ?? 'manual_bridge')));
        $transportProtocol = strtolower(trim((string)($payload['transport_protocol'] ?? $adapterType)));
        $status = strtolower(trim((string)($payload['status'] ?? 'active')));
        if (!in_array($status, ['draft', 'active', 'inactive', 'blocked', 'obsolete'], true)) {
            $status = 'draft';
        }

        return [
            'adapter_id' => $adapterId,
            'machine_id' => $machineId,
            'adapter_name' => trim((string)($payload['adapter_name'] ?? strtoupper($adapterType) . ' Adapter')),
            'adapter_type' => $adapterType,
            'transport_protocol' => $transportProtocol,
            'endpoint_url' => trim((string)($payload['endpoint_url'] ?? $payload['connector_endpoint'] ?? '')),
            'heartbeat_sla_seconds' => max(30, (int)($payload['heartbeat_sla_seconds'] ?? 120)),
            'stale_after_seconds' => max(30, (int)($payload['stale_after_seconds'] ?? $payload['heartbeat_sla_seconds'] ?? 180)),
            'auth_mode' => strtolower(trim((string)($payload['auth_mode'] ?? 'service_account'))),
            'store_and_forward_enabled' => $this->normalizeBool($payload['store_and_forward_enabled'] ?? true),
            'payload_schema_version' => trim((string)($payload['payload_schema_version'] ?? '1.0')),
            'status' => $status,
            'last_validated_at' => trim((string)($payload['last_validated_at'] ?? '')),
            'updated_at' => date(DATE_ATOM),
            'updated_by' => $userId,
        ];
    }

    public function normalizeEvent(array $payload, array $adapter, string $userId): array
    {
        $adapterId = trim((string)($payload['adapter_id'] ?? $adapter['adapter_id'] ?? ''));
        $machineId = trim((string)($payload['machine_id'] ?? $adapter['machine_id'] ?? ''));
        if ($adapterId === '' || $machineId === '') {
            throw new RuntimeException('missing_adapter_identity');
        }

        $severity = strtoupper(trim((string)($payload['severity'] ?? 'WARNING')));
        if (!in_array($severity, ['INFO', 'WARNING', 'ALARM', 'CRITICAL', 'EMERGENCY'], true)) {
            $severity = 'WARNING';
        }

        return [
            'adapter_event_id' => trim((string)($payload['adapter_event_id'] ?? ('ADP-' . date('YmdHis') . '-' . substr(md5($adapterId . $machineId . microtime(true)), 0, 6)))),
            'adapter_id' => $adapterId,
            'machine_id' => $machineId,
            'event_time' => $this->normalizeTimestamp((string)($payload['event_time'] ?? $payload['timestamp'] ?? '')),
            'event_type' => strtolower(trim((string)($payload['event_type'] ?? 'heartbeat'))),
            'severity' => $severity,
            'message' => trim((string)($payload['message'] ?? 'Adapter event recorded.')),
            'status' => strtolower(trim((string)($payload['status'] ?? 'open'))),
            'payload_excerpt' => is_array($payload['payload_excerpt'] ?? null) ? $payload['payload_excerpt'] : (is_array($payload['payload'] ?? null) ? $payload['payload'] : []),
            'recorded_by' => $userId,
            'recorded_at' => date(DATE_ATOM),
        ];
    }

    private function normalizeBool(mixed $value, bool $default = false): bool
    {
        if (is_bool($value)) {
            return $value;
        }
        $normalized = strtolower(trim((string)$value));
        if ($normalized === '') {
            return $default;
        }
        return in_array($normalized, ['1', 'true', 'yes', 'y', 'on'], true);
    }

    private function normalizeTimestamp(string $value): string
    {
        $raw = trim($value);
        if ($raw === '') {
            return date(DATE_ATOM);
        }
        try {
            return (new \DateTimeImmutable($raw))->format(DATE_ATOM);
        } catch (\Throwable) {
            return date(DATE_ATOM);
        }
    }
}
