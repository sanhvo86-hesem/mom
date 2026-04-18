<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Api\Services\DesignTokenCatalogService;
use MOM\Api\Services\GraphicsGovernanceException;
use MOM\Api\Services\GraphicsGovernanceRepository;
use MOM\Api\Services\GraphicsGovernanceService;
use Throwable;

class GraphicsGovernanceController extends BaseController
{
    private ?GraphicsGovernanceService $graphicsService = null;
    private ?DesignTokenCatalogService $tokenCatalog = null;

    protected function error(string $error, int $code = 400, ?string $detail = null, array $extra = []): never
    {
        $this->problem($code, $error, $detail ?? $error, [], $extra);
    }

    private function graphics(): GraphicsGovernanceService
    {
        if ($this->graphicsService === null) {
            $this->graphicsService = new GraphicsGovernanceService($this->rootDir, $this->dataDir);
        }
        return $this->graphicsService;
    }

    private function tokenCatalog(): DesignTokenCatalogService
    {
        if ($this->tokenCatalog === null) {
            $this->tokenCatalog = new DesignTokenCatalogService(
                $this->data,
                new GraphicsGovernanceRepository($this->rootDir, $this->dataDir)
            );
        }
        return $this->tokenCatalog;
    }

    public function getDesignConfig(): never
    {
        $user = $this->requireAuth();
        $this->requireGraphicsRead($user);
        $this->respond(fn(): array => $this->graphics()->getDesignConfig());
    }

    public function saveDesignConfig(): never
    {
        $user = $this->requireWriteRequest();
        $body = $this->jsonBody();
        $config = $body['config'] ?? null;
        if (!is_array($config)) {
            $this->problem(422, 'invalid_config', 'Config must be an object');
        }
        $result = $this->call(fn(): array => $this->graphics()->saveDesignConfig(
            (array)$config,
            $this->expectedVersion($body, (array)$config),
            (string)($user['username'] ?? '')
        ));
        $this->graphicsAudit('graphics.design_config.saved', 'design-config', [
            'version' => $result['version'] ?? '',
            'etag' => $result['etag'] ?? '',
        ], $user);
        $this->success($result);
    }

    public function listTemplates(): never
    {
        $user = $this->requireAuth();
        $this->requireGraphicsRead($user);
        $this->respond(fn(): array => $this->graphics()->getTemplateRegistry());
    }

    public function getTemplate(): never
    {
        $user = $this->requireAuth();
        $this->requireGraphicsRead($user);
        $templateId = $this->templateId();
        $this->respond(fn(): array => $this->graphics()->getTemplate($templateId));
    }

    public function saveDraftTemplate(): never
    {
        $user = $this->requireWriteRequest();
        $body = $this->jsonBody();
        $template = is_array($body['template'] ?? null) ? (array)$body['template'] : $body;
        $result = $this->call(fn(): array => $this->graphics()->saveDraftTemplate(
            $template,
            $this->expectedVersion($body),
            (string)($user['username'] ?? '')
        ));
        $templateId = (string)($result['draft']['templateId'] ?? '');
        $this->graphicsAudit('graphics.template.draft_saved', $templateId, ['templateId' => $templateId], $user);
        $this->success($result);
    }

    public function cloneTemplate(): never
    {
        $user = $this->requireWriteRequest();
        $body = $this->jsonBody();
        $sourceTemplateId = $this->templateId($body['sourceTemplateId'] ?? null);
        $result = $this->call(fn(): array => $this->graphics()->cloneTemplate(
            $sourceTemplateId,
            $body,
            $this->expectedVersion($body),
            (string)($user['username'] ?? '')
        ));
        $templateId = (string)($result['draft']['templateId'] ?? '');
        $this->graphicsAudit('graphics.template.cloned', $templateId, [
            'sourceTemplateId' => $sourceTemplateId,
            'templateId' => $templateId,
        ], $user);
        $this->success($result);
    }

