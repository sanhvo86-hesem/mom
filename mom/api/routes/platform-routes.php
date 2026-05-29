<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Api\Router;

return static function (Router $router, string $dataDir): void {
    // MDA V3 P40 frontend/operator projection safety contracts.
    $router->actions([
        'mda_frontend_projection_contract' => [MdaFrontendProjectionSafetyController::class, 'contract'],
        'mda_frontend_projection_evaluate' => [MdaFrontendProjectionSafetyController::class, 'evaluate'],
        'mda_record_shell'                 => [MdaFrontendProjectionSafetyController::class, 'recordShell'],
    ]);

    // Module Schema Builder
    $router->actions([
        'module_schema_list'    => [ModuleSchemaController::class, 'listSchemas'],
        'module_schema_get'     => [ModuleSchemaController::class, 'getSchema'],
        'module_schema_save'    => [ModuleSchemaController::class, 'saveSchema'],
        'module_schema_delete'  => [ModuleSchemaController::class, 'deleteSchema'],
        'module_schema_reset'   => [ModuleSchemaController::class, 'resetSchema'],
        'module_api_catalog'    => [ModuleSchemaController::class, 'apiCatalog'],
    ]);
    
    // Schema Studio
    $router->actions([
        'schema_studio_list'            => [SchemaStudioController::class, 'listDesigns'],
        'schema_studio_get'             => [SchemaStudioController::class, 'getDesign'],
        'schema_studio_save'            => [SchemaStudioController::class, 'saveDesign'],
        'schema_studio_delete'          => [SchemaStudioController::class, 'deleteDesign'],
        'schema_studio_set_baseline'    => [SchemaStudioController::class, 'setBaseline'],
        'schema_studio_reverse_engineer'=> [SchemaStudioController::class, 'reverseEngineer'],
        'schema_studio_load_registry'   => [SchemaStudioController::class, 'loadFromRegistry'],
        'schema_studio_validate'        => [SchemaStudioController::class, 'validateSchema'],
        'schema_studio_apply_migration' => [SchemaStudioController::class, 'applyMigration'],
        'schema_studio_table_preview'   => [SchemaStudioController::class, 'previewTableData'],
        'schema_studio_table_row_save'  => [SchemaStudioController::class, 'saveTableRow'],
        'schema_studio_list_releases'   => [SchemaStudioController::class, 'listReleaseBundles'],
        'schema_studio_compile_registry'=> [SchemaStudioController::class, 'compileRegistryBundle'],
        'schema_studio_release_bundle'  => [SchemaStudioController::class, 'createReleaseBundle'],
        'schema_studio_diagnose'        => [SchemaStudioController::class, 'diagnoseSchema'],
        'schema_studio_operations_report'=> [SchemaStudioController::class, 'getOperationsReport'],
        'schema_studio_command_center_report'=> [SchemaStudioController::class, 'getCommandCenterReport'],
        'schema_studio_round6_report'   => [SchemaStudioController::class, 'getRound6Report'],
        'schema_studio_round7_report'   => [SchemaStudioController::class, 'getRound7Report'],
        'schema_studio_round9_report'   => [SchemaStudioController::class, 'getRound9Report'],
        'schema_studio_round10_report'  => [SchemaStudioController::class, 'getRound10Report'],
        'schema_studio_round11_report'  => [SchemaStudioController::class, 'getRound11Report'],
        'schema_studio_round12_report'  => [SchemaStudioController::class, 'getRound12Report'],
        'schema_studio_export'          => [SchemaStudioController::class, 'export'],
    ]);
    
    // Centralized Data Registry
    $router->actions([
        'registry_data_fields'       => [RegistryController::class, 'getDataFields'],
        'registry_api_params'        => [RegistryController::class, 'getApiParams'],
        'registry_field_types'       => [RegistryController::class, 'getFieldTypes'],
        'registry_status_options'    => [RegistryController::class, 'getStatusOptions'],
        'registry_computed_formulas' => [RegistryController::class, 'getComputedFormulas'],
        'registry_validation_rules'  => [RegistryController::class, 'getValidationRules'],
        'registry_workflow_library'  => [RegistryController::class, 'getWorkflowLibrary'],
        'registry_domain_field_packs'=> [RegistryController::class, 'getDomainFieldPacks'],
        'registry_relation_map'      => [RegistryController::class, 'getRelationMap'],
        'registry_endpoint_catalog'  => [RegistryController::class, 'getEndpointCatalog'],
        'registry_table_registry'    => [RegistryController::class, 'getTableRegistry'],
        'registry_manifest'          => [RegistryController::class, 'getRegistryManifest'],
        'registry_compliance_crosswalk'=> [RegistryController::class, 'getComplianceCrosswalk'],
        'registry_global_capability_audit'=> [RegistryController::class, 'getGlobalCapabilityAudit'],
        'registry_system_contract'   => [RegistryController::class, 'getSystemContract'],
        'registry_iot_connectors'    => [RegistryController::class, 'getIotConnectors'],
        'registry_full'              => [RegistryController::class, 'getFull'],
        'registry_update'            => [RegistryController::class, 'updateRegistry'],
        'admin_design_config'        => [AdminController::class, 'getDesignConfig'],
        'admin_design_config_save'   => [AdminController::class, 'saveDesignConfig'],
    ]);
    
    // ── Foundation Governance Contract Slice: Internal Action Keys ──────────────
    
    $router->actions([
        'registerOrganizationNode'  => [MasterDataController::class, 'registerOrganizationNode'],
        'amendOrganizationNode'     => [MasterDataController::class, 'amendOrganizationNode'],
        'reparentOrganizationNode'  => [MasterDataController::class, 'reparentOrganizationNode'],
        'deactivateOrganizationNode'=> [MasterDataController::class, 'deactivateOrganizationNode'],
        'registerParty'             => [MasterDataController::class, 'registerParty'],
        'amendPartyIdentity'        => [MasterDataController::class, 'amendPartyIdentity'],
        'assignPartyRole'           => [MasterDataController::class, 'assignPartyRole'],
        'registerPartySite'         => [MasterDataController::class, 'registerPartySite'],
        'registerPartyContact'      => [MasterDataController::class, 'registerPartyContact'],
        'registerCalendar'          => [MasterDataController::class, 'registerCalendar'],
        'registerShift'             => [MasterDataController::class, 'registerShiftEntry'],
        'requestApproval'           => [ApprovalGroupController::class, 'requestApproval'],
    ]);
};
