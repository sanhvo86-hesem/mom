<?php
declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Api\Services\TrustedReleaseRecordService;
use Throwable;

final class TrustedReleaseRecordController extends BaseController
{
    public function assemble(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());

        try {
            $this->success(['release_record' => $this->service()->assemble($this->criteria())]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('release_record_assembly_failed', 500, $e->getMessage());
        }
    }

    public function readiness(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());

        try {
            $this->success(['release_readiness' => $this->service()->readiness($this->criteria())]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('release_record_readiness_failed', 500, $e->getMessage());
        }
    }

    public function release(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->releaseRoles());

        try {
            $body = $this->jsonBody();
            $decision = is_array($body['decision'] ?? null) ? $body['decision'] : [];
            $decision['released_by'] = (string)($user['username'] ?? $user['id'] ?? 'system');
            $this->success(['release_record' => $this->service()->release($this->criteria(), $decision)]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $status = $e->getMessage() === 'release_record_blocked' ? 409 : 500;
            $this->error($e->getMessage() === 'release_record_blocked' ? 'release_record_blocked' : 'release_record_release_failed', $status, $e->getMessage());
        }
    }

    public function detail(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());

        try {
            $packetId = trim((string)$this->input('packet_id', ''));
            if ($packetId === '') {
                $this->error('missing_packet_id', 400);
            }
            $packet = $this->service()->get($packetId);
            if ($packet === null) {
                $this->error('release_record_not_found', 404);
            }
            $this->success(['release_record' => $packet]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('release_record_detail_failed', 500, $e->getMessage());
        }
    }

    public function provenance(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());

        try {
            $packetId = trim((string)$this->input('packet_id', ''));
            if ($packetId === '') {
                $this->error('missing_packet_id', 400);
            }
            $this->success(['release_provenance' => $this->service()->provenance($packetId)]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('release_record_provenance_failed', 500, $e->getMessage());
        }
    }

    public function rollup(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());

        try {
            $this->success(['release_rollup' => $this->service()->enterpriseRollup($this->criteria())]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('release_record_rollup_failed', 500, $e->getMessage());
        }
    }

    public function probe(): never
    {
        $user = $this->requireAuth();
        $this->requireAdmin($user);

        try {
            $this->success(['trusted_release_record' => $this->service()->probe()]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('release_record_probe_failed', 500, $e->getMessage());
        }
    }

    private function service(): TrustedReleaseRecordService
    {
        return new TrustedReleaseRecordService($this->dataDir, $this->data);
    }

    /**
     * @return array<string, mixed>
     */
    private function criteria(): array
    {
        $body = $this->jsonBody();
        $criteria = is_array($body['criteria'] ?? null) ? $body['criteria'] : $body;
        foreach (TrustedReleaseRecordService::filterFields() as $field) {
            $value = $this->input($field);
            if ($value !== null && trim($value) !== '') {
                $criteria[$field] = trim($value);
            }
        }
        foreach (['correlation_id', 'request_id', 'traceparent', 'limit', 'require_qualification'] as $field) {
            $value = $this->input($field);
            if ($value !== null && trim($value) !== '') {
                $criteria[$field] = trim($value);
            }
        }
        return $criteria;
    }

    /**
     * @return list<string>
     */
    private function readRoles(): array
    {
        return array_values(array_unique(array_merge(
            admin_roles(),
            [
                'production_director',
                'production_manager',
                'quality_manager',
                'qa_manager',
                'quality_engineer',
                'qms_engineer',
                'shipping_coordinator',
                'logistics_manager',
                'internal_auditor',
                'auditor',
            ],
        )));
    }

    /**
     * @return list<string>
     */
    private function releaseRoles(): array
    {
        return array_values(array_unique(array_merge(
            admin_roles(),
            [
                'qa_manager',
                'quality_manager',
                'production_director',
                'qms_engineer',
                'it_admin',
            ],
        )));
    }
}

