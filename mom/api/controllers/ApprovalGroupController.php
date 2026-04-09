<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Api\Services\IdempotencyService;
use MOM\Api\Services\RecordConflictException;
use MOM\Services\ApprovalGroupService;
use MOM\Services\SliceObservability;
use Throwable;

/**
 * Approval Group Controller for the Foundation Governance Contract Slice.
 *
 * Owns: approval-group list, detail, decide, timeline, and requestApproval action.
 * Uses canonical success envelope {data, pageInfo} and RFC 9457 problem details.
 *
 * @package MOM\Api\Controllers
 * @since   5.0.0
 */
class ApprovalGroupController extends BaseController
{
    private ?ApprovalGroupService $agService = null;
    private ?IdempotencyService $idempotencyService = null;

    private function agService(): ApprovalGroupService
    {
        if ($this->agService === null) {
            $this->agService = new ApprovalGroupService($this->data);
        }
        return $this->agService;
    }

    private function idempotency(): IdempotencyService
    {
        if ($this->idempotencyService === null) {
            $this->idempotencyService = new IdempotencyService($this->dataDir);
        }

        return $this->idempotencyService;
    }

    private function parseIdempotencyKey(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (!is_scalar($value)) {
            $this->problemDetail('urn:qms:problem:invalid-request', 'Invalid Idempotency-Key', 400);
        }

        $text = trim((string)$value);
        if ($text === '') {
            return null;
        }
        if (strlen($text) > 200 || preg_match('/^[A-Za-z0-9._:\-]+$/', $text) !== 1) {
            $this->problemDetail('urn:qms:problem:invalid-request', 'Invalid Idempotency-Key', 400);
        }

        return $text;
    }

