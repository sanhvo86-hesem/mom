<?php

declare(strict_types=1);

namespace MOM\Api\Services\Scenario;

use MOM\Database\Connection;

/**
 * Deterministic transaction sandbox for P58 command-stack scenarios.
 *
 * It records every attempted query and returns fixture-backed rows for the
 * authoritative services. It is not a business authority and is only used by
 * the scenario runner/test harness.
 */
final class ScenarioSandboxConnection extends Connection
{
    /**
     * @var array<string,mixed>
     */
    private array $fixture = [];

    /**
     * @var list<array{operation:string,sql:string,params:array<string,mixed>}>
     */
    private array $queries = [];

    private int $sequence = 1;
    private string $signatureHash = '';
    private string $signatureActor = 'qa-1';
    private string $signatureMeaning = '';

    /**
     * @param array<string,mixed> $fixture
     */
    public function __construct(array $fixture = [])
    {
        $this->seed($fixture);
    }

    /**
     * @param array<string,mixed> $fixture
     */
    public function seed(array $fixture): void
    {
        $this->fixture = array_replace_recursive($this->defaultFixture(), $fixture);
    }

    public function expectSignature(string $recordHash, string $actorId, string $meaning): void
    {
        $this->signatureHash = $recordHash;
        $this->signatureActor = $actorId;
        $this->signatureMeaning = $meaning;
    }

    public function transactional(callable $callback): mixed
    {
        $this->record('transaction', 'BEGIN', []);
        try {
            $result = $callback();
            $this->record('transaction', 'COMMIT', []);
            return $result;
        } catch (\Throwable $e) {
            $this->record('transaction', 'ROLLBACK', []);
            throw $e;
        }
    }

