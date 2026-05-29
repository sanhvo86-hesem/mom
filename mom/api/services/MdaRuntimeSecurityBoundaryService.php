<?php

declare(strict_types=1);

namespace MOM\Services;

use DateTimeImmutable;
use DateTimeZone;

/**
 * Side-effect-free security boundary evaluator for governed MDA commands.
 *
 * The service produces policy/evidence payloads for command handlers. It does
 * not approve, release, sign, mutate, or trust OT semantics by itself.
 */
final class MdaRuntimeSecurityBoundaryService
{
    private const GOVERNED_AI_DENY_ACTIONS = [
        'approve',
        'release',
        'sign',
        'post',
        'mutate',
        'transition',
        'hold_release',
        'dispatch',
        'complete',
    ];

    /** @return array<string, mixed> */
    public function authorityProbe(): array
    {
        return [
            'slice' => 'mda_runtime_security_boundary',
            'readiness_state' => 'service_gate_partial',
            'policy_authority' => 'mda_security_boundary_policy',
            'field_redaction_authority' => 'mda_field_redaction_policy',
            'sod_exception_authority' => 'mda_sod_exception_authority',
            'ai_firewall_authority' => 'mda_ai_action_firewall_event',
            'ot_signal_trust_authority' => 'mda_ot_signal_trust_policy',
            'decision_evidence_authority' => 'mda_security_boundary_decision',
            'runtime_mutation_allowed' => false,
        ];
    }

    /**
     * @param array<string, mixed> $subject
     * @param array<string, mixed> $resource
     * @param array<string, mixed> $permission
     * @return array<string, mixed>
     */
    public function evaluateBola(array $subject, array $resource, array $permission): array
    {
        if ((bool)($permission['granted'] ?? false) !== true) {
            return $this->decision(false, 'deny', 'authorization_denied_default', 'Permission is not granted.', [
                'decision_scope' => 'authorization',
                'actor_ref' => $this->actorRef($subject),
                'resource_kind' => $this->text($resource['kind'] ?? ''),
                'resource_ref' => $this->text($resource['resource_ref'] ?? $resource['id'] ?? ''),
            ]);
        }

        $scopeFields = ['org_company_code', 'org_legal_entity_code', 'org_plant_id', 'org_site_id', 'supplier_party_id', 'customer_party_id'];
        foreach ($scopeFields as $field) {
            $resourceValue = $this->text($resource[$field] ?? '');
            if ($resourceValue === '') {
                continue;
            }
            $allowed = $this->strings($subject[$field . '_scope'] ?? $subject[$field . '_scopes'] ?? []);
            if ($allowed === []) {
                return $this->decision(false, 'deny', 'bola_scope_missing_blocked', 'Subject has no explicit scope for the requested resource.', [
                    'decision_scope' => 'authorization',
                    'actor_ref' => $this->actorRef($subject),
                    'scope_field' => $field,
                    'resource_value' => $resourceValue,
                ]);
            }
            if (!in_array($resourceValue, $allowed, true)) {
                return $this->decision(false, 'deny', 'bola_scope_violation_blocked', 'Subject scope does not include the requested resource.', [
                    'decision_scope' => 'authorization',
                    'actor_ref' => $this->actorRef($subject),
                    'scope_field' => $field,
                    'resource_value' => $resourceValue,
                    'allowed_scope' => $allowed,
                ]);
            }
        }

        return $this->decision(true, 'allow', 'authorization_scope_ready', 'Permission and resource scope are ready.', [
            'decision_scope' => 'authorization',
            'actor_ref' => $this->actorRef($subject),
        ]);
    }

