<?php

declare(strict_types=1);

/**
 * Build an end-to-end KPI/metric matrix across app-served HTML documents.
 *
 * Usage:
 *   php tools/scripts/kpi/audit-kpi-system-matrix.php
 *   php tools/scripts/kpi/audit-kpi-system-matrix.php \
 *     --json _reports/kpi/report-kpi-system-matrix-2026-04-19.json \
 *     --md _reports/kpi/report-kpi-system-matrix-2026-04-19.md \
 *     --annex mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-128-kpi-system-matrix-and-document-usage.html
 */

$repoRoot = dirname(__DIR__, 3);
$docsRoot = $repoRoot . '/mom/docs';
$registryPath = $repoRoot . '/mom/data/registry/kpi-authority-registry.json';

$options = parseOptions($argv);
$jsonOutput = $options['json'] ?? '_reports/kpi/report-kpi-system-matrix-2026-04-19.json';
$mdOutput = $options['md'] ?? '_reports/kpi/report-kpi-system-matrix-2026-04-19.md';
$annexOutput = $options['annex'] ?? 'mom/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control/annex-128-kpi-system-matrix-and-document-usage.html';

if (!is_dir($docsRoot)) {
    fwrite(STDERR, "Missing docs root: {$docsRoot}\n");
    exit(1);
}

$registry = readJson($registryPath);
$catalog = buildMetricCatalog($registry);
$files = htmlFiles($docsRoot);

$documentRows = [];
$metricUsage = [];
$findings = [];

foreach ($files as $file) {
    $html = (string) file_get_contents($file);
    $relativePath = normalizePath(substr($file, strlen($repoRoot) + 1));
    $title = extractTitle($html);
    $bucket = classifyBucket($relativePath);
    $text = normalizeText(visibleText($html));
    $rows = tableRows($html);
    $docHits = detectDocumentHits($text, $catalog);
    $rowHits = detectRowHits($rows, $catalog);
    $targetValuesByCode = [];
    $rowSnippetsByCode = [];

    foreach ($rowHits as $rowHit) {
        foreach ($rowHit['codes'] as $code) {
            $targetCodes = ($rowHit['primary_codes'] ?? []) !== [] ? $rowHit['primary_codes'] : $rowHit['codes'];
            if (!in_array($code, $targetCodes, true)) {
                continue;
            }
            if (!rowStartsWithMetric($rowHit['text'], $code, $catalog)) {
                continue;
            }
            foreach (extractTargetValues($rowHit['text']) as $targetValue) {
                $targetValuesByCode[$code][$targetValue] = true;
            }
            $rowSnippetsByCode[$code][] = [
                'row_index' => $rowHit['row_index'],
                'snippet' => mb_substr($rowHit['text'], 0, 320),
            ];
        }
    }

    $documentMetricRows = [];
    foreach ($docHits as $code => $hit) {
        $metric = $catalog['metrics'][$code] ?? defaultMetricDefinition($code);
        $targetValues = sortedKeys($targetValuesByCode[$code] ?? []);
        $docRow = [
            'code' => $code,
            'display_name' => $metric['display_name'] ?? $code,
            'classification' => $metric['classification'] ?? 'local_or_unmapped_metric',
            'occurrences' => $hit['occurrences'],
            'matched_terms' => sortedKeys($hit['matched_terms']),
            'target_values_seen' => $targetValues,
            'context_fit' => assessContextFit($bucket, $relativePath, $text, $metric, $targetValues),
            'row_snippets' => array_slice($rowSnippetsByCode[$code] ?? [], 0, 5),
        ];
        $documentMetricRows[] = $docRow;

        $metricDefaults = defaultMetricDefinition($code);
        $metricUsage[$code] ??= [
            'code' => $code,
            'display_name' => $metric['display_name'] ?? $metricDefaults['display_name'],
            'classification' => $metric['classification'] ?? $metricDefaults['classification'],
            'registry_sources' => $metric['registry_sources'] ?? $metricDefaults['registry_sources'],
            'aliases' => $metric['aliases'] ?? [],
            'local_ids' => $metric['local_ids'] ?? [],
            'backend_status' => $metric['backend_status'] ?? 'not_declared',
            'scorecard_weight_pct' => $metric['scorecard_weight_pct'] ?? null,
            'scorecard_target' => $metric['scorecard_target'] ?? null,
            'scorecard_unit' => $metric['scorecard_unit'] ?? null,
            'scorecard_scoring_status' => $metric['scorecard_scoring_status'] ?? null,
            'scorecard_contributes_to_reward' => $metric['scorecard_contributes_to_reward'] ?? null,
            'statistical_plan_status' => statisticalPlanStatus($metric),
            'expected_thresholds' => $metric['quantitative_thresholds'] ?? null,
            'expected_target_text' => expectedTargetText($metric),
            'total_occurrences' => 0,
            'documents_count' => 0,
            'target_values_seen' => [],
            'documents' => [],
            'finding_codes' => [],
        ];
        $metricUsage[$code]['total_occurrences'] += $hit['occurrences'];
        $metricUsage[$code]['documents_count']++;
        foreach ($targetValues as $targetValue) {
            $metricUsage[$code]['target_values_seen'][$targetValue] = true;
        }
        $metricUsage[$code]['documents'][] = [
            'path' => $relativePath,
            'title' => $title,
            'bucket' => $bucket,
            'occurrences' => $hit['occurrences'],
            'matched_terms' => sortedKeys($hit['matched_terms']),
            'target_values_seen' => $targetValues,
            'context_fit' => $docRow['context_fit'],
        ];
    }

    $docFindings = detectDocumentFindings($relativePath, $title, $bucket, $text, $rows, $documentMetricRows, $catalog);
    array_push($findings, ...$docFindings);
    foreach ($docFindings as $finding) {
        foreach (($finding['metric_codes'] ?? []) as $code) {
            if (isset($metricUsage[$code])) {
                $metricUsage[$code]['finding_codes'][$finding['finding_code']] = true;
            }
        }
    }

    if ($documentMetricRows !== [] || $docFindings !== []) {
        usort($documentMetricRows, static fn(array $a, array $b): int => [$b['occurrences'], $a['code']] <=> [$a['occurrences'], $b['code']]);
        $documentRows[] = [
            'path' => $relativePath,
            'title' => $title,
            'bucket' => $bucket,
            'metrics_count' => count($documentMetricRows),
            'total_metric_occurrences' => array_sum(array_column($documentMetricRows, 'occurrences')),
            'metrics' => $documentMetricRows,
            'findings' => $docFindings,
        ];
    }
}

