#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * KPI Integrity Checker
 * ────────────────────────────────────────────────────────────────────────────
 * kpi-authority-registry.json is the SSOT for the operating KPI system. Its
 * governed metrics are rendered into ANNEX-122 (§4/§5/§6 marker regions),
 * computed by KpiEngine where runtime-approved, surfaced on the dashboard,
 * and aggregated into the ANNEX-128 system matrix. A change to one surface
 * that misses another silently drifts the KPI system. This guard catches that
 * drift before deploy — the KPI-side counterpart of check_raci_integrity.php.
 *
 * P0 findings (block deploy)
 * ──────────────────────────
 *   1. ANNEX-122 governance KPI codes (data-kpi-code) ≠ registry codes.
 *   2. A governance KPI is missing formula / numeric thresholds
 *      (green_point + yellow_point, ordered by direction) / owner_role /
 *      data_source / calculation_status / decision_action.
 *   3. calculation_status=runtime_calculated but the code is absent from
 *      registry.runtime_calculated_metrics or from KpiEngine getCalculator().
 *   4. Duplicate canonical_code among governance KPIs.
 *   5. A legacy alias maps to a code that is not a known metric.
 *   6. A gate metric linked_cdr references a CDR absent from RACI-MASTER-MATRIX,
 *      a gate metric misses gate/CDR/pass-condition metadata, or a G0-G7 gate
 *      has no metric.
 *   8. A gate / proposed metric is missing a counter-metric, or its
 *      thresholds (where present) are non-numeric or wrongly ordered.
 *   9. A counter-metric is a borrowed KPI code instead of a dedicated
 *      anti-gaming definition.
 *   7. A governance KPI is missing a counter_metric, a reward KPI lacks
 *      blocking_conditions, or a staged KPI is reward eligible.
 *  10. Admin/API surfaces drift: required KPI action routes missing or Admin
 *      Console exposes raw JSON editing.
 *
 * P1 findings (warn, do not block)
 * ────────────────────────────────
 *   - A staged_data_contract KPI sits in the executive scorecard but is not
 *     marked reward eligible.
 *   - A lag KPI has no paired_metric (lead pairing missing).
 *   - A percent-unit KPI has min_sample 0 (small-lot noise unguarded).
 *   - A dashboard primary_endpoint is outside the /api/kpi/ namespace.
 *   - JD scorecard registry still uses the legacy fixed weighted model.
 *   - A governance KPI code is not enumerated in ANNEX-128. ANNEX-128 is a
 *     document-usage matrix (only lists codes referenced in scanned docs),
 *     so this is advisory — re-run audit-kpi-system-matrix.php to confirm.
 *
 * Exit code: 0 = clean (warnings allowed), 1 = at least one P0 finding.
 */

$base       = dirname(__DIR__, 2);                // -> repo .../mom
$envPath = static function (string $name, string $default): string {
    $value = getenv($name);
    return is_string($value) && trim($value) !== '' ? $value : $default;
};
$registryFp = $envPath('KPI_INTEGRITY_REGISTRY', $base . '/data/registry/kpi-authority-registry.json');
$annexDir   = $base . '/docs/operations/references/01-ANNEX-100/12-ANNEX-120-Authority-KPI-and-Deputy-Control';
$annex122Fp = $envPath('KPI_INTEGRITY_ANNEX122', $annexDir . '/annex-122-kpi-cascade-dictionary.html');
$annex121Fp = $envPath('KPI_INTEGRITY_CDR_MATRIX', $base . '/docs/system/organization/04-RACI-Authority/raci-master-matrix.html');
$annex128Fp = $envPath('KPI_INTEGRITY_ANNEX128', $annexDir . '/annex-128-kpi-system-matrix-and-document-usage.html');
$engineFp   = $envPath('KPI_INTEGRITY_ENGINE', $base . '/api/services/KpiEngine.php');
$routesFp   = $envPath('KPI_INTEGRITY_ROUTES', $base . '/api/routes/core-routes.php');
$adminJsFp  = $envPath('KPI_INTEGRITY_ADMIN_JS', $base . '/scripts/portal/00o-admin-kpi-registry.js');

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

