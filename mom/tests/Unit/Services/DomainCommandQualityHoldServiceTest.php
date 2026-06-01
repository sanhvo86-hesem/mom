<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\DomainCommand\DomainCommandException;
use MOM\Api\Services\DomainCommand\MesRuntimeCommandHandler;
use MOM\Api\Services\DomainCommand\QualityHoldService;
use MOM\Database\Connection;
use PHPUnit\Framework\TestCase;

final class DomainCommandQualityHoldServiceTest extends TestCase
{
    public function testCanonicalHoldBlocksIssueMaterialWithoutCallerHoldList(): void
    {
        $db = new DomainCommandQualityHoldFakeConnection(activeHold: true);

        try {
            (new MesRuntimeCommandHandler($db))->issueMaterial($this->issuePayload('idem-quality-hold-block'));
            $this->fail('Expected canonical quality hold block.');
        } catch (DomainCommandException $e) {
            $this->assertSame('quality_hold_active', $e->problemCode);
            $this->assertTrue($db->hasQuery('FROM quality_hold h'));
            $this->assertTrue($db->hasQuery('INSERT INTO resource_readiness_evidence_state'));
            $this->assertFalse($db->hasQuery('INSERT INTO domain_command_uom_measurement'));
            $this->assertFalse($db->hasQuery('INSERT INTO mes_material_consumption'));
        }
    }

    public function testFailedInspectionCreatesHoldNcrQualityOrderAndTraceLinks(): void
    {
        $db = new DomainCommandQualityHoldFakeConnection();
        $result = (new MesRuntimeCommandHandler($db))->recordInspectionResult([
            'idempotency_key' => 'idem-quality-fail',
            'actor_id' => 'inspector-1',
            'work_order_ref' => 'WO-1',
            'operation_seq' => '10',
            'inspection_id' => 'INSP-FAIL-1',
            'inspection_stage' => 'ipqc',
            'item_id' => 'PART-1',
            'lot_number' => 'LOT-1',
            'actual_value' => '0.5',
            'measurement_unit' => 'PCS',
            'passed' => false,
            'defect_code' => 'DIM_NG',
        ]);

        $this->assertTrue((bool)$result['quality_chain']['quality_chain_created']);
        $this->assertTrue($db->hasQuery('INSERT INTO quality_inspection_result_runtime'));
        $this->assertTrue($db->hasQuery('INSERT INTO quality_hold'));
        $this->assertTrue($db->hasQuery('INSERT INTO quality_order_runtime'));
        $this->assertTrue($db->hasQuery('INSERT INTO quality_nonconformance_runtime'));
        $this->assertTrue($db->hasQuery('INSERT INTO quality_case_trace_link'));
        $this->assertTrue($db->hasQuery('INSERT INTO domain_outbox_events'));
        $this->assertTrue($db->hasQuery('INSERT INTO mes_operational_event_ledger'));
    }

    public function testApplyAndReleaseHoldUseCanonicalTables(): void
    {
        $db = new DomainCommandQualityHoldFakeConnection(activeHold: true);
        $service = new QualityHoldService($db);
        $hold = $service->applyHold([
            'idempotency_key' => 'idem-apply-hold',
            'actor_id' => 'quality-1',
            'work_order_ref' => 'WO-1',
            'lot_number' => 'LOT-1',
            'reason_code' => 'CUSTOMER_HOLD',
            'hold_scope' => 'oqc',
            'severity' => 'critical',
        ]);
        $release = $service->releaseHold([
            'idempotency_key' => 'idem-release-hold',
            'actor_id' => 'quality-manager-1',
            'hold_id' => (string)$hold['hold_id'],
            'release_reason' => 'MRB approved with signed evidence.',
            'signature_event_id' => '00000000-0000-0000-0000-000000000001',
        ]);

        $this->assertSame('hold-1', $hold['hold_id']);
        $this->assertSame('hold-1', $release['hold_id']);
        $this->assertTrue($db->hasQuery('INSERT INTO quality_hold_subject'));
        $this->assertTrue($db->hasQuery('INSERT INTO quality_hold_source'));
        $this->assertTrue($db->hasQuery('INSERT INTO quality_hold_release'));
        $this->assertTrue($db->hasQuery('UPDATE quality_hold'));
    }

