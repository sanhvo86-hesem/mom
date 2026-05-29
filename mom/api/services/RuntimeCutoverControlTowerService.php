<?php

declare(strict_types=1);

namespace MOM\Services;

use MOM\Database\DataLayer;

/**
 * Side-effect-free cutover gate evaluator for P37.
 *
 * This service builds the evidence objects that a live control-tower command
 * must persist in PostgreSQL. It never flips DataLayer mode.
 */
final class RuntimeCutoverControlTowerService
{
    private const TARGET_MODES = [
        DataLayer::MODE_JSON_ONLY,
        DataLayer::MODE_SHADOW_WRITE,
        DataLayer::MODE_POSTGRES_PRIMARY,
        DataLayer::MODE_POSTGRES_ONLY,
    ];

    /**
     * Minimum crosswalk from docs/backend/POSTGRES_MIGRATION_AND_SYNC_SPEC.md.
     *
     * @return array<int, array<string, string>>
     */
    public function collectionCrosswalk(): array
    {
        return [
            ['domain_code' => 'master_data', 'collection_key' => 'customers', 'record_key_field' => 'customer_id', 'required_for_cutover' => 'yes'],
            ['domain_code' => 'master_data', 'collection_key' => 'suppliers', 'record_key_field' => 'supplier_id', 'required_for_cutover' => 'yes'],
            ['domain_code' => 'master_data', 'collection_key' => 'parts', 'record_key_field' => 'part_number', 'required_for_cutover' => 'yes'],
            ['domain_code' => 'master_data', 'collection_key' => 'revisions', 'record_key_field' => 'revision_id', 'required_for_cutover' => 'yes'],
            ['domain_code' => 'master_data', 'collection_key' => 'routing_library', 'record_key_field' => 'routing_id', 'required_for_cutover' => 'yes'],
            ['domain_code' => 'master_data', 'collection_key' => 'bom_library', 'record_key_field' => 'bom_id', 'required_for_cutover' => 'yes'],
            ['domain_code' => 'master_data', 'collection_key' => 'control_plans', 'record_key_field' => 'control_plan_id', 'required_for_cutover' => 'yes'],
            ['domain_code' => 'master_data', 'collection_key' => 'inspection_plans', 'record_key_field' => 'inspection_plan_id', 'required_for_cutover' => 'yes'],
            ['domain_code' => 'orders', 'collection_key' => 'sales_orders', 'record_key_field' => 'so_number', 'required_for_cutover' => 'yes'],
            ['domain_code' => 'orders', 'collection_key' => 'job_orders', 'record_key_field' => 'jo_number', 'required_for_cutover' => 'yes'],
            ['domain_code' => 'orders', 'collection_key' => 'work_orders', 'record_key_field' => 'wo_number', 'required_for_cutover' => 'yes'],
            ['domain_code' => 'mes', 'collection_key' => 'material_consumption', 'record_key_field' => 'consumption_id', 'required_for_cutover' => 'yes'],
            ['domain_code' => 'mes', 'collection_key' => 'part_genealogy', 'record_key_field' => 'genealogy_id', 'required_for_cutover' => 'yes'],
            ['domain_code' => 'epicor', 'collection_key' => 'reconciliation_exceptions', 'record_key_field' => 'reconciliation_id', 'required_for_cutover' => 'yes'],
        ];
    }

    /** @return array<string, mixed> */
    public function authorityProbe(): array
    {
        return [
            'slice' => 'runtime_cutover_control_tower',
            'readiness_state' => 'service_gate_partial',
            'rehearsal_run_authority' => 'runtime_cutover_rehearsal_run',
            'collection_probe_authority' => 'runtime_cutover_collection_probe',
            'fallback_incident_authority' => 'runtime_cutover_fallback_incident',
            'restore_drill_authority' => 'runtime_restore_drill_evidence',
            'wave_gate_authority' => 'runtime_cutover_wave_gate',
            'data_layer_modes' => self::TARGET_MODES,
            'generic_crud_mutation_allowed' => false,
        ];
    }

