<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Services\OrderWorkflowService;
use PHPUnit\Framework\TestCase;

final class OrderWorkflowEngineeringReadinessTest extends TestCase
{
    private string $dataDir;

    protected function setUp(): void
    {
        $this->dataDir = sys_get_temp_dir() . '/hesem-workflow-engineering-' . bin2hex(random_bytes(4));
        mkdir($this->dataDir . '/config', 0775, true);
        mkdir($this->dataDir . '/orders', 0775, true);

        copy(QMS_TEST_DATA_DIR . '/config/so_jo_wo_config.json', $this->dataDir . '/config/so_jo_wo_config.json');
        file_put_contents($this->dataDir . '/config/users.json', json_encode([[
            'username' => 'qa-user',
            'role' => 'qa_manager',
        ]], JSON_THROW_ON_ERROR));
    }

    protected function tearDown(): void
    {
        $this->removeDir($this->dataDir);
    }

    public function testSalesOrderCannotBecomeEngineeringReadyWithoutReleasePackage(): void
    {
        $this->writeOrders([[
            'so_number' => 'SO-2026-0001',
            'status' => 'confirmed',
        ]]);

        $service = new OrderWorkflowService($this->dataDir);
        $result = $service->executeTransition('so', 'SO-2026-0001', 'engineering_ready', 'qa-user', 'release');

        $this->assertFalse($result->ok);
        $this->assertSame('engineering_release_incomplete', $result->errorCode);
        $this->assertContains('bom_id', $result->data['missing_fields'] ?? []);
    }

    public function testSalesOrderCanBecomeEngineeringReadyWithReleasedPackage(): void
    {
        $this->writeOrders([[
            'so_number' => 'SO-2026-0002',
            'status' => 'confirmed',
            'engineering_release_id' => 'ER-1',
            'engineering_release_status' => 'released',
            'bom_id' => 'BOM-1',
            'routing_id' => 'RT-1',
            'control_plan_id' => 'CP-1',
            'inspection_plan_id' => 'IP-1',
        ]]);

        $service = new OrderWorkflowService($this->dataDir);
        $result = $service->executeTransition('so', 'SO-2026-0002', 'engineering_ready', 'qa-user', 'release');

        $this->assertTrue($result->ok, $result->message);
        $this->assertSame('engineering_ready', $result->data['status'] ?? null);
    }

    public function testSalesOrderCannotBecomeEngineeringReadyWithMissingReleaseStatus(): void
    {
        $this->writeOrders([[
            'so_number' => 'SO-2026-0003',
            'status' => 'confirmed',
            'engineering_release_id' => 'ER-1',
            'bom_id' => 'BOM-1',
            'routing_id' => 'RT-1',
            'control_plan_id' => 'CP-1',
            'inspection_plan_id' => 'IP-1',
        ]]);

        $service = new OrderWorkflowService($this->dataDir);
        $result = $service->executeTransition('so', 'SO-2026-0003', 'engineering_ready', 'qa-user', 'release');

        $this->assertFalse($result->ok);
        $this->assertSame('engineering_release_incomplete', $result->errorCode);
        $this->assertSame('', $result->data['engineering_release_status'] ?? null);
    }

    public function testCompletedJobAndWorkOrderCannotBeCancelledDirectly(): void
    {
        $service = new OrderWorkflowService($this->dataDir);

        $job = $service->validateTransition('jo', 'completed', 'cancelled', 'production_manager');
        $work = $service->validateTransition('wo', 'completed', 'cancelled', 'production_manager');

        $this->assertFalse($job->ok);
        $this->assertSame('terminal_state_locked', $job->errorCode);
        $this->assertFalse($work->ok);
        $this->assertSame('terminal_state_locked', $work->errorCode);
    }

    /**
     * @param array<int, array<string, mixed>> $salesOrders
     */
    private function writeOrders(array $salesOrders): void
    {
        file_put_contents($this->dataDir . '/orders/orders.json', json_encode([
            '_meta' => ['version' => 'test'],
            'sales_orders' => $salesOrders,
            'job_orders' => [],
            'work_orders' => [],
            'form_links' => [],
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
    }

    private function removeDir(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }

        $items = scandir($dir) ?: [];
        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            $path = $dir . '/' . $item;
            if (is_dir($path)) {
                $this->removeDir($path);
                continue;
            }
            @unlink($path);
        }
        @rmdir($dir);
    }
}
