<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use InvalidArgumentException;
use MOM\Api\Services\FileManufacturingEventRepository;
use MOM\Api\Services\ManufacturingEventBackboneService;
use MOM\Api\Services\ManufacturingEventRepository;
use MOM\Services\ShopfloorExecutionService;
use MOM\Services\Traceability\GenealogyGraphService;
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
                'blocking_reason_codes' => [
                    ['reason_code' => 'BLK-MATL-WAIT', 'reason_name' => 'Material wait blocker', 'loss_class' => 'blocked', 'status' => 'active'],
                    ['reason_code' => 'BLK-QUAL-HOLD', 'reason_name' => 'Quality hold blocker', 'loss_class' => 'blocked', 'status' => 'active'],
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
                'inspection_plans' => [
                    ['inspection_plan_id' => 'IP-714-OP20', 'inspection_plan_name' => 'IP 714 OP20', 'status' => 'released'],
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

        $target = $this->target();
        $target['status'] = 'planned';

        $this->service()->applyTargetUpdates($target, [
            'cycle_time_minutes' => 0,
        ], '2026-04-13T01:00:00Z');
    }

    public function testTargetUpdateLocksIdentityFieldsAfterDispatchWithoutOverride(): void
    {
        $target = $this->target();
        $target['status'] = 'in_progress';

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('target_update_requires_supervisor_override:machine_id');

        $this->service()->applyTargetUpdates($target, [
            'machine_id' => 'MC-5AX-99',
        ], '2026-04-13T10:00:00Z');
    }

    public function testLegacyIdentityAliasesAreLockedAfterDispatchWithoutOverride(): void
    {
        $target = $this->target();
        $target['status'] = 'in_progress';

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('target_update_requires_supervisor_override:part_revision');

        $this->service()->applyTargetUpdates($target, [
            'revision' => 'REV-D',
        ], '2026-04-13T10:00:00Z');
    }

    public function testConflictingCanonicalAndAliasUpdatesCannotBypassDispatchLock(): void
    {
        $target = $this->target();
        $target['status'] = 'in_progress';

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('conflicting_target_alias:program_id');

        $this->service()->applyTargetUpdates($target, [
            'cnc_program_id' => 'NC-714-1101-OP20',
            'program_id' => 'NC-UNAPPROVED',
        ], '2026-04-13T10:00:00Z');
    }

    public function testDueDateIsLockedAfterDispatchWithoutOverride(): void
    {
        $target = $this->target();
        $target['status'] = 'in_progress';
        $target['due_at'] = '2026-04-13T17:00:00Z';

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('target_update_requires_supervisor_override:due_at');

        $this->service()->applyTargetUpdates($target, [
            'due_at' => '2026-04-14T17:00:00Z',
        ], '2026-04-13T10:00:00Z');
    }

    public function testTargetUpdateWithSupervisorOverrideRecordsReason(): void
    {
        $target = $this->target();
        $target['status'] = 'in_progress';

        $updated = $this->service()->applyTargetUpdates($target, [
            'machine_id' => 'MC-5AX-99',
            'supervisor_override_reason' => 'Machine reassigned after spindle alarm.',
        ], '2026-04-13T10:00:00Z');

        $this->assertSame('MC-5AX-99', $updated['machine_id']);
        $this->assertSame('MC-5AX-99', $updated['equipment_id']);
        $this->assertSame('Machine reassigned after spindle alarm.', $updated['last_target_override_reason']);
    }

    public function testCompletedTargetRejectsNormalEditsWithoutSupervisorOverride(): void
    {
        $target = $this->target();
        $target['status'] = 'completed';

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('target_locked_after_completion');

        $this->service()->applyTargetUpdates($target, [
            'priority' => 5,
        ], '2026-04-13T10:00:00Z');
    }

    public function testCompletedTargetRejectsLockedEditsEvenWithOverrideReason(): void
    {
        $target = $this->target();
        $target['status'] = 'completed';

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('target_locked_after_completion');

        $this->service()->applyTargetUpdates($target, [
            'machine_id' => 'MC-5AX-99',
            'supervisor_override_reason' => 'Late dispatch correction should use correction workflow.',
        ], '2026-04-13T10:00:00Z');
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

    public function testReportActorGuardAcceptsGovernedActorAlias(): void
    {
        $target = $this->target();
        $target['operator_id'] = 'EMP-1001';

        $this->service()->assertReportActorCanSubmit($target, 'operator-1', false, [
            'actor_aliases' => ['operator-1', 'EMP-1001'],
        ]);
        $this->addToAssertionCount(1);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('forbidden_operator_assignment');
        $this->service()->assertReportActorCanSubmit($target, 'operator-2', false, [
            'actor_aliases' => ['operator-2', 'EMP-2002'],
        ]);
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

    public function testReportValidationRejectsContradictoryOrEmptyPayloads(): void
    {
        $service = $this->service();

        try {
            $service->buildProductionLog([
                'quantity_good' => 1,
                'actual_start' => '2026-04-13T09:00:00Z',
                'actual_end' => '2026-04-13T08:59:59Z',
            ], $this->target(), null, 'operator-1', '2026-04-13T09:00:00Z');
            $this->fail('Actual end before actual start should be rejected.');
        } catch (InvalidArgumentException $e) {
            $this->assertSame('actual_end_before_actual_start', $e->getMessage());
        }

        try {
            $service->buildProductionLog([], $this->target(), null, 'operator-1', '2026-04-13T09:00:00Z');
            $this->fail('Empty execution reports should be rejected.');
        } catch (InvalidArgumentException $e) {
            $this->assertSame('empty_production_report', $e->getMessage());
        }

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('invalid_execution_event_type');
        $service->buildProductionLog([
            'quantity_good' => 0,
            'execution_event_type' => 'machine_control',
            'notes' => 'Not a supported manual execution event.',
        ], $this->target(), null, 'operator-1', '2026-04-13T09:00:00Z');
    }

    public function testBlockingIssuesCarrySeparateReasonDomain(): void
    {
        $log = $this->service()->buildProductionLog([
            'quantity_good' => 0,
            'execution_event_type' => 'blocked',
            'blocking_issues' => [
                ['reason_code' => 'BLK-MATL-WAIT', 'severity' => 'major', 'blocked_minutes' => 5],
            ],
        ], $this->target(), null, 'operator-1', '2026-04-13T09:00:00Z');

        $this->assertSame('blocked', $log['execution_event_type']);
        $this->assertSame('blocking', $log['blocking_issues'][0]['reason_domain']);
        $this->assertSame('blocked', $log['blocking_issues'][0]['loss_class']);
    }

    public function testBlockingReasonsDoNotFallBackToDowntimeCatalog(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('unknown_blocking_reason_code');

        $this->service()->buildProductionLog([
            'quantity_good' => 0,
            'execution_event_type' => 'blocked',
            'blocking_issues' => [
                ['reason_code' => 'DT-MATL-WAIT', 'severity' => 'major', 'blocked_minutes' => 5],
            ],
        ], $this->target(), null, 'operator-1', '2026-04-13T09:00:00Z');
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
        $service = new ShopfloorExecutionService(
            $this->dataDir,
            eventBackbone: $eventBackbone,
            genealogyGraph: new GenealogyGraphService(new ShopfloorGenealogyGateFakeDb()),
        );
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
                ['reason_code' => 'BLK-MATL-WAIT', 'severity' => 'major', 'blocked_minutes' => 5],
            ],
        ], $target, null, 'operator-1', $this->recentNow());

        $this->assertSame(83, $log['quantity_total']);
        $this->assertSame(['DT-TOOL-LIFE'], $log['reason_codes']['downtime']);
        $this->assertSame('tool_replaced', $log['downtime_events'][0]['resolution_code']);
        $this->assertSame(['DEF-DIM'], $log['reason_codes']['ng']);
        $this->assertSame(['DEF-SURF'], $log['reason_codes']['rework']);
        $this->assertSame(['BLK-MATL-WAIT'], $log['reason_codes']['blocking']);
        $this->assertSame(20.0, $log['actual_idle_minutes']);
        $this->assertTrue($log['advisory_projection']['projection_only']);
        $this->assertSame('elevated', $log['advisory_projection']['delay_risk_hint']);

        $projection = $service->appendProductionReportEvent($log, $target, 'operator-1');
        $this->assertSame('recorded', $projection['projection_status']);

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

    public function testProductionReportProjectionDeadLettersWhenManufacturingEventStoreFails(): void
    {
        $eventBackbone = new ManufacturingEventBackboneService(
            $this->dataDir,
            repository: new ThrowingManufacturingEventRepository(),
            databaseConfig: ['use_postgres' => false],
        );
        $service = new ShopfloorExecutionService(
            $this->dataDir,
            eventBackbone: $eventBackbone,
            genealogyGraph: new GenealogyGraphService(new ShopfloorGenealogyGateFakeDb()),
        );
        $target = $this->target();
        $log = $service->buildProductionLog([
            'quantity_good' => 8,
            'actual_run_minutes' => 40,
            'idempotency_key' => 'tablet-7:TGT-1001:dead-letter',
            'client_report_id' => 'tablet-7-dead-letter',
        ], $target, null, 'operator-1', '2026-04-13T08:00:00Z');

        $projection = $service->appendProductionReportEvent($log, $target, 'operator-1');

        $this->assertSame('dead_letter', $projection['projection_status']);
        $this->assertSame('manufacturing_event_projection_failed', $projection['error_code']);
        $this->assertFileExists($this->dataDir . '/manufacturing-events/projection-dead-letter.jsonl');
        $deadLetters = file($this->dataDir . '/manufacturing-events/projection-dead-letter.jsonl', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        $this->assertIsArray($deadLetters);
        $deadLetter = json_decode((string)$deadLetters[0], true);
        $this->assertSame('manufacturing_event_projection', $deadLetter['dead_letter_type']);
        $this->assertSame('pending_reconciliation', $deadLetter['dead_letter_state']);
        $this->assertSame($log['log_id'], $deadLetter['source_record_id']);
    }

    public function testProductionReportRequiresAuthoritative5MGateOrSignedWaiver(): void
    {
        $target = $this->target();
        unset($target['traceability_5m_waiver_signature_event_id'], $target['traceability_5m_waiver_reason']);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('traceability_5m_authoritative_store_required');

        (new ShopfloorExecutionService($this->dataDir))->buildProductionLog([
            'quantity_good' => 8,
            'actual_run_minutes' => 40,
        ], $target, null, 'operator-1', '2026-04-13T08:00:00Z');
    }

    public function testProductionReportRejectsCallerSupplied5MWaiverWithoutAuthority(): void
    {
        $target = $this->target();
        $target['material_lot_number'] = '';
        $target['inspection_plan_id'] = '';

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('traceability_5m_gate_not_met');

        (new ShopfloorExecutionService(
            $this->dataDir,
            genealogyGraph: new GenealogyGraphService(new BlockingShopfloorGenealogyGateFakeDb()),
        ))->buildProductionLog([
            'quantity_good' => 8,
            'actual_run_minutes' => 40,
            'traceability_5m_waiver_signature_event_id' => '00000000-0000-0000-0000-000000009001',
            'traceability_5m_waiver_reason' => 'caller supplied waiver must not be trusted',
        ], $target, null, 'operator-1', '2026-04-13T08:00:00Z');
    }

    public function testProductionReportPersistsComplete5MGateWhenGenealogyStoreAvailable(): void
    {
        $target = $this->target();
        unset($target['traceability_5m_waiver_signature_event_id'], $target['traceability_5m_waiver_reason']);
        $target['material_lot_number'] = 'MAT-LOT-1';
        $target['inspection_plan_id'] = 'IP-714-OP20';

        $db = new ShopfloorGenealogyGateFakeDb();
        $service = new ShopfloorExecutionService(
            $this->dataDir,
            genealogyGraph: new GenealogyGraphService($db),
        );

        $log = $service->buildProductionLog([
            'quantity_good' => 8,
            'actual_run_minutes' => 40,
            'inspection_result_id' => 'IPQC-RESULT-1',
        ], $target, null, 'operator-1', '2026-04-13T08:00:00Z');

        $this->assertSame('complete', $log['traceability_5m_gate']['gate_state']);
        $this->assertSame('authoritative_traceability_5m_obligation', $log['traceability_5m_gate']['source']);
        $this->assertNotEmpty($db->queryOneCalls);
    }

    public function testProductionReportAutoEmitsGenealogyEdgesWhenReleasedChangeAuthorityProvided(): void
    {
        $target = $this->target();
        $target['material_lot_number'] = 'MAT-LOT-1';
        $target['output_lot_id'] = 'LOT-OUT-1';
        $target['inspection_plan_id'] = 'IP-714-OP20';
        $target['change_order_id'] = '00000000-0000-0000-0000-000000000201';

        $db = new ShopfloorGenealogyGateFakeDb();
        $service = new ShopfloorExecutionService(
            $this->dataDir,
            genealogyGraph: new GenealogyGraphService($db),
        );

        $log = $service->buildProductionLog([
            'quantity_good' => 8,
            'actual_run_minutes' => 40,
            'inspection_result_id' => 'IPQC-RESULT-1',
        ], $target, null, 'operator-1', $this->recentNow());

        $projection = $service->appendProductionReportEvent($log, $target, 'operator-1');

        $this->assertSame('recorded', $projection['projection_status']);
        $this->assertSame('emitted', $projection['genealogy_emission']['status']);
        $this->assertSame(2, $projection['genealogy_emission']['attempted']);
        $this->assertSame(2, $projection['genealogy_emission']['emitted']);
        $this->assertGreaterThanOrEqual(2, $db->edgeInsertCount);
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

    public function testOnlineReportWithoutClientIdempotencyKeyGetsReplaySafeServerKey(): void
    {
        $service = $this->service();
        $body = [
            'quantity_good' => 8,
            'actual_run_minutes' => 40,
            'actual_start' => '2026-04-13T08:00:00Z',
        ];

        $existing = $service->buildProductionLog($body, $this->target(), null, 'operator-1', '2026-04-13T08:00:00Z');
        $candidate = $service->buildProductionLog($body, $this->target(), $existing, 'operator-1', '2026-04-13T09:00:00Z');

        $this->assertStringStartsWith('server:', $existing['idempotency_key']);
        $this->assertSame($existing['idempotency_key'], $candidate['idempotency_key']);

        $replayed = $service->replayProductionLogForIdempotency($candidate, [$existing]);
        $this->assertIsArray($replayed);
        $this->assertSame($existing['log_id'], $replayed['log_id']);
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

    public function testStrictReferencePolicyBlocksDispatchUntilCncAndInspectionLinksAreValid(): void
    {
        mkdir($this->dataDir . '/cnc-programs', 0775, true);
        file_put_contents($this->dataDir . '/cnc-programs/programs.json', json_encode([
            ['id' => 'NC-DRAFT', 'program_number' => 'NC-DRAFT', 'status' => 'draft'],
            ['id' => 'NC-REL', 'program_number' => 'NC-REL', 'status' => 'released'],
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        file_put_contents($this->dataDir . '/cnc-programs/setup-sheets.json', json_encode([
            ['id' => 'SETUP-REL', 'setup_number' => 'SETUP-REL', 'status' => 'released'],
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

        $blocked = $this->service()->normalizeTargetForCreate([
            'wo_number' => 'WO-STRICT-1',
            'machine_id' => 'MC-5AX-01',
            'shift_date' => '2026-04-13',
            'cycle_time_minutes' => 5,
            'target_quantity' => 20,
            'cnc_program_id' => 'NC-DRAFT',
            'reference_policy' => 'enforce_dispatch',
        ], 'planner-1', '2026-04-13T00:00:00Z');

        $this->assertSame('blocked', $blocked['reference_validation']['status']);
        $this->assertContains('cnc_program_not_released', $blocked['reference_validation']['blockers']);
        $this->assertContains('missing_setup_sheet_reference', $blocked['reference_validation']['blockers']);
        $this->assertContains('missing_inspection_plan_reference', $blocked['reference_validation']['blockers']);

        try {
            $this->service()->assertTargetDispatchable($blocked);
            $this->fail('Strict reference policy should block dispatch.');
        } catch (InvalidArgumentException $e) {
            $this->assertStringStartsWith('dispatch_reference_blocked', $e->getMessage());
        }

        $staleStrictTarget = $blocked;
        unset($staleStrictTarget['reference_validation']);
        try {
            $this->service()->assertTargetDispatchable($staleStrictTarget);
            $this->fail('Strict reference policy should be recalculated at dispatch time.');
        } catch (InvalidArgumentException $e) {
            $this->assertStringContainsString('cnc_program_not_released', $e->getMessage());
        }

        $ready = $this->service()->normalizeTargetForCreate([
            'wo_number' => 'WO-STRICT-2',
            'machine_id' => 'MC-5AX-01',
            'shift_date' => '2026-04-13',
            'cycle_time_minutes' => 5,
            'target_quantity' => 20,
            'cnc_program_id' => 'NC-REL',
            'setup_sheet_id' => 'SETUP-REL',
            'inspection_plan_id' => 'IP-714-OP20',
            'reference_policy' => 'enforce_dispatch',
        ], 'planner-1', '2026-04-13T00:00:00Z');

        $this->assertSame('ok', $ready['reference_validation']['status']);
        $this->service()->assertTargetDispatchable($ready);
        $this->addToAssertionCount(1);
    }

    public function testStrictReferencePolicyDoesNotTreatMissingCncRegistryAsReleased(): void
    {
        $target = $this->service()->normalizeTargetForCreate([
            'wo_number' => 'WO-STRICT-MISSING-CNC',
            'machine_id' => 'MC-5AX-01',
            'shift_date' => '2026-04-13',
            'cycle_time_minutes' => 5,
            'target_quantity' => 20,
            'cnc_program_id' => 'NC-NO-REGISTRY',
            'setup_sheet_id' => 'SETUP-NO-REGISTRY',
            'inspection_plan_id' => 'IP-714-OP20',
            'reference_policy' => 'enforce_dispatch',
        ], 'planner-1', '2026-04-13T00:00:00Z');

        $this->assertSame('blocked', $target['reference_validation']['status']);
        $this->assertContains('unverified_cnc_program_reference', $target['reference_validation']['blockers']);
        $this->assertContains('unverified_setup_sheet_reference', $target['reference_validation']['blockers']);
    }

    public function testStrictReferencePolicyDoesNotTreatMissingSetupSheetStatusAsReleased(): void
    {
        mkdir($this->dataDir . '/cnc-programs', 0775, true);
        file_put_contents($this->dataDir . '/cnc-programs/programs.json', json_encode([
            ['id' => 'NC-REL', 'program_number' => 'NC-REL', 'status' => 'released'],
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        file_put_contents($this->dataDir . '/cnc-programs/setup-sheets.json', json_encode([
            ['id' => 'SETUP-NO-STATUS', 'setup_number' => 'SETUP-NO-STATUS'],
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

        $target = $this->service()->normalizeTargetForCreate([
            'wo_number' => 'WO-STRICT-SETUP-DRAFT',
            'machine_id' => 'MC-5AX-01',
            'shift_date' => '2026-04-13',
            'cycle_time_minutes' => 5,
            'target_quantity' => 20,
            'cnc_program_id' => 'NC-REL',
            'setup_sheet_id' => 'SETUP-NO-STATUS',
            'inspection_plan_id' => 'IP-714-OP20',
            'reference_policy' => 'enforce_dispatch',
        ], 'planner-1', '2026-04-13T00:00:00Z');

        $this->assertSame('blocked', $target['reference_validation']['status']);
        $this->assertContains('setup_sheet_not_released', $target['reference_validation']['blockers']);
    }

    public function testDispatchTransitionCannotRedispatchStartedOrTerminalTargets(): void
    {
        $service = $this->service();
        foreach (['dispatched', 'in_progress', 'completed', 'cancelled'] as $status) {
            $target = $this->target();
            $target['status'] = $status;

            try {
                $service->assertTargetDispatchable($target);
                $this->fail('Non-planned target should not be dispatchable: ' . $status);
            } catch (InvalidArgumentException $e) {
                $this->assertSame('invalid_dispatch_transition:' . $status, $e->getMessage());
            }
        }
    }

    public function testExecutionStateTracksPauseResumeAndCompletionWithoutNewStatusModel(): void
    {
        $service = $this->service();
        $target = $this->target();
        $target['status'] = 'in_progress';

        $pause = $service->buildProductionLog([
            'quantity_good' => 0,
            'execution_event_type' => 'pause',
            'downtime_events' => [
                ['reason_code' => 'DT-TOOL-LIFE', 'minutes' => 10],
            ],
        ], $target, null, 'operator-1', '2026-04-13T08:00:00Z');
        $pausedTarget = $service->applyExecutionStateFromReport($target, $pause, '2026-04-13T08:00:00Z');
        $this->assertSame('paused', $pausedTarget['execution_state']);

        $resume = $service->buildProductionLog([
            'quantity_good' => 0,
            'execution_event_type' => 'resume',
            'resumed_from_event_id' => 'PRE-PAUSE-1',
        ], $pausedTarget, $pause, 'operator-1', '2026-04-13T08:15:00Z');
        $resumedTarget = $service->applyExecutionStateFromReport($pausedTarget, $resume, '2026-04-13T08:15:00Z');
        $this->assertSame('running', $resumedTarget['execution_state']);
        $this->assertSame('PRE-PAUSE-1', $resumedTarget['resumed_from_event_id']);
    }

    public function testFirstPieceGateBlocksProductionUntilPassingInspectionExists(): void
    {
        $service = $this->service();
        $target = $this->target();
        $target['inspection_plan_id'] = 'IP-714-OP20';
        $target['first_piece_required'] = true;
        $target['quality_gate_policy'] = 'enforce_first_piece';

        try {
            $service->buildProductionLog([
                'quantity_good' => 5,
                'actual_run_minutes' => 25,
            ], $target, null, 'operator-1', '2026-04-13T08:00:00Z');
            $this->fail('Production output should wait for a passing first-piece capture.');
        } catch (InvalidArgumentException $e) {
            $this->assertSame('first_piece_inspection_required', $e->getMessage());
        }

        mkdir($this->dataDir . '/mobile', 0775, true);
        file_put_contents($this->dataDir . '/mobile/inspections.json', json_encode([
            [
                'capture_id' => 'FP-1',
                'capture_type' => 'first_piece',
                'overall_result' => 'pass',
                'wo_number' => 'WO-1001',
                'operation_seq' => 20,
                'inspection_plan_id' => 'IP-714-OP20',
                'captured_at' => '2026-04-13T07:45:00Z',
            ],
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

        $log = $service->buildProductionLog([
            'quantity_good' => 5,
            'actual_run_minutes' => 25,
        ], $target, null, 'operator-1', '2026-04-13T08:00:00Z');

        $this->assertSame('passed', $log['quality_gate']['status']);
        $this->assertSame('FP-1', $log['quality_gate']['capture_id']);
    }

    public function testFirstPieceGateDoesNotAcceptWrongOperationOrInspectionPlan(): void
    {
        mkdir($this->dataDir . '/mobile', 0775, true);
        file_put_contents($this->dataDir . '/mobile/inspections.json', json_encode([
            [
                'capture_id' => 'FP-WRONG-OP',
                'capture_type' => 'first_piece',
                'overall_result' => 'pass',
                'wo_number' => 'WO-1001',
                'operation_seq' => 10,
                'inspection_plan_id' => 'IP-714-OP20',
            ],
            [
                'capture_id' => 'FP-WRONG-PLAN',
                'capture_type' => 'first_piece',
                'overall_result' => 'pass',
                'wo_number' => 'WO-1001',
                'operation_seq' => 20,
                'inspection_plan_id' => 'IP-OTHER',
            ],
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

        $target = $this->target();
        $target['inspection_plan_id'] = 'IP-714-OP20';
        $target['first_piece_required'] = true;
        $target['quality_gate_policy'] = 'enforce_first_piece';

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('first_piece_inspection_required');

        $this->service()->buildProductionLog([
            'quantity_good' => 5,
            'actual_run_minutes' => 25,
        ], $target, null, 'operator-1', '2026-04-13T08:00:00Z');
    }

    public function testFirstPieceGateWarnPolicyStaysAdvisoryWhenNotRequired(): void
    {
        $target = $this->target();
        $target['inspection_plan_id'] = 'IP-714-OP20';
        $target['first_piece_required'] = false;
        $target['quality_gate_policy'] = 'warn';

        $log = $this->service()->buildProductionLog([
            'quantity_good' => 5,
            'actual_run_minutes' => 25,
        ], $target, null, 'operator-1', '2026-04-13T08:00:00Z');

        $this->assertSame('warning', $log['quality_gate']['status']);
        $this->assertContains('first_piece_inspection_not_captured', $log['advisory_projection']['data_quality_flags']);
    }

    public function testFirstPieceGateAllowsAuditedSupervisorOverrideWithReason(): void
    {
        $target = $this->target();
        $target['inspection_plan_id'] = 'IP-714-OP20';
        $target['first_piece_required'] = true;
        $target['quality_gate_policy'] = 'enforce_first_piece';

        $log = $this->service()->buildProductionLog([
            'quantity_good' => 5,
            'actual_run_minutes' => 25,
            'quality_override_reason' => 'QA approved paper first-piece record during tablet outage.',
        ], $target, null, 'shift-lead-1', '2026-04-13T08:00:00Z', true);

        $this->assertSame('overridden', $log['quality_gate']['status']);
        $this->assertSame('first_piece_inspection_overridden', $log['advisory_projection']['data_quality_flags'][0]);
    }

    public function testLifecycleEventCarriesDigitalThreadAndOrgScope(): void
    {
        $target = $this->target();
        $target['org_company_code'] = 'HESEM';
        $target['org_plant_id'] = 'P01';
        $target['inspection_plan_id'] = 'IP-714-OP20';

        $event = $this->service()->buildTargetLifecycleEvent($target, 'dispatch.target_dispatched', 'planner-1', '2026-04-13T06:30:00Z', [
            'previous_status' => 'planned',
        ]);

        $this->assertSame('dispatch.target_dispatched', $event['event_type']);
        $this->assertSame('TGT-1001', $event['target_id']);
        $this->assertTrue($event['operational_truth']);
        $this->assertSame('HESEM', $event['digital_thread']['org_company_code']);
        $this->assertSame('P01', $event['digital_thread']['org_plant_id']);
        $this->assertSame('NC-714-1101-OP20', $event['digital_thread']['cnc_program_id']);
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
            'org_company_code' => 'HESEM',
            'org_legal_entity_code' => 'HESEM-VN',
            'org_plant_id' => 'PLANT-01',
            'org_site_id' => 'SITE-HCM',
            'shift_date' => '2026-04-13',
            'shift_code' => 'morning',
            'target_quantity' => 100,
            'cycle_time_minutes' => 4.5,
            'cnc_program_id' => 'NC-714-1101-OP20',
            'setup_sheet_id' => 'SETUP-714-OP20',
            'traceability_5m_waiver_signature_event_id' => '00000000-0000-0000-0000-000000009001',
            'traceability_5m_waiver_reason' => 'unit-test legacy file-backed shopfloor capture',
            'status' => 'dispatched',
            'started_at' => '2026-04-13T07:00:00Z',
        ];
    }

    private function service(): ShopfloorExecutionService
    {
        return new ShopfloorExecutionService(
            $this->dataDir,
            genealogyGraph: new GenealogyGraphService(new ShopfloorGenealogyGateFakeDb()),
        );
    }

    /**
     * Returns a timestamp within the last hour so tests that call
     * appendProductionReportEvent() do not trip the 30-day staleness guard
     * added in normalizeTimestamp() (MES-R6-006).
     */
    private function recentNow(): string
    {
        return gmdate(DATE_ATOM, time() - 3600);
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

class ShopfloorGenealogyGateFakeDb
{
    /**
     * @var list<array{sql: string, params: array<string, mixed>}>
     */
    public array $queryOneCalls = [];

    /**
     * @var list<array{sql: string, params: array<string, mixed>}>
     */
    public array $queryCalls = [];

    public int $edgeInsertCount = 0;

    /**
     * @param array<string, mixed> $params
     * @return array<string, mixed>|null
     */
    public function queryOne(string $sql, array $params = []): ?array
    {
        $this->queryOneCalls[] = ['sql' => $sql, 'params' => $params];
        if (str_contains($sql, 'FROM traceability_5m_policy_rules')) {
            return [
                'material_required' => true,
                'machine_required' => true,
                'method_required' => true,
                'measurement_required' => false,
                'manpower_required' => true,
                'policy_source' => 'control_plan',
                'policy_state' => 'active',
            ];
        }
        if (str_contains($sql, 'SELECT 1 FROM genealogy_edge_facts')) {
            return null;
        }
        if (str_contains($sql, 'WITH RECURSIVE path')) {
            return null;
        }
        if (str_contains($sql, 'INSERT INTO genealogy_edge_facts')) {
            $this->edgeInsertCount++;
            return [
                'edge_fact_type' => (string)$params[':edge_fact_type'],
                'from_object_type' => (string)$params[':from_object_type'],
                'from_object_id' => (string)$params[':from_object_id'],
                'to_object_type' => (string)$params[':to_object_type'],
                'to_object_id' => (string)$params[':to_object_id'],
                'source_event_id' => (string)$params[':source_event_id'],
                'metadata' => (string)$params[':metadata'],
            ];
        }
        if (str_contains($sql, 'genealogy_nodes')) {
            return [
                'genealogy_node_id' => '00000000-0000-0000-0000-000000000301',
                'node_type' => (string)$params[':node_type'],
                'node_ref' => (string)$params[':node_ref'],
                'metadata' => (string)$params[':metadata'],
            ];
        }
        if (str_contains($sql, 'genealogy_edges')) {
            return [
                'genealogy_edge_id' => '00000000-0000-0000-0000-000000000401',
                'edge_type' => (string)$params[':edge_type'],
                'source_event_id' => (string)$params[':source_event_id'],
                'metadata' => (string)$params[':metadata'],
            ];
        }
        if (str_contains($sql, 'as_manufactured_snapshots')) {
            return [
                'as_manufactured_snapshot_id' => '00000000-0000-0000-0000-000000000501',
                'subject_type' => (string)$params[':subject_type'],
                'subject_ref' => (string)$params[':subject_ref'],
                'snapshot_hash_sha256' => (string)$params[':snapshot_hash_sha256'],
            ];
        }

        return [
            'operation_class' => (string)($params[':operation_class'] ?? ''),
            'object_type' => (string)($params[':object_type'] ?? ''),
            'object_id' => (string)($params[':object_id'] ?? ''),
            'gate_state' => (string)($params[':gate_state'] ?? ''),
            'missing_context' => (string)($params[':missing_context'] ?? '[]'),
        ];
    }

    /**
     * @param array<string, mixed> $params
     * @return list<array<string, mixed>>
     */
    public function query(string $sql, array $params = []): array
    {
        $this->queryCalls[] = ['sql' => $sql, 'params' => $params];
        if (str_contains($sql, 'FROM plm_change_orders')) {
            return [[
                'plm_change_order_id' => '00000000-0000-0000-0000-000000000201',
                'change_order_number' => 'CO-GENEALOGY',
                'status' => 'released',
            ]];
        }

        return [];
    }
}

final class BlockingShopfloorGenealogyGateFakeDb extends ShopfloorGenealogyGateFakeDb
{
    /**
     * @param array<string, mixed> $params
     * @return array<string, mixed>|null
     */
    public function queryOne(string $sql, array $params = []): ?array
    {
        if (str_contains($sql, 'FROM traceability_5m_policy_rules')) {
            return null;
        }

        return [
            'operation_class' => (string)($params[':operation_class'] ?? ''),
            'object_type' => (string)($params[':object_type'] ?? ''),
            'object_id' => (string)($params[':object_id'] ?? ''),
            'gate_state' => 'blocked',
            'missing_context' => '["material","measurement"]',
        ];
    }
}

final class ThrowingManufacturingEventRepository implements ManufacturingEventRepository
{
    public function append(array $event): array
    {
        throw new RuntimeException('synthetic_manufacturing_event_store_failure');
    }

    public function timeline(array $filters = []): array
    {
        return [];
    }

    public function probe(): array
    {
        return [
            'backend' => 'synthetic_throwing_repository',
            'available' => false,
        ];
    }
}