    /**
     * @param array<string, mixed> $modeSummary
     * @param array<string, mixed> $readMeta
     * @param array<string, mixed> $context
     * @return array<string, mixed>
     */
    public function evaluateFallbackRead(array $modeSummary, array $readMeta, array $context = []): array
    {
        $mode = $this->text($modeSummary['mode'] ?? $readMeta['mode'] ?? DataLayer::MODE_JSON_ONLY);
        $fallbackUsed = (bool)($readMeta['fallback'] ?? false);
        if ($mode !== DataLayer::MODE_POSTGRES_PRIMARY || !$fallbackUsed) {
            return $this->allowed('no_pg_primary_fallback_incident', 'No PostgreSQL-primary fallback incident was observed.', [
                'mode' => $mode,
                'read_source' => $this->text($readMeta['source'] ?? ''),
            ]);
        }

        $incident = [
            'target_mode' => $mode,
            'domain_code' => $this->text($context['domain_code'] ?? $context['domain'] ?? ''),
            'collection_key' => $this->text($context['collection_key'] ?? $context['collection'] ?? ''),
            'read_source' => $this->text($readMeta['source'] ?? 'json_fallback'),
            'fallback_used' => true,
            'fallback_error' => $this->text($readMeta['error'] ?? 'postgres_read_failed'),
            'attempts' => (int)($readMeta['attempts'] ?? 1),
            'incident_state' => 'open',
        ];
        $incident['incident_hash_sha256'] = $this->hashPayload($incident);

        return [
            'allowed' => false,
            'status' => 'incident_recorded',
            'reason_code' => 'postgres_primary_fallback_incident_recorded',
            'message' => 'PostgreSQL-primary read fell back to JSON and must block PostgreSQL-only promotion until resolved.',
            'fallback_incident' => $incident,
            'metrics' => [
                'fallback_incident_count' => 1,
            ],
        ];
    }

    /**
     * @param array<int, array<string, mixed>> $collectionProbes
     * @return array<string, mixed>
     */
    public function evaluateCollectionCountGate(array $collectionProbes): array
    {
        $blockers = [];
        $normalized = [];
        foreach ($collectionProbes as $probe) {
            if (!is_array($probe)) {
                continue;
            }
            $row = [
                'domain_code' => $this->text($probe['domain_code'] ?? $probe['domain'] ?? ''),
                'collection_key' => $this->text($probe['collection_key'] ?? $probe['collection'] ?? ''),
                'record_key_field' => $this->text($probe['record_key_field'] ?? $probe['key'] ?? ''),
                'json_count' => (int)($probe['json_count'] ?? 0),
                'postgres_count' => (int)($probe['postgres_count'] ?? $probe['pg_count'] ?? 0),
                'missing_in_postgres_count' => (int)($probe['missing_in_postgres_count'] ?? count((array)($probe['missing_in_postgres'] ?? []))),
                'missing_in_json_count' => (int)($probe['missing_in_json_count'] ?? count((array)($probe['missing_in_json'] ?? []))),
                'mismatch_count' => (int)($probe['mismatch_count'] ?? 0),
                'duplicate_key_count' => (int)($probe['duplicate_key_count'] ?? 0),
                'unkeyed_collection' => (bool)($probe['unkeyed_collection'] ?? false),
            ];
            if ($row['record_key_field'] === '') {
                $row['unkeyed_collection'] = true;
            }
            $blocked = $row['json_count'] !== $row['postgres_count']
                || $row['missing_in_postgres_count'] > 0
                || $row['missing_in_json_count'] > 0
                || $row['mismatch_count'] > 0
                || $row['duplicate_key_count'] > 0
                || $row['unkeyed_collection'];
            $row['probe_state'] = $blocked ? 'blocked' : 'passed';
            $row['probe_hash_sha256'] = $this->hashPayload($row);
            $normalized[] = $row;
            if ($blocked) {
                $blockers[] = [
                    'reason_code' => 'collection_cutover_probe_blocked',
                    'domain_code' => $row['domain_code'],
                    'collection_key' => $row['collection_key'],
                    'json_count' => $row['json_count'],
                    'postgres_count' => $row['postgres_count'],
                    'mismatch_count' => $row['mismatch_count'],
                    'unkeyed_collection' => $row['unkeyed_collection'],
                ];
            }
        }

        return [
            'allowed' => $blockers === [],
            'status' => $blockers === [] ? 'passed' : 'blocked',
            'reason_code' => $blockers === [] ? 'collection_count_gate_passed' : 'collection_row_count_mismatch_blocks_cutover',
            'collection_probes' => $normalized,
            'blockers' => $blockers,
        ];
    }

