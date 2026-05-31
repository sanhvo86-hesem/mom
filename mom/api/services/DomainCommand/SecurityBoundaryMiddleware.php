<?php

declare(strict_types=1);

namespace MOM\Api\Services\DomainCommand;

use MOM\Database\Connection;
use Throwable;

final class SecurityBoundaryMiddleware
{
    public function __construct(
        private readonly Connection $db,
        private readonly ?AIActorFirewall $aiActorFirewall = null,
        private readonly ?ObjectAuthorizationPolicy $objectAuthorization = null,
        private readonly ?PropertyAuthorizationPolicy $propertyAuthorization = null,
        private readonly ?SoDPolicy $soDPolicy = null,
        private readonly ?PrivilegedReauthPolicy $privilegedReauthPolicy = null,
        private readonly ?OTTrustPolicy $otTrustPolicy = null,
    ) {}

    /**
     * @param array<string,mixed> $entry
     * @param array<string,mixed> $envelope
     * @param array<string,mixed> $payload
     */
    public function assertAllowed(array $entry, array $envelope, array $payload, string $actorId): void
    {
        $this->assertDecision(($this->aiActorFirewall ?? new AIActorFirewall())->evaluate($entry, $envelope, $payload), $entry, $envelope, $payload, $actorId);
        $this->assertDecision(($this->objectAuthorization ?? new ObjectAuthorizationPolicy())->evaluate($entry, $envelope, $payload), $entry, $envelope, $payload, $actorId);
        $this->assertDecision(($this->propertyAuthorization ?? new PropertyAuthorizationPolicy())->evaluate($entry, $envelope, $payload), $entry, $envelope, $payload, $actorId);

        $payloadWithOriginator = $this->withPersistedOriginator($entry, $payload);
        $this->assertDecision(($this->soDPolicy ?? new SoDPolicy())->evaluate($entry, $envelope, $payloadWithOriginator), $entry, $envelope, $payloadWithOriginator, $actorId);
        $this->assertDecision(($this->privilegedReauthPolicy ?? new PrivilegedReauthPolicy())->evaluate($entry, $envelope, $payload), $entry, $envelope, $payload, $actorId);
        $this->assertDecision(($this->otTrustPolicy ?? new OTTrustPolicy())->evaluate($entry, $envelope, $payload), $entry, $envelope, $payload, $actorId);
    }

    /**
     * @param array{allowed:bool,code:string,message:string,details:array<string,mixed>} $decision
     * @param array<string,mixed> $entry
     * @param array<string,mixed> $envelope
     * @param array<string,mixed> $payload
     */
    private function assertDecision(array $decision, array $entry, array $envelope, array $payload, string $actorId): void
    {
        if (($decision['allowed'] ?? false) === true) {
            return;
        }

        $this->recordSecurityDenial($decision, $entry, $envelope, $payload, $actorId);
        throw new DomainCommandException(
            $decision['code'],
            $decision['message'],
            $this->statusFor($decision['code']),
            $decision['details']
        );
    }

    /**
     * @param array<string,mixed> $entry
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    private function withPersistedOriginator(array $entry, array $payload): array
    {
        if (($entry['root'] ?? '') !== 'engineering_release_package') {
            return $payload;
        }
        if ($this->first($payload, ['created_by', 'originator_id', 'requested_by']) !== '') {
            return $payload;
        }

        $packageId = $this->first($payload, ['package_id']);
        if ($packageId === '') {
            return $payload;
        }

        try {
            $row = $this->db->queryOne(
                'SELECT created_by FROM engineering_release_package WHERE package_id = CAST(:package_id AS uuid)',
                [':package_id' => $packageId]
            );
        } catch (Throwable $e) {
            throw new DomainCommandException('sod_originator_lookup_failed', 'Unable to verify segregation-of-duties originator.', 500, [
                'command_name' => (string)($entry['command_name'] ?? ''),
            ], $e);
        }

        $originator = trim((string)($row['created_by'] ?? ''));
        if ($originator === '') {
            return $payload;
        }

        $payload['originator_id'] = $originator;
        $payload['sod_originator_source'] = 'engineering_release_package.created_by';

        return $payload;
    }

    /**
     * @param array{allowed:bool,code:string,message:string,details:array<string,mixed>} $decision
     * @param array<string,mixed> $entry
     * @param array<string,mixed> $envelope
     * @param array<string,mixed> $payload
     */
    private function recordSecurityDenial(array $decision, array $entry, array $envelope, array $payload, string $actorId): void
    {
        try {
            $this->db->execute(
                "INSERT INTO audit_events (event_type, aggregate_type, aggregate_id, actor_name, payload, metadata, recorded_at)
                 VALUES (:event_type, 'domain_command', :aggregate_id, :actor_name, CAST(:payload AS jsonb), CAST(:metadata AS jsonb), now())",
                [
                    ':event_type' => 'domain_command.security_denied',
                    ':aggregate_id' => (string)($entry['command_name'] ?? ''),
                    ':actor_name' => $actorId,
                    ':payload' => $this->json([
                        'command_name' => (string)($entry['command_name'] ?? ''),
                        'reason_code' => $decision['code'],
                        'reason_message' => $decision['message'],
                        'details' => $decision['details'],
                        'payload_keys' => array_values(array_keys($payload)),
                    ]),
                    ':metadata' => $this->json([
                        'source' => 'domain_command_security_boundary',
                        'actor_type' => (string)($envelope['actor_type'] ?? $envelope['actor_kind'] ?? 'human'),
                        'root' => (string)($entry['root'] ?? ''),
                    ]),
                ]
            );
        } catch (Throwable $e) {
            throw new DomainCommandException('security_denial_audit_failed', 'Security denial could not be written to audit_events.', 500, [
                'command_name' => (string)($entry['command_name'] ?? ''),
                'reason_code' => $decision['code'],
            ], $e);
        }
    }

    private function statusFor(string $code): int
    {
        return match ($code) {
            'object_scope_missing',
            'reauth_required',
            'ot_trust_required' => 409,
            default => 403,
        };
    }

    /**
     * @param array<string,mixed> $payload
     * @param list<string> $fields
     */
    private function first(array $payload, array $fields): string
    {
        foreach ($fields as $field) {
            $value = trim((string)($payload[$field] ?? ''));
            if ($value !== '') {
                return $value;
            }
        }

        return '';
    }

    private function json(mixed $value): string
    {
        try {
            return json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        } catch (Throwable $e) {
            throw new DomainCommandException('security_denial_json_failed', 'Security denial payload cannot be encoded.', 500, [], $e);
        }
    }
}