    public function queryOne(string $sql, array $params = []): ?array
    {
        $this->record('queryOne', $sql, $params);
        $normalized = $this->normalizeSql($sql);

        if (str_contains($normalized, 'domain_command_reauth_challenge')) {
            return [
                'challenge_id' => (string)($params[':challenge_id'] ?? 'reauth-p58'),
                'actor_id' => (string)($params[':actor_id'] ?? 'scenario-actor'),
                'command_name' => (string)($params[':command_name'] ?? ''),
                'payload_hash_sha256' => '',
                'intent_hash_sha256' => '',
                'issued_at' => gmdate(DATE_ATOM),
                'expires_at' => gmdate(DATE_ATOM, time() + 300),
                'consumed_at' => gmdate(DATE_ATOM),
                'result' => 'issued',
            ];
        }
        if (str_contains($normalized, 'from e_signature_auth_challenges')) {
            return $this->signatureChallengeRow();
        }
        if (str_contains($normalized, 'update e_signature_auth_challenges')) {
            return $this->signatureChallengeRow() + ['consumed_at' => gmdate(DATE_ATOM)];
        }
        if (str_contains($normalized, 'insert into signature_events')) {
            return [
                'signature_event_id' => $this->id('sig'),
                'signed_object_type' => (string)($params[':signed_object_type'] ?? 'domain_command'),
                'signed_object_id' => (string)($params[':signed_object_id'] ?? $params[':idempotency_key'] ?? $this->id('record')),
                'signer_ref' => (string)($params[':signer_ref'] ?? $this->signatureActor),
                'signature_meaning' => (string)($params[':signature_meaning'] ?? $this->signatureMeaning),
                'displayed_record_hash_sha256' => (string)($params[':displayed_record_hash_sha256'] ?? $this->signatureHash),
            ];
        }
        if (str_contains($normalized, 'insert into domain_command_evidence_links')) {
            return [
                'evidence_link_id' => $this->id('evidence-link'),
                'signature_event_id' => (string)($params[':signature_event_id'] ?? ''),
                'command_record_hash_sha256' => (string)($params[':command_record_hash_sha256'] ?? ''),
            ];
        }

        if (str_contains($normalized, 'from uom_unit_catalog') && str_contains($normalized, 'where canonical_code = :a')) {
            return $this->unitAliasRow((string)($params[':a'] ?? ''));
        }
        if (str_contains($normalized, 'from uom_unit_catalog u') && str_contains($normalized, 'where u.canonical_code = :code')) {
            return $this->unitCatalogRow((string)($params[':code'] ?? ''));
        }
        if (str_contains($normalized, 'from item_uom_policy')) {
            if (($this->fixture['uom_policy_missing'] ?? false) === true) {
                return null;
            }
            $item = (string)($params[':item'] ?? 'ITEM-P58');
            return [
                'id' => 'ituom-' . $item,
                'item_id' => $item,
                'inventory_unit_code' => (string)($this->fixture['inventory_unit_code'] ?? 'PCS'),
                'purchase_unit_code' => (string)($this->fixture['purchase_unit_code'] ?? 'PCS'),
                'sales_unit_code' => (string)($this->fixture['sales_unit_code'] ?? 'PCS'),
                'recipe_unit_code' => (string)($this->fixture['recipe_unit_code'] ?? 'PCS'),
                'qc_unit_code' => (string)($this->fixture['qc_unit_code'] ?? 'MM'),
                'effective_from' => '2026-01-01',
            ];
        }
        if (str_contains($normalized, 'from uom_conversion_rule')) {
            return $this->conversionRuleRow((string)($params[':from'] ?? ''), (string)($params[':to'] ?? ''));
        }
        if (str_contains($normalized, 'from uom_quantity_kind_compatibility')) {
            return null;
        }
        if (str_contains($normalized, 'insert into domain_command_uom_measurement')) {
            return [
                'measurement_id' => $this->id('uom-measurement'),
                'command_name' => (string)($params[':command_name'] ?? ''),
                'idempotency_key' => (string)($params[':idempotency_key'] ?? ''),
                'quantity_role' => (string)($params[':quantity_role'] ?? ''),
                'converted_magnitude' => (string)($params[':converted_magnitude'] ?? ''),
                'target_unit_code' => (string)($params[':target_unit_code'] ?? ''),
            ];
        }

        if (str_contains($normalized, 'from resource_readiness_evidence_state')) {
            return $this->readinessEvidenceRow((string)($params[':evidence_key'] ?? ''));
        }
        if (str_contains($normalized, 'insert into resource_readiness_snapshot')) {
            return [
                'readiness_snapshot_id' => $this->id('readiness-snapshot'),
                'decision' => (string)($params[':decision'] ?? 'allow'),
                'readiness_hash_sha256' => (string)($params[':readiness_hash_sha256'] ?? hash('sha256', 'readiness')),
            ];
        }

        if (str_contains($normalized, 'from tooling_runtime_state')) {
            return $this->toolingStateRow((string)($params[':tool_id'] ?? 'TOOL-P58'));
        }
        if (str_contains($normalized, 'from gage_runtime_state')) {
            return $this->gageStateRow((string)($params[':gage_id'] ?? 'GAGE-P58'));
        }

        if (str_contains($normalized, 'from quality_hold') && str_contains($normalized, 'hold_status =')) {
            return $this->activeHoldRow((string)($params[':hold_ref'] ?? 'QH-P58'));
        }
        if (str_contains($normalized, 'insert into quality_inspection_result_runtime')) {
            return [
                'result_id' => $this->id('inspection-result'),
                'inspection_id' => (string)($params[':inspection_id'] ?? ''),
                'result_status' => (string)($params[':result_status'] ?? 'pass'),
            ];
        }
        if (str_contains($normalized, 'insert into quality_hold')) {
            return $this->newHoldRow((string)($params[':hold_number'] ?? 'QH-' . $this->sequence));
        }
        if (str_contains($normalized, 'insert into quality_hold_release')) {
            return [
                'hold_release_id' => $this->id('hold-release'),
                'hold_id' => (string)($params[':hold_id'] ?? ''),
                'release_reason' => (string)($params[':release_reason'] ?? ''),
            ];
        }
        if (str_contains($normalized, 'insert into quality_order_runtime')) {
            return [
                'quality_order_id' => $this->id('quality-order'),
                'quality_order_number' => (string)($params[':number'] ?? 'QO-P58'),
                'order_status' => 'open',
            ];
        }
        if (str_contains($normalized, 'insert into quality_nonconformance_runtime')) {
            return [
                'ncr_id' => $this->id('ncr'),
                'ncr_number' => (string)($params[':number'] ?? 'NCR-P58'),
                'hold_id' => (string)($params[':hold_id'] ?? ''),
                'disposition_status' => 'pending_mrb',
            ];
        }
        if (str_contains($normalized, 'from quality_nonconformance_runtime')) {
            return [
                'ncr_id' => 'ncr-existing',
                'ncr_number' => (string)($params[':ref'] ?? 'NCR-P58'),
                'hold_id' => 'hold-existing',
            ];
        }
        if (str_contains($normalized, 'insert into mrb_disposition_runtime')) {
            return [
                'disposition_id' => $this->id('mrb'),
                'ncr_id' => (string)($params[':ncr_id'] ?? ''),
                'disposition_type' => (string)($params[':disposition_type'] ?? ''),
            ];
        }

        if (str_contains($normalized, 'from inventory_period_close')) {
            return (($this->fixture['inventory_period_closed'] ?? false) === true)
                ? ['close_status' => 'closed']
                : null;
        }
        if (str_contains($normalized, 'from lot')) {
            return $this->lotRow((string)($params[':lot_ref'] ?? 'LOT-P58'));
        }
        if (str_contains($normalized, 'from item_site')) {
            return ['item_site_id' => (string)($this->fixture['item_site_id'] ?? 'item-site-p58')];
        }
        if (str_contains($normalized, 'insert into inventory_ledger')) {
            return [
                'inventory_ledger_id' => $this->id('inventory-ledger'),
                'movement_type' => (string)($params[':movement_type'] ?? 'ledger_post'),
                'quantity_delta' => (string)($params[':qty_delta'] ?? $params[':quantity_delta'] ?? '1'),
                'uom' => (string)($params[':quantity_uom'] ?? $params[':uom'] ?? $params[':uom_code'] ?? 'PCS'),
            ];
        }
        if (str_contains($normalized, 'insert into inventory_reconciliation_run')) {
            $mismatches = (array)($this->fixture['inventory_reconciliation_mismatches'] ?? []);
            return [
                'reconciliation_run_id' => $this->id('reconciliation'),
                'period_code' => (string)($params[':period_code'] ?? 'P58'),
                'run_status' => $mismatches === [] ? 'pass' : 'mismatch',
                'mismatch_count' => count($mismatches),
            ];
        }
        if (str_contains($normalized, 'insert into inventory_period_close')) {
            return [
                'inventory_period_close_id' => $this->id('period-close'),
                'period_code' => (string)($params[':period_code'] ?? 'P58'),
                'close_status' => 'closed',
            ];
        }
        if (str_contains($normalized, 'insert into inventory_recall_trace_export')) {
            return [
                'recall_trace_export_id' => $this->id('recall-trace'),
                'subject_type' => (string)($params[':subject_type'] ?? ''),
                'subject_ref' => (string)($params[':subject_ref'] ?? ''),
            ];
        }

        if (str_contains($normalized, 'from engineering_release_package')) {
            return $this->engineeringPackageRow((string)($params[':package_id'] ?? '11111111-1111-4111-8111-111111111111'));
        }
        if (str_contains($normalized, 'insert into work_order_engineering_package_snapshot')) {
            return [
                'snapshot_id' => $this->id('wo-pkg-snapshot'),
                'work_order_ref' => (string)($params[':work_order_ref'] ?? ''),
                'package_id' => (string)($params[':package_id'] ?? ''),
                'package_manifest_hash_sha256' => (string)($params[':manifest_hash'] ?? ''),
                'bound_at' => gmdate(DATE_ATOM),
            ];
        }
        if (str_contains($normalized, 'insert into order_engineering_package_snapshot')) {
            return [
                'snapshot_id' => $this->id('order-pkg-snapshot'),
                'order_scope' => (string)($params[':order_scope'] ?? ''),
                'order_ref' => (string)($params[':order_ref'] ?? ''),
                'package_id' => (string)($params[':package_id'] ?? ''),
                'package_manifest_hash_sha256' => (string)($params[':manifest_hash'] ?? ''),
                'bound_at' => gmdate(DATE_ATOM),
            ];
        }
        if (str_contains($normalized, 'insert into engineering_release_package')) {
            return $this->engineeringPackageRow($this->id('engineering-package'));
        }
        if (str_contains($normalized, 'insert into engineering_release_package_member')) {
            return [
                'member_id' => $this->id('pkg-member'),
                'package_id' => (string)($params[':package_id'] ?? ''),
                'member_type' => (string)($params[':member_type'] ?? ''),
                'member_ref' => (string)($params[':member_ref'] ?? ''),
                'member_revision' => (string)($params[':member_revision'] ?? ''),
                'member_status' => (string)($params[':member_status'] ?? 'released'),
            ];
        }
        if (str_contains($normalized, 'insert into engineering_release_package_approval')) {
            return [
                'approval_id' => $this->id('pkg-approval'),
                'package_id' => (string)($params[':package_id'] ?? ''),
                'approver_id' => (string)($params[':approver_id'] ?? ''),
                'approval_meaning' => (string)($params[':approval_meaning'] ?? ''),
                'approval_status' => 'approved',
                'approved_at' => gmdate(DATE_ATOM),
            ];
        }
        if (str_contains($normalized, 'update engineering_release_package')) {
            return $this->engineeringPackageRow((string)($params[':package_id'] ?? ''));
        }

        if (str_contains($normalized, 'insert into mes_operational_event_ledger')) {
            return [
                'event_id' => (string)($params[':event_id'] ?? $this->id('mes-event')),
                'event_hash' => (string)($params[':event_hash'] ?? hash('sha256', 'event')),
            ];
        }
        if (str_contains($normalized, 'insert into tooling_breakage_event')) {
            return [
                'breakage_event_id' => $this->id('tool-breakage'),
                'tool_id' => (string)($params[':tool_id'] ?? ''),
            ];
        }
        if (str_contains($normalized, 'insert into gage_oot_investigation_runtime')) {
            return [
                'oot_runtime_id' => $this->id('gage-oot'),
                'gage_id' => (string)($params[':gage_id'] ?? ''),
            ];
        }

        if (str_contains($normalized, 'from domain_outbox_events')) {
            return ['outbox_lag_p95_seconds' => '0', 'pending_count' => '0'];
        }
        if (str_contains($normalized, 'from generic_crud_denial_event')) {
            return ['denied' => '0'];
        }

        return null;
    }

