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

function vps_smoke_set_json_body(object $controller, array $body): void
{
    $ref = new ReflectionObject($controller);
    while ($ref->getParentClass() !== false) {
        if ($ref->hasProperty('jsonBodyCache')) {
            break;
        }
        $ref = $ref->getParentClass();
    }
    $property = $ref->getProperty('jsonBodyCache');
    $property->setValue($controller, $body);
}

$tmpDataDir = sys_get_temp_dir() . '/mom-vps-control-' . bin2hex(random_bytes(6));
@mkdir($tmpDataDir . '/config', 0775, true);
$explorerRoot = $tmpDataDir . '/explorer-root';
@mkdir($explorerRoot . '/subdir', 0775, true);
file_put_contents($explorerRoot . '/readme.txt', "hello file explorer\nline two\n");
file_put_contents($explorerRoot . '/subdir/app.log', "probe ok\n");
file_put_contents($explorerRoot . '/secret.key', "do-not-stream\n");
file_put_contents($explorerRoot . '/.hidden-note', "hidden\n");

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
        'file_roots' => [
            [
                'id' => 'test_root',
                'label' => 'Test root',
                'path' => $explorerRoot,
                'note' => 'Smoke-test file explorer root.',
            ],
        ],
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
    smoke_assert(($overview['metrics']['file_roots_count'] ?? null) === 1, 'VPS overview should expose the declared file root count.');
    smoke_assert(($overview['metrics']['terminal_ready_hosts'] ?? null) === 1, 'VPS overview should count one terminal-ready host.');
    smoke_assert(($overview['metrics']['observability_ready_hosts'] ?? null) === 1, 'VPS overview should count one observability-ready host.');
    smoke_assert(count((array)($overview['control_assets'] ?? [])) >= 6, 'VPS overview should expose the whitelisted control assets.');

    $snapshot = $service->getHostSnapshot('local-vps');
    smoke_assert(($snapshot['id'] ?? null) === 'local-vps', 'Host snapshot should resolve the configured host.');
    smoke_assert(($snapshot['mode'] ?? null) === 'local', 'Host snapshot should preserve the declared execution mode.');
    smoke_assert(count((array)($snapshot['terminals'] ?? [])) === 2, 'Host snapshot should expose both terminal entries.');
    smoke_assert(count((array)($snapshot['observability'] ?? [])) === 2, 'Host snapshot should expose both observability panels.');
    smoke_assert(count((array)($snapshot['file_roots'] ?? [])) === 1, 'Host snapshot should expose the configured file explorer root.');
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

    $fileList = $service->listFiles('local-vps', 'test_root');
    smoke_assert(($fileList['mode'] ?? null) === 'list', 'File explorer list should return list mode.');
    smoke_assert(count((array)($fileList['entries'] ?? [])) >= 3, 'File explorer list should return root entries.');
    smoke_assert(
        count(array_filter((array)($fileList['entries'] ?? []), static fn(array $entry): bool => ($entry['relative_path'] ?? '') === 'readme.txt')) === 1,
        'File explorer list should include the smoke text file.'
    );
    smoke_assert(
        count(array_filter((array)($fileList['entries'] ?? []), static fn(array $entry): bool => ($entry['relative_path'] ?? '') === '.hidden-note')) === 0,
        'File explorer list should hide dotfiles by default.'
    );
    $fileListHidden = $service->listFiles('local-vps', 'test_root', '', true);
    smoke_assert(
        count(array_filter((array)($fileListHidden['entries'] ?? []), static fn(array $entry): bool => ($entry['relative_path'] ?? '') === '.hidden-note')) === 1,
        'File explorer list should show dotfiles when requested.'
    );
    $fileRead = $service->readFile('local-vps', 'test_root', 'readme.txt');
    smoke_assert(str_contains((string)($fileRead['content'] ?? ''), 'hello file explorer'), 'File explorer should preview text files.');
    $fileDownload = $service->readFile('local-vps', 'test_root', 'readme.txt', true);
    smoke_assert(base64_decode((string)($fileDownload['content_base64'] ?? ''), true) === "hello file explorer\nline two\n", 'File explorer download should return base64 raw content.');
    $fileSearch = $service->searchFiles('local-vps', 'test_root', '', 'app.log');
    smoke_assert(
        count(array_filter((array)($fileSearch['entries'] ?? []), static fn(array $entry): bool => ($entry['relative_path'] ?? '') === 'subdir/app.log')) === 1,
        'File explorer search should find nested matching files.'
    );
    try {
        $service->readFile('local-vps', 'test_root', '../outside.txt');
        throw new RuntimeException('Unexpected path traversal read.');
    } catch (RuntimeException $e) {
        smoke_assert(str_starts_with($e->getMessage(), 'invalid_file_path'), 'File explorer should reject path traversal.');
    }
    try {
        $service->readFile('local-vps', 'test_root', 'secret.key');
        throw new RuntimeException('Unexpected secret key read.');
    } catch (RuntimeException $e) {
        smoke_assert(str_starts_with($e->getMessage(), 'file_access_denied'), 'File explorer should block guarded secret files.');
    }
    $mkdir = $service->mutateFile('local-vps', 'test_root', 'mkdir', ['path' => '', 'name' => 'uploads']);
    smoke_assert(($mkdir['mode'] ?? null) === 'mkdir' && is_dir($explorerRoot . '/uploads'), 'File explorer should create folders.');
    $uploadTmp = tempnam($tmpDataDir, 'upload-');
    smoke_assert(is_string($uploadTmp), 'Upload temp file should be created.');
    file_put_contents($uploadTmp, "uploaded payload\n");
    $upload = $service->uploadFile('local-vps', 'test_root', 'uploads', $uploadTmp, 'client.txt');
    smoke_assert(($upload['mode'] ?? null) === 'upload' && is_file($explorerRoot . '/uploads/client.txt'), 'File explorer should upload files.');
    $rename = $service->mutateFile('local-vps', 'test_root', 'rename', ['path' => 'uploads/client.txt', 'name' => 'renamed.txt']);
    smoke_assert(($rename['destination_path'] ?? null) === 'uploads/renamed.txt' && is_file($explorerRoot . '/uploads/renamed.txt'), 'File explorer should rename files.');
    $copy = $service->mutateFile('local-vps', 'test_root', 'copy', ['path' => 'uploads/renamed.txt', 'target_path' => '', 'name' => 'copied.txt']);
    smoke_assert(($copy['destination_path'] ?? null) === 'copied.txt' && is_file($explorerRoot . '/copied.txt'), 'File explorer should copy files.');
    $move = $service->mutateFile('local-vps', 'test_root', 'move', ['path' => 'copied.txt', 'target_path' => 'uploads', 'name' => 'moved.txt']);
    smoke_assert(($move['destination_path'] ?? null) === 'uploads/moved.txt' && is_file($explorerRoot . '/uploads/moved.txt') && !is_file($explorerRoot . '/copied.txt'), 'File explorer should move files for cut/paste and drag/drop.');
    $delete = $service->mutateFile('local-vps', 'test_root', 'delete', ['path' => 'uploads/moved.txt']);
    clearstatcache(true, $explorerRoot . '/uploads/moved.txt');
    smoke_assert(($delete['mode'] ?? null) === 'delete' && !is_file($explorerRoot . '/uploads/moved.txt'), 'File explorer should delete files.');
    if (class_exists(ZipArchive::class)) {
        $zip = $service->mutateFile('local-vps', 'test_root', 'zip', ['path' => 'uploads/renamed.txt', 'target_path' => '', 'name' => 'renamed-test.zip']);
        smoke_assert(($zip['destination_path'] ?? null) === 'uploads/renamed-test.zip' && is_file($explorerRoot . '/uploads/renamed-test.zip'), 'File explorer should compress files to ZIP next to the selected item.');
        $unzip = $service->mutateFile('local-vps', 'test_root', 'unzip', ['path' => 'uploads/renamed-test.zip', 'target_path' => 'uploads', 'name' => 'renamed-test']);
        smoke_assert(($unzip['path'] ?? null) === 'uploads/renamed-test' && is_file($explorerRoot . '/uploads/renamed-test/renamed.txt'), 'File explorer should extract ZIP files.');
        smoke_assert(file_get_contents($explorerRoot . '/uploads/renamed-test/renamed.txt') === "uploaded payload\n", 'Extracted ZIP content should match the source file.');
        try {
            $service->mutateFile('local-vps', 'test_root', 'unzip', ['path' => 'uploads/renamed.txt']);
            throw new RuntimeException('Unexpected non-zip extract.');
        } catch (RuntimeException $e) {
            smoke_assert(str_starts_with($e->getMessage(), 'file_not_zip'), 'File explorer should reject extracting non-ZIP files.');
        }
    } else {
        try {
            $service->mutateFile('local-vps', 'test_root', 'zip', ['path' => 'uploads/renamed.txt', 'name' => 'renamed-test.zip']);
            throw new RuntimeException('Unexpected ZIP support without ZipArchive.');
        } catch (RuntimeException $e) {
            smoke_assert(str_starts_with($e->getMessage(), 'zip_unavailable'), 'File explorer should report missing ZipArchive support.');
        }
    }
    try {
        $service->mutateFile('local-vps', 'test_root', 'delete', ['path' => 'secret.key']);
        throw new RuntimeException('Unexpected guarded file delete.');
    } catch (RuntimeException $e) {
        smoke_assert(str_starts_with($e->getMessage(), 'file_access_denied'), 'File explorer should block mutation of guarded secret files.');
    }

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
    $_GET['host_id'] = 'local-vps';
    $_GET['root_id'] = 'test_root';
    $resp = vps_smoke_exit_payload(static function () use ($controller): void {
        $controller->fileList();
    });
    smoke_assert($resp['status'] === 200, 'Authorized file list request should succeed.');
    smoke_assert(
        (($resp['payload']['explorer'] ?? [])['root']['id'] ?? null) === 'test_root',
        'File list response should include the selected root.'
    );

    vps_smoke_reset_request_state();
    set_authenticated_session('admin-user', ['role' => 'admin']);
    $_GET['host_id'] = 'local-vps';
    $_GET['root_id'] = 'test_root';
    $_GET['q'] = 'app.log';
    $resp = vps_smoke_exit_payload(static function () use ($controller): void {
        $controller->fileSearch();
    });
    smoke_assert($resp['status'] === 200, 'Authorized file search request should succeed.');
    smoke_assert((($resp['payload']['explorer'] ?? [])['mode'] ?? null) === 'search', 'File search response should be in search mode.');

    vps_smoke_reset_request_state();
    set_authenticated_session('admin-user', ['role' => 'admin']);
    $_GET['host_id'] = 'local-vps';
    $_GET['root_id'] = 'test_root';
    $_GET['path'] = 'readme.txt';
    $resp = vps_smoke_exit_payload(static function () use ($controller): void {
        $controller->fileRead();
    });
    smoke_assert($resp['status'] === 200, 'Authorized file read request should succeed.');
    smoke_assert(
        str_contains((string)((($resp['payload']['explorer'] ?? [])['content'] ?? '')), 'hello file explorer'),
        'File read response should include preview content.'
    );

    vps_smoke_reset_request_state();
    set_authenticated_session('admin-user', ['role' => 'admin']);
    $_GET['host_id'] = 'local-vps';
    $_GET['root_id'] = 'test_root';
    $_GET['path'] = 'readme.txt';
    $_GET['download'] = '1';
    $resp = vps_smoke_exit_payload(static function () use ($controller): void {
        $controller->fileRead();
    });
    smoke_assert($resp['status'] === 200, 'Authorized file download request should succeed.');
    smoke_assert(
        str_contains((string)($resp['headers']['Content-Disposition'] ?? ''), 'attachment'),
        'File download should force attachment disposition.'
    );
    smoke_assert((string)($resp['body'] ?? '') === "hello file explorer\nline two\n", 'File download body should stream raw content.');

    vps_smoke_reset_request_state();
    set_authenticated_session('admin-user', ['role' => 'admin']);
    $_SESSION['csrf'] = 'vps-smoke-csrf';
    $_SERVER['HTTP_X_CSRF_TOKEN'] = 'vps-smoke-csrf';
    vps_smoke_set_json_body($controller, [
        'host_id' => 'local-vps',
        'root_id' => 'test_root',
        'operation' => 'mkdir',
        'path' => '',
        'name' => 'controller-folder',
    ]);
    $resp = vps_smoke_exit_payload(static function () use ($controller): void {
        $controller->fileMutate();
    });
    smoke_assert($resp['status'] === 200, 'Authorized file mutation request should succeed.');
    smoke_assert(is_dir($explorerRoot . '/controller-folder'), 'File mutation should create the controller folder.');

    vps_smoke_reset_request_state();
    set_authenticated_session('admin-user', ['role' => 'admin']);
    $_GET['host_id'] = 'local-vps';
    $_GET['root_id'] = 'test_root';
    $_GET['path'] = 'secret.key';
    $resp = vps_smoke_exit_payload(static function () use ($controller): void {
        $controller->fileRead();
    });
    smoke_assert($resp['status'] === 403, 'Guarded file read should be forbidden.');
    smoke_assert(($resp['payload']['error'] ?? null) === 'vps_file_read_failed', 'Guarded file read should map to the dedicated file read error.');

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

    $portalHtml = (string)file_get_contents(QMS_TEST_BASE_DIR . '/portal.html');
    $vpsScript = (string)file_get_contents(QMS_TEST_BASE_DIR . '/scripts/portal/33-vps-control-tower.js');
    $vpsStyles = (string)file_get_contents(QMS_TEST_BASE_DIR . '/styles/vps-control-tower.css');

    smoke_assert(
        str_contains($portalHtml, '20260414-admin-file-tabs'),
        'Portal should bust the VPS Control Tower JS/CSS cache after the admin file tab navigation fix.'
    );
    smoke_assert(
        str_contains($vpsScript, 'vps-control-tab-strip'),
        'VPS Control Tower should render File Explorer through the same tab strip as the other VPS tabs.'
    );
    smoke_assert(
        !str_contains($vpsScript, "state.tab === 'files' ? ' vps-ct-file-mode'"),
        'File Explorer should not switch the VPS Control Tower into a special file-only render mode.'
    );
    smoke_assert(
        str_contains($vpsStyles, '.vps-control-tab-strip'),
        'VPS Control Tower tab strip should have a persistent navigation surface.'
    );
    smoke_assert(
        !str_contains($vpsStyles, '.vps-ct.vps-ct-file-mode'),
        'VPS Control Tower CSS should not keep a special File Explorer-only layout mode.'
    );

    echo "vps control tower smoke passed\n";
} finally {
    if (is_dir($tmpDataDir)) {
        rrmdir($tmpDataDir);
    }
}
