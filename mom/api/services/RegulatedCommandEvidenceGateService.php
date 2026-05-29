<?php

declare(strict_types=1);

namespace MOM\Services;

use DateTimeImmutable;
use DateTimeZone;
use MOM\Services\ControlPlane\WorkflowStatusAuthorityService;

/**
 * Runtime guard for regulated command approval/e-sign evidence.
 *
 * This service does not create signatures or approve commands. It evaluates the
 * evidence packet that a domain command must present before committing a
 * regulated release/approval/hold/merge transition.
 */
final class RegulatedCommandEvidenceGateService
{
    /** @return array<string, mixed> */
    public function authorityProbe(): array
    {
        return [
            'slice' => 'regulated_command_evidence_gate',
            'readiness_state' => 'service_gate_partial',
            'policy_authority' => 'regulated_command_policy',
            'policy_step_authority' => 'regulated_command_policy_step',
            'signature_link_authority' => 'regulated_command_signature_event_link',
            'challenge_authority' => 'e_signature_auth_challenges',
            'signature_event_authority' => 'signature_events',
            'status_parity_authority' => WorkflowStatusAuthorityService::class,
            'generic_crud_mutation_allowed' => false,
        ];
    }

    /**
     * @param array<string, mixed> $command
     * @param array<string, mixed> $signature
     * @param array<string, mixed> $policy
     * @param array<string, mixed> $auditProbe
     * @return array<string, mixed>
     */
    public function evaluateRegulatedCommand(
        array $command,
        array $signature,
        array $policy,
        array $auditProbe = [],
        ?DateTimeImmutable $at = null,
    ): array {
        $at ??= new DateTimeImmutable('now', new DateTimeZone('UTC'));
        if ((bool)($policy['regulated'] ?? true) !== true) {
            return $this->allowed('not_regulated', 'Command is not regulated by this gate.');
        }

        $policyResult = $this->evaluateApprovalPolicy($policy);
        if (($policyResult['allowed'] ?? false) !== true) {
            return $policyResult;
        }

        $expectedMeaning = $this->text($policy['required_signature_meaning'] ?? $command['required_signature_meaning'] ?? '');
        $meaning = $this->text($signature['signature_meaning'] ?? $signature['meaning'] ?? '');
        if ($meaning === '') {
            return $this->blocked('signature_meaning_required', 'Regulated signature requires an explicit meaning.');
        }
        if ($expectedMeaning !== '' && !hash_equals($expectedMeaning, $meaning)) {
            return $this->blocked('signature_meaning_mismatch', 'Signature meaning does not match command policy.', [
                'expected_signature_meaning' => $expectedMeaning,
                'actual_signature_meaning' => $meaning,
            ]);
        }

        $recordHash = strtolower($this->text(
            $signature['record_hash_sha256']
            ?? $signature['displayed_record_hash_sha256']
            ?? $signature['signed_payload_hash_sha256']
            ?? ''
        ));
        if (!$this->isSha256($recordHash)) {
            return $this->blocked('signature_record_hash_required', 'Regulated signature requires a valid signed record hash.');
        }

        $signer = $this->actorRef($signature, ['signer_user_id', 'signer_ref', 'signer_identifier', 'actor_ref']);
        if ($signer === '') {
            return $this->blocked('signature_signer_identity_required', 'Regulated signature requires signer identity.');
        }

        if ($this->text($signature['signed_at'] ?? $signature['timestamp'] ?? '') === '') {
            return $this->blocked('signature_timestamp_required', 'Regulated signature requires a signing timestamp.');
        }

        $creator = $this->actorRef($command, ['creator_user_id', 'created_by', 'requester_user_id', 'actor_user_id', 'actor_id', 'actor_ref']);
        if ($creator !== '' && hash_equals(strtolower($creator), strtolower($signer))) {
            $exception = is_array($policy['sod_exception'] ?? null) ? (array)$policy['sod_exception'] : [];
            if (!$this->validSodException($exception, $at)) {
                return $this->blocked('sod_creator_approver_same_actor', 'Creator/requester and approver/signer must be separated.', [
                    'creator_ref' => $creator,
                    'signer_ref' => $signer,
                ]);
            }
        }

        if ((bool)($policy['require_reauth_challenge'] ?? true)) {
            $challenge = $this->evaluateChallengeEvidence($signature);
            if (($challenge['allowed'] ?? false) !== true) {
                return $challenge;
            }
        }

        if ((bool)($policy['require_authoritative_audit'] ?? true)) {
            $audit = $this->evaluateAuditAuthority($auditProbe);
            if (($audit['allowed'] ?? false) !== true) {
                return $audit;
            }
        }

        return $this->allowed('regulated_command_evidence_ready', 'Regulated command evidence gate passed.', [
            'signature_meaning' => $meaning,
            'signer_ref' => $signer,
            'record_hash_sha256' => $recordHash,
        ]);
    }