    /**
     * @return list<array<string,mixed>>
     */
    public function query(string $sql, array $params = []): array
    {
        $this->record('query', $sql, $params);
        $normalized = $this->normalizeSql($sql);

        if (str_contains($normalized, 'from quality_hold h') && str_contains($normalized, 'join quality_hold_subject')) {
            return (($this->fixture['active_quality_hold'] ?? false) === true)
                ? [$this->activeHoldRow('QH-P58-ACTIVE') + ['subject_type' => 'lot', 'subject_ref' => 'LOT-HOLD']]
                : [];
        }
        if (str_contains($normalized, 'from engineering_release_package_member')) {
            return (array)($this->fixture['engineering_members'] ?? [
                ['member_id' => 'member-bom', 'package_id' => 'pkg', 'member_type' => 'bom', 'member_ref' => 'BOM-P58', 'member_revision' => 'A', 'member_status' => 'released', 'source_authority' => 'postgres'],
                ['member_id' => 'member-routing', 'package_id' => 'pkg', 'member_type' => 'routing', 'member_ref' => 'RT-P58', 'member_revision' => 'A', 'member_status' => 'released', 'source_authority' => 'postgres'],
                ['member_id' => 'member-control-plan', 'package_id' => 'pkg', 'member_type' => 'control_plan', 'member_ref' => 'CP-P58', 'member_revision' => 'A', 'member_status' => 'released', 'source_authority' => 'postgres'],
                ['member_id' => 'member-inspection-plan', 'package_id' => 'pkg', 'member_type' => 'inspection_plan', 'member_ref' => 'IP-P58', 'member_revision' => 'A', 'member_status' => 'released', 'source_authority' => 'postgres'],
            ]);
        }
        if (str_contains($normalized, 'from engineering_release_package_approval')) {
            return (array)($this->fixture['engineering_approvals'] ?? [
                ['approval_id' => 'approval-p58', 'package_id' => 'pkg', 'approver_id' => 'qa-1', 'approval_meaning' => 'engineering_package_approval', 'approved_at' => gmdate(DATE_ATOM)],
            ]);
        }
        if (str_contains($normalized, 'from genealogy_edge_facts')) {
            return (array)($this->fixture['genealogy_edges'] ?? []);
        }
        if (str_contains($normalized, 'from inventory_reconciliation_mismatch')) {
            return (array)($this->fixture['inventory_reconciliation_mismatches'] ?? []);
        }
        if (str_contains($normalized, 'from quality_case_trace_link')) {
            return [];
        }
        if (str_contains($normalized, 'from quality_inspection_result_runtime')) {
            return (array)($this->fixture['impacted_measurements'] ?? []);
        }

        return [];
    }