foreach ($metricUsage as &$usageRow) {
    $usageRow['target_values_seen'] = sortedKeys($usageRow['target_values_seen']);
    $usageRow['finding_codes'] = sortedKeys($usageRow['finding_codes']);
    $usageRow['target_consistency'] = assessTargetConsistency($usageRow);
    $usageRow['name_consistency'] = assessNameConsistency($usageRow);
    usort($usageRow['documents'], static fn(array $a, array $b): int => [$b['occurrences'], $a['path']] <=> [$a['occurrences'], $b['path']]);
}
unset($usageRow);

usort($metricUsage, static fn(array $a, array $b): int => [$b['documents_count'], $b['total_occurrences'], $a['code']] <=> [$a['documents_count'], $a['total_occurrences'], $b['code']]);
usort($documentRows, static fn(array $a, array $b): int => [$b['total_metric_occurrences'], $a['path']] <=> [$a['total_metric_occurrences'], $b['path']]);
usort($findings, static fn(array $a, array $b): int => [$a['priority'], $a['path'], $a['finding_code']] <=> [$b['priority'], $b['path'], $b['finding_code']]);

$summary = [
    'html_file_count' => count($files),
    'documents_with_metric_usage' => count($documentRows),
    'registry_metric_count' => count(array_filter($catalog['metrics'], static fn(array $row): bool => ($row['registry_sources'] ?? []) !== [])),
    'metric_codes_seen' => count($metricUsage),
    'executive_scorecard_metrics_seen' => count(array_filter($metricUsage, static fn(array $row): bool => $row['classification'] === 'executive_scorecard_kpi' || $row['classification'] === 'safety_gate')),
    'role_measure_codes_seen' => count(array_filter($metricUsage, static fn(array $row): bool => $row['classification'] === 'role_performance_measure')),
    'findings_total' => count($findings),
    'p1_findings' => count(array_filter($findings, static fn(array $row): bool => $row['priority'] === 1)),
    'p2_findings' => count(array_filter($findings, static fn(array $row): bool => $row['priority'] === 2)),
    'p3_findings' => count(array_filter($findings, static fn(array $row): bool => $row['priority'] === 3)),
];

$report = [
    'generated_at' => gmdate('c'),
    'scanned_root' => 'mom/docs',
    'registry_id' => $registry['registry_id'] ?? null,
    'registry_version' => $registry['version'] ?? null,
    'method' => [
        'detection' => 'Registry canonical codes, legacy aliases, KPI-* local IDs, and Cxx-Mx competency role measures are detected in visible HTML text. Table rows are used to extract target/threshold snippets.',
        'interpretation' => 'The matrix separates official KPI, gate/control metric, operating metric, role performance measure, and health indicator. It flags context mismatch rather than mechanically rewriting every KPI word.',
        'benchmark_basis' => [
            'NIST Baldrige: measurement must support review, decisions, strategic objectives, improvement, and comparative analysis.',
            'ISA-95: KPI dashboards are Level 3/4 read models and must not replace MOM/MES execution truth.',
            'SAP manufacturing/OEE: OEE should be decomposed into availability, performance, and quality with production-order/resource context.',
            'SAP SuccessFactors: performance rating, calibration, and variable pay are controlled workflows, not automatic raw-KPI payout.',
        ],
    ],
    'summary' => $summary,
    'metric_usage_matrix' => array_values($metricUsage),
    'document_usage_matrix' => $documentRows,
    'findings' => $findings,
];

writeFile($repoRoot, $jsonOutput, encodeJson($report));
writeFile($repoRoot, $mdOutput, renderMarkdownReport($report));
writeFile($repoRoot, $annexOutput, renderAnnexHtml($report));

fwrite(STDOUT, "Wrote {$jsonOutput}\n");
fwrite(STDOUT, "Wrote {$mdOutput}\n");
fwrite(STDOUT, "Wrote {$annexOutput}\n");

/**
 * @return array<string, string>
 */
function parseOptions(array $argv): array
{
    $options = [];
    foreach ($argv as $index => $arg) {
        if (str_starts_with($arg, '--') && str_contains($arg, '=')) {
            [$name, $value] = explode('=', substr($arg, 2), 2);
            $options[$name] = $value;
        } elseif (in_array($arg, ['--json', '--md', '--annex'], true) && isset($argv[$index + 1])) {
            $options[substr($arg, 2)] = (string) $argv[$index + 1];
        }
    }
    return $options;
}

/**
 * @return array<string, mixed>
 */
function readJson(string $path): array
{
    $decoded = json_decode((string) file_get_contents($path), true);
    return is_array($decoded) ? $decoded : [];
}

/**
 * @param array<string, mixed> $registry
 * @return array{metrics: array<string, array<string, mixed>>, aliases: array<string, string>, local_ids: array<string, string>}
 */
