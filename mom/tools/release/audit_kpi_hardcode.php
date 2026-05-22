#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * KPI Hardcode Audit
 * ────────────────────────────────────────────────────────────────────────────
 * Comprehensive sweep: is every KPI surfaced anywhere in the controlled
 * documents LINKED to the KPI Authority registry (kpi-authority-registry.json),
 * or is any KPI threshold hardcoded into a document?
 *
 *   1. Registry SSOT — 69 rows, 61 canonical codes; every row carries numeric
 *      thresholds and a dedicated counter-metric (code + endpoint).
 *   2. ANNEX-122 §4/§5/§6 — every governance KPI threshold cell is wrapped in
 *      a <div class="kpi-rag-badge" data-kpi-code="…"> the live renderer
 *      hydrates from the API. A threshold cell without it = hardcoded.
 *   3. ANNEX-122 §9 — every gate metric row carries data-gate-metric.
 *   4. Other ANNEX-120-folder documents — flag any KPI canonical code shown
 *      next to a RAG colour span (kpi-good/kpi-warn/kpi-bad) that is NOT a
 *      live kpi-rag-badge, i.e. a hardcoded threshold.
 *
 * Exit code: 0 = every KPI is registry-linked, 1 = a hardcoded KPI was found.
 */

$base    = dirname(__DIR__, 2);
$regFp   = $base . '/data/registry/kpi-authority-registry.json';
$annexDir= $base . '/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control';
$a122Fp  = $annexDir . '/annex-122-kpi-cascade-dictionary.html';

$reg = json_decode((string) @file_get_contents($regFp), true);
if (!is_array($reg)) {
    fwrite(STDERR, "ERROR: registry not readable\n");
    exit(2);
}

$findings = [];
$ok = [];

// ── 1. Registry SSOT ─────────────────────────────────────────────────────────
$codes = [];
$rows  = 0;
$counterBad = [];
foreach (['annex122_governance_kpis', 'gate_control_metrics', 'proposed_operating_metrics'] as $sec) {
    foreach (($reg[$sec] ?? []) as $row) {
        if (!is_array($row)) {
            continue;
        }
        $rows++;
        $code = strtoupper(trim((string) ($row['canonical_code'] ?? '')));
        if ($code !== '') {
            $codes[$code] = true;
        }
        $cm = $row['counter_metric'] ?? null;
        if (!is_array($cm) || trim((string) ($cm['code'] ?? '')) === ''
            || trim((string) ($cm['endpoint'] ?? '')) === '') {
            $counterBad[] = $code;
        }
    }
}
$govCodes = [];
foreach (($reg['annex122_governance_kpis'] ?? []) as $row) {
    if (is_array($row)) {
        $govCodes[strtoupper(trim((string) ($row['canonical_code'] ?? '')))] = true;
    }
}
if ($counterBad === []) {
    $ok[] = sprintf('Registry: %d rows, %d canonical codes — every row has a '
        . 'counter-metric with code + endpoint.', $rows, count($codes));
} else {
    $findings[] = 'Registry: rows missing counter code/endpoint — ' . implode(', ', $counterBad);
}

// ── 2. ANNEX-122 §4/§5/§6 governance badges ─────────────────────────────────
$a122 = (string) @file_get_contents($a122Fp);
preg_match_all('/<div class="kpi-rag-badge"[^>]*data-kpi-code="([A-Z0-9_]+)"/', $a122, $bm);
$badged = array_values(array_unique($bm[1] ?? []));
$missingBadge = array_diff(array_keys($govCodes), $badged);
$strayBadge   = array_diff($badged, array_keys($govCodes));
if ($missingBadge === [] && $strayBadge === []) {
    $ok[] = sprintf('ANNEX-122 §4/§5/§6: all %d governance KPIs rendered as a '
        . 'live kpi-rag-badge (data-kpi-code) — none hardcoded.', count($badged));
} else {
    foreach ($missingBadge as $c) {
        $findings[] = "ANNEX-122: governance KPI '$c' has no live kpi-rag-badge "
            . '— threshold may be hardcoded.';
    }
    foreach ($strayBadge as $c) {
        $findings[] = "ANNEX-122: kpi-rag-badge '$c' is not a registry governance KPI.";
    }
}

