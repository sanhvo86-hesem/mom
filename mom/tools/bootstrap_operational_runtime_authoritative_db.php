<?php

declare(strict_types=1);

use MOM\Database\Connection;
use MOM\Database\DataLayer;

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "This script must be run from CLI.\n");
    exit(1);
}

require_once __DIR__ . '/../database/Connection.php';
require_once __DIR__ . '/../database/RuntimeShadowSync.php';
require_once __DIR__ . '/../database/DataLayer.php';

function op_bootstrap_args(array $argv): array
{
    $args = [
        'data-dir' => '',
        'db-host' => '',
        'db-port' => '',
        'db-name' => '',
        'db-user' => '',
        'db-pass' => '',
        'db-schema' => '',
        'allow-empty-password' => false,
        'skip-schema' => false,
        'skip-enable-runtime' => false,
        'dry-run' => false,
    ];

    foreach (array_slice($argv, 1) as $arg) {
        if ($arg === '--allow-empty-password') {
            $args['allow-empty-password'] = true;
            continue;
        }
        if ($arg === '--skip-schema') {
            $args['skip-schema'] = true;
            continue;
        }
        if ($arg === '--skip-enable-runtime') {
            $args['skip-enable-runtime'] = true;
            continue;
        }
        if ($arg === '--dry-run') {
            $args['dry-run'] = true;
            continue;
        }
        if (!str_starts_with($arg, '--')) {
            continue;
        }
        [$key, $value] = array_pad(explode('=', substr($arg, 2), 2), 2, '');
        if ($key !== '') {
            $args[$key] = $value;
        }
    }

    return $args;
}

function op_bootstrap_first_env(string ...$names): ?string
{
    foreach ($names as $name) {
        $value = getenv($name);
        if ($value !== false && trim((string)$value) !== '') {
            return trim((string)$value);
        }
    }
    return null;
}

function op_bootstrap_project_root(): string
{
    $root = realpath(__DIR__ . '/..');
    if ($root === false) {
        throw new RuntimeException('Could not resolve project root.');
    }
    return str_replace('\\', '/', $root);
}

function op_bootstrap_data_dir(array $args, string $projectRoot): string
{
    $candidate = trim((string)($args['data-dir'] ?? ''));
    if ($candidate === '') {
        $candidate = $projectRoot . '/data';
    }
    return rtrim(str_replace('\\', '/', $candidate), '/');
}

function op_bootstrap_json_store(string $path, string $label): array
{
    if (!is_file($path)) {
        throw new RuntimeException("{$label} file not found: {$path}");
    }
    $raw = file_get_contents($path);
    $decoded = is_string($raw) ? json_decode($raw, true) : null;
    if (!is_array($decoded)) {
        throw new RuntimeException("Invalid {$label} JSON: {$path}");
    }
    return $decoded;
}

function op_bootstrap_runtime_override_path(string $dataDir): string
{
    return $dataDir . '/config/runtime_data_layer_overrides.json';
}

function op_bootstrap_config(array $args): array
{
    $config = require __DIR__ . '/../database/config.php';

    $config['host'] = (string)(
        ($args['db-host'] ?? '')
        ?: op_bootstrap_first_env('QMS_DB_HOST', 'DB_HOST')
        ?: ($config['host'] ?? 'localhost')
    );
    $config['port'] = (int)(
        ($args['db-port'] ?? '')
        ?: op_bootstrap_first_env('QMS_DB_PORT', 'DB_PORT')
        ?: ($config['port'] ?? 5432)
    );
    $config['database'] = (string)(
        ($args['db-name'] ?? '')
        ?: op_bootstrap_first_env('QMS_DB_NAME', 'DB_NAME')
        ?: ($config['database'] ?? 'mom')
    );
    $config['username'] = (string)(
        ($args['db-user'] ?? '')
        ?: op_bootstrap_first_env('QMS_DB_USER', 'DB_USER')
        ?: ($config['username'] ?? 'mom_app')
    );
    $config['password'] = (string)(
        ($args['db-pass'] ?? '')
        ?: op_bootstrap_first_env('QMS_DB_PASS', 'DB_PASS')
        ?: ($config['password'] ?? '')
    );
    $config['schema'] = (string)(
        ($args['db-schema'] ?? '')
        ?: op_bootstrap_first_env('QMS_DB_SCHEMA', 'DB_SCHEMA')
        ?: ($config['schema'] ?? 'public')
    );
    $config['allow_empty_password'] = (bool)($args['allow-empty-password'] ?? false);
    $config['use_postgres'] = true;
    $config['shadow_write'] = true;
    $config['json_fallback'] = true;
    $config['master_data_read_mode'] = (string)($config['master_data_read_mode'] ?? 'default');
    $config['orders_read_mode'] = 'postgres_primary';
    $config['mes_read_mode'] = 'postgres_primary';
    $config['epicor_read_mode'] = 'postgres_primary';

    return $config;
}

