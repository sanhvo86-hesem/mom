<?php
declare(strict_types=1);

/**
 * HESEM QMS - Secure Server-Side API (single-file)
 * - Session auth
 * - CSRF token
 * - TOTP 2FA (Authenticator)
 * - File-based user store (users.json)
 *
 * Notes:
 * - Session cookie configured for subdomain qms.hesem.com.vn (SameSite=Lax) to avoid losing session during OTP flow.
 * - Supports action aliases: status/auth_status, auth_login/login, auth_mfa_verify/mfa_verify/verify, auth_enroll_verify/enroll_verify/enroll, auth_logout/logout
 */

ini_set('display_errors', '0');
ini_set('log_errors', '1');
@ini_set('expose_php', '0');
error_reporting(E_ALL);

$BASE_DIR   = __DIR__;
// Project root (one level above /01-QMS-Portal)
$ROOT_DIR = realpath($BASE_DIR . '/..') ?: dirname($BASE_DIR);
$ROOT_PARENT_DIR = realpath($ROOT_DIR . '/..') ?: dirname($ROOT_DIR);

$LEGACY_DATA_DIR = $BASE_DIR . '/qms-data';
$DATA_DIR_ENV = trim((string)(getenv('QMS_DATA_DIR') ?: ''));

if ($DATA_DIR_ENV !== '') {
  $DATA_DIR = rtrim(str_replace('\\', '/', $DATA_DIR_ENV), '/\\');
} else {
  // NOTE: Always use in-repo qms-data dir. Do NOT create qms-data-private outside
  // the repo — it breaks git deploy (files outside repo are not synced by git pull).
  // All config/data lives in 01-QMS-Portal/qms-data/ which is protected by .htaccess.
  $DATA_DIR = $LEGACY_DATA_DIR;
}

if (!is_dir($DATA_DIR)) @mkdir($DATA_DIR, 0775, true);

$CONF_DIR   = $DATA_DIR . '/config';
$USERS_FILE = $CONF_DIR . '/users.json';
$ROLE_PERMS_FILE   = $CONF_DIR . '/role_permissions.json';
$CUSTOM_DOCS_FILE  = $CONF_DIR . '/docs_custom.json';
$DOC_VIS_FILE     = $CONF_DIR . '/docs_visibility.json';
$PORTAL_DISPLAY_CONFIG_FILE = $CONF_DIR . '/portal_display_config.json';
$FORM_CONTROL_REGISTRY_FILE = $CONF_DIR . '/form_control_registry.json';
$ORDERS_FILE = $DATA_DIR . '/orders/orders.json';
$MASTER_DATA_FILE = $DATA_DIR . '/master-data/master-data.json';
$PORTAL_CONFIG_JS_FILE = $BASE_DIR . '/scripts/portal/01-data-config.js';
$LOG_FILE   = $DATA_DIR . '/php_error.log';
$RL_DIR     = $DATA_DIR . '/ratelimit';
$MAX_FORM_UPLOAD_BYTES = 25 * 1024 * 1024;
$PENDING_AUTH_TTL_SECONDS = 10 * 60;

// Legacy (centralized) document version store (kept for backward compatibility / migration)
$ARCHIVE_DIR = $ROOT_DIR . '/archive';

// Dictionary data file (editable via Admin)
$DICT_JSON_FILE = $ROOT_DIR . '/11-Glossary/dict-data.json';
$DICT_JS_FILE   = $ROOT_DIR . '/11-Glossary/dict-data.js';

@ini_set('error_log', $LOG_FILE);

require_once __DIR__ . '/form_workflow.php';

// ---------- Hard fail safe handlers ----------
register_shutdown_function(function () {
  $e = error_get_last();
  if ($e) { @error_log('FATAL: ' . json_encode($e, JSON_UNESCAPED_SLASHES)); }
});

set_exception_handler(function (Throwable $e) {
  @error_log('[API] Uncaught: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
  api_json(['ok' => false, 'error' => 'server_error'], 500);
});

set_error_handler(function (int $severity, string $message, string $file, int $line) {
  throw new ErrorException($message, 0, $severity, $file, $line);
});

// ---------- Helpers ----------
function api_json(array $payload, int $code = 200): void {
  // Ensure session data is written before responding (important for OTP flow)
  if (session_status() === PHP_SESSION_ACTIVE) {
    @session_write_close();
  }

  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
  header('X-Content-Type-Options: nosniff');
  header('X-Frame-Options: SAMEORIGIN');
  header('Referrer-Policy: same-origin');
  echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

function ensure_dir(string $dir): void {
  if (!is_dir($dir)) {
    @mkdir($dir, 0775, true);
  }
  // Try to ensure directory is writable (shared hosting / CGI setups)
  if (is_dir($dir) && !is_writable($dir)) {
    @chmod($dir, 0775);
  }
}

function migrate_legacy_data_dir(string $legacyDir, string $targetDir): void {
  $legacyNorm = rtrim(str_replace('\\', '/', $legacyDir), '/');
  $targetNorm = rtrim(str_replace('\\', '/', $targetDir), '/');
  if ($legacyNorm === $targetNorm) return;
  if (!is_dir($legacyDir)) return;

  ensure_dir($targetDir);
  $it = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($legacyDir, FilesystemIterator::SKIP_DOTS),
    RecursiveIteratorIterator::SELF_FIRST
  );

  foreach ($it as $item) {
    $itemPath = str_replace('\\', '/', $item->getPathname());
    $rel = ltrim(substr($itemPath, strlen($legacyNorm)), '/');
    if ($rel === '') continue;
    $dst = $targetNorm . '/' . $rel;

    if ($item->isDir()) {
      if (!is_dir($dst)) @mkdir($dst, 0775, true);
      continue;
    }

    if (is_file($dst)) continue;
    $dstDir = dirname($dst);
    if (!is_dir($dstDir)) @mkdir($dstDir, 0775, true);
    @copy($item->getPathname(), $dst);
  }
}

function migrate_role(string $role): string {
  static $map = [
    'general_director' => 'ceo',
    'deputy_director' => 'production_director',
    'prod_manager' => 'cnc_workshop_manager',
    'prod_supervisor' => 'shift_leader',
    'cnc_setup' => 'setup_technician',
    'cnc_programmer' => 'cam_nc_programmer',
    'qms_supervisor' => 'qms_engineer',
    'doc_controller' => 'qms_engineer',
    'purchasing_officer' => 'buyer',
    'procurement_manager' => 'supply_chain_manager',
    'sales_officer' => 'estimator',
    'planning_officer' => 'production_planner',
    'hse_officer' => 'ehs_specialist',
    'maintenance_tech' => 'maintenance_technician',
    'finance_officer' => 'gl_payroll_accountant',
    'warehouse_staff' => 'warehouse_clerk',
    'warehouse_lead' => 'supply_chain_manager',
  ];
  return $map[$role] ?? $role;
}

function admin_roles(): array {
  return ['it_admin', 'ceo', 'qa_manager',
          // Legacy names (pre-v10)
          'general_director', 'qms_supervisor', 'doc_controller'];
}

function safe_rel_path(string $p): string {
  // normalize to a safe relative path (no leading slash, no ..)
  $p = str_replace('\\', '/', $p);
  $p = preg_replace('#/+#', '/', $p);
  $p = ltrim((string)$p, '/');
  if ($p === '' || str_contains($p, '..')) {
    throw new RuntimeException('Invalid path');
  }
  return $p;
}

function join_in_root(string $root, string $rel): string {
  $rel = safe_rel_path($rel);
  $full = rtrim($root, '/\\') . '/' . $rel;
  // Resolve parent directory at least (file may not exist yet)
  $parent = realpath(dirname($full));
  if ($parent === false) {
    // try to create parent later; still enforce that dirname is within root
    $rootReal = realpath($root) ?: $root;
    $rootReal = rtrim(str_replace('\\','/',$rootReal), '/');
    $parentGuess = rtrim(str_replace('\\','/',dirname($full)), '/');
    if (!str_starts_with($parentGuess, $rootReal)) {
      throw new RuntimeException('Path escapes root');
    }
    return $full;
  }
  $rootReal = realpath($root) ?: $root;
  $rootReal = rtrim(str_replace('\\','/',$rootReal), '/');
  $parent = rtrim(str_replace('\\','/',$parent), '/');
  if (!str_starts_with($parent, $rootReal)) {
    throw new RuntimeException('Path escapes root');
  }
  return $full;
}

function is_inside_root(string $absPath, string $rootDir): bool {
  $rootReal = realpath($rootDir) ?: $rootDir;
  $rootNorm = rtrim(str_replace('\\', '/', $rootReal), '/');
  $pathReal = realpath($absPath);
  $pathNorm = rtrim(str_replace('\\', '/', ($pathReal ?: $absPath)), '/');
  return $pathNorm === $rootNorm || str_starts_with($pathNorm . '/', $rootNorm . '/');
}

function is_reserved_root_segment(string $relPath): bool {
  $relPath = safe_rel_path($relPath);
  $first = explode('/', $relPath, 2)[0] ?? '';
  $reserved = ['01-QMS-Portal', 'assets', '11-Glossary', 'archive', '_Deleted', '.git'];
  return in_array($first, $reserved, true);
}

function first_existing_rel_dir(array $candidates, string $rootDir): string {
  foreach ($candidates as $candidate) {
    $rel = safe_rel_path((string)$candidate);
    if (is_dir(rtrim($rootDir, '/\\') . '/' . $rel)) return $rel;
  }
  if (!empty($candidates)) return safe_rel_path((string)$candidates[0]);
  throw new RuntimeException('No candidate directories configured');
}

function default_folder_for_cat(string $cat, string $rootDir): string {
  $candidates = match ($cat) {
    'MAN' => ['02-Tai-Lieu-He-Thong/01-Quality-Manual'],
    'POL' => ['02-Tai-Lieu-He-Thong/02-Policies-Objectives'],
    'ORG', 'JD', 'DEP' => ['02-Tai-Lieu-He-Thong/03-Organization'],
    'SOP', 'PROC' => ['03-Tai-Lieu-Van-Hanh/01-SOPs'],
    'WI' => ['03-Tai-Lieu-Van-Hanh/02-Work-Instructions'],
    'ANNEX' => ['03-Tai-Lieu-Van-Hanh/03-Reference'],
    'FRM' => ['04-Bieu-Mau'],
    'TRN' => ['10-Training-Academy'],
    default => ['03-Tai-Lieu-Van-Hanh/01-SOPs'],
  };
  return first_existing_rel_dir($candidates, $rootDir);
}

function scan_derive_cat(string $topName): string {
  $map = [
    'Quality-Manual' => 'MAN',
    'Policies-Objectives' => 'POL',
    'SOPs' => 'SOP',
    'Processes' => 'PROC',
    'Work-Instructions' => 'WI',
    'Forms-Records' => 'FRM',
    'Bieu-Mau' => 'FRM',
    'Organization' => 'ORG',
    'Annexes-References' => 'ANNEX',
    'Training-Academy' => 'TRN',
    'Tai-Lieu-He-Thong' => 'SYS',
    'Tai-Lieu-Van-Hanh' => 'OPS',
    'Reference' => 'REF',
  ];
  foreach ($map as $k => $v) {
    if (stripos($topName, $k) !== false) return $v;
  }
  return strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $topName), 0, 6));
}

function scan_cat_from_filename(string $fn): ?string {
  $fn = strtolower($fn);
  if (str_starts_with($fn, 'sop-')) return 'SOP';
  if (str_starts_with($fn, 'wi-')) return 'WI';
  if (str_starts_with($fn, 'frm-')) return 'FRM';
  if (str_starts_with($fn, 'ref-')) return 'ANNEX';
  if (str_starts_with($fn, 'qms-man')) return 'MAN';
  if (str_starts_with($fn, 'pol-')) return 'POL';
  if (str_starts_with($fn, 'jd-') || str_starts_with($fn, 'dept-') || str_starts_with($fn, 'raci-') || str_starts_with($fn, 'authority-')) return 'ORG';
  if (str_starts_with($fn, 'proc-')) return 'SOP';
  if (str_starts_with($fn, 'annex-')) return 'ANNEX';
  return null;
}

function scan_cat_from_subfolder(string $subName): ?string {
  $map = [
    'Quality-Manual' => 'MAN', 'Policies-Objectives' => 'POL',
    'SOPs' => 'SOP', 'Work-Instructions' => 'WI', 'Reference' => 'ANNEX',
    'ANNEX-System' => 'ANNEX', 'ANNEX-Standards' => 'ANNEX', 'ANNEX-Digital' => 'ANNEX',
    'Organization' => 'ORG', 'Org-Chart' => 'ORG', 'Department-Handbooks' => 'ORG',
    'Job-Descriptions' => 'ORG', 'RACI-Authority' => 'ORG', 'Labor-Relations' => 'ORG',
    'Bieu-Mau' => 'FRM',
    'Competency-System' => 'TRN', 'Training-Content' => 'TRN', 'System-Operations' => 'TRN',
  ];
  foreach ($map as $k => $v) {
    if (stripos($subName, $k) !== false) return $v;
  }
  return null;
}

function scan_extract_code(string $fn): string {
  $stem = pathinfo($fn, PATHINFO_FILENAME);
  if (preg_match('/^(sop-\d{3})/i', $stem, $m)) return strtoupper($m[1]);
  if (preg_match('/^(frm-\d{3})/i', $stem, $m)) return strtoupper($m[1]);
  if (preg_match('/^(wi-\d{3})/i', $stem, $m)) return strtoupper($m[1]);
  if (preg_match('/^(ref-\d{3})/i', $stem, $m)) return strtoupper($m[1]);
  if (preg_match('/^(jd-[a-z-]+)/i', $stem, $m)) return strtoupper(substr($m[1], 0, 30));
  if (preg_match('/^(dept-[a-z-]+)/i', $stem, $m)) return strtoupper(substr($m[1], 0, 30));
  if (preg_match('/^(raci-[a-z-]+)/i', $stem, $m)) return strtoupper(substr($m[1], 0, 30));
  if (preg_match('/^(authority-[a-z-]+)/i', $stem, $m)) return strtoupper(substr($m[1], 0, 30));
  if (preg_match('/^((?:sop|proc|wi|frm|annex|pol|qms|dept)-[a-z]+-\d+)/i', $stem, $m)) return strtoupper($m[1]);
  if (preg_match('/^(frm-hr-jd-[a-z]+-\d+)/i', $stem, $m)) return strtoupper($m[1]);
  if (preg_match('/^(frm-hr-trn-\d+)/i', $stem, $m)) return strtoupper($m[1]);
  if (preg_match('/^(annex-dep-[a-z]+-\d+)/i', $stem, $m)) return strtoupper($m[1]);
  if (preg_match('/^(annex-(?:job|org)-\d+)/i', $stem, $m)) return strtoupper($m[1]);
  if (preg_match('/^(qms-man-\d+)/i', $stem, $m)) return strtoupper($m[1]);
  if (preg_match('/^(qms-gdl-\d+)/i', $stem, $m)) return strtoupper($m[1]);
  if (preg_match('/^(annex-hr-lab-\d+)/i', $stem, $m)) return 'LAB-' . preg_replace('/.*?(\d+)$/', '$1', strtoupper($m[1]));
  return strtoupper(preg_replace('/[^A-Z0-9-]/i', '-', substr($stem, 0, 40)));
}

function scan_classify_doc_cat(string $topCat, ?string $subName, string $fn): string {
  $topCat = strtoupper(trim($topCat));
  if (in_array($topCat, ['SYS', 'OPS'], true)) {
    return scan_cat_from_subfolder((string)$subName) ?? scan_cat_from_filename($fn) ?? $topCat;
  }
  return $topCat !== '' ? $topCat : (scan_cat_from_filename($fn) ?? 'SOP');
}

function rrmdir(string $dir): bool {
  if (!is_dir($dir)) return true;
  $it = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS),
    RecursiveIteratorIterator::CHILD_FIRST
  );
  foreach ($it as $item) {
    $ok = $item->isDir() ? @rmdir($item->getPathname()) : @unlink($item->getPathname());
    if (!$ok) return false;
  }
  return @rmdir($dir);
}

function move_dir_fallback(string $srcDir, string $dstDir): bool {
  if (@rename($srcDir, $dstDir)) return true;
  if (!is_dir($srcDir)) return false;

  ensure_dir($dstDir);
  $srcNorm = rtrim(str_replace('\\', '/', $srcDir), '/');
  $it = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($srcDir, FilesystemIterator::SKIP_DOTS),
    RecursiveIteratorIterator::SELF_FIRST
  );
  foreach ($it as $item) {
    $itemPath = str_replace('\\', '/', $item->getPathname());
    $rel = ltrim(substr($itemPath, strlen($srcNorm)), '/');
    $dstPath = rtrim($dstDir, '/\\') . '/' . $rel;
    if ($item->isDir()) {
      if (!is_dir($dstPath) && !@mkdir($dstPath, 0775, true)) return false;
      continue;
    }
    $parent = dirname($dstPath);
    if (!is_dir($parent) && !@mkdir($parent, 0775, true)) return false;
    if (!@copy($item->getPathname(), $dstPath)) return false;
  }
  return rrmdir($srcDir);
}

function require_logged_in(array $store): array {
  if (empty($_SESSION['user'])) api_json(['ok' => false, 'error' => 'unauthorized'], 401);

  // Idle session timeout (ISO / security hardening): 4 hours of inactivity => force re-login
  $idleLimit = 4 * 60 * 60; // 4h
  $now = time();
  if (isset($_SESSION['last_active'])) {
    $last = (int)$_SESSION['last_active'];
    if ($last > 0 && ($now - $last) > $idleLimit) {
      destroy_auth_session();
      api_json(['ok' => false, 'error' => 'session_expired'], 401);
    }
  }
  $_SESSION['last_active'] = $now;

  $me = find_user_by_username($store, (string)$_SESSION['user']);
  if (!$me || !($me['active'] ?? true)) api_json(['ok' => false, 'error' => 'unauthorized'], 401);

  // Enforce completed MFA whenever system policy requires it or the user has MFA enabled.
  $settings = $store['settings'] ?? [];
  if (session_requires_completed_mfa($me, is_array($settings) ? $settings : []) && empty($_SESSION['mfa_ok'])) {
    api_json(['ok' => false, 'error' => 'mfa_required'], 401);
  }

  return $me;
}


function read_json_file(string $path): ?array {
  if (!is_file($path)) return null;
  $raw = @file_get_contents($path);
  if ($raw === false) return null;
  $j = json_decode((string)$raw, true);
  return is_array($j) ? $j : null;
}

function write_json_file(string $path, array $data): void {
  $dir = dirname($path);
  ensure_dir($dir);
  $tmp = $path . '.tmp';
  $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
  if ($json === false) throw new RuntimeException('Failed to encode json');
  if (@file_put_contents($tmp, $json, LOCK_EX) === false) throw new RuntimeException('Cannot write json');
  @rename($tmp, $path);
}

function ts_compact(): string {
  return gmdate('Ymd_His');
}

function human_dt(): string {
  // Match portal format: YYYY-MM-DD HH:MM
  return gmdate('Y-m-d H:i');
}

function sanitize_code(string $code): string {
  $code = strtoupper(trim($code));
  return preg_replace('/[^A-Z0-9_\-\.]/', '_', $code);
}


// ---------- Role permissions (server-backed) ----------
function default_role_permissions(): array {
  // Roles that can create new documents by default
  return [
    'ceo' => ['canCreateDocs' => true],
    'qa_manager' => ['canCreateDocs' => true],
    'qms_engineer' => ['canCreateDocs' => true],
    'it_admin' => ['canCreateDocs' => true],
    'production_director' => ['canCreateDocs' => true],
  ];
}

function load_role_permissions(string $file): array {
  $j = read_json_file($file);
  if (is_array($j)) return $j;
  return default_role_permissions();
}

function save_role_permissions(string $file, array $perms): void {
  write_json_file($file, $perms);
}

function role_can_create_docs(array $user, string $file): bool {
  $role = (string)($user['role'] ?? '');
  $perms = load_role_permissions($file);
  if (isset($perms[$role]) && is_array($perms[$role]) && array_key_exists('canCreateDocs', $perms[$role])) {
    return (bool)$perms[$role]['canCreateDocs'];
  }
  // Hard fallback (safe)
  $mRole = migrate_role($role);
  $creators = ['qa_manager', 'ceo', 'qms_engineer', 'it_admin', 'production_director'];
  return in_array($role, $creators, true) || in_array($mRole, $creators, true);
}

function user_is_admin(array $user): bool {
  $role = (string)($user['role'] ?? '');
  $mRole = migrate_role($role);
  $admins = admin_roles();
  return in_array($role, $admins, true) || in_array($mRole, $admins, true);
}

function require_doc_workflow_editor(array $user, string $rolePermFile): void {
  if (user_is_admin($user)) return;
  if (role_can_create_docs($user, $rolePermFile)) return;
  api_json(['ok' => false, 'error' => 'forbidden'], 403);
}

function require_doc_workflow_approver(array $user): void {
  // Approval/reject must be elevated roles only (server-side gate).
  if (!user_is_admin($user)) {
    api_json(['ok' => false, 'error' => 'forbidden'], 403);
  }
}

// ---------- Custom documents list (server-backed) ----------
function load_custom_docs(string $file): array {
  $j = read_json_file($file);
  if (is_array($j)) {
    if (isset($j['docs']) && is_array($j['docs'])) return $j['docs'];
    // Backward-compatible: allow a plain array of docs
    $isList = true;
    $i = 0;
    foreach (array_keys($j) as $k) {
      if ($k !== $i) { $isList = false; break; }
      $i++;
    }
    if ($isList) return $j;
  }
  return [];
}

function save_custom_docs(string $file, array $docs): void {
  // Store as an object so we can extend later
  write_json_file($file, ['docs' => array_values($docs), 'updated_at' => now_iso()]);
}

function path_equals_or_child(string $candidate, string $base): bool {
  $candidate = trim(str_replace('\\', '/', $candidate), '/');
  $base = trim(str_replace('\\', '/', $base), '/');
  if ($candidate === '' || $base === '') return false;
  $candidate = safe_rel_path($candidate);
  $base = safe_rel_path($base);
  return $candidate === $base || str_starts_with($candidate, $base . '/');
}

function patch_custom_doc_entries(string $file, string $code, array $patch): bool {
  $code = strtoupper(trim($code));
  if ($code === '' || empty($patch)) return false;
  $custom = load_custom_docs($file);
  $changed = false;
  foreach ($custom as &$doc) {
    if (!is_array($doc)) continue;
    if (strtoupper((string)($doc['code'] ?? '')) !== $code) continue;
    foreach ($patch as $key => $value) {
      if (($doc[$key] ?? null) !== $value) {
        $doc[$key] = $value;
        $changed = true;
      }
    }
  }
  unset($doc);
  if ($changed) save_custom_docs($file, $custom);
  return $changed;
}

// ---------- Document visibility (Effective docs) ----------
function load_doc_visibility(string $file): array {
  $j = read_json_file($file);
  if (is_array($j)) {
    $hidden = $j['hidden'] ?? null;
    if (is_array($hidden)) return array_values($hidden);
  }
  return [];
}

function save_doc_visibility(string $file, array $hidden): void {
  // Store as object for extensibility
  $hidden = array_values(array_unique(array_map('strval', $hidden)));
  write_json_file($file, ['hidden' => $hidden, 'updated_at' => now_iso()]);
}

function portal_default_doc_extensions(): array {
  static $extensions = ['html', 'pdf', 'doc', 'docx', 'docm', 'xls', 'xlsx', 'xlsm', 'xlsb', 'csv', 'ppt', 'pptx', 'pptm'];
  return $extensions;
}

function portal_normalize_extension_list(array $values): array {
  $out = [];
  $seen = [];
  foreach ($values as $value) {
    $ext = strtolower(trim((string)$value));
    $ext = ltrim($ext, '.');
    $ext = preg_replace('/[^a-z0-9]+/', '', $ext);
    if ($ext === '' || strlen($ext) > 16 || isset($seen[$ext])) continue;
    $seen[$ext] = true;
    $out[] = $ext;
  }
  return $out;
}

function portal_normalize_lower_id_list(array $values): array {
  $out = [];
  $seen = [];
  foreach ($values as $value) {
    $id = strtolower(trim((string)$value));
    $id = preg_replace('/[^a-z0-9_-]+/', '', $id);
    if ($id === '' || isset($seen[$id])) continue;
    $seen[$id] = true;
    $out[] = $id;
  }
  return $out;
}

function portal_normalize_upper_id_list(array $values): array {
  $out = [];
  $seen = [];
  foreach ($values as $value) {
    $id = strtoupper(trim((string)$value));
    $id = preg_replace('/[^A-Z0-9_-]+/', '', $id);
    if ($id === '' || isset($seen[$id])) continue;
    $seen[$id] = true;
    $out[] = $id;
  }
  return $out;
}

function portal_display_config_defaults(): array {
  return [
    'extensions' => [
      'enabled' => portal_default_doc_extensions(),
      'custom' => [],
    ],
    'sidebar' => [
      'hidden_core_items' => [],
      'hidden_sections' => [],
      'hidden_categories' => [],
    ],
  ];
}

function portal_display_config_known_extensions(array $config): array {
  $out = [];
  $seen = [];
  foreach (array_merge(portal_default_doc_extensions(), portal_normalize_extension_list($config['extensions']['custom'] ?? [])) as $ext) {
    if ($ext === '' || isset($seen[$ext])) continue;
    $seen[$ext] = true;
    $out[] = $ext;
  }
  return $out;
}

function portal_display_config_enabled_extensions(array $config): array {
  $known = portal_display_config_known_extensions($config);
  $enabledRaw = portal_normalize_extension_list($config['extensions']['enabled'] ?? []);
  $enabledLookup = array_fill_keys($enabledRaw, true);
  $out = [];
  foreach ($known as $ext) {
    if (isset($enabledLookup[$ext])) $out[] = $ext;
  }
  return $out;
}

function portal_load_display_config(string $file): array {
  $defaults = portal_display_config_defaults();
  $raw = read_json_file($file);
  if (!is_array($raw)) {
    $raw = [];
  }

  $config = [
    'extensions' => [
      'custom' => portal_normalize_extension_list($raw['extensions']['custom'] ?? []),
      'enabled' => portal_normalize_extension_list($raw['extensions']['enabled'] ?? $defaults['extensions']['enabled']),
    ],
    'sidebar' => [
      'hidden_core_items' => portal_normalize_lower_id_list($raw['sidebar']['hidden_core_items'] ?? []),
      'hidden_sections' => portal_normalize_lower_id_list($raw['sidebar']['hidden_sections'] ?? []),
      'hidden_categories' => portal_normalize_upper_id_list($raw['sidebar']['hidden_categories'] ?? []),
    ],
  ];

  $known = portal_display_config_known_extensions($config);
  $enabled = portal_display_config_enabled_extensions($config);
  $builtinLookup = array_fill_keys(portal_default_doc_extensions(), true);
  $custom = array_values(array_filter($known, function ($ext) use ($builtinLookup) {
    return !isset($builtinLookup[$ext]);
  }));

  $config['extensions']['custom'] = $custom;
  $config['extensions']['enabled'] = $enabled;

  return $config;
}

function portal_save_display_config(string $file, array $config): array {
  $normalized = portal_load_display_config($file);

  if (isset($config['extensions']) && is_array($config['extensions'])) {
    $normalized['extensions']['custom'] = portal_normalize_extension_list($config['extensions']['custom'] ?? []);
    $normalized['extensions']['enabled'] = portal_normalize_extension_list($config['extensions']['enabled'] ?? []);
  }

  if (isset($config['sidebar']) && is_array($config['sidebar'])) {
    $normalized['sidebar']['hidden_core_items'] = portal_normalize_lower_id_list($config['sidebar']['hidden_core_items'] ?? []);
    $normalized['sidebar']['hidden_sections'] = portal_normalize_lower_id_list($config['sidebar']['hidden_sections'] ?? []);
    $normalized['sidebar']['hidden_categories'] = portal_normalize_upper_id_list($config['sidebar']['hidden_categories'] ?? []);
  }

  $known = portal_display_config_known_extensions($normalized);
  $enabledLookup = array_fill_keys(portal_normalize_extension_list($normalized['extensions']['enabled'] ?? []), true);
  $enabled = [];
  foreach ($known as $ext) {
    if (isset($enabledLookup[$ext])) $enabled[] = $ext;
  }
  $builtinLookup = array_fill_keys(portal_default_doc_extensions(), true);
  $custom = array_values(array_filter($known, function ($ext) use ($builtinLookup) {
    return !isset($builtinLookup[$ext]);
  }));

  $normalized['extensions']['custom'] = $custom;
  $normalized['extensions']['enabled'] = $enabled;

  write_json_file($file, [
    'extensions' => [
      'custom' => $normalized['extensions']['custom'],
      'enabled' => $normalized['extensions']['enabled'],
    ],
    'sidebar' => [
      'hidden_core_items' => $normalized['sidebar']['hidden_core_items'],
      'hidden_sections' => $normalized['sidebar']['hidden_sections'],
      'hidden_categories' => $normalized['sidebar']['hidden_categories'],
    ],
    'updated_at' => now_iso(),
  ]);

  return $normalized;
}

function portal_display_config_public_payload(array $config): array {
  return [
    'extensions' => [
      'builtin' => portal_default_doc_extensions(),
      'custom' => $config['extensions']['custom'] ?? [],
      'known' => portal_display_config_known_extensions($config),
      'enabled' => portal_display_config_enabled_extensions($config),
    ],
    'sidebar' => [
      'hidden_core_items' => $config['sidebar']['hidden_core_items'] ?? [],
      'hidden_sections' => $config['sidebar']['hidden_sections'] ?? [],
      'hidden_categories' => $config['sidebar']['hidden_categories'] ?? [],
    ],
  ];
}

function portal_doc_extension_is_enabled(string $ext, array $displayConfig): bool {
  $ext = strtolower(trim($ext));
  if ($ext === '') return false;
  return in_array($ext, portal_display_config_enabled_extensions($displayConfig), true);
}

function portal_extract_doc_code(string $filename): string {
  $stem = pathinfo($filename, PATHINFO_FILENAME);
  if (preg_match('/^(sop-\d{3})/i', $stem, $m)) return strtoupper($m[1]);
  if (preg_match('/^(frm-\d{3})/i', $stem, $m)) return strtoupper($m[1]);
  if (preg_match('/^(wi-\d{3})/i', $stem, $m)) return strtoupper($m[1]);
  if (preg_match('/^(ref-\d{3})/i', $stem, $m)) return strtoupper($m[1]);
  if (preg_match('/^(jd-[a-z-]+)/i', $stem, $m)) return strtoupper(substr($m[1], 0, 30));
  if (preg_match('/^(dept-[a-z-]+)/i', $stem, $m)) return strtoupper(substr($m[1], 0, 30));
  if (preg_match('/^(raci-[a-z-]+)/i', $stem, $m)) return strtoupper(substr($m[1], 0, 30));
  if (preg_match('/^(authority-[a-z-]+)/i', $stem, $m)) return strtoupper(substr($m[1], 0, 30));
  if (preg_match('/^((?:sop|proc|wi|frm|annex|pol|qms|dept)-[a-z]+-\d+)/i', $stem, $m)) return strtoupper($m[1]);
  if (preg_match('/^(frm-hr-jd-[a-z]+-\d+)/i', $stem, $m)) return strtoupper($m[1]);
  if (preg_match('/^(frm-hr-trn-\d+)/i', $stem, $m)) return strtoupper($m[1]);
  if (preg_match('/^(annex-dep-[a-z]+-\d+)/i', $stem, $m)) return strtoupper($m[1]);
  if (preg_match('/^(annex-(?:job|org)-\d+)/i', $stem, $m)) return strtoupper($m[1]);
  if (preg_match('/^(qms-man-\d+)/i', $stem, $m)) return strtoupper($m[1]);
  if (preg_match('/^(qms-gdl-\d+)/i', $stem, $m)) return strtoupper($m[1]);
  if (preg_match('/^(annex-hr-lab-\d+)/i', $stem, $m)) return 'LAB-' . preg_replace('/.*?(\d+)$/', '$1', strtoupper($m[1]));
  return strtoupper(preg_replace('/[^A-Z0-9-]/i', '-', substr($stem, 0, 40)));
}

function portal_parse_js_string_array(string $src, string $constName): array {
  $pattern = '/const\s+' . preg_quote($constName, '/') . '\s*=\s*\[(.*?)\];/s';
  if (!preg_match($pattern, $src, $m)) return [];
  preg_match_all('/"((?:[^"\\\\]|\\\\.)*)"/', $m[1], $matches);
  return array_values(array_map('stripcslashes', $matches[1] ?? []));
}

function portal_load_role_docs(string $jsFile): array {
  static $cache = [];
  if (isset($cache[$jsFile])) return $cache[$jsFile];
  if (!is_file($jsFile)) return $cache[$jsFile] = [];
  $src = (string)@file_get_contents($jsFile);
  if ($src === '') return $cache[$jsFile] = [];

  $shared = [
    '_UNI' => portal_parse_js_string_array($src, '_UNI'),
    '_MGR' => portal_parse_js_string_array($src, '_MGR'),
  ];

  if (!preg_match('/const\s+ROLE_DOCS\s*=\s*\{(.*?)\n\};/s', $src, $m)) {
    return $cache[$jsFile] = [];
  }

  $body = (string)$m[1];
  $roleDocs = [];
  $currentRole = null;
  $currentPatterns = [];
  foreach (preg_split('/\R/', $body) as $rawLine) {
    $line = preg_replace('/\/\/.*$/', '', (string)$rawLine);
    $line = trim((string)$line);
    if ($line === '') continue;

    if ($currentRole === null) {
      if (preg_match('/^([A-Za-z0-9_]+)\s*:\s*"([^"]+)"\s*,?$/', $line, $mm)) {
        $roleDocs[$mm[1]] = $mm[2];
        continue;
      }
      if (preg_match('/^([A-Za-z0-9_]+)\s*:\s*\[$/', $line, $mm)) {
        $currentRole = $mm[1];
        $currentPatterns = [];
      }
      continue;
    }

    if ($line === '],' || $line === ']') {
      $roleDocs[$currentRole] = array_values(array_unique($currentPatterns));
      $currentRole = null;
      $currentPatterns = [];
      continue;
    }

    if (preg_match_all('/\.\.\.(_[A-Za-z0-9_]+)/', $line, $spreads)) {
      foreach ($spreads[1] as $spreadName) {
        foreach (($shared[$spreadName] ?? []) as $value) $currentPatterns[] = $value;
      }
    }

    if (preg_match_all('/"((?:[^"\\\\]|\\\\.)*)"/', $line, $strings)) {
      foreach ($strings[1] as $value) $currentPatterns[] = stripcslashes($value);
    }
  }

  return $cache[$jsFile] = $roleDocs;
}

function portal_normalize_doc_pattern(string $pattern): array {
  $raw = strtoupper(trim($pattern));
  if ($raw === '') return [];
  $base = preg_replace('/-\*$/', '*', $raw);
  $out = [$base => true];
  $aliasMap = [
    'AUTHORITY-MATRIX' => 'ANNEX-QMS-025',
    'RACI-MASTER-MATRIX' => 'ANNEX-QMS-026',
    'ANNEX-HR-LAB*' => 'LAB*',
    'ANNEX-JOB*' => 'JD*',
    'REF-001*' => 'ANNEX-QMS-001*',
    'REF-002*' => 'ANNEX-QMS-002*',
    'REF-005*' => 'ANNEX-QMS-020*',
    'REF-006*' => 'ANNEX-QMS-016*',
    'REF-007*' => 'ANNEX-QMS-011*',
    'REF-008*' => 'ANNEX-QMS-024*',
    'REF-010*' => 'ANNEX-QMS-005*',
    'REF-011*' => 'ANNEX-QMS-006*',
    'REF-012*' => 'ANNEX-QMS-012*',
    'REF-013*' => 'ANNEX-QMS-018*',
    'REF-014*' => 'ANNEX-QMS-006*',
    'REF-015*' => 'ANNEX-QMS-015*',
    'REF-020*' => 'ANNEX-OPS-003*',
    'REF-021*' => 'ANNEX-QMS-023*',
  ];
  if (isset($aliasMap[$base])) $out[$aliasMap[$base]] = true;
  if ($base === 'REF*' || $base === 'REF-*') $out['ANNEX*'] = true;
  if ($base === 'REF-01*') {
    foreach (['ANNEX-QMS-005*','ANNEX-QMS-006*','ANNEX-QMS-008*','ANNEX-QMS-012*','ANNEX-QMS-015*','ANNEX-QMS-018*','ANNEX-IT-001*','ANNEX-IT-002*'] as $alias) {
      $out[$alias] = true;
    }
  }
  return array_keys($out);
}

function portal_doc_code_matches_pattern(string $docCode, string $pattern): bool {
  $code = strtoupper(trim($docCode));
  if ($code === '') return false;
  foreach (portal_normalize_doc_pattern($pattern) as $normalized) {
    if (str_ends_with($normalized, '*')) {
      if (str_starts_with($code, substr($normalized, 0, -1))) return true;
      continue;
    }
    if ($code === $normalized) return true;
  }
  return false;
}

function portal_get_doc_subfolder_label(array $doc): string {
  $folder = str_replace('\\', '/', (string)($doc['folder'] ?? ''));
  if ($folder === '') {
    $path = str_replace('\\', '/', (string)($doc['path'] ?? ''));
    $folder = dirname($path);
  }
  $segment = trim((string)(basename($folder) ?: ''), '/.');
  if (preg_match('/^\d{2}-(.+)$/', $segment, $m)) return $m[1];
  return $segment;
}

function portal_can_access_jd_doc(array $user, array $doc, array $roleDocs): bool {
  $role = migrate_role((string)($user['role'] ?? ''));
  $patterns = $roleDocs[$role] ?? null;
  if ($patterns === 'ALL') return true;
  if ($role === 'hr_manager') return true;

  $dept = strtoupper((string)($user['dept'] ?? ''));
  if ($dept === 'EXE' || $dept === 'BOD') return true;

  $sub = portal_get_doc_subfolder_label($doc);
  if ($sub === '') return false;

  $map = [
    'JD-Executive' => ['EXE','BOD'],
    'JD-Production' => ['PRO','CNC'],
    'JD-Engineering' => ['ENG'],
    'JD-Quality' => ['QA','QC'],
    'JD-Supply-Chain' => ['SCM','PUR','WHS'],
    'JD-Sales' => ['SAL'],
    'JD-Finance' => ['FIN'],
    'JD-HR' => ['HR'],
    'JD-EHS' => ['EHS','HSE'],
    'JD-IT' => ['IT'],
    'JD-EXE' => ['EXE','BOD'],
    'JD-PRO' => ['PRO','CNC'],
    'JD-ENG' => ['ENG'],
    'JD-QA' => ['QA','QC'],
    'JD-PUR' => ['PUR','SCM'],
    'JD-SAL' => ['SAL'],
    'JD-WHS' => ['WHS','SCM'],
    'JD-MNT' => ['MNT','PRO'],
    'JD-PLA' => ['PLA','PRO'],
    'JD-FIN' => ['FIN'],
    'JD-HSE' => ['HSE','EHS'],
  ];
  if (isset($map[$sub]) && in_array($dept, $map[$sub], true)) return true;

  if (preg_match('/^JD-([A-Za-z-]+)$/', $sub, $m)) {
    $subDept = strtoupper($m[1]);
    if ($subDept === $dept) return true;
    $nameMap = [
      'EXECUTIVE' => 'EXE',
      'PRODUCTION' => 'PRO',
      'ENGINEERING' => 'ENG',
      'QUALITY' => 'QA',
      'SUPPLY-CHAIN' => 'SCM',
      'SALES' => 'SAL',
      'FINANCE' => 'FIN',
      'HR' => 'HR',
      'IT' => 'IT',
      'EHS' => 'EHS',
      'HSE' => 'HSE',
    ];
    if (($nameMap[$subDept] ?? null) === $dept) return true;
  }

  return false;
}

function portal_can_access_doc(array $user, array $doc, array $roleDocs, array $hiddenCodes = [], array $displayConfig = []): bool {
  $code = strtoupper(trim((string)($doc['code'] ?? '')));
  if ($code === '') return false;
  if (in_array($code, $hiddenCodes, true)) return false;

  $ext = strtolower(trim((string)($doc['ext'] ?? portal_get_doc_extension((string)($doc['path'] ?? '')))));
  if ($displayConfig && !portal_doc_extension_is_enabled($ext, $displayConfig)) return false;

  $role = migrate_role((string)($user['role'] ?? ''));
  $patterns = $roleDocs[$role] ?? null;
  if ($patterns === null) return false;

  $path = str_replace('\\', '/', (string)($doc['path'] ?? ''));
  if ($path !== '' && str_contains($path, 'Job-Descriptions')) {
    return portal_can_access_jd_doc($user, $doc, $roleDocs);
  }

  if ($patterns === 'ALL') return true;
  if (!is_array($patterns)) return false;
  foreach ($patterns as $pattern) {
    if (portal_doc_code_matches_pattern($code, (string)$pattern)) return true;
  }
  return false;
}

function portal_filter_docs_for_user(array $docs, array $user, string $portalConfigJsFile, array $hiddenCodes = [], array $displayConfig = []): array {
  $roleDocs = portal_load_role_docs($portalConfigJsFile);
  if (!$roleDocs) return [];
  $hiddenUpper = array_values(array_unique(array_map(function($value) {
    return strtoupper((string)$value);
  }, $hiddenCodes)));

  $out = [];
  foreach ($docs as $doc) {
    if (!is_array($doc)) continue;
    if (portal_can_access_doc($user, $doc, $roleDocs, $hiddenUpper, $displayConfig)) $out[] = $doc;
  }
  return $out;
}

function portal_supported_doc_extensions(): array {
  return portal_default_doc_extensions();
}

function portal_supported_download_only_extensions(): array {
  return array_values(array_filter(portal_supported_doc_extensions(), function ($ext) {
    return $ext !== 'html';
  }));
}

function portal_get_doc_extension(string $path): string {
  return strtolower(trim((string)pathinfo($path, PATHINFO_EXTENSION)));
}

function portal_is_supported_doc_file_name(string $fileName): bool {
  return in_array(portal_get_doc_extension($fileName), portal_supported_doc_extensions(), true);
}

function portal_stream_mime_map(): array {
  static $map = [
    'html' => 'text/html; charset=utf-8',
    'pdf' => 'application/pdf',
    'doc' => 'application/msword',
    'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'docm' => 'application/vnd.ms-word.document.macroEnabled.12',
    'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'xlsm' => 'application/vnd.ms-excel.sheet.macroEnabled.12',
    'xlsb' => 'application/vnd.ms-excel.sheet.binary.macroEnabled.12',
    'xls' => 'application/vnd.ms-excel',
    'csv' => 'text/csv; charset=utf-8',
    'ppt' => 'application/vnd.ms-powerpoint',
    'pptx' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'pptm' => 'application/vnd.ms-powerpoint.presentation.macroEnabled.12',
    'svg' => 'image/svg+xml',
    'png' => 'image/png',
    'jpg' => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'gif' => 'image/gif',
    'webp' => 'image/webp',
    'css' => 'text/css; charset=utf-8',
  ];
  return $map;
}

function portal_stream_mime_type(string $ext): string {
  $map = portal_stream_mime_map();
  return $map[strtolower(trim($ext))] ?? 'application/octet-stream';
}

function portal_stream_can_inline(string $ext): bool {
  return in_array(strtolower(trim($ext)), ['html', 'pdf', 'svg', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'css'], true);
}

function portal_fallback_doc_title(string $fileName): string {
  $title = pathinfo($fileName, PATHINFO_FILENAME);
  $title = preg_replace('/[_-]+/', ' ', (string)$title);
  $title = preg_replace('/\s+/', ' ', (string)$title);
  $title = trim((string)$title);
  return $title !== '' ? $title : $fileName;
}

function portal_doc_title_is_fallback(array $doc): bool {
  $title = strtolower(trim((string)($doc['title'] ?? '')));
  if ($title === '') return true;
  foreach (portal_supported_doc_extensions() as $ext) {
    $suffix = '.' . $ext;
    if (str_ends_with($title, $suffix)) return true;
  }
  return false;
}

function portal_doc_quality_score(array $doc): int {
  $path = strtolower((string)($doc['path'] ?? ''));
  $ext = strtolower((string)($doc['ext'] ?? portal_get_doc_extension($path)));
  $score = portal_doc_title_is_fallback($doc) ? 0 : 1000;
  if (($doc['status'] ?? '') === 'approved') $score += 250;
  if ($ext === 'html') $score += 300;
  if (($doc['delivery_mode'] ?? '') === 'download' && $ext !== 'html') $score += 50;
  if (in_array($ext, portal_supported_download_only_extensions(), true)) $score += 120;
  $score += min(strlen(pathinfo($path, PATHINFO_FILENAME)), 200);
  return $score;
}

function portal_dedupe_docs(array $docs): array {
  $byCode = [];
  $order = [];
  foreach ($docs as $doc) {
    if (!is_array($doc)) continue;
    $code = strtoupper(trim((string)($doc['code'] ?? '')));
    if ($code === '') continue;
    if (!isset($byCode[$code])) {
      $byCode[$code] = $doc;
      $order[] = $code;
      continue;
    }
    if (portal_doc_quality_score($doc) > portal_doc_quality_score($byCode[$code])) {
      $byCode[$code] = $doc;
    }
  }
  $out = [];
  foreach ($order as $code) $out[] = $byCode[$code];
  return $out;
}

function portal_normalize_revision_value(string $value): string {
  $value = trim($value);
  if ($value === '') return '0';
  return ltrim($value, "Vv");
}

function doc_recompute_release_state(array $versions, array $state): array {
  $hasApproved = false;
  $releasedRev = '';
  foreach ($versions as $v) {
    if (!is_array($v)) continue;
    $st = (string)($v['status'] ?? '');
    if ($st === 'approved' || $st === 'initial_release') {
      $hasApproved = true;
      $ver = revision_from_version_string((string)($v['version'] ?? ''));
      if ($ver !== '') {
        $releasedRev = $ver;
        break; // versions are newest-first
      }
    }
  }
  if ($releasedRev === '') {
    $releasedRev = portal_normalize_revision_value((string)($state['released_revision'] ?? ($state['revision'] ?? '0')));
  }
  $state['status'] = $hasApproved ? 'approved' : 'draft';
  $state['revision'] = $hasApproved ? $releasedRev : portal_normalize_revision_value((string)($state['revision'] ?? '0'));
  $state['released_revision'] = $releasedRev;
  $state['has_release'] = $hasApproved;
  foreach (['lastEdit','submittedBy','submittedDate','submittedUpdateType','rejectedBy','rejectedDate','checked_out_by'] as $k) {
    if (array_key_exists($k, $state)) unset($state[$k]);
  }
  return $state;
}

function load_form_control_registry_docs(string $file, string $rootDir, ?array $allowedExtensions = null): array {
  global $DATA_DIR;
  $json = read_json_file($file);
  if (!is_array($json)) return [];
  $allowedExtensions = is_array($allowedExtensions) ? array_values(array_unique(array_map('strval', $allowedExtensions))) : portal_supported_doc_extensions();

  $docs = [];
  foreach ($json as $entry) {
    if (!is_array($entry)) continue;
    $code = strtoupper(trim((string)($entry['code'] ?? '')));
    $path = trim((string)($entry['path'] ?? ''));
    if ($code === '' || $path === '') continue;

    try {
      $relPath = safe_rel_path($path);
      $absPath = join_in_root($rootDir, $relPath);
    } catch (Throwable $e) {
      continue;
    }
    if (!is_file($absPath) || !is_inside_root($absPath, $rootDir)) continue;

    $ext = strtolower(trim((string)($entry['ext'] ?? pathinfo($relPath, PATHINFO_EXTENSION))));
    if (!in_array($ext, $allowedExtensions, true)) continue;

    $folder = trim((string)($entry['folder'] ?? dirname($relPath)));
    $state = form_load_state_existing($DATA_DIR, $code);
    $status = strtolower(trim((string)($entry['status'] ?? 'approved'))) ?: 'approved';
    $revision = portal_normalize_revision_value((string)($entry['rev'] ?? '0'));
    $owner = trim((string)($entry['owner'] ?? 'QA/QMS')) ?: 'QA/QMS';
    if (is_array($state)) {
      if (!empty($state['status'])) $status = strtolower(trim((string)$state['status']));
      if (array_key_exists('revision', $state)) $revision = portal_normalize_revision_value((string)($state['revision'] ?? '0'));
      if (!empty($state['owner'])) $owner = trim((string)$state['owner']);
    }
    $docs[] = [
      'code' => $code,
      'title' => trim((string)($entry['title'] ?? '')) ?: $code,
      'cat' => 'FRM',
      'path' => $relPath,
      'rev' => $revision,
      'status' => $status,
      'owner' => $owner,
      'folder' => $folder,
      'ext' => $ext,
      'delivery_mode' => trim((string)($entry['delivery_mode'] ?? 'download')) ?: 'download',
      'portal_behavior' => trim((string)($entry['portal_behavior'] ?? 'download_on_open')) ?: 'download_on_open',
      'effective_date' => trim((string)($entry['effective_date'] ?? '')),
      'browser_open_enabled' => (bool)($entry['browser_open_enabled'] ?? false),
      'control_status' => trim((string)($entry['control_status'] ?? 'RELEASED')),
    ];
  }

  return $docs;
}

function portal_allowed_stream_extension(string $relPath): bool {
  $ext = portal_get_doc_extension($relPath);
  return $ext !== '';
}

// ---------- Dictionary (Glossary) ----------
function load_dict_items(string $jsonFile): array {
  $j = read_json_file($jsonFile);
  if (is_array($j)) return $j;
  return [];
}

function save_dict_items(string $jsonFile, string $jsFile, array $items): void {
  // Normalize + sort by term
  $clean = [];
  foreach ($items as $it) {
    if (!is_array($it)) continue;
    $term = trim((string)($it['term'] ?? ''));
    if ($term === '') continue;
    $clean[] = [
      'term'    => $term,
      'meaning' => (string)($it['meaning'] ?? ''),
      'vi'      => (string)($it['vi'] ?? ''),
      'def'     => (string)($it['def'] ?? ''),
      'ctx'     => (string)($it['ctx'] ?? ''),
      'rec'     => (string)($it['rec'] ?? ''),
      'cat'     => (string)($it['cat'] ?? 'General'),
    ];
  }
  usort($clean, function($a,$b){
    return strcasecmp((string)$a['term'], (string)$b['term']);
  });

  write_json_file($jsonFile, $clean);

  // Also rebuild dict-data.js for offline usage if present
  $payload = json_encode($clean, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  $js = "window.HESEM_GLOSSARY = " . $payload . ";\n"
      . "window.DICT_DATA = window.HESEM_GLOSSARY;\n";
  @file_put_contents($jsFile, $js, LOCK_EX);
}

function slugify(string $text): string {
  $text = trim($text);
  if ($text === '') return 'doc';
  $converted = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $text);
  if ($converted !== false && $converted !== '') $text = (string)$converted;
  $text = strtolower($text);
  $text = preg_replace('/[^a-z0-9]+/', '-', $text);
  $text = trim((string)$text, '-');
  return $text === '' ? 'doc' : $text;
}

function portal_standard_title_token(string $token, int $index): string {
  $lower = strtolower(trim($token));
  if ($lower === '') return '';
  $tokenMap = [
    'api' => 'API',
    'ar' => 'AR',
    'bom' => 'BOM',
    'cam' => 'CAM',
    'capa' => 'CAPA',
    'cnc' => 'CNC',
    'cmm' => 'CMM',
    'coc' => 'CoC',
    'coa' => 'CoA',
    'csr' => 'CSR',
    'ctq' => 'CTQ',
    'dcr' => 'DCR',
    'dfm' => 'DFM',
    'eco' => 'ECO',
    'ecr' => 'ECR',
    'ehs' => 'EHS',
    'erp' => 'ERP',
    'fai' => 'FAI',
    'fmea' => 'FMEA',
    'fod' => 'FOD',
    'frm' => 'FRM',
    'hr' => 'HR',
    'it' => 'IT',
    'jd' => 'JD',
    'kpi' => 'KPI',
    'm365' => 'M365',
    'msa' => 'MSA',
    'nc' => 'NC',
    'ncr' => 'NCR',
    'oee' => 'OEE',
    'ojt' => 'OJT',
    'pfmea' => 'PFMEA',
    'po' => 'PO',
    'ppc' => 'PPC',
    'qa' => 'QA',
    'qc' => 'QC',
    'qms' => 'QMS',
    'raci' => 'RACI',
    'rfq' => 'RFQ',
    'sla' => 'SLA',
    'sop' => 'SOP',
    'spc' => 'SPC',
    'sscc' => 'SSCC',
    'swot' => 'SWOT',
    'wi' => 'WI',
    'wip' => 'WIP',
  ];
  if (isset($tokenMap[$lower])) return $tokenMap[$lower];
  if (preg_match('/^\d+$/', $lower)) return $lower;
  $lowerWords = ['a','an','and','as','at','by','for','from','in','of','on','or','the','to','via','with'];
  if ($index > 0 && in_array($lower, $lowerWords, true)) return $lower;
  return strtoupper(substr($lower, 0, 1)) . substr($lower, 1);
}

function portal_standard_title_from_filename(string $fileName, string $code = ''): string {
  $stem = pathinfo($fileName, PATHINFO_FILENAME);
  if ($stem === '') return portal_fallback_doc_title($fileName);

  $codeNorm = strtoupper(trim($code));
  if ($codeNorm === '') $codeNorm = scan_extract_code($fileName);
  $codeTokens = preg_split('/[^a-z0-9]+/i', strtolower($codeNorm), -1, PREG_SPLIT_NO_EMPTY);
  if (is_array($codeTokens) && !empty($codeTokens)) {
    $parts = array_map(static fn(string $t): string => preg_quote($t, '/'), $codeTokens);
    $prefixPattern = '/^' . implode('[-_]+', $parts) . '(?:[-_]+)?/i';
    $removed = preg_replace($prefixPattern, '', $stem, 1);
    if (is_string($removed)) $stem = $removed;
  }
  $stem = trim((string)$stem, "-_ \t\n\r\0\x0B");
  if ($stem === '') return portal_fallback_doc_title($fileName);

  $tokens = preg_split('/[-_]+/', $stem, -1, PREG_SPLIT_NO_EMPTY);
  if (!is_array($tokens) || empty($tokens)) return portal_fallback_doc_title($fileName);

  $out = [];
  foreach ($tokens as $idx => $token) {
    $converted = portal_standard_title_token((string)$token, (int)$idx);
    if ($converted !== '') $out[] = $converted;
  }
  if (empty($out)) return portal_fallback_doc_title($fileName);
  $title = trim((string)preg_replace('/\s+/', ' ', implode(' ', $out)));
  return $title !== '' ? $title : portal_fallback_doc_title($fileName);
}

function portal_standard_title_from_rel_path(string $relPath, string $code = ''): string {
  return portal_standard_title_from_filename((string)basename($relPath), $code);
}

function portal_title_has_non_ascii(string $title): bool {
  return preg_match('/[^\x20-\x7E]/', $title) === 1;
}

function portal_sync_doc_title_blocks(string $html, string $docCode, string $title): string {
  $docCode = strtoupper(trim($docCode));
  $title = trim($title);
  if ($docCode === '' || $title === '') return $html;

  $safeTitleTag = htmlspecialchars($docCode . ' - ' . $title . ' | HESEM QMS', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
  $safeDocLabel = htmlspecialchars($docCode . ' - ' . $title, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

  $next = preg_replace('/<title[^>]*>.*?<\/title>/isu', '<title>' . $safeTitleTag . '</title>', $html, 1);
  if (is_string($next)) $html = $next;

  $next = preg_replace_callback(
    '/(<div[^>]*class=["\'][^"\']*\btitle\b[^"\']*["\'][^>]*>\s*<strong>).*?(<\/strong>)/isu',
    static fn(array $m): string => (string)($m[1] ?? '') . $safeDocLabel . (string)($m[2] ?? ''),
    $html,
    1
  );
  if (is_string($next)) $html = $next;

  $next = preg_replace_callback(
    '/(<h1[^>]*class=["\'][^"\']*\bh1\b[^"\']*["\'][^>]*>).*?(<\/h1>)/isu',
    static fn(array $m): string => (string)($m[1] ?? '') . $safeDocLabel . (string)($m[2] ?? ''),
    $html,
    1
  );
  if (is_string($next)) $html = $next;

  return $html;
}


// =============================
// Per-folder "_Archive" store
// =============================

function fmt_rev(string $rev): string {
  // Convert a revision like "0", "0.1", "v1.2" -> "00.00", "00.01", "01.02"
  $rev = trim($rev);
  if ($rev === '') return '00.00';
  $rev = preg_replace('/^[vV]\s*/', '', $rev);
  $major = 0; $minor = 0;
  if (preg_match('/(\d+)(?:\.(\d+))?/', $rev, $m)) {
    $major = (int)$m[1];
    $minor = isset($m[2]) ? (int)$m[2] : 0;
  }
  return sprintf('%02d.%02d', $major, $minor);
}


// =============================
// Sync ISO header fields inside document HTML
// (Phiên bản / Ngày hiệu lực) so Version History preview + print are consistent
// =============================
function sync_doc_header_html(string $html, string $revision, ?string $effectiveDate = null): string {
  $rev = trim($revision);
  $rev = preg_replace('/^[vV]\s*/', '', $rev);
  if ($rev === '') $rev = '0';
  $revText = 'V' . $rev;

  // Update "Phiên bản" / "Version" / "Revision" value in the cover meta block
  $patRev = '/(<div\s+class="row">\s*<span>\s*<b>\s*(Phiên\s*bản|Version|Revision)\s*:\s*<\/b>\s*<\/span>\s*<span>)([^<]*)(<\/span>\s*<\/div>)/isu';
  $html2 = preg_replace_callback($patRev, function(array $m) use ($revText) {
    return ($m[1] ?? '') . $revText . ($m[4] ?? '');
  }, $html, 1);
  if ($html2 !== null) $html = $html2;

  if ($effectiveDate !== null) {
    $eff = trim($effectiveDate);
    if ($eff !== '') {
      $patEff = '/(<div\s+class="row">\s*<span>\s*<b>\s*(Ngày\s*hiệu\s*lực|Effective\s*date|Effective\s*Date)\s*:\s*<\/b>\s*<\/span>\s*<span>)([^<]*)(<\/span>\s*<\/div>)/isu';
      $html3 = preg_replace_callback($patEff, function(array $m) use ($eff) {
        return ($m[1] ?? '') . $eff . ($m[4] ?? '');
      }, $html, 1);
      if ($html3 !== null) $html = $html3;
    }
  }

  return $html;
}

function sync_doc_file_header(string $absPath, string $revision, ?string $effectiveDate = null): void {
  if (!is_file($absPath)) return;
  $raw = @file_get_contents($absPath);
  if ($raw === false || strlen($raw) < 30) return;
  $new = sync_doc_header_html((string)$raw, $revision, $effectiveDate);
  if ($new !== (string)$raw) {
    @file_put_contents($absPath, $new, LOCK_EX);
  }
}

function revision_from_version_string(string $v): string {
  $v = trim($v);
  if ($v === '') return '0';
  if (preg_match('/^v(.+)$/i', $v, $m)) return trim((string)$m[1]);
  $v = preg_replace('/^[vV]\s*/', '', $v);
  return $v === '' ? '0' : $v;
}

function date_to_ymd(string $dt): ?string {
  if (preg_match('/^(\d{4}-\d{2}-\d{2})/', trim($dt), $m)) return (string)$m[1];
  return null;
}
function doc_store_info(string $rootDir, string $baseRel): array {
  $baseRel = safe_rel_path($baseRel);
  $dir = dirname($baseRel);
  if ($dir === '.' || $dir === '/') $dir = '';
  $archiveRelDir = ($dir !== '' ? ($dir . '/') : '') . '_Archive';
  $archiveAbsDir = join_in_root($rootDir, $archiveRelDir);
  $baseName = pathinfo($baseRel, PATHINFO_FILENAME);
  $manifestAbs = rtrim($archiveAbsDir, '/\\') . '/' . $baseName . '_manifest.json';
  $stateAbs = rtrim($archiveAbsDir, '/\\') . '/' . $baseName . '_state.json';
  return [
    'baseRel' => $baseRel,
    'dirRel' => $dir,
    'archiveRelDir' => $archiveRelDir,
    'archiveAbsDir' => $archiveAbsDir,
    'baseName' => $baseName,
    'manifestAbs' => $manifestAbs,
    'stateAbs' => $stateAbs,
  ];
}

// =============================
// Version file helper utilities
// =============================
function rel_path(string $absPath, string $rootDir): string {
  $rootReal = realpath($rootDir) ?: $rootDir;
  $rootReal = rtrim(str_replace('\\','/',$rootReal), '/');
  $absReal = realpath($absPath) ?: $absPath;
  $absReal = str_replace('\\','/',$absReal);

  if (str_starts_with($absReal, $rootReal . '/')) {
    return ltrim(substr($absReal, strlen($rootReal) + 1), '/');
  }
  // If already relative, just normalize/sanitize
  if (!preg_match('#^[A-Za-z]:/#', $absReal) && !str_starts_with($absReal, '/')) {
    return safe_rel_path($absReal);
  }
  throw new RuntimeException('Path not in root');
}

function replace_path_prefix(string $value, string $oldPrefix, string $newPrefix): string {
  $value = str_replace('\\', '/', $value);
  $oldPrefix = trim(str_replace('\\', '/', $oldPrefix), '/');
  $newPrefix = trim(str_replace('\\', '/', $newPrefix), '/');
  if ($value === '' || $oldPrefix === '') return $value;
  if ($value === $oldPrefix) return $newPrefix;
  if (str_starts_with($value, $oldPrefix . '/')) {
    return $newPrefix . substr($value, strlen($oldPrefix));
  }
  return $value;
}

function replace_quoted_path_token(string $content, string $oldToken, string $newToken): string {
  $content = (string)$content;
  $oldToken = str_replace('\\', '/', trim((string)$oldToken));
  $newToken = str_replace('\\', '/', trim((string)$newToken));
  if ($content === '' || $oldToken === '' || $oldToken === $newToken) return $content;

  $pattern = '/((["\'])[^"\']*?)' . preg_quote($oldToken, '/') . '(?=(?:[\/#?][^"\']*)?\2)/u';
  $out = preg_replace_callback($pattern, function(array $m) use ($newToken) {
    return (string)($m[1] ?? '') . $newToken;
  }, $content);
  return is_string($out) ? $out : $content;
}

function relative_ref_from(string $sourceRel, string $targetRel): string {
  $sourceRel = safe_rel_path($sourceRel);
  $targetRel = safe_rel_path($targetRel);

  $fromDir = dirname($sourceRel);
  if ($fromDir === '.' || $fromDir === '/') $fromDir = '';

  $fromParts = $fromDir === '' ? [] : explode('/', trim($fromDir, '/'));
  $toParts = explode('/', trim($targetRel, '/'));

  while (!empty($fromParts) && !empty($toParts) && $fromParts[0] === $toParts[0]) {
    array_shift($fromParts);
    array_shift($toParts);
  }

  $relParts = array_merge(array_fill(0, count($fromParts), '..'), $toParts);
  $rel = implode('/', $relParts);
  return $rel === '' ? basename($targetRel) : $rel;
}

function rename_doc_store_assets(string $rootDir, string $oldBaseRel, string $newBaseRel, string $newCode): void {
  $oldInfo = doc_store_info($rootDir, $oldBaseRel);
  $newInfo = doc_store_info($rootDir, $newBaseRel);
  ensure_dir($newInfo['archiveAbsDir']);

  $manifest = read_json_file($oldInfo['manifestAbs']);
  $state = read_json_file($oldInfo['stateAbs']);

  if (is_dir($oldInfo['archiveAbsDir'])) {
    $files = @scandir($oldInfo['archiveAbsDir']);
    if ($files) {
      foreach ($files as $fn) {
        if (!is_string($fn) || $fn === '' || $fn[0] === '.') continue;
        if (!str_starts_with($fn, $oldInfo['baseName'] . '_V')) continue;
        $oldAbs = rtrim($oldInfo['archiveAbsDir'], '/\\') . '/' . $fn;
        $newFn = $newInfo['baseName'] . substr($fn, strlen($oldInfo['baseName']));
        $newAbs = rtrim($newInfo['archiveAbsDir'], '/\\') . '/' . $newFn;
        if ($oldAbs === $newAbs || is_file($newAbs)) continue;
        if (!@rename($oldAbs, $newAbs)) {
          throw new RuntimeException('archive_rename_failed');
        }
      }
    }
  }

  if (is_array($manifest)) {
    if ($newCode !== '') $manifest['code'] = $newCode;
    $versions = $manifest['versions'] ?? [];
    if (is_array($versions)) {
      foreach ($versions as &$v) {
        if (!is_array($v)) continue;
        $fileRel = str_replace('\\', '/', (string)($v['file'] ?? ''));
        if ($fileRel === '') continue;
        if ($fileRel === $oldInfo['baseRel']) {
          $v['file'] = $newInfo['baseRel'];
          continue;
        }
        $oldArchivePrefix = $oldInfo['archiveRelDir'] . '/' . $oldInfo['baseName'];
        if (str_starts_with($fileRel, $oldArchivePrefix)) {
          $v['file'] = $newInfo['archiveRelDir'] . '/' . $newInfo['baseName'] . substr($fileRel, strlen($oldArchivePrefix));
        }
      }
      unset($v);
      $manifest['versions'] = $versions;
    }
    save_doc_manifest($rootDir, $newBaseRel, $manifest);
    if ($oldInfo['manifestAbs'] !== $newInfo['manifestAbs'] && is_file($oldInfo['manifestAbs'])) {
      @unlink($oldInfo['manifestAbs']);
    }
  } elseif (is_file($oldInfo['manifestAbs']) && $oldInfo['manifestAbs'] !== $newInfo['manifestAbs']) {
    if (!@rename($oldInfo['manifestAbs'], $newInfo['manifestAbs'])) {
      throw new RuntimeException('manifest_rename_failed');
    }
  }

  if (is_array($state)) {
    if ($newCode !== '') $state['code'] = $newCode;
    write_json_file($newInfo['stateAbs'], $state);
    if ($oldInfo['stateAbs'] !== $newInfo['stateAbs'] && is_file($oldInfo['stateAbs'])) {
      @unlink($oldInfo['stateAbs']);
    }
  } elseif (is_file($oldInfo['stateAbs']) && $oldInfo['stateAbs'] !== $newInfo['stateAbs']) {
    if (!@rename($oldInfo['stateAbs'], $newInfo['stateAbs'])) {
      throw new RuntimeException('state_rename_failed');
    }
  }
}


function inject_base_href_archive(string $html): string {
  $html = repair_broken_doc_style_html($html);
  // Version-controlled files are stored in a per-folder _Archive directory.
  // That makes them one level deeper than the live document, so any relative
  // links like "../assets/..." or "../01-QMS-Portal/..." would break.
  //
  // Adding <base href="../"> makes all relative URLs resolve as if the file
  // was located in the parent (document) folder, preserving graphics + CSS.
  if (stripos($html, '<base') !== false) return $html;
  $out = preg_replace('/<head([^>]*)>/i', '<head$1><base href="../">', $html, 1);
  return $out ? $out : $html;
}

function repair_broken_doc_style_html(string $html): string {
  $markerPos = stripos($html, 'PAGE BREAK & OVERFLOW FIX');
  if ($markerPos === false) return $html;

  $bodyPos = stripos($html, '<body');
  if ($bodyPos !== false && $markerPos > $bodyPos) return $html;

  $headChunk = substr($html, 0, $markerPos);
  $hasOpenStyleBeforeMarker = preg_match('/<style\b[^>]*>/i', $headChunk) === 1;
  $closeStylePos = stripos($html, '</style>', $markerPos);
  if (!$hasOpenStyleBeforeMarker && $closeStylePos !== false) {
    $html = substr($html, 0, $markerPos) . "<style>\n" . substr($html, $markerPos);
  }

  if (stripos($html, '<head') !== false && stripos($html, '</head>') === false && preg_match('/<body\b/i', $html, $m, PREG_OFFSET_CAPTURE)) {
    $bodyIdx = (int)$m[0][1];
    $html = substr($html, 0, $bodyIdx) . "</head>\n" . substr($html, $bodyIdx);
  }

  return $html;
}

function strip_base_href_archive(string $html): string {
  // Archive versions live inside a per-folder "_Archive" directory. We inject
  // <base href="../"> so all relative assets/links behave exactly like the
  // parent folder (the live document location).
  //
  // When publishing a reviewed version back to the live document path (outside
  // "_Archive"), we MUST remove that <base> tag. Otherwise relative links shift
  // one level up and CSS/images/internal links will break.
  $out = preg_replace('/<base\s+[^>]*href=["\']\.\.\/["\'][^>]*>\s*/i', '', $html, 1);
  return is_string($out) ? $out : $html;
}

function store_version_file(string $baseRel, string $revision, string $status, string $rootDir, string $html): string {
  $info = doc_store_info($rootDir, $baseRel);
  ensure_dir($info['archiveAbsDir']);

  $st = strtolower(trim($status));
  $suffix = '_DRAFT';
  if ($st === 'in_review' || $st === 'inreview') $suffix = '_INREVIEW';
  if ($st === 'pending_approval' || $st === 'pending') $suffix = '_PENDING';
  if ($st === 'obsolete') $suffix = '_OBSOLETE';
  if ($st === 'approved' || $st === 'release' || $st === 'current') $suffix = '';

  $fname = $info['baseName'] . '_V' . fmt_rev($revision) . $suffix . '.html';
  $abs = rtrim($info['archiveAbsDir'], '/\\') . '/' . $fname;

  $html = inject_base_href_archive($html);

  if (@file_put_contents($abs, $html, LOCK_EX) === false) {
    throw new RuntimeException('write_failed');
  }
  return $abs;
}



function maybe_migrate_legacy_store(string $rootDir, string $baseRel, string $legacyArchiveRoot, string $code): void {
  // If the new per-folder manifest doesn't exist, but the legacy /archive/<CODE>/manifest.json exists,
  // migrate versions + state into the per-folder _Archive store.
  $code = trim($code);
  if ($code === '') return;
  $info = doc_store_info($rootDir, $baseRel);
  if (is_file($info['manifestAbs']) || is_file($info['stateAbs'])) return;

  $legacyDir = archive_dir_for($legacyArchiveRoot, $code);
  $legacyMf = $legacyDir . '/manifest.json';
  if (!is_file($legacyMf)) return;
  $legacy = read_json_file($legacyMf);
  if (!$legacy || !isset($legacy['versions']) || !is_array($legacy['versions'])) return;

  ensure_dir($info['archiveAbsDir']);

  $newVersions = [];
  foreach (($legacy['versions'] ?? []) as $v) {
    if (!is_array($v)) continue;
    $status = (string)($v['status'] ?? '');
    $verStr = (string)($v['version'] ?? '');
    $revRaw = $verStr;
    if (preg_match('/^v(.+)$/i', $verStr, $m)) $revRaw = (string)$m[1];
    $revFmt = fmt_rev($revRaw);

    $newFileRel = (string)($v['file'] ?? '');
    if ($status === 'approved') {
      $newFileRel = $info['baseRel'];
    } else {
      $suffix = '';
      if ($status === 'draft') $suffix = '_DRAFT';
      else if ($status === 'in_review' || $status === 'pending_approval') $suffix = '_INREVIEW';

      $newFn = $info['baseName'] . '_V' . $revFmt . $suffix . '.html';
      $newFileRel = $info['archiveRelDir'] . '/' . $newFn;

      // Move/copy legacy file if possible
      $oldFileRel = (string)($v['file'] ?? '');
      if ($oldFileRel !== '') {
        try {
          $oldAbs = join_in_root($rootDir, $oldFileRel);
          $newAbs = join_in_root($rootDir, $newFileRel);
          ensure_dir(dirname($newAbs));
          if (is_file($oldAbs) && !is_file($newAbs)) {
            if (!@rename($oldAbs, $newAbs)) {
              @copy($oldAbs, $newAbs);
            }
          }
        } catch (Throwable $e) {
          // ignore
        }
      }
    }

    $vv = $v;
    $vv['file'] = $newFileRel;
    $newVersions[] = $vv;
  }

  $newManifest = [
    'code' => $code,
    'updated_at' => now_iso(),
    'versions' => $newVersions,
    'migrated_from_legacy' => true,
  ];
  write_json_file($info['manifestAbs'], $newManifest);

  $legacyState = $legacyDir . '/state.json';
  if (is_file($legacyState) && !is_file($info['stateAbs'])) {
    $st = read_json_file($legacyState);
    if (is_array($st)) write_json_file($info['stateAbs'], $st);
  }
}

function load_doc_manifest(string $rootDir, string $baseRel, string $legacyArchiveRoot, string $code): array {
  maybe_migrate_legacy_store($rootDir, $baseRel, $legacyArchiveRoot, $code);
  $info = doc_store_info($rootDir, $baseRel);
  $m = read_json_file($info['manifestAbs']);
  if (!$m) return ['code' => $code, 'updated_at' => now_iso(), 'versions' => []];
  if (!isset($m['versions']) || !is_array($m['versions'])) $m['versions'] = [];
  return $m;
}

function save_doc_manifest(string $rootDir, string $baseRel, array $manifest): void {
  $info = doc_store_info($rootDir, $baseRel);
  ensure_dir($info['archiveAbsDir']);
  $manifest['updated_at'] = now_iso();
  write_json_file($info['manifestAbs'], $manifest);
}

function load_doc_state(string $rootDir, string $baseRel, string $legacyArchiveRoot, string $code): ?array {
  maybe_migrate_legacy_store($rootDir, $baseRel, $legacyArchiveRoot, $code);
  $info = doc_store_info($rootDir, $baseRel);
  return read_json_file($info['stateAbs']);
}

function save_doc_state(string $rootDir, string $baseRel, array $state): void {
  $info = doc_store_info($rootDir, $baseRel);
  ensure_dir($info['archiveAbsDir']);
  $state['updated_at'] = now_iso();
  write_json_file($info['stateAbs'], $state);
}

function archive_dir_for(string $archiveRoot, string $code): string {
  $safe = sanitize_code($code);
  return rtrim($archiveRoot, '/\\') . '/' . $safe;
}

function load_manifest(string $archiveRoot, string $code): array {
  $dir = archive_dir_for($archiveRoot, $code);
  $mf = $dir . '/manifest.json';
  $m = read_json_file($mf);
  if (!$m) {
    return ['code' => $code, 'updated_at' => now_iso(), 'versions' => []];
  }
  if (!isset($m['versions']) || !is_array($m['versions'])) $m['versions'] = [];
  return $m;
}

function save_manifest(string $archiveRoot, string $code, array $manifest): void {
  $dir = archive_dir_for($archiveRoot, $code);
  ensure_dir($dir);
  $manifest['code'] = $code;
  $manifest['updated_at'] = now_iso();
  write_json_file($dir . '/manifest.json', $manifest);
}

function load_state(string $archiveRoot, string $code): ?array {
  $dir = archive_dir_for($archiveRoot, $code);
  return read_json_file($dir . '/state.json');
}

function save_state(string $archiveRoot, string $code, array $state): void {
  $dir = archive_dir_for($archiveRoot, $code);
  ensure_dir($dir);
  $state['code'] = $code;
  $state['updated_at'] = now_iso();
  write_json_file($dir . '/state.json', $state);
}

function read_json_body(): array {
  $raw = @file_get_contents('php://input');
  if ($raw === false || trim($raw) === '') return [];
  $data = json_decode($raw, true);
  return is_array($data) ? $data : [];
}

function orders_store_default(): array {
  return [
    '_meta' => [
      'version' => '1.1',
      'updated' => now_iso(),
      'description' => 'Sales Order -> Job Order -> Work Order hierarchy managed inside the QMS Portal.',
      'counters' => [
        'last_so' => 'SO-' . date('Y') . '-0000',
        'last_jo' => 'JO-' . date('Y') . '-0000',
        'last_wo' => 'WO-' . date('Y') . '-000000',
      ],
    ],
    'sales_orders' => [],
    'job_orders' => [],
    'work_orders' => [],
    'form_links' => [],
  ];
}

function load_orders_store(): array {
  global $ORDERS_FILE;
  ensure_dir(dirname($ORDERS_FILE));
  $data = read_json_file($ORDERS_FILE);
  if (!is_array($data)) {
    $data = orders_store_default();
    write_json_file($ORDERS_FILE, $data);
  }
  $data['_meta'] = is_array($data['_meta'] ?? null) ? $data['_meta'] : orders_store_default()['_meta'];
  $data['sales_orders'] = array_values(is_array($data['sales_orders'] ?? null) ? $data['sales_orders'] : []);
  $data['job_orders'] = array_values(is_array($data['job_orders'] ?? null) ? $data['job_orders'] : []);
  $data['work_orders'] = array_values(is_array($data['work_orders'] ?? null) ? $data['work_orders'] : []);
  $data['form_links'] = array_values(is_array($data['form_links'] ?? null) ? $data['form_links'] : []);
  $data['_meta']['counters'] = is_array($data['_meta']['counters'] ?? null) ? $data['_meta']['counters'] : orders_store_default()['_meta']['counters'];
  return $data;
}

function save_orders_store(array $data): void {
  global $ORDERS_FILE;
  ensure_dir(dirname($ORDERS_FILE));
  $data['_meta'] = is_array($data['_meta'] ?? null) ? $data['_meta'] : [];
  $data['_meta']['updated'] = now_iso();
  write_json_file($ORDERS_FILE, $data);
}

function master_data_store_default(): array {
  return [
    '_meta' => [
      'version' => '1.0',
      'updated' => now_iso(),
      'description' => 'Governed master data for lookups in orders and evidence forms.',
    ],
    'customers' => [],
    'suppliers' => [],
    'parts' => [],
    'revisions' => [],
    'capas' => [],
  ];
}

function load_master_data_store(): array {
  global $MASTER_DATA_FILE;
  ensure_dir(dirname($MASTER_DATA_FILE));
  $data = read_json_file($MASTER_DATA_FILE);
  if (!is_array($data)) {
    $data = master_data_store_default();
    write_json_file($MASTER_DATA_FILE, $data);
  }
  $defaults = master_data_store_default();
  foreach ($defaults as $key => $value) {
    if ($key === '_meta') continue;
    $data[$key] = array_values(is_array($data[$key] ?? null) ? $data[$key] : []);
  }
  $data['_meta'] = is_array($data['_meta'] ?? null) ? $data['_meta'] : $defaults['_meta'];
  return $data;
}

function save_master_data_store(array $data): void {
  global $MASTER_DATA_FILE;
  ensure_dir(dirname($MASTER_DATA_FILE));
  $data['_meta'] = is_array($data['_meta'] ?? null) ? $data['_meta'] : [];
  $data['_meta']['updated'] = now_iso();
  write_json_file($MASTER_DATA_FILE, $data);
}

function order_entity_config(string $entity): array {
  $map = [
    'so' => ['config_key' => 'sales_order', 'store_key' => 'sales_orders', 'number_key' => 'so_number', 'counter_key' => 'last_so', 'digits' => 4, 'default_status' => 'draft'],
    'jo' => ['config_key' => 'job_order', 'store_key' => 'job_orders', 'number_key' => 'jo_number', 'counter_key' => 'last_jo', 'digits' => 4, 'default_status' => 'planned'],
    'wo' => ['config_key' => 'work_order', 'store_key' => 'work_orders', 'number_key' => 'wo_number', 'counter_key' => 'last_wo', 'digits' => 6, 'default_status' => 'scheduled'],
  ];
  if (!isset($map[$entity])) throw new RuntimeException('unknown_order_entity');
  return $map[$entity];
}

function load_order_runtime_config(): array {
  global $CONF_DIR;
  $file = $CONF_DIR . '/so_jo_wo_config.json';
  $cfg = read_json_file($file);
  return is_array($cfg) ? $cfg : [];
}

function order_role_allowed(array $me, string $entity, string $permission): bool {
  $cfg = load_order_runtime_config();
  $meta = order_entity_config($entity);
  $node = $cfg[$meta['config_key']] ?? [];
  $roles = array_map('migrate_role', (array)($node['roles_' . $permission] ?? []));
  $role = migrate_role((string)($me['role'] ?? ''));
  if ($role === '') return false;
  if (in_array($role, admin_roles(), true)) return true;
  return in_array($role, $roles, true);
}

function require_order_permission(array $me, string $entity, string $permission): void {
  if (!order_role_allowed($me, $entity, $permission)) {
    api_json(['ok' => false, 'error' => 'forbidden'], 403);
  }
}

function next_order_number(array &$store, string $entity): string {
  $meta = order_entity_config($entity);
  $counterKey = $meta['counter_key'];
  $current = (string)($store['_meta']['counters'][$counterKey] ?? '');
  if (!preg_match('/^[A-Z]{2}-([0-9]{4})-([0-9]+)$/', $current, $m)) {
    $currentYear = (int)date('Y');
    $seq = 0;
  } else {
    $currentYear = (int)$m[1];
    $seq = (int)$m[2];
  }
  $year = (int)date('Y');
  if ($currentYear !== $year) $seq = 0;
  $seq++;
  $next = strtoupper($entity) . '-' . $year . '-' . str_pad((string)$seq, $meta['digits'], '0', STR_PAD_LEFT);
  $store['_meta']['counters'][$counterKey] = $next;
  return $next;
}

function build_order_hierarchy(array $store, array $master): array {
  $customers = [];
  foreach (($master['customers'] ?? []) as $row) {
    if (!is_array($row)) continue;
    $customers[(string)($row['customer_id'] ?? '')] = $row;
  }
  $parts = [];
  foreach (($master['parts'] ?? []) as $row) {
    if (!is_array($row)) continue;
    $parts[(string)($row['part_number'] ?? '')] = $row;
  }
  $revisions = [];
  foreach (($master['revisions'] ?? []) as $row) {
    if (!is_array($row)) continue;
    $revisions[(string)($row['revision_id'] ?? '')] = $row;
  }

  $wosByJo = [];
  foreach (($store['work_orders'] ?? []) as $wo) {
    if (!is_array($wo)) continue;
    $wosByJo[(string)($wo['jo_number'] ?? '')][] = $wo;
  }
  $linksByOrder = [];
  foreach (($store['form_links'] ?? []) as $link) {
    if (!is_array($link)) continue;
    $key = (string)($link['order_type'] ?? '') . '|' . (string)($link['order_id'] ?? '');
    $linksByOrder[$key][] = $link;
  }
  $josBySo = [];
  foreach (($store['job_orders'] ?? []) as $jo) {
    if (!is_array($jo)) continue;
    $joNumber = (string)($jo['jo_number'] ?? '');
    $partNumber = (string)($jo['part_number'] ?? '');
    $customerId = (string)($jo['customer_id'] ?? '');
    if ($customerId === '' && isset($parts[$partNumber])) {
      $customerId = (string)($parts[$partNumber]['customer_id'] ?? '');
      $jo['customer_id'] = $customerId;
    }
    if (($jo['part_description'] ?? '') === '' && isset($parts[$partNumber])) {
      $jo['part_description'] = (string)($parts[$partNumber]['part_description'] ?? '');
    }
    $jo['customer_name'] = (string)($customers[$customerId]['customer_name'] ?? '');
    $jo['operations'] = array_values($wosByJo[$joNumber] ?? []);
    $jo['linked_forms'] = array_values($linksByOrder['jo|' . $joNumber] ?? []);
    $josBySo[(string)($jo['so_number'] ?? '')][] = $jo;
  }

  $tree = [];
  foreach (($store['sales_orders'] ?? []) as $so) {
    if (!is_array($so)) continue;
    $customerId = (string)($so['customer_id'] ?? '');
    if (($so['customer_name'] ?? '') === '' && isset($customers[$customerId])) {
      $so['customer_name'] = (string)($customers[$customerId]['customer_name'] ?? '');
    }
    $soNumber = (string)($so['so_number'] ?? '');
    $so['job_orders'] = array_values($josBySo[$soNumber] ?? []);
    $so['linked_forms'] = array_values($linksByOrder['so|' . $soNumber] ?? []);
    $tree[] = $so;
  }
  return $tree;
}

function compute_order_dashboard_stats(array $store): array {
  $salesOrders = array_values((array)($store['sales_orders'] ?? []));
  $jobOrders = array_values((array)($store['job_orders'] ?? []));
  $workOrders = array_values((array)($store['work_orders'] ?? []));

  $activeSo = count(array_filter($salesOrders, fn($x) => in_array((string)($x['status'] ?? ''), ['quoted', 'confirmed', 'in_production'], true)));
  $activeJo = count(array_filter($jobOrders, fn($x) => in_array((string)($x['status'] ?? ''), ['released', 'active', 'on_hold'], true)));
  $activeWo = count(array_filter($workOrders, fn($x) => in_array((string)($x['status'] ?? ''), ['scheduled', 'setup', 'running', 'inspection', 'on_hold'], true)));
  $overdueCount = count(array_filter($salesOrders, function ($x) {
    $due = (string)($x['due_date'] ?? '');
    $status = (string)($x['status'] ?? '');
    return $due !== '' && $due < date('Y-m-d') && !in_array($status, ['closed', 'shipped', 'cancelled'], true);
  }));
  $closedSo = array_filter($salesOrders, fn($x) => in_array((string)($x['status'] ?? ''), ['shipped', 'closed'], true));
  $onTime = 0;
  foreach ($closedSo as $so) {
    $shipDate = (string)($so['shipped_date'] ?? $so['closed_date'] ?? '');
    $dueDate = (string)($so['due_date'] ?? '');
    if ($shipDate !== '' && $dueDate !== '' && $shipDate <= $dueDate) $onTime++;
  }
  $otd = count($closedSo) > 0 ? round(($onTime / count($closedSo)) * 100, 1) : null;

  return [
    'active_so' => $activeSo,
    'active_jo' => $activeJo,
    'active_wo' => $activeWo,
    'overdue_count' => $overdueCount,
    'otd_percent' => $otd,
  ];
}

function find_order_record(array $store, string $entity, string $id): ?array {
  $meta = order_entity_config($entity);
  foreach (($store[$meta['store_key']] ?? []) as $row) {
    if (is_array($row) && (string)($row[$meta['number_key']] ?? '') === $id) return $row;
  }
  return null;
}

function upsert_master_data_item(array &$store, string $entity, array $item, string $username): array {
  $map = [
    'customers' => 'customer_id',
    'suppliers' => 'supplier_id',
    'parts' => 'part_number',
    'revisions' => 'revision_id',
    'capas' => 'capa_number',
  ];
  if (!isset($map[$entity])) throw new RuntimeException('invalid_master_entity');
  $idKey = $map[$entity];
  $id = trim((string)($item[$idKey] ?? ''));
  if ($id === '') throw new RuntimeException('missing_master_key');

  $normalized = $item;
  $normalized[$idKey] = $id;
  $normalized['updated_at'] = now_iso();
  $normalized['updated_by'] = $username;
  if (empty($normalized['created_at'])) $normalized['created_at'] = now_iso();

  $found = false;
  foreach ($store[$entity] as $idx => $row) {
    if (!is_array($row)) continue;
    if ((string)($row[$idKey] ?? '') !== $id) continue;
    $normalized['created_at'] = (string)($row['created_at'] ?? $normalized['created_at']);
    $normalized['created_by'] = (string)($row['created_by'] ?? $username);
    $store[$entity][$idx] = array_merge($row, $normalized);
    $found = true;
    break;
  }
  if (!$found) {
    $normalized['created_by'] = $username;
    $store[$entity][] = $normalized;
  }
  return $normalized;
}

function load_record_type_registry(): array {
  global $DATA_DIR;
  $file = $DATA_DIR . '/config/record_type_expanded.json';
  if (!is_file($file)) return [];
  $data = json_decode((string)file_get_contents($file), true);
  return is_array($data['record_types'] ?? null) ? $data['record_types'] : [];
}

function load_form_schema_by_code(string $formCode): ?array {
  global $DATA_DIR;
  $file = $DATA_DIR . '/online-forms/schemas/' . basename($formCode) . '.json';
  if (!is_file($file)) return null;
  $data = json_decode((string)file_get_contents($file), true);
  return is_array($data) ? $data : null;
}

function load_form_registry_entry(string $formCode): ?array {
  global $FORM_CONTROL_REGISTRY_FILE;
  if (!is_file($FORM_CONTROL_REGISTRY_FILE)) return null;
  $data = json_decode((string)file_get_contents($FORM_CONTROL_REGISTRY_FILE), true);
  if (!is_array($data) || !isset($data[$formCode]) || !is_array($data[$formCode])) return null;
  return $data[$formCode];
}

function online_form_entries_file(string $formCode): string {
  global $DATA_DIR;
  return $DATA_DIR . '/online-forms/entries/' . basename($formCode) . '.json';
}

function load_online_form_entries_store(string $formCode): array {
  $entryFile = online_form_entries_file($formCode);
  if (!is_file($entryFile)) return [];
  $data = json_decode((string)file_get_contents($entryFile), true);
  return is_array($data) ? $data : [];
}

function save_online_form_entries_store(string $formCode, array $entries): void {
  $entryFile = online_form_entries_file($formCode);
  ensure_dir(dirname($entryFile));
  file_put_contents($entryFile, json_encode($entries, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX);
}

function find_online_form_entry_index(array $entries, string $entryId = '', string $allocationId = ''): int {
  foreach ($entries as $idx => $entry) {
    if (!is_array($entry)) continue;
    if ($entryId !== '' && (string)($entry['entry_id'] ?? '') === $entryId) return $idx;
    if ($allocationId !== '' && (string)($entry['allocation_id'] ?? '') === $allocationId) return $idx;
  }
  return -1;
}

function form_is_online_runtime(string $formCode): bool {
  $schema = load_form_schema_by_code($formCode);
  if (!$schema) return false;
  return ($schema['online'] ?? true) !== false;
}

function build_user_initials(string $username): string {
  $parts = preg_split('/[\.\-_@\s]+/', strtoupper(trim($username)));
  $initials = '';
  foreach ($parts as $part) {
    if ($part !== '') $initials .= substr($part, 0, 1);
  }
  if (strlen($initials) < 2) {
    $letters = preg_replace('/[^A-Z0-9]/', '', strtoupper($username));
    $initials = substr($letters, 0, 3);
  }
  return $initials !== '' ? $initials : 'USR';
}

function qms_runtime_secret(): string {
  global $ROOT_DIR;
  $secret = trim((string)(getenv('QMS_RUNTIME_SECRET') ?: ''));
  if ($secret !== '') return $secret;
  return hash('sha256', 'hesem-qms|' . $ROOT_DIR);
}

function allocation_base_dir(): string {
  global $DATA_DIR;
  $dir = $DATA_DIR . '/allocations';
  ensure_dir($dir);
  ensure_dir($dir . '/downloads');
  ensure_dir($dir . '/uploads');
  ensure_dir($dir . '/tmp');
  return $dir;
}

function allocation_store_file(): string {
  return allocation_base_dir() . '/allocations.json';
}

function load_allocation_store(): array {
  $file = allocation_store_file();
  if (!is_file($file)) {
    return [
      '_meta' => ['version' => '1.0', 'created_at' => now_iso(), 'updated_at' => now_iso()],
      'allocations' => [],
    ];
  }
  $data = json_decode((string)file_get_contents($file), true);
  if (!is_array($data)) {
    return [
      '_meta' => ['version' => '1.0', 'created_at' => now_iso(), 'updated_at' => now_iso()],
      'allocations' => [],
    ];
  }
  if (!isset($data['allocations']) || !is_array($data['allocations'])) $data['allocations'] = [];
  return $data;
}

function save_allocation_store(array $store): void {
  $store['_meta']['updated_at'] = now_iso();
  file_put_contents(allocation_store_file(), json_encode($store, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX);
}

function allocation_uuid(): string {
  $bytes = random_bytes(16);
  $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
  $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
  $hex = bin2hex($bytes);
  return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split($hex, 4));
}

function allocation_status_normalize(string $status): string {
  $status = strtolower(trim($status));
  return match ($status) {
    'form_downloaded' => 'downloaded',
    'allocated', 'downloaded', 'submitted', 'received', 'void' => $status,
    default => 'allocated',
  };
}

function allocation_append_event(array &$allocation, string $status, string $user, string $note = '', array $meta = []): void {
  $status = allocation_status_normalize($status);
  $allocation['history'] = is_array($allocation['history'] ?? null) ? $allocation['history'] : [];
  $allocation['history'][] = [
    'status' => $status,
    'at' => now_iso(),
    'by' => $user,
    'note' => $note,
    'meta' => $meta,
  ];
  $allocation['status'] = $status;
  $allocation['updated_at'] = now_iso();
  $allocation['updated_by'] = $user;
}

function &allocation_find_ref(array &$store, string $allocationId) {
  foreach ($store['allocations'] as $idx => &$row) {
    if (is_array($row) && (string)($row['allocation_id'] ?? '') === $allocationId) {
      return $row;
    }
  }
  $null = null;
  return $null;
}

function allocation_find(array $store, string $allocationId): ?array {
  foreach ($store['allocations'] as $row) {
    if (is_array($row) && (string)($row['allocation_id'] ?? '') === $allocationId) {
      return $row;
    }
  }
  return null;
}

function allocation_find_by_record_id(array $store, string $recordId): ?array {
  foreach ($store['allocations'] as $row) {
    if (is_array($row) && (string)($row['record_id'] ?? '') === $recordId) {
      return $row;
    }
  }
  return null;
}

function next_record_id_value(string $recordType, string $year): array {
  global $DATA_DIR;

  $prefix = strtoupper(trim($recordType));
  if ($prefix === '') {
    throw new RuntimeException('missing_prefix');
  }
  if (!preg_match('/^20[2-3][0-9]$/', $year)) {
    throw new RuntimeException('invalid_year');
  }

  $counterRegistryFile = $DATA_DIR . '/counters/_registry.json';
  $counterRegistry = is_file($counterRegistryFile) ? (json_decode((string)file_get_contents($counterRegistryFile), true) ?: []) : [];
  $recordRegistry = load_record_type_registry();

  $digits = (int)($counterRegistry[$prefix]['digits'] ?? $recordRegistry[$prefix]['digits'] ?? 3);
  if ($digits < 2) $digits = 3;

  $countersDir = $DATA_DIR . '/counters';
  ensure_dir($countersDir);
  $counterFile = $countersDir . '/' . $prefix . '-' . $year . '.txt';

  $fp = @fopen($counterFile, 'c+');
  if (!$fp) throw new RuntimeException('counter_file_error');
  if (!flock($fp, LOCK_EX)) {
    fclose($fp);
    throw new RuntimeException('counter_lock_failed');
  }
  $raw = fread($fp, 20);
  $current = $raw !== false ? (int)trim($raw) : 0;
  $next = $current + 1;
  $padded = str_pad((string)$next, $digits, '0', STR_PAD_LEFT);
  ftruncate($fp, 0);
  rewind($fp);
  fwrite($fp, $padded);
  fflush($fp);
  flock($fp, LOCK_UN);
  fclose($fp);

  $recordId = $prefix . '-' . $year . '-' . $padded;
  @file_put_contents(
    $countersDir . '/_allocation_log.jsonl',
    json_encode([
      'record_id' => $recordId,
      'prefix' => $prefix,
      'year' => $year,
      'seq' => $next,
      'time' => now_iso(),
      'user' => $_SESSION['user'] ?? 'anonymous',
      'ip' => client_ip(),
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n",
    FILE_APPEND | LOCK_EX
  );

  return ['record_id' => $recordId, 'seq' => $next, 'digits' => $digits];
}

function normalize_master_context(array $context): array {
  $keys = ['customer_id', 'supplier_id', 'so_number', 'jo_number', 'wo_number', 'part_number', 'part_revision', 'capa_number'];
  $normalized = [];
  foreach ($keys as $key) {
    $value = trim((string)($context[$key] ?? ''));
    if ($value !== '') $normalized[$key] = $value;
  }
  return $normalized;
}

function build_issued_filename(string $formCode, string $formRevision, string $recordId, string $username, string $ext = 'xlsx'): string {
  $dt = new DateTimeImmutable('now', new DateTimeZone('Asia/Saigon'));
  $stampDate = $dt->format('Ymd');
  $stampTime = $dt->format('Hi');
  $initials = build_user_initials($username);
  return sprintf('%s_%s_%s_%s_%s-%s.%s', $formCode, $formRevision, $recordId, $stampDate, $stampTime, $initials, $ext);
}

function build_received_filename(array $allocation, int $receiptVersion, string $ext = 'xlsx'): string {
  $formCode = (string)($allocation['form_code'] ?? 'FORM');
  $formRevision = (string)($allocation['form_revision'] ?? 'V0');
  $recordId = (string)($allocation['record_id'] ?? 'RECORD');
  $dt = new DateTimeImmutable('now', new DateTimeZone('Asia/Saigon'));
  return sprintf('%s_%s_%s_%s_R%02d.%s', $formCode, $formRevision, $recordId, $dt->format('Ymd'), $receiptVersion, $ext);
}

function build_expected_filename_pattern(string $formCode, string $formRevision, string $recordId, string $ext = 'xlsx'): string {
  return '^' . preg_quote($formCode, '/') . '_' . preg_quote($formRevision, '/') . '_' . preg_quote($recordId, '/') . '_\\d{8}_\\d{4}-[A-Z0-9]{2,6}\\.' . preg_quote($ext, '/') . '$';
}

function build_hidden_sheet_payload(array $allocation, array $formEntry): array {
  $issuedAt = (string)($allocation['downloaded_at'] ?? now_iso());
  $downloadUser = (string)($allocation['downloaded_by'] ?? $allocation['created_by'] ?? 'system');
  $payload = [
    'form_code' => (string)($allocation['form_code'] ?? ''),
    'form_revision' => (string)($allocation['form_revision'] ?? 'V0'),
    'download_timestamp' => $issuedAt,
    'download_user' => $downloadUser,
    'system_origin' => 'HESEM-QMS-v3',
    'allocation_id' => (string)($allocation['allocation_id'] ?? ''),
    'expected_filename_pattern' => (string)($allocation['expected_filename_pattern'] ?? ''),
    'max_file_size_mb' => 25,
    'allowed_macros' => false,
    'template_checksum' => (string)($allocation['template_checksum'] ?? ''),
    'issued_record_id' => (string)($allocation['record_id'] ?? ''),
    'issued_to_user' => $downloadUser,
    'issued_at' => $issuedAt,
    'receipt_status' => allocation_status_normalize((string)($allocation['status'] ?? 'allocated')),
    'receipt_version' => (int)($allocation['receipt_version'] ?? 0),
    'master_context_json' => normalize_master_context((array)($allocation['master_context'] ?? [])),
    'receipt_history_json' => (array)($allocation['receipts'] ?? []),
    'latest_stored_filename' => (string)($allocation['latest_stored_filename'] ?? ''),
    'latest_upload_timestamp' => (string)($allocation['latest_upload_timestamp'] ?? ''),
  ];
  $payload['download_hash'] = hash('sha256', implode('|', [
    $payload['form_code'],
    $payload['form_revision'],
    $payload['download_timestamp'],
    $payload['download_user'],
    qms_runtime_secret(),
  ]));
  return $payload;
}

function python_runtime_command(array $args): string {
  $script = __DIR__ . '/tools/excel_hidden_sheet_runtime.py';
  $parts = ['python', escapeshellarg($script)];
  foreach ($args as $arg) {
    $parts[] = escapeshellarg((string)$arg);
  }
  return implode(' ', $parts);
}

function run_python_runtime(array $args): array {
  $exitCode = 0;
  $output = shell_run(python_runtime_command($args), $exitCode);
  if ($exitCode !== 0) {
    throw new RuntimeException('excel_runtime_failed: ' . $output);
  }
  $data = json_decode($output, true);
  if (!is_array($data)) {
    throw new RuntimeException('excel_runtime_invalid_json');
  }
  return $data;
}

function write_temp_json_file(array $payload, string $prefix = 'qms-'): string {
  $file = allocation_base_dir() . '/tmp/' . $prefix . bin2hex(random_bytes(6)) . '.json';
  file_put_contents($file, json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX);
  return $file;
}

function inspect_uploaded_workbook(string $sourcePath): array {
  global $DATA_DIR;
  $spec = $DATA_DIR . '/config/excel_hidden_sheet_spec.json';
  if (!is_file($spec)) throw new RuntimeException('excel_hidden_sheet_spec_missing');
  return run_python_runtime(['inspect', '--src', $sourcePath, '--spec', $spec]);
}

function issue_offline_workbook_package(string $sourcePath, string $targetPath, array $payload): array {
  global $DATA_DIR;
  $spec = $DATA_DIR . '/config/excel_hidden_sheet_spec.json';
  if (!is_file($spec)) throw new RuntimeException('excel_hidden_sheet_spec_missing');
  $metaFile = write_temp_json_file($payload, 'issue-');
  try {
    return run_python_runtime(['issue', '--src', $sourcePath, '--dst', $targetPath, '--spec', $spec, '--meta', $metaFile]);
  } finally {
    @unlink($metaFile);
  }
}

function append_receipt_to_workbook(string $sourcePath, string $targetPath, array $receiptPayload): array {
  global $DATA_DIR;
  $spec = $DATA_DIR . '/config/excel_hidden_sheet_spec.json';
  if (!is_file($spec)) throw new RuntimeException('excel_hidden_sheet_spec_missing');
  $receiptFile = write_temp_json_file($receiptPayload, 'receipt-');
  try {
    return run_python_runtime(['append-receipt', '--src', $sourcePath, '--dst', $targetPath, '--spec', $spec, '--receipt', $receiptFile]);
  } finally {
    @unlink($receiptFile);
  }
}

function stream_download_file(string $path, string $filename): void {
  if (!is_file($path)) api_json(['ok' => false, 'error' => 'file_not_found'], 404);
  if (session_status() === PHP_SESSION_ACTIVE) @session_write_close();
  http_response_code(200);
  header('Content-Type: application/octet-stream');
  header('Content-Length: ' . filesize($path));
  header('Content-Disposition: attachment; filename="' . rawurlencode($filename) . '"; filename*=UTF-8\'\'' . rawurlencode($filename));
  header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
  readfile($path);
  exit;
}

function allocation_history_query(array $filters = []): array {
  $store = load_allocation_store();
  $rows = array_values(array_filter((array)($store['allocations'] ?? []), function ($row) use ($filters) {
    if (!is_array($row)) return false;
    if (!empty($filters['record_type']) && (string)($row['record_type'] ?? '') !== (string)$filters['record_type']) return false;
    if (!empty($filters['department']) && (string)($row['department'] ?? '') !== (string)$filters['department']) return false;
    if (!empty($filters['form_code']) && (string)($row['form_code'] ?? '') !== (string)$filters['form_code']) return false;
    if (!empty($filters['delivery_mode']) && (string)($row['delivery_mode'] ?? '') !== (string)$filters['delivery_mode']) return false;
    if (!empty($filters['status']) && allocation_status_normalize((string)($row['status'] ?? 'allocated')) !== allocation_status_normalize((string)$filters['status'])) return false;
    $updatedAt = (string)($row['updated_at'] ?? $row['created_at'] ?? '');
    if (!empty($filters['date_from']) && substr($updatedAt, 0, 10) < (string)$filters['date_from']) return false;
    if (!empty($filters['date_to']) && substr($updatedAt, 0, 10) > (string)$filters['date_to']) return false;
    if (!empty($filters['search'])) {
      $haystack = strtolower(json_encode([
        $row['record_id'] ?? '',
        $row['record_type'] ?? '',
        $row['department'] ?? '',
        $row['form_code'] ?? '',
        $row['master_context'] ?? [],
        $row['notes'] ?? '',
      ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
      if (!str_contains($haystack, strtolower((string)$filters['search']))) return false;
    }
    return true;
  }));

  usort($rows, function ($a, $b) {
    return strcmp((string)($b['updated_at'] ?? ''), (string)($a['updated_at'] ?? ''));
  });

  $page = max(1, (int)($filters['page'] ?? 1));
  $pageSize = max(1, min(100, (int)($filters['page_size'] ?? 20)));
  $total = count($rows);
  $items = array_slice($rows, ($page - 1) * $pageSize, $pageSize);

  return [
    'entries' => $items,
    'page' => $page,
    'page_size' => $pageSize,
    'total' => $total,
    'total_pages' => max(1, (int)ceil($total / $pageSize)),
  ];
}

function verify_hidden_sheet_metadata(array $metadata, ?array $allocation, string $originalFilename): array {
  $issues = [];
  $warnings = [];
  $status = 'verified';

  if (($metadata['system_origin'] ?? '') !== 'HESEM-QMS-v3') {
    $issues[] = 'origin_invalid';
  }

  $expectedHash = hash('sha256', implode('|', [
    (string)($metadata['form_code'] ?? ''),
    (string)($metadata['form_revision'] ?? ''),
    (string)($metadata['download_timestamp'] ?? ''),
    (string)($metadata['download_user'] ?? ''),
    qms_runtime_secret(),
  ]));
  if (($metadata['download_hash'] ?? '') !== $expectedHash) {
    $issues[] = 'hash_mismatch';
  }

  if (!$allocation) {
    $issues[] = 'allocation_not_found';
  } else {
    $state = allocation_status_normalize((string)($allocation['status'] ?? 'allocated'));
    if (!in_array($state, ['downloaded', 'submitted', 'received'], true)) {
      $issues[] = 'allocation_wrong_state';
    }
    if (($metadata['issued_record_id'] ?? '') !== '' && (string)($metadata['issued_record_id'] ?? '') !== (string)($allocation['record_id'] ?? '')) {
      $issues[] = 'record_id_mismatch';
    }
    if (($metadata['form_code'] ?? '') !== '' && (string)($metadata['form_code'] ?? '') !== (string)($allocation['form_code'] ?? '')) {
      $issues[] = 'form_code_mismatch';
    }
    if (($metadata['template_checksum'] ?? '') !== '' && (string)($metadata['template_checksum'] ?? '') !== (string)($allocation['template_checksum'] ?? '')) {
      $issues[] = 'template_checksum_mismatch';
    }
  }

  $pattern = (string)($metadata['expected_filename_pattern'] ?? '');
  if ($pattern !== '' && @preg_match('/' . $pattern . '/i', '') !== false && !preg_match('/' . $pattern . '/i', $originalFilename)) {
    $warnings[] = 'filename_warning';
  }

  if ($issues) {
    $status = 'rejected';
  } elseif ($warnings) {
    $status = 'warning';
  }

  return [
    'status' => $status,
    'issues' => $issues,
    'warnings' => $warnings,
    'hash_valid' => !in_array('hash_mismatch', $issues, true),
    'origin_valid' => !in_array('origin_invalid', $issues, true),
    'allocation_valid' => !in_array('allocation_not_found', $issues, true) && !in_array('allocation_wrong_state', $issues, true),
  ];
}

function file_head_bytes(string $path, int $length = 4096): string {
  if (!is_file($path) || $length < 1) return '';
  $fh = @fopen($path, 'rb');
  if (!$fh) return '';
  $bytes = (string)@fread($fh, $length);
  @fclose($fh);
  return $bytes;
}

function csv_payload_looks_textual(string $payload): bool {
  if ($payload === '' || str_contains($payload, "\0")) return false;
  $len = strlen($payload);
  $controlCount = 0;
  for ($i = 0; $i < $len; $i++) {
    $ord = ord($payload[$i]);
    $isAllowedControl = in_array($ord, [9, 10, 13], true);
    if (($ord < 32 && !$isAllowedControl) || $ord === 127) $controlCount++;
  }
  return ($controlCount / max(1, $len)) < 0.02;
}

function workbook_zip_structure_valid(string $path): bool {
  if (!class_exists('ZipArchive')) return true;
  $zip = new ZipArchive();
  if ($zip->open($path) !== true) return false;
  foreach (['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml'] as $entry) {
    if ($zip->locateName($entry, ZipArchive::FL_NOCASE) === false) {
      $zip->close();
      return false;
    }
  }
  $zip->close();
  return true;
}

function uploaded_workbook_signature_valid(string $path, string $ext): bool {
  $ext = strtolower(trim($ext));
  $head = file_head_bytes($path, 4096);
  if ($head === '') return false;

  return match ($ext) {
    'xlsx', 'xlsm' => str_starts_with($head, "PK\x03\x04") && workbook_zip_structure_valid($path),
    'xls' => str_starts_with($head, hex2bin('D0CF11E0A1B11AE1')),
    'csv' => csv_payload_looks_textual($head),
    default => false,
  };
}

function validate_signature_payloads(array $schema, array $signatures): array {
  $blocks = is_array($schema['signature_blocks'] ?? null) ? $schema['signature_blocks'] : [];
  $errors = [];
  $summary = [];

  foreach ($blocks as $block) {
    if (!is_array($block)) continue;
    $blockId = trim((string)($block['id'] ?? ''));
    if ($blockId === '') continue;

    $signature = $signatures[$blockId] ?? null;
    if (!is_array($signature)) {
      if (!empty($block['required_on_submit'])) {
        $errors[] = ['signature_block' => $blockId, 'error' => 'missing_required_signature'];
      }
      continue;
    }

    $summary[$blockId] = [
      'signer_id' => trim((string)($signature['signer_id'] ?? '')),
      'signer_name' => trim((string)($signature['signer_name'] ?? '')),
      'signed_at' => trim((string)($signature['signed_at'] ?? '')),
      'pin_confirmed' => !empty($signature['pin_confirmed']),
      'hash_prefix' => substr(trim((string)($signature['hash'] ?? '')), 0, 16),
    ];

    foreach (['signer_id', 'signer_name', 'signed_at', 'hash'] as $requiredKey) {
      if (trim((string)($signature[$requiredKey] ?? '')) === '') {
        $errors[] = ['signature_block' => $blockId, 'error' => 'signature_field_missing', 'field' => $requiredKey];
      }
    }

    if (!empty($block['require_pin']) && empty($signature['pin_confirmed'])) {
      $errors[] = ['signature_block' => $blockId, 'error' => 'pin_confirmation_required'];
    }

    $appliedTo = trim((string)($signature['applied_to'] ?? ''));
    if ($appliedTo !== '' && substr($appliedTo, -strlen(':' . $blockId)) !== ':' . $blockId) {
      $errors[] = ['signature_block' => $blockId, 'error' => 'signature_target_mismatch'];
    }
  }

  return [
    'ok' => !$errors,
    'errors' => $errors,
    'summary' => $summary,
  ];
}

function client_ip(): string {
  return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

function pending_auth_ttl_seconds(): int {
  global $PENDING_AUTH_TTL_SECONDS;
  return max(60, (int)$PENDING_AUTH_TTL_SECONDS);
}

function pending_auth_remaining_seconds(int $startedAt): int {
  if ($startedAt <= 0) return 0;
  return max(0, pending_auth_ttl_seconds() - (time() - $startedAt));
}

function clear_preauth_session_state(): void {
  unset($_SESSION['preauth_user'], $_SESSION['preauth_started']);
  if (empty($_SESSION['user'])) {
    unset($_SESSION['mfa_ok']);
  }
}

function clear_enroll_session_state(): void {
  unset($_SESSION['enroll_user'], $_SESSION['enroll_secret'], $_SESSION['enroll_started']);
}

function clear_pending_auth_session_state(): void {
  clear_enroll_session_state();
  clear_preauth_session_state();
}

function clear_auth_session_state(): void {
  unset(
    $_SESSION['user'],
    $_SESSION['preauth_user'],
    $_SESSION['preauth_started'],
    $_SESSION['mfa_ok'],
    $_SESSION['enroll_user'],
    $_SESSION['enroll_secret'],
    $_SESSION['enroll_started'],
    $_SESSION['last_active']
  );
}

function set_preauth_session(string $username): void {
  if (session_status() !== PHP_SESSION_ACTIVE) session_init();
  session_regenerate_id(true);
  clear_auth_session_state();
  $_SESSION['preauth_user'] = strtolower(trim($username));
  $_SESSION['preauth_started'] = time();
  $_SESSION['mfa_ok'] = false;
}

function set_authenticated_session(string $username): void {
  if (session_status() !== PHP_SESSION_ACTIVE) session_init();
  session_regenerate_id(true);
  clear_auth_session_state();
  $_SESSION['user'] = strtolower(trim($username));
  $_SESSION['mfa_ok'] = true;
  $_SESSION['last_active'] = time();
}

function destroy_auth_session(): void {
  if (session_status() !== PHP_SESSION_ACTIVE) session_init();
  clear_auth_session_state();
  if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 3600, $params['path'] ?: '/', $params['domain'] ?? '', (bool)($params['secure'] ?? false), (bool)($params['httponly'] ?? true));
  }
  $_SESSION = [];
  if (session_status() === PHP_SESSION_ACTIVE) {
    @session_destroy();
  }
}

function session_requires_completed_mfa(array $user, array $settings = []): bool {
  $systemRequiresMfa = (bool)($settings['require_mfa'] ?? true);
  $userMfa = $user['mfa'] ?? [];
  $userHasMfa = is_array($userMfa) && (bool)($userMfa['enabled'] ?? false);
  return $systemRequiresMfa || $userHasMfa;
}

function now_iso(): string {
  return gmdate('c');
}

function password_policy(string $pw): array {
  if (strlen($pw) < 10) return [false, 'Password must be at least 10 characters'];
  if (!preg_match('/[a-z]/', $pw)) return [false, 'Password must include a lowercase letter'];
  if (!preg_match('/[A-Z]/', $pw)) return [false, 'Password must include an uppercase letter'];
  if (!preg_match('/\d/', $pw)) return [false, 'Password must include a number'];
  if (!preg_match('/[^A-Za-z0-9]/', $pw)) return [false, 'Password must include a symbol'];
  return [true, ''];
}

// ---------- Session + Cookies ----------
function session_init(): void {
  global $DATA_DIR;
  if (session_status() === PHP_SESSION_ACTIVE) return;

  // Use an application-owned session directory to avoid server session.save_path issues
  $sessDir = $DATA_DIR . '/sessions';
  ensure_dir($sessDir);
  @session_save_path($sessDir);

  $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (strtolower((string)($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https')
    || ((string)($_SERVER['HTTP_X_FORWARDED_SSL'] ?? '') === 'on');

  @ini_set('session.use_only_cookies', '1');
  @ini_set('session.use_strict_mode', '1');
  @ini_set('session.cookie_httponly', '1');
  @ini_set('session.cookie_samesite', 'Lax');
  if ($https) {
    @ini_set('session.cookie_secure', '1');
  }

  // Host-only cookie (do not set Domain attribute) to maximize compatibility on subdomains
  $domain = '';

  session_name($https ? '__Host-HESEMSESSID' : 'HESEMSESSID');
  session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'domain' => $domain,
    'secure' => $https,
    'httponly' => true,
    'samesite' => 'Lax',
  ]);
  session_start();
}

function csrf_token(): string {
  session_init();
  if (empty($_SESSION['csrf'])) {
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
  }
  return (string)$_SESSION['csrf'];
}

function require_csrf(): void {
  session_init();
  $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
  if ($token === '' || empty($_SESSION['csrf']) || !hash_equals((string)$_SESSION['csrf'], (string)$token)) {
    api_json(['ok' => false, 'error' => 'csrf_failed'], 403);
  }
}

function shell_exec_available(): bool {
  if (!function_exists('exec')) return false;
  $disabled = array_map('trim', explode(',', (string)ini_get('disable_functions')));
  return !in_array('exec', $disabled, true);
}

function shell_run(string $command, ?int &$exitCode = null): string {
  if (!shell_exec_available()) {
    throw new RuntimeException('exec_unavailable');
  }
  $output = [];
  $code = 0;
  exec($command . ' 2>&1', $output, $code);
  $exitCode = $code;
  return trim(implode("\n", $output));
}

function git_shell_command(string $repoDir, array $args): string {
  $parts = [
    'GIT_TERMINAL_PROMPT=0',
    'GIT_SSH_COMMAND=' . escapeshellarg('ssh -oBatchMode=yes'),
    'git',
    '-C',
    escapeshellarg($repoDir),
  ];
  foreach ($args as $arg) {
    $parts[] = escapeshellarg((string)$arg);
  }
  return implode(' ', $parts);
}

function git_command(array $args, string $repoDir, ?int &$exitCode = null): string {
  return shell_run(git_shell_command($repoDir, $args), $exitCode);
}

function split_nonempty_lines(string $text): array {
  $lines = preg_split("/\r\n|\n|\r/", trim($text));
  if (!is_array($lines)) return [];
  return array_values(array_filter(array_map('trim', $lines), static fn($line) => $line !== ''));
}

function git_status_entry_path(string $line): string {
  $raw = trim(substr($line, 3));
  if ($raw === '') return '';
  if (str_contains($raw, ' -> ')) {
    $parts = explode(' -> ', $raw);
    $raw = (string)end($parts);
  }
  $raw = trim($raw);
  if ($raw !== '' && $raw[0] === '"' && substr($raw, -1) === '"') {
    $raw = stripcslashes(substr($raw, 1, -1));
  }
  return str_replace('\\', '/', $raw);
}

function git_is_runtime_noise_path(string $path): bool {
  $p = ltrim(str_replace('\\', '/', trim($path)), '/');
  if ($p === '') return false;
  if ($p === '01-QMS-Portal/qms-data/config/users.json') return true;
  if ($p === '01-QMS-Portal/qms-data/php_error.log') return true;
  if ($p === '01-QMS-Portal/qms-data/scan_cache.json') return true;
  if (str_starts_with($p, '01-QMS-Portal/qms-data/sessions/')) {
    return basename($p) !== 'README.md';
  }
  if (str_starts_with($p, '01-QMS-Portal/qms-data/ratelimit/')) {
    return basename($p) !== 'README.md';
  }
  if (str_starts_with($p, '01-QMS-Portal/qms-data/form-workflow/')) return true;
  return false;
}

function git_filter_non_runtime_status_lines(array $statusLines): array {
  $kept = [];
  foreach ($statusLines as $line) {
    if (!is_string($line) || trim($line) === '') continue;
    $path = git_status_entry_path($line);
    if (!git_is_runtime_noise_path($path)) {
      $kept[] = $line;
    }
  }
  return $kept;
}

function git_filter_non_runtime_paths(array $paths): array {
  $kept = [];
  foreach ($paths as $path) {
    if (!is_string($path) || trim($path) === '') continue;
    $norm = str_replace('\\', '/', trim($path));
    if (!git_is_runtime_noise_path($norm)) {
      $kept[] = $norm;
    }
  }
  return $kept;
}

function git_collect_paths_from_status_lines(array $statusLines): array {
  $paths = [];
  foreach ($statusLines as $line) {
    if (!is_string($line) || trim($line) === '') continue;
    $path = git_status_entry_path($line);
    if ($path !== '') $paths[] = $path;
  }
  return array_values(array_unique($paths));
}

function git_join_paths_for_error(array $paths, int $max = 12): string {
  $clean = array_values(array_filter(array_map(static function($p){
    return is_string($p) ? trim(str_replace('\\', '/', $p)) : '';
  }, $paths), static fn($p) => $p !== ''));
  if (empty($clean)) return '';
  $slice = array_slice($clean, 0, $max);
  $extra = count($clean) - count($slice);
  $msg = implode(', ', $slice);
  if ($extra > 0) $msg .= ', ... (+' . $extra . ')';
  return $msg;
}

function git_head_commit(string $repoReal, string $ref = 'HEAD'): string {
  $code = 0;
  $out = trim((string)git_command(['rev-parse', $ref], $repoReal, $code));
  return $code === 0 ? $out : '';
}

function git_parse_status_entries(array $statusLines): array {
  $entries = [];
  foreach ($statusLines as $line) {
    if (!is_string($line) || strlen($line) < 3) continue;
    $path = git_status_entry_path($line);
    if ($path === '') continue;
    $entries[] = [
      'xy' => substr($line, 0, 2),
      'path' => $path,
    ];
  }
  return $entries;
}

function git_parse_name_status_output(string $text): array {
  $entries = [];
  foreach (split_nonempty_lines($text) as $line) {
    $parts = preg_split("/\t+/", trim((string)$line));
    if (!is_array($parts) || count($parts) < 2) continue;
    $status = strtoupper(trim((string)$parts[0]));
    if ($status === '') continue;
    if (count($parts) >= 3) {
      $oldPath = str_replace('\\', '/', trim((string)$parts[1]));
      $path = str_replace('\\', '/', trim((string)$parts[2]));
    } else {
      $oldPath = '';
      $path = str_replace('\\', '/', trim((string)$parts[1]));
    }
    if ($path === '') continue;
    $entries[] = [
      'status' => $status,
      'path' => $path,
      'old_path' => $oldPath,
    ];
  }
  return $entries;
}

function git_cleanup_runtime_noise(string $repoReal): void {
  $statusCode = 0;
  $statusOut = git_command(['status', '--porcelain', '--untracked-files=all'], $repoReal, $statusCode);
  if ($statusCode !== 0) return;
  $statusLines = split_nonempty_lines($statusOut);

  $trackedRuntimePaths = [];
  foreach ($statusLines as $line) {
    if (!is_string($line) || strlen($line) < 3) continue;
    $xy = substr($line, 0, 2);
    $path = git_status_entry_path($line);
    if ($path === '' || !git_is_runtime_noise_path($path)) continue;
    if ($xy !== '??') {
      $trackedRuntimePaths[] = $path;
    }
  }
  $trackedRuntimePaths = array_values(array_unique($trackedRuntimePaths));
  if (!empty($trackedRuntimePaths)) {
    $restoreCode = 0;
    git_command(['restore', '--staged', '--worktree', '--', ...$trackedRuntimePaths], $repoReal, $restoreCode);
  }

  // Clean untracked runtime files/dirs in known noisy locations.
  $cleanTargets = [
    '01-QMS-Portal/qms-data/form-workflow',
    '01-QMS-Portal/qms-data/sessions',
    '01-QMS-Portal/qms-data/ratelimit',
    '01-QMS-Portal/qms-data/php_error.log',
    '01-QMS-Portal/qms-data/scan_cache.json',
  ];
  foreach ($cleanTargets as $target) {
    $cleanCode = 0;
    git_command(['clean', '-fd', '--', $target], $repoReal, $cleanCode);
  }

  // Ensure tracked runtime file returns to HEAD state.
  $usersRestoreCode = 0;
  git_command(['restore', '--', '01-QMS-Portal/qms-data/config/users.json'], $repoReal, $usersRestoreCode);
}

function git_sync_commit_author(array $me): array {
  $name = trim((string)($me['name'] ?? $me['username'] ?? 'Portal Sync'));
  if ($name === '') $name = 'Portal Sync';

  $username = strtolower(trim((string)($me['username'] ?? '')));
  if ($username === '') {
    $username = strtolower($name);
  }
  $username = preg_replace('/[^a-z0-9._-]+/i', '-', $username) ?? 'portal';
  $username = trim($username, '.-');
  if ($username === '') $username = 'portal';

  return [
    'name' => $name,
    'email' => 'portal+' . $username . '@local.invalid',
  ];
}

function git_sync_documents(array $me, string $repoDir): array {
  $repoReal = realpath($repoDir);
  if ($repoReal === false || !is_dir($repoReal)) {
    throw new RuntimeException('repo_not_found');
  }

  $checkCode = 0;
  $checkOut = git_command(['rev-parse', '--is-inside-work-tree'], $repoReal, $checkCode);
  if ($checkCode !== 0 || trim($checkOut) !== 'true') {
    throw new RuntimeException('not_a_git_repo');
  }

  $branchCode = 0;
  $branch = trim((string)git_command(['branch', '--show-current'], $repoReal, $branchCode));
  if ($branchCode !== 0 || $branch === '') $branch = 'main';
  $headBefore = git_head_commit($repoReal);

  $statusArgs = ['status', '--porcelain', '--untracked-files=all'];
  $statusCode = 0;
  $statusOut = git_command($statusArgs, $repoReal, $statusCode);
  if ($statusCode !== 0) {
    throw new RuntimeException('git_status_failed');
  }
  $statusLines = git_filter_non_runtime_status_lines(split_nonempty_lines($statusOut));
  $statusEntries = git_parse_status_entries($statusLines);
  if (empty($statusLines)) {
    $aheadCode = 0;
    $aheadOut = git_command(['rev-list', '--count', 'origin/' . $branch . '..' . $branch], $repoReal, $aheadCode);
    $aheadCount = $aheadCode === 0 ? (int)trim($aheadOut) : 0;
    if ($aheadCount > 0) {
      // Pull first to integrate remote changes before pushing
      $pullCode = 0;
      $pullOut = git_command(['pull', '--rebase', 'origin', $branch], $repoReal, $pullCode);
      if ($pullCode !== 0) {
        // If rebase fails, try regular pull
        git_command(['rebase', '--abort'], $repoReal, $pullCode);
        $pullCode = 0;
        $pullOut = git_command(['pull', '--no-rebase', 'origin', $branch], $repoReal, $pullCode);
        if ($pullCode !== 0) {
          throw new RuntimeException('git_presync_pull_failed' . ($pullOut !== '' ? ': ' . $pullOut : ''));
        }
      }
      $pushCode = 0;
      $pushOut = git_command(['push', 'origin', $branch], $repoReal, $pushCode);
      if ($pushCode !== 0) {
        throw new RuntimeException('git_push_failed' . ($pushOut !== '' ? ': ' . $pushOut : ''));
      }
      return [
        'pushed' => true,
        'branch' => $branch,
        'files' => [],
        'message' => 'Existing local commits pushed to origin/' . $branch,
        'status' => [],
        'status_entries' => [],
        'commit_output' => '',
        'push_output' => $pushOut,
        'head_before' => $headBefore,
        'head_after' => git_head_commit($repoReal),
      ];
    }
    return [
      'pushed' => false,
      'branch' => $branch,
      'files' => [],
      'message' => 'No non-runtime changes to sync.',
      'status' => [],
      'status_entries' => [],
      'commit_output' => '',
      'push_output' => '',
      'head_before' => $headBefore,
      'head_after' => $headBefore,
    ];
  }

  // Stage all changes first, then runtime noise will be removed from index/worktree.
  $addArgs = ['add', '-A', '--', '.'];
  $addCode = 0;
  $addOut = git_command($addArgs, $repoReal, $addCode);
  if ($addCode !== 0) {
    throw new RuntimeException('git_add_failed' . ($addOut !== '' ? ': ' . $addOut : ''));
  }

  // Ensure runtime files never get committed even after add -A.
  git_cleanup_runtime_noise($repoReal);

  $filesCode = 0;
  $filesOut = git_command(['diff', '--cached', '--name-only', '--'], $repoReal, $filesCode);
  if ($filesCode !== 0) {
    throw new RuntimeException('git_diff_cached_failed');
  }
  $files = git_filter_non_runtime_paths(split_nonempty_lines($filesOut));
  if (empty($files)) {
    return [
      'pushed' => false,
      'branch' => $branch,
      'files' => [],
      'message' => 'No staged non-runtime changes to sync.',
      'status' => $statusLines,
      'status_entries' => $statusEntries,
      'commit_output' => '',
      'push_output' => '',
      'head_before' => $headBefore,
      'head_after' => $headBefore,
    ];
  }

  $actor = strtolower((string)($me['username'] ?? 'portal'));
  $actor = preg_replace('/[^a-z0-9._-]+/i', '-', $actor) ?: 'portal';
  $commitMessage = sprintf('docs: portal sync by %s %s UTC', $actor, gmdate('Y-m-d H:i:s'));
  $author = git_sync_commit_author($me);

  $commitCode = 0;
  $commitOut = git_command([
    '-c', 'user.name=' . (string)$author['name'],
    '-c', 'user.email=' . (string)$author['email'],
    'commit', '-m', $commitMessage
  ], $repoReal, $commitCode);
  if ($commitCode !== 0) {
    throw new RuntimeException('git_commit_failed' . ($commitOut !== '' ? ': ' . $commitOut : ''));
  }

  // Pull remote changes before pushing to avoid non-fast-forward errors
  $prePullCode = 0;
  $prePullOut = git_command(['pull', '--rebase', 'origin', $branch], $repoReal, $prePullCode);
  if ($prePullCode !== 0) {
    git_command(['rebase', '--abort'], $repoReal, $prePullCode);
    $prePullCode = 0;
    $prePullOut = git_command(['pull', '--no-rebase', 'origin', $branch], $repoReal, $prePullCode);
  }

  $pushCode = 0;
  $pushOut = git_command(['push', 'origin', $branch], $repoReal, $pushCode);
  if ($pushCode !== 0) {
    throw new RuntimeException('git_push_failed' . ($pushOut !== '' ? ': ' . $pushOut : ''));
  }

  return [
    'pushed' => true,
    'branch' => $branch,
    'files' => $files,
    'message' => 'Document changes pushed to origin/' . $branch,
    'status' => $statusLines,
    'status_entries' => $statusEntries,
    'commit_output' => $commitOut,
    'push_output' => $pushOut,
    'head_before' => $headBefore,
    'head_after' => git_head_commit($repoReal),
  ];
}

function git_pull_portal(string $repoDir, ?array $me = null): array {
  $repoReal = realpath($repoDir);
  if ($repoReal === false || !is_dir($repoReal)) {
    throw new RuntimeException('repo_not_found');
  }

  $checkCode = 0;
  $checkOut = git_command(['rev-parse', '--is-inside-work-tree'], $repoReal, $checkCode);
  if ($checkCode !== 0 || trim($checkOut) !== 'true') {
    throw new RuntimeException('not_a_git_repo');
  }

  // Auto-clean runtime noise before safety checks so Pull can run without
  // manual cleanup in cPanel Terminal.
  git_cleanup_runtime_noise($repoReal);

  // Auto-sync meaningful local changes before pulling so admin does not need
  // to switch between Push and Pull manually for routine edits.
  $presyncResult = null;
  if (is_array($me)) {
    try {
      $presyncResult = git_sync_documents($me, $repoReal);
      git_cleanup_runtime_noise($repoReal);
    } catch (Throwable $syncError) {
      $syncMsg = (string)$syncError->getMessage();
      if (!(str_starts_with($syncMsg, 'git_status_failed') || str_starts_with($syncMsg, 'git_diff_cached_failed'))) {
        throw new RuntimeException('git_presync_failed: ' . $syncMsg);
      }
    }
  }

  $stagedCode = 0;
  $stagedOut = git_command(['diff', '--cached', '--name-only'], $repoReal, $stagedCode);
  if ($stagedCode !== 0) {
    throw new RuntimeException('git_index_check_failed');
  }
  $stagedFiles = split_nonempty_lines($stagedOut);
  $stagedMeaningful = git_filter_non_runtime_paths($stagedFiles);
  if (!empty($stagedMeaningful)) {
    throw new RuntimeException('staged_changes_present: ' . git_join_paths_for_error($stagedMeaningful));
  }

  $statusCode = 0;
  $statusOut = git_command(['status', '--porcelain', '--untracked-files=all'], $repoReal, $statusCode);
  if ($statusCode !== 0) {
    throw new RuntimeException('git_status_failed');
  }
  $dirtyLines = git_filter_non_runtime_status_lines(split_nonempty_lines($statusOut));
  if (!empty($dirtyLines)) {
    $dirtyPaths = git_collect_paths_from_status_lines($dirtyLines);
    throw new RuntimeException('working_tree_dirty: ' . git_join_paths_for_error($dirtyPaths));
  }

  $branchCode = 0;
  $branch = trim((string)git_command(['branch', '--show-current'], $repoReal, $branchCode));
  if ($branchCode !== 0 || $branch === '') $branch = 'main';
  $headBefore = git_head_commit($repoReal);

  $fetchCode = 0;
  $fetchOut = git_command(['fetch', 'origin', $branch], $repoReal, $fetchCode);
  if ($fetchCode !== 0) {
    throw new RuntimeException('git_fetch_failed' . ($fetchOut !== '' ? ': ' . $fetchOut : ''));
  }

  $behindCode = 0;
  $behindOut = git_command(['rev-list', '--count', $branch . '..origin/' . $branch], $repoReal, $behindCode);
  $behindCount = $behindCode === 0 ? (int)trim($behindOut) : 0;
  if ($behindCount <= 0) {
    return [
      'pulled' => false,
      'branch' => $branch,
      'message' => 'Portal is already up to date with origin/' . $branch,
      'before_head' => $headBefore,
      'after_head' => $headBefore,
      'changed_files' => [],
      'presync' => $presyncResult,
      'fetch_output' => $fetchOut,
      'pull_output' => $fetchOut,
    ];
  }

  $pullCode = 0;
  $pullOut = git_command(['pull', '--ff-only', 'origin', $branch], $repoReal, $pullCode);
  if ($pullCode !== 0) {
    throw new RuntimeException('git_pull_failed' . ($pullOut !== '' ? ': ' . $pullOut : ''));
  }

  $headAfter = git_head_commit($repoReal);
  $changedFiles = [];
  if ($headBefore !== '' && $headAfter !== '' && $headBefore !== $headAfter) {
    $changedCode = 0;
    $changedOut = git_command(['diff', '--name-status', $headBefore . '..' . $headAfter], $repoReal, $changedCode);
    if ($changedCode === 0) {
      $changedFiles = git_parse_name_status_output($changedOut);
    }
  }

  return [
    'pulled' => true,
    'branch' => $branch,
    'message' => 'Portal updated from origin/' . $branch,
    'before_head' => $headBefore,
    'after_head' => $headAfter,
    'changed_files' => $changedFiles,
    'presync' => $presyncResult,
    'fetch_output' => $fetchOut,
    'pull_output' => trim($fetchOut . ($fetchOut !== '' && $pullOut !== '' ? "\n" : '') . $pullOut),
  ];
}

// ---------- Rate limit (simple) ----------
function rate_limit_check(string $key, int $maxHits, int $windowSec, string $rlDir): void {
  ensure_dir($rlDir);
  $file = $rlDir . '/' . preg_replace('/[^a-zA-Z0-9_\-\.]/', '_', $key) . '.json';
  $t = time();

  $state = ['start' => $t, 'hits' => 0];
  if (is_file($file)) {
    $raw = @file_get_contents($file);
    $tmp = json_decode((string)$raw, true);
    if (is_array($tmp) && isset($tmp['start'], $tmp['hits'])) $state = $tmp;
  }

  if (($t - (int)$state['start']) >= $windowSec) {
    $state = ['start' => $t, 'hits' => 0];
  }
  $state['hits'] = (int)$state['hits'] + 1;

  @file_put_contents($file, json_encode($state), LOCK_EX);

  if ((int)$state['hits'] > $maxHits) {
    api_json(['ok' => false, 'error' => 'rate_limited'], 429);
  }
}

// ---------- Users store ----------
function users_load(string $usersFile): ?array {
  if (!is_file($usersFile)) return null;
  $raw = @file_get_contents($usersFile);
  if ($raw === false) return null;
  $data = json_decode($raw, true);
  return is_array($data) ? $data : null;
}

function users_save(string $usersFile, array $store): void {
  $dir = dirname($usersFile);
  ensure_dir($dir);

  $json = json_encode($store, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  if ($json === false) { throw new RuntimeException('Cannot encode users'); }

  // Prefer atomic write (tmp + rename). Some hosts may block rename() across
  // file systems; fall back to direct write in that case.
  $tmp = $usersFile . '.tmp';
  $wroteTmp = @file_put_contents($tmp, $json, LOCK_EX);

  if ($wroteTmp === false) {
    $wrote = @file_put_contents($usersFile, $json, LOCK_EX);
    if ($wrote === false) {
      throw new RuntimeException('Cannot write users file. Please ensure the web server can write to: ' . $usersFile);
    }
    @chmod($usersFile, 0664);
    return;
  }

  if (!@rename($tmp, $usersFile)) {
    // Fallback: direct write / copy
    $wrote = @file_put_contents($usersFile, $json, LOCK_EX);
    if ($wrote === false) {
      if (!@copy($tmp, $usersFile)) {
        @unlink($tmp);
        throw new RuntimeException('Cannot replace users file. Please ensure write permissions for: ' . $usersFile);
      }
    }
    @unlink($tmp);
  }

  @chmod($usersFile, 0664);
}

function invalidate_scan_cache(string $dataDir): void {
  $cacheFile = $dataDir . '/scan_cache.json';
  if (is_file($cacheFile)) {
    @unlink($cacheFile);
  }
}

function filename_matches_doc_code(string $filename, string $code): bool {
  $expected = strtoupper(trim($code));
  if ($expected === '') return false;
  if (scan_extract_code($filename) === $expected) return true;

  $stem = strtolower(pathinfo($filename, PATHINFO_FILENAME));
  $slug = slugify($expected);
  if ($slug === '') return false;

  return $stem === $slug || str_starts_with($stem, $slug . '-');
}

function find_user_by_username(array $store, string $username): ?array {
  $u = strtolower(trim($username));
  foreach (($store['users'] ?? []) as $user) {
    if (is_array($user) && strtolower((string)($user['username'] ?? '')) === $u) return $user;
  }
  return null;
}

function update_user(array &$store, array $newUser): void {
  $u = strtolower((string)($newUser['username'] ?? ''));
  $users = $store['users'] ?? [];
  foreach ($users as $i => $user) {
    if (is_array($user) && strtolower((string)($user['username'] ?? '')) === $u) {
      $users[$i] = $newUser;
      $store['users'] = $users;
      return;
    }
  }
  $users[] = $newUser;
  $store['users'] = $users;
}

// ---------- Base32 + TOTP ----------
function base32_charset(): string { return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; }

function base32_encode(string $bin): string {
  $alphabet = base32_charset();
  $bits = '';
  for ($i=0; $i<strlen($bin); $i++) {
    $bits .= str_pad(decbin(ord($bin[$i])), 8, '0', STR_PAD_LEFT);
  }
  $out = '';
  for ($i=0; $i<strlen($bits); $i += 5) {
    $chunk = substr($bits, $i, 5);
    if (strlen($chunk) < 5) $chunk = str_pad($chunk, 5, '0', STR_PAD_RIGHT);
    $out .= $alphabet[bindec($chunk)];
  }
  return $out;
}

function base32_decode(string $b32): string {
  $alphabet = base32_charset();
  $b32 = strtoupper(preg_replace('/[^A-Z2-7]/', '', $b32));
  $bits = '';
  for ($i=0; $i<strlen($b32); $i++) {
    $val = strpos($alphabet, $b32[$i]);
    if ($val === false) continue;
    $bits .= str_pad(decbin($val), 5, '0', STR_PAD_LEFT);
  }
  $out = '';
  for ($i=0; $i<strlen($bits); $i += 8) {
    $byte = substr($bits, $i, 8);
    if (strlen($byte) < 8) break;
    $out .= chr(bindec($byte));
  }
  return $out;
}

function hotp(string $secretBin, int $counter, int $digits = 6): string {
  $ctr = pack('N*', 0) . pack('N*', $counter);
  $hash = hash_hmac('sha1', $ctr, $secretBin, true);
  $offset = ord(substr($hash, -1)) & 0x0F;
  $part = substr($hash, $offset, 4);
  $num = unpack('N', $part)[1] & 0x7FFFFFFF;
  $mod = 10 ** $digits;
  return str_pad((string)($num % $mod), $digits, '0', STR_PAD_LEFT);
}

function totp_verify(string $secretB32, string $code, int $window = 1, int $period = 30, int $digits = 6): bool {
  $code = preg_replace('/\D/', '', $code);
  if ($code === '' || strlen($code) !== $digits) return false;
  $secretBin = base32_decode($secretB32);
  if ($secretBin === '') return false;

  $t = time();
  $counter = intdiv($t, $period);

  for ($i = -$window; $i <= $window; $i++) {
    $cand = hotp($secretBin, $counter + $i, $digits);
    if (hash_equals($cand, $code)) return true;
  }
  return false;
}

function otpauth_url(string $issuer, string $account, string $secretB32): string {
  // For maximum Authenticator compatibility: encode issuer/account separately and KEEP the ":" unescaped.
  $issuerEnc  = rawurlencode($issuer);
  $accountEnc = rawurlencode($account);
  $label = $issuerEnc . ':' . $accountEnc;
  return "otpauth://totp/{$label}?secret={$secretB32}&issuer={$issuerEnc}&algorithm=SHA1&digits=6&period=30";
}

function sanitize_user_for_client(array $user): array {
  return [
    'username' => (string)($user['username'] ?? ''),
    'active'   => (bool)($user['active'] ?? true),
    'role'     => (string)($user['role'] ?? 'user'),
    'name'     => (string)($user['name'] ?? ''),
    'dept'     => (string)($user['dept'] ?? ''),
    'title'    => (string)($user['title'] ?? ''),
    'cccd'     => (string)($user['cccd'] ?? ''),
    'phone'    => (string)($user['phone'] ?? ''),
    'personal_email' => (string)($user['personal_email'] ?? ''),
    'mfa'      => ['enabled' => (bool)(($user['mfa']['enabled'] ?? false))],
    'updated_at' => (string)($user['updated_at'] ?? ''),
    'created_at' => (string)($user['created_at'] ?? ''),
  ];
}

function random_password(int $len = 12): string {
  // Policy-friendly password generator (meets password_policy):
  // - at least 10 chars
  // - includes lower/upper/number/symbol
  // Avoid ambiguous characters (O/0, I/1, l/1)
  if ($len < 10) $len = 10;

  $upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  $lower = 'abcdefghijkmnopqrstuvwxyz';
  $digits = '23456789';
  $symbols = '!@#$%^&*_-+=?';
  $all = $upper . $lower . $digits . $symbols;

  $pw = [];
  $pw[] = $upper[random_int(0, strlen($upper) - 1)];
  $pw[] = $lower[random_int(0, strlen($lower) - 1)];
  $pw[] = $digits[random_int(0, strlen($digits) - 1)];
  $pw[] = $symbols[random_int(0, strlen($symbols) - 1)];

  for ($i = 4; $i < $len; $i++) {
    $pw[] = $all[random_int(0, strlen($all) - 1)];
  }

  // Fisher–Yates shuffle
  for ($i = count($pw) - 1; $i > 0; $i--) {
    $j = random_int(0, $i);
    $tmp = $pw[$i];
    $pw[$i] = $pw[$j];
    $pw[$j] = $tmp;
  }

  return implode('', $pw);
}




// ---------- Guard for api/index.php MVC bootstrap ----------
// When api/index.php loads this file, it only needs the helper functions above.
// The constant API_HELPERS_ONLY prevents executing the boot + switch below.
if (defined('API_HELPERS_ONLY')) {
    return;
}

// ---------- Boot ----------
ensure_dir($DATA_DIR);
migrate_legacy_data_dir($LEGACY_DATA_DIR, $DATA_DIR);
ensure_dir($CONF_DIR);
ensure_dir($RL_DIR);
session_init();

$action = (string)($_GET['action'] ?? ($_POST['action'] ?? ''));
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$store = users_load($USERS_FILE);

// Normalize action aliases
$action = match ($action) {
  'auth_status' => 'status',
  'login' => 'auth_login',
  'mfa_verify', 'verify' => 'auth_mfa_verify',
  'enroll_verify', 'enroll' => 'auth_enroll_verify',
  'logout' => 'auth_logout',
  default => $action
};

switch ($action) {
  case 'status': {
    $logged = false;
    $mfaPending = false;
    $enrollPending = false;
    $pendingExpiresIn = null;
    $authExpired = null;
    $user = null;
    if (!empty($_SESSION['user']) && is_array($store)) {
      $u = find_user_by_username($store, (string)$_SESSION['user']);
      if ($u) {
        $mfaPending = session_requires_completed_mfa($u, is_array($store['settings'] ?? null) ? $store['settings'] : []) && empty($_SESSION['mfa_ok']);
        if (!$mfaPending) {
          $logged = true;
          $user = sanitize_user_for_client($u);
        }
      }
    }
    $enrollUser = (string)($_SESSION['enroll_user'] ?? '');
    $enrollSecret = (string)($_SESSION['enroll_secret'] ?? '');
    $enrollStarted = (int)($_SESSION['enroll_started'] ?? 0);
    $enrollRemaining = pending_auth_remaining_seconds($enrollStarted);
    if (
      !$logged &&
      $enrollUser !== '' &&
      $enrollSecret !== '' &&
      $enrollRemaining > 0
    ) {
      $settings = is_array($store['settings'] ?? null) ? $store['settings'] : [];
      $issuer = (string)($settings['issuer'] ?? 'HESEM QMS');
      $mfaPending = false;
      $enrollPending = true;
      api_json([
        'ok' => true,
        'logged_in' => false,
        'mfa_pending' => false,
        'enroll_pending' => true,
        'issuer' => $issuer,
        'account' => $enrollUser,
        'username' => $enrollUser,
        'secret' => $enrollSecret,
        'otpauth_url' => otpauth_url($issuer, $enrollUser, $enrollSecret),
        'user' => null,
        'csrf_token' => csrf_token(),
        'pending_expires_in' => $enrollRemaining,
        'auth_expired' => null,
        'server_time' => now_iso(),
        'initialized' => is_array($store),
      ]);
    }
    if (!$logged && ($enrollUser !== '' || $enrollSecret !== '' || $enrollStarted > 0) && !$enrollPending) {
      clear_pending_auth_session_state();
      $authExpired = 'enroll';
      $enrollUser = '';
      $enrollSecret = '';
      $enrollStarted = 0;
    }
    $preauthUser = (string)($_SESSION['preauth_user'] ?? '');
    $preauthStarted = (int)($_SESSION['preauth_started'] ?? 0);
    $preauthRemaining = pending_auth_remaining_seconds($preauthStarted);
    if (!$logged && !$enrollPending && $preauthUser !== '' && $preauthRemaining <= 0) {
      clear_pending_auth_session_state();
      $authExpired = $authExpired ?: 'mfa';
      $preauthUser = '';
      $preauthStarted = 0;
    }
    if (!$logged && !$enrollPending && $preauthUser !== '' && is_array($store)) {
      $u = find_user_by_username($store, $preauthUser);
      if ($u && session_requires_completed_mfa($u, is_array($store['settings'] ?? null) ? $store['settings'] : []) && empty($_SESSION['mfa_ok'])) {
        $mfaPending = true;
        $pendingExpiresIn = $preauthRemaining > 0 ? $preauthRemaining : null;
      }
    }
    api_json([
      'ok' => true,
      'logged_in' => (bool)$logged,
      'mfa_pending' => (bool)$mfaPending,
      'enroll_pending' => (bool)$enrollPending,
      'pending_expires_in' => $pendingExpiresIn,
      'auth_expired' => $authExpired,
      'user' => $user,
      'csrf_token' => csrf_token(),
      'server_time' => now_iso(),
      'initialized' => is_array($store),
    ]);
  }



  // ==========================================================
  // ROLE PERMISSIONS (server-backed)
  // ==========================================================

  case 'role_perms_get': {
    if (!is_array($store)) api_json(['ok' => false, 'error' => 'system_not_initialized'], 500);
    require_logged_in($store);
    $perms = load_role_permissions($ROLE_PERMS_FILE);
    api_json(['ok' => true, 'perms' => $perms, 'server_time' => now_iso()]);
  }

  case 'admin_role_perms_save': {
    if (!is_array($store)) api_json(['ok' => false, 'error' => 'system_not_initialized'], 500);
    $me = require_logged_in($store);
    require_csrf();
    // Basic admin check (server-side)
    $adminRoles = admin_roles();
    $_mRole = migrate_role((string)($me['role'] ?? ''));
    if (!in_array($_mRole, $adminRoles, true) && !in_array((string)($me['role'] ?? ''), $adminRoles, true)) api_json(['ok' => false, 'error' => 'forbidden'], 403);

    $data = read_json_body();
    $in = $data['perms'] ?? null;
    if (!is_array($in)) api_json(['ok' => false, 'error' => 'invalid_perms'], 400);

    $clean = [];
    foreach ($in as $role => $v) {
      $roleKey = (string)$role;
      if ($roleKey === '') continue;
      $row = is_array($v) ? $v : [];
      $clean[$roleKey] = [
        'canCreateDocs' => (bool)($row['canCreateDocs'] ?? false),
      ];
    }
    // Ensure defaults always exist (safety)
    foreach (default_role_permissions() as $k => $v) {
      if (!isset($clean[$k])) $clean[$k] = $v;
    }

    save_role_permissions($ROLE_PERMS_FILE, $clean);
    api_json(['ok' => true, 'perms' => $clean, 'server_time' => now_iso()]);
  }

  case 'admin_git_sync': {
    if (!is_array($store)) api_json(['ok' => false, 'error' => 'system_not_initialized'], 500);
    $me = require_logged_in($store);
    require_csrf();
    if (!user_is_admin($me)) api_json(['ok' => false, 'error' => 'forbidden'], 403);

    try {
      $result = git_sync_documents($me, $ROOT_DIR);
      api_json([
        'ok' => true,
        'pushed' => (bool)($result['pushed'] ?? false),
        'branch' => (string)($result['branch'] ?? 'main'),
        'files' => array_values(array_map('strval', $result['files'] ?? [])),
        'status' => array_values(array_map('strval', $result['status'] ?? [])),
        'status_entries' => array_values(array_map(static function($row){
          return [
            'xy' => (string)($row['xy'] ?? ''),
            'path' => (string)($row['path'] ?? ''),
          ];
        }, $result['status_entries'] ?? [])),
        'message' => (string)($result['message'] ?? ''),
        'commit_output' => (string)($result['commit_output'] ?? ''),
        'push_output' => (string)($result['push_output'] ?? ''),
        'head_before' => (string)($result['head_before'] ?? ''),
        'head_after' => (string)($result['head_after'] ?? ''),
        'server_time' => now_iso(),
      ]);
    } catch (Throwable $e) {
      @error_log('[API] admin_git_sync failed: ' . $e->getMessage());
      $message = $e->getMessage();
      $error = match (true) {
        str_starts_with($message, 'exec_unavailable') => 'exec_unavailable',
        str_starts_with($message, 'repo_not_found') => 'repo_not_found',
        str_starts_with($message, 'not_a_git_repo') => 'not_a_git_repo',
        str_starts_with($message, 'staged_changes_present') => 'staged_changes_present',
        str_starts_with($message, 'git_add_failed') => 'git_add_failed',
        str_starts_with($message, 'git_commit_failed') => 'git_commit_failed',
        str_starts_with($message, 'git_push_failed') => 'git_push_failed',
        str_starts_with($message, 'git_status_failed') => 'git_status_failed',
        str_starts_with($message, 'git_index_check_failed') => 'git_index_check_failed',
        str_starts_with($message, 'git_diff_cached_failed') => 'git_diff_cached_failed',
        default => 'git_sync_failed',
      };
      api_json([
        'ok' => false,
        'error' => $error,
        'detail' => $message,
        'server_time' => now_iso(),
      ], 500);
    }
  }

  case 'admin_git_pull': {
    if (!is_array($store)) api_json(['ok' => false, 'error' => 'system_not_initialized'], 500);
    $me = require_logged_in($store);
    require_csrf();
    if (!user_is_admin($me)) api_json(['ok' => false, 'error' => 'forbidden'], 403);

    try {
      $result = git_pull_portal($ROOT_DIR, $me);
      api_json([
        'ok' => true,
        'pulled' => (bool)($result['pulled'] ?? false),
        'branch' => (string)($result['branch'] ?? 'main'),
        'message' => (string)($result['message'] ?? ''),
        'before_head' => (string)($result['before_head'] ?? ''),
        'after_head' => (string)($result['after_head'] ?? ''),
        'changed_files' => array_values(array_map(static function($row){
          return [
            'status' => (string)($row['status'] ?? ''),
            'path' => (string)($row['path'] ?? ''),
            'old_path' => (string)($row['old_path'] ?? ''),
          ];
        }, $result['changed_files'] ?? [])),
        'presync' => is_array($result['presync'] ?? null) ? [
          'pushed' => (bool)($result['presync']['pushed'] ?? false),
          'branch' => (string)($result['presync']['branch'] ?? ''),
          'files' => array_values(array_map('strval', $result['presync']['files'] ?? [])),
          'status' => array_values(array_map('strval', $result['presync']['status'] ?? [])),
          'status_entries' => array_values(array_map(static function($row){
            return [
              'xy' => (string)($row['xy'] ?? ''),
              'path' => (string)($row['path'] ?? ''),
            ];
          }, $result['presync']['status_entries'] ?? [])),
          'message' => (string)($result['presync']['message'] ?? ''),
          'commit_output' => (string)($result['presync']['commit_output'] ?? ''),
          'push_output' => (string)($result['presync']['push_output'] ?? ''),
          'head_before' => (string)($result['presync']['head_before'] ?? ''),
          'head_after' => (string)($result['presync']['head_after'] ?? ''),
        ] : null,
        'fetch_output' => (string)($result['fetch_output'] ?? ''),
        'pull_output' => (string)($result['pull_output'] ?? ''),
        'server_time' => now_iso(),
      ]);
    } catch (Throwable $e) {
      @error_log('[API] admin_git_pull failed: ' . $e->getMessage());
      $message = $e->getMessage();
      $error = match (true) {
        str_starts_with($message, 'exec_unavailable') => 'exec_unavailable',
        str_starts_with($message, 'repo_not_found') => 'repo_not_found',
        str_starts_with($message, 'not_a_git_repo') => 'not_a_git_repo',
        str_starts_with($message, 'staged_changes_present') => 'staged_changes_present',
        str_starts_with($message, 'working_tree_dirty') => 'working_tree_dirty',
        str_starts_with($message, 'git_presync_failed') => 'git_presync_failed',
        str_starts_with($message, 'git_fetch_failed') => 'git_fetch_failed',
        str_starts_with($message, 'git_pull_failed') => 'git_pull_failed',
        str_starts_with($message, 'git_status_failed') => 'git_status_failed',
        str_starts_with($message, 'git_index_check_failed') => 'git_index_check_failed',
        default => 'git_pull_failed',
      };
      api_json([
        'ok' => false,
        'error' => $error,
        'detail' => $message,
        'server_time' => now_iso(),
      ], 500);
    }
  }

  case 'admin_clear_site_cache': {
    if (!is_array($store)) api_json(['ok' => false, 'error' => 'system_not_initialized'], 500);
    $me = require_logged_in($store);
    require_csrf();
    if (!user_is_admin($me)) api_json(['ok' => false, 'error' => 'forbidden'], 403);
    header('Clear-Site-Data: "cache"');
    header('Pragma: no-cache');
    header('Expires: 0');
    api_json([
      'ok' => true,
      'message' => 'Origin cache reset requested.',
      'server_time' => now_iso(),
    ]);
  }

  // ==========================================================
  // DOC VISIBILITY (Effective documents)
  // ==========================================================

  case 'docs_visibility_get': {
    if (!is_array($store)) api_json(['ok' => false, 'error' => 'system_not_initialized'], 500);
    require_logged_in($store);
    $hidden = load_doc_visibility($DOC_VIS_FILE);
    api_json(['ok' => true, 'hidden' => $hidden, 'server_time' => now_iso()]);
  }

  case 'admin_docs_visibility_save': {
    if (!is_array($store)) api_json(['ok' => false, 'error' => 'system_not_initialized'], 500);
    $me = require_logged_in($store);
    require_csrf();

    // Basic admin check
    $adminRoles = admin_roles();
    $_mRole = migrate_role((string)($me['role'] ?? ''));
    if (!in_array($_mRole, $adminRoles, true) && !in_array((string)($me['role'] ?? ''), $adminRoles, true)) api_json(['ok' => false, 'error' => 'forbidden'], 403);

    $data = read_json_body();
    $hiddenIn = $data['hidden'] ?? null;
    if (!is_array($hiddenIn)) api_json(['ok' => false, 'error' => 'invalid_hidden'], 400);

    $clean = [];
    foreach ($hiddenIn as $c) {
      $code = sanitize_code((string)$c);
      if ($code !== '') $clean[] = $code;
    }
    save_doc_visibility($DOC_VIS_FILE, $clean);
    api_json(['ok' => true, 'hidden' => array_values(array_unique($clean)), 'server_time' => now_iso()]);
  }

  case 'admin_portal_display_config_get': {
    if (!is_array($store)) api_json(['ok' => false, 'error' => 'system_not_initialized'], 500);
    $me = require_logged_in($store);
    if (!user_is_admin($me)) api_json(['ok' => false, 'error' => 'forbidden'], 403);
    $config = portal_load_display_config($PORTAL_DISPLAY_CONFIG_FILE);
    api_json(['ok' => true, 'config' => portal_display_config_public_payload($config), 'server_time' => now_iso()]);
  }

  case 'admin_portal_display_config_save': {
    if (!is_array($store)) api_json(['ok' => false, 'error' => 'system_not_initialized'], 500);
    $me = require_logged_in($store);
    require_csrf();
    if (!user_is_admin($me)) api_json(['ok' => false, 'error' => 'forbidden'], 403);

    $data = read_json_body();
    $configIn = $data['config'] ?? null;
    if (!is_array($configIn)) api_json(['ok' => false, 'error' => 'invalid_config'], 400);

    $saved = portal_save_display_config($PORTAL_DISPLAY_CONFIG_FILE, $configIn);
    invalidate_scan_cache($DATA_DIR);
    api_json(['ok' => true, 'config' => portal_display_config_public_payload($saved), 'server_time' => now_iso()]);
  }


  // ==========================================================
  // CUSTOM DOCUMENTS LIST (server-backed)
  // ==========================================================

  case 'docs_custom_list': {
    if (!is_array($store)) api_json(['ok' => false, 'error' => 'system_not_initialized'], 500);
    $me = require_logged_in($store);
    $docs = load_custom_docs($CUSTOM_DOCS_FILE);
    $displayConfig = portal_load_display_config($PORTAL_DISPLAY_CONFIG_FILE);
    $docs = portal_filter_docs_for_user($docs, $me, $PORTAL_CONFIG_JS_FILE, load_doc_visibility($DOC_VIS_FILE), $displayConfig);
    api_json(['ok' => true, 'docs' => $docs, 'server_time' => now_iso()]);
  }

  // ==========================================================
  // DICTIONARY (server-backed editable glossary)
  // ==========================================================

  // ═══ DATA COLLECTION SETTINGS ═══
  case 'get_data_settings': {
    if (!is_array($store)) api_json(['ok' => false, 'error' => 'system_not_initialized'], 500);
    require_logged_in($store);
    $defaults = [
      'collect_gps' => true,
      'collect_ip' => true,
      'collect_device' => true,
      'collect_navigation' => true,
      'collect_connection' => true,
      'require_consent' => true,
    ];
    $settings = $store['data_collection'] ?? $defaults;
    // merge defaults for any missing keys
    foreach ($defaults as $k => $v) {
      if (!isset($settings[$k])) $settings[$k] = $v;
    }
    api_json(['ok' => true, 'settings' => $settings]);
  }

  case 'save_data_settings': {
    if ($method !== 'POST') api_json(['ok' => false, 'error' => 'method_not_allowed'], 405);
    if (!is_array($store)) api_json(['ok' => false, 'error' => 'system_not_initialized'], 500);
    $me = require_logged_in($store);
    require_csrf();
    // Only admin roles can change
    $adminRoles = admin_roles();
    $_mRole = migrate_role((string)($me['role'] ?? ''));
    if (!in_array($_mRole, $adminRoles, true) && !in_array((string)($me['role'] ?? ''), $adminRoles, true)) {
      api_json(['ok' => false, 'error' => 'permission_denied'], 403);
    }
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $allowed = ['collect_gps', 'collect_ip', 'collect_device', 'collect_navigation', 'collect_connection', 'require_consent'];
    $current = $store['data_collection'] ?? [];
    foreach ($allowed as $key) {
      if (isset($input[$key])) {
        $current[$key] = (bool)$input[$key];
      }
    }
    $store['data_collection'] = $current;
    users_save($USERS_FILE, $store);
    api_json(['ok' => true, 'settings' => $current]);
  }

  case 'dict_list': {
    if (!is_array($store)) api_json(['ok' => false, 'error' => 'system_not_initialized'], 500);
    require_logged_in($store);
    $items = [];
    if (is_file($DICT_JSON_FILE)) $items = load_dict_items($DICT_JSON_FILE);
    api_json(['ok' => true, 'items' => $items, 'server_time' => now_iso()]);
  }

  case 'dict_upsert': {
    if (!is_array($store)) api_json(['ok' => false, 'error' => 'system_not_initialized'], 500);
    $me = require_logged_in($store);
    require_csrf();

    $adminRoles = admin_roles();
    $_mRole = migrate_role((string)($me['role'] ?? ''));
    if (!in_array($_mRole, $adminRoles, true) && !in_array((string)($me['role'] ?? ''), $adminRoles, true)) api_json(['ok' => false, 'error' => 'forbidden'], 403);

    $data = read_json_body();
    $term = trim((string)($data['term'] ?? ''));
    $original = trim((string)($data['originalTerm'] ?? ''));
    if ($original === '') $original = $term;

    if ($term === '') api_json(['ok' => false, 'error' => 'missing_term'], 400);
    $def = trim((string)($data['def'] ?? ''));
    if ($def === '') api_json(['ok' => false, 'error' => 'missing_definition'], 400);

    $newItem = [
      'term'    => $term,
      'meaning' => (string)($data['meaning'] ?? ''),
      'vi'      => (string)($data['vi'] ?? ''),
      'def'     => $def,
      'ctx'     => (string)($data['ctx'] ?? ''),
      'rec'     => (string)($data['rec'] ?? ''),
      'cat'     => (string)($data['cat'] ?? 'General'),
    ];

    $items = is_file($DICT_JSON_FILE) ? load_dict_items($DICT_JSON_FILE) : [];
    $found = false;
    foreach ($items as $i => $it) {
      if (!is_array($it)) continue;
      if (strcasecmp((string)($it['term'] ?? ''), $original) === 0) {
        $items[$i] = $newItem;
        $found = true;
        break;
      }
    }
    if (!$found) $items[] = $newItem;

    save_dict_items($DICT_JSON_FILE, $DICT_JS_FILE, $items);
    $items = load_dict_items($DICT_JSON_FILE);

    api_json(['ok' => true, 'items' => $items, 'server_time' => now_iso()]);
  }

  case 'dict_delete': {
    if (!is_array($store)) api_json(['ok' => false, 'error' => 'system_not_initialized'], 500);
    $me = require_logged_in($store);
    require_csrf();

    $adminRoles = admin_roles();
    $_mRole = migrate_role((string)($me['role'] ?? ''));
    if (!in_array($_mRole, $adminRoles, true) && !in_array((string)($me['role'] ?? ''), $adminRoles, true)) api_json(['ok' => false, 'error' => 'forbidden'], 403);

    $data = read_json_body();
    $term = trim((string)($data['term'] ?? ''));
    if ($term === '') api_json(['ok' => false, 'error' => 'missing_term'], 400);

    $items = is_file($DICT_JSON_FILE) ? load_dict_items($DICT_JSON_FILE) : [];
    $items2 = [];
    foreach ($items as $it) {
      if (!is_array($it)) continue;
      if (strcasecmp((string)($it['term'] ?? ''), $term) === 0) continue;
      $items2[] = $it;
    }

    save_dict_items($DICT_JSON_FILE, $DICT_JS_FILE, $items2);
    $items2 = load_dict_items($DICT_JSON_FILE);
    api_json(['ok' => true, 'items' => $items2, 'server_time' => now_iso()]);
  }



  case 'doc_create': {
    if (!is_array($store)) api_json(['ok' => false, 'error' => 'system_not_initialized'], 500);
    $me = require_logged_in($store);
    require_csrf();

    if (!role_can_create_docs($me, $ROLE_PERMS_FILE)) {
      api_json(['ok' => false, 'error' => 'forbidden'], 403);
    }

    try {

    $data = read_json_body();
    $code = sanitize_code((string)($data['code'] ?? ''));
    $title = trim((string)($data['title'] ?? ''));
    $cat = strtoupper(trim((string)($data['cat'] ?? '')));
    $owner = trim((string)($data['owner'] ?? ($me['dept'] ?? '')));
    $folder = trim((string)($data['folder'] ?? ''));
    $revision = trim((string)($data['revision'] ?? ($data['initial_revision'] ?? '0.0')));
    $revision = preg_replace('/^[vV]\s*/', '', $revision);
    if ($revision === '') $revision = '0.0';
    if (!preg_match('/^\d+(?:\.\d+)?$/', $revision)) api_json(['ok' => false, 'error' => 'bad_revision'], 400);
    if (!str_contains($revision, '.')) $revision .= '.0';

    if ($code === '') api_json(['ok' => false, 'error' => 'missing_code'], 400);
    if ($title === '') api_json(['ok' => false, 'error' => 'missing_title'], 400);
    if (portal_title_has_non_ascii($title)) api_json(['ok' => false, 'error' => 'title_must_be_english_ascii'], 400);
    if ($cat === '') api_json(['ok' => false, 'error' => 'missing_category'], 400);

    if ($folder === '') {
      // Safe fallback: default folder per category
      $folder = default_folder_for_cat($cat, $ROOT_DIR);

      // Dynamic subfolder detection: find XX-{keyword} matching the doc code
      // E.g., PROC-CNC-001 → find */XX-PROC-CNC/ under 05-Processes/
      $parentAbs = $ROOT_DIR . '/' . $folder;
      $keywords = [];
      if (preg_match('/^PROC-([A-Z]+)/i', $code, $pm)) $keywords[] = 'PROC-'.strtoupper($pm[1]);
      if (preg_match('/JD-([A-Z]+)/i', $code, $jm)) $keywords = ['JD-'.strtoupper($jm[1]), 'Job-Descriptions'];
      if (preg_match('/^FRM-([A-Z]+)/i', $code, $fm)) $keywords[] = 'FRM-'.strtoupper($fm[1]);
      if (preg_match('/^ANNEX-([A-Z]+)/i', $code, $am)) $keywords[] = 'ANNEX-'.strtoupper($am[1]);
      if (preg_match('/^WI-([A-Z]+)/i', $code, $wm)) $keywords[] = 'WI-'.strtoupper($wm[1]);

      // Search up to 2 levels deep for matching subfolder
      if (!empty($keywords) && is_dir($parentAbs)) {
        $found = false;
        foreach (scandir($parentAbs) as $sub1) {
          if ($sub1[0]==='.'||$sub1==='_Archive') continue;
          $sub1Abs = $parentAbs.'/'.$sub1;
          if (!is_dir($sub1Abs)) continue;
          foreach ($keywords as $kw) {
            if (stripos($sub1, $kw) !== false) { $folder .= '/'.$sub1; $found=true; break 2; }
          }
          // Check level 2
          foreach (scandir($sub1Abs) as $sub2) {
            if ($sub2[0]==='.'||$sub2==='_Archive') continue;
            if (!is_dir($sub1Abs.'/'.$sub2)) continue;
            foreach ($keywords as $kw) {
              if (stripos($sub2, $kw) !== false) { $folder .= '/'.$sub1.'/'.$sub2; $found=true; break 3; }
            }
          }
        }
      }
    }
    $folder = safe_rel_path($folder);

    // Prevent creating inside an archive folder directly (keeps structure consistent)
    if (preg_match('#(^|/)_Archive(/|$)#i', $folder)) {
      api_json(['ok' => false, 'error' => 'invalid_folder'], 400);
    }

    // Uniqueness check: code must not already exist in custom docs store
    $custom = load_custom_docs($CUSTOM_DOCS_FILE);
    foreach ($custom as $d) {
      if (is_array($d) && strtoupper((string)($d['code'] ?? '')) === $code) {
        api_json(['ok' => false, 'error' => 'code_exists'], 409);
      }
    }

    $codeSlug = slugify($code);
    $titleSlug = slugify($title);
    $baseName = $codeSlug . ($titleSlug !== '' ? ('-' . $titleSlug) : '');
    if (strlen($baseName) > 120) $baseName = substr($baseName, 0, 120);
    $fileName = $baseName . '.html';

    // Ensure folder exists
    $folderAbs = join_in_root($ROOT_DIR, $folder);
    ensure_dir($folderAbs);

    // Ensure unique file name inside folder
    $i = 2;
    while (is_file($folderAbs . '/' . $fileName)) {
      $fileName = $baseName . '-' . $i . '.html';
      $i++;
      if ($i > 200) api_json(['ok' => false, 'error' => 'too_many_conflicts'], 500);
    }

    $baseRel = ($folder !== '' ? ($folder . '/') : '') . $fileName;
    $baseRel = safe_rel_path($baseRel);
    $absFile = join_in_root($ROOT_DIR, $baseRel);

    // Create initial HTML (draft template)
    $safeTitle = htmlspecialchars($title, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $safeCode  = htmlspecialchars($code, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $safeOwner = htmlspecialchars($owner !== '' ? $owner : 'QA/QMS', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

    // Compute relative link back to root index (depends on folder depth)
    $folderTrim = trim($folder, '/');
    $depth = ($folderTrim === '') ? 0 : count(array_filter(explode('/', $folderTrim)));
    $rootHref = str_repeat('../', $depth) . '01-QMS-Portal/portal.html';
    $assetsCss = str_repeat('../', $depth) . 'assets/style.css';
    $assetsJs  = str_repeat('../', $depth) . 'assets/app.js';

    $docHtml = '<!DOCTYPE html>' . "\n" .
      '<html lang="vi">' . "\n" .
      '<head>' . "\n" .
      '  <meta charset="utf-8"/>' . "\n" .
      '  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>' . "\n" .
      '  <title>' . $safeCode . ' — ' . $safeTitle . ' | HESEM QMS</title>' . "\n" .
      '  <link rel="stylesheet" href="' . $assetsCss . '"/>' . "\n" .
      '</head>' . "\n" .
      '<body>' . "\n" .
      '<div class="container"><div class="page"><div class="page-body"><div class="form-header">' . "\n" .
      '<div class="fh-left"> <a class="brand-logo" href="' . $rootHref . '"><img alt="HESEM Logo" src="https://hesem.com.vn/wp-content/uploads/hesem-logo.svg"/></a>' . "\n" .
      '<div class="fh-company"> <a href="' . $rootHref . '">HESEM ENGINEERING</a> <span>Tài liệu kiểm soát</span> </div>' . "\n" .
      '</div>' . "\n" .
      '<div class="title"> <strong>' . $safeCode . ' — ' . $safeTitle . '</strong><br/>' . "\n" .
      '<span class="sub-vn">Tài liệu mới (Draft)</span> <span class="muted">Soạn thảo nội dung theo yêu cầu ISO/QMS.</span> </div>' . "\n" .
      '<div class="meta">' . "\n" .
      '<div class="row"><span><b>Mã:</b></span><span>' . $safeCode . '</span></div>' . "\n" .
      '<div class="row"><span><b>Phiên bản:</b></span><span>V0</span></div>' . "\n" .
      '<div class="row"><span><b>Ngày hiệu lực:</b></span><span>Theo quyết định ban hành</span></div>' . "\n" .
      '<div class="row"><span><b>Chủ sở hữu:</b></span><span>' . $safeOwner . '</span></div>' . "\n" .
      '<div class="row"><span><b>Phê duyệt:</b></span><span>Tổng Giám Đốc</span></div>' . "\n" .
      '</div>' . "\n" .
      '</div><div class="doc-content" id="docContent"><div class="form-sheet">' . "\n" .
      '<div class="card">' . "\n" .
      '  <div class="badge"><span class="dot"></span>' . $safeCode . '</div>' . "\n" .
      '  <h1 class="h1" style="margin-top:10px">' . $safeCode . ' — ' . $safeTitle . '</h1>' . "\n" .
      '  <p class="lead">(Soạn thảo nội dung tại đây...)</p>' . "\n" .
      '</div>' . "\n" .
      '<h2 class="h2">1. Mục đích</h2>' . "\n" .
      '<p>...</p>' . "\n" .
      '<h2 class="h2">2. Phạm vi</h2>' . "\n" .
      '<p>...</p>' . "\n" .
      '<h2 class="h2">3. Nội dung</h2>' . "\n" .
      '<p>...</p>' . "\n" .
      '</div></div></div></div></div>' . "\n" .
      '<script src="' . $assetsJs . '"></script>' . "\n" .
      '</body>' . "\n" .
      '</html>';

    // Canonical UTF-8 template (source-of-truth) to prevent mojibake on newly created documents.
    $docHtml = '<!DOCTYPE html>' . "\n" .
      '<html lang="vi">' . "\n" .
      '<head>' . "\n" .
      '  <meta charset="utf-8"/>' . "\n" .
      '  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>' . "\n" .
      '  <title>' . $safeCode . ' - ' . $safeTitle . ' | HESEM QMS</title>' . "\n" .
      '  <link rel="stylesheet" href="' . $assetsCss . '"/>' . "\n" .
      '</head>' . "\n" .
      '<body>' . "\n" .
      '<div class="container"><div class="page"><div class="page-body"><div class="form-header">' . "\n" .
      '<div class="fh-left"> <a class="brand-logo" href="' . $rootHref . '"><img alt="HESEM Logo" src="https://hesem.com.vn/wp-content/uploads/hesem-logo.svg"/></a>' . "\n" .
      '<div class="fh-company"> <a href="' . $rootHref . '">HESEM ENGINEERING</a> <span>Tài liệu kiểm soát</span> </div>' . "\n" .
      '</div>' . "\n" .
      '<div class="title"> <strong>' . $safeCode . ' - ' . $safeTitle . '</strong><br/>' . "\n" .
      '<span class="sub-vn">Tài liệu mới (Draft)</span> <span class="muted">Soạn thảo nội dung theo yêu cầu ISO/QMS.</span> </div>' . "\n" .
      '<div class="meta">' . "\n" .
      '<div class="row"><span><b>Mã:</b></span><span>' . $safeCode . '</span></div>' . "\n" .
      '<div class="row"><span><b>Phiên bản:</b></span><span>V0</span></div>' . "\n" .
      '<div class="row"><span><b>Ngày hiệu lực:</b></span><span>Theo quyết định ban hành</span></div>' . "\n" .
      '<div class="row"><span><b>Chủ sở hữu:</b></span><span>' . $safeOwner . '</span></div>' . "\n" .
      '<div class="row"><span><b>Phê duyệt:</b></span><span>Tổng Giám Đốc</span></div>' . "\n" .
      '</div>' . "\n" .
      '</div><div class="doc-content" id="docContent"><div class="form-sheet">' . "\n" .
      '<div class="card">' . "\n" .
      '  <div class="badge"><span class="dot"></span>' . $safeCode . '</div>' . "\n" .
      '  <h1 class="h1" style="margin-top:10px">' . $safeCode . ' - ' . $safeTitle . '</h1>' . "\n" .
      '  <p class="lead">(Soạn thảo nội dung tại đây...)</p>' . "\n" .
      '</div>' . "\n" .
      '<h2 class="h2">1. Mục đích</h2>' . "\n" .
      '<p>...</p>' . "\n" .
      '<h2 class="h2">2. Phạm vi</h2>' . "\n" .
      '<p>...</p>' . "\n" .
      '<h2 class="h2">3. Nội dung</h2>' . "\n" .
      '<p>...</p>' . "\n" .
      '</div></div></div></div></div>' . "\n" .
      '<script src="' . $assetsJs . '"></script>' . "\n" .
      '</body>' . "\n" .
      '</html>';

    // Write base file
    if (@file_put_contents($absFile, $docHtml, LOCK_EX) === false) {
      api_json(['ok' => false, 'error' => 'write_failed'], 500);
    }

    // Create draft working copy in _Archive (so Version History + editor see it)
    $stored = store_version_file($baseRel, $revision, 'draft', $ROOT_DIR, $docHtml);
    $draftRel = rel_path($stored, $ROOT_DIR);

    // Initialize workflow state + manifest
    $state = [
      'code' => $code,
      'status' => 'draft',
      'revision' => $revision,
      'has_release' => false,
      'createdAt' => now_iso(),
      'lastEdit' => now_iso(),
    ];
    save_doc_state($ROOT_DIR, $baseRel, $state);

    $manifest = [
      'code' => $code,
      'base' => $baseRel,
      'updated_at' => now_iso(),
      'versions' => [[
        'status' => 'draft',
        'version' => 'v' . $revision,
        'date' => human_dt(),
        'by' => (string)($me['name'] ?? $me['username'] ?? ''),
        'file' => $draftRel,
        'note' => 'Created',
      ]],
    ];
    save_doc_manifest($ROOT_DIR, $baseRel, $manifest);

    // Add to custom docs registry
    $docObj = [
      'code' => $code,
      'title' => $title,
      'cat' => $cat,
      'path' => $baseRel,
      'rev' => $revision,
      'status' => 'draft',
      'owner' => ($owner !== '' ? $owner : 'QA/QMS'),
      'folder' => $folder,
    ];
    $custom[] = $docObj;
    save_custom_docs($CUSTOM_DOCS_FILE, $custom);

    // Invalidate scan cache so portal picks up new doc immediately
    invalidate_scan_cache($DATA_DIR);

    api_json(['ok' => true, 'doc' => $docObj, 'base_path' => $baseRel, 'state' => $state, 'versions' => $manifest['versions'], 'server_time' => now_iso()]);

    } catch (Throwable $e) {
      @error_log('[doc_create] ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
      api_json(['ok' => false, 'error' => 'create_failed'], 500);
    }
  }

  // ==========================================================
  // DOCUMENT VERSION CONTROL (file-based archive)
  // ==========================================================

  case 'docs_snapshot': {
    if (!is_array($store)) api_json(['ok' => false, 'error' => 'system_not_initialized'], 500);
    $me = require_logged_in($store);
    // This action can be heavy (scans many documents). Release session lock early to avoid blocking other requests (e.g., status on hard refresh).
    if (session_status() === PHP_SESSION_ACTIVE) { @session_write_close(); }
    $data = read_json_body();
    $docs = $data['docs'] ?? [];
    if (!is_array($docs)) $docs = [];
    $out = [];
    foreach ($docs as $d) {
      if (!is_array($d)) continue;
      $code = (string)($d['code'] ?? '');
      $basePath = (string)($d['base_path'] ?? ($d['path'] ?? ''));
      if ($code === '') continue;
      if (trim($basePath) === '') continue;
      $formEntry = form_registry_get_entry($FORM_CONTROL_REGISTRY_FILE, $code, $basePath);
      if (is_array($formEntry)) {
        $st = form_load_state_existing($DATA_DIR, (string)$formEntry['code']);
        if (!is_array($st)) $st = form_state_fallback_from_registry($formEntry);
        $out[$code] = $st;
        continue;
      }
      $st = load_doc_state($ROOT_DIR, $basePath, $ARCHIVE_DIR, $code);
      if ($st) {
        $out[$code] = $st;
      }
    }
    api_json(['ok' => true, 'states' => $out, 'server_time' => now_iso()]);
  }

  case 'doc_versions_list': {
    if (!is_array($store)) api_json(['ok' => false, 'error' => 'system_not_initialized'], 500);
    require_logged_in($store);
    // This action can involve filesystem scanning/sync. Release session lock early so the user won't appear logged out on refresh.
    if (session_status() === PHP_SESSION_ACTIVE) { @session_write_close(); }
    $code = (string)($_GET['code'] ?? '');
    $basePath = (string)($_GET['base_path'] ?? ($_GET['path'] ?? ''));
    if ($method !== 'GET') {
      $data = read_json_body();
      $code = (string)($data['code'] ?? $code);
      $basePath = (string)($data['base_path'] ?? ($data['path'] ?? $basePath));
    }
    if (trim($code) === '') api_json(['ok' => false, 'error' => 'missing_code'], 400);
    if (trim($basePath) === '') api_json(['ok' => false, 'error' => 'missing_base_path'], 400);
    $formEntry = form_registry_get_entry($FORM_CONTROL_REGISTRY_FILE, $code, $basePath);
    if (is_array($formEntry)) {
      $state = form_load_state($DATA_DIR, $ROOT_DIR, $formEntry);
      $manifest = form_load_manifest($DATA_DIR, $ROOT_DIR, $formEntry);
      api_json([
        'ok' => true,
        'code' => strtoupper(trim((string)($formEntry['code'] ?? $code))),
        'state' => $state,
        'versions' => form_public_versions($manifest, $state, (string)$formEntry['code'], (string)$formEntry['path']),
        'server_time' => now_iso(),
      ]);
    }
    $manifest = load_doc_manifest($ROOT_DIR, $basePath, $ARCHIVE_DIR, $code);
    $state = load_doc_state($ROOT_DIR, $basePath, $ARCHIVE_DIR, $code);

    // Auto-sync header fields inside stored version files (for consistent preview/print)
    try {
      $seen = [];
      foreach (($manifest['versions'] ?? []) as $vv) {
        if (!is_array($vv)) continue;
        $fileRel = (string)($vv['file'] ?? '');
        if ($fileRel === '') continue;
        if (isset($seen[$fileRel])) continue;
        $seen[$fileRel] = true;
        $rev = revision_from_version_string((string)($vv['version'] ?? ''));
        $eff = null;
        $stt = (string)($vv['status'] ?? '');
        if ($stt === 'approved' || $stt === 'initial_release' || $stt === 'obsolete') {
          $eff = date_to_ymd((string)($vv['date'] ?? ''));
        }
        try {
          $abs = join_in_root($ROOT_DIR, $fileRel);
          sync_doc_file_header($abs, $rev, $eff);
        } catch (Throwable $e) { /* ignore */ }
      }
    } catch (Throwable $e) { /* ignore */ }
    api_json(['ok' => true, 'code' => $code, 'state' => $state, 'versions' => ($manifest['versions'] ?? []), 'server_time' => now_iso()]);
  }


  
  case 'doc_start_new_revision': {
    if ($method !== 'POST') api_json(['ok' => false, 'error' => 'method_not_allowed'], 405);
    require_csrf();
    if (!is_array($store)) api_json(['ok' => false, 'error' => 'system_not_initialized'], 500);
    $me = require_logged_in($store);
    require_doc_workflow_editor($me, $ROLE_PERMS_FILE);
    $data = read_json_body();

    $code = (string)($data['code'] ?? '');
    $basePath = (string)($data['base_path'] ?? ($data['path'] ?? ''));
    $updateType = strtolower(trim((string)($data['updateType'] ?? ($data['update_type'] ?? 'minor'))));
    if ($updateType !== 'major' && $updateType !== 'minor') $updateType = 'minor';

    if (trim($code) === '') api_json(['ok' => false, 'error' => 'missing_code'], 400);
    if (trim($basePath) === '') api_json(['ok' => false, 'error' => 'missing_base_path'], 400);

    $baseRel = safe_rel_path($basePath);
    $formEntry = form_registry_get_entry($FORM_CONTROL_REGISTRY_FILE, $code, $baseRel);
    if (is_array($formEntry)) {
      $state = form_load_state($DATA_DIR, $ROOT_DIR, $formEntry);
      $manifest = form_load_manifest($DATA_DIR, $ROOT_DIR, $formEntry);
      $versions = is_array($manifest['versions'] ?? null) ? $manifest['versions'] : [];
      $releasedRev = form_latest_released_revision($manifest, $state, '0');
      $parts = explode('.', $releasedRev, 2);
      $maj = (int)($parts[0] ?? 0);
      $min = isset($parts[1]) ? (int)$parts[1] : 0;
      $newRevision = ($updateType === 'major')
        ? (($maj + 1) . '.0')
        : ($maj . '.' . ($min + 1));
      foreach ($versions as $version) {
        if (!is_array($version)) continue;
        if (!in_array((string)($version['status'] ?? ''), ['draft', 'in_review', 'pending_approval'], true)) continue;
        $privateRel = trim((string)($version['private_rel'] ?? ''));
        if ($privateRel === '') continue;
        try {
          $privateAbs = form_resolve_private_abs($DATA_DIR, $privateRel);
          if (is_file($privateAbs)) @unlink($privateAbs);
        } catch (Throwable $e) {
          // ignore stale private draft files
        }
      }
      $versions = array_values(array_filter($versions, function($version) {
        if (!is_array($version)) return false;
        return !in_array((string)($version['status'] ?? ''), ['draft', 'in_review', 'pending_approval'], true);
      }));
      $dt = human_dt();
      array_unshift($versions, [
        'id' => ts_compact() . '_draft',
        'version' => 'v' . $newRevision,
        'status' => 'draft',
        'date' => $dt,
        'user' => (string)($me['name'] ?? $me['username'] ?? ''),
        'role' => (string)($me['role'] ?? ''),
        'note' => 'Khởi tạo phiên bản workbook mới — chờ upload',
        'updateType' => $updateType,
        'storage' => 'private',
      ]);
      $manifest['versions'] = $versions;
      $manifest['base'] = (string)$formEntry['path'];
      $manifest['kind'] = 'excel_form';
      form_save_manifest($DATA_DIR, (string)$formEntry['code'], $manifest);
      $state['status'] = 'draft';
      $state['revision'] = $newRevision;
      $state['released_revision'] = $releasedRev;
      $state['updateType'] = $updateType;
      $state['has_release'] = true;
      $state['checked_out_by'] = [
        'name' => (string)($me['name'] ?? $me['username'] ?? ''),
        'role' => (string)($me['role'] ?? ''),
        'date' => $dt,
      ];
      $state['lastEdit'] = [
        'by' => (string)($me['name'] ?? $me['username'] ?? ''),
        'role' => (string)($me['role'] ?? ''),
        'date' => $dt,
        'note' => 'Khởi tạo phiên bản workbook mới',
      ];
      foreach (['submittedBy','submittedDate','submittedUpdateType','rejectedBy','approvedBy','approvedDate'] as $k) {
        if (array_key_exists($k, $state)) unset($state[$k]);
      }
      form_save_state($DATA_DIR, (string)$formEntry['code'], $state);
      invalidate_scan_cache($DATA_DIR);
      api_json([
        'ok' => true,
        'code' => (string)$formEntry['code'],
        'state' => $state,
        'versions' => form_public_versions($manifest, $state, (string)$formEntry['code'], (string)$formEntry['path']),
        'server_time' => now_iso(),
      ]);
    }

    // Load per-folder manifest + state
    $manifest = load_doc_manifest($ROOT_DIR, $baseRel, $ARCHIVE_DIR, $code);
    $state = load_doc_state($ROOT_DIR, $baseRel, $ARCHIVE_DIR, $code);
    if (!is_array($state)) $state = [];

    $versions = $manifest['versions'] ?? [];
    if (!is_array($versions)) $versions = [];

    // Find the latest RELEASED revision (approved / initial_release)
    $releasedRev = null;
    foreach ($versions as $v) {
      if (!is_array($v)) continue;
      $st = strtolower((string)($v['status'] ?? ''));
      if ($st === 'approved' || $st === 'initial_release') {
        $releasedRev = revision_from_version_string((string)($v['version'] ?? ''));
        break;
      }
    }
    if ($releasedRev === null || trim((string)$releasedRev) === '') {
      $releasedRev = (string)($state['revision'] ?? '0');
    }

    // Compute target revision from the RELEASED revision
    $cur = trim((string)$releasedRev);
    $cur = preg_replace('/^[vV]\s*/', '', $cur);
    if ($cur === '') $cur = '0';
    $parts = explode('.', $cur, 2);
    $maj = (int)($parts[0] ?? 0);
    $min = isset($parts[1]) ? (int)$parts[1] : 0;

    $newRevision = ($updateType === 'major')
      ? (($maj + 1) . '.0')
      : ($maj . '.' . ($min + 1));

    // Build an initial working DRAFT file immediately (so viewer header + Version History are consistent)
    $info = doc_store_info($ROOT_DIR, $baseRel);
    $baseAbs = join_in_root($ROOT_DIR, $baseRel);

    $srcHtml = '';
    if (is_file($baseAbs)) {
      $srcHtml = (string)(@file_get_contents($baseAbs) ?: '');
    }

    // Fallback: try archived release if live file is not readable
    if (strlen(trim($srcHtml)) < 30) {
      $archRel = $info['archiveRelDir'] . '/' . $info['baseName'] . '_V' . fmt_rev((string)$releasedRev) . '.html';
      try {
        $archAbs = join_in_root($ROOT_DIR, $archRel);
        if (is_file($archAbs)) $srcHtml = (string)(@file_get_contents($archAbs) ?: '');
      } catch (Throwable $e) { /* ignore */ }
    }

    if (strlen(trim($srcHtml)) < 30) api_json(['ok' => false, 'error' => 'missing_base_file'], 400);

    // Sync header fields for the new draft revision
    $draftHtml = sync_doc_header_html($srcHtml, $newRevision, 'Theo quyết định ban hành');

    // Store as an independent file in the per-folder _Archive directory
    $draftAbs = store_version_file($baseRel, $newRevision, 'draft', $ROOT_DIR, $draftHtml);
    $draftRel = rel_path($draftAbs, $ROOT_DIR);

    // Remove any older working copies (draft / in_review) from manifest + delete their files
    $kept = [];
    foreach ($versions as $v) {
      if (!is_array($v)) continue;
      $st = strtolower((string)($v['status'] ?? ''));
      if (in_array($st, ['draft', 'in_review', 'pending_approval'], true)) {
        $fileRel = (string)($v['file'] ?? '');
        if ($fileRel !== '') {
          try {
            $abs = join_in_root($ROOT_DIR, $fileRel);
            if (is_file($abs)) @unlink($abs);
          } catch (Throwable $e) { /* ignore */ }
        }
        continue;
      }
      $kept[] = $v;
    }
    $versions = $kept;

    $dt = human_dt();
    $entry = [
      'id' => ts_compact() . '_draft',
      'version' => 'v' . $newRevision,
      'status' => 'draft',
      'date' => $dt,
      'user' => (string)($me['name'] ?? $me['username'] ?? ''),
      'role' => (string)($me['role'] ?? ''),
      'note' => 'Bắt đầu phiên bản mới',
      'updateType' => $updateType,
      'file' => $draftRel,
    ];
    array_unshift($versions, $entry);

    $manifest['versions'] = $versions;
    save_doc_manifest($ROOT_DIR, $baseRel, $manifest);

    // Update state (draft + target revision)
    $state['status'] = 'draft';
    $state['revision'] = $newRevision;
    $state['released_revision'] = $releasedRev;
    $state['updateType'] = $updateType;
    $state['has_release'] = true;
    $state['lastEdit'] = [
      'date' => $dt,
      'user' => (string)($me['name'] ?? $me['username'] ?? ''),
      'role' => (string)($me['role'] ?? ''),
      'note' => 'Bắt đầu phiên bản mới',
    ];

    foreach (['submittedBy','submittedDate','submittedUpdateType','rejectedBy','rejectedDate','approvedBy','approvedDate'] as $k) {
      if (array_key_exists($k, $state)) unset($state[$k]);
    }

    save_doc_state($ROOT_DIR, $baseRel, $state);

    api_json(['ok' => true, 'code' => $code, 'state' => $state, 'versions' => $versions, 'server_time' => now_iso()]);
  }

case 'doc_save_draft': {
    if ($method !== 'POST') api_json(['ok' => false, 'error' => 'method_not_allowed'], 405);
    require_csrf();
    if (!is_array($store)) api_json(['ok' => false, 'error' => 'system_not_initialized'], 500);
    $me = require_logged_in($store);
    require_doc_workflow_editor($me, $ROLE_PERMS_FILE);
    $data = read_json_body();

    $code = (string)($data['code'] ?? '');
    $basePath = (string)($data['base_path'] ?? ($data['path'] ?? ''));
    $revision = (string)($data['revision'] ?? '0');
    $note = (string)($data['note'] ?? '');
    $html = (string)($data['html'] ?? '');

    if (trim($code) === '') api_json(['ok' => false, 'error' => 'missing_code'], 400);
    if (trim($basePath) === '') api_json(['ok' => false, 'error' => 'missing_base_path'], 400);
    if (strlen(trim($html)) < 30) api_json(['ok' => false, 'error' => 'missing_html'], 400);

    $info = doc_store_info($ROOT_DIR, $basePath);
    ensure_dir($info['archiveAbsDir']);
    $ts = ts_compact();
    $revFmt = fmt_rev($revision);
    $filename = $info['baseName'] . '_V' . $revFmt . '_DRAFT.html';
    $fileRel = $info['archiveRelDir'] . '/' . $filename;
    $fileAbs = join_in_root($ROOT_DIR, $fileRel);
    ensure_dir(dirname($fileAbs));
    // Sync ISO header fields inside the saved draft file
    $html = sync_doc_header_html($html, $revision, null);
    $html = inject_base_href_archive($html);
    if (@file_put_contents($fileAbs, $html, LOCK_EX) === false) {
      api_json(['ok' => false, 'error' => 'write_failed'], 500);
    }

    $dt = human_dt();
    $state = load_doc_state($ROOT_DIR, $basePath, $ARCHIVE_DIR, $code) ?? [];
    $state['status'] = 'draft';
    $state['revision'] = $revision;
    $state['lastEdit'] = ['by' => (string)($me['name'] ?? $me['username'] ?? ''), 'role' => (string)($me['role'] ?? ''), 'date' => $dt, 'note' => $note];
    save_doc_state($ROOT_DIR, $basePath, $state);

    $manifest = load_doc_manifest($ROOT_DIR, $basePath, $ARCHIVE_DIR, $code);
    $entry = [
      'id' => $ts . '_draft',
      'version' => 'v' . $revision,
      'status' => 'draft',
      'date' => $dt,
      'user' => (string)($me['name'] ?? $me['username'] ?? ''),
      'role' => (string)($me['role'] ?? ''),
      'note' => $note,
      'file' => $fileRel,
    ];
    $versions = $manifest['versions'] ?? [];
    // Keep at most one working entry per revision/status (file is overwritten)
    $versions = array_values(array_filter($versions, function($v) use ($entry){
      if (!is_array($v)) return false;
      return !((string)($v['status'] ?? '') === 'draft' && (string)($v['version'] ?? '') === (string)$entry['version']);
    }));
    array_unshift($versions, $entry);
    if (count($versions) > 200) $versions = array_slice($versions, 0, 200);
    $manifest['versions'] = $versions;
    save_doc_manifest($ROOT_DIR, $basePath, $manifest);

    api_json(['ok' => true, 'code' => $code, 'state' => $state, 'versions' => $versions, 'server_time' => now_iso()]);
  }

  case 'form_upload_draft': {
    if ($method !== 'POST') api_json(['ok' => false, 'error' => 'method_not_allowed'], 405);
    require_csrf();
    if (!is_array($store)) api_json(['ok' => false, 'error' => 'system_not_initialized'], 500);
    $me = require_logged_in($store);
    require_doc_workflow_editor($me, $ROLE_PERMS_FILE);

    $code = strtoupper(trim((string)($_POST['code'] ?? '')));
    $basePath = (string)($_POST['base_path'] ?? ($_POST['path'] ?? ''));
    $note = trim((string)($_POST['note'] ?? ''));
    if ($code === '') api_json(['ok' => false, 'error' => 'missing_code'], 400);
    if (trim($basePath) === '') api_json(['ok' => false, 'error' => 'missing_base_path'], 400);
    if (!isset($_FILES['file']) || !is_array($_FILES['file'])) api_json(['ok' => false, 'error' => 'missing_file'], 400);

    $baseRel = safe_rel_path($basePath);
    $formEntry = form_registry_get_entry($FORM_CONTROL_REGISTRY_FILE, $code, $baseRel);
    if (!is_array($formEntry)) api_json(['ok' => false, 'error' => 'form_not_found'], 404);

    $state = form_load_state($DATA_DIR, $ROOT_DIR, $formEntry);
    if (($state['status'] ?? 'approved') === 'approved') api_json(['ok' => false, 'error' => 'start_new_revision_required'], 400);

    $manifest = form_load_manifest($DATA_DIR, $ROOT_DIR, $formEntry);
    $revision = form_normalize_revision((string)($_POST['revision'] ?? ($state['revision'] ?? '0')), form_normalize_revision((string)($state['revision'] ?? '0'), '0'));
    $updateType = (($state['updateType'] ?? 'minor') === 'major') ? 'major' : 'minor';
    $upload = $_FILES['file'];
    $tmpName = (string)($upload['tmp_name'] ?? '');
    $uploadError = (int)($upload['error'] ?? UPLOAD_ERR_NO_FILE);
    if ($uploadError !== UPLOAD_ERR_OK || $tmpName === '') api_json(['ok' => false, 'error' => 'upload_failed'], 400);
    $uploadSize = (int)($upload['size'] ?? 0);
    if ($uploadSize <= 0) api_json(['ok' => false, 'error' => 'invalid_upload_size'], 400);
    if ($uploadSize > $MAX_FORM_UPLOAD_BYTES) {
      api_json(['ok' => false, 'error' => 'upload_too_large', 'max_bytes' => $MAX_FORM_UPLOAD_BYTES], 413);
    }

    $liveExt = form_extension_from_path((string)$formEntry['path']);
    $uploadExt = strtolower(pathinfo((string)($upload['name'] ?? ''), PATHINFO_EXTENSION));
    if (!form_is_workbook_extension($uploadExt)) api_json(['ok' => false, 'error' => 'unsupported_form_extension'], 400);
    if ($liveExt !== '' && $uploadExt !== $liveExt) api_json(['ok' => false, 'error' => 'extension_mismatch'], 400);

    $draftMeta = form_private_file_meta($DATA_DIR, (string)$formEntry['code'], $revision, 'draft', $uploadExt);
    ensure_dir(dirname($draftMeta['abs']));
    $moved = @move_uploaded_file($tmpName, $draftMeta['abs']);
    if (!$moved) {
      $moved = @copy($tmpName, $draftMeta['abs']);
    }
    if (!$moved || !is_file($draftMeta['abs'])) api_json(['ok' => false, 'error' => 'upload_store_failed'], 500);
    clearstatcache(true, $draftMeta['abs']);
    $storedSize = @filesize($draftMeta['abs']) ?: 0;
    if ($storedSize <= 0 || $storedSize > $MAX_FORM_UPLOAD_BYTES) {
      if (is_file($draftMeta['abs'])) @unlink($draftMeta['abs']);
      api_json(['ok' => false, 'error' => $storedSize > $MAX_FORM_UPLOAD_BYTES ? 'upload_too_large' : 'invalid_upload_size', 'max_bytes' => $MAX_FORM_UPLOAD_BYTES], $storedSize > $MAX_FORM_UPLOAD_BYTES ? 413 : 400);
    }
    if (!uploaded_workbook_signature_valid($draftMeta['abs'], $uploadExt)) {
      if (is_file($draftMeta['abs'])) @unlink($draftMeta['abs']);
      api_json(['ok' => false, 'error' => 'invalid_file_signature'], 400);
    }

    $sha = form_sha256_file($draftMeta['abs']);
    $size = $storedSize;
    $dt = human_dt();
    $versions = is_array($manifest['versions'] ?? null) ? $manifest['versions'] : [];
    $idx = form_find_working_entry_index($versions, $revision, ['draft', 'in_review', 'pending_approval']);
    $entry = [
      'id' => $idx >= 0 ? (string)($versions[$idx]['id'] ?? (ts_compact() . '_draft')) : (ts_compact() . '_draft'),
      'version' => 'v' . $revision,
      'status' => 'draft',
      'date' => $dt,
      'user' => (string)($me['name'] ?? $me['username'] ?? ''),
      'role' => (string)($me['role'] ?? ''),
      'note' => $note !== '' ? $note : 'Uploaded workbook draft',
      'updateType' => $updateType,
      'storage' => 'private',
      'private_rel' => $draftMeta['rel'],
      'sha256' => $sha,
      'size_bytes' => $size,
      'original_name' => (string)($upload['name'] ?? ''),
    ];
    if ($idx >= 0) {
      $oldPrivateRel = trim((string)($versions[$idx]['private_rel'] ?? ''));
      if ($oldPrivateRel !== '' && $oldPrivateRel !== $draftMeta['rel']) {
        try {
          $oldPrivateAbs = form_resolve_private_abs($DATA_DIR, $oldPrivateRel);
          if (is_file($oldPrivateAbs)) @unlink($oldPrivateAbs);
        } catch (Throwable $e) {
          // ignore stale file
        }
      }
      $versions[$idx] = array_merge($versions[$idx], $entry);
    } else {
      array_unshift($versions, $entry);
    }
    $manifest['versions'] = $versions;
    $manifest['base'] = (string)$formEntry['path'];
    $manifest['kind'] = 'excel_form';
    form_save_manifest($DATA_DIR, (string)$formEntry['code'], $manifest);

    $state['status'] = 'draft';
    $state['revision'] = $revision;
    $state['updateType'] = $updateType;
    $state['checked_out_by'] = [
      'name' => (string)($me['name'] ?? $me['username'] ?? ''),
      'role' => (string)($me['role'] ?? ''),
      'date' => $dt,
    ];
    $state['lastEdit'] = [
      'by' => (string)($me['name'] ?? $me['username'] ?? ''),
      'role' => (string)($me['role'] ?? ''),
      'date' => $dt,
      'note' => $note !== '' ? $note : 'Uploaded workbook draft',
    ];
    form_save_state($DATA_DIR, (string)$formEntry['code'], $state);
    invalidate_scan_cache($DATA_DIR);

    api_json([
      'ok' => true,
      'code' => (string)$formEntry['code'],
      'state' => $state,
      'versions' => form_public_versions($manifest, $state, (string)$formEntry['code'], (string)$formEntry['path']),
      'server_time' => now_iso(),
    ]);
  }

  case 'doc_submit_review': {
    if ($method !== 'POST') api_json(['ok' => false, 'error' => 'method_not_allowed'], 405);
    require_csrf();
    if (!is_array($store)) api_json(['ok' => false, 'error' => 'system_not_initialized'], 500);
    $me = require_logged_in($store);
    require_doc_workflow_editor($me, $ROLE_PERMS_FILE);
    $data = read_json_body();

    $code = (string)($data['code'] ?? '');
    $basePath = (string)($data['base_path'] ?? ($data['path'] ?? ''));
    $revision = (string)($data['revision'] ?? '0');
    $note = (string)($data['note'] ?? '');
    $updateType = (string)($data['updateType'] ?? 'major');
    $html = (string)($data['html'] ?? '');
    if (trim($code) === '') api_json(['ok' => false, 'error' => 'missing_code'], 400);
    if (trim($basePath) === '') api_json(['ok' => false, 'error' => 'missing_base_path'], 400);
    $baseRel = safe_rel_path($basePath);
    $formEntry = form_registry_get_entry($FORM_CONTROL_REGISTRY_FILE, $code, $baseRel);
    if (is_array($formEntry)) {
      $state = form_load_state($DATA_DIR, $ROOT_DIR, $formEntry);
      $manifest = form_load_manifest($DATA_DIR, $ROOT_DIR, $formEntry);
      $versions = is_array($manifest['versions'] ?? null) ? $manifest['versions'] : [];
      $revision = form_normalize_revision($revision, form_normalize_revision((string)($state['revision'] ?? '0'), '0'));
      $ext = form_extension_from_path((string)$formEntry['path']);
      $draftMeta = form_private_file_meta($DATA_DIR, (string)$formEntry['code'], $revision, 'draft', $ext);
      $reviewMeta = form_private_file_meta($DATA_DIR, (string)$formEntry['code'], $revision, 'in_review', $ext);
      if (!is_file($draftMeta['abs'])) api_json(['ok' => false, 'error' => 'missing_draft_upload'], 400);
      form_move_file_or_throw($draftMeta['abs'], $reviewMeta['abs']);
      $sha = form_sha256_file($reviewMeta['abs']);
      $size = @filesize($reviewMeta['abs']) ?: 0;
      $dt = human_dt();
      $idx = form_find_working_entry_index($versions, $revision, ['draft', 'in_review', 'pending_approval']);
      $entry = [
        'id' => $idx >= 0 ? (string)($versions[$idx]['id'] ?? (ts_compact() . '_review')) : (ts_compact() . '_review'),
        'version' => 'v' . $revision,
        'status' => 'in_review',
        'date' => $dt,
        'user' => (string)($me['name'] ?? $me['username'] ?? ''),
        'role' => (string)($me['role'] ?? ''),
        'note' => $note !== '' ? $note : 'Submitted workbook for review',
        'updateType' => ($updateType === 'minor') ? 'minor' : 'major',
        'storage' => 'private',
        'private_rel' => $reviewMeta['rel'],
        'sha256' => $sha,
        'size_bytes' => $size,
        'submittedBy' => (string)($me['name'] ?? $me['username'] ?? ''),
        'submittedDate' => $dt,
      ];
      if ($idx >= 0) $versions[$idx] = array_merge($versions[$idx], $entry);
      else array_unshift($versions, $entry);
      $manifest['versions'] = $versions;
      form_save_manifest($DATA_DIR, (string)$formEntry['code'], $manifest);
      $state['status'] = 'in_review';
      $state['revision'] = $revision;
      $state['updateType'] = ($updateType === 'minor') ? 'minor' : 'major';
      $state['submittedBy'] = [
        'name' => (string)($me['name'] ?? $me['username'] ?? ''),
        'role' => (string)($me['role'] ?? ''),
        'date' => $dt,
        'updateType' => $state['updateType'],
        'note' => $note,
      ];
      if (isset($state['rejectedBy'])) unset($state['rejectedBy']);
      form_save_state($DATA_DIR, (string)$formEntry['code'], $state);
      invalidate_scan_cache($DATA_DIR);
      api_json([
        'ok' => true,
        'code' => (string)$formEntry['code'],
        'state' => $state,
        'versions' => form_public_versions($manifest, $state, (string)$formEntry['code'], (string)$formEntry['path']),
        'server_time' => now_iso(),
      ]);
    }
    if (strlen(trim($html)) < 30) api_json(['ok' => false, 'error' => 'missing_html'], 400);

    $info = doc_store_info($ROOT_DIR, $basePath);
    ensure_dir($info['archiveAbsDir']);
    $ts = ts_compact();
    $revFmt = fmt_rev($revision);
    $filename = $info['baseName'] . '_V' . $revFmt . '_INREVIEW.html';
    $fileRel = $info['archiveRelDir'] . '/' . $filename;
    $fileAbs = join_in_root($ROOT_DIR, $fileRel);
    ensure_dir(dirname($fileAbs));
    // Sync ISO header fields inside the in-review snapshot
    $html = sync_doc_header_html($html, $revision, null);
    $html = inject_base_href_archive($html);
    if (@file_put_contents($fileAbs, $html, LOCK_EX) === false) {
      api_json(['ok' => false, 'error' => 'write_failed'], 500);
    }

    $dt = human_dt();
    $state = load_doc_state($ROOT_DIR, $basePath, $ARCHIVE_DIR, $code) ?? [];
    $state['status'] = 'in_review';
    $state['submittedBy'] = (string)($me['name'] ?? $me['username'] ?? '');
    $state['submittedDate'] = $dt;
    $state['revision'] = $revision;
    $state['updateType'] = ($updateType === 'minor') ? 'minor' : 'major';
    $state['submittedBy'] = [
      'name' => (string)($me['name'] ?? $me['username'] ?? ''),
      'role' => (string)($me['role'] ?? ''),
      'date' => $dt,
      'updateType' => $state['updateType'],
      'note' => $note,
    ];
    // clear any previous rejection marker
    if (isset($state['rejectedBy'])) unset($state['rejectedBy']);
    save_doc_state($ROOT_DIR, $basePath, $state);

    $manifest = load_doc_manifest($ROOT_DIR, $basePath, $ARCHIVE_DIR, $code);
    $entry = [
      'id' => $ts . '_review',
      'version' => 'v' . $revision,
      'status' => 'in_review',
      'date' => $dt,
      'user' => (string)($me['name'] ?? $me['username'] ?? ''),
      'role' => (string)($me['role'] ?? ''),
      'submittedBy' => (string)($me['name'] ?? $me['username'] ?? ''),
      'submittedDate' => $dt,
      'note' => $note,
      'updateType' => $state['updateType'],
      'file' => $fileRel,
      'lastEditBy' => isset($state['lastEdit']['by']) ? (string)$state['lastEdit']['by'] : (string)($me['name'] ?? $me['username'] ?? ''),
      'lastEditRole' => isset($state['lastEdit']['role']) ? (string)$state['lastEdit']['role'] : (string)($me['role'] ?? ''),
      'lastEditDate' => isset($state['lastEdit']['date']) ? (string)$state['lastEdit']['date'] : $dt,
    ];
    $versions = $manifest['versions'] ?? [];
    $versions = array_values(array_filter($versions, function($v) use ($entry){
      if (!is_array($v)) return false;
      return !((string)($v['status'] ?? '') === 'in_review' && (string)($v['version'] ?? '') === (string)$entry['version']);
    }));
    array_unshift($versions, $entry);
    if (count($versions) > 200) $versions = array_slice($versions, 0, 200);
    $manifest['versions'] = $versions;
    save_doc_manifest($ROOT_DIR, $basePath, $manifest);

    api_json(['ok' => true, 'code' => $code, 'state' => $state, 'versions' => $versions, 'server_time' => now_iso()]);
  }

  case 'doc_approve': {
    if ($method !== 'POST') api_json(['ok' => false, 'error' => 'method_not_allowed'], 405);
    require_csrf();
    if (!is_array($store)) api_json(['ok' => false, 'error' => 'system_not_initialized'], 500);
    $me = require_logged_in($store);
    require_doc_workflow_approver($me);
    $data = read_json_body();

    $code = strtoupper(trim((string)($data['code'] ?? '')));
    $basePath = (string)($data['base_path'] ?? '');
    $newRevision = (string)($data['newRevision'] ?? ($data['revision'] ?? '0'));
    $updateType = (string)($data['updateType'] ?? 'major');
    $note = (string)($data['note'] ?? '');
    // Optional: client may send HTML, but approval should primarily publish the
    // server-stored _INREVIEW snapshot to avoid approving a translated/modified DOM.
    $html = (string)($data['html'] ?? '');

    if (trim($code) === '') api_json(['ok' => false, 'error' => 'missing_code'], 400);
    if (trim($basePath) === '') api_json(['ok' => false, 'error' => 'missing_base_path'], 400);
    $newRevision = form_normalize_revision($newRevision, '0');

    $baseRel = safe_rel_path($basePath);
    if (is_reserved_root_segment($baseRel)) api_json(['ok' => false, 'error' => 'invalid_base_path'], 400);
      if (!filename_matches_doc_code(basename($baseRel), $code)) {
      api_json(['ok' => false, 'error' => 'code_path_mismatch'], 400);
    }
    $formEntry = form_registry_get_entry($FORM_CONTROL_REGISTRY_FILE, $code, $baseRel);
    if (is_array($formEntry)) {
      $state = form_load_state($DATA_DIR, $ROOT_DIR, $formEntry);
      $manifest = form_load_manifest($DATA_DIR, $ROOT_DIR, $formEntry);
      $versions = is_array($manifest['versions'] ?? null) ? $manifest['versions'] : [];
      $newRevision = form_normalize_revision($newRevision, form_normalize_revision((string)($state['revision'] ?? '0'), '0'));
      // Guard: only allow approving the currently in-review revision
      $workingRevision = '';
      foreach ($versions as $vv) {
        if (!is_array($vv)) continue;
        $stt = strtolower((string)($vv['status'] ?? ''));
        if (!in_array($stt, ['in_review', 'pending_approval'], true)) continue;
        $candidate = form_normalize_revision(revision_from_version_string((string)($vv['version'] ?? '')), '');
        if ($candidate !== '') { $workingRevision = $candidate; break; }
      }
      if ($workingRevision === '' && isset($state['revision'])) {
        $workingRevision = form_normalize_revision((string)$state['revision'], '');
      }
      if ($workingRevision !== '' && $newRevision !== $workingRevision) {
        api_json([
          'ok' => false,
          'error' => 'approve_revision_mismatch',
          'expected_revision' => $workingRevision,
          'received_revision' => $newRevision
        ], 409);
      }
      $ext = form_extension_from_path((string)$formEntry['path']);
      $reviewMeta = form_private_file_meta($DATA_DIR, (string)$formEntry['code'], $newRevision, 'in_review', $ext);
      $draftMeta = form_private_file_meta($DATA_DIR, (string)$formEntry['code'], $newRevision, 'draft', $ext);
      $sourceAbs = is_file($reviewMeta['abs']) ? $reviewMeta['abs'] : $draftMeta['abs'];
      if (!is_file($sourceAbs)) api_json(['ok' => false, 'error' => 'missing_review_file'], 400);
      $baseAbs = join_in_root($ROOT_DIR, $baseRel);
      ensure_dir(dirname($baseAbs));
      $dt = human_dt();
      $effDate = substr($dt, 0, 10);
      $prevRevision = form_latest_released_revision($manifest, $state, form_normalize_revision((string)($state['released_revision'] ?? '0'), '0'));
      $hasRelease = false;
      foreach ($versions as $version) {
        if (!is_array($version)) continue;
        if (in_array((string)($version['status'] ?? ''), ['approved', 'initial_release'], true)) {
          $hasRelease = true;
          break;
        }
      }
      if (is_file($baseAbs) && $hasRelease) {
        $archiveMeta = form_private_file_meta($DATA_DIR, (string)$formEntry['code'], $prevRevision, 'obsolete', $ext);
        form_copy_file_or_throw($baseAbs, $archiveMeta['abs']);
        $archiveSha = form_sha256_file($archiveMeta['abs']);
        $archiveSize = @filesize($archiveMeta['abs']) ?: 0;
        foreach ($versions as &$version) {
          if (!is_array($version)) continue;
          if (!in_array((string)($version['status'] ?? ''), ['approved', 'initial_release'], true)) continue;
          $version['status'] = 'obsolete';
          $version['storage'] = 'private';
          $version['private_rel'] = $archiveMeta['rel'];
          $version['sha256'] = $archiveSha;
          $version['size_bytes'] = $archiveSize;
          unset($version['live_path']);
        }
        unset($version);
      }
      form_copy_file_or_throw($sourceAbs, $baseAbs);
      $liveSha = form_sha256_file($baseAbs);
      $liveSize = @filesize($baseAbs) ?: 0;
      foreach ([$reviewMeta['abs'], $draftMeta['abs']] as $workingAbs) {
        if (is_file($workingAbs)) @unlink($workingAbs);
      }
      $cleaned = [];
      foreach ($versions as $version) {
        if (!is_array($version)) continue;
        $status = (string)($version['status'] ?? '');
        $versionRev = form_normalize_revision(revision_from_version_string((string)($version['version'] ?? '')), '');
        if ($versionRev === $newRevision && in_array($status, ['draft', 'in_review', 'pending_approval'], true)) {
          continue;
        }
        $cleaned[] = $version;
      }
      $capturedSubmittedBy = '';
      $capturedSubmittedDate = '';
      $capturedLastEditBy = '';
      $capturedLastEditRole = '';
      $capturedLastEditDate = '';
      if (isset($state['submittedBy']) && is_array($state['submittedBy'])) {
        $capturedSubmittedBy = (string)($state['submittedBy']['name'] ?? '');
        $capturedSubmittedDate = (string)($state['submittedBy']['date'] ?? '');
      }
      if (isset($state['lastEdit']) && is_array($state['lastEdit'])) {
        $capturedLastEditBy = (string)($state['lastEdit']['by'] ?? '');
        $capturedLastEditRole = (string)($state['lastEdit']['role'] ?? '');
        $capturedLastEditDate = (string)($state['lastEdit']['date'] ?? '');
      }
      array_unshift($cleaned, [
        'id' => ts_compact() . '_approved',
        'version' => 'v' . $newRevision,
        'status' => $hasRelease ? 'approved' : 'initial_release',
        'date' => $dt,
        'user' => (string)($me['name'] ?? $me['username'] ?? ''),
        'role' => (string)($me['role'] ?? ''),
        'submittedBy' => $capturedSubmittedBy,
        'submittedDate' => $capturedSubmittedDate,
        'lastEditBy' => $capturedLastEditBy,
        'lastEditRole' => $capturedLastEditRole,
        'lastEditDate' => $capturedLastEditDate,
        'approvedBy' => (string)($me['name'] ?? $me['username'] ?? ''),
        'approvedDate' => $dt,
        'note' => $note,
        'updateType' => ($updateType === 'minor') ? 'minor' : 'major',
        'storage' => 'live',
        'live_path' => $baseRel,
        'sha256' => $liveSha,
        'size_bytes' => $liveSize,
      ]);
      $manifest['versions'] = $cleaned;
      $manifest['base'] = $baseRel;
      form_save_manifest($DATA_DIR, (string)$formEntry['code'], $manifest);
      $state['status'] = 'approved';
      $state['revision'] = $newRevision;
      $state['released_revision'] = $newRevision;
      $state['updateType'] = ($updateType === 'minor') ? 'minor' : 'major';
      $state['effective_date'] = $effDate;
      $state['approvedBy'] = [
        'name' => (string)($me['name'] ?? $me['username'] ?? ''),
        'role' => (string)($me['role'] ?? ''),
        'date' => $dt,
      ];
      $state['approvedDate'] = $dt;
      $state['has_release'] = true;
      foreach (['lastEdit','submittedBy','submittedDate','submittedUpdateType','rejectedBy','checked_out_by'] as $k) {
        if (array_key_exists($k, $state)) unset($state[$k]);
      }
      form_save_state($DATA_DIR, (string)$formEntry['code'], $state);
      $existingNotes = $formEntry['notes'] ?? [];
      if (!is_array($existingNotes)) $existingNotes = [];
      $existingNotes[] = 'Workbook version history is controlled in private release archive outside web root.';
      $existingNotes = array_values(array_unique(array_map('strval', $existingNotes)));
      form_registry_patch_entry($FORM_CONTROL_REGISTRY_FILE, (string)$formEntry['code'], [
        'rev' => 'V' . $newRevision,
        'effective_date' => $effDate,
        'status' => 'approved',
        'control_status' => 'RELEASED',
        'sha256' => $liveSha,
        'notes' => $existingNotes,
        'version_control_model' => 'private_archive_release_control',
        'release_workflow_id' => 'QMS-FRM-EXCEL-PRIVATE-RELEASE-CONTROL',
      ]);
      invalidate_scan_cache($DATA_DIR);
      api_json([
        'ok' => true,
        'code' => (string)$formEntry['code'],
        'state' => $state,
        'versions' => form_public_versions($manifest, $state, (string)$formEntry['code'], (string)$formEntry['path']),
        'server_time' => now_iso(),
      ]);
    }
    $baseAbs = join_in_root($ROOT_DIR, $baseRel);

    $info = doc_store_info($ROOT_DIR, $baseRel);
    ensure_dir($info['archiveAbsDir']);

    // Load manifest/state early (needed to locate the in-review snapshot)
    $manifest = load_doc_manifest($ROOT_DIR, $baseRel, $ARCHIVE_DIR, $code);
    $versions = $manifest['versions'] ?? [];
    $state = load_doc_state($ROOT_DIR, $baseRel, $ARCHIVE_DIR, $code) ?? [];
    // Guard: only allow approving the currently in-review revision
    $workingRevision = '';
    foreach ($versions as $vv) {
      if (!is_array($vv)) continue;
      $stt = strtolower((string)($vv['status'] ?? ''));
      if (!in_array($stt, ['in_review', 'pending_approval'], true)) continue;
      $candidate = form_normalize_revision(revision_from_version_string((string)($vv['version'] ?? '')), '');
      if ($candidate !== '') { $workingRevision = $candidate; break; }
    }
    if ($workingRevision === '' && isset($state['revision'])) {
      $workingRevision = form_normalize_revision((string)$state['revision'], '');
    }
    if ($workingRevision !== '' && $newRevision !== $workingRevision) {
      api_json([
        'ok' => false,
        'error' => 'approve_revision_mismatch',
        'expected_revision' => $workingRevision,
        'received_revision' => $newRevision
      ], 409);
    }

    // If client didn't send HTML, read the server-stored INREVIEW file for this revision
    if (strlen(trim($html)) < 30) {
      $reviewRel = '';
      foreach ($versions as $vv) {
        if (!is_array($vv)) continue;
        if ((string)($vv['status'] ?? '') !== 'in_review') continue;
        $ver = (string)($vv['version'] ?? '');
        if (strcasecmp($ver, 'v' . $newRevision) !== 0) continue;
        $reviewRel = (string)($vv['file'] ?? '');
        break;
      }
      if (trim($reviewRel) === '') {
        $reviewRel = $info['archiveRelDir'] . '/' . $info['baseName'] . '_V' . fmt_rev($newRevision) . '_INREVIEW.html';
      }

      $reviewAbs = join_in_root($ROOT_DIR, $reviewRel);
      if (!is_file($reviewAbs)) {
        // Fallback: allow approving the latest draft if review file is missing
        $draftRel = $info['archiveRelDir'] . '/' . $info['baseName'] . '_V' . fmt_rev($newRevision) . '_DRAFT.html';
        $draftAbs = join_in_root($ROOT_DIR, $draftRel);
        if (is_file($draftAbs)) {
          $reviewRel = $draftRel;
          $reviewAbs = $draftAbs;
        }
      }

      if (!is_file($reviewAbs)) {
        api_json(['ok' => false, 'error' => 'missing_review_file'], 400);
      }
      $raw = @file_get_contents($reviewAbs);
      if ($raw === false || strlen(trim((string)$raw)) < 30) {
        api_json(['ok' => false, 'error' => 'read_failed'], 500);
      }
      $html = (string)$raw;
    }

    $dt = human_dt();

    // The stored INREVIEW/DRAFT snapshot lives inside "_Archive" and therefore may
    // contain <base href="../">. Remove it before publishing back to the live
    // document path, otherwise relative assets/links will break.
    $html = strip_base_href_archive($html);

    // Sync ISO header fields in the approved (current) file
    $effDate = substr($dt, 0, 10);
    $html = sync_doc_header_html($html, $newRevision, $effDate);

    $ts = ts_compact();
    // $manifest/$versions/$state already loaded above
    // Prefer the last APPROVED revision from manifest (more reliable than workflow state)
    $prevRevision = '';
    foreach ($versions as $vv) {
      if (!is_array($vv)) continue;
      if (($vv['status'] ?? '') === 'approved' || ($vv['status'] ?? '') === 'initial_release') {
        $ver = (string)($vv['version'] ?? '');
        if (preg_match('/^v(.+)$/i', $ver, $m)) $prevRevision = (string)$m[1];
        break;
      }
    }
    if ($prevRevision === '') {
      $prevRevision = (string)($state['revision'] ?? ($data['prevRevision'] ?? '0'));
    }

    // Determine whether we already have a released version
    $hasRelease = false;
    foreach ($versions as $vv) {
      if (!is_array($vv)) continue;
      $stt = (string)($vv['status'] ?? '');
      if ($stt === 'approved' || $stt === 'initial_release') { $hasRelease = true; break; }
    }
    if (isset($state['has_release'])) {
      // If state says there is a release, trust it
      $hasRelease = $hasRelease || (bool)$state['has_release'];
    }
    $isInitialRelease = !$hasRelease;

    // 1) Archive current released file (if exists)
    $archivedPrevRel = null;
    if (is_file($baseAbs) && $hasRelease) {
      $prevFn = $info['baseName'] . '_V' . fmt_rev($prevRevision) . '.html';
      $archivedPrevRel = $info['archiveRelDir'] . '/' . $prevFn;
      $archivedPrevAbs = join_in_root($ROOT_DIR, $archivedPrevRel);
      ensure_dir(dirname($archivedPrevAbs));
      // Copy the previous live file into _Archive. Inject <base href="../"> so
      // all relative assets/links keep working from inside the _Archive folder.
      $prevRaw = @file_get_contents($baseAbs);
      if (is_string($prevRaw) && strlen($prevRaw) > 0) {
        $prevRaw = inject_base_href_archive($prevRaw);
        @file_put_contents($archivedPrevAbs, $prevRaw, LOCK_EX);
      } else {
        @copy($baseAbs, $archivedPrevAbs);
      }

      // Update previous approved entry (if any) to point to the archived file
      for ($i = 0; $i < count($versions); $i++) {
        if (!is_array($versions[$i])) continue;
        if (($versions[$i]['status'] ?? '') === 'approved' || ($versions[$i]['status'] ?? '') === 'initial_release') {
          $versions[$i]['status'] = 'obsolete';
          $versions[$i]['file'] = $archivedPrevRel;
        }
      }
      // (No extra insert here to avoid duplicates; portal can still access the archived file from the updated entry.)
    }

    // 2) Publish: write new HTML into the live document path
    ensure_dir(dirname($baseAbs));
    if (@file_put_contents($baseAbs, $html, LOCK_EX) === false) {
      api_json(['ok' => false, 'error' => 'publish_failed'], 500);
    }

    // 3) Update state
    // Capture submitter info BEFORE clearing
    $capturedSubmittedBy = '';
    $capturedSubmittedDate = '';
    $capturedLastEditBy = '';
    $capturedLastEditRole = '';
    $capturedLastEditDate = '';
    if (isset($state['submittedBy']) && is_array($state['submittedBy'])) {
      $capturedSubmittedBy = (string)($state['submittedBy']['name'] ?? '');
      $capturedSubmittedDate = (string)($state['submittedBy']['date'] ?? '');
    } elseif (isset($state['submittedBy'])) {
      $capturedSubmittedBy = (string)$state['submittedBy'];
      $capturedSubmittedDate = (string)($state['submittedDate'] ?? '');
    }
    if (isset($state['lastEdit']) && is_array($state['lastEdit'])) {
      $capturedLastEditBy = (string)($state['lastEdit']['by'] ?? '');
      $capturedLastEditRole = (string)($state['lastEdit']['role'] ?? '');
      $capturedLastEditDate = (string)($state['lastEdit']['date'] ?? '');
    }

    $state['status'] = 'approved';
    $state['revision'] = $newRevision;
    $state['released_revision'] = $newRevision;
    $state['updateType'] = ($updateType === 'minor') ? 'minor' : 'major';
    $state['approvedBy'] = [
      'name' => (string)($me['name'] ?? $me['username'] ?? ''),
      'role' => (string)($me['role'] ?? ''),
      'date' => $dt,
    ];
    $state['approvedDate'] = $dt;
    $state['has_release'] = true;
    // Clear transient workflow fields
    if (isset($state['submittedBy'])) unset($state['submittedBy']);
    if (isset($state['rejectedBy'])) unset($state['rejectedBy']);
    save_doc_state($ROOT_DIR, $baseRel, $state);

    // 3.5) Clean up working copies for the newly approved revision
    $newRevFmt = fmt_rev($newRevision);
    $workDraft = $info['archiveRelDir'] . '/' . $info['baseName'] . '_V' . $newRevFmt . '_DRAFT.html';
    $workReview = $info['archiveRelDir'] . '/' . $info['baseName'] . '_V' . $newRevFmt . '_INREVIEW.html';
    foreach ([$workDraft, $workReview] as $wr) {
      try {
        $wa = join_in_root($ROOT_DIR, $wr);
        if (is_file($wa)) @unlink($wa);
      } catch (Throwable $e) {
        // ignore
      }
    }

    // Remove transient draft/in-review entries for this revision (once approved we do not keep INREVIEW)
    $cleaned = [];
    foreach ($versions as $v) {
      if (!is_array($v)) continue;
      $st = (string)($v['status'] ?? '');
      $ver = (string)($v['version'] ?? '');
      if (strcasecmp($ver, 'v'.$newRevision) === 0 && in_array($st, ['draft','in_review','pending_approval'], true)) {
        continue;
      }
      $cleaned[] = $v;
    }
    $versions = $cleaned;

    // 4) Insert new approved version entry
    $entry = [
      'id' => $ts . '_approved',
      'version' => 'v' . $newRevision,
      'status' => ($isInitialRelease ? 'initial_release' : 'approved'),
      'date' => $dt,
      'user' => (string)($me['name'] ?? $me['username'] ?? ''),
      'role' => (string)($me['role'] ?? ''),
      'submittedBy' => $capturedSubmittedBy,
      'submittedDate' => $capturedSubmittedDate,
      'lastEditBy' => $capturedLastEditBy,
      'lastEditRole' => $capturedLastEditRole,
      'lastEditDate' => $capturedLastEditDate,
      'approvedBy' => (string)($me['name'] ?? $me['username'] ?? ''),
      'approvedDate' => $dt,
      'note' => $note,
      'updateType' => $state['updateType'],
      'file' => $baseRel,
    ];
    array_unshift($versions, $entry);
    if (count($versions) > 300) $versions = array_slice($versions, 0, 300);
    $manifest['versions'] = $versions;
    save_doc_manifest($ROOT_DIR, $baseRel, $manifest);
    patch_custom_doc_entries($CUSTOM_DOCS_FILE, $code, [
      'status' => 'approved',
      'rev' => $newRevision,
      'path' => $baseRel,
      'folder' => (string)$info['dirRel'],
    ]);

    api_json(['ok' => true, 'code' => $code, 'state' => $state, 'versions' => $versions, 'server_time' => now_iso()]);
  }

  case 'doc_reject': {
    if ($method !== 'POST') api_json(['ok' => false, 'error' => 'method_not_allowed'], 405);
    require_csrf();
    if (!is_array($store)) api_json(['ok' => false, 'error' => 'system_not_initialized'], 500);
    $me = require_logged_in($store);
    require_doc_workflow_approver($me);
    $data = read_json_body();
    $code = strtoupper(trim((string)($data['code'] ?? '')));
    $basePath = (string)($data['base_path'] ?? ($data['path'] ?? ''));
    $reason = (string)($data['reason'] ?? '');
    if (trim($code) === '') api_json(['ok' => false, 'error' => 'missing_code'], 400);
    if (trim($basePath) === '') api_json(['ok' => false, 'error' => 'missing_base_path'], 400);
    $baseRel = safe_rel_path($basePath);
    if (is_reserved_root_segment($baseRel)) api_json(['ok' => false, 'error' => 'invalid_base_path'], 400);
      if (!filename_matches_doc_code(basename($baseRel), $code)) {
      api_json(['ok' => false, 'error' => 'code_path_mismatch'], 400);
    }
    $formEntry = form_registry_get_entry($FORM_CONTROL_REGISTRY_FILE, $code, $baseRel);
    if (is_array($formEntry)) {
      $dt = human_dt();
      $state = form_load_state($DATA_DIR, $ROOT_DIR, $formEntry);
      $manifest = form_load_manifest($DATA_DIR, $ROOT_DIR, $formEntry);
      $versions = is_array($manifest['versions'] ?? null) ? $manifest['versions'] : [];
      $targetRevision = form_normalize_revision((string)($state['revision'] ?? '0'), '0');
      $ext = form_extension_from_path((string)$formEntry['path']);
      $reviewMeta = form_private_file_meta($DATA_DIR, (string)$formEntry['code'], $targetRevision, 'in_review', $ext);
      $draftMeta = form_private_file_meta($DATA_DIR, (string)$formEntry['code'], $targetRevision, 'draft', $ext);
      if (is_file($reviewMeta['abs'])) {
        form_move_file_or_throw($reviewMeta['abs'], $draftMeta['abs']);
      } elseif (!is_file($draftMeta['abs'])) {
        api_json(['ok' => false, 'error' => 'nothing_to_reject'], 400);
      }
      $sha = form_sha256_file($draftMeta['abs']);
      $size = @filesize($draftMeta['abs']) ?: 0;
      $idx = form_find_working_entry_index($versions, $targetRevision, ['in_review', 'pending_approval', 'draft']);
      if ($idx >= 0) {
        $existingNote = trim((string)($versions[$idx]['note'] ?? ''));
        $versions[$idx]['status'] = 'draft';
        $versions[$idx]['date'] = $dt;
        $versions[$idx]['storage'] = 'private';
        $versions[$idx]['private_rel'] = $draftMeta['rel'];
        $versions[$idx]['sha256'] = $sha;
        $versions[$idx]['size_bytes'] = $size;
        $versions[$idx]['rejectedBy'] = (string)($me['name'] ?? $me['username'] ?? '');
        $versions[$idx]['rejectedDate'] = $dt;
        if ($reason !== '') {
          $versions[$idx]['note'] = ($existingNote !== '' ? ($existingNote . ' | ') : '') . 'Rejected: ' . $reason;
        }
        unset($versions[$idx]['submittedBy'], $versions[$idx]['submittedDate'], $versions[$idx]['approvedBy'], $versions[$idx]['approvedDate'], $versions[$idx]['live_path']);
      }
      $manifest['versions'] = $versions;
      form_save_manifest($DATA_DIR, (string)$formEntry['code'], $manifest);
      $state['status'] = 'draft';
      $state['revision'] = $targetRevision;
      $state['rejectedBy'] = [
        'name' => (string)($me['name'] ?? $me['username'] ?? ''),
        'role' => (string)($me['role'] ?? ''),
        'date' => $dt,
        'reason' => $reason,
      ];
      foreach (['submittedBy','submittedDate','submittedUpdateType','approvedBy','approvedDate'] as $k) {
        if (array_key_exists($k, $state)) unset($state[$k]);
      }
      form_save_state($DATA_DIR, (string)$formEntry['code'], $state);
      invalidate_scan_cache($DATA_DIR);
      api_json([
        'ok' => true,
        'code' => (string)$formEntry['code'],
        'state' => $state,
        'versions' => form_public_versions($manifest, $state, (string)$formEntry['code'], (string)$formEntry['path']),
        'server_time' => now_iso(),
      ]);
    }
    $dt = human_dt();
    $info = doc_store_info($ROOT_DIR, $baseRel);
    $state = load_doc_state($ROOT_DIR, $baseRel, $ARCHIVE_DIR, $code) ?? [];
    $manifest = load_doc_manifest($ROOT_DIR, $baseRel, $ARCHIVE_DIR, $code);
    $versions = $manifest['versions'] ?? [];
    $targetRevision = (string)($state['revision'] ?? '');
    $reviewIdx = -1;
    for ($i = 0; $i < count($versions); $i++) {
      if (!is_array($versions[$i])) continue;
      $st = (string)($versions[$i]['status'] ?? '');
      if (!in_array($st, ['in_review', 'pending_approval'], true)) continue;
      $ver = (string)($versions[$i]['version'] ?? '');
      if ($targetRevision !== '' && strcasecmp($ver, 'v' . $targetRevision) !== 0) continue;
      $reviewIdx = $i;
      if ($targetRevision === '' && preg_match('/^v(.+)$/i', $ver, $m)) {
        $targetRevision = (string)$m[1];
      }
      break;
    }
    if ($reviewIdx < 0 && (string)($state['status'] ?? '') !== 'in_review') {
      api_json(['ok' => false, 'error' => 'nothing_to_reject'], 400);
    }
    if ($reviewIdx >= 0) {
      $reviewRel = str_replace('\\', '/', (string)($versions[$reviewIdx]['file'] ?? ''));
      $draftRel = $reviewRel;
      if ($reviewRel !== '' && preg_match('/_INREVIEW\\.html$/i', $reviewRel)) {
        $draftRel = (string)preg_replace('/_INREVIEW\\.html$/i', '_DRAFT.html', $reviewRel);
        if ($draftRel !== '' && $draftRel !== $reviewRel) {
          try {
            $reviewAbs = join_in_root($ROOT_DIR, $reviewRel);
            $draftAbs = join_in_root($ROOT_DIR, $draftRel);
            ensure_dir(dirname($draftAbs));
            if (is_file($reviewAbs)) {
              $payload = @file_get_contents($reviewAbs);
              if ($payload !== false) {
                @file_put_contents($draftAbs, $payload, LOCK_EX);
                if ($reviewAbs !== $draftAbs && is_file($reviewAbs)) @unlink($reviewAbs);
              }
            }
          } catch (Throwable $e) {
            $draftRel = $reviewRel;
          }
        }
      }
      $existingNote = trim((string)($versions[$reviewIdx]['note'] ?? ''));
      $versions[$reviewIdx]['status'] = 'draft';
      $versions[$reviewIdx]['date'] = $dt;
      $versions[$reviewIdx]['file'] = $draftRel;
      $versions[$reviewIdx]['rejectedBy'] = (string)($me['name'] ?? $me['username'] ?? '');
      $versions[$reviewIdx]['rejectedDate'] = $dt;
      if ($reason !== '') {
        $versions[$reviewIdx]['note'] = ($existingNote !== '' ? ($existingNote . ' | ') : '') . 'Rejected: ' . $reason;
      }
      unset($versions[$reviewIdx]['submittedBy'], $versions[$reviewIdx]['submittedDate'], $versions[$reviewIdx]['approvedBy'], $versions[$reviewIdx]['approvedDate']);
      $manifest['versions'] = $versions;
      save_doc_manifest($ROOT_DIR, $baseRel, $manifest);
    }
    $state['status'] = 'draft';
    if ($targetRevision !== '') $state['revision'] = $targetRevision;
    $state['rejectedBy'] = [
      'name' => (string)($me['name'] ?? $me['username'] ?? ''),
      'role' => (string)($me['role'] ?? ''),
      'date' => $dt,
      'reason' => $reason,
    ];
    foreach (['submittedBy','submittedDate','submittedUpdateType','approvedBy','approvedDate'] as $k) {
      if (array_key_exists($k, $state)) unset($state[$k]);
    }
    save_doc_state($ROOT_DIR, $baseRel, $state);
    patch_custom_doc_entries($CUSTOM_DOCS_FILE, $code, [
      'status' => 'draft',
      'rev' => ($targetRevision !== '' ? $targetRevision : (string)($state['revision'] ?? '0')),
      'path' => $baseRel,
      'folder' => (string)$info['dirRel'],
    ]);
    api_json(['ok' => true, 'code' => $code, 'state' => $state, 'versions' => $manifest['versions'] ?? [], 'server_time' => now_iso()]);
  }

  case 'doc_update_meta': {
    if ($method !== 'POST') api_json(['ok' => false, 'error' => 'method_not_allowed'], 405);
    require_csrf();
    if (!is_array($store)) api_json(['ok' => false, 'error' => 'system_not_initialized'], 500);
    $me = require_logged_in($store);
    require_doc_workflow_editor($me, $ROLE_PERMS_FILE);
    $data = read_json_body();
    $code = (string)($data['code'] ?? '');
    $basePath = (string)($data['base_path'] ?? ($data['path'] ?? ''));
    $field = (string)($data['field'] ?? '');
    $value = (string)($data['value'] ?? '');
    if (trim($code) === '') api_json(['ok' => false, 'error' => 'missing_code'], 400);
    if (trim($basePath) === '') api_json(['ok' => false, 'error' => 'missing_base_path'], 400);
    if (!in_array($field, ['owner', 'approver'], true)) api_json(['ok' => false, 'error' => 'invalid_field'], 400);
    $baseRel = safe_rel_path($basePath);
    $formEntry = form_registry_get_entry($FORM_CONTROL_REGISTRY_FILE, $code, $baseRel);
    if (is_array($formEntry)) {
      $state = form_load_state($DATA_DIR, $ROOT_DIR, $formEntry);
      $state[$field] = $value;
      form_save_state($DATA_DIR, (string)$formEntry['code'], $state);
      if ($field === 'owner') {
        form_registry_patch_entry($FORM_CONTROL_REGISTRY_FILE, (string)$formEntry['code'], ['owner' => $value]);
        invalidate_scan_cache($DATA_DIR);
      }
      api_json(['ok' => true, 'code' => (string)$formEntry['code'], 'state' => $state, 'server_time' => now_iso()]);
    }
    $state = load_doc_state($ROOT_DIR, $baseRel, $ARCHIVE_DIR, $code) ?? [];
    $state[$field] = $value;
    save_doc_state($ROOT_DIR, $baseRel, $state);
    // Also sync the meta field into the HTML file if it exists
    try {
      $baseAbs = join_in_root($ROOT_DIR, $baseRel);
      if (is_file($baseAbs)) {
        $htmlContent = @file_get_contents($baseAbs);
        if ($htmlContent !== false) {
          if ($field === 'owner') {
            $htmlContent = preg_replace('/<b>Chủ sở hữu:<\/b><\/span><span>[^<]*<\/span>/', '<b>Chủ sở hữu:</b></span><span>' . htmlspecialchars($value) . '</span>', $htmlContent, 1);
          } elseif ($field === 'approver') {
            $htmlContent = preg_replace('/<b>Phê duyệt:<\/b><\/span><span>[^<]*<\/span>/', '<b>Phê duyệt:</b></span><span>' . htmlspecialchars($value) . '</span>', $htmlContent, 1);
          }
          @file_put_contents($baseAbs, $htmlContent, LOCK_EX);
        }
      }
    } catch (Throwable $e) {}
    api_json(['ok' => true, 'code' => $code, 'state' => $state, 'server_time' => now_iso()]);
  }

  case 'doc_delete_drafts': {
    if ($method !== 'POST') api_json(['ok' => false, 'error' => 'method_not_allowed'], 405);
    require_csrf();
    if (!is_array($store)) api_json(['ok' => false, 'error' => 'system_not_initialized'], 500);
    $me = require_logged_in($store);
    require_doc_workflow_editor($me, $ROLE_PERMS_FILE);
    $data = read_json_body();
    $code = (string)($data['code'] ?? '');
    $basePath = (string)($data['base_path'] ?? ($data['path'] ?? ''));
    if (trim($code) === '') api_json(['ok' => false, 'error' => 'missing_code'], 400);
    if (trim($basePath) === '') api_json(['ok' => false, 'error' => 'missing_base_path'], 400);
    $baseRel = safe_rel_path($basePath);
    $formEntry = form_registry_get_entry($FORM_CONTROL_REGISTRY_FILE, $code, $baseRel);
    if (is_array($formEntry)) {
      $state = form_load_state($DATA_DIR, $ROOT_DIR, $formEntry);
      $manifest = form_load_manifest($DATA_DIR, $ROOT_DIR, $formEntry);
      $versions = is_array($manifest['versions'] ?? null) ? $manifest['versions'] : [];
      $kept = [];
      $deleted = 0;
      foreach ($versions as $version) {
        if (!is_array($version)) continue;
        $status = (string)($version['status'] ?? '');
        if (in_array($status, ['draft', 'in_review', 'pending_approval'], true)) {
          $privateRel = trim((string)($version['private_rel'] ?? ''));
          if ($privateRel !== '') {
            try {
              $privateAbs = form_resolve_private_abs($DATA_DIR, $privateRel);
              if (is_file($privateAbs)) @unlink($privateAbs);
            } catch (Throwable $e) {
              // ignore stale private files
            }
          }
          $deleted++;
          continue;
        }
        $kept[] = $version;
      }
      $manifest['versions'] = $kept;
      form_save_manifest($DATA_DIR, (string)$formEntry['code'], $manifest);
      $hasApproved = false;
      foreach ($kept as $version) {
        if (!is_array($version)) continue;
        if (in_array((string)($version['status'] ?? ''), ['approved', 'initial_release'], true)) {
          $hasApproved = true;
          break;
        }
      }
      $releasedRev = form_latest_released_revision(['versions' => $kept], $state, form_normalize_revision((string)($formEntry['rev'] ?? '0'), '0'));
      $state['status'] = $hasApproved ? 'approved' : 'draft';
      $state['revision'] = $hasApproved ? $releasedRev : form_normalize_revision((string)($state['revision'] ?? '0'), '0');
      $state['released_revision'] = $releasedRev;
      foreach (['lastEdit','submittedBy','submittedDate','submittedUpdateType','rejectedBy','rejectedDate','checked_out_by'] as $k) {
        if (array_key_exists($k, $state)) unset($state[$k]);
      }
      form_save_state($DATA_DIR, (string)$formEntry['code'], $state);
      invalidate_scan_cache($DATA_DIR);
      api_json([
        'ok' => true,
        'code' => (string)$formEntry['code'],
        'deleted' => $deleted,
        'state' => $state,
        'versions' => form_public_versions($manifest, $state, (string)$formEntry['code'], (string)$formEntry['path']),
        'server_time' => now_iso(),
      ]);
    }
    $info = doc_store_info($ROOT_DIR, $baseRel);
    $manifest = load_doc_manifest($ROOT_DIR, $baseRel, $ARCHIVE_DIR, $code);
    $versions = $manifest['versions'] ?? [];
    $kept = [];
    $deleted = 0;
    foreach ($versions as $v) {
      if (!is_array($v)) continue;
      $st = (string)($v['status'] ?? '');
      if ($st === 'draft' || $st === 'in_review' || $st === 'pending_approval') {
        $file = (string)($v['file'] ?? '');
        if ($file !== '' && str_contains($file, '/_Archive/')) {
          try{
            $abs = join_in_root($ROOT_DIR, $file);
            if (is_file($abs)) @unlink($abs);
          }catch(Throwable $e){}
        }
        $deleted++;
        continue;
      }
      $kept[] = $v;
    }
    $manifest['versions'] = $kept;
    save_doc_manifest($ROOT_DIR, $baseRel, $manifest);

    $state = load_doc_state($ROOT_DIR, $baseRel, $ARCHIVE_DIR, $code) ?? [];
    $state = doc_recompute_release_state($kept, $state);
    save_doc_state($ROOT_DIR, $baseRel, $state);

    api_json(['ok' => true, 'code' => $code, 'deleted' => $deleted, 'state' => $state, 'versions' => $kept, 'server_time' => now_iso()]);
  }

  case 'doc_delete_version': {
    if ($method !== 'POST') api_json(['ok' => false, 'error' => 'method_not_allowed'], 405);
    require_csrf();
    if (!is_array($store)) api_json(['ok' => false, 'error' => 'system_not_initialized'], 500);
    $me = require_logged_in($store);
    require_doc_workflow_editor($me, $ROLE_PERMS_FILE);
    $data = read_json_body();
    $code = (string)($data['code'] ?? '');
    $basePath = (string)($data['base_path'] ?? ($data['path'] ?? ''));
    $id = (string)($data['id'] ?? '');
    if (trim($code) === '' || trim($id) === '') api_json(['ok' => false, 'error' => 'missing_params'], 400);
    if (trim($basePath) === '') api_json(['ok' => false, 'error' => 'missing_base_path'], 400);
    $baseRel = safe_rel_path($basePath);
    $info = doc_store_info($ROOT_DIR, $baseRel);
    $manifest = load_doc_manifest($ROOT_DIR, $baseRel, $ARCHIVE_DIR, $code);
    $versions = $manifest['versions'] ?? [];
    $kept = [];
    $deleted = false;
    foreach ($versions as $v) {
      if (!is_array($v)) continue;
      if (!$deleted && (string)($v['id'] ?? '') === $id) {
        $st = (string)($v['status'] ?? '');
        $file = (string)($v['file'] ?? '');
        // Safety: only allow deleting archived files, never the live approved file
        if ($st !== 'obsolete' || $file === '' || !str_starts_with($file, $info['archiveRelDir'] . '/')) {
          api_json(['ok' => false, 'error' => 'not_deletable'], 400);
        }
        try{
          $abs = join_in_root($ROOT_DIR, $file);
          if (is_file($abs)) @unlink($abs);
        }catch(Throwable $e){}
        $deleted = true;
        continue;
      }
      $kept[] = $v;
    }
    $manifest['versions'] = $kept;
    save_doc_manifest($ROOT_DIR, $baseRel, $manifest);
    $state = load_doc_state($ROOT_DIR, $baseRel, $ARCHIVE_DIR, $code) ?? [];
    $state = doc_recompute_release_state($kept, $state);
    save_doc_state($ROOT_DIR, $baseRel, $state);
    api_json(['ok' => true, 'code' => $code, 'deleted' => $deleted, 'state' => $state, 'versions' => $kept, 'server_time' => now_iso()]);
  }


  case 'admin_users_list': {
    if (!is_array($store)) api_json(['ok' => false, 'error' => 'system_not_initialized'], 500);
    $me = require_logged_in($store);

    $role = (string)($me['role'] ?? '');
    $_mRole = migrate_role($role);
    $isAdmin = in_array($role, admin_roles(), true) || in_array($_mRole, admin_roles(), true);
    if (!$isAdmin) api_json(['ok' => false, 'error' => 'forbidden'], 403);

    $out = [];
    $i = 1;
    foreach (($store['users'] ?? []) as $u) {
      if (!is_array($u)) continue;
      $out[] = [
        'id' => $i++,
        'name' => (string)($u['name'] ?? ''),
        'username' => (string)($u['username'] ?? ''),
        'role' => (string)($u['role'] ?? 'user'),
        'dept' => (string)($u['dept'] ?? ''),
        'title' => (string)($u['title'] ?? ''),
        'active' => (bool)($u['active'] ?? true),
        'mfa' => ['enabled' => (bool)(($u['mfa']['enabled'] ?? false))],
        'updated_at' => (string)($u['updated_at'] ?? ''),
        'created_at' => (string)($u['created_at'] ?? ''),
      ];
    }

    api_json(['ok' => true, 'users' => $out, 'server_time' => now_iso()]);
  }

  
  case 'admin_user_upsert': {
    $me = require_logged_in($store);
    require_csrf();
    $data = read_json_body();
    $adminRoles = admin_roles();
    $meRole = migrate_role((string)($me['role'] ?? ''));
    if (!in_array($meRole, $adminRoles, true) && !in_array((string)($me['role'] ?? ''), $adminRoles, true)) api_json(['ok' => false, 'error' => 'forbidden'], 403);

    $username = strtolower(trim((string)($data['username'] ?? '')));
    if ($username === '' || !preg_match('/^[a-z0-9][a-z0-9._-]{2,32}$/', $username)) {
      api_json(['ok' => false, 'error' => 'bad_username'], 400);
    }

    $name = trim((string)($data['name'] ?? ''));
    $dept = trim((string)($data['dept'] ?? ''));
    $title = trim((string)($data['title'] ?? ''));
    $role = trim((string)($data['role'] ?? 'employee'));
    $active = isset($data['active']) ? (bool)$data['active'] : true;
    $cccd = trim((string)($data['cccd'] ?? ''));
    $phone = trim((string)($data['phone'] ?? ''));
    $personal_email = trim((string)($data['personal_email'] ?? ''));

    $passwordProvided = isset($data['password']) && trim((string)$data['password']) !== '';
    $plainPassword = $passwordProvided ? (string)$data['password'] : null;

    if ($passwordProvided) {
      [$okPw, $whyPw] = password_policy((string)$plainPassword);
      if (!$okPw) api_json(['ok' => false, 'error' => 'bad_password', 'message' => $whyPw], 400);
    }

    $users = $store['users'] ?? [];
    $found = false;

    foreach ($users as $i => $u) {
      if (isset($u['username']) && strtolower((string)$u['username']) === $username) {
        $found = true;
        $users[$i]['name'] = $name !== '' ? $name : ($users[$i]['name'] ?? $username);
        $users[$i]['dept'] = $dept;
        $users[$i]['title'] = $title;
        $users[$i]['role'] = $role;
        $users[$i]['active'] = $active;
        $users[$i]['cccd'] = $cccd;
        $users[$i]['phone'] = $phone;
        $users[$i]['personal_email'] = $personal_email;
        $users[$i]['updated_at'] = now_iso();

        if ($passwordProvided) {
          $users[$i]['password_hash'] = password_hash((string)$plainPassword, PASSWORD_DEFAULT);
          // Reset MFA on password set/reset (user must enroll again)
          unset($users[$i]['mfa']);
          // Clear any legacy keys
          unset($users[$i]['mfa_enabled'], $users[$i]['mfa_secret'], $users[$i]['pin']);
        }
        break;
      }
    }

    if (!$found) {
      if (!$passwordProvided) {
        $plainPassword = random_password(12);
      }

      $users[] = [
        'username' => $username,
        'password_hash' => password_hash((string)$plainPassword, PASSWORD_DEFAULT),
        'name' => $name !== '' ? $name : $username,
        'role' => $role,
        'dept' => $dept,
        'title' => $title,
        'active' => $active,
        'cccd' => $cccd,
        'phone' => $phone,
        'personal_email' => $personal_email,
        'mfa' => ['enabled' => false],
        'created_at' => now_iso(),
        'updated_at' => now_iso(),
      ];
    }

    $store['users'] = $users;
    try{
      users_save($USERS_FILE, $store);
    }catch(Throwable $e){
      api_json(['ok'=>false,'error'=>'users_save_failed'], 500);
    }

    $updated = find_user_by_username($store, $username);
    api_json([
      'ok' => true,
      'user' => $updated ? sanitize_user_for_client($updated) : null,
      'temp_password' => ($found && !$passwordProvided) ? null : $plainPassword,
    ]);
  }

  case 'admin_user_delete': {
    $me = require_logged_in($store);
    require_csrf();
    $data = read_json_body();
    $adminRoles = admin_roles();
    $meRole = migrate_role((string)($me['role'] ?? ''));
    if (!in_array($meRole, $adminRoles, true) && !in_array((string)($me['role'] ?? ''), $adminRoles, true)) {
      api_json(['ok' => false, 'error' => 'forbidden'], 403);
    }

    $username = strtolower(trim((string)($data['username'] ?? '')));
    if ($username === '') api_json(['ok' => false, 'error' => 'bad_request'], 400);

    // Prevent self-deletion
    $meUsername = strtolower((string)($me['username'] ?? ''));
    if ($meUsername === $username) {
      api_json(['ok' => false, 'error' => 'cannot_delete_self'], 400);
    }

    $users = $store['users'] ?? [];
    $found = false;
    $newUsers = [];
    foreach ($users as $u) {
      if (isset($u['username']) && strtolower((string)$u['username']) === $username) {
        $found = true;
        continue; // skip = remove
      }
      $newUsers[] = $u;
    }

    if (!$found) api_json(['ok' => false, 'error' => 'user_not_found'], 404);

    $store['users'] = $newUsers;
    users_save($USERS_FILE, $store);
    api_json(['ok' => true, 'deleted' => $username]);
  }

  case 'admin_user_reset_password': {
    $me = require_logged_in($store);
    require_csrf();
    $data = read_json_body();
    $adminRoles = admin_roles();
    $_mRole = migrate_role((string)($me['role'] ?? ''));
    if (!in_array($_mRole, $adminRoles, true) && !in_array((string)($me['role'] ?? ''), $adminRoles, true)) api_json(['ok' => false, 'error' => 'forbidden'], 403);

    $username = strtolower(trim((string)($data['username'] ?? '')));
    if ($username === '') api_json(['ok' => false, 'error' => 'bad_request'], 400);

    $users = $store['users'] ?? [];
    $found = false;
    $newPw = random_password(12);

    foreach ($users as $i => $u) {
      if (isset($u['username']) && strtolower((string)$u['username']) === $username) {
        $found = true;
        $users[$i]['password_hash'] = password_hash($newPw, PASSWORD_DEFAULT);
        $users[$i]['updated_at'] = now_iso();
        // Reset MFA enrollment (force re-enroll)
        unset($users[$i]['mfa']);
        unset($users[$i]['mfa_enabled'], $users[$i]['mfa_secret'], $users[$i]['pin']);
        break;
      }
    }

    if (!$found) api_json(['ok' => false, 'error' => 'not_found'], 404);

    $store['users'] = $users;
    try{
      users_save($USERS_FILE, $store);
    }catch(Throwable $e){
      api_json(['ok'=>false,'error'=>'users_save_failed'], 500);
    }

    api_json(['ok' => true, 'username' => $username, 'temp_password' => $newPw]);
  }

case 'auth_login': {
    if ($method !== 'POST') api_json(['ok' => false, 'error' => 'method_not_allowed'], 405);
    $data = read_json_body();
    $username = strtolower(trim((string)($data['username'] ?? '')));
    $password = (string)($data['password'] ?? '');
    $code = trim((string)($data['code'] ?? ($data['otp'] ?? '')));

    rate_limit_check('login_' . client_ip(), 30, 300, $RL_DIR);
    rate_limit_check('login_u_' . $username, 30, 300, $RL_DIR);

    if (!is_array($store)) api_json(['ok' => false, 'error' => 'system_not_initialized'], 500);

    $user = find_user_by_username($store, $username);
    if (!$user || !($user['active'] ?? true)) {
      usleep(150000);
      api_json(['ok' => false, 'error' => 'invalid_credentials'], 401);
    }

    $hash = (string)($user['password_hash'] ?? '');
    if ($hash === '' || !password_verify($password, $hash)) {
      usleep(150000);
      api_json(['ok' => false, 'error' => 'invalid_credentials'], 401);
    }

    $settings = $store['settings'] ?? [];
    $requireMfa = (bool)($settings['require_mfa'] ?? true);

    $mfa = $user['mfa'] ?? [];
    $mfaEnabled = (bool)($mfa['enabled'] ?? false);

    if ($mfaEnabled) {
  $secretB32 = (string)($mfa['secret_b32'] ?? '');

  // If client already supplies OTP in the same login call, verify and finish login (no separate verify call needed)
  if ($code !== '') {
    if ($secretB32 === '' || !totp_verify($secretB32, $code, 1, 30, 6)) {
      api_json(['ok' => false, 'error' => 'invalid_code'], 401);
    }

    set_authenticated_session($username);

    $user['last_login'] = now_iso();
    $user['updated_at'] = now_iso();
    update_user($store, $user);
    try{
      users_save($USERS_FILE, $store);
    }catch(Throwable $e){
      api_json(['ok'=>false,'error'=>'users_save_failed'], 500);
    }

    api_json([
      'ok' => true,
      'logged_in' => true,
      'user' => sanitize_user_for_client($user),
      'csrf_token' => csrf_token(),
    ]);
  }

  set_preauth_session($username);
  api_json([
    'ok' => true,
    'mfa_required' => true,
    'enroll_required' => false,
    'message' => 'Enter your authenticator code',
    'pending_expires_in' => pending_auth_ttl_seconds(),
    'csrf_token' => csrf_token(),
  ]);
}


    if ($requireMfa) {
      set_preauth_session($username);
      $secretBin = random_bytes(20);
      $secretB32 = base32_encode($secretBin);

      $_SESSION['enroll_user'] = $username;
      $_SESSION['enroll_secret'] = $secretB32;
      $_SESSION['enroll_started'] = time();

      $issuer = (string)($settings['issuer'] ?? 'HESEM QMS');

      api_json([
        'ok' => true,
        'mfa_required' => false,
        'enroll_required' => true,
        'issuer' => $issuer,
        'account' => $username,
        'secret' => $secretB32,
        'otpauth_url' => otpauth_url($issuer, $username, $secretB32),
        'message' => 'Enroll MFA in your Authenticator app',
        'pending_expires_in' => pending_auth_ttl_seconds(),
        'csrf_token' => csrf_token(),
      ]);
    }

    // No MFA required
    set_authenticated_session($username);
    $user['last_login'] = now_iso();
    $user['updated_at'] = now_iso();
    update_user($store, $user);
    try{
      users_save($USERS_FILE, $store);
    }catch(Throwable $e){
      api_json(['ok'=>false,'error'=>'users_save_failed'], 500);
    }

    api_json([
      'ok' => true,
      'logged_in' => true,
      'user' => sanitize_user_for_client($user),
      'csrf_token' => csrf_token(),
    ]);
  }

  case 'auth_mfa_verify': {
    if ($method !== 'POST') api_json(['ok' => false, 'error' => 'method_not_allowed'], 405);
    if (!is_array($store)) api_json(['ok' => false, 'error' => 'system_not_initialized'], 500);

    $data = read_json_body();
    $code = (string)($data['code'] ?? '');

    rate_limit_check('mfa_' . client_ip(), 60, 300, $RL_DIR);

$username = (string)($_SESSION['preauth_user'] ?? '');
$preauthStarted = (int)($_SESSION['preauth_started'] ?? 0);
if ($username !== '' && pending_auth_remaining_seconds($preauthStarted) <= 0) {
  clear_pending_auth_session_state();
  api_json(['ok' => false, 'error' => 'mfa_expired'], 401);
}
if ($username === '') {
  // Fallback (compatibility): if session was lost between steps, allow verify by re-supplying username/password.
  $u = strtolower(trim((string)($data['username'] ?? '')));
  $p = (string)($data['password'] ?? '');

  if ($u === '' || $p === '') api_json(['ok' => false, 'error' => 'unauthorized'], 401);

  $uRec = find_user_by_username($store, $u);
  if (!$uRec || !($uRec['active'] ?? true)) api_json(['ok' => false, 'error' => 'unauthorized'], 401);

  $h = (string)($uRec['password_hash'] ?? '');
  if ($h === '' || !password_verify($p, $h)) { usleep(150000); api_json(['ok' => false, 'error' => 'unauthorized'], 401); }

  $username = $u;
}

    $user = find_user_by_username($store, $username);
    if (!$user) api_json(['ok' => false, 'error' => 'unauthorized'], 401);

    $mfa = $user['mfa'] ?? [];
    $enabled = (bool)($mfa['enabled'] ?? false);
    $secretB32 = (string)($mfa['secret_b32'] ?? '');

    if (!$enabled || $secretB32 === '') api_json(['ok' => false, 'error' => 'mfa_not_enabled'], 400);

    if (!totp_verify($secretB32, $code, 1, 30, 6)) api_json(['ok' => false, 'error' => 'invalid_code'], 401);

    set_authenticated_session($username);

    $user['last_login'] = now_iso();
    $user['updated_at'] = now_iso();
    update_user($store, $user);
    try{
      users_save($USERS_FILE, $store);
    }catch(Throwable $e){
      api_json(['ok'=>false,'error'=>'users_save_failed'], 500);
    }

    api_json([
      'ok' => true,
      'logged_in' => true,
      'user' => sanitize_user_for_client($user),
      'csrf_token' => csrf_token(),
    ]);
  }

  case 'auth_enroll_verify': {
    if ($method !== 'POST') api_json(['ok' => false, 'error' => 'method_not_allowed'], 405);
    if (!is_array($store)) api_json(['ok' => false, 'error' => 'system_not_initialized'], 500);

    $data = read_json_body();
    $code = (string)($data['code'] ?? '');

    rate_limit_check('enroll_' . client_ip(), 60, 300, $RL_DIR);

    $username = (string)($_SESSION['enroll_user'] ?? '');
    $secretB32 = (string)($_SESSION['enroll_secret'] ?? '');
    $started = (int)($_SESSION['enroll_started'] ?? 0);

    if ($username === '' || $secretB32 === '' || pending_auth_remaining_seconds($started) <= 0) {
      clear_pending_auth_session_state();
      api_json(['ok' => false, 'error' => 'enroll_expired'], 401);
    }

    if (!totp_verify($secretB32, $code, 1, 30, 6)) api_json(['ok' => false, 'error' => 'invalid_code'], 401);

    $user = find_user_by_username($store, $username);
    if (!$user) api_json(['ok' => false, 'error' => 'user_not_found'], 404);

    $user['mfa'] = [
      'enabled' => true,
      'secret_b32' => $secretB32,
      'enabled_at' => now_iso(),
    ];
    $user['updated_at'] = now_iso();
    update_user($store, $user);
    try{
      users_save($USERS_FILE, $store);
    }catch(Throwable $e){
      api_json(['ok'=>false,'error'=>'users_save_failed'], 500);
    }

    set_authenticated_session($username);

    api_json([
      'ok' => true,
      'logged_in' => true,
      'user' => sanitize_user_for_client($user),
      'csrf_token' => csrf_token(),
      'message' => 'MFA enabled',
    ]);
  }

  case 'auth_logout': {
    if ($method !== 'POST') api_json(['ok' => false, 'error' => 'method_not_allowed'], 405);
    require_csrf();
    destroy_auth_session();
    api_json(['ok' => true, 'logged_in' => false]);
  }

  // ═══════════════════════════════════════════════════════════
  // LIVE FOLDER SCANNER — auto-detect documents from filesystem
  // ═══════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════
  // DELETE (ARCHIVE) DOC — move to _Deleted archive
  // ═══════════════════════════════════════════════════════════
  case 'delete_doc': {
    if (!is_array($store)) api_json(['ok' => false, 'error' => 'system_not_initialized'], 500);
    $me = require_logged_in($store);
    require_csrf();
    if (!role_can_create_docs($me, $ROLE_PERMS_FILE)) api_json(['ok' => false, 'error' => 'forbidden'], 403);

    $data = read_json_body();
    $code = strtoupper(trim((string)($data['code'] ?? '')));
    if ($code === '' || !preg_match('/^[A-Z0-9-]{3,40}$/', $code)) api_json(['ok' => false, 'error' => 'missing_code'], 400);

    try {
      // Find the doc file safely. One unreadable child folder must not abort the whole delete flow.
      $found = null;
      $foundRel = '';
      $iter = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($ROOT_DIR, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::SELF_FIRST,
        RecursiveIteratorIterator::CATCH_GET_CHILD
      );
      foreach ($iter as $file) {
        if (!$file || !$file->isFile()) continue;
        $filename = (string)$file->getFilename();
        if (!str_ends_with($filename, '.html')) continue;
        $relFound = rel_path($file->getPathname(), $ROOT_DIR);
        if (
          str_starts_with($relFound, '01-QMS-Portal/')
          || str_starts_with($relFound, 'assets/')
          || str_starts_with($relFound, '11-Glossary/')
        ) {
          continue;
        }
        if (!filename_matches_doc_code($filename, $code)) continue;
        $found = $file->getPathname();
        $foundRel = $relFound;
        break;
      }
      if (!$found || !is_file($found)) api_json(['ok' => false, 'error' => 'doc_not_found'], 404);
      if (!is_inside_root($found, $ROOT_DIR)) api_json(['ok' => false, 'error' => 'invalid_path'], 400);

      // Create _Deleted archive folder
      $deletedDir = $ROOT_DIR . '/_Deleted';
      ensure_dir($deletedDir);
      $ts = date('Ymd-His');
      $basename = basename($found);
      $archiveName = $ts . '__' . $basename;
      $archivedDocAbs = $deletedDir . '/' . $archiveName;

      // Move doc file
      if (!@rename($found, $archivedDocAbs)) {
        api_json(['ok' => false, 'error' => 'move_failed'], 500);
      }

      // Move related _Archive files
      $docDir = dirname($found);
      $docFolderRel = rel_path($docDir, $ROOT_DIR);
      $stem = pathinfo($basename, PATHINFO_FILENAME);
      $archiveDir = $docDir . '/_Archive';
      if (is_dir($archiveDir)) {
        $archiveItems = @scandir($archiveDir);
        if (is_array($archiveItems)) {
          foreach ($archiveItems as $af) {
            if (!is_string($af) || $af === '' || $af[0] === '.') continue;
            if (str_starts_with($af, $stem)) {
              @rename($archiveDir . '/' . $af, $deletedDir . '/' . $ts . '__archive__' . $af);
            }
          }
        }
      }

      // Move doc state
      $stateFile = $archiveDir . '/' . $stem . '.state.json';
      if (is_file($stateFile)) {
        @rename($stateFile, $deletedDir . '/' . $ts . '__' . $stem . '.state.json');
      }

      // Log deletion - non-critical. Never fail the delete because the log file is unreadable.
      try {
        $logFile = $deletedDir . '/_deletion_log.json';
        $log = [];
        if (is_file($logFile)) {
          $rawLog = @file_get_contents($logFile);
          if (is_string($rawLog) && $rawLog !== '') {
            $decodedLog = json_decode($rawLog, true);
            if (is_array($decodedLog)) $log = $decodedLog;
          }
        }
        $log[] = [
          'type' => 'document',
          'code' => $code,
          'file' => $basename,
          'archived_as' => $archiveName,
          'deleted_by' => $me['name'] ?? $me['username'] ?? '',
          'date' => date('Y-m-d H:i:s'),
          'original_path' => $foundRel,
        ];
        @file_put_contents($logFile, json_encode($log, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), LOCK_EX);
      } catch (Throwable $e) {
        @error_log('[delete_doc][log] ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
      }

      // Remove from custom_docs.json
      try {
        $custom = load_custom_docs($CUSTOM_DOCS_FILE);
        $custom = array_values(array_filter($custom, function($cd) use ($code, $foundRel, $docFolderRel) {
          if (!is_array($cd)) return true;
          $docCode = strtoupper((string)($cd['code'] ?? ''));
          if ($docCode === $code) return false;
          $path = (string)($cd['path'] ?? '');
          $folder = (string)($cd['folder'] ?? '');
          if ($path !== '' && $foundRel !== '' && $path === $foundRel) return false;
          if ($folder !== '' && $docFolderRel !== '' && $folder === $docFolderRel && ($path === '' || $path === $foundRel)) return false;
          return true;
        }));
        save_custom_docs($CUSTOM_DOCS_FILE, $custom);
      } catch (Throwable $e) {
        @error_log('[delete_doc][custom_docs] ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
      }

      // Remove deleted code from visibility registry
      try {
        $hidden = load_doc_visibility($DOC_VIS_FILE);
        $hidden = array_values(array_filter($hidden, function($hiddenCode) use ($code) {
          return strtoupper((string)$hiddenCode) !== $code;
        }));
        save_doc_visibility($DOC_VIS_FILE, $hidden);
      } catch (Throwable $e) {
        @error_log('[delete_doc][visibility] ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
      }

      // Invalidate cache
      invalidate_scan_cache($DATA_DIR);
      api_json(['ok' => true, 'code' => $code, 'archived_as' => $archiveName]);
    } catch (Throwable $e) {
      @error_log('[delete_doc] ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
      api_json(['ok' => false, 'error' => 'delete_failed'], 500);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // DELETE (ARCHIVE) FOLDER — move to _Deleted archive
  // ═══════════════════════════════════════════════════════════
  case 'delete_folder': {
    if (!is_array($store)) api_json(['ok' => false, 'error' => 'system_not_initialized'], 500);
    $me = require_logged_in($store);
    require_csrf();
    if (!role_can_create_docs($me, $ROLE_PERMS_FILE)) api_json(['ok' => false, 'error' => 'forbidden'], 403);

    $data = read_json_body();
    $folderPathRaw = trim((string)($data['folder_path'] ?? ''));
    if ($folderPathRaw === '') api_json(['ok' => false, 'error' => 'missing_folder_path'], 400);
    try {
      $folderPath = safe_rel_path($folderPathRaw);
    } catch (Throwable $e) {
      api_json(['ok' => false, 'error' => 'invalid_path'], 400);
    }
    if (is_reserved_root_segment($folderPath)) api_json(['ok' => false, 'error' => 'cannot_delete_system_folder'], 403);

    try {
      $folderAbs = join_in_root($ROOT_DIR, $folderPath);
    } catch (Throwable $e) {
      api_json(['ok' => false, 'error' => 'invalid_path'], 400);
    }
    if (!is_inside_root($folderAbs, $ROOT_DIR)) api_json(['ok' => false, 'error' => 'invalid_path'], 400);
    if (!is_dir($folderAbs)) api_json(['ok' => false, 'error' => 'folder_not_found'], 404);

    // Safety: don't allow deleting top-level system folders
    $topLevelProtected = ['01-QMS-Portal', 'assets', '11-Glossary',
      '02-Tai-Lieu-He-Thong', '03-Tai-Lieu-Van-Hanh', '04-Bieu-Mau', '10-Training-Academy'];
    $folderName = basename($folderPath);
    if (in_array($folderPath, $topLevelProtected) || in_array($folderName, $topLevelProtected)) {
      api_json(['ok' => false, 'error' => 'cannot_delete_system_folder'], 403);
    }
    // Don't allow deleting L1 folders under system containers
    $l1Protected = ['01-SOPs', '02-Work-Instructions', '03-Reference',
      '01-Quality-Manual', '02-Policies-Objectives', '03-Organization',
      '01-Competency-System', '02-Training-Content', '03-System-Operations', '04-Templates-Tools'];
    if (in_array($folderName, $l1Protected)) {
      api_json(['ok' => false, 'error' => 'cannot_delete_system_folder'], 403);
    }

    try {
      // Count files in folder. This must never hard-crash deletion if one child is unreadable.
      $fileCount = 0;
      $docCodes = [];
      $iter2 = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($folderAbs, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::SELF_FIRST,
        RecursiveIteratorIterator::CATCH_GET_CHILD
      );
      foreach ($iter2 as $file) {
        if ($file->isFile() && str_ends_with($file->getFilename(), '.html') && $file->getFilename() !== 'index.html') {
          $fileCount++;
          $docCode = strtoupper(scan_extract_code($file->getFilename()));
          if ($docCode !== '') $docCodes[$docCode] = true;
        }
      }

      // Create _Deleted archive folder
      $deletedDir = $ROOT_DIR . '/_Deleted';
      ensure_dir($deletedDir);
      $ts = date('Ymd-His');
      $archiveName = $ts . '__folder__' . str_replace('/', '__', $folderPath);
      $targetDir = $deletedDir . '/' . $archiveName;

      // Move entire folder (shell-free fallback to keep shared hosting safer)
      if (!move_dir_fallback($folderAbs, $targetDir)) {
        api_json(['ok' => false, 'error' => 'move_failed'], 500);
      }

      // Log deletion — non-critical. Never fail the delete result because of log file issues.
      try {
        $logFile = $deletedDir . '/_deletion_log.json';
        $log = [];
        if (is_file($logFile)) {
          $rawLog = @file_get_contents($logFile);
          if (is_string($rawLog) && $rawLog !== '') {
            $decodedLog = json_decode($rawLog, true);
            if (is_array($decodedLog)) $log = $decodedLog;
          }
        }
        $log[] = [
          'type' => 'folder',
          'folder_path' => $folderPath,
          'archived_as' => $archiveName,
          'file_count' => $fileCount,
          'deleted_by' => $me['name'] ?? $me['username'] ?? '',
          'date' => date('Y-m-d H:i:s'),
        ];
        @file_put_contents($logFile, json_encode($log, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), LOCK_EX);
      } catch (Throwable $e) {
        @error_log('[delete_folder][log] ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
      }

      // Remove docs from custom_docs.json
      try {
        $custom = load_custom_docs($CUSTOM_DOCS_FILE);
        $custom = array_filter($custom, function($cd) use ($folderPath, $docCodes) {
          if (!is_array($cd)) return true;
          $code = strtoupper((string)($cd['code'] ?? ''));
          if ($code !== '' && isset($docCodes[$code])) return false;
          $path = (string)($cd['path'] ?? '');
          $folder = (string)($cd['folder'] ?? '');
          if ($path !== '' && path_equals_or_child($path, $folderPath)) return false;
          if ($folder !== '' && path_equals_or_child($folder, $folderPath)) return false;
          return true;
        });
        save_custom_docs($CUSTOM_DOCS_FILE, array_values($custom));
      } catch (Throwable $e) {
        @error_log('[delete_folder][custom_docs] ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
      }

      // Remove deleted doc codes from visibility registry
      try {
        if (!empty($docCodes)) {
          $hidden = load_doc_visibility($DOC_VIS_FILE);
          $hidden = array_values(array_filter($hidden, function($code) use ($docCodes) {
            return !isset($docCodes[strtoupper((string)$code)]);
          }));
          save_doc_visibility($DOC_VIS_FILE, $hidden);
        }
      } catch (Throwable $e) {
        @error_log('[delete_folder][visibility] ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
      }

      // Invalidate cache
      invalidate_scan_cache($DATA_DIR);
      api_json(['ok' => true, 'folder' => $folderPath, 'file_count' => $fileCount, 'doc_codes' => array_values(array_keys($docCodes)), 'archived_as' => $archiveName]);
    } catch (Throwable $e) {
      @error_log('[delete_folder] ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
      api_json(['ok' => false, 'error' => 'delete_failed'], 500);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // DYNAMIC FOLDER SCANNER — auto-detect from filesystem
  // Convention: XX-Name folders (XX=01-50 visible, XX>50 hidden)
  // ═══════════════════════════════════════════════════════════
  case 'create_folder': {
    if (!is_array($store)) api_json(['ok' => false, 'error' => 'system_not_initialized'], 500);
    $me = require_logged_in($store);
    require_csrf();
    if (!role_can_create_docs($me, $ROLE_PERMS_FILE)) api_json(['ok' => false, 'error' => 'forbidden'], 403);

    try {
      $data = read_json_body();
      $parentRaw = trim((string)($data['parent'] ?? ''));
      if ($parentRaw === '') {
        $parent = '';
      } else {
        try {
          $parent = safe_rel_path($parentRaw);
        } catch (Throwable $e) {
          api_json(['ok' => false, 'error' => 'invalid_parent'], 400);
        }
      }
      $name = trim((string)($data['name'] ?? ''));
      if ($name === '' || !preg_match('/^\d{2}-[A-Za-z0-9_-]+$/', $name)) {
        api_json(['ok' => false, 'error' => 'invalid_folder_name'], 400);
      }
      $targetRel = ($parent !== '' ? $parent . '/' : '') . $name;
      if (is_reserved_root_segment($targetRel)) api_json(['ok' => false, 'error' => 'invalid_parent'], 400);

      $targetDir = join_in_root($ROOT_DIR, $targetRel);
      if (!is_inside_root($targetDir, $ROOT_DIR)) api_json(['ok' => false, 'error' => 'invalid_parent'], 400);
      if (is_dir($targetDir)) api_json(['ok' => false, 'error' => 'folder_exists'], 400);
      if (!@mkdir($targetDir, 0755, true)) api_json(['ok' => false, 'error' => 'mkdir_failed'], 500);

      invalidate_scan_cache($DATA_DIR);
      api_json(['ok' => true, 'path' => $targetRel]);

    } catch (Throwable $e) {
      @error_log('[create_folder] ' . $e->getMessage());
      api_json(['ok' => false, 'error' => 'create_failed'], 500);
    }
  }

  case 'move_doc': {
    if (!is_array($store)) api_json(['ok' => false, 'error' => 'system_not_initialized'], 500);
    $me = require_logged_in($store);
    require_csrf();
    if (!role_can_create_docs($me, $ROLE_PERMS_FILE)) api_json(['ok' => false, 'error' => 'forbidden'], 403);

    $data = read_json_body();
    $code = strtoupper(trim((string)($data['code'] ?? '')));
    $targetFolderRaw = trim((string)($data['target_folder'] ?? ''));
    if ($targetFolderRaw === '') {
      $targetFolder = '';
    } else {
      try {
        $targetFolder = safe_rel_path($targetFolderRaw);
      } catch (Throwable $e) {
        api_json(['ok' => false, 'error' => 'invalid_target_folder'], 400);
      }
    }
    if ($code === '' || $targetFolder === '') api_json(['ok' => false, 'error' => 'missing_params'], 400);
    if (is_reserved_root_segment($targetFolder)) api_json(['ok' => false, 'error' => 'invalid_target_folder'], 400);

    // Find current doc
    $doc = null;
    foreach (($DOCS_CACHE ?? []) as $d) { if (strtoupper($d['code'] ?? '') === $code) { $doc = $d; break; } }
    // If not in cache, scan
    if (!$doc) {
      // Quick scan to find the file
      $found = null;
      $iter = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($ROOT_DIR, RecursiveDirectoryIterator::SKIP_DOTS));
      foreach ($iter as $file) {
        if ($file->isFile() && str_ends_with($file->getFilename(), '.html')) {
          $relFound = rel_path($file->getPathname(), $ROOT_DIR);
          if (
            str_starts_with($relFound, '01-QMS-Portal/')
            || str_starts_with($relFound, 'assets/')
            || str_starts_with($relFound, '11-Glossary/')
          ) {
            continue;
          }
        if (!filename_matches_doc_code($file->getFilename(), $code)) continue;
          $found = $file->getPathname();
          break;
        }
      }
      if (!$found) api_json(['ok' => false, 'error' => 'doc_not_found'], 404);
      $oldPath = $found;
    } else {
      $oldPath = join_in_root($ROOT_DIR, (string)($doc['path'] ?? ''));
    }

    if (!is_inside_root($oldPath, $ROOT_DIR)) api_json(['ok' => false, 'error' => 'invalid_path'], 400);
    if (!is_file($oldPath)) api_json(['ok' => false, 'error' => 'file_not_found'], 404);
    $oldRel = rel_path($oldPath, $ROOT_DIR);
    $targetDir = join_in_root($ROOT_DIR, $targetFolder);
    if (!is_inside_root($targetDir, $ROOT_DIR)) api_json(['ok' => false, 'error' => 'invalid_target_folder'], 400);
    if (!is_dir($targetDir)) api_json(['ok' => false, 'error' => 'target_folder_not_found'], 404);

    $filename = basename($oldPath);
    $newPath = $targetDir . '/' . $filename;
    $newRel = $targetFolder . '/' . $filename;
    if ($oldRel === $newRel) api_json(['ok' => true, 'new_path' => $newRel, 'noop' => true]);
    if (is_file($newPath)) api_json(['ok' => false, 'error' => 'file_exists_in_target'], 400);

    if (!@rename($oldPath, $newPath)) api_json(['ok' => false, 'error' => 'move_failed'], 500);
    rename_doc_store_assets($ROOT_DIR, $oldRel, $newRel, $code);

    // Update cross-references that store full relative paths
    $updated = 0;
    $scanIter = new RecursiveIteratorIterator(
      new RecursiveDirectoryIterator($ROOT_DIR, FilesystemIterator::SKIP_DOTS | FilesystemIterator::UNIX_PATHS),
      RecursiveIteratorIterator::LEAVES_ONLY
    );
    foreach ($scanIter as $sf) {
      if (!$sf->isFile() || $sf->getExtension() !== 'html') continue;
      $html = @file_get_contents($sf->getPathname());
      if ($html === false || $html === '') continue;
      $srcRel = rel_path($sf->getPathname(), $ROOT_DIR);
      $nextHtml = replace_quoted_path_token($html, $oldRel, $newRel);
      try {
        $oldLocalRef = relative_ref_from($srcRel, $oldRel);
        $newLocalRef = relative_ref_from($srcRel, $newRel);
        $nextHtml = replace_quoted_path_token($nextHtml, $oldLocalRef, $newLocalRef);
      } catch (Throwable $e) {}
      if ($nextHtml !== $html) {
        @file_put_contents($sf->getPathname(), $nextHtml);
        $updated++;
      }
    }

    // Invalidate cache
    invalidate_scan_cache($DATA_DIR);

    // Update custom_docs.json
    try {
      $custom = load_custom_docs($CUSTOM_DOCS_FILE);
      foreach ($custom as &$cd) {
        if (strtoupper($cd['code'] ?? '') === $code) {
          $cd['path'] = $newRel;
          $cd['folder'] = $targetFolder;
        }
      }
      unset($cd);
      save_custom_docs($CUSTOM_DOCS_FILE, $custom);
    } catch (Throwable $e) {}

    api_json(['ok' => true, 'new_path' => $newRel, 'updated_files' => $updated]);
  }

  case 'scan_folders': {
    if (!is_array($store)) api_json(['ok' => false, 'error' => 'system_not_initialized'], 500);
    $me = require_logged_in($store);
    $displayConfig = portal_load_display_config($PORTAL_DISPLAY_CONFIG_FILE);
    $allowedExtensions = portal_display_config_enabled_extensions($displayConfig);

    // Cache
    $cacheFile = $DATA_DIR . '/scan_cache.json';
    $cacheMaxAge = 60;
    $bustCache = isset($_GET['bust']) || isset($_POST['bust']);
    if (!$bustCache && is_file($cacheFile)) {
      $cacheAge = time() - filemtime($cacheFile);
      if ($cacheAge < $cacheMaxAge) {
        $cached = json_decode(file_get_contents($cacheFile), true);
        $cachedExtensions = portal_normalize_extension_list($cached['extension_filter'] ?? []);
        if ($cached && $cachedExtensions === $allowedExtensions) {
          $rawDocs = is_array($cached['docs'] ?? null) ? $cached['docs'] : [];
          $hidden = load_doc_visibility($DOC_VIS_FILE);
          $visibleDocs = portal_filter_docs_for_user($rawDocs, $me, $PORTAL_CONFIG_JS_FILE, $hidden, $displayConfig);
          api_json([
            'ok' => true,
            'docs' => $visibleDocs,
            'tree' => $cached['tree'] ?? [],
            'count' => count($visibleDocs),
            'cached' => true,
            'display_config' => portal_display_config_public_payload($displayConfig),
          ]);
        }
      }
    }

    $SKIP_DIRS = ['01-QMS-Portal', 'assets', '11-Glossary', 'archive', '_Archive', '_archive', '_Deleted', '.git'];
    $docs = [];
    $tree = [];
    $seen = [];

    $SCAN_EXCLUDE_FILE = $DATA_DIR . '/portal_scan_exclusions.json';
    function load_portal_scan_exclusions(string $file): array {
      $fallback = ['exact'=>[], 'prefixes'=>[], 'regex'=>[]];
      if (!is_file($file)) return $fallback;
      $raw = @file_get_contents($file);
      if ($raw === false || $raw === '') return $fallback;
      $json = json_decode($raw, true);
      if (!is_array($json)) return $fallback;
      return [
        'exact' => array_values(array_filter(array_map('strval', $json['exact'] ?? []))),
        'prefixes' => array_values(array_filter(array_map('strval', $json['prefixes'] ?? []))),
        'regex' => array_values(array_filter(array_map('strval', $json['regex'] ?? []))),
      ];
    }
    function scan_should_skip_filename(string $fn, array $cfg): bool {
      $name = strtolower(trim($fn));
      if ($name === '') return false;
      foreach (($cfg['exact'] ?? []) as $item) {
        if ($name === strtolower(trim((string)$item))) return true;
      }
      foreach (($cfg['prefixes'] ?? []) as $item) {
        $prefix = strtolower(trim((string)$item));
        if ($prefix !== '' && str_starts_with($name, $prefix)) return true;
      }
      foreach (($cfg['regex'] ?? []) as $rx) {
        $pattern = (string)$rx;
        if ($pattern !== '' && @preg_match($pattern, $name)) return true;
      }
      return false;
    }
    $scanExclusions = load_portal_scan_exclusions($SCAN_EXCLUDE_FILE);

    $DOC_OWNER_OVERRIDE_FILE = $DATA_DIR . '/doc_owner_overrides.json';
    function load_doc_owner_overrides(string $file): array {
      $fallback = ['exact_codes'=>[], 'path_prefixes'=>[]];
      if (!is_file($file)) return $fallback;
      $raw = @file_get_contents($file);
      if ($raw === false || $raw === '') return $fallback;
      $json = json_decode($raw, true);
      if (!is_array($json)) return $fallback;
      $exact = [];
      foreach (($json['exact_codes'] ?? []) as $code => $owner) {
        $code = strtoupper(trim((string)$code));
        $owner = trim((string)$owner);
        if ($code !== '' && $owner !== '') $exact[$code] = $owner;
      }
      $prefixes = [];
      foreach (($json['path_prefixes'] ?? []) as $prefix => $owner) {
        $prefix = trim((string)$prefix);
        $owner = trim((string)$owner);
        if ($prefix !== '' && $owner !== '') $prefixes[$prefix] = $owner;
      }
      return ['exact_codes' => $exact, 'path_prefixes' => $prefixes];
    }
    function apply_doc_owner_override(string $owner, string $code, string $relPath, array $cfg): string {
      $code = strtoupper(trim($code));
      if ($code !== '' && isset($cfg['exact_codes'][$code])) return (string)$cfg['exact_codes'][$code];
      foreach (($cfg['path_prefixes'] ?? []) as $prefix => $value) {
        if ($prefix !== '' && str_starts_with($relPath, (string)$prefix)) return (string)$value;
      }
      return $owner;
    }
    $docOwnerOverrides = load_doc_owner_overrides($DOC_OWNER_OVERRIDE_FILE);

    // Helper: parse folder number from XX-Name pattern
    // Returns [number, display_name] or [null, name]
    function parse_folder_num(string $name): array {
      if (preg_match('/^(\d{2})-(.+)$/', $name, $m)) {
        return [(int)$m[1], $m[2]];
      }
      return [null, $name];
    }

    // Helper: derive category code from folder name
    // "05-Processes" → "PROC", "07-Forms-Records" → "FRM" etc
    function derive_cat(string $topName): string {
      $map = [
        'Quality-Manual' => 'MAN',
        'Policies-Objectives' => 'POL',
        'SOPs' => 'SOP',
        'Processes' => 'PROC',
        'Work-Instructions' => 'WI',
        'Forms-Records' => 'FRM',
        'Bieu-Mau' => 'FRM',
        'Organization' => 'ORG',
        'Annexes-References' => 'ANNEX',
        'Training-Academy' => 'TRN',
        'Tai-Lieu-He-Thong' => 'SYS',
        'Tai-Lieu-Van-Hanh' => 'OPS',
        'Reference' => 'REF',
      ];
      foreach ($map as $k => $v) {
        if (stripos($topName, $k) !== false) return $v;
      }
      return strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $topName), 0, 6));
    }

    // Smart cat from filename prefix — overrides folder-based cat
    function cat_from_filename(string $fn): ?string {
      $fn = strtolower($fn);
      if (str_starts_with($fn, 'sop-')) return 'SOP';
      if (str_starts_with($fn, 'wi-')) return 'WI';
      if (str_starts_with($fn, 'frm-')) return 'FRM';
      if (str_starts_with($fn, 'ref-')) return 'ANNEX';
      if (str_starts_with($fn, 'qms-man')) return 'MAN';
      if (str_starts_with($fn, 'pol-')) return 'POL';
      if (str_starts_with($fn, 'jd-') || str_starts_with($fn, 'dept-') || str_starts_with($fn, 'raci-') || str_starts_with($fn, 'authority-')) return 'ORG';
      if (str_starts_with($fn, 'proc-')) return 'SOP'; // V9: PROC merged into SOP
      if (str_starts_with($fn, 'annex-')) return 'ANNEX';
      return null; // use folder-based cat
    }

    // Smart cat from subfolder name — for container folders
    function cat_from_subfolder(string $subName): ?string {
      $map = [
        'Quality-Manual' => 'MAN', 'Policies-Objectives' => 'POL',
        'SOPs' => 'SOP', 'Work-Instructions' => 'WI', 'Reference' => 'ANNEX',
        'ANNEX-System' => 'ANNEX', 'ANNEX-Standards' => 'ANNEX', 'ANNEX-Digital' => 'ANNEX',
        'Organization' => 'ORG', 'Org-Chart' => 'ORG', 'Department-Handbooks' => 'ORG',
        'Job-Descriptions' => 'ORG', 'RACI-Authority' => 'ORG', 'Labor-Relations' => 'ORG',
        'Bieu-Mau' => 'FRM',
        'Competency-System' => 'TRN', 'Training-Content' => 'TRN', 'System-Operations' => 'TRN',
      ];
      foreach ($map as $k => $v) {
        if (stripos($subName, $k) !== false) return $v;
      }
      return null;
    }

    // Helper: derive owner from filename prefix
    function derive_owner(string $fn): string {
      $fn = strtolower($fn);
      // V9 new patterns: sop-1xx = QMS, sop-2xx = Sales, etc.
      if (preg_match('/^sop-([1-9])/', $fn, $m)) {
        $s = (int)$m[1];
        $map9 = [1=>'QA/QMS',2=>'Sales',3=>'Engineering',4=>'Purchasing',5=>'Production',6=>'QA/QC',7=>'Warehouse',8=>'HR',9=>'QA/QMS'];
        return $map9[$s] ?? 'QA/QMS';
      }
      if (preg_match('/^wi-([1-9])/', $fn, $m)) {
        $s = (int)$m[1];
        $map9 = [1=>'QA/QMS',2=>'Sales',3=>'Engineering',4=>'Purchasing',5=>'Production',6=>'QA/QC',7=>'Warehouse',8=>'HR',9=>'QA/QMS'];
        return $map9[$s] ?? 'QA/QMS';
      }
      if (preg_match('/^frm-([1-9])/', $fn, $m)) {
        $s = (int)$m[1];
        $map9 = [1=>'QA/QMS',2=>'Sales',3=>'Engineering',4=>'Purchasing',5=>'Production',6=>'QA/QC',7=>'Warehouse',8=>'HR',9=>'QA/QMS'];
        return $map9[$s] ?? 'QA/QMS';
      }
      if (str_starts_with($fn, 'ref-')) return 'QA/QMS';
      if (str_starts_with($fn, 'jd-')) return 'HR';
      if (str_starts_with($fn, 'dept-')) return 'HR';
      if (str_starts_with($fn, 'raci-') || str_starts_with($fn, 'authority-')) return 'QA/QMS';
      // Legacy V8 patterns
      $map = [
        'sop-qms'=>'QA/QMS','proc-cnc'=>'Production','proc-ops'=>'OPS','proc-eng'=>'Engineering',
        'proc-qa'=>'QA/QC','proc-pla'=>'Planning','proc-pur'=>'Purchasing','proc-sal'=>'Sales',
        'proc-whs'=>'Warehouse','proc-mnt'=>'Maintenance','proc-hr'=>'HR','proc-hse'=>'HSE',
        'proc-fin'=>'Finance','proc-it'=>'IT',
        'wi-ops'=>'OPS','wi-cnc'=>'Production',
        'frm-qms'=>'QA/QMS','frm-eng'=>'Engineering','frm-ops'=>'OPS','frm-qa'=>'QA/QC',
        'frm-pur'=>'Purchasing','frm-sal'=>'Sales','frm-whs'=>'Warehouse','frm-mnt'=>'Maintenance',
        'frm-pla'=>'Planning','frm-fin'=>'Finance','frm-hr'=>'HR','frm-hse'=>'HSE',
        'frm-it'=>'IT','frm-cnc'=>'Production',
        'annex-qms'=>'QA/QMS','annex-eng'=>'Engineering','annex-ops'=>'OPS','annex-qa'=>'QA/QC',
        'annex-pur'=>'Purchasing','annex-whs'=>'Warehouse','annex-hr'=>'HR','annex-hse'=>'HSE',
        'annex-it'=>'IT','pol-qms'=>'QA/QMS','qms-man'=>'QA/QMS','qms-gdl'=>'QA/QMS',
      ];
      foreach ($map as $prefix => $ow) {
        if (str_starts_with($fn, $prefix)) return $ow;
      }
      return 'QA/QMS';
    }

    // Helper: extract doc code from filename
    function extract_code(string $fn): string {
      $stem = pathinfo($fn, PATHINFO_FILENAME);
      // V9 patterns: sop-101-xxx, frm-101-xxx, wi-501-xxx, ref-001-xxx
      if (preg_match('/^(sop-\d{3})/i', $stem, $m)) return strtoupper($m[1]);
      if (preg_match('/^(frm-\d{3})/i', $stem, $m)) return strtoupper($m[1]);
      if (preg_match('/^(wi-\d{3})/i', $stem, $m)) return strtoupper($m[1]);
      if (preg_match('/^(ref-\d{3})/i', $stem, $m)) return strtoupper($m[1]);
      // V9 org patterns: jd-xxx, dept-xxx, raci-xxx, authority-xxx
      if (preg_match('/^(jd-[a-z-]+)/i', $stem, $m)) return strtoupper(substr($m[1], 0, 30));
      if (preg_match('/^(dept-[a-z-]+)/i', $stem, $m)) return strtoupper(substr($m[1], 0, 30));
      if (preg_match('/^(raci-[a-z-]+)/i', $stem, $m)) return strtoupper(substr($m[1], 0, 30));
      if (preg_match('/^(authority-[a-z-]+)/i', $stem, $m)) return strtoupper(substr($m[1], 0, 30));
      // V8 legacy patterns
      if (preg_match('/^((?:sop|proc|wi|frm|annex|pol|qms|dept)-[a-z]+-\d+)/i', $stem, $m)) return strtoupper($m[1]);
      if (preg_match('/^(frm-hr-jd-[a-z]+-\d+)/i', $stem, $m)) return strtoupper($m[1]);
      if (preg_match('/^(frm-hr-trn-\d+)/i', $stem, $m)) return strtoupper($m[1]);
      if (preg_match('/^(annex-dep-[a-z]+-\d+)/i', $stem, $m)) return strtoupper($m[1]);
      if (preg_match('/^(annex-(?:job|org)-\d+)/i', $stem, $m)) return strtoupper($m[1]);
      if (preg_match('/^(qms-man-\d+)/i', $stem, $m)) return strtoupper($m[1]);
      if (preg_match('/^(qms-gdl-\d+)/i', $stem, $m)) return strtoupper($m[1]);
      if (preg_match('/^(annex-hr-lab-\d+)/i', $stem, $m)) return 'LAB-' . preg_replace('/.*?(\d+)$/', '$1', strtoupper($m[1]));
      return strtoupper(preg_replace('/[^A-Z0-9-]/i', '-', substr($stem, 0, 40)));
    }

    // Helper: extract title from HTML <title> tag
    function extract_title(string $absFile, string $fallback): string {
      $code = scan_extract_code($fallback);
      return portal_standard_title_from_filename($fallback, $code);
    }

    $append_scanned_doc = function(string $absFile, string $relPath, string $topCat, ?string $subName, string $folderPath) use (&$docs, &$seen, $docOwnerOverrides, $allowedExtensions): bool {
      $fileName = basename($absFile);
      $ext = portal_get_doc_extension($fileName);
      if ($ext === '' || !in_array($ext, $allowedExtensions, true)) return false;
      if (isset($seen[$relPath])) return false;
      $seen[$relPath] = true;

      $code = scan_extract_code($fileName);
      $title = extract_title($absFile, $fileName);
      $owner = apply_doc_owner_override(derive_owner($fileName), $code, $relPath, $docOwnerOverrides);
      $smartCat = scan_classify_doc_cat($topCat, $subName, $fileName);
      $downloadOnly = $ext !== 'html';

      $docs[] = [
        'code' => $code,
        'title' => $title,
        'cat' => $smartCat,
        'path' => $relPath,
        'rev' => '0',
        'status' => 'draft',
        'owner' => $owner,
        'folder' => $folderPath,
        'ext' => $ext,
        'delivery_mode' => $downloadOnly ? 'download' : 'stream',
        'portal_behavior' => $downloadOnly ? 'download_on_open' : 'inline',
        'browser_open_enabled' => !$downloadOnly,
      ];
      return true;
    };

    // ═══ SCAN TOP-LEVEL FOLDERS ═══
    $topDirs = @scandir($ROOT_DIR);
    if (!$topDirs) $topDirs = [];
    sort($topDirs);

    foreach ($topDirs as $topName) {
      if ($topName[0] === '.' || in_array($topName, $SKIP_DIRS)) continue;
      $topAbs = $ROOT_DIR . '/' . $topName;
      if (!is_dir($topAbs)) continue;

      [$topNum, $topLabel] = parse_folder_num($topName);
      if ($topNum === null) continue; // Skip unnumbered folders
      if ($topNum < 2) continue; // 01=Portal, >50=hidden

      $catCode = scan_derive_cat($topLabel);
      $topNode = ['path' => $topName, 'num' => $topNum, 'name' => $topLabel, 'cat' => $catCode, 'subs' => [], 'fileCount' => 0];

      // Scan subfolders
      $subDirs = @scandir($topAbs);
      if (!$subDirs) $subDirs = [];
      sort($subDirs);

      $hasNumberedSubs = false;
      foreach ($subDirs as $subName) {
        if ($subName[0] === '.' || $subName === '_Archive' || $subName === 'index.html') continue;
        $subAbs = $topAbs . '/' . $subName;
        if (!is_dir($subAbs)) continue;

        [$subNum, $subLabel] = parse_folder_num($subName);
        if ($subNum !== null && $subNum >= 1) {
          $hasNumberedSubs = true;
          $subNode = ['path' => $topName . '/' . $subName, 'num' => $subNum, 'name' => $subLabel, 'fileCount' => 0];

          // Scan for deeper numbered subdirs (e.g., 08-Organization/03-Job-Descriptions/01-JD-EXE/)
          $deepDirs = @scandir($subAbs);
          $hasDeepSubs = false;
          $deepNodes = [];
          if ($deepDirs) {
            sort($deepDirs);
            foreach ($deepDirs as $deepName) {
              if ($deepName[0] === '.' || $deepName === '_Archive') continue;
              $deepAbs = $subAbs . '/' . $deepName;
              if (!is_dir($deepAbs)) continue;
              [$deepNum, $deepLabel] = parse_folder_num($deepName);
              if ($deepNum !== null && $deepNum >= 1) {
                $hasDeepSubs = true;
                $deepNode = ['path' => $topName.'/'.$subName.'/'.$deepName, 'num' => $deepNum, 'name' => $deepLabel, 'fileCount' => 0];
                // Scan files in deep dir
                $deepFiles = @scandir($deepAbs);
                if ($deepFiles) foreach ($deepFiles as $fn) {
                  if ($fn[0]==='.'||$fn==='index.html'||$fn[0]==='_') continue;
                  if (scan_should_skip_filename($fn, $scanExclusions)) continue;
                  if (is_dir($deepAbs.'/'.$fn)) continue;
                  $relPath = $topName.'/'.$subName.'/'.$deepName.'/'.$fn;
                  if ($append_scanned_doc($deepAbs.'/'.$fn, $relPath, $catCode, $subName, $topName.'/'.$subName.'/'.$deepName)) {
                    $deepNode['fileCount']++;
                    $subNode['fileCount']++;
                    $topNode['fileCount']++;
                  }
                }
                // ═══ LEVEL 4: Scan subdirs of deep dir (e.g. Job-Descriptions/01-JD-Executive/) ═══
                if ($deepFiles) foreach ($deepFiles as $l4Name) {
                  if ($l4Name[0] === '.' || $l4Name === '_Archive' || $l4Name === 'index.html') continue;
                  $l4Abs = $deepAbs . '/' . $l4Name;
                  if (!is_dir($l4Abs)) continue;
                  [$l4Num, $l4Label] = parse_folder_num($l4Name);
                  if ($l4Num === null) continue;
                  $l4Node = ['path' => $topName.'/'.$subName.'/'.$deepName.'/'.$l4Name, 'num' => $l4Num, 'name' => $l4Label, 'fileCount' => 0];
                  $l4Files = @scandir($l4Abs);
                  if ($l4Files) foreach ($l4Files as $fn) {
                    if ($fn[0]==='.'||$fn==='index.html'||$fn[0]==='_') continue;
                    if (scan_should_skip_filename($fn, $scanExclusions)) continue;
                    if (is_dir($l4Abs.'/'.$fn)) continue;
                    $relPath = $topName.'/'.$subName.'/'.$deepName.'/'.$l4Name.'/'.$fn;
                    if ($append_scanned_doc($l4Abs.'/'.$fn, $relPath, $catCode, $subName, $topName.'/'.$subName.'/'.$deepName.'/'.$l4Name)) {
                      $l4Node['fileCount']++;
                      $deepNode['fileCount']++;
                      $subNode['fileCount']++;
                      $topNode['fileCount']++;
                    }
                  }
                  // Always include L4 folders (even empty ones — user may have just created them)
                  if (!isset($deepNode['subs'])) $deepNode['subs'] = [];
                  $deepNode['subs'][] = $l4Node;
                }
                $deepNodes[] = $deepNode;
              }
            }
          }
          if ($hasDeepSubs) {
            $subNode['subs'] = $deepNodes;
          }

          // Scan files directly in this subfolder
          $subFiles = @scandir($subAbs);
          if ($subFiles) foreach ($subFiles as $fn) {
            if ($fn[0]==='.'||$fn==='index.html'||$fn[0]==='_') continue;
            if (scan_should_skip_filename($fn, $scanExclusions)) continue;
            if (is_dir($subAbs.'/'.$fn)) continue;
            $relPath = $topName.'/'.$subName.'/'.$fn;
            if ($append_scanned_doc($subAbs.'/'.$fn, $relPath, $catCode, $subName, $topName.'/'.$subName)) {
              $subNode['fileCount']++;
              $topNode['fileCount']++;
            }
          }

          $topNode['subs'][] = $subNode;
        }
      }

      // If no numbered subs, scan files directly in top folder
      if (!$hasNumberedSubs) {
        $files = @scandir($topAbs);
        if ($files) foreach ($files as $fn) {
          if ($fn[0]==='.'||$fn==='index.html'||$fn[0]==='_') continue;
          if (scan_should_skip_filename($fn, $scanExclusions)) continue;
          if (is_dir($topAbs.'/'.$fn)) continue;
          $relPath = $topName.'/'.$fn;
          if ($append_scanned_doc($topAbs.'/'.$fn, $relPath, $catCode, null, $topName)) {
            $topNode['fileCount']++;
          }
        }
      }

      // Always include numbered top-level folders (even empty — may be newly created)
      $tree[] = $topNode;
    }

    // ═══ POST-PROCESS: Fix doc categories based on folder context ═══
    // Files inside Organization folder should always be ORG (overrides filename-based cat)
    $preferredOrg = default_folder_for_cat('ORG', $ROOT_DIR);
    $manRoot = default_folder_for_cat('MAN', $ROOT_DIR);
    $polRoot = default_folder_for_cat('POL', $ROOT_DIR);
    $orgRoots = [];
    if ($preferredOrg !== '') $orgRoots[] = $preferredOrg;
    if (is_dir($ROOT_DIR . '/08-Organization')) $orgRoots[] = '08-Organization';
    $orgRoots = array_values(array_unique($orgRoots));
    foreach ($docs as &$d) {
      $folderPath = (string)($d['folder'] ?? '');
      foreach ($orgRoots as $orgRoot) {
        if ($orgRoot !== '' && path_equals_or_child($folderPath, $orgRoot)) {
          $d['cat'] = 'ORG';
          continue 2;
        }
      }
      if ($manRoot !== '' && path_equals_or_child($folderPath, $manRoot)) {
        $d['cat'] = 'MAN';
        continue;
      }
      if ($polRoot !== '' && path_equals_or_child($folderPath, $polRoot)) {
        $d['cat'] = 'POL';
      }
    }
    unset($d);

    $docs = array_merge($docs, load_form_control_registry_docs($FORM_CONTROL_REGISTRY_FILE, $ROOT_DIR, $allowedExtensions));
    $docs = portal_dedupe_docs($docs);

    // Sort docs by cat then code
    usort($docs, function($a, $b) { return strcmp($a['cat'].$a['code'], $b['cat'].$b['code']); });

    // ═══ POST-PROCESS: Flatten container folders ═══
    // Container folders (Tai-Lieu-He-Thong, Tai-Lieu-Van-Hanh) should not appear as single tree nodes.
    // Instead, promote their children to top-level tree nodes with correct category codes.
    $CONTAINER_CATS = ['SYS', 'OPS'];
    $newTree = [];
    foreach ($tree as $node) {
      if (in_array($node['cat'] ?? '', $CONTAINER_CATS) && !empty($node['subs'])) {
        // Promote each sub to a top-level node
        foreach ($node['subs'] as $sub) {
          $subCat = scan_cat_from_subfolder($sub['name'] ?? '') ?? $node['cat'];
          $sub['cat'] = $subCat;
          $sub['num'] = $node['num'] * 100 + ($sub['num'] ?? 0); // Preserve sort order
          $newTree[] = $sub;
        }
      } else {
        $newTree[] = $node;
      }
    }
    $tree = $newTree;
    // Re-sort tree by original folder order
    usort($tree, function($a, $b) { return ($a['num'] ?? 0) - ($b['num'] ?? 0); });

    // Prefer the live system Organization root over any stale legacy Organization root.
    $preferredOrgRoot = default_folder_for_cat('ORG', $ROOT_DIR);
    $hasPreferredOrg = false;
    foreach ($tree as $node) {
      if (($node['cat'] ?? '') === 'ORG' && ($node['path'] ?? '') === $preferredOrgRoot) {
        $hasPreferredOrg = true;
        break;
      }
    }
    if ($hasPreferredOrg) {
      $tree = array_values(array_filter($tree, function($node) use ($preferredOrgRoot) {
        if (($node['cat'] ?? '') !== 'ORG') return true;
        return ($node['path'] ?? '') === $preferredOrgRoot;
      }));
    }

    $reconcileTreeNodeWithFilesystem = function(array $node) use (&$reconcileTreeNodeWithFilesystem, $ROOT_DIR): array {
      $nodePath = trim((string)($node['path'] ?? ''));
      if ($nodePath === '') return $node;
      $nodeAbs = join_in_root($ROOT_DIR, $nodePath);
      if (!is_dir($nodeAbs)) return $node;

      $existingSubs = [];
      foreach (($node['subs'] ?? []) as $idx => $sub) {
        if (!is_array($sub)) continue;
        $subPath = trim((string)($sub['path'] ?? ''));
        if ($subPath === '') continue;
        $existingSubs[$subPath] = $idx;
      }

      $dirEntries = @scandir($nodeAbs);
      if ($dirEntries) {
        sort($dirEntries);
        foreach ($dirEntries as $entry) {
          if ($entry === '' || $entry[0] === '.' || $entry === '_Archive' || $entry === 'index.html') continue;
          $entryAbs = $nodeAbs . '/' . $entry;
          if (!is_dir($entryAbs)) continue;
          [$entryNum, $entryLabel] = parse_folder_num($entry);
          if ($entryNum === null || $entryNum < 1) continue;
          $entryPath = $nodePath . '/' . $entry;
          if (isset($existingSubs[$entryPath])) continue;
          if (!isset($node['subs']) || !is_array($node['subs'])) $node['subs'] = [];
          $node['subs'][] = [
            'path' => $entryPath,
            'num' => $entryNum,
            'name' => $entryLabel,
            'fileCount' => 0,
          ];
        }
      }

      if (!empty($node['subs']) && is_array($node['subs'])) {
        foreach ($node['subs'] as $idx => $sub) {
          if (!is_array($sub)) continue;
          $node['subs'][$idx] = $reconcileTreeNodeWithFilesystem($sub);
        }
        usort($node['subs'], function($a, $b) {
          $numDiff = (int)($a['num'] ?? 0) - (int)($b['num'] ?? 0);
          if ($numDiff !== 0) return $numDiff;
          return strcmp((string)($a['name'] ?? ''), (string)($b['name'] ?? ''));
        });
      }

      return $node;
    };

    foreach ($tree as $idx => $node) {
      if (!is_array($node)) continue;
      $tree[$idx] = $reconcileTreeNodeWithFilesystem($node);
    }

    // Repair custom_docs stale paths
    try {
      $custom = load_custom_docs($CUSTOM_DOCS_FILE);
      $scannedByCode = [];
      foreach ($docs as $d) {
        $code = strtoupper((string)($d['code'] ?? ''));
        if ($code === '') continue;
        $scannedByCode[$code] = [
          'path' => (string)($d['path'] ?? ''),
          'folder' => (string)($d['folder'] ?? ''),
        ];
      }
      $repaired = false;
      foreach ($custom as &$cd) {
        if (!is_array($cd) || empty($cd['code'])) continue;
        $ccode = strtoupper($cd['code']);
        if (isset($scannedByCode[$ccode])) {
          $scanned = $scannedByCode[$ccode];
          if (($cd['path'] ?? '') !== ($scanned['path'] ?? '')) {
            $cd['path'] = $scanned['path'] ?? '';
            $repaired = true;
          }
          if (($scanned['folder'] ?? '') !== '' && ($cd['folder'] ?? '') !== ($scanned['folder'] ?? '')) {
            $cd['folder'] = $scanned['folder'] ?? '';
            $repaired = true;
          }
        }
      }
      unset($cd);
      if ($repaired) save_custom_docs($CUSTOM_DOCS_FILE, $custom);
    } catch (Throwable $e) {}

    // Cache result
    ensure_dir($DATA_DIR);
    $cacheData = ['docs' => $docs, 'tree' => $tree, 'extension_filter' => $allowedExtensions];
    @file_put_contents($cacheFile, json_encode($cacheData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX);

    $hidden = load_doc_visibility($DOC_VIS_FILE);
    $visibleDocs = portal_filter_docs_for_user($docs, $me, $PORTAL_CONFIG_JS_FILE, $hidden, $displayConfig);
    api_json([
      'ok' => true,
      'docs' => $visibleDocs,
      'tree' => $tree,
      'count' => count($visibleDocs),
      'cached' => false,
      'display_config' => portal_display_config_public_payload($displayConfig),
    ]);
  }

  case 'form_version_stream': {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') api_json(['ok' => false, 'error' => 'method_not_allowed'], 405);
    if (!is_array($store)) api_json(['ok' => false, 'error' => 'system_not_initialized'], 500);
    if (empty($_SESSION['user'])) {
      header('Location: portal.html');
      http_response_code(302);
      exit;
    }
    $me = require_logged_in($store);
    $code = strtoupper(trim((string)($_GET['code'] ?? '')));
    $basePath = (string)($_GET['base_path'] ?? ($_GET['path'] ?? ''));
    $id = trim((string)($_GET['id'] ?? ''));
    if ($code === '' || trim($basePath) === '' || $id === '') api_json(['ok' => false, 'error' => 'missing_params'], 400);
    $baseRel = safe_rel_path($basePath);
    $formEntry = form_registry_get_entry($FORM_CONTROL_REGISTRY_FILE, $code, $baseRel);
    if (!is_array($formEntry)) api_json(['ok' => false, 'error' => 'form_not_found'], 404);
    $doc = [
      'code' => strtoupper(trim((string)($formEntry['code'] ?? $code))),
      'path' => (string)($formEntry['path'] ?? $baseRel),
      'folder' => (string)($formEntry['folder'] ?? dirname($baseRel)),
      'cat' => 'FRM',
    ];
    $hidden = load_doc_visibility($DOC_VIS_FILE);
    $displayConfig = portal_load_display_config($PORTAL_DISPLAY_CONFIG_FILE);
    if (!portal_can_access_doc($me, $doc, portal_load_role_docs($PORTAL_CONFIG_JS_FILE), array_values(array_map(function($value) {
      return strtoupper((string)$value);
    }, $hidden)), $displayConfig)) {
      api_json(['ok' => false, 'error' => 'forbidden'], 403);
    }
    $resolved = form_resolve_version_for_stream($DATA_DIR, $ROOT_DIR, $formEntry, $id);
    if (!is_array($resolved) || !is_file((string)($resolved['abs'] ?? ''))) api_json(['ok' => false, 'error' => 'not_found'], 404);
    $ext = strtolower((string)($resolved['ext'] ?? ''));
    $contentType = portal_stream_mime_type($ext);
    if (session_status() === PHP_SESSION_ACTIVE) @session_write_close();
    http_response_code(200);
    header('Content-Type: ' . $contentType);
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: SAMEORIGIN');
    header('Referrer-Policy: same-origin');
    header('Content-Disposition: attachment; filename="' . rawurlencode((string)($resolved['name'] ?? basename((string)$resolved['abs']))) . '"');
    $size = @filesize((string)$resolved['abs']);
    if ($size !== false) header('Content-Length: ' . (string)$size);
    readfile((string)$resolved['abs']);
    exit;
  }

  case 'doc_stream': {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') api_json(['ok' => false, 'error' => 'method_not_allowed'], 405);
    if (!is_array($store)) api_json(['ok' => false, 'error' => 'system_not_initialized'], 500);

    if (empty($_SESSION['user'])) {
      header('Location: portal.html');
      http_response_code(302);
      exit;
    }
    $me = require_logged_in($store);

    $relPath = trim((string)($_GET['path'] ?? ''));
    if ($relPath === '') api_json(['ok' => false, 'error' => 'missing_path'], 400);

    try {
      $relPath = safe_rel_path($relPath);
      $absPath = join_in_root($ROOT_DIR, $relPath);
    } catch (Throwable $e) {
      api_json(['ok' => false, 'error' => 'invalid_path'], 400);
    }

    $displayConfig = portal_load_display_config($PORTAL_DISPLAY_CONFIG_FILE);
    if (!portal_allowed_stream_extension($relPath) || !portal_doc_extension_is_enabled(portal_get_doc_extension($relPath), $displayConfig)) {
      api_json(['ok' => false, 'error' => 'unsupported_type'], 403);
    }
    if (!is_file($absPath) || !is_inside_root($absPath, $ROOT_DIR)) api_json(['ok' => false, 'error' => 'not_found'], 404);

    $allDocs = [];
    $cacheFile = $DATA_DIR . '/scan_cache.json';
    if (is_file($cacheFile)) {
      $cached = json_decode((string)@file_get_contents($cacheFile), true);
      if (is_array($cached['docs'] ?? null)) $allDocs = $cached['docs'];
    }
    $allDocs = array_merge(
      $allDocs,
      load_custom_docs($CUSTOM_DOCS_FILE),
      load_form_control_registry_docs($FORM_CONTROL_REGISTRY_FILE, $ROOT_DIR, portal_display_config_enabled_extensions($displayConfig))
    );
    $allDocs = portal_dedupe_docs($allDocs);

    $requestedCode = strtoupper(trim((string)($_GET['code'] ?? '')));
    if ($requestedCode === '') $requestedCode = portal_extract_doc_code(basename($relPath));

    $doc = null;
    foreach ($allDocs as $candidate) {
      if (!is_array($candidate)) continue;
      $candidateCode = strtoupper(trim((string)($candidate['code'] ?? '')));
      $candidatePath = str_replace('\\', '/', (string)($candidate['path'] ?? ''));
      if ($candidatePath === $relPath || ($requestedCode !== '' && $candidateCode === $requestedCode)) {
        $doc = $candidate;
        break;
      }
    }
    if (!is_array($doc)) {
      $doc = [
        'code' => $requestedCode,
        'path' => $relPath,
        'folder' => dirname($relPath),
        'cat' => '',
      ];
    } else {
      $doc['path'] = $relPath;
      if (empty($doc['folder'])) $doc['folder'] = dirname($relPath);
    }

    $hidden = load_doc_visibility($DOC_VIS_FILE);
    if (!portal_can_access_doc($me, $doc, portal_load_role_docs($PORTAL_CONFIG_JS_FILE), array_values(array_map(function($value) {
      return strtoupper((string)$value);
    }, $hidden)), $displayConfig)) {
      api_json(['ok' => false, 'error' => 'forbidden'], 403);
    }

    $ext = strtolower(pathinfo($relPath, PATHINFO_EXTENSION));
    $contentType = portal_stream_mime_type($ext);
    $asAttachment = isset($_GET['download']) || !portal_stream_can_inline($ext);

    if (session_status() === PHP_SESSION_ACTIVE) @session_write_close();
    http_response_code(200);
    header('Content-Type: ' . $contentType);
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: SAMEORIGIN');
    header('Referrer-Policy: same-origin');
    if ($asAttachment) {
      header('Content-Disposition: attachment; filename="' . rawurlencode(basename($relPath)) . '"');
    } else {
      header('Content-Disposition: inline; filename="' . rawurlencode(basename($relPath)) . '"');
    }
    $size = @filesize($absPath);
    if ($size !== false) header('Content-Length: ' . (string)$size);
    readfile($absPath);
    exit;
  }

  // ==========================================================
  // FOLDER DESCRIPTIONS
  // ==========================================================
  case 'folder_descriptions': {
    $descFile = $CONF_DIR . '/folder_descriptions.json';
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
      if (!is_array($store)) api_json(['ok' => false, 'error' => 'system_not_initialized'], 500);
      require_logged_in($store);
      $descs = [];
      if (is_file($descFile)) {
        $descs = json_decode(file_get_contents($descFile), true) ?: [];
      }
      api_json(['ok' => true, 'descriptions' => $descs]);
    }
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') api_json(['ok' => false, 'error' => 'method_not_allowed'], 405);
    // POST = save
    if (!is_array($store)) api_json(['ok' => false, 'error' => 'system_not_initialized'], 500);
    $me = require_logged_in($store);
    require_csrf();
    if (!role_can_create_docs($me, $ROLE_PERMS_FILE)) api_json(['ok' => false, 'error' => 'forbidden'], 403);
    $data = read_json_body();
    $pathRaw = trim((string)($data['path'] ?? ''));
    $desc = trim((string)($data['description'] ?? ''));
    if ($pathRaw === '') api_json(['ok' => false, 'error' => 'missing_path'], 400);
    try {
      $path = safe_rel_path($pathRaw);
    } catch (Throwable $e) {
      api_json(['ok' => false, 'error' => 'invalid_path'], 400);
    }
    $descs = [];
    if (is_file($descFile)) $descs = json_decode(file_get_contents($descFile), true) ?: [];
    if ($desc === '') {
      unset($descs[$path]);
    } else {
      $descs[$path] = $desc;
    }
    ensure_dir(dirname($descFile));
    file_put_contents($descFile, json_encode($descs, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), LOCK_EX);
    api_json(['ok' => true]);
  }

  // ==========================================================
  // GET DOC DESCRIPTIONS
  // ==========================================================
  case 'doc_descriptions_get': {
    if (!is_array($store)) api_json(['ok' => false, 'error' => 'system_not_initialized'], 500);
    require_logged_in($store);
    $descFile = $DATA_DIR . '/config/doc_descriptions.json';
    $descs = is_file($descFile) ? (json_decode(file_get_contents($descFile), true) ?: []) : [];
    api_json(['ok' => true, 'descriptions' => $descs]);
  }

  // ==========================================================
  // SAVE DOC DESCRIPTION
  // ==========================================================
  case 'save_doc_description': {
    if ($method !== 'POST') api_json(['ok' => false, 'error' => 'method_not_allowed'], 405);
    if (!is_array($store)) api_json(['ok' => false, 'error' => 'system_not_initialized'], 500);
    $me = require_logged_in($store);
    require_csrf();
    if (!role_can_create_docs($me, $ROLE_PERMS_FILE)) api_json(['ok' => false, 'error' => 'forbidden'], 403);

    $data = read_json_body();
    $code = strtoupper(trim((string)($data['code'] ?? '')));
    $description = trim((string)($data['description'] ?? ''));
    if ($code === '') api_json(['ok' => false, 'error' => 'missing_code'], 400);

    $descFile = $DATA_DIR . '/config/doc_descriptions.json';
    @mkdir(dirname($descFile), 0755, true);
    $descs = is_file($descFile) ? (json_decode(file_get_contents($descFile), true) ?: []) : [];
    if ($description !== '') {
      $descs[$code] = $description;
    } else {
      unset($descs[$code]);
    }
    @file_put_contents($descFile, json_encode($descs, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), LOCK_EX);
    api_json(['ok' => true, 'code' => $code]);
  }

  // ==========================================================
  // RENAME FOLDER
  // ==========================================================
  case 'rename_folder': {
    if (!is_array($store)) api_json(['ok' => false, 'error' => 'system_not_initialized'], 500);
    $me = require_logged_in($store);
    require_csrf();
    if (!role_can_create_docs($me, $ROLE_PERMS_FILE)) api_json(['ok' => false, 'error' => 'forbidden'], 403);

    try {
      $data = read_json_body();
      try {
        $oldPath = safe_rel_path(trim((string)($data['old_path'] ?? '')));
      } catch (Throwable $e) {
        api_json(['ok' => false, 'error' => 'invalid_path'], 400);
      }
      $newName = trim((string)($data['new_name'] ?? ''));
      if ($oldPath === '' || $newName === '') api_json(['ok' => false, 'error' => 'missing_params'], 400);
      if (is_reserved_root_segment($oldPath)) api_json(['ok' => false, 'error' => 'forbidden'], 403);

      $newName = preg_replace('/[^A-Za-z0-9_-]/', '-', $newName);
      if ($newName === '' || trim($newName, '-') === '') api_json(['ok' => false, 'error' => 'invalid_name'], 400);
      $oldBase = basename($oldPath);
      $numPrefix = '';
      if (preg_match('/^(\d{2}-)/', $oldBase, $m)) $numPrefix = $m[1];
      $newFolderName = $numPrefix . $newName;

      $oldAbs = join_in_root($ROOT_DIR, $oldPath);
      if (!is_inside_root($oldAbs, $ROOT_DIR)) api_json(['ok' => false, 'error' => 'invalid_path'], 400);
      if (!is_dir($oldAbs)) api_json(['ok' => false, 'error' => 'folder_not_found'], 404);
      $parentDir = dirname($oldAbs);
      $newAbs = $parentDir . '/' . $newFolderName;
      if (is_dir($newAbs) && realpath($oldAbs) !== realpath($newAbs)) api_json(['ok' => false, 'error' => 'folder_exists'], 400);

      if (!@rename($oldAbs, $newAbs)) api_json(['ok' => false, 'error' => 'rename_failed'], 500);

      $newPath = dirname($oldPath) . '/' . $newFolderName;
      $newPath = ltrim(str_replace('\\', '/', $newPath), './');

      // Update cross-references
      $updated = 0;
      $iter = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($ROOT_DIR, FilesystemIterator::SKIP_DOTS | FilesystemIterator::UNIX_PATHS),
        RecursiveIteratorIterator::LEAVES_ONLY
      );
      foreach ($iter as $file) {
        if (!$file->isFile() || $file->getExtension() !== 'html') continue;
        $content = @file_get_contents($file->getPathname());
        if ($content === false) continue;
        $newContent = replace_quoted_path_token($content, $oldPath, $newPath);
        $newContent = replace_quoted_path_token($newContent, $oldBase, $newFolderName);
        if ($newContent !== $content) {
          @file_put_contents($file->getPathname(), $newContent);
          $updated++;
        }
      }

      // Update folder descriptions
      $descFile = $CONF_DIR . '/folder_descriptions.json';
      if (is_file($descFile)) {
        $descs = @json_decode(@file_get_contents($descFile), true) ?: [];
        $newDescs = [];
        foreach ($descs as $k => $v) {
          $newKey = replace_path_prefix((string)$k, $oldPath, $newPath);
          $newDescs[$newKey] = $v;
        }
        @file_put_contents($descFile, json_encode($newDescs, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), LOCK_EX);
      }

      // Update custom_docs paths
      try {
        $custom = load_custom_docs($CUSTOM_DOCS_FILE);
        $changed = false;
        foreach ($custom as &$cd) {
          if (!is_array($cd)) continue;
          foreach (['path', 'folder'] as $field) {
            if (isset($cd[$field])) {
              $next = replace_path_prefix((string)$cd[$field], $oldPath, $newPath);
              if ($next === (string)$cd[$field]) continue;
              $cd[$field] = $next;
              $changed = true;
            }
          }
        }
        unset($cd);
        if ($changed) save_custom_docs($CUSTOM_DOCS_FILE, $custom);
      } catch (Throwable $e) { /* non-critical */ }

      invalidate_scan_cache($DATA_DIR);
      api_json(['ok' => true, 'new_path' => $newPath, 'updated_files' => $updated]);

    } catch (Throwable $e) {
      @error_log('[rename_folder] ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
      api_json(['ok' => false, 'error' => 'rename_failed'], 500);
    }
  }

  // ==========================================================
  // RENAME DOCUMENT
  // ==========================================================
  case 'rename_doc': {
    if (!is_array($store)) api_json(['ok' => false, 'error' => 'system_not_initialized'], 500);
    $me = require_logged_in($store);
    require_csrf();
    if (!role_can_create_docs($me, $ROLE_PERMS_FILE)) api_json(['ok' => false, 'error' => 'forbidden'], 403);

    try {
      $data = read_json_body();
      $oldCode = strtoupper(trim((string)($data['old_code'] ?? '')));
      $newCode = strtoupper(trim((string)($data['new_code'] ?? '')));
      $newTitle = trim((string)($data['new_title'] ?? ''));
      if ($oldCode === '') api_json(['ok' => false, 'error' => 'missing_old_code'], 400);
      if ($newCode !== '' && !preg_match('/^[A-Z0-9_-]{3,40}$/', $newCode)) api_json(['ok' => false, 'error' => 'bad_new_code'], 400);
      if ($newTitle !== '' && portal_title_has_non_ascii($newTitle)) api_json(['ok' => false, 'error' => 'title_must_be_english_ascii'], 400);

      // ── Find doc from scan cache or custom_docs ──
      $foundFile = null;
      $foundRel = null;

      // Method 1: Check custom_docs registry
      $custom = load_custom_docs($CUSTOM_DOCS_FILE);
      foreach ($custom as $cd) {
        if (!is_array($cd)) continue;
        if (strtoupper((string)($cd['code'] ?? '')) === $oldCode) {
          $relCd = (string)($cd['path'] ?? '');
          if ($relCd === '') break;
          try {
            $testPath = join_in_root($ROOT_DIR, $relCd);
          } catch (Throwable $e) {
            break;
          }
          if (is_file($testPath)) {
            $foundFile = $testPath;
            $foundRel = safe_rel_path($relCd);
          }
          break;
        }
      }

      // Method 2: Check scan cache
      if (!$foundFile) {
        $cacheFile = $DATA_DIR . '/scan_cache.json';
        if (is_file($cacheFile)) {
          $cache = @json_decode(@file_get_contents($cacheFile), true);
          if (is_array($cache) && !empty($cache['docs'])) {
            foreach ($cache['docs'] as $d) {
              if (strtoupper((string)($d['code'] ?? '')) === $oldCode) {
                $relCached = (string)($d['path'] ?? '');
                if ($relCached === '') break;
                try {
                  $testPath = join_in_root($ROOT_DIR, $relCached);
                } catch (Throwable $e) {
                  break;
                }
                if (is_file($testPath)) {
                  $foundFile = $testPath;
                  $foundRel = safe_rel_path($relCached);
                }
                break;
              }
            }
          }
        }
      }

      // Method 3: Filesystem scan (fallback)
      if (!$foundFile) {
        $iter = new RecursiveIteratorIterator(
          new RecursiveDirectoryIterator($ROOT_DIR, FilesystemIterator::SKIP_DOTS | FilesystemIterator::UNIX_PATHS),
          RecursiveIteratorIterator::LEAVES_ONLY
        );
        foreach ($iter as $file) {
          if (!$file->isFile() || $file->getExtension() !== 'html') continue;
          $absPath = $file->getPathname();
          $rel = substr($absPath, strlen($ROOT_DIR) + 1);
          // Skip portal and data dirs
          if (
            str_starts_with($rel, '01-QMS-Portal/')
            || str_starts_with($rel, 'assets/')
            || str_starts_with($rel, '11-Glossary/')
          ) continue;
      if (!filename_matches_doc_code($file->getFilename(), $oldCode)) continue;
          $foundFile = $absPath;
          $foundRel = str_replace('\\', '/', $rel);
          break;
        }
      }

      if (!$foundFile || !is_file($foundFile)) api_json(['ok' => false, 'error' => 'doc_not_found'], 404);
      if (!is_inside_root($foundFile, $ROOT_DIR)) api_json(['ok' => false, 'error' => 'invalid_path'], 400);
      if ($foundRel !== null && is_reserved_root_segment($foundRel)) api_json(['ok' => false, 'error' => 'forbidden'], 403);

      $oldRel = (string)$foundRel;
      $oldFilename = basename($foundFile);
      $updated = 0;
      $currentTitle = portal_standard_title_from_rel_path($oldRel, $oldCode);
      $effectiveCode = $newCode !== '' ? $newCode : $oldCode;
      if ($newTitle === '') $newTitle = $currentTitle;
      if ($newTitle === '') $newTitle = $effectiveCode;

      // ── Update title in HTML content ──
      if (portal_get_doc_extension($foundFile) === 'html') {
        $content = @file_get_contents($foundFile);
        if ($content !== false) {
          $content = portal_sync_doc_title_blocks((string)$content, $effectiveCode, $newTitle);
          @file_put_contents($foundFile, $content);
        }
      }

      // ── Rename file if code changed ──
      $renamedRel = $foundRel;
      $titleSlugChanged = slugify($newTitle) !== slugify($currentTitle);
      if (($newCode !== '' && $newCode !== $oldCode) || $titleSlugChanged) {
        $dir = dirname($foundFile);
        $newSlug = strtolower(str_replace(['_', ' '], '-', $effectiveCode));
        if ($newTitle !== '') {
          $titleSlug = substr(preg_replace('/[^a-z0-9]+/', '-', strtolower($newTitle)), 0, 60);
          $newSlug .= '-' . trim($titleSlug, '-');
        }
        $newSlug = preg_replace('/-+/', '-', trim($newSlug, '-'));
        $ext = pathinfo($oldFilename, PATHINFO_EXTENSION);
        if ($ext === '') $ext = 'html';
        $newFileName = $newSlug . '.' . strtolower((string)$ext);
        $newFilePath = $dir . '/' . $newFileName;
        if ($oldFilename !== $newFileName) {
          if (is_file($newFilePath)) api_json(['ok' => false, 'error' => 'file_exists'], 400);
          if (!@rename($foundFile, $newFilePath)) api_json(['ok' => false, 'error' => 'rename_failed'], 500);
          $relDir = dirname($oldRel);
          $renamedRel = ($relDir === '.' || $relDir === '/') ? $newFileName : ($relDir . '/' . $newFileName);
          $renamedRel = ltrim(str_replace('\\', '/', $renamedRel), './');
          rename_doc_store_assets($ROOT_DIR, $oldRel, $renamedRel, $effectiveCode);

          // Update cross-references in ALL HTML files
          $scanIter = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($ROOT_DIR, FilesystemIterator::SKIP_DOTS | FilesystemIterator::UNIX_PATHS),
            RecursiveIteratorIterator::LEAVES_ONLY
          );
          foreach ($scanIter as $sf) {
            if (!$sf->isFile() || $sf->getExtension() !== 'html') continue;
            $c = @file_get_contents($sf->getPathname());
            if ($c === false || $c === '') continue;
            $srcRel = rel_path($sf->getPathname(), $ROOT_DIR);
            $nc = replace_quoted_path_token($c, $oldRel, $renamedRel);
            try {
              $oldLocalRef = relative_ref_from($srcRel, $oldRel);
              $newLocalRef = relative_ref_from($srcRel, $renamedRel);
              $nc = replace_quoted_path_token($nc, $oldLocalRef, $newLocalRef);
            } catch (Throwable $e) {}
            $nc = replace_quoted_path_token($nc, $oldFilename, $newFileName);
            if ($nc !== $c) {
              @file_put_contents($sf->getPathname(), $nc);
              $updated++;
            }
          }
        }
      }

      // ── Update custom_docs registry ──
      $changed = false;
      foreach ($custom as &$cd) {
        if (!is_array($cd)) continue;
        if (strtoupper((string)($cd['code'] ?? '')) === $oldCode) {
          if ($newCode !== '') { $cd['code'] = $newCode; $changed = true; }
          if (($cd['title'] ?? null) !== $newTitle) { $cd['title'] = $newTitle; $changed = true; }
          $cd['path'] = $renamedRel; $changed = true;
          break;
        }
      }
      unset($cd);
      if ($changed) save_custom_docs($CUSTOM_DOCS_FILE, $custom);

      // Move description key when document code changes.
      if ($newCode !== '' && $newCode !== $oldCode) {
        $descFile = $DATA_DIR . '/config/doc_descriptions.json';
        if (is_file($descFile)) {
          $descs = @json_decode(@file_get_contents($descFile), true) ?: [];
          if (is_array($descs) && array_key_exists($oldCode, $descs) && !array_key_exists($newCode, $descs)) {
            $descs[$newCode] = $descs[$oldCode];
            unset($descs[$oldCode]);
            @file_put_contents($descFile, json_encode($descs, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), LOCK_EX);
          }
        }
      }
      invalidate_scan_cache($DATA_DIR);

      api_json(['ok' => true, 'new_path' => $renamedRel, 'updated_files' => $updated]);

    } catch (Throwable $e) {
      @error_log('[rename_doc] ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
      api_json(['ok' => false, 'error' => 'rename_failed'], 500);
    }
  }

  // ═══════════════════════════════════════════════════
  // RECORD-ID COUNTER SYSTEM
  // Atomic sequential ID generator for formal records
  // (NCR, CAPA, FAI, TRN, AUD, ECR, etc.)
  // ═══════════════════════════════════════════════════

  case 'config_record_types': {
    require_logged_in($store);
    api_json(['ok' => true, 'record_types' => load_record_type_registry()]);
  }

  case 'record_id_generate': {
    $me = require_logged_in($store);
    require_csrf();
    $body = read_json_body();
    $recordType = strtoupper(trim((string)($body['record_type'] ?? '')));
    $department = strtoupper(trim((string)($body['department'] ?? '')));
    $year = trim((string)($body['year'] ?? date('Y')));
    if ($recordType === '' || $department === '') {
      api_json(['ok' => false, 'error' => 'missing_record_type_or_department'], 400);
    }

    $recordTypes = load_record_type_registry();
    $recordCfg = is_array($recordTypes[$recordType] ?? null) ? $recordTypes[$recordType] : [];
    $generated = next_record_id_value($recordType, $year);
    $recordId = (string)$generated['record_id'];

    $formCode = trim((string)($body['form_code'] ?? $recordCfg['linked_form'] ?? ''));
    $schema = $formCode !== '' ? load_form_schema_by_code($formCode) : null;
    $formRegistryEntry = $formCode !== '' ? load_form_registry_entry($formCode) : null;
    $formRevision = trim((string)($schema['version'] ?? $formRegistryEntry['rev'] ?? 'V0'));
    $deliveryMode = $schema ? ((($schema['online'] ?? true) !== false) ? 'online' : 'offline') : 'offline';
    $masterContext = normalize_master_context((array)($body['master_context'] ?? []));
    $createdBy = strtolower(trim((string)($me['username'] ?? $_SESSION['user'] ?? 'anonymous')));
    $suggestedFilename = build_issued_filename($formCode !== '' ? $formCode : $recordType, $formRevision, $recordId, $createdBy, $deliveryMode === 'offline' ? 'xlsx' : 'pdf');

    $allocation = [
      'allocation_id' => allocation_uuid(),
      'record_id' => $recordId,
      'record_type' => $recordType,
      'department' => $department,
      'year' => $year,
      'seq' => (int)($generated['seq'] ?? 0),
      'form_code' => $formCode,
      'form_revision' => $formRevision,
      'delivery_mode' => $deliveryMode,
      'status' => 'allocated',
      'priority' => trim((string)($body['priority'] ?? 'normal')),
      'notes' => trim((string)($body['notes'] ?? '')),
      'master_context' => $masterContext,
      'linked_order_id' => trim((string)($body['linked_order_id'] ?? '')),
      'blank_form_path' => $deliveryMode === 'offline' ? (string)($formRegistryEntry['path'] ?? '') : '',
      'blank_form_filename' => $deliveryMode === 'offline' ? (string)($formRegistryEntry['filename'] ?? '') : '',
      'template_checksum' => $deliveryMode === 'offline' ? (string)($formRegistryEntry['sha256'] ?? '') : '',
      'expected_filename_pattern' => build_expected_filename_pattern($formCode !== '' ? $formCode : $recordType, $formRevision, $recordId, $deliveryMode === 'offline' ? 'xlsx' : 'pdf'),
      'receipt_version' => 0,
      'receipts' => [],
      'history' => [],
      'created_at' => now_iso(),
      'created_by' => $createdBy,
      'updated_at' => now_iso(),
      'updated_by' => $createdBy,
      'suggested_filename' => $suggestedFilename,
    ];
    allocation_append_event($allocation, 'allocated', $createdBy, 'record_id_allocated');

    $allocationStore = load_allocation_store();
    $allocationStore['allocations'][] = $allocation;
    save_allocation_store($allocationStore);

    api_json([
      'ok' => true,
      'allocation_id' => $allocation['allocation_id'],
      'record_id' => $recordId,
      'record_type' => $recordType,
      'department' => $department,
      'form_code' => $formCode,
      'form_revision' => $formRevision,
      'delivery_mode' => $deliveryMode,
      'blank_form_path' => $allocation['blank_form_path'],
      'blank_form_filename' => $allocation['blank_form_filename'],
      'suggested_filename' => $suggestedFilename,
      'allocation' => $allocation,
    ]);
  }

  case 'record_id_history': {
    require_logged_in($store);
    $body = read_json_body();
    $filters = array_merge($_GET, $body);
    api_json(array_merge(['ok' => true], allocation_history_query($filters)));
  }

  case 'upload_allocation_status': {
    require_logged_in($store);
    $body = read_json_body();
    $allocationId = trim((string)($body['allocation_id'] ?? $_GET['allocation_id'] ?? ''));
    if ($allocationId === '') api_json(['ok' => false, 'error' => 'missing_allocation_id'], 400);
    $allocation = allocation_find(load_allocation_store(), $allocationId);
    if (!$allocation) api_json(['ok' => false, 'error' => 'allocation_not_found'], 404);
    api_json(['ok' => true, 'allocation' => $allocation]);
  }

  case 'record_id_check_duplicate': {
    require_logged_in($store);
    $body = read_json_body();
    $recordId = strtoupper(trim((string)($body['record_id'] ?? $_GET['record_id'] ?? '')));
    if ($recordId === '') api_json(['ok' => false, 'error' => 'missing_record_id'], 400);
    $allocation = allocation_find_by_record_id(load_allocation_store(), $recordId);
    api_json(['ok' => true, 'exists' => (bool)$allocation, 'allocation' => $allocation]);
  }

  case 'record_id_void': {
    $me = require_logged_in($store);
    require_csrf();
    $body = read_json_body();
    $allocationId = trim((string)($body['allocation_id'] ?? ''));
    if ($allocationId === '') api_json(['ok' => false, 'error' => 'missing_allocation_id'], 400);
    $allocationStore = load_allocation_store();
    $allocation =& allocation_find_ref($allocationStore, $allocationId);
    if (!is_array($allocation)) api_json(['ok' => false, 'error' => 'allocation_not_found'], 404);
    if (allocation_status_normalize((string)($allocation['status'] ?? 'allocated')) === 'received') {
      api_json(['ok' => false, 'error' => 'received_allocation_cannot_be_voided'], 409);
    }
    allocation_append_event($allocation, 'void', strtolower(trim((string)($me['username'] ?? $_SESSION['user'] ?? 'anonymous'))), trim((string)($body['reason'] ?? '')));
    save_allocation_store($allocationStore);
    api_json(['ok' => true, 'allocation' => $allocation]);
  }

  case 'form_fill_download_offline': {
    $downloadMode = isset($_GET['download']) && $_GET['download'] === '1';
    if ($downloadMode) {
      require_logged_in($store);
      $allocationId = trim((string)($_GET['allocation_id'] ?? ''));
      if ($allocationId === '') api_json(['ok' => false, 'error' => 'missing_allocation_id'], 400);
      $allocation = allocation_find(load_allocation_store(), $allocationId);
      if (!$allocation) api_json(['ok' => false, 'error' => 'allocation_not_found'], 404);
      $packagePath = trim((string)($allocation['offline_package']['issued_path'] ?? ''));
      if ($packagePath === '') api_json(['ok' => false, 'error' => 'package_not_generated'], 404);
      stream_download_file($packagePath, (string)($allocation['offline_package']['filename'] ?? basename($packagePath)));
    }

    $me = require_logged_in($store);
    require_csrf();
    $body = read_json_body();
    $allocationId = trim((string)($body['allocation_id'] ?? ''));
    if ($allocationId === '') api_json(['ok' => false, 'error' => 'missing_allocation_id'], 400);

    $allocationStore = load_allocation_store();
    $allocation =& allocation_find_ref($allocationStore, $allocationId);
    if (!is_array($allocation)) api_json(['ok' => false, 'error' => 'allocation_not_found'], 404);
    if ((string)($allocation['delivery_mode'] ?? '') !== 'offline') api_json(['ok' => false, 'error' => 'form_not_offline'], 409);

    $formCode = trim((string)($body['form_code'] ?? $allocation['form_code'] ?? ''));
    $formEntry = load_form_registry_entry($formCode);
    if (!$formEntry || empty($formEntry['path'])) api_json(['ok' => false, 'error' => 'blank_form_not_found'], 404);

    $sourcePath = join_in_root($ROOT_DIR, (string)$formEntry['path']);
    if (!is_file($sourcePath)) api_json(['ok' => false, 'error' => 'blank_form_missing_on_disk'], 404);

    $username = strtolower(trim((string)($me['username'] ?? $_SESSION['user'] ?? 'anonymous')));
    $filename = build_issued_filename($formCode, (string)($allocation['form_revision'] ?? 'V0'), (string)($allocation['record_id'] ?? ''), $username, pathinfo($sourcePath, PATHINFO_EXTENSION) ?: 'xlsx');
    $issueDir = allocation_base_dir() . '/downloads/' . $allocationId;
    ensure_dir($issueDir);
    $issuedPath = $issueDir . '/' . $filename;

    $allocation['master_context'] = normalize_master_context(array_merge((array)($allocation['master_context'] ?? []), (array)($body['master_context'] ?? [])));
    $allocation['downloaded_at'] = now_iso();
    $allocation['downloaded_by'] = $username;
    $allocation['template_checksum'] = (string)($formEntry['sha256'] ?? hash_file('sha256', $sourcePath));
    $allocation['expected_filename_pattern'] = build_expected_filename_pattern($formCode, (string)($allocation['form_revision'] ?? 'V0'), (string)($allocation['record_id'] ?? ''), pathinfo($sourcePath, PATHINFO_EXTENSION) ?: 'xlsx');

    $hiddenPayload = build_hidden_sheet_payload($allocation, $formEntry);
    issue_offline_workbook_package($sourcePath, $issuedPath, $hiddenPayload);

    $allocation['offline_package'] = [
      'issued_path' => $issuedPath,
      'filename' => $filename,
      'issued_at' => $allocation['downloaded_at'],
    ];
    allocation_append_event($allocation, 'downloaded', $username, 'offline_package_issued', ['filename' => $filename]);
    save_allocation_store($allocationStore);

    api_json([
      'ok' => true,
      'allocation_id' => $allocationId,
      'filename' => $filename,
      'download_url' => 'api.php?action=form_fill_download_offline&allocation_id=' . rawurlencode($allocationId) . '&download=1',
      'allocation' => $allocation,
    ]);
  }

  case 'form_fill_submit_online': {
    $me = require_logged_in($store);
    require_csrf();
    $body = read_json_body();
    $allocationId = trim((string)($body['allocation_id'] ?? ''));
    $formCode = trim((string)($body['form_code'] ?? ''));
    $formData = is_array($body['form_data'] ?? null) ? $body['form_data'] : [];
    if ($allocationId === '' || $formCode === '' || !$formData) {
      api_json(['ok' => false, 'error' => 'invalid_submit_payload'], 400);
    }

    $allocationStore = load_allocation_store();
    $allocation =& allocation_find_ref($allocationStore, $allocationId);
    if (!is_array($allocation)) api_json(['ok' => false, 'error' => 'allocation_not_found'], 404);
    if ((string)($allocation['delivery_mode'] ?? '') !== 'online') api_json(['ok' => false, 'error' => 'form_not_online'], 409);

    $schema = load_form_schema_by_code($formCode) ?: [];
    $signatures = is_array($formData['signatures'] ?? null) ? $formData['signatures'] : [];
    $requiredContext = is_array($schema['record_context']['required'] ?? null) ? $schema['record_context']['required'] : [];
    $formData['master_context'] = normalize_master_context(array_merge((array)($allocation['master_context'] ?? []), (array)($formData['master_context'] ?? [])));
    foreach ($requiredContext as $contextKey) {
      if (!array_key_exists($contextKey, $formData['master_context'])) {
        api_json(['ok' => false, 'error' => 'missing_required_context', 'field' => $contextKey], 422);
      }
    }
    if (is_array($schema['signature_blocks'] ?? null)) {
      foreach ($schema['signature_blocks'] as $signatureBlock) {
        if (!is_array($signatureBlock) || empty($signatureBlock['required_on_submit'])) continue;
        $signatureId = trim((string)($signatureBlock['id'] ?? ''));
        if ($signatureId !== '' && !is_array($signatures[$signatureId] ?? null)) {
          api_json(['ok' => false, 'error' => 'missing_required_signature', 'signature_block' => $signatureId], 422);
        }
      }
    }
    $signatureValidation = validate_signature_payloads($schema, $signatures);
    if (!($signatureValidation['ok'] ?? false)) {
      api_json([
        'ok' => false,
        'error' => 'invalid_signature_payload',
        'details' => $signatureValidation['errors'] ?? [],
      ], 422);
    }

    $entryId = trim((string)($formData['entry_id'] ?? $allocation['online_submission']['entry_id'] ?? ''));
    if ($entryId === '') {
      $entryId = $formCode . '-' . date('YmdHis') . '-' . substr(bin2hex(random_bytes(4)), 0, 8);
    }

    $formData['entry_id'] = $entryId;
    $formData['record_id'] = (string)($allocation['record_id'] ?? '');
    $formData['allocation_id'] = $allocationId;
    $formData['submitted_at'] = now_iso();
    $formData['submitted_by'] = strtolower(trim((string)($me['username'] ?? $_SESSION['user'] ?? 'anonymous')));
    $formData['signatures'] = $signatures;
    $formData['updated_at'] = now_iso();
    $formData['updated_by'] = $formData['submitted_by'];

    $existing = load_online_form_entries_store($formCode);
    $existingIdx = find_online_form_entry_index($existing, $entryId, $allocationId);
    $previous = $existingIdx >= 0 && is_array($existing[$existingIdx] ?? null) ? $existing[$existingIdx] : null;
    $formData['submission_revision'] = ((int)($previous['submission_revision'] ?? 0)) + 1;
    if ($previous && !empty($previous['created_at'])) {
      $formData['created_at'] = (string)$previous['created_at'];
      $formData['created_by'] = (string)($previous['created_by'] ?? $formData['submitted_by']);
    } else {
      $formData['created_at'] = $formData['submitted_at'];
      $formData['created_by'] = $formData['submitted_by'];
    }
    if ($previous && empty($formData['master_context']) && !empty($previous['master_context']) && is_array($previous['master_context'])) {
      $formData['master_context'] = $previous['master_context'];
    }
    if ($existingIdx >= 0) {
      array_splice($existing, $existingIdx, 1);
    }
    array_unshift($existing, $formData);
    if (count($existing) > 1000) $existing = array_slice($existing, 0, 1000);
    save_online_form_entries_store($formCode, $existing);

    $allocation['online_submission'] = [
      'entry_id' => $entryId,
      'submitted_at' => $formData['submitted_at'],
      'submitted_by' => $formData['submitted_by'],
      'updated_at' => $formData['updated_at'],
      'updated_by' => $formData['updated_by'],
      'submission_revision' => (int)$formData['submission_revision'],
      'approval_state' => (string)($formData['approval_state'] ?? 'draft'),
      'signature_count' => count((array)($signatureValidation['summary'] ?? [])),
      'signature_summary' => $signatureValidation['summary'] ?? [],
    ];
    $allocation['signatures'] = is_array($formData['signatures'] ?? null) ? $formData['signatures'] : [];
    allocation_append_event($allocation, 'submitted', $formData['submitted_by'], 'online_form_submitted', [
      'entry_id' => $entryId,
      'submission_revision' => (int)$formData['submission_revision'],
      'approval_state' => (string)($formData['approval_state'] ?? 'draft'),
      'signature_blocks' => array_keys((array)($signatureValidation['summary'] ?? [])),
    ]);
    save_allocation_store($allocationStore);

    api_json(['ok' => true, 'entry_id' => $entryId, 'allocation' => $allocation]);
  }

  case 'upload_read_hidden_sheet': {
    require_logged_in($store);
    require_csrf();
    if (empty($_FILES['file']) || !is_array($_FILES['file'])) api_json(['ok' => false, 'error' => 'missing_file'], 400);
    $file = $_FILES['file'];
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) api_json(['ok' => false, 'error' => 'upload_failed'], 400);
    $ext = strtolower((string)pathinfo((string)$file['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, ['xlsx', 'xlsm'], true)) api_json(['ok' => false, 'error' => 'unsupported_file_type'], 400);

    $tmpInspect = allocation_base_dir() . '/tmp/' . basename((string)tempnam(allocation_base_dir() . '/tmp', 'inspect-')) . '.' . $ext;
    if (!@move_uploaded_file((string)$file['tmp_name'], $tmpInspect)) {
      if (!@copy((string)$file['tmp_name'], $tmpInspect)) api_json(['ok' => false, 'error' => 'temp_move_failed'], 500);
    }

    try {
      $inspect = inspect_uploaded_workbook($tmpInspect);
      if (!($inspect['ok'] ?? false)) api_json(['ok' => false, 'error' => $inspect['error'] ?? 'inspect_failed'], 422);
      $metadata = is_array($inspect['metadata'] ?? null) ? $inspect['metadata'] : [];
      $allocationId = trim((string)($metadata['allocation_id'] ?? $_POST['allocation_id'] ?? ''));
      $allocation = $allocationId !== '' ? allocation_find(load_allocation_store(), $allocationId) : null;
      $verification = verify_hidden_sheet_metadata($metadata, $allocation, (string)$file['name']);
      api_json([
        'ok' => true,
        'metadata' => $metadata,
        'upload_log' => $inspect['upload_log'] ?? [],
        'allocation' => $allocation,
        'verification' => $verification,
      ]);
    } finally {
      @unlink($tmpInspect);
    }
  }

  case 'upload_submit': {
    $me = require_logged_in($store);
    require_csrf();
    if (empty($_FILES['file']) || !is_array($_FILES['file'])) api_json(['ok' => false, 'error' => 'missing_file'], 400);
    $file = $_FILES['file'];
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) api_json(['ok' => false, 'error' => 'upload_failed'], 400);
    if ((int)($file['size'] ?? 0) > $MAX_FORM_UPLOAD_BYTES) api_json(['ok' => false, 'error' => 'file_too_large'], 413);
    $ext = strtolower((string)pathinfo((string)$file['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, ['xlsx', 'xlsm'], true)) api_json(['ok' => false, 'error' => 'unsupported_file_type'], 400);

    $tmpUpload = allocation_base_dir() . '/tmp/' . basename((string)tempnam(allocation_base_dir() . '/tmp', 'upload-')) . '.' . $ext;
    if (!@move_uploaded_file((string)$file['tmp_name'], $tmpUpload)) {
      if (!@copy((string)$file['tmp_name'], $tmpUpload)) api_json(['ok' => false, 'error' => 'temp_move_failed'], 500);
    }

    try {
      if (!uploaded_workbook_signature_valid($tmpUpload, $ext)) {
        api_json(['ok' => false, 'error' => 'workbook_signature_invalid'], 422);
      }

      $inspect = inspect_uploaded_workbook($tmpUpload);
      if (!($inspect['ok'] ?? false)) api_json(['ok' => false, 'error' => $inspect['error'] ?? 'inspect_failed'], 422);
      $metadata = is_array($inspect['metadata'] ?? null) ? $inspect['metadata'] : [];
      $allocationId = trim((string)($_POST['allocation_id'] ?? $metadata['allocation_id'] ?? ''));
      if ($allocationId === '') api_json(['ok' => false, 'error' => 'missing_allocation_id'], 400);

      $allocationStore = load_allocation_store();
      $allocation =& allocation_find_ref($allocationStore, $allocationId);
      if (!is_array($allocation)) api_json(['ok' => false, 'error' => 'allocation_not_found'], 404);

      $verification = verify_hidden_sheet_metadata($metadata, $allocation, (string)$file['name']);
      if (($verification['status'] ?? 'rejected') === 'rejected') {
        api_json(['ok' => false, 'error' => 'verification_failed', 'verification' => $verification, 'metadata' => $metadata], 422);
      }

      $username = strtolower(trim((string)($me['username'] ?? $_SESSION['user'] ?? 'anonymous')));
      $receiptVersion = ((int)($allocation['receipt_version'] ?? 0)) + 1;
      $storedFilename = build_received_filename($allocation, $receiptVersion, $ext);
      $targetDir = allocation_base_dir() . '/uploads/' . $allocationId;
      ensure_dir($targetDir);
      $storedPath = $targetDir . '/' . $storedFilename;

      $receiptHistory = is_array($allocation['receipts'] ?? null) ? $allocation['receipts'] : [];
      $receiptPayload = [
        'upload_timestamp' => now_iso(),
        'uploaded_by' => $username,
        'version' => $receiptVersion,
        'server_path' => $storedPath,
        'sha256_hash' => hash_file('sha256', $tmpUpload),
        'verification_status' => ($verification['warnings'] ?? []) ? 'filename_warning' : 'verified',
        'receipt_status' => 'received',
        'receipt_version' => $receiptVersion,
        'latest_stored_filename' => $storedFilename,
        'latest_upload_timestamp' => now_iso(),
      ];
      $receiptHistory[] = [
        'version' => $receiptVersion,
        'uploaded_at' => $receiptPayload['upload_timestamp'],
        'uploaded_by' => $username,
        'original_filename' => (string)$file['name'],
        'stored_filename' => $storedFilename,
        'verification_status' => $receiptPayload['verification_status'],
      ];
      $receiptPayload['receipt_history_json'] = $receiptHistory;

      append_receipt_to_workbook($tmpUpload, $storedPath, $receiptPayload);

      if (allocation_status_normalize((string)($allocation['status'] ?? 'allocated')) !== 'submitted') {
        allocation_append_event($allocation, 'submitted', $username, 'offline_form_submitted', ['original_filename' => (string)$file['name']]);
      }
      $allocation['receipt_version'] = $receiptVersion;
      $allocation['receipts'] = $receiptHistory;
      $allocation['latest_stored_filename'] = $storedFilename;
      $allocation['latest_upload_timestamp'] = $receiptPayload['latest_upload_timestamp'];
      allocation_append_event($allocation, 'received', $username, 'offline_form_received', ['stored_filename' => $storedFilename, 'version' => $receiptVersion]);
      save_allocation_store($allocationStore);

      api_json([
        'ok' => true,
        'allocation' => $allocation,
        'verification' => $verification,
        'receipt_version' => $receiptVersion,
        'stored_filename' => $storedFilename,
        'warning' => ($verification['warnings'] ?? []) ? 'filename_warning' : null,
      ]);
    } finally {
      @unlink($tmpUpload);
    }
  }

  case 'record_id_registry': {
    // GET — return all allowed prefixes and their config
    $regFile = $DATA_DIR . '/counters/_registry.json';
    if (!file_exists($regFile)) {
      api_json(['ok' => false, 'error' => 'registry_not_found'], 500);
    }
    $registry = json_decode(file_get_contents($regFile), true);
    if (!is_array($registry)) {
      api_json(['ok' => false, 'error' => 'registry_corrupt'], 500);
    }
    // Attach current counter values
    $countersDir = $DATA_DIR . '/counters';
    $result = [];
    foreach ($registry as $prefix => $cfg) {
      if (str_starts_with($prefix, '_')) continue;
      $year = date('Y');
      $cFile = $countersDir . '/' . $prefix . '-' . $year . '.txt';
      $current = file_exists($cFile) ? (int)trim(file_get_contents($cFile)) : 0;
      $result[$prefix] = array_merge($cfg, [
        'current_seq' => $current,
        'last_id' => $current > 0
          ? $prefix . '-' . $year . '-' . str_pad((string)$current, $cfg['digits'] ?? 3, '0', STR_PAD_LEFT)
          : null,
      ]);
    }
    api_json(['ok' => true, 'registry' => $result, 'year' => date('Y')]);
  }

  case 'record_id_next': {
    // POST — generate next sequential Record-ID (atomic, LOCK_EX)
    require_csrf();
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input || empty($input['prefix'])) {
      api_json(['ok' => false, 'error' => 'missing_prefix'], 400);
    }
    $prefix = strtoupper(trim((string)$input['prefix']));
    $year = trim((string)($input['year'] ?? date('Y')));
    if (!preg_match('/^[A-Z]{2,6}$/', $prefix)) {
      api_json(['ok' => false, 'error' => 'invalid_prefix_format'], 400);
    }
    if (!preg_match('/^20[2-3][0-9]$/', $year)) {
      api_json(['ok' => false, 'error' => 'invalid_year'], 400);
    }
    // Validate prefix against registry
    $regFile = $DATA_DIR . '/counters/_registry.json';
    if (!file_exists($regFile)) {
      api_json(['ok' => false, 'error' => 'registry_not_found'], 500);
    }
    $registry = json_decode(file_get_contents($regFile), true);
    if (!isset($registry[$prefix])) {
      api_json(['ok' => false, 'error' => 'prefix_not_allowed', 'allowed' => array_keys($registry)], 400);
    }
    $digits = (int)($registry[$prefix]['digits'] ?? 3);
    $formCode = $registry[$prefix]['form'] ?? null;

    // Atomic counter with file lock
    $countersDir = $DATA_DIR . '/counters';
    if (!is_dir($countersDir)) @mkdir($countersDir, 0755, true);
    $counterFile = $countersDir . '/' . $prefix . '-' . $year . '.txt';

    $fp = @fopen($counterFile, 'c+');
    if (!$fp) {
      api_json(['ok' => false, 'error' => 'counter_file_error'], 500);
    }
    if (!flock($fp, LOCK_EX)) {
      fclose($fp);
      api_json(['ok' => false, 'error' => 'counter_lock_failed'], 500);
    }
    $raw = fread($fp, 20);
    $current = $raw !== false ? (int)trim($raw) : 0;
    $next = $current + 1;
    $padded = str_pad((string)$next, $digits, '0', STR_PAD_LEFT);
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, $padded);
    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);

    $recordId = $prefix . '-' . $year . '-' . $padded;

    // Log the allocation
    $logFile = $countersDir . '/_allocation_log.jsonl';
    $logEntry = json_encode([
      'record_id' => $recordId,
      'prefix' => $prefix,
      'year' => $year,
      'seq' => $next,
      'user' => $_SESSION['user'] ?? 'anonymous',
      'ip' => $_SERVER['REMOTE_ADDR'] ?? '',
      'time' => date('c'),
    ], JSON_UNESCAPED_UNICODE) . "\n";
    @file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);

    // Build suggested filename
    $today = date('Ymd');
    $userName = $_SESSION['user'] ?? 'USER';
    // Extract initials from username (e.g. "sanh.vo" → "SV")
    $parts = preg_split('/[\.\-_]/', $userName);
    $initials = '';
    foreach ($parts as $p) { if ($p !== '') $initials .= strtoupper($p[0]); }
    if (strlen($initials) < 2) $initials = strtoupper(substr($userName, 0, 3));

    $suggestedFilename = null;
    if ($formCode) {
      // Look up form version from registry
      $formRegFile = $DATA_DIR . '/config/form_control_registry.json';
      $formVer = 'V0';
      if (file_exists($formRegFile)) {
        $formReg = json_decode(file_get_contents($formRegFile), true);
        if (isset($formReg[$formCode]['rev'])) {
          $formVer = $formReg[$formCode]['rev'];
        }
      }
      $suggestedFilename = $formCode . '_' . $formVer . '_' . $recordId . '_' . $today . '_HHMM-' . $initials . '.xlsx';
    }

    // Resolve blank form download path from form_control_registry
    $blankFormPath = null;
    $blankFormFilename = null;
    if ($formCode) {
      $formRegFile = $DATA_DIR . '/config/form_control_registry.json';
      if (file_exists($formRegFile)) {
        $formReg = json_decode(file_get_contents($formRegFile), true);
        if (isset($formReg[$formCode])) {
          $blankFormPath = $formReg[$formCode]['path'] ?? null;
          $blankFormFilename = $formReg[$formCode]['filename'] ?? null;
        }
      }
    }

    api_json([
      'ok' => true,
      'record_id' => $recordId,
      'prefix' => $prefix,
      'year' => $year,
      'seq' => $next,
      'form_code' => $formCode,
      'suggested_filename' => $suggestedFilename,
      'blank_form_path' => $blankFormPath,
      'blank_form_filename' => $blankFormFilename,
    ]);
  }

  case 'record_id_peek': {
    // GET — peek at next ID without incrementing
    $prefix = strtoupper(trim((string)($_GET['prefix'] ?? '')));
    $year = trim((string)($_GET['year'] ?? date('Y')));
    if (!$prefix) { api_json(['ok' => false, 'error' => 'missing_prefix'], 400); }
    $regFile = $DATA_DIR . '/counters/_registry.json';
    $registry = file_exists($regFile) ? json_decode(file_get_contents($regFile), true) : [];
    if (!isset($registry[$prefix])) {
      api_json(['ok' => false, 'error' => 'prefix_not_allowed'], 400);
    }
    $digits = (int)($registry[$prefix]['digits'] ?? 3);
    $counterFile = $DATA_DIR . '/counters/' . $prefix . '-' . $year . '.txt';
    $current = file_exists($counterFile) ? (int)trim(file_get_contents($counterFile)) : 0;
    $nextSeq = $current + 1;
    $nextId = $prefix . '-' . $year . '-' . str_pad((string)$nextSeq, $digits, '0', STR_PAD_LEFT);
    api_json([
      'ok' => true,
      'next_seq' => $nextSeq,
      'next_id' => $nextId,
      'last_seq' => $current,
      'last_id' => $current > 0
        ? $prefix . '-' . $year . '-' . str_pad((string)$current, $digits, '0', STR_PAD_LEFT)
        : null,
    ]);
  }

  // ═══════════════════════════════════════════════════
  // ONLINE FORMS ENGINE
  // ═══════════════════════════════════════════════════
  case 'online_form_list': {
    $schemasDir = $DATA_DIR . '/online-forms/schemas';
    $entriesDir = $DATA_DIR . '/online-forms/entries';
    $forms = [];
    $entries = [];
    if (is_dir($schemasDir)) {
      foreach (glob($schemasDir . '/*.json') as $f) {
        $raw = @file_get_contents($f);
        if ($raw) {
          $schema = json_decode($raw, true);
          if ($schema && !empty($schema['form_code'])) {
            $forms[] = $schema;
            // Load entries count for today
            $code = $schema['form_code'];
            $entryFile = $entriesDir . '/' . $code . '.json';
            if (file_exists($entryFile)) {
              $eRaw = @file_get_contents($entryFile);
              $eData = $eRaw ? json_decode($eRaw, true) : [];
              $entries[$code] = is_array($eData) ? $eData : [];
            } else {
              $entries[$code] = [];
            }
          }
        }
      }
    }
    usort($forms, function($a, $b){ return strcmp($a['form_code'], $b['form_code']); });
    api_json(['ok' => true, 'forms' => $forms, 'entries' => $entries]);
  }

  case 'form_catalog_snapshot': {
    require_logged_in($store);
    $schemasDir = $DATA_DIR . '/online-forms/schemas';
    $onlineMap = [];
    $catalogMap = [];
    if (is_dir($schemasDir)) {
      foreach (glob($schemasDir . '/*.json') as $f) {
        $schema = json_decode((string)@file_get_contents($f), true);
        if (!is_array($schema) || empty($schema['form_code'])) continue;
        $code = (string)$schema['form_code'];
        $onlineMap[$code] = [
          'form_code' => $code,
          'title' => (string)($schema['title'] ?? $code),
          'title_vi' => (string)($schema['title_vi'] ?? $schema['title'] ?? $code),
          'description' => (string)($schema['description'] ?? ''),
          'description_vi' => (string)($schema['description_vi'] ?? $schema['description'] ?? ''),
          'category' => (string)($schema['category'] ?? 'other'),
          'sop_ref' => (string)($schema['sop_ref'] ?? ''),
          'online' => ($schema['online'] ?? true) !== false,
          'version' => (string)($schema['version'] ?? 'V1'),
          'schema' => $schema,
        ];
        $catalogMap[$code] = $onlineMap[$code];
      }
    }

    if (is_file($FORM_CONTROL_REGISTRY_FILE)) {
      $registry = json_decode((string)file_get_contents($FORM_CONTROL_REGISTRY_FILE), true);
      if (is_array($registry)) {
        foreach ($registry as $code => $entry) {
          if (!is_array($entry)) continue;
          if (isset($onlineMap[$code])) {
            $catalogMap[$code]['blank_path'] = (string)($entry['path'] ?? '');
            $catalogMap[$code]['blank_filename'] = (string)($entry['filename'] ?? '');
            $catalogMap[$code]['template_checksum'] = (string)($entry['sha256'] ?? '');
            $catalogMap[$code]['offline_fallback_available'] = (string)($entry['path'] ?? '') !== '';
            $catalogMap[$code]['delivery_mode'] = !empty($catalogMap[$code]['online'])
              ? 'online'
              : (string)($entry['delivery_mode'] ?? 'download');
            continue;
          }
          $num = (int)preg_replace('/\D+/', '', (string)$code);
          $series = (int)floor($num / 100) * 100;
          $category = match (true) {
            $series >= 500 && $series < 600 => 'production',
            $series >= 600 && $series < 700 => 'quality',
            $series >= 800 && $series < 900 => 'hr',
            $series >= 700 && $series < 800 => 'logistics',
            default => 'other',
          };
          $catalogMap[$code] = [
            'form_code' => (string)$code,
            'title' => (string)($entry['title'] ?? $code),
            'title_vi' => (string)($entry['title'] ?? $code),
            'description' => '',
            'category' => $category,
            'sop_ref' => '',
            'online' => false,
            'version' => (string)($entry['rev'] ?? 'V0'),
            'blank_path' => (string)($entry['path'] ?? ''),
            'blank_filename' => (string)($entry['filename'] ?? ''),
            'template_checksum' => (string)($entry['sha256'] ?? ''),
            'delivery_mode' => (string)($entry['delivery_mode'] ?? 'download'),
          ];
        }
      }
    }

    $forms = array_values($catalogMap);
    usort($forms, fn($a, $b) => strcmp((string)($a['form_code'] ?? ''), (string)($b['form_code'] ?? '')));
    api_json(['ok' => true, 'forms' => $forms]);
  }

  case 'online_form_schema': {
    $code = trim((string)($_GET['code'] ?? ''));
    if (!$code) { api_json(['ok' => false, 'error' => 'missing_code'], 400); }
    $schemasDir = $DATA_DIR . '/online-forms/schemas';
    $file = $schemasDir . '/' . $code . '.json';
    if (!file_exists($file)) { api_json(['ok' => false, 'error' => 'schema_not_found'], 404); }
    $schema = json_decode(file_get_contents($file), true);
    if (!$schema) { api_json(['ok' => false, 'error' => 'invalid_schema'], 500); }
    api_json(['ok' => true, 'schema' => $schema]);
  }

  case 'online_form_submit': {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input || empty($input['form_code']) || empty($input['data'])) {
      api_json(['ok' => false, 'error' => 'invalid_payload'], 400);
    }
    $code = (string)$input['form_code'];
    $data = $input['data'];
    $status = (string)($input['status'] ?? 'submitted');
    $entriesDir = $DATA_DIR . '/online-forms/entries';
    if (!is_dir($entriesDir)) @mkdir($entriesDir, 0755, true);
    $entryFile = $entriesDir . '/' . $code . '.json';
    $existing = [];
    if (file_exists($entryFile)) {
      $raw = @file_get_contents($entryFile);
      $existing = $raw ? json_decode($raw, true) : [];
      if (!is_array($existing)) $existing = [];
    }
    // Add server-side metadata
    $data['_server_time'] = date('c');
    $data['_status'] = $status;
    $data['_ip'] = $_SERVER['REMOTE_ADDR'] ?? '';
    if (!empty($_SESSION['user'])) $data['_session_user'] = (string)$_SESSION['user'];
    array_unshift($existing, $data);
    // Keep max 1000 entries per form
    if (count($existing) > 1000) $existing = array_slice($existing, 0, 1000);
    file_put_contents($entryFile, json_encode($existing, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
    api_json(['ok' => true, 'entry_id' => $data['entry_id'] ?? '', 'count' => count($existing)]);
  }

  case 'online_form_entries': {
    $code = trim((string)($_GET['code'] ?? ''));
    if (!$code) { api_json(['ok' => false, 'error' => 'missing_code'], 400); }
    $entryFile = $DATA_DIR . '/online-forms/entries/' . $code . '.json';
    $entries = [];
    if (file_exists($entryFile)) {
      $raw = @file_get_contents($entryFile);
      $entries = $raw ? json_decode($raw, true) : [];
    }
    api_json(['ok' => true, 'entries' => is_array($entries) ? $entries : []]);
  }

  case 'online_form_entry_get': {
    require_logged_in($store);
    require_csrf();
    $body = read_json_body();
    $code = trim((string)($body['form_code'] ?? $_GET['form_code'] ?? ''));
    if ($code === '') { api_json(['ok' => false, 'error' => 'missing_form_code'], 400); }
    $entryId = trim((string)($body['entry_id'] ?? $_GET['entry_id'] ?? ''));
    $allocationId = trim((string)($body['allocation_id'] ?? $_GET['allocation_id'] ?? ''));
    if ($entryId === '' && $allocationId === '') { api_json(['ok' => false, 'error' => 'missing_entry_selector'], 400); }
    $entries = load_online_form_entries_store($code);
    $entryIndex = find_online_form_entry_index($entries, $entryId, $allocationId);
    if ($entryIndex < 0 || !is_array($entries[$entryIndex] ?? null)) { api_json(['ok' => false, 'error' => 'entry_not_found'], 404); }
    api_json(['ok' => true, 'entry' => $entries[$entryIndex]]);
  }

  // ── Dashboard, KPI & SPC Analytics ─────────────────────────────────────
  case 'dashboard_executive':
  case 'dashboard_quality':
  case 'dashboard_production':
  case 'dashboard_supplier':
  case 'dashboard_department':
  case 'dashboard_widget':
  case 'kpi_get':
  case 'kpi_trend':
  case 'kpi_alerts':
  case 'spc_capability':
  case 'spc_chart':
  case 'spc_summary':
  case 'spc_alerts': {
    require_logged_in($store);
    // Delegate to DashboardController (MVC layer)
    require_once __DIR__ . '/api/controllers/BaseController.php';
    require_once __DIR__ . '/api/controllers/DashboardController.php';
    require_once __DIR__ . '/api/services/KpiEngine.php';
    require_once __DIR__ . '/api/services/SpcEngine.php';
    require_once __DIR__ . '/api/services/DashboardService.php';
    require_once __DIR__ . '/database/Connection.php';
    require_once __DIR__ . '/database/DataLayer.php';

    $dataLayer = new \HESEM\QMS\Database\DataLayer($DATA_DIR, $ROOT_DIR);
    $ctrl = new \HESEM\QMS\Api\Controllers\DashboardController($dataLayer, $ROOT_DIR, $DATA_DIR);
    $ctrl->setStore($store);
    $ctrl->handleAction($action);
    break; // handleAction() calls exit, but break for safety
  }

  // ── Master Data Runtime ────────────────────────────────────────────────
  case 'master_data_snapshot': {
    require_logged_in($store);
    $data = load_master_data_store();
    api_json([
      'ok' => true,
      'data' => $data,
      'summary' => [
        'customers' => count($data['customers'] ?? []),
        'suppliers' => count($data['suppliers'] ?? []),
        'parts' => count($data['parts'] ?? []),
        'revisions' => count($data['revisions'] ?? []),
        'capas' => count($data['capas'] ?? []),
      ],
    ]);
  }

  case 'master_data_upsert': {
    if (!is_array($store)) api_json(['ok' => false, 'error' => 'system_not_initialized'], 500);
    $me = require_logged_in($store);
    require_csrf();

    $role = migrate_role((string)($me['role'] ?? ''));
    $allowedRoles = ['ceo', 'qa_manager', 'qms_engineer', 'sales_manager', 'estimator', 'customer_service', 'buyer', 'supply_chain_manager', 'production_manager', 'planning_manager'];
    if (!in_array($role, $allowedRoles, true) && !in_array($role, admin_roles(), true)) {
      api_json(['ok' => false, 'error' => 'forbidden'], 403);
    }

    $body = read_json_body();
    $entity = trim((string)($body['entity'] ?? ''));
    $item = is_array($body['item'] ?? null) ? $body['item'] : null;
    if ($entity === '' || $item === null) api_json(['ok' => false, 'error' => 'invalid_payload'], 400);

    try {
      $data = load_master_data_store();
      $saved = upsert_master_data_item($data, $entity, $item, (string)($_SESSION['user'] ?? 'system'));
      save_master_data_store($data);
      api_json(['ok' => true, 'entity' => $entity, 'item' => $saved]);
    } catch (Throwable $e) {
      api_json(['ok' => false, 'error' => $e->getMessage()], 400);
    }
  }

  // ── Order Management Runtime ───────────────────────────────────────────
  case 'order_dashboard_stats': {
    $me = require_logged_in($store);
    require_order_permission($me, 'so', 'view');
    $stats = compute_order_dashboard_stats(load_orders_store());
    api_json(['ok' => true, 'data' => $stats]);
  }

  case 'order_hierarchy': {
    $me = require_logged_in($store);
    require_order_permission($me, 'so', 'view');
    $orders = load_orders_store();
    $master = load_master_data_store();
    $hierarchy = build_order_hierarchy($orders, $master);
    api_json(['ok' => true, 'data' => $hierarchy, 'hierarchy' => $hierarchy]);
  }

  case 'order_detail': {
    $me = require_logged_in($store);
    $body = read_json_body();
    $orderId = trim((string)($body['order_id'] ?? $_GET['order_id'] ?? ''));
    $orderType = strtolower(trim((string)($body['order_type'] ?? $_GET['order_type'] ?? '')));
    if ($orderId === '' || !in_array($orderType, ['so', 'jo', 'wo'], true)) {
      api_json(['ok' => false, 'error' => 'invalid_order_detail_request'], 400);
    }
    require_order_permission($me, $orderType, 'view');

    $orders = load_orders_store();
    $master = load_master_data_store();
    $record = find_order_record($orders, $orderType, $orderId);
    if (!$record) api_json(['ok' => false, 'error' => 'not_found'], 404);

    $links = array_values(array_filter((array)($orders['form_links'] ?? []), fn($row) => is_array($row) && (string)($row['order_type'] ?? '') === $orderType && (string)($row['order_id'] ?? '') === $orderId));

    if ($orderType === 'jo') {
      $record['operations'] = array_values(array_filter((array)($orders['work_orders'] ?? []), fn($row) => is_array($row) && (string)($row['jo_number'] ?? '') === $orderId));
    }
    if ($orderType === 'so') {
      $record['job_orders'] = array_values(array_filter((array)($orders['job_orders'] ?? []), fn($row) => is_array($row) && (string)($row['so_number'] ?? '') === $orderId));
    }
    if ($orderType === 'wo') {
      $parentJo = (string)($record['jo_number'] ?? '');
      if ($parentJo !== '') {
        $record['job_order'] = find_order_record($orders, 'jo', $parentJo);
      }
    }

    $record['linked_forms'] = $links;
    $record['master_data_ref'] = [
      'customer_id' => (string)($record['customer_id'] ?? ''),
      'part_number' => (string)($record['part_number'] ?? ''),
      'part_revision' => (string)($record['part_revision'] ?? ''),
    ];
    api_json(['ok' => true, 'data' => $record]);
  }

  case 'order_so_create':
  case 'order_jo_create':
  case 'order_wo_create': {
    if (!is_array($store)) api_json(['ok' => false, 'error' => 'system_not_initialized'], 500);
    $me = require_logged_in($store);
    require_csrf();
    $entity = str_contains($action, '_so_') ? 'so' : (str_contains($action, '_jo_') ? 'jo' : 'wo');
    require_order_permission($me, $entity, 'create');

    $body = read_json_body();
    $orders = load_orders_store();
    $master = load_master_data_store();
    $meta = order_entity_config($entity);
    $idKey = $meta['number_key'];
    $now = now_iso();
    $username = (string)($_SESSION['user'] ?? 'system');

    $record = $body;
    $record[$idKey] = next_order_number($orders, $entity);
    $record['status'] = strtolower(trim((string)($record['status'] ?? $meta['default_status'])));
    $record['created_at'] = $now;
    $record['created_by'] = $username;
    $record['updated_at'] = $now;
    $record['updated_by'] = $username;
    $record['status_history'] = [[
      'status' => $record['status'],
      'timestamp' => $now,
      'user' => $username,
      'note' => 'created'
    ]];

    if ($entity === 'so') {
      $customerId = trim((string)($record['customer_id'] ?? ''));
      if ($customerId === '' || trim((string)($record['customer_po'] ?? '')) === '' || trim((string)($record['order_date'] ?? '')) === '' || trim((string)($record['due_date'] ?? '')) === '') {
        api_json(['ok' => false, 'error' => 'missing_required_fields'], 400);
      }
      foreach (($master['customers'] ?? []) as $customer) {
        if (is_array($customer) && (string)($customer['customer_id'] ?? '') === $customerId) {
          $record['customer_name'] = (string)($customer['customer_name'] ?? '');
          break;
        }
      }
      $orders['sales_orders'][] = $record;
    } elseif ($entity === 'jo') {
      $soNumber = trim((string)($record['so_number'] ?? ''));
      $partNumber = trim((string)($record['part_number'] ?? ''));
      if ($soNumber === '' || $partNumber === '' || trim((string)($record['part_revision'] ?? '')) === '' || trim((string)($record['start_date'] ?? '')) === '' || trim((string)($record['due_date'] ?? '')) === '') {
        api_json(['ok' => false, 'error' => 'missing_required_fields'], 400);
      }
      $parentSo = find_order_record($orders, 'so', $soNumber);
      if (!$parentSo) api_json(['ok' => false, 'error' => 'parent_so_not_found'], 404);
      $record['customer_id'] = (string)($parentSo['customer_id'] ?? '');
      foreach (($master['parts'] ?? []) as $part) {
        if (!is_array($part) || (string)($part['part_number'] ?? '') !== $partNumber) continue;
        if (($record['part_description'] ?? '') === '') $record['part_description'] = (string)($part['part_description'] ?? '');
        break;
      }
      $orders['job_orders'][] = $record;
    } else {
      $joNumber = trim((string)($record['jo_number'] ?? ''));
      if ($joNumber === '' || trim((string)($record['operation_number'] ?? '')) === '' || trim((string)($record['operation_desc'] ?? '')) === '' || trim((string)($record['machine_id'] ?? '')) === '' || trim((string)($record['work_center_id'] ?? '')) === '') {
        api_json(['ok' => false, 'error' => 'missing_required_fields'], 400);
      }
      $parentJo = find_order_record($orders, 'jo', $joNumber);
      if (!$parentJo) api_json(['ok' => false, 'error' => 'parent_jo_not_found'], 404);
      $orders['work_orders'][] = $record;
    }

    save_orders_store($orders);
    api_json(['ok' => true, 'data' => $record]);
  }

  case 'order_so_update_status':
  case 'order_jo_update_status':
  case 'order_wo_update_status': {
    if (!is_array($store)) api_json(['ok' => false, 'error' => 'system_not_initialized'], 500);
    $me = require_logged_in($store);
    require_csrf();
    $entity = str_contains($action, '_so_') ? 'so' : (str_contains($action, '_jo_') ? 'jo' : 'wo');
    require_order_permission($me, $entity, 'edit');

    $body = read_json_body();
    $orderId = trim((string)($body['order_id'] ?? ''));
    $newStatus = strtolower(trim((string)($body['status'] ?? '')));
    if ($orderId === '' || $newStatus === '') api_json(['ok' => false, 'error' => 'invalid_payload'], 400);

    $orders = load_orders_store();
    $meta = order_entity_config($entity);
    $storeKey = $meta['store_key'];
    $idKey = $meta['number_key'];
    $updated = null;
    foreach ($orders[$storeKey] as $idx => $row) {
      if (!is_array($row) || (string)($row[$idKey] ?? '') !== $orderId) continue;
      $orders[$storeKey][$idx]['status'] = $newStatus;
      $orders[$storeKey][$idx]['updated_at'] = now_iso();
      $orders[$storeKey][$idx]['updated_by'] = (string)($_SESSION['user'] ?? 'system');
      $orders[$storeKey][$idx]['status_history'] = array_values((array)($orders[$storeKey][$idx]['status_history'] ?? []));
      $orders[$storeKey][$idx]['status_history'][] = [
        'status' => $newStatus,
        'timestamp' => now_iso(),
        'user' => (string)($_SESSION['user'] ?? 'system'),
      ];
      if ($entity === 'so' && $newStatus === 'shipped' && empty($orders[$storeKey][$idx]['shipped_date'])) {
        $orders[$storeKey][$idx]['shipped_date'] = date('Y-m-d');
      }
      if (in_array($newStatus, ['closed', 'completed'], true)) {
        $orders[$storeKey][$idx]['closed_date'] = date('Y-m-d');
      }
      $updated = $orders[$storeKey][$idx];
      break;
    }
    if (!$updated) api_json(['ok' => false, 'error' => 'not_found'], 404);
    save_orders_store($orders);
    api_json(['ok' => true, 'data' => $updated]);
  }

  case 'order_link_form': {
    if (!is_array($store)) api_json(['ok' => false, 'error' => 'system_not_initialized'], 500);
    $me = require_logged_in($store);
    require_csrf();

    $body = read_json_body();
    $orderId = trim((string)($body['order_id'] ?? ''));
    $orderType = strtolower(trim((string)($body['order_type'] ?? '')));
    $recordId = strtoupper(trim((string)($body['record_id'] ?? '')));
    if ($orderId === '' || $recordId === '' || !in_array($orderType, ['so', 'jo', 'wo'], true)) {
      api_json(['ok' => false, 'error' => 'invalid_payload'], 400);
    }
    require_order_permission($me, $orderType, 'edit');

    $orders = load_orders_store();
    if (!find_order_record($orders, $orderType, $orderId)) api_json(['ok' => false, 'error' => 'order_not_found'], 404);
    foreach (($orders['form_links'] ?? []) as $link) {
      if (!is_array($link)) continue;
      if ((string)($link['order_type'] ?? '') === $orderType && (string)($link['order_id'] ?? '') === $orderId && (string)($link['record_id'] ?? '') === $recordId) {
        api_json(['ok' => false, 'error' => 'link_exists'], 400);
      }
    }
    $link = [
      'link_id' => 'LINK-' . date('YmdHis') . '-' . substr(md5($orderType . '|' . $orderId . '|' . $recordId), 0, 8),
      'order_id' => $orderId,
      'order_type' => $orderType,
      'record_id' => $recordId,
      'status' => 'linked',
      'linked_at' => now_iso(),
      'linked_by' => (string)($_SESSION['user'] ?? 'system'),
    ];
    $orders['form_links'][] = $link;
    save_orders_store($orders);
    api_json(['ok' => true, 'data' => $link]);
  }

  // ── Form Fill: Load Schema, Save Draft, History ─────────────────────────
  case 'form_fill_load_schema': {
    $code = trim((string)($_GET['form_code'] ?? ''));
    if ($code === '') api_json(['ok' => false, 'error' => 'missing_form_code'], 400);
    // Sanitise: allow only alphanumeric, dash, underscore, dot
    if (!preg_match('/^[A-Za-z0-9._-]+$/', $code)) api_json(['ok' => false, 'error' => 'invalid_form_code'], 400);
    $schemasDir = $DATA_DIR . '/online-forms/schemas';
    $file = $schemasDir . '/' . $code . '.json';
    if (!file_exists($file)) api_json(['ok' => false, 'error' => 'schema_not_found'], 404);
    $schema = json_decode(file_get_contents($file), true);
    if (!$schema) api_json(['ok' => false, 'error' => 'invalid_schema'], 500);
    api_json(['ok' => true, 'schema' => $schema]);
  }

  case 'form_fill_save_draft': {
    $me = require_logged_in($store);
    require_csrf();
    $body = read_json_body();
    $allocationId = trim((string)($body['allocation_id'] ?? ''));
    $formCode = trim((string)($body['form_code'] ?? ''));
    $data = is_array($body['data'] ?? null) ? $body['data'] : [];
    if ($allocationId === '' || $formCode === '') {
      api_json(['ok' => false, 'error' => 'missing_allocation_id_or_form_code'], 400);
    }
    // Sanitise allocation_id
    if (!preg_match('/^[A-Za-z0-9._-]+$/', $allocationId)) api_json(['ok' => false, 'error' => 'invalid_allocation_id'], 400);
    $draftsDir = $DATA_DIR . '/online-forms/drafts';
    if (!is_dir($draftsDir)) @mkdir($draftsDir, 0755, true);
    $draftFile = $draftsDir . '/' . $allocationId . '.json';
    $username = strtolower(trim((string)($me['username'] ?? $_SESSION['user'] ?? 'anonymous')));
    $draftPayload = [
      'allocation_id' => $allocationId,
      'form_code' => $formCode,
      'data' => $data,
      'saved_at' => date('c'),
      'saved_by' => $username,
    ];
    file_put_contents($draftFile, json_encode($draftPayload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
    api_json(['ok' => true]);
  }

  case 'form_fill_history': {
    require_logged_in($store);
    $formCode = trim((string)($_GET['form_code'] ?? ''));
    $userFilter = trim((string)($_GET['user'] ?? ''));
    $page = max(1, (int)($_GET['page'] ?? 1));
    $pageSize = max(1, min(100, (int)($_GET['page_size'] ?? 20)));
    if ($formCode === '') api_json(['ok' => false, 'error' => 'missing_form_code'], 400);
    $entries = load_online_form_entries_store($formCode);
    if ($userFilter !== '') {
      $userFilterLc = strtolower($userFilter);
      $entries = array_values(array_filter($entries, function ($e) use ($userFilterLc) {
        return strtolower(trim((string)($e['submitted_by'] ?? $e['created_by'] ?? $e['_session_user'] ?? ''))) === $userFilterLc;
      }));
    }
    $total = count($entries);
    $pages = max(1, (int)ceil($total / $pageSize));
    $offset = ($page - 1) * $pageSize;
    $slice = array_slice($entries, $offset, $pageSize);
    api_json(['ok' => true, 'entries' => $slice, 'total' => $total, 'page' => $page, 'pages' => $pages]);
  }

  default:
    api_json(['ok' => false, 'error' => 'unknown_action'], 400);
}
