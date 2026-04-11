<?php

declare(strict_types=1);

/**
 * HESEM MOM API v2 â€” New MVC Entry Point.
 *
 * Bootstraps the Router with middleware stack and dispatches to controllers.
 * Falls back to the legacy monolithic api.php for unmapped actions,
 * ensuring full backward compatibility during migration.
 *
 * @package MOM\Api
 * @since   2.0.0
 */

// â”€â”€ Error Handling â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

ini_set('display_errors', '0');
ini_set('log_errors', '1');
@ini_set('expose_php', '0');
error_reporting(E_ALL);

// â”€â”€ Paths â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

$BASE_DIR = dirname(__DIR__); // mom
$ROOT_DIR = realpath($BASE_DIR . '/..') ?: dirname($BASE_DIR);

$DATA_DIR_ENV = trim((string)(getenv('QMS_DATA_DIR') ?: ''));

// When api/index.php is required from api.php, $DATA_DIR is already resolved
// using the smart legacy-detection logic in api.php (resolve_runtime_data_dir).
// Reusing it avoids a path mismatch where QMS_DATA_DIR still points to the
// legacy qms-data directory while the actual runtime data lives in mom/data.
if (!isset($DATA_DIR) || $DATA_DIR === '') {
    $DATA_DIR = $DATA_DIR_ENV !== ''
        ? rtrim(str_replace('\\', '/', $DATA_DIR_ENV), '/\\')
        : $BASE_DIR . '/data';
}

$LOG_FILE = $DATA_DIR . '/php_error.log';
@ini_set('error_log', $LOG_FILE);

$apiConfig = require __DIR__ . '/config.php';

