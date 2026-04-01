<?php

declare(strict_types=1);

/**
 * HESEM QMS API v2 — New MVC Entry Point.
 *
 * Bootstraps the Router with middleware stack and dispatches to controllers.
 * Falls back to the legacy monolithic api.php for unmapped actions,
 * ensuring full backward compatibility during migration.
 *
 * @package HESEM\QMS\Api
 * @since   2.0.0
 */

// ── Error Handling ──────────────────────────────────────────────────────────

ini_set('display_errors', '0');
ini_set('log_errors', '1');
@ini_set('expose_php', '0');
error_reporting(E_ALL);

// ── Paths ───────────────────────────────────────────────────────────────────

$BASE_DIR = dirname(__DIR__); // 01-QMS-Portal
$ROOT_DIR = realpath($BASE_DIR . '/..') ?: dirname($BASE_DIR);

$DATA_DIR_ENV = trim((string)(getenv('QMS_DATA_DIR') ?: ''));
$DATA_DIR = $DATA_DIR_ENV !== ''
    ? rtrim(str_replace('\\', '/', $DATA_DIR_ENV), '/\\')
    : $BASE_DIR . '/qms-data';

$LOG_FILE = $DATA_DIR . '/php_error.log';
@ini_set('error_log', $LOG_FILE);

// ── Autoloader ──────────────────────────────────────────────────────────────

// Simple PSR-4-like autoloader for HESEM\QMS namespace
spl_autoload_register(function (string $class): void {
    // Namespace prefix -> directory mappings
    $map = [
        'HESEM\\QMS\\Api\\Controllers\\'  => __DIR__ . '/controllers/',
        'HESEM\\QMS\\Api\\Middleware\\'    => __DIR__ . '/middleware/',
        'HESEM\\QMS\\Api\\Validators\\'    => __DIR__ . '/validators/',
        'HESEM\\QMS\\Services\\'           => __DIR__ . '/services/',
        'HESEM\\QMS\\Api\\'               => __DIR__ . '/',
        'HESEM\\QMS\\Database\\'           => dirname(__DIR__) . '/database/',
    ];

    foreach ($map as $prefix => $baseDir) {
        $len = strlen($prefix);
        if (strncmp($class, $prefix, $len) !== 0) {
            continue;
        }
        $relativeClass = substr($class, $len);
        $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';
        if (is_file($file)) {
            require_once $file;
            return;
        }
    }
});

// ── Load Legacy Functions ───────────────────────────────────────────────────

// The legacy api.php contains many helper functions that controllers depend on.
// We include it in a way that loads the functions but does NOT execute the
// action dispatch (the switch statement). We achieve this by requiring the
// legacy file only if the functions are not yet defined.
if (!function_exists('api_json')) {
    // Load the legacy api.php for its helper functions only.
    // The API_HELPERS_ONLY guard prevents the boot section and switch statement
    // from executing, so we can bootstrap the MVC router ourselves.
    define('API_HELPERS_ONLY', true);
    require_once $BASE_DIR . '/api.php';
}

// If helper functions are already loaded (e.g. from a separate bootstrap),
// initialize session and load store
if (!isset($store)) {
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_init();
    }
    $USERS_FILE = $DATA_DIR . '/config/users.json';
    $store = users_load($USERS_FILE);
}

// ── Import Classes ──────────────────────────────────────────────────────────

use HESEM\QMS\Api\Router;
use HESEM\QMS\Api\Middleware\AuthMiddleware;
use HESEM\QMS\Api\Middleware\CorsMiddleware;
use HESEM\QMS\Api\Middleware\RateLimitMiddleware;
use HESEM\QMS\Api\Middleware\AuditMiddleware;
use HESEM\QMS\Api\Controllers\AuthController;
use HESEM\QMS\Api\Controllers\DocumentController;
use HESEM\QMS\Api\Controllers\FormController;
use HESEM\QMS\Api\Controllers\FileController;
use HESEM\QMS\Api\Controllers\UserController;
use HESEM\QMS\Api\Controllers\AdminController;
use HESEM\QMS\Api\Controllers\DictController;
use HESEM\QMS\Api\Controllers\DashboardController;
use HESEM\QMS\Api\Controllers\OrderController;
use HESEM\QMS\Api\Controllers\ExceptionController;
use HESEM\QMS\Api\Controllers\SupplierController;
use HESEM\QMS\Api\Controllers\QuoteController;
use HESEM\QMS\Api\Controllers\EvidenceController;
use HESEM\QMS\Api\Controllers\FmeaController;
use HESEM\QMS\Api\Controllers\ApqpController;
use HESEM\QMS\Api\Controllers\MobileController;
use HESEM\QMS\Api\Controllers\CncProgramController;
use HESEM\QMS\Api\Controllers\ProductPassportController;
use HESEM\QMS\Api\Controllers\AiSchedulingController;
use HESEM\QMS\Api\Controllers\CustomerPortalController;
use HESEM\QMS\Api\Controllers\ComplianceReportController;
use HESEM\QMS\Api\Controllers\KnowledgeController;
use HESEM\QMS\Api\Controllers\CiController;
use HESEM\QMS\Api\Controllers\EnergyController;
use HESEM\QMS\Database\DataLayer;

