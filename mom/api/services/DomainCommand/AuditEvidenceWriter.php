<?php

declare(strict_types=1);

namespace MOM\Api\Services\DomainCommand;

use MOM\Database\Connection;
use Throwable;

final class AuditEvidenceWriter
{
    public function __construct(
        private readonly Connection $db,
        private readonly ?CommandRecordHasher $hasher = null,
    ) {}

    /**
     * @param array<string,mixed> $entry
     * @param array<string,mixed> $payload
     * @param array<string,mixed> $details
     */
    public function recordBlock(array $entry, array $payload, string $actorId, string $reasonCode, array $details = []): void
    {
        $this->writeAudit('domain_command.regulated_blocked', $entry, $payload, $actorId, [
            'reason_code' => $reasonCode,
            'details' => $details,
        ]);
    }

    /**
     * @param array<string,mixed> $entry
     * @param array<string,mixed> $payload
     * @param array<string,mixed> $policy
     */
    public function recordAttempt(array $entry, array $payload, array $policy, string $actorId, string $recordHash): void
    {
        $this->writeAudit('domain_command.regulated_attempt', $entry, $payload, $actorId, [
            'record_hash_sha256' => $recordHash,
            'policy_hash_sha256' => (string)($policy['policy_hash_sha256'] ?? ''),
            'signature_required' => (bool)($policy['signature_required'] ?? false),
        ]);
    }

    /**
     * @param array<string,mixed> $entry
     * @param array<string,mixed> $envelope
     * @param array<string,mixed> $payload
     * @param array<string,mixed> $policy
     * @param array<string,mixed> $signatureEvent
     * @param array<string,mixed> $handlerResult
     * @return array<string,mixed>
     */
    public function recordEvidenceLink(
        array $entry,
        array $envelope,
        array $payload,
        array $policy,
        array $signatureEvent,
        array $handlerResult,
        string $actorId,
        string $recordHash
    ): array {
        $recordId = ($this->hasher ?? new CommandRecordHasher())->recordId($entry, $payload, $handlerResult);
        $signatureEventId = $this->nullableText($signatureEvent['signature_event_id'] ?? null);
        $idempotencyKey = $this->nullableText($envelope['idempotency_key'] ?? $payload['idempotency_key'] ?? null);
        $packageHash = $this->nullableHash(
            $handlerResult['package_manifest_hash_sha256']
            ?? $handlerResult['manifest_hash_sha256']
            ?? $payload['package_manifest_hash_sha256']
            ?? null
        );

        try {
            $row = $this->db->queryOne(
                "WITH inserted AS (
                    INSERT INTO domain_command_evidence_links
                        (command_name, command_id, root, record_type, record_id, actor_id, signature_event_id,
                         requirement_snapshot_hash_sha256, command_record_hash_sha256, displayed_record_hash_sha256,
                         package_hash_sha256, source_ip, device_id, session_id, idempotency_key, payload, metadata)
                    VALUES
                        (:command_name, :command_id, :root, :record_type, :record_id, :actor_id,
                         CAST(:signature_event_id AS uuid), :requirement_snapshot_hash_sha256,
                         :command_record_hash_sha256, :displayed_record_hash_sha256, :package_hash_sha256,
                         :source_ip, :device_id, :session_id, :idempotency_key,
                         CAST(:payload AS jsonb), CAST(:metadata AS jsonb))
                    ON CONFLICT (command_name, idempotency_key) DO NOTHING
                    RETURNING *
                 )
                 SELECT * FROM inserted
                 UNION ALL
                 SELECT * FROM domain_command_evidence_links
                  WHERE command_name = :command_name AND idempotency_key = :idempotency_key
                 LIMIT 1",
                [
                    ':command_name' => (string)($entry['command_name'] ?? ''),
                    ':command_id' => hash('sha256', (string)($entry['command_name'] ?? '') . '|' . (string)$idempotencyKey),
                    ':root' => (string)($entry['root'] ?? ''),
                    ':record_type' => (string)($entry['root'] ?? 'domain_command'),
                    ':record_id' => $recordId,
                    ':actor_id' => $actorId,
                    ':signature_event_id' => $signatureEventId,
                    ':requirement_snapshot_hash_sha256' => (string)($policy['policy_hash_sha256'] ?? ''),
                    ':command_record_hash_sha256' => $recordHash,
                    ':displayed_record_hash_sha256' => $this->nullableHash($signatureEvent['displayed_record_hash_sha256'] ?? null),
                    ':package_hash_sha256' => $packageHash,
                    ':source_ip' => $this->nullableText($envelope['source_ip'] ?? null),
                    ':device_id' => $this->nullableText($envelope['device_id'] ?? null),
                    ':session_id' => $this->nullableText($envelope['session_id'] ?? null),
                    ':idempotency_key' => $idempotencyKey,
                    ':payload' => $this->json([
                        'handler_result_keys' => array_values(array_keys($handlerResult)),
                        'record_hash_sha256' => $recordHash,
                    ]),
                    ':metadata' => $this->json([
                        'authority' => 'DomainCommand.AuditEvidenceWriter',
                        'policy_validation_status' => (string)($policy['validation_status'] ?? ''),
                    ]),
                ]
            );

            $this->writeAudit('domain_command.regulated_evidence_linked', $entry, $payload, $actorId, [
                'record_id' => $recordId,
                'signature_event_id' => $signatureEventId,
                'evidence_link_id' => is_array($row) ? (string)($row['evidence_link_id'] ?? '') : '',
            ]);
        } catch (Throwable $e) {
            throw new DomainCommandException('regulated_evidence_store_unavailable', 'Regulated evidence link store is unavailable.', 500, [], $e);
        }

