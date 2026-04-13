<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Services\ControlPlane\ControlPlaneCommandGuard;
use MOM\Services\ControlPlane\ControlPlaneCommandService;
use MOM\Services\ControlPlane\EffectivityGateService;
use MOM\Services\ControlPlane\EqmsControlPlaneStateMachine;
use MOM\Services\ControlPlane\EqmsFormExecutionService;
use MOM\Services\ControlPlane\PeriodicEvaluationService;
use MOM\Services\ControlPlane\RepoBoundaryScanner;
use MOM\Services\ChangeControl\ChangeLifecycleCommandService;
use MOM\Services\Evidence\AuditPackExporter;
use MOM\Services\Evidence\EvidenceFinalizationService;
use MOM\Services\Publication\PublicationStateService;
use MOM\Services\Publication\PublicationMonitorService;
use MOM\Services\Traceability\GenealogyGraphService;
use MOM\Services\Traceability\UnifiedEvidenceGraphService;

final class EqmsControlPlaneController extends BaseController
{
    public function contract(): never
    {
        $this->requireAuth();

        $this->success([
            'authority' => [
                'portal_first' => true,
                'record_centric' => true,
                'sharepoint_role' => 'read_only_publication',
                'offline_excel_role' => 'controlled_capture_carrier',
                'mutation_authority' => 'process_command_api',
            ],
            'bounded_contexts' => [
                'document_control',
                'form_template_control',
                'evidence_control',
                'change_authority',
                'publication_retention',
                'genealogy_traceability',
                'audit_integrity',
            ],
            'required_error_codes' => [
                'domain_command_required',
                'change_authority_required',
                'change_effect_not_authorized',
                'effectivity_conflict',
                'training_gate_not_met',
                'read_ack_gate_not_met',
                'duplicate_submission',
                'publication_dead_letter',
                'manifest_incomplete',
                'retention_locked',
            ],
        ]);
    }

    public function stateMachine(): never
    {
        $this->requireAuth();

        $machine = (string)$this->query('machine', '');
        $state = (string)$this->query('state', '');
        $roles = array_filter(array_map('trim', explode(',', (string)$this->query('roles', ''))));

        $service = new EqmsControlPlaneStateMachine();
        if ($machine === '') {
            $this->success(['definitions' => $service->definitions()]);
        }

        if ($state === '') {
            $this->success(['definition' => $service->definition($machine)]);
        }

        $permissions = [];
        foreach ($roles as $role) {
            $permissions[$role] = true;
        }
        $this->success(['state' => $service->stateAwareResponse($machine, $state, $permissions)]);
    }

    public function validateCommand(): never
    {
        $user = $this->requireAuth();
        $body = $this->jsonBody();
        if (!isset($body['actor_ref']) && !isset($body['actor_id'])) {
            $body['actor_ref'] = (string)($user['username'] ?? $user['user_id'] ?? 'authenticated_user');
        }
        if (!isset($body['idempotency_key'])) {
            $body['idempotency_key'] = $this->requestHeader('Idempotency-Key') ?? '';
        }

        $decision = (new ControlPlaneCommandGuard())->validateEnvelope($body);
        if (!$decision->allowed) {
            $this->error($decision->code, 409, $decision->message, ['decision' => $decision->toArray()]);
        }
        $this->success(['decision' => $decision->toArray()]);
    }

    public function submitCommand(): never
    {
        $user = $this->requireAuth();
        $body = $this->jsonBody();
        if (!isset($body['actor_ref']) && !isset($body['actor_id'])) {
            $body['actor_ref'] = (string)($user['username'] ?? $user['user_id'] ?? 'authenticated_user');
        }
        if (!isset($body['idempotency_key'])) {
            $body['idempotency_key'] = $this->requestHeader('Idempotency-Key') ?? '';
        }

        try {
            $result = (new ControlPlaneCommandService($this->data))->submit($body);
            if (!$result['accepted']) {
                $decision = is_array($result['decision'] ?? null) ? $result['decision'] : [];
                $this->error((string)($decision['code'] ?? 'command_rejected'), 409, (string)($decision['message'] ?? 'Command rejected.'), $result);
            }
            $this->success($result, 202);
        } catch (\Throwable $e) {
            $this->error($e->getMessage(), 409);
        }
    }

    public function getCommand(): never
    {
        $this->requireAuth();
        $commandId = trim((string)$this->query('command_id', ''));
        if ($commandId === '') {
            $this->error('missing_command_id', 400);
        }

        try {
            $command = (new ControlPlaneCommandService($this->data))->get($commandId);
            if ($command === null) {
                $this->error('command_not_found', 404);
            }
            $this->success(['command' => $command]);
        } catch (\Throwable $e) {
            $this->error($e->getMessage(), 409);
        }
    }