    public function deprecateTemplate(): never
    {
        $user = $this->requireWriteRequest();
        $body = $this->jsonBody();
        $templateId = $this->templateId();
        $result = $this->call(fn(): array => $this->graphics()->deprecateTemplate(
            $templateId,
            $body,
            $this->expectedVersion($body),
            (string)($user['username'] ?? '')
        ));
        $this->graphicsAudit('graphics.template.deprecated', $templateId, [
            'templateId' => $templateId,
            'status' => $result['template']['status'] ?? '',
        ], $user);
        $this->success($result);
    }

    public function validateTemplate(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireGraphicsRead($user);
        $body = $this->jsonBody();
        if (($this->query('templateId') ?? '') !== '' && !isset($body['templateId'])) {
            $body['templateId'] = $this->templateId();
        }
        $this->respond(fn(): array => $this->graphics()->validateTemplate($body));
    }

    public function publishTemplate(): never
    {
        $user = $this->requireWriteRequest();
        $body = $this->jsonBody();
        $templateId = $this->templateId($body['templateId'] ?? null);
        $result = $this->call(fn(): array => $this->graphics()->publishTemplate(
            $templateId,
            $body,
            $this->expectedVersion($body),
            (string)($user['username'] ?? '')
        ));
        $this->graphicsAudit('graphics.template.published', $templateId, [
            'templateId' => $templateId,
            'publishId' => $result['publishId'] ?? '',
            'registryVersion' => $result['registryVersion'] ?? '',
            'registryEtag' => $result['registryEtag'] ?? '',
        ], $user);
        $this->success($result);
    }

    public function modulesUsingTemplate(): never
    {
        $user = $this->requireAuth();
        $this->requireGraphicsRead($user);
        $templateId = $this->templateId();
        $this->respond(fn(): array => $this->graphics()->modulesUsingTemplate($templateId));
    }

    public function componentContracts(): never
    {
        $user = $this->requireAuth();
        $this->requireGraphicsRead($user);
        $this->respond(fn(): array => $this->graphics()->getComponentContractRegistry());
    }

    public function complianceMatrix(): never
    {
        $user = $this->requireAuth();
        $this->requireGraphicsRead($user);
        $this->respond(fn(): array => $this->graphics()->complianceMatrix());
    }

    public function nonCompliantModules(): never
    {
        $user = $this->requireAuth();
        $this->requireGraphicsRead($user);
        $this->respond(fn(): array => $this->graphics()->nonCompliantModules());
    }

    public function bridgeAliasDebt(): never
    {
        $user = $this->requireAuth();
        $this->requireGraphicsRead($user);
        $this->respond(fn(): array => $this->graphics()->bridgeAliasDebt());
    }

    public function privateCssDebt(): never
    {
        $user = $this->requireAuth();
        $this->requireGraphicsRead($user);
        $this->respond(fn(): array => $this->graphics()->privateCssDebt());
    }

    public function tokenAdoptionCoverage(): never
    {
        $user = $this->requireAuth();
        $this->requireGraphicsRead($user);
        $this->respond(fn(): array => $this->graphics()->tokenAdoptionCoverage());
    }

    public function debtReport(): never
    {
        $user = $this->requireAuth();
        $this->requireGraphicsRead($user);
        $this->respond(fn(): array => $this->graphics()->debtReport());
    }

    public function driftReport(): never
    {
        $user = $this->requireAuth();
        $this->requireGraphicsRead($user);
        $this->respond(fn(): array => $this->graphics()->driftReport());
    }

    public function analyzeTokenImpact(): never
    {
        $this->analyzeImpact('graphics.impact.token_analyzed', fn(array $body): array => $this->graphics()->analyzeTokenImpact($body));
    }

    public function analyzeTemplateImpact(): never
    {
        $this->analyzeImpact('graphics.impact.template_analyzed', fn(array $body): array => $this->graphics()->analyzeTemplateImpact($body));
    }

    public function analyzeComponentImpact(): never
    {
        $this->analyzeImpact('graphics.impact.component_analyzed', fn(array $body): array => $this->graphics()->analyzeComponentImpact($body));
    }

    public function analyzePolicyPackImpact(): never
    {
        $this->analyzeImpact('graphics.impact.policy_pack_analyzed', fn(array $body): array => $this->graphics()->analyzePolicyPackImpact($body));
    }

