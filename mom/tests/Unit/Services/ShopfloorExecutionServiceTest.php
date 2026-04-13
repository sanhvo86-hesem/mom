<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use InvalidArgumentException;
use MOM\Api\Services\FileManufacturingEventRepository;
use MOM\Api\Services\ManufacturingEventBackboneService;
use MOM\Services\ShopfloorExecutionService;
use PHPUnit\Framework\TestCase;
use RuntimeException;

final class ShopfloorExecutionServiceTest extends TestCase
{
    private string $dataDir;

    protected function setUp(): void
    {
        $this->dataDir = sys_get_temp_dir() . '/mom-shopfloor-execution-' . bin2hex(random_bytes(4));
        mkdir($this->dataDir . '/master-data', 0775, true);
        file_put_contents(
            $this->dataDir . '/master-data/master-data.json',
            json_encode([
                'downtime_reason_codes' => [
                    ['reason_code' => 'DT-TOOL-LIFE', 'reason_name' => 'Tool life', 'status' => 'active'],
                    ['reason_code' => 'DT-MATL-WAIT', 'reason_name' => 'Material wait', 'status' => 'active'],
                ],
                'downtime_resolution_codes' => [
                    ['resolution_code' => 'tool_replaced', 'resolution_name' => 'Tool replaced', 'status' => 'active'],
                ],
                'defect_catalog' => [
                    ['defect_code' => 'DEF-DIM', 'defect_name' => 'Dimensional', 'status' => 'active'],
                    ['defect_code' => 'DEF-SURF', 'defect_name' => 'Surface', 'status' => 'active'],
                ],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
        );
    }

    protected function tearDown(): void
    {
        $this->removeDir($this->dataDir);
    }

    public function testNormalizesPlannerTargetWithDigitalThreadReferences(): void
    {
        $target = $this->service()->normalizeTargetForCreate([
            'wo_number' => 'WO-1001',
            'jo_number' => 'JO-1001',
            'equipment_id' => 'MC-5AX-01',
            'work_center_id' => 'WC-5AX',
            'shift_date' => '2026-04-13',
            'shift_code' => 'morning',
            'part_number' => '714-1101',
            'part_revision' => 'REV-C',
            'operation_seq' => 20,
            'operation_name' => '5-axis finish mill',
            'target_quantity' => 100,
            'cycle_time_minutes' => 4.5,
            'setup_time_minutes' => 30,
            'cnc_program_id' => 'NC-714-1101-OP20',
            'setup_sheet_id' => 'SETUP-714-OP20',
        ], 'planner-1', '2026-04-13T00:00:00Z');

        $this->assertSame('MC-5AX-01', $target['machine_id']);
        $this->assertSame('MC-5AX-01', $target['equipment_id']);
        $this->assertSame('714-1101', $target['item_id']);
        $this->assertSame('714-1101', $target['part_number']);
        $this->assertSame(20, $target['operation_seq']);
        $this->assertSame('NC-714-1101-OP20', $target['cnc_program_id']);
        $this->assertSame('planned', $target['status']);
    }

    public function testMachineEquipmentAliasesDoNotDriftOnCreateOrUpdate(): void
    {
        $service = $this->service();
        $target = $service->normalizeTargetForCreate([
            'wo_number' => 'WO-1002',
            'machine_id' => 'MC-5AX-01',
            'equipment_id' => '',
            'shift_date' => '2026-04-13',
            'cycle_time_minutes' => 4.5,
            'target_quantity' => 100,
        ], 'planner-1', '2026-04-13T00:00:00Z');

        $this->assertSame('MC-5AX-01', $target['machine_id']);
        $this->assertSame('MC-5AX-01', $target['equipment_id']);

        $updatedByEquipment = $service->applyTargetUpdates($target, [
            'equipment_id' => 'MC-5AX-02',
        ], '2026-04-13T01:00:00Z');
        $this->assertSame('MC-5AX-02', $updatedByEquipment['machine_id']);
        $this->assertSame('MC-5AX-02', $updatedByEquipment['equipment_id']);

        $updatedByMachine = $service->applyTargetUpdates($updatedByEquipment, [
            'machine_id' => 'MC-5AX-03',
        ], '2026-04-13T02:00:00Z');
        $this->assertSame('MC-5AX-03', $updatedByMachine['machine_id']);
        $this->assertSame('MC-5AX-03', $updatedByMachine['equipment_id']);
    }

    public function testReportValidationRejectsMissingReasonCodesForBadOutputAndDowntime(): void
    {
        $target = $this->target();
        $service = $this->service();

        try {
            $service->buildProductionLog([
                'quantity_good' => 8,
                'quantity_ng' => 1,
            ], $target, null, 'operator-1', '2026-04-13T08:00:00Z');
            $this->fail('NG quantity without a normalized reason code should fail.');
        } catch (InvalidArgumentException $e) {
            $this->assertSame('missing_ng_reason_code', $e->getMessage());
        }

        try {
            $service->buildProductionLog([
                'quantity_good' => 8,
                'actual_idle_minutes' => 15,
            ], $target, null, 'operator-1', '2026-04-13T08:00:00Z');
            $this->fail('Idle time without downtime reason code should fail.');
        } catch (InvalidArgumentException $e) {
            $this->assertSame('missing_downtime_reason_code', $e->getMessage());
        }
    }

    public function testReportValidationRejectsReasonCodesWithoutMatchingQuantityOrMinutes(): void
    {
        $target = $this->target();
        $service = $this->service();

        try {
            $service->buildProductionLog([
                'quantity_good' => 8,
                'ng_reason_codes' => ['DEF-DIM'],
            ], $target, null, 'operator-1', '2026-04-13T08:00:00Z');
            $this->fail('NG reason code without NG quantity should fail.');
        } catch (InvalidArgumentException $e) {
            $this->assertSame('ng_reason_without_quantity', $e->getMessage());
        }

        try {
            $service->buildProductionLog([
                'quantity_good' => 8,
                'rework_reason_codes' => ['DEF-SURF'],
            ], $target, null, 'operator-1', '2026-04-13T08:00:00Z');
            $this->fail('Rework reason code without rework quantity should fail.');
        } catch (InvalidArgumentException $e) {
            $this->assertSame('rework_reason_without_quantity', $e->getMessage());
        }

        try {
            $service->buildProductionLog([
                'quantity_good' => 8,
                'downtime_reason_code' => 'DT-TOOL-LIFE',
            ], $target, null, 'operator-1', '2026-04-13T08:00:00Z');
            $this->fail('Downtime reason code without downtime minutes should fail.');
        } catch (InvalidArgumentException $e) {
            $this->assertSame('downtime_reason_without_minutes', $e->getMessage());
        }
    }

    public function testBlankDowntimeRowsAreIgnoredInsteadOfStoredAsEmptyEvents(): void
    {
        $log = $this->service()->buildProductionLog([
            'quantity_good' => 8,
            'downtime_events' => [
                [],
            ],
        ], $this->target(), null, 'operator-1', '2026-04-13T08:00:00Z');

        $this->assertSame([], $log['downtime_events']);
        $this->assertSame([], $log['reason_codes']['downtime']);
    }

    public function testReportActorGuardBlocksUnassignedOperatorWithoutPlannerOverride(): void
    {
        $target = $this->target();

        $this->service()->assertReportActorCanSubmit($target, 'operator-1', false);
        $this->addToAssertionCount(1);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('forbidden_operator_assignment');
        $this->service()->assertReportActorCanSubmit($target, 'operator-2', false);
    }

    public function testBuildsAiReadyProductionLogAndManufacturingEventProjection(): void
    {
        $eventBackbone = new ManufacturingEventBackboneService(
            $this->dataDir,
            repository: new FileManufacturingEventRepository($this->dataDir),
            databaseConfig: ['use_postgres' => false],
        );
        $service = new ShopfloorExecutionService($this->dataDir, eventBackbone: $eventBackbone);
        $target = $this->target();

        $log = $service->buildProductionLog([
            'quantity_good' => 80,
            'quantity_ng' => 2,
            'quantity_rework' => 1,
            'actual_setup_minutes' => 35,
            'actual_run_minutes' => 360,
            'ng_details' => [
                ['defect_code' => 'DEF-DIM', 'quantity' => 2],
            ],
            'rework_details' => [
                ['defect_code' => 'DEF-SURF', 'quantity' => 1],
            ],
            'downtime_events' => [
                ['reason_code' => 'DT-TOOL-LIFE', 'minutes' => 20, 'resolution_code' => 'TOOL_REPLACED'],
            ],
            'blocking_issues' => [
                ['reason_code' => 'DT-MATL-WAIT', 'severity' => 'major', 'blocked_minutes' => 5],
            ],
        ], $target, null, 'operator-1', '2026-04-13T08:00:00Z');

        $this->assertSame(83, $log['quantity_total']);
        $this->assertSame(['DT-TOOL-LIFE'], $log['reason_codes']['downtime']);
        $this->assertSame('tool_replaced', $log['downtime_events'][0]['resolution_code']);
        $this->assertSame(['DEF-DIM'], $log['reason_codes']['ng']);
        $this->assertSame(['DEF-SURF'], $log['reason_codes']['rework']);
        $this->assertSame(['DT-MATL-WAIT'], $log['reason_codes']['blocking']);
        $this->assertSame(20.0, $log['actual_idle_minutes']);
        $this->assertTrue($log['advisory_projection']['projection_only']);
        $this->assertSame('elevated', $log['advisory_projection']['delay_risk_hint']);

        $service->appendProductionReportEvent($log, $target, 'operator-1');

        $eventFile = $this->dataDir . '/manufacturing-events/events.jsonl';
        $this->assertFileExists($eventFile);
        $events = file($eventFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        $this->assertIsArray($events);
        $this->assertCount(1, $events);
        $event = json_decode((string)$events[0], true);
        $this->assertSame('order.work_execution', $event['event_type']);
        $this->assertSame('manual_shift_report', $event['payload']['phase']);
        $this->assertSame('manual_capture_no_machine_control', $event['metadata']['ot_boundary']);
    }

    /**
     * @return array<string, mixed>
     */
    private function target(): array
    {
        return [
            'target_id' => 'TGT-1001',
            'wo_number' => 'WO-1001',
            'jo_number' => 'JO-1001',
            'item_id' => '714-1101',
            'part_number' => '714-1101',
            'part_revision' => 'REV-C',
            'operation_seq' => 20,
            'operation_name' => '5-axis finish mill',
            'machine_id' => 'MC-5AX-01',
            'equipment_id' => 'MC-5AX-01',
            'work_center_id' => 'WC-5AX',
            'operator_id' => 'operator-1',
            'shift_date' => '2026-04-13',
            'shift_code' => 'morning',
            'target_quantity' => 100,
            'cycle_time_minutes' => 4.5,
            'cnc_program_id' => 'NC-714-1101-OP20',
            'setup_sheet_id' => 'SETUP-714-OP20',
            'status' => 'dispatched',
            'started_at' => '2026-04-13T07:00:00Z',
        ];
    }

    private function service(): ShopfloorExecutionService
    {
        return new ShopfloorExecutionService($this->dataDir);
    }

    private function removeDir(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }

        $items = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($dir, \RecursiveDirectoryIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST,
        );
        foreach ($items as $item) {
            $item->isDir() ? rmdir($item->getPathname()) : unlink($item->getPathname());
        }
        rmdir($dir);
    }
}