    public function validateIssuanceManifest(): never
    {
        $this->requireAuth();
        $body = $this->jsonBody();
        $this->requireFields($body, ['template_revision', 'schema_version', 'request']);

        try {
            $manifest = (new EqmsFormExecutionService())->buildIssuanceManifest(
                (array)$body['template_revision'],
                (array)$body['schema_version'],
                (array)$body['request'],
            );
            $this->success(['issuance_manifest' => $manifest]);
        } catch (\Throwable $e) {
            $this->error($e->getMessage(), 409);
        }
    }

    public function validateSubmissionAttempt(): never
    {
        $this->requireAuth();
        $body = $this->jsonBody();
        $this->requireFields($body, ['issuance', 'carrier_manifest', 'submission']);

        $result = (new EqmsFormExecutionService())->validateSubmissionAttempt(
            (array)$body['issuance'],
            (array)$body['carrier_manifest'],
            (array)$body['submission'],
            (array)($body['known_fingerprints'] ?? []),
        );

        if ($result['validation_state'] === 'failed') {
            $this->error('submission_validation_failed', 409, 'Submission attempt did not pass validation.', ['validation' => $result]);
        }
        $this->success(['validation' => $result]);
    }

    public function evaluateChangeRelease(): never
    {
        $this->requireAuth();
        $body = $this->jsonBody();
        $this->requireFields($body, ['change_order']);

        $result = (new EffectivityGateService())->evaluateChangeOrderRelease(
            (array)$body['change_order'],
            (array)($body['affected_objects'] ?? []),
            (array)($body['resulting_objects'] ?? []),
            (array)($body['effectivities'] ?? []),
            (array)($body['training_requirements'] ?? []),
            (array)($body['verifications'] ?? []),
            (array)($body['conflicts'] ?? []),
        );

        if (!$result['allowed']) {
            $this->error('change_release_gate_blocked', 409, 'Change order release gates are not complete.', ['release_gate' => $result]);
        }
        $this->success(['release_gate' => $result]);
    }

    public function createChangeRequest(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $body = $this->jsonBody();
        $this->requireFields($body, ['title']);

        try {
            $this->success([
                'change_request' => (new ChangeLifecycleCommandService($this->data))->createChangeRequest(
                    $body,
                    (string)($user['username'] ?? $user['user_id'] ?? 'authenticated_user'),
                ),
            ], 201);
        } catch (\Throwable $e) {
            $this->error($e->getMessage(), 409);
        }
    }

    public function transitionChangeRequest(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $body = $this->jsonBody();
        if (!isset($body['change_request_id'])) {
            $body['change_request_id'] = (string)$this->query('change_request_id', '');
        }
        $this->requireFields($body, ['change_request_id', 'target_status']);

        try {
            $this->success([
                'change_request' => (new ChangeLifecycleCommandService($this->data))->transitionChangeRequest(
                    $body,
                    (string)($user['username'] ?? $user['user_id'] ?? 'authenticated_user'),
                ),
            ]);
        } catch (\Throwable $e) {
            $this->error($e->getMessage(), 409);
        }
    }

    public function createChangeOrder(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $body = $this->jsonBody();
        $this->requireFields($body, ['title']);

        try {
            $this->success([
                'change_order' => (new ChangeLifecycleCommandService($this->data))->createChangeOrder(
                    $body,
                    (string)($user['username'] ?? $user['user_id'] ?? 'authenticated_user'),
                ),
            ], 201);
        } catch (\Throwable $e) {
            $this->error($e->getMessage(), 409);
        }
    }

    public function transitionChangeOrder(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $body = $this->jsonBody();
        if (!isset($body['change_order_id'])) {
            $body['change_order_id'] = (string)$this->query('change_order_id', '');
        }
        $this->requireFields($body, ['change_order_id', 'target_status']);

        try {
            $this->success([
                'change_order' => (new ChangeLifecycleCommandService($this->data))->transitionChangeOrder(
                    $body,
                    (string)($user['username'] ?? $user['user_id'] ?? 'authenticated_user'),
                ),
            ]);
        } catch (\Throwable $e) {
            $this->error($e->getMessage(), 409);
        }
    }

    public function publicationRetryPlan(): never
    {
        $this->requireAuth();
        $attempts = max(0, (int)$this->query('attempts', '0'));
        $maxAttempts = max(1, (int)$this->query('max_attempts', '5'));
        $this->success(['retry_plan' => (new PublicationStateService())->retryPlan($attempts, $maxAttempts)]);
    }