// â”€â”€ Autoloader â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// Simple PSR-4-like autoloader for MOM namespace
spl_autoload_register(function (string $class): void {
    // Namespace prefix -> directory mappings
    $map = [
        'MOM\\Api\\Controllers\\'  => __DIR__ . '/controllers/',
        'MOM\\Api\\Middleware\\'    => __DIR__ . '/middleware/',
        'MOM\\Api\\Validators\\'    => __DIR__ . '/validators/',
        'MOM\\Api\\Services\\'      => __DIR__ . '/services/',
        'MOM\\Services\\'           => __DIR__ . '/services/',
        'MOM\\Api\\'               => __DIR__ . '/',
        'MOM\\Database\\'           => dirname(__DIR__) . '/database/',
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

// â”€â”€ Load Legacy Functions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€ Import Classes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

use MOM\Api\Router;
use MOM\Api\Middleware\AuthMiddleware;
use MOM\Api\Middleware\CorsMiddleware;
use MOM\Api\Middleware\RateLimitMiddleware;
use MOM\Api\Middleware\AuditMiddleware;
use MOM\Api\Controllers\AuthController;
use MOM\Api\Controllers\DocumentController;
use MOM\Api\Controllers\FormController;
use MOM\Api\Controllers\FileController;
use MOM\Api\Controllers\UserController;
use MOM\Api\Controllers\AdminController;
use MOM\Api\Controllers\AdminMetadataStudioController;
use MOM\Api\Controllers\DictController;
use MOM\Api\Controllers\DashboardController;
use MOM\Api\Controllers\OrderController;
use MOM\Api\Controllers\ExceptionController;
use MOM\Api\Controllers\SupplierController;
use MOM\Api\Controllers\QuoteController;
use MOM\Api\Controllers\EvidenceController;
use MOM\Api\Controllers\FmeaController;
use MOM\Api\Controllers\ApqpController;
use MOM\Api\Controllers\DispatchController;
use MOM\Api\Controllers\LogisticsController;
use MOM\Api\Controllers\MasterDataController;
use MOM\Api\Controllers\MobileController;
use MOM\Api\Controllers\CncProgramController;
use MOM\Api\Controllers\ProductPassportController;
use MOM\Api\Controllers\AiSchedulingController;
use MOM\Api\Controllers\CustomerPortalController;
use MOM\Api\Controllers\ComplianceReportController;
use MOM\Api\Controllers\KnowledgeController;
use MOM\Api\Controllers\CiController;
use MOM\Api\Controllers\EnergyController;
use MOM\Api\Controllers\FinanceController;
use MOM\Api\Controllers\VpsController;
use MOM\Api\Controllers\GenericCrudController;
use MOM\Api\Controllers\ModuleSchemaController;
use MOM\Api\Controllers\SchemaStudioController;
use MOM\Api\Controllers\RegistryController;
use MOM\Api\Controllers\ApprovalGroupController;
use MOM\Api\Controllers\AllocationController;
use MOM\Api\Controllers\CustomerPurchaseOrderController;
use MOM\Api\Controllers\OperationalOverrideController;
use MOM\Database\DataLayer;

// â”€â”€ Bootstrap DataLayer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

$dataLayer = new DataLayer($DATA_DIR, $ROOT_DIR);

// â”€â”€ Build Router â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

$router = new Router($dataLayer, $ROOT_DIR, $DATA_DIR);
$router->setStore($store);
$router->setEmitBackendHeaders((bool)($apiConfig['observability']['emit_backend_headers'] ?? true));

// â”€â”€ Register Middleware â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

$corsMiddleware      = new CorsMiddleware(
    (array)($apiConfig['cors']['allowed_origins'] ?? []),
    (array)($apiConfig['cors']['allowed_methods'] ?? ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']),
    (array)($apiConfig['cors']['allowed_headers'] ?? ['Content-Type', 'X-CSRF-Token', 'X-Requested-With', 'Authorization']),
    (int)($apiConfig['cors']['max_age'] ?? 86400),
    (bool)($apiConfig['cors']['allow_credentials'] ?? true),
);
$authMiddleware      = new AuthMiddleware($store, (array)($apiConfig['auth'] ?? []));
$rateLimitMiddleware = new RateLimitMiddleware($DATA_DIR . '/ratelimit');
$auditMiddleware     = new AuditMiddleware($DATA_DIR . '/audit.log');

$router->use($corsMiddleware->handler());
$router->use($authMiddleware->handler());
$router->use($rateLimitMiddleware->handler());
$router->use($auditMiddleware->handler());

// â”€â”€ Register Action Routes (backward compatible) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    'admin_git_status'                 => [AdminController::class, 'gitStatus'],
    'admin_git_pull'                   => [AdminController::class, 'gitPull'],
    'admin_git_discard_local'          => [AdminController::class, 'gitDiscardLocal'],
    'admin_clear_site_cache'           => [AdminController::class, 'clearCache'],
    'get_data_settings'                => [AdminController::class, 'getSettings'],
    'save_data_settings'               => [AdminController::class, 'saveSettings'],
    'admin_portal_display_config_get'  => [AdminController::class, 'getPortalConfig'],
    'admin_portal_display_config_save' => [AdminController::class, 'savePortalConfig'],
    'module_access_get'                => [AdminController::class, 'getModuleAccessConfig'],
    'admin_module_access_save'         => [AdminController::class, 'saveModuleAccessConfig'],
    'admin_audit_trail_list'           => [AdminController::class, 'getAuditTrail'],
    'user_doc_overrides_get'           => [AdminController::class, 'getUserDocumentOverrides'],
    'admin_user_doc_overrides_save'    => [AdminController::class, 'saveUserDocumentOverrides'],
    'admin_mfa_settings_get'           => [AdminController::class, 'getMfaSettings'],
    'admin_mfa_settings_save'          => [AdminController::class, 'saveMfaSettings'],
    'admin_metadata_studio_summary'    => [AdminMetadataStudioController::class, 'getSummary'],
    'admin_metadata_studio_detail'     => [AdminMetadataStudioController::class, 'getDetail'],
    'admin_metadata_studio_save'       => [AdminMetadataStudioController::class, 'saveDetail'],
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
    'order_shipment_gate_override' => [OrderController::class, 'overrideShipmentGate'],
    'order_shipment_gate_overrides' => [OrderController::class, 'listShipmentGateOverrides'],
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

// Finance control objects
$router->actions([
    'finance_period_close_list' => [FinanceController::class, 'listPeriodCloses'],
    'finance_period_close_create' => [FinanceController::class, 'createPeriodClose'],
    'finance_period_close_transition' => [FinanceController::class, 'transitionPeriodClose'],
    'finance_backdate_exception_list' => [FinanceController::class, 'listBackdateExceptions'],
    'finance_backdate_exception_create' => [FinanceController::class, 'createBackdateException'],
    'finance_backdate_exception_transition' => [FinanceController::class, 'transitionBackdateException'],
    'finance_credit_memo_list' => [FinanceController::class, 'listCreditMemos'],
    'finance_credit_memo_create' => [FinanceController::class, 'createCreditMemo'],
    'finance_debit_memo_list' => [FinanceController::class, 'listDebitMemos'],
    'finance_debit_memo_create' => [FinanceController::class, 'createDebitMemo'],
]);

// Commercial customer purchase-order controls
$router->actions([
    'customer_purchase_order_list' => [CustomerPurchaseOrderController::class, 'listPurchaseOrders'],
    'customer_purchase_order_detail' => [CustomerPurchaseOrderController::class, 'getPurchaseOrder'],
    'customer_purchase_order_create' => [CustomerPurchaseOrderController::class, 'createPurchaseOrder'],
    'customer_purchase_order_transition' => [CustomerPurchaseOrderController::class, 'transitionPurchaseOrder'],
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

// Master Data Management
$router->actions([
    'master_data_list'            => [MasterDataController::class, 'listRecords'],
    'master_data_detail'          => [MasterDataController::class, 'getDetail'],
    'master_data_create'          => [MasterDataController::class, 'createRecord'],
    'master_data_update'          => [MasterDataController::class, 'updateRecord'],
    'master_data_delete'          => [MasterDataController::class, 'deleteRecord'],
    'master_data_status'          => [MasterDataController::class, 'changeStatus'],
    'master_data_history'         => [MasterDataController::class, 'getHistory'],
    'master_data_entities'        => [MasterDataController::class, 'listEntities'],
    'master_data_snapshot'        => [MasterDataController::class, 'listRecords'],
    // Shifts
    'shift_list'                  => [MasterDataController::class, 'listShifts'],
    'shift_save'                  => [MasterDataController::class, 'saveShift'],
    'shift_assignments'           => [MasterDataController::class, 'listShiftAssignments'],
    'shift_assign'                => [MasterDataController::class, 'saveShiftAssignment'],
    'shift_holidays'              => [MasterDataController::class, 'listHolidays'],
    'shift_holiday_save'          => [MasterDataController::class, 'saveHoliday'],
]);

// Production Dispatch & Shift Targets
$router->actions([
    'dispatch_timeline'          => [DispatchController::class, 'getTimeline'],
    'dispatch_dashboard'         => [DispatchController::class, 'getDashboard'],
    'dispatch_list_targets'      => [DispatchController::class, 'listTargets'],
    'dispatch_create_target'     => [DispatchController::class, 'createTarget'],
    'dispatch_update_target'     => [DispatchController::class, 'updateTarget'],
    'dispatch_send'              => [DispatchController::class, 'dispatchTarget'],
    'dispatch_operator_tasks'    => [DispatchController::class, 'getOperatorDispatch'],
    'dispatch_report_production' => [DispatchController::class, 'reportProduction'],
]);

// Logistics: Subcontract, OQC, Packing, Delivery
$router->actions([
    'subcontract_list'          => [LogisticsController::class, 'subcontract_list'],
    'subcontract_create'        => [LogisticsController::class, 'subcontract_create'],
    'subcontract_update'        => [LogisticsController::class, 'subcontract_update'],
    'subcontract_receive'       => [LogisticsController::class, 'subcontract_receive'],
    'oqc_list'                  => [LogisticsController::class, 'oqc_list'],
    'oqc_create'                => [LogisticsController::class, 'oqc_create'],
    'oqc_update'                => [LogisticsController::class, 'oqc_update'],
    'packing_list'              => [LogisticsController::class, 'packing_list'],
    'packing_create'            => [LogisticsController::class, 'packing_create'],
    'packing_update'            => [LogisticsController::class, 'packing_update'],
    'delivery_confirm'          => [LogisticsController::class, 'delivery_confirm'],
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

// Registry-backed generic CRUD
$tableRegistryPath = $DATA_DIR . '/registry/table-registry.json';
$tableRegistry = [];
if (is_file($tableRegistryPath)) {
    $rawTableRegistry = @file_get_contents($tableRegistryPath);
    $decodedTableRegistry = $rawTableRegistry !== false ? json_decode($rawTableRegistry, true) : null;
    $tableRegistry = is_array($decodedTableRegistry['tables'] ?? null) ? $decodedTableRegistry['tables'] : [];
}

foreach ($tableRegistry as $tableName => $tableMeta) {
    if (!is_string($tableName) || !is_array($tableMeta)) {
        continue;
    }

    $domain = strtolower((string)($tableMeta['domain'] ?? ''));
    $safeTable = strtolower($tableName);
    if (!preg_match('/^[a-z0-9_]+$/', $domain) || !preg_match('/^[a-z0-9_]+$/', $safeTable)) {
        continue;
    }

    $prefix = $domain . '.' . $safeTable;
    $primaryKey = $tableMeta['primaryKey'] ?? null;
    $hasPrimaryKey = false;
    if (is_string($primaryKey) && trim($primaryKey) !== '') {
        $hasPrimaryKey = true;
    } elseif (is_array($primaryKey)) {
        $pkFields = array_values(array_filter(array_map(static fn($value): string => trim((string)$value), $primaryKey), static fn(string $value): bool => $value !== ''));
        $hasPrimaryKey = $pkFields !== [];
    }

    $router->actions([
        $prefix . '.list'   => [GenericCrudController::class, 'listRecords'],
        $prefix . '.create' => [GenericCrudController::class, 'createRecord'],
    ]);

    if ($hasPrimaryKey) {
        $router->actions([
            $prefix . '.detail' => [GenericCrudController::class, 'getDetail'],
            $prefix . '.update' => [GenericCrudController::class, 'updateRecord'],
            $prefix . '.delete' => [GenericCrudController::class, 'deleteRecord'],
        ]);
    }

    if ($hasPrimaryKey && !empty($tableMeta['statusColumn'])) {
        $router->action($prefix . '.transition', GenericCrudController::class, 'transitionRecord');
    }
}

// â”€â”€ Frontend Action Aliases â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Map frontend action names to existing controller methods where naming differs.

// Module 15: quality-exception-hub.js aliases
$router->actions([
    'quality_exception_list'            => [ExceptionController::class, 'listAll'],
    'quality_exception_kpi'             => [ExceptionController::class, 'dashboard'],
    'quality_exception_copq'            => [ExceptionController::class, 'copqSummary'],
    'quality_exception_trends'          => [ExceptionController::class, 'trends'],
    'quality_exception_create'          => [ExceptionController::class, 'createComplaint'],
    'quality_exception_transition'      => [ExceptionController::class, 'transition'],
    'quality_exception_save_8d'         => [ExceptionController::class, 'updateComplaint'],
    'quality_exception_mrb_disposition' => [ExceptionController::class, 'updateMrb'],
]);

// Module 16: supplier-quality.js aliases
$router->actions([
    'supplier_quality_data'         => [SupplierController::class, 'dashboard'],
    'supplier_asl_create'           => [SupplierController::class, 'upsertAsl'],
    'supplier_asl_suspend'          => [SupplierController::class, 'upsertAsl'],
    'supplier_audit_create'         => [SupplierController::class, 'upsertAudit'],
    'supplier_incoming_disposition' => [SupplierController::class, 'updateIncoming'],
]);

// Module 17: quoting-engine.js aliases
$router->actions([
    'quote_kpi'  => [QuoteController::class, 'dashboard'],
    'quote_save' => [QuoteController::class, 'create'],
]);

// Module 19: customer-portal-admin.js aliases
$router->actions([
    'customer_portal_data'                => [CustomerPortalController::class, 'getAdminData'],
    'customer_portal_grant_access'        => [CustomerPortalController::class, 'grantAccess'],
    'customer_portal_revoke_access'       => [CustomerPortalController::class, 'revokeAccess'],
    'customer_portal_complaint_update'    => [CustomerPortalController::class, 'updateComplaintStatus'],
    'customer_portal_resend_verification' => [CustomerPortalController::class, 'resendVerification'],
    'customer_portal_revoke_doc'          => [CustomerPortalController::class, 'revokeDocument'],
]);

// Module 20: cnc-programs.js aliases
$router->actions([
    'cnc_program_data'       => [CncProgramController::class, 'listPrograms'],
    'cnc_program_compare'    => [CncProgramController::class, 'getDetail'],
    'cnc_setup_sheet_create' => [CncProgramController::class, 'createSetupSheet'],
]);

// Module 21: product-passport.js aliases
$router->actions([
    'product_passport_data'       => [ProductPassportController::class, 'listPassports'],
    'product_passport_transition' => [ProductPassportController::class, 'addEvent'],
]);

// Module 22: ai-quality-scheduling.js aliases
$router->actions([
    'ai_quality_scheduling_data' => [AiSchedulingController::class, 'getDashboard'],
    'ai_prediction_false_positive' => [AiSchedulingController::class, 'resolvePrediction'],
    'schedule_promise_calculate' => [AiSchedulingController::class, 'suggestPromiseDate'],
    'schedule_slot_breakdown'    => [AiSchedulingController::class, 'getSchedule'],
    'schedule_slot_detail'       => [AiSchedulingController::class, 'getSchedule'],
]);

// Module 23: compliance-reports.js aliases
$router->actions([
    'compliance_report_list' => [ComplianceReportController::class, 'listReportTypes'],
]);

// Module 24: fmea-control-plan.js aliases
$router->actions([
    'fmea_save'            => [FmeaController::class, 'createFmea'],
    'cp_detail'            => [FmeaController::class, 'getControlPlanDetail'],
    'cp_add_characteristic'=> [FmeaController::class, 'updateFmea'],
    'cp_auto_generate'     => [FmeaController::class, 'generateControlPlan'],
]);

// Module 25: apqp-ppap.js aliases
$router->actions([
    'apqp_toggle_deliverable' => [ApqpController::class, 'submitGateReview'],
    'ppap_create'             => [ApqpController::class, 'createPpapSubmission'],
    'ppap_update_element'     => [ApqpController::class, 'updatePpapElement'],
]);

// Module 26: mobile-shopfloor.js aliases
$router->actions([
    'mobile_queue'              => [MobileController::class, 'getMyQueue'],
    'mobile_create_ncr'         => [MobileController::class, 'captureInspection'],
    'mobile_inspection_plan'    => [MobileController::class, 'getMyQueue'],
    'mobile_submit_first_piece' => [MobileController::class, 'captureInspection'],
    'mobile_submit_inprocess'   => [MobileController::class, 'captureInspection'],
    'mobile_sync'               => [MobileController::class, 'submitOfflineBatch'],
]);

// Module 09e: so-jo-wo-dashboard.js aliases
$router->actions([
    'order_detail'           => [OrderController::class, 'getSalesOrderDetail'],
    'order_update_fields'    => [OrderController::class, 'updateSalesOrder'],
    'order_so_update_status' => [OrderController::class, 'transition'],
    'order_jo_update_status' => [OrderController::class, 'transition'],
    'order_wo_update_status' => [OrderController::class, 'transition'],
    'order_get_linked_forms' => [OrderController::class, 'getHierarchy'],
]);

// â”€â”€ Register RESTful Routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// Meta / API catalog
$router->get('/api/meta/catalog', ModuleSchemaController::class, 'apiCatalog');

// System contract registry for frontend/AI tooling
$router->get('/api/system/contracts', RegistryController::class, 'getSystemContract');
$router->get('/api/registry/table-registry', RegistryController::class, 'getTableRegistry');
$router->get('/api/registry/endpoint-catalog', RegistryController::class, 'getEndpointCatalog');
$router->get('/api/registry/workflow-library', RegistryController::class, 'getWorkflowLibrary');
$router->get('/api/registry/status-options', RegistryController::class, 'getStatusOptions');
$router->get('/api/registry/relation-map', RegistryController::class, 'getRelationMap');
$router->get('/api/registry/compliance-crosswalk', RegistryController::class, 'getComplianceCrosswalk');
$router->get('/api/registry/global-capability-audit', RegistryController::class, 'getGlobalCapabilityAudit');
$router->get('/api/registry/manifest', RegistryController::class, 'getRegistryManifest');

// Generic runtime entity access
$router->get('/api/runtime/{domain}/{table}', GenericCrudController::class, 'listRecords');
$router->get('/api/runtime/{domain}/{table}/{id}', GenericCrudController::class, 'getDetail');
$router->post('/api/runtime/{domain}/{table}', GenericCrudController::class, 'createRecord');
$router->put('/api/runtime/{domain}/{table}/{id}', GenericCrudController::class, 'updateRecord');
$router->delete('/api/runtime/{domain}/{table}/{id}', GenericCrudController::class, 'deleteRecord');
$router->post('/api/runtime/{domain}/{table}/{id}/transition', GenericCrudController::class, 'transitionRecord');

// ── Foundation Governance Contract Slice: Public REST Routes ────────────────

// Foundation read-through
$router->get('/api/v1/foundation/organizations', MasterDataController::class, 'listFoundationOrganizations');
$router->get('/api/v1/foundation/parties', MasterDataController::class, 'listFoundationParties');
$router->get('/api/v1/foundation/calendars', MasterDataController::class, 'listFoundationCalendars');

// Governance approval-group
$router->get('/api/v1/governance/approval-groups', ApprovalGroupController::class, 'listApprovalGroups');
$router->get('/api/v1/governance/approval-groups/{approvalGroupId}', ApprovalGroupController::class, 'getApprovalGroup');
$router->post('/api/v1/governance/approval-groups/{approvalGroupId}:decide', ApprovalGroupController::class, 'decideApprovalGroup');
$router->get('/api/v1/governance/approval-groups/{approvalGroupId}/timeline', ApprovalGroupController::class, 'listApprovalGroupTimeline');
$router->get('/api/v1/governance/approval-groups/{approvalGroupId}/attachments', EvidenceController::class, 'listApprovalGroupAttachments');

// Governance attachments
$router->get('/api/v1/governance/attachments/{attachmentId}', EvidenceController::class, 'getGovernanceAttachment');
$router->post('/api/v1/governance/attachments', EvidenceController::class, 'createGovernanceAttachment');

// Governance override controls
$router->get('/api/v1/governance/override-controls', OperationalOverrideController::class, 'listOverrides');
$router->get('/api/v1/governance/override-controls/{overrideId}', OperationalOverrideController::class, 'getOverride');
$router->post('/api/v1/governance/override-controls', OperationalOverrideController::class, 'createOverride');
$router->post('/api/v1/governance/override-controls/{overrideId}:transition', OperationalOverrideController::class, 'transitionOverride');

// Finance control objects
$router->get('/api/v1/finance/period-closes', FinanceController::class, 'listPeriodCloses');
$router->get('/api/v1/finance/period-closes/{periodCloseId}', FinanceController::class, 'getPeriodClose');
$router->post('/api/v1/finance/period-closes', FinanceController::class, 'createPeriodClose');
$router->post('/api/v1/finance/period-closes/{periodCloseId}:transition', FinanceController::class, 'transitionPeriodClose');
$router->get('/api/v1/finance/backdate-exceptions', FinanceController::class, 'listBackdateExceptions');
$router->get('/api/v1/finance/backdate-exceptions/{backdateExceptionId}', FinanceController::class, 'getBackdateException');
$router->post('/api/v1/finance/backdate-exceptions', FinanceController::class, 'createBackdateException');
$router->post('/api/v1/finance/backdate-exceptions/{backdateExceptionId}:transition', FinanceController::class, 'transitionBackdateException');
$router->get('/api/v1/finance/credit-memos', FinanceController::class, 'listCreditMemos');
$router->get('/api/v1/finance/credit-memos/{creditMemoId}', FinanceController::class, 'getCreditMemo');
$router->post('/api/v1/finance/credit-memos', FinanceController::class, 'createCreditMemo');
$router->get('/api/v1/finance/debit-memos', FinanceController::class, 'listDebitMemos');
$router->get('/api/v1/finance/debit-memos/{debitMemoId}', FinanceController::class, 'getDebitMemo');
$router->post('/api/v1/finance/debit-memos', FinanceController::class, 'createDebitMemo');

// Commercial customer purchase-order objects
$router->get('/api/v1/commercial/customer-purchase-orders', CustomerPurchaseOrderController::class, 'listPurchaseOrders');
$router->get('/api/v1/commercial/customer-purchase-orders/{customerPoId}', CustomerPurchaseOrderController::class, 'getPurchaseOrder');
$router->post('/api/v1/commercial/customer-purchase-orders', CustomerPurchaseOrderController::class, 'createPurchaseOrder');
$router->post('/api/v1/commercial/customer-purchase-orders/{customerPoId}:transition', CustomerPurchaseOrderController::class, 'transitionPurchaseOrder');

// Folders
$router->get('/api/folders', FileController::class, 'scanFolders');
$router->post('/api/folders', FileController::class, 'createFolder');

// Admin
$router->post('/api/admin/git/sync', AdminController::class, 'gitSync');
$router->post('/api/admin/git/pull', AdminController::class, 'gitPull');
$router->post('/api/admin/cache/clear', AdminController::class, 'clearCache');

// Documents â€” snapshot
$router->post('/api/documents/snapshot', DocumentController::class, 'docsSnapshot');

// Forms â€” draft upload
$router->post('/api/forms/upload-draft', FormController::class, 'uploadDraft');
$router->post('/api/forms/drafts', FormController::class, 'saveDraft');
$router->get('/api/forms/drafts', FormController::class, 'listDrafts');
$router->get('/api/forms/{code}/draft', FormController::class, 'getDraft');

// Dashboards
$router->get('/api/dashboard/executive', DashboardController::class, 'executive');
$router->get('/api/dashboard/quality', DashboardController::class, 'quality');
$router->get('/api/dashboard/production', DashboardController::class, 'production');
$router->get('/api/dashboard/supplier', DashboardController::class, 'supplier');
$router->get('/api/dashboard/department', DashboardController::class, 'department');
$router->get('/api/dashboard/widget', DashboardController::class, 'widget');

// VPS Control Tower
$router->get('/api/vps/overview', VpsController::class, 'overview');
$router->get('/api/vps/host', VpsController::class, 'host');
$router->post('/api/vps/action', VpsController::class, 'runAction');
$router->get('/api/vps/files', VpsController::class, 'fileList');
$router->get('/api/vps/files/search', VpsController::class, 'fileSearch');
$router->get('/api/vps/files/read', VpsController::class, 'fileRead');
$router->post('/api/vps/files/mutate', VpsController::class, 'fileMutate');
$router->post('/api/vps/files/upload', VpsController::class, 'fileUpload');
$router->get('/api/vps/terminal/auth', VpsController::class, 'terminalAuth');
$router->get('/api/vps/observability/auth', VpsController::class, 'observabilityAuth');

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

// â”€â”€ Dispatch â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

$handled = $router->dispatch();

if (!$handled) {
    // Fall back to legacy api.php for unmapped actions
    // The legacy file has already been loaded above and handled the request.
    // If we reach here, no action was matched.
    api_json(['ok' => false, 'error' => 'unknown_action'], 400);
}
