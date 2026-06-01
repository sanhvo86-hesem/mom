<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\DomainCommand\DomainCommandException;
use MOM\Api\Services\DomainCommand\MesRuntimeCommandHandler;
use MOM\Api\Services\DomainCommand\ToolingCommandHandler;
use MOM\Database\Connection;
use PHPUnit\Framework\TestCase;

final class DomainCommandToolingCommandHandlerTest extends TestCase
{
    public function testToolLifeStopThresholdBlocksStartJobBeforeMesWrite(): void
    {
        $db = new DomainCommandToolingFakeConnection(toolMode: 'life_stop');

        try {
            (new MesRuntimeCommandHandler($db))->startJob($this->toolPayload('idem-tool-life'));
            $this->fail('Expected tooling runtime block.');
        } catch (DomainCommandException $e) {
            $this->assertSame('tooling_runtime_blocked', $e->problemCode);
            $this->assertTrue($db->hasQuery('INSERT INTO resource_readiness_evidence_state'));
            $this->assertFalse($db->hasQuery('INSERT INTO mes_job_execution'));
        }
    }

    public function testPresetNotApprovedBlocksLoadTool(): void
    {
        $db = new DomainCommandToolingFakeConnection(toolMode: 'preset_pending');

        try {
            (new MesRuntimeCommandHandler($db))->loadTool($this->toolPayload('idem-preset'));
            $this->fail('Expected preset block.');
        } catch (DomainCommandException $e) {
            $this->assertSame('tooling_runtime_blocked', $e->problemCode);
            $this->assertFalse($db->hasQuery("VALUES\n                (now(), :tool_id"));
        }
    }

    public function testExpiredGageBlocksInspectionBeforeUomWrite(): void
    {
        $db = new DomainCommandToolingFakeConnection(gageMode: 'expired');

        try {
            (new MesRuntimeCommandHandler($db))->recordInspectionResult($this->inspectionPayload('idem-gage'));
            $this->fail('Expected gage block.');
        } catch (DomainCommandException $e) {
            $this->assertSame('gage_runtime_blocked', $e->problemCode);
            $this->assertFalse($db->hasQuery('INSERT INTO domain_command_uom_measurement'));
            $this->assertFalse($db->hasQuery('INSERT INTO quality_inspection_result_runtime'));
        }
    }

    public function testReportToolBreakageCreatesContainmentHoldAndNcr(): void
    {
        $db = new DomainCommandToolingFakeConnection();
        $result = (new ToolingCommandHandler($db))->reportToolBreakage($this->toolPayload('idem-breakage') + [
            'detected_piece_no' => 50,
            'last_good_piece_no' => 30,
            'affected_lots' => ['LOT-31-50'],
            'signature_event_id' => '00000000-0000-0000-0000-000000000901',
        ]);

        $this->assertSame('breakage-1', $result['breakage_event']['breakage_event_id']);
        $this->assertTrue($db->hasQuery('INSERT INTO tooling_breakage_event'));
        $this->assertTrue($db->hasQuery('INSERT INTO quality_hold'));
        $this->assertTrue($db->hasParam(':subject_ref', 'LOT-31-50'));
        $this->assertTrue($db->hasQuery('INSERT INTO quality_nonconformance_runtime'));
        $this->assertTrue($db->hasQuery('INSERT INTO tooling_breakage_containment'));
        $this->assertTrue($db->hasQuery("event_type, magazine_position"));
    }

    public function testGageOotInvestigationLinksImpactedMeasurements(): void
    {
        $db = new DomainCommandToolingFakeConnection(hasImpactedMeasurements: true);
        $result = (new ToolingCommandHandler($db))->investigateGageOot([
            'idempotency_key' => 'idem-oot',
            'actor_id' => 'quality-1',
            'gage_id' => 'GAGE-1',
            'affected_from' => '2026-05-01T00:00:00Z',
            'affected_to' => '2026-05-31T23:59:59Z',
            'signature_event_id' => '00000000-0000-0000-0000-000000000902',
        ]);

        $this->assertCount(1, $result['impacted_measurements']);
        $this->assertTrue($db->hasQuery('INSERT INTO gage_oot_investigation_runtime'));
        $this->assertTrue($db->hasQuery('INSERT INTO quality_hold'));
        $this->assertTrue($db->hasParam(':subject_ref', 'LOT-1'));
        $this->assertTrue($db->hasParam(':subject_ref', 'SHIP-1'));
        $this->assertTrue($db->hasQuery('INSERT INTO quality_case_trace_link'));
    }

    public function testCompletionRecordsToolUsageEvent(): void
    {
        $db = new DomainCommandToolingFakeConnection();
        $result = (new ToolingCommandHandler($db))->recordToolUsageFromCompletion($this->toolPayload('idem-usage') + [
            'completed_quantity' => '12',
        ]);

        $this->assertTrue((bool)$result['recorded']);
        $this->assertTrue($db->hasQuery('INSERT INTO mes_tool_life_events'));
        $this->assertTrue($db->hasQuery('UPDATE tooling_runtime_state'));
    }

    public function testToolPresetMeasurementNormalizesThroughUomSsot(): void
    {
        $db = new DomainCommandToolingFakeConnection();
        $result = (new ToolingCommandHandler($db))->recordToolPresetMeasurement($this->toolPayload('idem-preset-measure') + [
            'measurement_type' => 'length',
            'preset_length' => '125',
            'measurement_unit' => 'MM',
            'target_unit' => 'MM',
            'preset_number' => 'PRESET-1',
        ]);

        $this->assertSame('MM', $result['uom']['target_unit_code']);
        $this->assertTrue($db->hasQuery('INSERT INTO domain_command_uom_measurement'));
        $this->assertTrue($db->hasQuery('INSERT INTO tooling_presets'));
        $this->assertTrue($db->hasQuery('INSERT INTO tooling_life_measurements'));
        $this->assertTrue($db->hasParam(':uom_measurement_id', 'uom-measurement-1'));
    }

