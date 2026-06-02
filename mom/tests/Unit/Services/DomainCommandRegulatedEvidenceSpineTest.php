<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\DomainCommand\CommandRecordHasher;
use MOM\Api\Services\DomainCommand\CommandRegistry;
use MOM\Api\Services\DomainCommand\DomainCommandException;
use MOM\Api\Services\DomainCommand\DomainCommandGateway;
use MOM\Api\Services\DomainCommand\RegulatedCommandEvidenceSpine;
use MOM\Api\Services\DomainCommand\SignatureManifestationService;
use MOM\Database\Connection;
use PHPUnit\Framework\TestCase;
use RuntimeException;

final class DomainCommandRegulatedEvidenceSpineTest extends TestCase
{
    public function testReleaseItemRevisionRequiresSignatureMeaning(): void
    {
        $db = new DomainCommandRegulatedEvidenceFakeConnection();
        $gateway = new DomainCommandGateway($db, new CommandRegistry());

        try {
            $gateway->dispatch([
                'command_name' => 'ReleaseItemRevisionCommand',
                'idempotency_key' => 'idem-missing-meaning',
                'actor_id' => 'qa-1',
                'actor_permissions' => ['master_data.item_revision.release'],
                'reauth_evidence' => ['challenge_id' => 'reauth-signature-1'],
                'payload' => ['item_ref' => 'ITEM-1', 'revision_ref' => 'A'],
            ]);
            $this->fail('Expected missing signature evidence to block.');
        } catch (DomainCommandException $e) {
            $this->assertSame('signature_evidence_required', $e->problemCode);
            $this->assertTrue($db->hasAuditEvent('domain_command.regulated_blocked'));
        }
    }

    public function testExpiredSignatureChallengeBlocks(): void
    {
        $entry = (new CommandRegistry())->require('ReleaseItemRevisionCommand');
        $payload = $this->payload('idem-expired');
        $hash = (new CommandRecordHasher())->hash($entry, $payload);
        $db = new DomainCommandRegulatedEvidenceFakeConnection(
            challengeState: 'issued',
            challengeExpiresAt: gmdate('c', time() - 60),
            challengeHash: $hash
        );

        try {
            (new RegulatedCommandEvidenceSpine($db))->preflight($entry, [
                'actor_id' => 'qa-1',
                'signature_evidence' => $this->signatureEvidence($hash),
            ], $payload, 'qa-1');
            $this->fail('Expected expired challenge to block.');
        } catch (DomainCommandException $e) {
            $this->assertSame('signature_challenge_expired', $e->problemCode);
            $this->assertTrue($db->hasAuditEvent('domain_command.regulated_blocked'));
        }
    }

    public function testReplayedSignatureChallengeBlocks(): void
    {
        $entry = (new CommandRegistry())->require('ReleaseItemRevisionCommand');
        $payload = $this->payload('idem-replayed');
        $hash = (new CommandRecordHasher())->hash($entry, $payload);
        $db = new DomainCommandRegulatedEvidenceFakeConnection(
            challengeState: 'consumed',
            challengeExpiresAt: gmdate('c', time() + 300),
            challengeHash: $hash
        );

        try {
            (new RegulatedCommandEvidenceSpine($db))->preflight($entry, [
                'actor_id' => 'qa-1',
                'signature_evidence' => $this->signatureEvidence($hash),
            ], $payload, 'qa-1');
            $this->fail('Expected replayed challenge to block.');
        } catch (DomainCommandException $e) {
            $this->assertSame('signature_challenge_replayed', $e->problemCode);
            $this->assertTrue($db->hasAuditEvent('domain_command.regulated_blocked'));
        }
    }

    public function testDisplayedRecordHashMismatchBlocks(): void
    {
        $entry = (new CommandRegistry())->require('ReleaseItemRevisionCommand');
        $payload = $this->payload('idem-hash-mismatch');
        $hash = (new CommandRecordHasher())->hash($entry, $payload);
        $badHash = str_repeat('b', 64);
        $db = new DomainCommandRegulatedEvidenceFakeConnection(challengeHash: $hash);

        try {
            (new RegulatedCommandEvidenceSpine($db))->preflight($entry, [
                'actor_id' => 'qa-1',
                'signature_evidence' => $this->signatureEvidence($hash, displayedHash: $badHash),
            ], $payload, 'qa-1');
            $this->fail('Expected displayed hash mismatch to block.');
        } catch (DomainCommandException $e) {
            $this->assertSame('signature_displayed_record_hash_mismatch', $e->problemCode);
            $this->assertTrue($db->hasAuditEvent('domain_command.regulated_blocked'));
        }
    }