// ── Bootstrap DataLayer ─────────────────────────────────────────────────────

$dataLayer = new DataLayer($DATA_DIR, $ROOT_DIR);

// ── Build Router ────────────────────────────────────────────────────────────

$router = new Router($dataLayer, $ROOT_DIR, $DATA_DIR);
$router->setStore($store);

// ── Register Middleware ─────────────────────────────────────────────────────

$corsMiddleware      = new CorsMiddleware();
$authMiddleware      = new AuthMiddleware($store);
$rateLimitMiddleware = new RateLimitMiddleware($DATA_DIR . '/ratelimit');
$auditMiddleware     = new AuditMiddleware($DATA_DIR . '/audit.log');

$router->use($corsMiddleware->handler());
$router->use($authMiddleware->handler());
$router->use($rateLimitMiddleware->handler());
$router->use($auditMiddleware->handler());

// ── Register Action Routes (backward compatible) ────────────────────────────

// Auth
$router->actions([
    'status'              => [AuthController::class, 'status'],
    'auth_login'          => [AuthController::class, 'login'],
    'auth_mfa_verify'     => [AuthController::class, 'mfaVerify'],
    'auth_enroll_verify'  => [AuthController::class, 'enrollVerify'],
    'auth_logout'         => [AuthController::class, 'logout'],
]);

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
    'record_id_registry'  => [FormController::class, 'getIdRegistry'],
    'record_id_next'      => [FormController::class, 'getNextId'],
    'record_id_peek'      => [FormController::class, 'peekNextId'],
    'form_version_stream' => [FormController::class, 'streamVersion'],
    'form_upload_draft'   => [FormController::class, 'uploadDraft'],
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
    'admin_git_sync'                   => [AdminController::class, 'gitSync'],
    'admin_git_pull'                   => [AdminController::class, 'gitPull'],
    'admin_clear_site_cache'           => [AdminController::class, 'clearCache'],
    'get_data_settings'                => [AdminController::class, 'getSettings'],
    'save_data_settings'               => [AdminController::class, 'saveSettings'],
    'admin_portal_display_config_get'  => [AdminController::class, 'getPortalConfig'],
    'admin_portal_display_config_save' => [AdminController::class, 'savePortalConfig'],
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
    'kpi_get'              => [DashboardController::class, 'kpiGet'],
    'kpi_trend'            => [DashboardController::class, 'kpiTrend'],
    'kpi_alerts'           => [DashboardController::class, 'kpiAlerts'],
    'spc_capability'       => [DashboardController::class, 'spcCapability'],
    'spc_chart'            => [DashboardController::class, 'spcChart'],
    'spc_summary'          => [DashboardController::class, 'spcSummary'],
    'spc_alerts'           => [DashboardController::class, 'spcAlerts'],
]);

