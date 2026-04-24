<?php

declare(strict_types=1);

use MOM\Database\DataLayer;
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

$jobPath = $argv[1] ?? '';
$jobPath = is_string($jobPath) ? trim($jobPath) : '';
if ($jobPath === '' || !is_file($jobPath)) {
    fwrite(STDERR, "Missing job file\n");
    exit(1);
}

$queueLockPath = $rootDir . '/mom/data/cache/dcc-locale-jobs/.worker-global.lock';
$queueLock = @fopen($queueLockPath, 'c');
if (!is_resource($queueLock)) {
    fwrite(STDERR, "Unable to open queue lock file\n");
    exit(1);
}
if (!@flock($queueLock, LOCK_EX | LOCK_NB)) {
    fclose($queueLock);
    exit(0);
}

require_once $rootDir . '/mom/database/DataLayer.php';
require_once $rootDir . '/mom/api/services/DocumentControl/DocumentControlService.php';
require_once $rootDir . '/mom/api/services/DocumentControl/DocumentLocaleAutomationService.php';

$data = new DataLayer($rootDir . '/mom/data', $rootDir);
$service = new DocumentLocaleAutomationService($data, $rootDir);

try {
    $seedJobPath = $jobPath;
    $idlePasses = 0;
    while ($idlePasses < 2) {
        $processedAny = false;
        foreach (jobPathsToDrain($rootDir, $seedJobPath) as $candidate) {
            $processedAny = processQueuedJob($candidate, $service) || $processedAny;
        }
        $seedJobPath = '';
        if ($processedAny) {
            $idlePasses = 0;
            continue;
        }
        $idlePasses++;
        if ($idlePasses < 2) {
            usleep(500000);
        }
    }
} catch (Throwable $e) {
    @error_log('[DCC locale worker] ' . $e->getMessage());
    @flock($queueLock, LOCK_UN);
    fclose($queueLock);
    exit(1);
}

@flock($queueLock, LOCK_UN);
fclose($queueLock);

exit(0);

/**
 * @return list<string>
 */
function jobPathsToDrain(string $rootDir, string $requestedJobPath): array
{
    $queueRoot = $rootDir . '/mom/data/cache/dcc-locale-jobs';
    $requestedJobPath = normalizeJobPath($requestedJobPath);
    $jobs = [];

    if ($requestedJobPath !== '' && is_file($requestedJobPath)) {
        $jobs[] = $requestedJobPath;
    }

    if (!is_dir($queueRoot)) {
        return $jobs;
    }

    $found = [];
    try {
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($queueRoot, FilesystemIterator::SKIP_DOTS)
        );
        foreach ($iterator as $item) {
            if (!$item instanceof SplFileInfo || !$item->isFile()) {
                continue;
            }
            $path = normalizeJobPath($item->getPathname());
            if ($path === '' || !str_ends_with($path, '.json')) {
                continue;
            }
            $found[$path] = (int)$item->getMTime();
        }
    } catch (Throwable $e) {
        @error_log('[DCC locale worker] queue scan failed: ' . $e->getMessage());
        return $jobs;
    }

    if ($requestedJobPath !== '') {
        unset($found[$requestedJobPath]);
    }

    asort($found, SORT_NUMERIC);
    foreach (array_keys($found) as $path) {
        $jobs[] = $path;
    }

    return $jobs;
}

function processQueuedJob(string $jobPath, DocumentLocaleAutomationService $service): bool
{
    $jobPath = normalizeJobPath($jobPath);
    if ($jobPath === '' || !is_file($jobPath)) {
        return false;
    }

    $lockPath = $jobPath . '.lock';
    $lock = @fopen($lockPath, 'c');
    if (!is_resource($lock)) {
        @error_log('[DCC locale worker] unable to open per-job lock for ' . $jobPath);
        return false;
    }

    if (!@flock($lock, LOCK_EX | LOCK_NB)) {
        fclose($lock);
        return false;
    }

    try {
        $raw = (string)@file_get_contents($jobPath);
        $payload = json_decode($raw, true);
        if (!is_array($payload)) {
            @error_log('[DCC locale worker] invalid job payload at ' . $jobPath);
            @unlink($jobPath);
            return true;
        }

        $service->syncEnglishMachinePreview($payload);
        @unlink($jobPath);
        return true;
    } catch (Throwable $e) {
        @error_log('[DCC locale worker] ' . $jobPath . ' :: ' . $e->getMessage());
    } finally {
        @flock($lock, LOCK_UN);
        fclose($lock);
        @unlink($lockPath);
    }

    return false;
}

function normalizeJobPath(string $jobPath): string
{
    $normalized = str_replace('\\', '/', trim($jobPath));
    return $normalized !== '' ? $normalized : '';
}
