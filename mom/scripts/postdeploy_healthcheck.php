<?php
declare(strict_types=1);

/**
 * HESEM MOM post-deploy health check (CLI).
 *
 * Usage:
 *   php postdeploy_healthcheck.php
 *   php postdeploy_healthcheck.php --url="https://qms.hesem.com.vn/mom/api.php"
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

function normalize_runtime_dir(string $dir): string
{
    return rtrim(str_replace('\\', '/', trim($dir)), '/\\');
}

function runtime_dir_has_bootstrap_files(string $dir): bool
{
    $dir = normalize_runtime_dir($dir);
    if ($dir === '') {
        return false;
    }

    $configDir = $dir . '/config';
    foreach (['users.json', 'role_permissions.json', 'docs_custom.json', 'form_control_registry.json'] as $marker) {
        if (is_file($configDir . '/' . $marker)) {
            return true;
        }
    }

    return false;
}

function runtime_dir_looks_like_legacy_qms(string $dir): bool
{
    $dir = normalize_runtime_dir($dir);
    if ($dir === '') {
        return false;
    }

    return strtolower((string)pathinfo($dir, PATHINFO_BASENAME)) === 'qms-data';
}

function resolve_runtime_data_dir(string $envDir, string $inRepoDir, string $legacyCompatDir): string
{
    $envDir = normalize_runtime_dir($envDir);
    $inRepoDir = normalize_runtime_dir($inRepoDir);
    $legacyCompatDir = normalize_runtime_dir($legacyCompatDir);

    if ($envDir !== '') {
        if ($envDir === $inRepoDir) {
            return $inRepoDir;
        }

        if (runtime_dir_looks_like_legacy_qms($envDir) && runtime_dir_has_bootstrap_files($inRepoDir)) {
            return $inRepoDir;
        }

        if (runtime_dir_has_bootstrap_files($envDir)) {
            return $envDir;
        }
    }

    if (runtime_dir_has_bootstrap_files($inRepoDir)) {
        return $inRepoDir;
    }
    if (runtime_dir_has_bootstrap_files($legacyCompatDir)) {
        return $legacyCompatDir;
    }
    if ($envDir !== '') {
        return $envDir;
    }

    return $inRepoDir;
}

function resolve_paths(): array
{
    $baseDir = realpath(__DIR__ . '/..') ?: dirname(__DIR__);
    $rootDir = realpath($baseDir . '/..') ?: dirname($baseDir);
    $rootParentDir = realpath($rootDir . '/..') ?: dirname($rootDir);
    $legacyDataDir = $baseDir . '/data';
    $legacyCompatDataDir = $rootDir . '/qms-data';
    $privateDataDir = normalize_runtime_dir($rootParentDir . '/data-private');

    $dataDirEnv = trim((string)(getenv('QMS_DATA_DIR') ?: ''));
    if ($dataDirEnv !== '') {
        $dataDir = resolve_runtime_data_dir($dataDirEnv, $legacyDataDir, $legacyCompatDataDir);
        $dataSource = 'ENV(QMS_DATA_DIR)';
    } elseif (runtime_dir_has_bootstrap_files($legacyDataDir)) {
        $dataDir = normalize_runtime_dir($legacyDataDir);
        $dataSource = 'canonical-in-repo';
    } elseif (runtime_dir_has_bootstrap_files($legacyCompatDataDir)) {
        $dataDir = normalize_runtime_dir($legacyCompatDataDir);
        $dataSource = 'legacy-compat';
    } elseif (runtime_dir_has_bootstrap_files($privateDataDir)) {
        $dataDir = $privateDataDir;
        $dataSource = 'auto-private';
    } else {
        $dataDir = normalize_runtime_dir($legacyDataDir);
        $dataSource = 'canonical-in-repo-fallback';
    }

    if (!is_dir($dataDir)) @mkdir($dataDir, 0775, true);
    if (!is_dir($dataDir) || !is_writable($dataDir)) {
        $dataDir = $legacyDataDir;
        $dataSource = 'legacy-fallback';
    }

    return [
        'base_dir' => $baseDir,
        'root_dir' => $rootDir,
        'root_htaccess' => $rootDir . '/.htaccess',
        'legacy_data_dir' => $legacyDataDir,
        'data_dir' => $dataDir,
        'data_source' => $dataSource,
        'conf_dir' => $dataDir . '/config',
        'users_file' => $dataDir . '/config/users.json',
        'sessions_dir' => $dataDir . '/sessions',
        'ratelimit_dir' => $dataDir . '/ratelimit',
        'cache_dir' => $dataDir . '/cache',
        'portal_htaccess' => $baseDir . '/.htaccess',
        'docs_htaccess' => $baseDir . '/docs/.htaccess',
        'qmsdata_htaccess' => $baseDir . '/data/.htaccess',
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
    $responseHeaders = [];
    $body = false;
    $handle = @fopen($url, 'r', false, $ctx);
    if (is_resource($handle)) {
        $meta = stream_get_meta_data($handle);
        $responseHeaders = is_array($meta['wrapper_data'] ?? null) ? $meta['wrapper_data'] : [];
        $body = stream_get_contents($handle);
        fclose($handle);
    } else {
        $body = @file_get_contents($url, false, $ctx);
        if (function_exists('http_get_last_response_headers')) {
            $responseHeaders = http_get_last_response_headers() ?: [];
        }
    }

    $code = 0;
    if (isset($responseHeaders[0]) && preg_match('#\s(\d{3})\s#', $responseHeaders[0], $m)) {
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

foreach (['sessions_dir', 'ratelimit_dir', 'cache_dir'] as $k) {
    if (!is_dir($p[$k])) {
        $critical[] = "Runtime directory missing: {$p[$k]}";
        continue;
    }
    if (!is_writable($p[$k])) {
        $critical[] = "Runtime directory not writable: {$p[$k]}";
    }
}

if (!contains_rule($p['root_htaccess'], 'Options -Indexes')) {
    $warnings[] = "Root .htaccess is missing directory listing protection: {$p['root_htaccess']}";
}
if (!contains_rule($p['root_htaccess'], 'RewriteRule ^(?:\\.git|\\.vscode|\\.claude|tools|_build|_Deleted|_reports|__pycache__)/ - [F,L,NC]')) {
    $critical[] = "Root .htaccess internal-directory deny rule not found at {$p['root_htaccess']}";
}
if (!contains_rule($p['root_htaccess'], 'RewriteRule ^mom/docs/ - [F,L,NC]')) {
    $critical[] = "Root .htaccess docs deny rule not found at {$p['root_htaccess']}";
}
if (!contains_rule($p['root_htaccess'], 'Header always set Content-Security-Policy')) {
    $warnings[] = "Root .htaccess CSP header rule not found at {$p['root_htaccess']}";
}

if (!contains_rule($p['portal_htaccess'], 'RewriteRule ^data/ - [F,L,NC]')) {
    $critical[] = "Missing data deny rule in {$p['portal_htaccess']}";
}
if (!contains_rule($p['portal_htaccess'], 'RewriteRule \\.(zip|sql|bak|old|md|log)$ - [F,L,NC]')) {
    $warnings[] = "Missing backup-file deny rule in {$p['portal_htaccess']}";
}
if (!contains_rule($p['portal_htaccess'], 'RewriteRule ^docs/ - [F,L,NC]')) {
    $critical[] = "Portal docs deny rule not found at {$p['portal_htaccess']}";
}
if (!contains_rule($p['portal_htaccess'], 'RewriteRule ^(?:form_workflow\\.php|SECURITY_OPERATIONS\\.md)$ - [F,L,NC]')) {
    $warnings[] = "Portal auxiliary-file deny rule not found at {$p['portal_htaccess']}";
}

if (!contains_rule($p['docs_htaccess'], 'Require all denied') && !contains_rule($p['docs_htaccess'], 'Deny from all')) {
    $critical[] = "docs/.htaccess deny rule not found at {$p['docs_htaccess']}";
}

if (!contains_rule($p['qmsdata_htaccess'], 'Require all denied') && !contains_rule($p['qmsdata_htaccess'], 'Deny from all')) {
    $warnings[] = "data/.htaccess deny rule not found at {$p['qmsdata_htaccess']}";
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

echo "=== HESEM MOM Post-Deploy Health Check ===\n";
echo "BASE_DIR: {$p['base_dir']}\n";
echo "DATA_DIR: {$p['data_dir']} ({$p['data_source']})\n";
echo "LEGACY_DATA_DIR: {$p['legacy_data_dir']}\n";
echo "users.json exists: " . yesNo(is_file($p['users_file'])) . "\n";
echo "DATA_DIR writable: " . yesNo(is_writable($p['data_dir'])) . "\n";
echo "root .htaccess: " . yesNo(is_file($p['root_htaccess'])) . "\n";
echo "portal .htaccess: " . yesNo(is_file($p['portal_htaccess'])) . "\n";
echo "docs .htaccess: " . yesNo(is_file($p['docs_htaccess'])) . "\n";
echo "data .htaccess: " . yesNo(is_file($p['qmsdata_htaccess'])) . "\n";
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
