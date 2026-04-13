<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\FileManufacturingEventRepository;
use MOM\Api\Services\ManufacturingEventBackboneService;
use MOM\Api\Services\ProductionHistoryReadModelService;
use MOM\Api\Services\CanonicalManufacturingSpineService;
use MOM\Api\Services\WorkforceQualificationException;
use MOM\Api\Services\WorkforceQualificationGateService;
use MOM\Services\MobileWorkQueueService;
use PHPUnit\Framework\TestCase;

final class WorkforceQualificationGateServiceTest extends TestCase
{
    private string $tmpDir;

    protected function setUp(): void
    {
        $this->tmpDir = sys_get_temp_dir() . '/mom_qualification_gate_test_' . bin2hex(random_bytes(4));
        mkdir($this->tmpDir, 0775, true);
    }

    protected function tearDown(): void
    {
        $this->removeDir($this->tmpDir);
    }

    public function testQualifiedOperatorCanStartTaskAndGateEventIsVisible(): void
    {
        $events = $this->events();
        $gate = new WorkforceQualificationGateService(
            $this->tmpDir,
            $events,
            requirements: [$this->requirement()],
            qualifications: [[
                'employee_id' => 'EMP-QUAL',
                'qualification_type' => 'skill',
                'qualification_code' => 'CNC-5AX',
                'status' => 'active',
                'proficiency' => 4,
                'expires_at' => '2026-12-31',
            ]],
        );
        $queue = new MobileWorkQueueService($this->tmpDir, qualificationGate: $gate);
        $task = $queue->assignTask('EMP-QUAL', 'WO-QUAL', 'setup_complete', [
            'work_center_id' => 'WC-5AX',
            'machine_id' => 'MC-5AX-01',
            'operation_seq' => '10',
        ]);

        $started = $queue->startTask($task['queue_id'], 'EMP-QUAL');
        $packet = (new ProductionHistoryReadModelService(
            $events,
            new CanonicalManufacturingSpineService(QMS_TEST_BASE_DIR),
        ))->packet(['wo_number' => 'WO-QUAL']);
        $probe = $gate->probe();

        $this->assertSame('in_progress', $started['task_status']);
        $this->assertSame('passed', $started['qualification_gate']['status']);
        $this->assertSame('qualified', $started['qualification_gate']['reason_code']);
        $this->assertSame('authoritative_ready', $probe['readiness_state']);
        $this->assertSame('service_invariant', $probe['authority_mode']);
        $this->assertCount(1, $packet['sections']['workforce']);
        $this->assertSame('EMP-QUAL', $packet['sections']['workforce'][0]['actor_id']);
    }

    public function testExpiredQualificationBlocksTaskStartWithStableReason(): void
    {
        $events = $this->events();
        $gate = new WorkforceQualificationGateService(
            $this->tmpDir,
            $events,
            requirements: [$this->requirement()],
            qualifications: [[
                'employee_id' => 'EMP-EXP',
                'qualification_type' => 'skill',
                'qualification_code' => 'CNC-5AX',
                'status' => 'active',
                'proficiency' => 5,
                'expires_at' => '2026-01-01',
            ]],
        );
        $queue = new MobileWorkQueueService($this->tmpDir, qualificationGate: $gate);
        $task = $queue->assignTask('EMP-EXP', 'WO-BLOCK', 'setup_complete', [
            'work_center_id' => 'WC-5AX',
            'machine_id' => 'MC-5AX-01',
            'operation_seq' => '10',
        ]);

        try {
            $queue->startTask($task['queue_id'], 'EMP-EXP');
            $this->fail('Expected qualification gate block.');
        } catch (WorkforceQualificationException $e) {
            $this->assertSame('expired_qualification', $e->reasonCode());
            $this->assertSame('blocked', $e->details()['status']);
        }

        $current = $queue->getOperatorQueue('EMP-EXP', substr((string)$task['assigned_at'], 0, 10));
        $packet = (new ProductionHistoryReadModelService(
            $events,
            new CanonicalManufacturingSpineService(QMS_TEST_BASE_DIR),
        ))->packet(['wo_number' => 'WO-BLOCK']);

        $this->assertSame('pending', $current[0]['task_status']);
        $this->assertCount(1, $packet['sections']['workforce']);
        $this->assertSame('WO-BLOCK', $packet['sections']['workforce'][0]['wo_number']);
        $this->assertSame(1, $gate->metrics()['blocks']);
        $this->assertSame(1, $gate->metrics()['expired_qualification']);
    }

    public function testMissingQualificationBlocksWithStableReason(): void
    {
        $gate = new WorkforceQualificationGateService(
            $this->tmpDir,
            $this->events(),
            requirements: [$this->requirement()],
            qualifications: [],
        );

        $this->expectException(WorkforceQualificationException::class);
        $this->expectExceptionMessage('Required qualification is missing.');

        $gate->assertCanStartTask('EMP-MISSING', [
            'queue_id' => 'Q-MISSING',
            'wo_number' => 'WO-MISSING',
            'task_type' => 'setup_complete',
            'work_center_id' => 'WC-5AX',
            'machine_id' => 'MC-5AX-01',
            'operation_seq' => '10',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function requirement(): array
    {
        return [
            'task_type' => 'setup_complete',
            'work_center_id' => 'WC-5AX',
            'qualification_type' => 'skill',
            'qualification_code' => 'CNC-5AX',
            'min_proficiency' => 3,
        ];
    }

    private function events(): ManufacturingEventBackboneService
    {
        return new ManufacturingEventBackboneService(
            $this->tmpDir,
            repository: new FileManufacturingEventRepository($this->tmpDir),
            databaseConfig: ['use_postgres' => false],
        );
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