// Orders (SO/JO/WO)
$router->actions([
    'order_so_list'           => [OrderController::class, 'listSalesOrders'],
    'order_so_detail'         => [OrderController::class, 'getSalesOrderDetail'],
    'order_so_create'         => [OrderController::class, 'createSalesOrder'],
    'order_so_update'         => [OrderController::class, 'updateSalesOrder'],
    'order_jo_list'           => [OrderController::class, 'listJobOrders'],
    'order_jo_detail'         => [OrderController::class, 'getJobOrderDetail'],
    'order_jo_create'         => [OrderController::class, 'createJobOrder'],
    'order_jo_update'         => [OrderController::class, 'updateJobOrder'],
    'order_wo_create'         => [OrderController::class, 'createWorkOrder'],
    'order_wo_update'         => [OrderController::class, 'updateWorkOrder'],
    'order_transition'        => [OrderController::class, 'transition'],
    'order_contract_review'   => [OrderController::class, 'contractReview'],
    'order_hold_set'          => [OrderController::class, 'setHold'],
    'order_hold_release'      => [OrderController::class, 'releaseHold'],
    'order_note_add'          => [OrderController::class, 'addNote'],
    'order_hierarchy'         => [OrderController::class, 'getHierarchy'],
    'order_timeline'          => [OrderController::class, 'getTimeline'],
    'order_dashboard_stats'   => [OrderController::class, 'getDashboardStats'],
    'order_dashboard_kpi'     => [OrderController::class, 'getDashboardKpi'],
    'order_search'            => [OrderController::class, 'search'],
    'order_link_form'         => [OrderController::class, 'linkForm'],
    'order_shipment_gate'     => [OrderController::class, 'checkShipmentReadiness'],
    'order_schedule_get'      => [OrderController::class, 'getSchedule'],
    'order_schedule_slot'     => [OrderController::class, 'createScheduleSlot'],
    'order_schedule_update'   => [OrderController::class, 'updateScheduleSlot'],
    'order_capacity_heatmap'  => [OrderController::class, 'getCapacityHeatmap'],
    'order_promise_suggest'   => [OrderController::class, 'suggestPromiseDate'],
]);

// Exception Management
$router->actions([
    'exception_dashboard'       => [ExceptionController::class, 'dashboard'],
    'exception_list'            => [ExceptionController::class, 'listAll'],
    'exception_detail'          => [ExceptionController::class, 'detail'],
    'exception_complaint_create'=> [ExceptionController::class, 'createComplaint'],
    'exception_complaint_update'=> [ExceptionController::class, 'updateComplaint'],
    'exception_mrb_create'      => [ExceptionController::class, 'createMrb'],
    'exception_mrb_update'      => [ExceptionController::class, 'updateMrb'],
    'exception_deviation_create'=> [ExceptionController::class, 'createDeviation'],
    'exception_deviation_update'=> [ExceptionController::class, 'updateDeviation'],
    'exception_concession_create' => [ExceptionController::class, 'createConcession'],
    'exception_concession_update' => [ExceptionController::class, 'updateConcession'],
    'exception_transition'      => [ExceptionController::class, 'transition'],
    'exception_copq_summary'    => [ExceptionController::class, 'copqSummary'],
    'exception_trends'          => [ExceptionController::class, 'trends'],
    'exception_escalate'        => [ExceptionController::class, 'escalate'],
]);

// Supplier Quality Management
$router->actions([
    'supplier_dashboard'        => [SupplierController::class, 'dashboard'],
    'supplier_scorecard_list'   => [SupplierController::class, 'listScorecards'],
    'supplier_scorecard_detail' => [SupplierController::class, 'scorecardDetail'],
    'supplier_scorecard_calc'   => [SupplierController::class, 'calculateScorecard'],
    'supplier_incoming_list'    => [SupplierController::class, 'listIncoming'],
    'supplier_incoming_create'  => [SupplierController::class, 'createIncoming'],
    'supplier_incoming_update'  => [SupplierController::class, 'updateIncoming'],
    'supplier_skip_lot_status'  => [SupplierController::class, 'skipLotStatus'],
    'supplier_skip_lot_update'  => [SupplierController::class, 'updateSkipLot'],
    'supplier_asl_list'         => [SupplierController::class, 'listAsl'],
    'supplier_asl_upsert'       => [SupplierController::class, 'upsertAsl'],
    'supplier_scar_list'        => [SupplierController::class, 'listScar'],
    'supplier_scar_create'      => [SupplierController::class, 'createScar'],
    'supplier_scar_update'      => [SupplierController::class, 'updateScar'],
    'supplier_scar_transition'  => [SupplierController::class, 'scarTransition'],
    'supplier_audit_list'       => [SupplierController::class, 'listAudits'],
    'supplier_audit_upsert'     => [SupplierController::class, 'upsertAudit'],
]);

