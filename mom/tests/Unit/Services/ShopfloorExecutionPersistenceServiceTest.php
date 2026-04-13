<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Database\DataLayer;
use MOM\Services\ShopfloorExecutionPersistenceService;
use PHPUnit\Framework\TestCase;

final class ShopfloorExecutionPersistenceServiceTest extends TestCase
{
    private string $tmpDir;

    protected function setUp(): void
    {
        $this->tmpDir = sys_get_temp_dir() . '/mom_shopfloor_persistence_' . bin2hex(random_bytes(4));
        mkdir($this->tmpDir, 0775, true);
    }

    protected function tearDown(): void
    {
        $this->removeDir($this->tmpDir);
    }

    public function testJsonOnlyModeSkipsPostgresBridgeWithoutFailingExecution(): void
    {
        $rootDir = dirname(__DIR__, 4);
        $service = new ShopfloorExecutionPersistenceService(
            new DataLayer($this->tmpDir, $rootDir, ['use_postgres' => false]),
        );

        $targetResult = $service->shadowTarget([
            'target_id' => 'TGT-1',
            'wo_number' => 'WO-1',
            'machine_id' => 'MC-1',
            'shift_date' => '2026-04-13',
            'shift_code' => 'morning',
        ]);
        $reportResult = $service->shadowProductionReport([
            'target_id' => 'TGT-1',
            'wo_number' => 'WO-1',
            'machine_id' => 'MC-1',
            'shift_date' => '2026-04-13',
            'shift_code' => 'morning',
        ], [
            'log_id' => 'LOG-1',
            'target_id' => 'TGT-1',
            'wo_number' => 'WO-1',
            'machine_id' => 'MC-1',
            'operator_id' => 'operator-1',
            'shift_date' => '2026-04-13',
            'shift_code' => 'morning',
        ], [
            'event_id' => 'PRE-1',
            'target_id' => 'TGT-1',
            'log_id' => 'LOG-1',
        ]);
        $executionEventResult = $service->shadowExecutionEvent([
            'event_id' => 'DTE-1',
            'event_type' => 'dispatch.target_created',
            'target_id' => 'TGT-1',
            'status' => 'planned',
        ]);

        $this->assertSame(['backend' => 'json_only', 'status' => 'skipped'], $targetResult);
        $this->assertSame(['backend' => 'json_only', 'status' => 'skipped'], $reportResult);
        $this->assertSame(['backend' => 'json_only', 'status' => 'skipped'], $executionEventResult);
    }

    public function testPhase1BridgeMigrationAndServicePreserveGovernanceScope(): void
    {
        $rootDir = dirname(__DIR__, 3);
        $migration = file_get_contents($rootDir . '/database/migrations/107_phase1_shopfloor_execution_bridge.sql');
        $service = file_get_contents($rootDir . '/api/services/ShopfloorExecutionPersistenceService.php');

        $this->assertIsString($migration);
        $this->assertStringContainsString("'mom.dispatch'", $migration);
        $this->assertStringContainsString('INSERT INTO source_system_registry', $migration);
        $this->assertStringContainsString('ALTER TABLE shift_targets', $migration);
        $this->assertStringContainsString('ADD COLUMN IF NOT EXISTS org_company_code', $migration);
        $this->assertStringContainsString('idx_shift_production_log_scope', $migration);

        $this->assertIsString($service);
        $this->assertStringContainsString('] + $this->governanceScopeParams($target);', $service);
        $this->assertStringContainsString('] + $this->governanceScopeParams($log);', $service);
        $this->assertStringContainsString('&& $eventUuid !== \'\') ? \'mirrored\' : \'partial\'', $service);
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
