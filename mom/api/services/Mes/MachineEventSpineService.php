<?php

declare(strict_types=1);

namespace MOM\Services\Mes;

use MOM\Database\Connection;
use MOM\Database\DataLayer;
use RuntimeException;

/**
 * Runtime command surface for immutable machine raw events and deterministic
 * MES production derivations.
 */
final class MachineEventSpineService
{
    private const QUALITY_CODES = ['good', 'questionable', 'unavailable', 'bad', 'unknown'];

    private ?object $db;

    public function __construct(?object $db = null)
    {
        $this->db = $this->normalizeDb($db);
    }

    /**
     * @param array<string, mixed> $command
     * @return array<string, mixed>
     */
    public function recordMachineEvent(array $command, string $actorRef = 'system'): array
    {
        $this->requireDb();

        $adapterId = $this->requiredText($command, 'adapter_id');
        $sourceNodeId = $this->requiredText($command, 'source_node_id');
        $eventType = $this->requiredText($command, 'event_type');
        $sourceTimestamp = $this->requiredText($command, 'source_timestamp');
        $qualityCode = strtolower($this->text($command['quality_code'] ?? 'unknown')) ?: 'unknown';
        if (!in_array($qualityCode, self::QUALITY_CODES, true)) {
            throw new RuntimeException('invalid_machine_event_quality_code');
        }

        $rawPayload = is_array($command['raw_payload'] ?? null) ? $command['raw_payload'] : [];
        if ($rawPayload === []) {
            throw new RuntimeException('machine_event_raw_payload_required');
        }
        $payloadHash = $this->sha256Json($rawPayload);
        $sequenceNo = $this->nullableText($command['sequence_no'] ?? null);
        $replayKey = $this->text($command['replay_key'] ?? '');
        if ($replayKey === '') {
            $replayKey = hash('sha256', implode('|', [
                $adapterId,
                $sourceNodeId,
                $eventType,
                $sourceTimestamp,
                $sequenceNo ?? '',
                $payloadHash,
            ]));
        }

        $row = $this->db->queryOne(
            "INSERT INTO machine_raw_events
                (adapter_id, source_node_id, event_type, source_timestamp, quality_code,
                 sequence_no, replay_key, raw_payload, raw_payload_hash_sha256,
                 source_system, source_record_id, org_company_code, org_legal_entity_code,
                 org_plant_id, org_site_id, payload_schema_version, row_version, actor_ref)
             VALUES
                (:adapter_id, :source_node_id, :event_type, CAST(:source_timestamp AS timestamptz), :quality_code,
                 :sequence_no, :replay_key, CAST(:raw_payload AS jsonb), :raw_payload_hash_sha256,
                 :source_system, :source_record_id, :org_company_code, :org_legal_entity_code,
                 :org_plant_id, :org_site_id, :payload_schema_version, 1, :actor_ref)
             ON CONFLICT (adapter_id, replay_key) DO NOTHING
             RETURNING *",
            [
                ':adapter_id' => $adapterId,
                ':source_node_id' => $sourceNodeId,
                ':event_type' => $eventType,
                ':source_timestamp' => $sourceTimestamp,
                ':quality_code' => $qualityCode,
                ':sequence_no' => $sequenceNo,
                ':replay_key' => $replayKey,
                ':raw_payload' => $this->json($rawPayload),
                ':raw_payload_hash_sha256' => $payloadHash,
                ':source_system' => $this->text($command['source_system'] ?? 'mom.mes.machine_event_spine') ?: 'mom.mes.machine_event_spine',
                ':source_record_id' => $this->nullableText($command['source_record_id'] ?? null),
                ':org_company_code' => $this->nullableText($command['org_company_code'] ?? null),
                ':org_legal_entity_code' => $this->nullableText($command['org_legal_entity_code'] ?? null),
                ':org_plant_id' => $this->nullableText($command['org_plant_id'] ?? null),
                ':org_site_id' => $this->nullableText($command['org_site_id'] ?? null),
                ':payload_schema_version' => $this->text($command['payload_schema_version'] ?? 'mes_machine_raw_event.v1') ?: 'mes_machine_raw_event.v1',
                ':actor_ref' => $actorRef,
            ],
        );

        $replayed = false;
        if (!is_array($row)) {
            $row = $this->db->queryOne(
                "SELECT *
                 FROM machine_raw_events
                 WHERE adapter_id = :adapter_id
                   AND replay_key = :replay_key
                 LIMIT 1",
                [':adapter_id' => $adapterId, ':replay_key' => $replayKey],
            );
            $replayed = true;
            $this->assertReplayEquivalent(is_array($row) ? $row : [], 'raw_payload_hash_sha256', $payloadHash, 'machine_event_replay_conflict');
        }

        if (!is_array($row)) {
            throw new RuntimeException('machine_event_record_failed');
        }

        return $this->decodeRow($row) + ['replayed' => $replayed, 'replay_key' => $replayKey];
    }