    /**
     * @param array<string, mixed> $driftReport
     * @return array<string, mixed>
     */
    public function evaluateDriftReport(array $driftReport): array
    {
        $blockers = [];
        foreach ((array)($driftReport['domains'] ?? []) as $domainCode => $domain) {
            if (!is_array($domain)) {
                continue;
            }
            foreach ((array)($domain['collections'] ?? []) as $collection) {
                if (!is_array($collection)) {
                    continue;
                }
                $jsonCount = (int)($collection['json_count'] ?? 0);
                $postgresCount = (int)($collection['postgres_count'] ?? $collection['pg_count'] ?? 0);
                $missingPg = count((array)($collection['missing_in_postgres'] ?? []));
                $missingJson = count((array)($collection['missing_in_json'] ?? []));
                $mismatch = (int)($collection['mismatch_count'] ?? 0);
                $status = $this->text($collection['status'] ?? '');
                $statusSignalsDrift = str_contains($status, 'mismatch')
                    || str_contains($status, 'missing')
                    || str_contains($status, 'drift')
                    || str_contains($status, 'blocked');
                if ($missingPg === 0 && $missingJson === 0 && $mismatch === 0 && $jsonCount === $postgresCount && !$statusSignalsDrift) {
                    continue;
                }
                $blockers[] = [
                    'reason_code' => 'drift_blocks_postgres_only',
                    'domain_code' => (string)$domainCode,
                    'collection_key' => $this->text($collection['collection'] ?? ''),
                    'json_count' => $jsonCount,
                    'postgres_count' => $postgresCount,
                    'missing_in_postgres_count' => $missingPg,
                    'missing_in_json_count' => $missingJson,
                    'mismatch_count' => $mismatch,
                    'status' => $status,
                ];
            }
        }

        return [
            'allowed' => $blockers === [],
            'status' => $blockers === [] ? 'passed' : 'blocked',
            'reason_code' => $blockers === [] ? 'drift_report_zero_blockers' : 'drift_blocks_postgres_only',
            'drift_blocker_count' => count($blockers),
            'blockers' => $blockers,
            'report_hash_sha256' => $this->hashPayload($driftReport),
        ];
    }

    /**
     * @param array<string, mixed> $drill
     * @return array<string, mixed>
     */
    public function evaluateRestoreDrill(array $drill): array
    {
        $expected = strtolower($this->text($drill['expected_checksum_sha256'] ?? $drill['expected_sha256'] ?? ''));
        $actual = strtolower($this->text($drill['actual_checksum_sha256'] ?? $drill['restored_checksum_sha256'] ?? $drill['actual_sha256'] ?? ''));
        $state = 'match';
        if ($expected === '' || $actual === '') {
            $state = 'missing';
        } elseif ($expected !== $actual) {
            $state = 'mismatch';
        }

        $evidence = [
            'drill_scope' => $this->text($drill['drill_scope'] ?? $drill['scope'] ?? 'runtime_cutover'),
            'backup_ref' => $this->text($drill['backup_ref'] ?? ''),
            'restore_target_ref' => $this->text($drill['restore_target_ref'] ?? $drill['target_ref'] ?? ''),
            'expected_checksum_sha256' => $expected,
            'actual_checksum_sha256' => $actual,
            'checksum_state' => $state,
            'source_record_count' => (int)($drill['source_record_count'] ?? 0),
            'restored_record_count' => (int)($drill['restored_record_count'] ?? 0),
        ];
        $evidence['evidence_hash_sha256'] = $this->hashPayload($evidence);

        if ($state !== 'match' || $evidence['source_record_count'] !== $evidence['restored_record_count']) {
            return $this->blocked('restore_drill_checksum_mismatch_blocks_cutover', 'Restore drill checksum or count mismatch blocks cutover.', [
                'restore_drill_evidence' => $evidence,
            ]);
        }

        return $this->allowed('restore_drill_checksum_match', 'Restore drill checksum and counts match.', [
            'restore_drill_evidence' => $evidence,
        ]);
    }

