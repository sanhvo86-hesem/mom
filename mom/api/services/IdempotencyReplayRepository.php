<?php
declare(strict_types=1);

namespace MOM\Api\Services;

/**
 * Persistence boundary for idempotency replay state.
 */
interface IdempotencyReplayRepository
{
    /**
     * @param array<string, mixed> $state
     * @param callable():array{status_code?:int, payload?:array<string, mixed>} $operation
     * @return array{status_code:int, payload:array<string, mixed>, replayed:bool, stored_at:string}
     */
    public function execute(
        array $state,
        string $idempotencyKey,
        string $fingerprintHash,
        int $retryWindowSeconds,
        callable $operation,
    ): array;
}
