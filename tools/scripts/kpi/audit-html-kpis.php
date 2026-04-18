<?php

declare(strict_types=1);

/**
 * Audit KPI references across app-served HTML documents.
 *
 * Usage:
 *   php tools/scripts/kpi/audit-html-kpis.php
 *   php tools/scripts/kpi/audit-html-kpis.php --output _reports/kpi/report-kpi-html-audit-2026-04-18.json
 */

$repoRoot = dirname(__DIR__, 3);
$docsRoot = $repoRoot . '/mom/docs';
$registryPath = $repoRoot . '/mom/data/registry/kpi-authority-registry.json';
$outputPath = null;

foreach ($argv as $arg) {
    if (str_starts_with($arg, '--output=')) {
        $outputPath = substr($arg, 9);
    } elseif ($arg === '--output') {
        $nextIndex = array_search($arg, $argv, true);
        if (is_int($nextIndex) && isset($argv[$nextIndex + 1])) {
            $outputPath = (string) $argv[$nextIndex + 1];
        }
    }
}

if (!is_dir($docsRoot)) {
    fwrite(STDERR, "Missing docs root: {$docsRoot}\n");
    exit(1);
}

$registry = [];
if (is_file($registryPath)) {
    $decoded = json_decode((string) file_get_contents($registryPath), true);
    if (is_array($decoded)) {
        $registry = $decoded;
    }
}

$runtimeMetrics = array_values(array_filter(
    $registry['runtime_calculated_metrics'] ?? [],
    static fn(mixed $value): bool => is_string($value) && $value !== '',
));
$legacyAliases = array_keys(array_filter(
    $registry['legacy_aliases'] ?? [],
    static fn(mixed $value): bool => is_string($value) && $value !== '',
));
$governanceMetrics = array_values(array_filter(array_map(
    static fn(mixed $row): ?string => is_array($row) && isset($row['canonical_code']) ? (string) $row['canonical_code'] : null,
    $registry['annex122_governance_kpis'] ?? [],
)));
$operatingMetrics = array_values(array_filter(array_map(
    static fn(mixed $row): ?string => is_array($row) && isset($row['canonical_code']) ? (string) $row['canonical_code'] : null,
    $registry['proposed_operating_metrics'] ?? [],
)));
$executiveMetrics = array_values(array_filter(
    $registry['executive_scorecard'] ?? [],
    static fn(mixed $value): bool => is_string($value) && $value !== '',
));

$knownMetricCodes = array_values(array_unique(array_merge(
    $runtimeMetrics,
    $legacyAliases,
    $governanceMetrics,
    $operatingMetrics,
    $executiveMetrics,
)));
usort($knownMetricCodes, static fn(string $a, string $b): int => strlen($b) <=> strlen($a));

$files = htmlFiles($docsRoot);
$fileRows = [];
$totalKpiOccurrences = 0;
$codedKpiIds = [];
$officialCodedKpiIds = [];
$canonicalCodesSeen = [];
$aliasCodesSeen = [];
$bucketStats = [];

foreach ($files as $file) {
    $html = (string) file_get_contents($file);
    $relativePath = normalizePath(substr($file, strlen($repoRoot) + 1));
    $plainText = visibleText($html);
    $kpiOccurrences = preg_match_all('/\bKPI\b/iu', $plainText, $unused);
    $kpiOccurrences = is_int($kpiOccurrences) ? $kpiOccurrences : 0;
    $totalKpiOccurrences += $kpiOccurrences;

    preg_match_all('/\bKPI-[A-Z0-9]+(?:-[A-Z0-9]+)*\b/u', strtoupper($plainText), $kpiMatches);
    $fileKpiIds = array_values(array_unique($kpiMatches[0] ?? []));
    sort($fileKpiIds);
    foreach ($fileKpiIds as $id) {
        $codedKpiIds[$id] = true;
        if (isLikelyOperationalKpiId($id)) {
            $officialCodedKpiIds[$id] = true;
        }
    }

    $codesInFile = [];
    $aliasesInFile = [];
    $upperText = strtoupper($plainText);
    foreach ($knownMetricCodes as $code) {
        $normalized = strtoupper($code);
        if ($normalized === '') {
            continue;
        }
        $pattern = '/(?<![A-Z0-9_])' . preg_quote($normalized, '/') . '(?![A-Z0-9_])/u';
        if (preg_match($pattern, $upperText) === 1) {
            if (in_array($normalized, $legacyAliases, true)) {
                $aliasesInFile[] = $normalized;
            } else {
                $codesInFile[] = $normalized;
            }
        }
    }

    $codesInFile = array_values(array_unique($codesInFile));
    $aliasesInFile = array_values(array_unique($aliasesInFile));
    sort($codesInFile);
    sort($aliasesInFile);
    foreach ($codesInFile as $code) {
        $canonicalCodesSeen[$code] = true;
    }
    foreach ($aliasesInFile as $code) {
        $aliasCodesSeen[$code] = true;
    }

    $rowCandidates = countTableRowsContainingKpi($html);
    $bucket = classifyBucket($relativePath);
    $bucketStats[$bucket] ??= [
        'html_files' => 0,
        'files_with_kpi' => 0,
        'kpi_occurrences' => 0,
        'kpi_row_candidates' => 0,
        'coded_kpi_ids' => [],
        'canonical_metric_codes' => [],
        'legacy_alias_codes' => [],
    ];
    $bucketStats[$bucket]['html_files']++;
    $bucketStats[$bucket]['kpi_occurrences'] += $kpiOccurrences;
    $bucketStats[$bucket]['kpi_row_candidates'] += $rowCandidates;
    if ($kpiOccurrences > 0 || $fileKpiIds !== [] || $codesInFile !== [] || $aliasesInFile !== []) {
        $bucketStats[$bucket]['files_with_kpi']++;
    }
    foreach ($fileKpiIds as $id) {
        $bucketStats[$bucket]['coded_kpi_ids'][$id] = true;
        if (isLikelyOperationalKpiId($id)) {
            $bucketStats[$bucket]['official_coded_kpi_ids'][$id] = true;
        }
    }
    foreach ($codesInFile as $code) {
        $bucketStats[$bucket]['canonical_metric_codes'][$code] = true;
    }
    foreach ($aliasesInFile as $code) {
        $bucketStats[$bucket]['legacy_alias_codes'][$code] = true;
    }

    $fileRows[] = [
        'path' => $relativePath,
        'bucket' => $bucket,
        'title' => extractTitle($html),
        'kpi_occurrences' => $kpiOccurrences,
        'kpi_row_candidates' => $rowCandidates,
        'coded_kpi_ids' => $fileKpiIds,
        'canonical_metric_codes' => $codesInFile,
        'legacy_alias_codes' => $aliasesInFile,
    ];
}