function buildMetricCatalog(array $registry): array
{
    $metrics = [];
    $aliases = [];
    $localIds = [];

    $addMetric = static function (string $code, array $data) use (&$metrics): void {
        $code = strtoupper(trim($code));
        if ($code === '') {
            return;
        }
        $existing = $metrics[$code] ?? [
            'canonical_code' => $code,
            'display_name' => $code,
            'classification' => 'local_or_unmapped_metric',
            'registry_sources' => [],
            'aliases' => [],
            'local_ids' => [],
        ];
        foreach ($data as $key => $value) {
            if ($key === 'registry_sources' || $key === 'aliases' || $key === 'local_ids') {
                $existing[$key] = array_values(array_unique(array_merge($existing[$key] ?? [], is_array($value) ? $value : [$value])));
                continue;
            }
            if ($value !== null && $value !== '' && $value !== []) {
                $existing[$key] = $value;
            }
        }
        $metrics[$code] = $existing;
    };

    foreach (($registry['runtime_calculated_metrics'] ?? []) as $code) {
        if (is_string($code)) {
            $addMetric($code, [
                'backend_status' => 'runtime_calculated',
                'registry_sources' => ['runtime_calculated_metrics'],
            ]);
        }
    }

    foreach (($registry['legacy_aliases'] ?? []) as $alias => $canonical) {
        if (!is_string($alias) || !is_string($canonical)) {
            continue;
        }
        $alias = strtoupper(trim($alias));
        $canonical = strtoupper(trim($canonical));
        $aliases[$alias] = $canonical;
        $addMetric($canonical, [
            'aliases' => [$alias],
            'registry_sources' => ['legacy_aliases'],
        ]);
    }

    foreach (($registry['annex122_governance_kpis'] ?? []) as $row) {
        if (is_array($row) && isset($row['canonical_code'])) {
            $addMetric((string) $row['canonical_code'], [
                'display_name' => (string) ($row['name'] ?? $row['canonical_code']),
                'classification' => 'governance_kpi',
                'tier' => $row['tier'] ?? null,
                'registry_sources' => ['annex122_governance_kpis'],
            ]);
        }
    }

    foreach (($registry['dashboard_core_kpis'] ?? []) as $row) {
        if (is_array($row) && isset($row['canonical_code'])) {
            $code = strtoupper((string) $row['canonical_code']);
            $localId = isset($row['local_id']) ? strtoupper((string) $row['local_id']) : null;
            if ($localId) {
                $localIds[$localId] = $code;
            }
            $addMetric($code, [
                'display_name' => (string) ($row['name'] ?? $code),
                'backend_status' => $row['backend_status'] ?? null,
                'primary_endpoint' => $row['primary_endpoint'] ?? null,
                'local_ids' => $localId ? [$localId] : [],
                'registry_sources' => ['dashboard_core_kpis'],
            ]);
        }
    }

    foreach (($registry['gate_control_metrics'] ?? []) as $row) {
        if (is_array($row) && isset($row['canonical_code'])) {
            $code = strtoupper((string) $row['canonical_code']);
            $localId = isset($row['local_id']) ? strtoupper((string) $row['local_id']) : null;
            if ($localId) {
                $localIds[$localId] = $code;
            }
            $addMetric($code, [
                'display_name' => (string) ($row['name'] ?? $code),
                'classification' => 'gate_control_metric',
                'local_ids' => $localId ? [$localId] : [],
                'registry_sources' => ['gate_control_metrics'],
            ]);
        }
    }

    foreach (($registry['proposed_operating_metrics'] ?? []) as $row) {
        if (is_array($row) && isset($row['canonical_code'])) {
            $addMetric((string) $row['canonical_code'], [
                'display_name' => (string) ($row['name'] ?? $row['canonical_code']),
                'classification' => 'operating_metric',
                'layer' => $row['layer'] ?? null,
                'backend_status' => $row['status'] ?? null,
                'registry_sources' => ['proposed_operating_metrics'],
            ]);
        }
    }

    foreach (($registry['scorecard_operating_model']['executive_scorecard_items'] ?? []) as $row) {
        if (!is_array($row) || !isset($row['canonical_code'])) {
            continue;
        }
        $code = (string) $row['canonical_code'];
        $classification = ((float) ($row['scorecard_weight_pct'] ?? 0)) === 0.0 ? 'safety_gate' : 'executive_scorecard_kpi';
        $addMetric($code, [
            'classification' => $classification,
            'scorecard_weight_pct' => $row['scorecard_weight_pct'] ?? null,
            'scorecard_target' => $row['target'] ?? null,
            'scorecard_unit' => $row['unit'] ?? null,
            'higher_is_better' => $row['higher_is_better'] ?? null,
            'quantitative_thresholds' => $row['quantitative_thresholds'] ?? null,
            'rating_criteria' => $row['rating_criteria'] ?? null,
            'reward_rule' => $row['reward_rule'] ?? null,
            'blocking_conditions' => $row['blocking_conditions'] ?? null,
            'registry_sources' => ['scorecard_operating_model'],
        ]);
    }

    foreach (($registry['scorecard_evidence_contracts'] ?? []) as $code => $row) {
        if (!is_array($row)) {
            continue;
        }
        $addMetric((string) $code, [
            'scorecard_scoring_status' => $row['scorecard_scoring_status'] ?? null,
            'scorecard_contributes_to_reward' => $row['scorecard_contributes_to_reward'] ?? null,
            'data_contract_approval_id' => $row['data_contract_approval_id'] ?? null,
            'evidence_manifest_id' => $row['evidence_manifest_id'] ?? null,
            'source_system' => $row['source_system'] ?? null,
            'source_table_or_record' => $row['source_table_or_record'] ?? null,
            'evidence_record' => $row['evidence_record'] ?? null,
            'freshness_rule' => $row['freshness_rule'] ?? null,
            'lineage_rule' => $row['lineage_rule'] ?? null,
            'registry_sources' => ['scorecard_evidence_contracts'],
        ]);
    }

    foreach (($registry['metric_governance_overrides'] ?? []) as $code => $row) {
        if (!is_array($row)) {
            continue;
        }
        $addMetric((string) $code, [
            'metric_type' => $row['metric_type'] ?? null,
            'evaluation_use' => $row['evaluation_use'] ?? null,
            'evaluation_scope' => $row['evaluation_scope'] ?? null,
            'result_type' => $row['result_type'] ?? null,
            'strategic_intent' => $row['strategic_intent'] ?? null,
            'decision_purpose' => $row['decision_purpose'] ?? null,
            'accountable_owner' => $row['accountable_owner'] ?? null,
            'review_cadence' => $row['review_cadence'] ?? null,
            'review_forum' => $row['review_forum'] ?? null,
            'counter_metric' => $row['counter_metric'] ?? null,
            'data_confidence_level' => $row['data_confidence_level'] ?? null,
            'registry_sources' => ['metric_governance_overrides'],
        ]);
    }

    ksort($metrics);
    ksort($aliases);
    ksort($localIds);
    return ['metrics' => $metrics, 'aliases' => $aliases, 'local_ids' => $localIds];
}

/**
 * @return list<string>
 */
function htmlFiles(string $root): array
{
    $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS));
    $files = [];
    foreach ($iterator as $fileInfo) {
        if ($fileInfo instanceof SplFileInfo && $fileInfo->isFile() && strtolower($fileInfo->getExtension()) === 'html') {
            if ($fileInfo->getFilename() === 'annex-128-kpi-system-matrix-and-document-usage.html') {
                continue;
            }
            if (isGeneratedLocaleCache($fileInfo->getFilename())) {
                continue;
            }
            $files[] = $fileInfo->getPathname();
        }
    }
    sort($files);
    return $files;
}

function isGeneratedLocaleCache(string $filename): bool
{
    return preg_match('/^_.+\.en\.html$/i', $filename) === 1;
}

