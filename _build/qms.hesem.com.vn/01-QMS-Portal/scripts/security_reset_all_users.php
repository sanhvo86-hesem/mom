<?php
declare(strict_types=1);

/**
 * Emergency credential reset for all users (CLI only).
 *
 * Default mode is DRY RUN (no write).
 *
 * Usage:
 *   php security_reset_all_users.php
 *   php security_reset_all_users.php --apply
 *   php security_reset_all_users.php --apply --scope=active --exclude=sanh.vo,mai.tran
 *   php security_reset_all_users.php --apply --out="C:/secure/reset_credentials.csv"
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    header('Content-Type: text/plain; charset=UTF-8');
    echo "Forbidden\n";
    exit;
}

function parse_opts(array $argv): array
{
    $out = [
        'apply' => false,
        'scope' => 'all',
        'exclude' => [],
        'length' => 14,
        'out' => null,
    ];

    foreach ($argv as $arg) {
        if ($arg === '--apply') $out['apply'] = true;
        if (str_starts_with($arg, '--scope=')) $out['scope'] = substr($arg, 8);
        if (str_starts_with($arg, '--exclude=')) {
            $v = trim(substr($arg, 10));
            $out['exclude'] = $v === '' ? [] : array_values(array_filter(array_map(
                static fn($x) => strtolower(trim($x)),
                explode(',', $v)
            )));
        }
        if (str_starts_with($arg, '--length=')) {
            $n = (int)substr($arg, 9);
            if ($n >= 10 && $n <= 64) $out['length'] = $n;
        }
        if (str_starts_with($arg, '--out=')) {
            $v = trim(substr($arg, 6));
            $out['out'] = $v !== '' ? $v : null;
        }
    }

    if (!in_array($out['scope'], ['all', 'active'], true)) {
        fwrite(STDERR, "Invalid --scope (allowed: all|active)\n");
        exit(1);
    }

    return $out;
}

function ensure_dir(string $dir): void
{
    if (!is_dir($dir)) @mkdir($dir, 0775, true);
}

function now_iso(): string
{
    return gmdate('c');
}

function gen_password(int $len = 14): string
{
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
    for ($i = count($pw) - 1; $i > 0; $i--) {
        $j = random_int(0, $i);
        [$pw[$i], $pw[$j]] = [$pw[$j], $pw[$i]];
    }
    return implode('', $pw);
}

function resolve_paths(): array
{
    $baseDir = realpath(__DIR__ . '/..') ?: dirname(__DIR__);
    $rootDir = realpath($baseDir . '/..') ?: dirname($baseDir);
    $rootParentDir = realpath($rootDir . '/..') ?: dirname($rootDir);
    $legacyDataDir = $baseDir . '/qms-data';

    $dataDirEnv = trim((string)(getenv('QMS_DATA_DIR') ?: ''));
    if ($dataDirEnv !== '') {
        $dataDir = rtrim(str_replace('\\', '/', $dataDirEnv), '/\\');
    } else {
        $dataDir = rtrim(str_replace('\\', '/', $rootParentDir), '/\\') . '/qms-data-private';
    }

    if (!is_dir($dataDir)) @mkdir($dataDir, 0775, true);
    if (!is_dir($dataDir) || !is_writable($dataDir)) {
        $dataDir = $legacyDataDir;
    }

    return [
        'data_dir' => $dataDir,
        'users_file' => $dataDir . '/config/users.json',
    ];
}

function write_json_atomic(string $path, array $data): void
{
    $dir = dirname($path);
    ensure_dir($dir);

    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        throw new RuntimeException('json_encode failed');
    }

    $tmp = $path . '.tmp';
    if (@file_put_contents($tmp, $json, LOCK_EX) === false) {
        throw new RuntimeException('Cannot write temp file: ' . $tmp);
    }
    if (!@rename($tmp, $path)) {
        if (@file_put_contents($path, $json, LOCK_EX) === false) {
            @unlink($tmp);
            throw new RuntimeException('Cannot replace users file');
        }
        @unlink($tmp);
    }
}

function mask(string $s): string
{
    if (strlen($s) <= 4) return str_repeat('*', strlen($s));
    return substr($s, 0, 2) . str_repeat('*', max(0, strlen($s) - 4)) . substr($s, -2);
}

$opts = parse_opts($argv);
$paths = resolve_paths();
$usersFile = $paths['users_file'];
$apply = (bool)$opts['apply'];
$scope = (string)$opts['scope'];
$exclude = $opts['exclude'];
$len = (int)$opts['length'];

if (!is_file($usersFile)) {
    fwrite(STDERR, "users.json not found: {$usersFile}\n");
    exit(2);
}

$raw = (string)@file_get_contents($usersFile);
$store = json_decode($raw, true);
if (!is_array($store) || !isset($store['users']) || !is_array($store['users'])) {
    fwrite(STDERR, "Invalid users.json format.\n");
    exit(2);
}

$selected = [];
$secrets = [];
foreach ($store['users'] as $i => $u) {
    if (!is_array($u)) continue;
    $username = strtolower(trim((string)($u['username'] ?? '')));
    if ($username === '') continue;
    if (in_array($username, $exclude, true)) continue;
    if ($scope === 'active' && !($u['active'] ?? true)) continue;
    $selected[] = [$i, $username];
}

if (!$selected) {
    echo "No users selected.\n";
    exit(0);
}

echo "=== HESEM QMS Emergency Reset ===\n";
echo "Mode: " . ($apply ? 'APPLY' : 'DRY RUN') . "\n";
echo "users.json: {$usersFile}\n";
echo "Scope: {$scope}\n";
echo "Exclude: " . (count($exclude) ? implode(',', $exclude) : '(none)') . "\n";
echo "Users selected: " . count($selected) . "\n\n";

foreach ($selected as [$i, $username]) {
    $tmpPw = gen_password($len);
    $secrets[] = ['username' => $username, 'temp_password' => $tmpPw];

    echo "- {$username} => " . mask($tmpPw) . "\n";

    if ($apply) {
        $store['users'][$i]['password_hash'] = password_hash($tmpPw, PASSWORD_DEFAULT);
        $store['users'][$i]['updated_at'] = now_iso();
        $store['users'][$i]['must_change_password'] = true;
        $store['users'][$i]['mfa'] = ['enabled' => false];
        unset(
            $store['users'][$i]['mfa_enabled'],
            $store['users'][$i]['mfa_secret'],
            $store['users'][$i]['pin']
        );
    }
}

if (!$apply) {
    echo "\nDRY RUN complete. Re-run with --apply to write changes.\n";
    exit(0);
}

$backup = $usersFile . '.bak_' . gmdate('Ymd_His');
if (!@copy($usersFile, $backup)) {
    fwrite(STDERR, "\nFailed to create backup file: {$backup}\n");
    exit(3);
}

try {
    write_json_atomic($usersFile, $store);
} catch (Throwable $e) {
    fwrite(STDERR, "\nWrite failed: " . $e->getMessage() . "\n");
    exit(3);
}

$outPath = $opts['out'];
if ($outPath === null || trim($outPath) === '') {
    $outPath = $paths['data_dir'] . '/security_reset_credentials_' . gmdate('Ymd_His') . '.csv';
}
$outPath = str_replace('\\', '/', $outPath);
ensure_dir(dirname($outPath));

$fp = @fopen($outPath, 'wb');
if ($fp === false) {
    fwrite(STDERR, "\nCredentials file write failed: {$outPath}\n");
    exit(3);
}
fputcsv($fp, ['username', 'temp_password']);
foreach ($secrets as $row) fputcsv($fp, [$row['username'], $row['temp_password']]);
fclose($fp);

echo "\nAPPLY complete.\n";
echo "Backup: {$backup}\n";
echo "Credentials CSV: {$outPath}\n";
echo "IMPORTANT: Delete CSV after secure handover.\n";
exit(0);