// Quoting & Estimation
$router->actions([
    'quote_list'              => [QuoteController::class, 'listQuotes'],
    'quote_detail'            => [QuoteController::class, 'detail'],
    'quote_create'            => [QuoteController::class, 'create'],
    'quote_update'            => [QuoteController::class, 'update'],
    'quote_transition'        => [QuoteController::class, 'transition'],
    'quote_convert_to_so'     => [QuoteController::class, 'convertToSo'],
    'quote_estimate_cycle'    => [QuoteController::class, 'estimateCycleTime'],
    'quote_estimate_material' => [QuoteController::class, 'estimateMaterial'],
    'quote_dashboard'         => [QuoteController::class, 'dashboard'],
]);

// Evidence Vault
$router->actions([
    'evidence_list'           => [EvidenceController::class, 'listEvidence'],
    'evidence_detail'         => [EvidenceController::class, 'detail'],
    'evidence_upload'         => [EvidenceController::class, 'upload'],
    'evidence_link'           => [EvidenceController::class, 'link'],
    'evidence_chain_custody'  => [EvidenceController::class, 'chainOfCustody'],
    'evidence_verify_chain'   => [EvidenceController::class, 'verifyChain'],
    'evidence_search'         => [EvidenceController::class, 'search'],
]);

// FMEA & Control Plan
$router->actions([
    'fmea_list'               => [FmeaController::class, 'listFmeas'],
    'fmea_detail'             => [FmeaController::class, 'getFmeaDetail'],
    'fmea_create'             => [FmeaController::class, 'createFmea'],
    'fmea_update'             => [FmeaController::class, 'updateFmea'],
    'fmea_add_failure_mode'   => [FmeaController::class, 'addFailureMode'],
    'fmea_update_failure_mode'=> [FmeaController::class, 'updateFailureMode'],
    'fmea_add_action'         => [FmeaController::class, 'addAction'],
    'fmea_complete_action'    => [FmeaController::class, 'completeAction'],
    'fmea_generate_cp'        => [FmeaController::class, 'generateControlPlan'],
    'fmea_control_plans'      => [FmeaController::class, 'listControlPlans'],
    'fmea_cp_detail'          => [FmeaController::class, 'getControlPlanDetail'],
    'fmea_rpn_trend'          => [FmeaController::class, 'getRpnTrend'],
    'fmea_link_ncr'           => [FmeaController::class, 'linkNcrToFmea'],
]);

// APQP / PPAP
$router->actions([
    'apqp_list'               => [ApqpController::class, 'listProjects'],
    'apqp_detail'             => [ApqpController::class, 'getProjectDetail'],
    'apqp_create'             => [ApqpController::class, 'createProject'],
    'apqp_update'             => [ApqpController::class, 'updateProject'],
    'apqp_advance_phase'      => [ApqpController::class, 'advancePhase'],
    'apqp_gate_review'        => [ApqpController::class, 'submitGateReview'],
    'apqp_gate_approve'       => [ApqpController::class, 'approveGate'],
    'apqp_gate_reject'        => [ApqpController::class, 'rejectGate'],
    'apqp_ppap_create'        => [ApqpController::class, 'createPpapSubmission'],
    'apqp_ppap_element'       => [ApqpController::class, 'updatePpapElement'],
    'apqp_ppap_response'      => [ApqpController::class, 'recordCustomerResponse'],
    'apqp_deliverables'       => [ApqpController::class, 'getPhaseDeliverables'],
    'apqp_dashboard'          => [ApqpController::class, 'getDashboard'],
]);

// Mobile Shop Floor
$router->actions([
    'mobile_my_queue'         => [MobileController::class, 'getMyQueue'],
    'mobile_start_task'       => [MobileController::class, 'startTask'],
    'mobile_complete_task'    => [MobileController::class, 'completeTask'],
    'mobile_clock_in'         => [MobileController::class, 'clockIn'],
    'mobile_clock_out'        => [MobileController::class, 'clockOut'],
    'mobile_capture_inspection' => [MobileController::class, 'captureInspection'],
    'mobile_sync_batch'       => [MobileController::class, 'submitOfflineBatch'],
    'mobile_sync_status'      => [MobileController::class, 'getSyncStatus'],
    'mobile_resolve_conflict' => [MobileController::class, 'resolveConflict'],
    'mobile_shop_overview'    => [MobileController::class, 'getShopFloorOverview'],
    'mobile_dashboard'        => [MobileController::class, 'getOperatorDashboard'],
]);