foreach ($bucketStats as &$bucketRow) {
    $bucketRow['coded_kpi_ids'] = sortedKeys($bucketRow['coded_kpi_ids']);
    $bucketRow['official_coded_kpi_ids'] = sortedKeys($bucketRow['official_coded_kpi_ids'] ?? []);
    $bucketRow['canonical_metric_codes'] = sortedKeys($bucketRow['canonical_metric_codes']);
    $bucketRow['legacy_alias_codes'] = sortedKeys($bucketRow['legacy_alias_codes']);
}
unset($bucketRow);
ksort($bucketStats);

$filesWithKpi = array_values(array_filter(
    $fileRows,
    static fn(array $row): bool => $row['kpi_occurrences'] > 0
        || $row['coded_kpi_ids'] !== []
        || $row['canonical_metric_codes'] !== []
        || $row['legacy_alias_codes'] !== [],
));

usort($fileRows, static function (array $a, array $b): int {
    return [$b['kpi_occurrences'], $b['kpi_row_candidates'], $a['path']]
        <=> [$a['kpi_occurrences'], $a['kpi_row_candidates'], $b['path']];
});

$codedKpiIds = sortedKeys($codedKpiIds);
$officialCodedKpiIds = sortedKeys($officialCodedKpiIds);
$canonicalCodesSeen = sortedKeys($canonicalCodesSeen);
$aliasCodesSeen = sortedKeys($aliasCodesSeen);

$report = [
    'generated_at' => gmdate('c'),
    'scanned_root' => 'mom/docs',
    'registry_id' => $registry['registry_id'] ?? null,
    'registry_version' => $registry['version'] ?? null,
    'summary' => [
        'html_file_count' => count($files),
        'files_with_kpi' => count($filesWithKpi),
        'kpi_occurrences' => $totalKpiOccurrences,
        'unique_coded_kpi_ids' => count($codedKpiIds),
        'unique_likely_operational_kpi_ids' => count($officialCodedKpiIds),
        'unique_canonical_metric_codes_seen' => count($canonicalCodesSeen),
        'unique_legacy_alias_codes_seen' => count($aliasCodesSeen),
        'kpi_row_candidates' => array_sum(array_column($fileRows, 'kpi_row_candidates')),
    ],
    'registry_counts' => [
        'runtime_calculated_metrics' => count($runtimeMetrics),
        'legacy_aliases' => count($legacyAliases),
        'executive_scorecard' => count($executiveMetrics),
        'annex122_governance_kpis' => count($governanceMetrics),
        'proposed_operating_metrics' => count($operatingMetrics),
        'unique_known_metric_codes' => count($knownMetricCodes),
    ],
    'backend_observation' => [
        'runtime_metrics_have_calculators' => count($runtimeMetrics),
        'non_runtime_metrics_need_data_contract_before_calculation' => count(array_unique(array_merge(
            $governanceMetrics,
            $operatingMetrics,
            $executiveMetrics,
        ))) - count(array_intersect($runtimeMetrics, array_unique(array_merge(
            $governanceMetrics,
            $operatingMetrics,
            $executiveMetrics,
        )))),
    ],
    'coded_kpi_ids' => $codedKpiIds,
    'likely_operational_kpi_ids' => $officialCodedKpiIds,
    'canonical_metric_codes_seen' => $canonicalCodesSeen,
    'legacy_alias_codes_seen' => $aliasCodesSeen,
    'bucket_stats' => $bucketStats,
    'top_files' => array_slice($fileRows, 0, 80),
    'files' => $fileRows,
];