    public function testAuditUnavailableBlocksRegulatedCommand(): void
    {
        $db = new DomainCommandRegulatedEvidenceFakeConnection(auditUnavailable: true);
        $gateway = new DomainCommandGateway($db, new CommandRegistry());

        try {
            $gateway->dispatch([
                'command_name' => 'ReleaseItemRevisionCommand',
                'idempotency_key' => 'idem-audit-down',
                'actor_id' => 'qa-1',
                'actor_permissions' => ['master_data.item_revision.release'],
                'reauth_evidence' => ['challenge_id' => 'reauth-audit-1'],
                'payload' => ['item_ref' => 'ITEM-1', 'revision_ref' => 'A'],
            ]);
            $this->fail('Expected audit unavailable to block.');
        } catch (DomainCommandException $e) {
            $this->assertSame('regulated_audit_unavailable', $e->problemCode);
        }
    }

    public function testSuccessfulSignatureCreatesManifestationAndEvidenceLink(): void
    {
        $entry = (new CommandRegistry())->require('ReleaseItemRevisionCommand');
        $payload = $this->payload('idem-success');
        $hash = (new CommandRecordHasher())->hash($entry, $payload);
        $db = new DomainCommandRegulatedEvidenceFakeConnection(challengeHash: $hash);
        $spine = new RegulatedCommandEvidenceSpine($db);
        $envelope = [
            'actor_id' => 'qa-1',
            'idempotency_key' => 'idem-success',
            'signature_evidence' => $this->signatureEvidence($hash),
        ];

        $context = $spine->preflight($entry, $envelope, $payload, 'qa-1');
        $capture = $spine->recordBeforeMutation($entry, $payload, $context, 'qa-1', 'idem-success');
        $link = $spine->recordAfterMutation($entry, $envelope, $payload, $context, $capture, ['item_revision_id' => 'REV-1'], 'qa-1');
        $manifestations = (new SignatureManifestationService($db))->forRecord('item_revision', 'REV-1');

        $this->assertSame('link-1', $link['evidence_link_id']);
        $this->assertSame('sig-1', $capture['signature_event']['signature_event_id']);
        $this->assertSame('qa-1', $manifestations[0]['signer_ref']);
        $this->assertTrue($db->hasAuditEvent('domain_command.regulated_evidence_linked'));
    }

    /**
     * @return array<string,mixed>
     */
    private function payload(string $idempotencyKey): array
    {
        return [
            'item_ref' => 'ITEM-1',
            'revision_ref' => 'A',
            'actor_id' => 'qa-1',
            'idempotency_key' => $idempotencyKey,
        ];
    }

    /**
     * @return array<string,mixed>
     */
    private function signatureEvidence(string $hash, ?string $displayedHash = null): array
    {
        return [
            'signature_meaning' => 'item_revision_release',
            'auth_challenge_id' => 'challenge-1',
            'auth_method' => 'password_mfa',
            'auth_result_hash_sha256' => str_repeat('a', 64),
            'signer_ref' => 'qa-1',
            'signer_role' => 'quality_manager',
            'signer_identity_snapshot' => [
                'signer_ref' => 'qa-1',
                'display_name' => 'QA One',
                'source' => 'v_user_canonical',
            ],
            'signature_manifestation' => 'Signed by QA One for item revision release.',
            'signed_payload_hash_sha256' => $hash,
            'displayed_record_hash_sha256' => $displayedHash ?? $hash,
        ];
    }
}

final class DomainCommandRegulatedEvidenceFakeConnection extends Connection
{
    /**
     * @var list<array{sql:string,params:array<string,mixed>}>
     */
    public array $executed = [];

    public function __construct(
        private readonly string $challengeState = 'issued',
        private readonly ?string $challengeExpiresAt = null,
        private readonly ?string $challengeHash = null,
        private readonly bool $auditUnavailable = false,
    ) {}

