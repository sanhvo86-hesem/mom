<?php
declare(strict_types=1);

/**
 * HESEM QMS post-deploy health check (CLI).
 *
 * Usage:
 *   php postdeploy_healthcheck.php
 *   php postdeploy_healthcheck.php --url="https://qms.hesem.com.vn/01-QMS-Portal/api.php"
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    header('Content-Type: text/plain; charset=UTF-8');
    echo "Forbidden\n";
    exit;
}

function opt(string $name): ?string
{
    global $argv;
    foreach ($argv as $arg) {
        if (str_starts_with($arg, "--{$name}=")) {
            return substr($arg, strlen("--{$name}="));
        }
    }
    return null;
}

function yesNo(bool $v): string { return $v ? 'YES' : 'NO'; }

function resolve_paths(): array
{
    $baseDir = realpath(__DIR__ . '/..') ?: dirname(__DIR__);
    $rootDir = realpath($baseDir . '/..') ?: dirname($baseDir);
    $rootParentDir = realpath($rootDir . '/..') ?: dirname($rootDir);
    $legacyDataDir = $baseDir . '/qms-data';

    $dataDirEnv = trim((string)(getenv('QMS_DATA_DIR') ?: ''));
    if ($dataDirEnv !== '') {
        $dataDir = rtrim(str_replace('\\', '/', $dataDirEnv), '/\\');
        $dataSource = 'ENV(QMS_DATA_DIR)';
    } else {
        $candidate = rtrim(str_replace('\\', '/', $rootParentDir), '/\\') . '/qms-data-private';
        $dataDir = $candidate;
        $dataSource = 'auto-private';
    }

    if (!is_dir($dataDir)) @mkdir($dataDir, 0775, true);
    if (!is_dir($dataDir) || !is_writable($dataDir)) {
        $dataDir = $legacyDataDir;
        $dataSource = 'legacy-fallback';
    }

    return [
        'base_dir' => $baseDir,
        'root_dir' => $rootDir,
        'legacy_data_dir' => $legacyDataDir,
        'data_dir' => $dataDir,
        'data_source' => $dataSource,
        'conf_dir' => $dataDir . '/config',
        'users_file' => $dataDir . '/config/users.json',
        'sessions_dir' => $dataDir . '/sessions',
        'ratelimit_dir' => $dataDir . '/ratelimit',
        'portal_htaccess' => $baseDir . '/.htaccess',
        'qmsdata_htaccess' => $baseDir . '/qms-data/.htaccess',
        'scripts_htaccess' => $baseDir . '/scripts/.htaccess',
    ];
}

function contains_rule(string $file, string $needle): bool
{
    if (!is_file($file)) return false;
    $raw = (string)@file_get_contents($file);
    if ($raw === '') return false;
    return str_contains($raw, $needle);
}

function http_status_check(string $apiUrl): array
{
    $sep = str_contains($apiUrl, '?') ? '&' : '?';
    $url = $apiUrl . $sep . 'action=status';
    $ctx = stream_context_create([
        'http' => [
            'method' => 'GET',
            'timeout' => 10,
            'ignore_errors' => true,
            'header' => "Accept: application/json\r\n",
        ],
    ]);
    $body = @file_get_contents($url, false, $ctx);
    $code = 0;
    if (isset($http_response_header[0]) && preg_match('#\s(\d{3})\s#', $http_response_header[0], $m)) {
        $code = (int)$m[1];
    }
    $ok = false;
    if ($body !== false) {
        $j = json_decode($body, true);
        $ok = is_array($j) && ($j['ok'] ?? false) === true;
    }
    return ['code' => $code, 'ok' => $ok, 'body' => (string)$body];
}

$p = resolve_paths();
$critical = [];
$warnings = [];

if (!is_dir($p['data_dir'])) $critical[] = "DATA_DIR missing: {$p['data_dir']}";
if (!is_writable($p['data_dir'])) $critical[] = "DATA_DIR not writable: {$p['data_dir']}";
if (!is_dir($p['conf_dir'])) $critical[] = "Config dir missing: {$p['conf_dir']}";
if (!is_file($p['users_file'])) $critical[] = "users.json missing: {$p['users_file']}";

foreach (['sessions_dir', 'ratelimit_dir'] as $k) {
    if (!is_dir($p[$k])) $warnings[] = "Directory missing (will be auto-created at runtime): {$p[$k]}";
}

if (!contains_rule($p['portal_htaccess'], 'RewriteRule ^qms-data/ - [F,L,NC]')) {
    $critical[] = "Missing qms-data deny rule in {$p['portal_htaccess']}";
}
if (!contains_rule($p['portal_htaccess'], 'RewriteRule \\.(zip|sql|bak|old)$ - [F,L,NC]')) {
    $warnings[] = "Missing backup-file deny rule in {$p['portal_htaccess']}";
}

if (!contains_rule($p['qmsdata_htaccess'], 'Require all denied') && !contains_rule($p['qmsdata_htaccess'], 'Deny from all')) {
    $warnings[] = "qms-data/.htaccess deny rule not found at {$p['qmsdata_htaccess']}";
}
if (!contains_rule($p['scripts_htaccess'], 'Require all denied') && !contains_rule($p['scripts_htaccess'], 'Deny from all')) {
    $critical[] = "scripts/.htaccess PHP deny rule not found at {$p['scripts_htaccess']}";
}

$zipFiles = glob($p['base_dir'] . '/*.zip') ?: [];
if (count($zipFiles) > 0) {
    $warnings[] = "ZIP files found under portal directory (" . count($zipFiles) . "). Keep blocked or move to non-public path.";
}

$url = opt('url');
$http = null;
if ($url !== null && $url !== '') {
    $http = http_status_check($url);
    if ($http['code'] !== 200 || !$http['ok']) {
        $critical[] = "API status check failed ({$http['code']}) at {$url}";
    }
}

echo "=== HESEM QMS Post-Deploy Health Check ===\n";
echo "BASE_DIR: {$p['base_dir']}\n";
echo "DATA_DIR: {$p['data_dir']} ({$p['data_source']})\n";
echo "LEGACY_DATA_DIR: {$p['legacy_data_dir']}\n";
echo "users.json exists: " . yesNo(is_file($p['users_file'])) . "\n";
echo "DATA_DIR writable: " . yesNo(is_writable($p['data_dir'])) . "\n";
echo "portal .htaccess: " . yesNo(is_file($p['portal_htaccess'])) . "\n";
echo "qms-data .htaccess: " . yesNo(is_file($p['qmsdata_htaccess'])) . "\n";
echo "scripts .htaccess: " . yesNo(is_file($p['scripts_htaccess'])) . "\n";
if ($http !== null) {
    echo "API status URL: {$url}\n";
    echo "API status code: {$http['code']}\n";
    echo "API payload valid: " . yesNo($http['ok']) . "\n";
}

if ($warnings) {
    echo "\n[WARNINGS]\n";
    foreach ($warnings as $w) echo "- {$w}\n";
}

if ($critical) {
    echo "\n[CRITICAL]\n";
    foreach ($critical as $c) echo "- {$c}\n";
    exit(2);
}

echo "\nResult: HEALTH CHECK PASSED\n";
exit(0);
