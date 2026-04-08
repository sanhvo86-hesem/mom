<?php
declare(strict_types=1);

namespace MOM\Services;

/**
 * Normalizes MES connector payloads from MTConnect, OPC UA, DNC, and manual
 * bridge sources into the portal's runtime signal/feed contract.
 */
final class EdgeConnectorService
{
    public function normalize(array $payload, array $machine, string $userId): array
    {
        $machineId = trim((string)($payload['machine_id'] ?? $machine['machine_id'] ?? ''));
        if ($machineId === '') {
            throw new \RuntimeException('missing_machine_id');
        }

        $connectorType = $this->detectConnectorType($payload, $machine);
        $sourceData = $this->selectSourcePayload($payload, $connectorType);
        $xmlData = $this->extractMtconnectXml($payload, $connectorType);
        if ($xmlData !== []) {
            $sourceData = array_merge($xmlData, $sourceData);
        }

        $state = $this->normalizeMachineState(
            $this->firstNonEmpty([
                $sourceData['machine_state'] ?? null,
                $sourceData['execution'] ?? null,
                $sourceData['state'] ?? null,
                $sourceData['status'] ?? null,
                $payload['machine_state'] ?? null,
            ]) ?? 'idle'
        );

        $signalAt = $this->normalizeTimestamp(
            $this->firstNonEmpty([
                $sourceData['signal_at'] ?? null,
                $sourceData['timestamp'] ?? null,
                $sourceData['observed_at'] ?? null,
                $payload['signal_at'] ?? null,
                $payload['timestamp'] ?? null,
            ])
        );
        $lastHeartbeatAt = $this->normalizeTimestamp(
            $this->firstNonEmpty([
                $sourceData['last_heartbeat_at'] ?? null,
                $sourceData['heartbeat_at'] ?? null,
                $signalAt,
            ])
        );

        $normalized = [
            'machine_id' => $machineId,
            'wo_number' => trim((string)($this->firstNonEmpty([
                $sourceData['wo_number'] ?? null,
                $sourceData['work_order'] ?? null,
                $payload['wo_number'] ?? null,
            ]) ?? '')),
            'operator_id' => trim((string)($this->firstNonEmpty([
                $sourceData['operator_id'] ?? null,
                $sourceData['operator'] ?? null,
                $payload['operator_id'] ?? null,
                $machine['preferred_operator_id'] ?? null,
            ]) ?? '')),
            'connector_type' => $connectorType,
            'connector_name' => trim((string)($this->firstNonEmpty([
                $payload['connector_name'] ?? null,
                $machine['connector_name'] ?? null,
                strtoupper($connectorType),
            ]) ?? strtoupper($connectorType))),
            'connector_endpoint' => trim((string)($this->firstNonEmpty([
                $payload['connector_endpoint'] ?? null,
                $machine['connector_endpoint'] ?? null,
            ]) ?? '')),
            'telemetry_mode' => trim((string)($this->firstNonEmpty([
                $payload['telemetry_mode'] ?? null,
                $machine['telemetry_mode'] ?? null,
                $connectorType === 'manual_bridge' ? 'manual' : 'machine',
            ]) ?? 'machine')),
            'source' => trim((string)($this->firstNonEmpty([
                $payload['source'] ?? null,
                $sourceData['source'] ?? null,
                $connectorType,
            ]) ?? $connectorType)),
            'machine_state' => $state,
            'signal_at' => $signalAt,
            'last_heartbeat_at' => $lastHeartbeatAt,
            'heartbeat_sla_seconds' => max(30, (int)($this->firstNonEmpty([
                $payload['heartbeat_sla_seconds'] ?? null,
                $machine['heartbeat_sla_seconds'] ?? null,
                120,
            ]) ?? 120)),
            'current_program_id' => trim((string)($this->firstNonEmpty([
                $sourceData['current_program_id'] ?? null,
                $sourceData['program_id'] ?? null,
                $sourceData['program'] ?? null,
                $sourceData['active_program'] ?? null,
                $payload['current_program_id'] ?? null,
            ]) ?? '')),
            'spindle_load_pct' => $this->normalizePercent($this->firstNonEmpty([
                $sourceData['spindle_load_pct'] ?? null,
                $sourceData['spindle_load'] ?? null,
                $sourceData['load'] ?? null,
                $payload['spindle_load_pct'] ?? null,
            ]), 100),
            'spindle_power_kw' => $this->normalizeNumber($this->firstNonEmpty([
                $sourceData['spindle_power_kw'] ?? null,
                $sourceData['spindle_power'] ?? null,
                $payload['spindle_power_kw'] ?? null,
            ])),
            'total_power_kw' => $this->normalizeNumber($this->firstNonEmpty([
                $sourceData['total_power_kw'] ?? null,
                $sourceData['total_power'] ?? null,
                $sourceData['power_kw'] ?? null,
                $payload['total_power_kw'] ?? null,
            ])),
            'feed_override_pct' => $this->normalizePercent($this->firstNonEmpty([
                $sourceData['feed_override_pct'] ?? null,
                $sourceData['feed_override'] ?? null,
                $sourceData['feedrate_override'] ?? null,
                $payload['feed_override_pct'] ?? null,
            ]), 200),
            'part_count' => $this->normalizeInt($this->firstNonEmpty([
                $sourceData['part_count'] ?? null,
                $sourceData['parts_completed'] ?? null,
                $payload['part_count'] ?? null,
            ])),
            'enabled' => $this->normalizeBool($this->firstNonEmpty([
                $payload['enabled'] ?? null,
                true,
            ]), true),
            'note' => trim((string)($this->firstNonEmpty([
                $payload['note'] ?? null,
                $sourceData['note'] ?? null,
                '',
            ]) ?? '')),
            '_ingest' => [
                'ingested_at' => $this->normalizeTimestamp($payload['ingested_at'] ?? null),
                'ingested_by' => $userId,
                'parser_version' => '1.0',
                'source_payload_type' => $this->detectPayloadType($payload, $connectorType),
                'warnings' => [],
            ],
        ];

        $warnings = [];
        if ($normalized['wo_number'] === '') {
            $warnings[] = 'missing_wo_number';
        }
        if ($normalized['operator_id'] === '') {
            $warnings[] = 'missing_operator_id';
        }
        if ($normalized['current_program_id'] === '' && $normalized['connector_type'] !== 'manual_bridge') {
            $warnings[] = 'missing_current_program';
        }
        if ($normalized['signal_at'] === '') {
            $warnings[] = 'missing_signal_timestamp';
        }
        $normalized['_ingest']['warnings'] = $warnings;

        return $normalized;
    }

