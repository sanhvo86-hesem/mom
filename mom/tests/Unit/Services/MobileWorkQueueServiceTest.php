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
