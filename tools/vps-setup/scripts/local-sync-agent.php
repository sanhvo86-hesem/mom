<?php

declare(strict_types=1);

/**
 * Browser-facing local sync agent.
 *
 * Run with:
 *   php -S 127.0.0.1:48735 tools/vps-setup/scripts/local-sync-agent.php
 *
 * The live VPS portal can call this localhost service from Chrome. The token
 * stays on the laptop and is never sent to the VPS API.
 */

$rootDir = rtrim(str_replace('\\', '/', (string)(getenv('MOM_LOCAL_SYNC_AGENT_REPO') ?: dirname(__DIR__, 3))), '/');
$port = (int)(getenv('MOM_LOCAL_SYNC_AGENT_PORT') ?: 48735);
$tokenFile = (string)(getenv('MOM_LOCAL_SYNC_AGENT_TOKEN_FILE') ?: (home_dir() . '/.hesem-mom-sync/token'));

handle_request($rootDir, $port, $tokenFile);

function handle_request(string $rootDir, int $port, string $tokenFile): never
{
    $origin = (string)($_SERVER['HTTP_ORIGIN'] ?? '');
    apply_cors($origin);

    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }

    $path = parse_url((string)($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH) ?: '/';
    $method = (string)($_SERVER['REQUEST_METHOD'] ?? 'GET');

    if ($path === '/status' && $method === 'GET') {
        $authenticated = token_ok($tokenFile);
        json_response(array_merge([
            'ok' => true,
            'agent' => 'hesem-mom-local-sync',
            'authenticated' => $authenticated,
            'token_required' => !$authenticated,
            'origin_allowed' => origin_allowed($origin),
            'port' => $port,
        ], $authenticated ? status_payload($rootDir, 'eqms') : []));
    }

    require_token($tokenFile);

    if ($path === '/run' && $method === 'POST') {
        $body = json_body();
        $target = sanitize_target((string)($body['target'] ?? 'eqms'));
        $apply = !empty($body['apply_decision_thresholds']);
        $result = run_pull($rootDir, $target, $apply);
        json_response(array_merge($result, [
            'status' => status_payload($rootDir, $target),
        ]), $result['exit_code'] === 0 ? 200 : 409);
    }

    if ($path === '/schedule' && $method === 'POST') {
        $body = json_body();
        $target = sanitize_target((string)($body['target'] ?? 'eqms'));
        $interval = max(1, min(1440, (int)($body['interval_minutes'] ?? 3)));
        $enabled = (bool)($body['enabled'] ?? false);
        $apply = array_key_exists('apply_decision_thresholds', $body) ? (bool)$body['apply_decision_thresholds'] : true;
        $result = configure_pull_schedule($rootDir, $target, $interval, $enabled, $apply);
        json_response(array_merge($result, [
            'status' => status_payload($rootDir, $target),
        ]));
    }

    json_response(['ok' => false, 'error' => 'not_found'], 404);
}

function apply_cors(string $origin): void
{
    if (origin_allowed($origin)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
    }
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-MOM-Local-Sync-Token');
    header('Access-Control-Allow-Private-Network: true');
    header('Cache-Control: no-store');
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
}

function origin_allowed(string $origin): bool
{
    if ($origin === '') {
        return true;
    }
    if (preg_match('/\Ahttp:\/\/(127\.0\.0\.1|localhost)(:\d+)?\z/', $origin)) {
        return true;
    }
    $allowed = array_filter(array_map('trim', explode(',', (string)(getenv('MOM_LOCAL_SYNC_AGENT_ALLOWED_ORIGINS') ?: 'https://eqms.hesemeng.com,https://www.eqms.hesemeng.com'))));
    return in_array($origin, $allowed, true);
}

function token_ok(string $tokenFile): bool
{
    $expected = token_value($tokenFile);
    $provided = (string)($_SERVER['HTTP_X_MOM_LOCAL_SYNC_TOKEN'] ?? '');
    return $provided !== '' && hash_equals($expected, $provided);
}

