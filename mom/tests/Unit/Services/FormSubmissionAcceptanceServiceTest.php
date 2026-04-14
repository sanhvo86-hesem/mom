<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Services\FormControl\FormSubmissionAcceptanceService;
use PHPUnit\Framework\TestCase;
use RuntimeException;

final class FormSubmissionAcceptanceServiceTest extends TestCase
{
    public function testRejectsInvalidAttemptState(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('submission_attempt_not_valid');

        (new FormSubmissionAcceptanceService(new FormAcceptanceFakeDb(attemptState: 'draft')))->accept($this->input(), 'qa-1');
    }

    public function testRejectsValidationThatHasNotPassed(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('submission_attempt_validation_not_passed');

        (new FormSubmissionAcceptanceService(new FormAcceptanceFakeDb(validationState: 'failed')))->accept($this->input(), 'qa-1');
    }

    public function testRejectsMissingAuthoritativeSignature(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('submission_acceptance_signature_not_authoritative');

        (new FormSubmissionAcceptanceService(new FormAcceptanceFakeDb(signaturePresent: false)))->accept($this->input(), 'qa-1');
    }

    public function testAcceptsValidatedAttemptWithChallengeBackedSignature(): void
    {
        $db = new FormAcceptanceFakeDb();

        $row = (new FormSubmissionAcceptanceService($db))->accept($this->input(), 'qa-1');

        $this->assertSame('accepted', $row['attempt_state']);
        $this->assertSame('qa-1', $row['accepted_by_ref']);
        $this->assertTrue($db->sawAcceptanceUpdate);
    }

    /**
     * @return array<string, mixed>
     */
    private function input(): array
    {
        return [
            'frm_submission_attempt_id' => '11111111-1111-4111-8111-111111111111',
            'signature_event_id' => '22222222-2222-4222-8222-222222222222',
            'reason' => 'QA acceptance after canonical validation.',
        ];
    }
}

final class FormAcceptanceFakeDb
{
    public bool $sawAcceptanceUpdate = false;

    public function __construct(
        private readonly string $attemptState = 'valid',
        private readonly string $validationState = 'passed',
        private readonly bool $signaturePresent = true,
    ) {
    }

    /**
     * @return array<string, mixed>|null
     */
    public function queryOne(string $sql, array $params = []): ?array
    {
        if (str_contains($sql, 'FROM frm_submission_attempts a')) {
            return [
                'frm_submission_attempt_id' => (string)$params[':attempt_id'],
                'attempt_state' => $this->attemptState,
                'validation_state' => $this->validationState,
                'canonical_payload_hash_sha256' => str_repeat('a', 64),
                'original_artifact_hash_sha256' => str_repeat('b', 64),
            ];
        }

        if (str_contains($sql, 'FROM signature_events')) {
            return $this->signaturePresent
                ? ['signature_event_id' => (string)$params[':signature_event_id']]
                : null;
        }

        if (str_starts_with(ltrim($sql), 'UPDATE frm_submission_attempts')) {
            $this->sawAcceptanceUpdate = true;
            return [
                'frm_submission_attempt_id' => (string)$params[':attempt_id'],
                'attempt_state' => 'accepted',
                'accepted_by_ref' => (string)$params[':actor_ref'],
                'acceptance_signature_event_id' => (string)$params[':signature_event_id'],
            ];
        }

        return null;
    }
}