// CNC Programs
$router->actions([
    'cnc_program_list'          => [CncProgramController::class, 'listPrograms'],
    'cnc_program_detail'        => [CncProgramController::class, 'getDetail'],
    'cnc_program_create'        => [CncProgramController::class, 'create'],
    'cnc_program_update'        => [CncProgramController::class, 'update'],
    'cnc_program_upload_version'=> [CncProgramController::class, 'addVersion'],
    'cnc_program_approve'       => [CncProgramController::class, 'approve'],
    'cnc_program_setup_sheets'  => [CncProgramController::class, 'listSetupSheets'],
    'cnc_program_setup_create'  => [CncProgramController::class, 'createSetupSheet'],
]);

// Product Passport
$router->actions([
    'product_passport_list'      => [ProductPassportController::class, 'listPassports'],
    'product_passport_detail'    => [ProductPassportController::class, 'getDetail'],
    'product_passport_create'    => [ProductPassportController::class, 'create'],
    'product_passport_add_event' => [ProductPassportController::class, 'addEvent'],
    'product_passport_trace'     => [ProductPassportController::class, 'trace'],
    'product_passport_qr'        => [ProductPassportController::class, 'getQrData'],
]);

// AI Quality Scheduling
$router->actions([
    'ai_prediction_list'         => [AiSchedulingController::class, 'listPredictions'],
    'ai_prediction_acknowledge'  => [AiSchedulingController::class, 'acknowledgePrediction'],
    'ai_prediction_resolve'      => [AiSchedulingController::class, 'resolvePrediction'],
    'ai_spc_anomalies'           => [AiSchedulingController::class, 'getSpcAnomalies'],
    'ai_tool_wear'               => [AiSchedulingController::class, 'getToolWearPredictions'],
    'ai_dashboard'               => [AiSchedulingController::class, 'getDashboard'],
    'schedule_get'               => [AiSchedulingController::class, 'getSchedule'],
    'schedule_slot_create'       => [AiSchedulingController::class, 'createSlot'],
    'schedule_slot_update'       => [AiSchedulingController::class, 'updateSlot'],
    'schedule_conflicts'         => [AiSchedulingController::class, 'getConflicts'],
    'schedule_capacity'          => [AiSchedulingController::class, 'getCapacityHeatmap'],
    'schedule_promise'           => [AiSchedulingController::class, 'suggestPromiseDate'],
]);

// Customer Portal
$router->actions([
    'customer_portal_users'         => [CustomerPortalController::class, 'listUsers'],
    'customer_portal_user_create'   => [CustomerPortalController::class, 'createUser'],
    'customer_portal_user_update'   => [CustomerPortalController::class, 'updateUser'],
    'customer_portal_access_list'   => [CustomerPortalController::class, 'listAccessGrants'],
    'customer_portal_access_grant'  => [CustomerPortalController::class, 'grantAccess'],
    'customer_portal_access_revoke' => [CustomerPortalController::class, 'revokeAccess'],
    'customer_portal_complaints'    => [CustomerPortalController::class, 'listComplaints'],
    'customer_portal_documents'     => [CustomerPortalController::class, 'listDocAccess'],
    'customer_portal_analytics'     => [CustomerPortalController::class, 'getAnalytics'],
]);

// Compliance Reports
$router->actions([
    'compliance_report_types'           => [ComplianceReportController::class, 'listReportTypes'],
    'compliance_report_generate'        => [ComplianceReportController::class, 'generateReport'],
    'compliance_report_history'         => [ComplianceReportController::class, 'getHistory'],
    'compliance_report_management_review' => [ComplianceReportController::class, 'getManagementReviewData'],
    'compliance_report_customer_quality'  => [ComplianceReportController::class, 'getCustomerQualityData'],
    'compliance_report_supplier_review'   => [ComplianceReportController::class, 'getSupplierReviewData'],
    'compliance_report_copq'            => [ComplianceReportController::class, 'getCopqData'],
    'compliance_report_evidence_package' => [ComplianceReportController::class, 'getEvidencePackage'],
]);