    /**
     * @param array<string, mixed> $body
     * @return array<string, mixed>
     */
    private function approvalDecisionIdempotency(string $groupId, string $ifMatch, array $body, string $actorPartyId): array
    {
        $explicitKey = $this->parseIdempotencyKey($this->requestHeader('Idempotency-Key'))
            ?? $this->parseIdempotencyKey($this->query('idempotency_key'))
            ?? $this->parseIdempotencyKey($this->query('request_id'))
            ?? $this->parseIdempotencyKey($body['idempotency_key'] ?? null)
            ?? $this->parseIdempotencyKey($body['request_id'] ?? null);

        $fingerprint = [
            'approval_group_id' => $groupId,
            'if_match' => $ifMatch,
            'actor_party_id' => $actorPartyId,
            'body' => $body,
        ];

        if ($explicitKey !== null) {
            return [
                'scope_key' => implode('|', ['approval_group', 'decide', $groupId, $actorPartyId]),
                'key' => $explicitKey,
                'key_source' => 'header_or_body',
                'mode' => 'client_token',
                'kind' => 'action',
                'domain' => 'governance',
                'table' => 'approval_group',
                'user_id' => $actorPartyId,
                'fingerprint' => $fingerprint,
            ];
        }

        return [
            'scope_key' => implode('|', ['approval_group', 'decide', $groupId, $actorPartyId]),
            'key' => 'drv-approval-decide-' . hash('sha256', json_encode($fingerprint, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: ''),
            'key_source' => 'derived:if_match_payload',
            'mode' => 'derived_concurrency',
            'kind' => 'action',
            'domain' => 'governance',
            'table' => 'approval_group',
            'user_id' => $actorPartyId,
            'fingerprint' => $fingerprint,
        ];
    }

    // ── RFC 9457 problem-detail helper ─────────────────────────────────────

    /**
     * Emit an RFC 9457 application/problem+json response.
     */
    private function problemDetail(string $type, string $title, int $status, ?string $detail = null, array $extra = []): never
    {
        $body = array_merge([
            'type'   => $type,
            'title'  => $title,
            'status' => $status,
        ], $extra);

        if ($detail !== null) {
            $body['detail'] = $detail;
        }

        // Enrich problem with trace context (OTel Section 12.1)
        try {
            $otel = SliceObservability::getInstance($this->dataDir);
            $body = $otel->enrichProblem($body);
        } catch (\Throwable $_) {}

        throw ExitException::json($body, $status, [
            'Content-Type' => 'application/problem+json',
        ]);
    }

    /**
     * Emit a canonical success envelope.
     */
    private function sliceSuccess(array $payload, int $code = 200, array $headers = []): never
    {
        throw ExitException::json($payload, $code, array_merge(
            ['Content-Type' => 'application/json'],
            $headers
        ));
    }

    // ── Public route: GET /api/v1/governance/approval-groups ───────────────

    public function listApprovalGroups(): never
    {
        $this->requireAuth();

        try {
            $result = $this->agService()->listApprovalGroups([
                'limit'           => $this->query('limit'),
                'cursor'          => $this->query('cursor'),
                'entityName'      => $this->query('entityName'),
                'entityId'        => $this->query('entityId'),
                'statusCode'      => $this->query('statusCode'),
                'approverPartyId' => $this->query('approverPartyId'),
                'decisionCode'    => $this->query('decisionCode'),
            ]);

            $this->sliceSuccess($result);
        } catch (\InvalidArgumentException $e) {
            $this->problemDetail('urn:qms:problem:invalid-request', 'Invalid request', 400, $e->getMessage());
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->problemDetail('urn:qms:problem:server-error', 'Server error', 500, $e->getMessage());
        }
    }

    // ── Public route: GET /api/v1/governance/approval-groups/{approvalGroupId} ──

    public function getApprovalGroup(): never
    {
        $this->requireAuth();

        $groupId = $this->query('approvalGroupId') ?? '';
        if ($groupId === '') {
            $this->problemDetail('urn:qms:problem:invalid-request', 'Missing approvalGroupId', 400);
        }

        try {
            $result = $this->agService()->getApprovalGroup($groupId);
            if ($result === null) {
                $this->problemDetail('urn:qms:problem:resource-not-found', 'Approval group not found', 404);
            }

            $this->sliceSuccess(['data' => $result['data']], 200, [
                'ETag' => $result['etag'],
            ]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->problemDetail('urn:qms:problem:server-error', 'Server error', 500, $e->getMessage());
        }
    }

    // ── Public route: POST /api/v1/governance/approval-groups/{approvalGroupId}:decide ──

    public function decideApprovalGroup(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();

        $groupId = $this->query('approvalGroupId') ?? '';
        if ($groupId === '') {
            $this->problemDetail('urn:qms:problem:invalid-request', 'Missing approvalGroupId', 400);
        }

        $ifMatch = $this->requestHeader('If-Match');
        if ($ifMatch === null || $ifMatch === '') {
            $this->problemDetail('urn:qms:problem:precondition-required', 'If-Match header required', 428);
        }

        try {
            $parsed = $this->agService()->parseIfMatch($ifMatch);
        } catch (\InvalidArgumentException $e) {
            $this->problemDetail('urn:qms:problem:invalid-request', 'Malformed If-Match', 400, $e->getMessage());
        }

        $body = $this->jsonBody();
        $actorPartyId = (string)($user['party_id'] ?? $user['username'] ?? 'unknown');
        $idempotency = $this->approvalDecisionIdempotency($groupId, (string)$ifMatch, $body, $actorPartyId);

        // Self-approval is enforced authoritatively in the service layer.

        try {
            $execution = $this->idempotency()->execute($idempotency, function () use ($groupId, $parsed, $body, $actorPartyId): array {
                $result = $this->agService()->decide($groupId, $parsed, $body, $actorPartyId);
                return [
                    'status_code' => (int)($result['status'] ?? 200),
                    'payload' => [
                        'data' => $result['data'] ?? [],
                        'etag' => $result['etag'] ?? '',
                    ],
                ];
            });

            $payload = is_array($execution['payload'] ?? null) ? (array)$execution['payload'] : [];
            $etag = trim((string)($payload['etag'] ?? ''));
            unset($payload['etag']);

            $headers = [];
            if ($etag !== '') {
                $headers['ETag'] = $etag;
            }

            $this->sliceSuccess($payload, (int)($execution['status_code'] ?? 200), $headers);
        } catch (RecordConflictException $e) {
            $this->problemDetail('urn:qms:problem:idempotency-conflict', 'Idempotency conflict', 409, $e->getMessage());
        } catch (\RuntimeException $e) {
            $code = (int)$e->getCode();
            $msg = $e->getMessage();
            $map = [
                403 => ['urn:qms:problem:self-approval-forbidden', 'Self-approval is prohibited'],
                404 => ['urn:qms:problem:resource-not-found', 'Approval group not found'],
                409 => ($msg === 'bridge_not_ready')
                    ? ['urn:qms:problem:bridge-not-ready', 'Workflow bridge not ready']
                    : ['urn:qms:problem:invalid-state-transition', 'Invalid state transition'],
                412 => ['urn:qms:problem:etag-mismatch', 'ETag mismatch'],
                422 => ['urn:qms:problem:validation-error', 'Validation error'],
            ];
            $entry = $map[$code] ?? ['urn:qms:problem:server-error', 'Server error'];
            $this->problemDetail($entry[0], $entry[1], $code ?: 500, $e->getMessage());
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->problemDetail('urn:qms:problem:server-error', 'Server error', 500, $e->getMessage());
        }
    }

    // ── Public route: GET /api/v1/governance/approval-groups/{approvalGroupId}/timeline ──

    public function listApprovalGroupTimeline(): never
    {
        $this->requireAuth();

        $groupId = $this->query('approvalGroupId') ?? '';
        if ($groupId === '') {
            $this->problemDetail('urn:qms:problem:invalid-request', 'Missing approvalGroupId', 400);
        }

        try {
            $result = $this->agService()->listTimeline($groupId, [
                'limit'  => $this->query('limit'),
                'cursor' => $this->query('cursor'),
            ]);

            if ($result === null) {
                $this->problemDetail('urn:qms:problem:resource-not-found', 'Approval group not found', 404);
            }

            $this->sliceSuccess([
                'data'     => $result['data'],
                'pageInfo' => $result['pageInfo'],
            ], 200, [
                'ETag' => $result['etag'],
            ]);
        } catch (\InvalidArgumentException $e) {
            $this->problemDetail('urn:qms:problem:invalid-request', 'Invalid request', 400, $e->getMessage());
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->problemDetail('urn:qms:problem:server-error', 'Server error', 500, $e->getMessage());
        }
    }

    // ── Internal action: requestApproval ────────────────────────────────────

    public function requestApproval(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();

        $body = $this->jsonBody();
        $actorPartyId = (string)($user['party_id'] ?? $user['username'] ?? 'unknown');

        try {
            $result = $this->agService()->requestApproval($body, $actorPartyId);
            $this->sliceSuccess(['data' => $result], 201);
        } catch (\InvalidArgumentException $e) {
            $this->problemDetail('urn:qms:problem:validation-error', 'Validation error', 422, $e->getMessage());
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->problemDetail('urn:qms:problem:server-error', 'Server error', 500, $e->getMessage());
        }
    }
}
