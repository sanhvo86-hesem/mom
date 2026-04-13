<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Api\Router;

return static function (Router $router, string $dataDir): void {
    $router->actions([
        'graphics_design_config_get'          => [GraphicsGovernanceController::class, 'getDesignConfig'],
        'graphics_design_config_save'         => [GraphicsGovernanceController::class, 'saveDesignConfig'],
        'graphics_template_registry_get'      => [GraphicsGovernanceController::class, 'listTemplates'],
        'graphics_template_get'               => [GraphicsGovernanceController::class, 'getTemplate'],
        'graphics_template_draft_save'        => [GraphicsGovernanceController::class, 'saveDraftTemplate'],
        'graphics_template_clone'             => [GraphicsGovernanceController::class, 'cloneTemplate'],
        'graphics_template_deprecate'         => [GraphicsGovernanceController::class, 'deprecateTemplate'],
        'graphics_template_validate'          => [GraphicsGovernanceController::class, 'validateTemplate'],
        'graphics_template_publish'           => [GraphicsGovernanceController::class, 'publishTemplate'],
        'graphics_template_modules'           => [GraphicsGovernanceController::class, 'modulesUsingTemplate'],
        'graphics_component_contract_registry'=> [GraphicsGovernanceController::class, 'componentContracts'],
        'graphics_compliance_matrix'          => [GraphicsGovernanceController::class, 'complianceMatrix'],
        'graphics_non_compliant_modules'      => [GraphicsGovernanceController::class, 'nonCompliantModules'],
        'graphics_bridge_alias_debt'          => [GraphicsGovernanceController::class, 'bridgeAliasDebt'],
        'graphics_private_css_debt'           => [GraphicsGovernanceController::class, 'privateCssDebt'],
        'graphics_token_adoption_coverage'    => [GraphicsGovernanceController::class, 'tokenAdoptionCoverage'],
        'graphics_drift_report'               => [GraphicsGovernanceController::class, 'driftReport'],
        'graphics_impact_token'               => [GraphicsGovernanceController::class, 'analyzeTokenImpact'],
        'graphics_impact_template'            => [GraphicsGovernanceController::class, 'analyzeTemplateImpact'],
        'graphics_impact_component'           => [GraphicsGovernanceController::class, 'analyzeComponentImpact'],
        'graphics_rollout_stage'              => [GraphicsGovernanceController::class, 'stageRollout'],
        'graphics_rollout_apply'              => [GraphicsGovernanceController::class, 'applyRollout'],
        'graphics_rollout_rollback'           => [GraphicsGovernanceController::class, 'rollbackRollout'],
        'graphics_audit_history'              => [GraphicsGovernanceController::class, 'auditHistory'],
        'graphics_waiver_create'              => [GraphicsGovernanceController::class, 'createWaiver'],
        'graphics_waiver_approve'             => [GraphicsGovernanceController::class, 'approveWaiver'],
        'graphics_waiver_expire'              => [GraphicsGovernanceController::class, 'expireWaiver'],
        'graphics_waivers_active'             => [GraphicsGovernanceController::class, 'activeWaivers'],
        'graphics_release_blockers_get'        => [GraphicsGovernanceController::class, 'releaseBlockers'],

        'admin_template_registry_get'          => [GraphicsGovernanceController::class, 'listTemplates'],
        'admin_template_get'                   => [GraphicsGovernanceController::class, 'getTemplate'],
        'admin_template_draft_save'            => [GraphicsGovernanceController::class, 'saveDraftTemplate'],
        'admin_template_validate'              => [GraphicsGovernanceController::class, 'validateTemplate'],
        'admin_template_publish'               => [GraphicsGovernanceController::class, 'publishTemplate'],
        'admin_template_deprecate'             => [GraphicsGovernanceController::class, 'deprecateTemplate'],
        'admin_template_modules_get'           => [GraphicsGovernanceController::class, 'modulesUsingTemplate'],
        'admin_graphics_impact_token'          => [GraphicsGovernanceController::class, 'analyzeTokenImpact'],
        'admin_graphics_impact_template'       => [GraphicsGovernanceController::class, 'analyzeTemplateImpact'],
        'admin_graphics_impact_component'      => [GraphicsGovernanceController::class, 'analyzeComponentImpact'],
        'admin_graphics_compliance_get'        => [GraphicsGovernanceController::class, 'complianceMatrix'],
        'admin_graphics_non_compliant_get'     => [GraphicsGovernanceController::class, 'nonCompliantModules'],
        'admin_graphics_debt_get'              => [GraphicsGovernanceController::class, 'debtReport'],
        'admin_graphics_drift_get'             => [GraphicsGovernanceController::class, 'driftReport'],
        'admin_graphics_rollout_stage'         => [GraphicsGovernanceController::class, 'stageRollout'],
        'admin_graphics_rollout_apply'         => [GraphicsGovernanceController::class, 'applyRollout'],
        'admin_graphics_rollout_rollback'      => [GraphicsGovernanceController::class, 'rollbackRollout'],
        'admin_graphics_audit_history_get'     => [GraphicsGovernanceController::class, 'auditHistory'],
        'admin_graphics_waiver_create'         => [GraphicsGovernanceController::class, 'createWaiver'],
        'admin_graphics_waiver_approve'        => [GraphicsGovernanceController::class, 'approveWaiver'],
        'admin_graphics_waiver_expire'         => [GraphicsGovernanceController::class, 'expireWaiver'],
        'admin_graphics_waiver_active_get'     => [GraphicsGovernanceController::class, 'activeWaivers'],
        'admin_graphics_release_blockers_get'  => [GraphicsGovernanceController::class, 'releaseBlockers'],
    ]);

    $router->get('/api/graphics/design-config', GraphicsGovernanceController::class, 'getDesignConfig');
    $router->post('/api/graphics/design-config', GraphicsGovernanceController::class, 'saveDesignConfig');

    $router->get('/api/graphics/templates', GraphicsGovernanceController::class, 'listTemplates');
    $router->get('/api/graphics/templates/{templateId}', GraphicsGovernanceController::class, 'getTemplate');
    $router->post('/api/graphics/templates/draft', GraphicsGovernanceController::class, 'saveDraftTemplate');
    $router->post('/api/graphics/templates/{templateId}/clone', GraphicsGovernanceController::class, 'cloneTemplate');
    $router->post('/api/graphics/templates/{templateId}/deprecate', GraphicsGovernanceController::class, 'deprecateTemplate');
    $router->post('/api/graphics/templates/{templateId}/validate', GraphicsGovernanceController::class, 'validateTemplate');
    $router->post('/api/graphics/templates/{templateId}/publish', GraphicsGovernanceController::class, 'publishTemplate');
    $router->get('/api/graphics/templates/{templateId}/modules', GraphicsGovernanceController::class, 'modulesUsingTemplate');

    $router->get('/api/graphics/components/contracts', GraphicsGovernanceController::class, 'componentContracts');

    $router->get('/api/graphics/compliance/modules', GraphicsGovernanceController::class, 'complianceMatrix');
    $router->get('/api/graphics/compliance/non-compliant-modules', GraphicsGovernanceController::class, 'nonCompliantModules');
    $router->get('/api/graphics/compliance/bridge-alias-debt', GraphicsGovernanceController::class, 'bridgeAliasDebt');
    $router->get('/api/graphics/compliance/private-css-debt', GraphicsGovernanceController::class, 'privateCssDebt');
    $router->get('/api/graphics/compliance/token-adoption-coverage', GraphicsGovernanceController::class, 'tokenAdoptionCoverage');
    $router->get('/api/graphics/compliance/debt', GraphicsGovernanceController::class, 'debtReport');
    $router->get('/api/graphics/drift', GraphicsGovernanceController::class, 'driftReport');
    $router->get('/api/graphics/release-blockers', GraphicsGovernanceController::class, 'releaseBlockers');

    $router->post('/api/graphics/impact/token', GraphicsGovernanceController::class, 'analyzeTokenImpact');
    $router->post('/api/graphics/impact/template', GraphicsGovernanceController::class, 'analyzeTemplateImpact');
    $router->post('/api/graphics/impact/component', GraphicsGovernanceController::class, 'analyzeComponentImpact');

    $router->post('/api/graphics/rollouts/stage', GraphicsGovernanceController::class, 'stageRollout');
    $router->post('/api/graphics/rollouts/apply', GraphicsGovernanceController::class, 'applyRollout');
    $router->post('/api/graphics/rollouts/rollback', GraphicsGovernanceController::class, 'rollbackRollout');

    $router->get('/api/graphics/audit', GraphicsGovernanceController::class, 'auditHistory');
    $router->post('/api/graphics/waivers', GraphicsGovernanceController::class, 'createWaiver');
    $router->post('/api/graphics/waivers/{waiverId}/approve', GraphicsGovernanceController::class, 'approveWaiver');
    $router->post('/api/graphics/waivers/{waiverId}/expire', GraphicsGovernanceController::class, 'expireWaiver');
    $router->get('/api/graphics/waivers/active', GraphicsGovernanceController::class, 'activeWaivers');
};
