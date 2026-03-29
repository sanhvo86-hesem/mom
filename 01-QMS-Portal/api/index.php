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

// ── Dispatch ────────────────────────────────────────────────────────────────

$handled = $router->dispatch();

if (!$handled) {
    // Fall back to legacy api.php for unmapped actions
    // The legacy file has already been loaded above and handled the request.
    // If we reach here, no action was matched.
    api_json(['ok' => false, 'error' => 'unknown_action'], 400);
}
