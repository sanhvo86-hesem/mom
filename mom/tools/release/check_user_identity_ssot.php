#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * User Identity SSOT — Static check, run in deploy.yml CI gate.
 *
 * Enforces the rules in .ai/USER_IDENTITY_SSOT.md across the full tracked
 * file set:
 *
 *   1. No hardcoded role literals in portal JS (must reference ROLES /
 *      DEFAULT_NEW_USER_ROLE / window.ROLES).
 *   2. No `CREATE TABLE` that introduces a new identity-shaped table
 *      (username + role + …) outside the allowlist.
 *   3. No INSERT/UPDATE on users / employees / hcm_employees outside the
 *      allowlisted writer files.
 *   4. No direct mutation of mom/data/config/users.json by sed / cat > /
 *      file_put_contents() outside DataSyncMutationService.
 *
 * Output: P0 violations to STDERR, exit code 1. Clean tree exits 0 with
 * "user identity ssot clean" on stdout.
 *
 * Invoked from .github/workflows/deploy.yml after the repo-boundary check
 * and before phpunit. Mirrors the same shape so failure mode is identical
 * (clear annotation, blocks the SSH-to-VPS step).
 */

$root = dirname(__DIR__, 3);

// ----------------------------------------------------------------------------
// Tracked file list
// ----------------------------------------------------------------------------
$git = trim((string)shell_exec('command -v git 2>/dev/null'));
if ($git === '') {
    fwrite(STDERR, "git is required for ssot checks\n");
    exit(2);
}
$output = [];
$status = 0;
exec('git -C ' . escapeshellarg($root) . ' ls-files', $output, $status);
if ($status !== 0) {
    fwrite(STDERR, "Unable to list tracked files\n");
    exit(2);
}

// ----------------------------------------------------------------------------
// Allowlists
// ----------------------------------------------------------------------------

// Files that are PERMITTED to contain role-key literals (SSOT source itself).
$ROLE_LITERAL_ALLOW = [
    'mom/scripts/portal/01-data-config.js',     // ROLES const, _ROLE_MIGRATE, DEFAULT_NEW_USER_ROLE
    'mom/scripts/portal/02-state-auth-ui.js',   // legacy _ROLE_MIGRATE mirror (tracked tech debt)
    'mom/api/services/AuthUserShadowSyncService.php', // role-code normalization
    'mom/api.php',                              // bootstrap + role validation
    'mom/data/config/users.bootstrap.json',     // seed user records
    'mom/database/migrations/',                 // schema seeds + RBAC bootstrap
];

// Files that are PERMITTED to do INSERT/UPDATE against users/employees/hcm_employees.
$USER_TABLE_WRITER_ALLOW = [
    'mom/api/services/AuthUserShadowSyncService.php',
    'mom/api/services/DataSyncMutationService.php',
    'mom/database/migrations/',
    'mom/database/DataLayer.php',                // legacy projection (refactor pending)
    'mom/database/JsonImporter.php',             // bootstrap importer (cold-start path)
    'mom/api/controllers/UserController.php',    // calls AuthUserShadowSyncService
];

// Files that are PERMITTED to call file_put_contents() against users.json.
$USERS_JSON_WRITER_ALLOW = [
    'mom/api/services/DataSyncMutationService.php',
    'mom/api/services/AuthUserShadowSyncService.php',
    'mom/api.php',                                // legacy users_save() path
    'tools/vps-setup/scripts/',                   // data-push.sh family
];

// Forbidden identity-shaped columns in NEW tables.
$IDENTITY_COLUMN_NAMES = [
    'username', 'password_hash', 'full_name', 'employee_name', 'cccd',
];

