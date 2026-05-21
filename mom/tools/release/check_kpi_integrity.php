#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * KPI Integrity Checker
 * ────────────────────────────────────────────────────────────────────────────
 * kpi-authority-registry.json is the SSOT for the operating KPI system. Its
 * 33 governance KPIs are rendered into ANNEX-122 (§4/§5/§6 marker regions),
 * computed by KpiEngine, surfaced on the dashboard, and aggregated into the
 * ANNEX-128 system matrix. A change to one surface that misses another
 * silently drifts the KPI system. This guard catches that drift before deploy
 * — the KPI-side counterpart of check_raci_integrity.php.
 *
 * P0 findings (block deploy)
 * ──────────────────────────
 *   1. ANNEX-122 governance KPI codes (data-kpi-code) ≠ registry codes.
 *   2. A governance KPI is missing formula / numeric thresholds
 *      (green_point + yellow_point, ordered by direction) / owner_role /
 *      data_source / calculation_status / decision_action.
 *   3. calculation_status=runtime_calculated but the code is absent from
 *      registry.runtime_calculated_metrics or from KpiEngine.php.
 *   4. Duplicate canonical_code among governance KPIs.
 *   5. A legacy alias maps to a code that is not a known metric.
 *   6. A gate metric linked_cdr references a CDR absent from ANNEX-121.
 *   7. reward_eligible=true but counter_metric is empty or not a known code.
 *
 * P1 findings (warn, do not block)
 * ────────────────────────────────
 *   - A staged_data_contract KPI sits in the executive scorecard.
 *   - A lag KPI has no paired_metric (lead pairing missing).
 *   - A percent-unit KPI has min_sample 0 (small-lot noise unguarded).
 *   - A dashboard primary_endpoint is outside the /api/kpi/ namespace.
 *   - A governance KPI code is not enumerated in ANNEX-128. ANNEX-128 is a
 *     document-usage matrix (only lists codes referenced in scanned docs),
 *     so this is advisory — re-run audit-kpi-system-matrix.php to confirm.
 *
 * Exit code: 0 = clean (warnings allowed), 1 = at least one P0 finding.
 */

$base       = dirname(__DIR__, 2);                // -> repo .../mom
$registryFp = $base . '/data/registry/kpi-authority-registry.json';
$annexDir   = $base . '/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control';
$annex122Fp = $annexDir . '/annex-122-kpi-cascade-dictionary.html';
$annex121Fp = $annexDir . '/annex-121-raci-master-matrix.html';
$annex128Fp = $annexDir . '/annex-128-kpi-system-matrix-and-document-usage.html';
$engineFp   = $base . '/api/services/KpiEngine.php';

$p0 = [];
$p1 = [];

function readText(string $path): string
{
    if (!is_file($path)) {
        fwrite(STDERR, "ERROR: file not found: $path\n");
        exit(2);
    }
    return (string) file_get_contents($path);
}

$registry = json_decode(readText($registryFp), true);
if (!is_array($registry)) {
    fwrite(STDERR, "ERROR: registry is not valid JSON\n");
    exit(2);
}

$governance = is_array($registry['annex122_governance_kpis'] ?? null)
    ? $registry['annex122_governance_kpis'] : [];
$runtimeList = array_map('strval', is_array($registry['runtime_calculated_metrics'] ?? null)
    ? $registry['runtime_calculated_metrics'] : []);
$gateMetrics = is_array($registry['gate_control_metrics'] ?? null)
    ? $registry['gate_control_metrics'] : [];
$aliases = is_array($registry['legacy_aliases'] ?? null) ? $registry['legacy_aliases'] : [];
$dashboard = is_array($registry['dashboard_core_kpis'] ?? null)
    ? $registry['dashboard_core_kpis'] : [];
$proposed = is_array($registry['proposed_operating_metrics'] ?? null)
    ? $registry['proposed_operating_metrics'] : [];
$scorecard = array_map('strtoupper', array_map('strval',
    is_array($registry['executive_scorecard'] ?? null) ? $registry['executive_scorecard'] : []));

// ── Build the known-code universe ────────────────────────────────────────────
$knownCodes = [];
foreach ($runtimeList as $c) {
    $knownCodes[strtoupper(trim($c))] = true;
}
foreach ([$governance, $gateMetrics, $dashboard, $proposed] as $set) {
    foreach ($set as $row) {
        if (is_array($row) && isset($row['canonical_code'])) {
            $knownCodes[strtoupper(trim((string) $row['canonical_code']))] = true;
        }
    }
}