        return is_array($row) ? $row : [];
    }

    /**
     * @param array<string,mixed> $entry
     * @param array<string,mixed> $payload
     * @param array<string,mixed> $metadata
     */
    private function writeAudit(string $eventType, array $entry, array $payload, string $actorId, array $metadata): void
    {
        try {
            $this->db->execute(
                "INSERT INTO audit_events (event_type, aggregate_type, aggregate_id, actor_name, payload, metadata, recorded_at)
                 VALUES (:event_type, :aggregate_type, :aggregate_id, :actor_name, CAST(:payload AS jsonb), CAST(:metadata AS jsonb), now())",
                [
                    ':event_type' => $eventType,
                    ':aggregate_type' => (string)($entry['root'] ?? 'domain_command'),
                    ':aggregate_id' => ($this->hasher ?? new CommandRecordHasher())->recordId($entry, $payload),
                    ':actor_name' => $actorId,
                    ':payload' => $this->json([
                        'command_name' => (string)($entry['command_name'] ?? ''),
                        'payload_keys' => array_values(array_keys($payload)),
                    ]),
                    ':metadata' => $this->json($metadata + ['authority' => 'DomainCommand.AuditEvidenceWriter']),
                ]
            );
        } catch (Throwable $e) {
            throw new DomainCommandException('regulated_audit_unavailable', 'Regulated audit trail is unavailable; command is blocked.', 500, [
                'event_type' => $eventType,
            ], $e);
        }
    }

    private function nullableHash(mixed $value): ?string
    {
        $text = strtolower($this->nullableText($value) ?? '');
        return preg_match('/^[a-f0-9]{64}$/', $text) === 1 ? $text : null;
    }

    private function nullableText(mixed $value): ?string
    {
        $text = is_scalar($value) ? trim((string)$value) : '';
        return $text === '' ? null : $text;
    }

    private function json(mixed $value): string
    {
        try {
            return json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        } catch (Throwable $e) {
            throw new DomainCommandException('regulated_audit_json_failed', 'Regulated audit payload cannot be encoded.', 500, [], $e);
        }
    }
}
