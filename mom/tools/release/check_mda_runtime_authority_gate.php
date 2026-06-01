<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "This script must be run from CLI.\n");
    exit(1);
}

require_once __DIR__ . '/../audit_runtime_authority_consistency.php';

$requirePostgres = in_array('--require-postgres', $argv, true);

$report = audit_runtime_authority_report();
$mode = (string)($report['runtime_mode']['mode'] ?? '');
$postgresAuthorityModes = ['POSTGRES_PRIMARY', 'POSTGRES_ONLY'];
$failures = [];

if ($requirePostgres && !in_array($mode, $postgresAuthorityModes, true)) {
    $failures[] = 'postgres_authority_mode_required';
}
if ($mode !== 'JSON_ONLY') {
    if (($report['runtime_mode']['database_configured'] ?? false) !== true) {
        $failures[] = 'postgres_database_not_configured';
    }
    if (($report['runtime_mode']['database_probe_reachable'] ?? false) !== true) {
        $failures[] = 'postgres_database_probe_unreachable';
    }
    if (($report['runtime_mode']['postgres_path_active'] ?? false) !== true) {
        $failures[] = 'postgres_runtime_path_inactive';
    }
    if (($report['runtime_mode']['postgres_reachable'] ?? false) !== true) {
        $failures[] = 'postgres_runtime_path_unreachable';
    }
}
if ((int)($report['summary']['pending_change_count'] ?? 0) > 0) {
    $failures[] = 'master_data_pending_changes_exist';
}
if ((int)($report['summary']['blocking_issue_count'] ?? 0) > 0) {
    $failures[] = 'runtime_authority_blocking_drift';
}

$gate = [
    'decision' => $failures === [] ? 'MDA_RUNTIME_AUTHORITY_GATE_PASS' : 'MDA_RUNTIME_AUTHORITY_GATE_FAIL',
    'require_postgres_authority' => $requirePostgres,
    'mode' => $mode,
    'failures' => $failures,
    'summary' => $report['summary'],
    'runtime_mode' => $report['runtime_mode'],
];

echo json_encode($gate, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL;
exit($failures === [] ? 0 : 2);