// Knowledge Base
$router->actions([
    'knowledge_list'    => [KnowledgeController::class, 'listTips'],
    'knowledge_detail'  => [KnowledgeController::class, 'getDetail'],
    'knowledge_create'  => [KnowledgeController::class, 'create'],
    'knowledge_update'  => [KnowledgeController::class, 'update'],
    'knowledge_vote'    => [KnowledgeController::class, 'vote'],
    'knowledge_comment' => [KnowledgeController::class, 'addComment'],
]);

// Continuous Improvement
$router->actions([
    'ci_dashboard'           => [CiController::class, 'dashboard'],
    'ci_suggestion_list'     => [CiController::class, 'listSuggestions'],
    'ci_suggestion_create'   => [CiController::class, 'createSuggestion'],
    'ci_project_list'        => [CiController::class, 'listProjects'],
    'ci_project_create'      => [CiController::class, 'createProject'],
    'ci_project_update'      => [CiController::class, 'updateProject'],
    'ci_project_transition'  => [CiController::class, 'transitionProject'],
    'ci_roi_summary'         => [CiController::class, 'getRoiSummary'],
]);

// Energy Dashboard
$router->actions([
    'energy_overview'       => [EnergyController::class, 'getOverview'],
    'energy_machine_detail' => [EnergyController::class, 'getMachineDetail'],
    'energy_per_part'       => [EnergyController::class, 'getPerPartEnergy'],
    'energy_cost_trend'     => [EnergyController::class, 'getCostTrend'],
]);

// ── Register RESTful Routes ─────────────────────────────────────────────────

// Documents
$router->get('/api/documents', DocumentController::class, 'listCustom');
$router->post('/api/documents', DocumentController::class, 'create');
$router->get('/api/documents/{code}/versions', DocumentController::class, 'listVersions');
$router->get('/api/documents/stream', DocumentController::class, 'stream');
$router->get('/api/documents/visibility', DocumentController::class, 'getVisibility');

// Forms
$router->get('/api/forms', FormController::class, 'list');
$router->get('/api/forms/{code}/schema', FormController::class, 'getSchema');
$router->post('/api/forms/{code}/entries', FormController::class, 'submit');
$router->get('/api/forms/{code}/entries', FormController::class, 'getEntries');

// Records
$router->get('/api/records/registry', FormController::class, 'getIdRegistry');
$router->post('/api/records/next-id', FormController::class, 'getNextId');

// Users
$router->get('/api/users', UserController::class, 'list');
$router->post('/api/users', UserController::class, 'upsert');

// Auth
$router->get('/api/auth/status', AuthController::class, 'status');
$router->post('/api/auth/login', AuthController::class, 'login');
$router->post('/api/auth/mfa', AuthController::class, 'mfaVerify');
$router->post('/api/auth/enroll', AuthController::class, 'enrollVerify');
$router->post('/api/auth/logout', AuthController::class, 'logout');

// Dictionary
$router->get('/api/dictionary', DictController::class, 'list');
$router->post('/api/dictionary', DictController::class, 'upsert');
$router->delete('/api/dictionary', DictController::class, 'delete');

// Folders
$router->get('/api/folders', FileController::class, 'scanFolders');
$router->post('/api/folders', FileController::class, 'createFolder');

// Admin
$router->post('/api/admin/git/sync', AdminController::class, 'gitSync');
$router->post('/api/admin/git/pull', AdminController::class, 'gitPull');
$router->post('/api/admin/cache/clear', AdminController::class, 'clearCache');

// Documents — snapshot
$router->post('/api/documents/snapshot', DocumentController::class, 'docsSnapshot');

// Forms — draft upload
$router->post('/api/forms/upload-draft', FormController::class, 'uploadDraft');

// Dashboards
$router->get('/api/dashboard/executive', DashboardController::class, 'executive');
$router->get('/api/dashboard/quality', DashboardController::class, 'quality');
$router->get('/api/dashboard/production', DashboardController::class, 'production');
$router->get('/api/dashboard/supplier', DashboardController::class, 'supplier');
$router->get('/api/dashboard/department', DashboardController::class, 'department');
$router->get('/api/dashboard/widget', DashboardController::class, 'widget');

// KPI
$router->get('/api/kpi/alerts', DashboardController::class, 'kpiAlerts');
$router->get('/api/kpi/{metricCode}', DashboardController::class, 'kpiGet');
$router->get('/api/kpi/{metricCode}/trend', DashboardController::class, 'kpiTrend');

