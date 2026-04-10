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

function md_bootstrap_stderr(string $message): void
{
    fwrite(STDERR, $message . PHP_EOL);
}

function md_bootstrap_args(array $argv): array
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
        if ($arg === '--skip-enable-runtime') {
            $args['skip-enable-runtime'] = true;
            continue;
        }
        if ($arg === '--skip-schema') {
            $args['skip-schema'] = true;
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

function md_bootstrap_first_env(string ...$names): ?string
{
    foreach ($names as $name) {
        $value = getenv($name);
        if ($value !== false && trim((string)$value) !== '') {
            return trim((string)$value);
        }
    }
    return null;
}

function md_bootstrap_project_root(): string
{
    $root = realpath(__DIR__ . '/..');
    if ($root === false) {
        throw new RuntimeException('Could not resolve project root.');
    }
    return str_replace('\\', '/', $root);
}

function md_bootstrap_data_dir(array $args, string $projectRoot): string
{
    $candidate = trim((string)($args['data-dir'] ?? ''));
    if ($candidate === '') {
        $candidate = $projectRoot . '/data';
    }
    return rtrim(str_replace('\\', '/', $candidate), '/');
}

function md_bootstrap_master_store(string $dataDir): array
{
    $path = $dataDir . '/master-data/master-data.json';
    if (!is_file($path)) {
        throw new RuntimeException("Master data file not found: {$path}");
    }
    $raw = file_get_contents($path);
    $decoded = is_string($raw) ? json_decode($raw, true) : null;
    if (!is_array($decoded)) {
        throw new RuntimeException("Invalid master-data JSON: {$path}");
    }
    return $decoded;
}

function md_bootstrap_runtime_override_path(string $dataDir): string
{
    return $dataDir . '/config/runtime_data_layer_overrides.json';
}

function md_bootstrap_config(array $args): array
{
    $config = require __DIR__ . '/../database/config.php';

    $config['host'] = (string)(
        ($args['db-host'] ?? '')
        ?: md_bootstrap_first_env('QMS_DB_HOST', 'DB_HOST')
        ?: ($config['host'] ?? 'localhost')
    );
    $config['port'] = (int)(
        ($args['db-port'] ?? '')
        ?: md_bootstrap_first_env('QMS_DB_PORT', 'DB_PORT')
        ?: ($config['port'] ?? 5432)
    );
    $config['database'] = (string)(
        ($args['db-name'] ?? '')
        ?: md_bootstrap_first_env('QMS_DB_NAME', 'DB_NAME')
        ?: ($config['database'] ?? 'mom')
    );
    $config['username'] = (string)(
        ($args['db-user'] ?? '')
        ?: md_bootstrap_first_env('QMS_DB_USER', 'DB_USER')
        ?: ($config['username'] ?? 'mom_app')
    );
    $config['password'] = (string)(
        ($args['db-pass'] ?? '')
        ?: md_bootstrap_first_env('QMS_DB_PASS', 'DB_PASS')
        ?: ($config['password'] ?? '')
    );
    $config['schema'] = (string)(
        ($args['db-schema'] ?? '')
        ?: md_bootstrap_first_env('QMS_DB_SCHEMA', 'DB_SCHEMA')
        ?: ($config['schema'] ?? 'public')
    );
    $config['allow_empty_password'] = (bool)($args['allow-empty-password'] ?? false);
    $config['use_postgres'] = true;
    $config['shadow_write'] = true;
    $config['json_fallback'] = true;
    $config['master_data_read_mode'] = 'postgres_primary';

    return $config;
}

function md_bootstrap_exec_batch($db, array $statements): void
{
    foreach ($statements as $sql) {
        $db->execute($sql);
    }
}

function md_bootstrap_schema_statements(): array
{
    return [
        <<<'SQL'
ALTER TABLE IF EXISTS variable_registry
  ADD COLUMN IF NOT EXISTS label_vi text
SQL,
        <<<'SQL'
ALTER TABLE IF EXISTS variable_registry
  ADD COLUMN IF NOT EXISTS example text
SQL,
        <<<'SQL'
ALTER TABLE IF EXISTS variable_registry
  ADD COLUMN IF NOT EXISTS validation text
SQL,
        <<<'SQL'
ALTER TABLE IF EXISTS variable_registry
  ADD COLUMN IF NOT EXISTS format text
SQL,
        <<<'SQL'
ALTER TABLE IF EXISTS variable_registry
  ADD COLUMN IF NOT EXISTS required boolean NOT NULL DEFAULT false
SQL,
        <<<'SQL'
ALTER TABLE IF EXISTS variable_registry
  ADD COLUMN IF NOT EXISTS source text
SQL,
        <<<'SQL'
ALTER TABLE IF EXISTS variable_registry
  ADD COLUMN IF NOT EXISTS used_in text[]
SQL,
        <<<'SQL'
ALTER TABLE IF EXISTS variable_registry
  ADD COLUMN IF NOT EXISTS description text
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS customers (
  customer_id text PRIMARY KEY,
  customer_name text NOT NULL,
  customer_name_vi text,
  customer_type text,
  customer_status text NOT NULL DEFAULT 'active',
  primary_contact text,
  contact_email text,
  contact_phone text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS vendors (
  vendor_id text PRIMARY KEY,
  vendor_name text NOT NULL,
  vendor_name_vi text,
  vendor_type text,
  vendor_status text NOT NULL DEFAULT 'approved',
  primary_contact text,
  contact_email text,
  contact_phone text,
  approved_process_list text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS items (
  item_id text PRIMARY KEY,
  description text NOT NULL,
  description_vi text,
  item_status text NOT NULL DEFAULT 'active',
  preferred_vendor_id text,
  customer_part_number text,
  drawing_revision text,
  material_type text,
  material_grade text,
  drawing_number text,
  lot_tracked boolean NOT NULL DEFAULT false,
  serial_tracked boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS item_revisions (
  item_rev_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id text NOT NULL,
  rev text NOT NULL,
  change_type text,
  description text,
  valid_from timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (item_id, rev)
)
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS work_centers (
  work_center_id text PRIMARY KEY,
  work_center_name text NOT NULL,
  work_center_name_vi text,
  work_center_type text NOT NULL DEFAULT 'machine',
  department_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS equipment (
  equipment_id text PRIMARY KEY,
  equipment_name text NOT NULL,
  equipment_type text,
  machine_type text,
  asset_type text,
  equipment_location text,
  department_id text,
  pm_last_date date,
  pm_next_date date,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS mes_equipment_extended (
  equipment_id text PRIMARY KEY,
  work_center_id text,
  mtconnect_agent_url text,
  opc_ua_endpoint text,
  controller_type text,
  current_e10_state text,
  current_program text,
  current_job_number text,
  current_operator_id text,
  last_heartbeat_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS tools (
  tool_id text PRIMARY KEY,
  tool_description text NOT NULL,
  tool_type text,
  tool_life_minutes integer,
  tool_life_remaining_pct numeric(5,2),
  tool_life_parts_count integer,
  tool_life_total_parts integer,
  tool_offset_length numeric(10,4),
  tool_breakage_detected boolean NOT NULL DEFAULT false,
  tool_location text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS records (
  record_id text PRIMARY KEY,
  record_type text NOT NULL,
  dept_code text,
  status text NOT NULL DEFAULT 'open',
  title text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  form_code text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS mes_nc_release_packages (
  package_id text PRIMARY KEY,
  program_id text,
  item_id text,
  revision_code text,
  operation_seq integer,
  machine_family text,
  work_center_id text,
  controller_program_name text,
  checksum_sha256 text,
  release_manifest_version text,
  released_by text,
  released_at timestamptz,
  package_status text NOT NULL DEFAULT 'draft',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS mes_connectivity_adapters (
  adapter_id text PRIMARY KEY,
  equipment_id text,
  adapter_name text NOT NULL,
  adapter_type text NOT NULL,
  transport_protocol text,
  endpoint_url text,
  heartbeat_sla_seconds integer,
  stale_after_seconds integer,
  auth_mode text,
  store_and_forward_enabled boolean NOT NULL DEFAULT false,
  payload_schema_version text,
  adapter_status text NOT NULL DEFAULT 'active',
  last_validated_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS mes_alarm_catalog (
  alarm_code text PRIMARY KEY,
  controller_family text NOT NULL,
  alarm_group text,
  alarm_title text NOT NULL,
  alarm_title_vi text,
  default_severity text,
  downtime_category_default text,
  response_owner_role text,
  response_target_minutes integer,
  requires_lockout boolean NOT NULL DEFAULT false,
  requires_maintenance boolean NOT NULL DEFAULT false,
  catalog_status text NOT NULL DEFAULT 'active',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS mes_alarm_playbooks (
  playbook_id text PRIMARY KEY,
  alarm_code text,
  playbook_title text NOT NULL,
  playbook_title_vi text,
  response_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  escalation_role text,
  response_target_minutes integer,
  playbook_status text NOT NULL DEFAULT 'active',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS mes_tool_assemblies (
  assembly_id text PRIMARY KEY,
  parent_tool_id text,
  component_tool_id text,
  component_role text NOT NULL DEFAULT 'component',
  quantity_required numeric(12,4) NOT NULL DEFAULT 1,
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_to timestamptz,
  assembly_status text NOT NULL DEFAULT 'active',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)
SQL,
    ];
}

function md_bootstrap_write_runtime_overrides(string $path, array $config): void
{
    $dir = dirname($path);
    if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
        throw new RuntimeException("Could not create config dir: {$dir}");
    }

    $payload = [
        '_meta' => [
            'updated' => date(DATE_ATOM),
            'updated_by' => 'bootstrap_master_data_authoritative_db',
            'source' => 'bootstrap_master_data_authoritative_db',
        ],
        'config' => [
            'host' => (string)$config['host'],
            'port' => (int)$config['port'],
            'database' => (string)$config['database'],
            'username' => (string)$config['username'],
            'schema' => (string)$config['schema'],
            'sslmode' => (string)($config['sslmode'] ?? 'prefer'),
            'allow_empty_password' => (bool)($config['allow_empty_password'] ?? false),
            'use_postgres' => true,
            'shadow_write' => true,
            'json_fallback' => true,
            'master_data_read_mode' => 'postgres_primary',
        ],
    ];

    if ((string)($config['password'] ?? '') !== '') {
        $payload['config']['password'] = (string)$config['password'];
    }

    $json = json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (!is_string($json) || file_put_contents($path, $json . PHP_EOL) === false) {
        throw new RuntimeException("Could not write runtime overrides: {$path}");
    }
}

function md_bootstrap_report_table_counts($db): array
{
    $tables = [
        'customers',
        'vendors',
        'items',
        'item_revisions',
        'work_centers',
        'equipment',
        'mes_equipment_extended',
        'tools',
        'records',
        'employees',
        'mes_nc_release_packages',
        'mes_connectivity_adapters',
        'mes_alarm_catalog',
        'mes_alarm_playbooks',
        'mes_tool_assemblies',
    ];
    $counts = [];
    foreach ($tables as $table) {
        $counts[$table] = (int)$db->queryScalar("SELECT COUNT(*) FROM {$table}");
    }
    return $counts;
}

try {
    $args = md_bootstrap_args($argv);
    $projectRoot = md_bootstrap_project_root();
    $dataDir = md_bootstrap_data_dir($args, $projectRoot);
    $store = md_bootstrap_master_store($dataDir);
    $config = md_bootstrap_config($args);

    $report = [
        'ok' => true,
        'dry_run' => (bool)($args['dry-run'] ?? false),
        'data_dir' => $dataDir,
        'override_path' => md_bootstrap_runtime_override_path($dataDir),
        'target' => [
            'host' => $config['host'],
            'port' => $config['port'],
            'database' => $config['database'],
            'schema' => $config['schema'],
            'username' => $config['username'],
            'allow_empty_password' => (bool)($config['allow_empty_password'] ?? false),
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
        md_bootstrap_exec_batch($db, md_bootstrap_schema_statements());
    }
    $syncOk = $layer->syncMasterDataStore($store);
    if (!$syncOk) {
        throw new RuntimeException('syncMasterDataStore returned false.');
    }

    if (!(bool)($args['skip-enable-runtime'] ?? false)) {
        md_bootstrap_write_runtime_overrides(md_bootstrap_runtime_override_path($dataDir), $config);
    }

    Connection::resetInstance();
    $verifyLayer = new DataLayer($dataDir, $projectRoot, $config);
    $verifyStore = $verifyLayer->getRuntimeMasterDataStore();
    $verifyMeta = $verifyLayer->getLastReadMeta();
    $verifyDb = $verifyLayer->getConnection();
    if ($verifyDb === null) {
        throw new RuntimeException('Verification connection is not active.');
    }

    $report['mode'] = $verifyLayer->getMode();
    $report['last_read_meta'] = $verifyMeta;
    $report['table_counts'] = md_bootstrap_report_table_counts($verifyDb);
    $report['summary'] = [
        'customers' => count((array)($verifyStore['customers'] ?? [])),
        'suppliers' => count((array)($verifyStore['suppliers'] ?? [])),
        'parts' => count((array)($verifyStore['parts'] ?? [])),
        'revisions' => count((array)($verifyStore['revisions'] ?? [])),
        'machines' => count((array)($verifyStore['machines'] ?? [])),
        'operators' => count((array)($verifyStore['operators'] ?? [])),
    ];

    echo json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL;
    exit(0);
} catch (Throwable $e) {
    md_bootstrap_stderr('[bootstrap_master_data_authoritative_db] ' . $e->getMessage());
    echo json_encode([
        'ok' => false,
        'error' => $e->getMessage(),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL;
    exit(1);
}
