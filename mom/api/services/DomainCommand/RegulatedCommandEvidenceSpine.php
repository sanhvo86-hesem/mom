<?php

declare(strict_types=1);

namespace MOM\Api\Services\DomainCommand;

use MOM\Database\Connection;

final class RegulatedCommandEvidenceSpine
{
    public function __construct(
        private readonly Connection $db,
        private readonly ?RegulatedActionPolicy $policy = null,
        private readonly ?ElectronicSignatureService $signatures = null,
        private readonly ?AuditEvidenceWriter $auditEvidence = null,
        private readonly ?CommandRecordHasher $hasher = null,
    ) {}

    /**
     * @param array<string,mixed> $entry
     * @param array<string,mixed> $envelope
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    public function preflight(array $entry, array $envelope, array $payload, string $actorId): array
    {
        $policyService = $this->policy ?? new RegulatedActionPolicy();
        $writer = $this->auditEvidence ?? new AuditEvidenceWriter($this->db);
        try {
            $policy = $policyService->requireForEntry($entry);
        } catch (DomainCommandException $e) {
            $writer->recordBlock($entry, $payload, $actorId, $e->problemCode, $e->details);
            throw $e;
        }

        if (($policy['regulated'] ?? false) !== true) {
            return ['required' => false, 'policy' => $policy];
        }

        $recordHash = ($this->hasher ?? new CommandRecordHasher())->hash($entry, $payload);
        $context = [
            'required' => true,
            'policy' => $policy,
            'record_hash_sha256' => $recordHash,
            'signature_required' => (bool)($policy['signature_required'] ?? false),
            'signature_evidence' => [],
        ];

        if (($policy['signature_required'] ?? false) === true) {
            try {
                $context['signature_evidence'] = ($this->signatures ?? new ElectronicSignatureService($this->db))
                    ->preflight($entry, $envelope, $payload, $policy, $recordHash, $actorId);
            } catch (DomainCommandException $e) {
                $writer->recordBlock($entry, $payload, $actorId, $e->problemCode, $e->details);
                throw $e;
            }
        }

        return $context;
    }

    /**
     * @param array<string,mixed> $entry
     * @param array<string,mixed> $payload
     * @param array<string,mixed> $context
     * @return array<string,mixed>
     */
    public function recordBeforeMutation(array $entry, array $payload, array $context, string $actorId, string $idempotencyKey): array
    {
        if (($context['required'] ?? false) !== true) {
            return [];
        }

        $policy = is_array($context['policy'] ?? null) ? (array)$context['policy'] : [];
        $recordHash = (string)($context['record_hash_sha256'] ?? '');
        ($this->auditEvidence ?? new AuditEvidenceWriter($this->db))->recordAttempt($entry, $payload, $policy, $actorId, $recordHash);

        $signature = [];
        if (($context['signature_required'] ?? false) === true) {
            $signature = ($this->signatures ?? new ElectronicSignatureService($this->db))->applySignature(
                $entry,
                $payload,
                $policy,
                is_array($context['signature_evidence'] ?? null) ? (array)$context['signature_evidence'] : [],
                $recordHash,
                $actorId,
                $idempotencyKey
            );
        }

        return ['signature_event' => $signature];
    }

    /**
     * @param array<string,mixed> $entry
     * @param array<string,mixed> $envelope
     * @param array<string,mixed> $payload
     * @param array<string,mixed> $context
     * @param array<string,mixed> $capture
     * @param array<string,mixed> $handlerResult
     * @return array<string,mixed>
     */
    public function recordAfterMutation(
        array $entry,
        array $envelope,
        array $payload,
        array $context,
        array $capture,
        array $handlerResult,
        string $actorId
    ): array {
        if (($context['required'] ?? false) !== true) {
            return [];
        }

        $policy = is_array($context['policy'] ?? null) ? (array)$context['policy'] : [];
        $recordHash = (string)($context['record_hash_sha256'] ?? '');
        $signatureEvent = is_array($capture['signature_event'] ?? null) ? (array)$capture['signature_event'] : [];

        return ($this->auditEvidence ?? new AuditEvidenceWriter($this->db))->recordEvidenceLink(
            $entry,
            $envelope,
            $payload,
            $policy,
            $signatureEvent,
            $handlerResult,
            $actorId,
            $recordHash
        );
    }
}