    public function queryScalar(string $sql, array $params = []): mixed
    {
        $this->record('queryScalar', $sql, $params);
        return 0;
    }

    public function execute(string $sql, array $params = []): int
    {
        $this->record('execute', $sql, $params);
        return 1;
    }

    public function insertReturning(string $sql, array $params = []): ?array
    {
        return $this->queryOne($sql, $params);
    }

    /**
     * @return list<array{operation:string,sql:string,params:array<string,mixed>}>
     */
    public function queries(): array
    {
        return $this->queries;
    }

    public function countSqlContains(string $needle): int
    {
        $needle = strtolower($needle);
        $count = 0;
        foreach ($this->queries as $query) {
            if (str_contains(strtolower($query['sql']), $needle)) {
                $count++;
            }
        }
        return $count;
    }

    public function hasSqlContaining(string $needle): bool
    {
        return $this->countSqlContains($needle) > 0;
    }

    /**
     * @return array<string,mixed>
     */
    private function defaultFixture(): array
    {
        return [
            'readiness_missing_keys' => [],
            'readiness_invalid_keys' => [],
            'active_quality_hold' => false,
            'tooling_blocked' => false,
            'gage_blocked' => false,
            'uom_policy_missing' => false,
            'inventory_period_closed' => false,
            'lot_status' => 'available',
            'manifest_hash_sha256' => str_repeat('b', 64),
            'engineering_package_status' => 'released',
        ];
    }