    /**
     * @param array<string, mixed> $driftReport
     * @return array<string, mixed>
     */
    public function generateHumanDriftExport(array $driftReport): array
    {
        $lines = [
            '# Runtime Drift Export',
            '',
            '- generated_at: ' . gmdate(DATE_ATOM),
            '- report_hash_sha256: ' . $this->hashPayload($driftReport),
            '',
            '| Domain | Collection | Status | JSON | PostgreSQL | Missing PG | Missing JSON | Mismatches |',
            '|---|---|---:|---:|---:|---:|---:|---:|',
        ];

        foreach ((array)($driftReport['domains'] ?? []) as $domainCode => $domain) {
            if (!is_array($domain)) {
                continue;
            }
            foreach ((array)($domain['collections'] ?? []) as $collection) {
                if (!is_array($collection)) {
                    continue;
                }
                $lines[] = sprintf(
                    '| %s | %s | %s | %d | %d | %d | %d | %d |',
                    (string)$domainCode,
                    $this->text($collection['collection'] ?? ''),
                    $this->text($collection['status'] ?? ''),
                    (int)($collection['json_count'] ?? 0),
                    (int)($collection['postgres_count'] ?? 0),
                    count((array)($collection['missing_in_postgres'] ?? [])),
                    count((array)($collection['missing_in_json'] ?? [])),
                    (int)($collection['mismatch_count'] ?? 0),
                );
            }
        }

        $body = implode("\n", $lines) . "\n";

        return [
            'allowed' => true,
            'status' => 'generated',
            'reason_code' => 'human_readable_drift_export_generated',
            'format' => 'markdown',
            'line_count' => count($lines),
            'export_hash_sha256' => hash('sha256', $body),
            'body' => $body,
        ];
    }

    /**
     * @param array<string, mixed> $modeSummary
     * @param array<string, mixed> $collectionGate
     * @param array<string, mixed> $driftGate
     * @param array<string, mixed> $restoreGate
     * @param array<int, array<string, mixed>> $fallbackIncidents
     * @return array<string, mixed>
     */
    public function evaluateCutoverReadiness(
        string $targetMode,
        array $modeSummary,
        array $collectionGate,
        array $driftGate,
        array $restoreGate,
        array $fallbackIncidents = []
    ): array {
        $targetMode = $this->normalizeTargetMode($targetMode);
        $blockers = [];
        if (in_array($targetMode, [DataLayer::MODE_POSTGRES_PRIMARY, DataLayer::MODE_POSTGRES_ONLY], true)
            && (!(bool)($modeSummary['database_configured'] ?? false) || !(bool)($modeSummary['database_probe_reachable'] ?? false))) {
            $blockers[] = ['reason_code' => 'postgres_database_not_reachable_for_cutover'];
        }

        foreach (['collection_gate' => $collectionGate, 'drift_gate' => $driftGate, 'restore_gate' => $restoreGate] as $gate => $payload) {
            if (($payload['allowed'] ?? false) === true) {
                continue;
            }
            $blockers[] = [
                'reason_code' => $this->text($payload['reason_code'] ?? $gate . '_blocked'),
                'gate' => $gate,
            ];
        }

        if ($targetMode === DataLayer::MODE_POSTGRES_ONLY && $fallbackIncidents !== []) {
            $blockers[] = [
                'reason_code' => 'open_fallback_incidents_block_postgres_only',
                'fallback_incident_count' => count($fallbackIncidents),
            ];
        }

        $snapshot = $this->controlTowerSnapshot($targetMode, $modeSummary, $collectionGate, $driftGate, $restoreGate, $fallbackIncidents, $blockers);

        return [
            'allowed' => $blockers === [],
            'status' => $blockers === [] ? 'ready' : 'blocked',
            'reason_code' => $blockers === [] ? 'cutover_gate_ready' : 'cutover_gate_blocked',
            'blockers' => $blockers,
            'control_tower_snapshot' => $snapshot,
        ];
    }

