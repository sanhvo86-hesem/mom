<?php

declare(strict_types=1);

use MOM\Database\DataLayer;
use MOM\Services\DocumentControl\DocumentControlService;
use MOM\Services\DocumentControl\DocumentLocaleAutomationService;

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "CLI only\n");
    exit(1);
}

$rootDir = realpath(__DIR__ . '/../../..');
if (!is_string($rootDir) || $rootDir === '') {
    fwrite(STDERR, "Unable to resolve repo root\n");
    exit(1);
}

$options = getopt('', [
    'code::',
    'fpm-env::',
    'limit::',
]);
if (!is_array($options)) {
    $options = [];
}

$fpmEnvPath = trim((string)($options['fpm-env'] ?? ''));
if ($fpmEnvPath === '') {
    $defaultFpmEnvPath = '/etc/php/8.5/fpm/pool.d/mom.conf';
    $fpmEnvPath = is_file($defaultFpmEnvPath) ? $defaultFpmEnvPath : '';
}
if ($fpmEnvPath !== '') {
    loadFpmEnv($fpmEnvPath);
}

require_once $rootDir . '/mom/database/DataLayer.php';
require_once $rootDir . '/mom/api/services/DocumentControl/DocumentControlService.php';
require_once $rootDir . '/mom/api/services/DocumentControl/DocumentLocaleAutomationService.php';

$onlyCode = DocumentControlService::canonicalizeCode((string)($options['code'] ?? ''));
$limit = isset($options['limit']) && ctype_digit((string)$options['limit'])
    ? max(1, (int)$options['limit'])
    : 0;

$data = new DataLayer($rootDir . '/mom/data', $rootDir);
$dcc = new DocumentControlService($data);
$locale = new DocumentLocaleAutomationService($data, $rootDir);

$stats = [
    'scanned' => 0,
    'changed' => 0,
    'skipped' => 0,
    'errors' => 0,
];
$results = [];
$processed = 0;

for ($offset = 0; ; $offset += 500) {
    $rows = $dcc->listLocalizedHeaders([], 500, $offset, 'en');
    if ($rows === []) {
        break;
    }

    foreach ($rows as $row) {
        $docCode = DocumentControlService::canonicalizeCode((string)($row['doc_code'] ?? ''));
        if ($docCode === '' || ($onlyCode !== '' && $docCode !== $onlyCode)) {
            continue;
        }
        if ($limit > 0 && $processed >= $limit) {
            break 2;
        }

        $processed++;
        $stats['scanned']++;
        try {
            $out = $locale->refreshEnglishArtifactBootstrap($docCode);
            if (($out['ok'] ?? false) !== true) {
                $stats['skipped']++;
                $results[] = $out;
                continue;
            }
            if (($out['changed'] ?? false) === true) {
                $stats['changed']++;
            }
            $results[] = $out;
        } catch (Throwable $e) {
            $stats['errors']++;
            $results[] = [
                'ok' => false,
                'doc_code' => $docCode,
                'reason' => 'repair_exception',
                'message' => $e->getMessage(),
            ];
        }
    }
}

echo json_encode(
    [
        'ok' => $stats['errors'] === 0,
        'stats' => $stats,
        'results' => array_slice($results, 0, 50),
    ],
    JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
) . "\n";
exit($stats['errors'] === 0 ? 0 : 1);

function loadFpmEnv(string $path): void
{
    if (!is_file($path)) {
        return;
    }
    $lines = @file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (!is_array($lines)) {
        return;
    }
    foreach ($lines as $line) {
        $line = trim((string)$line);
        if (!preg_match('/^env\[([A-Za-z_][A-Za-z0-9_]*)\]\s*=\s*(.*)$/', $line, $m)) {
            continue;
        }
        $key = $m[1];
        $value = trim($m[2], " \t\"'");
        putenv($key . '=' . $value);
        $_ENV[$key] = $value;
        $_SERVER[$key] = $value;
    }
}