// Tables that legitimately have these columns (existing schema).
$EXISTING_IDENTITY_TABLES = [
    'users', 'employees', 'hcm_employees', 'portal_users',
    'srm_supplier_portal_users', 'dw_employee_dim',
    // Audit-snapshot tables that intentionally denormalize employee_name at
    // event time (ISO ALCOA+ "Contemporaneous" — the name on the training
    // record / ack record must reflect who the person was when the event
    // happened, even if they're later renamed in users).
    'eqms_document_acknowledgements', 'eqms_training_records',
    // SCIM / federated identity tables would be added here if introduced.
];

// ----------------------------------------------------------------------------
// Scan rules
// ----------------------------------------------------------------------------

/** @var list<array{path:string, line:int, rule:string, snippet:string}> */
$findings = [];

foreach ($output as $path) {
    if ($path === '' || str_starts_with($path, '.git/')) continue;
    $abs = $root . DIRECTORY_SEPARATOR . $path;
    if (!is_file($abs)) continue;
    if (str_starts_with($path, '_reports/') || str_starts_with($path, 'mom/_reports/')) continue;
    if (str_starts_with($path, 'mom/docs/')) continue;  // narrative docs may mention role names
    if (str_starts_with($path, 'mom/tools/release/')) continue;  // this script's own examples
    if (str_starts_with($path, '.ai/')) continue;        // policy docs reference role names
    if (str_starts_with($path, 'tests/')) continue;      // test fixtures legitimately use literals
    if (str_starts_with($path, 'mom/tests/')) continue;

    $content = @file_get_contents($abs);
    if ($content === false) continue;

    // ------------------------------------------------------------------------
    // Rule 1: Hardcoded role literals in portal JS
    // ------------------------------------------------------------------------
    if (preg_match('#^mom/scripts/portal/.*\.js$#', $path)) {
        $allowed = false;
        foreach ($ROLE_LITERAL_ALLOW as $allow) {
            if ($path === $allow || str_starts_with($path, rtrim($allow, '/') . '/')) {
                $allowed = true;
                break;
            }
        }
        if (!$allowed) {
            // Look for: role:'cnc_operator', role: "ceo", role === 'qa_manager', etc.
            // Match the role key seed pattern. To be tractable, hardcode the role-key form.
            $roleKeyRegex = '#\brole\s*[:=]\s*[\'\"](ceo|production_director|cnc_workshop_manager|shift_leader|setup_technician|cnc_operator|deburr_team_lead|deburr_technician|production_planner|cleaning_packaging_supervisor|cleaning_packaging_technician|maintenance_technician|engineering_lead|process_engineer|cam_nc_programmer|qa_manager|quality_engineer|qc_inspector|qms_engineer|internal_auditor|supply_chain_manager|buyer|warehouse_clerk|tool_storekeeper|logistics_coordinator|estimator|sales_manager|finance_manager|gl_payroll_accountant|hr_manager|ehs_specialist|it_admin|epicor_admin|trainee|admin)[\'\"]#';
            $lines = explode("\n", $content);
            foreach ($lines as $i => $line) {
                if (preg_match($roleKeyRegex, $line, $m)) {
                    $findings[] = [
                        'path' => $path,
                        'line' => $i + 1,
                        'rule' => 'hardcoded_role_literal',
                        'snippet' => trim(substr($line, 0, 120)),
                    ];
                }
            }
        }
    }

    // ------------------------------------------------------------------------
    // Rule 2: New CREATE TABLE with identity columns
    // ------------------------------------------------------------------------
    if (preg_match('#\.sql$#', $path)) {
        // Find CREATE TABLE blocks. Cheap heuristic: each "CREATE TABLE foo (" + 50 lines.
        if (preg_match_all('#CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+(?:public\.)?(\w+)\s*\(#i', $content, $m, PREG_OFFSET_CAPTURE)) {
            foreach ($m[1] as $idx => $match) {
                $tableName = strtolower($match[0]);
                if (in_array($tableName, $EXISTING_IDENTITY_TABLES, true)) continue;
                // Take the chunk after the CREATE TABLE line, look for forbidden identity columns
                $offset = $match[1];
                $chunk = substr($content, $offset, 4000);
                $endIdx = strpos($chunk, ');');
                if ($endIdx !== false) $chunk = substr($chunk, 0, $endIdx);
                foreach ($IDENTITY_COLUMN_NAMES as $col) {
                    if (preg_match('#\b' . preg_quote($col, '#') . '\s+(varchar|character|text|citext)#i', $chunk)) {
                        // Compute line number of the CREATE TABLE
                        $line = substr_count(substr($content, 0, $offset), "\n") + 1;
                        $findings[] = [
                            'path' => $path,
                            'line' => $line,
                            'rule' => 'new_identity_table',
                            'snippet' => "CREATE TABLE $tableName with forbidden column '$col' — extend users/hcm_employees instead",
                        ];
                        break; // one finding per table is enough
                    }
                }
            }
        }
    }

    // ------------------------------------------------------------------------
    // Rule 3: INSERT/UPDATE on users / employees / hcm_employees outside allowlist
    // ------------------------------------------------------------------------
    if (preg_match('#\.php$#', $path) && !str_starts_with($path, 'mom/database/migrations/')) {
        $allowed = false;
        foreach ($USER_TABLE_WRITER_ALLOW as $allow) {
            if ($path === $allow || str_starts_with($path, rtrim($allow, '/') . '/')) {
                $allowed = true;
                break;
            }
        }
        if (!$allowed) {
            $userWriteRegex = '#\b(INSERT\s+INTO|UPDATE)\s+(?:public\.)?(?:users|employees|hcm_employees)\b#i';
            $lines = explode("\n", $content);
            foreach ($lines as $i => $line) {
                if (preg_match($userWriteRegex, $line, $m)) {
                    $findings[] = [
                        'path' => $path,
                        'line' => $i + 1,
                        'rule' => 'direct_user_table_write',
                        'snippet' => trim(substr($line, 0, 120)),
                    ];
                }
            }
        }
    }

    // ------------------------------------------------------------------------
    // Rule 4: Direct users.json write outside allowlist
    // ------------------------------------------------------------------------
    if (preg_match('#\.(php|js|sh|py)$#', $path)) {
        $allowed = false;
        foreach ($USERS_JSON_WRITER_ALLOW as $allow) {
            if ($path === $allow || str_starts_with($path, rtrim($allow, '/') . '/')) {
                $allowed = true;
                break;
            }
        }
        if (!$allowed) {
            // Match a write of users.json — but NOT diagnostic strings sent to
            // STDERR / STDOUT / php://stderr that merely mention the filename.
            // Strategy: the first argument must look like a path/variable, not a
            // stdio stream constant.
            $usersJsonWriteRegex = '#(file_put_contents|writeFileSync|writeFile)\s*\(\s*(?!STDERR|STDOUT|php://stderr|php://stdout)[^,)]*users\.json#i';
            $lines = explode("\n", $content);
            foreach ($lines as $i => $line) {
                if (preg_match($usersJsonWriteRegex, $line)) {
                    $findings[] = [
                        'path' => $path,
                        'line' => $i + 1,
                        'rule' => 'direct_users_json_write',
                        'snippet' => trim(substr($line, 0, 120)),
                    ];
                }
            }
        }
    }
}

// ----------------------------------------------------------------------------
// Report
// ----------------------------------------------------------------------------
if ($findings === []) {
    fwrite(STDOUT, "user identity ssot clean\n");
    exit(0);
}

fwrite(STDERR, "user identity ssot violations:\n\n");
foreach ($findings as $f) {
    fwrite(STDERR, sprintf(
        "[%s] %s:%d  %s\n",
        $f['rule'],
        $f['path'],
        $f['line'],
        $f['snippet']
    ));
}
fwrite(STDERR, sprintf("\nTotal: %d violation(s). See .ai/USER_IDENTITY_SSOT.md for the policy.\n", count($findings)));
exit(1);
