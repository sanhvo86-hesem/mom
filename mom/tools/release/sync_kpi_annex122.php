#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * Regenerate the ANNEX-122 §4/§5/§6 KPI marker regions from the registry
 * seed so the controlled document always reflects the registry SSOT
 * (counter-metric, numeric thresholds, owners, decision/action).
 *
 * KpiRegistryAdminService::regenerateAnnex122 already does this on a Console
 * save; this CLI runs the same regeneration headless after a direct edit to
 * kpi-authority-registry.json (e.g. a scripted counter-metric redesign), so
 * the registry and the controlled document never silently drift.
 *
 * Exit code: 0 = regenerated or already in sync, 1 = error.
 */

$base = dirname(__DIR__, 2);   // .../mom
$root = dirname($base);        // repo root (contains mom/)
$data = $base . '/data';

$autoloaded = false;
foreach ([$base . '/vendor/autoload.php', $root . '/vendor/autoload.php'] as $autoload) {
    if (is_file($autoload)) {
        require_once $autoload;
        $autoloaded = true;
        break;
    }
}
if (!$autoloaded) {
    require_once $base . '/api/services/KpiEngine.php';
    require_once $base . '/api/services/KpiRegistryAdminService.php';
}

use MOM\Api\Services\KpiRegistryAdminService;

$registryFp = $data . '/registry/kpi-authority-registry.json';
$seed = json_decode((string) file_get_contents($registryFp), true);
if (!is_array($seed) || !is_array($seed['annex122_governance_kpis'] ?? null)) {
    fwrite(STDERR, "ERROR: registry seed missing or invalid\n");
    exit(1);
}

$service = new KpiRegistryAdminService($root, $data);
$method = new ReflectionMethod($service, 'regenerateAnnex122');
$changed = (bool) $method->invoke(
    $service,
    $seed['annex122_governance_kpis'],
    is_array($seed['gate_control_metrics'] ?? null) ? $seed['gate_control_metrics'] : [],
);

echo $changed
    ? "ANNEX-122 §4/§5/§6/§9 regenerated from registry (schema_version "
        . (int) ($seed['schema_version'] ?? 0) . ").\n"
    : "ANNEX-122 already in sync (or marker regions absent).\n";
exit(0);