    public function stageRollout(): never
    {
        $user = $this->requireWriteRequest();
        $body = $this->jsonBody();
        $result = $this->call(fn(): array => $this->graphics()->stageRollout(
            $body,
            $this->expectedVersion($body),
            (string)($user['username'] ?? '')
        ));
        $rolloutId = (string)($result['rollout']['rolloutId'] ?? '');
        $this->graphicsAudit('graphics.rollout.staged', $rolloutId, ['rolloutId' => $rolloutId], $user);
        $this->success($result);
    }

    public function applyRollout(): never
    {
        $user = $this->requireWriteRequest();
        $body = $this->jsonBody();
        $result = $this->call(fn(): array => $this->graphics()->applyRollout(
            $body,
            $this->expectedVersion($body),
            (string)($user['username'] ?? '')
        ));
        $rolloutId = (string)($result['rollout']['rolloutId'] ?? '');
        $this->graphicsAudit('graphics.rollout.applied', $rolloutId, ['rolloutId' => $rolloutId], $user);
        $this->success($result);
    }

    public function canaryApplyRollout(): never
    {
        $user = $this->requireWriteRequest();
        $body = $this->jsonBody();
        $result = $this->call(fn(): array => $this->graphics()->canaryApplyRollout(
            $body,
            $this->expectedVersion($body),
            (string)($user['username'] ?? '')
        ));
        $rolloutId = (string)($result['rollout']['rolloutId'] ?? '');
        $this->graphicsAudit('graphics.rollout.canary_applied', $rolloutId, ['rolloutId' => $rolloutId], $user);
        $this->success($result);
    }

    public function rollbackRollout(): never
    {
        $user = $this->requireWriteRequest();
        $body = $this->jsonBody();
        $result = $this->call(fn(): array => $this->graphics()->rollbackRollout(
            $body,
            $this->expectedVersion($body),
            (string)($user['username'] ?? '')
        ));
        $rolloutId = (string)($result['rollout']['rolloutId'] ?? '');
        $this->graphicsAudit('graphics.rollout.rolled_back', $rolloutId, ['rolloutId' => $rolloutId], $user);
        $this->success($result);
    }