    private function detectConnectorType(array $payload, array $machine): string
    {
        $candidates = [
            strtolower(trim((string)($payload['connector_type'] ?? ''))),
            strtolower(trim((string)($payload['protocol'] ?? ''))),
            strtolower(trim((string)($payload['source'] ?? ''))),
            strtolower(trim((string)($machine['connector_type'] ?? ''))),
        ];

        foreach ($candidates as $candidate) {
            if ($candidate === '') {
                continue;
            }
            if (in_array($candidate, ['mtconnect', 'opcua', 'opc_ua', 'dnc', 'manual_bridge', 'manual', 'disabled'], true)) {
                return $candidate === 'opc_ua' ? 'opcua' : ($candidate === 'manual' ? 'manual_bridge' : $candidate);
            }
        }

        if (is_array($payload['mtconnect'] ?? null) || !empty($payload['mtconnect_xml'])) {
            return 'mtconnect';
        }
        if (is_array($payload['opcua'] ?? null) || is_array($payload['opc_ua'] ?? null)) {
            return 'opcua';
        }
        if (is_array($payload['dnc'] ?? null)) {
            return 'dnc';
        }
        return 'manual_bridge';
    }

    private function selectSourcePayload(array $payload, string $connectorType): array
    {
        $candidates = [];
        if (isset($payload[$connectorType]) && is_array($payload[$connectorType])) {
            $candidates[] = $payload[$connectorType];
        }
        if ($connectorType === 'opcua' && isset($payload['opc_ua']) && is_array($payload['opc_ua'])) {
            $candidates[] = $payload['opc_ua'];
        }
        if (isset($payload['signal']) && is_array($payload['signal'])) {
            $candidates[] = $payload['signal'];
        }
        $candidates[] = $payload;

        foreach ($candidates as $candidate) {
            if (is_array($candidate)) {
                return $candidate;
            }
        }
        return [];
    }

