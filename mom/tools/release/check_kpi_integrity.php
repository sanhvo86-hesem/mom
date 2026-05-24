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
 *  11. P0.7.1 (P07 fair-reward) reward_mode in (bonus_pool_candidate,
 *      team_reward_candidate, role_review_input) without an
 *      attribution_rule that has enough length and contains a breakdown
 *      semantics token (split/attribute/owner/contributor/tách/phân/…).
 *  12. P0.7.2 (P07 fair-reward) reward-eligible rate metric without
 *      formula.min_sample >= 1. Rate metric = unit in %/percent/percentage/
 *      ppm/dppm/rate/ratio/per_million/parts_per_million.
 *  13. P0.7.4 (P07 fair-reward) JD scorecard item whose resolved canonical
 *      metric is staged_data_contract AND the scorecard item carries
 *      contributes_to_reward=true OR the metric scoring_status is
 *      active_runtime — block before a non-runtime metric drives reward.
 *  14. P0.7.5 (P07 fair-reward) governance metric with reward_mode in
 *      (bonus_pool_candidate, team_reward_candidate, role_review_input)
 *      without a non-empty exclude_conditions array — owner cannot
 *      otherwise be protected from uncontrollable causes.
 *  15. P0.7.6 (P07 fair-reward) JD scorecard item contributes_to_reward=true
 *      that resolves to a metric whose reward_mode is not_rewardable or is
 *      outside the reward-eligible set — closes the future loophole where
 *      a role measure flips a metric to reward by side-channel.
 *  16. P0.7.7 (P07 fair-reward) performance_governance_policy.discipline_scope
 *      .whitelist token does not match any blocking_condition_registry
 *      condition_id — discipline must cite a registered condition.
 *
 * P1 findings (warn, do not block)
 * ────────────────────────────────
 *   - A staged_data_contract KPI sits in the executive scorecard but is not
 *     marked reward eligible.
 *   - A lag KPI has no paired_metric (lead pairing missing).
 *   - A rate-unit KPI has min_sample 0 (small-lot noise unguarded).
 *   - A dashboard primary_endpoint is outside the /api/kpi/ namespace.
 *   - JD scorecard registry still uses the legacy fixed weighted model.
 *   - A governance KPI code is not enumerated in ANNEX-128. ANNEX-128 is a
 *     document-usage matrix (only lists codes referenced in scanned docs),
 *     so this is advisory — re-run audit-kpi-system-matrix.php to confirm.
 *   - P1.P07 (fair-reward) JD scorecard mixes a measure whose registry
 *     direction is lower_is_better with a measure whose direction is
 *     higher_is_better and at least one side has no counter_code — risk of
 *     pulling the role in opposing directions.
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

function isRateMetric(array $row): bool
{
    $unit = strtolower(trim((string) ($row['formula']['unit'] ?? $row['thresholds']['unit'] ?? '')));
    // Rate-style units that all behave statistically like proportions /
    // ratios — they share the small-N noise problem that the min_sample
    // guardrail protects against. ppm/dppm/per_million are parts-per-million
    // forms of percent; rate/ratio cover engineered ratios such as
    // SETUP_RATIO. Extending to ppm catches the COMPLAINT_RATE class that
    // previously bypassed the P0.7.2 sample-size guard.
    return in_array($unit, [
        '%', 'percent', 'percentage',
        'ppm', 'dppm',
        'rate', 'ratio',
        'per_million', 'parts_per_million',
    ], true);
}

/**
 * Backward-compat alias kept for callers that imported the older name.
 * @deprecated use isRateMetric()
 */
