<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

use MOM\Api\Controllers\ExitException;
use MOM\Api\Controllers\VpsController;
use MOM\Database\DataLayer;
use MOM\Services\VpsService;

function vps_smoke_reset_request_state(): void
{
    $_GET = [];
    $_POST = [];
    $_FILES = [];
    $_SERVER = [
        'REQUEST_METHOD' => 'GET',
        'REQUEST_URI' => '/',
        'REMOTE_ADDR' => '127.0.0.1',
    ];
    $_SESSION = [];
}

function vps_smoke_exit_payload(callable $callback): array
{
    try {
        $callback();
    } catch (ExitException $e) {
        return [
            'status' => $e->getStatusCode(),
            'payload' => $e->getPayload(),
            'headers' => $e->getHeaders(),
            'body' => $e->getBody(),
        ];
    }

    throw new RuntimeException('Expected controller call to terminate via ExitException.');
}

$tmpDataDir = sys_get_temp_dir() . '/mom-vps-control-' . bin2hex(random_bytes(6));
@mkdir($tmpDataDir . '/config', 0775, true);

$config = [
    'product' => 'Test VPS Control Tower',
    'quick_command' => 'ssh local@example',
    'architecture_doc' => './docs/system/vps-control-tower-architecture-2026-04-09.md',
    'setup_script' => './ops/vps/setup-vps.sh',
    'terminal_gateway' => [
        'install_script' => './ops/vps/install-terminal-gateway.sh',
        'setup_doc' => './docs/system/vps-terminal-gateway-setup-2026-04-09.md',
    ],
    'observability_stack' => [
        'install_script' => './ops/vps/install-observability-stack.sh',
        'setup_doc' => './docs/system/vps-observability-stack-setup-2026-04-09.md',
    ],
    'hosts' => [[
        'id' => 'local-vps',
        'label' => 'Local VPS',
        'provider' => 'Local',
        'mode' => 'local',
        'safe_actions' => ['health', 'nginx_test'],
        'services' => [
            ['name' => 'nginx', 'label' => 'Nginx', 'kind' => 'systemd'],
        ],
        'terminals' => [
            ['id' => 'primary', 'label' => 'Primary shell', 'url' => '/ops/terminal/primary/', 'access' => 'write'],
            ['id' => 'readonly', 'label' => 'Readonly shell', 'url' => '/ops/terminal/readonly/', 'access' => 'read'],
        ],
        'observability' => [
            ['id' => 'netdata', 'label' => 'Netdata', 'url' => '/ops/netdata/', 'kind' => 'metrics', 'access' => 'read'],
            ['id' => 'grafana', 'label' => 'Grafana', 'url' => '/ops/grafana/', 'kind' => 'dashboard', 'access' => 'read'],
        ],
    ]],
];

