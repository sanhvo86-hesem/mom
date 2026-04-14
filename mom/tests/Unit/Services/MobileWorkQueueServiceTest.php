<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Services\MobileWorkQueueService;
use PHPUnit\Framework\TestCase;
use RuntimeException;

final class MobileWorkQueueServiceTest extends TestCase
{
    private string $tmpDir;

    protected function setUp(): void
    {
        $this->tmpDir = sys_get_temp_dir() . '/mom_mobile_queue_' . bin2hex(random_bytes(4));
        mkdir($this->tmpDir, 0775, true);
    }

    protected function tearDown(): void
    {
        $this->removeDir($this->tmpDir);
    }

    public function testClockOutRequiresMatchingOperatorWhenProvided(): void
    {
        $service = new MobileWorkQueueService($this->tmpDir);
        $clockIn = $service->clockIn('operator-1', 'WO-1001', 20, 'MC-5AX-01');

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('forbidden_clock_out_operator');

        $service->clockOut((string)$clockIn['entry_id'], 1, 0, 'operator-2');
    }

    public function testClockOutWithMatchingOperatorCreatesOutEntry(): void
    {
        $service = new MobileWorkQueueService($this->tmpDir);
        $clockIn = $service->clockIn('operator-1', 'WO-1001', 20, 'MC-5AX-01');

        $clockOut = $service->clockOut((string)$clockIn['entry_id'], 3, 1, 'operator-1');

        $this->assertSame('clock_out', $clockOut['entry_type']);
        $this->assertSame('operator-1', $clockOut['operator_id']);
        $this->assertSame(3, $clockOut['quantity_completed']);
        $this->assertSame(1, $clockOut['quantity_scrap']);
    }

    public function testCompleteTaskPersistsResultQuantitiesAndRejectsContradictions(): void
    {
        $service = new MobileWorkQueueService($this->tmpDir);
        $task = $service->assignTask('operator-1', 'WO-1001', 'operation_complete', []);

        $completed = $service->completeTask((string)$task['queue_id'], 'operator-1', [
            'result' => 'partial',
            'qty_completed' => 7,
            'qty_scrap' => 1,
            'reason_code' => 'INSERT_ISSUE',
            'notes' => 'One insert issue.',
        ]);

        $this->assertSame('completed', $completed['task_status']);
        $this->assertSame('partial', $completed['result']);
        $this->assertSame(7, $completed['qty_completed']);
        $this->assertSame(1, $completed['qty_scrap']);
        $this->assertSame('INSERT_ISSUE', $completed['completion_reason_code']);

        $task2 = $service->assignTask('operator-1', 'WO-1002', 'operation_complete', []);
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('pass_result_cannot_have_scrap');
        $service->completeTask((string)$task2['queue_id'], 'operator-1', [
            'result' => 'pass',
            'qty_completed' => 5,
            'qty_scrap' => 1,
        ]);
    }

    public function testCompleteTaskRequiresReasonForNonPassAndRejectsScrapWithoutCompletedQuantity(): void
    {
        $service = new MobileWorkQueueService($this->tmpDir);
        $task = $service->assignTask('operator-1', 'WO-1003', 'operation_complete', []);

        try {
            $service->completeTask((string)$task['queue_id'], 'operator-1', [
                'result' => 'fail',
                'qty_completed' => 0,
                'qty_scrap' => 0,
            ]);
            $this->fail('Fail completion should require a structured reason code.');
        } catch (RuntimeException $e) {
            $this->assertSame('completion_reason_code_required', $e->getMessage());
        }

        $task2 = $service->assignTask('operator-1', 'WO-1004', 'operation_complete', []);
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('qty_scrap_exceeds_completed');
        $service->completeTask((string)$task2['queue_id'], 'operator-1', [
            'result' => 'fail',
            'qty_completed' => 0,
            'qty_scrap' => 1,
            'reason_code' => 'DEF-DIM',
        ]);
    }

    public function testResolveConflictRequiresOwningOperatorUnlessOverrideIsExplicit(): void
    {
        $service = new MobileWorkQueueService($this->tmpDir);
        $entry = [
            '_type' => 'time_entry',
            'entry_id' => 'entry-1',
            'wo_number' => 'WO-1001',
            'operation_seq' => 20,
            'machine_id' => 'MC-5AX-01',
            'entry_type' => 'clock_in',
            'entry_time' => '2026-04-14T08:00:00+00:00',
        ];
        $service->submitOfflineBatch([$entry], 'operator-1');

        try {
            $service->resolveConflict('entry-1', 'keep_server', 'operator-2');
            $this->fail('Non-owner conflict resolution should be rejected.');
        } catch (RuntimeException $e) {
            $this->assertSame('forbidden_conflict_operator', $e->getMessage());
        }

        $resolved = $service->resolveConflict('entry-1', 'keep_server', 'operator-2', true);
        $this->assertSame('synced', $resolved['sync_status']);
        $this->assertSame('operator-2', $resolved['conflict_override']['resolved_by']);
    }

