<?php

declare(strict_types=1);

use MOM\Database\DataLayer;
use MOM\Services\DocumentControl\DocumentLocaleAutomationService;

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "CLI only\n");
    exit(1);
}

$jobPath = $argv[1] ?? '';
$jobPath = is_string($jobPath) ? trim($jobPath) : '';
if ($jobPath === '' || !is_file($jobPath)) {
    fwrite(STDERR, "Missing job file\n");
    exit(1);
}

$lockPath = $jobPath . '.lock';
$lock = @fopen($lockPath, 'c');
if (!is_resource($lock)) {
    fwrite(STDERR, "Unable to open lock file\n");
    exit(1);
}
if (!@flock($lock, LOCK_EX | LOCK_NB)) {
    fclose($lock);
    exit(0);
}

$rootDir = realpath(__DIR__ . '/../../..');
if (!is_string($rootDir) || $rootDir === '') {
    fwrite(STDERR, "Unable to resolve repo root\n");
    @flock($lock, LOCK_UN);
    fclose($lock);
    exit(1);
}

require_once $rootDir . '/mom/database/DataLayer.php';
require_once $rootDir . '/mom/api/services/DocumentControl/DocumentControlService.php';
require_once $rootDir . '/mom/api/services/DocumentControl/DocumentLocaleAutomationService.php';

$raw = (string)@file_get_contents($jobPath);
$payload = json_decode($raw, true);
if (!is_array($payload)) {
    fwrite(STDERR, "Invalid job payload\n");
    @unlink($jobPath);
    @flock($lock, LOCK_UN);
    fclose($lock);
    exit(1);
}

$data = new DataLayer($rootDir . '/mom/data', $rootDir);
$service = new DocumentLocaleAutomationService($data, $rootDir);

try {
    $service->syncEnglishMachinePreview($payload);
    @unlink($jobPath);
} catch (Throwable $e) {
    @error_log('[DCC locale worker] ' . $e->getMessage());
    @flock($lock, LOCK_UN);
    fclose($lock);
    @unlink($lockPath);
    exit(1);
}

@flock($lock, LOCK_UN);
fclose($lock);
@unlink($lockPath);

exit(0);