    /**
     * @param array<string, mixed> $actor
     * @param array<string, mixed> $request
     * @return array<string, mixed>
     */
    public function evaluateAiAction(array $actor, array $request): array
    {
        $actorType = strtolower($this->text($actor['actor_type'] ?? $actor['type'] ?? 'human'));
        $actionClass = strtolower($this->text($request['action_class'] ?? $request['class'] ?? 'read'));
        $commandName = $this->text($request['command_name'] ?? $request['command'] ?? '');
        $commandLower = strtolower($commandName);
        $governedVerbInCommand = preg_match('/(approve|release|sign|post|mutate|transition|dispatch|complete|hold)/', $commandLower) === 1;

        if ($actorType === 'ai' && (in_array($actionClass, self::GOVERNED_AI_DENY_ACTIONS, true) || $governedVerbInCommand)) {
            return $this->decision(false, 'refuse', 'ai_governed_action_refused', 'AI may propose but cannot execute governed actions.', [
                'decision_scope' => 'ai_firewall',
                'actor_ref' => $this->actorRef($actor),
                'requested_command' => $commandName,
                'requested_action_class' => $actionClass,
                'firewall_decision' => 'refused',
            ]);
        }

        if ($actorType === 'ai') {
            return $this->decision(true, 'allow', 'ai_read_or_proposal_allowed', 'AI read/proposal path is allowed with human review.', [
                'decision_scope' => 'ai_firewall',
                'actor_ref' => $this->actorRef($actor),
                'firewall_decision' => 'proposal_only',
            ]);
        }

        return $this->decision(true, 'allow', 'human_actor_not_ai_firewall_subject', 'Human actor is not blocked by AI firewall.', [
            'decision_scope' => 'ai_firewall',
            'actor_ref' => $this->actorRef($actor),
        ]);
    }

    /**
     * @param array<string, mixed> $command
     * @param array<string, mixed> $session
     * @return array<string, mixed>
     */
    public function evaluatePrivilegedReauth(array $command, array $session, ?DateTimeImmutable $at = null): array
    {
        $at ??= new DateTimeImmutable('now', new DateTimeZone('UTC'));
        if ((bool)($command['privileged'] ?? $command['requires_reauth'] ?? true) !== true) {
            return $this->decision(true, 'allow', 'reauth_not_required', 'Command does not require privileged re-auth.', [
                'decision_scope' => 'reauth',
            ]);
        }

        $challengeId = $this->text($session['reauth_challenge_id'] ?? $session['auth_challenge_id'] ?? '');
        $consumedAt = $this->text($session['reauth_consumed_at'] ?? $session['auth_challenge_consumed_at'] ?? '');
        $expiresAt = $this->text($session['reauth_expires_at'] ?? $session['auth_challenge_expires_at'] ?? '');
        if ($challengeId === '' || $consumedAt === '') {
            return $this->decision(false, 'stepup', 'privileged_reauth_required', 'Privileged command requires consumed re-auth challenge.', [
                'decision_scope' => 'reauth',
                'command_name' => $this->text($command['command_name'] ?? $command['command'] ?? ''),
            ]);
        }
        if ((bool)($session['challenge_replayed'] ?? false)) {
            return $this->decision(false, 'deny', 'privileged_reauth_replay_blocked', 'Replayed re-auth challenge is blocked.', [
                'decision_scope' => 'reauth',
                'reauth_challenge_id' => $challengeId,
            ]);
        }
        if ($expiresAt !== '' && $this->isExpired($expiresAt, $at)) {
            return $this->decision(false, 'stepup', 'privileged_reauth_expired', 'Privileged re-auth challenge is expired.', [
                'decision_scope' => 'reauth',
                'reauth_challenge_id' => $challengeId,
            ]);
        }

        return $this->decision(true, 'allow', 'privileged_reauth_ready', 'Privileged re-auth challenge is valid and consumed.', [
            'decision_scope' => 'reauth',
            'reauth_challenge_id' => $challengeId,
        ]);
    }

