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
use MOM\Services\DocumentControl\DocumentRevisionCommandService;
use MOM\Services\Evidence\AuditPackExportService;
use MOM\Services\Evidence\AuditPackExporter;
use MOM\Services\Evidence\CanonicalEvidenceReadService;
use MOM\Services\Evidence\EvidenceAmendmentService;
use MOM\Services\Evidence\EvidenceFinalizationService;
use MOM\Services\FormControl\FormIssuanceCommandService;
use MOM\Services\FormControl\FormSubmissionAcceptanceService;
use MOM\Services\Publication\PublicationStateService;
use MOM\Services\Publication\PublicationMonitorService;
use MOM\Services\Traceability\GenealogyGraphService;
use MOM\Services\Traceability\UnifiedEvidenceGraphService;

final class EqmsControlPlaneController extends BaseController
{
    /**
     * @return list<string>
     */
    private function evidenceFinalizationRoles(): array
    {
        return array_values(array_unique(array_merge(
            admin_roles(),
            [
                'quality_manager',
                'qa_manager',
                'quality_engineer',
                'document_control',
                'document_controller',
                'qms_manager',
                'compliance_manager',
                'production_director',
            ],
        )));
    }

    /**
     * @return list<string>
     */
    private function evidenceReadRoles(): array
    {
        return array_values(array_unique(array_merge(
            admin_roles(),
            [
                'quality_manager',
                'qa_manager',
                'quality_engineer',
                'document_control',
                'document_controller',
                'qms_manager',
                'compliance_manager',
                'production_director',
                'auditor',
            ],
        )));
    }

    private function requireOrgContext(array $user): string
    {
        $orgId = trim((string)($_SESSION['org_id'] ?? $user['org_id'] ?? ''));
        if ($orgId === '') {
            $this->error('org_context_required', 403);
        }

        return $orgId;
    }

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

        // REAUDIT-R6-010: Validate idempotency key length and format
        $idempotencyKey = trim((string)($body['idempotency_key'] ?? ''));
        if (strlen($idempotencyKey) < 16 || strlen($idempotencyKey) > 128) {
            $this->error('idempotency_key_invalid_length', 400, 'Idempotency key must be between 16 and 128 characters.');
        }
        if (!preg_match('/^[a-zA-Z0-9_\-\.]+$/', $idempotencyKey)) {
            $this->error('idempotency_key_invalid_format', 400, 'Idempotency key must contain only alphanumeric characters, hyphens, underscores, and periods.');
        }
        $body['idempotency_key'] = $idempotencyKey;

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

    public function createDocumentRevision(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $body = $this->jsonBody();
        $this->requireFields($body, ['doc_code', 'doc_type', 'title', 'revision_label']);

        try {
            $this->success([
                'document_control' => (new DocumentRevisionCommandService($this->data))->createRevision(
                    $body,
                    (string)($user['username'] ?? $user['user_id'] ?? 'authenticated_user'),
                ),
            ], 201);
        } catch (\Throwable $e) {
            $this->error($e->getMessage(), 409);
        }
    }

    public function acknowledgeDocumentRead(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $body = $this->jsonBody();
        $this->requireFields($body, ['doc_revision_id']);

        try {
            $this->success([
                'document_control' => (new DocumentRevisionCommandService($this->data))->acknowledgeRead(
                    $body,
                    (string)($user['username'] ?? $user['user_id'] ?? 'authenticated_user'),
                ),
            ], 201);
        } catch (\Throwable $e) {
            $this->error($e->getMessage(), 409);
        }
    }

    public function supersedeDocumentRevision(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $body = $this->jsonBody();
        $this->requireFields($body, ['doc_revision_id', 'source_change_order_id']);

        try {
            $this->success([
                'document_control' => (new DocumentRevisionCommandService($this->data))->supersedeRevision(
                    $body,
                    (string)($user['username'] ?? $user['user_id'] ?? 'authenticated_user'),
                ),
            ]);
        } catch (\Throwable $e) {
            $this->error($e->getMessage(), 409);
        }
    }

