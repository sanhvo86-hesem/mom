<?php

declare(strict_types=1);

$repoRoot = dirname(__DIR__, 2);
$reportDir = $repoRoot . '/_reports/mda_runtime_authority_closure';
@mkdir($reportDir, 0775, true);

$serviceFiles = [
    $repoRoot . '/mom/api/services/DomainCommand/InventoryCommandHandler.php',
    $repoRoot . '/mom/api/services/DomainCommand/QualityHoldService.php',
    $repoRoot . '/mom/api/services/DomainCommand/DomainCommandGateway.php',
];
$serviceSource = '';
foreach ($serviceFiles as $file) {
    $serviceSource .= is_file($file) ? (string)file_get_contents($file) : '';
}
$migrationSource = '';
foreach (glob($repoRoot . '/mom/database/migrations/*.sql') ?: [] as $file) {
    $migrationSource .= (string)file_get_contents($file);
}

$dataset = synthetic_trace_dataset(1200, 7200);
$lookupSamples = [];
$exportSamples = [];
for ($i = 0; $i < 40; $i++) {
    $root = 'lot:' . (($i % 1200) + 1);
    $start = hrtime(true);
    $neighbors = $dataset['adjacency'][$root] ?? [];
    $lookupSamples[] = elapsed_ms($start);

    $start = hrtime(true);
    $export = cursor_export($dataset['adjacency'], $root, 500);
    $exportSamples[] = elapsed_ms($start);
}

$checks = [
    'synthetic_dataset_seeded' => count($dataset['adjacency']) >= 1200 && $dataset['edge_count'] >= 7200,
    'cursor_export_uses_continuation_or_complete' => cursor_export($dataset['adjacency'], 'lot:1', 500)['complete'] === false
        || cursor_export($dataset['adjacency'], 'lot:1', 500)['continuation_token'] !== '',
    'inventory_service_mentions_wip_ledger' => str_contains($serviceSource, 'wip_ledger'),
    'inventory_service_mentions_genealogy_or_recall' => str_contains($serviceSource, 'genealogy') || str_contains($serviceSource, 'RecallTrace'),
    'quality_hold_service_uses_subject_graph' => str_contains($serviceSource, 'quality_hold_subject') && str_contains($serviceSource, 'holds_subject'),
    'command_gateway_uses_idempotency' => str_contains($serviceSource, 'idempotency_key') && str_contains($serviceSource, 'PostgresIdempotencyReplayRepository'),
    'migration_index_for_reauth_or_sod' => str_contains($migrationSource, 'idx_domain_command_reauth_challenge_actor')
        && str_contains($migrationSource, 'idx_domain_command_sod_exception_scope'),
];

$failed = array_keys(array_filter($checks, static fn (bool $ok): bool => !$ok));
$summary = [
    'gate' => 'mda_traceability_performance',
    'status' => $failed === [] ? 'PASS' : 'FAIL',
    'dataset' => [
        'nodes' => count($dataset['adjacency']),
        'edges' => $dataset['edge_count'],
        'source' => 'deterministic_synthetic_local_gate',
    ],
    'measurements_ms' => [
        'adjacency_lookup' => percentiles($lookupSamples),
        'trace_export_page_500' => percentiles($exportSamples),
    ],
    'checks' => $checks,
    'failed' => $failed,
    'known_limits' => [
        'No live PostgreSQL seed was started by this local gate; production-like P95/P99 still requires the validation package dataset.',
        'Synthetic trace graph proves cursor semantics and local algorithm cost only.',
    ],
    'generated_at' => gmdate('c'),
];