    public function testMrbUseAsIsRequiresCustomerApprovalReference(): void
    {
        $db = new DomainCommandQualityHoldFakeConnection();

        try {
            (new QualityHoldService($db))->recordMrbDisposition([
                'idempotency_key' => 'idem-mrb-use-as-is',
                'actor_id' => 'quality-manager-1',
                'ncr_number' => 'NCR-1',
                'disposition_type' => 'use_as_is',
                'customer_approval_required' => true,
                'signature_event_id' => '00000000-0000-0000-0000-000000000001',
            ]);
            $this->fail('Expected customer approval gate.');
        } catch (DomainCommandException $e) {
            $this->assertSame('mrb_customer_approval_required', $e->problemCode);
            $this->assertFalse($db->hasQuery('INSERT INTO mrb_disposition_runtime'));
        }
    }

    /**
     * @return array<string,mixed>
     */
    private function issuePayload(string $idempotencyKey): array
    {
        return [
            'idempotency_key' => $idempotencyKey,
            'actor_id' => 'operator-1',
            'work_order_ref' => 'WO-1',
            'job_number' => 'WO-1',
            'operation_seq' => '10',
            'equipment_id' => 'MILL-1',
            'item_id' => 'PART-1',
            'lot_number' => 'LOT-1',
            'issue_quantity' => '10',
            'material_uom' => 'BOX',
        ];
    }
}

final class DomainCommandQualityHoldFakeConnection extends Connection
{
    /**
     * @var list<array{sql:string,params:array<string,mixed>}>
     */
    public array $queries = [];

    public function __construct(private readonly bool $activeHold = false) {}

    public function transactional(callable $callback): mixed
    {
        return $callback();
    }

    /**
     * @return list<array<string,mixed>>
     */
    public function query(string $sql, array $params = []): array
    {
        $this->queries[] = ['sql' => $sql, 'params' => $params];

        if (str_contains($sql, 'FROM quality_hold h') && $this->activeHold) {
            return [[
                'hold_id' => 'hold-1',
                'hold_number' => 'QH-ACTIVE',
                'hold_scope' => 'ipqc',
                'severity' => 'critical',
                'reason_code' => 'IPQC_FAIL',
                'operator_message' => 'Canonical quality hold is active.',
                'subject_type' => 'lot',
                'subject_ref' => 'LOT-1',
            ]];
        }

        if (str_contains($sql, 'FROM quality_case_trace_link')) {
            return [[
                'case_type' => (string)($params[':case_type'] ?? 'ncr'),
                'case_id' => (string)($params[':case_id'] ?? 'ncr-1'),
                'related_type' => 'lot',
                'related_ref' => 'LOT-1',
                'relationship' => 'nonconformance_impacts',
                'source_authority' => QualityHoldService::class,
                'metadata' => '{}',
            ]];
        }

        return [];
    }