    /**
     * @param array<string, mixed> $command
     * @param array<string, mixed> $exception
     * @return array<string, mixed>
     */
    public function evaluateSodException(array $command, array $exception, ?DateTimeImmutable $at = null): array
    {
        $at ??= new DateTimeImmutable('now', new DateTimeZone('UTC'));
        $requester = $this->text($command['requester_ref'] ?? $command['creator_ref'] ?? '');
        $approver = $this->text($command['approver_ref'] ?? $command['signer_ref'] ?? '');
        if ($requester === '' || $approver === '' || !hash_equals(strtolower($requester), strtolower($approver))) {
            return $this->decision(true, 'allow', 'sod_separation_ready', 'Requester and approver are separated.', [
                'decision_scope' => 'sod',
            ]);
        }

        foreach (['exception_code', 'reason', 'approved_by', 'expires_at'] as $field) {
            if ($this->text($exception[$field] ?? '') === '') {
                return $this->decision(false, 'deny', 'sod_exception_required', 'Same-actor approval requires complete SoD exception evidence.', [
                    'decision_scope' => 'sod',
                    'missing_field' => $field,
                ]);
            }
        }
        if ($this->isExpired($this->text($exception['expires_at']), $at)) {
            return $this->decision(false, 'deny', 'sod_exception_expired', 'Expired SoD exception blocks approval.', [
                'decision_scope' => 'sod',
                'exception_code' => $this->text($exception['exception_code']),
            ]);
        }
        if (!in_array($this->text($exception['exception_state'] ?? 'approved'), ['approved', 'used'], true)) {
            return $this->decision(false, 'deny', 'sod_exception_not_approved', 'SoD exception is not approved.', [
                'decision_scope' => 'sod',
            ]);
        }

        return $this->decision(true, 'allow', 'sod_exception_ready', 'Approved SoD exception is active.', [
            'decision_scope' => 'sod',
            'exception_code' => $this->text($exception['exception_code']),
        ]);
    }

    /**
     * @param array<string, mixed> $adapter
     * @param array<string, mixed> $change
     * @return array<string, mixed>
     */
    public function evaluateOtSignalTrust(array $adapter, array $change): array
    {
        if ((bool)($adapter['approved'] ?? false) !== true || $this->text($adapter['adapter_code'] ?? '') === '') {
            return $this->decision(false, 'deny', 'ot_adapter_not_trusted', 'OT adapter is not approved.', [
                'decision_scope' => 'ot_trust',
                'adapter_code' => $this->text($adapter['adapter_code'] ?? ''),
            ]);
        }

        $approvedChecksum = strtolower($this->text($adapter['approved_checksum_sha256'] ?? ''));
        $proposedChecksum = strtolower($this->text($change['proposed_checksum_sha256'] ?? $change['checksum_sha256'] ?? ''));
        if (!$this->isSha256($approvedChecksum) || !$this->isSha256($proposedChecksum) || !hash_equals($approvedChecksum, $proposedChecksum)) {
            return $this->decision(false, 'deny', 'ot_signal_tag_map_not_approved', 'Unapproved signal tag map cannot change semantics.', [
                'decision_scope' => 'ot_trust',
                'adapter_code' => $this->text($adapter['adapter_code'] ?? ''),
                'signal_tag' => $this->text($change['signal_tag'] ?? ''),
            ]);
        }

        return $this->decision(true, 'allow', 'ot_signal_tag_map_trusted', 'OT signal tag semantic map is approved.', [
            'decision_scope' => 'ot_trust',
            'adapter_code' => $this->text($adapter['adapter_code'] ?? ''),
            'signal_tag' => $this->text($change['signal_tag'] ?? ''),
        ]);
    }

