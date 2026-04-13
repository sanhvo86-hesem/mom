<?php

declare(strict_types=1);

namespace MOM\Services\Publication;

/**
 * Publication state machine helper for asynchronous read-only distribution.
 */
final class PublicationStateService
{
    private const STATES = ['pending', 'queued', 'publishing', 'published', 'failed', 'retry_scheduled', 'dead_letter', 'withdrawn', 'superseded'];

    /**
     * @var array<string, list<string>>
     */
    private const TRANSITIONS = [
        'pending' => ['queued'],
        'queued' => ['publishing'],
        'publishing' => ['published', 'failed'],
        'failed' => ['retry_scheduled', 'dead_letter'],
        'retry_scheduled' => ['queued', 'dead_letter'],
        'published' => ['withdrawn', 'superseded'],
        'dead_letter' => ['retry_scheduled'],
        'withdrawn' => [],
        'superseded' => [],
    ];

    /**
     * @param array<string, mixed> $publication
     * @return array<string, mixed>
     */
    public function validatePublicationRecord(array $publication): array
    {
        $errors = [];
        $state = strtolower($this->text($publication['publication_state'] ?? $publication['state'] ?? 'pending'));
        if (!in_array($state, self::STATES, true)) {
            $errors[] = $this->error('invalid_publication_state', 'Publication state is not recognized.');
        }

        $authorityRole = strtolower($this->text($publication['authority_role'] ?? 'read_only_replica'));
        if ($authorityRole !== 'read_only_replica') {
            $errors[] = $this->error('sharepoint_not_authority', 'Publication target must be a read-only replica.');
        }
        if ($this->bool($publication['direct_user_upload'] ?? false)) {
            $errors[] = $this->error('sharepoint_direct_upload_forbidden', 'Direct user upload to publication target is forbidden.');
        }

        if ($state === 'published') {
            foreach (['publication_receipt', 'target_uri', 'target_hash_sha256'] as $required) {
                $value = $publication[$required] ?? null;
                if ($required === 'publication_receipt') {
                    if (!is_array($value) || $value === []) {
                        $errors[] = $this->error('publication_receipt_required', 'Published state requires a publication receipt.');
                    }
                    continue;
                }
                if ($this->text($value) === '') {
                    $errors[] = $this->error($required . '_required', 'Published state requires ' . $required . '.');
                }
            }
        }

        if (in_array($state, ['failed', 'retry_scheduled', 'dead_letter'], true) && $this->text($publication['last_error_code'] ?? '') === '') {
            $errors[] = $this->error('publication_failure_code_required', 'Failed publication states require last_error_code.');
        }

        return [
            'valid' => $errors === [],
            'errors' => $errors,
            'state' => $state,
            'available_transitions' => self::TRANSITIONS[$state] ?? [],
        ];
    }

    /**
     * @param array<string, mixed> $publication
     * @return array<string, mixed>
     */
    public function transition(array $publication, string $targetState, array $context = []): array
    {
        $from = strtolower($this->text($publication['publication_state'] ?? $publication['state'] ?? 'pending'));
        $to = strtolower(trim($targetState));
        $allowed = self::TRANSITIONS[$from] ?? [];
        if (!in_array($to, $allowed, true)) {
            return [
                'allowed' => false,
                'error_code' => 'publication_transition_not_allowed',
                'from' => $from,
                'to' => $to,
                'allowed_transitions' => $allowed,
            ];
        }

        if (in_array($to, ['withdrawn', 'superseded'], true)) {
            $changeState = strtolower($this->text($context['change_order_state'] ?? ''));
            if ($changeState !== 'released') {
                return [
                    'allowed' => false,
                    'error_code' => 'change_authority_required',
                    'message' => 'Publication withdrawal/supersession requires a released change order.',
                    'from' => $from,
                    'to' => $to,
                ];
            }
        }

        return [
            'allowed' => true,
            'from' => $from,
            'to' => $to,
            'side_effects' => $this->sideEffects($to),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function retryPlan(int $attemptCount, int $maxAttempts = 5): array
    {
        $attempt = max(0, $attemptCount);
        $max = max(1, $maxAttempts);
        if ($attempt >= $max) {
            return [
                'next_state' => 'dead_letter',
                'retry_allowed' => false,
                'delay_seconds' => null,
                'error_code' => 'publication_max_attempts_exhausted',
            ];
        }

        $delay = min(3600, 60 * (2 ** min(5, $attempt)));
        return [
            'next_state' => 'retry_scheduled',
            'retry_allowed' => true,
            'delay_seconds' => $delay,
            'attempt_no' => $attempt + 1,
        ];
    }

    /**
     * @return list<string>
     */
    private function sideEffects(string $state): array
    {
        return match ($state) {
            'queued' => ['enqueue_publication_job'],
            'publishing' => ['claim_publication_job'],
            'published' => ['write_publication_receipt', 'verify_target_hash'],
            'failed' => ['write_failure_record'],
            'retry_scheduled' => ['schedule_publication_retry'],
            'dead_letter' => ['open_integrity_exception'],
            'withdrawn' => ['publish_withdrawal_notice'],
            'superseded' => ['publish_supersession_notice'],
            default => [],
        };
    }

    /**
     * @return array{error_code: string, message: string}
     */
    private function error(string $code, string $message): array
    {
        return ['error_code' => $code, 'message' => $message];
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
}
