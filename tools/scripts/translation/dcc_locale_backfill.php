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
    'only-missing-job',
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
$limit = isset($options['limit']) && ctype_digit((string)$options['limit'])
    ? max(1, (int)$options['limit'])
    : 0;
$fpmEnvPath = trim((string)($options['fpm-env'] ?? ''));
if ($fpmEnvPath !== '') {
    loadFpmEnv($fpmEnvPath);
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
        if (!$force && variantArtifactReady($rootDir, $rawVariant)) {
            $stats['skipped_ready']++;
            $results[] = ['doc_code' => $docCode, 'status' => 'skipped_ready'];
            continue;
        }

        $normalizedSource = trim(str_replace("\r\n", "\n", strip_base_href_archive($sourceHtml)));
        $sourceHash = strtolower(hash('sha256', $normalizedSource));
        $jobPath = queuedTranslationJobPath($rootDir, $docCode, 'en', $sourceHash);
        if ($onlyMissingJob && is_file($jobPath)) {
            $stats['skipped_job_exists']++;
            $results[] = ['doc_code' => $docCode, 'status' => 'skipped_job_exists'];
            continue;
        }

        if ($dryRun) {
            $stats['queued']++;
            $results[] = ['doc_code' => $docCode, 'status' => 'would_queue', 'path' => $sourceRelPath];
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
            ]);
            $stats['queued']++;
            $results[] = [
                'doc_code' => $docCode,
                'status' => !empty($out['queued']) ? 'queued' : 'restored_or_noop',
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

echo json_encode([
    'ok' => $stats['errors'] === 0,
    'dry_run' => $dryRun,
    'force' => $force,
    'only_missing_job' => $onlyMissingJob,
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
        "SELECT artifact_rel_path, translation_state
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
 */
function variantArtifactReady(string $rootDir, array $variant): bool
{
    $state = strtolower(trim((string)($variant['translation_state'] ?? '')));
    if (!in_array($state, ['machine_preview', 'review_pending', 'reviewed', 'released'], true)) {
        return false;
    }
    $artifactRelPath = normalizeRepoRelativePath((string)($variant['artifact_rel_path'] ?? ''));
    return $artifactRelPath !== '' && is_file($rootDir . '/' . $artifactRelPath);
}

function queuedTranslationJobPath(string $rootDir, string $docCode, string $locale, string $sourceHash): string
{
    $safeCode = preg_replace('/[^A-Z0-9._-]+/i', '-', DocumentControlService::canonicalizeCode($docCode)) ?? 'DOC';
    $safeLocale = preg_replace('/[^a-z0-9_-]+/i', '', strtolower($locale)) ?? 'en';
    $safeHash = preg_replace('/[^a-f0-9]+/i', '', strtolower($sourceHash)) ?? '';
    return rtrim($rootDir, '/') . '/mom/data/cache/dcc-locale-jobs/' . $safeLocale . '/' . $safeCode . '/' . $safeHash . '.json';
}
