<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Services\MdaFrontendProjectionSafetyService;

final class MdaFrontendProjectionSafetyController extends BaseController
{
    public function contract(): never
    {
        $this->requireAuth();
        $this->success([
            'data' => $this->service()->authorityProbe(),
        ]);
    }

    public function recordShell(): never
    {
        $this->requireAuth();
        $rootCode = (string)$this->input('root_code', '');
        $recordId = (string)$this->input('record_id', '');
        $result = $this->service()->buildRecordShell($rootCode, $recordId);
        $this->success(['data' => $result], $result['allowed'] ? 200 : 422);
    }

    public function evaluate(): never
    {
        $this->requireAuth();
        $body = $this->jsonBody();
        $service = $this->service();
        $mode = (string)($body['mode'] ?? $this->input('mode', 'route'));

        $result = match ($mode) {
            'workspace_action' => $service->evaluateWorkspaceAction(
                is_array($body['route'] ?? null) ? $body['route'] : [],
                is_array($body['action'] ?? null) ? $body['action'] : [],
            ),
            'freshness' => $service->evaluateFreshness(
                is_array($body['projection'] ?? null) ? $body['projection'] : [],
                is_array($body['actions'] ?? null) ? $body['actions'] : [],
            ),
            'offline_candidate' => $service->queueOfflineCandidate(
                is_array($body['candidate'] ?? null) ? $body['candidate'] : [],
            ),
            'alias' => $service->resolveRecordAlias(
                is_array($body['alias_map'] ?? null) ? $body['alias_map'] : [],
                (string)($body['alias_key'] ?? ''),
            ),
            default => $service->classifyOpsRoute((string)($body['route_path'] ?? $this->input('route_path', ''))),
        };

        $this->success(['data' => $result], $result['allowed'] ? 200 : 409);
    }

    private function service(): MdaFrontendProjectionSafetyService
    {
        return new MdaFrontendProjectionSafetyService();
    }
}
