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
if (!is_string($rootDir)) {
    fwrite(STDERR, "Unable to resolve repo root\n");
    exit(1);
}

require_once $rootDir . '/mom/database/DataLayer.php';
require_once $rootDir . '/mom/api/services/DocumentControl/DocumentControlService.php';
require_once $rootDir . '/mom/api/services/DocumentControl/DocumentLocaleAutomationService.php';

$options = getopt('', [
    'actor::',
    'code::',
    'dry-run',
    'fpm-env::',
    'force',
    'limit::',
    'max-queue::',
    'no-spawn-per-job',
    'only-missing-job',
    'prewarm-segment-cache',
    'segment-prewarm-limit::',
    'start-workers::',
    'wait-for-workers',
    'worker-slots::',
]);
if (!is_array($options)) {
    $options = [];
}

$actor = trim((string)($options['actor'] ?? 'system.locale-backfill'));
if ($actor === '') {
    $actor = 'system.locale-backfill';
}
$onlyCode = DocumentControlService::canonicalizeCode((string)($options['code'] ?? ''));
$dryRun = array_key_exists('dry-run', $options);
$force = array_key_exists('force', $options);
$onlyMissingJob = array_key_exists('only-missing-job', $options);
$prewarmSegmentCache = array_key_exists('prewarm-segment-cache', $options);
$spawnPerJob = !array_key_exists('no-spawn-per-job', $options);
$waitForWorkers = array_key_exists('wait-for-workers', $options);
$limit = isset($options['limit']) && ctype_digit((string)$options['limit'])
    ? max(1, (int)$options['limit'])
    : 0;
$maxQueue = isset($options['max-queue']) && ctype_digit((string)$options['max-queue'])
    ? max(0, (int)$options['max-queue'])
    : 0;
$segmentPrewarmLimit = isset($options['segment-prewarm-limit']) && ctype_digit((string)$options['segment-prewarm-limit'])
    ? max(0, (int)$options['segment-prewarm-limit'])
    : 0;
$startWorkers = isset($options['start-workers']) && ctype_digit((string)$options['start-workers'])
    ? max(0, min(8, (int)$options['start-workers']))
    : 0;
$workerSlots = isset($options['worker-slots']) && ctype_digit((string)$options['worker-slots'])
    ? max(1, min(8, (int)$options['worker-slots']))
    : max(1, $startWorkers);
$fpmEnvPath = trim((string)($options['fpm-env'] ?? ''));
if ($fpmEnvPath !== '') {
    loadFpmEnv($fpmEnvPath);
}
if ($workerSlots > 0) {
    putenv('DCC_TRANSLATION_WORKER_SLOTS=' . $workerSlots);
    $_ENV['DCC_TRANSLATION_WORKER_SLOTS'] = (string)$workerSlots;
}

if (!function_exists('strip_base_href_archive')) {
    function strip_base_href_archive(string $html): string
    {
        $out = preg_replace('/<base\s+[^>]*href=["\']\.\.\/["\'][^>]*>\s*/i', '', $html, 1);
        return is_string($out) ? $out : $html;
    }
}

$data = new DataLayer($rootDir . '/mom/data', $rootDir);
$dcc = new DocumentControlService($data);
$locale = new DocumentLocaleAutomationService($data, $rootDir);

$stats = [
    'scanned' => 0,
    'queued' => 0,
    'skipped_ready' => 0,
    'skipped_no_source' => 0,
    'skipped_job_exists' => 0,
    'skipped_queue_limit' => 0,
    'errors' => 0,
    'workers_started' => 0,
    'worker_exit_codes' => [],
    'segment_cache_prewarm' => null,
];
$results = [];
$processed = 0;
$initialQueueCount = countQueuedJobs($rootDir);
$currentQueueCount = $initialQueueCount;

