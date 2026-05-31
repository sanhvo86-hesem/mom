<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Api\Services\DomainCommand\DomainCommandGateway;
use MOM\Api\Services\DomainCommand\ProblemDetailsFactory;
use MOM\Api\Services\DomainCommand\CommandRegistry;
use MOM\Api\Services\DomainCommand\SignatureChallengeService;
use MOM\Api\Services\DomainCommand\SignatureManifestationService;
use MOM\Database\Connection;
use Throwable;

final class DomainCommandController extends BaseController
{
    public function submit(): never
    {
        $user = $this->requireAuth();
        $body = $this->jsonBody();
        $body['actor_id'] = (string)($body['actor_id'] ?? $user['user_id'] ?? $user['username'] ?? 'authenticated_user');
        $body['actor_roles'] = $this->actorRoles($user, $body);
        $body['idempotency_key'] = (string)($body['idempotency_key'] ?? $this->requestHeader('Idempotency-Key') ?? '');

        try {
            $result = (new DomainCommandGateway(Connection::getInstance()))->dispatch($body);
            $this->success(['domain_command' => $result], !empty($result['replayed']) ? 200 : 202);
        } catch (Throwable $e) {
            $problem = (new ProblemDetailsFactory())->fromThrowable(
                $e,
                (string)($body['correlation_id'] ?? $body['trace_id'] ?? '')
            );
            $this->error((string)$problem['code'], (int)$problem['status'], (string)$problem['detail'], [
                'problem' => $problem,
            ]);
        }
    }

    public function registry(): never
    {
        $this->requireAuth();
        $this->success([
            'registry' => (new CommandRegistry())->all(),
        ]);
    }

    public function issueSignatureChallenge(): never
    {
        $user = $this->requireAuth();
        $body = $this->jsonBody();
        $body['actor_id'] = (string)($body['actor_id'] ?? $user['user_id'] ?? $user['username'] ?? 'authenticated_user');
        $body['idempotency_key'] = (string)($body['idempotency_key'] ?? $this->requestHeader('Idempotency-Key') ?? '');
        $payload = is_array($body['payload'] ?? null) ? (array)$body['payload'] : [];
        $payload['actor_id'] = $payload['actor_id'] ?? $body['actor_id'];
        $payload['idempotency_key'] = $payload['idempotency_key'] ?? $body['idempotency_key'];

        try {
            $entry = (new CommandRegistry())->require((string)($body['command_name'] ?? $body['command'] ?? ''));
            $challenge = (new SignatureChallengeService(Connection::getInstance()))->issueForCommand(
                $entry,
                $body,
                $payload,
                (string)$body['actor_id']
            );
            $this->success(['signature_challenge' => $challenge], 201);
        } catch (Throwable $e) {
            $problem = (new ProblemDetailsFactory())->fromThrowable(
                $e,
                (string)($body['correlation_id'] ?? $body['trace_id'] ?? '')
            );
            $this->error((string)$problem['code'], (int)$problem['status'], (string)$problem['detail'], [
                'problem' => $problem,
            ]);
        }
    }

    public function signatureManifestations(): never
    {
        $this->requireAuth();
        $recordType = (string)$this->input('record_type', '');
        $recordId = (string)$this->input('record_id', '');

        try {
            $this->success([
                'signature_manifestations' => (new SignatureManifestationService(Connection::getInstance()))->forRecord($recordType, $recordId),
            ]);
        } catch (Throwable $e) {
            $problem = (new ProblemDetailsFactory())->fromThrowable($e, '');
            $this->error((string)$problem['code'], (int)$problem['status'], (string)$problem['detail'], [
                'problem' => $problem,
            ]);
        }
    }

    /**
     * @param array<string,mixed> $user
     * @param array<string,mixed> $body
     * @return list<string>
     */
    private function actorRoles(array $user, array $body): array
    {
        $roles = [];
        foreach ([$body['actor_roles'] ?? [], $user['roles'] ?? [], $user['role'] ?? null, $user['role_code'] ?? null] as $source) {
            if (is_array($source)) {
                foreach ($source as $role) {
                    $roles[] = trim((string)$role);
                }
            } elseif ($source !== null) {
                $roles[] = trim((string)$source);
            }
        }

        return array_values(array_filter(array_unique($roles)));
    }
}
