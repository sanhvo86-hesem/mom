<?php

declare(strict_types=1);

namespace MOM\Api\Services\DomainCommand;

use MOM\Database\Connection;
use Throwable;

final class ResourceReadinessService
{
    /**
     * @var array<string,list<string>>
     */
    private const REQUIRED_EVIDENCE = [
        'StartJobCommand' => [
            'operator_training',
            'operator_qualification',
            'machine_pm',
            'machine_calibration',
            'machine_capability',
            'machine_connectivity',
            'material_availability',
            'material_lot_quality',
            'material_shelf_life',
            'tool_life',
            'tool_calibration',
            'tool_preset',
            'nc_program_checksum',
            'control_plan',
            'inspection_plan',
        ],
        'IssueMaterialToWorkOrderCommand' => [
            'material_availability',
            'material_lot_quality',
            'material_shelf_life',
        ],
        'LoadToolCommand' => [
            'tool_life',
            'tool_calibration',
            'tool_preset',
        ],
        'RecordInspectionResultCommand' => [
            'operator_qualification',
            'gage_calibration',
            'inspection_plan',
        ],
        'CompleteOperationCommand' => [
            'operator_training',
            'machine_connectivity',
            'control_plan',
            'inspection_plan',
        ],
        'ReleaseWorkOrderCommand' => [
            'engineering_package_snapshot',
        ],
    ];

    public function __construct(private readonly Connection $db) {}

    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function evaluateAndSnapshot(string $commandName, array $payload, string $actorId, string $idempotencyKey): array
    {
        $required = self::REQUIRED_EVIDENCE[$commandName] ?? [];
        if ($required === []) {
            return ['decision' => 'allow', 'required_evidence_keys' => [], 'snapshot' => []];
        }

        $workOrderRef = $this->requiredAny($payload, ['work_order_ref', 'wo_number', 'job_number'], 'work_order_ref');
        $operationRef = $this->text($payload['operation_ref'] ?? $payload['operation_seq'] ?? '');
        $evidenceRows = [];
        $blockers = [];

        foreach ($required as $evidenceKey) {
            $row = $this->loadEvidenceState($workOrderRef, $operationRef, $commandName, $evidenceKey);
            if ($row === null) {
                $blockers[] = $this->blocker($evidenceKey, 'readiness_evidence_missing', 'Required readiness evidence is missing.');
                continue;
            }

            $normalized = $this->normalizeEvidenceRow($row);
            $evidenceRows[] = $normalized;
            if (($normalized['readiness_status'] ?? '') !== 'valid') {
                $blockers[] = $this->blocker($evidenceKey, 'readiness_evidence_' . (string)$normalized['readiness_status'], $this->message($normalized, 'Readiness evidence is not valid.'));
                continue;
            }
            $validUntil = $this->text($normalized['valid_until'] ?? '');
            if ($validUntil !== '' && strtotime($validUntil) <= time()) {
                $blockers[] = $this->blocker($evidenceKey, 'readiness_evidence_expired', $this->message($normalized, 'Readiness evidence has expired.'));
            }
        }

        $decision = $blockers === [] ? 'allow' : 'block';
        $operatorPayload = [
            'decision' => $decision,
            'blocked_actions' => $decision === 'block' ? [$commandName] : [],
            'reasons' => $blockers,
        ];
        $hash = $this->hash([
            'command_name' => $commandName,
            'work_order_ref' => $workOrderRef,
            'operation_ref' => $operationRef,
            'required_evidence_keys' => $required,
            'evidence_snapshot' => $evidenceRows,
            'blockers' => $blockers,
        ]);
        $snapshot = $this->persistSnapshot($commandName, $workOrderRef, $operationRef, $payload, $actorId, $idempotencyKey, $decision, $hash, $required, $evidenceRows, $blockers, $operatorPayload);

        if ($decision !== 'allow') {
            $this->writeAudit('resource_readiness.blocked', $commandName, $workOrderRef, $actorId, [
                'readiness_snapshot_id' => (string)($snapshot['readiness_snapshot_id'] ?? ''),
                'readiness_hash_sha256' => $hash,
                'blockers' => $blockers,
                'operator_reason_payload' => $operatorPayload,
            ]);
            throw new DomainCommandException('resource_readiness_blocked', 'Resource readiness blocks this command.', 409, [
                'readiness_snapshot_id' => (string)($snapshot['readiness_snapshot_id'] ?? ''),
                'readiness_hash_sha256' => $hash,
                'blockers' => $blockers,
                'operator_reason_payload' => $operatorPayload,
            ]);
        }

        $this->writeAudit('resource_readiness.allowed', $commandName, $workOrderRef, $actorId, [
            'readiness_snapshot_id' => (string)($snapshot['readiness_snapshot_id'] ?? ''),
            'readiness_hash_sha256' => $hash,
            'required_evidence_keys' => $required,
        ]);

        return [
            'decision' => $decision,
            'readiness_snapshot_id' => (string)($snapshot['readiness_snapshot_id'] ?? ''),
            'readiness_hash_sha256' => $hash,
            'required_evidence_keys' => $required,
            'evidence_snapshot' => $evidenceRows,
            'operator_reason_payload' => $operatorPayload,
        ];
    }

