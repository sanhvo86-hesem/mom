<?php

declare(strict_types=1);

use MOM\Database\DataLayer;

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "This script must be run from CLI.\n");
    exit(1);
}

require_once __DIR__ . '/../database/Connection.php';
require_once __DIR__ . '/../database/RuntimeShadowSync.php';
require_once __DIR__ . '/../database/DataLayer.php';

function audit_project_root(): string
{
    $root = realpath(__DIR__ . '/..');
    if ($root === false) {
        throw new RuntimeException('Could not resolve project root.');
    }
    return str_replace('\\', '/', $root);
}

function audit_read_json(string $path): array
{
    if (!is_file($path)) {
        return [];
    }
    $raw = file_get_contents($path);
    $decoded = is_string($raw) ? json_decode($raw, true) : null;
    return is_array($decoded) ? $decoded : [];
}

function audit_effective_config(string $projectRoot, string $dataDir): array
{
    $config = require $projectRoot . '/database/config.php';
    $overridePath = $dataDir . '/config/runtime_data_layer_overrides.json';
    $override = audit_read_json($overridePath);
    if (is_array($override['config'] ?? null)) {
        $config = array_replace($config, $override['config']);
    }
    return $config;
}

function audit_master_data_normalize(array $store): array
{
    $store['parts'] = array_values(array_map(static function ($row): array {
        if (!is_array($row)) {
            return [];
        }
        $description = trim((string)($row['part_description'] ?? $row['description'] ?? ''));
        if ($description !== '') {
            $row['part_description'] = $description;
            $row['description'] = $description;
        }
        return $row;
    }, is_array($store['parts'] ?? null) ? $store['parts'] : []));
    return $store;
}

function audit_store_normalize(string $domain, array $store): array
{
    return match ($domain) {
        'master_data' => audit_master_data_normalize($store),
        default => $store,
    };
}