    /**
     * @param array<string,mixed> $params
     */
    private function record(string $operation, string $sql, array $params): void
    {
        $this->queries[] = ['operation' => $operation, 'sql' => $sql, 'params' => $params];
    }

    private function normalizeSql(string $sql): string
    {
        return strtolower((string)preg_replace('/\s+/', ' ', trim($sql)));
    }

    private function id(string $prefix): string
    {
        return $prefix . '-' . $this->sequence++;
    }

    /**
     * @return array<string,mixed>|null
     */
    private function unitAliasRow(string $code): ?array
    {
        if ($code === '') {
            return null;
        }
        return [
            'canonical_code' => strtoupper($code),
            'quantity_kind_code' => in_array(strtoupper($code), ['MM', 'IN'], true) ? 'Length' : 'CountOrQuantity',
        ];
    }

    /**
     * @return array<string,mixed>|null
     */
    private function unitCatalogRow(string $code): ?array
    {
        $code = strtoupper($code);
        if ($code === '') {
            return null;
        }
        $isLength = in_array($code, ['MM', 'IN'], true);
        return [
            'canonical_code' => $code,
            'quantity_kind_code' => $isLength ? 'Length' : 'CountOrQuantity',
            'si_factor' => match ($code) {
                'IN' => '0.0254',
                'MM' => '0.001',
                default => '1',
            },
            'si_offset' => '0',
            'is_affine' => false,
            'lifecycle_status' => 'active',
            'risk_level' => 'low',
            'dimension_vector' => $isLength ? 'L' : 'N',
            'measurement_family' => $isLength ? 'length' : 'count',
        ];
    }

