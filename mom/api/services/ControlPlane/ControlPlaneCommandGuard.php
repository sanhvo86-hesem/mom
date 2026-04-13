<?php

declare(strict_types=1);

namespace MOM\Services\ControlPlane;

final class ControlPlaneGuardDecision
{
    /**
     * @param array<string, mixed> $data
     */
    public function __construct(
        public readonly bool $allowed,
        public readonly string $code,
        public readonly string $message,
        public readonly array $data = [],
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'allowed' => $this->allowed,
            'code' => $this->code,
            'message' => $this->message,
            'data' => $this->data,
        ];
    }
}

/**
 * Shared fail-closed guard for process APIs.
 *
 * It does not replace domain services. It provides a common command-envelope
 * check so every wave speaks the same language: idempotency, actor, portal-first,
 * immutable final records, and SharePoint publication-only.
 */
final class ControlPlaneCommandGuard
{
    private const FINAL_STATES = [
        'approved',
        'released',
        'finalized',
        'locked',
        'published',
        'retained',
        'legal_hold',
        'closed',
    ];

    private const GOVERNED_OPERATION_TYPES = [
        'create',
        'update',
        'delete',
        'transition',
        'finalize',
        'amend',
        'publish',
        'release',
    ];

    /**
     * @param array<string, mixed> $envelope
     */
    public function validateEnvelope(array $envelope): ControlPlaneGuardDecision
    {
        $commandName = $this->text($envelope['command_name'] ?? '');
        if ($commandName === '') {
            return $this->deny('command_name_required', 'Command name is required.');
        }

        $idempotencyKey = $this->text($envelope['idempotency_key'] ?? $envelope['headers']['Idempotency-Key'] ?? '');
        if ($idempotencyKey === '') {
            return $this->deny('idempotency_key_required', 'Every governed mutation requires an Idempotency-Key.');
        }

        $actor = $this->text($envelope['actor_id'] ?? $envelope['actor_ref'] ?? '');
        if ($actor === '') {
            return $this->deny('actor_required', 'Every governed mutation requires an authenticated actor.');
        }

        $operation = strtolower($this->text($envelope['operation'] ?? ''));
        if ($operation !== '' && !in_array($operation, self::GOVERNED_OPERATION_TYPES, true)) {
            return $this->deny('unsupported_operation', 'Unsupported governed operation.', [
                'operation' => $operation,
            ]);
        }

        if ($this->bool($envelope['generic_crud'] ?? false) && $this->bool($envelope['governed_object'] ?? true)) {
            return $this->deny('domain_command_required', 'Governed records must be changed through process commands, not generic CRUD.');
        }

        $publication = is_array($envelope['publication'] ?? null) ? $envelope['publication'] : [];
        $publicationDecision = $this->validatePublicationBoundary($publication);
        if (!$publicationDecision->allowed) {
            return $publicationDecision;
        }

        $recordDecision = $this->validateRecordMutation($envelope);
        if (!$recordDecision->allowed) {
            return $recordDecision;
        }

        return new ControlPlaneGuardDecision(true, 'allowed', 'Command envelope accepted.', [
            'command_name' => $commandName,
            'idempotency_key' => $idempotencyKey,
            'actor' => $actor,
        ]);
    }

    /**
     * @param array<string, mixed> $publication
     */
    public function validatePublicationBoundary(array $publication): ControlPlaneGuardDecision
    {
        if ($publication === []) {
            return new ControlPlaneGuardDecision(true, 'allowed', 'No publication target declared.');
        }

        $targetType = strtolower($this->text($publication['target_type'] ?? ''));
        if ($targetType !== '' && $targetType !== 'sharepoint_graph') {
            return new ControlPlaneGuardDecision(true, 'allowed', 'Non-SharePoint publication target declared.');
        }

        $authorityRole = strtolower($this->text($publication['authority_role'] ?? 'read_only_replica'));
        if ($authorityRole !== 'read_only_replica') {
            return $this->deny('sharepoint_not_authority', 'SharePoint publication must be a read-only replica.', [
                'authority_role' => $authorityRole,
            ]);
        }

        if ($this->bool($publication['direct_user_upload'] ?? false)) {
            return $this->deny('sharepoint_direct_upload_forbidden', 'End users must never upload controlled evidence directly to SharePoint.');
        }

        if ($this->bool($publication['acceptance_path'] ?? false)) {
            return $this->deny('publication_not_acceptance_path', 'Publication cannot be the evidence acceptance or finalization path.');
        }

        return new ControlPlaneGuardDecision(true, 'allowed', 'Publication boundary accepted.');
    }