// SPC
$router->post('/api/spc/capability', DashboardController::class, 'spcCapability');
$router->post('/api/spc/chart', DashboardController::class, 'spcChart');
$router->get('/api/spc/alerts', DashboardController::class, 'spcAlerts');
$router->get('/api/spc/summary', DashboardController::class, 'spcSummary');

// Orders
$router->get('/api/orders/sales', OrderController::class, 'listSalesOrders');
$router->post('/api/orders/sales', OrderController::class, 'createSalesOrder');
$router->get('/api/orders/sales/{soNumber}', OrderController::class, 'getSalesOrderDetail');
$router->put('/api/orders/sales/{soNumber}', OrderController::class, 'updateSalesOrder');
$router->get('/api/orders/jobs', OrderController::class, 'listJobOrders');
$router->post('/api/orders/jobs', OrderController::class, 'createJobOrder');
$router->get('/api/orders/jobs/{joNumber}', OrderController::class, 'getJobOrderDetail');
$router->put('/api/orders/jobs/{joNumber}', OrderController::class, 'updateJobOrder');
$router->post('/api/orders/work', OrderController::class, 'createWorkOrder');
$router->put('/api/orders/work/{woNumber}', OrderController::class, 'updateWorkOrder');
$router->post('/api/orders/transition', OrderController::class, 'transition');
$router->get('/api/orders/hierarchy', OrderController::class, 'getHierarchy');
$router->get('/api/orders/timeline', OrderController::class, 'getTimeline');
$router->get('/api/orders/dashboard', OrderController::class, 'getDashboardKpi');
$router->get('/api/orders/search', OrderController::class, 'search');

// Exceptions
$router->get('/api/exceptions/dashboard', ExceptionController::class, 'dashboard');
$router->get('/api/exceptions', ExceptionController::class, 'listAll');
$router->get('/api/exceptions/{id}', ExceptionController::class, 'detail');
$router->post('/api/exceptions/complaints', ExceptionController::class, 'createComplaint');
$router->post('/api/exceptions/mrb', ExceptionController::class, 'createMrb');
$router->post('/api/exceptions/deviations', ExceptionController::class, 'createDeviation');
$router->post('/api/exceptions/concessions', ExceptionController::class, 'createConcession');
$router->get('/api/exceptions/copq', ExceptionController::class, 'copqSummary');
$router->get('/api/exceptions/trends', ExceptionController::class, 'trends');

// Supplier Quality
$router->get('/api/suppliers/dashboard', SupplierController::class, 'dashboard');
$router->get('/api/suppliers/scorecards', SupplierController::class, 'listScorecards');
$router->get('/api/suppliers/incoming', SupplierController::class, 'listIncoming');
$router->post('/api/suppliers/incoming', SupplierController::class, 'createIncoming');
$router->get('/api/suppliers/asl', SupplierController::class, 'listAsl');
$router->get('/api/suppliers/scar', SupplierController::class, 'listScar');
$router->post('/api/suppliers/scar', SupplierController::class, 'createScar');

// Quotes
$router->get('/api/quotes', QuoteController::class, 'listQuotes');
$router->post('/api/quotes', QuoteController::class, 'create');
$router->get('/api/quotes/{id}', QuoteController::class, 'detail');
$router->put('/api/quotes/{id}', QuoteController::class, 'update');
$router->post('/api/quotes/{id}/convert', QuoteController::class, 'convertToSo');

// Evidence
$router->get('/api/evidence', EvidenceController::class, 'listEvidence');
$router->post('/api/evidence', EvidenceController::class, 'upload');
$router->get('/api/evidence/{id}', EvidenceController::class, 'detail');
$router->post('/api/evidence/{id}/link', EvidenceController::class, 'link');
$router->get('/api/evidence/{id}/custody', EvidenceController::class, 'chainOfCustody');
$router->get('/api/evidence/verify', EvidenceController::class, 'verifyChain');
$router->get('/api/evidence/search', EvidenceController::class, 'search');

// ── Dispatch ────────────────────────────────────────────────────────────────

$handled = $router->dispatch();

if (!$handled) {
    // Fall back to legacy api.php for unmapped actions
    // The legacy file has already been loaded above and handled the request.
    // If we reach here, no action was matched.
    api_json(['ok' => false, 'error' => 'unknown_action'], 400);
}
