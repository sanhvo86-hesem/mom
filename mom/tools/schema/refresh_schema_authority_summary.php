<?php

declare(strict_types=1);

$portalRoot = dirname(__DIR__, 2);
$databaseDir = $portalRoot . '/database';
$registryDir = $portalRoot . '/data/registry';
$migrationsDir = $databaseDir . '/migrations';
$schemaSqlPath = $databaseDir . '/schema.sql';
$jsonTargets = [
    $databaseDir . '/schema-authority-summary.json',
    $registryDir . '/schema-authority-summary.json',
];
$markdownTarget = $databaseDir . '/schema-authority-summary.md';

function refresh_schema_authority_read_json(string $path): array
{
    if (!is_file($path)) {
        return [];
    }
    $decoded = json_decode((string)file_get_contents($path), true);
    return is_array($decoded) ? $decoded : [];
}

function refresh_schema_authority_write_file(string $path, string $contents): void
{
    $dir = dirname($path);
    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }
    $tmp = $path . '.tmp';
    if (@file_put_contents($tmp, $contents, LOCK_EX) === false || !@rename($tmp, $path)) {
        @unlink($tmp);
        if (@file_put_contents($path, $contents, LOCK_EX) === false) {
            throw new RuntimeException('Unable to write file: ' . $path);
        }
    }
}

$existing = refresh_schema_authority_read_json($databaseDir . '/schema-authority-summary.json');
$existingAuthority = is_array($existing['schema_authority'] ?? null) ? $existing['schema_authority'] : [];
$tableRegistry = refresh_schema_authority_read_json($registryDir . '/table-registry.json');
$registryTableCount = count((array)($tableRegistry['tables'] ?? []));

$migrationNumbers = [];
foreach (glob($migrationsDir . '/*.sql') ?: [] as $file) {
    if (preg_match('/(^|\/)(\d{3})_/', str_replace('\\', '/', (string)$file), $matches)) {
        $migrationNumbers[] = (int)$matches[2];
    }
}
sort($migrationNumbers);
if ($migrationNumbers === []) {
    throw new RuntimeException('No migration files found.');
}

$minMigration = min($migrationNumbers);
$maxMigration = max($migrationNumbers);
$migrationRange = sprintf('%03d–%03d', $minMigration, $maxMigration);
$declaredAt = gmdate('c');
$schemaSql = is_file($schemaSqlPath) ? (string)file_get_contents($schemaSqlPath) : '';
$schemaCreateTableCount = $schemaSql === '' ? 0 : preg_match_all('/CREATE\s+TABLE/i', $schemaSql);
$tableCount = $schemaCreateTableCount > 0 ? $schemaCreateTableCount : $registryTableCount;
$referenceArtifacts = array_values(array_filter((array)($existingAuthority['reference_sql_artifacts'] ?? []), 'is_array'));
if ($referenceArtifacts === []) {
    $referenceArtifacts = [
        [
            'file' => 'database/canonical-erp-mes-eqms-7-layer-blueprint.sql',
            'classification' => 'conceptual_blueprint',
            'description' => 'ISA-95/IEC 62264 seven-layer conceptual model. NOT executable authority.',
            'authority' => false,
        ],
        [
            'file' => 'database/mes-schema-specification.sql',
            'classification' => 'specification_reference',
            'description' => 'MES layer specification reference. NOT executable authority.',
            'authority' => false,
        ],
    ];
}