    public function testFirstPieceInspectionRequiresStructuredMeasurements(): void
    {
        $service = new MobileWorkQueueService($this->tmpDir);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('first_piece_measurements_required');

        $service->captureInspection('operator-1', [
            'wo_number' => 'WO-1001',
            'capture_type' => 'first_piece',
            'measurements' => [],
            'overall_result' => 'pass',
        ]);
    }

    public function testInspectionCaptureNormalizesMeasurementAndReplayKey(): void
    {
        $service = new MobileWorkQueueService($this->tmpDir);

        $capture = $service->captureInspection('operator-1', [
            'wo_number' => 'WO-1001',
            'jo_number' => 'JO-1001',
            'operation_seq' => 20,
            'capture_type' => 'first_piece',
            'inspection_plan_id' => 'IP-714-OP20',
            'cnc_program_id' => 'NC-714-OP20',
            'cnc_program_revision' => 'B',
            'setup_sheet_id' => 'SETUP-714-OP20',
            'setup_sheet_revision' => 'A',
            'part_revision' => 'REV-C',
            'org_plant_id' => 'P01',
            'org_site_id' => 'SITE-HCM',
            'measurements' => [
                [
                    'characteristic' => 'OD-1',
                    'value' => '10.002',
                    'unit' => 'mm',
                    'lower_spec' => 9.99,
                    'upper_spec' => 10.01,
                    'pass_fail' => 'pass',
                ],
            ],
            'client_capture_id' => 'tablet-1-fp-1',
        ]);

        $this->assertSame('pass', $capture['overall_result']);
        $this->assertSame('OD-1', $capture['measurements'][0]['characteristic_id']);
        $this->assertSame('tablet-1-fp-1', $capture['client_capture_id']);
        $this->assertSame('NC-714-OP20', $capture['cnc_program_id']);
        $this->assertSame('SETUP-714-OP20', $capture['setup_sheet_id']);
        $this->assertSame('P01', $capture['org_plant_id']);
        $this->assertNotSame('', $capture['idempotency_key']);
        $this->assertNotSame('', $capture['inspection_fingerprint']);
    }

    public function testOfflineInspectionReplayDoesNotAppendDuplicateFacts(): void
    {
        $service = new MobileWorkQueueService($this->tmpDir);
        $entry = [
            '_type' => 'inspection',
            'wo_number' => 'WO-1001',
            'operation_seq' => 20,
            'capture_type' => 'first_piece',
            'inspection_plan_id' => 'IP-714-OP20',
            'measurements' => [
                ['characteristic' => 'OD-1', 'value' => 10.002, 'pass_fail' => 'pass'],
            ],
            'overall_result' => 'pass',
            'client_capture_id' => 'tablet-1-fp-1',
            'idempotency_key' => 'tablet-1:fp:1',
        ];

        $first = $service->submitOfflineBatch([$entry], 'operator-1');
        $second = $service->submitOfflineBatch([$entry], 'operator-1');

        $this->assertSame(1, $first['synced']);
        $this->assertSame(1, $second['synced']);

        $path = $this->tmpDir . '/mobile/inspections.json';
        $rows = json_decode((string)file_get_contents($path), true);
        $this->assertIsArray($rows);
        $this->assertCount(1, $rows);
    }

    public function testOfflineReplayConflictIsRejected(): void
    {
        $service = new MobileWorkQueueService($this->tmpDir);
        $entry = [
            '_type' => 'inspection',
            'wo_number' => 'WO-1001',
            'operation_seq' => 20,
            'capture_type' => 'first_piece',
            'inspection_plan_id' => 'IP-714-OP20',
            'measurements' => [
                ['characteristic' => 'OD-1', 'value' => 10.002, 'pass_fail' => 'pass'],
            ],
            'overall_result' => 'pass',
            'client_capture_id' => 'tablet-1-fp-1',
            'idempotency_key' => 'tablet-1:fp:1',
        ];
        $service->submitOfflineBatch([$entry], 'operator-1');

        $entry['measurements'][0]['value'] = 10.05;
        $result = $service->submitOfflineBatch([$entry], 'operator-1');

        $this->assertSame(0, $result['synced']);
        $this->assertSame('offline_replay_conflict', $result['errors'][0]['error']);
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
