<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Services\DocumentControl\DocumentControlService;
use MOM\Services\DocumentControl\DocumentHeaderService;
use InvalidArgumentException;
use RuntimeException;
use Throwable;

/**
 * DCC — Document Change Control Controller.
 *
 * Exposes the REST surface documented in:
 *   mom/contracts/objects/quality_improvement--document-control/contract.json
 *
 * The route prefix `/api/v1/dcc/` is reserved exclusively for QMS documents.
 * Parts / BOMs / items use the ECC surface under `/api/v1/plm/` — do not
 * conflate the two. DCC is documents; ECC is parts.
 *
 * Standards: ISO 9001:2015 §7.5, AS9100D §7.5, IATF 16949 §7.5,
 *            FDA 21 CFR Part 820.40, FDA 21 CFR Part 11.
 *
 * @since 4.1.0
 */
final class DocumentControlController extends EqmsBaseController
{
    private const MODULE = 'document_control';

    // ── Role policy ──────────────────────────────────────────────────────────

    private function readRoles(): array
    {
        // Intentionally broad: the header payload is part of the public doc
        // portal, so any authenticated EQMS reader can fetch it.
        return $this->eqmsReadRoles();
    }

    private function writeRoles(): array
    {
        return array_values(array_unique(array_merge(admin_roles(), [
            'document_control', 'document_controller', 'qms_manager',
            'quality_manager', 'qa_manager',
        ])));
    }

    private function approveRoles(): array
    {
        return array_values(array_unique(array_merge(admin_roles(), [
            'qms_manager', 'quality_manager', 'qa_manager', 'compliance_manager',
        ])));
    }

    private function releaseRoles(): array
    {
        return array_values(array_unique(array_merge(admin_roles(), [
            'ceo', 'md', 'general_director', 'qms_manager', 'compliance_manager',
        ])));
    }

    // ── Service factories ────────────────────────────────────────────────────

    private function service(): DocumentControlService
    {
        static $svc = null;
        if ($svc === null) {
            $svc = new DocumentControlService($this->data);
        }
        return $svc;
    }

    private function headerService(): DocumentHeaderService
    {
        static $svc = null;
        if ($svc === null) {
            $svc = new DocumentHeaderService($this->data);
        }
        return $svc;
    }

    private function actor(array $user): string
    {
        return (string)($user['username'] ?? $user['user'] ?? 'unknown');
    }

    // ── Label registry ───────────────────────────────────────────────────────

    /** GET /api/v1/dcc/labels?locale=en */
    public function labels(): never
    {
        $this->requireAuth();
        $locale = $this->query('locale', 'en') ?? 'en';
        $rows = $this->service()->listLabels($locale);
        $this->success([
            'locale' => $locale,
            'labels' => $rows,
        ]);
    }

    // ── Header CRUD ──────────────────────────────────────────────────────────