    public function transactional(callable $callback): mixed
    {
        return $callback();
    }

    public function queryOne(string $sql, array $params = []): ?array
    {
        $this->executed[] = ['sql' => $sql, 'params' => $params];
        if (str_contains($sql, 'FROM e_signature_auth_challenges')) {
            return $this->challengeRow();
        }
        if (str_contains($sql, 'domain_command_reauth_challenge')) {
            return [
                'challenge_id' => (string)($params[':challenge_id'] ?? 'reauth-1'),
                'actor_id' => (string)($params[':actor_id'] ?? 'qa-1'),
                'command_name' => (string)($params[':command_name'] ?? 'ReleaseItemRevisionCommand'),
                'payload_hash_sha256' => '',
                'intent_hash_sha256' => '',
                'issued_at' => gmdate('c'),
                'expires_at' => gmdate('c', time() + 300),
                'consumed_at' => gmdate('c'),
                'result' => 'consumed',
            ];
        }
        if (str_contains($sql, 'UPDATE e_signature_auth_challenges')) {
            $expiresAt = $this->challengeExpiresAt ?? gmdate('c', time() + 300);
            if ($this->challengeState !== 'issued' || strtotime($expiresAt) <= time()) {
                return null;
            }
            return $this->challengeRow() + ['consumed_at' => gmdate('c')];
        }
        if (str_contains($sql, 'INSERT INTO signature_events')) {
            return [
                'signature_event_id' => 'sig-1',
                'signed_object_type' => (string)$params[':signed_object_type'],
                'signed_object_id' => 'REV-1',
                'signer_ref' => (string)$params[':signer_ref'],
                'signature_meaning' => (string)$params[':signature_meaning'],
                'displayed_record_hash_sha256' => (string)$params[':displayed_record_hash_sha256'],
            ];
        }
        if (str_contains($sql, 'INSERT INTO domain_command_evidence_links')) {
            return [
                'evidence_link_id' => 'link-1',
                'signature_event_id' => $params[':signature_event_id'],
                'command_record_hash_sha256' => $params[':command_record_hash_sha256'],
            ];
        }
        if (str_contains($sql, 'FROM engineering_release_package')) {
            return ['created_by' => 'originator-1'];
        }

        return null;
    }

    /**
     * @return list<array<string,mixed>>
     */
    public function query(string $sql, array $params = []): array
    {
        unset($sql, $params);
        return [[
            'signature_event_id' => 'sig-1',
            'record_type' => 'item_revision',
            'record_id' => 'REV-1',
            'signer_ref' => 'qa-1',
            'signature_meaning' => 'item_revision_release',
            'signed_at' => gmdate('c'),
            'signature_manifestation' => 'Signed by QA One for item revision release.',
            'evidence_link_id' => 'link-1',
            'command_name' => 'ReleaseItemRevisionCommand',
        ]];
    }

    public function execute(string $sql, array $params = []): int
    {
        if ($this->auditUnavailable && str_contains($sql, 'INSERT INTO audit_events')) {
            throw new RuntimeException('audit down');
        }
        $this->executed[] = ['sql' => $sql, 'params' => $params];
        return 1;
    }

    public function hasAuditEvent(string $eventType): bool
    {
        foreach ($this->executed as $entry) {
            if (str_contains($entry['sql'], 'INSERT INTO audit_events') && (($entry['params'][':event_type'] ?? null) === $eventType)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return array<string,mixed>
     */
    private function challengeRow(): array
    {
        return [
            'auth_challenge_id' => 'challenge-1',
            'signer_user_id' => null,
            'signer_ref' => 'qa-1',
            'signature_action' => 'item_revision_release',
            'signed_payload_hash_sha256' => $this->challengeHash ?? str_repeat('c', 64),
            'displayed_record_hash_sha256' => $this->challengeHash ?? str_repeat('c', 64),
            'challenge_state' => $this->challengeState,
            'expires_at' => $this->challengeExpiresAt ?? gmdate('c', time() + 300),
            'consumed_at' => $this->challengeState === 'consumed' ? gmdate('c', time() - 10) : null,
        ];
    }
}