    private function extractMtconnectXml(array $payload, string $connectorType): array
    {
        if ($connectorType !== 'mtconnect') {
            return [];
        }
        $xml = trim((string)($payload['mtconnect_xml'] ?? $payload['payload_xml'] ?? ''));
        if ($xml === '') {
            return [];
        }

        try {
            $doc = @simplexml_load_string($xml);
            if ($doc === false) {
                return [];
            }

            $execution = $doc->xpath('//*[local-name()="Execution"]');
            $program = $doc->xpath('//*[local-name()="Program"]');
            $load = $doc->xpath('//*[local-name()="SpindleLoad"]');
            $spindlePower = $doc->xpath('//*[local-name()="SpindlePower"]');
            $totalPower = $doc->xpath('//*[local-name()="TotalPower" or local-name()="Power"]');
            $override = $doc->xpath('//*[local-name()="PathFeedrateOverride"]');
            $partCount = $doc->xpath('//*[local-name()="PartCount"]');

            return array_filter([
                'execution' => isset($execution[0]) ? trim((string)$execution[0]) : null,
                'program' => isset($program[0]) ? trim((string)$program[0]) : null,
                'load' => isset($load[0]) ? trim((string)$load[0]) : null,
                'spindle_power' => isset($spindlePower[0]) ? trim((string)$spindlePower[0]) : null,
                'total_power' => isset($totalPower[0]) ? trim((string)$totalPower[0]) : null,
                'feed_override' => isset($override[0]) ? trim((string)$override[0]) : null,
                'part_count' => isset($partCount[0]) ? trim((string)$partCount[0]) : null,
                'timestamp' => trim((string)($doc['creationTime'] ?? '')) ?: null,
            ], static fn($value) => $value !== null && $value !== '');
        } catch (\Throwable) {
            return [];
        }
    }

    private function normalizeMachineState(string $value): string
    {
        $state = strtolower(trim($value));
        return match ($state) {
            'active', 'executing', 'running', 'cycle', 'cycle_start' => 'running',
            'ready', 'idle', 'stop', 'stopped' => 'idle',
            'setup', 'changeover' => 'setup',
            'inspection', 'measure', 'measuring' => 'inspection',
            'feed_hold', 'hold', 'held', 'on_hold' => 'on_hold',
            'down', 'fault', 'alarm', 'error', 'emergency_stop' => 'down',
            'maintenance', 'pm' => 'maintenance',
            'offline', 'disconnected' => 'offline',
            default => $state === '' ? 'idle' : $state,
        };
    }

    private function normalizeTimestamp(?string $value): string
    {
        $raw = trim((string)$value);
        if ($raw === '') {
            return date(DATE_ATOM);
        }
        try {
            return (new \DateTimeImmutable($raw))->format(DATE_ATOM);
        } catch (\Throwable) {
            return date(DATE_ATOM);
        }
    }

    private function normalizePercent(mixed $value, int $max): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (!is_numeric((string)$value)) {
            return null;
        }
        $number = (float)$value;
        if ($number < 0) {
            $number = 0;
        }
        if ($number > $max) {
            $number = (float)$max;
        }
        return $number;
    }

    private function normalizeNumber(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (!is_numeric((string)$value)) {
            return null;
        }
        $number = (float)$value;
        return $number < 0 ? 0.0 : $number;
    }

    private function normalizeInt(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (!is_numeric((string)$value)) {
            return null;
        }
        return max(0, (int)$value);
    }

    private function normalizeBool(mixed $value, bool $default): bool
    {
        if ($value === null || $value === '') {
            return $default;
        }
        $normalized = filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
        return $normalized ?? $default;
    }

    private function firstNonEmpty(array $values): mixed
    {
        foreach ($values as $value) {
            if ($value === null) {
                continue;
            }
            if (is_string($value) && trim($value) === '') {
                continue;
            }
            return $value;
        }
        return null;
    }

    private function detectPayloadType(array $payload, string $connectorType): string
    {
        if ($connectorType === 'mtconnect' && !empty($payload['mtconnect_xml'])) {
            return 'mtconnect_xml';
        }
        if (isset($payload[$connectorType]) && is_array($payload[$connectorType])) {
            return $connectorType . '_object';
        }
        if (isset($payload['signal']) && is_array($payload['signal'])) {
            return 'signal_object';
        }
        return 'flat_json';
    }
}