    private function loadEvidenceState(string $workOrderRef, string $operationRef, string $commandName, string $evidenceKey): ?array
    {
        try {
            return $this->db->queryOne(
                "SELECT evidence_key, resource_type, resource_ref, readiness_status, evidence_hash_sha256,
                        source_authority, valid_from, valid_until, operator_message, metadata
                   FROM resource_readiness_evidence_state
                  WHERE work_order_ref = :work_order_ref
                    AND evidence_key = :evidence_key
                    AND command_scope IN ('*', :command_name)
                    AND (operation_ref IS NULL OR operation_ref = :operation_ref)
                  ORDER BY CASE WHEN operation_ref = :operation_ref THEN 0 ELSE 1 END, updated_at DESC
                  LIMIT 1",
                [
                    ':work_order_ref' => $workOrderRef,
                    ':operation_ref' => $operationRef !== '' ? $operationRef : null,
                    ':command_name' => $commandName,
                    ':evidence_key' => $evidenceKey,
                ]
            );
        } catch (Throwable $e) {
            throw new DomainCommandException('resource_readiness_store_unavailable', 'Resource readiness evidence store is unavailable.', 500, [], $e);
        }
    }

    /**
     * @param array<string,mixed> $payload
     * @param list<string> $required
     * @param list<array<string,mixed>> $evidenceRows
     * @param list<array<string,mixed>> $blockers
     * @param array<string,mixed> $operatorPayload
     * @return array<string,mixed>
     */
    private function persistSnapshot(
        string $commandName,
        string $workOrderRef,
        string $operationRef,
        array $payload,
        string $actorId,
        string $idempotencyKey,
        string $decision,
        string $hash,
        array $required,
        array $evidenceRows,
        array $blockers,
        array $operatorPayload
    ): array {
        try {
            $row = $this->db->queryOne(
                "WITH inserted AS (
                    INSERT INTO resource_readiness_snapshot
                        (command_name, work_order_ref, job_ref, operation_ref, actor_id, decision,
                         readiness_hash_sha256, required_evidence_keys, evidence_snapshot, blockers,
                         operator_reason_payload, idempotency_key, metadata)
                    VALUES
                        (:command_name, :work_order_ref, :job_ref, :operation_ref, :actor_id, :decision,
                         :readiness_hash_sha256, CAST(:required_evidence_keys AS jsonb),
                         CAST(:evidence_snapshot AS jsonb), CAST(:blockers AS jsonb),
                         CAST(:operator_reason_payload AS jsonb), :idempotency_key, CAST(:metadata AS jsonb))
                    ON CONFLICT (command_name, idempotency_key) DO NOTHING
                    RETURNING *
                 )
                 SELECT * FROM inserted
                 UNION ALL
                 SELECT * FROM resource_readiness_snapshot
                  WHERE command_name = :command_name AND idempotency_key = :idempotency_key
                 LIMIT 1",
                [
                    ':command_name' => $commandName,
                    ':work_order_ref' => $workOrderRef,
                    ':job_ref' => $this->nullableText($payload['job_ref'] ?? $payload['job_number'] ?? null),
                    ':operation_ref' => $operationRef !== '' ? $operationRef : null,
                    ':actor_id' => $actorId,
                    ':decision' => $decision,
                    ':readiness_hash_sha256' => $hash,
                    ':required_evidence_keys' => $this->json($required),
                    ':evidence_snapshot' => $this->json($evidenceRows),
                    ':blockers' => $this->json($blockers),
                    ':operator_reason_payload' => $this->json($operatorPayload),
                    ':idempotency_key' => $idempotencyKey,
                    ':metadata' => $this->json(['authority' => 'DomainCommand.ResourceReadinessService']),
                ]
            );
        } catch (Throwable $e) {
            throw new DomainCommandException('resource_readiness_snapshot_write_failed', 'Resource readiness snapshot could not be written.', 500, [], $e);
        }

