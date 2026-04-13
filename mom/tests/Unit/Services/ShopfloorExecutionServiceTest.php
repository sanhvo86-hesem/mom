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
                    ['defect_code' => 'DEF-DIM', 'defect_name' => 'Dimensional', 'defect_group' => 'dimensional', 'status' => 'active'],
                    ['defect_code' => 'DEF-SURF', 'defect_name' => 'Surface', 'defect_group' => 'surface', 'status' => 'active'],
                    ['defect_code' => 'DEF-MAT', 'defect_name' => 'Material', 'defect_group' => 'material', 'status' => 'active'],
                    ['defect_code' => 'DEF-VIS', 'defect_name' => 'Visual', 'defect_group' => 'visual', 'status' => 'active'],
                    ['defect_code' => 'DEF-BURR', 'defect_name' => 'Burr', 'defect_group' => 'burr', 'status' => 'active'],
                    ['defect_code' => 'DEF-THREAD', 'defect_name' => 'Thread', 'defect_group' => 'thread', 'status' => 'active'],
                    ['defect_code' => 'DEF-FOD', 'defect_name' => 'FOD', 'defect_group' => 'fod', 'status' => 'active'],
                    ['defect_code' => 'DEF-OTHER', 'defect_name' => 'Other', 'defect_group' => 'other', 'status' => 'active'],
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

    public function testLegacyDispatchPayloadAliasesStayResponseOnlyCompatibility(): void
    {
        $service = $this->service();
        $target = $service->normalizeTargetForCreate([
            'wo_id' => 'WO-LEGACY-1',
            'machine_id' => 'MC-5AX-01',
            'target_date' => '2026-04-13',
            'shift' => 'afternoon',
            'cycle_time' => 4.5,
            'setup_time' => 30,
            'shift_duration' => 480,
            'target_qty' => 100,
        ], 'planner-1', '2026-04-13T00:00:00Z');

        $this->assertSame('WO-LEGACY-1', $target['wo_number']);
        $this->assertSame('2026-04-13', $target['shift_date']);
        $this->assertSame('afternoon', $target['shift_code']);
        $this->assertSame(4.5, $target['cycle_time_minutes']);
        $this->assertArrayNotHasKey('target_qty', $target);

        $response = $service->targetResponse($target);
        $this->assertSame($target['target_id'], $response['id']);
        $this->assertSame('WO-LEGACY-1', $response['wo_id']);
        $this->assertSame('2026-04-13', $response['target_date']);
        $this->assertSame('afternoon', $response['shift']);
        $this->assertSame(100, $response['target_qty']);
    }

    public function testTargetUpdateRejectsZeroCycleTime(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('invalid_cycle_time_minutes');

        $this->service()->applyTargetUpdates($this->target(), [
            'cycle_time_minutes' => 0,
        ], '2026-04-13T01:00:00Z');
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

    public function testLegacyNgDetailsMapToDefectCatalogButMustBalanceQuantity(): void
    {
        $service = $this->service();
        $target = $this->target();

        $log = $service->buildProductionLog([
            'quantity_good' => 8,
            'quantity_ng' => 3,
            'ng_details' => [
                ['type' => 'dimensional', 'qty' => 2],
                ['type' => 'burr', 'qty' => 1],
            ],
        ], $target, null, 'operator-1', '2026-04-13T08:00:00Z');

        $this->assertSame(['DEF-DIM', 'DEF-BURR'], $log['reason_codes']['ng']);
        $this->assertSame(2, $log['ng_details'][0]['quantity']);
        $this->assertSame('DEF-BURR', $log['ng_details'][1]['defect_code']);

        try {
            $service->buildProductionLog([
                'quantity_good' => 8,
                'quantity_ng' => 3,
                'ng_details' => [
                    ['type' => 'dimensional', 'qty' => 2],
                ],
            ], $target, null, 'operator-1', '2026-04-13T08:00:00Z');
            $this->fail('Classified NG detail quantities must match reported NG quantity.');
        } catch (InvalidArgumentException $e) {
            $this->assertSame('ng_detail_quantity_mismatch', $e->getMessage());
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

    public function testBlankOperatorAssignmentRequiresPlannerOverride(): void
    {
        $target = $this->target();
        $target['operator_id'] = '';

        try {
            $this->service()->assertReportActorCanSubmit($target, 'operator-1', false);
            $this->fail('Unassigned target should not be reportable by any operator without planner override.');
        } catch (RuntimeException $e) {
            $this->assertSame('missing_operator_assignment', $e->getMessage());
        }

        $this->service()->assertReportActorCanSubmit($target, 'planner-1', true);
        $this->addToAssertionCount(1);
    }

    public function testOverproductionRequiresExplicitReason(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('overproduction_reason_required');

        $this->service()->buildProductionLog([
            'quantity_good' => 101,
            'actual_run_minutes' => 455,
        ], $this->target(), null, 'operator-1', '2026-04-13T08:00:00Z');
    }

    public function testCompletionRequiresIntentAndActualEnd(): void
    {
        $service = $this->service();
        $log = $service->buildProductionLog([
            'quantity_good' => 100,
            'actual_run_minutes' => 450,
        ], $this->target(), null, 'operator-1', '2026-04-13T08:00:00Z');

        $this->assertFalse($service->shouldCompleteTarget($log, []));

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('completion_requires_actual_end');

        $service->shouldCompleteTarget($log, ['completion_intent' => 'complete_target']);
    }

    public function testReportGovernanceBlocksUndispatchedAndCompletedSnapshotReports(): void
    {
        $service = $this->service();
        $planned = $this->target();
        $planned['status'] = 'planned';

        try {
            $service->assertProductionReportGovernance([], $planned, false, '2026-04-13T08:00:00Z');
            $this->fail('Normal operators must not report planned targets directly.');
        } catch (RuntimeException $e) {
            $this->assertSame('target_not_dispatched', $e->getMessage());
        }

        $service->assertProductionReportGovernance([], $planned, true, '2026-04-13T08:00:00Z');
        $this->addToAssertionCount(1);

        $completed = $this->target();
        $completed['status'] = 'completed';
        try {
            $service->assertProductionReportGovernance([], $completed, true, '2026-04-13T08:00:00Z');
            $this->fail('Completed targets must require correction mode.');
        } catch (InvalidArgumentException $e) {
            $this->assertSame('completed_target_requires_correction', $e->getMessage());
        }

        try {
            $service->assertProductionReportGovernance(['report_mode' => 'correction'], $completed, false, '2026-04-13T08:00:00Z');
            $this->fail('Corrections require explicit planner or supervisor override.');
        } catch (RuntimeException $e) {
            $this->assertSame('correction_override_required', $e->getMessage());
        }
    }

    public function testBackdateAndFutureTimestampGovernance(): void
    {
        $service = $this->service();
        $target = $this->target();
        $target['shift_date'] = '2026-04-10';

        try {
            $service->assertProductionReportGovernance([], $target, false, '2026-04-13T08:00:00Z');
            $this->fail('Backdated reports outside the grace window require override.');
        } catch (RuntimeException $e) {
            $this->assertSame('backdate_override_required', $e->getMessage());
        }

        $service->assertProductionReportGovernance([], $target, true, '2026-04-13T08:00:00Z');
        $this->addToAssertionCount(1);

        $current = $this->target();
        try {
            $service->assertProductionReportGovernance([
                'actual_end' => '2026-04-13T09:30:01Z',
            ], $current, false, '2026-04-13T09:00:00Z');
            $this->fail('Future actual timestamps should be rejected.');
        } catch (InvalidArgumentException $e) {
            $this->assertSame('future_actual_timestamp', $e->getMessage());
        }

        try {
            $service->assertProductionReportGovernance([
                'actual_end' => '2026-04-14T08:00:00Z',
            ], $current, false, '2026-04-14T09:00:00Z');
            $this->fail('Morning shift reports should not accept next-day actual timestamps.');
        } catch (InvalidArgumentException $e) {
            $this->assertSame('actual_timestamp_outside_shift', $e->getMessage());
        }

        $night = $this->target();
        $night['shift_code'] = 'night';
        $service->assertProductionReportGovernance([
            'actual_end' => '2026-04-14T02:00:00Z',
        ], $night, false, '2026-04-14T03:00:00Z');
        $this->addToAssertionCount(1);
    }

    public function testPauseResumeAndOfflineReportSemanticsAreStructured(): void
    {
        $service = $this->service();
        $pause = $service->buildProductionLog([
            'quantity_good' => 0,
            'execution_event_type' => 'pause',
            'downtime_events' => [
                ['reason_code' => 'DT-TOOL-LIFE', 'minutes' => 12],
            ],
        ], $this->target(), null, 'operator-1', '2026-04-13T08:00:00Z');
        $this->assertSame('pause', $pause['execution_event_type']);
        $this->assertSame(['DT-TOOL-LIFE'], $pause['reason_codes']['downtime']);

        $resume = $service->buildProductionLog([
            'quantity_good' => 0,
            'execution_event_type' => 'resume',
            'resumed_from_event_id' => 'PRE-PAUSE-1',
        ], $this->target(), $pause, 'operator-1', '2026-04-13T08:30:00Z');
        $this->assertSame('resume', $resume['execution_event_type']);
        $this->assertSame('PRE-PAUSE-1', $resume['resumed_from_event_id']);

        try {
            $service->buildProductionLog([
                'quantity_good' => 5,
                'offline_created' => 'true',
            ], $this->target(), null, 'operator-1', '2026-04-13T09:00:00Z');
            $this->fail('Offline reports must carry replay-safe identifiers.');
        } catch (InvalidArgumentException $e) {
            $this->assertSame('offline_report_requires_idempotency_key', $e->getMessage());
        }

        $offline = $service->buildProductionLog([
            'quantity_good' => 5,
            'offline_created' => 'true',
            'idempotency_key' => 'tablet-1:TGT-1001:offline-1',
            'client_report_id' => 'offline-1',
        ], $this->target(), null, 'operator-1', '2026-04-13T09:00:00Z');
        $this->assertTrue($offline['offline_created']);
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

    public function testProductionReportIdempotencyReplaysSameFingerprint(): void
    {
        $service = $this->service();
        $body = [
            'quantity_good' => 8,
            'actual_run_minutes' => 40,
            'idempotency_key' => 'tablet-7:TGT-1001:2026-04-13:morning',
            'client_report_id' => 'tablet-7-shift-001',
        ];

        $existing = $service->buildProductionLog($body, $this->target(), null, 'operator-1', '2026-04-13T08:00:00Z');
        $candidate = $service->buildProductionLog($body, $this->target(), $existing, 'operator-1', '2026-04-13T09:00:00Z');

        $replayed = $service->replayProductionLogForIdempotency($candidate, [$existing]);

        $this->assertIsArray($replayed);
        $this->assertSame($existing['log_id'], $replayed['log_id']);
        $this->assertSame($existing['report_fingerprint'], $replayed['report_fingerprint']);
    }

    public function testProductionReportIdempotencyRejectsPayloadConflict(): void
    {
        $service = $this->service();
        $existing = $service->buildProductionLog([
            'quantity_good' => 8,
            'actual_run_minutes' => 40,
            'idempotency_key' => 'tablet-7:TGT-1001:2026-04-13:morning',
        ], $this->target(), null, 'operator-1', '2026-04-13T08:00:00Z');
        $candidate = $service->buildProductionLog([
            'quantity_good' => 9,
            'actual_run_minutes' => 40,
            'idempotency_key' => 'tablet-7:TGT-1001:2026-04-13:morning',
        ], $this->target(), $existing, 'operator-1', '2026-04-13T09:00:00Z');

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('idempotency_conflict');

        $service->replayProductionLogForIdempotency($candidate, [$existing]);
    }

    public function testProductionReportEventHistoryPreservesPreviousSnapshotContext(): void
    {
        $service = $this->service();
        $target = $this->target();
        $previous = $service->buildProductionLog([
            'quantity_good' => 8,
            'actual_run_minutes' => 40,
            'idempotency_key' => 'first-report',
        ], $target, null, 'operator-1', '2026-04-13T08:00:00Z');
        $correction = $service->buildProductionLog([
            'quantity_good' => 9,
            'actual_run_minutes' => 41,
            'report_mode' => 'correction',
            'correction_reason' => 'Supervisor verified one missed part.',
            'idempotency_key' => 'correction-report',
        ], $target, $previous, 'operator-1', '2026-04-13T09:00:00Z');

        $event = $service->buildProductionReportEvent($correction, $target, $previous, 'operator-1', '2026-04-13T09:00:00Z');

        $this->assertSame('dispatch.production_report_recorded', $event['event_type']);
        $this->assertSame('correction', $event['report_mode']);
        $this->assertSame($previous['report_fingerprint'], $event['previous_report_fingerprint']);
        $this->assertSame(1, $event['quantity_delta']['good']);
        $this->assertSame('NC-714-1101-OP20', $event['digital_thread']['cnc_program_id']);
        $this->assertSame($correction['report_fingerprint'], $event['production_log']['report_fingerprint']);
    }

    public function testCorrectionRequiresExistingReportAndReason(): void
    {
        $service = $this->service();

        try {
            $service->buildProductionLog([
                'quantity_good' => 8,
                'report_mode' => 'correction',
                'correction_reason' => 'Wrong entry',
            ], $this->target(), null, 'operator-1', '2026-04-13T08:00:00Z');
            $this->fail('Correction without an existing report should fail.');
        } catch (InvalidArgumentException $e) {
            $this->assertSame('correction_requires_existing_report', $e->getMessage());
        }

        $existing = $service->buildProductionLog([
            'quantity_good' => 8,
            'actual_run_minutes' => 40,
        ], $this->target(), null, 'operator-1', '2026-04-13T08:00:00Z');

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('correction_reason_required');

        $service->buildProductionLog([
            'quantity_good' => 9,
            'actual_run_minutes' => 41,
            'report_mode' => 'correction',
        ], $this->target(), $existing, 'operator-1', '2026-04-13T09:00:00Z');
    }

    public function testIdempotencyCanReplayFromEventHistoryAfterSnapshotChanged(): void
    {
        $service = $this->service();
        $target = $this->target();
        $firstBody = [
            'quantity_good' => 8,
            'actual_run_minutes' => 40,
            'idempotency_key' => 'first-report',
        ];
        $firstLog = $service->buildProductionLog($firstBody, $target, null, 'operator-1', '2026-04-13T08:00:00Z');
        $event = $service->buildProductionReportEvent($firstLog, $target, null, 'operator-1', '2026-04-13T08:00:00Z');
        $latestLog = $service->buildProductionLog([
            'quantity_good' => 9,
            'actual_run_minutes' => 41,
            'idempotency_key' => 'second-report',
        ], $target, $firstLog, 'operator-1', '2026-04-13T09:00:00Z');
        $retry = $service->buildProductionLog($firstBody, $target, $latestLog, 'operator-1', '2026-04-13T10:00:00Z');

        $replayed = $service->replayProductionLogForIdempotency($retry, [$latestLog], [$event]);

        $this->assertIsArray($replayed);
        $this->assertSame($firstLog['report_fingerprint'], $replayed['report_fingerprint']);
        $this->assertSame(8, $replayed['quantity_good']);
    }

    public function testTargetEnrichmentUsesOrderStoreWithoutCreatingAnotherWorkOrderModel(): void
    {
        mkdir($this->dataDir . '/orders', 0775, true);
        file_put_contents($this->dataDir . '/orders/orders.json', json_encode([
            'sales_orders' => [],
            'job_orders' => [],
            'work_orders' => [
                [
                    'wo_number' => 'WO-ORDER-1',
                    'jo_number' => 'JO-ORDER-1',
                    'operation_number' => 30,
                    'operation_desc' => 'Finish bore',
                    'machine_id' => 'MC-TURN-02',
                    'work_center_id' => 'WC-TURN',
                    'operator_id' => 'operator-7',
                    'nc_program_id' => 'NC-FINISH-BORE-V4',
                    'run_time_est' => 120,
                    'setup_time_est' => 25,
                    'material_lot_number' => 'LOT-174PH-001',
                    'traveler_number' => 'TRV-001',
                ],
            ],
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

        $target = $this->service()->normalizeTargetForCreate([
            'wo_number' => 'WO-ORDER-1',
            'machine_id' => 'MC-TURN-02',
            'shift_date' => '2026-04-13',
            'cycle_time_minutes' => 5,
            'target_quantity' => 20,
        ], 'planner-1', '2026-04-13T00:00:00Z');

        $this->assertSame('JO-ORDER-1', $target['jo_number']);
        $this->assertSame(30, $target['operation_seq']);
        $this->assertSame('Finish bore', $target['operation_name']);
        $this->assertSame('NC-FINISH-BORE-V4', $target['cnc_program_id']);
        $this->assertSame('operator-7', $target['operator_id']);
        $this->assertSame('TRV-001', $target['traveler_number']);
    }

    public function testTargetReferenceValidationWarnsWithoutBlockingManualDispatch(): void
    {
        mkdir($this->dataDir . '/cnc-programs', 0775, true);
        file_put_contents($this->dataDir . '/cnc-programs/programs.json', json_encode([
            ['id' => 'NC-KNOWN', 'name' => 'known.nc', 'status' => 'released'],
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

        $target = $this->service()->normalizeTargetForCreate([
            'wo_number' => 'WO-REF-1',
            'machine_id' => 'MC-5AX-01',
            'shift_date' => '2026-04-13',
            'cycle_time_minutes' => 5,
            'target_quantity' => 20,
            'cnc_program_id' => 'NC-MISSING',
        ], 'planner-1', '2026-04-13T00:00:00Z');

        $this->assertSame('warning', $target['reference_validation']['status']);
        $this->assertContains('unverified_cnc_program_reference', $target['reference_validation']['warnings']);
        $this->assertContains('missing_inspection_plan_reference', $target['reference_validation']['warnings']);
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