    /** GET /api/v1/dcc/documents */
    public function listHeaders(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->readRoles());
        $filters = [
            'doc_type'        => $this->query('doc_type'),
            'status'          => $this->query('status'),
            'owner_role_code' => $this->query('owner'),
            'search'          => $this->query('search'),
        ];
        $limit  = (int)($this->query('limit') ?? 100);
        $offset = (int)($this->query('offset') ?? 0);
        $items  = $this->service()->listHeaders($filters, $limit, $offset);
        $this->success(['items' => $items]);
    }

    /** POST /api/v1/dcc/documents */
    public function createHeader(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $body = $this->jsonBody();
        try {
            $result = $this->service()->createHeader($body, $this->actor($user));
        } catch (InvalidArgumentException $e) {
            $this->error('dcc_invalid_input', 422, $e->getMessage());
        } catch (Throwable $e) {
            $this->error('dcc_create_failed', 500, $e->getMessage());
        }
        $this->success(['header' => $result], 201);
    }

    /** GET /api/v1/dcc/documents/{doc_code}/header */
    public function getHeader(): never
    {
        $this->requireAuth();
        $docCode = $this->requirePathId('doc_code', 'doc_code');
        $locale  = $this->query('locale', 'en') ?? 'en';
        try {
            $payload = $this->headerService()->render($docCode, $locale);
        } catch (RuntimeException $e) {
            $this->error('dcc_document_not_found', 404, $e->getMessage());
        }
        $this->success(['header' => $payload]);
    }

    /** PATCH /api/v1/dcc/documents/{doc_code}/header */
    public function updateHeader(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $docCode = $this->requirePathId('doc_code', 'doc_code');
        $patch   = $this->jsonBody();
        try {
            $result = $this->service()->updateHeader($docCode, $patch, $this->actor($user));
        } catch (InvalidArgumentException $e) {
            $this->error('dcc_invalid_input', 422, $e->getMessage());
        } catch (RuntimeException $e) {
            $this->error('dcc_update_conflict', 409, $e->getMessage());
        }
        $this->success(['header' => $result]);
    }

    /** GET /api/v1/dcc/documents/{doc_code}/revisions */
    public function listRevisions(): never
    {
        $this->requireAuth();
        $docCode = $this->requirePathId('doc_code', 'doc_code');
        $rows = $this->service()->listRevisions($docCode);
        $this->success(['doc_code' => $docCode, 'history' => $rows]);
    }

    // ── State machine actions ───────────────────────────────────────────────

    public function actionSubmitReview(): never
    {
        [$user, $docCode, $body] = $this->actionContext();
        $this->requireAnyRole($user, $this->writeRoles());
        $this->runTransition(
            fn() => $this->service()->submitReview(
                $docCode,
                $this->actor($user),
                $body['role_code'] ?? null,
                $body['note'] ?? null
            ),
            'submit_review'
        );
    }

    public function actionApprove(): never
    {
        [$user, $docCode, $body] = $this->actionContext();
        $this->requireAnyRole($user, $this->approveRoles());
        $this->runTransition(
            fn() => $this->service()->approve(
                $docCode,
                $this->actor($user),
                $body['role_code'] ?? null,
                $body['dcr_id'] ?? null,
                $body['note'] ?? null
            ),
            'approve'
        );
    }

    public function actionRelease(): never
    {
        [$user, $docCode, $body] = $this->actionContext();
        $this->requireAnyRole($user, $this->releaseRoles());
        if (empty($body['role_code']) || empty($body['dcn_id'])) {
            $this->error('dcc_release_requires_dcn_and_role', 422, 'role_code and dcn_id are required.');
        }
        $this->runTransition(
            fn() => $this->service()->release(
                $docCode,
                $this->actor($user),
                (string)$body['role_code'],
                (string)$body['dcn_id'],
                $body['note'] ?? null
            ),
            'release'
        );
    }

    public function actionSupersede(): never
    {
        [$user, $docCode, $body] = $this->actionContext();
        $this->requireAnyRole($user, $this->releaseRoles());
        if (empty($body['role_code'])) {
            $this->error('dcc_role_required', 422, 'role_code is required.');
        }
        $this->runTransition(
            fn() => $this->service()->supersede(
                $docCode,
                $this->actor($user),
                (string)$body['role_code'],
                $body['note'] ?? null
            ),
            'supersede'
        );
    }

    public function actionObsolete(): never
    {
        [$user, $docCode, $body] = $this->actionContext();
        $this->requireAnyRole($user, $this->releaseRoles());
        if (empty($body['role_code'])) {
            $this->error('dcc_role_required', 422, 'role_code is required.');
        }
        $this->runTransition(
            fn() => $this->service()->obsolete(
                $docCode,
                $this->actor($user),
                (string)$body['role_code'],
                $body['note'] ?? null
            ),
            'obsolete'
        );
    }

    // ── DCR / DCN ───────────────────────────────────────────────────────────

    public function createDcr(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->writeRoles());
        $body = $this->jsonBody();
        try {
            $dcr = $this->service()->createDcr($body, $this->actor($user));
        } catch (InvalidArgumentException $e) {
            $this->error('dcc_dcr_invalid', 422, $e->getMessage());
        } catch (Throwable $e) {
            $this->error('dcc_dcr_create_failed', 500, $e->getMessage());
        }
        $this->success(['dcr' => $dcr], 201);
    }

    public function getDcr(): never
    {
        $this->requireAuth();
        $dcrId = $this->requirePathId('dcr_id', 'dcr_id');
        try {
            $dcr = $this->service()->fetchDcr($dcrId);
        } catch (RuntimeException $e) {
            $this->error('dcc_dcr_not_found', 404, $e->getMessage());
        }
        $this->success(['dcr' => $dcr]);
    }

    public function approveDcr(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->approveRoles());
        $dcrId = $this->requirePathId('dcr_id', 'dcr_id');
        $body  = $this->jsonBody();
        if (empty($body['role_code'])) {
            $this->error('dcc_role_required', 422, 'role_code is required.');
        }
        $dcr = $this->service()->approveDcr($dcrId, $this->actor($user), (string)$body['role_code']);
        $this->success(['dcr' => $dcr]);
    }

    public function rejectDcr(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->approveRoles());
        $dcrId = $this->requirePathId('dcr_id', 'dcr_id');
        $body  = $this->jsonBody();
        $reason = trim((string)($body['reason'] ?? ''));
        if ($reason === '') {
            $this->error('dcc_reject_reason_required', 422, 'reason is required.');
        }
        $dcr = $this->service()->rejectDcr($dcrId, $this->actor($user), $reason);
        $this->success(['dcr' => $dcr]);
    }

    public function issueDcn(): never
    {
        $user = $this->requireAuth();
        $this->requireAnyRole($user, $this->releaseRoles());
        $body = $this->jsonBody();
        try {
            $dcn = $this->service()->issueDcn($body, $this->actor($user));
        } catch (InvalidArgumentException $e) {
            $this->error('dcc_dcn_invalid', 422, $e->getMessage());
        } catch (RuntimeException $e) {
            $this->error('dcc_dcn_rejected', 409, $e->getMessage());
        }
        $this->success(['dcn' => $dcn], 201);
    }

    public function getDcn(): never
    {
        $this->requireAuth();
        $dcnId = $this->requirePathId('dcn_id', 'dcn_id');
        try {
            $dcn = $this->service()->fetchDcn($dcnId);
        } catch (RuntimeException $e) {
            $this->error('dcc_dcn_not_found', 404, $e->getMessage());
        }
        $this->success(['dcn' => $dcn]);
    }

    // ── Internals ───────────────────────────────────────────────────────────

    /** @return array{0: array<string, mixed>, 1: string, 2: array<string, mixed>} */
    private function actionContext(): array
    {
        $user    = $this->requireAuth();
        $docCode = $this->requirePathId('doc_code', 'doc_code');
        $body    = $this->jsonBody();
        return [$user, $docCode, $body];
    }

    /**
     * @param callable(): array<string, mixed> $operation
     */
    private function runTransition(callable $operation, string $actionName): never
    {
        try {
            $result = $operation();
        } catch (RuntimeException $e) {
            $msg = $e->getMessage();
            if (str_starts_with($msg, 'dcc_invalid_transition')) {
                $this->error('dcc_invalid_transition', 409, $msg);
            }
            if (str_starts_with($msg, 'dcc_release_requires_dcn') || str_starts_with($msg, 'dcc_dcn_')) {
                $this->error('dcc_release_requires_dcn', 422, $msg);
            }
            if (str_starts_with($msg, 'dcc_document_not_found')) {
                $this->error('dcc_document_not_found', 404, $msg);
            }
            $this->error('dcc_transition_failed', 400, $msg);
        } catch (InvalidArgumentException $e) {
            $this->error('dcc_invalid_input', 422, $e->getMessage());
        }
        $this->success(['action' => $actionName, 'header' => $result]);
    }
}
