<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Api\Services\DomainCommand\DomainCommandGateway;
use MOM\Api\Services\DomainCommand\ProblemDetailsFactory;
use MOM\Api\Services\DomainCommand\CommandRegistry;
use MOM\Api\Services\DomainCommand\SignatureChallengeService;
use MOM\Api\Services\DomainCommand\SignatureManifestationService;
use MOM\Api\Services\MdaRuntimeTelemetryService;
use MOM\Database\Connection;
use Throwable;

final class DomainCommandController extends BaseController
{
    public function submit(): never
    {
        $user = $this->requireAuth();
        $body = $this->jsonBody();

        try {
            $this->rejectClientActorClaims($body);
            $body['actor_id'] = $this->authenticatedActorId($user);
            $body['actor_roles'] = $this->actorRoles($user);
            $body['actor_permissions'] = $this->actorPermissions($user);
            $body['actor_scope'] = $this->actorScope($user);
            $body['idempotency_key'] = (string)($body['idempotency_key'] ?? $this->requestHeader('Idempotency-Key') ?? '');
            if (is_array($body['payload'] ?? null)) {
                $body['payload']['actor_id'] = $body['actor_id'];
                $body['payload']['idempotency_key'] = $body['idempotency_key'];
            }
            $result = (new DomainCommandGateway(Connection::getInstance()))->dispatch($body);
            $this->recordTelemetry(static function (MdaRuntimeTelemetryService $telemetry) use ($body, $result): void {
                $telemetry->recordCommandOutcome(
                    (string)($result['command_name'] ?? $body['command_name'] ?? ''),
                    !empty($result['replayed']) ? 'replayed' : 'accepted',
                    [
                        'command.name' => (string)($result['command_name'] ?? $body['command_name'] ?? ''),
                        'command.outcome' => !empty($result['replayed']) ? 'replayed' : 'accepted',
                        'idempotency.replayed' => (bool)($result['replayed'] ?? false),
                    ]
                );
            });
            $this->success(['domain_command' => $result], !empty($result['replayed']) ? 200 : 202);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $problem = (new ProblemDetailsFactory())->fromThrowable(
                $e,
                (string)($body['correlation_id'] ?? $body['trace_id'] ?? '')
            );
            $this->recordTelemetry(static function (MdaRuntimeTelemetryService $telemetry) use ($body, $problem): void {
                $telemetry->recordProblemDetails((string)($body['command_name'] ?? $body['command'] ?? ''), $problem);
            });
            $this->problem($problem);
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

        try {
            $this->rejectClientActorClaims($body);
            $body['actor_id'] = $this->authenticatedActorId($user);
            $body['actor_roles'] = $this->actorRoles($user);
            $body['actor_permissions'] = $this->actorPermissions($user);
            $body['actor_scope'] = $this->actorScope($user);
            $body['idempotency_key'] = (string)($body['idempotency_key'] ?? $this->requestHeader('Idempotency-Key') ?? '');
            $payload = is_array($body['payload'] ?? null) ? (array)$body['payload'] : [];
            $payload['actor_id'] = $body['actor_id'];
            $payload['idempotency_key'] = $body['idempotency_key'];
            $entry = (new CommandRegistry())->require((string)($body['command_name'] ?? $body['command'] ?? ''));
            $challenge = (new SignatureChallengeService(Connection::getInstance()))->issueForCommand(
                $entry,
                $body,
                $payload,
                (string)$body['actor_id']
            );
            $this->success(['signature_challenge' => $challenge], 201);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $problem = (new ProblemDetailsFactory())->fromThrowable(
                $e,
                (string)($body['correlation_id'] ?? $body['trace_id'] ?? '')
            );
            $this->recordTelemetry(static function (MdaRuntimeTelemetryService $telemetry) use ($body, $problem): void {
                $telemetry->recordProblemDetails((string)($body['command_name'] ?? $body['command'] ?? ''), $problem);
            });
            $this->problem($problem);
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
            $this->rethrowResponse($e);
            $problem = (new ProblemDetailsFactory())->fromThrowable($e, '');
            $this->recordTelemetry(static function (MdaRuntimeTelemetryService $telemetry) use ($recordType, $problem): void {
                $telemetry->recordProblemDetails('signature_manifestations:' . $recordType, $problem);
            });
            $this->problem($problem);
        }
    }

    /**
     * @param array<string,mixed> $problem
     */
    private function problem(array $problem): never
    {
        $encoded = json_encode($problem, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if ($encoded === false) {
            $encoded = '{"type":"urn:hesem:problem:domain-command:problem-encoding-failed","title":"Problem Encoding Failed","status":500,"detail":"Problem Details response could not be encoded.","code":"problem_encoding_failed"}';
        }

        $this->rawResponse($encoded, (int)($problem['status'] ?? 500), [
            'Content-Type' => 'application/problem+json; charset=utf-8',
        ]);
    }

    /**
     * @param callable(MdaRuntimeTelemetryService): void $callback
     */
    private function recordTelemetry(callable $callback): void
    {
        try {
            $callback(new MdaRuntimeTelemetryService(
                (string)($GLOBALS['DATA_DIR'] ?? dirname(__DIR__, 2) . '/data'),
                Connection::getInstance()
            ));
        } catch (Throwable) {
            // Observability must never block governed command execution.
        }
    }

    /**
     * @param array<string,mixed> $user
     * @return list<string>
     */
    private function actorRoles(array $user): array
    {
        $roles = [];
        foreach ([$user['roles'] ?? [], $user['role'] ?? null, $user['role_code'] ?? null] as $source) {
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

    /**
     * @param array<string,mixed> $body
     */
    private function rejectClientActorClaims(array $body): void
    {
        $topLevel = ['actor_id', 'actor_ref', 'actor_roles', 'actor_permissions', 'actor_scope', 'break_glass'];
        foreach ($topLevel as $field) {
            if (array_key_exists($field, $body)) {
                throw new \MOM\Api\Services\DomainCommand\DomainCommandException(
                    'client_actor_claim_rejected',
                    'Actor identity, role, permission, and scope are derived from the authenticated server session.',
                    403,
                    ['field' => $field]
                );
            }
        }

        $payload = is_array($body['payload'] ?? null) ? (array)$body['payload'] : [];
        foreach (['actor_id', 'actor_ref', 'actor_roles', 'actor_permissions', 'actor_scope', 'sod_exception_approved', 'break_glass', 'server_verified'] as $field) {
            if (array_key_exists($field, $payload)) {
                throw new \MOM\Api\Services\DomainCommand\DomainCommandException(
                    'client_actor_claim_rejected',
                    'Command payload cannot carry actor, scope, permission, or approval authority claims.',
                    403,
                    ['payload_field' => $field]
                );
            }
        }
    }

    /**
     * @param array<string,mixed> $user
     */
    private function authenticatedActorId(array $user): string
    {
        foreach (['user_id', 'username', 'employee_id', 'id'] as $field) {
            $value = trim((string)($user[$field] ?? ''));
            if ($value !== '') {
                return $value;
            }
        }

        return 'authenticated_user';
    }

    /**
     * @param array<string,mixed> $user
     * @return list<string>
     */
    private function actorPermissions(array $user): array
    {
        $permissions = [];
        foreach (['permissions', 'permission_keys', 'grants'] as $field) {
            if (is_array($user[$field] ?? null)) {
                foreach ((array)$user[$field] as $permission) {
                    $permissions[] = trim((string)$permission);
                }
            }
        }

        if (function_exists('load_role_permissions') && function_exists('role_permission_grants')) {
            $allPermissions = \load_role_permissions($this->confDir . '/role_permissions.json');
            foreach ($this->actorRoles($user) as $role) {
                $roleKey = function_exists('migrate_role') ? \migrate_role($role) : strtolower(trim($role));
                $entry = is_array($allPermissions[$roleKey] ?? null) ? (array)$allPermissions[$roleKey] : [];
                foreach (\role_permission_grants($entry) as $permission) {
                    $permissions[] = trim((string)$permission);
                }
            }
        }

        return array_values(array_filter(array_unique($permissions)));
    }

    /**
     * @param array<string,mixed> $user
     * @return array<string,mixed>
     */
    private function actorScope(array $user): array
    {
        $scope = $this->authenticatedOrgScope();
        foreach (['org_site_id', 'site_id'] as $field) {
            $value = trim((string)($user[$field] ?? ''));
            if ($value !== '' && !isset($scope[$field])) {
                $scope[$field] = $value;
            }
        }
        foreach (['org_plant_id', 'plant_id'] as $field) {
            $value = trim((string)($user[$field] ?? ''));
            if ($value !== '' && !isset($scope[$field])) {
                $scope[$field] = $value;
            }
        }

        $siteIds = array_values(array_filter(array_unique([
            (string)($scope['site_id'] ?? ''),
            (string)($scope['org_site_id'] ?? ''),
        ])));
        $plantIds = array_values(array_filter(array_unique([
            (string)($scope['plant_id'] ?? ''),
            (string)($scope['org_plant_id'] ?? ''),
        ])));

        if ($siteIds !== []) {
            $scope['site_ids'] = $siteIds;
        }
        if ($plantIds !== []) {
            $scope['plant_ids'] = $plantIds;
        }

        return $scope;
    }
}
