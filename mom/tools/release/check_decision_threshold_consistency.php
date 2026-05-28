#!/usr/bin/env php
<?php

declare(strict_types=1);

$root = dirname(__DIR__, 3);

require_once $root . '/mom/api/services/FileHelper.php';
require_once $root . '/mom/api/services/DecisionThresholdService.php';

use MOM\Api\Services\DecisionThresholdService;

$service = new DecisionThresholdService($root, $root . '/mom/data');
$bootstrap = $service->loadBootstrap();
$runtime = $service->loadRuntime();

$p0 = [];

$bootstrapRows = thresholdRows($bootstrap);
$runtimeRows = thresholdRows($runtime);

if ($bootstrapRows !== $runtimeRows) {
    $codes = array_values(array_unique(array_merge(array_keys($bootstrapRows), array_keys($runtimeRows))));
    foreach ($codes as $code) {
        if (($bootstrapRows[$code] ?? null) !== ($runtimeRows[$code] ?? null)) {
            $p0[] = "decision_thresholds bootstrap/runtime mismatch at {$code}.";
        }
    }
}

$authorityPath = $root . '/mom/docs/system/organization/04-RACI-Authority/authority-matrix.html';
$authorityHtml = @file_get_contents($authorityPath);
if ($authorityHtml === false) {
    fwrite(STDERR, "ERROR: file not found: {$authorityPath}\n");
    exit(2);
}

$actualBlock = extractManagedBlock($authorityHtml, 'DECISION-THRESHOLDS');
$expectedBlock = $service->previewAuthorityLookupBlock($runtime);

if ($actualBlock === null) {
    $p0[] = 'AUTHORITY-MATRIX: DECISION-THRESHOLDS managed block not found.';
} elseif (normaliseFragment($actualBlock) !== normaliseFragment($expectedBlock)) {
    $p0[] = 'AUTHORITY-MATRIX: published DECISION-THRESHOLDS block drifted from runtime render.';
}

fwrite(STDOUT, "Decision-threshold consistency\n");
fwrite(STDOUT, "  bootstrap items: " . (string)count($bootstrapRows) . "\n");
fwrite(STDOUT, "  runtime items: " . (string)count($runtimeRows) . "\n");
fwrite(STDOUT, "  authority block: " . ($actualBlock === null ? 'missing' : 'present') . "\n");

if ($p0 !== []) {
    foreach ($p0 as $issue) {
        fwrite(STDERR, "[P0] {$issue}\n");
    }
    exit(1);
}

function thresholdRows(array $config): array
{
    $rows = [];
    $items = is_array($config['items'] ?? null) ? $config['items'] : [];
    foreach ($items as $item) {
        if (!is_array($item)) {
            continue;
        }
        $cdrs = is_array($item['cdrs'] ?? null) ? $item['cdrs'] : [];
        $code = strtoupper(trim((string)($cdrs[0] ?? $item['key'] ?? '')));
        if ($code === '') {
            continue;
        }
        $rows[$code] = [
            'label' => cleanText($item['label'] ?? ''),
            'decision' => cleanText($item['decision'] ?? ''),
            'condition' => cleanText($item['condition'] ?? ''),
            'l1' => cleanText($item['l1'] ?? ''),
            'l2' => cleanText($item['l2'] ?? ''),
            'l3' => cleanText($item['l3'] ?? ''),
            'r' => cleanText($item['r'] ?? ''),
            'evidence' => cleanText($item['evidence'] ?? ''),
            'escalation' => cleanText($item['escalation'] ?? ''),
        ];
    }

    ksort($rows);

    return $rows;
}

function extractManagedBlock(string $html, string $key): ?string
{
    $pattern = '/<!--\s*' . preg_quote($key, '/') . ':START\s*-->(.*?)<!--\s*' . preg_quote($key, '/') . ':END\s*-->/s';
    if (!preg_match($pattern, $html, $match)) {
        return null;
    }

    return trim($match[1]);
}

function normaliseFragment(string $html): string
{
    $doc = new DOMDocument();
    libxml_use_internal_errors(true);
    $doc->loadHTML('<?xml encoding="UTF-8"><div id="root">' . $html . '</div>');
    libxml_clear_errors();

    $root = $doc->getElementById('root');
    if (!$root instanceof DOMElement) {
        return trim(preg_replace('/\s+/u', ' ', $html) ?? $html);
    }

    $normalised = '';
    foreach ($root->childNodes as $child) {
        $normalised .= $doc->saveHTML($child);
    }

    return trim(preg_replace('/\s+/u', ' ', $normalised) ?? $normalised);
}

function cleanText(mixed $value): string
{
    $text = trim((string)$value);
    return preg_replace('/\s+/u', ' ', $text) ?? $text;
}