file_put_contents(
    $tmpDataDir . '/config/vps_control_tower.json',
    json_encode($config, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
);

try {
    $service = new VpsService($tmpDataDir, QMS_TEST_ROOT_DIR);

    $overview = $service->getOverview();
    smoke_assert(($overview['metrics']['host_count'] ?? null) === 1, 'VPS overview should report one host.');
    smoke_assert(($overview['metrics']['sites_count'] ?? null) === 0, 'VPS overview should expose the declared site count.');
    smoke_assert(($overview['metrics']['terminals_count'] ?? null) === 2, 'VPS overview should expose the declared terminal count.');
    smoke_assert(($overview['metrics']['observability_panels'] ?? null) === 2, 'VPS overview should expose the declared observability panel count.');
    smoke_assert(($overview['metrics']['terminal_ready_hosts'] ?? null) === 1, 'VPS overview should count one terminal-ready host.');
    smoke_assert(($overview['metrics']['observability_ready_hosts'] ?? null) === 1, 'VPS overview should count one observability-ready host.');
    smoke_assert(count((array)($overview['control_assets'] ?? [])) >= 6, 'VPS overview should expose the whitelisted control assets.');

    $snapshot = $service->getHostSnapshot('local-vps');
    smoke_assert(($snapshot['id'] ?? null) === 'local-vps', 'Host snapshot should resolve the configured host.');
    smoke_assert(($snapshot['mode'] ?? null) === 'local', 'Host snapshot should preserve the declared execution mode.');
    smoke_assert(count((array)($snapshot['terminals'] ?? [])) === 2, 'Host snapshot should expose both terminal entries.');
    smoke_assert(count((array)($snapshot['observability'] ?? [])) === 2, 'Host snapshot should expose both observability panels.');
    smoke_assert(is_array($snapshot['capabilities'] ?? null), 'Host snapshot should expose probe capabilities.');
    smoke_assert($service->terminalRequiresWrite('local-vps', 'primary') === true, 'Primary terminal should require write access.');
    smoke_assert($service->terminalRequiresWrite('local-vps', 'readonly') === false, 'Readonly terminal should not require write access.');
    smoke_assert($service->observabilityRequiresWrite('local-vps', 'netdata') === false, 'Netdata panel should stay read-only.');
    smoke_assert(($service->getObservabilityPanel('local-vps', 'grafana')['url'] ?? null) === '/ops/grafana/', 'Grafana panel URL should be preserved.');
    $setupAsset = $service->resolveAsset('./docs/system/vps-terminal-gateway-setup-2026-04-09.md');
    smoke_assert(($setupAsset['kind'] ?? null) === 'markdown', 'Setup markdown should resolve as a markdown asset.');
    smoke_assert(is_file((string)($setupAsset['absolute_path'] ?? '')), 'Resolved asset should point to a real file.');
    $scriptAsset = $service->resolveAsset('./ops/vps/install-terminal-gateway.sh');
    smoke_assert(($scriptAsset['kind'] ?? null) === 'code', 'Install script should resolve as a code asset.');

    try {
        $service->resolveAsset('../not-allowed.txt');
        throw new RuntimeException('Unexpected asset path resolution outside the whitelist.');
    } catch (RuntimeException $e) {
        smoke_assert(
            $e->getMessage() === 'invalid_asset_path' || str_starts_with($e->getMessage(), 'asset_not_allowed'),
            'Invalid asset path should be rejected.'
        );
    }

    if (shell_exec_available()) {
        smoke_assert(($snapshot['connection']['status'] ?? null) === 'ok', 'Local-mode host probe should succeed when exec is available.');
        smoke_assert(array_key_exists('docker', (array)($snapshot['capabilities'] ?? [])), 'Probe capabilities should surface docker availability.');
        $run = $service->runAction('local-vps', 'health');
        smoke_assert(($run['ok'] ?? false) === true, 'Health action should succeed in local mode.');
        smoke_assert(trim((string)($run['output'] ?? '')) !== '', 'Health action should return output.');
    }

    try {
        $service->runAction('local-vps', 'docker_ps');
        throw new RuntimeException('Disallowed action unexpectedly executed.');
    } catch (RuntimeException $e) {
        smoke_assert(str_starts_with($e->getMessage(), 'action_not_allowed'), 'Disallowed action should be rejected.');
    }

    $store = [
        'settings' => ['require_mfa' => false],
        'users' => [
            ['username' => 'admin-user', 'name' => 'Admin User', 'role' => 'admin', 'active' => true],
            ['username' => 'qa-user', 'name' => 'QA User', 'role' => 'qa_manager', 'active' => true],
            ['username' => 'lead-user', 'name' => 'Lead User', 'role' => 'engineering_manager', 'active' => true],
            ['username' => 'viewer-user', 'name' => 'Viewer User', 'role' => 'production_planner', 'active' => true],
        ],
    ];

    $dataLayer = new DataLayer($tmpDataDir, QMS_TEST_ROOT_DIR);
    $controller = (new VpsController($dataLayer, QMS_TEST_ROOT_DIR, $tmpDataDir))->setStore($store);

    vps_smoke_reset_request_state();
    set_authenticated_session('admin-user', ['role' => 'admin']);
    $_GET['host_id'] = 'local-vps';
    $resp = vps_smoke_exit_payload(static function () use ($controller): void {
        $controller->host();
    });
    smoke_assert($resp['status'] === 200, 'Authorized host detail request should succeed.');
    smoke_assert((($resp['payload']['host'] ?? [])['id'] ?? null) === 'local-vps', 'Host detail payload should include the requested host.');

    vps_smoke_reset_request_state();
    set_authenticated_session('qa-user', ['role' => 'qa_manager']);
    $_GET['host_id'] = 'local-vps';
    $resp = vps_smoke_exit_payload(static function () use ($controller): void {
        $controller->host();
    });
    smoke_assert($resp['status'] === 200, 'Admin-grade QA role should keep access through the Admin infrastructure module.');

    vps_smoke_reset_request_state();
    set_authenticated_session('admin-user', ['role' => 'admin']);
    $_GET['host_id'] = 'local-vps';
    $_GET['terminal_id'] = 'readonly';
    $resp = vps_smoke_exit_payload(static function () use ($controller): void {
        $controller->terminalAuth();
    });
    smoke_assert($resp['status'] === 204, 'Authorized terminal auth should return 204.');
    smoke_assert(($resp['headers']['X-Terminal-Id'] ?? null) === 'readonly', 'Terminal auth should emit the selected terminal id header.');

    vps_smoke_reset_request_state();
    set_authenticated_session('viewer-user', ['role' => 'production_planner']);
    $_GET['host_id'] = 'local-vps';
    $_GET['terminal_id'] = 'readonly';
    $resp = vps_smoke_exit_payload(static function () use ($controller): void {
        $controller->terminalAuth();
    });
    smoke_assert($resp['status'] === 403, 'Non-VPS reader role should be blocked from terminal auth.');
    smoke_assert(($resp['payload']['error'] ?? null) === 'forbidden', 'Terminal auth should reject non-reader roles with forbidden.');

    vps_smoke_reset_request_state();
    set_authenticated_session('lead-user', ['role' => 'engineering_manager']);
    $_GET['host_id'] = 'local-vps';
    $resp = vps_smoke_exit_payload(static function () use ($controller): void {
        $controller->host();
    });
    smoke_assert($resp['status'] === 403, 'Engineering roles outside Admin should no longer read the infrastructure module.');
    smoke_assert(($resp['payload']['error'] ?? null) === 'forbidden', 'Infrastructure read denial should stay forbidden.');

    vps_smoke_reset_request_state();
    set_authenticated_session('admin-user', ['role' => 'admin']);
    $_GET['host_id'] = 'local-vps';
    $_GET['panel_id'] = 'netdata';
    $resp = vps_smoke_exit_payload(static function () use ($controller): void {
        $controller->observabilityAuth();
    });
    smoke_assert($resp['status'] === 204, 'Authorized observability auth should return 204.');
    smoke_assert(($resp['headers']['X-Observability-Panel'] ?? null) === 'netdata', 'Observability auth should emit the selected panel header.');

    vps_smoke_reset_request_state();
    set_authenticated_session('admin-user', ['role' => 'admin']);
    $_GET['host_id'] = 'local-vps';
    $_GET['panel_id'] = 'missing-panel';
    $resp = vps_smoke_exit_payload(static function () use ($controller): void {
        $controller->observabilityAuth();
    });
    smoke_assert($resp['status'] === 404, 'Unknown observability panel should return 404.');
    smoke_assert(($resp['payload']['error'] ?? null) === 'vps_observability_auth_failed', 'Observability auth should surface the dedicated error code.');

    vps_smoke_reset_request_state();
    set_authenticated_session('admin-user', ['role' => 'admin']);
    $_GET['path'] = './docs/system/vps-terminal-gateway-setup-2026-04-09.md';
    $resp = vps_smoke_exit_payload(static function () use ($controller): void {
        $controller->asset();
    });
    smoke_assert($resp['status'] === 200, 'Authorized asset viewer request should succeed.');
    smoke_assert(
        str_contains((string)($resp['headers']['Content-Type'] ?? ''), 'text/html'),
        'Markdown asset should render as HTML in the portal viewer.'
    );
    smoke_assert(
        str_contains((string)($resp['body'] ?? ''), 'HESEM OPS ASSET VIEWER'),
        'Asset viewer response should contain the standalone viewer shell.'
    );

    vps_smoke_reset_request_state();
    set_authenticated_session('admin-user', ['role' => 'admin']);
    $_GET['path'] = './ops/vps/install-terminal-gateway.sh';
    $_GET['download'] = '1';
    $resp = vps_smoke_exit_payload(static function () use ($controller): void {
        $controller->asset();
    });
    smoke_assert($resp['status'] === 200, 'Authorized asset download should succeed.');
    smoke_assert(
        str_contains((string)($resp['headers']['Content-Disposition'] ?? ''), 'attachment'),
        'Asset download should force attachment content disposition.'
    );
    smoke_assert(
        str_contains((string)($resp['body'] ?? ''), 'ttyd'),
        'Downloaded install script should contain the ttyd installation logic.'
    );

    vps_smoke_reset_request_state();
    set_authenticated_session('admin-user', ['role' => 'admin']);
    $_GET['path'] = '../secret.txt';
    $resp = vps_smoke_exit_payload(static function () use ($controller): void {
        $controller->asset();
    });
    smoke_assert($resp['status'] === 400 || $resp['status'] === 403, 'Rejected asset path should not be streamed.');
    smoke_assert(($resp['payload']['error'] ?? null) === 'vps_control_asset_failed', 'Invalid asset path should map to the dedicated asset error.');

    vps_smoke_reset_request_state();
    set_authenticated_session('admin-user', ['role' => 'admin']);
    $_GET['host_id'] = 'missing-host';
    $resp = vps_smoke_exit_payload(static function () use ($controller): void {
        $controller->host();
    });
    smoke_assert($resp['status'] === 404, 'Unknown host detail should return 404.');
    smoke_assert(($resp['payload']['error'] ?? null) === 'vps_control_host_failed', 'Unknown host should map to the controller host error.');

    echo "vps control tower smoke passed\n";
} finally {
    if (is_dir($tmpDataDir)) {
        rrmdir($tmpDataDir);
    }
}