    public function publicationMonitor(): never
    {
        $this->requireAuth();
        try {
            $monitor = (new PublicationMonitorService($this->data))->summarize([
                'state' => (string)$this->query('state', ''),
                'limit' => (int)$this->query('limit', '100'),
            ]);
            $this->success(['publication_monitor' => $monitor]);
        } catch (\Throwable $e) {
            $this->error($e->getMessage(), 409);
        }
    }

    public function requestPublicationAction(): never
    {
        $user = $this->requireAuth();
        $body = $this->jsonBody();
        $this->requireFields($body, ['publication_id', 'action', 'reason']);
        $idempotencyKey = trim((string)($body['idempotency_key'] ?? $this->requestHeader('Idempotency-Key') ?? ''));

        try {
            $result = (new PublicationMonitorService($this->data))->queueAction(
                trim((string)$body['publication_id']),
                trim((string)$body['action']),
                (string)($user['username'] ?? $user['user_id'] ?? 'authenticated_user'),
                trim((string)$body['reason']),
                $idempotencyKey,
            );
            $this->success(['publication_action' => $result], 202);
        } catch (\Throwable $e) {
            $this->error($e->getMessage(), 409);
        }
    }

    public function buildAuditPackManifest(): never
    {
        $user = $this->requireAuth();
        $body = $this->jsonBody();
        $this->requireFields($body, ['scope']);

        try {
            // GOV-008: Cross-org audit pack filtering - verify all records are from user's org
            $userOrgId = $_SESSION['org_id'] ?? null;
            if ($userOrgId === null) {
                $this->error('org_context_required', 400);
            }

            // Filter evidence packages by org_id
            $evidencePackages = (array)($body['evidence_packages'] ?? []);
            $filteredEvidencePackages = [];
            foreach ($evidencePackages as $pkg) {
                $pkgOrgId = is_array($pkg) ? ($pkg['org_id'] ?? null) : null;
                if ($pkgOrgId === $userOrgId) {
                    $filteredEvidencePackages[] = $pkg;
                }
            }

            // Filter audit events by org_id
            $auditEvents = (array)($body['audit_events'] ?? []);
            $filteredAuditEvents = [];
            foreach ($auditEvents as $event) {
                $eventOrgId = is_array($event) ? ($event['org_id'] ?? null) : null;
                if ($eventOrgId === $userOrgId) {
                    $filteredAuditEvents[] = $event;
                }
            }

            // Filter change authorities by org_id
            $changeAuthorities = (array)($body['change_authorities'] ?? []);
            $filteredChangeAuthorities = [];
            foreach ($changeAuthorities as $auth) {
                $authOrgId = is_array($auth) ? ($auth['org_id'] ?? null) : null;
                if ($authOrgId === $userOrgId) {
                    $filteredChangeAuthorities[] = $auth;
                }
            }

            // Filter genealogy links by org_id
            $genealogyLinks = (array)($body['genealogy_links'] ?? []);
            $filteredGenealogyLinks = [];
            foreach ($genealogyLinks as $link) {
                $linkOrgId = is_array($link) ? ($link['org_id'] ?? null) : null;
                if ($linkOrgId === $userOrgId) {
                    $filteredGenealogyLinks[] = $link;
                }
            }

            $manifest = (new AuditPackExporter())->buildManifest(
                (array)$body['scope'],
                $filteredEvidencePackages,
                $filteredAuditEvents,
                $filteredChangeAuthorities,
                $filteredGenealogyLinks,
            );

            // GOV-008: Final assertion - verify no cross-org records made it through
            if (!$this->assertAuditPackIsOrgScoped($manifest, $userOrgId)) {
                $this->error('audit_pack_scope_violation', 403, 'Audit pack contains records from multiple organizations.');
            }

            if ($manifest['export_state'] !== 'ready') {
                $this->error('audit_pack_incomplete', 409, 'Audit pack manifest is incomplete.', ['audit_pack_manifest' => $manifest]);
            }
            $this->success(['audit_pack_manifest' => $manifest]);
        } catch (\Throwable $e) {
            $this->error($e->getMessage(), 409);
        }
    }

    /**
     * Verify audit pack contains only records from the specified org_id.
     */
    private function assertAuditPackIsOrgScoped(array $manifest, ?string $expectedOrgId): bool
    {
        // Check all evidence packages have the expected org_id
        $packages = is_array($manifest['evidence_packages'] ?? null) ? $manifest['evidence_packages'] : [];
        foreach ($packages as $pkg) {
            if (is_array($pkg) && ($pkg['org_id'] ?? null) !== $expectedOrgId) {
                return false;
            }
        }

        // Check all audit events have the expected org_id
        $events = is_array($manifest['audit_timeline'] ?? null) ? $manifest['audit_timeline'] : [];
        foreach ($events as $event) {
            if (is_array($event) && ($event['org_id'] ?? null) !== $expectedOrgId) {
                return false;
            }
        }

        return true;
    }

