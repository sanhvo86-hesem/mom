<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Services\OrderService;
use PHPUnit\Framework\TestCase;
use RuntimeException;

final class OrderServiceEngineeringGateTest extends TestCase
{
    private string $dataDir;

    protected function setUp(): void
    {
        $this->dataDir = sys_get_temp_dir() . '/hesem-order-engineering-gate-' . bin2hex(random_bytes(4));
        mkdir($this->dataDir . '/orders', 0775, true);
    }

    protected function tearDown(): void
    {
        $this->removeDir($this->dataDir);
    }

    public function testCreateJobOrderRequiresEngineeringReadySalesOrder(): void
    {
        $service = new OrderService($this->dataDir);
        $service->createSalesOrder([
            'so_number' => 'SO-2026-0001',
            'status' => 'confirmed',
            'customer_name' => 'ACME',
            'total_value' => 1,
            'created_at' => '2026-04-13T10:00:00+07:00',
        ]);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('requires SO status engineering_ready or in_production');

        $service->createJobOrder([
            'jo_number' => 'JO-2026-0001',
            'so_number' => 'SO-2026-0001',
            'status' => 'planned',
        ]);
    }

    public function testCreateJobOrderAllowsEngineeringReadySalesOrder(): void
    {
        $service = new OrderService($this->dataDir);
        $service->createSalesOrder([
            'so_number' => 'SO-2026-0002',
            'status' => 'engineering_ready',
            'customer_name' => 'ACME',
            'total_value' => 1,
            'created_at' => '2026-04-13T10:00:00+07:00',
        ]);

        $job = $service->createJobOrder([
            'jo_number' => 'JO-2026-0002',
            'so_number' => 'SO-2026-0002',
            'status' => 'planned',
        ]);

        $this->assertSame('JO-2026-0002', $job['jo_number']);
    }

    public function testCreateWorkOrderRejectsTerminalParentJobOrder(): void
    {
        $service = new OrderService($this->dataDir);
        $service->createSalesOrder([
            'so_number' => 'SO-2026-0003',
            'status' => 'engineering_ready',
            'customer_name' => 'ACME',
            'total_value' => 1,
            'created_at' => '2026-04-13T10:00:00+07:00',
        ]);
        $service->createJobOrder([
            'jo_number' => 'JO-2026-0003',
            'so_number' => 'SO-2026-0003',
            'status' => 'completed',
        ]);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('not eligible for Work Order creation');

        $service->createWorkOrder([
            'wo_number' => 'WO-2026-0003-10',
            'jo_number' => 'JO-2026-0003',
            'status' => 'scheduled',
        ]);
    }

    public function testCreateWorkOrderRejectsPlantContextDriftFromParentJobOrder(): void
    {
        $service = new OrderService($this->dataDir);
        $service->createSalesOrder([
            'so_number' => 'SO-2026-0007',
            'status' => 'engineering_ready',
            'customer_name' => 'ACME',
            'total_value' => 1,
            'created_at' => '2026-04-13T10:00:00+07:00',
        ]);
        $service->createJobOrder([
            'jo_number' => 'JO-2026-0007',
            'so_number' => 'SO-2026-0007',
            'status' => 'released',
            'org_plant_id' => 'PLANT-A',
            'org_site_id' => 'SITE-A',
            'routing_id' => 'ROUTE-A',
        ]);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('work_order_context_mismatch:org_plant_id');

        $service->createWorkOrder([
            'wo_number' => 'WO-2026-0007-10',
            'jo_number' => 'JO-2026-0007',
            'status' => 'scheduled',
            'org_plant_id' => 'PLANT-B',
        ]);
    }

    public function testCreateWorkOrderInheritsParentContextAndRejectsOperationMismatch(): void
    {
        $service = new OrderService($this->dataDir);
        $service->createSalesOrder([
            'so_number' => 'SO-2026-0008',
            'status' => 'engineering_ready',
            'customer_name' => 'ACME',
            'total_value' => 1,
            'created_at' => '2026-04-13T10:00:00+07:00',
        ]);
        $service->createJobOrder([
            'jo_number' => 'JO-2026-0008',
            'so_number' => 'SO-2026-0008',
            'status' => 'released',
            'org_plant_id' => 'PLANT-A',
            'org_site_id' => 'SITE-A',
            'routing_id' => 'ROUTE-A',
            'operations' => [[
                'operation_number' => 10,
                'routing_operation_id' => 'ROUTE-A-OP10',
                'work_center_id' => 'WC-5AX',
                'machine_id' => 'MC-5AX-01',
                'setup_sheet_id' => 'SETUP-OP10',
                'cnc_program_version_id' => 'NC-OP10-V1',
            ]],
        ]);

        $workOrder = $service->createWorkOrder([
            'wo_number' => 'WO-2026-0008-10',
            'jo_number' => 'JO-2026-0008',
            'status' => 'scheduled',
            'operation_number' => 10,
        ]);

        $this->assertSame('PLANT-A', $workOrder['org_plant_id'] ?? null);
        $this->assertSame('SITE-A', $workOrder['org_site_id'] ?? null);
        $this->assertSame('ROUTE-A-OP10', $workOrder['routing_operation_id'] ?? null);
        $this->assertSame('WC-5AX', $workOrder['work_center_id'] ?? null);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('work_order_operation_context_mismatch:work_center_id');

        $service->createWorkOrder([
            'wo_number' => 'WO-2026-0008-20',
            'jo_number' => 'JO-2026-0008',
            'status' => 'scheduled',
            'operation_number' => 10,
            'work_center_id' => 'WC-TURN',
        ]);
    }

    public function testListSalesOrdersDoesNotDuplicateRows(): void
    {
        $service = new OrderService($this->dataDir);
        $service->createSalesOrder([
            'so_number' => 'SO-2026-0004',
            'status' => 'confirmed',
            'customer_name' => 'ACME',
            'total_value' => 1,
            'created_at' => '2026-04-13T10:00:00+07:00',
        ]);

        $this->assertCount(1, $service->listSalesOrders());
    }

    public function testCreateSalesOrderDerivesMissingTotalValueFromLines(): void
    {
        $service = new OrderService($this->dataDir);

        $salesOrder = $service->createSalesOrder([
            'so_number' => 'SO-2026-0005',
            'status' => 'draft',
            'customer_name' => 'ACME',
            'lines' => [
                ['qty' => 2, 'unit_price' => 125.50],
                ['quantity' => 1, 'price' => 49.00],
            ],
            'created_at' => '2026-04-13T10:00:00+07:00',
        ]);

        $this->assertSame(300.0, $salesOrder['total_value']);
    }

    public function testCreateSalesOrderRejectsZeroAmountWithoutLineValue(): void
    {
        $service = new OrderService($this->dataDir);

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Order amount must be greater than zero');

        $service->createSalesOrder([
            'so_number' => 'SO-2026-0006',
            'status' => 'draft',
            'customer_name' => 'ACME',
            'lines' => [
                ['qty' => 2, 'unit_price' => 0],
            ],
            'created_at' => '2026-04-13T10:00:00+07:00',
        ]);
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