    /**
     * @param array<string, mixed> $subject
     * @param array<string, mixed> $record
     * @param array<int, array<string, mixed>> $policies
     * @return array<string, mixed>
     */
    public function redactFields(array $subject, array $record, array $policies): array
    {
        $roles = array_map('strtolower', $this->strings($subject['roles'] ?? []));
        $redacted = $record;
        $redactedFields = [];

        foreach ($policies as $policy) {
            if (!is_array($policy)) {
                continue;
            }
            $field = $this->text($policy['field_name'] ?? '');
            if ($field === '' || !array_key_exists($field, $redacted)) {
                continue;
            }
            $visibleRoles = array_map('strtolower', $this->strings($policy['visible_role_codes'] ?? []));
            if (array_intersect($roles, $visibleRoles) !== []) {
                continue;
            }
            $strategy = $this->text($policy['mask_strategy'] ?? 'mask');
            $redacted[$field] = $this->maskedValue($redacted[$field], $strategy);
            $redactedFields[] = $field;
        }

        $result = $this->decision(true, $redactedFields === [] ? 'allow' : 'redact', $redactedFields === [] ? 'field_redaction_not_required' : 'field_redaction_applied', 'Field redaction evaluated.', [
            'decision_scope' => 'field_redaction',
            'redacted_fields' => $redactedFields,
        ]);
        $result['record'] = $redacted;

        return $result;
    }

    /** @param array<string, mixed> $context @return array<string, mixed> */
    private function decision(bool $allowed, string $decision, string $reasonCode, string $message, array $context = []): array
    {
        $payload = [
            'allowed' => $allowed,
            'decision' => $decision,
            'status' => $allowed ? 'passed' : 'blocked',
            'reason_code' => $reasonCode,
            'message' => $message,
            'context' => $context,
        ];
        $payload['evidence_hash_sha256'] = $this->hashPayload($payload);

        return $payload;
    }

    /** @param mixed $value */
    private function text(mixed $value): string
    {
        return is_scalar($value) ? trim((string)$value) : '';
    }

    /** @param mixed $values @return list<string> */
    private function strings(mixed $values): array
    {
        if (is_string($values)) {
            $values = [$values];
        }
        if (!is_array($values)) {
            return [];
        }
        $out = [];
        foreach ($values as $value) {
            $text = $this->text($value);
            if ($text !== '') {
                $out[] = $text;
            }
        }

        return array_values(array_unique($out));
    }

    /** @param array<string, mixed> $actor */
    private function actorRef(array $actor): string
    {
        foreach (['actor_ref', 'user_id', 'username', 'id'] as $field) {
            $value = $this->text($actor[$field] ?? '');
            if ($value !== '') {
                return $value;
            }
        }

        return '';
    }

    private function isSha256(string $hash): bool
    {
        return preg_match('/^[a-f0-9]{64}$/', $hash) === 1;
    }

    private function isExpired(string $timestamp, DateTimeImmutable $at): bool
    {
        try {
            return new DateTimeImmutable($timestamp) <= $at;
        } catch (\Throwable) {
            return true;
        }
    }

    private function maskedValue(mixed $value, string $strategy): mixed
    {
        $text = $this->text($value);
        return match ($strategy) {
            'omit' => null,
            'hash' => hash('sha256', $text),
            'last4' => strlen($text) > 4 ? str_repeat('*', max(0, strlen($text) - 4)) . substr($text, -4) : '****',
            default => '***REDACTED***',
        };
    }

    /** @param array<string, mixed> $payload */
    private function hashPayload(array $payload): string
    {
        $payload = $this->sortRecursively($payload);

        return hash('sha256', json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
    }

    /** @param array<string, mixed> $value @return array<string, mixed> */
    private function sortRecursively(array $value): array
    {
        ksort($value);
        foreach ($value as $key => $item) {
            if (is_array($item)) {
                $value[$key] = $this->sortRecursively($item);
            }
        }

        return $value;
    }
}

if (!class_exists('MOM\\Api\\Services\\MdaRuntimeSecurityBoundaryService', false)) {
    class_alias(MdaRuntimeSecurityBoundaryService::class, 'MOM\\Api\\Services\\MdaRuntimeSecurityBoundaryService');
}