    public function finalizeEvidencePackage(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $body = $this->jsonBody();
        $this->requireFields($body, ['subject_type', 'subject_id', 'canonical_payload']);
        if (!isset($body['actor_id'])) {
            $body['actor_id'] = (string)($user['username'] ?? $user['user_id'] ?? 'authenticated_user');
        }

        try {
            $this->success([
                'evidence_finalization' => (new EvidenceFinalizationService($this->dataDir, $this->data))->finalize($body),
            ], 201);
        } catch (\Throwable $e) {
            $this->error($e->getMessage(), 409);
        }
    }

    public function evidenceGraphPreview(): never
    {
        $this->requireAuth();
        $body = $this->jsonBody();
        $this->requireFields($body, ['evidence_record_id']);
        $this->success(['graph' => (new UnifiedEvidenceGraphService())->buildEvidenceContextGraph($body)]);
    }

    public function recordGenealogyFact(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $body = $this->jsonBody();
        $this->requireFields($body, ['edge_fact_type', 'from_object_type', 'from_object_id', 'to_object_type', 'to_object_id']);

        try {
            $fact = (new GenealogyGraphService($this->data))->recordEdgeFact(
                $body,
                (string)($user['username'] ?? $user['user_id'] ?? 'authenticated_user'),
            );
            $this->success(['genealogy_edge_fact' => $fact], 201);
        } catch (\Throwable $e) {
            $this->error($e->getMessage(), 409);
        }
    }

    public function evaluate5MGate(): never
    {
        $this->requireAuth();
        $body = $this->jsonBody();
        $this->requireFields($body, ['operation_class', 'object_type', 'object_id']);

        try {
            $result = (new GenealogyGraphService($this->data))->evaluateAndPersist5M($body);
            if (!$result['allowed']) {
                $this->error('traceability_5m_gate_blocked', 409, 'Required 5M traceability context is incomplete.', ['traceability_5m_gate' => $result]);
            }
            $this->success(['traceability_5m_gate' => $result]);
        } catch (\Throwable $e) {
            $this->error($e->getMessage(), 409);
        }
    }

    public function asManufacturedThread(): never
    {
        $this->requireAuth();
        $subjectType = (string)$this->query('subject_type', '');
        $subjectId = (string)$this->query('subject_id', '');
        if ($subjectType === '' || $subjectId === '') {
            $this->error('genealogy_subject_required', 400);
        }

        try {
            $this->success([
                'as_manufactured_thread' => (new GenealogyGraphService($this->data))->asManufacturedThread(
                    $subjectType,
                    $subjectId,
                    (int)$this->query('limit', '200'),
                ),
            ]);
        } catch (\Throwable $e) {
            $this->error($e->getMessage(), 409);
        }
    }

    public function repoBoundaryScan(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, ['admin', 'it_admin', 'qa_manager', 'qms_engineer']);

        $maxDepth = max(1, min(8, (int)$this->query('max_depth', '4')));
        $findings = (new RepoBoundaryScanner())->scanTree($this->rootDir, $maxDepth);
        $this->success([
            'findings' => $findings,
            'finding_count' => count($findings),
            'persisted' => false,
        ]);
    }

    public function periodicEvaluationDashboard(): never
    {
        $this->requireAuth();
        try {
            $this->success([
                'periodic_evaluations' => (new PeriodicEvaluationService($this->data))->dashboard((int)$this->query('limit', '100')),
            ]);
        } catch (\Throwable $e) {
            $this->error($e->getMessage(), 409);
        }
    }

    public function schedulePeriodicEvaluation(): never
    {
        $this->requireAuth();
        $body = $this->jsonBody();
        try {
            $this->success([
                'periodic_evaluation' => (new PeriodicEvaluationService($this->data))->schedule($body),
            ], 201);
        } catch (\Throwable $e) {
            $this->error($e->getMessage(), 409);
        }
    }

    public function closePeriodicEvaluation(): never
    {
        $this->requireAuth();
        $this->requireCsrf();
        $body = $this->jsonBody();
        try {
            $this->success([
                'periodic_evaluation' => (new PeriodicEvaluationService($this->data))->close($body),
            ]);
        } catch (\Throwable $e) {
            $this->error($e->getMessage(), 409);
        }
    }
}