$json = json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
if (!is_string($json)) {
    fwrite(STDERR, "Failed to encode report.\n");
    exit(1);
}

if ($outputPath !== null && $outputPath !== '') {
    $absoluteOutput = str_starts_with($outputPath, '/') ? $outputPath : $repoRoot . '/' . $outputPath;
    $outputDir = dirname($absoluteOutput);
    if (!is_dir($outputDir) && !mkdir($outputDir, 0775, true) && !is_dir($outputDir)) {
        fwrite(STDERR, "Unable to create output directory: {$outputDir}\n");
        exit(1);
    }
    file_put_contents($absoluteOutput, $json . "\n");
    fwrite(STDOUT, "Wrote {$outputPath}\n");
    exit(0);
}

fwrite(STDOUT, $json . "\n");

/**
 * @return list<string>
 */
function htmlFiles(string $root): array
{
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS),
    );
    $files = [];
    foreach ($iterator as $fileInfo) {
        if (!$fileInfo instanceof SplFileInfo || !$fileInfo->isFile()) {
            continue;
        }
        if (strtolower($fileInfo->getExtension()) !== 'html') {
            continue;
        }
        $files[] = $fileInfo->getPathname();
    }
    sort($files);
    return $files;
}

function extractTitle(string $html): string
{
    if (preg_match('/<strong[^>]*class="[^"]*\bdoc-name\b[^"]*"[^>]*>(.*?)<\/strong>/isu', $html, $matches) === 1) {
        return trim(html_entity_decode(strip_tags($matches[1]), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
    }
    if (preg_match('/<title[^>]*>(.*?)<\/title>/isu', $html, $matches) === 1) {
        return trim(html_entity_decode(strip_tags($matches[1]), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
    }
    return '';
}

function visibleText(string $html): string
{
    $html = preg_replace('/<script\b[^>]*>.*?<\/script>/isu', ' ', $html) ?? $html;
    $html = preg_replace('/<style\b[^>]*>.*?<\/style>/isu', ' ', $html) ?? $html;
    return html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8');
}

function countTableRowsContainingKpi(string $html): int
{
    if (preg_match_all('/<tr\b[^>]*>.*?<\/tr>/isu', $html, $matches) !== false) {
        $count = 0;
        foreach ($matches[0] ?? [] as $rowHtml) {
            $rowText = visibleText($rowHtml);
            if (preg_match('/\bKPI\b|OEE|OTD|FPY|DPMO|COPQ|SCRAP|CAPA|NCR|MTBF|MTTR/iu', $rowText) === 1) {
                $count++;
            }
        }
        return $count;
    }
    return 0;
}

function classifyBucket(string $path): string
{
    return match (true) {
        str_contains($path, '/03-Job-Descriptions/') => 'job_descriptions',
        str_contains($path, '/02-Department-Handbooks/') => 'department_handbooks',
        str_contains($path, '/04-RACI-Authority/') => 'raci_authority',
        str_contains($path, '/operations/references/') => 'annex_references',
        str_contains($path, '/operations/sops/') => 'sops',
        str_contains($path, '/operations/work-instructions/') => 'work_instructions',
        str_contains($path, '/training/') => 'training',
        str_contains($path, '/forms/') => 'forms',
        str_contains($path, '/system/') => 'system',
        str_contains($path, '/glossary/') => 'glossary',
        default => 'other',
    };
}

function isLikelyOperationalKpiId(string $id): bool
{
    if (in_array($id, [
        'KPI-BAD',
        'KPI-BOX',
        'KPI-CARD',
        'KPI-CONTROL',
        'KPI-GOOD',
        'KPI-GRID',
        'KPI-WARN',
        'KPI-WATCH',
        'KPI-AND-DASHBOARD-CONTROL',
        'KPI-AUTHORITY-REGISTRY',
        'KPI-REPORTDASHBOARD',
    ], true)) {
        return false;
    }

    return preg_match('/^KPI-(?:\d{1,2}(?:[A-Z]+)?|G\d-\d{2}|ALL-\d{2}|WI\d{3}(?:-\d{2})?(?:[A-Z]+)?|DOS-\d{2}|PLAN(?:-\d{2}[A-Z]+)?|FLD(?:-\d{2})?)$/u', $id) === 1;
}

function normalizePath(string $path): string
{
    return str_replace('\\', '/', $path);
}

/**
 * @param array<string, bool> $map
 * @return list<string>
 */
function sortedKeys(array $map): array
{
    $keys = array_keys($map);
    sort($keys);
    return $keys;
}