function isPercentMetric(array $row): bool
{
    return isRateMetric($row);
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

// ── Build a metric-object index across all 4 sections ───────────────────────
// Used by JD scorecard rules to resolve a kpi_code back to its registry row
// (reward_mode, calculation_status, direction, etc.). First match wins —
// canonical_code is unique across sections.
$metricIndex = [];
foreach ([$governance, $gateMetrics, $proposed, $dashboard] as $set) {
    foreach ($set as $row) {
        if (!is_array($row)) {
            continue;
        }
        $rc = strtoupper(trim((string) ($row['canonical_code'] ?? '')));
        if ($rc !== '' && !isset($metricIndex[$rc])) {
            $metricIndex[$rc] = $row;
        }
    }
}
$resolveMetricDirection = static function (array $row): string {
    // Prefer thresholds.direction (the runtime RAG rule axis); fall back to
    // formula.direction for older rows. Empty when no direction is set.
    $dir = strtolower(trim((string) ($row['thresholds']['direction']
        ?? $row['formula']['direction']
        ?? '')));
    return $dir;
};

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

    // ── P0.7.1 — reward-eligible metric MUST have a useful attribution_rule ─
    // (P07 hardening) Per performance_governance_policy.reward_rules rule 5,
    // any metric whose reward_mode allocates monetary or formal-review
    // recognition (bonus_pool_candidate / team_reward_candidate /
    // role_review_input) MUST have an attribution_rule string that does
    // actual splitting — i.e. is long enough to describe a breakdown AND
    // contains at least one breakdown-semantics token. A one-word
    // "applicable" string passed the old non-empty check but offered no
    // real owner-vs-contributor split.
    $rewardModeP07     = strtolower(trim((string) ($row['reward_mode'] ?? '')));
    $rewardEligibleSet = ['bonus_pool_candidate', 'team_reward_candidate', 'role_review_input'];
    $breakdownTokens   = ['tách', 'split', 'attribute', 'breakdown', 'owner', 'contributor', 'phân', 'do', 'gây', 'nguyên nhân'];
    if (in_array($rewardModeP07, $rewardEligibleSet, true)) {
        $attribution = trim((string) ($row['attribution_rule'] ?? ''));
        if ($attribution === '') {
            $p0[] = "P0.7.1 Registry $code: reward_mode '$rewardModeP07' requires "
                . "non-empty attribution_rule (P07 reward-rules rule 5).";
        } else {
            $attrLowered  = mb_strtolower($attribution, 'UTF-8');
            $hasBreakdown = false;
            foreach ($breakdownTokens as $tok) {
                if (mb_strpos($attrLowered, $tok) !== false) {
                    $hasBreakdown = true;
                    break;
                }
            }
            if (mb_strlen($attribution, 'UTF-8') < 40 || !$hasBreakdown) {
                $p0[] = "P0.7.1 Registry $code: attribution_rule too short or missing "
                    . "breakdown semantics (need >=40 chars AND one of: "
                    . implode(', ', $breakdownTokens) . ").";
            }
        }
    }

    // ── P0.7.2 — reward-eligible rate metric MUST have min_sample ≥ 1 ──────
    // (P07 hardening) Per reward_rules rule 5 + anti-gaming risk register §2.3:
    // a rate KPI (percent, ppm, dppm, ratio, …) cannot drive bonus or
    // role-review with zero or missing min_sample because small-N noise
    // will swing the score. isRateMetric() covers all rate-style units.
    if (in_array($rewardModeP07, $rewardEligibleSet, true) && isRateMetric($row)) {
        $msRaw    = $row['formula']['min_sample'] ?? null;
        $msIsInt  = is_int($msRaw) || (is_string($msRaw) && ctype_digit($msRaw));
        $msIntVal = $msIsInt ? (int) $msRaw : 0;
        if (!$msIsInt || $msIntVal < 1) {
            $p0[] = "P0.7.2 Registry $code: reward_mode '$rewardModeP07' on a rate-style metric "
                . "requires formula.min_sample as integer >= 1 (got " . var_export($msRaw, true) . ").";
        }
    }

    // ── P0.7.5 — reward-eligible metric MUST have non-empty exclude_conditions
    // (P07 hardening) Per reward_rules rule 5(a)+(b) and
    // attribution_rule_template.exclude_conditions_defaults — without an
    // exclude_conditions array the owner has no documented escape from
    // verifiable uncontrollable causes (force majeure, customer change after
    // baseline lock, supplier delay with logged PO due-date change, …). The
    // attribution_rule splits cause; exclude_conditions REMOVES cause from
    // the score. Both are needed for a fair reward decision.
    if (in_array($rewardModeP07, $rewardEligibleSet, true)) {
        $excludeConditions = $row['exclude_conditions'] ?? null;
        if (!is_array($excludeConditions) || $excludeConditions === []) {
            $p0[] = "P0.7.5 Registry $code: reward_mode '$rewardModeP07' requires "
                . "non-empty exclude_conditions array (defaults in "
                . "performance_governance_policy.attribution_rule_template).";
        }
    }

    // ── P1 — lag without lead pairing ────────────────────────────────────────
    if (($row['lead_or_lag'] ?? '') === 'lag'
        && trim((string) ($row['paired_metric'] ?? '')) === '') {
        $p1[] = "Registry $code: lag KPI has no paired_metric (lead pairing missing).";
    }
    // ── P1 — rate KPI without a minimum sample ───────────────────────────────
    $minSample = (int) (($row['formula']['min_sample'] ?? 0));
    if (isRateMetric($row) && $minSample === 0) {
        $p1[] = "Registry $code: rate-unit KPI has min_sample 0 (small-lot noise unguarded).";
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

// ── P0.6.1 — every gate metric must declare a decision_action ───────────────
// (P06 hardening) hold_release_rule narrates the policy; decision_action is a
// short, copy-paste imperative the gate owner can act on. Both must exist —
// running a gate by narrative only allows "feel" pass/fail.
foreach ($gateMetrics as $g) {
    if (!is_array($g)) {
        continue;
    }
    $local = (string) ($g['local_id'] ?? $g['canonical_code'] ?? '?');
    if (trim((string) ($g['decision_action'] ?? '')) === '') {
        $p0[] = "Gate metric $local: missing 'decision_action' (short hold/release/escalation phrase distinct from hold_release_rule).";
    }
    if (trim((string) ($g['hold_release_rule'] ?? '')) === ''
        && trim((string) ($g['decision_action'] ?? '')) === '') {
        $p0[] = "Gate metric $local: missing both decision_action and hold_release_rule — no hold/release policy at all.";
    }
}

// ── P0.6.2 — every gate metric must have numeric thresholds ─────────────────
// (P06 hardening) gate_pass_condition text often hides the threshold inside
// Vietnamese prose. Numeric thresholds.{green_point,yellow_point,direction}
// is the machine-readable pass rule the dashboard / RAG roll-up consumes.
$gateThresholdSkip = []; // future-proof: codes legitimately without numeric thresholds
foreach ($gateMetrics as $g) {
    if (!is_array($g)) {
        continue;
    }
    $local = (string) ($g['local_id'] ?? $g['canonical_code'] ?? '?');
    $code = strtoupper(trim((string) ($g['canonical_code'] ?? '')));
    if (in_array($code, $gateThresholdSkip, true)) {
        continue;
    }
    $t = $g['thresholds'] ?? null;
    if (!is_array($t)
        || !is_numeric($t['green_point'] ?? null)
        || !is_numeric($t['yellow_point'] ?? null)
        || trim((string) ($t['direction'] ?? '')) === '') {
        $p0[] = "Gate metric $local: thresholds.{green_point,yellow_point,direction} required (numeric pass rule, not prose).";
    }
}

// ── P0.6.3 — every gate metric must have owner + evidence ───────────────────
// (P06 hardening) — overlap with §10 process/category, but explicit per
// spec §9: gate metric missing owner/evidence/counter is a P0.
foreach ($gateMetrics as $g) {
    if (!is_array($g)) {
        continue;
    }
    $local = (string) ($g['local_id'] ?? $g['canonical_code'] ?? '?');
    if (trim((string) ($g['owner_role'] ?? '')) === '') {
        $p0[] = "Gate metric $local: missing 'owner_role'.";
    }
    // evidence_source OR evidence (legacy) accepted.
    $ev = trim((string) ($g['evidence_source'] ?? $g['evidence'] ?? ''));
    if ($ev === '') {
        $p0[] = "Gate metric $local: missing evidence (evidence_source or evidence).";
    }
}

// ── P0.6.4 — CUSTOMER_ESCAPE_NOTIFICATION_LT customer-escape spec ──────────
// (P06 hardening per spec §8) start_clock_at must be detection_time (not
// NCR creation), containment_required must be true, and the metric must
// own at least one additional counter (late/suppressed logging) on top of
// the singular counter_metric (premature notification).
foreach ($gateMetrics as $g) {
    if (!is_array($g)) {
        continue;
    }
    $code = strtoupper(trim((string) ($g['canonical_code'] ?? '')));
    if ($code !== 'CUSTOMER_ESCAPE_NOTIFICATION_LT') {
        continue;
    }
    $local = (string) ($g['local_id'] ?? $code);
    if (strtolower(trim((string) ($g['start_clock_at'] ?? ''))) !== 'detection_time') {
        $p0[] = "Gate metric $local: CUSTOMER_ESCAPE_NOTIFICATION_LT.start_clock_at must be 'detection_time' (spec §8 — clock starts at QA detection, not NCR creation).";
    }
    if (($g['containment_required'] ?? null) !== true) {
        $p0[] = "Gate metric $local: CUSTOMER_ESCAPE_NOTIFICATION_LT.containment_required must be true (notify-without-containment is premature).";
    }
    $extra = $g['additional_counter_metrics'] ?? null;
    if (!is_array($extra) || $extra === []) {
        $p0[] = "Gate metric $local: CUSTOMER_ESCAPE_NOTIFICATION_LT must declare additional_counter_metrics (late/suppressed escape logging — dual counter per spec §8).";
    } else {
        foreach ($extra as $idx => $cm) {
            if (!is_array($cm)
                || trim((string) ($cm['code'] ?? '')) === ''
                || trim((string) ($cm['endpoint'] ?? '')) === ''
                || trim((string) ($cm['name_vi'] ?? '')) === ''
                || trim((string) ($cm['intent'] ?? '')) === '') {
                $p0[] = "Gate metric $local: additional_counter_metrics[$idx] must have code+endpoint+name_vi+intent.";
            }
        }
    }
    $esc = $g['escalation'] ?? null;
    if (!is_array($esc)
        || !in_array('QA', (array) ($esc['immediate_to'] ?? []), true)
        || !in_array('CEO', (array) ($esc['immediate_to'] ?? []), true)) {
        $p0[] = "Gate metric $local: CUSTOMER_ESCAPE_NOTIFICATION_LT.escalation.immediate_to must include both QA and CEO (spec §8).";
    }
}

// ── P0.6.5 — gate_control must link at least one metric to CDR D11 ──────────
// (P06 hardening) Spec §8 requires customer-escape notification governance.
// If no gate_control_metric references D11, the registry has shape-valid
// CUSTOMER_ESCAPE_NOTIFICATION_LT entries but lost the CDR binding — gate
// integrity dies silently. Defence-in-depth check that the binding survives.
$hasD11 = false;
foreach ($gateMetrics as $g) {
    if (!is_array($g)) {
        continue;
    }
    $cdrs = array_map('strtoupper', array_map('strval', (array) ($g['linked_cdr'] ?? [])));
    if (in_array('D11', $cdrs, true)) {
        $hasD11 = true;
        break;
    }
}
if (!$hasD11) {
    $p0[] = "P0.6.5: no gate_control_metric links to CDR D11 (customer escape notification) — spec §8 binding lost.";
}

// ── P1 — gate metric staged for a critical CDR without manual fallback ──────
// (P06 hardening per spec §9) — critical CDRs need a manual evidence path so
// a gate is never blocked waiting for the data contract to ship. Critical
// list anchored on RACI §8.1 P0/P1: D1, D2, D7, D8, D11, D12. A staged
// gate metric on these CDRs without manual_input_form / evidence_form
// (or any explicit manual fallback marker) is a P1 warning.
$criticalCdrs = ['D1', 'D2', 'D7', 'D8', 'D11', 'D12'];
foreach ($gateMetrics as $g) {
    if (!is_array($g)) {
        continue;
    }
    $local = (string) ($g['local_id'] ?? $g['canonical_code'] ?? '?');
    $status = metricStatus($g);
    if ($status !== 'staged_data_contract') {
        continue;
    }
    $cdrs = array_map('strtoupper', array_map('strval', (array) ($g['linked_cdr'] ?? [])));
    $isCritical = array_intersect($cdrs, $criticalCdrs) !== [];
    if (!$isCritical) {
        continue;
    }
    $hasFallback = !empty($g['manual_input_form'])
        || !empty($g['manual_fallback'])
        || !empty($g['evidence_form'])
        // evidence_source string that names an FRM-* form is treated as fallback.
        || (is_string($g['evidence_source'] ?? null) && preg_match('/FRM-\d/i', (string) $g['evidence_source']));
    if (!$hasFallback) {
        $p1[] = "Gate metric $local: staged_data_contract on critical CDR (" . implode(',', array_intersect($cdrs, $criticalCdrs)) . ") with no manual_input_form / evidence_form / FRM evidence fallback.";
    }
}

// ── P1 — owner_vs_steward_split_without_note ────────────────────────────────
// (P06 hardening) When owner_role and data_stewardship_role differ without
// an owner_alignment_note, the data-decision split is undocumented. This is
// the *steward* split rule; the *CDR accountability* split rule below is the
// real spec §9 / §5 intent (owner vs CDR-A from RACI master matrix).
foreach ($gateMetrics as $g) {
    if (!is_array($g)) {
        continue;
    }
    $local = (string) ($g['local_id'] ?? $g['canonical_code'] ?? '?');
    $owner = strtoupper(trim((string) ($g['owner_role'] ?? '')));
    $steward = strtoupper(trim((string) ($g['data_stewardship_role'] ?? '')));
    if ($owner === '' || $steward === '' || $owner === $steward) {
        continue;
    }
    if (trim((string) ($g['owner_alignment_note'] ?? '')) === '') {
        $p1[] = "Gate metric $local: owner_vs_steward_split_without_note — owner_role ($owner) ≠ data_stewardship_role ($steward) with no owner_alignment_note.";
    }
}

// ── Parse RACI master matrix → CDR → A-role mapping ─────────────────────────
// (P06 hardening per spec §9 / §5) — extract structured mapping from the HTML
// table: column headers (line near "Hoạt động") give role-code order; each
// gate row links a CDR via authority-matrix.html#cdr-XX. The row's first cell
// with class raci-A names the accountable role. Falls back to advisory warning
// if parsing yields nothing — never silent pass.
$cdrAccountableMap = [];           // ['D11' => 'CS', ...]
$raciParseWarning = null;
$raciHtml = $annex121;             // already loaded as $annex121
if (preg_match('/<thead><tr>\s*<th><div class="gc-stack"><span>G<\/span><hr><span>CDR<\/span><\/div><\/th><th>Hoạt động<\/th>(.*?)<\/tr><\/thead>/s', $raciHtml, $headMatch)) {
    // Extract role codes in column order from anchor text.
    preg_match_all('/<th>\s*<a[^>]*>([A-Z]+)<\/a>\s*<\/th>/', $headMatch[1], $rh);
    $roleColumns = $rh[1] ?? [];
    // Drop trailing "FRM / SOP" column if it slipped in (it has no anchor so it won't).
    if ($roleColumns === []) {
        $raciParseWarning = 'RACI parse: header row matched but no role columns extracted.';
    } else {
        // Iterate matrix rows.
        preg_match_all('/<tr>\s*<td><div class="gc-stack">.*?<a href="authority-matrix\.html#cdr-([A-F][0-9]{1,2})">[A-F][0-9]{1,2}<\/a><\/div><\/td>(.*?)<\/tr>/s', $raciHtml, $rowMatches, PREG_SET_ORDER);
        if ($rowMatches === []) {
            $raciParseWarning = 'RACI parse: no CDR rows matched in master matrix table.';
        }
        foreach ($rowMatches as $row) {
            $cdr = $row[1];
            // Skip activity description cell, then iterate role cells.
            // Match each <td> in order; column index 0 = activity, columns 1..N = roles.
            preg_match_all('/<td(?:\s+class="raci-cell\s+raci-([ARCI])")?[^>]*>.*?<\/td>/s', $row[2], $cellMatches);
            $cellClasses = $cellMatches[1] ?? [];
            // First cell is "Hoạt động" (activity description) — no class.
            // Subsequent cells correspond to $roleColumns in order, with a trailing FRM/SOP cell.
            // So role cells = cellClasses[1..count($roleColumns)].
            for ($i = 0; $i < count($roleColumns); $i++) {
                $cellIdx = $i + 1; // skip activity column
                $cls = $cellClasses[$cellIdx] ?? '';
                if ($cls === 'A') {
                    // First A found wins (CDR has exactly one A by RACI convention).
                    if (!isset($cdrAccountableMap[$cdr])) {
                        $cdrAccountableMap[$cdr] = $roleColumns[$i];
                    }
                    break;
                }
            }
        }
        if ($cdrAccountableMap === []) {
            $raciParseWarning = 'RACI parse: rows matched but no A-role extracted from any row.';
        }
    }
} else {
    $raciParseWarning = 'RACI parse: header row pattern did not match raci-master-matrix.html.';
}
if ($raciParseWarning !== null) {
    $p1[] = "$raciParseWarning Owner-vs-CDR-A guard fell back to advisory mode.";
}

// ── P1 — gate metric owner_role ≠ CDR-A (real spec §9 intent) ───────────────
// (P06 hardening) For each gate metric, foreach linked_cdr extract A-role from
// the parsed RACI matrix. If owner_role differs from cdr_accountable_role AND
// the registry row has no owner_alignment_note explaining the split, P1 warn.
// Prefer explicit 'cdr_accountable_role' field on the row when present
// (overrides parsed map — useful when the row documents a deliberate choice).
if ($cdrAccountableMap !== []) {
    foreach ($gateMetrics as $g) {
        if (!is_array($g)) {
            continue;
        }
        $local = (string) ($g['local_id'] ?? $g['canonical_code'] ?? '?');
        $owner = strtoupper(trim((string) ($g['owner_role'] ?? '')));
        if ($owner === '') {
            continue;
        }
        $hasNote = trim((string) ($g['owner_alignment_note'] ?? '')) !== '';
        $explicitA = strtoupper(trim((string) ($g['cdr_accountable_role'] ?? '')));
        $cdrs = array_map('strtoupper', array_map('strval', (array) ($g['linked_cdr'] ?? [])));
        foreach ($cdrs as $cdr) {
            $aRole = $explicitA !== '' ? $explicitA : strtoupper((string) ($cdrAccountableMap[$cdr] ?? ''));
            if ($aRole === '' || $aRole === $owner) {
                continue;
            }
            if (!$hasNote) {
                $p1[] = "Gate metric $local: owner_role ($owner) ≠ CDR-A ($aRole for $cdr per RACI master matrix) and no owner_alignment_note explains the split.";
                break; // one warning per metric is enough
            }
        }
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
        $rewardEligibleModes = ['bonus_pool_candidate', 'team_reward_candidate', 'role_review_input'];
        // P1.P07 direction-conflict tracker: per-direction list of items
        // whose resolved metric direction is set. We use the registry's
        // 'direction' field (lower_is_better / higher_is_better) — not a
        // brittle name regex. SETUP_FIRST_PASS, for instance, is in fact a
        // higher_is_better quality metric, not a speed metric, so the old
        // name-based heuristic mis-classified it.
        $itemsByDirection = ['lower_is_better' => [], 'higher_is_better' => []];

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

            $resolvedMetric = $metricIndex[$kc] ?? null;

            // ── P0.7.4 — JD scorecard item that contributes to reward MUST
            // resolve to a runtime metric, not a staged data contract.
            // (P07 hardening, rescoped) The earlier shape of this rule
            // checked scorecard_contributes_to_reward against
            // scorecard_scoring_status; in practice all 152 scorecard items
            // carry contributes_to_reward=false today and that field never
            // fired. The real risk per reward_rules rule 5(d) is that the
            // resolved canonical metric is staged_data_contract AND either
            // the scorecard item already flags itself reward-eligible OR
            // the metric's own scoring_status is active_runtime (it is
            // being driven into the reward pipeline). Either of those, with
            // a staged metric, must block — only an explicit
            // manual_governed_override unlocks it.
            $contrib       = ($it['scorecard_contributes_to_reward'] ?? false) === true;
            $itemScoringSt = strtolower(trim((string) ($it['scorecard_scoring_status'] ?? '')));
            $metricCalcSt  = is_array($resolvedMetric)
                ? strtolower(trim((string) ($resolvedMetric['calculation_status'] ?? '')))
                : '';
            if ($metricCalcSt === 'staged_data_contract'
                && ($contrib || $itemScoringSt === 'active_runtime')) {
                $hasManualOverride = ($it['manual_governed_override'] ?? false) === true
                    || strtolower(trim((string) ($it['override_status'] ?? ''))) === 'manual_governed';
                if (!$hasManualOverride) {
                    $p0[] = "P0.7.4 JD scorecard $roleCode item $kc: resolved metric is staged_data_contract "
                        . "but scorecard item flags contributes_to_reward=" . ($contrib ? 'true' : 'false')
                        . " / scorecard_scoring_status='$itemScoringSt' — needs manual_governed_override.";
                }
            }

            // ── P0.7.6 — JD scorecard reward-eligible item must resolve to a
            // metric whose reward_mode is itself reward-eligible. Future
            // loophole guard: prevents an editor from flipping
            // scorecard_contributes_to_reward=true on a metric whose own
            // reward_mode is not_rewardable, blocker_only, recognition_only,
            // certification_gate, etc. Today this fires 0 times (all
            // contributes_to_reward are false) — by design, the rule is
            // here so the day someone enables reward for a JD item, the
            // guard catches it before deploy.
            if ($contrib && is_array($resolvedMetric)) {
                $metricRewardMode = strtolower(trim((string) ($resolvedMetric['reward_mode'] ?? '')));
                if ($metricRewardMode === 'not_rewardable') {
                    $p0[] = "P0.7.6 JD scorecard $roleCode item $kc: contributes_to_reward=true but "
                        . "resolved metric reward_mode='not_rewardable'.";
                } elseif ($metricRewardMode !== '' && !in_array($metricRewardMode, $rewardEligibleModes, true)
                    && !in_array($metricRewardMode, ['blocker_only', 'recognition_only'], true)) {
                    $p0[] = "P0.7.6 JD scorecard $roleCode item $kc: contributes_to_reward=true but "
                        . "resolved metric reward_mode='$metricRewardMode' is outside the reward-eligible set "
                        . "(" . implode(', ', $rewardEligibleModes) . ").";
                } elseif ($metricRewardMode === '') {
                    $p0[] = "P0.7.6 JD scorecard $roleCode item $kc: contributes_to_reward=true but "
                        . "resolved metric has no reward_mode declared.";
                }
            }

            // Collect direction for the P1 direction-conflict check below.
            if (is_array($resolvedMetric)) {
                $dir = $resolveMetricDirection($resolvedMetric);
                if ($dir === 'lower_is_better' || $dir === 'higher_is_better') {
                    $itemsByDirection[$dir][] = [
                        'kpi_code'     => $kc,
                        'counter_code' => trim((string) ($it['counter_code'] ?? '')),
                    ];
                }
            }
        }
        if ($sum !== 100) {
            // P0.7.3 was removed: it was nested inside this $sum !== 100
            // branch with a [95,105] band, which the strict ==100 rule
            // below already supersedes. Tolerance migration is a tracked
            // follow-up in the P07 report; the strict rule stands alone.
            $p0[] = "JD scorecard $roleCode: weights sum to $sum, must be 100.";
        }

        // The pre-existing P1 above (count($items) > $recommended_active_count
        // and count($items) > 6) already covers the "too many items" case.
        // The earlier P1.P07 item-count rule duplicated that warning and
        // has been removed.

        // ── P1.P07 — direction conflict via registry direction ─────────────
        // (P07 hardening, rescoped) Spec §4 forbids measures that pull the
        // role in opposing directions without a counter pairing. Detection:
        // if the active list mixes at least one lower_is_better metric and
        // at least one higher_is_better metric AND at least one side of the
        // pairing has no counter_code, warn. This replaces the brittle name
        // regex (which mis-classified SETUP_FIRST_PASS as "speed").
        $hasLower  = !empty($itemsByDirection['lower_is_better']);
        $hasHigher = !empty($itemsByDirection['higher_is_better']);
        if ($hasLower && $hasHigher) {
            $lowerHasCounter  = true;
            $higherHasCounter = true;
            foreach ($itemsByDirection['lower_is_better'] as $entry) {
                if ($entry['counter_code'] === '') { $lowerHasCounter = false; }
            }
            foreach ($itemsByDirection['higher_is_better'] as $entry) {
                if ($entry['counter_code'] === '') { $higherHasCounter = false; }
            }
            if (!$lowerHasCounter || !$higherHasCounter) {
                $p1[] = "P1.P07 JD scorecard $roleCode: mixes lower_is_better and higher_is_better "
                    . "measures and at least one side has no counter_code; verify the bundle does not "
                    . "pull the role in opposing directions (spec §4).";
            }
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

// ── P0.7.7 — discipline_scope.whitelist tokens must match condition_ids ────
// (P07 hardening) performance_governance_policy.discipline_scope.whitelist
// lists controllable behaviours that may justify discipline. Each token MUST
// resolve to a blocking_condition_registry condition_id so any discipline
// action can cite a registered evidence anchor (per
// discipline_scope.evidence_requirement). A vocabulary mismatch silently
// breaks the citation chain — the JD / policy still compiles but discipline
// findings cannot link back to evidence.
$performancePolicy = is_array($registry['performance_governance_policy'] ?? null)
    ? $registry['performance_governance_policy'] : [];
$blockingRegistry  = is_array($registry['blocking_condition_registry'] ?? null)
    ? $registry['blocking_condition_registry'] : [];
$disciplineScope   = is_array($performancePolicy['discipline_scope'] ?? null)
    ? $performancePolicy['discipline_scope'] : [];
$whitelist         = is_array($disciplineScope['whitelist'] ?? null)
    ? $disciplineScope['whitelist'] : [];
if ($whitelist !== []) {
    $allConditionIds = [];
    foreach ((array) ($blockingRegistry['groups'] ?? []) as $groupName => $group) {
        if (!is_array($group)) {
            continue;
        }
        foreach ((array) ($group['condition_ids'] ?? []) as $cid) {
            $allConditionIds[(string) $cid] = $groupName;
        }
    }
    foreach ($whitelist as $token) {
        $token = (string) $token;
        if ($token === '') {
            continue;
        }
        if (!isset($allConditionIds[$token])) {
            $p0[] = "P0.7.7 performance_governance_policy.discipline_scope.whitelist: token '$token' "
                . "does not match any blocking_condition_registry.groups[*].condition_ids — "
                . "discipline citation chain broken.";
        }
    }
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

// ── P0.14 — customer_requirement_profiles shape + linked-metric reachability
// Every profile must declare applies_when + quality_requirements + linked_metrics.
// Every code in linked_metrics MUST resolve to a known canonical_code.
// Conversely, every metric with lam_profile_link MUST reference a known profile.
$profilesRoot = is_array($registry['customer_requirement_profiles'] ?? null)
    ? $registry['customer_requirement_profiles'] : [];
$profiles = is_array($profilesRoot['profiles'] ?? null) ? $profilesRoot['profiles'] : [];
if ($profiles !== []) {
    $allCodesForProfile = [];
    foreach ([$governance, $gateMetrics, $proposed] as $set) {
        foreach ($set as $row) {
            $c = is_array($row) ? (string) ($row['canonical_code'] ?? '') : '';
            if ($c !== '') {
                $allCodesForProfile[strtoupper($c)] = true;
            }
        }
    }
    foreach ((array) $runtimeList as $c) {
        $allCodesForProfile[strtoupper((string) $c)] = true;
    }

    foreach ($profiles as $profileCode => $profile) {
        if (!is_array($profile)) {
            $p0[] = "customer_requirement_profiles $profileCode: profile must be an object.";
            continue;
        }
        $applies = is_array($profile['applies_when'] ?? null) ? $profile['applies_when'] : null;
        if ($applies === null) {
            $p0[] = "customer_requirement_profiles $profileCode: missing applies_when.";
        }
        $qreq = is_array($profile['quality_requirements'] ?? null) ? $profile['quality_requirements'] : null;
        if ($qreq === null) {
            $p0[] = "customer_requirement_profiles $profileCode: missing quality_requirements.";
        }
        $linked = is_array($profile['linked_metrics'] ?? null) ? $profile['linked_metrics'] : [];
        foreach ($linked as $linkedCode) {
            $up = strtoupper((string) $linkedCode);
            if ($up === '') {
                continue;
            }
            if (!isset($allCodesForProfile[$up])) {
                $p0[] = "customer_requirement_profiles $profileCode: linked_metric '$linkedCode' "
                    . "does not resolve to any known canonical_code.";
            }
        }
        // LAM-style profile MUST forbid silent default for hi-risk customers.
        if ($profileCode === 'LAM_SEMSYSCO' && is_array($applies)) {
            if (($applies['silent_default_forbidden'] ?? false) !== true) {
                $p0[] = "customer_requirement_profiles LAM_SEMSYSCO: applies_when.silent_default_forbidden "
                    . "MUST be true (LAM/SEMSYSCO orders must not default silently).";
            }
        }
    }
    // Reverse: every metric.lam_profile_link must reference a known profile.
    $reverseCheck = static function (array $row, string $label) use ($profiles, &$p0): void {
        $link = (string) ($row['lam_profile_link'] ?? '');
        if ($link !== '' && !isset($profiles[$link])) {
            $rc = (string) ($row['canonical_code'] ?? '');
            $p0[] = "$label $rc: lam_profile_link '$link' does not match any "
                . "customer_requirement_profiles.profiles key.";
        }
    };
    foreach ($governance as $row) {
        if (is_array($row)) { $reverseCheck($row, 'Registry'); }
    }
    foreach ($gateMetrics as $row) {
        if (is_array($row)) { $reverseCheck($row, 'Gate'); }
    }
    foreach ($proposed as $row) {
        if (is_array($row)) { $reverseCheck($row, 'Proposed'); }
    }
}

// ── P0.8.1 — dashboard_render_contract present + shape complete ──────────────
// P08 introduced dashboard_render_contract; every dashboard surface honors
// the same governance fields per card. A missing or shape-broken contract
// means a renderer could silently fall back to a hardcoded set and start
// showing staged metric numbers again.
$dashboardContract = is_array($registry['dashboard_render_contract'] ?? null)
    ? $registry['dashboard_render_contract'] : null;
if ($dashboardContract === null) {
    $p0[] = "P0.8.1 Registry: missing dashboard_render_contract block — dashboard render rules become hardcoded.";
} else {
    $contractRequiredFields = ['contract_id', 'required_fields_per_card', 'render_rules', 'card_classes'];
    foreach ($contractRequiredFields as $f) {
        if (!isset($dashboardContract[$f])) {
            $p0[] = "P0.8.1 dashboard_render_contract: missing top-level '$f'.";
        }
    }
    // Required fields per card must include the spec §2 fields.
    $requiredPerCard = (array) ($dashboardContract['required_fields_per_card'] ?? []);
    $mustHaveFields = [
        'metric_code', 'calculation_status',
        'min_sample_or_insufficient_data_reason', 'owner_role',
        'next_action_if_red', 'counter_metric_status',
        'evidence_source_or_link', 'last_calculated_or_input_time',
    ];
    foreach ($mustHaveFields as $f) {
        if (!in_array($f, $requiredPerCard, true)) {
            $p0[] = "P0.8.1 dashboard_render_contract.required_fields_per_card: missing '$f'.";
        }
    }
    // Render rules must cover every calculation_status that may appear on
    // a card AND the counter-metric blocker rule.
    $renderRules = is_array($dashboardContract['render_rules'] ?? null)
        ? $dashboardContract['render_rules'] : [];
    $renderRuleKeys = ['staged_data_contract', 'data_contract_required',
        'manual', 'manual_governed', 'runtime_calculated', 'counter_metric_blocker'];
    foreach ($renderRuleKeys as $rk) {
        if (!isset($renderRules[$rk]) || !is_string($renderRules[$rk])
            || trim($renderRules[$rk]) === '') {
            $p0[] = "P0.8.1 dashboard_render_contract.render_rules: missing rule for '$rk'.";
        }
    }
    // Card classes — executive must forbid staged scoring; backlog must
    // accept only staged_data_contract / data_contract_required.
    $cardClasses = is_array($dashboardContract['card_classes'] ?? null)
        ? $dashboardContract['card_classes'] : [];
    foreach (['executive', 'daily_ops', 'gate', 'role', 'backlog'] as $cls) {
        if (!isset($cardClasses[$cls])) {
            $p0[] = "P0.8.1 dashboard_render_contract.card_classes: missing class '$cls'.";
            continue;
        }
    }
    if (isset($cardClasses['executive']['calculation_status_allowed'])) {
        $allowedExec = (array) $cardClasses['executive']['calculation_status_allowed'];
        if (in_array('staged_data_contract', $allowedExec, true)
            || in_array('data_contract_required', $allowedExec, true)) {
            $p0[] = "P0.8.1 dashboard_render_contract.card_classes.executive: "
                . "MUST NOT allow staged_data_contract or data_contract_required (spec §2 executive policy).";
        }
    }
    if (isset($cardClasses['backlog']['calculation_status_allowed'])) {
        $allowedBacklog = (array) $cardClasses['backlog']['calculation_status_allowed'];
        if (!in_array('staged_data_contract', $allowedBacklog, true)) {
            $p0[] = "P0.8.1 dashboard_render_contract.card_classes.backlog: "
                . "MUST allow staged_data_contract (it is the backlog's reason for existing).";
        }
    }
}

// ── P0.8.2 — manual_input_contract present + reward gate declared ────────────
// P08 introduced manual_input_contract; the engine + controller honor the
// input_status enum + reward_gate from this block. If the enum loses
// 'pending_review' or 'approved' the dashboard's "no pending in reward"
// promise breaks silently.
$manualContract = is_array($registry['manual_input_contract'] ?? null)
    ? $registry['manual_input_contract'] : null;
if ($manualContract === null) {
    $p0[] = "P0.8.2 Registry: missing manual_input_contract block.";
} else {
    foreach (['contract_id', 'endpoint_save', 'endpoint_list',
              'required_fields', 'input_status_enum', 'reward_gate'] as $f) {
        if (!isset($manualContract[$f])) {
            $p0[] = "P0.8.2 manual_input_contract: missing '$f'.";
        }
    }
    $enum = (array) ($manualContract['input_status_enum'] ?? []);
    foreach (['draft', 'submitted', 'pending_review', 'approved', 'rejected', 'superseded'] as $s) {
        if (!in_array($s, $enum, true)) {
            $p0[] = "P0.8.2 manual_input_contract.input_status_enum: missing required status '$s'.";
        }
    }
    if (isset($manualContract['reward_gate']) && is_array($manualContract['reward_gate'])) {
        $policy = (string) ($manualContract['reward_gate']['policy'] ?? '');
        if (stripos($policy, 'approved') === false || stripos($policy, 'pending') === false) {
            $p0[] = "P0.8.2 manual_input_contract.reward_gate.policy: must explicitly state "
                . "that 'approved' contributes and 'pending'/'submitted' do not.";
        }
    }
    // Required fields must include the controller's REQUIRED_FIELDS.
    $required = (array) ($manualContract['required_fields'] ?? []);
    foreach (['period_start', 'period_end', 'value'] as $f) {
        if (!in_array($f, $required, true)) {
            $p0[] = "P0.8.2 manual_input_contract.required_fields: missing '$f'.";
        }
    }
}

// ── P0.8.3 — DashboardController.kpiInputSave enforces the manual contract ──
// The controller must accept the full input_status enum (pending_review et
// al.) and must apply the unit guard. A regression that strips one of these
// checks would let a "%" metric silently record a "ppm" input or accept an
// undocumented status.
$dashboardCtlFp = $base . '/api/controllers/DashboardController.php';
if (is_readable($dashboardCtlFp)) {
    $dashboardSrc = readText($dashboardCtlFp);
    foreach (['pending_review', 'approved', 'rejected', 'superseded'] as $s) {
        if (!str_contains($dashboardSrc, "'" . $s . "'")) {
            $p0[] = "P0.8.3 DashboardController.kpiInputSave: input_status enum missing '$s' "
                . "— diverges from manual_input_contract.";
        }
    }
    if (!str_contains($dashboardSrc, 'invalid_unit')) {
        $p0[] = "P0.8.3 DashboardController.kpiInputSave: unit guard missing — "
            . "manual_input_contract.validation.unit not enforced.";
    }
}

// ── P0.8.4 — KpiEngine staged metric must not leak numeric value ─────────────
// calculateFromManualInput must suppress the numeric value when there is no
// approved input. The flag 'value_suppressed' + 'input_pending_review' are
// what dashboard renderers read; if they disappear, staged metrics will
// silently render numbers again.
if (is_readable($engineFp)) {
    $engineSrcCheck = readText($engineFp);
    if (!str_contains($engineSrcCheck, 'value_suppressed')) {
        $p0[] = "P0.8.4 KpiEngine.calculateFromManualInput: missing 'value_suppressed' flag — "
            . "staged metric value leak risk.";
    }
    if (!str_contains($engineSrcCheck, 'input_pending_review')) {
        $p0[] = "P0.8.4 KpiEngine.calculateFromManualInput: missing 'input_pending_review' "
            . "flag — reward gate cannot distinguish pending from approved manual input.";
    }
    if (!str_contains($engineSrcCheck, 'reward_eligible_input')) {
        $p0[] = "P0.8.4 KpiEngine.calculateFromManualInput: missing 'reward_eligible_input' "
            . "flag — JD scorecard reward roll-up cannot skip pending input.";
    }
}

// ── P0.8.5 — Admin Console JS requires a change reason client-side ──────────
// The portal Console must reject empty/short reason before the save round-trip.
// AdminController re-checks server-side (P08 hardening).
if (is_readable($adminJsFp)) {
    $consoleSrc = readText($adminJsFp);
    if (!preg_match('/reasonTrim\\.length\\s*<\\s*4/', $consoleSrc)
        && !preg_match('/_state\\.reason[^;]*length\\s*<\\s*4/', $consoleSrc)) {
        $p0[] = "P0.8.5 Admin Console (00o-admin-kpi-registry.js): change-reason "
            . "client-side guard missing — Save can be triggered with an empty reason.";
    }
}

// ── P0.8.6 — AdminController.kpiRegistrySave enforces reason_required ───────
$adminCtlFp = $base . '/api/controllers/AdminController.php';
if (is_readable($adminCtlFp)) {
    $adminSrc = readText($adminCtlFp);
    if (!preg_match('/kpiRegistrySave[\\s\\S]{0,3000}reason_required/', $adminSrc)) {
        $p0[] = "P0.8.6 AdminController.kpiRegistrySave: reason_required guard missing "
            . "— KPI registry edits can be saved without an audit reason.";
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