function audit_collection_key(string $domain, string $collection, array $rows): ?string
{
    $explicit = [
        'master_data' => [
            'customers' => 'customer_id',
            'customer_sites' => 'site_id',
            'commercial_accounts' => 'account_id',
            'suppliers' => 'supplier_id',
            'parts' => 'part_number',
            'revisions' => 'revision_id',
            'incoterms' => 'incoterm_code',
            'payment_terms' => 'payment_term_code',
            'shipping_methods' => 'shipping_method_id',
            'promise_policies' => 'promise_policy_id',
            'routing_library' => 'routing_id',
            'bom_library' => 'bom_id',
            'control_plans' => 'control_plan_id',
            'inspection_plans' => 'inspection_plan_id',
            'traveler_templates' => 'traveler_template_id',
            'quality_gate_profiles' => 'quality_gate_profile_id',
            'launch_gate_templates' => 'gate_template_id',
            'customer_item_approvals' => 'approval_id',
            'supplier_process_approvals' => 'approval_id',
            'warehouse_locations' => 'warehouse_id',
            'defect_catalog' => 'defect_code',
            'nc_program_releases' => 'program_id',
            'capas' => 'capa_number',
            'work_centers' => 'work_center_id',
            'machines' => 'machine_id',
            'operators' => 'operator_id',
            'tooling_assets' => 'tool_id',
            'downtime_reason_codes' => 'reason_code',
            'downtime_resolution_codes' => 'resolution_code',
            'mes_connectivity_adapters' => 'adapter_id',
            'mes_alarm_catalog' => 'alarm_code',
            'mes_alarm_playbooks' => 'playbook_id',
            'tool_assemblies' => 'assembly_id',
        ],
        'orders' => [
            'sales_orders' => 'so_number',
            'job_orders' => 'jo_number',
            'work_orders' => 'wo_number',
            'form_links' => 'link_id',
        ],
        'mes' => [
            'downtime_events' => 'downtime_id',
            'maintenance_requests' => 'request_id',
            'progress_reports' => 'progress_id',
            'tooling_status' => 'tool_runtime_id',
            'connector_feeds' => 'feed_id',
            'machine_signals' => 'signal_id',
            'mes_connectivity_events' => 'adapter_event_id',
            'machine_alarm_events' => 'alarm_event_id',
            'nc_download_receipts' => 'receipt_id',
            'mes_tool_preset_offsets' => 'preset_id',
            'material_consumption' => 'consumption_id',
            'part_genealogy' => 'genealogy_id',
            'shift_handover' => 'handover_id',
            'dpp_passports' => 'dpp_id',
            'energy_snapshots' => 'energy_snapshot_id',
            'cost_tracking' => 'cost_id',
        ],
        'epicor' => [
            'sync_runs' => 'sync_run_id',
            'reconciliation_exceptions' => 'reconciliation_id',
            'outbox_events' => 'outbox_event_id',
            'checkpoints' => 'checkpoint_key',
        ],
    ];

    $mapped = $explicit[$domain][$collection] ?? null;
    if ($mapped !== null) {
        return $mapped;
    }

    $candidates = [
        'customer_id', 'site_id', 'account_id', 'supplier_id', 'part_number', 'revision_id',
        'incoterm_code', 'payment_term_code', 'shipping_method_id', 'promise_policy_id',
        'routing_id', 'bom_id', 'control_plan_id', 'inspection_plan_id', 'traveler_template_id',
        'quality_gate_profile_id', 'gate_template_id', 'approval_id', 'warehouse_id',
        'defect_code', 'program_id', 'capa_number', 'work_center_id', 'machine_id', 'operator_id',
        'tool_id', 'reason_code', 'resolution_code', 'adapter_id', 'alarm_code', 'playbook_id',
        'assembly_id', 'so_number', 'job_number', 'work_order_number', 'operation_id', 'download_id',
        'consumption_id', 'event_id', 'handover_id', 'passport_id', 'snapshot_id', 'tracking_id',
        'report_id', 'request_id', 'alarm_event_id', 'sync_run_id', 'reconciliation_id', 'outbox_id',
        'queue_id', 'record_id', 'entry_id', 'package_id', 'checkpoint_key',
    ];

    foreach ($candidates as $candidate) {
        $allPresent = true;
        $seen = [];
        foreach ($rows as $row) {
            if (!is_array($row)) {
                $allPresent = false;
                break;
            }
            $value = trim((string)($row[$candidate] ?? ''));
            if ($value === '') {
                $allPresent = false;
                break;
            }
            $seen[$value] = true;
        }
        if ($allPresent && count($seen) === count($rows)) {
            return $candidate;
        }
    }

    return null;
}

function audit_sort_recursive(mixed $value): mixed
{
    if (!is_array($value)) {
        return $value;
    }
    $isList = array_keys($value) === range(0, count($value) - 1);
    if ($isList) {
        return array_map('audit_sort_recursive', $value);
    }
    ksort($value);
    foreach ($value as $key => $child) {
        $value[$key] = audit_sort_recursive($child);
    }
    return $value;
}

