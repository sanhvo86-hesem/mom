<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Api\Router;

/**
 * EQMS World-Class Route Surface — HESEM MOM v4.0
 *
 * Registers the complete REST surface for all 21 EQMS modules.
 * Every module follows the canonical pattern:
 *   POST   /api/v1/eqms/<module>/query
 *   GET    /api/v1/eqms/<module>/{id}
 *   POST   /api/v1/eqms/<module>
 *   PATCH  /api/v1/eqms/<module>/{id}
 *   GET    /api/v1/eqms/<module>/{id}/audit
 *   GET    /api/v1/eqms/<module>/{id}/comments
 *   POST   /api/v1/eqms/<module>/{id}/comments
 *   GET    /api/v1/eqms/<module>/{id}/attachments
 *   POST   /api/v1/eqms/<module>/{id}/attachments
 *   GET    /api/v1/eqms/<module>/{id}/relationships
 *   POST   /api/v1/eqms/<module>/{id}/relationships/link
 *   POST   /api/v1/eqms/<module>/{id}/relationships/unlink
 *   GET    /api/v1/eqms/<module>/{id}/available-actions
 *   POST   /api/v1/eqms/<module>/{id}/export
 *   POST   /api/v1/eqms/<module>/{id}/print-controlled-copy   (regulated modules only)
 *   GET    /api/v1/eqms/<module>/{id}/signatures              (regulated modules only)
 *   POST   /api/v1/eqms/<module>/{id}/signatures              (regulated modules only)
 *   POST   /api/v1/eqms/<module>/{id}/actions/{action}
 *
 * Standards: FDA 21 CFR Part 11, ISO 13485, AS9100D, IATF 16949,
 *            GAMP 5 (validation), ICH Q10 (batch release), ISO 31000 (risk)
 *
 * @since 4.0.0
 */