function metricCode(array $row): string
{
    return strtoupper(trim((string) ($row['canonical_code'] ?? '')));
}

function metricStatus(array $row): string
{
    return trim((string) ($row['calculation_status'] ?? ''));
}

function isPercentMetric(array $row): bool
{
    $unit = strtolower(trim((string) ($row['formula']['unit'] ?? $row['thresholds']['unit'] ?? '')));
    return in_array($unit, ['%', 'percent', 'percentage'], true);
}

function extractEngineCalculatorCodes(string $engineSrc): array
{
    preg_match_all("/public const (METRIC_[A-Z0-9_]+)\\s*=\\s*'([A-Z0-9_]+)'/", $engineSrc, $constMatches, PREG_SET_ORDER);
    $constants = [];
    foreach ($constMatches as $match) {
        $constants[$match[1]] = $match[2];
    }

    $calculatorBody = '';
    if (preg_match('/private function getCalculator\\(.*?return match \\(\\$metricCode\\) \\{(.*?)default =>/s', $engineSrc, $match)) {
        $calculatorBody = $match[1];
    }

    preg_match_all('/self::(METRIC_[A-Z0-9_]+)/', $calculatorBody, $calculatorMatches);
    $codes = [];
    foreach ($calculatorMatches[1] ?? [] as $constName) {
        if (isset($constants[$constName])) {
            $codes[$constants[$constName]] = true;
        }
    }
    return $codes;
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
$engineSrc = readText($engineFp);
$engineCalculatorCodes = extractEngineCalculatorCodes($engineSrc);

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
    $status = metricStatus($row);
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
    if (!in_array($status, ['runtime_calculated', 'manual', 'manual_governed', 'staged_data_contract', 'retired'], true)) {
        $p0[] = "Registry $code: unknown calculation_status '$status'.";
    }
    if ($status === 'runtime_calculated') {
        if (!in_array($code, array_map('strtoupper', $runtimeList), true)) {
            $p0[] = "Registry $code: calculation_status=runtime_calculated but "
                . "code is not listed in runtime_calculated_metrics.";
        }
        if (!isset($engineCalculatorCodes[$code])) {
            $p0[] = "Registry $code: calculation_status=runtime_calculated but "
                . "KpiEngine::getCalculator() does not wire a calculator.";
        }
    }
    if (($row['reward_eligible'] ?? false) === true && $status === 'staged_data_contract') {
        $p0[] = "Registry $code: staged_data_contract must not be reward_eligible.";
    }

    // ── P0.7 — every governance KPI must have a dedicated counter-metric ─────
    // counter_metric is a dedicated definition object {name_vi, name, intent}
    // — the side-effect that appears when the KPI is gamed. It is unique to
    // the KPI by construction (no longer a borrowed headline-KPI code).
    $counter = $row['counter_metric'] ?? null;
    if (!is_array($counter) || trim((string) ($counter['name_vi'] ?? '')) === ''
        || trim((string) ($counter['intent'] ?? '')) === ''
        || trim((string) ($counter['code'] ?? '')) === ''
        || trim((string) ($counter['endpoint'] ?? '')) === '') {
        $p0[] = "Registry $code: counter_metric must be a dedicated definition "
            . "object with code, endpoint, name_vi and intent.";
    } elseif (strtoupper(trim((string) $counter['code'])) !== strtoupper($code) . '-CTR') {
        $p0[] = "Registry $code: counter_metric.code '{$counter['code']}' must be "
            . "the KPI code + '-CTR'.";
    }
    if (($row['reward_eligible'] ?? false) === true) {
        $blockers = $row['blocking_conditions'] ?? null;
        if (!is_array($blockers) || $blockers === []) {
            $p0[] = "Registry $code: reward_eligible=true requires blocking_conditions.";
        }
    }

    // ── P1 — lag without lead pairing ────────────────────────────────────────
    if (($row['lead_or_lag'] ?? '') === 'lag'
        && trim((string) ($row['paired_metric'] ?? '')) === '') {
        $p1[] = "Registry $code: lag KPI has no paired_metric (lead pairing missing).";
    }
    // ── P1 — percent KPI without a minimum sample ────────────────────────────
    $minSample = (int) (($row['formula']['min_sample'] ?? 0));
    if (isPercentMetric($row) && $minSample === 0) {
        $p1[] = "Registry $code: percent-unit KPI has min_sample 0 (small-lot noise unguarded).";
    }
    if ($status === 'manual') {
        $p1[] = "Registry $code: calculation_status uses legacy 'manual'; prefer manual_governed in the next schema update.";
    }
}

