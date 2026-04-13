<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Services\CopqEngine;
use PHPUnit\Framework\TestCase;

final class CopqEngineCostRateTest extends TestCase
{
    private string $tmpDir;

    protected function setUp(): void
    {
        $this->tmpDir = sys_get_temp_dir() . '/mom_copq_rate_test_' . bin2hex(random_bytes(4));
        mkdir($this->tmpDir . '/config', 0775, true);
    }

    protected function tearDown(): void
    {
        $this->removeTree($this->tmpDir);
    }

    public function testDefaultMaterialCostCanComeFromExceptionPolicyConfig(): void
    {
        file_put_contents($this->tmpDir . '/config/exception_management_policy.json', json_encode([
            'copq_cost_rates' => [
                'default_material_cost_per_unit' => 72.5,
            ],
        ], JSON_THROW_ON_ERROR));

        $engine = new CopqEngine($this->tmpDir);

        $this->assertSame(72.5, $engine->estimateMaterialCostPerUnit([]));
    }

    public function testExplicitWorkOrderMaterialCostStillWins(): void
    {
        file_put_contents($this->tmpDir . '/config/exception_management_policy.json', json_encode([
            'copq_cost_rates' => [
                'default_material_cost_per_unit' => 72.5,
            ],
        ], JSON_THROW_ON_ERROR));

        $engine = new CopqEngine($this->tmpDir);

        $this->assertSame(15.0, $engine->estimateMaterialCostPerUnit([
            'material_cost_per_unit' => 15,
        ]));
    }

    private function removeTree(string $path): void
    {
        if (!is_dir($path)) {
            return;
        }

        $it = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($path, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST,
        );
        foreach ($it as $item) {
            $item->isDir() ? rmdir($item->getPathname()) : unlink($item->getPathname());
        }
        rmdir($path);
    }
}