    /**
     * @param array<string, mixed> $context
     */
    public function validateRecordMutation(array $context): ControlPlaneGuardDecision
    {
        $operation = strtolower($this->text($context['operation'] ?? ''));
        if (!in_array($operation, ['update', 'delete', 'amend', 'transition'], true)) {
            return new ControlPlaneGuardDecision(true, 'allowed', 'No final-record mutation requested.');
        }

        $state = strtolower($this->text($context['lifecycle_state'] ?? $context['record_state'] ?? ''));
        if (!in_array($state, self::FINAL_STATES, true)) {
            return new ControlPlaneGuardDecision(true, 'allowed', 'Record is not in an immutable state.');
        }

        if ($operation === 'amend') {
            return $this->releasedChangeAuthorityRequired($context, 'amendment');
        }

        if ($operation === 'delete') {
            return $this->deny('retention_locked', 'Final controlled records cannot be deleted; void or supersede through released change authority.');
        }

        return $this->releasedChangeAuthorityRequired($context, 'post_release_edit');
    }

    /**
     * @param array<string, mixed> $context
     */
    private function releasedChangeAuthorityRequired(array $context, string $effect): ControlPlaneGuardDecision
    {
        $changeRef = $this->text($context['change_order_id'] ?? $context['change_order_ref'] ?? '');
        $changeState = strtolower($this->text($context['change_order_state'] ?? ''));
        if ($changeRef === '' || $changeState !== 'released') {
            return $this->deny('change_authority_required', 'Final or released object mutation requires a released change order.', [
                'required_authority' => 'released_change_order',
                'required_effect' => $effect,
                'change_order_ref' => $changeRef,
                'change_order_state' => $changeState,
            ]);
        }

        $fieldPath = $this->text($context['field_path'] ?? '');
        $authorizedFields = $this->stringList($context['authorized_fields'] ?? []);
        if ($fieldPath !== '' && $authorizedFields !== [] && !in_array('*', $authorizedFields, true) && !in_array($fieldPath, $authorizedFields, true)) {
            return $this->deny('change_effect_not_authorized', 'Released change order does not authorize the requested field.', [
                'field_path' => $fieldPath,
                'authorized_fields' => $authorizedFields,
            ]);
        }

        return new ControlPlaneGuardDecision(true, 'allowed', 'Released change authority accepted.', [
            'change_order_ref' => $changeRef,
            'effect' => $effect,
        ]);
    }

    /**
     * @param array<string, mixed> $data
     */
    private function deny(string $code, string $message, array $data = []): ControlPlaneGuardDecision
    {
        return new ControlPlaneGuardDecision(false, $code, $message, $data);
    }

    private function text(mixed $value): string
    {
        return is_scalar($value) ? trim((string)$value) : '';
    }

    private function bool(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }
        if (is_int($value)) {
            return $value === 1;
        }
        if (is_string($value)) {
            return in_array(strtolower(trim($value)), ['1', 'true', 'yes', 'y'], true);
        }
        return false;
    }

    /**
     * @return list<string>
     */
    private function stringList(mixed $value): array
    {
        if (!is_array($value)) {
            return [];
        }
        $out = [];
        foreach ($value as $item) {
            if (!is_scalar($item)) {
                continue;
            }
            $text = trim((string)$item);
            if ($text !== '') {
                $out[] = $text;
            }
        }
        return array_values(array_unique($out));
    }
}
