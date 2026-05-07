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

    // ── Role + doc-type catalogs (migration 155) ───────────────────────────
    // Replace hardcoded owner/approver/doc-type lists previously embedded in
    // JS modules (02-state-auth-ui.js, 48-eqms-documents.js). Every picker in
    // the portal now fetches its options from these endpoints.
    $router->get ('/api/v1/dcc/roles',                                           DocumentControlController::class, 'listRoles');
    $router->get ('/api/v1/dcc/doc-types',                                       DocumentControlController::class, 'listDocTypes');

    // ── Header CRUD ────────────────────────────────────────────────────────
    $router->get ('/api/v1/dcc/documents',                                       DocumentControlController::class, 'listHeaders');
    $router->post('/api/v1/dcc/documents',                                       DocumentControlController::class, 'createHeader');
    $router->post('/api/v1/dcc/documents/upsert',                                DocumentControlController::class, 'upsertHeader');
    $router->get ('/api/v1/dcc/documents/{doc_code}/header',                     DocumentControlController::class, 'getHeader');
    $router->patch('/api/v1/dcc/documents/{doc_code}/header',                    DocumentControlController::class, 'updateHeader');
    $router->get ('/api/v1/dcc/documents/{doc_code}/locales/{locale}',           DocumentControlController::class, 'getLocaleVariant');
    $router->put ('/api/v1/dcc/documents/{doc_code}/locales/{locale}',           DocumentControlController::class, 'upsertLocaleVariant');
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

    // ── Translation provider admin (legacy single-toggle, kept for compat) ─
    $router->get ('/api/v1/dcc/admin/translation-provider',                      DocumentControlController::class, 'getTranslationProvider');
    $router->post('/api/v1/dcc/admin/translation-provider',                      DocumentControlController::class, 'setTranslationProvider');

    // ── Translation Admin Module (migration 157) ───────────────────────────
    // Multi-provider routing, encrypted credentials, model discovery, cost log,
    // and side-by-side test bench. See TranslationAdminController.
    $router->get   ('/api/v1/dcc/admin/translation/providers',                                TranslationAdminController::class, 'listProviders');
    $router->put   ('/api/v1/dcc/admin/translation/providers/{provider_key}',                 TranslationAdminController::class, 'toggleProvider');

    $router->get   ('/api/v1/dcc/admin/translation/credentials/{provider_key}',               TranslationAdminController::class, 'getCredential');
    $router->put   ('/api/v1/dcc/admin/translation/credentials/{provider_key}',               TranslationAdminController::class, 'setCredential');
    $router->delete('/api/v1/dcc/admin/translation/credentials/{provider_key}',               TranslationAdminController::class, 'deleteCredential');
    $router->post  ('/api/v1/dcc/admin/translation/credentials/{provider_key}/probe',         TranslationAdminController::class, 'probeCredential');
    $router->post  ('/api/v1/dcc/admin/translation/credentials/{provider_key}/login/start',   TranslationAdminController::class, 'loginStart');
    $router->post  ('/api/v1/dcc/admin/translation/credentials/{provider_key}/login/complete',TranslationAdminController::class, 'loginComplete');
    $router->post  ('/api/v1/dcc/admin/translation/credentials/{provider_key}/logout',        TranslationAdminController::class, 'loginLogout');

    $router->get   ('/api/v1/dcc/admin/translation/models/{provider_key}',                    TranslationAdminController::class, 'listModels');
    $router->post  ('/api/v1/dcc/admin/translation/models/{provider_key}/refresh',            TranslationAdminController::class, 'refreshModels');

    $router->get   ('/api/v1/dcc/admin/translation/routing',                                  TranslationAdminController::class, 'listRouting');
    $router->post  ('/api/v1/dcc/admin/translation/routing',                                  TranslationAdminController::class, 'upsertRouting');
    $router->put   ('/api/v1/dcc/admin/translation/routing/{routing_id}',                     TranslationAdminController::class, 'upsertRouting');
    $router->delete('/api/v1/dcc/admin/translation/routing/{routing_id}',                     TranslationAdminController::class, 'deleteRouting');
    $router->get   ('/api/v1/dcc/admin/translation/resolve',                                  TranslationAdminController::class, 'resolveDocument');

    $router->get   ('/api/v1/dcc/admin/translation/usage',                                    TranslationAdminController::class, 'usageSummary');
    $router->post  ('/api/v1/dcc/admin/translation/test',                                     TranslationAdminController::class, 'testBench');

    // ── Documents tab (per-doc override + force retranslate) ──────────────
    $router->get   ('/api/v1/dcc/admin/translation/documents',                                          TranslationAdminController::class, 'listTranslatedDocuments');
    $router->put   ('/api/v1/dcc/admin/translation/documents/{doc_code}/override',                      TranslationAdminController::class, 'setDocumentOverride');
    $router->delete('/api/v1/dcc/admin/translation/documents/{doc_code}/override',                      TranslationAdminController::class, 'removeDocumentOverride');
    $router->post  ('/api/v1/dcc/admin/translation/documents/{doc_code}/retranslate',                   TranslationAdminController::class, 'retranslateDocument');
};