function require_token(string $tokenFile): void
{
    if (!token_ok($tokenFile)) {
        json_response(['ok' => false, 'error' => 'token_required'], 401);
    }
}

function token_value(string $tokenFile): string
{
    if (!is_file($tokenFile)) {
        $dir = dirname($tokenFile);
        if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) {
            json_response(['ok' => false, 'error' => 'token_dir_create_failed'], 500);
        }
        $token = bin2hex(random_bytes(24));
        file_put_contents($tokenFile, $token . PHP_EOL);
        @chmod($tokenFile, 0600);
    }
    return trim((string)file_get_contents($tokenFile));
}

/**
 * @return array<string,mixed>
 */
function status_payload(string $rootDir, string $target): array
{
    $target = sanitize_target($target);
    $workingDir = working_dir($target);
    $schedulePath = launch_agent_path('com.hesem.mom-sync');
    $agentPath = launch_agent_path('com.hesem.mom-sync-agent');
    $pulled = $workingDir . '/files/config/decision_thresholds.json';
    $app = $rootDir . '/mom/data/config/decision_thresholds.json';
    $pulledHash = sha256_or_null($pulled);
    $appHash = sha256_or_null($app);

    return [
        'repo_path' => $rootDir,
        'target' => $target,
        'working_dir' => $workingDir,
        'decision_thresholds' => [
            'pulled_present' => is_file($pulled),
            'app_present' => is_file($app),
            'pulled_sha256_short' => $pulledHash !== null ? substr($pulledHash, 0, 12) : '',
            'app_sha256_short' => $appHash !== null ? substr($appHash, 0, 12) : '',
            'in_sync' => $pulledHash !== null && $appHash !== null && hash_equals($pulledHash, $appHash),
        ],
        'pull_schedule' => [
            'path' => $schedulePath,
            'installed' => is_file($schedulePath),
            'loaded' => launch_agent_loaded('com.hesem.mom-sync'),
            'interval_minutes' => launch_agent_interval_minutes($schedulePath),
        ],
        'agent_schedule' => [
            'path' => $agentPath,
            'installed' => is_file($agentPath),
            'loaded' => launch_agent_loaded('com.hesem.mom-sync-agent'),
        ],
    ];
}

/**
 * @return array<string,mixed>
 */
function run_pull(string $rootDir, string $target, bool $applyDecisionThresholds): array
{
    $script = $rootDir . '/tools/vps-setup/scripts/local-sync-down.sh';
    if (!is_file($script)) {
        return ['ok' => false, 'error' => 'local_sync_script_missing', 'exit_code' => 127];
    }
    $result = run_process([
        '/usr/bin/env',
        'TARGET=' . $target,
        'APPLY_DECISION_THRESHOLDS=' . ($applyDecisionThresholds ? '1' : '0'),
        'bash',
        $script,
    ], $rootDir, 180);

    return [
        'ok' => $result['exit_code'] === 0,
        'target' => $target,
        'apply_decision_thresholds' => $applyDecisionThresholds,
        'exit_code' => $result['exit_code'],
        'stdout' => tail_text($result['stdout']),
        'stderr' => tail_text($result['stderr']),
    ];
}

/**
 * @return array<string,mixed>
 */