file_put_contents($reportDir . '/MDA_PERFORMANCE_TRACEABILITY_BASELINE.json', json_encode($summary, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL);
file_put_contents($reportDir . '/MDA_PERFORMANCE_TRACEABILITY_BASELINE.md', trace_markdown($summary));
echo json_encode($summary, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
exit($summary['status'] === 'PASS' ? 0 : 1);

/**
 * @return array{adjacency:array<string,list<string>>,edge_count:int}
 */
function synthetic_trace_dataset(int $lotCount, int $edgeCount): array
{
    $adjacency = [];
    for ($i = 1; $i <= $lotCount; $i++) {
        $lot = 'lot:' . $i;
        $serial = 'serial:' . $i;
        $container = 'container:' . (int)ceil($i / 6);
        $wip = 'wip:' . (int)ceil($i / 12);
        $shipment = 'shipment:' . (int)ceil($i / 24);
        foreach ([[$lot, $serial], [$serial, $container], [$container, $wip], [$wip, $shipment]] as $edge) {
            $adjacency[$edge[0]][] = $edge[1];
            $adjacency[$edge[1]][] = $edge[0];
        }
    }
    $added = $lotCount * 4;
    for ($i = 1; $added < $edgeCount; $i++, $added++) {
        $from = 'lot:' . (($i % $lotCount) + 1);
        $to = 'item:' . (($i % 120) + 1);
        $adjacency[$from][] = $to;
        $adjacency[$to][] = $from;
    }

    return ['adjacency' => $adjacency, 'edge_count' => $edgeCount];
}

/**
 * @param array<string,list<string>> $adjacency
 * @return array{complete:bool,continuation_token:string,edge_count:int}
 */
function cursor_export(array $adjacency, string $root, int $limit): array
{
    $seen = [$root => true];
    $queue = [$root];
    $edges = 0;
    while ($queue !== [] && $edges < $limit) {
        $node = array_shift($queue);
        foreach ($adjacency[$node] ?? [] as $next) {
            $edges++;
            if (!isset($seen[$next])) {
                $seen[$next] = true;
                $queue[] = $next;
            }
            if ($edges >= $limit) {
                break 2;
            }
        }
    }

    return [
        'complete' => $queue === [],
        'continuation_token' => $queue === [] ? '' : hash('sha256', implode('|', $queue)),
        'edge_count' => $edges,
    ];
}

function elapsed_ms(int $start): float
{
    return (hrtime(true) - $start) / 1_000_000;
}

/**
 * @param list<float> $samples
 * @return array{p50:float,p95:float,p99:float}
 */
function percentiles(array $samples): array
{
    sort($samples);
    $count = count($samples);
    $pick = static function (float $p) use ($samples, $count): float {
        $index = max(0, min($count - 1, (int)ceil($count * $p) - 1));
        return round($samples[$index], 4);
    };

    return ['p50' => $pick(0.50), 'p95' => $pick(0.95), 'p99' => $pick(0.99)];
}

function trace_markdown(array $summary): string
{
    $lines = [
        '# MDA Performance Traceability Baseline',
        '',
        '- Gate: ' . $summary['status'],
        '- Dataset: ' . $summary['dataset']['nodes'] . ' nodes / ' . $summary['dataset']['edges'] . ' edges',
        '- Generated at: ' . $summary['generated_at'],
        '',
        '| Query | P50 ms | P95 ms | P99 ms |',
        '|---|---:|---:|---:|',
    ];
    foreach ($summary['measurements_ms'] as $name => $row) {
        $lines[] = '| ' . $name . ' | ' . $row['p50'] . ' | ' . $row['p95'] . ' | ' . $row['p99'] . ' |';
    }
    $lines[] = '';
    $lines[] = '| Check | Result |';
    $lines[] = '|---|---:|';
    foreach ($summary['checks'] as $check => $ok) {
        $lines[] = '| ' . $check . ' | ' . ($ok ? 'PASS' : 'FAIL') . ' |';
    }
    $lines[] = '';
    $lines[] = 'Known limits:';
    foreach ($summary['known_limits'] as $limit) {
        $lines[] = '- ' . $limit;
    }
    $lines[] = '';

    return implode(PHP_EOL, $lines);
}