    /**
     * @param array<string, mixed> $modeSummary
     * @param array<string, mixed> $collectionGate
     * @param array<string, mixed> $driftGate
     * @param array<string, mixed> $restoreGate
     * @param array<int, array<string, mixed>> $fallbackIncidents
     * @param array<int, array<string, mixed>> $blockers
     * @return array<string, mixed>
     */
    private function controlTowerSnapshot(
        string $targetMode,
        array $modeSummary,
        array $collectionGate,
        array $driftGate,
        array $restoreGate,
        array $fallbackIncidents,
        array $blockers
    ): array {
        $snapshot = [
            'target_mode' => $targetMode,
            'current_mode' => $this->text($modeSummary['mode'] ?? ''),
            'database_configured' => (bool)($modeSummary['database_configured'] ?? false),
            'database_probe_reachable' => (bool)($modeSummary['database_probe_reachable'] ?? false),
            'collection_probe_count' => count((array)($collectionGate['collection_probes'] ?? [])),
            'collection_blocker_count' => count((array)($collectionGate['blockers'] ?? [])),
            'drift_blocker_count' => (int)($driftGate['drift_blocker_count'] ?? count((array)($driftGate['blockers'] ?? []))),
            'fallback_incident_count' => count($fallbackIncidents),
            'restore_drill_state' => ($restoreGate['allowed'] ?? false) === true ? 'passed' : 'blocked',
            'blocker_count' => count($blockers),
            'gate_state' => $blockers === [] ? 'ready' : 'blocked',
        ];
        $snapshot['evidence_hash_sha256'] = $this->hashPayload($snapshot);

        return $snapshot;
    }

    private function normalizeTargetMode(string $mode): string
    {
        $mode = strtoupper(trim($mode));
        if (!in_array($mode, self::TARGET_MODES, true)) {
            return DataLayer::MODE_JSON_ONLY;
        }

        return $mode;
    }

    /** @param mixed $value */
    private function text(mixed $value): string
    {
        return trim((string)$value);
    }

    /** @param array<string, mixed> $context */
    private function allowed(string $reasonCode, string $message, array $context = []): array
    {
        return [
            'allowed' => true,
            'status' => 'passed',
            'reason_code' => $reasonCode,
            'message' => $message,
            'context' => $context,
        ];
    }

    /** @param array<string, mixed> $context */
    private function blocked(string $reasonCode, string $message, array $context = []): array
    {
        return [
            'allowed' => false,
            'status' => 'blocked',
            'reason_code' => $reasonCode,
            'message' => $message,
            'context' => $context,
        ];
    }

    /** @param array<string, mixed> $payload */
    private function hashPayload(array $payload): string
    {
        $payload = $this->sortRecursively($payload);

        return hash('sha256', json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
    }

    /** @param array<string, mixed> $value @return array<string, mixed> */
    private function sortRecursively(array $value): array
    {
        ksort($value);
        foreach ($value as $key => $item) {
            if (is_array($item)) {
                $value[$key] = $this->sortRecursively($item);
            }
        }

        return $value;
    }
}

if (!class_exists('MOM\\Api\\Services\\RuntimeCutoverControlTowerService', false)) {
    class_alias(RuntimeCutoverControlTowerService::class, 'MOM\\Api\\Services\\RuntimeCutoverControlTowerService');
}