    public function issueForm(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $body = $this->jsonBody();
        $this->requireFields($body, ['allocation_id', 'issued_record_id', 'frm_template_revision_id', 'frm_schema_version_id', 'delivery_mode']);

        try {
            $this->success([
                'form_control' => (new FormIssuanceCommandService($this->data))->issue(
                    $body,
                    (string)($user['username'] ?? $user['user_id'] ?? 'authenticated_user'),
                ),
            ], 201);
        } catch (\Throwable $e) {
            $this->error($e->getMessage(), 409);
        }
    }

    public function recordFormSubmissionAttempt(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $body = $this->jsonBody();
        $this->requireFields($body, ['frm_issuance_id', 'attempt_no']);

        try {
            $this->success([
                'form_control' => (new FormIssuanceCommandService($this->data))->recordSubmissionAttempt(
                    $body,
                    (string)($user['username'] ?? $user['user_id'] ?? 'authenticated_user'),
                ),
            ], 201);
        } catch (\Throwable $e) {
            $this->error($e->getMessage(), 409);
        }
    }

    public function acceptSubmissionAttempt(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, ['admin', 'qa_manager', 'qms_engineer', 'quality_manager', 'document_control']);
        $this->requireCsrf();
        $body = $this->jsonBody();
        $body['attempt_id'] = (string)$this->query('attempt_id', $body['attempt_id'] ?? '');
        $this->requireFields($body, ['attempt_id', 'signature_event_id', 'reason']);

