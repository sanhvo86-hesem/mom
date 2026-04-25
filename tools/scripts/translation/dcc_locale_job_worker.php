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

$workerArgs = parseWorkerArgs($argv);
$jobPath = $workerArgs['job_path'];
if ($jobPath === '' || !is_file($jobPath)) {
    fwrite(STDERR, "Missing job file\n");
    exit(1);
}

$fpmEnvPath = $workerArgs['fpm_env'];
if ($fpmEnvPath === '') {
    $defaultFpmEnvPath = '/etc/php/8.5/fpm/pool.d/mom.conf';
    $fpmEnvPath = is_file($defaultFpmEnvPath) ? $defaultFpmEnvPath : '';
}
if ($fpmEnvPath !== '') {
    loadFpmEnv($fpmEnvPath);
}

$queueLock = acquireQueueWorkerLock($rootDir);
if ($queueLock === null) {
    exit(0);
}

require_once $rootDir . '/mom/database/DataLayer.php';
require_once $rootDir . '/mom/api/services/DocumentControl/DocumentControlService.php';
require_once $rootDir . '/mom/api/services/DocumentControl/DocumentLocaleAutomationService.php';

$data = new DataLayer($rootDir . '/mom/data', $rootDir);
$dcc = new MOM\Services\DocumentControl\DocumentControlService($data);
$service = new DocumentLocaleAutomationService($data, $rootDir);

try {
    $seedJobPath = $jobPath;
    $idlePasses = 0;
    while ($idlePasses < 2) {
        $processedAny = false;
        foreach (jobPathsToDrain($rootDir, $seedJobPath) as $candidate) {
            $processedAny = processQueuedJob($candidate, $service, $dcc, $rootDir) || $processedAny;
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
    releaseQueueWorkerLock($queueLock);
    exit(1);
}

releaseQueueWorkerLock($queueLock);

exit(0);

/**
 * @return array{handle: resource, slot: int}|null
 */
function acquireQueueWorkerLock(string $rootDir): ?array
{
    $slotCount = configuredWorkerSlotCount();
    for ($slot = 0; $slot < $slotCount; $slot++) {
        $queueLockPath = $rootDir . '/mom/data/cache/dcc-locale-jobs/.worker-global.' . $slot . '.lock';
        $queueLock = @fopen($queueLockPath, 'c');
        if (!is_resource($queueLock)) {
            continue;
        }
        if (@flock($queueLock, LOCK_EX | LOCK_NB)) {
            return ['handle' => $queueLock, 'slot' => $slot];
        }
        fclose($queueLock);
    }

    return null;
}

/**
 * @param array{handle: resource, slot: int} $queueLock
 */
function releaseQueueWorkerLock(array $queueLock): void
{
    $handle = $queueLock['handle'];
    if (is_resource($handle)) {
        @flock($handle, LOCK_UN);
        fclose($handle);
    }
}

function configuredWorkerSlotCount(): int
{
    $raw = trim((string)(getenv('DCC_TRANSLATION_WORKER_SLOTS') ?: '1'));
    $slots = ctype_digit($raw) ? (int)$raw : 1;
    return max(1, min(4, $slots));
}

/**
 * @param list<string> $argv
 * @return array{job_path: string, fpm_env: string}
 */
function parseWorkerArgs(array $argv): array
{
    $jobPath = '';
    $fpmEnvPath = '';
    $args = array_values(array_slice($argv, 1));
    $count = count($args);
    for ($i = 0; $i < $count; $i++) {
        $arg = $args[$i];
        $arg = is_string($arg) ? trim($arg) : '';
        if ($arg === '') {
            continue;
        }
        if (str_starts_with($arg, '--fpm-env=')) {
            $fpmEnvPath = trim(substr($arg, strlen('--fpm-env=')));
            continue;
        }
        if ($arg === '--fpm-env') {
            $next = $args[$i + 1] ?? '';
            $fpmEnvPath = is_string($next) ? trim($next) : '';
            $i++;
            continue;
        }
        if (str_starts_with($arg, '--')) {
            continue;
        }
        if ($jobPath === '') {
            $jobPath = $arg;
        }
    }

    return [
        'job_path' => normalizeJobPath($jobPath),
        'fpm_env' => normalizeJobPath($fpmEnvPath),
    ];
}

function loadFpmEnv(string $path): void
{
    if (!is_file($path)) {
        fwrite(STDERR, "FPM env file not found: {$path}\n");
        exit(1);
    }
    foreach (file($path) ?: [] as $line) {
        if (!preg_match('/^\s*env\[([^\]]+)\]\s*=\s*(.*)\s*$/', $line, $m)) {
            continue;
        }
        $key = trim($m[1]);
        $value = trim($m[2]);
        if ($key === '') {
            continue;
        }
        putenv($key . '=' . $value);
        $_ENV[$key] = $value;
    }
}

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
            $found[$path] = [
                'priority' => queuedJobPriority($path),
                'size' => max(0, (int)$item->getSize()),
                'mtime' => (int)$item->getMTime(),
            ];
        }
    } catch (Throwable $e) {
        @error_log('[DCC locale worker] queue scan failed: ' . $e->getMessage());
        return $jobs;
    }

    if ($requestedJobPath !== '') {
        unset($found[$requestedJobPath]);
    }

    uasort($found, static function (array $a, array $b): int {
        return ($a['priority'] <=> $b['priority'])
            ?: ($a['size'] <=> $b['size'])
            ?: ($a['mtime'] <=> $b['mtime']);
    });
    foreach (array_keys($found) as $path) {
        $jobs[] = $path;
    }

    return $jobs;
}