// ── P0.3 — every runtime metric must be wired in KpiEngine ───────────────────
foreach ($runtimeList as $rc) {
    $rc = strtoupper(trim($rc));
    if ($rc !== '' && !isset($engineCalculatorCodes[$rc])) {
        $p0[] = "runtime_calculated_metrics lists '$rc' but it does not appear "
            . "in KpiEngine::getCalculator() (no calculator wired).";
    }
}
foreach (array_keys($engineCalculatorCodes) as $engineCode) {
    if (!in_array($engineCode, array_map('strtoupper', $runtimeList), true)) {
        $p0[] = "KpiEngine::getCalculator() supports '$engineCode' but "
            . "runtime_calculated_metrics does not list it.";
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

// ── P0.6 — gate linked_cdr must exist in RACI-MASTER-MATRIX ───────────────────────────
$annex121 = readText($annex121Fp);
preg_match_all('/\b([A-F][0-9]{1,2})\b/', $annex121, $cm);
$cdrCodes = array_unique($cm[1] ?? []);
$gateCoverage = array_fill_keys(['G0', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'], 0);
foreach ($gateMetrics as $g) {
    if (!is_array($g)) {
        continue;
    }
    $local = (string) ($g['local_id'] ?? $g['canonical_code'] ?? '?');
    $gate = strtoupper(trim((string) ($g['gate'] ?? '')));
    if ($gate === '' || ($gate !== 'ALL' && !isset($gateCoverage[$gate]))) {
        $p0[] = "Gate metric $local: missing or invalid gate value.";
    } elseif (isset($gateCoverage[$gate])) {
        $gateCoverage[$gate]++;
    }
    if (!is_array($g['linked_cdr'] ?? null) || $g['linked_cdr'] === []) {
        $p0[] = "Gate metric $local: missing linked_cdr.";
    }
    if (trim((string) ($g['gate_pass_condition'] ?? '')) === '') {
        $p0[] = "Gate metric $local: missing gate_pass_condition.";
    }
    foreach ((array) ($g['linked_cdr'] ?? []) as $cdr) {
        $cdr = strtoupper(trim((string) $cdr));
        if ($cdr !== '' && !in_array($cdr, $cdrCodes, true)) {
            $p0[] = "Gate metric $local: linked_cdr '$cdr' does not exist in RACI-MASTER-MATRIX.";
        }
    }
}
foreach ($gateCoverage as $gate => $count) {
    if ($count === 0) {
        $p0[] = "Gate coverage: $gate has zero gate_control_metrics.";
    }
}

// ── P0.8 — gate + proposed metrics uniform: counter-metric + numeric ─────────
// thresholds, identical to governance KPIs (no metric is left without an
// anti-gaming counter; thresholds, where present, are numeric and ordered).
foreach (['gate_control_metrics' => $gateMetrics, 'proposed_operating_metrics' => $proposed] as $label => $set) {
    foreach ($set as $row) {
        if (!is_array($row)) {
            continue;
        }
        $rc = strtoupper(trim((string) ($row['canonical_code'] ?? '?')));
        $status = metricStatus($row);
        if ($status !== '' && !in_array($status, ['runtime_calculated', 'manual', 'manual_governed', 'staged_data_contract', 'retired'], true)) {
            $p0[] = "$label $rc: unknown calculation_status '$status'.";
        }
        if ($status === 'runtime_calculated' && !isset($engineCalculatorCodes[$rc])) {
            $p0[] = "$label $rc: calculation_status=runtime_calculated but "
                . "KpiEngine::getCalculator() does not wire a calculator.";
        }
        if (($row['reward_eligible'] ?? false) === true && $status === 'staged_data_contract') {
            $p0[] = "$label $rc: staged_data_contract must not be reward_eligible.";
        }
        $counter = $row['counter_metric'] ?? null;
        if (!is_array($counter) || trim((string) ($counter['name_vi'] ?? '')) === ''
            || trim((string) ($counter['intent'] ?? '')) === ''
            || trim((string) ($counter['code'] ?? '')) === ''
            || trim((string) ($counter['endpoint'] ?? '')) === '') {
            $p0[] = "$label $rc: counter_metric must be a dedicated definition "
                . "object with code, endpoint, name_vi and intent.";
        }
        $t = $row['thresholds'] ?? null;
        if (is_array($t) && isset($t['green_point'])) {
            if (!is_numeric($t['green_point']) || !is_numeric($t['yellow_point'] ?? null)) {
                $p0[] = "$label $rc: thresholds present but not numeric.";
            } else {
                $gp = (float) $t['green_point'];
                $yp = (float) $t['yellow_point'];
                $dir = (string) ($t['direction'] ?? 'higher_is_better');
                if (($dir === 'higher_is_better' && $gp < $yp)
                    || ($dir === 'lower_is_better' && $gp > $yp)) {
                    $p0[] = "$label $rc: threshold points not ordered for direction $dir.";
                }
            }
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

// ── P0.9 — counter-metric definitions are dedicated, not borrowed codes ─────
// Each KPI now owns a dedicated counter-metric definition object, so the old
// "counter code reused by two KPIs" failure mode is gone by construction.
// What can still drift is a counter_metric whose name_vi accidentally equals
// a registry KPI code (a borrowed code sneaking back in) — flag that.
foreach ([
    'governance' => $governance,
    'gate'       => $gateMetrics,
    'proposed'   => $proposed,
] as $label => $set) {
    foreach ($set as $row) {
        if (!is_array($row)) {
            continue;
        }
        $counter = $row['counter_metric'] ?? null;
        if (!is_array($counter)) {
            continue;
        }
        $nameVi = trim((string) ($counter['name_vi'] ?? ''));
        if ($nameVi !== '' && isset($knownCodes[strtoupper($nameVi)])) {
            $owner = (string) ($row['canonical_code'] ?? '?');
            $p0[] = "$label $owner: counter_metric.name_vi '$nameVi' is a KPI "
                . "code — it must be a dedicated description, not a borrowed code.";
        }
    }
}

// ── P0.10 — every metric is classified (process + category) ─────────────────
// The KPI Library filters on process and category, so both must be set on
// every governed metric.
$processCatalog = is_array($registry['process_catalog'] ?? null) ? $registry['process_catalog'] : [];
foreach ([
    'governance' => $governance,
    'gate'       => $gateMetrics,
    'proposed'   => $proposed,
] as $label => $set) {
    foreach ($set as $row) {
        if (!is_array($row)) {
            continue;
        }
        $rc = (string) ($row['canonical_code'] ?? '?');
        $process = (string) ($row['process'] ?? '');
        $category = (string) ($row['category'] ?? '');
        if ($process === '') {
            $p0[] = "$label $rc: missing 'process' classification.";
        } elseif ($processCatalog !== [] && !isset($processCatalog[$process])) {
            $p0[] = "$label $rc: process '$process' is not in process_catalog.";
        }
        if ($category === '') {
            $p0[] = "$label $rc: missing 'category' classification.";
        }
    }
}

// ── P0.11 — JD KPI scorecards: active/candidate model, governed, weighted ───
// jd_kpi_scorecards is the SSOT for per-role measures. Under the Track 4 model
// the active set is role-fit, not fixed-count. Every active measure still needs
// a governed metric code and the active weights must sum to 100.
$scorecardRoot = $registry['jd_kpi_scorecards'] ?? null;
$scorecards = is_array($scorecardRoot) ? ($scorecardRoot['roles'] ?? null) : null;
if (is_array($scorecards)) {
    $model = is_array($scorecardRoot) ? trim((string) ($scorecardRoot['model'] ?? '')) : '';
    $isActiveCandidateModel = $model === 'active_candidate_role_scorecard';
    if (!$isActiveCandidateModel) {
        $p1[] = "JD scorecards: registry still uses legacy weighted scorecard model; Track 4 target is active_candidate_role_scorecard with no fixed count.";
    }
    foreach ($scorecards as $roleCode => $card) {
        if (!is_array($card)) {
            continue;
        }
        $items = is_array($card['active_scorecard'] ?? null)
            ? $card['active_scorecard']
            : (is_array($card['scorecard'] ?? null) ? $card['scorecard'] : []);
        if ($items === []) {
            continue; // a Wave-2 role not yet populated — not a blocker
        }
        $recommended = (int) ($card['recommended_active_count'] ?? 0);
        if ($isActiveCandidateModel) {
            $candidateBank = is_array($card['candidate_bank'] ?? null) ? $card['candidate_bank'] : [];
            if ($candidateBank === []) {
                $p1[] = "JD scorecard $roleCode: active_candidate model has no candidate_bank for rotation/backlog governance.";
            }
            if ($recommended > 0 && count($items) > $recommended) {
                $p1[] = "JD scorecard $roleCode: active scorecard has " . count($items)
                    . " items, above recommended_active_count=$recommended.";
            }
        } elseif (count($items) === 5) {
            $p1[] = "JD scorecard $roleCode: active scorecard has exactly 5 items; verify this is role-fit and not a fixed-count assumption.";
        }
        if (count($items) > 6) {
            $p1[] = "JD scorecard $roleCode: active scorecard has " . count($items) . " items; exceeds the recommended maximum without Track 4 rationale.";
        }
        $sum = 0;
        foreach ($items as $it) {
            $kc = strtoupper(trim((string) ($it['kpi_code'] ?? ($it['mapped_canonical_metric'] ?? ''))));
            $w  = (int) ($it['weight'] ?? 0);
            $sum += $w;
            if ($kc === '' || !isset($knownCodes[$kc])) {
                $p0[] = "JD scorecard $roleCode: kpi_code '$kc' is not a governed metric.";
            }
            if ($w <= 0) {
                $p0[] = "JD scorecard $roleCode: kpi_code '$kc' has a non-positive weight.";
            }
        }
        if ($sum !== 100) {
            $p0[] = "JD scorecard $roleCode: weights sum to $sum, must be 100.";
        }
    }
}

// ── P0.12 — KPI API/Admin surfaces stay structured and complete ─────────────
$routesSrc = readText($routesFp);
foreach ([
    'admin_kpi_registry_get',
    'admin_kpi_registry_save',
    'kpi_catalog',
    'kpi_get',
    'kpi_trend',
    'kpi_alerts',
    'kpi_threshold_badges',
    'kpi_jd_scorecards',
    'kpi_input_save',
    'kpi_input_list',
] as $routeKey) {
    if (!str_contains($routesSrc, "'" . $routeKey . "'") && !str_contains($routesSrc, '"' . $routeKey . '"')) {
        $p0[] = "Routes: missing KPI action route '$routeKey'.";
    }
}

if (preg_match('/CONSOLE_EDITABLE_FIELDS\\s*=\\s*\\[(.*?)\\];/s', $engineSrc, $editableMatch)) {
    $forbiddenEditable = ['canonical_code', 'formula', 'data_source', 'calculation_status', 'metric_type'];
    foreach ($forbiddenEditable as $field) {
        if (preg_match("/['\"]" . preg_quote($field, '/') . "['\"]/", $editableMatch[1])) {
            $p0[] = "Admin Console: forbidden structural field '$field' is listed in CONSOLE_EDITABLE_FIELDS.";
        }
    }
}

$adminJs = readText($adminJsFp);
if (preg_match('/JSON\\.(parse|stringify)|kc-json|<textarea[^>]+json/i', $adminJs)) {
    $p0[] = "Admin Console: raw JSON editing pattern detected in normal KPI Console path.";
}

// ── P0.13 — MCS-EXT-1 extension consistency ────────────────────────────────
// When extension fields are present on a metric, they must reference values
// declared in registry.metric_control_schema_extension. Legacy metrics with
// no extension fields are unaffected (backward-compat: empty == not adopted).
$mcsExt = is_array($registry['metric_control_schema_extension'] ?? null)
    ? $registry['metric_control_schema_extension'] : [];
if ($mcsExt !== []) {
    $allowedSubtype  = (array) ($mcsExt['metric_subtypes'] ?? []);
    $allowedIntent   = (array) ($mcsExt['control_intent'] ?? []);
    $allowedMeasure  = (array) ($mcsExt['measurement_data_type'] ?? []);
    $allowedScoring  = (array) ($mcsExt['scoring_model'] ?? []);
    $allowedEvalUse  = (array) ($mcsExt['evaluation_use'] ?? []);
    $allowedReward   = (array) ($mcsExt['reward_mode'] ?? []);
    $allowedLifecyc  = (array) ($mcsExt['lifecycle_status'] ?? []);
    $scoringBySub    = is_array($mcsExt['scoring_model_by_metric_subtype'] ?? null)
        ? $mcsExt['scoring_model_by_metric_subtype'] : [];
    $rewardRequireRt = ['team_reward_candidate', 'role_review_input', 'bonus_pool_candidate'];

    // Build code universe so paired_metric references can be validated.
    $allCodes = [];
    foreach ([$governance, $gateMetrics, $proposed] as $set) {
        foreach ($set as $row) {
            $c = is_array($row) ? (string) ($row['canonical_code'] ?? '') : '';
            if ($c !== '') {
                $allCodes[strtoupper($c)] = true;
            }
        }
    }
    foreach ((array) $runtimeList as $c) {
        $allCodes[strtoupper((string) $c)] = true;
    }

    $checkMcs = static function (array $row, string $label) use (
        $allowedSubtype, $allowedIntent, $allowedMeasure, $allowedScoring,
        $allowedEvalUse, $allowedReward, $allowedLifecyc, $scoringBySub,
        $rewardRequireRt, $allCodes, &$p0, &$p1
    ): void {
        $rc      = (string) ($row['canonical_code'] ?? '');
        $subtype = (string) ($row['metric_subtype'] ?? '');
        $intent  = (string) ($row['control_intent'] ?? '');
        $measure = (string) ($row['measurement_data_type'] ?? '');
        $scoring = (string) ($row['scoring_model_detail'] ?? '');
        $evalUse = (string) ($row['evaluation_use'] ?? '');
        $reward  = (string) ($row['reward_mode'] ?? '');
        $lifecyc = (string) ($row['lifecycle_status'] ?? '');
        $paired  = (string) ($row['paired_metric'] ?? '');
        $calcSt  = (string) ($row['calculation_status'] ?? '');
        $sample  = $row['sample_policy'] ?? null;

        if ($subtype !== '' && !in_array($subtype, $allowedSubtype, true)) {
            $p0[] = "$label $rc: metric_subtype '$subtype' not in MCS-EXT-1 metric_subtypes.";
        }
        if ($intent !== '' && !in_array($intent, $allowedIntent, true)) {
            $p0[] = "$label $rc: control_intent '$intent' not in MCS-EXT-1 control_intent.";
        }
        if ($measure !== '' && !in_array($measure, $allowedMeasure, true)) {
            $p0[] = "$label $rc: measurement_data_type '$measure' not in MCS-EXT-1.";
        }
        if ($scoring !== '' && !in_array($scoring, $allowedScoring, true)) {
            $p0[] = "$label $rc: scoring_model_detail '$scoring' not in MCS-EXT-1 scoring_model.";
        }
        if ($evalUse !== '' && !in_array($evalUse, $allowedEvalUse, true)) {
            $p0[] = "$label $rc: evaluation_use '$evalUse' not in MCS-EXT-1.";
        }
        if ($reward !== '' && !in_array($reward, $allowedReward, true)) {
            $p0[] = "$label $rc: reward_mode '$reward' not in MCS-EXT-1.";
        }
        if ($lifecyc !== '' && !in_array($lifecyc, $allowedLifecyc, true)) {
            $p0[] = "$label $rc: lifecycle_status '$lifecyc' not in MCS-EXT-1.";
        }
        // subtype → scoring compatibility (when both set)
        if ($subtype !== '' && $scoring !== '' && isset($scoringBySub[$subtype])
            && !in_array($scoring, $scoringBySub[$subtype], true)) {
            $p0[] = "$label $rc: scoring_model_detail '$scoring' incompatible with metric_subtype '$subtype'. Allowed: "
                . implode(', ', $scoringBySub[$subtype]) . '.';
        }
        // reward_mode (runtime-only) gate — parallels existing P0.7.
        if ($reward !== '' && in_array($reward, $rewardRequireRt, true) && $calcSt !== '' && $calcSt !== 'runtime_calculated') {
            $p0[] = "$label $rc: reward_mode '$reward' requires calculation_status=runtime_calculated (got '$calcSt').";
        }
        // spc_capability_metric requires sample_policy.
        if ($subtype === 'spc_capability_metric') {
            if (!is_array($sample) || !isset($sample['min_n_score']) || !is_numeric($sample['min_n_score'])) {
                $p0[] = "$label $rc: spc_capability_metric requires sample_policy.min_n_score (numeric).";
            }
        }
        // paired_metric must resolve.
        if ($paired !== '' && !isset($allCodes[strtoupper($paired)])) {
            $p1[] = "$label $rc: paired_metric '$paired' does not resolve to any known canonical_code.";
        }
        // P1 — subtype set but control_intent missing: weak governance.
        if ($subtype !== '' && $intent === '') {
            $p1[] = "$label $rc: metric_subtype is set but control_intent is empty.";
        }
    };

    foreach ($governance as $row) {
        if (is_array($row)) {
            $checkMcs($row, 'Registry');
        }
    }
    foreach ($gateMetrics as $row) {
        if (is_array($row)) {
            $checkMcs($row, 'Gate');
        }
    }
    foreach ($proposed as $row) {
        if (is_array($row)) {
            $checkMcs($row, 'Proposed');
        }
    }
}

// ── Report ───────────────────────────────────────────────────────────────────
$statusKeys = ['runtime_calculated', 'staged_data_contract', 'manual', 'manual_governed', 'retired'];
$byStatus = array_fill_keys($statusKeys, 0);
foreach ($governance as $row) {
    $s = is_array($row) ? (string) ($row['calculation_status'] ?? '') : '';
    if (isset($byStatus[$s])) {
        $byStatus[$s]++;
    }
}
$allByStatus = array_fill_keys($statusKeys, 0);
foreach ([$governance, $gateMetrics, $proposed] as $set) {
    foreach ($set as $row) {
        $s = is_array($row) ? (string) ($row['calculation_status'] ?? $row['status'] ?? '') : '';
        if (isset($allByStatus[$s])) {
            $allByStatus[$s]++;
        }
    }
}
$officialActive = count(array_filter($scorecard, static fn(string $code): bool => $code !== ''));
$jdRolesWithActive = 0;
if (is_array($scorecards)) {
    foreach ($scorecards as $card) {
        if (!is_array($card)) {
            continue;
        }
        $items = is_array($card['scorecard'] ?? null) ? $card['scorecard'] : [];
        if ($items !== []) {
            $jdRolesWithActive++;
        }
    }
}

echo "KPI integrity check\n";
echo "  registry: " . (string) ($registry['version'] ?? 'unknown')
    . " · schema_version " . (int) ($registry['schema_version'] ?? 0) . "\n";
echo "  governance KPIs: " . count($govCodes)
    . " (runtime {$byStatus['runtime_calculated']}"
    . " · staged {$byStatus['staged_data_contract']}"
    . " · manual {$byStatus['manual']}"
    . " · manual_governed {$byStatus['manual_governed']}"
    . " · retired {$byStatus['retired']})\n";
echo "  runtime_calculated_metrics: " . count($runtimeList)
    . " · gate metrics: " . count($gateMetrics)
    . " · legacy aliases: " . count($aliases) . "\n\n";
echo "  all metric statuses: runtime {$allByStatus['runtime_calculated']}"
    . " · staged {$allByStatus['staged_data_contract']}"
    . " · manual {$allByStatus['manual']}"
    . " · manual_governed {$allByStatus['manual_governed']}"
    . " · retired {$allByStatus['retired']}\n";
echo "  official active scorecard items: {$officialActive}\n";
echo "  gate coverage: ";
$coverageParts = [];
foreach ($gateCoverage as $gate => $count) {
    $coverageParts[] = "$gate=$count";
}
echo implode(' · ', $coverageParts) . "\n";
echo "  JD roles with active scorecards: {$jdRolesWithActive}\n\n";

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
