<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Api\Router;

return static function (Router $router, string $dataDir): void {
    // Documents
    $router->actions([
        'doc_create'                => [DocumentController::class, 'create'],
        'doc_save_draft'            => [DocumentController::class, 'saveDraft'],
        'doc_submit_review'         => [DocumentController::class, 'submitReview'],
        'doc_approve'               => [DocumentController::class, 'approve'],
        'doc_reject'                => [DocumentController::class, 'reject'],
        'doc_update_meta'           => [DocumentController::class, 'updateMeta'],
        'doc_delete_drafts'         => [DocumentController::class, 'deleteDrafts'],
        'doc_delete_version'        => [DocumentController::class, 'deleteVersion'],
        'doc_versions_list'         => [DocumentController::class, 'listVersions'],
        'doc_start_new_revision'    => [DocumentController::class, 'startNewRevision'],
        'doc_stream'                => [DocumentController::class, 'stream'],
        'docs_custom_list'          => [DocumentController::class, 'listCustom'],
        'doc_descriptions_get'      => [DocumentController::class, 'getDescriptions'],
        'save_doc_description'      => [DocumentController::class, 'saveDescription'],
        'docs_visibility_get'       => [DocumentController::class, 'getVisibility'],
        'admin_docs_visibility_save' => [DocumentController::class, 'saveVisibility'],
        'docs_snapshot'              => [DocumentController::class, 'docsSnapshot'],
    ]);
    
    // Forms & Records
    $router->actions([
        'online_form_list'    => [FormController::class, 'list'],
        'online_form_schema'  => [FormController::class, 'getSchema'],
        'online_form_submit'  => [FormController::class, 'submit'],
        'online_form_entries' => [FormController::class, 'getEntries'],
        'config_record_types' => [FormController::class, 'configRecordTypes'],
        'record_id_registry'  => [FormController::class, 'getIdRegistry'],
        'record_id_next'      => [FormController::class, 'getNextId'],
        'record_id_peek'      => [FormController::class, 'peekNextId'],
        'form_version_stream' => [FormController::class, 'streamVersion'],
        'form_upload_draft'   => [FormController::class, 'uploadDraft'],
        'form_draft_save'     => [FormController::class, 'saveDraft'],
        'form_draft_get'      => [FormController::class, 'getDraft'],
        'form_draft_list'     => [FormController::class, 'listDrafts'],
    ]);

    // Form Schema Lifecycle (09f-form-builder-engine.js)
    $router->actions([
        'form_schema_history'       => [FormSchemaController::class, 'history'],
        'form_schema_version'       => [FormSchemaController::class, 'getVersion'],
        'form_schema_save_draft'    => [FormSchemaController::class, 'saveDraft'],
        'form_schema_submit_review' => [FormSchemaController::class, 'submitReview'],
        'form_schema_publish'       => [FormSchemaController::class, 'publish'],
        'form_schema_reject'        => [FormSchemaController::class, 'reject'],
        'form_schema_rollback'      => [FormSchemaController::class, 'rollback'],
        // 09-online-forms.js: create new EQMS form schema
        'eqms_form_schema_save'     => [FormSchemaController::class, 'createSchema'],
    ]);
    
    // Files & Folders
    $router->actions([
        'scan_folders'        => [FileController::class, 'scanFolders'],
        'create_folder'       => [FileController::class, 'createFolder'],
        'rename_folder'       => [FileController::class, 'renameFolder'],
        'delete_folder'       => [FileController::class, 'deleteFolder'],
        'move_doc'            => [FileController::class, 'moveDoc'],
        'delete_doc'          => [FileController::class, 'deleteDoc'],
        'rename_doc'          => [FileController::class, 'renameDoc'],
        'folder_descriptions' => [FileController::class, 'getFolderDescriptions'],
    ]);
    
    // Users & Roles
    $router->actions([
        'admin_users_list'          => [UserController::class, 'list'],
        'admin_user_upsert'         => [UserController::class, 'upsert'],
        'admin_user_delete'         => [UserController::class, 'delete'],
        'admin_user_reset_password' => [UserController::class, 'resetPassword'],
        'role_perms_get'            => [UserController::class, 'getPermissions'],
        'admin_role_perms_save'     => [UserController::class, 'savePermissions'],
    ]);
    
    // Admin
    $router->actions([
        'admin_git_status'                 => [AdminController::class, 'gitStatus'],
        'admin_data_sync_status'           => [AdminController::class, 'dataSyncStatus'],
        'admin_data_sync_download_file'    => [AdminController::class, 'dataSyncDownloadFile'],
        'admin_data_sync_upload_file'      => [AdminController::class, 'dataSyncUploadFile'],
        'admin_data_sync_resolve_drift'    => [AdminController::class, 'dataSyncResolveDrift'],
        'admin_data_sync_snapshots'        => [AdminController::class, 'dataSyncListSnapshots'],
        'admin_data_sync_restore_snapshot' => [AdminController::class, 'dataSyncRestoreSnapshot'],
        'admin_data_sync_take_snapshot'    => [AdminController::class, 'dataSyncTakeSnapshot'],
        'admin_data_sync_read_file'        => [AdminController::class, 'dataSyncReadFile'],
        'admin_data_sync_batch_resolve'    => [AdminController::class, 'dataSyncBatchResolve'],
        'admin_data_sync_unregister_file'  => [AdminController::class, 'dataSyncUnregisterFile'],
        'admin_data_sync_batch_unregister' => [AdminController::class, 'dataSyncBatchUnregister'],
        'admin_local_sync_report'          => [AdminController::class, 'localSyncReport'],
        'admin_local_sync_control_status'  => [AdminController::class, 'localSyncControlStatus'],
        'admin_local_sync_run'             => [AdminController::class, 'localSyncRun'],
        'admin_local_sync_schedule_set'    => [AdminController::class, 'localSyncScheduleSet'],
        'admin_sync_schedule_get'          => [AdminController::class, 'syncScheduleGet'],
        'admin_sync_schedule_set'          => [AdminController::class, 'syncScheduleSet'],
        'admin_version_control_overview'         => [AdminController::class, 'versionControlOverview'],
        'admin_version_control_doc_history_list' => [AdminController::class, 'versionControlDocHistoryList'],
        'admin_version_control_doc_revisions'    => [AdminController::class, 'versionControlDocRevisions'],
        'admin_version_control_unified_timeline' => [AdminController::class, 'versionControlUnifiedTimeline'],
        'admin_clear_site_cache'           => [AdminController::class, 'clearCache'],
        'get_data_settings'                => [AdminController::class, 'getSettings'],
        'save_data_settings'               => [AdminController::class, 'saveSettings'],
        'admin_portal_display_config_get'  => [AdminController::class, 'getPortalConfig'],
        'admin_portal_display_config_save' => [AdminController::class, 'savePortalConfig'],
        'module_access_get'                => [AdminController::class, 'getModuleAccessConfig'],
        'admin_module_access_save'         => [AdminController::class, 'saveModuleAccessConfig'],
        'admin_vc_mode_get'                => [AdminController::class, 'vcModeGet'],
        'admin_vc_mode_set'                => [AdminController::class, 'vcModeSet'],
        'admin_deploy_trigger'             => [AdminController::class, 'deployTrigger'],
        'admin_change_request_submit'      => [AdminController::class, 'changeRequestSubmit'],
        'admin_change_request_approve'     => [AdminController::class, 'changeRequestApprove'],
        'admin_change_request_list'        => [AdminController::class, 'changeRequestList'],
        'admin_deploy_freeze_get'          => [AdminController::class, 'deployFreezeGet'],
        'admin_deploy_freeze_set'          => [AdminController::class, 'deployFreezeSet'],
        'admin_gha_workflow_status'        => [AdminController::class, 'ghaWorkflowStatus'],
        'admin_decision_thresholds_get'    => [AdminController::class, 'decisionThresholdsGet'],
        'admin_decision_thresholds_save'   => [AdminController::class, 'decisionThresholdsSave'],
        'admin_raci_matrix_get'            => [AdminController::class, 'raciMatrixGet'],
        'admin_raci_matrix_save'           => [AdminController::class, 'raciMatrixSave'],
        'admin_kpi_registry_get'           => [AdminController::class, 'kpiRegistryGet'],
        'admin_kpi_registry_save'          => [AdminController::class, 'kpiRegistrySave'],
        'admin_audit_trail_list'           => [AdminController::class, 'getAuditTrail'],
        'user_doc_overrides_get'           => [AdminController::class, 'getUserDocumentOverrides'],
        'admin_user_doc_overrides_save'    => [AdminController::class, 'saveUserDocumentOverrides'],
        'admin_mfa_settings_get'           => [AdminController::class, 'getMfaSettings'],
        'admin_mfa_settings_save'          => [AdminController::class, 'saveMfaSettings'],
        'admin_ai_config_get'              => [AdminController::class, 'getAiConfig'],
        'admin_ai_config_save'             => [AdminController::class, 'saveAiConfig'],
        'admin_ai_usage_get'               => [AdminController::class, 'getAiUsage'],
        'admin_ai_test_connection'         => [AdminController::class, 'testAiConnection'],
        'admin_ai_reset_circuit_breaker'   => [AdminController::class, 'resetAiCircuitBreaker'],
        'admin_metadata_studio_summary'    => [AdminMetadataStudioController::class, 'getSummary'],
        'admin_metadata_studio_detail'     => [AdminMetadataStudioController::class, 'getDetail'],
        'admin_metadata_studio_save'       => [AdminMetadataStudioController::class, 'saveDetail'],
        // Data layer config (was unreachable — previously only in legacy api.php switch)
        'admin_data_layer_config_get'      => [AdminDataLayerController::class, 'getConfig'],
        'admin_data_layer_config_save'     => [AdminDataLayerController::class, 'saveConfig'],
    ]);
    
    // Dictionary
    $router->actions([
        'dict_list'   => [DictController::class, 'list'],
        'dict_upsert' => [DictController::class, 'upsert'],
        'dict_delete' => [DictController::class, 'delete'],
    ]);
    
    // Dashboards, KPI & SPC
    $router->actions([
        'dashboard_executive'  => [DashboardController::class, 'executive'],
        'dashboard_quality'    => [DashboardController::class, 'quality'],
        'dashboard_production' => [DashboardController::class, 'production'],
        'dashboard_supplier'   => [DashboardController::class, 'supplier'],
        'dashboard_department' => [DashboardController::class, 'department'],
        'dashboard_widget'     => [DashboardController::class, 'widget'],
        'kpi_catalog'          => [DashboardController::class, 'kpiCatalog'],
        'kpi_get'              => [DashboardController::class, 'kpiGet'],
        'kpi_trend'            => [DashboardController::class, 'kpiTrend'],
        'kpi_alerts'           => [DashboardController::class, 'kpiAlerts'],
        'kpi_threshold_badges' => [DashboardController::class, 'kpiThresholdBadges'],
        'kpi_jd_scorecards'    => [DashboardController::class, 'kpiJdScorecards'],
        'kpi_input_save'       => [DashboardController::class, 'kpiInputSave'],
        'kpi_input_list'       => [DashboardController::class, 'kpiInputList'],
        'spc_capability'       => [DashboardController::class, 'spcCapability'],
        'spc_chart'            => [DashboardController::class, 'spcChart'],
        'spc_summary'          => [DashboardController::class, 'spcSummary'],
        'spc_alerts'           => [DashboardController::class, 'spcAlerts'],
    ]);
    
    // VPS Control Tower
    $router->actions([
        'vps_control_overview' => [VpsController::class, 'overview'],
        'vps_control_host'     => [VpsController::class, 'host'],
        'vps_control_action'   => [VpsController::class, 'runAction'],
        'vps_control_asset'    => [VpsController::class, 'asset'],
        'vps_file_list'        => [VpsController::class, 'fileList'],
        'vps_file_search'      => [VpsController::class, 'fileSearch'],
        'vps_file_read'        => [VpsController::class, 'fileRead'],
        'vps_file_mutate'      => [VpsController::class, 'fileMutate'],
        'vps_file_upload'      => [VpsController::class, 'fileUpload'],
        'vps_terminal_auth'    => [VpsController::class, 'terminalAuth'],
        'vps_observability_auth' => [VpsController::class, 'observabilityAuth'],
    ]);
    
    // Allocation & Record ID Management
    $router->actions([
        'allocation_allocate'       => [AllocationController::class, 'allocate'],
        'allocation_history'        => [AllocationController::class, 'getHistory'],
        'allocation_void'           => [AllocationController::class, 'void'],
        'record_id_check_duplicate' => [AllocationController::class, 'checkDuplicate'],
        'upload_allocation_status'  => [AllocationController::class, 'getStatus'],
        'record_id_download_txt'    => [AllocationController::class, 'downloadTxt'],
        'record_id_types_expanded'  => [AllocationController::class, 'getExpandedTypes'],
        'record_id_preview'         => [AllocationController::class, 'preview'],
        // Legacy aliases (fallback from 09h-allocation-tracker.js)
        'record_id_generate'        => [AllocationController::class, 'allocate'],
        'record_id_history'         => [AllocationController::class, 'getHistory'],
        'record_id_void'            => [AllocationController::class, 'void'],
    ]);

    // Error Code Registry — bilingual error catalogue.
    // Public read endpoints (any session): every frontend module fetches
    // localised error messages from /api/v1/error-codes so the UI shows
    // operator-friendly text instead of bare codes. Admin endpoints
    // (admin role only) drive the IAM Console "Error Codes" tab.
    $router->get   ('/api/v1/error-codes',                          ErrorCodeRegistryController::class, 'listPublic');
    $router->get   ('/api/v1/error-codes/{code}',                   ErrorCodeRegistryController::class, 'getPublic');
    $router->get   ('/api/v1/admin/error-codes',                    ErrorCodeRegistryController::class, 'listAdmin');
    $router->post  ('/api/v1/admin/error-codes',                    ErrorCodeRegistryController::class, 'upsert');
    $router->put   ('/api/v1/admin/error-codes/{code}',             ErrorCodeRegistryController::class, 'update');
    $router->post  ('/api/v1/admin/error-codes/{code}/activate',    ErrorCodeRegistryController::class, 'activate');
    $router->post  ('/api/v1/admin/error-codes/{code}/deactivate',  ErrorCodeRegistryController::class, 'deactivate');
    $router->delete('/api/v1/admin/error-codes/{code}',             ErrorCodeRegistryController::class, 'delete');
};