    /**
     * @return array<string,mixed>
     */
    private function toolPayload(string $idempotencyKey): array
    {
        return [
            'idempotency_key' => $idempotencyKey,
            'actor_id' => 'operator-1',
            'work_order_ref' => 'WO-1',
            'job_number' => 'WO-1',
            'operation_seq' => '10',
            'equipment_id' => 'MILL-1',
            'machine_family' => 'VMC',
            'item_id' => 'PART-1',
            'tool_id' => 'TOOL-1',
        ];
    }

    /**
     * @return array<string,mixed>
     */
    private function inspectionPayload(string $idempotencyKey): array
    {
        return [
            'idempotency_key' => $idempotencyKey,
            'actor_id' => 'inspector-1',
            'work_order_ref' => 'WO-1',
            'operation_seq' => '10',
            'inspection_id' => 'INSP-1',
            'item_id' => 'PART-1',
            'gage_id' => 'GAGE-1',
            'actual_value' => '1',
            'measurement_unit' => 'PCS',
        ];
    }
}

final class DomainCommandToolingFakeConnection extends Connection
{
    /**
     * @var list<array{sql:string,params:array<string,mixed>}>
     */
    public array $queries = [];

    public function __construct(
        private readonly string $toolMode = 'ready',
        private readonly string $gageMode = 'ready',
        private readonly bool $hasImpactedMeasurements = false,
    ) {}

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

        if (str_contains($sql, 'FROM quality_hold h')) {
            return [];
        }

        if (str_contains($sql, 'FROM quality_inspection_result_runtime') && $this->hasImpactedMeasurements) {
            return [[
                'result_id' => 'result-1',
                'inspection_id' => 'INSP-1',
                'work_order_ref' => 'WO-1',
                'lot_ref' => 'LOT-1',
                'serial_ref' => '',
                'shipment_ref' => 'SHIP-1',
                'measured_payload' => '{"gage_id":"GAGE-1"}',
            ]];
        }

        return [];
    }

    public function queryOne(string $sql, array $params = []): ?array
    {
        $this->queries[] = ['sql' => $sql, 'params' => $params];

        if (str_contains($sql, 'FROM tooling_runtime_state')) {
            return [
                'tool_id' => 'TOOL-1',
                'tool_status' => 'active',
                'assembly_id' => 'ASM-1',
                'assembly_status' => $this->toolMode === 'assembly_obsolete' ? 'obsolete' : 'active',
                'component_status' => 'active',
                'preset_status' => $this->toolMode === 'preset_pending' ? 'pending' : 'approved',
                'calibration_status' => 'valid',
                'life_count' => $this->toolMode === 'life_stop' ? '100' : '10',
                'warning_limit' => '80',
                'stop_limit' => '100',
                'allowed_machine_family' => 'VMC',
                'compatible_item_id' => 'PART-1',
            ];
        }

        if (str_contains($sql, 'FROM gage_runtime_state')) {
            return [
                'gage_id' => 'GAGE-1',
                'gage_status' => 'active',
                'calibration_status' => $this->gageMode === 'expired' ? 'expired' : 'valid',
                'msa_status' => 'acceptable',
                'calibration_due_at' => $this->gageMode === 'expired' ? '2020-01-01T00:00:00Z' : '2099-01-01T00:00:00Z',
            ];
        }

        if (str_contains($sql, 'FROM uom_unit_catalog')) {
            $code = (string)($params[':a'] ?? $params[':code'] ?? '');
            if ($code === 'MM') {
                return [
                    'canonical_code' => 'MM',
                    'quantity_kind_code' => 'Length',
                    'si_factor' => '0.001',
                    'si_offset' => '0',
                    'is_affine' => false,
                    'lifecycle_status' => 'active',
                    'risk_level' => 'low',
                ];
            }
            return null;
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

        if (str_contains($sql, 'INSERT INTO tooling_presets')) {
            return [
                'tooling_preset_id' => 'preset-1',
                'tool_id' => 'TOOL-1',
                'uom_measurement_id' => $params[':uom_measurement_id'] ?? '',
            ];
        }

        if (str_contains($sql, 'INSERT INTO tooling_life_measurements')) {
            return [
                'tooling_life_measurement_id' => 'life-measure-1',
                'tool_id' => 'TOOL-1',
                'measurement_uom' => $params[':measurement_uom'] ?? '',
                'uom_measurement_id' => $params[':uom_measurement_id'] ?? '',
            ];
        }

        if (str_contains($sql, 'INSERT INTO tooling_breakage_event')) {
            return ['breakage_event_id' => 'breakage-1', 'tool_id' => 'TOOL-1'];
        }

        if (str_contains($sql, 'INSERT INTO quality_hold')) {
            return ['hold_id' => 'hold-1', 'hold_number' => 'QH-1'];
        }

        if (str_contains($sql, 'INSERT INTO quality_nonconformance_runtime')) {
            return ['ncr_id' => 'ncr-1', 'ncr_number' => 'NCR-1'];
        }

        if (str_contains($sql, 'INSERT INTO gage_oot_investigation_runtime')) {
            return ['oot_runtime_id' => 'oot-1', 'gage_id' => 'GAGE-1'];
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
        foreach ($this->queries as $query) {
            if (str_contains($query['sql'], $needle)) {
                return true;
            }
        }
        return false;
    }

    public function hasParam(string $key, mixed $value): bool
    {
        foreach ($this->queries as $query) {
            if (($query['params'][$key] ?? null) === $value) {
                return true;
            }
        }
        return false;
    }
}