    /**
     * @param array<string, mixed> $command
     * @return array<string, mixed>
     */
    public function deriveProductionEvent(array $command, string $actorRef = 'system'): array
    {
        $this->requireDb();

        $rawEventId = $this->requiredText($command, 'machine_raw_event_id');
        $profileId = $this->requiredText($command, 'derivation_profile_id');
        $raw = $this->db->queryOne(
            "SELECT *
             FROM machine_raw_events
             WHERE machine_raw_event_id = CAST(:machine_raw_event_id AS uuid)
             LIMIT 1",
            [':machine_raw_event_id' => $rawEventId],
        );
        if (!is_array($raw)) {
            throw new RuntimeException('machine_raw_event_not_found');
        }

        $rawPayload = $this->decodeJsonValue($raw['raw_payload'] ?? []);
        $derivedType = $this->derivedEventType($command, is_array($rawPayload) ? $rawPayload : []);
        $eventTime = $this->text($command['event_time'] ?? $raw['source_timestamp'] ?? '');
        if ($eventTime === '') {
            throw new RuntimeException('production_derivation_event_time_required');
        }

        $payload = is_array($command['payload'] ?? null) ? $command['payload'] : [];
        $payload = array_merge([
            'source_event_type' => (string)($raw['event_type'] ?? ''),
            'source_node_id' => (string)($raw['source_node_id'] ?? ''),
            'source_timestamp' => (string)($raw['source_timestamp'] ?? ''),
            'quality_code' => (string)($raw['quality_code'] ?? 'unknown'),
            'derived_by' => 'MachineEventSpineService',
        ], $payload);
        $payloadHash = $this->sha256Json($payload);
        $replayKey = $this->text($command['replay_key'] ?? '');
        if ($replayKey === '') {
            $replayKey = hash('sha256', $rawEventId . '|' . $profileId . '|' . $derivedType . '|' . $payloadHash);
        }

        $row = $this->db->queryOne(
            "INSERT INTO production_derived_events
                (machine_raw_event_id, derivation_profile_id, derived_event_type, event_time,
                 replay_key, work_center_id, machine_id, work_order_id, payload, payload_hash_sha256, actor_ref)
             VALUES
                (CAST(:machine_raw_event_id AS uuid), :derivation_profile_id, :derived_event_type, CAST(:event_time AS timestamptz),
                 :replay_key, :work_center_id, :machine_id, :work_order_id, CAST(:payload AS jsonb), :payload_hash_sha256, :actor_ref)
             ON CONFLICT (machine_raw_event_id, derivation_profile_id, derived_event_type, replay_key) DO NOTHING
             RETURNING *",
            [
                ':machine_raw_event_id' => $rawEventId,
                ':derivation_profile_id' => $profileId,
                ':derived_event_type' => $derivedType,
                ':event_time' => $eventTime,
                ':replay_key' => $replayKey,
                ':work_center_id' => $this->nullableText($command['work_center_id'] ?? $rawPayload['work_center_id'] ?? null),
                ':machine_id' => $this->nullableText($command['machine_id'] ?? $raw['source_node_id'] ?? null),
                ':work_order_id' => $this->nullableText($command['work_order_id'] ?? $rawPayload['wo_number'] ?? null),
                ':payload' => $this->json($payload),
                ':payload_hash_sha256' => $payloadHash,
                ':actor_ref' => $actorRef,
            ],
        );

        $replayed = false;
        if (!is_array($row)) {
            $row = $this->db->queryOne(
                "SELECT *
                 FROM production_derived_events
                 WHERE machine_raw_event_id = CAST(:machine_raw_event_id AS uuid)
                   AND derivation_profile_id = :derivation_profile_id
                   AND derived_event_type = :derived_event_type
                   AND replay_key = :replay_key
                 LIMIT 1",
                [
                    ':machine_raw_event_id' => $rawEventId,
                    ':derivation_profile_id' => $profileId,
                    ':derived_event_type' => $derivedType,
                    ':replay_key' => $replayKey,
                ],
            );
            $replayed = true;
            $this->assertReplayEquivalent(is_array($row) ? $row : [], 'payload_hash_sha256', $payloadHash, 'production_derivation_replay_conflict');
        }

        if (!is_array($row)) {
            throw new RuntimeException('production_derivation_failed');
        }

        return $this->decodeRow($row) + ['replayed' => $replayed, 'replay_key' => $replayKey];
    }