    public function auditHistory(): never
    {
        $user = $this->requireAuth();
        $this->requireGraphicsRead($user);
        $limit = max(1, min(500, (int)($this->query('limit', '200') ?? '200')));
        $filters = [
            'limit' => $limit,
            'aggregate_type' => 'graphics_governance',
        ];
        foreach (['aggregate_id', 'actor_name', 'from', 'to', 'search'] as $key) {
            $value = trim((string)($this->query($key, '') ?? ''));
            if ($value !== '') {
                $filters[$key] = $value;
            }
        }
        try {
            $events = $this->data->getAuditLog($filters);
            $this->success([
                'events' => array_values(array_map(static fn($event): array => is_array($event) ? $event : [], $events)),
                'limit' => $limit,
            ]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->problem(500, 'graphics_audit_read_failed', $e->getMessage());
        }
    }

    public function createWaiver(): never
    {
        $user = $this->requireWriteRequest();
        $body = $this->jsonBody();
        $result = $this->call(fn(): array => $this->graphics()->createWaiver(
            $body,
            $this->expectedVersion($body),
            (string)($user['username'] ?? '')
        ));
        $waiverId = (string)($result['waiver']['waiverId'] ?? '');
        $this->graphicsAudit('graphics.waiver.created', $waiverId, ['waiverId' => $waiverId], $user);
        $this->success($result);
    }

    public function approveWaiver(): never
    {
        $this->transitionWaiver('approved');
    }

    public function expireWaiver(): never
    {
        $this->transitionWaiver('expired');
    }

    public function activeWaivers(): never
    {
        $user = $this->requireAuth();
        $this->requireGraphicsRead($user);
        $this->respond(fn(): array => $this->graphics()->activeWaivers());
    }

    public function releaseBlockers(): never
    {
        $user = $this->requireAuth();
        $this->requireGraphicsRead($user);
        $this->respond(fn(): array => $this->graphics()->releaseBlockers());
    }

    public function changeSetModel(): never
    {
        $user = $this->requireAuth();
        $this->requireGraphicsRead($user);
        $this->respond(fn(): array => $this->graphics()->graphicsChangeSetModel());
    }

    public function lineageGraph(): never
    {
        $user = $this->requireAuth();
        $this->requireGraphicsRead($user);
        $this->respond(fn(): array => $this->graphics()->lineageGraph());
    }

    public function runtimeBeacon(): never
    {
        $user = $this->requireAuth();
        $this->requireGraphicsRead($user);
        $this->respond(fn(): array => $this->graphics()->runtimeComplianceBeacon());
    }

    public function debtObservatory(): never
    {
        $user = $this->requireAuth();
        $this->requireGraphicsRead($user);
        $this->respond(fn(): array => $this->graphics()->visualDebtObservatory());
    }

    public function environmentPolicyPacks(): never
    {
        $user = $this->requireAuth();
        $this->requireGraphicsRead($user);
        $this->respond(fn(): array => $this->graphics()->environmentPolicyPacks());
    }

    public function releaseDashboard(): never
    {
        $user = $this->requireAuth();
        $this->requireGraphicsRead($user);
        $this->respond(fn(): array => $this->graphics()->graphicsReleaseDashboard());
    }

    public function releaseLink(): never
    {
        $user = $this->requireAuth();
        $this->requireGraphicsRead($user);
        $this->respond(fn(): array => $this->graphics()->graphicsReleaseLink());
    }

    public function releaseEvidencePack(): never
    {
        $user = $this->requireAuth();
        $this->requireGraphicsRead($user);
        $this->respond(fn(): array => $this->graphics()->graphicsReleaseEvidencePack());
    }

    // ── Token Catalog (Graphics Authority, DB-backed) ───────────────────────

    public function tokenCatalogList(): never
    {
        $user = $this->requireAuth();
        $this->requireGraphicsRead($user);
        $layer = $this->queryParam('layer');
        $family = $this->queryParam('family');
        $scope = $this->queryParam('component_scope');
        $this->respond(fn(): array => [
            'ok' => true,
            'tokens' => $this->tokenCatalog()->listCatalog($layer, $family, $scope),
            '_meta' => [
                'authority' => 'graphics_token_catalog',
                'mode' => $this->data->getMode(),
                'capturedAt' => $this->nowIso(),
            ],
        ]);
    }

    public function tokenCatalogSnapshot(): never
    {
        $user = $this->requireAuth();
        $this->requireGraphicsRead($user);
        $colorMode = (string)($this->queryParam('color_mode') ?? 'light');
        $scope = [
            'tenant'      => (string)($this->queryParam('tenant') ?? ''),
            'environment' => (string)($this->queryParam('environment') ?? ''),
            'role'        => (string)($user['role'] ?? ''),
            'user'        => (string)($user['username'] ?? ''),
        ];
        $scope = array_filter($scope, static fn($v) => $v !== '');
        $this->respond(fn(): array => [
            'ok' => true,
            'snapshot' => $this->tokenCatalog()->snapshotEffective($scope, $colorMode),
            'color_mode' => $colorMode,
            'scope' => $scope,
            '_meta' => [
                'authority' => 'graphics_token_value',
                'mode' => $this->data->getMode(),
                'capturedAt' => $this->nowIso(),
            ],
        ]);
    }

    public function previewScenesList(): never
    {
        $user = $this->requireAuth();
        $this->requireGraphicsRead($user);
        $category = $this->queryParam('category');
        $this->respond(fn(): array => [
            'ok' => true,
            'scenes' => $this->tokenCatalog()->listPreviewScenes($category),
            '_meta' => ['authority' => 'graphics_preview_scene'],
        ]);
    }

    public function componentContractRegistry(): never
    {
        $user = $this->requireAuth();
        $this->requireGraphicsRead($user);
        $operatorVisible = $this->queryParam('operator_visible');
        $filter = $operatorVisible === null ? null : filter_var($operatorVisible, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
        $this->respond(fn(): array => [
            'ok' => true,
            'contracts' => $this->tokenCatalog()->listComponentContracts($filter),
            '_meta' => ['authority' => 'graphics_component_contract'],
        ]);
    }

    public function themeScheduleList(): never
    {
        $user = $this->requireAuth();
        $this->requireGraphicsRead($user);
        $this->respond(fn(): array => [
            'ok' => true,
            'schedules' => $this->tokenCatalog()->listThemeSchedules(),
            '_meta' => ['authority' => 'graphics_theme_schedule'],
        ]);
    }

    public function simulationRunRecord(): never
    {
        $user = $this->requireWriteRequest();
        $body = $this->jsonBody();
        $payload = is_array($body['run'] ?? null) ? (array)$body['run'] : $body;
        $payload['initiated_by'] = $payload['initiated_by'] ?? (string)($user['username'] ?? '');
        $runId = $this->tokenCatalog()->recordSimulationRun($payload);
        $this->graphicsAudit('graphics.simulation.recorded', $runId, [
            'run_id' => $runId,
            'outcome' => $payload['outcome'] ?? 'reviewed',
            'scenes_rendered' => $payload['scenes_rendered'] ?? [],
        ], $user);
        $this->success([
            'ok' => true,
            'run_id' => $runId,
            '_meta' => ['authority' => 'graphics_simulation_run'],
        ]);
    }

    private function queryParam(string $key): ?string
    {
        $value = $_GET[$key] ?? null;
        if ($value === null || $value === '') {
            return null;
        }
        return is_scalar($value) ? (string)$value : null;
    }

    /**
     * @param callable(): array<string, mixed> $fn
     */
    private function respond(callable $fn): never
    {
        $this->success($this->call($fn));
    }

    /**
     * @param callable(): array<string, mixed> $fn
     * @return array<string, mixed>
     */
    private function call(callable $fn): array
    {
        try {
            return $fn();
        } catch (GraphicsGovernanceException $e) {
            $this->problem($e->statusCode(), $e->errorCode(), $e->getMessage(), $e->errors(), $e->extra());
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->problem(500, 'graphics_governance_failed', $e->getMessage());
        }
    }

    /**
     * @param callable(array<string, mixed>): array<string, mixed> $fn
     */
    private function analyzeImpact(string $eventType, callable $fn): never
    {
        $user = $this->requireWriteRequest();
        $body = $this->jsonBody();
        $username = (string)($user['username'] ?? '');
        $result = $this->call(fn(): array => $this->graphics()->recordImpactReport($fn($body), $username));
        $this->graphicsAudit($eventType, (string)($result['impactId'] ?? $eventType), [
            'impactId' => $result['impactId'] ?? '',
            'analysisType' => $result['analysisType'] ?? '',
        ], $user);
        $this->success($result);
    }

    private function transitionWaiver(string $transition): never
    {
        $user = $this->requireWriteRequest();
        $body = $this->jsonBody();
        $waiverId = $this->waiverId($body['waiverId'] ?? null);
        $result = $this->call(fn(): array => $transition === 'approved'
            ? $this->graphics()->approveWaiver($waiverId, $this->expectedVersion($body), (string)($user['username'] ?? ''))
            : $this->graphics()->expireWaiver($waiverId, $this->expectedVersion($body), (string)($user['username'] ?? '')));
        $this->graphicsAudit('graphics.waiver.' . $transition, $waiverId, [
            'waiverId' => $waiverId,
            'status' => $transition,
        ], $user);
        $this->success($result);
    }

    /**
     * @return array<string, mixed>
     */
    private function requireWriteRequest(): array
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireGraphicsWrite($user);
        return $user;
    }

    /**
     * @param array<string, mixed> $user
     */
    private function requireGraphicsRead(array $user): void
    {
        $this->requireAnyPermission($user, ['graphics_governance.read', 'graphics_governance.write', 'registry.read', 'registry.write', 'schema_studio.*']);
    }

    /**
     * @param array<string, mixed> $user
     */
    private function requireGraphicsWrite(array $user): void
    {
        $this->requireAnyPermission($user, ['graphics_governance.write', 'registry.write', 'schema_studio.*']);
    }

    private function templateId(mixed $fallback = null): string
    {
        $templateId = trim((string)($this->query('templateId') ?? $fallback ?? $this->jsonBody()['templateId'] ?? ''));
        if ($templateId === '') {
            $this->problem(422, 'template_id_required', 'templateId is required');
        }
        return $templateId;
    }

    private function waiverId(mixed $fallback = null): string
    {
        $waiverId = trim((string)($this->query('waiverId') ?? $fallback ?? ''));
        if ($waiverId === '') {
            $this->problem(422, 'waiver_id_required', 'waiverId is required');
        }
        return $waiverId;
    }

    /**
     * @param array<string, mixed> $body
     */
    private function expectedVersion(array $body, ?array $resource = null): ?string
    {
        $header = $this->requestHeader('If-Match');
        if ($header !== null && trim($header) !== '') {
            return $header;
        }
        foreach (['expectedVersion', 'baseVersion', 'registryVersion', 'version'] as $key) {
            if (isset($body[$key]) && is_scalar($body[$key])) {
                return (string)$body[$key];
            }
        }
        foreach ([$body['config'] ?? null, $resource] as $candidate) {
            if (!is_array($candidate)) {
                continue;
            }
            $meta = is_array($candidate['_meta'] ?? null) ? (array)$candidate['_meta'] : [];
            if (isset($meta['version']) && is_scalar($meta['version'])) {
                return (string)$meta['version'];
            }
            if (isset($meta['governanceRevision']) && is_scalar($meta['governanceRevision'])) {
                return 'rev-' . (string)$meta['governanceRevision'];
            }
        }
        return null;
    }

    /**
     * @param array<string, mixed> $payload
     * @param array<string, mixed> $user
     */
    private function graphicsAudit(string $eventType, string $aggregateId, array $payload, array $user): void
    {
        $username = (string)($user['username'] ?? $_SESSION['user'] ?? 'anonymous');
        $payload['authority'] = 'graphics_governance_backend';
        $this->auditLog($eventType, ['aggregate_id' => $aggregateId] + $payload, $username);
        try {
            $this->data->logEvent($eventType, 'graphics_governance', $aggregateId !== '' ? $aggregateId : $eventType, $payload, [
                'actor_name' => $username,
                'ip_address' => $this->clientIp(),
                'session_id' => session_status() === PHP_SESSION_ACTIVE ? session_id() : null,
                'metadata' => [
                    'controller' => static::class,
                    'source' => 'graphics_governance_controller',
                ],
            ]);
        } catch (Throwable $e) {
            @error_log('[GraphicsGovernanceController] audit write failed: ' . $e->getMessage());
        }
    }

    /**
     * @param array<int, array<string, mixed>> $errors
     * @param array<string, mixed> $extra
     */
    private function problem(int $status, string $code, string $detail, array $errors = [], array $extra = []): never
    {
        $title = match ($status) {
            400 => 'Bad Request',
            401 => 'Unauthorized',
            403 => 'Forbidden',
            404 => 'Not Found',
            409 => 'Conflict',
            412 => 'Precondition Failed',
            422 => 'Unprocessable Entity',
            428 => 'Precondition Required',
            default => $status >= 500 ? 'Server Error' : 'Request Failed',
        };
        $payload = array_merge([
            'ok' => false,
            'type' => 'https://qms.hesem.com.vn/problems/' . str_replace('_', '-', $code),
            'title' => $title,
            'status' => $status,
            'detail' => $detail,
            'code' => $code,
            'trace_id' => bin2hex(random_bytes(8)),
            'server_time' => $this->nowIso(),
        ], $extra);
        if ($errors !== []) {
            $payload['errors'] = $errors;
        }
        $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $this->rawResponse(is_string($json) ? $json : '{"type":"about:blank","title":"Request Failed","status":500}', $status, [
            'Content-Type' => 'application/problem+json; charset=utf-8',
        ]);
    }
}