$authority = [
    'version' => (string)($existingAuthority['version'] ?? '1.1.0'),
    'declared_at' => $declaredAt,
    'authoritative_schema_source' => 'database/migrations/*.sql (' . $migrationRange . ')',
    'authoritative_schema_file' => 'database/schema.sql',
    'authority_scope' => 'platform_global',
    'table_count' => $tableCount,
    'registry_table_count' => $registryTableCount,
    'migration_range' => $migrationRange,
    'migration_count' => count($migrationNumbers),
    'schema_snapshot_create_table_count' => $schemaCreateTableCount,
    'migrations_role' => 'executable_source_of_truth — sequential DDL applied in order ' . $migrationRange,
    'snapshot_role' => 'generated_aggregate — built by build_schema_snapshot.php from migrations, for quick reference only',
    'snapshot_generator' => 'database/build_schema_snapshot.php',
    'reference_sql_artifacts' => $referenceArtifacts,
    'generation_drift_relationship' => (string)($existingAuthority['generation_drift_relationship'] ?? 'schema.sql MUST be regenerated from migrations after any migration change. Drift = schema.sql out of date, not a truth conflict.'),
    'anti_parallel_authority_statement' => (string)($existingAuthority['anti_parallel_authority_statement'] ?? 'There is exactly ONE schema authority chain: migrations → schema.sql (snapshot). Blueprint and spec SQL files are design inputs, NOT parallel authorities. No table definition outside migrations is authoritative.'),
    'registry_dependency' => 'Full table-registry publication is intended to derive table metadata from schema.sql via generate-table-architecture.mjs. A bootstrap or partial registry is not schema authority. Registry does not modify schema; schema does not depend on registry.',
    'registry_publication_state' => $registryTableCount === $tableCount
        ? 'registry_table_count_matches_schema_snapshot'
        : 'registry_bootstrap_or_partial_publication_table_count_differs_from_schema_snapshot',
    'drift_verifier' => 'tools/verify_schema_authority.py',
];

$payload = ['schema_authority' => $authority];
$json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
if ($json === false) {
    throw new RuntimeException('Failed to encode schema authority summary JSON.');
}

foreach ($jsonTargets as $target) {
    refresh_schema_authority_write_file($target, $json);
}

$markdown = implode("\n", [
    '# Schema Authority Summary',
    '',
    '**Declared**: ' . gmdate('Y-m-d'),
    '**Scope**: Platform-global (' . $tableCount . ' tables)',
    '**Migration range**: ' . $migrationRange . ' (' . count($migrationNumbers) . ' migrations)',
    '',
    '## Authority Chain',
    '',
    '| Layer | File | Role |',
    '|-------|------|------|',
    '| **Executable Source of Truth** | `database/migrations/' . $migrationRange . '_*.sql` | Sequential DDL. Applied in order. This IS the schema. |',
    '| **Generated Snapshot** | `database/schema.sql` | Aggregate of all migrations. Built by `build_schema_snapshot.php`. Reference only; regenerate after any migration change. |',
    '| **Conceptual Blueprint** | `database/canonical-erp-mes-eqms-7-layer-blueprint.sql` | ISA-95/IEC 62264 7-layer design input. NOT executable authority. |',
    '| **Specification Reference** | `database/mes-schema-specification.sql` | MES specification reference. NOT executable authority. |',
    '',
    '## Anti-Parallel Authority Statement',
    '',
    'There is exactly **one** schema authority chain: `migrations → schema.sql`.',
    '',
    'Blueprint and specification SQL files are design inputs, not parallel authorities.',
    'No table definition outside migrations is authoritative.',
    '',
    '## Drift Control',
    '',
    '- `schema.sql` is a generated artifact; if it differs from migrations, regenerate it.',
    '- Full `table-registry.json` publication is intended to derive table metadata from `schema.sql` via `generate-table-architecture.mjs`; a bootstrap or partial registry is not schema authority.',
    '- Registry does not modify schema; schema does not depend on registry.',
    '- Snapshot CREATE TABLE count: ' . $schemaCreateTableCount,
    '- Registry table count: ' . $registryTableCount,
    '- Drift verifier: `tools/verify_schema_authority.py`',
    '',
    '## Verification',
    '',
    '```bash',
    'python3 tools/verify_schema_authority.py',
    '```',
    '',
]);

refresh_schema_authority_write_file($markdownTarget, $markdown);

fwrite(STDOUT, json_encode([
    'declaredAt' => $declaredAt,
    'migrationRange' => $migrationRange,
    'migrationCount' => count($migrationNumbers),
    'tableCount' => $tableCount,
    'registryTableCount' => $registryTableCount,
    'schemaCreateTableCount' => $schemaCreateTableCount,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL);