function extractTitle(string $html): string
{
    foreach ([
        '/<strong[^>]*class="[^"]*\bdoc-name\b[^"]*"[^>]*>(.*?)<\/strong>/isu',
        '/<h1[^>]*>(.*?)<\/h1>/isu',
        '/<title[^>]*>(.*?)<\/title>/isu',
    ] as $pattern) {
        if (preg_match($pattern, $html, $matches) === 1) {
            return normalizeText(html_entity_decode(strip_tags($matches[1]), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
        }
    }
    return '';
}

function visibleText(string $html): string
{
    $html = preg_replace('/<script\b[^>]*>.*?<\/script>/isu', ' ', $html) ?? $html;
    $html = preg_replace('/<style\b[^>]*>.*?<\/style>/isu', ' ', $html) ?? $html;
    return html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8');
}

function normalizeText(string $text): string
{
    return trim(preg_replace('/\s+/u', ' ', $text) ?? $text);
}

/**
 * @return list<array{row_index: int, html: string, text: string, cells: list<string>}>
 */
function tableRows(string $html): array
{
    if (preg_match_all('/<tr\b[^>]*>.*?<\/tr>/isu', $html, $matches) === false) {
        return [];
    }
    $rows = [];
    foreach (($matches[0] ?? []) as $index => $rowHtml) {
        $cells = [];
        if (preg_match_all('/<t[dh]\b[^>]*>.*?<\/t[dh]>/isu', $rowHtml, $cellMatches) !== false) {
            foreach (($cellMatches[0] ?? []) as $cellHtml) {
                $cells[] = normalizeText(visibleText($cellHtml));
            }
        }
        $rows[] = [
            'row_index' => $index + 1,
            'html' => $rowHtml,
            'text' => $cells !== [] ? normalizeText(implode(' ', $cells)) : normalizeText(visibleText($rowHtml)),
            'cells' => $cells,
        ];
    }
    return $rows;
}

/**
 * @param array{metrics: array<string, array<string, mixed>>, aliases: array<string, string>, local_ids: array<string, string>} $catalog
 * @return array<string, array{occurrences: int, matched_terms: array<string, bool>}>
 */
function detectDocumentHits(string $text, array $catalog): array
{
    $hits = [];
    $upper = mb_strtoupper($text);

    foreach ($catalog['metrics'] as $code => $metric) {
        foreach (metricSearchTerms($code, $metric) as $term) {
            addTermHits($hits, $code, $term, countTermOccurrences($upper, $term));
        }
    }
    foreach ($catalog['aliases'] as $alias => $canonical) {
        if (isAmbiguousLegacyAlias($alias) && !hasExplicitLegacyAliasContext($upper, $alias)) {
            continue;
        }
        addTermHits($hits, $canonical, $alias, countTermOccurrences($upper, $alias));
    }
    foreach ($catalog['local_ids'] as $localId => $canonical) {
        addTermHits($hits, $canonical, $localId, countTermOccurrences($upper, $localId));
    }

    foreach (competencyMeasureCodes($upper) as $code => $count) {
        addTermHits($hits, $code, $code, $count);
    }

    return array_filter($hits, static fn(array $row): bool => $row['occurrences'] > 0);
}

/**
 * @param array<string, mixed> $metric
 * @return list<string>
 */
function metricSearchTerms(string $code, array $metric): array
{
    $terms = [$code];
    $readable = str_replace('_', ' ', $code);
    if ($readable !== $code && strlen($readable) >= 6) {
        $terms[] = $readable;
        $terms[] = str_replace(' ', '-', $readable);
    }
    foreach ((array) ($metric['local_ids'] ?? []) as $localId) {
        if (is_string($localId) && $localId !== '') {
            $terms[] = $localId;
        }
    }
    return array_values(array_unique(array_map('mb_strtoupper', $terms)));
}

/**
 * @param array{metrics: array<string, array<string, mixed>>, aliases: array<string, string>, local_ids: array<string, string>} $catalog
 */
function rowStartsWithMetric(string $rowText, string $code, array $catalog): bool
{
    $upper = mb_strtoupper($rowText);
    $metric = $catalog['metrics'][$code] ?? defaultMetricDefinition($code);
    foreach (metricSearchTerms($code, $metric) as $term) {
        if (str_starts_with($upper, $term)) {
            return true;
        }
    }
    return false;
}

/**
 * Competency measures are local training measures, not company scorecard KPI.
 *
 * @return array<string, mixed>
 */
function defaultMetricDefinition(string $code): array
{
    $code = strtoupper($code);
    if (preg_match('/^C\d{2}-M\d+$/u', $code) === 1) {
        return [
            'canonical_code' => $code,
            'display_name' => 'Competency role measure ' . $code,
            'classification' => 'role_performance_measure',
            'registry_sources' => ['training_competency_code'],
            'backend_status' => 'training_evaluation_record',
        ];
    }
    return [
        'canonical_code' => $code,
        'display_name' => $code,
        'classification' => 'local_or_unmapped_metric',
        'registry_sources' => [],
    ];
}

/**
 * @param list<array{row_index: int, html: string, text: string, cells?: list<string>}> $rows
 * @param array{metrics: array<string, array<string, mixed>>, aliases: array<string, string>, local_ids: array<string, string>} $catalog
 * @return list<array{row_index: int, text: string, codes: list<string>, primary_codes: list<string>}>
 */
function detectRowHits(array $rows, array $catalog): array
{
    $result = [];
    foreach ($rows as $row) {
        $rowHits = detectDocumentHits($row['text'], $catalog);
        $codes = array_keys($rowHits);
        sort($codes);
        if ($codes !== []) {
            $primaryCodes = [];
            $cells = $row['cells'] ?? [];
            if (isset($cells[0]) && $cells[0] !== '') {
                $primaryHits = detectDocumentHits($cells[0], $catalog);
                $primaryCodes = array_values(array_intersect(array_keys($primaryHits), $codes));
                sort($primaryCodes);
            }
            $result[] = [
                'row_index' => $row['row_index'],
                'text' => $row['text'],
                'codes' => $codes,
                'primary_codes' => $primaryCodes,
            ];
        }
    }
    return $result;
}

/**
 * @return array<string, int>
 */
function competencyMeasureCodes(string $upperText): array
{
    preg_match_all('/\bC\d{2}-M\d+\b/u', $upperText, $matches);
    $counts = [];
    foreach (($matches[0] ?? []) as $code) {
        $counts[$code] = ($counts[$code] ?? 0) + 1;
    }
    return $counts;
}

/**
 * @param array<string, array{occurrences: int, matched_terms: array<string, bool>}> $hits
 */
function addTermHits(array &$hits, string $code, string $term, int $count): void
{
    if ($count <= 0) {
        return;
    }
    $hits[$code] ??= ['occurrences' => 0, 'matched_terms' => []];
    $hits[$code]['occurrences'] += $count;
    $hits[$code]['matched_terms'][$term] = true;
}

function countTermOccurrences(string $upperText, string $term): int
{
    $term = mb_strtoupper(trim($term));
    if ($term === '') {
        return 0;
    }
    $pattern = '/(?<![A-Z0-9_\/-])' . preg_quote($term, '/') . '(?![A-Z0-9_\/-])/u';
    $count = preg_match_all($pattern, $upperText);
    return is_int($count) ? $count : 0;
}

function hasExplicitLegacyAliasContext(string $upperText, string $code): bool
{
    $compactCode = str_replace(['_', '-'], ' ', $code);
    if ($code === 'SETUP') {
        return preg_match('/\bSETUP(?:_|\s|-)*(?:TIME(?:_|\s|-)*)?RATIO\b/u', $upperText) === 1;
    }
    if ($code === 'SCRAP') {
        return preg_match('/\bSCRAP(?:_|\s|-)*(?:RATE|PCT|PERCENT|%)\b/u', $upperText) === 1;
    }
    if ($code === 'DOWNTIME') {
        return preg_match('/\bDOWNTIME(?:_|\s|-)*(?:IMPACT|RATE|HOURS?|MINUTES?|KPI|METRIC|TARGET)\b/u', $upperText) === 1;
    }
    if ($code === 'UTIL') {
        return preg_match('/\b(?:MACHINE(?:_|\s|-)*)?UTIL(?:IZATION)?(?:_|\s|-)*(?:RATE|PERCENT|%)\b/u', $upperText) === 1;
    }
    if ($code === 'PROMISE_DATE') {
        return preg_match('/\bPROMISE(?:_|\s|-)DATE(?:_|\s|-)RISK\b/u', $upperText) === 1;
    }
    $offset = 0;
    while (($position = strpos($upperText, $code, $offset)) !== false || ($position = strpos($upperText, $compactCode, $offset)) !== false) {
        $start = max(0, $position - 90);
        $window = substr($upperText, $start, strlen($code) + 180);
        if (preg_match('/\b(KPI|METRIC|MEASURE|TARGET|SCORECARD|DASHBOARD|RATIO)\b|CHỈ SỐ|MỤC TIÊU|TỶ LỆ|NGƯỠNG/u', $window) === 1) {
            return true;
        }
        $offset = $position + strlen($code);
    }
    return false;
}

function isAmbiguousLegacyAlias(string $alias): bool
{
    return in_array($alias, ['SCRAP', 'SETUP', 'DOWNTIME', 'UTIL', 'PROMISE_DATE'], true);
}

/**
 * @return list<string>
 */
function extractTargetValues(string $text): array
{
    $patterns = [
        '/(?:target|mục tiêu|chỉ tiêu|ngưỡng)\s*(?:[:=]|là)?\s*[^.;]{0,80}/iu',
        '/(?:≥|<=|≤|>=|=|>|<)\s*\d+(?:[.,]\d+)?\s*(?:%|h|hr|hour|giờ|min|phút|s|sec|ngày|day|baseline|composite|\/100 shipments|\/100)?/iu',
        '/\b(?:green|yellow|red|xanh|vàng|đỏ)\s*(?:[:=]|is|là)?\s*(?:≥|<=|≤|>=|=|>|<)?\s*\d+(?:[.,]\d+)?\s*%?/iu',
    ];
    $values = [];
    foreach ($patterns as $pattern) {
        if (preg_match_all($pattern, $text, $matches) === false) {
            continue;
        }
        foreach (($matches[0] ?? []) as $value) {
            $value = normalizeText($value);
            if ($value !== '' && preg_match('/(?:≥|<=|≤|>=|=|>|<|\d)/u', $value) === 1) {
                $values[$value] = true;
            }
        }
    }
    return sortedKeys($values);
}

/**
 * @param array<string, mixed> $metric
 * @param list<string> $targetValues
 * @return array{status: string, reason: string}
 */
function assessContextFit(string $bucket, string $path, string $text, array $metric, array $targetValues): array
{
    $classification = (string) ($metric['classification'] ?? 'local_or_unmapped_metric');
    $hasMandatoryKpiLabel = preg_match('/KPI\s+bắt buộc|KPI\s+bat buoc/iu', $text) === 1;

    if ($hasMandatoryKpiLabel && !in_array($classification, ['executive_scorecard_kpi', 'governance_kpi'], true)) {
        return ['status' => 'review', 'reason' => 'Document uses mandatory KPI label for a metric that should be control/operating/role measure.'];
    }
    if ($bucket === 'training' && $hasMandatoryKpiLabel && in_array($classification, ['executive_scorecard_kpi', 'governance_kpi'], true) && $targetValues !== []) {
        return ['status' => 'review', 'reason' => 'Training document should treat this as role/competency measure unless it explicitly references registry governance.'];
    }
    if ($classification === 'gate_control_metric' && !in_array($bucket, ['annex_references', 'sops', 'work_instructions', 'forms', 'training', 'job_descriptions', 'department_handbooks'], true)) {
        return ['status' => 'review', 'reason' => 'Gate control metric appears outside normal gate/work-instruction context.'];
    }
    if (str_contains($path, 'annex-122') || str_contains($path, 'annex-125') || str_contains($path, 'annex-127')) {
        return ['status' => 'ok', 'reason' => 'Authority or scorecard document.'];
    }
    return ['status' => 'ok', 'reason' => 'Context acceptable or informational.'];
}

/**
 * @param list<array{row_index: int, html: string, text: string}> $rows
 * @param list<array<string, mixed>> $documentMetricRows
 * @param array{metrics: array<string, array<string, mixed>>, aliases: array<string, string>, local_ids: array<string, string>} $catalog
 * @return list<array<string, mixed>>
 */
function detectDocumentFindings(string $path, string $title, string $bucket, string $text, array $rows, array $documentMetricRows, array $catalog): array
{
    $findings = [];
    $metricCodes = array_values(array_unique(array_column($documentMetricRows, 'code')));

    if (preg_match('/ANNEX-QMS-008/u', $text) === 1) {
        $findings[] = finding(1, 'OUTDATED_KPI_REFERENCE', $path, $title, $bucket, ['ANNEX-127'], 'Document references ANNEX-QMS-008, but KPI authority is now ANNEX-122/127. Update the reference so users do not follow an obsolete KPI dictionary path.');
    }

    foreach ($rows as $row) {
        $rowText = $row['text'];
        $hasMandatoryKpiLabel = false;
        foreach (($row['cells'] ?? [$rowText]) as $cellText) {
            if (preg_match('/KPI\s+bắt buộc|KPI\s+bat buoc/iu', (string) $cellText) === 1) {
                $hasMandatoryKpiLabel = true;
                break;
            }
        }
        if (!$hasMandatoryKpiLabel) {
            continue;
        }
        $rowHits = detectDocumentHits($rowText, $catalog);
        $codes = array_keys($rowHits);
        $onlyGoverned = $codes !== [] && array_reduce($codes, static function (bool $carry, string $code) use ($catalog): bool {
            $classification = (string) ($catalog['metrics'][$code]['classification'] ?? 'local_or_unmapped_metric');
            return $carry && in_array($classification, ['executive_scorecard_kpi', 'governance_kpi'], true);
        }, true);
        if (!$onlyGoverned) {
            $findings[] = finding(1, 'MANDATORY_KPI_LABEL_FOR_CONTROL_METRIC', $path, $title, $bucket, $codes, 'Row says "KPI bắt buộc" but the content is local gate/control/operating measurement. Rename to Gate/control metrics and state review, recognition, corrective action, and discipline guardrail.');
        }
    }

    foreach ($documentMetricRows as $row) {
        $status = $row['context_fit']['status'] ?? 'ok';
        if ($status === 'review') {
            $findings[] = finding(2, 'CONTEXT_FIT_REVIEW', $path, $title, $bucket, [$row['code']], (string) ($row['context_fit']['reason'] ?? 'Context should be reviewed.'));
        }
        if (($row['target_values_seen'] ?? []) !== []) {
            $metric = $catalog['metrics'][$row['code']] ?? [];
            $expectedTarget = $metric['scorecard_target'] ?? null;
            if ($expectedTarget !== null && !targetValuesContain((array) $row['target_values_seen'], (string) $expectedTarget)) {
                $findings[] = finding(3, 'TARGET_VALUE_REVIEW', $path, $title, $bucket, [$row['code']], 'Document has target/threshold text that does not clearly include the registry scorecard target. Confirm whether this is a role/gate target or update the matrix mapping.');
            }
        }
    }

    foreach ($catalog['aliases'] as $alias => $canonical) {
        if (str_contains($path, 'annex-127-kpi-authority-registry-and-operational-metrics')) {
            continue;
        }
        $upperText = mb_strtoupper($text);
        if (isAmbiguousLegacyAlias($alias) && !hasExplicitLegacyAliasContext($upperText, $alias)) {
            continue;
        }
        if (countTermOccurrences($upperText, $alias) > 0) {
            $findings[] = finding(2, 'LEGACY_ALIAS_USED', $path, $title, $bucket, [$canonical], "Legacy alias {$alias} appears; use canonical code {$canonical} in governed KPI tables.");
        }
    }

    if (countTermOccurrences(mb_strtoupper($text), 'OEE') > 0 && preg_match('/OEE[^.]{0,80}≥\s*85|OEE[^.]{0,80}>=\s*85/iu', $text) === 1) {
        $findings[] = finding(2, 'GENERIC_OEE_TARGET_REVIEW', $path, $title, $bucket, ['OEE', 'OEE_BOTTLENECK'], 'Generic OEE ≥85% is world-class as an aspirational equipment benchmark, but CNC job-shop scorecard should clarify whether it means all-machine OEE health or OEE_BOTTLENECK with active constraint context.');
    }

    return dedupeFindings($findings);
}

/**
 * @return array<string, mixed>
 */
function finding(int $priority, string $code, string $path, string $title, string $bucket, array $metricCodes, string $recommendation): array
{
    return [
        'priority' => $priority,
        'finding_code' => $code,
        'path' => $path,
        'title' => $title,
        'bucket' => $bucket,
        'metric_codes' => array_values(array_unique($metricCodes)),
        'recommendation' => $recommendation,
    ];
}

/**
 * @param list<array<string, mixed>> $findings
 * @return list<array<string, mixed>>
 */
function dedupeFindings(array $findings): array
{
    $seen = [];
    $deduped = [];
    foreach ($findings as $finding) {
        $key = implode('|', [
            $finding['finding_code'] ?? '',
            $finding['path'] ?? '',
            implode(',', $finding['metric_codes'] ?? []),
        ]);
        if (isset($seen[$key])) {
            continue;
        }
        $seen[$key] = true;
        $deduped[] = $finding;
    }
    return $deduped;
}

/**
 * @param array<string, mixed> $metric
 */
function statisticalPlanStatus(array $metric): string
{
    if (($metric['scorecard_scoring_status'] ?? null) === 'active_runtime' || ($metric['backend_status'] ?? null) === 'runtime_calculated') {
        return 'runtime_calculated_with_registry_contract';
    }
    if (($metric['scorecard_scoring_status'] ?? null) === 'manual_governed') {
        return 'manual_governed_with_evidence_contract';
    }
    if (($metric['scorecard_scoring_status'] ?? null) === 'candidate_data_contract' || str_contains((string) ($metric['backend_status'] ?? ''), 'staged')) {
        return 'candidate_data_contract_required_before_payout';
    }
    if (($metric['classification'] ?? null) === 'role_performance_measure') {
        return 'competency_evaluation_not_company_scorecard';
    }
    if (($metric['classification'] ?? null) === 'gate_control_metric') {
        return 'gate_hold_release_evidence_not_payout';
    }
    return 'not_declared_or_informational';
}

/**
 * @param array<string, mixed> $metric
 */
function expectedTargetText(array $metric): ?string
{
    if (!array_key_exists('scorecard_target', $metric) || $metric['scorecard_target'] === null) {
        return null;
    }
    $unit = (string) ($metric['scorecard_unit'] ?? '');
    $prefix = ($metric['higher_is_better'] ?? true) ? '≥' : '≤';
    $suffix = $unit === 'percent' ? '%' : (' ' . $unit);
    return $prefix . (string) $metric['scorecard_target'] . $suffix;
}

/**
 * @param array<string, mixed> $usageRow
 */
function assessTargetConsistency(array $usageRow): string
{
    if (($usageRow['scorecard_target'] ?? null) === null) {
        return ($usageRow['target_values_seen'] ?? []) === [] ? 'no_registered_target_no_local_target' : 'local_target_requires_classification';
    }
    if (($usageRow['target_values_seen'] ?? []) === []) {
        return 'registered_target_not_repeated_in_docs';
    }
    return targetValuesContain((array) $usageRow['target_values_seen'], (string) $usageRow['scorecard_target'])
        ? 'target_seen_matches_registry_number'
        : 'target_seen_needs_review_against_registry';
}

/**
 * @param list<string> $targetValues
 */
function targetValuesContain(array $targetValues, string $expected): bool
{
    $expected = rtrim(rtrim($expected, '0'), '.');
    foreach ($targetValues as $value) {
        if (preg_match('/(?<!\d)' . preg_quote($expected, '/') . '(?!\d)/u', (string) $value) === 1) {
            return true;
        }
    }
    return false;
}

/**
 * @param array<string, mixed> $usageRow
 */
function assessNameConsistency(array $usageRow): string
{
    $aliases = (array) ($usageRow['aliases'] ?? []);
    $matchedTerms = [];
    foreach (($usageRow['documents'] ?? []) as $doc) {
        foreach (($doc['matched_terms'] ?? []) as $term) {
            $matchedTerms[$term] = true;
        }
    }
    foreach ($aliases as $alias) {
        if (isset($matchedTerms[$alias])) {
            return 'legacy_alias_seen';
        }
    }
    if (($usageRow['classification'] ?? '') === 'local_or_unmapped_metric') {
        return 'unmapped_or_local_name';
    }
    return 'canonical_or_mapped_name';
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

/**
 * @param array<string, mixed> $payload
 */
function encodeJson(array $payload): string
{
    $json = json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (!is_string($json)) {
        fwrite(STDERR, "Failed to encode report.\n");
        exit(1);
    }
    return $json . "\n";
}

function writeFile(string $repoRoot, string $path, string $content): void
{
    $absolute = str_starts_with($path, '/') ? $path : $repoRoot . '/' . $path;
    $dir = dirname($absolute);
    if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
        fwrite(STDERR, "Unable to create output directory: {$dir}\n");
        exit(1);
    }
    file_put_contents($absolute, $content);
}

/**
 * @param array<string, mixed> $report
 */
function renderMarkdownReport(array $report): string
{
    $summary = $report['summary'];
    $lines = [
        '# KPI System Matrix Audit',
        '',
        'Generated: ' . (string) $report['generated_at'],
        '',
        '## Summary',
        '',
        '| Item | Count |',
        '|---|---:|',
    ];
    foreach ($summary as $key => $value) {
        $lines[] = '| `' . $key . '` | ' . (string) $value . ' |';
    }
    $lines[] = '';
    $lines[] = '## Operating Conclusion';
    $lines[] = '';
    $lines[] = 'The KPI estate is broad but usable if the company keeps one authority rule: official KPI must be registry-approved and tied to evaluation, evidence, rating, and consequence. Training and shopfloor documents should use role measures, gate control metrics, or operating metrics unless they explicitly map to the registry.';
    $lines[] = 'Change-control rule: every KPI/metric creation, rename, target/threshold change, score weight change, owner change, backend formula change, or document-placement change must update the authority registry, ANNEX-128 matrix, and all related SOP/WI/ANNEX/JD/training documents in the same controlled change.';
    $lines[] = '';
    $lines[] = '## Priority Findings';
    $lines[] = '';
    $lines[] = '| Priority | Finding | Document | Metrics | Recommendation |';
    $lines[] = '|---:|---|---|---|---|';
    foreach (array_slice($report['findings'], 0, 80) as $finding) {
        $lines[] = '| P' . (string) $finding['priority'] . ' | `' . (string) $finding['finding_code'] . '` | `' . (string) $finding['path'] . '` | ' . implode(', ', $finding['metric_codes'] ?? []) . ' | ' . pipeSafe((string) $finding['recommendation']) . ' |';
    }
    $lines[] = '';
    $lines[] = '## Metric Matrix';
    $lines[] = '';
    $lines[] = '| Code | Class | Docs | Uses | Target | Backend/statistical plan | Target consistency | Name consistency |';
    $lines[] = '|---|---|---:|---:|---|---|---|---|';
    foreach ($report['metric_usage_matrix'] as $row) {
        $lines[] = '| `' . (string) $row['code'] . '` | ' . (string) $row['classification'] . ' | ' . (string) $row['documents_count'] . ' | ' . (string) $row['total_occurrences'] . ' | ' . pipeSafe((string) ($row['expected_target_text'] ?? '')) . ' | ' . pipeSafe((string) $row['statistical_plan_status']) . ' | ' . pipeSafe((string) $row['target_consistency']) . ' | ' . pipeSafe((string) $row['name_consistency']) . ' |';
    }
    $lines[] = '';
    $lines[] = '## Benchmark Rule';
    $lines[] = '';
    $lines[] = '- NIST Baldrige: KPI must support review, decision, improvement, and strategic objectives.';
    $lines[] = '- ISA-95: KPI/dashboard is a read model across ERP/MOM/MES boundaries, not execution truth.';
    $lines[] = '- SAP manufacturing/OEE: OEE needs availability, performance, quality, resource/order context, and reason codes.';
    $lines[] = '- SAP calibration/variable pay: rating and reward require workflow and calibration, not automatic raw metric payout.';
    $lines[] = '';
    return implode("\n", $lines);
}

function pipeSafe(string $text): string
{
    return str_replace('|', '\\|', $text);
}

/**
 * @param array<string, mixed> $report
 */
function renderAnnexHtml(array $report): string
{
    $summary = $report['summary'];
    $metricRows = '';
    foreach ($report['metric_usage_matrix'] as $row) {
        $docsHtml = '';
        foreach ($row['documents'] as $doc) {
            $docsHtml .= '<li><a href="' . h(annexHref((string) $doc['path'])) . '">' . h((string) $doc['path']) . '</a> <span class="tag">' . h((string) $doc['occurrences']) . ' lần</span> <span class="muted">' . h((string) ($doc['context_fit']['status'] ?? '')) . '</span></li>';
        }
        $metricRows .= '<tr>'
            . '<td><span class="code">' . h((string) $row['code']) . '</span><br><span class="muted">' . h((string) $row['display_name']) . '</span></td>'
            . '<td>' . h((string) $row['classification']) . '<br><span class="muted">' . h(implode(', ', $row['registry_sources'] ?? [])) . '</span></td>'
            . '<td class="num">' . h((string) $row['documents_count']) . '</td>'
            . '<td class="num">' . h((string) $row['total_occurrences']) . '</td>'
            . '<td>' . h((string) ($row['expected_target_text'] ?? '')) . '<br><span class="muted">' . h(implode('; ', array_slice($row['target_values_seen'] ?? [], 0, 4))) . '</span></td>'
            . '<td>' . h((string) $row['statistical_plan_status']) . '<br><span class="muted">' . h((string) ($row['scorecard_scoring_status'] ?? '')) . '</span></td>'
            . '<td>' . h((string) $row['target_consistency']) . '<br><span class="muted">' . h((string) $row['name_consistency']) . '</span></td>'
            . '<td><details><summary>Documents</summary><ul class="doc-list">' . $docsHtml . '</ul></details></td>'
            . '</tr>';
    }

    $findingRows = '';
    foreach (array_slice($report['findings'], 0, 80) as $finding) {
        $findingRows .= '<tr>'
            . '<td>P' . h((string) $finding['priority']) . '</td>'
            . '<td><span class="code">' . h((string) $finding['finding_code']) . '</span></td>'
            . '<td><a href="' . h(annexHref((string) $finding['path'])) . '">' . h((string) $finding['path']) . '</a></td>'
            . '<td>' . h(implode(', ', $finding['metric_codes'] ?? [])) . '</td>'
            . '<td>' . h((string) $finding['recommendation']) . '</td>'
            . '</tr>';
    }

    return '<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ANNEX-128 - KPI System Matrix and Document Usage | HESEM MOM</title>
<link rel="stylesheet" href="../../../../../assets/style.css">
<style>
.page-body h1{font-size:24px;line-height:1.35;margin:0 0 10px}
.page-body h2{font-size:18px;line-height:1.4;margin:18px 0 10px;color:var(--navy)}
.card-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin:14px 0}
.metric-card{border:1px solid var(--ln);border-radius:8px;padding:12px;background:#fff}
.metric-card b{display:block;font-size:18px;color:var(--navy)}
.callout{border:1px solid #cfe0ff;border-left:4px solid #2563eb;border-radius:8px;background:#eef6ff;padding:12px 14px;margin:12px 0}
.danger{border-color:#ffc9c9;border-left-color:#e03131;background:#fff5f5}
.muted{font-size:12px;color:var(--ink2)}
.tag{display:inline-block;padding:2px 6px;border:1px solid var(--ln);border-radius:999px;background:var(--bg2);font-size:11px;font-weight:700}
.num{text-align:right;font-variant-numeric:tabular-nums}
.doc-list{margin:8px 0 0 0;padding-left:18px;max-height:260px;overflow:auto}
td,th{vertical-align:top}
</style>
</head>
<body>
<div class="container"><div class="page"><div class="page-body">
<div class="form-header">
<div class="fh-left"><a class="brand-logo" href="../../../../../portal.html"><img alt="HESEM Logo" src="../../../../../assets/hesem-logo.svg"></a><div class="fh-company"><a href="../../../../../portal.html">HESEM ENGINEERING</a><span>Tài liệu vận hành • Annex</span></div></div>
<div class="title"><strong class="doc-name">KPI System Matrix and Document Usage</strong><span class="sub-vn">Ma trận phân bổ KPI/metric theo tài liệu, số lần sử dụng, target, classification và data/evaluation status</span></div>
<div class="meta"><div class="row"><span><b>Mã:</b></span><span class="doc-code">ANNEX-128</span></div><div class="row"><span><b>Phiên bản:</b></span><span>V0</span></div><div class="row"><span><b>Ngày hiệu lực:</b></span><span>Theo quyết định ban hành</span></div><div class="row"><span><b>Chủ sở hữu:</b></span><span>QMS / Analytics Owner</span></div></div>
</div>
<div class="note"><strong>ÁP DỤNG KHI</strong><br>Dùng để xem một KPI/metric xuất hiện ở tài liệu nào, số lần dùng, target/ngưỡng nào đang ghi, trạng thái backend/data contract và liệu cách gọi là KPI có đúng authority hay chưa.</div>
<h1>ANNEX-128 - KPI System Matrix and Document Usage</h1>
<div class="callout danger"><b>Nguyên tắc khóa:</b> Không dùng để đánh giá thì không gọi KPI. Official KPI phải qua registry, có owner, target, evidence, rating method và consequence. Tài liệu hiện trường dùng Gate Control Metric hoặc Operating Metric; tài liệu đào tạo dùng Role Performance Measure.</div>
<div class="callout danger"><b>Nguyên tắc change-control:</b> Khi thêm, đổi tên, đổi target/ngưỡng, đổi trọng số, đổi owner, đổi công thức/backend hoặc đổi vị trí sử dụng KPI/metric, phải cập nhật đồng thời registry KPI, ANNEX-128 matrix và tất cả SOP/WI/ANNEX/JD/training liên quan. Nếu matrix và tài liệu liên quan chưa cập nhật, thay đổi chưa được dùng cho dashboard, đánh giá, ghi nhận, thưởng, corrective action hoặc kỷ luật.</div>
<div class="card-grid">
<div class="metric-card"><span class="muted">HTML quét</span><b>' . h((string) $summary['html_file_count']) . '</b></div>
<div class="metric-card"><span class="muted">Tài liệu có metric</span><b>' . h((string) $summary['documents_with_metric_usage']) . '</b></div>
<div class="metric-card"><span class="muted">Metric code thấy được</span><b>' . h((string) $summary['metric_codes_seen']) . '</b></div>
<div class="metric-card"><span class="muted">Findings</span><b>' . h((string) $summary['findings_total']) . '</b></div>
</div>
<h2>1. Benchmark vận hành</h2>
<div class="table-card"><table class="table"><thead><tr><th>Nguồn</th><th>Áp dụng vào KPI CNC</th></tr></thead><tbody>
<tr><td><a href="https://www.nist.gov/baldrige/baldrige-criteria-commentary">NIST Baldrige</a></td><td>Measurement phải dẫn tới review, quyết định, cải tiến, planning và mục tiêu chiến lược; không chỉ báo cáo số.</td></tr>
<tr><td><a href="https://www.isa.org/standards-and-publications/isa-standards/isa-95-standard">ISA-95</a></td><td>Dashboard KPI là read model giữa ERP/MOM/MES; không thay execution truth.</td></tr>
<tr><td><a href="https://help.sap.com/docs/SAP_PROFITABILITY_PERFORMANCE_MANAGEMENT/7fa13890d47b4c69bbb62175e84e4aa8/894ac627ba26422eb92a9cd17db846e8.html">SAP Production Quality KPIs</a></td><td>OEE phải tách Availability, Performance, Quality và gắn resource/order context.</td></tr>
<tr><td><a href="https://help.sap.com/docs/successfactors-performance-and-goals/implementing-and-managing-calibration/overview-of-calibration">SAP Calibration</a></td><td>Rating, calibration và reward là workflow có kiểm soát; KPI output không tự động thưởng/phạt.</td></tr>
</tbody></table></div>
<h2>2. Findings cần xử lý</h2>
<div class="table-card"><table class="table"><thead><tr><th>P</th><th>Finding</th><th>Tài liệu</th><th>Metric</th><th>Đề xuất</th></tr></thead><tbody>' . $findingRows . '</tbody></table></div>
<h2>3. Ma trận KPI/metric toàn hệ thống</h2>
<p class="muted">Bảng này được sinh từ <span class="code">tools/scripts/kpi/audit-kpi-system-matrix.php</span>. Cột Documents mở ra danh sách link tài liệu và số lần sử dụng trong từng tài liệu.</p>
<div class="table-card"><table class="table"><thead><tr><th>Metric</th><th>Phân loại</th><th>Docs</th><th>Uses</th><th>Target/ngưỡng</th><th>Data/stat plan</th><th>Consistency</th><th>Documents</th></tr></thead><tbody>' . $metricRows . '</tbody></table></div>
</div></div></div>
<div class="no-screen print-disclaimer">Bản in không có đóng dấu kiểm soát phiên bản thì không có giá trị. Chỉ sử dụng phiên bản hiện hành trên hệ thống HESEM QMS.</div>
</body>
</html>
';
}

function annexHref(string $relativePath): string
{
    if (str_starts_with($relativePath, 'mom/docs/')) {
        return '../../../../' . substr($relativePath, strlen('mom/docs/'));
    }

    return '../../../../' . $relativePath;
}

function h(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
}
