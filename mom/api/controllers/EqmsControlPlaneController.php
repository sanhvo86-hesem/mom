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
use MOM\Services\Evidence\AuditPackExporter;
use MOM\Services\Publication\PublicationStateService;
use MOM\Services\Publication\PublicationMonitorService;
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
        $this->requireAuth();
        $body = $this->jsonBody();
        $this->requireFields($body, ['scope']);

        try {
            $manifest = (new AuditPackExporter())->buildManifest(
                (array)$body['scope'],
                (array)($body['evidence_packages'] ?? []),
                (array)($body['audit_events'] ?? []),
                (array)($body['change_authorities'] ?? []),
                (array)($body['genealogy_links'] ?? []),
            );
            if ($manifest['export_state'] !== 'ready') {
                $this->error('audit_pack_incomplete', 409, 'Audit pack manifest is incomplete.', ['audit_pack_manifest' => $manifest]);
            }
            $this->success(['audit_pack_manifest' => $manifest]);
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
}
