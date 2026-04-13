<?php

declare(strict_types=1);

namespace MOM\Services\ControlPlane;

use MOM\Database\Connection;
use MOM\Database\DataLayer;
use MOM\Services\ChangeControl\ChangeAuthorityService;
use RuntimeException;

/**
 * Authoritative command admission service for governed eQMS/MOM mutations.
 *
 * Domain services still own business persistence. This service owns the shared
 * command boundary: guard validation, idempotent command ledger rows, and the
 * canonical outbox event that downstream command handlers consume.
 */
final class ControlPlaneCommandService
{
    private ?object $db;
    private ControlPlaneCommandGuard $guard;
    private CanonicalOutboxService $outbox;

    public function __construct(?object $db = null, ?ControlPlaneCommandGuard $guard = null, ?CanonicalOutboxService $outbox = null)
    {
        $this->db = $this->normalizeDb($db);
        $this->guard = $guard ?? new ControlPlaneCommandGuard();
        $this->outbox = $outbox ?? new CanonicalOutboxService($this->db);
    }

    /**
     * @param array<string, mixed> $envelope
     * @return array<string, mixed>
     */
    public function submit(array $envelope): array
    {
        $this->requireDb();

        $guardEnvelope = $this->withCanonicalAuthorityResolution($envelope);
        $decision = $this->guard->validateEnvelope($guardEnvelope);
        $commandName = $this->text($guardEnvelope['command_name'] ?? '');
        $idempotencyKey = $this->text($guardEnvelope['idempotency_key'] ?? '');
        $actorRef = $this->text($guardEnvelope['actor_ref'] ?? $guardEnvelope['actor_id'] ?? '');
        $scopeKey = $this->scopeKey($guardEnvelope);
        $requestHash = $this->hashJson($this->canonicalRequest($envelope));
        $authorityContext = array_merge(
            is_array($guardEnvelope['authority_context'] ?? null) ? $guardEnvelope['authority_context'] : [],
            ['guard_decision' => $decision->toArray()],
        );

        $row = $this->insertLedgerRow(
            $commandName,
            $idempotencyKey,
            $actorRef,
            $scopeKey,
            $requestHash,
            $guardEnvelope,
            $authorityContext,
            $decision,
        );

        if ($decision->allowed) {
            $this->outbox->enqueue(
                'eqms_command',
                (string)($row['eqms_command_id'] ?? $row['command_id'] ?? $commandName),
                'ControlPlaneCommandAccepted',
                [
                    'command_name' => $commandName,
                    'command_state' => 'accepted',
                    'scope_key' => $scopeKey,
                    'request_hash_sha256' => $requestHash,
                    'payload' => is_array($envelope['payload'] ?? null) ? $envelope['payload'] : [],
                ],
                [
                    'idempotency_key' => $idempotencyKey,
                    'correlation_id' => $this->text($guardEnvelope['correlation_id'] ?? ''),
                    'causation_id' => $this->text($guardEnvelope['causation_id'] ?? ''),
                    'handler_key' => $this->handlerKey($commandName, $guardEnvelope),
                    'payload_schema_version' => (string)($guardEnvelope['payload_schema_version'] ?? 'control_plane_command.v1'),
                    'dedupe_key' => hash('sha256', $commandName . '|' . $idempotencyKey),
                ],
            );
        }

        return [
            'accepted' => $decision->allowed,
            'decision' => $decision->toArray(),
            'command' => $this->normalizeRow($row),
        ];
    }