function queuedJobPriority(string $jobPath): int
{
    $docCode = strtoupper((string)basename(dirname($jobPath)));
    if ($docCode === '') {
        return 90;
    }
    if (str_starts_with($docCode, 'QMS-MAN')) {
        return 0;
    }
    if (str_starts_with($docCode, 'POL-')) {
        return 1;
    }
    if (str_starts_with($docCode, 'DEPT-')) {
        return 2;
    }
    if (str_starts_with($docCode, 'SOP-')) {
        return 3;
    }
    if (str_starts_with($docCode, 'WI-')) {
        return 4;
    }
    if (str_starts_with($docCode, 'ANNEX-')) {
        return 5;
    }
    if (str_starts_with($docCode, 'FRM-') || str_contains($docCode, 'FORM')) {
        return 6;
    }
    if (str_starts_with($docCode, 'TRN-') || str_contains($docCode, 'TRAINING')) {
        return 7;
    }
    return 20;
}

function processQueuedJob(
    string $jobPath,
    DocumentLocaleAutomationService $service,
    MOM\Services\DocumentControl\DocumentControlService $dcc,
    string $rootDir
): bool
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
        recordQueuedJobFailure($jobPath, $payload ?? [], $dcc, $rootDir, $e);
    } finally {
        @flock($lock, LOCK_UN);
        fclose($lock);
        @unlink($lockPath);
    }

    return false;
}

/**
 * @param array<string, mixed> $payload
 */
function recordQueuedJobFailure(
    string $jobPath,
    array $payload,
    MOM\Services\DocumentControl\DocumentControlService $dcc,
    string $rootDir,
    Throwable $error
): void
{
    $attempts = max(0, (int)($payload['attempts'] ?? 0)) + 1;
    $maxAttemptsRaw = trim((string)(getenv('DCC_TRANSLATION_JOB_MAX_ATTEMPTS') ?: '3'));
    $maxAttempts = ctype_digit($maxAttemptsRaw) ? max(1, min(10, (int)$maxAttemptsRaw)) : 3;
    $payload['attempts'] = $attempts;
    $payload['last_error'] = $error->getMessage();
    $payload['last_attempt_at'] = gmdate(DATE_ATOM);

    if ($attempts < $maxAttempts) {
        $encoded = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        if (is_string($encoded)) {
            @file_put_contents($jobPath, $encoded, LOCK_EX);
        }
        return;
    }

    markQueuedVariantBlocked($payload, $dcc, $rootDir, $jobPath, $attempts, $error);
    $failedPath = $jobPath . '.failed';
    @rename($jobPath, $failedPath);
}

/**
 * @param array<string, mixed> $payload
 */
function markQueuedVariantBlocked(
    array $payload,
    MOM\Services\DocumentControl\DocumentControlService $dcc,
    string $rootDir,
    string $jobPath,
    int $attempts,
    Throwable $error
): void
{
    $docCode = MOM\Services\DocumentControl\DocumentControlService::canonicalizeCode((string)($payload['doc_code'] ?? ''));
    if ($docCode === '') {
        return;
    }
    $sourceHtml = trim(str_replace("\r\n", "\n", (string)($payload['source_html'] ?? '')));
    if ($sourceHtml === '') {
        return;
    }
    $revision = normaliseQueuedDccRevision((string)($payload['revision'] ?? '0.0'));
    $actor = trim((string)($payload['actor'] ?? 'system.locale-worker'));
    if ($actor === '') {
        $actor = 'system.locale-worker';
    }
    $metadata = [
        'auto_sync' => true,
        'target_locale' => 'en',
        'trigger' => (string)($payload['trigger'] ?? 'locale_worker'),
        'source_status' => (string)($payload['source_status'] ?? 'draft'),
        'source_revision' => (string)($payload['revision'] ?? '0.0'),
        'dcc_revision' => $revision,
        'source_base_rel_path' => (string)($payload['base_rel_path'] ?? ''),
        'blocked_reason' => 'translation_worker_attempts_exhausted',
        'blocked_message' => $error->getMessage(),
        'queue_attempts' => $attempts,
        'queue_job_path' => relativeWorkerPath($rootDir, $jobPath),
        'last_attempt_at' => gmdate(DATE_ATOM),
    ];
    try {
        $dcc->upsertLocaleVariant($docCode, 'en', [
            'title' => (string)($payload['title'] ?? $docCode),
            'subtitle' => $payload['subtitle'] ?? null,
            'artifact_rel_path' => null,
            'artifact_source_revision' => $revision,
            'artifact_source_hash_sha256' => strtolower(hash('sha256', $sourceHtml)),
            'translation_state' => 'blocked',
            'translation_provider' => 'command',
            'glossary_version' => 'repo_glossary',
            'engine_version' => 'worker_failed',
            'published_at' => null,
            'metadata' => $metadata,
        ], $actor);
    } catch (Throwable $markError) {
        @error_log('[DCC locale worker] unable to mark blocked for ' . $docCode . ': ' . $markError->getMessage());
    }
}

function normaliseQueuedDccRevision(string $revision): string
{
    $normalized = trim($revision);
    if ($normalized === '') {
        return 'V0.0';
    }
    $normalized = ltrim($normalized, 'vV');
    return 'V' . $normalized;
}

function relativeWorkerPath(string $rootDir, string $path): string
{
    $root = rtrim(str_replace('\\', '/', $rootDir), '/') . '/';
    $normalized = str_replace('\\', '/', $path);
    return str_starts_with($normalized, $root) ? substr($normalized, strlen($root)) : $normalized;
}

function normalizeJobPath(string $jobPath): string
{
    $normalized = str_replace('\\', '/', trim($jobPath));
    return $normalized !== '' ? $normalized : '';
}
