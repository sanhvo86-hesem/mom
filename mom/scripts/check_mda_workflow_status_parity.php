<?php

declare(strict_types=1);

$repoRoot = dirname(__DIR__, 2);
$reportDir = $repoRoot . '/_reports/mda_runtime_authority_closure';
@mkdir($reportDir, 0775, true);

$workflowPath = $repoRoot . '/mom/data/authority/workflow-status-authority.yaml';
$registryPath = $repoRoot . '/mom/data/authority/governed-root-registry.yaml';
$frontendPath = $repoRoot . '/mom/scripts/portal/13-master-data-control.js';

$workflow = read_required($workflowPath);
$registry = read_required($registryPath);
$frontend = read_required($frontendPath);

$requiredRoots = [
    'item',
    'item_revision',
    'engineering_release_package',
    'party',
    'supplier',
    'customer',
    'organization',
    'shift_calendar',
    'equipment',
    'tooling',
    'gage',
    'quality_hold',
    'ncr',
    'mrb',
    'capa',
    'complaint',
    'scar',
    'inventory_period',
    'lot',
    'serial',
    'container',
    'work_order',
    'sales_order',
    'job_order',
];

$workflowRoots = parse_roots($workflow);
$registryRoots = parse_roots($registry);

$checks = [];
$checks['workflow_file_exists'] = is_file($workflowPath);
$checks['registry_file_exists'] = is_file($registryPath);
$checks['workflow_has_required_roots'] = missing_roots($workflowRoots, $requiredRoots) === [];
$checks['registry_has_required_roots'] = missing_roots($registryRoots, $requiredRoots) === [];
$checks['workflow_roots_have_isa95_owner_command_event_states'] = roots_have_fields($workflowRoots, ['domain', 'isa95_category', 'owner', 'command_owner', 'event_owner', 'states']);
$checks['registry_roots_have_authority_contract'] = roots_have_fields($registryRoots, ['authority_storage', 'mutation_path', 'state_source', 'audit_evidence', 'problem_details', 'security_gates']);
$checks['workflow_declares_generated_artifacts'] = str_contains($workflow, 'generated_artifacts:') && str_contains($workflow, 'frontend_projection:') && str_contains($workflow, 'scenario_matrix:');
$checks['registry_declares_projection_read_model'] = str_contains($registry, 'projection_rule: frontend_and_json_are_read_models_only');
$checks['frontend_workspace_marked_projection'] = str_contains($frontend, "data-route-class', MASTER_DATA_CONTROL_PROJECTION.routeClass")
    && str_contains($frontend, "data-authority-class', MASTER_DATA_CONTROL_PROJECTION.authorityClass")
    && str_contains($frontend, "data-requires-reanchor', MASTER_DATA_CONTROL_PROJECTION.requiresReanchor");
$checks['frontend_create_disabled'] = str_contains($frontend, 'id="mdc-create" disabled aria-disabled="true"');
$checks['frontend_submit_short_circuits_before_upsert'] = strpos($frontend, 'editor.innerHTML = _renderProjectionDetails(cfg);') !== false
    && strpos($frontend, "master_data_upsert") !== false
    && strpos($frontend, 'editor.innerHTML = _renderProjectionDetails(cfg);') < strpos($frontend, "master_data_upsert");

$missingWorkflow = missing_roots($workflowRoots, $requiredRoots);
$missingRegistry = missing_roots($registryRoots, $requiredRoots);
$failed = array_keys(array_filter($checks, static fn (bool $ok): bool => !$ok));

$summary = [
    'gate' => 'mda_workflow_status_parity',
    'status' => $failed === [] ? 'PASS' : 'FAIL',
    'required_root_count' => count($requiredRoots),
    'workflow_root_count' => count($workflowRoots),
    'registry_root_count' => count($registryRoots),
    'missing_workflow_roots' => $missingWorkflow,
    'missing_registry_roots' => $missingRegistry,
    'checks' => $checks,
    'failed' => $failed,
    'generated_at' => gmdate('c'),
];

file_put_contents($reportDir . '/MDA_WORKFLOW_STATUS_PARITY_REPORT.json', json_encode($summary, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL);
file_put_contents($reportDir . '/MDA_WORKFLOW_STATUS_PARITY_REPORT.md', workflow_markdown($summary));
echo json_encode($summary, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
exit($summary['status'] === 'PASS' ? 0 : 1);

function read_required(string $path): string
{
    $content = is_file($path) ? file_get_contents($path) : false;
    return $content === false ? '' : $content;
}

/**
 * @return array<string,array<string,mixed>>
 */
function parse_roots(string $yaml): array
{
    $roots = [];
    $current = null;
    foreach (preg_split('/\R/', $yaml) ?: [] as $line) {
        if (preg_match('/^\s*-\s+root:\s*([A-Za-z0-9_]+)/', $line, $match)) {
            $current = $match[1];
            $roots[$current] = ['root' => $current];
            continue;
        }
        if ($current === null) {
            continue;
        }
        if (preg_match('/^\s{4}([A-Za-z0-9_]+):\s*(.*)$/', $line, $match)) {
            $value = trim($match[2]);
            if (str_starts_with($value, '[') && str_ends_with($value, ']')) {
                $value = array_values(array_filter(array_map('trim', explode(',', trim($value, '[]')))));
            }
            $roots[$current][$match[1]] = $value;
        }
    }

    return $roots;
}

/**
 * @param array<string,array<string,mixed>> $roots
 * @param list<string> $required
 * @return list<string>
 */
function missing_roots(array $roots, array $required): array
{
    return array_values(array_filter($required, static fn (string $root): bool => !isset($roots[$root])));
}

/**
 * @param array<string,array<string,mixed>> $roots
 * @param list<string> $fields
 */
function roots_have_fields(array $roots, array $fields): bool
{
    foreach ($roots as $root) {
        foreach ($fields as $field) {
            $value = $root[$field] ?? null;
            if ($value === null || $value === '' || $value === []) {
                return false;
            }
        }
    }

    return $roots !== [];
}

function workflow_markdown(array $summary): string
{
    $lines = [
        '# MDA Workflow Status Parity Report',
        '',
        '- Gate: ' . $summary['status'],
        '- Required roots: ' . $summary['required_root_count'],
        '- Workflow roots: ' . $summary['workflow_root_count'],
        '- Registry roots: ' . $summary['registry_root_count'],
        '- Generated at: ' . $summary['generated_at'],
        '',
        '| Check | Result |',
        '|---|---:|',
    ];
    foreach ($summary['checks'] as $check => $ok) {
        $lines[] = '| ' . $check . ' | ' . ($ok ? 'PASS' : 'FAIL') . ' |';
    }
    $lines[] = '';

    return implode(PHP_EOL, $lines);
}