return static function (Router $router, string $dataDir): void {

    // ═══════════════════════════════════════════════════════════════════════════
    // MODULE M04-E: Customer Complaints (upgraded to eqms namespace)
    // ═══════════════════════════════════════════════════════════════════════════
    $router->post('/api/v1/eqms/customer-complaints/query',                EqmsComplaintsController::class, 'search');
    $router->get ('/api/v1/eqms/customer-complaints/metrics',              EqmsComplaintsController::class, 'metrics');
    $router->post('/api/v1/eqms/customer-complaints/lookup',               EqmsComplaintsController::class, 'lookup');
    $router->post('/api/v1/eqms/customer-complaints',                      EqmsComplaintsController::class, 'create');
    $router->get ('/api/v1/eqms/customer-complaints/{id}',                 EqmsComplaintsController::class, 'detail');
    $router->patch('/api/v1/eqms/customer-complaints/{id}',                EqmsComplaintsController::class, 'update');
    $router->get ('/api/v1/eqms/customer-complaints/{id}/audit',           EqmsComplaintsController::class, 'audit');
    $router->get ('/api/v1/eqms/customer-complaints/{id}/comments',        EqmsComplaintsController::class, 'comments');
    $router->post('/api/v1/eqms/customer-complaints/{id}/comments',        EqmsComplaintsController::class, 'comments');
    $router->get ('/api/v1/eqms/customer-complaints/{id}/attachments',     EqmsComplaintsController::class, 'attachments');
    $router->post('/api/v1/eqms/customer-complaints/{id}/attachments',     EqmsComplaintsController::class, 'attachments');
    $router->get ('/api/v1/eqms/customer-complaints/{id}/relationships',   EqmsComplaintsController::class, 'relationships');
    $router->post('/api/v1/eqms/customer-complaints/{id}/relationships/link',   EqmsComplaintsController::class, 'relationshipsLink');
    $router->post('/api/v1/eqms/customer-complaints/{id}/relationships/unlink', EqmsComplaintsController::class, 'relationshipsUnlink');
    $router->get ('/api/v1/eqms/customer-complaints/{id}/available-actions',    EqmsComplaintsController::class, 'availableActions');
    $router->get ('/api/v1/eqms/customer-complaints/{id}/signatures',      EqmsComplaintsController::class, 'signatures');
    $router->post('/api/v1/eqms/customer-complaints/{id}/signatures',      EqmsComplaintsController::class, 'signatures');
    $router->post('/api/v1/eqms/customer-complaints/{id}/export',          EqmsComplaintsController::class, 'export');
    $router->post('/api/v1/eqms/customer-complaints/export',               EqmsComplaintsController::class, 'exportBulk');
    $router->post('/api/v1/eqms/customer-complaints/{id}/actions/intake',            EqmsComplaintsController::class, 'actionIntake');
    $router->post('/api/v1/eqms/customer-complaints/{id}/actions/triage',            EqmsComplaintsController::class, 'actionTriage');
    $router->post('/api/v1/eqms/customer-complaints/{id}/actions/assign',            EqmsComplaintsController::class, 'actionAssign');
    $router->post('/api/v1/eqms/customer-complaints/{id}/actions/record-containment',EqmsComplaintsController::class, 'actionRecordContainment');
    $router->post('/api/v1/eqms/customer-complaints/{id}/actions/start-investigation',EqmsComplaintsController::class, 'actionStartInvestigation');
    $router->post('/api/v1/eqms/customer-complaints/{id}/actions/link-capa',         EqmsComplaintsController::class, 'actionLinkCapa');
    $router->post('/api/v1/eqms/customer-complaints/{id}/actions/initiate-field-action', EqmsComplaintsController::class, 'actionInitiateFieldAction');
    $router->post('/api/v1/eqms/customer-complaints/{id}/actions/issue-response',    EqmsComplaintsController::class, 'actionIssueResponse');
    $router->post('/api/v1/eqms/customer-complaints/{id}/actions/close',             EqmsComplaintsController::class, 'actionClose');
    $router->post('/api/v1/eqms/customer-complaints/{id}/actions/reopen',            EqmsComplaintsController::class, 'actionReopen');

    // ═══════════════════════════════════════════════════════════════════════════
    // MODULE NEW: Deviations / Quality Events
    // ═══════════════════════════════════════════════════════════════════════════
    $router->post('/api/v1/eqms/deviations/query',                         EqmsDeviationController::class, 'search');
    $router->get ('/api/v1/eqms/deviations/metrics',                       EqmsDeviationController::class, 'metrics');
    $router->post('/api/v1/eqms/deviations/lookup',                        EqmsDeviationController::class, 'lookup');
    $router->post('/api/v1/eqms/deviations',                               EqmsDeviationController::class, 'create');
    $router->get ('/api/v1/eqms/deviations/{id}',                          EqmsDeviationController::class, 'detail');
    $router->patch('/api/v1/eqms/deviations/{id}',                         EqmsDeviationController::class, 'update');
    $router->get ('/api/v1/eqms/deviations/{id}/audit',                    EqmsDeviationController::class, 'audit');
    $router->get ('/api/v1/eqms/deviations/{id}/comments',                 EqmsDeviationController::class, 'comments');
    $router->post('/api/v1/eqms/deviations/{id}/comments',                 EqmsDeviationController::class, 'comments');
    $router->get ('/api/v1/eqms/deviations/{id}/attachments',              EqmsDeviationController::class, 'attachments');
    $router->post('/api/v1/eqms/deviations/{id}/attachments',              EqmsDeviationController::class, 'attachments');
    $router->get ('/api/v1/eqms/deviations/{id}/relationships',            EqmsDeviationController::class, 'relationships');
    $router->post('/api/v1/eqms/deviations/{id}/relationships/link',       EqmsDeviationController::class, 'relationshipsLink');
    $router->post('/api/v1/eqms/deviations/{id}/relationships/unlink',     EqmsDeviationController::class, 'relationshipsUnlink');
    $router->get ('/api/v1/eqms/deviations/{id}/available-actions',        EqmsDeviationController::class, 'availableActions');
    $router->get ('/api/v1/eqms/deviations/{id}/signatures',               EqmsDeviationController::class, 'signatures');
    $router->post('/api/v1/eqms/deviations/{id}/signatures',               EqmsDeviationController::class, 'signatures');
    $router->post('/api/v1/eqms/deviations/{id}/export',                   EqmsDeviationController::class, 'export');
    $router->post('/api/v1/eqms/deviations/export',                        EqmsDeviationController::class, 'exportBulk');
    $router->post('/api/v1/eqms/deviations/{id}/actions/classify',             EqmsDeviationController::class, 'actionClassify');
    $router->post('/api/v1/eqms/deviations/{id}/actions/record-containment',   EqmsDeviationController::class, 'actionRecordContainment');
    $router->post('/api/v1/eqms/deviations/{id}/actions/start-investigation',  EqmsDeviationController::class, 'actionStartInvestigation');
    $router->post('/api/v1/eqms/deviations/{id}/actions/link-batch',           EqmsDeviationController::class, 'actionLinkBatch');
    $router->post('/api/v1/eqms/deviations/{id}/actions/link-change-control',  EqmsDeviationController::class, 'actionLinkChangeControl');
    $router->post('/api/v1/eqms/deviations/{id}/actions/link-capa',            EqmsDeviationController::class, 'actionLinkCapa');
    $router->post('/api/v1/eqms/deviations/{id}/actions/close',                EqmsDeviationController::class, 'actionClose');
    $router->post('/api/v1/eqms/deviations/{id}/actions/void',                 EqmsDeviationController::class, 'actionVoid');

    // ═══════════════════════════════════════════════════════════════════════════
    // MODULE M25-E: NCR / MRB (upgraded)
    // ═══════════════════════════════════════════════════════════════════════════
    $router->post('/api/v1/eqms/ncr/query',                                EqmsNcrController::class, 'search');
    $router->get ('/api/v1/eqms/ncr/metrics',                              EqmsNcrController::class, 'metrics');
    $router->post('/api/v1/eqms/ncr/lookup',                               EqmsNcrController::class, 'lookup');
    $router->post('/api/v1/eqms/ncr',                                      EqmsNcrController::class, 'create');
    $router->get ('/api/v1/eqms/ncr/{id}',                                 EqmsNcrController::class, 'detail');
    $router->patch('/api/v1/eqms/ncr/{id}',                                EqmsNcrController::class, 'update');
    $router->get ('/api/v1/eqms/ncr/{id}/audit',                           EqmsNcrController::class, 'audit');
    $router->get ('/api/v1/eqms/ncr/{id}/comments',                        EqmsNcrController::class, 'comments');
    $router->post('/api/v1/eqms/ncr/{id}/comments',                        EqmsNcrController::class, 'comments');
    $router->get ('/api/v1/eqms/ncr/{id}/attachments',                     EqmsNcrController::class, 'attachments');
    $router->post('/api/v1/eqms/ncr/{id}/attachments',                     EqmsNcrController::class, 'attachments');
    $router->get ('/api/v1/eqms/ncr/{id}/relationships',                   EqmsNcrController::class, 'relationships');
    $router->post('/api/v1/eqms/ncr/{id}/relationships/link',              EqmsNcrController::class, 'relationshipsLink');
    $router->post('/api/v1/eqms/ncr/{id}/relationships/unlink',            EqmsNcrController::class, 'relationshipsUnlink');
    $router->get ('/api/v1/eqms/ncr/{id}/available-actions',               EqmsNcrController::class, 'availableActions');
    $router->get ('/api/v1/eqms/ncr/{id}/signatures',                      EqmsNcrController::class, 'signatures');
    $router->post('/api/v1/eqms/ncr/{id}/signatures',                      EqmsNcrController::class, 'signatures');
    $router->post('/api/v1/eqms/ncr/{id}/export',                          EqmsNcrController::class, 'export');
    $router->post('/api/v1/eqms/ncr/export',                               EqmsNcrController::class, 'exportBulk');
    $router->post('/api/v1/eqms/ncr/{id}/actions/contain',                 EqmsNcrController::class, 'actionContain');
    $router->post('/api/v1/eqms/ncr/{id}/actions/investigate',             EqmsNcrController::class, 'actionInvestigate');
    $router->post('/api/v1/eqms/ncr/{id}/actions/submit-mrb',              EqmsNcrController::class, 'actionSubmitMrb');
    $router->post('/api/v1/eqms/ncr/{id}/actions/record-disposition',      EqmsNcrController::class, 'actionRecordDisposition');
    $router->post('/api/v1/eqms/ncr/{id}/actions/rework',                  EqmsNcrController::class, 'actionRework');
    $router->post('/api/v1/eqms/ncr/{id}/actions/repair',                  EqmsNcrController::class, 'actionRepair');
    $router->post('/api/v1/eqms/ncr/{id}/actions/use-as-is',               EqmsNcrController::class, 'actionUseAsIs');
    $router->post('/api/v1/eqms/ncr/{id}/actions/return-to-vendor',        EqmsNcrController::class, 'actionReturnToVendor');
    $router->post('/api/v1/eqms/ncr/{id}/actions/scrap',                   EqmsNcrController::class, 'actionScrap');
    $router->post('/api/v1/eqms/ncr/{id}/actions/close',                   EqmsNcrController::class, 'actionClose');
    $router->post('/api/v1/eqms/ncr/{id}/actions/reopen',                  EqmsNcrController::class, 'actionReopen');

    // ═══════════════════════════════════════════════════════════════════════════
    // MODULE M26-E: CAPA (upgraded)
    // ═══════════════════════════════════════════════════════════════════════════
    $router->post('/api/v1/eqms/capa/query',                               EqmsCapaController::class, 'search');
    $router->get ('/api/v1/eqms/capa/metrics',                             EqmsCapaController::class, 'metrics');
    $router->post('/api/v1/eqms/capa/lookup',                              EqmsCapaController::class, 'lookup');
    $router->post('/api/v1/eqms/capa',                                     EqmsCapaController::class, 'create');
    $router->get ('/api/v1/eqms/capa/{id}',                                EqmsCapaController::class, 'detail');
    $router->patch('/api/v1/eqms/capa/{id}',                               EqmsCapaController::class, 'update');
    $router->get ('/api/v1/eqms/capa/{id}/audit',                          EqmsCapaController::class, 'audit');
    $router->get ('/api/v1/eqms/capa/{id}/comments',                       EqmsCapaController::class, 'comments');
    $router->post('/api/v1/eqms/capa/{id}/comments',                       EqmsCapaController::class, 'comments');
    $router->get ('/api/v1/eqms/capa/{id}/attachments',                    EqmsCapaController::class, 'attachments');
    $router->post('/api/v1/eqms/capa/{id}/attachments',                    EqmsCapaController::class, 'attachments');
    $router->get ('/api/v1/eqms/capa/{id}/relationships',                  EqmsCapaController::class, 'relationships');
    $router->post('/api/v1/eqms/capa/{id}/relationships/link',             EqmsCapaController::class, 'relationshipsLink');
    $router->post('/api/v1/eqms/capa/{id}/relationships/unlink',           EqmsCapaController::class, 'relationshipsUnlink');
    $router->get ('/api/v1/eqms/capa/{id}/available-actions',              EqmsCapaController::class, 'availableActions');
    $router->get ('/api/v1/eqms/capa/{id}/signatures',                     EqmsCapaController::class, 'signatures');
    $router->post('/api/v1/eqms/capa/{id}/signatures',                     EqmsCapaController::class, 'signatures');
    $router->post('/api/v1/eqms/capa/{id}/export',                         EqmsCapaController::class, 'export');
    $router->post('/api/v1/eqms/capa/export',                              EqmsCapaController::class, 'exportBulk');
    $router->post('/api/v1/eqms/capa/{id}/actions/start-analysis',         EqmsCapaController::class, 'actionStartAnalysis');
    $router->post('/api/v1/eqms/capa/{id}/actions/record-root-cause',      EqmsCapaController::class, 'actionRecordRootCause');
    $router->post('/api/v1/eqms/capa/{id}/actions/add-action-plan',        EqmsCapaController::class, 'actionAddActionPlan');
    $router->post('/api/v1/eqms/capa/{id}/actions/assign-action',          EqmsCapaController::class, 'actionAssignAction');
    $router->post('/api/v1/eqms/capa/{id}/actions/submit-approval',        EqmsCapaController::class, 'actionSubmitApproval');
    $router->post('/api/v1/eqms/capa/{id}/actions/submit-verification',    EqmsCapaController::class, 'actionSubmitVerification');
    $router->post('/api/v1/eqms/capa/{id}/actions/record-effectiveness',   EqmsCapaController::class, 'actionRecordEffectiveness');
    $router->post('/api/v1/eqms/capa/{id}/actions/close',                  EqmsCapaController::class, 'actionClose');
    $router->post('/api/v1/eqms/capa/{id}/actions/cancel',                 EqmsCapaController::class, 'actionCancel');

    // ═══════════════════════════════════════════════════════════════════════════
    // MODULE NEW: Formal Change Control
    // ═══════════════════════════════════════════════════════════════════════════
    $router->post('/api/v1/eqms/change-controls/query',                    EqmsChangeControlController::class, 'search');
    $router->get ('/api/v1/eqms/change-controls/metrics',                  EqmsChangeControlController::class, 'metrics');
    $router->post('/api/v1/eqms/change-controls/lookup',                   EqmsChangeControlController::class, 'lookup');
    $router->post('/api/v1/eqms/change-controls',                          EqmsChangeControlController::class, 'create');
    $router->get ('/api/v1/eqms/change-controls/{id}',                     EqmsChangeControlController::class, 'detail');
    $router->patch('/api/v1/eqms/change-controls/{id}',                    EqmsChangeControlController::class, 'update');
    $router->get ('/api/v1/eqms/change-controls/{id}/audit',               EqmsChangeControlController::class, 'audit');
    $router->get ('/api/v1/eqms/change-controls/{id}/comments',            EqmsChangeControlController::class, 'comments');
    $router->post('/api/v1/eqms/change-controls/{id}/comments',            EqmsChangeControlController::class, 'comments');
    $router->get ('/api/v1/eqms/change-controls/{id}/attachments',         EqmsChangeControlController::class, 'attachments');
    $router->post('/api/v1/eqms/change-controls/{id}/attachments',         EqmsChangeControlController::class, 'attachments');
    $router->get ('/api/v1/eqms/change-controls/{id}/relationships',       EqmsChangeControlController::class, 'relationships');
    $router->post('/api/v1/eqms/change-controls/{id}/relationships/link',  EqmsChangeControlController::class, 'relationshipsLink');
    $router->post('/api/v1/eqms/change-controls/{id}/relationships/unlink',EqmsChangeControlController::class, 'relationshipsUnlink');
    $router->get ('/api/v1/eqms/change-controls/{id}/available-actions',   EqmsChangeControlController::class, 'availableActions');
    $router->get ('/api/v1/eqms/change-controls/{id}/signatures',          EqmsChangeControlController::class, 'signatures');
    $router->post('/api/v1/eqms/change-controls/{id}/signatures',          EqmsChangeControlController::class, 'signatures');
    $router->post('/api/v1/eqms/change-controls/{id}/export',              EqmsChangeControlController::class, 'export');
    $router->post('/api/v1/eqms/change-controls/export',                   EqmsChangeControlController::class, 'exportBulk');
    $router->post('/api/v1/eqms/change-controls/{id}/documents/link',      EqmsChangeControlController::class, 'documentsLink');
    $router->post('/api/v1/eqms/change-controls/{id}/training-impact/query', EqmsChangeControlController::class, 'trainingImpactQuery');
    $router->post('/api/v1/eqms/change-controls/{id}/actions/classify',         EqmsChangeControlController::class, 'actionClassify');
    $router->post('/api/v1/eqms/change-controls/{id}/actions/assess-impact',    EqmsChangeControlController::class, 'actionAssessImpact');
    $router->post('/api/v1/eqms/change-controls/{id}/actions/route-approval',   EqmsChangeControlController::class, 'actionRouteApproval');
    $router->post('/api/v1/eqms/change-controls/{id}/actions/approve',          EqmsChangeControlController::class, 'actionApprove');
    $router->post('/api/v1/eqms/change-controls/{id}/actions/launch-implementation', EqmsChangeControlController::class, 'actionLaunchImplementation');
    $router->post('/api/v1/eqms/change-controls/{id}/actions/verify-effectiveness',  EqmsChangeControlController::class, 'actionVerifyEffectiveness');
    $router->post('/api/v1/eqms/change-controls/{id}/actions/close',               EqmsChangeControlController::class, 'actionClose');

    // ═══════════════════════════════════════════════════════════════════════════
    // MODULE M13-E: Engineering Change (upgraded, aligned with change control)
    // ═══════════════════════════════════════════════════════════════════════════
    $router->post('/api/v1/eqms/engineering-change/query',                 EqmsEngineeringChangeController::class, 'search');
    $router->get ('/api/v1/eqms/engineering-change/metrics',               EqmsEngineeringChangeController::class, 'metrics');
    $router->post('/api/v1/eqms/engineering-change/lookup',                EqmsEngineeringChangeController::class, 'lookup');
    $router->post('/api/v1/eqms/engineering-change',                       EqmsEngineeringChangeController::class, 'create');
    $router->get ('/api/v1/eqms/engineering-change/{id}',                  EqmsEngineeringChangeController::class, 'detail');
    $router->patch('/api/v1/eqms/engineering-change/{id}',                 EqmsEngineeringChangeController::class, 'update');
    $router->get ('/api/v1/eqms/engineering-change/{id}/audit',            EqmsEngineeringChangeController::class, 'audit');
    $router->get ('/api/v1/eqms/engineering-change/{id}/comments',         EqmsEngineeringChangeController::class, 'comments');
    $router->post('/api/v1/eqms/engineering-change/{id}/comments',         EqmsEngineeringChangeController::class, 'comments');
    $router->get ('/api/v1/eqms/engineering-change/{id}/attachments',      EqmsEngineeringChangeController::class, 'attachments');
    $router->post('/api/v1/eqms/engineering-change/{id}/attachments',      EqmsEngineeringChangeController::class, 'attachments');
    $router->get ('/api/v1/eqms/engineering-change/{id}/relationships',    EqmsEngineeringChangeController::class, 'relationships');
    $router->post('/api/v1/eqms/engineering-change/{id}/relationships/link',   EqmsEngineeringChangeController::class, 'relationshipsLink');
    $router->post('/api/v1/eqms/engineering-change/{id}/relationships/unlink', EqmsEngineeringChangeController::class, 'relationshipsUnlink');
    $router->get ('/api/v1/eqms/engineering-change/{id}/available-actions',    EqmsEngineeringChangeController::class, 'availableActions');
    $router->get ('/api/v1/eqms/engineering-change/{id}/signatures',           EqmsEngineeringChangeController::class, 'signatures');
    $router->post('/api/v1/eqms/engineering-change/{id}/signatures',           EqmsEngineeringChangeController::class, 'signatures');
    $router->post('/api/v1/eqms/engineering-change/{id}/export',               EqmsEngineeringChangeController::class, 'export');
    $router->post('/api/v1/eqms/engineering-change/export',                    EqmsEngineeringChangeController::class, 'exportBulk');
    $router->post('/api/v1/eqms/engineering-change/{id}/actions/submit-assessment', EqmsEngineeringChangeController::class, 'actionSubmitAssessment');
    $router->post('/api/v1/eqms/engineering-change/{id}/actions/approve',           EqmsEngineeringChangeController::class, 'actionApprove');
    $router->post('/api/v1/eqms/engineering-change/{id}/actions/implement',         EqmsEngineeringChangeController::class, 'actionImplement');
    $router->post('/api/v1/eqms/engineering-change/{id}/actions/close',             EqmsEngineeringChangeController::class, 'actionClose');
    $router->post('/api/v1/eqms/engineering-change/{id}/actions/cancel',            EqmsEngineeringChangeController::class, 'actionCancel');

    // ═══════════════════════════════════════════════════════════════════════════
    // MODULE M29-E: Document Control / QualityDocs-grade (upgraded)
    // ═══════════════════════════════════════════════════════════════════════════
    $router->post('/api/v1/eqms/documents/query',                          EqmsDocumentsController::class, 'search');
    $router->get ('/api/v1/eqms/documents/metrics',                        EqmsDocumentsController::class, 'metrics');
    $router->post('/api/v1/eqms/documents/lookup',                         EqmsDocumentsController::class, 'lookup');
    $router->post('/api/v1/eqms/documents',                                EqmsDocumentsController::class, 'create');
    $router->get ('/api/v1/eqms/documents/{id}',                           EqmsDocumentsController::class, 'detail');
    $router->patch('/api/v1/eqms/documents/{id}',                          EqmsDocumentsController::class, 'update');
    $router->get ('/api/v1/eqms/documents/{id}/audit',                     EqmsDocumentsController::class, 'audit');
    $router->get ('/api/v1/eqms/documents/{id}/comments',                  EqmsDocumentsController::class, 'comments');
    $router->post('/api/v1/eqms/documents/{id}/comments',                  EqmsDocumentsController::class, 'comments');
    $router->get ('/api/v1/eqms/documents/{id}/attachments',               EqmsDocumentsController::class, 'attachments');
    $router->post('/api/v1/eqms/documents/{id}/attachments',               EqmsDocumentsController::class, 'attachments');
    $router->get ('/api/v1/eqms/documents/{id}/relationships',             EqmsDocumentsController::class, 'relationships');
    $router->post('/api/v1/eqms/documents/{id}/relationships/link',        EqmsDocumentsController::class, 'relationshipsLink');
    $router->post('/api/v1/eqms/documents/{id}/relationships/unlink',      EqmsDocumentsController::class, 'relationshipsUnlink');
    $router->get ('/api/v1/eqms/documents/{id}/available-actions',         EqmsDocumentsController::class, 'availableActions');
    $router->get ('/api/v1/eqms/documents/{id}/signatures',                EqmsDocumentsController::class, 'signatures');
    $router->post('/api/v1/eqms/documents/{id}/signatures',                EqmsDocumentsController::class, 'signatures');
    $router->post('/api/v1/eqms/documents/{id}/export',                    EqmsDocumentsController::class, 'export');
    $router->post('/api/v1/eqms/documents/export',                         EqmsDocumentsController::class, 'exportBulk');
    $router->get ('/api/v1/eqms/documents/{id}/controlled-copies',         EqmsDocumentsController::class, 'controlledCopies');
    $router->post('/api/v1/eqms/documents/{id}/controlled-copies',         EqmsDocumentsController::class, 'createControlledCopy');
    $router->post('/api/v1/eqms/documents/{id}/acknowledgements/query',    EqmsDocumentsController::class, 'acknowledgementsQuery');
    $router->post('/api/v1/eqms/documents/{id}/change-controls/link',      EqmsDocumentsController::class, 'changeControlsLink');
    $router->post('/api/v1/eqms/documents/{id}/actions/check-out',         EqmsDocumentsController::class, 'actionCheckOut');
    $router->post('/api/v1/eqms/documents/{id}/actions/check-in',          EqmsDocumentsController::class, 'actionCheckIn');
    $router->post('/api/v1/eqms/documents/{id}/actions/submit-review',     EqmsDocumentsController::class, 'actionSubmitReview');
    $router->post('/api/v1/eqms/documents/{id}/actions/approve',           EqmsDocumentsController::class, 'actionApprove');
    $router->post('/api/v1/eqms/documents/{id}/actions/release',           EqmsDocumentsController::class, 'actionRelease');
    $router->post('/api/v1/eqms/documents/{id}/actions/supersede',         EqmsDocumentsController::class, 'actionSupersede');
    $router->post('/api/v1/eqms/documents/{id}/actions/obsolete',          EqmsDocumentsController::class, 'actionObsolete');
    $router->post('/api/v1/eqms/documents/{id}/actions/request-acknowledgement', EqmsDocumentsController::class, 'actionRequestAcknowledgement');
    $router->post('/api/v1/eqms/documents/{id}/actions/record-acknowledgement',  EqmsDocumentsController::class, 'actionRecordAcknowledgement');

    // ═══════════════════════════════════════════════════════════════════════════
    // MODULE M28-E: Training & Competency (upgraded)
    // ═══════════════════════════════════════════════════════════════════════════
    $router->post('/api/v1/eqms/training/query',                           EqmsTrainingController::class, 'search');
    $router->get ('/api/v1/eqms/training/metrics',                         EqmsTrainingController::class, 'metrics');
    $router->post('/api/v1/eqms/training/lookup',                          EqmsTrainingController::class, 'lookup');
    $router->get ('/api/v1/eqms/training/matrix',                          EqmsTrainingController::class, 'matrix');
    $router->get ('/api/v1/eqms/training/curricula',                       EqmsTrainingController::class, 'curricula');
    $router->post('/api/v1/eqms/training/curricula/{id}/assignments/query', EqmsTrainingController::class, 'curriculaAssignmentsQuery');
    $router->post('/api/v1/eqms/training',                                 EqmsTrainingController::class, 'create');
    $router->get ('/api/v1/eqms/training/{id}',                            EqmsTrainingController::class, 'detail');
    $router->patch('/api/v1/eqms/training/{id}',                           EqmsTrainingController::class, 'update');
    $router->get ('/api/v1/eqms/training/{id}/audit',                      EqmsTrainingController::class, 'audit');
    $router->get ('/api/v1/eqms/training/{id}/comments',                   EqmsTrainingController::class, 'comments');
    $router->post('/api/v1/eqms/training/{id}/comments',                   EqmsTrainingController::class, 'comments');
    $router->get ('/api/v1/eqms/training/{id}/attachments',                EqmsTrainingController::class, 'attachments');
    $router->post('/api/v1/eqms/training/{id}/attachments',                EqmsTrainingController::class, 'attachments');
    $router->get ('/api/v1/eqms/training/{id}/available-actions',          EqmsTrainingController::class, 'availableActions');
    $router->post('/api/v1/eqms/training/{id}/export',                     EqmsTrainingController::class, 'export');
    $router->post('/api/v1/eqms/training/export',                          EqmsTrainingController::class, 'exportBulk');
    $router->post('/api/v1/eqms/training/{id}/actions/assign',             EqmsTrainingController::class, 'actionAssign');
    $router->post('/api/v1/eqms/training/{id}/actions/launch-session',     EqmsTrainingController::class, 'actionLaunchSession');
    $router->post('/api/v1/eqms/training/{id}/actions/record-completion',  EqmsTrainingController::class, 'actionRecordCompletion');
    $router->post('/api/v1/eqms/training/{id}/actions/record-assessment',  EqmsTrainingController::class, 'actionRecordAssessment');
    $router->post('/api/v1/eqms/training/{id}/actions/verify-effectiveness', EqmsTrainingController::class, 'actionVerifyEffectiveness');
    $router->post('/api/v1/eqms/training/{id}/actions/expire',             EqmsTrainingController::class, 'actionExpire');
    $router->post('/api/v1/eqms/training/{id}/actions/waive',              EqmsTrainingController::class, 'actionWaive');

    // ═══════════════════════════════════════════════════════════════════════════
    // MODULE M27-E: Audit Management (upgraded)
    // ═══════════════════════════════════════════════════════════════════════════
    $router->post('/api/v1/eqms/audits/query',                             EqmsAuditsController::class, 'search');
    $router->get ('/api/v1/eqms/audits/metrics',                           EqmsAuditsController::class, 'metrics');
    $router->post('/api/v1/eqms/audits/lookup',                            EqmsAuditsController::class, 'lookup');
    $router->post('/api/v1/eqms/audits',                                   EqmsAuditsController::class, 'create');
    $router->get ('/api/v1/eqms/audits/{id}',                              EqmsAuditsController::class, 'detail');
    $router->patch('/api/v1/eqms/audits/{id}',                             EqmsAuditsController::class, 'update');
    $router->get ('/api/v1/eqms/audits/{id}/audit',                        EqmsAuditsController::class, 'audit');
    $router->get ('/api/v1/eqms/audits/{id}/comments',                     EqmsAuditsController::class, 'comments');
    $router->post('/api/v1/eqms/audits/{id}/comments',                     EqmsAuditsController::class, 'comments');
    $router->get ('/api/v1/eqms/audits/{id}/attachments',                  EqmsAuditsController::class, 'attachments');
    $router->post('/api/v1/eqms/audits/{id}/attachments',                  EqmsAuditsController::class, 'attachments');
    $router->get ('/api/v1/eqms/audits/{id}/available-actions',            EqmsAuditsController::class, 'availableActions');
    $router->get ('/api/v1/eqms/audits/{id}/signatures',                   EqmsAuditsController::class, 'signatures');
    $router->post('/api/v1/eqms/audits/{id}/signatures',                   EqmsAuditsController::class, 'signatures');
    $router->post('/api/v1/eqms/audits/{id}/export',                       EqmsAuditsController::class, 'export');
    $router->post('/api/v1/eqms/audits/export',                            EqmsAuditsController::class, 'exportBulk');
    $router->post('/api/v1/eqms/audits/{id}/checklists/query',             EqmsAuditsController::class, 'checklistsQuery');
    $router->post('/api/v1/eqms/audits/{id}/findings/query',               EqmsAuditsController::class, 'findingsQuery');
    $router->post('/api/v1/eqms/audits/{id}/actions/schedule',             EqmsAuditsController::class, 'actionSchedule');
    $router->post('/api/v1/eqms/audits/{id}/actions/start',                EqmsAuditsController::class, 'actionStart');
    $router->post('/api/v1/eqms/audits/{id}/actions/record-finding',       EqmsAuditsController::class, 'actionRecordFinding');
    $router->post('/api/v1/eqms/audits/{id}/actions/issue-report',         EqmsAuditsController::class, 'actionIssueReport');
    $router->post('/api/v1/eqms/audits/{id}/actions/assign-response',      EqmsAuditsController::class, 'actionAssignResponse');
    $router->post('/api/v1/eqms/audits/{id}/actions/close-finding',        EqmsAuditsController::class, 'actionCloseFinding');
    $router->post('/api/v1/eqms/audits/{id}/actions/close-audit',          EqmsAuditsController::class, 'actionCloseAudit');

    // ═══════════════════════════════════════════════════════════════════════════
    // MODULE NEW: Supplier Quality Network
    // ═══════════════════════════════════════════════════════════════════════════
    $router->post('/api/v1/eqms/suppliers/query',                          EqmsSuppliersController::class, 'search');
    $router->get ('/api/v1/eqms/suppliers/metrics',                        EqmsSuppliersController::class, 'metrics');
    $router->post('/api/v1/eqms/suppliers',                                EqmsSuppliersController::class, 'create');
    $router->get ('/api/v1/eqms/suppliers/{id}',                           EqmsSuppliersController::class, 'detail');
    $router->patch('/api/v1/eqms/suppliers/{id}',                          EqmsSuppliersController::class, 'update');
    $router->get ('/api/v1/eqms/suppliers/{id}/audit',                     EqmsSuppliersController::class, 'audit');
    $router->get ('/api/v1/eqms/suppliers/{id}/scorecards',                EqmsSuppliersController::class, 'scorecards');
    $router->get ('/api/v1/eqms/suppliers/{id}/qualifications',            EqmsSuppliersController::class, 'qualifications');
    $router->get ('/api/v1/eqms/suppliers/{id}/quality-agreements',                                              EqmsSuppliersController::class, 'qualityAgreements');
    $router->post('/api/v1/eqms/suppliers/{id}/quality-agreements',                                              EqmsSuppliersController::class, 'createQualityAgreement');
    $router->post('/api/v1/eqms/suppliers/{id}/quality-agreements/{agreementId}/actions/acknowledge',            EqmsSuppliersController::class, 'agreementActionAcknowledge');
    $router->post('/api/v1/eqms/suppliers/{id}/quality-agreements/{agreementId}/actions/expire',                 EqmsSuppliersController::class, 'agreementActionExpire');
    $router->get ('/api/v1/eqms/suppliers/{id}/deviations',                EqmsSuppliersController::class, 'deviations');
    $router->get ('/api/v1/eqms/suppliers/{id}/scars',                     EqmsSuppliersController::class, 'scars');
    $router->post('/api/v1/eqms/suppliers/{id}/actions/qualify',           EqmsSuppliersController::class, 'actionQualify');
    $router->post('/api/v1/eqms/suppliers/{id}/actions/disqualify',        EqmsSuppliersController::class, 'actionDisqualify');
    $router->post('/api/v1/eqms/suppliers/export',                         EqmsSuppliersController::class, 'exportBulk');

    // ═══════════════════════════════════════════════════════════════════════════
    // MODULE NEW: Supplier Audits + SCAR
    // ═══════════════════════════════════════════════════════════════════════════
    $router->post('/api/v1/eqms/supplier-audits/query',                    EqmsSupplierAuditsController::class, 'search');
    $router->get ('/api/v1/eqms/supplier-audits/metrics',                  EqmsSupplierAuditsController::class, 'metrics');
    $router->post('/api/v1/eqms/supplier-audits',                          EqmsSupplierAuditsController::class, 'create');
    $router->get ('/api/v1/eqms/supplier-audits/{id}',                     EqmsSupplierAuditsController::class, 'detail');
    $router->patch('/api/v1/eqms/supplier-audits/{id}',                    EqmsSupplierAuditsController::class, 'update');
    $router->get ('/api/v1/eqms/supplier-audits/{id}/audit',               EqmsSupplierAuditsController::class, 'audit');
    $router->get ('/api/v1/eqms/supplier-audits/{id}/available-actions',   EqmsSupplierAuditsController::class, 'availableActions');
    $router->post('/api/v1/eqms/supplier-audits/{id}/export',              EqmsSupplierAuditsController::class, 'export');
    $router->post('/api/v1/eqms/supplier-audits/{id}/actions/schedule',    EqmsSupplierAuditsController::class, 'actionSchedule');
    $router->post('/api/v1/eqms/supplier-audits/{id}/actions/start',       EqmsSupplierAuditsController::class, 'actionStart');
    $router->post('/api/v1/eqms/supplier-audits/{id}/actions/record-finding', EqmsSupplierAuditsController::class, 'actionRecordFinding');
    $router->post('/api/v1/eqms/supplier-audits/{id}/actions/issue-scar',  EqmsSupplierAuditsController::class, 'actionIssueScar');
    $router->post('/api/v1/eqms/supplier-audits/{id}/actions/close',       EqmsSupplierAuditsController::class, 'actionClose');

    // SCAR sub-module
    $router->post('/api/v1/eqms/scars/query',                              EqmsSupplierAuditsController::class, 'scarQuery');
    $router->get ('/api/v1/eqms/scars/metrics',                            EqmsSupplierAuditsController::class, 'scarMetrics');
    $router->post('/api/v1/eqms/scars',                                    EqmsSupplierAuditsController::class, 'scarCreate');
    $router->get ('/api/v1/eqms/scars/{id}',                               EqmsSupplierAuditsController::class, 'scarDetail');
    $router->patch('/api/v1/eqms/scars/{id}',                              EqmsSupplierAuditsController::class, 'scarUpdate');
    $router->get ('/api/v1/eqms/scars/{id}/audit',                         EqmsSupplierAuditsController::class, 'scarAudit');
    $router->get ('/api/v1/eqms/scars/{id}/signatures',                    EqmsSupplierAuditsController::class, 'scarSignatures');
    $router->post('/api/v1/eqms/scars/{id}/signatures',                    EqmsSupplierAuditsController::class, 'scarSignatures');
    $router->post('/api/v1/eqms/scars/{id}/export',                        EqmsSupplierAuditsController::class, 'scarExport');
    $router->post('/api/v1/eqms/scars/export',                             EqmsSupplierAuditsController::class, 'scarExportBulk');
    $router->post('/api/v1/eqms/scars/{id}/actions/assign',                EqmsSupplierAuditsController::class, 'scarActionAssign');
    $router->post('/api/v1/eqms/scars/{id}/actions/submit-response',       EqmsSupplierAuditsController::class, 'scarActionSubmitResponse');
    $router->post('/api/v1/eqms/scars/{id}/actions/verify-effectiveness',  EqmsSupplierAuditsController::class, 'scarActionVerifyEffectiveness');
    $router->post('/api/v1/eqms/scars/{id}/actions/close',                 EqmsSupplierAuditsController::class, 'scarActionClose');

    // ═══════════════════════════════════════════════════════════════════════════
    // MODULE NEW: Quality Risk Management + FMEA
    // ═══════════════════════════════════════════════════════════════════════════
    $router->post('/api/v1/eqms/risks/query',                              EqmsRisksController::class, 'search');
    $router->get ('/api/v1/eqms/risks/metrics',                            EqmsRisksController::class, 'metrics');
    $router->get ('/api/v1/eqms/risks/heatmap',                            EqmsRisksController::class, 'heatmap');
    $router->post('/api/v1/eqms/risks/lookup',                             EqmsRisksController::class, 'lookup');
    $router->post('/api/v1/eqms/risks',                                    EqmsRisksController::class, 'create');
    $router->get ('/api/v1/eqms/risks/{id}',                               EqmsRisksController::class, 'detail');
    $router->patch('/api/v1/eqms/risks/{id}',                              EqmsRisksController::class, 'update');
    $router->get ('/api/v1/eqms/risks/{id}/audit',                         EqmsRisksController::class, 'audit');
    $router->get ('/api/v1/eqms/risks/{id}/comments',                      EqmsRisksController::class, 'comments');
    $router->post('/api/v1/eqms/risks/{id}/comments',                      EqmsRisksController::class, 'comments');
    $router->get ('/api/v1/eqms/risks/{id}/available-actions',             EqmsRisksController::class, 'availableActions');
    $router->get ('/api/v1/eqms/risks/{id}/signatures',                    EqmsRisksController::class, 'signatures');
    $router->post('/api/v1/eqms/risks/{id}/signatures',                    EqmsRisksController::class, 'signatures');
    $router->post('/api/v1/eqms/risks/{id}/export',                        EqmsRisksController::class, 'export');
    $router->post('/api/v1/eqms/risks/export',                             EqmsRisksController::class, 'exportBulk');
    $router->post('/api/v1/eqms/risks/{id}/actions/assess',                EqmsRisksController::class, 'actionAssess');
    $router->post('/api/v1/eqms/risks/{id}/actions/add-control',           EqmsRisksController::class, 'actionAddControl');
    $router->post('/api/v1/eqms/risks/{id}/actions/verify-control',        EqmsRisksController::class, 'actionVerifyControl');
    $router->post('/api/v1/eqms/risks/{id}/actions/accept-residual-risk',  EqmsRisksController::class, 'actionAcceptResidualRisk');
    $router->post('/api/v1/eqms/risks/{id}/actions/review',                EqmsRisksController::class, 'actionReview');

    // FMEA sub-module (world-class surface on top of FmeaController legacy)
    $router->post('/api/v1/eqms/fmea/query',                               EqmsRisksController::class, 'fmeaQuery');
    $router->get ('/api/v1/eqms/fmea/metrics',                             EqmsRisksController::class, 'fmeaMetrics');
    $router->post('/api/v1/eqms/fmea',                                     EqmsRisksController::class, 'fmeaCreate');
    $router->get ('/api/v1/eqms/fmea/{id}',                                EqmsRisksController::class, 'fmeaDetail');
    $router->patch('/api/v1/eqms/fmea/{id}',                               EqmsRisksController::class, 'fmeaUpdate');
    $router->get ('/api/v1/eqms/fmea/{id}/audit',                          EqmsRisksController::class, 'fmeaAudit');
    $router->get ('/api/v1/eqms/fmea/{id}/signatures',                     EqmsRisksController::class, 'fmeaSignatures');
    $router->post('/api/v1/eqms/fmea/{id}/signatures',                     EqmsRisksController::class, 'fmeaSignatures');
    $router->post('/api/v1/eqms/fmea/{id}/export',                         EqmsRisksController::class, 'fmeaExport');
    $router->post('/api/v1/eqms/fmea/export',                              EqmsRisksController::class, 'fmeaExportBulk');
    $router->post('/api/v1/eqms/fmea/{id}/actions/recalculate-rpn',        EqmsRisksController::class, 'fmeaActionRecalculateRpn');
    $router->post('/api/v1/eqms/fmea/{id}/actions/approve',                EqmsRisksController::class, 'fmeaActionApprove');

    // ═══════════════════════════════════════════════════════════════════════════
    // MODULE M21-E: Calibration + MSA (upgraded with MSA surface)
    // ═══════════════════════════════════════════════════════════════════════════
    $router->post('/api/v1/eqms/calibration/query',                        EqmsCalibrationController::class, 'search');
    $router->get ('/api/v1/eqms/calibration/metrics',                      EqmsCalibrationController::class, 'metrics');
    $router->post('/api/v1/eqms/calibration/lookup',                       EqmsCalibrationController::class, 'lookup');
    $router->post('/api/v1/eqms/calibration',                              EqmsCalibrationController::class, 'create');
    $router->get ('/api/v1/eqms/calibration/{id}',                         EqmsCalibrationController::class, 'detail');
    $router->patch('/api/v1/eqms/calibration/{id}',                        EqmsCalibrationController::class, 'update');
    $router->get ('/api/v1/eqms/calibration/{id}/audit',                   EqmsCalibrationController::class, 'audit');
    $router->get ('/api/v1/eqms/calibration/{id}/signatures',              EqmsCalibrationController::class, 'signatures');
    $router->post('/api/v1/eqms/calibration/{id}/signatures',              EqmsCalibrationController::class, 'signatures');
    $router->get ('/api/v1/eqms/calibration/{id}/available-actions',       EqmsCalibrationController::class, 'availableActions');
    $router->post('/api/v1/eqms/calibration/{id}/export',                  EqmsCalibrationController::class, 'export');
    $router->post('/api/v1/eqms/calibration/export',                       EqmsCalibrationController::class, 'exportBulk');
    $router->post('/api/v1/eqms/calibration/{id}/actions/start',           EqmsCalibrationController::class, 'actionStart');
    $router->post('/api/v1/eqms/calibration/{id}/actions/record-result',   EqmsCalibrationController::class, 'actionRecordResult');
    $router->post('/api/v1/eqms/calibration/{id}/actions/submit-review',   EqmsCalibrationController::class, 'actionSubmitReview');
    $router->post('/api/v1/eqms/calibration/{id}/actions/approve',         EqmsCalibrationController::class, 'actionApprove');
    $router->post('/api/v1/eqms/calibration/{id}/actions/declare-oot',     EqmsCalibrationController::class, 'actionDeclareOot');
    $router->post('/api/v1/eqms/calibration/{id}/actions/close',           EqmsCalibrationController::class, 'actionClose');

    // MSA sub-module
    $router->post('/api/v1/eqms/msa/query',                                EqmsCalibrationController::class, 'msaQuery');
    $router->get ('/api/v1/eqms/msa/metrics',                              EqmsCalibrationController::class, 'msaMetrics');
    $router->post('/api/v1/eqms/msa',                                      EqmsCalibrationController::class, 'msaCreate');
    $router->get ('/api/v1/eqms/msa/{id}',                                 EqmsCalibrationController::class, 'msaDetail');
    $router->patch('/api/v1/eqms/msa/{id}',                                EqmsCalibrationController::class, 'msaUpdate');
    $router->get ('/api/v1/eqms/msa/{id}/audit',                           EqmsCalibrationController::class, 'msaAudit');
    $router->get ('/api/v1/eqms/msa/{id}/signatures',                      EqmsCalibrationController::class, 'msaSignatures');
    $router->post('/api/v1/eqms/msa/{id}/signatures',                      EqmsCalibrationController::class, 'msaSignatures');
    $router->post('/api/v1/eqms/msa/{id}/export',                          EqmsCalibrationController::class, 'msaExport');
    $router->post('/api/v1/eqms/msa/export',                               EqmsCalibrationController::class, 'msaExportBulk');
    $router->post('/api/v1/eqms/msa/{id}/actions/record-study',            EqmsCalibrationController::class, 'msaActionRecordStudy');
    $router->post('/api/v1/eqms/msa/{id}/actions/approve',                 EqmsCalibrationController::class, 'msaActionApprove');

    // ═══════════════════════════════════════════════════════════════════════════
    // MODULE M22-E / M23-E: IQC + In-Process Inspection (hardened existing)
    // ═══════════════════════════════════════════════════════════════════════════
    $router->post('/api/v1/mes/quality/iqc/query',                         EqmsInspectionController::class, 'iqcQuery');
    $router->get ('/api/v1/mes/quality/iqc/metrics',                       EqmsInspectionController::class, 'iqcMetrics');
    $router->post('/api/v1/mes/quality/iqc/lookup',                        EqmsInspectionController::class, 'iqcLookup');
    $router->get ('/api/v1/mes/quality/iqc/{id}',                          EqmsInspectionController::class, 'iqcDetail');
    $router->patch('/api/v1/mes/quality/iqc/{id}',                         EqmsInspectionController::class, 'iqcUpdate');
    $router->get ('/api/v1/mes/quality/iqc/{id}/audit',                    EqmsInspectionController::class, 'iqcAudit');
    $router->get ('/api/v1/mes/quality/iqc/{id}/signatures',               EqmsInspectionController::class, 'iqcSignatures');
    $router->post('/api/v1/mes/quality/iqc/{id}/signatures',               EqmsInspectionController::class, 'iqcSignatures');
    $router->post('/api/v1/mes/quality/iqc/{id}/export',                   EqmsInspectionController::class, 'iqcExport');
    $router->post('/api/v1/mes/quality/iqc/export',                        EqmsInspectionController::class, 'iqcExportBulk');
    $router->post('/api/v1/mes/quality/iqc/{id}/actions/start',            EqmsInspectionController::class, 'iqcActionStart');
    $router->post('/api/v1/mes/quality/iqc/{id}/actions/record-result',    EqmsInspectionController::class, 'iqcActionRecordResult');
    $router->post('/api/v1/mes/quality/iqc/{id}/actions/submit-review',    EqmsInspectionController::class, 'iqcActionSubmitReview');
    $router->post('/api/v1/mes/quality/iqc/{id}/actions/accept',           EqmsInspectionController::class, 'iqcActionAccept');
    $router->post('/api/v1/mes/quality/iqc/{id}/actions/reject',           EqmsInspectionController::class, 'iqcActionReject');
    $router->post('/api/v1/mes/quality/iqc/{id}/actions/hold',             EqmsInspectionController::class, 'iqcActionHold');
    $router->post('/api/v1/mes/quality/iqc/{id}/actions/void',             EqmsInspectionController::class, 'iqcActionVoid');

    $router->post('/api/v1/mes/quality/inprocess/query',                   EqmsInspectionController::class, 'inprocessQuery');
    $router->get ('/api/v1/mes/quality/inprocess/metrics',                 EqmsInspectionController::class, 'inprocessMetrics');
    $router->post('/api/v1/mes/quality/inprocess/lookup',                  EqmsInspectionController::class, 'inprocessLookup');
    $router->get ('/api/v1/mes/quality/inprocess/{id}',                    EqmsInspectionController::class, 'inprocessDetail');
    $router->patch('/api/v1/mes/quality/inprocess/{id}',                   EqmsInspectionController::class, 'inprocessUpdate');
    $router->get ('/api/v1/mes/quality/inprocess/{id}/audit',              EqmsInspectionController::class, 'inprocessAudit');
    $router->post('/api/v1/mes/quality/inprocess/{id}/export',             EqmsInspectionController::class, 'inprocessExport');
    $router->post('/api/v1/mes/quality/inprocess/{id}/actions/start',            EqmsInspectionController::class, 'inprocessActionStart');
    $router->post('/api/v1/mes/quality/inprocess/{id}/actions/record-value',     EqmsInspectionController::class, 'inprocessActionRecordValue');
    $router->post('/api/v1/mes/quality/inprocess/{id}/actions/flag-nonconformance', EqmsInspectionController::class, 'inprocessActionFlagNc');
    $router->post('/api/v1/mes/quality/inprocess/{id}/actions/submit-review',    EqmsInspectionController::class, 'inprocessActionSubmitReview');
    $router->post('/api/v1/mes/quality/inprocess/{id}/actions/accept',           EqmsInspectionController::class, 'inprocessActionAccept');
    $router->post('/api/v1/mes/quality/inprocess/{id}/actions/reject',           EqmsInspectionController::class, 'inprocessActionReject');
    $router->post('/api/v1/mes/quality/inprocess/{id}/actions/hold',             EqmsInspectionController::class, 'inprocessActionHold');

    // ═══════════════════════════════════════════════════════════════════════════
    // MODULE M24-E: SPC / Control Charts (hardened + create-deviation)
    // ═══════════════════════════════════════════════════════════════════════════
    $router->post('/api/v1/mes/quality/spc/query',                         EqmsSpcController::class, 'search');
    $router->get ('/api/v1/mes/quality/spc/metrics',                       EqmsSpcController::class, 'metrics');
    $router->post('/api/v1/mes/quality/spc/lookup',                        EqmsSpcController::class, 'lookup');
    $router->get ('/api/v1/mes/quality/spc/{id}',                          EqmsSpcController::class, 'detail');
    $router->patch('/api/v1/mes/quality/spc/{id}',                         EqmsSpcController::class, 'update');
    $router->get ('/api/v1/mes/quality/spc/{id}/audit',                    EqmsSpcController::class, 'audit');
    $router->post('/api/v1/mes/quality/spc/{id}/export',                   EqmsSpcController::class, 'export');
    $router->post('/api/v1/mes/quality/spc/export',                        EqmsSpcController::class, 'exportBulk');
    $router->post('/api/v1/mes/quality/spc/{id}/actions/recalculate-limits',    EqmsSpcController::class, 'actionRecalculateLimits');
    $router->post('/api/v1/mes/quality/spc/{id}/actions/acknowledge-violation', EqmsSpcController::class, 'actionAcknowledgeViolation');
    $router->post('/api/v1/mes/quality/spc/{id}/actions/create-deviation',      EqmsSpcController::class, 'actionCreateDeviation');

    // ═══════════════════════════════════════════════════════════════════════════
    // MODULE NEW: OOS / OOT / Lab Investigation
    // ═══════════════════════════════════════════════════════════════════════════
    $router->post('/api/v1/eqms/lab-investigations/query',                 EqmsLabInvestigationsController::class, 'search');
    $router->get ('/api/v1/eqms/lab-investigations/metrics',               EqmsLabInvestigationsController::class, 'metrics');
    $router->post('/api/v1/eqms/lab-investigations/lookup',                EqmsLabInvestigationsController::class, 'lookup');
    $router->post('/api/v1/eqms/lab-investigations',                       EqmsLabInvestigationsController::class, 'create');
    $router->get ('/api/v1/eqms/lab-investigations/{id}',                  EqmsLabInvestigationsController::class, 'detail');
    $router->patch('/api/v1/eqms/lab-investigations/{id}',                 EqmsLabInvestigationsController::class, 'update');
    $router->get ('/api/v1/eqms/lab-investigations/{id}/audit',            EqmsLabInvestigationsController::class, 'audit');
    $router->get ('/api/v1/eqms/lab-investigations/{id}/comments',         EqmsLabInvestigationsController::class, 'comments');
    $router->post('/api/v1/eqms/lab-investigations/{id}/comments',         EqmsLabInvestigationsController::class, 'comments');
    $router->get ('/api/v1/eqms/lab-investigations/{id}/attachments',      EqmsLabInvestigationsController::class, 'attachments');
    $router->post('/api/v1/eqms/lab-investigations/{id}/attachments',      EqmsLabInvestigationsController::class, 'attachments');
    $router->get ('/api/v1/eqms/lab-investigations/{id}/relationships',    EqmsLabInvestigationsController::class, 'relationships');
    $router->post('/api/v1/eqms/lab-investigations/{id}/relationships/link',    EqmsLabInvestigationsController::class, 'relationshipsLink');
    $router->post('/api/v1/eqms/lab-investigations/{id}/relationships/unlink',  EqmsLabInvestigationsController::class, 'relationshipsUnlink');
    $router->get ('/api/v1/eqms/lab-investigations/{id}/available-actions',     EqmsLabInvestigationsController::class, 'availableActions');
    $router->get ('/api/v1/eqms/lab-investigations/{id}/signatures',            EqmsLabInvestigationsController::class, 'signatures');
    $router->post('/api/v1/eqms/lab-investigations/{id}/signatures',            EqmsLabInvestigationsController::class, 'signatures');
    $router->post('/api/v1/eqms/lab-investigations/{id}/export',           EqmsLabInvestigationsController::class, 'export');
    $router->post('/api/v1/eqms/lab-investigations/export',                EqmsLabInvestigationsController::class, 'exportBulk');
    $router->post('/api/v1/eqms/lab-investigations/{id}/actions/intake-oos',     EqmsLabInvestigationsController::class, 'actionIntakeOos');
    $router->post('/api/v1/eqms/lab-investigations/{id}/actions/intake-oot',     EqmsLabInvestigationsController::class, 'actionIntakeOot');
    $router->post('/api/v1/eqms/lab-investigations/{id}/actions/start-phase1',   EqmsLabInvestigationsController::class, 'actionStartPhase1');
    $router->post('/api/v1/eqms/lab-investigations/{id}/actions/start-phase2',   EqmsLabInvestigationsController::class, 'actionStartPhase2');
    $router->post('/api/v1/eqms/lab-investigations/{id}/actions/request-retest', EqmsLabInvestigationsController::class, 'actionRequestRetest');
    $router->post('/api/v1/eqms/lab-investigations/{id}/actions/request-resample', EqmsLabInvestigationsController::class, 'actionRequestResample');
    $router->post('/api/v1/eqms/lab-investigations/{id}/actions/link-capa',      EqmsLabInvestigationsController::class, 'actionLinkCapa');
    $router->post('/api/v1/eqms/lab-investigations/{id}/actions/close',          EqmsLabInvestigationsController::class, 'actionClose');

    // ═══════════════════════════════════════════════════════════════════════════
    // MODULE NEW: Batch Release / Disposition
    // ═══════════════════════════════════════════════════════════════════════════
    $router->post('/api/v1/eqms/batch-release/query',                      EqmsBatchReleaseController::class, 'search');
    $router->get ('/api/v1/eqms/batch-release/metrics',                    EqmsBatchReleaseController::class, 'metrics');
    $router->post('/api/v1/eqms/batch-release/lookup',                     EqmsBatchReleaseController::class, 'lookup');
    $router->post('/api/v1/eqms/batch-release',                            EqmsBatchReleaseController::class, 'create');
    $router->get ('/api/v1/eqms/batch-release/{id}',                       EqmsBatchReleaseController::class, 'detail');
    $router->patch('/api/v1/eqms/batch-release/{id}',                      EqmsBatchReleaseController::class, 'update');
    $router->get ('/api/v1/eqms/batch-release/{id}/release-package',       EqmsBatchReleaseController::class, 'releasePackage');
    $router->get ('/api/v1/eqms/batch-release/{id}/audit',                 EqmsBatchReleaseController::class, 'audit');
    $router->get ('/api/v1/eqms/batch-release/{id}/comments',              EqmsBatchReleaseController::class, 'comments');
    $router->post('/api/v1/eqms/batch-release/{id}/comments',              EqmsBatchReleaseController::class, 'comments');
    $router->get ('/api/v1/eqms/batch-release/{id}/attachments',           EqmsBatchReleaseController::class, 'attachments');
    $router->post('/api/v1/eqms/batch-release/{id}/attachments',           EqmsBatchReleaseController::class, 'attachments');
    $router->get ('/api/v1/eqms/batch-release/{id}/relationships',         EqmsBatchReleaseController::class, 'relationships');
    $router->post('/api/v1/eqms/batch-release/{id}/relationships/link',    EqmsBatchReleaseController::class, 'relationshipsLink');
    $router->post('/api/v1/eqms/batch-release/{id}/relationships/unlink',  EqmsBatchReleaseController::class, 'relationshipsUnlink');
    $router->get ('/api/v1/eqms/batch-release/{id}/available-actions',     EqmsBatchReleaseController::class, 'availableActions');
    $router->get ('/api/v1/eqms/batch-release/{id}/signatures',            EqmsBatchReleaseController::class, 'signatures');
    $router->post('/api/v1/eqms/batch-release/{id}/signatures',            EqmsBatchReleaseController::class, 'signatures');
    $router->post('/api/v1/eqms/batch-release/{id}/export',                EqmsBatchReleaseController::class, 'export');
    $router->post('/api/v1/eqms/batch-release/export',                     EqmsBatchReleaseController::class, 'exportBulk');
    $router->post('/api/v1/eqms/batch-release/{id}/actions/aggregate-data',    EqmsBatchReleaseController::class, 'actionAggregateData');
    $router->post('/api/v1/eqms/batch-release/{id}/actions/review-exceptions', EqmsBatchReleaseController::class, 'actionReviewExceptions');
    $router->post('/api/v1/eqms/batch-release/{id}/actions/approve-release',   EqmsBatchReleaseController::class, 'actionApproveRelease');
    $router->post('/api/v1/eqms/batch-release/{id}/actions/hold-release',      EqmsBatchReleaseController::class, 'actionHoldRelease');
    $router->post('/api/v1/eqms/batch-release/{id}/actions/market-ship',       EqmsBatchReleaseController::class, 'actionMarketShip');

    // ═══════════════════════════════════════════════════════════════════════════
    // MODULE NEW: Validation Management (CSV / CQV / GxP)
    // ═══════════════════════════════════════════════════════════════════════════
    $router->post('/api/v1/eqms/validation/projects/query',                EqmsValidationController::class, 'projectsQuery');
    $router->get ('/api/v1/eqms/validation/projects/metrics',              EqmsValidationController::class, 'projectsMetrics');
    $router->get ('/api/v1/eqms/validation/inventory',                     EqmsValidationController::class, 'inventory');
    $router->post('/api/v1/eqms/validation/requirements/query',            EqmsValidationController::class, 'requirementsQuery');
    $router->post('/api/v1/eqms/validation/protocols/query',               EqmsValidationController::class, 'protocolsQuery');
    $router->post('/api/v1/eqms/validation/projects',                      EqmsValidationController::class, 'projectCreate');
    $router->get ('/api/v1/eqms/validation/projects/{id}',                 EqmsValidationController::class, 'projectDetail');
    $router->patch('/api/v1/eqms/validation/projects/{id}',                EqmsValidationController::class, 'projectUpdate');
    $router->get ('/api/v1/eqms/validation/projects/{id}/audit',           EqmsValidationController::class, 'projectAudit');
    $router->get ('/api/v1/eqms/validation/projects/{id}/signatures',      EqmsValidationController::class, 'projectSignatures');
    $router->post('/api/v1/eqms/validation/projects/{id}/signatures',      EqmsValidationController::class, 'projectSignatures');
    $router->get ('/api/v1/eqms/validation/{id}/trace-matrix',             EqmsValidationController::class, 'traceMatrix');
    $router->post('/api/v1/eqms/validation/export',                        EqmsValidationController::class, 'exportBulk');
    $router->post('/api/v1/eqms/validation/protocols/{id}/actions/approve',              EqmsValidationController::class, 'protocolActionApprove');
    $router->post('/api/v1/eqms/validation/executions/{id}/actions/start',               EqmsValidationController::class, 'executionActionStart');
    $router->post('/api/v1/eqms/validation/executions/{id}/actions/record-result',       EqmsValidationController::class, 'executionActionRecordResult');
    $router->post('/api/v1/eqms/validation/executions/{id}/actions/log-deviation',       EqmsValidationController::class, 'executionActionLogDeviation');
    $router->post('/api/v1/eqms/validation/executions/{id}/actions/generate-summary',    EqmsValidationController::class, 'executionActionGenerateSummary');

    // ═══════════════════════════════════════════════════════════════════════════
    // MODULE NEW: Field Actions / Recall / Product Surveillance
    // ═══════════════════════════════════════════════════════════════════════════
    $router->post('/api/v1/eqms/field-actions/query',                      EqmsFieldActionsController::class, 'search');
    $router->get ('/api/v1/eqms/field-actions/metrics',                    EqmsFieldActionsController::class, 'metrics');
    $router->post('/api/v1/eqms/field-actions/lookup',                     EqmsFieldActionsController::class, 'lookup');
    $router->post('/api/v1/eqms/field-actions',                            EqmsFieldActionsController::class, 'create');
    $router->get ('/api/v1/eqms/field-actions/{id}',                       EqmsFieldActionsController::class, 'detail');
    $router->patch('/api/v1/eqms/field-actions/{id}',                      EqmsFieldActionsController::class, 'update');
    $router->get ('/api/v1/eqms/field-actions/{id}/audit',                 EqmsFieldActionsController::class, 'audit');
    $router->get ('/api/v1/eqms/field-actions/{id}/comments',              EqmsFieldActionsController::class, 'comments');
    $router->post('/api/v1/eqms/field-actions/{id}/comments',              EqmsFieldActionsController::class, 'comments');
    $router->get ('/api/v1/eqms/field-actions/{id}/attachments',           EqmsFieldActionsController::class, 'attachments');
    $router->post('/api/v1/eqms/field-actions/{id}/attachments',           EqmsFieldActionsController::class, 'attachments');
    $router->get ('/api/v1/eqms/field-actions/{id}/relationships',         EqmsFieldActionsController::class, 'relationships');
    $router->post('/api/v1/eqms/field-actions/{id}/relationships/link',    EqmsFieldActionsController::class, 'relationshipsLink');
    $router->post('/api/v1/eqms/field-actions/{id}/relationships/unlink',  EqmsFieldActionsController::class, 'relationshipsUnlink');
    $router->get ('/api/v1/eqms/field-actions/{id}/available-actions',     EqmsFieldActionsController::class, 'availableActions');
    $router->get ('/api/v1/eqms/field-actions/{id}/signatures',            EqmsFieldActionsController::class, 'signatures');
    $router->post('/api/v1/eqms/field-actions/{id}/signatures',            EqmsFieldActionsController::class, 'signatures');
    $router->post('/api/v1/eqms/field-actions/{id}/export',                EqmsFieldActionsController::class, 'export');
    $router->post('/api/v1/eqms/field-actions/export',                     EqmsFieldActionsController::class, 'exportBulk');
    $router->post('/api/v1/eqms/field-actions/{id}/actions/evaluate',          EqmsFieldActionsController::class, 'actionEvaluate');
    $router->post('/api/v1/eqms/field-actions/{id}/actions/plan',               EqmsFieldActionsController::class, 'actionPlan');
    $router->post('/api/v1/eqms/field-actions/{id}/actions/launch',             EqmsFieldActionsController::class, 'actionLaunch');
    $router->post('/api/v1/eqms/field-actions/{id}/actions/notify-customers',   EqmsFieldActionsController::class, 'actionNotifyCustomers');
    $router->post('/api/v1/eqms/field-actions/{id}/actions/record-effectiveness', EqmsFieldActionsController::class, 'actionRecordEffectiveness');
    $router->post('/api/v1/eqms/field-actions/{id}/actions/close',              EqmsFieldActionsController::class, 'actionClose');

    // ═══════════════════════════════════════════════════════════════════════════
    // MODULE NEW: Quality Control Tower (cross-module aggregates)
    // ═══════════════════════════════════════════════════════════════════════════
    $router->get ('/api/v1/eqms/quality-tower/dashboard',           EqmsQualityTowerController::class, 'dashboard');
    $router->get ('/api/v1/eqms/quality-tower/metrics',             EqmsQualityTowerController::class, 'metrics');
    $router->get ('/api/v1/eqms/quality-tower/overdue-actions',     EqmsQualityTowerController::class, 'overdueActions');
    $router->get ('/api/v1/eqms/quality-tower/compliance-calendar', EqmsQualityTowerController::class, 'complianceCalendar');
    $router->post('/api/v1/eqms/quality-tower/snapshot',            EqmsQualityTowerController::class, 'refreshSnapshot');
    $router->post('/api/v1/eqms/quality-tower/export',              EqmsQualityTowerController::class, 'export');

    // ═══════════════════════════════════════════════════════════════════════════
    // MODULE M30-E: Genealogy / Traceability (hardened)
    // ═══════════════════════════════════════════════════════════════════════════
    $router->post('/api/v1/mom/traceability/genealogy/query',              EqmsGenealogyController::class, 'search');
    $router->get ('/api/v1/mom/traceability/genealogy/metrics',            EqmsGenealogyController::class, 'metrics');
    $router->post('/api/v1/mom/traceability/genealogy/lookup',             EqmsGenealogyController::class, 'lookup');
    $router->get ('/api/v1/mom/traceability/genealogy/{id}',               EqmsGenealogyController::class, 'detail');
    $router->patch('/api/v1/mom/traceability/genealogy/{id}',              EqmsGenealogyController::class, 'update');
    $router->get ('/api/v1/mom/traceability/genealogy/{id}/audit',         EqmsGenealogyController::class, 'audit');
    $router->post('/api/v1/mom/traceability/genealogy/{id}/export',        EqmsGenealogyController::class, 'export');
    $router->post('/api/v1/mom/traceability/genealogy/export',             EqmsGenealogyController::class, 'exportBulk');
    $router->post('/api/v1/mom/traceability/genealogy/{id}/actions/expand-upstream',   EqmsGenealogyController::class, 'actionExpandUpstream');
    $router->post('/api/v1/mom/traceability/genealogy/{id}/actions/expand-downstream', EqmsGenealogyController::class, 'actionExpandDownstream');
    $router->post('/api/v1/mom/traceability/genealogy/{id}/actions/freeze-trace-report', EqmsGenealogyController::class, 'actionFreezeTraceReport');
};