// ── P0.4 + governance code list ──────────────────────────────────────────────
$govCodes = [];
$seenCode = [];
foreach ($governance as $row) {
    if (!is_array($row)) {
        continue;
    }
    $code = strtoupper(trim((string) ($row['canonical_code'] ?? '')));
    if ($code === '') {
        $p0[] = 'Registry: a governance KPI row has an empty canonical_code.';
        continue;
    }
    if (isset($seenCode[$code])) {
        $p0[] = "Registry: duplicate governance canonical_code '$code'.";
    }
    $seenCode[$code] = true;
    $govCodes[] = $code;
}

// ── P0.2 — required fields per governance KPI ────────────────────────────────
foreach ($governance as $row) {
    if (!is_array($row)) {
        continue;
    }
    $code = strtoupper(trim((string) ($row['canonical_code'] ?? 'UNKNOWN')));
    foreach (['formula', 'data_source'] as $field) {
        if (!is_array($row[$field] ?? null) || $row[$field] === []) {
            $p0[] = "Registry $code: missing or empty '$field'.";
        }
    }
    foreach (['owner_role', 'calculation_status', 'decision_action'] as $field) {
        if (trim((string) ($row[$field] ?? '')) === '') {
            $p0[] = "Registry $code: missing '$field'.";
        }
    }
    // Numeric threshold schema (SSOT): green_point + yellow_point must be
    // numbers, ordered consistently with direction, so RAG/trend/scorecard
    // roll-up is pure arithmetic.
    $t = $row['thresholds'] ?? null;
    if (!is_array($t) || !is_numeric($t['green_point'] ?? null)
        || !is_numeric($t['yellow_point'] ?? null)) {
        $p0[] = "Registry $code: thresholds not numeric (need green_point + yellow_point).";
    } else {
        $gp = (float) $t['green_point'];
        $yp = (float) $t['yellow_point'];
        $dir = (string) ($t['direction'] ?? 'higher_is_better');
        if ($dir === 'higher_is_better' && $gp < $yp) {
            $p0[] = "Registry $code: higher_is_better needs green_point >= yellow_point ($gp < $yp).";
        }
        if ($dir === 'lower_is_better' && $gp > $yp) {
            $p0[] = "Registry $code: lower_is_better needs green_point <= yellow_point ($gp > $yp).";
        }
    }

    // ── P0.3 — runtime_calculated must be wired to the engine ────────────────
    if (($row['calculation_status'] ?? '') === 'runtime_calculated') {
        if (!in_array($code, array_map('strtoupper', $runtimeList), true)) {
            $p0[] = "Registry $code: calculation_status=runtime_calculated but "
                . "code is not listed in runtime_calculated_metrics.";
        }
    }

    // ── P0.7 — reward KPI must have a real counter-metric ────────────────────
    if (($row['reward_eligible'] ?? false) === true) {
        $counter = strtoupper(trim((string) ($row['counter_metric'] ?? '')));
        if ($counter === '') {
            $p0[] = "Registry $code: reward_eligible=true but counter_metric is empty.";
        } elseif (!isset($knownCodes[$counter])) {
            $p0[] = "Registry $code: counter_metric '$counter' is not a known metric code.";
        }
    }

    // ── P1 — lag without lead pairing ────────────────────────────────────────
    if (($row['lead_or_lag'] ?? '') === 'lag'
        && trim((string) ($row['paired_metric'] ?? '')) === '') {
        $p1[] = "Registry $code: lag KPI has no paired_metric (lead pairing missing).";
    }
    // ── P1 — percent KPI without a minimum sample ────────────────────────────
    $unit = (string) (($row['formula']['unit'] ?? ''));
    $minSample = (int) (($row['formula']['min_sample'] ?? 0));
    if ($unit === '%' && $minSample === 0) {
        $p1[] = "Registry $code: percent-unit KPI has min_sample 0 (small-lot noise unguarded).";
    }
}

// ── P0.3 — every runtime metric must appear in KpiEngine ─────────────────────
$engineSrc = readText($engineFp);
foreach ($runtimeList as $rc) {
    $rc = strtoupper(trim($rc));
    if ($rc !== '' && strpos($engineSrc, "'" . $rc . "'") === false) {
        $p0[] = "runtime_calculated_metrics lists '$rc' but it does not appear "
            . "in KpiEngine.php (no calculator wired).";
    }
}

// ── P0.1 — ANNEX-122 governance codes must equal the registry set ────────────
$annex122 = readText($annex122Fp);
preg_match_all('/data-kpi-code="([A-Z0-9_]+)"/', $annex122, $m);
$annexCodes = array_map('strtoupper', $m[1] ?? []);
$govSet = array_unique($govCodes);
$annexSet = array_unique($annexCodes);
sort($govSet);
sort($annexSet);
foreach (array_diff($govSet, $annexSet) as $missing) {
    $p0[] = "ANNEX-122: governance KPI '$missing' is in the registry but not "
        . "rendered (no data-kpi-code row) — §4/§5/§6 not regenerated.";
}
foreach (array_diff($annexSet, $govSet) as $stray) {
    $p0[] = "ANNEX-122: rendered KPI '$stray' is not in the registry "
        . "annex122_governance_kpis.";
}