    /**
     * @param array<string, mixed> $policy
     * @return array<string, mixed>
     */
    public function evaluateApprovalPolicy(array $policy): array
    {
        if ($this->text($policy['command_name'] ?? '') === '') {
            return $this->blocked('approval_policy_command_missing', 'Approval policy must name the governed command.');
        }
        if ($this->text($policy['required_signature_meaning'] ?? '') === '') {
            return $this->blocked('approval_policy_signature_meaning_missing', 'Approval policy must define required signature meaning.');
        }

        $steps = is_array($policy['approval_steps'] ?? null) ? (array)$policy['approval_steps'] : [];
        if ($steps === []) {
            return $this->blocked('approval_policy_step_missing', 'Approval policy requires at least one approval step.');
        }

        foreach ($steps as $idx => $step) {
            if (!is_array($step)) {
                return $this->blocked('approval_policy_step_invalid', 'Approval policy step must be structured.', ['step_index' => $idx]);
            }
            if ($this->text($step['step_code'] ?? '') === '' || $this->text($step['approver_role_code'] ?? '') === '') {
                return $this->blocked('approval_policy_step_incomplete', 'Approval step requires step_code and approver_role_code.', ['step_index' => $idx]);
            }
        }

        return $this->allowed('approval_policy_ready', 'Approval policy has command, signature meaning, and steps.');
    }

    /**
     * @return array<string, mixed>
     */
    public function evaluateStatusParity(array $soJoWoConfig, array $tableRegistry): array
    {
        $result = (new WorkflowStatusAuthorityService())->validate($soJoWoConfig, $tableRegistry);
        if (($result['valid'] ?? false) === true) {
            return $this->allowed('workflow_status_parity_ready', 'Workflow/status parity is clean.', [
                'canonical' => $result['canonical'] ?? [],
            ]);
        }

        return $this->blocked('workflow_status_parity_drift', 'Workflow/status parity drift blocks regulated runtime claim.', [
            'findings' => $result['findings'] ?? [],
        ]);
    }

    /** @param array<string, mixed> $signature */
    private function evaluateChallengeEvidence(array $signature): array
    {
        if ($this->text($signature['auth_challenge_id'] ?? '') === '') {
            return $this->blocked('signature_auth_challenge_required', 'Regulated signature requires a server-issued re-auth challenge.');
        }
        if ($this->text($signature['auth_challenge_consumed_at'] ?? $signature['consumed_at'] ?? '') === '') {
            return $this->blocked('signature_auth_challenge_not_consumed', 'Regulated signature challenge must be consumed exactly once.');
        }
        if ((bool)($signature['challenge_replayed'] ?? $signature['replay_detected'] ?? false)) {
            return $this->blocked('signature_challenge_replay_blocked', 'Replayed signature challenge is blocked.');
        }
        $usageCount = (int)($signature['challenge_usage_count'] ?? 1);
        if ($usageCount !== 1) {
            return $this->blocked('signature_challenge_replay_blocked', 'Signature challenge usage count must be exactly one.', [
                'challenge_usage_count' => $usageCount,
            ]);
        }

        return $this->allowed('signature_challenge_ready', 'Signature challenge evidence is one-time and consumed.');
    }

    /** @param array<string, mixed> $auditProbe */
    private function evaluateAuditAuthority(array $auditProbe): array
    {
        $available = (bool)($auditProbe['available'] ?? $auditProbe['authoritative'] ?? false);
        $backend = strtolower($this->text($auditProbe['source_backend'] ?? $auditProbe['backend'] ?? ''));
        if (!$available || !in_array($backend, ['postgres', 'postgres_primary', 'postgres_only'], true)) {
            return $this->blocked('authoritative_audit_store_required', 'Regulated command requires authoritative audit store availability.', [
                'audit_backend' => $backend !== '' ? $backend : 'unknown',
                'available' => $available,
            ]);
        }

        return $this->allowed('authoritative_audit_store_ready', 'Authoritative audit store is available.');
    }

    /** @param array<string, mixed> $exception */
    private function validSodException(array $exception, DateTimeImmutable $at): bool
    {
        if ((bool)($exception['approved'] ?? false) !== true) {
            return false;
        }
        foreach (['exception_id', 'reason', 'approved_by'] as $field) {
            if ($this->text($exception[$field] ?? '') === '') {
                return false;
            }
        }
        $expiresAt = $this->text($exception['expires_at'] ?? '');
        if ($expiresAt === '') {
            return false;
        }
        try {
            return new DateTimeImmutable($expiresAt) > $at;
        } catch (\Throwable) {
            return false;
        }
    }

    /**
     * @param array<string, mixed> $data
     * @param list<string> $fields
     */
    private function actorRef(array $data, array $fields): string
    {
        foreach ($fields as $field) {
            $value = $this->text($data[$field] ?? '');
            if ($value !== '') {
                return $value;
            }
        }
        return '';
    }

    private function text(mixed $value): string
    {
        return is_scalar($value) ? trim((string)$value) : '';
    }

    private function isSha256(string $hash): bool
    {
        return preg_match('/^[a-f0-9]{64}$/', $hash) === 1;
    }

    /** @return array<string, mixed> */
    private function allowed(string $reasonCode, string $message, array $context = []): array
    {
        return [
            'allowed' => true,
            'status' => 'passed',
            'reason_code' => $reasonCode,
            'message' => $message,
        ] + $context;
    }

    /** @return array<string, mixed> */
    private function blocked(string $reasonCode, string $message, array $context = []): array
    {
        return [
            'allowed' => false,
            'status' => 'blocked',
            'reason_code' => $reasonCode,
            'message' => $message,
        ] + $context;
    }
}

if (!class_exists('MOM\\Api\\Services\\RegulatedCommandEvidenceGateService', false)) {
    class_alias(RegulatedCommandEvidenceGateService::class, 'MOM\\Api\\Services\\RegulatedCommandEvidenceGateService');
}
