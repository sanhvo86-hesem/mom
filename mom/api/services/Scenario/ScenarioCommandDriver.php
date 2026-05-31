<?php

declare(strict_types=1);

namespace MOM\Api\Services\Scenario;

use MOM\Api\Services\DomainCommand\CommandRecordHasher;
use MOM\Api\Services\DomainCommand\CommandRegistry;
use MOM\Api\Services\DomainCommand\DomainCommandException;
use MOM\Api\Services\DomainCommand\DomainCommandGateway;
use MOM\Database\Connection;
use Throwable;

final class ScenarioCommandDriver
{
    public function __construct(
        private readonly ?CommandRegistry $registry = null,
        private readonly ?CommandRecordHasher $hasher = null,
    ) {}

    /**
     * @param array<string,mixed> $scenario
     * @return array<string,mixed>
     */
    public function run(array $scenario, Connection $db): array
    {
        $envelope = is_array($scenario['command_envelope'] ?? null) ? (array)$scenario['command_envelope'] : [];
        $repeat = max(1, (int)($scenario['repeat'] ?? 1));
        $idempotency = new ScenarioIdempotencyReplayRepository();
        $gateway = new DomainCommandGateway($db, $this->registry ?? new CommandRegistry(), $idempotency);
        $results = [];

        for ($i = 0; $i < $repeat; $i++) {
            $prepared = $this->prepareEnvelope($scenario, $envelope, $db);
            try {
                $result = $gateway->dispatch($prepared);
                $results[] = [
                    'accepted' => true,
                    'result' => $result,
                    'problem' => null,
                ];
            } catch (DomainCommandException $e) {
                $results[] = [
                    'accepted' => false,
                    'result' => null,
                    'problem' => $this->problemDetails($e, $prepared),
                ];
            } catch (Throwable $e) {
                $results[] = [
                    'accepted' => false,
                    'result' => null,
                    'problem' => [
                        'code' => 'scenario_unexpected_exception',
                        'status' => 500,
                        'title' => 'Scenario unexpected exception.',
                        'detail' => $e->getMessage(),
                    ],
                ];
            }
        }

        $last = $results[array_key_last($results)] ?? ['accepted' => false, 'problem' => ['code' => 'scenario_not_executed']];

        return [
            'accepted' => (bool)($last['accepted'] ?? false),
            'result' => $last['result'] ?? null,
            'problem' => $last['problem'] ?? null,
            'attempts' => $results,
            'idempotency' => [
                'operation_count' => $idempotency->operationCount,
                'replay_count' => $idempotency->replayCount,
            ],
            'gateway_mode' => 'direct_domain_command_gateway',
        ];
    }

    /**
     * @param array<string,mixed> $scenario
     * @param array<string,mixed> $envelope
     * @return array<string,mixed>
     */
    private function prepareEnvelope(array $scenario, array $envelope, Connection $db): array
    {
        $prepared = $this->replaceAutoNow($envelope);
        $commandName = trim((string)($prepared['command_name'] ?? $prepared['command'] ?? ''));
        $actorId = trim((string)($prepared['actor_id'] ?? $prepared['actor_ref'] ?? 'scenario-actor'));
        $idempotencyKey = trim((string)($prepared['idempotency_key'] ?? 'scenario-' . ($scenario['scenario_id'] ?? hash('sha256', serialize($scenario)))));
        $prepared['actor_id'] = $actorId;
        $prepared['idempotency_key'] = $idempotencyKey;
        $payload = is_array($prepared['payload'] ?? null) ? (array)$prepared['payload'] : [];
        $payload['actor_id'] = $payload['actor_id'] ?? $actorId;
        $payload['idempotency_key'] = $payload['idempotency_key'] ?? $idempotencyKey;
        $prepared['payload'] = $payload;

        if ($commandName !== '' && !isset($prepared['signature_evidence']) && !isset($prepared['signature']) && isset($scenario['signature_meaning'])) {
            $entry = ($this->registry ?? new CommandRegistry())->require($commandName);
            $hash = ($this->hasher ?? new CommandRecordHasher())->hash($entry, $payload);
            $meaning = (string)$scenario['signature_meaning'];
            if ($db instanceof ScenarioSandboxConnection) {
                $db->expectSignature($hash, $actorId, $meaning);
            }
            $prepared['signature_evidence'] = $this->signatureEvidence($hash, $actorId, $meaning);
        }

        return $prepared;
    }

    /**
     * @param array<string,mixed> $input
     * @return array<string,mixed>
     */
    private function replaceAutoNow(array $input): array
    {
        foreach ($input as $key => $value) {
            if ($value === 'AUTO_NOW') {
                $input[$key] = gmdate(DATE_ATOM);
                continue;
            }
            if (is_array($value)) {
                $input[$key] = $this->replaceAutoNow($value);
            }
        }

        return $input;
    }

    /**
     * @return array<string,mixed>
     */
    private function signatureEvidence(string $hash, string $actorId, string $meaning): array
    {
        return [
            'signature_meaning' => $meaning,
            'auth_challenge_id' => 'challenge-p58',
            'auth_method' => 'password_mfa',
            'auth_result_hash_sha256' => str_repeat('a', 64),
            'signer_ref' => $actorId,
            'signer_role' => 'scenario_signer',
            'signer_identity_snapshot' => [
                'signer_ref' => $actorId,
                'display_name' => 'P58 Scenario Signer',
                'source' => 'scenario_fixture',
            ],
            'signature_manifestation' => 'Signed by P58 Scenario Signer for ' . $meaning . '.',
            'signed_payload_hash_sha256' => $hash,
            'displayed_record_hash_sha256' => $hash,
        ];
    }

    /**
     * @param array<string,mixed> $envelope
     * @return array<string,mixed>
     */
    private function problemDetails(DomainCommandException $e, array $envelope): array
    {
        return [
            'type' => 'https://hesem.local/problems/domain-command/' . $e->problemCode,
            'title' => $e->getMessage(),
            'status' => $e->httpStatus,
            'code' => $e->problemCode,
            'detail' => $e->getMessage(),
            'command_name' => (string)($envelope['command_name'] ?? $envelope['command'] ?? ''),
            'details' => $e->details,
        ];
    }
}