    /**
     * @return array<string,mixed>|null
     */
    private function conversionRuleRow(string $from, string $to): ?array
    {
        $from = strtoupper($from);
        $to = strtoupper($to);
        if ($from === $to) {
            return null;
        }
        $factor = match ($from . '>' . $to) {
            'BOX>PCS' => '50',
            'PCS>BOX' => '0.02',
            'IN>MM' => '25.4',
            'MM>IN' => '0.03937007874015748031',
            default => null,
        };
        if ($factor === null) {
            return null;
        }
        return [
            'rule_code' => 'P58-' . $from . '-' . $to,
            'version' => 1,
            'category' => 'exact_linear',
            'factor' => $factor,
            'offset_value' => '0',
            'rounding_policy_id' => 'ROUND_HALF_EVEN',
            'risk_level' => 'low',
            'factor_exact' => true,
            'effective_from' => '2026-01-01',
            'effective_to' => null,
            'context_required' => false,
        ];
    }

    /**
     * @return array<string,mixed>|null
     */
    private function readinessEvidenceRow(string $evidenceKey): ?array
    {
        if (in_array($evidenceKey, (array)($this->fixture['readiness_missing_keys'] ?? []), true)) {
            return null;
        }
        $status = in_array($evidenceKey, (array)($this->fixture['readiness_invalid_keys'] ?? []), true) ? 'blocked' : 'valid';
        return [
            'evidence_key' => $evidenceKey,
            'resource_type' => 'scenario_fixture',
            'resource_ref' => $evidenceKey . '-ref',
            'readiness_status' => $status,
            'evidence_hash_sha256' => hash('sha256', $evidenceKey),
            'source_authority' => 'ScenarioFixtureSeeder',
            'valid_from' => gmdate(DATE_ATOM, time() - 3600),
            'valid_until' => gmdate(DATE_ATOM, time() + 3600),
            'operator_message' => $status === 'valid' ? 'Readiness evidence is valid.' : 'Readiness evidence is blocked.',
            'metadata' => '{}',
        ];
    }

    /**
     * @return array<string,mixed>|null
     */
    private function toolingStateRow(string $toolId): ?array
    {
        if (($this->fixture['tooling_state_missing'] ?? false) === true) {
            return null;
        }
        $blocked = ($this->fixture['tooling_blocked'] ?? false) === true;
        return [
            'tool_id' => $toolId,
            'tool_status' => $blocked ? 'broken' : 'active',
            'assembly_id' => 'ASM-P58',
            'assembly_status' => 'active',
            'component_status' => 'active',
            'preset_status' => $blocked ? 'draft' : 'approved',
            'calibration_status' => $blocked ? 'expired' : 'valid',
            'life_count' => $blocked ? '1000' : '10',
            'warning_limit' => '900',
            'stop_limit' => '1000',
            'allowed_machine_family' => '',
            'compatible_item_id' => '',
            'last_preset_id' => 'PRESET-P58',
            'metadata' => '{}',
        ];
    }