// ── 3. ANNEX-122 §9 gate rows ───────────────────────────────────────────────
preg_match_all('/data-gate-metric="([A-Z0-9-]+)"/', $a122, $gm);
$gateRows = count($gm[1] ?? []);
$gateCount = count($reg['gate_control_metrics'] ?? []);
if ($gateRows >= $gateCount && $gateRows > 0) {
    $ok[] = sprintf('ANNEX-122 §9: %d gate metric rows carry data-gate-metric.', $gateRows);
} else {
    $findings[] = "ANNEX-122 §9: $gateRows gate rows rendered but registry has $gateCount.";
}

// ── 4. Other ANNEX-120-folder docs — hardcoded KPI thresholds ───────────────
$others = glob($annexDir . '/*.html') ?: [];
foreach ($others as $fp) {
    $name = basename($fp);
    if ($name === basename($a122Fp)) {
        continue;
    }
    $html = (string) @file_get_contents($fp);
    // A RAG colour span carrying a percent / ppm literal, with a KPI canonical
    // code mentioned in the same document, and no live kpi-rag-badge wrapper.
    if (!preg_match('/class="kpi-(?:good|warn|bad)"[^>]*>[^<]*(?:%|ppm)/', $html)) {
        continue;
    }
    if (strpos($html, 'kpi-rag-badge') !== false) {
        continue; // already uses the live badge
    }
    $hit = [];
    foreach (array_keys($codes) as $c) {
        if (strlen($c) >= 4 && strpos($html, $c) !== false) {
            $hit[] = $c;
        }
    }
    if ($hit !== []) {
        $findings[] = "$name: shows KPI threshold colours for [" . implode(', ', array_slice($hit, 0, 6))
            . (count($hit) > 6 ? ', …' : '') . '] without a live kpi-rag-badge — hardcoded.';
    }
}

// ── 5. JD KPI scorecards — every job description is registry-linked ─────────
// Rule for all 39 JD documents: the role has a scorecard, the jd_file exists,
// the doc loads the JD-scorecard renderer, and it has a §KPI section heading
// the renderer can target. Any JD that fails is showing a hardcoded /
// un-linked KPI section.
$jdRoles = $reg['jd_kpi_scorecards']['roles'] ?? null;
$jdDir = $base . '/docs/system/organization/03-Job-Descriptions';
if (is_array($jdRoles)) {
    $jdFiles = glob($jdDir . '/*/jd-*.html') ?: [];
    $covered = [];
    $jdBad = 0;
    foreach ($jdRoles as $rc => $card) {
        if (!is_array($card)) {
            continue;
        }
        $rel = (string) ($card['jd_file'] ?? '');
        $fp = $base . '/' . preg_replace('#^mom/#', '', $rel);
        if (!is_file($fp)) {
            $findings[] = "JD scorecard $rc: jd_file '$rel' does not exist.";
            $jdBad++;
            continue;
        }
        $covered[realpath($fp)] = true;
        $doc = (string) @file_get_contents($fp);
        if (strpos($doc, '13-jd-scorecard-renderer.js') === false) {
            $findings[] = "JD $rc: " . basename($fp) . " does not load the JD-scorecard renderer.";
            $jdBad++;
        }
        if (!preg_match('/<h[1-4][^>]*>[^<]*(?:KPI|Chỉ số đánh giá)[^<]*<\/h[1-4]>/u', $doc)) {
            $findings[] = "JD $rc: " . basename($fp) . " has no §KPI section heading to hydrate.";
            $jdBad++;
        }
    }
    foreach ($jdFiles as $fp) {
        if (!isset($covered[realpath($fp)])) {
            $findings[] = 'JD document ' . basename($fp)
                . ' has no scorecard in jd_kpi_scorecards.';
            $jdBad++;
        }
    }
    if ($jdBad === 0) {
        $ok[] = sprintf('JD scorecards: all %d job descriptions are registry-linked '
            . '(scorecard + renderer + §KPI section).', count($jdRoles));
    }
}

// ── Report ──────────────────────────────────────────────────────────────────
echo "── KPI Hardcode Audit ──────────────────────────────────────────\n";
foreach ($ok as $line) {
    echo "  PASS  $line\n";
}
foreach ($findings as $line) {
    echo "  HARDCODE  $line\n";
}
echo str_repeat('─', 64) . "\n";
if ($findings === []) {
    echo "RESULT: every governed KPI is linked to the Authority registry — no hardcoded KPI.\n";
    exit(0);
}
echo 'RESULT: ' . count($findings) . " hardcoded / unlinked KPI surface(s) found.\n";
exit(1);