    /**
     * Resolve released change authority server-side and strip caller-forged
     * authority proof before the guard evaluates final/released mutations.
     *
     * @param array<string, mixed> $envelope
     * @return array<string, mixed>
     */
    private function withCanonicalAuthorityResolution(array $envelope): array
    {
        $clean = $envelope;
        foreach (['authority_source', 'authority_verified', 'authorized_fields', 'change_order_state'] as $field) {
            unset($clean[$field]);
        }

        $operation = strtolower($this->text($clean['operation'] ?? ''));
        if (!in_array($operation, ['update', 'amend', 'transition'], true)) {
            return $clean;
        }

        $state = strtolower($this->text($clean['lifecycle_state'] ?? $clean['record_state'] ?? ''));
        if (!in_array($state, ['approved', 'released', 'finalized', 'locked', 'published', 'retained', 'legal_hold', 'closed'], true)) {
            return $clean;
        }

        $fieldPath = $this->text($clean['field_path'] ?? '');
        $changeRef = $this->text($clean['change_order_id'] ?? $clean['change_order_ref'] ?? '');
        $scope = is_array($clean['scope'] ?? null) ? $clean['scope'] : [];
        $objectType = $this->text($scope['object_type'] ?? $clean['object_type'] ?? '');
        $objectId = $this->text($scope['object_id'] ?? $clean['object_id'] ?? '');
        if ($fieldPath === '' || $changeRef === '' || $objectType === '' || $objectId === '') {
            return $clean;
        }

        $payload = is_array($clean['payload'] ?? null) ? $clean['payload'] : [];
        $decision = (new ChangeAuthorityService($this->db))->assertFieldEditAllowed(
            $objectType,
            $objectId,
            $fieldPath,
            $payload['old_value'] ?? null,
            $payload['new_value'] ?? '__changed__',
            $state,
            [
                'change_order_id' => $changeRef,
                'change_order_ref' => $changeRef,
                'change_order_number' => $changeRef,
                'requested_effect' => (string)($clean['requested_effect'] ?? $operation),
                'effectivity' => is_array($clean['effectivity'] ?? null) ? $clean['effectivity'] : [],
            ],
        );

        $authorityContext = is_array($clean['authority_context'] ?? null) ? $clean['authority_context'] : [];
        if (!$decision->allowed) {
            $clean['authority_context'] = array_merge($authorityContext, [
                'resolved_by' => 'ChangeAuthorityService',
                'resolution_status' => 'denied',
                'resolution_error_code' => $decision->errorCode,
                'resolution_message' => $decision->message,
                'object_type' => $objectType,
                'object_id' => $objectId,
                'field_path' => $fieldPath,
            ]);
            return $clean;
        }

        $clean['change_order_state'] = 'released';
        $clean['authority_source'] = 'canonical_change_authority';
        $clean['authority_verified'] = true;
        $clean['authorized_fields'] = [$fieldPath];
        $clean['authority_context'] = array_merge($authorityContext, [
            'resolved_by' => 'ChangeAuthorityService',
            'resolution_status' => 'verified',
            'object_type' => $objectType,
            'object_id' => $objectId,
            'field_path' => $fieldPath,
            'change_order_ref' => $changeRef,
            'decision_data' => $decision->data,
        ]);

        return $clean;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function get(string $commandId): ?array
    {
        $this->requireDb();
        if (preg_match('/^[a-f0-9-]{36}$/i', $commandId) !== 1) {
            return null;
        }

        $row = $this->db->queryOne(
            'SELECT * FROM eqms_command_ledger WHERE eqms_command_id = CAST(:id AS uuid)',
            [':id' => $commandId],
        );

        return is_array($row) ? $this->normalizeRow($row) : null;
    }

    /**
     * @param array<string, mixed> $envelope
     * @param array<string, mixed> $authorityContext
     * @return array<string, mixed>
     */
    private function insertLedgerRow(
        string $commandName,
        string $idempotencyKey,
        string $actorRef,
        string $scopeKey,
        string $requestHash,
        array $envelope,
        array $authorityContext,
        ControlPlaneGuardDecision $decision,
    ): array {
        $state = $decision->allowed ? 'accepted' : 'rejected';
        $payloadJson = $this->json($authorityContext);

        $row = $this->db->queryOne(
            "INSERT INTO eqms_command_ledger
                (command_name, command_version, command_state, idempotency_key, actor_ref,
                 scope_key, scope_key_hash_sha256, request_hash_sha256, correlation_id,
                 causation_id, authority_context, error_code, error_message)
             VALUES
                (:command_name, :command_version, :command_state, :idempotency_key, :actor_ref,
                 :scope_key, :scope_key_hash_sha256, :request_hash_sha256, :correlation_id,
                 :causation_id, CAST(:authority_context AS jsonb), :error_code, :error_message)
             ON CONFLICT (command_name, idempotency_key) DO UPDATE
                SET command_state = eqms_command_ledger.command_state
             RETURNING *",
            [
                ':command_name' => $commandName,
                ':command_version' => max(1, (int)($envelope['command_version'] ?? 1)),
                ':command_state' => $state,
                ':idempotency_key' => $idempotencyKey,
                ':actor_ref' => $actorRef,
                ':scope_key' => $scopeKey,
                ':scope_key_hash_sha256' => hash('sha256', $scopeKey),
                ':request_hash_sha256' => $requestHash,
                ':correlation_id' => $this->nullableText($envelope['correlation_id'] ?? null),
                ':causation_id' => $this->nullableText($envelope['causation_id'] ?? null),
                ':authority_context' => $payloadJson,
                ':error_code' => $decision->allowed ? null : $decision->code,
                ':error_message' => $decision->allowed ? null : $decision->message,
            ],
        );

        if (!is_array($row)) {
            throw new RuntimeException('command_ledger_write_failed');
        }

        return $row;
    }

    private function requireDb(): void
    {
        if ($this->db === null || !method_exists($this->db, 'queryOne')) {
            throw new RuntimeException('authoritative_command_store_required');
        }
    }

    /**
     * @param array<string, mixed> $envelope
     */
    private function scopeKey(array $envelope): string
    {
        $scope = $envelope['scope'] ?? [];
        if (is_array($scope)) {
            $objectType = $this->text($scope['object_type'] ?? $envelope['object_type'] ?? 'unspecified');
            $objectId = $this->text($scope['object_id'] ?? $envelope['object_id'] ?? 'unspecified');
            return $objectType . ':' . $objectId;
        }
        $text = $this->text($scope);
        return $text !== '' ? $text : 'unspecified:unspecified';
    }

    /**
     * @param array<string, mixed> $envelope
     * @return array<string, mixed>
     */
    private function canonicalRequest(array $envelope): array
    {
        $copy = $envelope;
        unset($copy['headers']);
        ksort($copy);
        return $copy;
    }

    /**
     * @param array<string, mixed> $envelope
     */
    private function handlerKey(string $commandName, array $envelope): string
    {
        $explicit = $this->text($envelope['handler_key'] ?? '');
        if ($explicit !== '') {
            return $explicit;
        }
        return 'command.' . strtolower((string)preg_replace('/[^a-zA-Z0-9]+/', '_', $commandName));
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function normalizeRow(array $row): array
    {
        foreach (['authority_context'] as $key) {
            if (isset($row[$key]) && is_string($row[$key])) {
                $decoded = json_decode($row[$key], true);
                if (is_array($decoded)) {
                    $row[$key] = $decoded;
                }
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

    /**
     * @param array<string, mixed> $value
     */
    private function hashJson(array $value): string
    {
        return hash('sha256', $this->json($value));
    }

    /**
     * @param array<string, mixed> $value
     */
    private function json(array $value): string
    {
        return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
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
}