    /**
     * @return array<string,mixed>|null
     */
    private function gageStateRow(string $gageId): ?array
    {
        if (($this->fixture['gage_state_missing'] ?? false) === true) {
            return null;
        }
        $blocked = ($this->fixture['gage_blocked'] ?? false) === true;
        return [
            'gage_id' => $gageId,
            'gage_status' => $blocked ? 'inactive' : 'active',
            'calibration_status' => $blocked ? 'expired' : 'valid',
            'msa_status' => 'acceptable',
            'calibration_due_at' => $blocked ? gmdate(DATE_ATOM, time() - 3600) : gmdate(DATE_ATOM, time() + 86400),
            'last_calibration_record_id' => 'CAL-P58',
            'open_oot_id' => $blocked ? 'OOT-P58' : null,
            'metadata' => '{}',
        ];
    }

    /**
     * @return array<string,mixed>|null
     */
    private function activeHoldRow(string $holdRef): ?array
    {
        if (($this->fixture['active_quality_hold'] ?? false) !== true && !str_starts_with($holdRef, 'QH-')) {
            return null;
        }
        return [
            'hold_id' => 'hold-p58-active',
            'hold_number' => $holdRef,
            'hold_scope' => 'ipqc',
            'hold_status' => 'active',
            'severity' => 'critical',
            'reason_code' => 'P58_HOLD',
            'operator_message' => 'P58 canonical quality hold is active.',
        ];
    }

    /**
     * @return array<string,mixed>
     */
    private function newHoldRow(string $holdNumber): array
    {
        return [
            'hold_id' => $this->id('quality-hold'),
            'hold_number' => $holdNumber,
            'hold_scope' => 'ipqc',
            'hold_status' => 'active',
            'severity' => 'critical',
            'reason_code' => 'P58_HOLD',
            'operator_message' => 'P58 hold created by command stack.',
        ];
    }

    /**
     * @return array<string,mixed>|null
     */
    private function lotRow(string $lotRef): ?array
    {
        $status = (string)($this->fixture['lot_status'] ?? 'available');
        if ($status === 'missing') {
            return null;
        }
        return [
            'lot_id' => 'lot-p58',
            'lot_no' => $lotRef,
            'lot_status' => $status,
            'expiry_date' => $status === 'expired' ? '2020-01-01' : '2099-01-01',
        ];
    }

    /**
     * @return array<string,mixed>
     */
    private function engineeringPackageRow(string $packageId): array
    {
        $hash = (string)($this->fixture['manifest_hash_sha256'] ?? str_repeat('b', 64));
        return [
            'package_id' => $packageId !== '' ? $packageId : '11111111-1111-4111-8111-111111111111',
            'package_code' => 'ERP-P58',
            'item_ref' => 'ITEM-P58',
            'revision_ref' => 'A',
            'site_ref' => 'SITE-1',
            'created_by' => 'originator-1',
            'lifecycle_status' => (string)($this->fixture['engineering_package_status'] ?? 'released'),
            'manifest_hash_sha256' => $hash,
            'manifest_json' => json_encode([
                'manifest_hash_sha256' => $hash,
                'members' => ['bom', 'routing', 'control_plan', 'inspection_plan'],
            ], JSON_UNESCAPED_SLASHES),
            'required_member_policy' => json_encode(['bom' => true, 'routing' => true, 'control_plan' => true, 'inspection_plan' => true], JSON_UNESCAPED_SLASHES),
            'metadata' => '{}',
        ];
    }

    /**
     * @return array<string,mixed>
     */
    private function signatureChallengeRow(): array
    {
        $hash = $this->signatureHash !== '' ? $this->signatureHash : str_repeat('c', 64);
        return [
            'auth_challenge_id' => 'challenge-p58',
            'signer_user_id' => null,
            'signer_ref' => $this->signatureActor,
            'session_id' => 'scenario-session',
            'org_id' => 'HESEM',
            'signature_action' => $this->signatureMeaning,
            'signed_payload_hash_sha256' => $hash,
            'displayed_record_hash_sha256' => $hash,
            'challenge_state' => 'issued',
            'expires_at' => gmdate(DATE_ATOM, time() + 300),
            'consumed_at' => null,
        ];
    }
}