        return is_array($row) ? $row : [];
    }

    /**
     * @param array<string,mixed> $row
     * @return array<string,mixed>
     */
    private function normalizeEvidenceRow(array $row): array
    {
        $metadata = $row['metadata'] ?? [];
        if (is_string($metadata) && trim($metadata) !== '') {
            $decoded = json_decode($metadata, true);
            $metadata = is_array($decoded) ? $decoded : [];
        }

        return [
            'evidence_key' => $this->text($row['evidence_key'] ?? ''),
            'resource_type' => $this->text($row['resource_type'] ?? ''),
            'resource_ref' => $this->text($row['resource_ref'] ?? ''),
            'readiness_status' => $this->text($row['readiness_status'] ?? ''),
            'evidence_hash_sha256' => strtolower($this->text($row['evidence_hash_sha256'] ?? '')),
            'source_authority' => $this->text($row['source_authority'] ?? ''),
            'valid_until' => $this->text($row['valid_until'] ?? ''),
            'operator_message' => $this->text($row['operator_message'] ?? ''),
            'metadata' => is_array($metadata) ? $metadata : [],
        ];
    }

    /**
     * @return array<string,string>
     */
    private function blocker(string $evidenceKey, string $code, string $message): array
    {
        return [
            'evidence_key' => $evidenceKey,
            'code' => $code,
            'operator_message' => $message,
        ];
    }

    /**
     * @param array<string,mixed> $row
     */
    private function message(array $row, string $fallback): string
    {
        $message = $this->text($row['operator_message'] ?? '');
        return $message !== '' ? $message : $fallback;
    }

    private function writeAudit(string $eventType, string $commandName, string $workOrderRef, string $actorId, array $payload): void
    {
        try {
            $this->db->execute(
                "INSERT INTO audit_events (event_type, aggregate_type, aggregate_id, actor_name, payload, metadata, recorded_at)
                 VALUES (:event_type, 'resource_readiness', :aggregate_id, :actor_name, CAST(:payload AS jsonb), CAST(:metadata AS jsonb), now())",
                [
                    ':event_type' => $eventType,
                    ':aggregate_id' => $workOrderRef,
                    ':actor_name' => $actorId,
                    ':payload' => $this->json($payload),
                    ':metadata' => $this->json(['command_name' => $commandName, 'authority' => 'DomainCommand.ResourceReadinessService']),
                ]
            );
        } catch (Throwable $e) {
            throw new DomainCommandException('resource_readiness_audit_unavailable', 'Resource readiness audit write failed.', 500, [], $e);
        }
    }

    /**
     * @param array<string,mixed> $payload
     * @param list<string> $keys
     */
    private function requiredAny(array $payload, array $keys, string $label): string
    {
        foreach ($keys as $key) {
            $value = $this->text($payload[$key] ?? '');
            if ($value !== '') {
                return $value;
            }
        }

        throw new DomainCommandException($label . '_required', $label . ' is required for resource readiness.', 400);
    }

    private function nullableText(mixed $value): ?string
    {
        $text = $this->text($value);
        return $text === '' ? null : $text;
    }

    private function text(mixed $value): string
    {
        return is_scalar($value) ? trim((string)$value) : '';
    }

    private function hash(mixed $value): string
    {
        return hash('sha256', $this->json($value));
    }

    private function json(mixed $value): string
    {
        try {
            return json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        } catch (Throwable $e) {
            throw new DomainCommandException('resource_readiness_json_failed', 'Resource readiness payload cannot be encoded.', 500, [], $e);
        }
    }
}
