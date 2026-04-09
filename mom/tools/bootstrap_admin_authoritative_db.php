<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "This script must be run from CLI.\n");
    exit(1);
}

define('API_HELPERS_ONLY', true);
require dirname(__DIR__) . '/api.php';

/**
 * @return array<string, string|bool>
 */
function admin_bootstrap_parse_args(array $argv): array
{
    $args = [
        'seed-file' => '',
        'skip-audit-backfill' => false,
        'skip-config-sync' => false,
    ];

    foreach (array_slice($argv, 1) as $arg) {
        if ($arg === '--skip-audit-backfill') {
            $args['skip-audit-backfill'] = true;
            continue;
        }
        if ($arg === '--skip-config-sync') {
            $args['skip-config-sync'] = true;
            continue;
        }
        if (str_starts_with($arg, '--seed-file=')) {
            $args['seed-file'] = substr($arg, strlen('--seed-file='));
        }
    }

    return $args;
}

function admin_bootstrap_run_command(string $command): string
{
    $output = [];
    $code = 0;
    exec($command . ' 2>&1', $output, $code);
    if ($code !== 0) {
        throw new RuntimeException("Command failed ({$code}): {$command}\n" . implode("\n", $output));
    }
    return implode("\n", $output);
}

/**
 * @return array{
 *   roles: array<int, array<string, mixed>>,
 *   departments: array<int, array<string, mixed>>,
 *   deptTitles: array<string, array<int, string>>
 * }
 */
function admin_bootstrap_load_seed(string $portalRoot, string $seedFile = ''): array
{
    if ($seedFile !== '') {
        $resolved = realpath($seedFile) ?: $seedFile;
        if (!is_file($resolved)) {
            throw new RuntimeException("Seed file not found: {$resolved}");
        }
        $decoded = json_decode((string)file_get_contents($resolved), true);
        if (!is_array($decoded)) {
            throw new RuntimeException("Seed file is not valid JSON: {$resolved}");
        }
        return $decoded;
    }

    $extractor = $portalRoot . '/mom/tools/extract_admin_catalog_seed.mjs';
    $source = $portalRoot . '/mom/scripts/portal/01-data-config.js';
    $node = trim((string)shell_exec('command -v node 2>/dev/null'));
    if ($node === '') {
        throw new RuntimeException('Node.js is required to extract admin seed catalog. Pass --seed-file=... if Node is unavailable.');
    }

    $json = admin_bootstrap_run_command(
        escapeshellarg($node) . ' ' . escapeshellarg($extractor) . ' ' . escapeshellarg($source)
    );
    $decoded = json_decode($json, true);
    if (!is_array($decoded)) {
        throw new RuntimeException('Failed to decode extracted admin catalog seed.');
    }
    return $decoded;
}

/**
 * @return array<int, array<string, mixed>>
 */
function admin_bootstrap_users_store(string $usersFile): array
{
    $store = users_load($usersFile);
    return is_array($store['users'] ?? null) ? array_values(array_filter($store['users'], 'is_array')) : [];
}

function admin_bootstrap_slug(string $value): string
{
    $value = strtolower(trim($value));
    $value = preg_replace('/[^a-z0-9]+/i', '_', $value) ?: 'item';
    $value = trim($value, '_');
    return strtoupper($value !== '' ? $value : 'ITEM');
}

function admin_bootstrap_role_title_matches(array $role, string $title): bool
{
    $candidates = [
        (string)($role['labelEn'] ?? ''),
        (string)($role['label'] ?? ''),
    ];
    $needle = mb_strtolower(trim($title));
    foreach ($candidates as $candidate) {
        if ($needle !== '' && mb_strtolower(trim($candidate)) === $needle) {
            return true;
        }
    }
    return false;
}