function op_bootstrap_exec_batch(Connection $db, array $statements): void
{
    foreach ($statements as $sql) {
        $db->execute($sql);
    }
}

function op_bootstrap_schema_statements(): array
{
    return [
        <<<'SQL'
CREATE TABLE IF NOT EXISTS sales_orders (
  sales_order_number text PRIMARY KEY,
  so_status text NOT NULL DEFAULT 'open',
  customer_id text NOT NULL,
  customer_po_number text,
  order_date date,
  requested_date date,
  promise_date date,
  priority_code text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS job_orders (
  job_order_id text PRIMARY KEY DEFAULT ('JOB-' || substr(md5(clock_timestamp()::text || random()::text), 1, 24)),
  job_number text NOT NULL UNIQUE,
  job_status text NOT NULL DEFAULT 'planned',
  item_id text NOT NULL,
  order_qty numeric(18,4) NOT NULL DEFAULT 0,
  customer_id text,
  sales_order_ref text,
  start_date_planned date,
  end_date_planned date,
  routing_revision_used text,
  planner_code text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS job_operations (
  job_order_id text NOT NULL,
  operation_seq integer NOT NULL,
  operation_code text,
  description text,
  work_center_id text,
  machine_id text,
  setup_time_planned numeric(18,4),
  setup_time_actual numeric(18,4),
  run_time_planned numeric(18,4),
  run_time_actual numeric(18,4),
  qty_completed numeric(18,4) NOT NULL DEFAULT 0,
  qty_scrapped numeric(18,4) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  started_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (job_order_id, operation_seq)
)
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS mes_dispatch_queue (
  equipment_id text NOT NULL,
  job_number text NOT NULL,
  operation_seq integer NOT NULL,
  dispatch_priority text NOT NULL DEFAULT 'STANDARD',
  sequence_in_queue integer,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  est_setup_minutes numeric(18,4),
  est_run_minutes numeric(18,4),
  qty_to_produce numeric(18,4) NOT NULL DEFAULT 0,
  queue_status text NOT NULL DEFAULT 'scheduled',
  material_available boolean NOT NULL DEFAULT false,
  tooling_available boolean NOT NULL DEFAULT false,
  fixture_available boolean NOT NULL DEFAULT false,
  operator_qualified boolean NOT NULL DEFAULT false,
  priority_score integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (equipment_id, job_number, operation_seq)
)
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS mes_operation_execution (
  job_number text NOT NULL,
  operation_seq integer NOT NULL,
  equipment_id text NOT NULL,
  run_start_at timestamptz,
  last_piece_at timestamptz,
  qty_good numeric(18,4) NOT NULL DEFAULT 0,
  qty_scrap numeric(18,4) NOT NULL DEFAULT 0,
  setup_time_actual numeric(18,4),
  run_time_actual numeric(18,4),
  operator_id text,
  program_name text,
  phase text,
  is_complete boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (job_number, operation_seq, equipment_id)
)
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS mes_downtime_events (
  downtime_id bigint GENERATED BY DEFAULT AS IDENTITY,
  start_time timestamptz NOT NULL,
  equipment_id text NOT NULL,
  end_time timestamptz,
  duration_seconds numeric(18,4),
  is_planned boolean NOT NULL DEFAULT false,
  downtime_category text,
  reason_code text,
  reason_text text,
  resolved_by text,
  resolution_action text,
  operator_id text,
  shift_code text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (downtime_id, start_time)
)
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS maintenance_work_orders (
  work_order_id text PRIMARY KEY,
  wo_type text NOT NULL DEFAULT 'corrective',
  wo_status text NOT NULL DEFAULT 'requested',
  equipment_id text NOT NULL,
  priority text NOT NULL DEFAULT 'normal',
  scheduled_end timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS mes_connectivity_events (
  adapter_event_id text PRIMARY KEY,
  adapter_id text,
  equipment_id text,
  event_time timestamptz NOT NULL DEFAULT now(),
  event_type text NOT NULL DEFAULT 'heartbeat',
  severity text NOT NULL DEFAULT 'WARNING',
  event_status text NOT NULL DEFAULT 'open',
  message text,
  payload_excerpt jsonb NOT NULL DEFAULT '{}'::jsonb,
  acknowledged_by text,
  acknowledged_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  recorded_by text,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS mes_machine_alarms (
  alarm_time timestamptz NOT NULL,
  equipment_id text NOT NULL,
  alarm_code text NOT NULL,
  alarm_text text,
  alarm_severity text,
  alarm_group text,
  is_active boolean NOT NULL DEFAULT true,
  is_acknowledged boolean NOT NULL DEFAULT false,
  acknowledged_by text,
  acknowledged_at timestamptz,
  escalation_status text,
  escalated_by text,
  escalated_at timestamptz,
  cleared_at timestamptz,
  cleared_by text,
  related_job_number text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (alarm_time, equipment_id, alarm_code)
)
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS mes_nc_download_receipts (
  receipt_id text PRIMARY KEY,
  package_id text,
  program_id text,
  equipment_id text,
  work_order_number text,
  downloaded_at timestamptz NOT NULL DEFAULT now(),
  controller_program_name text,
  controller_checksum text,
  expected_checksum text,
  verified_match boolean NOT NULL DEFAULT false,
  receipt_status text NOT NULL DEFAULT 'pending',
  acknowledged_by text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS mes_tool_preset_offsets (
  preset_id text PRIMARY KEY,
  tool_id text,
  equipment_id text,
  work_order_number text,
  offset_number text,
  preset_length_mm numeric(18,4),
  preset_diameter_mm numeric(18,4),
  wear_offset_mm numeric(18,4),
  offset_drift_mm numeric(18,4),
  measurement_source text NOT NULL DEFAULT 'presetter',
  measured_at timestamptz NOT NULL DEFAULT now(),
  measured_by text,
  verified_status text NOT NULL DEFAULT 'verified',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS mes_material_consumption (
  consumption_id text PRIMARY KEY,
  consumed_at timestamptz NOT NULL DEFAULT now(),
  job_number text NOT NULL,
  operation_seq integer,
  equipment_id text,
  item_id text NOT NULL,
  lot_number text,
  heat_number text,
  material_cert_number text,
  consumption_type text NOT NULL DEFAULT 'CONSUMED',
  qty_consumed numeric(18,4) NOT NULL DEFAULT 0,
  qty_uom text NOT NULL DEFAULT 'EA',
  operator_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS mes_part_genealogy (
  genealogy_id text PRIMARY KEY,
  job_number text NOT NULL,
  item_id text NOT NULL,
  part_rev text,
  serial_number text,
  lot_number text,
  raw_material_lot text,
  raw_material_heat text,
  operations_completed integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS mes_shift_handover (
  handover_id text PRIMARY KEY,
  equipment_id text NOT NULL,
  handover_date date,
  shift_from text NOT NULL,
  shift_to text NOT NULL,
  operator_from text NOT NULL,
  operator_to text,
  job_in_progress text,
  operation_in_progress integer,
  parts_completed numeric(18,4),
  machine_state text,
  issues_noted text,
  pending_actions text,
  quality_alerts text,
  tooling_status text,
  acknowledged_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS mes_dpp_passports (
  dpp_id text PRIMARY KEY,
  genealogy_id text,
  job_number text NOT NULL,
  item_id text NOT NULL,
  part_rev text,
  serial_number text,
  lot_number text,
  passport_status text NOT NULL DEFAULT 'draft',
  qr_code text,
  passport_url text,
  origin_country text,
  material_composition jsonb NOT NULL DEFAULT '[]'::jsonb,
  recycled_content_pct numeric(18,4),
  carbon_footprint_kg_co2e numeric(18,4),
  energy_consumption_kwh numeric(18,4),
  recycling_info text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS mes_energy_snapshots (
  energy_snapshot_id text PRIMARY KEY,
  equipment_id text NOT NULL,
  work_center_id text,
  work_order_number text,
  shift_code text,
  captured_at timestamptz NOT NULL DEFAULT now(),
  power_kw numeric(18,4),
  energy_kwh numeric(18,4),
  good_qty integer NOT NULL DEFAULT 0,
  scrap_qty integer NOT NULL DEFAULT 0,
  energy_per_unit_kwh numeric(18,4),
  target_energy_per_unit_kwh numeric(18,4),
  source_type text NOT NULL DEFAULT 'manual_bridge',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS mes_cost_tracking (
  cost_id text PRIMARY KEY,
  work_order_number text NOT NULL,
  job_number text,
  equipment_id text,
  work_center_id text,
  item_id text,
  part_rev text,
  captured_at timestamptz NOT NULL DEFAULT now(),
  cost_status text NOT NULL DEFAULT 'draft',
  standard_cost_total numeric(18,4),
  actual_cost_total numeric(18,4),
  material_cost numeric(18,4),
  labor_cost numeric(18,4),
  energy_cost numeric(18,4),
  overhead_cost numeric(18,4),
  good_qty integer NOT NULL DEFAULT 0,
  scrap_qty integer NOT NULL DEFAULT 0,
  cost_per_good_unit numeric(18,4),
  variance_pct numeric(18,4),
  variance_threshold_pct numeric(18,4),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS mes_erp_sync_runs (
  sync_run_id text PRIMARY KEY,
  integration_system text NOT NULL DEFAULT 'Epicor Kinetic',
  sync_direction text NOT NULL DEFAULT 'inbound',
  sync_domain text NOT NULL,
  transport_mode text NOT NULL DEFAULT 'rest',
  sync_status text NOT NULL DEFAULT 'success',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  latency_ms integer NOT NULL DEFAULT 0,
  records_received integer NOT NULL DEFAULT 0,
  records_processed integer NOT NULL DEFAULT 0,
  records_failed integer NOT NULL DEFAULT 0,
  checkpoint_key text,
  checkpoint_value text,
  summary text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
)
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS mes_erp_reconciliation_exceptions (
  reconciliation_id text PRIMARY KEY,
  sync_domain text NOT NULL DEFAULT 'general',
  entity_type text NOT NULL DEFAULT 'runtime',
  entity_id text NOT NULL,
  discrepancy_type text NOT NULL DEFAULT 'mismatch',
  severity text NOT NULL DEFAULT 'warning',
  expected_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  actual_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  difference_summary text,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  owner_role text,
  exception_status text NOT NULL DEFAULT 'open',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
)
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS mes_erp_outbound_queue (
  queue_id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  entity_type text NOT NULL DEFAULT 'runtime',
  entity_id text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  send_status text NOT NULL DEFAULT 'queued',
  erp_response jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  retry_count integer NOT NULL DEFAULT 0
)
SQL,
    ];
}

function op_bootstrap_write_runtime_overrides(string $path, array $config): void
{
    $dir = dirname($path);
    if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
        throw new RuntimeException("Could not create config dir: {$dir}");
    }

    $existing = [];
    if (is_file($path)) {
        $raw = file_get_contents($path);
        $decoded = is_string($raw) ? json_decode($raw, true) : null;
        if (is_array($decoded)) {
            $existing = is_array($decoded['config'] ?? null) ? $decoded['config'] : $decoded;
        }
    }

    $merged = array_merge($existing, [
        'host' => (string)$config['host'],
        'port' => (int)$config['port'],
        'database' => (string)$config['database'],
        'username' => (string)$config['username'],
        'schema' => (string)$config['schema'],
        'sslmode' => (string)($config['sslmode'] ?? ($existing['sslmode'] ?? 'prefer')),
        'allow_empty_password' => (bool)($config['allow_empty_password'] ?? false),
        'use_postgres' => true,
        'shadow_write' => true,
        'json_fallback' => true,
        'orders_read_mode' => 'postgres_primary',
        'mes_read_mode' => 'postgres_primary',
        'epicor_read_mode' => 'postgres_primary',
    ]);

    if ((string)($config['password'] ?? '') !== '') {
        $merged['password'] = (string)$config['password'];
    }

    $payload = [
        '_meta' => [
            'updated' => date(DATE_ATOM),
            'updated_by' => 'bootstrap_operational_runtime_authoritative_db',
            'source' => 'bootstrap_operational_runtime_authoritative_db',
        ],
        'config' => $merged,
    ];

    $json = json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (!is_string($json) || file_put_contents($path, $json . PHP_EOL) === false) {
        throw new RuntimeException("Could not write runtime overrides: {$path}");
    }
}

function op_bootstrap_report_table_counts(Connection $db): array
{
    $tables = [
        'sales_orders',
        'job_orders',
        'job_operations',
        'mes_dispatch_queue',
        'mes_operation_execution',
        'mes_downtime_events',
        'maintenance_work_orders',
        'mes_connectivity_events',
        'mes_machine_alarms',
        'mes_nc_download_receipts',
        'mes_tool_preset_offsets',
        'mes_material_consumption',
        'mes_part_genealogy',
        'mes_shift_handover',
        'mes_dpp_passports',
        'mes_energy_snapshots',
        'mes_cost_tracking',
        'mes_erp_sync_runs',
        'mes_erp_reconciliation_exceptions',
        'mes_erp_outbound_queue',
    ];

    $counts = [];
    foreach ($tables as $table) {
        $counts[$table] = (int)$db->queryScalar("SELECT COUNT(*) FROM {$table}");
    }
    return $counts;
}

function op_bootstrap_store_counts(array $store, array $keys): array
{
    $counts = [];
    foreach ($keys as $key) {
        $counts[$key] = count((array)($store[$key] ?? []));
    }
    return $counts;
}

try {
    $args = op_bootstrap_args($argv);
    $projectRoot = op_bootstrap_project_root();
    $dataDir = op_bootstrap_data_dir($args, $projectRoot);
    $masterStore = op_bootstrap_json_store($dataDir . '/master-data/master-data.json', 'master data');
    $ordersStore = op_bootstrap_json_store($dataDir . '/orders/orders.json', 'orders runtime');
    $mesStore = op_bootstrap_json_store($dataDir . '/mes/mes-runtime.json', 'MES runtime');
    $epicorStore = op_bootstrap_json_store($dataDir . '/erp/epicor-runtime.json', 'Epicor runtime');
    $config = op_bootstrap_config($args);

    $report = [
        'ok' => true,
        'dry_run' => (bool)($args['dry-run'] ?? false),
        'data_dir' => $dataDir,
        'override_path' => op_bootstrap_runtime_override_path($dataDir),
        'target' => [
            'host' => $config['host'],
            'port' => $config['port'],
            'database' => $config['database'],
            'schema' => $config['schema'],
            'username' => $config['username'],
            'allow_empty_password' => (bool)($config['allow_empty_password'] ?? false),
        ],
        'json_counts' => [
            'master' => op_bootstrap_store_counts($masterStore, ['customers', 'suppliers', 'parts', 'revisions']),
            'orders' => op_bootstrap_store_counts($ordersStore, ['sales_orders', 'job_orders', 'work_orders', 'form_links']),
            'mes' => op_bootstrap_store_counts($mesStore, ['progress_reports', 'downtime_events', 'maintenance_requests', 'tooling_status', 'connector_feeds', 'machine_signals', 'mes_connectivity_events', 'machine_alarm_events', 'nc_download_receipts', 'mes_tool_preset_offsets', 'material_consumption', 'part_genealogy', 'shift_handover', 'dpp_passports', 'energy_snapshots', 'cost_tracking']),
            'epicor' => op_bootstrap_store_counts($epicorStore, ['sync_runs', 'reconciliation_exceptions', 'outbox_events']),
        ],
    ];

    if ($report['dry_run']) {
        echo json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL;
        exit(0);
    }

    Connection::resetInstance();
    $layer = new DataLayer($dataDir, $projectRoot, $config);
    $db = $layer->getConnection();
    if ($db === null) {
        throw new RuntimeException('PostgreSQL connection is not active.');
    }
    if (!(bool)($args['skip-schema'] ?? false)) {
        op_bootstrap_exec_batch($db, op_bootstrap_schema_statements());
    }

    $masterSynced = $layer->syncMasterDataStore($masterStore);
    $ordersSynced = $layer->syncOrdersStore($ordersStore);
    $mesSynced = $layer->syncMesRuntimeStore($mesStore, $ordersStore, $masterStore);
    $epicorSynced = $layer->syncEpicorRuntimeStore($epicorStore);

    if ($masterSynced !== true || $ordersSynced !== true || $mesSynced !== true || $epicorSynced !== true) {
        throw new RuntimeException('Operational runtime bootstrap shadow sync did not fully commit to PostgreSQL.');
    }

    if (!(bool)($args['skip-enable-runtime'] ?? false)) {
        op_bootstrap_write_runtime_overrides(op_bootstrap_runtime_override_path($dataDir), $config);
    }

    Connection::resetInstance();
    $verifyLayer = new DataLayer($dataDir, $projectRoot, array_merge($config, [
        'orders_read_mode' => 'postgres_primary',
        'mes_read_mode' => 'postgres_primary',
        'epicor_read_mode' => 'postgres_primary',
    ]));

    $verifiedOrders = $verifyLayer->getRuntimeOrdersStore();
    $ordersMeta = $verifyLayer->getLastReadMeta();
    $verifiedMes = $verifyLayer->getRuntimeMesRuntimeStore();
    $mesMeta = $verifyLayer->getLastReadMeta();
    $verifiedEpicor = $verifyLayer->getRuntimeEpicorIntegrationStore();
    $epicorMeta = $verifyLayer->getLastReadMeta();
    $verifyDb = $verifyLayer->getConnection();
    if ($verifyDb === null) {
        throw new RuntimeException('Verification connection is not active.');
    }

    $report['mode'] = $verifyLayer->getMode();
    $report['db_counts'] = op_bootstrap_report_table_counts($verifyDb);
    $report['verify'] = [
        'orders_source' => $ordersMeta['source'] ?? 'unknown',
        'orders' => op_bootstrap_store_counts($verifiedOrders, ['sales_orders', 'job_orders', 'work_orders', 'form_links']),
        'mes_source' => $mesMeta['source'] ?? 'unknown',
        'mes' => op_bootstrap_store_counts($verifiedMes, ['progress_reports', 'downtime_events', 'maintenance_requests', 'tooling_status', 'connector_feeds', 'machine_signals', 'mes_connectivity_events', 'machine_alarm_events', 'nc_download_receipts', 'mes_tool_preset_offsets', 'material_consumption', 'part_genealogy', 'shift_handover', 'dpp_passports', 'energy_snapshots', 'cost_tracking']),
        'epicor_source' => $epicorMeta['source'] ?? 'unknown',
        'epicor' => op_bootstrap_store_counts($verifiedEpicor, ['sync_runs', 'reconciliation_exceptions', 'outbox_events', 'checkpoints']),
    ];
    echo json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL;
} catch (Throwable $e) {
    fwrite(STDERR, '[bootstrap-operational-runtime] ' . $e->getMessage() . PHP_EOL);
    exit(1);
}
