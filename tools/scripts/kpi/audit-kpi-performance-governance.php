<?php

declare(strict_types=1);

/**
 * Audit whether KPI-bearing HTML documents also define people-governance logic:
 * evaluation/review, recognition/reward, discipline/corrective consequence, and action ownership.
 *
 * Usage:
 *   php tools/scripts/kpi/audit-kpi-performance-governance.php
 *   php tools/scripts/kpi/audit-kpi-performance-governance.php --output _reports/kpi/report-kpi-performance-governance-2026-04-18.json
 */

$repoRoot = dirname(__DIR__, 3);
$docsRoot = $repoRoot . '/mom/docs';
$registryPath = $repoRoot . '/mom/data/registry/kpi-authority-registry.json';
$outputPath = null;

foreach ($argv as $index => $arg) {
    if (str_starts_with($arg, '--output=')) {
        $outputPath = substr($arg, 9);
    } elseif ($arg === '--output' && isset($argv[$index + 1])) {
        $outputPath = (string) $argv[$index + 1];
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

$knownCodes = knownMetricCodes($registry);
$files = htmlFiles($docsRoot);
$fileRows = [];
$rowFindings = [];
$bucketStats = [];

foreach ($files as $file) {
    $html = (string) file_get_contents($file);
    $relativePath = normalizePath(substr($file, strlen($repoRoot) + 1));
    $text = visibleText($html);
    $signals = governanceSignals($text);
    $kpiIds = kpiIds($text);
    $metricCodes = metricCodes($text, $knownCodes);
    $kpiOccurrences = preg_match_all('/\bKPI\b/iu', $text, $unused);
    $kpiOccurrences = is_int($kpiOccurrences) ? $kpiOccurrences : 0;
    $hasKpi = $kpiOccurrences > 0 || $kpiIds !== [] || $metricCodes !== [];

    $bucket = classifyBucket($relativePath);
    $bucketStats[$bucket] ??= [
        'html_files' => 0,
        'files_with_kpi' => 0,
        'kpi_files_missing_evaluation' => 0,
        'kpi_files_missing_recognition' => 0,
        'kpi_files_missing_discipline_or_corrective' => 0,
        'kpi_files_missing_all_people_governance' => 0,
        'kpi_rows_without_people_governance' => 0,
    ];
    $bucketStats[$bucket]['html_files']++;

    if ($hasKpi) {
        $bucketStats[$bucket]['files_with_kpi']++;
        if (!$signals['has_evaluation']) {
            $bucketStats[$bucket]['kpi_files_missing_evaluation']++;
        }
        if (!$signals['has_recognition']) {
            $bucketStats[$bucket]['kpi_files_missing_recognition']++;
        }
        if (!$signals['has_discipline_or_corrective']) {
            $bucketStats[$bucket]['kpi_files_missing_discipline_or_corrective']++;
        }
        if (!$signals['has_people_governance']) {
            $bucketStats[$bucket]['kpi_files_missing_all_people_governance']++;
        }
    }

    $docRowFindings = kpiTableRowsWithoutPeopleGovernance($html, $relativePath, $knownCodes);
    $bucketStats[$bucket]['kpi_rows_without_people_governance'] += count($docRowFindings);
    array_push($rowFindings, ...$docRowFindings);

    $fileRows[] = [
        'path' => $relativePath,
        'bucket' => $bucket,
        'title' => extractTitle($html),
        'has_kpi' => $hasKpi,
        'kpi_occurrences' => $kpiOccurrences,
        'coded_kpi_ids' => $kpiIds,
        'canonical_metric_codes' => $metricCodes,
        'governance_signals' => $signals,
    ];
}

ksort($bucketStats);

$kpiFiles = array_values(array_filter($fileRows, static fn(array $row): bool => $row['has_kpi'] === true));
$missingEvaluation = array_values(array_filter($kpiFiles, static fn(array $row): bool => $row['governance_signals']['has_evaluation'] === false));
$missingRecognition = array_values(array_filter($kpiFiles, static fn(array $row): bool => $row['governance_signals']['has_recognition'] === false));
$missingDiscipline = array_values(array_filter($kpiFiles, static fn(array $row): bool => $row['governance_signals']['has_discipline_or_corrective'] === false));
$missingAllPeopleGovernance = array_values(array_filter($kpiFiles, static fn(array $row): bool => $row['governance_signals']['has_people_governance'] === false));

usort($rowFindings, static function (array $a, array $b): int {
    return [$a['bucket'], $a['path'], $a['row_index']] <=> [$b['bucket'], $b['path'], $b['row_index']];
});

$report = [
    'generated_at' => gmdate('c'),
    'scanned_root' => 'mom/docs',
    'registry_id' => $registry['registry_id'] ?? null,
    'registry_version' => $registry['version'] ?? null,
    'method' => [
        'kpi_detection' => 'HTML file is in scope when it contains KPI, KPI-* local IDs, or known canonical/alias metric code from kpi-authority-registry. Ambiguous aliases such as SETUP require nearby KPI/metric/target context.',
        'people_governance_detection' => 'Evaluation/review, recognition/reward, discipline/corrective consequence, and action ownership terms are detected in visible text.',
        'interpretation_limit' => 'This is a control audit: absence in the same document means the document relies on central policy or should rename KPI to metric/control indicator.',
    ],
    'summary' => [
        'html_file_count' => count($files),
        'files_with_kpi' => count($kpiFiles),
        'kpi_files_missing_evaluation_terms' => count($missingEvaluation),
        'kpi_files_missing_recognition_terms' => count($missingRecognition),
        'kpi_files_missing_discipline_or_corrective_terms' => count($missingDiscipline),
        'kpi_files_missing_all_people_governance_terms' => count($missingAllPeopleGovernance),
        'kpi_table_rows_without_people_governance_terms' => count($rowFindings),
    ],
    'bucket_stats' => $bucketStats,
    'highest_risk_documents' => array_slice(array_values(array_map(static fn(array $row): array => [
        'path' => $row['path'],
        'bucket' => $row['bucket'],
        'title' => $row['title'],
        'coded_kpi_ids' => $row['coded_kpi_ids'],
        'canonical_metric_codes' => $row['canonical_metric_codes'],
        'missing' => missingGovernanceLabels($row['governance_signals']),
    ], $missingAllPeopleGovernance)), 0, 80),
    'row_findings_sample' => array_slice($rowFindings, 0, 150),
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
        if (strtolower($fileInfo->getExtension()) === 'html') {
            $files[] = $fileInfo->getPathname();
        }
    }
    sort($files);
    return $files;
}

/**
 * @param array<string, mixed> $registry
 * @return list<string>
 */
function knownMetricCodes(array $registry): array
{
    $codes = [];
    foreach (['runtime_calculated_metrics', 'executive_scorecard'] as $key) {
        foreach (($registry[$key] ?? []) as $value) {
            if (is_string($value) && trim($value) !== '') {
                $codes[] = strtoupper(trim($value));
            }
        }
    }
    foreach (($registry['legacy_aliases'] ?? []) as $alias => $canonical) {
        if (is_string($alias) && trim($alias) !== '') {
            $codes[] = strtoupper(trim($alias));
        }
        if (is_string($canonical) && trim($canonical) !== '') {
            $codes[] = strtoupper(trim($canonical));
        }
    }
    foreach (['annex122_governance_kpis', 'proposed_operating_metrics', 'dashboard_core_kpis', 'gate_control_metrics'] as $key) {
        foreach (($registry[$key] ?? []) as $row) {
            if (is_array($row) && isset($row['canonical_code']) && is_string($row['canonical_code'])) {
                $codes[] = strtoupper(trim($row['canonical_code']));
            }
        }
    }
    $codes = array_values(array_unique(array_filter($codes)));
    usort($codes, static fn(string $a, string $b): int => strlen($b) <=> strlen($a));
    return $codes;
}

function visibleText(string $html): string
{
    $html = preg_replace('/<script\b[^>]*>.*?<\/script>/isu', ' ', $html) ?? $html;
    $html = preg_replace('/<style\b[^>]*>.*?<\/style>/isu', ' ', $html) ?? $html;
    return preg_replace('/\s+/u', ' ', html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8')) ?? '';
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

/**
 * @return list<string>
 */
function kpiIds(string $text): array
{
    preg_match_all('/\bKPI-[A-Z0-9]+(?:-[A-Z0-9]+)*\b/u', strtoupper($text), $matches);
    $ids = array_values(array_unique($matches[0] ?? []));
    sort($ids);
    return $ids;
}

/**
 * @param list<string> $knownCodes
 * @return list<string>
 */
function metricCodes(string $text, array $knownCodes): array
{
    $upperText = strtoupper($text);
    $codes = [];
    $ambiguousCodes = ['SETUP'];
    foreach ($knownCodes as $code) {
        if ($code === '') {
            continue;
        }
        if (in_array($code, $ambiguousCodes, true) && !hasAmbiguousMetricContext($upperText, $code)) {
            continue;
        }
        $pattern = '/(?<![A-Z0-9_])' . preg_quote($code, '/') . '(?![A-Z0-9_])/u';
        if (preg_match($pattern, $upperText) === 1) {
            $codes[] = $code;
        }
    }
    $codes = array_values(array_unique($codes));
    sort($codes);
    return $codes;
}

function hasAmbiguousMetricContext(string $upperText, string $code): bool
{
    $offset = 0;
    while (($position = strpos($upperText, $code, $offset)) !== false) {
        $start = max(0, $position - 90);
        $window = substr($upperText, $start, strlen($code) + 180);
        if (preg_match('/\b(KPI|METRIC|MEASURE|TARGET|SCORECARD|DASHBOARD|RATIO|OEE|FPY|OTD)\b|CHỈ SỐ|MỤC TIÊU|TỶ LỆ|NGƯỠNG/u', $window) === 1) {
            return true;
        }
        $offset = $position + strlen($code);
    }

    return false;
}

/**
 * @return array<string, bool|int>
 */
function governanceSignals(string $text): array
{
    $evaluation = countTerms($text, [
        'đánh giá', 'danh gia', 'review', 'xem xét', 'xem xet', 'appraisal', 'performance review',
        'rating', 'xếp loại', 'xep loai', 'chấm điểm', 'cham diem', 'score', 'management review',
    ]);
    $recognition = countTerms($text, [
        'khen thưởng', 'khen thuong', 'thưởng', 'thuong', 'ghi nhận', 'ghi nhan', 'recognition',
        'reward', 'bonus', 'incentive', 'merit', 'promotion', 'thăng chức', 'thang chuc',
    ]);
    $discipline = countTerms($text, [
        'kỷ luật', 'ky luat', 'discipline', 'vi phạm', 'vi pham', 'cảnh cáo', 'canh cao',
        'đào tạo lại', 'dao tao lai', 'không công nhận', 'khong cong nhan', 'thu hồi chứng nhận',
        'thu hoi chung nhan', 'corrective action', 'CAPA', 'NCR', 'escalation', 'hold', 'block',
        'khắc phục', 'khac phuc', 'hành động khắc phục', 'hanh dong khac phuc',
    ]);
    $actionOwnership = countTerms($text, [
        'owner', 'người chịu trách nhiệm', 'nguoi chiu trach nhiem', 'chủ trì', 'chu tri',
        'hành động', 'hanh dong', 'action', 'due date', 'ngày đến hạn', 'ngay den han',
        'reaction rule', 'phản ứng', 'phan ung', 'escalation',
    ]);

    return [
        'evaluation_terms' => $evaluation,
        'recognition_terms' => $recognition,
        'discipline_or_corrective_terms' => $discipline,
        'action_ownership_terms' => $actionOwnership,
        'has_evaluation' => $evaluation > 0,
        'has_recognition' => $recognition > 0,
        'has_discipline_or_corrective' => $discipline > 0,
        'has_action_ownership' => $actionOwnership > 0,
        'has_people_governance' => ($evaluation + $recognition + $discipline + $actionOwnership) > 0,
    ];
}

/**
 * @param list<string> $terms
 */
function countTerms(string $text, array $terms): int
{
    $count = 0;
    foreach ($terms as $term) {
        $pattern = '/(?<![\p{L}\p{N}_])' . preg_quote($term, '/') . '(?![\p{L}\p{N}_])/iu';
        $matches = preg_match_all($pattern, $text);
        $count += is_int($matches) ? $matches : 0;
    }
    return $count;
}

/**
 * @param list<string> $knownCodes
 * @return list<array<string, mixed>>
 */
function kpiTableRowsWithoutPeopleGovernance(string $html, string $relativePath, array $knownCodes): array
{
    if (preg_match_all('/<tr\b[^>]*>.*?<\/tr>/isu', $html, $matches) === false) {
        return [];
    }

    $findings = [];
    foreach (($matches[0] ?? []) as $index => $rowHtml) {
        $rowText = visibleText($rowHtml);
        $hasKpi = preg_match('/\bKPI\b/iu', $rowText) === 1 || kpiIds($rowText) !== [] || metricCodes($rowText, $knownCodes) !== [];
        $hasTarget = preg_match('/(?:≥|<=|≤|>=|=|>|<)\s*\d|\d+\s*%|\btarget\b|\bchỉ tiêu\b/iu', $rowText) === 1;
        if (!$hasKpi || !$hasTarget) {
            continue;
        }

        $signals = governanceSignals($rowText);
        if ($signals['has_people_governance']) {
            continue;
        }

        $findings[] = [
            'path' => $relativePath,
            'bucket' => classifyBucket($relativePath),
            'row_index' => $index + 1,
            'coded_kpi_ids' => kpiIds($rowText),
            'canonical_metric_codes' => metricCodes($rowText, $knownCodes),
            'snippet' => mb_substr($rowText, 0, 320),
            'recommendation' => 'Rename to control metric unless a central KPI performance-governance rule maps this row to evaluation, recognition, and corrective-action use.',
        ];
    }

    return $findings;
}

/**
 * @return list<string>
 */
function missingGovernanceLabels(array $signals): array
{
    $missing = [];
    if ($signals['has_evaluation'] === false) {
        $missing[] = 'evaluation';
    }
    if ($signals['has_recognition'] === false) {
        $missing[] = 'recognition_reward';
    }
    if ($signals['has_discipline_or_corrective'] === false) {
        $missing[] = 'discipline_corrective';
    }
    if ($signals['has_action_ownership'] === false) {
        $missing[] = 'action_owner';
    }
    return $missing;
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

function normalizePath(string $path): string
{
    return str_replace('\\', '/', $path);
}
