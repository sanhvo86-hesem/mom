<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Api\Router;

return static function (Router $router, string $dataDir): void {
    $router->get('/api/v1/eqms/control-plane/contract', EqmsControlPlaneController::class, 'contract');
    $router->get('/api/v1/eqms/control-plane/state-machine', EqmsControlPlaneController::class, 'stateMachine');
    $router->post('/api/v1/eqms/control-plane/commands', EqmsControlPlaneController::class, 'submitCommand');
    $router->get('/api/v1/eqms/control-plane/commands/{command_id}', EqmsControlPlaneController::class, 'getCommand');
    $router->post('/api/v1/eqms/control-plane/commands/validate', EqmsControlPlaneController::class, 'validateCommand');
    $router->post('/api/v1/eqms/forms/issuance-manifest/validate', EqmsControlPlaneController::class, 'validateIssuanceManifest');
    $router->post('/api/v1/eqms/forms/submission-attempts/validate', EqmsControlPlaneController::class, 'validateSubmissionAttempt');
    $router->post('/api/v1/eqms/change-requests', EqmsControlPlaneController::class, 'createChangeRequest');
    $router->post('/api/v1/eqms/change-requests/transition', EqmsControlPlaneController::class, 'transitionChangeRequest');
    $router->post('/api/v1/eqms/change-orders', EqmsControlPlaneController::class, 'createChangeOrder');
    $router->post('/api/v1/eqms/change-orders/transition', EqmsControlPlaneController::class, 'transitionChangeOrder');
    $router->post('/api/v1/eqms/change-orders/release-gate/evaluate', EqmsControlPlaneController::class, 'evaluateChangeRelease');
    $router->get('/api/v1/eqms/publications/retry-plan', EqmsControlPlaneController::class, 'publicationRetryPlan');
    $router->get('/api/v1/eqms/publications/monitor', EqmsControlPlaneController::class, 'publicationMonitor');
    $router->post('/api/v1/eqms/publications/actions', EqmsControlPlaneController::class, 'requestPublicationAction');
    $router->post('/api/v1/eqms/evidence/finalize', EqmsControlPlaneController::class, 'finalizeEvidencePackage');
    $router->get('/api/v1/eqms/evidence/package', EqmsControlPlaneController::class, 'canonicalEvidencePackage');
    $router->post('/api/v1/eqms/audit-packs/manifest', EqmsControlPlaneController::class, 'buildAuditPackManifest');
    $router->post('/api/v1/eqms/evidence-graph/preview', EqmsControlPlaneController::class, 'evidenceGraphPreview');
    $router->post('/api/v1/eqms/genealogy/facts', EqmsControlPlaneController::class, 'recordGenealogyFact');
    $router->post('/api/v1/eqms/genealogy/5m/evaluate', EqmsControlPlaneController::class, 'evaluate5MGate');
    $router->get('/api/v1/eqms/genealogy/as-manufactured', EqmsControlPlaneController::class, 'asManufacturedThread');
    $router->get('/api/v1/eqms/admin/repo-boundary-scan', EqmsControlPlaneController::class, 'repoBoundaryScan');
    $router->get('/api/v1/eqms/periodic-evaluations', EqmsControlPlaneController::class, 'periodicEvaluationDashboard');
    $router->post('/api/v1/eqms/periodic-evaluations', EqmsControlPlaneController::class, 'schedulePeriodicEvaluation');
    $router->post('/api/v1/eqms/periodic-evaluations/close', EqmsControlPlaneController::class, 'closePeriodicEvaluation');
};