        try {
            $this->success([
                'form_control' => (new FormSubmissionAcceptanceService($this->data))->accept(
                    $body,
                    (string)($user['username'] ?? $user['user_id'] ?? 'authenticated_user'),
                ),
            ]);
        } catch (\Throwable $e) {
            $this->error($e->getMessage(), 409);
        }
    }

    public function evaluateChangeRelease(): never
    {
        $this->requireAuth();
        $body = $this->jsonBody();
        if (isset($body['change_order_id'])) {
            try {
                $result = (new ChangeLifecycleCommandService($this->data))->evaluateChangeOrderReleaseReadiness(
                    trim((string)$body['change_order_id']),
                    is_array($body['overrides'] ?? null) ? $body['overrides'] : [],
                );
                if (!$result['allowed']) {
                    $this->error('change_release_gate_blocked', 409, 'Change order release gates are not complete.', ['release_gate' => $result]);
                }
                $this->success(['release_gate' => $result + ['authority' => 'canonical_change_lifecycle_package']]);
            } catch (\Throwable $e) {
                $this->error($e->getMessage(), 409);
            }
        }

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
        $this->success(['release_gate' => $result + ['authority' => 'preview_only_not_release_authority']]);
    }

    public function createChangeRequest(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->changeRequesterRoles());
        $this->requireCsrf();
        $body = $this->jsonBody();
        if (!isset($body['idempotency_key'])) {
            $body['idempotency_key'] = trim((string)($this->requestHeader('Idempotency-Key') ?? ''));
        }
        $this->requireFields($body, ['idempotency_key', 'title']);
        $body['_actor_roles'] = $this->rolesForUser($user);

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
        $this->requireAnyRole($user, $this->changeCoordinatorRoles());
        $this->requireCsrf();
        $body = $this->jsonBody();
        if (!isset($body['change_request_id'])) {
            $body['change_request_id'] = (string)$this->query('change_request_id', '');
        }
        $this->requireFields($body, ['change_request_id', 'target_status']);
        $body['_actor_roles'] = $this->rolesForUser($user);

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
        $this->requireAnyRole($user, $this->changeCoordinatorRoles());
        $this->requireCsrf();
        $body = $this->jsonBody();
        if (!isset($body['idempotency_key'])) {
            $body['idempotency_key'] = trim((string)($this->requestHeader('Idempotency-Key') ?? ''));
        }
        $this->requireFields($body, ['idempotency_key', 'title']);
        $body['_actor_roles'] = $this->rolesForUser($user);

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
        $this->requireAnyRole($user, $this->changeApproverRoles());
        $this->requireCsrf();
        $body = $this->jsonBody();
        if (!isset($body['change_order_id'])) {
            $body['change_order_id'] = (string)$this->query('change_order_id', '');
        }
        $this->requireFields($body, ['change_order_id', 'target_status']);
        $body['_actor_roles'] = $this->rolesForUser($user);

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
        $this->requireAnyRole($user, ['admin', 'it_admin', 'qa_manager', 'qms_engineer', 'change_coordinator']);
        $this->requireCsrf();
        $body = $this->jsonBody();
        $this->requireFields($body, ['publication_id', 'action', 'reason']);
        $idempotencyKey = trim((string)($body['idempotency_key'] ?? $this->requestHeader('Idempotency-Key') ?? ''));

        // REAUDIT-R6-010: Validate idempotency key length and format
        if ($idempotencyKey !== '') {
            if (strlen($idempotencyKey) < 16 || strlen($idempotencyKey) > 128) {
                $this->error('idempotency_key_invalid_length', 400, 'Idempotency key must be between 16 and 128 characters.');
            }
            if (!preg_match('/^[a-zA-Z0-9_\-\.]+$/', $idempotencyKey)) {
                $this->error('idempotency_key_invalid_format', 400, 'Idempotency key must contain only alphanumeric characters, hyphens, underscores, and periods.');
            }
        }

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
        $this->requireAnyRole($user, ['admin', 'it_admin', 'qa_manager', 'qms_engineer', 'auditor']);
        $body = $this->jsonBody();
        $this->requireFields($body, ['scope']);

        try {
            // GOV-008: Cross-org audit pack filtering - verify all records are from user's org
            $userOrgId = $_SESSION['org_id'] ?? null;
            if ($userOrgId === null) {
                $this->error('org_context_required', 400);
            }

            foreach (['evidence_packages', 'audit_events', 'change_authorities', 'genealogy_links'] as $callerRecordSet) {
                if (array_key_exists($callerRecordSet, $body)) {
                    $this->error('audit_pack_caller_supplied_records_rejected', 400, 'Audit pack export accepts scope only; records are loaded from canonical stores.');
                }
            }

            $auditPackService = new AuditPackExportService($this->data);
            $manifest = $auditPackService->buildForScope((array)$body['scope'], (string)$userOrgId);
            $export = (new AuditPackExporter($this->dataDir))->exportManifest($manifest);
            $lifecycle = $auditPackService->recordExportLifecycle(
                $manifest,
                $export,
                is_scalar($user['user_id'] ?? null) ? (string)$user['user_id'] : null,
            );

            // GOV-008: Final assertion - verify no cross-org records made it through
            if (!$this->assertAuditPackIsOrgScoped($manifest, $userOrgId)) {
                $this->error('audit_pack_scope_violation', 403, 'Audit pack contains records from multiple organizations.');
            }

            if (($export['export_state'] ?? '') !== 'ready') {
                $this->error('audit_pack_incomplete', 409, 'Audit pack manifest is incomplete.', [
                    'audit_pack_manifest' => $manifest,
                    'audit_pack_export' => $export,
                ]);
            }
            $this->success([
                'audit_pack_manifest' => $manifest,
                'audit_pack_export' => $export,
                'audit_pack_export_lifecycle' => $lifecycle,
            ]);
        } catch (\Throwable $e) {
            $this->error($e->getMessage(), 409);
        }
    }

    public function getAuditPackExport(): never
    {
        $this->requireAuth();

        try {
            $service = new AuditPackExportService($this->data);
            $lifecycle = $service->readExportLifecycle([
                'audit_pack_export_id' => $this->query('audit_pack_export_id', ''),
                'scope_type' => $this->query('scope_type', ''),
                'scope_ref' => $this->query('scope_ref', ''),
                'package_hash_sha256' => $this->query('package_hash_sha256', '') ?: $this->query('package_hash', ''),
            ]);
            $packageHash = trim((string)($lifecycle['package_hash_sha256'] ?? ''));
            if ($packageHash === '') {
                $this->success(['audit_pack_export_lifecycle' => $lifecycle]);
            }
            $this->success([
                'audit_pack_export_lifecycle' => $lifecycle,
                'audit_pack_export' => (new AuditPackExporter($this->dataDir))->readExport($packageHash),
            ]);
        } catch (\Throwable $e) {
            $this->error($e->getMessage(), 404);
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
        $this->requireAnyRole($user, $this->evidenceFinalizationRoles());
        $this->requireCsrf();
        $body = $this->jsonBody();
        $this->requireFields($body, ['subject_type', 'subject_id', 'canonical_payload']);
        $orgId = $this->requireOrgContext($user);
        $bodyOrgId = trim((string)($body['org_id'] ?? ''));
        if ($bodyOrgId !== '' && $bodyOrgId !== $orgId) {
            $this->error('evidence_scope_violation', 403);
        }
        $body['org_id'] = $orgId;
        $authenticatedUserId = trim((string)($user['user_id'] ?? $user['id'] ?? ''));
        $authenticatedSignerRef = trim((string)($user['username'] ?? $user['email'] ?? $user['user_id'] ?? $user['id'] ?? ''));
        if ($authenticatedSignerRef === '') {
            $authenticatedSignerRef = 'authenticated_user';
        }
        $body['actor_id'] = $authenticatedSignerRef;
        $body['actor_ref'] = $authenticatedSignerRef;
        $body['authenticated_user_id'] = $authenticatedUserId !== '' ? $authenticatedUserId : null;
        $body['authenticated_signer_ref'] = $authenticatedSignerRef;
        $body['session_id'] = session_status() === PHP_SESSION_ACTIVE && session_id() !== '' ? session_id() : null;
        $body['signature_action'] = 'evidence_finalize';

        try {
            $this->success([
                'evidence_finalization' => (new EvidenceFinalizationService($this->dataDir, $this->data))->finalize($body),
            ], 201);
        } catch (\Throwable $e) {
            $this->error($e->getMessage(), 409);
        }
    }

    public function createEvidenceAmendment(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->evidenceFinalizationRoles());
        $this->requireCsrf();
        $body = $this->jsonBody();
        $this->requireFields($body, ['source_evidence_version_id', 'source_change_order_id', 'field_paths']);

        try {
            $this->success([
                'evidence_amendment' => (new EvidenceAmendmentService($this->data))->createAmendment(
                    $body,
                    (string)($user['username'] ?? $user['user_id'] ?? 'authenticated_user'),
                ),
            ], 201);
        } catch (\Throwable $e) {
            $this->error($e->getMessage(), 409);
        }
    }

    public function canonicalEvidencePackage(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->evidenceReadRoles());
        $orgId = $this->requireOrgContext($user);
        $evidenceRef = trim((string)($this->query('evidence_ref', '') ?: $this->query('evidence_id', '')));
        if ($evidenceRef === '') {
            $this->error('evidence_ref_required', 400);
        }

        try {
            $this->success([
                'evidence_package' => (new CanonicalEvidenceReadService($this->data))->package($evidenceRef, $orgId),
            ]);
        } catch (\Throwable $e) {
            $this->error($e->getMessage(), 404);
        }
    }

    public function evidenceGraphPreview(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->evidenceReadRoles());
        $orgId = $this->requireOrgContext($user);
        $body = $this->jsonBody();
        $this->requireFields($body, ['evidence_record_id']);
        $scope = is_array($body['scope'] ?? null) ? $body['scope'] : [];
        $bodyOrgId = trim((string)($body['org_id'] ?? $scope['org_id'] ?? ''));
        if ($bodyOrgId !== '' && $bodyOrgId !== $orgId) {
            $this->error('evidence_scope_violation', 403);
        }
        $body['org_id'] = $orgId;
        $this->success(['graph' => (new UnifiedEvidenceGraphService())->buildEvidenceContextGraph($body)]);
    }

    public function recordGenealogyFact(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, ['admin', 'it_admin', 'qa_manager', 'qms_engineer', 'change_coordinator', 'production_manager']);
        $this->requireCsrf();
        $body = $this->jsonBody();
        $this->requireFields($body, ['edge_fact_type', 'from_object_type', 'from_object_id', 'to_object_type', 'to_object_id']);
        $this->rejectCallerScopeFields($body);
        $body['scope'] = $this->requiredSessionOrgScope($user);

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
        $user = $this->requireAuth();
        $this->requireAnyRole($user, ['admin', 'it_admin', 'qa_manager', 'qms_engineer', 'change_coordinator', 'production_manager']);
        $this->requireCsrf();
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
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->traceabilityReadRoles());
        foreach (['plant_id', 'org_plant_id', 'org_company_code', 'org_legal_entity_code', 'org_site_id'] as $scopeField) {
            $value = $this->query($scopeField, '');
            if ($value !== null && trim($value) !== '') {
                $this->error('unauthorized_scope_field_in_request', 403, 'Scope fields cannot be provided in request. Scope is derived from user session.');
            }
        }
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
                    $this->requiredSessionOrgScope($user),
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
        $user = $this->requireAuth();
        $this->requireAnyRole($user, ['admin', 'it_admin', 'qa_manager', 'qms_engineer']);
        $this->requireCsrf();
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
        $user = $this->requireAuth();
        $this->requireAnyRole($user, ['admin', 'it_admin', 'qa_manager', 'qms_engineer']);
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

    /**
     * @return list<string>
     */
    private function changeRequesterRoles(): array
    {
        return array_values(array_unique(array_merge(admin_roles(), [
            'requester',
            'author',
            'engineering',
            'qa',
            'qms_engineer',
            'change_coordinator',
        ])));
    }

    /**
     * @return list<string>
     */
    private function changeCoordinatorRoles(): array
    {
        return array_values(array_unique(array_merge(admin_roles(), [
            'change_coordinator',
            'qa_manager',
            'qms_manager',
            'document_control',
            'engineering_manager',
        ])));
    }

    /**
     * @return list<string>
     */
    private function changeApproverRoles(): array
    {
        return array_values(array_unique(array_merge(admin_roles(), [
            'qa_manager',
            'qms_manager',
            'production_director',
            'engineering_manager',
            'compliance_manager',
            'change_coordinator',
        ])));
    }

    /**
     * @return list<string>
     */
    private function traceabilityReadRoles(): array
    {
        return array_values(array_unique(array_merge(admin_roles(), [
            'production_director',
            'production_manager',
            'cnc_workshop_manager',
            'shift_leader',
            'quality_manager',
            'qa_manager',
            'quality_engineer',
            'qms_engineer',
            'internal_auditor',
            'auditor',
        ])));
    }

    /**
     * @param array<string, mixed> $user
     * @return list<string>
     */
    private function rolesForUser(array $user): array
    {
        $roles = is_array($user['roles'] ?? null) ? $user['roles'] : [(string)($user['role'] ?? '')];
        return array_values(array_filter(array_map(static fn(mixed $role): string => strtolower(trim((string)$role)), $roles)));
    }

    /**
     * @return array<string, string>
     */
    private function sessionOrgScope(): array
    {
        return array_filter([
            'plant_id' => (string)($_SESSION['plant_id'] ?? ''),
            'org_plant_id' => (string)($_SESSION['plant_id'] ?? ''),
            'org_id' => (string)($_SESSION['org_id'] ?? ''),
            'org_company_code' => (string)($_SESSION['org_company_code'] ?? ''),
            'org_legal_entity_code' => (string)($_SESSION['org_legal_entity_code'] ?? ''),
            'org_site_id' => (string)($_SESSION['org_site_id'] ?? ''),
        ], static fn(string $value): bool => $value !== '');
    }

    /**
     * @param array<string, mixed> $user
     * @return array<string, string>
     */
    private function requiredSessionOrgScope(array $user): array
    {
        $scope = $this->sessionOrgScope();
        if ($scope === [] && array_intersect($this->rolesForUser($user), admin_roles()) === []) {
            $this->error('scope_context_required', 403, 'Traceability operations require an authenticated session scope.');
        }
        return $scope;
    }

    /**
     * @param array<string, mixed> $body
     */
    private function rejectCallerScopeFields(array $body): void
    {
        $scope = is_array($body['scope'] ?? null) ? $body['scope'] : [];
        foreach (['plant_id', 'org_plant_id', 'org_id', 'org_company_code', 'org_legal_entity_code', 'org_site_id'] as $field) {
            $value = $body[$field] ?? $scope[$field] ?? null;
            if (is_scalar($value) && trim((string)$value) !== '') {
                $this->error('unauthorized_scope_field_in_request', 403, 'Scope fields cannot be supplied by request body.');
            }
        }
    }
}
