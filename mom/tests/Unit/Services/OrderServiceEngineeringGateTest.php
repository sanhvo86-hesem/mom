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
            'created_at' => '2026-04-13T10:00:00+07:00',
        ]);

        $job = $service->createJobOrder([
            'jo_number' => 'JO-2026-0002',
            'so_number' => 'SO-2026-0002',
            'status' => 'planned',
        ]);

        $this->assertSame('JO-2026-0002', $job['jo_number']);
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