function admin_bootstrap_pick_manager_employee_id(array $users, string $deptCode, array $rolesByCode): ?string
{
    $best = null;
    foreach ($users as $user) {
        if (!is_array($user) || empty($user['active'])) {
            continue;
        }
        if (strtoupper(trim((string)($user['dept'] ?? ''))) !== strtoupper($deptCode)) {
            continue;
        }
        $roleCode = trim((string)($user['role'] ?? ''));
        $role = $rolesByCode[$roleCode] ?? null;
        $level = is_array($role) ? (int)($role['level'] ?? 99) : 99;
        if ($best === null || $level < $best['level']) {
            $best = [
                'level' => $level,
                'employee_id' => portal_auth_employee_id_for_user($user),
            ];
        }
    }
    return $best['employee_id'] ?? null;
}

function admin_bootstrap_exec_batch($db, array $statements): void
{
    foreach ($statements as $sql) {
        $db->execute($sql);
    }
}

function admin_bootstrap_schema($db): void
{
    admin_bootstrap_exec_batch($db, [
        <<<'SQL'
CREATE OR REPLACE FUNCTION app_uuid_v4()
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  raw text := md5(random()::text || clock_timestamp()::text || random()::text);
BEGIN
  RETURN (
    substr(raw, 1, 8) || '-' ||
    substr(raw, 9, 4) || '-' ||
    '4' || substr(raw, 14, 3) || '-' ||
    substr('89ab', (ascii(substr(raw, 17, 1)) % 4) + 1, 1) || substr(raw, 18, 3) || '-' ||
    substr(raw, 21, 12)
  )::uuid;
END;
$$
SQL,
        <<<'SQL'
CREATE OR REPLACE FUNCTION set_row_version_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_at = COALESCE(NEW.created_at, now());
    NEW.updated_at = COALESCE(NEW.updated_at, NEW.created_at);
    NEW.row_version = COALESCE(NEW.row_version, 1);
  ELSE
    NEW.created_at = COALESCE(NEW.created_at, OLD.created_at, now());
    NEW.updated_at = now();
    NEW.row_version = COALESCE(OLD.row_version, 0) + 1;
  END IF;
  RETURN NEW;
END;
$$
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS departments (
  dept_code text PRIMARY KEY,
  label text NOT NULL,
  label_vi text,
  color text,
  icon text,
  is_active boolean NOT NULL DEFAULT true,
  form_series jsonb NOT NULL DEFAULT '[]'::jsonb,
  record_types jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  org_company_code text,
  org_legal_entity_code text,
  org_plant_id text,
  org_site_id text,
  source_record_id text,
  source_system text NOT NULL DEFAULT 'PORTAL_BOOTSTRAP',
  payload_schema_version text NOT NULL DEFAULT '1.0',
  row_version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS roles (
  role_id uuid PRIMARY KEY DEFAULT app_uuid_v4(),
  role_code text NOT NULL UNIQUE,
  role_label text NOT NULL,
  role_label_vi text,
  dept_code text REFERENCES departments(dept_code) ON DELETE SET NULL,
  description text,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  org_company_code text,
  org_legal_entity_code text,
  org_plant_id text,
  org_site_id text,
  source_record_id text,
  source_system text NOT NULL DEFAULT 'PORTAL_BOOTSTRAP',
  payload_schema_version text NOT NULL DEFAULT '1.0',
  row_version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS hcm_org_units (
  hcm_org_unit_id uuid PRIMARY KEY DEFAULT app_uuid_v4(),
  org_unit_code text NOT NULL UNIQUE,
  org_unit_name text NOT NULL,
  org_unit_type text NOT NULL DEFAULT 'department',
  parent_org_unit_id uuid REFERENCES hcm_org_units(hcm_org_unit_id) ON DELETE SET NULL,
  manager_employee_id text,
  cost_center text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active',
  org_company_code text,
  org_legal_entity_code text,
  org_plant_id text,
  org_site_id text,
  source_record_id text,
  source_system text NOT NULL DEFAULT 'PORTAL_BOOTSTRAP',
  payload_schema_version text NOT NULL DEFAULT '1.0',
  row_version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS hcm_positions (
  hcm_position_id uuid PRIMARY KEY DEFAULT app_uuid_v4(),
  position_code text NOT NULL UNIQUE,
  position_title text NOT NULL,
  hcm_org_unit_id uuid NOT NULL REFERENCES hcm_org_units(hcm_org_unit_id) ON DELETE CASCADE,
  reports_to_position_id uuid REFERENCES hcm_positions(hcm_position_id) ON DELETE SET NULL,
  required_headcount integer NOT NULL DEFAULT 1,
  employment_type text NOT NULL DEFAULT 'full_time',
  grade_code text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active',
  org_company_code text,
  org_legal_entity_code text,
  org_plant_id text,
  org_site_id text,
  source_record_id text,
  source_system text NOT NULL DEFAULT 'PORTAL_BOOTSTRAP',
  payload_schema_version text NOT NULL DEFAULT '1.0',
  row_version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS users (
  user_id uuid PRIMARY KEY DEFAULT app_uuid_v4(),
  employee_id text NOT NULL UNIQUE,
  username text NOT NULL UNIQUE,
  email text NOT NULL,
  full_name text NOT NULL,
  full_name_vi text,
  password_hash text NOT NULL,
  dept_code text REFERENCES departments(dept_code) ON DELETE SET NULL,
  primary_role_id uuid REFERENCES roles(role_id) ON DELETE SET NULL,
  supervisor_id uuid,
  shift text,
  portal_language text NOT NULL DEFAULT 'vi',
  status text NOT NULL DEFAULT 'active',
  mfa_enabled boolean NOT NULL DEFAULT false,
  mfa_secret text,
  last_login_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  org_company_code text,
  org_legal_entity_code text,
  org_plant_id text,
  org_site_id text,
  source_record_id text,
  source_system text NOT NULL DEFAULT 'AUTH_JSON',
  payload_schema_version text NOT NULL DEFAULT '1.0',
  row_version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS user_roles (
  user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by text,
  valid_from timestamptz,
  valid_to timestamptz,
  org_company_code text,
  org_legal_entity_code text,
  org_plant_id text,
  org_site_id text,
  source_record_id text,
  source_system text NOT NULL DEFAULT 'AUTH_JSON',
  payload_schema_version text NOT NULL DEFAULT '1.0',
  row_version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
)
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS employees (
  employee_id text PRIMARY KEY,
  employee_name text NOT NULL,
  user_id_code text,
  user_id uuid REFERENCES users(user_id) ON DELETE SET NULL,
  role_code text,
  role_label text,
  dept_code text REFERENCES departments(dept_code) ON DELETE SET NULL,
  shift text,
  employment_status text NOT NULL DEFAULT 'active',
  hire_date date,
  termination_date date,
  supervisor_name text,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  org_company_code text,
  org_legal_entity_code text,
  org_plant_id text,
  org_site_id text,
  source_record_id text,
  source_system text NOT NULL DEFAULT 'AUTH_JSON',
  payload_schema_version text NOT NULL DEFAULT '1.0',
  row_version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS hcm_employees (
  employee_id text PRIMARY KEY,
  hcm_position_id uuid REFERENCES hcm_positions(hcm_position_id) ON DELETE SET NULL,
  hcm_org_unit_id uuid REFERENCES hcm_org_units(hcm_org_unit_id) ON DELETE SET NULL,
  employment_status text NOT NULL DEFAULT 'active',
  hire_type text,
  payroll_group text,
  labor_grade text,
  citizenship_country text,
  default_shift_code text,
  emergency_contact_name text,
  emergency_contact_phone text,
  itar_access_approved boolean,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  org_company_code text,
  org_legal_entity_code text,
  org_plant_id text,
  org_site_id text,
  source_record_id text,
  source_system text NOT NULL DEFAULT 'AUTH_JSON',
  payload_schema_version text NOT NULL DEFAULT '1.0',
  row_version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS variable_registry (
  variable_registry_id uuid PRIMARY KEY DEFAULT app_uuid_v4(),
  category text NOT NULL,
  key text NOT NULL,
  label text NOT NULL,
  data_type text NOT NULL DEFAULT 'json',
  enum_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  row_version bigint NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category, key)
)
SQL,
        <<<'SQL'
CREATE TABLE IF NOT EXISTS audit_events (
  event_id uuid PRIMARY KEY DEFAULT app_uuid_v4(),
  event_type text NOT NULL,
  aggregate_type text NOT NULL DEFAULT 'api_action',
  aggregate_id text,
  actor_id text,
  actor_name text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address inet,
  session_id uuid,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  source_event_hash text UNIQUE
)
SQL,
        'CREATE INDEX IF NOT EXISTS idx_roles_dept_code ON roles (dept_code)',
        'CREATE INDEX IF NOT EXISTS idx_hcm_org_units_parent ON hcm_org_units (parent_org_unit_id)',
        'CREATE INDEX IF NOT EXISTS idx_hcm_positions_org_unit ON hcm_positions (hcm_org_unit_id)',
        'CREATE INDEX IF NOT EXISTS idx_hcm_positions_reports_to ON hcm_positions (reports_to_position_id)',
        'CREATE INDEX IF NOT EXISTS idx_users_primary_role_id ON users (primary_role_id)',
        'CREATE INDEX IF NOT EXISTS idx_users_status ON users (status)',
        'CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees (user_id)',
        'CREATE INDEX IF NOT EXISTS idx_hcm_employees_position_id ON hcm_employees (hcm_position_id)',
        'CREATE INDEX IF NOT EXISTS idx_hcm_employees_org_unit_id ON hcm_employees (hcm_org_unit_id)',
        'CREATE INDEX IF NOT EXISTS idx_audit_events_recorded_at ON audit_events (recorded_at DESC)',
        'CREATE INDEX IF NOT EXISTS idx_audit_events_actor_name ON audit_events (actor_name)',
        'CREATE INDEX IF NOT EXISTS idx_audit_events_event_type ON audit_events (event_type)',
        'CREATE INDEX IF NOT EXISTS idx_audit_events_aggregate_type ON audit_events (aggregate_type)',
    ]);

    $triggerTables = [
        'departments',
        'roles',
        'hcm_org_units',
        'hcm_positions',
        'users',
        'user_roles',
        'employees',
        'hcm_employees',
        'variable_registry',
    ];
    foreach ($triggerTables as $table) {
        $trigger = 'trg_' . $table . '_row_version';
        $db->execute("DROP TRIGGER IF EXISTS {$trigger} ON {$table}");
        $db->execute(
            "CREATE TRIGGER {$trigger}
             BEFORE INSERT OR UPDATE ON {$table}
             FOR EACH ROW EXECUTE FUNCTION set_row_version_timestamp()"
        );
    }
}

/**
 * @param array<int, array<string, mixed>> $departments
 */
function admin_bootstrap_seed_departments($db, array $departments): int
{
    $count = 0;
    foreach ($departments as $department) {
        $code = strtoupper(trim((string)($department['code'] ?? '')));
        if ($code === '') {
            continue;
        }
        $labelVi = trim((string)($department['label'] ?? $code));
        $labelEn = trim((string)($department['labelEn'] ?? $labelVi));
        $color = trim((string)($department['color'] ?? ''));
        $db->insertReturning(
            'INSERT INTO departments (
                dept_code, label, label_vi, color, icon, is_active, metadata, source_record_id
             ) VALUES (
                :dept_code, :label, :label_vi, :color, :icon, true, :metadata::jsonb, :source_record_id
             )
             ON CONFLICT (dept_code) DO UPDATE SET
                label = EXCLUDED.label,
                label_vi = EXCLUDED.label_vi,
                color = EXCLUDED.color,
                icon = EXCLUDED.icon,
                is_active = EXCLUDED.is_active,
                metadata = COALESCE(departments.metadata, \'{}\'::jsonb) || EXCLUDED.metadata,
                source_record_id = EXCLUDED.source_record_id,
                updated_at = now()
             RETURNING dept_code',
            [
                ':dept_code' => $code,
                ':label' => $labelEn,
                ':label_vi' => $labelVi,
                ':color' => $color !== '' ? $color : null,
                ':icon' => null,
                ':metadata' => json_encode([
                    'label_en' => $labelEn,
                    'color' => $color,
                    'catalog_source' => 'portal_default_departments',
                ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                ':source_record_id' => $code,
            ]
        );
        $count++;
    }
    return $count;
}

/**
 * @param array<int, array<string, mixed>> $roles
 * @return array<string, string>
 */
function admin_bootstrap_seed_roles($db, array $roles): array
{
    $ids = [];
    foreach ($roles as $role) {
        $code = trim((string)($role['code'] ?? ''));
        if ($code === '') {
            continue;
        }
        $deptCode = strtoupper(trim((string)($role['dept'] ?? '')));
        $labelVi = trim((string)($role['label'] ?? $code));
        $labelEn = trim((string)($role['labelEn'] ?? $labelVi));
        $permissions = [
            'level' => (int)($role['level'] ?? 5),
            'approve' => !empty($role['approve']),
            'admin' => !empty($role['admin']),
            'canEditDocs' => !empty($role['canEditDocs']),
            'canCreateDocs' => !empty($role['canCreateDocs']),
            'canViewActivity' => !empty($role['canViewActivity']),
            'canExportUsers' => !empty($role['canExportUsers']),
            'icon' => (string)($role['icon'] ?? '👤'),
            'color' => (string)($role['color'] ?? ''),
        ];
        $row = $db->insertReturning(
            'INSERT INTO roles (
                role_code, role_label, role_label_vi, dept_code, description, permissions, is_active, metadata, source_record_id
             ) VALUES (
                :role_code, :role_label, :role_label_vi, :dept_code, :description, :permissions::jsonb, true, :metadata::jsonb, :source_record_id
             )
             ON CONFLICT (role_code) DO UPDATE SET
                role_label = EXCLUDED.role_label,
                role_label_vi = EXCLUDED.role_label_vi,
                dept_code = EXCLUDED.dept_code,
                description = EXCLUDED.description,
                permissions = EXCLUDED.permissions,
                is_active = EXCLUDED.is_active,
                metadata = COALESCE(roles.metadata, \'{}\'::jsonb) || EXCLUDED.metadata,
                source_record_id = EXCLUDED.source_record_id,
                updated_at = now()
             RETURNING role_id, role_code',
            [
                ':role_code' => $code,
                ':role_label' => $labelEn,
                ':role_label_vi' => $labelVi,
                ':dept_code' => $deptCode !== '' ? $deptCode : null,
                ':description' => trim((string)($role['description'] ?? '')) ?: null,
                ':permissions' => json_encode($permissions, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                ':metadata' => json_encode([
                    'catalog_source' => 'portal_roles',
                ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                ':source_record_id' => $code,
            ]
        );
        if (is_array($row) && !empty($row['role_id'])) {
            $ids[$code] = (string)$row['role_id'];
        }
    }
    return $ids;
}

/**
 * @param array<int, array<string, mixed>> $departments
 * @param array<int, array<string, mixed>> $users
 * @param array<string, array<string, mixed>> $rolesByCode
 * @return array<string, string>
 */
function admin_bootstrap_seed_org_units($db, array $departments, array $users, array $rolesByCode): array
{
    $ids = [];
    foreach ($departments as $department) {
        $code = strtoupper(trim((string)($department['code'] ?? '')));
        if ($code === '') {
            continue;
        }
        $labelVi = trim((string)($department['label'] ?? $code));
        $managerEmployeeId = admin_bootstrap_pick_manager_employee_id($users, $code, $rolesByCode);
        $metadata = [
            'label_en' => trim((string)($department['labelEn'] ?? $labelVi)),
            'color' => trim((string)($department['color'] ?? '')),
            'catalog_source' => 'portal_default_departments',
        ];
        $row = $db->insertReturning(
            'INSERT INTO hcm_org_units (
                org_unit_code, org_unit_name, org_unit_type, manager_employee_id, metadata, status, source_record_id
             ) VALUES (
                :org_unit_code, :org_unit_name, :org_unit_type, :manager_employee_id, :metadata::jsonb, :status, :source_record_id
             )
             ON CONFLICT (org_unit_code) DO UPDATE SET
                org_unit_name = EXCLUDED.org_unit_name,
                org_unit_type = EXCLUDED.org_unit_type,
                manager_employee_id = EXCLUDED.manager_employee_id,
                metadata = COALESCE(hcm_org_units.metadata, \'{}\'::jsonb) || EXCLUDED.metadata,
                status = EXCLUDED.status,
                source_record_id = EXCLUDED.source_record_id,
                updated_at = now()
             RETURNING hcm_org_unit_id, org_unit_code',
            [
                ':org_unit_code' => $code,
                ':org_unit_name' => $labelVi,
                ':org_unit_type' => 'department',
                ':manager_employee_id' => $managerEmployeeId,
                ':metadata' => json_encode($metadata, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                ':status' => 'active',
                ':source_record_id' => $code,
            ]
        );
        if (is_array($row) && !empty($row['hcm_org_unit_id'])) {
            $ids[$code] = (string)$row['hcm_org_unit_id'];
        }
    }
    return $ids;
}

/**
 * @param array<string, array<int, string>> $deptTitles
 * @param array<int, array<string, mixed>> $roles
 * @param array<int, array<string, mixed>> $users
 * @param array<string, string> $orgUnitIds
 * @return array<string, string>
 */
function admin_bootstrap_seed_positions($db, array $deptTitles, array $roles, array $users, array $orgUnitIds): array
{
    $positionIds = [];
    $rolesByDept = [];
    foreach ($roles as $role) {
        $deptCode = strtoupper(trim((string)($role['dept'] ?? '')));
        if ($deptCode === '') {
            continue;
        }
        $rolesByDept[$deptCode][] = $role;
    }

    $userCounts = [];
    foreach ($users as $user) {
        if (!is_array($user)) {
            continue;
        }
        $deptCode = strtoupper(trim((string)($user['dept'] ?? '')));
        $title = trim((string)($user['title'] ?? ''));
        if ($deptCode === '' || $title === '') {
            continue;
        }
        $lookup = $deptCode . '__' . mb_strtolower($title);
        $userCounts[$lookup] = ($userCounts[$lookup] ?? 0) + 1;
    }

    foreach ($deptTitles as $deptCodeRaw => $titles) {
        $deptCode = strtoupper(trim((string)$deptCodeRaw));
        $orgUnitId = $orgUnitIds[$deptCode] ?? null;
        if ($deptCode === '' || !$orgUnitId || !is_array($titles)) {
            continue;
        }
        foreach ($titles as $titleRaw) {
            $title = trim((string)$titleRaw);
            if ($title === '') {
                continue;
            }
            $roleMatch = null;
            foreach (($rolesByDept[$deptCode] ?? []) as $role) {
                if (admin_bootstrap_role_title_matches($role, $title)) {
                    $roleMatch = $role;
                    break;
                }
            }
            $positionCode = $roleMatch
                ? strtoupper(trim((string)($roleMatch['code'] ?? '')))
                : admin_bootstrap_slug($deptCode . '_' . $title);
            $lookup = $deptCode . '__' . mb_strtolower($title);
            $requiredHeadcount = max(1, (int)($userCounts[$lookup] ?? 0));
            $employmentType = str_contains(mb_strtolower($title), 'intern') ? 'intern' : 'full_time';

            $row = $db->insertReturning(
                'INSERT INTO hcm_positions (
                    position_code, position_title, hcm_org_unit_id, required_headcount, employment_type, metadata, status, source_record_id
                 ) VALUES (
                    :position_code, :position_title, :hcm_org_unit_id, :required_headcount, :employment_type, :metadata::jsonb, :status, :source_record_id
                 )
                 ON CONFLICT (position_code) DO UPDATE SET
                    position_title = EXCLUDED.position_title,
                    hcm_org_unit_id = EXCLUDED.hcm_org_unit_id,
                    required_headcount = EXCLUDED.required_headcount,
                    employment_type = EXCLUDED.employment_type,
                    metadata = COALESCE(hcm_positions.metadata, \'{}\'::jsonb) || EXCLUDED.metadata,
                    status = EXCLUDED.status,
                    source_record_id = EXCLUDED.source_record_id,
                    updated_at = now()
                 RETURNING hcm_position_id, position_code',
                [
                    ':position_code' => $positionCode,
                    ':position_title' => $title,
                    ':hcm_org_unit_id' => $orgUnitId,
                    ':required_headcount' => $requiredHeadcount,
                    ':employment_type' => $employmentType,
                    ':metadata' => json_encode([
                        'dept_code' => $deptCode,
                        'catalog_source' => 'portal_default_titles',
                    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                    ':status' => 'active',
                    ':source_record_id' => $positionCode,
                ]
            );
            if (is_array($row) && !empty($row['hcm_position_id'])) {
                $positionIds[$lookup] = (string)$row['hcm_position_id'];
            }
        }
    }

    return $positionIds;
}

/**
 * @param array<int, array<string, mixed>> $users
 */
function admin_bootstrap_sync_configs(array $users, string $confDir): void
{
    $configFiles = [
        'portal_display_config' => $confDir . '/portal_display_config.json',
        'role_permissions' => $confDir . '/role_permissions.json',
        'docs_visibility' => $confDir . '/docs_visibility.json',
        'module_access_config' => $confDir . '/module_access_config.json',
        'portal_role_docs' => $confDir . '/portal_role_docs.json',
        'user_doc_overrides' => $confDir . '/user_doc_overrides.json',
    ];

    foreach ($configFiles as $key => $file) {
        if (!is_file($file)) {
            continue;
        }
        $payload = read_json_file($file);
        if (is_array($payload)) {
            portal_system_config_shadow_write($key, $payload);
        }
    }

    $usersStore = users_load($confDir . '/users.json');
    $dataCollection = is_array($usersStore['data_collection'] ?? null) ? (array)$usersStore['data_collection'] : null;
    if ($dataCollection !== null) {
        portal_system_config_shadow_write('data_collection_settings', [
            'settings' => $dataCollection,
            'updated_by' => 'bootstrap_admin_authoritative_db',
            'updated_at' => now_iso(),
        ]);
    }
}

function admin_bootstrap_backfill_audit(string $dataDir): int
{
    $auditDir = $dataDir . '/audit';
    if (!is_dir($auditDir)) {
        return 0;
    }

    $count = 0;
    $files = array_values(array_filter((array)scandir($auditDir), static fn(string $file): bool => str_ends_with($file, '.jsonl')));
    sort($files);
    foreach ($files as $file) {
        $lines = @file($auditDir . '/' . $file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
        foreach ($lines as $line) {
            $decoded = json_decode($line, true);
            if (!is_array($decoded)) {
                continue;
            }
            $payload = is_array($decoded['payload'] ?? null) ? (array)$decoded['payload'] : [];
            $metadata = is_array($decoded['metadata'] ?? null) ? (array)$decoded['metadata'] : [];
            $metadata['backfilled_from'] = $file;
            portal_system_audit_shadow_write([
                'event_type' => (string)($decoded['event_type'] ?? $decoded['action'] ?? 'legacy_event'),
                'aggregate_type' => (string)($decoded['aggregate_type'] ?? 'api_action'),
                'aggregate_id' => (string)($decoded['aggregate_id'] ?? ''),
                'actor_id' => (string)($decoded['actor_id'] ?? ''),
                'actor_name' => (string)($decoded['actor_name'] ?? $decoded['user'] ?? ''),
                'payload' => $payload,
                'metadata' => $metadata,
                'ip_address' => (string)($decoded['ip_address'] ?? $decoded['ip'] ?? ''),
                'session_id' => (string)($decoded['session_id'] ?? ''),
                'recorded_at' => (string)($decoded['recorded_at'] ?? $decoded['timestamp'] ?? now_iso()),
            ]);
            $count++;
        }
    }

    return $count;
}

try {
    $args = admin_bootstrap_parse_args($argv);
    $portalRoot = $GLOBALS['ROOT_DIR'] ?? (realpath(dirname(__DIR__) . '/..') ?: dirname(dirname(__DIR__)));
    $dataDir = $GLOBALS['DATA_DIR'] ?? (dirname(__DIR__) . '/data');
    $confDir = $GLOBALS['CONF_DIR'] ?? ($dataDir . '/config');
    $usersFile = $GLOBALS['USERS_FILE'] ?? ($confDir . '/users.json');

    $seed = admin_bootstrap_load_seed((string)$portalRoot, (string)$args['seed-file']);
    $users = admin_bootstrap_users_store((string)$usersFile);
    $roles = is_array($seed['roles'] ?? null) ? array_values((array)$seed['roles']) : [];
    $departments = is_array($seed['departments'] ?? null) ? array_values((array)$seed['departments']) : [];
    $deptTitles = is_array($seed['deptTitles'] ?? null) ? (array)$seed['deptTitles'] : [];
    $rolesByCode = [];
    foreach ($roles as $role) {
        $code = trim((string)($role['code'] ?? ''));
        if ($code !== '') {
            $rolesByCode[$code] = $role;
        }
    }

    $db = portal_system_db_connection();
    if (!$db) {
        throw new RuntimeException('System DB connection is unavailable. Check DB_HOST/DB_NAME/DB_USER/DB_PASS.');
    }

    $result = $db->transactional(function () use ($db, $departments, $roles, $deptTitles, $users, $rolesByCode): array {
        admin_bootstrap_schema($db);
        $seededDepartments = admin_bootstrap_seed_departments($db, $departments);
        $roleIds = admin_bootstrap_seed_roles($db, $roles);
        $orgUnitIds = admin_bootstrap_seed_org_units($db, $departments, $users, $rolesByCode);
        $positionIds = admin_bootstrap_seed_positions($db, $deptTitles, $roles, $users, $orgUnitIds);
        return [
            'departments' => $seededDepartments,
            'roles' => count($roleIds),
            'org_units' => count($orgUnitIds),
            'positions' => count($positionIds),
        ];
    });

    if (!$args['skip-config-sync']) {
        admin_bootstrap_sync_configs($users, (string)$confDir);
    }

    $auditBackfilled = 0;
    if (!$args['skip-audit-backfill']) {
        $auditBackfilled = admin_bootstrap_backfill_audit((string)$dataDir);
    }

    fwrite(STDOUT, "Admin authoritative bootstrap complete\n");
    fwrite(STDOUT, 'departments=' . (int)($result['departments'] ?? 0) . "\n");
    fwrite(STDOUT, 'roles=' . (int)($result['roles'] ?? 0) . "\n");
    fwrite(STDOUT, 'org_units=' . (int)($result['org_units'] ?? 0) . "\n");
    fwrite(STDOUT, 'positions=' . (int)($result['positions'] ?? 0) . "\n");
    fwrite(STDOUT, 'config_sync=' . ($args['skip-config-sync'] ? 'skipped' : 'done') . "\n");
    fwrite(STDOUT, 'audit_backfilled=' . $auditBackfilled . "\n");
} catch (Throwable $e) {
    fwrite(STDERR, '[bootstrap_admin_authoritative_db] ' . $e->getMessage() . "\n");
    exit(1);
}
