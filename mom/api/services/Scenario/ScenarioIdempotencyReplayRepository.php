<?php

declare(strict_types=1);

namespace MOM\Api\Services\Scenario;

use MOM\Api\Services\IdempotencyReplayRepository;
use MOM\Api\Services\RecordConflictException;

/**
 * In-memory idempotency ledger for isolated runtime scenarios.
 *
 * The scenario runner must execute the real DomainCommandGateway, but it must
 * not depend on a shared PostgreSQL ledger when running acceptance fixtures.
 */
final class ScenarioIdempotencyReplayRepository implements IdempotencyReplayRepository
{
    /**
     * @var array<string,array{fingerprint:string,status_code:int,payload:array<string,mixed>,stored_at:string}>
     */
    private array $ledger = [];

    public int $operationCount = 0;
    public int $replayCount = 0;

    /**
     * @param array<string,mixed> $state
     * @param callable():array{status_code?:int,payload?:array<string,mixed>} $operation
     * @return array{status_code:int,payload:array<string,mixed>,replayed:bool,stored_at:string}
     */
    public function execute(
        array $state,
        string $idempotencyKey,
        string $fingerprintHash,
        int $retryWindowSeconds,
        callable $operation,
    ): array {
        unset($retryWindowSeconds);
        $scope = (string)($state['scope_key_hash'] ?? $state['scope_key'] ?? 'scenario');
        $key = $scope . '|' . $idempotencyKey;

        if (isset($this->ledger[$key])) {
            $stored = $this->ledger[$key];
            if (!hash_equals($stored['fingerprint'], $fingerprintHash)) {
                throw new RecordConflictException('Scenario idempotency key was reused with a different fingerprint.');
            }
            $this->replayCount++;

            return [
                'status_code' => $stored['status_code'],
                'payload' => $stored['payload'],
                'replayed' => true,
                'stored_at' => $stored['stored_at'],
            ];
        }

        $this->operationCount++;
        $result = $operation();
        $payload = is_array($result['payload'] ?? null) ? (array)$result['payload'] : [];
        $statusCode = max(200, (int)($result['status_code'] ?? 200));
        $storedAt = gmdate(DATE_ATOM);
        $this->ledger[$key] = [
            'fingerprint' => $fingerprintHash,
            'status_code' => $statusCode,
            'payload' => $payload,
            'stored_at' => $storedAt,
        ];

        return [
            'status_code' => $statusCode,
            'payload' => $payload,
            'replayed' => false,
            'stored_at' => $storedAt,
        ];
    }
}