function configure_pull_schedule(string $rootDir, string $target, int $intervalMinutes, bool $enabled, bool $applyDecisionThresholds): array
{
    if (PHP_OS_FAMILY !== 'Darwin') {
        json_response(['ok' => false, 'error' => 'launch_agent_supported_only_on_macos'], 409);
    }
    $path = launch_agent_path('com.hesem.mom-sync');
    $bootout = launchctl(['bootout', 'gui/' . uid(), $path], $rootDir, 15);

    if (!$enabled) {
        if (is_file($path)) {
            @unlink($path);
        }
        return [
            'ok' => true,
            'enabled' => false,
            'interval_minutes' => $intervalMinutes,
            'path' => $path,
            'bootout_exit_code' => $bootout['exit_code'],
        ];
    }

    $plist = build_pull_launch_agent_plist($rootDir, $target, $intervalMinutes, $applyDecisionThresholds);
    write_file_atomic($path, $plist, 0644);

    $bootstrap = launchctl(['bootstrap', 'gui/' . uid(), $path], $rootDir, 30);
    $kickstart = launchctl(['kickstart', '-k', 'gui/' . uid() . '/com.hesem.mom-sync'], $rootDir, 30);

    return [
        'ok' => $bootstrap['exit_code'] === 0 || launch_agent_loaded('com.hesem.mom-sync'),
        'enabled' => true,
        'target' => $target,
        'interval_minutes' => $intervalMinutes,
        'apply_decision_thresholds' => $applyDecisionThresholds,
        'path' => $path,
        'bootout_exit_code' => $bootout['exit_code'],
        'bootstrap_exit_code' => $bootstrap['exit_code'],
        'kickstart_exit_code' => $kickstart['exit_code'],
        'bootstrap_stderr' => tail_text($bootstrap['stderr']),
        'kickstart_stderr' => tail_text($kickstart['stderr']),
    ];
}

function build_pull_launch_agent_plist(string $rootDir, string $target, int $intervalMinutes, bool $applyDecisionThresholds): string
{
    $seconds = $intervalMinutes * 60;
    $script = xml_escape($rootDir . '/tools/vps-setup/scripts/local-sync-down.sh');
    $repo = xml_escape($rootDir);
    $targetXml = xml_escape($target);
    $apply = $applyDecisionThresholds ? '1' : '0';

    return <<<XML
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.hesem.mom-sync</string>
  <key>StartInterval</key><integer>{$seconds}</integer>
  <key>WorkingDirectory</key><string>{$repo}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>TARGET</key><string>{$targetXml}</string>
    <key>APPLY_DECISION_THRESHOLDS</key><string>{$apply}</string>
  </dict>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>{$script}</string>
  </array>
  <key>StandardOutPath</key><string>/tmp/mom-local-sync-down.log</string>
  <key>StandardErrorPath</key><string>/tmp/mom-local-sync-down.err</string>
</dict>
</plist>
XML;
}

function sanitize_target(string $target): string
{
    $target = trim($target);
    if ($target === '') {
        $target = 'eqms';
    }
    if (!preg_match('/\A[A-Za-z0-9_.@:-]{1,96}\z/', $target)) {
        json_response(['ok' => false, 'error' => 'invalid_sync_target'], 400);
    }
    return $target;
}

/**
 * @return array<string,mixed>
 */
function json_body(): array
{
    $raw = (string)file_get_contents('php://input');
    if (trim($raw) === '') {
        return [];
    }
    $body = json_decode($raw, true);
    if (!is_array($body)) {
        json_response(['ok' => false, 'error' => 'invalid_json'], 400);
    }
    return $body;
}

/**
 * @param array<string,mixed> $payload
 */
