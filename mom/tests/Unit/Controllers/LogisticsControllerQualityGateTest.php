<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Controllers;

use MOM\Api\Controllers\LogisticsController;
use MOM\Database\DataLayer;
use MOM\Services\ShipmentGateService;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;

final class LogisticsControllerQualityGateTest extends TestCase
{
    private string $dataDir;

    protected function setUp(): void
    {
        $this->dataDir = sys_get_temp_dir() . '/hesem-logistics-gate-' . bin2hex(random_bytes(4));
        mkdir($this->dataDir . '/config', 0775, true);
        mkdir($this->dataDir . '/orders', 0775, true);
    }

    protected function tearDown(): void
    {
        $this->removeDir($this->dataDir);
    }

    public function testOqcFailureCreatesAutoNcrAndActiveShipmentHold(): void
    {
        $controller = $this->controller();
        $ncrMethod = $this->method($controller, 'createNcrForOqcFailure');
        $holdMethod = $this->method($controller, 'createQualityHoldForOqcFailure');

        $oqc = [
            'id' => 'oqc-row-1',
            'oqc_number' => 'OQC-2026-0001',
            'so_number' => 'SO-2026-0001',
            'jo_number' => 'JO-2026-0001',
            'wo_number' => 'WO-2026-000001',
            'item_id' => 'PART-1',
            'lot_number' => 'LOT-1',
            'qty_rejected' => 2,
        ];

        $ncr = $ncrMethod->invoke($controller, $oqc, 'quality-user', gmdate(DATE_ATOM, time()));
        $this->assertIsArray($ncr);
        $this->assertStringStartsWith('NCR-OQC-', (string)($ncr['ncr_id'] ?? ''));
        $this->assertSame('open', $ncr['status'] ?? null);

        $hold = $holdMethod->invoke($controller, $oqc, 'quality-user', gmdate(DATE_ATOM, time()));
        $this->assertIsArray($hold);
        $this->assertSame('active', $hold['status'] ?? null);
        $this->assertSame('oqc_failure', $hold['source_type'] ?? null);

        $duplicateNcr = $ncrMethod->invoke($controller, $oqc, 'quality-user', gmdate(DATE_ATOM, time() + 60));
        $this->assertSame($ncr['ncr_id'], $duplicateNcr['ncr_id'] ?? null);

        $holds = json_decode((string)file_get_contents($this->dataDir . '/orders/holds.json'), true);
        $this->assertCount(1, $holds);
    }

    public function testShipmentGateConfigNormalizesGateItems(): void
    {
        file_put_contents($this->dataDir . '/config/shipment_readiness_gate.json', json_encode([
            'gate_items' => [[
                'code' => 'SG-09',
                'label' => 'Packing & Labeling Confirmed',
                'severity' => 'warning',
            ]],
        ], JSON_THROW_ON_ERROR));

        $service = new ShipmentGateService($this->dataDir, $this->dataDir . '/config');
        $config = $service->getGateConfig();

        $this->assertSame('SG-09', $config['gates'][0]['code'] ?? null);
        $this->assertFalse($config['gates'][0]['required'] ?? true);
    }

    private function controller(): LogisticsController
    {
        return new LogisticsController(
            new DataLayer($this->dataDir, QMS_TEST_ROOT_DIR, ['use_postgres' => false]),
            QMS_TEST_ROOT_DIR,
            $this->dataDir
        );
    }

    private function method(object $target, string $name): ReflectionMethod
    {
        $method = new ReflectionMethod($target, $name);
        if (PHP_VERSION_ID < 80100) {
            $method->setAccessible(true);
        }

        return $method;
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
