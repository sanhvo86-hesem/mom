<?php
declare(strict_types=1);

use HESEM\QMS\Services\MtconnectPollingService;

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    echo "CLI only.\n";
    exit(1);
}

$rootDir = dirname(__DIR__);
$dataDir = $rootDir . '/qms-data';

require_once $rootDir . '/api/services/MtconnectPollingService.php';

$options = getopt('', [
    'machine::',
    'adapter::',
    'force',
    'timeout::',
    'user::',
    'json',
]);

$service = new MtconnectPollingService($dataDir, dirname($rootDir));
$payload = [
    'user_id' => trim((string)($options['user'] ?? 'system.mtconnect')),
    'force' => array_key_exists('force', $options),
    'timeout_seconds' => max(3, min(30, (int)($options['timeout'] ?? 8))),
];

if (!empty($options['adapter'])) {
    $payload['adapter_id'] = trim((string)$options['adapter']);
}

$machineId = trim((string)($options['machine'] ?? ''));
$result = $machineId !== ''
    ? $service->pollMachine($machineId, $payload)
    : $service->pollAll($payload);

$json = json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
if ($json === false) {
    fwrite(STDERR, "Unable to encode result.\n");
    exit(1);
}

if (array_key_exists('json', $options)) {
    echo $json . PHP_EOL;
} else {
    echo "MTConnect poll cycle completed." . PHP_EOL;
    echo $json . PHP_EOL;
}

$ok = (bool)($result['ok'] ?? false);
exit($ok ? 0 : 2);