if (!$dryRun && $prewarmSegmentCache) {
    $stats['segment_cache_prewarm'] = prewarmSegmentCache($rootDir, $segmentPrewarmLimit);
    if (($stats['segment_cache_prewarm']['ok'] ?? false) !== true) {
        $stats['errors']++;
    }
}

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
        $sourceRelPath = normalizeRepoRelativePath((string)($row['filesystem_path'] ?? ''));
        $sourceAbsPath = $sourceRelPath !== '' ? $rootDir . '/' . $sourceRelPath : '';
        $sourceHtml = ($sourceAbsPath !== '' && is_file($sourceAbsPath))
            ? (string)@file_get_contents($sourceAbsPath)
            : '';
        if (trim($sourceHtml) === '') {
            $stats['skipped_no_source']++;
            $results[] = ['doc_code' => $docCode, 'status' => 'skipped_no_source', 'path' => $sourceRelPath];
            continue;
        }

        $rawVariant = fetchLocaleVariant($data, $docCode);
        $normalizedSource = trim(str_replace("\r\n", "\n", strip_base_href_archive($sourceHtml)));
        $sourceHash = strtolower(hash('sha256', $normalizedSource));
        $readiness = localeReadiness($rootDir, $rawVariant, $sourceHash);
        if (!$force && $readiness['ready']) {
            $stats['skipped_ready']++;
            $results[] = ['doc_code' => $docCode, 'status' => 'skipped_ready', 'reason' => $readiness['reason']];
            continue;
        }

        $jobPath = queuedTranslationJobPath($rootDir, $docCode, 'en', $sourceHash);
        if ($onlyMissingJob && is_file($jobPath)) {
            $stats['skipped_job_exists']++;
            $results[] = ['doc_code' => $docCode, 'status' => 'skipped_job_exists'];
            continue;
        }
        if ($maxQueue > 0 && $currentQueueCount >= $maxQueue) {
            $stats['skipped_queue_limit']++;
            $results[] = ['doc_code' => $docCode, 'status' => 'skipped_queue_limit', 'reason' => $readiness['reason']];
            continue;
        }

        if ($dryRun) {
            $stats['queued']++;
            $results[] = [
                'doc_code' => $docCode,
                'status' => 'would_queue',
                'reason' => $readiness['reason'],
                'path' => $sourceRelPath,
            ];
            continue;
        }

        try {
            $out = $locale->scheduleEnglishMachinePreview([
                'doc_code' => $docCode,
                'base_rel_path' => $sourceRelPath,
                'source_html' => $sourceHtml,
                'source_status' => (string)($row['status'] ?? 'draft'),
                'revision' => (string)($row['revision'] ?? 'V0.0'),
                'trigger' => 'locale_backfill',
                'actor' => $actor,
                'title' => (string)($row['source_title'] ?? ($row['title'] ?? $docCode)),
                'subtitle' => $row['source_subtitle'] ?? ($row['subtitle'] ?? null),
                'effective_date' => $row['effective_date'] ?? null,
                'spawn_worker' => $spawnPerJob,
            ]);
            if (($out['ok'] ?? true) === false) {
                $stats['errors']++;
                $results[] = [
                    'doc_code' => $docCode,
                    'status' => 'error',
                    'reason' => $out['reason'] ?? 'locale_schedule_failed',
                    'message' => $out['message'] ?? null,
                    'translation_state' => $out['translation_state'] ?? null,
                ];
                continue;
            }
            if (!empty($out['queued'])) {
                $stats['queued']++;
            }
            if (!empty($out['queued'])) {
                $currentQueueCount++;
            }
            $results[] = [
                'doc_code' => $docCode,
                'status' => !empty($out['queued']) ? 'queued' : 'restored_or_noop',
                'reason' => $readiness['reason'],
                'translation_state' => $out['translation_state'] ?? null,
            ];
        } catch (Throwable $e) {
            $stats['errors']++;
            $results[] = ['doc_code' => $docCode, 'status' => 'error', 'message' => $e->getMessage()];
        }
    }

    if (count($rows) < 500) {
        break;
    }
}

if (!$dryRun && $startWorkers > 0) {
    $workerResult = startQueuedWorkers($rootDir, $startWorkers, $fpmEnvPath, $waitForWorkers);
    $stats['workers_started'] = $workerResult['started'];
    $stats['worker_exit_codes'] = $workerResult['exit_codes'];
    foreach ($workerResult['exit_codes'] as $exitCode) {
        if ($exitCode !== 0) {
            $stats['errors']++;
        }
    }
}

