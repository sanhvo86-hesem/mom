<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Api\Router;

/**
 * DCC — Document Change Control Routes
 *
 * REST surface for the QMS Document Change Control workflow. Prefixed
 * `/api/v1/dcc/` and kept isolated from `/api/v1/plm/` (Engineering Change
 * Control — parts/BOMs). The two surfaces share no controllers, no services,
 * and no tables.
 *
 * Governed by:
 *   mom/contracts/objects/quality_improvement--document-control/contract.json
 *
 * Migration:       mom/database/migrations/150_dcc_document_change_control.sql
 * Controller:      mom/api/controllers/DocumentControlController.php
 * Services:        mom/api/services/DocumentControl/DocumentControlService.php
 *                  mom/api/services/DocumentControl/DocumentHeaderService.php
 *
 * @since 4.1.0
 */
return static function (Router $router, string $dataDir): void {

    // ── Label registry ─────────────────────────────────────────────────────
    $router->get ('/api/v1/dcc/labels',                                          DocumentControlController::class, 'labels');

    // ── Header CRUD ────────────────────────────────────────────────────────
    $router->get ('/api/v1/dcc/documents',                                       DocumentControlController::class, 'listHeaders');
    $router->post('/api/v1/dcc/documents',                                       DocumentControlController::class, 'createHeader');
    $router->post('/api/v1/dcc/documents/upsert',                                DocumentControlController::class, 'upsertHeader');
    $router->get ('/api/v1/dcc/documents/{doc_code}/header',                     DocumentControlController::class, 'getHeader');
    $router->patch('/api/v1/dcc/documents/{doc_code}/header',                    DocumentControlController::class, 'updateHeader');
    $router->get ('/api/v1/dcc/documents/{doc_code}/revisions',                  DocumentControlController::class, 'listRevisions');

    // ── State-machine actions ──────────────────────────────────────────────
    $router->post('/api/v1/dcc/documents/{doc_code}/actions/submit-review',      DocumentControlController::class, 'actionSubmitReview');
    $router->post('/api/v1/dcc/documents/{doc_code}/actions/approve',            DocumentControlController::class, 'actionApprove');
    $router->post('/api/v1/dcc/documents/{doc_code}/actions/release',            DocumentControlController::class, 'actionRelease');
    $router->post('/api/v1/dcc/documents/{doc_code}/actions/supersede',          DocumentControlController::class, 'actionSupersede');
    $router->post('/api/v1/dcc/documents/{doc_code}/actions/obsolete',           DocumentControlController::class, 'actionObsolete');

    // ── DCR — Document Change Request ──────────────────────────────────────
    $router->post('/api/v1/dcc/change-requests',                                 DocumentControlController::class, 'createDcr');
    $router->get ('/api/v1/dcc/change-requests/{dcr_id}',                        DocumentControlController::class, 'getDcr');
    $router->post('/api/v1/dcc/change-requests/{dcr_id}/approve',                DocumentControlController::class, 'approveDcr');
    $router->post('/api/v1/dcc/change-requests/{dcr_id}/reject',                 DocumentControlController::class, 'rejectDcr');

    // ── DCN — Document Change Notice ───────────────────────────────────────
    $router->post('/api/v1/dcc/change-notices',                                  DocumentControlController::class, 'issueDcn');
    $router->get ('/api/v1/dcc/change-notices/{dcn_id}',                         DocumentControlController::class, 'getDcn');
};