function json_response(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function home_dir(): string
{
    $home = trim((string)(getenv('HOME') ?: ''));
    if ($home !== '') {
        return rtrim(str_replace('\\', '/', $home), '/');
    }
    if (function_exists('posix_getpwuid') && function_exists('posix_getuid')) {
        $pw = posix_getpwuid(posix_getuid());
        if (is_array($pw) && is_string($pw['dir']) && $pw['dir'] !== '') {
            return rtrim(str_replace('\\', '/', $pw['dir']), '/');
        }
    }
    json_response(['ok' => false, 'error' => 'home_dir_unavailable'], 500);
}

function working_dir(string $target): string
{
    $override = trim((string)(getenv('WORKING_DIR') ?: ''));
    if ($override !== '') {
        return rtrim(str_replace('\\', '/', $override), '/');
    }
    return home_dir() . '/mom-vps-data/' . (preg_replace('/[^a-zA-Z0-9]/', '_', $target) ?: 'eqms') . '/working';
}

function launch_agent_path(string $label): string
{
    return home_dir() . '/Library/LaunchAgents/' . $label . '.plist';
}

function launch_agent_loaded(string $label): bool
{
    $result = launchctl(['print', 'gui/' . uid() . '/' . $label], dirname(__DIR__, 3), 10);
    return $result['exit_code'] === 0;
}

function launch_agent_interval_minutes(string $path): ?int
{
    if (!is_file($path)) {
        return null;
    }
    $raw = (string)(@file_get_contents($path) ?: '');
    if (preg_match('/<key>StartInterval<\/key>\s*<integer>(\d+)<\/integer>/', $raw, $m)) {
        return max(1, (int)floor(((int)$m[1]) / 60));
    }
    return null;
}

/**
 * @param list<string> $args
 * @return array{exit_code:int,stdout:string,stderr:string}
 */
function launchctl(array $args, string $cwd, int $timeoutSeconds): array
{
    if (!is_file('/bin/launchctl')) {
        return ['exit_code' => 127, 'stdout' => '', 'stderr' => 'launchctl_not_found'];
    }
    return run_process(array_merge(['/bin/launchctl'], $args), $cwd, $timeoutSeconds);
}

/**
 * @param list<string> $command
 * @return array{exit_code:int,stdout:string,stderr:string}
 */
function run_process(array $command, string $cwd, int $timeoutSeconds): array
{
    $spec = [
        0 => ['pipe', 'r'],
        1 => ['pipe', 'w'],
        2 => ['pipe', 'w'],
    ];
    $proc = @proc_open($command, $spec, $pipes, $cwd);
    if (!is_resource($proc)) {
        return ['exit_code' => 127, 'stdout' => '', 'stderr' => 'proc_open_failed'];
    }
    fclose($pipes[0]);
    stream_set_blocking($pipes[1], false);
    stream_set_blocking($pipes[2], false);

    $stdout = '';
    $stderr = '';
    $deadline = time() + max(1, $timeoutSeconds);
    $exitCode = 1;
    while (true) {
        $stdout .= (string)stream_get_contents($pipes[1]);
        $stderr .= (string)stream_get_contents($pipes[2]);
        $status = proc_get_status($proc);
        if (!$status['running']) {
            $exitCode = (int)$status['exitcode'];
            break;
        }
        if (time() >= $deadline) {
            proc_terminate($proc);
            $exitCode = 124;
            $stderr .= "\nprocess_timeout\n";
            break;
        }
        usleep(100000);
    }
    $stdout .= (string)stream_get_contents($pipes[1]);
    $stderr .= (string)stream_get_contents($pipes[2]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    $closeCode = proc_close($proc);
    if ($exitCode === 0 && is_int($closeCode) && $closeCode !== -1) {
        $exitCode = $closeCode;
    }

    return ['exit_code' => $exitCode, 'stdout' => $stdout, 'stderr' => $stderr];
}

function write_file_atomic(string $path, string $content, int $mode): void
{
    $dir = dirname($path);
    if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
        json_response(['ok' => false, 'error' => 'dir_create_failed', 'path' => $dir], 500);
    }
    $tmp = $path . '.tmp.' . substr(bin2hex(random_bytes(3)), 0, 6);
    if (file_put_contents($tmp, $content) === false || !rename($tmp, $path)) {
        @unlink($tmp);
        json_response(['ok' => false, 'error' => 'file_write_failed', 'path' => $path], 500);
    }
    @chmod($path, $mode);
}

function sha256_or_null(string $path): ?string
{
    if (!is_file($path)) {
        return null;
    }
    $hash = @hash_file('sha256', $path);
    return is_string($hash) && $hash !== '' ? $hash : null;
}

function uid(): string
{
    if (function_exists('posix_getuid')) {
        return (string)posix_getuid();
    }
    $result = run_process(['/usr/bin/id', '-u'], dirname(__DIR__, 3), 5);
    return trim($result['stdout']) ?: '501';
}

function xml_escape(string $value): string
{
    return htmlspecialchars($value, ENT_XML1 | ENT_COMPAT, 'UTF-8');
}

function tail_text(string $text): string
{
    $text = trim($text);
    if (strlen($text) <= 6000) {
        return $text;
    }
    return substr($text, -6000);
}