echo json_encode([
    'ok' => $stats['errors'] === 0,
    'dry_run' => $dryRun,
    'force' => $force,
    'only_missing_job' => $onlyMissingJob,
    'spawn_per_job' => $spawnPerJob,
    'start_workers' => $startWorkers,
    'wait_for_workers' => $waitForWorkers,
    'worker_slots' => $workerSlots,
    'prewarm_segment_cache' => $prewarmSegmentCache,
    'queue_count_before' => $initialQueueCount,
    'queue_count_after' => countQueuedJobs($rootDir),
    'stats' => $stats,
    'results' => array_slice($results, 0, 100),
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "\n";

exit($stats['errors'] === 0 ? 0 : 1);

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
 * @return array<string, mixed>
 */
function prewarmSegmentCache(string $rootDir, int $limitDocs = 0): array
{
    $script = rtrim($rootDir, '/') . '/tools/scripts/translation/dcc_locale_segment_cache_prewarm.py';
    if (!is_file($script)) {
        return ['ok' => false, 'reason' => 'segment_prewarm_script_missing'];
    }

    $providerCommand = trim((string)getenv('DCC_TRANSLATION_COMMAND'));
    if ($providerCommand === '') {
        return ['ok' => false, 'reason' => 'translation_command_missing'];
    }

    $parts = str_getcsv($providerCommand, ' ');
    $python = trim((string)($parts[0] ?? ''));
    if ($python === '' || !is_file($python)) {
        return ['ok' => false, 'reason' => 'python_runtime_missing', 'python' => $python];
    }

    $command = escapeshellarg($python)
        . ' ' . escapeshellarg($script)
        . ' --root=' . escapeshellarg($rootDir);
    if ($limitDocs > 0) {
        $command .= ' --limit-docs=' . $limitDocs;
    }

    $descriptor = [
        1 => ['pipe', 'w'],
        2 => ['pipe', 'w'],
    ];
    $process = proc_open($command, $descriptor, $pipes, $rootDir);
    if (!is_resource($process)) {
        return ['ok' => false, 'reason' => 'segment_prewarm_start_failed'];
    }

    $stdout = stream_get_contents($pipes[1]);
    fclose($pipes[1]);
    $stderr = stream_get_contents($pipes[2]);
    fclose($pipes[2]);
    $exitCode = proc_close($process);
    $decoded = is_string($stdout) ? json_decode(trim($stdout), true) : null;
    $result = is_array($decoded) ? $decoded : [];
    $result['ok'] = $exitCode === 0 && (($result['ok'] ?? true) === true);
    $result['exit_code'] = $exitCode;
    if (is_string($stderr) && trim($stderr) !== '') {
        $result['stderr'] = substr(trim($stderr), -2000);
    }
    if ($result === ['ok' => false, 'exit_code' => $exitCode]) {
        $result['stdout'] = is_string($stdout) ? substr(trim($stdout), -2000) : '';
    }
    return $result;
}

function normalizeRepoRelativePath(string $path): string
{
    $normalized = ltrim(str_replace('\\', '/', trim($path)), '/');
    if ($normalized === '' || str_contains($normalized, '..')) {
        return '';
    }
    return $normalized;
}

/**
 * @return array<string, mixed>
 */
function fetchLocaleVariant(DataLayer $data, string $docCode): array
{
    $rows = $data->query(
        "SELECT artifact_rel_path, artifact_source_hash_sha256, translation_state
         FROM dcc_document_locale_variant
         WHERE doc_code = :doc_code AND locale = 'en'
         LIMIT 1",
        [':doc_code' => $docCode]
    ) ?? [];
    $row = $rows[0] ?? [];
    return is_array($row) ? $row : [];
}

/**
 * @param array<string, mixed> $variant
 * @return array{ready: bool, reason: string}
 */
function localeReadiness(string $rootDir, array $variant, string $sourceHash): array
{
    $state = strtolower(trim((string)($variant['translation_state'] ?? '')));
    if (!in_array($state, ['machine_preview', 'review_pending', 'reviewed', 'released'], true)) {
        return ['ready' => false, 'reason' => $state !== '' ? 'state_' . $state : 'variant_missing'];
    }
    $variantHash = strtolower(trim((string)($variant['artifact_source_hash_sha256'] ?? '')));
    if ($variantHash === '' || !hash_equals($variantHash, $sourceHash)) {
        return ['ready' => false, 'reason' => 'source_hash_changed'];
    }
    $artifactRelPath = normalizeRepoRelativePath((string)($variant['artifact_rel_path'] ?? ''));
    if ($artifactRelPath === '') {
        return ['ready' => false, 'reason' => 'artifact_path_missing'];
    }
    if (!is_file($rootDir . '/' . $artifactRelPath)) {
        return ['ready' => false, 'reason' => 'artifact_file_missing'];
    }
    $artifactHtml = @file_get_contents($rootDir . '/' . $artifactRelPath);
    if (!is_string($artifactHtml) || trim($artifactHtml) === '') {
        return ['ready' => false, 'reason' => 'artifact_file_unreadable'];
    }
    $qualityIssues = DocumentLocaleAutomationService::detectLocaleArtifactQualityIssues($artifactHtml);
    if ($qualityIssues !== []) {
        return ['ready' => false, 'reason' => 'artifact_quality_failed:' . implode(',', $qualityIssues)];
    }

    return ['ready' => true, 'reason' => 'current_artifact_ready'];
}

function queuedTranslationJobPath(string $rootDir, string $docCode, string $locale, string $sourceHash): string
{
    $safeCode = preg_replace('/[^A-Z0-9._-]+/i', '-', DocumentControlService::canonicalizeCode($docCode)) ?? 'DOC';
    $safeLocale = preg_replace('/[^a-z0-9_-]+/i', '', strtolower($locale)) ?? 'en';
    $safeHash = preg_replace('/[^a-f0-9]+/i', '', strtolower($sourceHash)) ?? '';
    return rtrim($rootDir, '/') . '/mom/data/cache/dcc-locale-jobs/' . $safeLocale . '/' . $safeCode . '/' . $safeHash . '.json';
}

function countQueuedJobs(string $rootDir): int
{
    return count(listQueuedJobs($rootDir, PHP_INT_MAX));
}

/**
 * @return list<string>
 */
function listQueuedJobs(string $rootDir, int $limit): array
{
    $queueRoot = rtrim($rootDir, '/') . '/mom/data/cache/dcc-locale-jobs';
    if (!is_dir($queueRoot) || $limit <= 0) {
        return [];
    }
    $jobs = [];
    try {
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($queueRoot, FilesystemIterator::SKIP_DOTS)
        );
        foreach ($iterator as $item) {
            if (!$item instanceof SplFileInfo || !$item->isFile()) {
                continue;
            }
            $path = str_replace('\\', '/', $item->getPathname());
            if (!str_ends_with($path, '.json')) {
                continue;
            }
            $jobs[$path] = [
                'priority' => queuedJobPriority($path),
                'size' => max(0, (int)$item->getSize()),
                'mtime' => (int)$item->getMTime(),
            ];
        }
    } catch (Throwable) {
        return [];
    }
    uasort($jobs, static function (array $a, array $b): int {
        return ($a['priority'] <=> $b['priority'])
            ?: ($a['size'] <=> $b['size'])
            ?: ($a['mtime'] <=> $b['mtime']);
    });
    return array_slice(array_keys($jobs), 0, $limit);
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

/**
 * @return array{started: int, exit_codes: list<int|null>}
 */
function startQueuedWorkers(string $rootDir, int $count, string $fpmEnvPath = '', bool $waitForWorkers = false): array
{
    $worker = rtrim($rootDir, '/') . '/tools/scripts/translation/dcc_locale_job_worker.php';
    if (!is_file($worker)) {
        return ['started' => 0, 'exit_codes' => []];
    }
    $php = trim((string)@shell_exec('command -v php8.5 2>/dev/null')) ?: PHP_BINARY;
    $log = rtrim($rootDir, '/') . '/mom/data/php_error.log';
    $started = 0;
    $exitCodes = [];
    $waves = 0;

    do {
        $foregroundProcesses = [];
        $waveStarted = 0;
        foreach (listQueuedJobs($rootDir, $count) as $jobPath) {
            if ($waitForWorkers) {
                $command = [$php, $worker, $jobPath];
                if ($fpmEnvPath !== '') {
                    $command[] = '--fpm-env=' . $fpmEnvPath;
                }
                $process = @proc_open($command, [
                    0 => ['file', '/dev/null', 'r'],
                    1 => ['file', $log, 'a'],
                    2 => ['file', $log, 'a'],
                ], $pipes, $rootDir);
                if (!is_resource($process)) {
                    continue;
                }
                foreach ($pipes as $pipe) {
                    if (is_resource($pipe)) {
                        fclose($pipe);
                    }
                }
                $foregroundProcesses[] = $process;
                $started++;
                $waveStarted++;
                continue;
            }

            $command = sprintf(
                'cd %s && nohup %s %s %s%s >> %s 2>&1 < /dev/null &',
                escapeshellarg($rootDir),
                escapeshellarg($php),
                escapeshellarg($worker),
                escapeshellarg($jobPath),
                $fpmEnvPath !== '' ? ' --fpm-env=' . escapeshellarg($fpmEnvPath) : '',
                escapeshellarg($log)
            );
            $process = @proc_open(['/bin/sh', '-lc', $command], [
                0 => ['pipe', 'r'],
                1 => ['pipe', 'w'],
                2 => ['pipe', 'w'],
            ], $pipes, $rootDir);
            if (!is_resource($process)) {
                continue;
            }
            foreach ($pipes as $pipe) {
                if (is_resource($pipe)) {
                    fclose($pipe);
                }
            }
            @proc_close($process);
            $started++;
            $waveStarted++;
        }

        foreach ($foregroundProcesses as $process) {
            $exit = @proc_close($process);
            $exitCodes[] = is_int($exit) ? $exit : null;
        }

        $waves++;
        if (!$waitForWorkers || $waveStarted === 0 || $waves >= 1000) {
            break;
        }
    } while (countQueuedJobs($rootDir) > 0);

    return ['started' => $started, 'exit_codes' => $exitCodes];
}
