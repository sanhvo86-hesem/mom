<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\DomainCommand\DomainCommandException;
use MOM\Api\Services\DomainCommand\MesRuntimeCommandHandler;
use MOM\Database\Connection;
use PHPUnit\Framework\TestCase;

final class DomainCommandUomRuntimeAuthorityTest extends TestCase
{
    public function testIssueMaterialNormalizesThroughDirectUomAuthorityBeforeMesMutation(): void
    {
        $db = new DomainCommandUomFakeConnection();
        $result = (new MesRuntimeCommandHandler($db))->issueMaterial($this->issuePayload('idem-uom-direct'));

        $this->assertSame('500.000000', $result['uom']['converted_magnitude']);
        $this->assertSame('PCS', $result['uom']['target_unit_code']);
        $this->assertTrue($db->hasQuery('INSERT INTO domain_command_uom_measurement'));
        $this->assertTrue($db->hasQuery('INSERT INTO mes_material_consumption'));
        $this->assertLessThan(
            $db->firstQueryIndex('INSERT INTO mes_material_consumption'),
            $db->firstQueryIndex('INSERT INTO domain_command_uom_measurement')
        );
        $materialWrite = $db->firstParams('INSERT INTO mes_material_consumption');
        $this->assertSame('500.000000', $materialWrite[':qty_consumed']);
        $this->assertSame('PCS', $materialWrite[':qty_uom']);
        $this->assertStringContainsString('uom.command_quantity_normalized', $db->joinedSql());
    }

    public function testMissingItemUomPolicyFailsBeforeMesMutation(): void
    {
        $db = new DomainCommandUomFakeConnection(hasPolicy: false);

        try {
            (new MesRuntimeCommandHandler($db))->issueMaterial($this->issuePayload('idem-uom-block'));
            $this->fail('Expected UOM authority failure.');
        } catch (DomainCommandException $e) {
            $this->assertSame('uom_authority_resolution_failed', $e->problemCode);
            $this->assertSame('UOM_POLICY_NOT_FOUND', $e->details['uom_problem_code']);
            $this->assertFalse($db->hasQuery('INSERT INTO mes_material_consumption'));
            $this->assertFalse($db->hasQuery('INSERT INTO resource_readiness_snapshot'));
        }
    }

    public function testInspectionMeasurementCarriesMeasvalHashIntoRuntimeEvent(): void
    {
        $db = new DomainCommandUomFakeConnection();
        $result = (new MesRuntimeCommandHandler($db))->recordInspectionResult([
            'idempotency_key' => 'idem-inspection-uom',
            'actor_id' => 'inspector-1',
            'work_order_ref' => 'WO-1',
            'operation_seq' => '10',
            'inspection_id' => 'INSP-1',
            'item_id' => 'PART-1',
            'actual_value' => '0.5',
            'measurement_unit' => 'PCS',
        ]);

        $this->assertSame('PCS', $result['uom']['target_unit_code']);
        $this->assertSame(64, strlen((string)$result['uom']['measval_hash_sha256']));
        $eventParams = $db->firstParams('INSERT INTO mes_operational_event_ledger');
        $this->assertStringContainsString('uom_authority_evidence', (string)$eventParams[':payload']);
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

final class DomainCommandUomFakeConnection extends Connection
{
    /**
     * @var list<array{sql:string,params:array<string,mixed>}>
     */
    public array $queries = [];

    public function __construct(private readonly bool $hasPolicy = true) {}

    public function transactional(callable $callback): mixed
    {
        return $callback();
    }

    public function queryOne(string $sql, array $params = []): ?array
    {
        $this->queries[] = ['sql' => $sql, 'params' => $params];

        if (str_contains($sql, 'FROM uom_unit_catalog')) {
            $code = (string)($params[':a'] ?? $params[':code'] ?? '');
            return $this->unit($code);
        }

        if (str_contains($sql, 'FROM item_uom_policy')) {
            if (!$this->hasPolicy) {
                return null;
            }
            return [
                'id' => 'policy-1',
                'item_id' => 'PART-1',
                'inventory_unit_code' => 'PCS',
                'purchase_unit_code' => 'BOX',
                'sales_unit_code' => 'PCS',
                'recipe_unit_code' => 'PCS',
                'qc_unit_code' => 'PCS',
                'effective_from' => '2026-01-01',
            ];
        }

        if (str_contains($sql, 'FROM uom_conversion_rule')) {
            if (($params[':from'] ?? '') === 'BOX' && ($params[':to'] ?? '') === 'PCS') {
                return [
                    'rule_code' => 'BOX_TO_PCS',
                    'version' => 1,
                    'category' => 'exact_linear',
                    'factor' => '50',
                    'offset_value' => '0',
                    'rounding_policy_id' => 'ROUND_HALF_EVEN',
                    'risk_level' => 'medium',
                    'factor_exact' => true,
                ];
            }
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
                'readiness_hash_sha256' => $params[':readiness_hash_sha256'],
                'decision' => $params[':decision'],
            ];
        }

        if (str_contains($sql, 'INSERT INTO mes_operational_event_ledger')) {
            return ['event_id' => 'event-1', 'event_hash' => hash('sha256', 'event-1')];
        }

        return null;
    }

    /**
     * @return list<array<string,mixed>>
     */
    public function query(string $sql, array $params = []): array
    {
        $this->queries[] = ['sql' => $sql, 'params' => $params];
        return [];
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

    /**
     * @return array<string,mixed>
     */
    public function firstParams(string $needle): array
    {
        foreach ($this->queries as $query) {
            if (str_contains($query['sql'], $needle)) {
                return $query['params'];
            }
        }

        return [];
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