// ── P1 — governance codes not enumerated in ANNEX-128 (advisory) ─────────────
// ANNEX-128 is a generated document-usage matrix: it lists a metric only when
// that code is referenced in a scanned document, so a governance KPI that is
// not yet cited elsewhere is legitimately absent. This is advisory, not a
// blocker — a cluster of absences is the signal to re-run the matrix audit.
$annex128 = readText($annex128Fp);
foreach ($govSet as $code) {
    if (strpos($annex128, $code) === false) {
        $p1[] = "ANNEX-128: governance KPI '$code' is not enumerated in the "
            . "system matrix — re-run audit-kpi-system-matrix.php if recent "
            . "registry changes should be reflected.";
    }
}

// ── P0.5 — legacy aliases must target a known code ───────────────────────────
foreach ($aliases as $alias => $target) {
    if (!is_string($target)) {
        continue;
    }
    $t = strtoupper(trim($target));
    if ($t !== '' && !isset($knownCodes[$t])) {
        $p0[] = "Registry: legacy alias '$alias' maps to unknown code '$t'.";
    }
}

// ── P0.6 — gate linked_cdr must exist in ANNEX-121 ───────────────────────────
$annex121 = readText($annex121Fp);
preg_match_all('/\b([A-F][0-9]{1,2})\b/', $annex121, $cm);
$cdrCodes = array_unique($cm[1] ?? []);
foreach ($gateMetrics as $g) {
    if (!is_array($g)) {
        continue;
    }
    $local = (string) ($g['local_id'] ?? $g['canonical_code'] ?? '?');
    foreach ((array) ($g['linked_cdr'] ?? []) as $cdr) {
        $cdr = strtoupper(trim((string) $cdr));
        if ($cdr !== '' && !in_array($cdr, $cdrCodes, true)) {
            $p0[] = "Gate metric $local: linked_cdr '$cdr' does not exist in ANNEX-121.";
        }
    }
}

// ── P1 — staged KPI in the executive scorecard ───────────────────────────────
foreach ($governance as $row) {
    if (!is_array($row)) {
        continue;
    }
    $code = strtoupper(trim((string) ($row['canonical_code'] ?? '')));
    if (in_array($code, $scorecard, true)
        && ($row['calculation_status'] ?? '') === 'staged_data_contract') {
        $p1[] = "Registry $code: staged_data_contract KPI is in the executive "
            . "scorecard (CEO sees a metric with no data contract).";
    }
}

// ── P1 — dashboard endpoint namespace ────────────────────────────────────────
foreach ($dashboard as $row) {
    if (!is_array($row)) {
        continue;
    }
    $ep = trim((string) ($row['primary_endpoint'] ?? ''));
    if ($ep !== '' && !str_contains($ep, '/api/kpi/')) {
        $code = (string) ($row['canonical_code'] ?? '?');
        $p1[] = "Dashboard $code: primary_endpoint '$ep' is outside the "
            . "/api/kpi/ namespace.";
    }
}

// ── Report ───────────────────────────────────────────────────────────────────
$byStatus = ['runtime_calculated' => 0, 'staged_data_contract' => 0, 'manual' => 0, 'retired' => 0];
foreach ($governance as $row) {
    $s = is_array($row) ? (string) ($row['calculation_status'] ?? '') : '';
    if (isset($byStatus[$s])) {
        $byStatus[$s]++;
    }
}

echo "KPI integrity check\n";
echo "  governance KPIs: " . count($govCodes)
    . " (runtime {$byStatus['runtime_calculated']}"
    . " · staged {$byStatus['staged_data_contract']}"
    . " · manual {$byStatus['manual']}"
    . " · retired {$byStatus['retired']})\n";
echo "  runtime_calculated_metrics: " . count($runtimeList)
    . " · gate metrics: " . count($gateMetrics)
    . " · legacy aliases: " . count($aliases) . "\n\n";

foreach ($p1 as $w) {
    echo "  WARN (P1): $w\n";
}
if ($p0 !== []) {
    foreach ($p0 as $e) {
        echo "  FAIL (P0): $e\n";
    }
    echo "\nKPI integrity check FAILED: " . count($p0) . " P0 finding(s).\n";
    exit(1);
}
echo "\nKPI integrity check PASSED" . ($p1 ? ' with ' . count($p1) . ' warning(s)' : '') . ".\n";
exit(0);