    public function queryOne(string $sql, array $params = []): ?array
    {
        $this->queries[] = ['sql' => $sql, 'params' => $params];

        if (str_contains($sql, 'FROM uom_unit_catalog')) {
            return $this->unit((string)($params[':a'] ?? $params[':code'] ?? ''));
        }

        if (str_contains($sql, 'FROM item_uom_policy')) {
            return [
                'id' => 'policy-1',
                'item_id' => 'PART-1',
                'inventory_unit_code' => 'PCS',
                'purchase_unit_code' => 'BOX',
                'sales_unit_code' => 'PCS',
                'recipe_unit_code' => 'PCS',
                'qc_unit_code' => 'PCS',
                'effective_from' => '2026-01-01',
                'resolved_priority' => 7,
            ];
        }

        if (str_contains($sql, 'FROM uom_conversion_rule')) {
            return null;
        }

        if (str_contains($sql, 'INSERT INTO domain_command_uom_measurement')) {
            return [
                'measurement_id' => 'uom-measurement-1',
                'measval_hash_sha256' => $params[':measval_hash_sha256'] ?? hash('sha256', 'uom'),
            ];
        }

        if (str_contains($sql, 'FROM resource_readiness_evidence_state')) {
            return [
                'evidence_key' => (string)($params[':evidence_key'] ?? ''),
                'resource_type' => 'runtime_evidence',
                'resource_ref' => 'EVIDENCE-1',
                'readiness_status' => 'valid',
                'evidence_hash_sha256' => hash('sha256', (string)($params[':evidence_key'] ?? '')),
                'source_authority' => 'resource_readiness_evidence_state',
                'valid_until' => gmdate('c', time() + 3600),
                'operator_message' => 'Evidence is valid.',
                'metadata' => '{}',
            ];
        }

        if (str_contains($sql, 'INSERT INTO resource_readiness_snapshot')) {
            return [
                'readiness_snapshot_id' => 'snapshot-1',
                'readiness_hash_sha256' => $params[':readiness_hash_sha256'] ?? hash('sha256', 'snapshot'),
                'decision' => $params[':decision'] ?? 'allow',
            ];
        }

        if (str_contains($sql, 'INSERT INTO quality_inspection_result_runtime')) {
            return [
                'result_id' => 'result-1',
                'inspection_id' => $params[':inspection_id'] ?? 'INSP-1',
                'result_status' => $params[':result_status'] ?? 'fail',
            ];
        }

        if (str_contains($sql, 'INSERT INTO quality_hold')) {
            return [
                'hold_id' => 'hold-1',
                'hold_number' => $params[':hold_number'] ?? 'QH-1',
                'hold_status' => 'active',
                'hold_scope' => $params[':hold_scope'] ?? 'ipqc',
                'severity' => $params[':severity'] ?? 'major',
                'operator_message' => $params[':operator_message'] ?? 'Quality hold is active.',
            ];
        }

        if (str_contains($sql, 'SELECT * FROM quality_hold')) {
            return [
                'hold_id' => 'hold-1',
                'hold_number' => 'QH-ACTIVE',
                'hold_status' => 'active',
            ];
        }

        if (str_contains($sql, 'INSERT INTO quality_hold_release')) {
            return [
                'release_id' => 'release-1',
                'hold_id' => $params[':hold_id'] ?? 'hold-1',
                'release_reason' => $params[':release_reason'] ?? 'released',
            ];
        }

        if (str_contains($sql, 'INSERT INTO quality_order_runtime')) {
            return [
                'quality_order_id' => 'qo-1',
                'quality_order_number' => $params[':number'] ?? 'QO-1',
                'order_type' => $params[':order_type'] ?? 'ipqc',
            ];
        }

        if (str_contains($sql, 'INSERT INTO quality_nonconformance_runtime')) {
            return [
                'ncr_id' => 'ncr-1',
                'ncr_number' => $params[':number'] ?? 'NCR-1',
                'hold_id' => $params[':hold_id'] ?? 'hold-1',
                'disposition_status' => 'pending_mrb',
            ];
        }

        if (str_contains($sql, 'FROM quality_nonconformance_runtime')) {
            return [
                'ncr_id' => 'ncr-1',
                'ncr_number' => 'NCR-1',
                'hold_id' => 'hold-1',
                'disposition_status' => 'pending_mrb',
            ];
        }

        if (str_contains($sql, 'INSERT INTO mrb_disposition_runtime')) {
            return [
                'disposition_id' => 'mrb-1',
                'ncr_id' => $params[':ncr_id'] ?? 'ncr-1',
                'disposition_type' => $params[':disposition_type'] ?? 'rework',
            ];
        }

        if (str_contains($sql, 'INSERT INTO mes_operational_event_ledger')) {
            return ['event_id' => 'event-1', 'event_hash' => hash('sha256', 'event-1')];
        }

        return null;
    }

    public function execute(string $sql, array $params = []): int
    {
        $this->queries[] = ['sql' => $sql, 'params' => $params];
        return 1;
    }

    public function hasQuery(string $needle): bool
    {
        return $this->firstQueryIndex($needle) >= 0;
    }

    public function firstQueryIndex(string $needle): int
    {
        foreach ($this->queries as $index => $query) {
            if (str_contains($query['sql'], $needle)) {
                return $index;
            }
        }

        return -1;
    }

    public function joinedSql(): string
    {
        return implode("\n", array_map(static fn (array $query): string => $query['sql'], $this->queries));
    }

    /**
     * @return array<string,mixed>|null
     */
    private function unit(string $code): ?array
    {
        $units = [
            'BOX' => [
                'canonical_code' => 'BOX',
                'quantity_kind_code' => 'CountOrQuantity',
                'si_factor' => '50',
                'si_offset' => '0',
                'is_affine' => false,
                'lifecycle_status' => 'active',
                'risk_level' => 'medium',
            ],
            'PCS' => [
                'canonical_code' => 'PCS',
                'quantity_kind_code' => 'CountOrQuantity',
                'si_factor' => '1',
                'si_offset' => '0',
                'is_affine' => false,
                'lifecycle_status' => 'active',
                'risk_level' => 'low',
            ],
        ];

        return $units[$code] ?? null;
    }
}