function audit_compare_row(array $jsonRow, array $pgRow): array
{
    $jsonCanonical = audit_sort_recursive($jsonRow);
    $pgCanonical = audit_sort_recursive($pgRow);
    if (json_encode($jsonCanonical, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) === json_encode($pgCanonical, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) {
        return [];
    }

    $keys = array_values(array_unique(array_merge(array_keys($jsonRow), array_keys($pgRow))));
    sort($keys);
    $diff = [];
    foreach ($keys as $key) {
        $left = $jsonRow[$key] ?? null;
        $right = $pgRow[$key] ?? null;
        if (json_encode(audit_sort_recursive($left), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) === json_encode(audit_sort_recursive($right), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) {
            continue;
        }
        $diff[$key] = [
            'json' => $left,
            'postgres' => $right,
        ];
    }
    return $diff;
}

function audit_missing_in_json_is_blocking(string $mode): bool
{
    if (in_array($mode, [DataLayer::MODE_POSTGRES_PRIMARY, DataLayer::MODE_POSTGRES_ONLY], true)) {
        return false;
    }

    return $mode === DataLayer::MODE_SHADOW_WRITE;
}

function audit_invalid_json_key_is_blocking(string $mode): bool
{
    return in_array($mode, [DataLayer::MODE_JSON_ONLY, DataLayer::MODE_SHADOW_WRITE], true);
}

function audit_invalid_postgres_key_is_blocking(string $mode): bool
{
    return $mode !== DataLayer::MODE_JSON_ONLY;
}

function audit_issue_count(array $ids): int
{
    return count($ids);
}

function audit_add_issue(array &$issues, string $code, int $count): void
{
    if ($count <= 0) {
        return;
    }
    $issues[] = [
        'code' => $code,
        'count' => $count,
    ];
}

function audit_index_rows_by_key(array $rows, string $key): array
{
    $map = [];
    $invalid = [];
    $duplicates = [];

    foreach ($rows as $index => $row) {
        if (!is_array($row)) {
            continue;
        }
        $id = trim((string)($row[$key] ?? ''));
        if ($id === '') {
            if (count($invalid) < 10) {
                $invalid[] = [
                    'index' => $index,
                    'keys' => array_values(array_map('strval', array_keys($row))),
                ];
            }
            continue;
        }
        if (isset($map[$id])) {
            if (count($duplicates) < 10) {
                $duplicates[] = $id;
            }
            continue;
        }
        $map[$id] = $row;
    }

    return [
        'map' => $map,
        'invalid_key_rows' => $invalid,
        'duplicate_keys' => array_values(array_unique($duplicates)),
    ];
}

function audit_collection(string $domain, string $collection, array $jsonRows, array $pgRows, string $mode): array
{
    $jsonRows = array_values(array_filter($jsonRows, 'is_array'));
    $pgRows = array_values(array_filter($pgRows, 'is_array'));
    $key = audit_collection_key($domain, $collection, $jsonRows !== [] ? $jsonRows : $pgRows);
    $blockingIssues = [];
    $advisoryIssues = [];

    if ($key === null) {
        $countMatches = count($jsonRows) === count($pgRows);
        if (!$countMatches) {
            if (count($jsonRows) > count($pgRows)) {
                audit_add_issue($blockingIssues, 'legacy_json_rows_missing_in_postgres_authority', count($jsonRows) - count($pgRows));
            } else {
                audit_add_issue($advisoryIssues, 'postgres_authority_rows_not_mirrored_to_json', count($pgRows) - count($jsonRows));
            }
        }

        return [
            'collection' => $collection,
            'key' => null,
            'json_count' => count($jsonRows),
            'postgres_count' => count($pgRows),
            'missing_in_postgres' => [],
            'missing_in_json' => [],
            'mismatch_count' => 0,
            'sample_mismatches' => [],
            'blocking_issues' => $blockingIssues,
            'advisory_issues' => $advisoryIssues,
            'blocking_issue_count' => array_sum(array_column($blockingIssues, 'count')),
            'advisory_issue_count' => array_sum(array_column($advisoryIssues, 'count')),
            'authority_status' => $blockingIssues === [] ? 'ok' : 'blocked',
            'status' => $countMatches ? 'unkeyed_count_match' : ($blockingIssues === [] ? 'advisory_drift' : 'drift'),
        ];
    }

    $jsonIndex = audit_index_rows_by_key($jsonRows, $key);
    $pgIndex = audit_index_rows_by_key($pgRows, $key);
    $jsonMap = $jsonIndex['map'];
    $pgMap = $pgIndex['map'];

    $jsonIds = array_keys($jsonMap);
    $pgIds = array_keys($pgMap);
    sort($jsonIds);
    sort($pgIds);

    $missingInPostgres = array_values(array_diff($jsonIds, $pgIds));
    $missingInJson = array_values(array_diff($pgIds, $jsonIds));

    $sampleMismatches = [];
    $mismatchCount = 0;
    foreach (array_intersect($jsonIds, $pgIds) as $id) {
        $diff = audit_compare_row($jsonMap[$id], $pgMap[$id]);
        if ($diff === []) {
            continue;
        }
        $mismatchCount++;
        if (count($sampleMismatches) < 5) {
            $sampleMismatches[] = [
                'id' => $id,
                'diff' => $diff,
            ];
        }
    }

    audit_add_issue($blockingIssues, 'legacy_json_rows_missing_in_postgres_authority', audit_issue_count($missingInPostgres));
    if (audit_missing_in_json_is_blocking($mode)) {
        audit_add_issue($blockingIssues, 'postgres_rows_missing_in_shadow_json', audit_issue_count($missingInJson));
    } else {
        audit_add_issue($advisoryIssues, 'postgres_authority_rows_not_mirrored_to_json', audit_issue_count($missingInJson));
    }
    audit_add_issue($blockingIssues, 'json_postgres_payload_mismatch', $mismatchCount);

    $invalidJsonCount = count($jsonIndex['invalid_key_rows']);
    $invalidPgCount = count($pgIndex['invalid_key_rows']);
    $duplicateJsonCount = count($jsonIndex['duplicate_keys']);
    $duplicatePgCount = count($pgIndex['duplicate_keys']);
    if (audit_invalid_json_key_is_blocking($mode)) {
        audit_add_issue($blockingIssues, 'json_rows_missing_collection_key', $invalidJsonCount);
        audit_add_issue($blockingIssues, 'json_duplicate_collection_key', $duplicateJsonCount);
    } else {
        audit_add_issue($advisoryIssues, 'legacy_json_rows_missing_collection_key', $invalidJsonCount);
        audit_add_issue($advisoryIssues, 'legacy_json_duplicate_collection_key', $duplicateJsonCount);
    }
    if (audit_invalid_postgres_key_is_blocking($mode)) {
        audit_add_issue($blockingIssues, 'postgres_rows_missing_collection_key', $invalidPgCount);
        audit_add_issue($blockingIssues, 'postgres_duplicate_collection_key', $duplicatePgCount);
    } else {
        audit_add_issue($advisoryIssues, 'postgres_rows_missing_collection_key', $invalidPgCount);
        audit_add_issue($advisoryIssues, 'postgres_duplicate_collection_key', $duplicatePgCount);
    }

    $blockingIssueCount = array_sum(array_column($blockingIssues, 'count'));
    $advisoryIssueCount = array_sum(array_column($advisoryIssues, 'count'));

    return [
        'collection' => $collection,
        'key' => $key,
        'json_count' => count($jsonRows),
        'postgres_count' => count($pgRows),
        'missing_in_postgres' => $missingInPostgres,
        'missing_in_json' => $missingInJson,
        'invalid_json_key_rows' => $jsonIndex['invalid_key_rows'],
        'invalid_postgres_key_rows' => $pgIndex['invalid_key_rows'],
        'duplicate_json_keys' => $jsonIndex['duplicate_keys'],
        'duplicate_postgres_keys' => $pgIndex['duplicate_keys'],
        'mismatch_count' => $mismatchCount,
        'sample_mismatches' => $sampleMismatches,
        'blocking_issues' => $blockingIssues,
        'advisory_issues' => $advisoryIssues,
        'blocking_issue_count' => $blockingIssueCount,
        'advisory_issue_count' => $advisoryIssueCount,
        'authority_status' => $blockingIssueCount === 0 ? 'ok' : 'blocked',
        'status' => $blockingIssueCount > 0 ? 'drift' : ($advisoryIssueCount > 0 ? 'advisory_drift' : 'ok'),
    ];
}

function audit_domain(string $domain, array $jsonStore, array $pgStore, string $mode): array
{
    $jsonStore = audit_store_normalize($domain, $jsonStore);
    $pgStore = audit_store_normalize($domain, $pgStore);

    $collections = array_values(array_unique(array_merge(array_keys($jsonStore), array_keys($pgStore))));
    sort($collections);

    $results = [];
    foreach ($collections as $collection) {
        if ($collection === '_meta') {
            continue;
        }
        $jsonRows = is_array($jsonStore[$collection] ?? null) ? $jsonStore[$collection] : [];
        $pgRows = is_array($pgStore[$collection] ?? null) ? $pgStore[$collection] : [];
        $results[$collection] = audit_collection($domain, $collection, $jsonRows, $pgRows, $mode);
    }

    $blockingIssueCount = 0;
    $advisoryIssueCount = 0;
    foreach ($results as $row) {
        $blockingIssueCount += (int)($row['blocking_issue_count'] ?? 0);
        $advisoryIssueCount += (int)($row['advisory_issue_count'] ?? 0);
    }

    return [
        'status' => $blockingIssueCount > 0 ? 'drift' : 'ok',
        'advisory_status' => $advisoryIssueCount > 0 ? 'advisory_drift' : 'ok',
        'blocking_issue_count' => $blockingIssueCount,
        'advisory_issue_count' => $advisoryIssueCount,
        'collections' => $results,
    ];
}

function audit_runtime_authority_report(): array
{
    $projectRoot = audit_project_root();
    $dataDir = $projectRoot . '/data';
    $config = audit_effective_config($projectRoot, $dataDir);
    $layer = new DataLayer($dataDir, $projectRoot, $config);
    $modeSummary = $layer->getModeSummary();
    $mode = (string)($modeSummary['mode'] ?? DataLayer::MODE_JSON_ONLY);

    $masterJson = audit_read_json($dataDir . '/master-data/master-data.json');
    $ordersJson = audit_read_json($dataDir . '/orders/orders.json');
    $mesJson = audit_read_json($dataDir . '/mes/mes-runtime.json');
    $epicorJson = audit_read_json($dataDir . '/erp/epicor-runtime.json');

    $masterPg = $layer->getRuntimeMasterDataStore();
    $ordersPg = $layer->getRuntimeOrdersStore();
    $mesPg = $layer->getRuntimeMesRuntimeStore();
    $epicorPg = $layer->getRuntimeEpicorIntegrationStore();

    $pending = audit_read_json($dataDir . '/master-data/master-data-pending.json');
    $pendingEntries = array_values(array_filter((array)($pending['entries'] ?? []), static fn($row) => is_array($row) && strtolower(trim((string)($row['status'] ?? ''))) === 'pending'));

    $domains = [
        'master_data' => audit_domain('master_data', $masterJson, $masterPg, $mode),
        'orders' => audit_domain('orders', $ordersJson, $ordersPg, $mode),
        'mes' => audit_domain('mes', $mesJson, $mesPg, $mode),
        'epicor' => audit_domain('epicor', $epicorJson, $epicorPg, $mode),
    ];

    $blockingIssueCount = 0;
    $advisoryIssueCount = 0;
    foreach ($domains as $domain) {
        $blockingIssueCount += (int)($domain['blocking_issue_count'] ?? 0);
        $advisoryIssueCount += (int)($domain['advisory_issue_count'] ?? 0);
    }
    $pendingTotal = count($pendingEntries);

    return [
        'generated_at' => date(DATE_ATOM),
        'runtime_mode' => $modeSummary,
        'summary' => [
            'authority_gate_status' => ($pendingTotal === 0 && $blockingIssueCount === 0) ? 'pass' : 'fail',
            'blocking_issue_count' => $blockingIssueCount,
            'advisory_issue_count' => $advisoryIssueCount,
            'pending_change_count' => $pendingTotal,
        ],
        'master_data_pending' => [
            'pending_total' => $pendingTotal,
            'sample' => array_slice($pendingEntries, 0, 10),
        ],
        'domains' => $domains,
    ];
}

if (realpath((string)($_SERVER['SCRIPT_FILENAME'] ?? '')) === __FILE__) {
    $report = audit_runtime_authority_report();
    echo json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL;

    $hasPending = ((int)($report['summary']['pending_change_count'] ?? 0)) > 0;
    $hasBlockingDrift = ((int)($report['summary']['blocking_issue_count'] ?? 0)) > 0;
    exit(($hasPending || $hasBlockingDrift) ? 2 : 0);
}