    private function requireDb(): void
    {
        if ($this->db === null || !method_exists($this->db, 'queryOne')) {
            throw new RuntimeException('authoritative_machine_event_spine_store_required');
        }
    }

    /**
     * @param array<string, mixed> $row
     */
    private function assertReplayEquivalent(array $row, string $hashColumn, string $expectedHash, string $error): void
    {
        if ($row === [] || strtolower($this->text($row[$hashColumn] ?? '')) !== $expectedHash) {
            throw new RuntimeException($error);
        }
    }

    /**
     * @param array<string, mixed> $command
     * @param array<string, mixed> $rawPayload
     */
    private function derivedEventType(array $command, array $rawPayload): string
    {
        $explicit = strtolower($this->text($command['derived_event_type'] ?? ''));
        if ($explicit !== '') {
            return match ($explicit) {
                'cycle', 'downtime', 'alarm', 'oee_sample', 'state_transition', 'quality_signal' => $explicit,
                default => throw new RuntimeException('unsupported_production_derived_event_type'),
            };
        }

        $state = strtolower($this->text($rawPayload['machine_state'] ?? ''));
        if (in_array($state, ['alarm', 'fault', 'emergency_stop'], true)) {
            return 'alarm';
        }
        if (in_array($state, ['idle', 'down', 'stopped'], true)) {
            return 'downtime';
        }
        if (array_key_exists('part_count', $rawPayload) || in_array($state, ['running', 'active', 'executing'], true)) {
            return 'cycle';
        }
        return 'state_transition';
    }

    private function requiredText(array $input, string $field): string
    {
        $value = $this->text($input[$field] ?? '');
        if ($value === '') {
            throw new RuntimeException('missing_' . $field);
        }
        return $value;
    }

    private function text(mixed $value): string
    {
        return is_scalar($value) ? trim((string)$value) : '';
    }

    private function nullableText(mixed $value): ?string
    {
        $text = $this->text($value);
        return $text === '' ? null : $text;
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function sha256Json(array $payload): string
    {
        return hash('sha256', $this->json($payload));
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function json(array $payload): string
    {
        $json = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if (!is_string($json)) {
            throw new RuntimeException('machine_event_json_encode_failed');
        }
        return $json;
    }

    /**
     * @return mixed
     */
    private function decodeJsonValue(mixed $value): mixed
    {
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            return json_last_error() === JSON_ERROR_NONE ? $decoded : $value;
        }
        return $value;
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function decodeRow(array $row): array
    {
        foreach (['raw_payload', 'payload'] as $field) {
            if (isset($row[$field])) {
                $row[$field] = $this->decodeJsonValue($row[$field]);
            }
        }
        return $row;
    }

    private function normalizeDb(?object $db): ?object
    {
        if ($db instanceof DataLayer) {
            return $db->getConnection();
        }
        if ($db instanceof Connection) {
            return $db;
        }
        if ($db !== null && method_exists($db, 'getConnection')) {
            try {
                $candidate = $db->getConnection();
                return is_object($candidate) ? $candidate : null;
            } catch (\Throwable) {
                return null;
            }
        }
        return $db;
    }
}
