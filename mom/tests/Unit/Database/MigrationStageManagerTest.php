<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Database;

use MOM\Database\DataLayer;
use MOM\Database\MigrationStageManager;
use PHPUnit\Framework\TestCase;

/**
 * Unit tests for MigrationStageManager.
 * Tests operate in JSON_ONLY mode (no PostgreSQL required).
 */
class MigrationStageManagerTest extends TestCase
{
    private string $tmpDir;
    private MigrationStageManager $manager;

    protected function setUp(): void
    {
        $this->tmpDir = sys_get_temp_dir() . '/mom_migration_test_' . bin2hex(random_bytes(4));
        mkdir($this->tmpDir, 0775, true);

        // Create minimal JSON data stores
        mkdir($this->tmpDir . '/config', 0775, true);
        mkdir($this->tmpDir . '/master-data', 0775, true);
        mkdir($this->tmpDir . '/orders', 0775, true);
        mkdir($this->tmpDir . '/mes', 0775, true);

        file_put_contents($this->tmpDir . '/config/users.json', json_encode([
            'users' => [['username' => 'admin', 'role' => 'admin', 'active' => true]],
            'settings' => [],
        ]));

        file_put_contents($this->tmpDir . '/master-data/master-data.json', json_encode([
            'customers' => [['code' => 'C001', 'name' => 'Test Customer']],
            'items' => [['code' => 'I001', 'name' => 'Test Item']],
        ]));

        file_put_contents($this->tmpDir . '/orders/orders.json', json_encode([
            'sales_orders' => [['so_num' => 'SO-001']],
        ]));

        // DataLayer in JSON_ONLY mode (no PG needed)
        $dataLayer = new DataLayer($this->tmpDir, dirname($this->tmpDir), [
            'use_postgres'  => false,
            'shadow_write'  => false,
            'json_fallback' => false,
        ]);

        $this->manager = new MigrationStageManager($this->tmpDir, dirname($this->tmpDir), $dataLayer);
    }

    protected function tearDown(): void
    {
        $this->removeDir($this->tmpDir);
    }

    public function testGetCurrentStageJsonOnly(): void
    {
        $stage = $this->manager->getCurrentStage();

        $this->assertSame('JSON_ONLY', $stage['current_stage']);
        $this->assertStringContainsString('JSON Only', $stage['stage_label']);
        $this->assertSame(DataLayer::MODE_SHADOW_WRITE, $stage['next_stage']);
    }

    public function testEnvVarsForJsonOnly(): void
    {
        $vars = $this->manager->envVarsForStage(DataLayer::MODE_JSON_ONLY);

        $this->assertSame('false', $vars['USE_POSTGRES']);
        $this->assertSame('false', $vars['SHADOW_WRITE']);
    }

    public function testEnvVarsForShadowWrite(): void
    {
        $vars = $this->manager->envVarsForStage(DataLayer::MODE_SHADOW_WRITE);

        $this->assertSame('true', $vars['USE_POSTGRES']);
        $this->assertSame('true', $vars['SHADOW_WRITE']);
        $this->assertSame('true', $vars['DB_LOG_QUERIES']);
    }

    public function testEnvVarsForPostgresPrimary(): void
    {
        $vars = $this->manager->envVarsForStage(DataLayer::MODE_POSTGRES_PRIMARY);

        $this->assertSame('true', $vars['USE_POSTGRES']);
        $this->assertSame('false', $vars['SHADOW_WRITE']);
        $this->assertSame('true', $vars['JSON_FALLBACK']);
    }

    public function testEnvVarsForPostgresOnly(): void
    {
        $vars = $this->manager->envVarsForStage(DataLayer::MODE_POSTGRES_ONLY);

        $this->assertSame('true', $vars['USE_POSTGRES']);
        $this->assertSame('false', $vars['SHADOW_WRITE']);
        $this->assertSame('false', $vars['JSON_FALLBACK']);
    }

    public function testRunbookForShadowWrite(): void
    {
        $runbook = $this->manager->runbookForTransition(
            DataLayer::MODE_JSON_ONLY,
            DataLayer::MODE_SHADOW_WRITE
        );

        $this->assertStringContainsString('JSON Only', $runbook['from']);
        $this->assertStringContainsString('Shadow Write', $runbook['to']);
        $this->assertNotEmpty($runbook['steps']);
        $this->assertStringContainsString('migrate.php', $runbook['steps'][1]);
    }

    public function testRunbookForPostgresOnly(): void
    {
        $runbook = $this->manager->runbookForTransition(
            DataLayer::MODE_POSTGRES_PRIMARY,
            DataLayer::MODE_POSTGRES_ONLY
        );

        $this->assertStringContainsString('PostgreSQL Primary', $runbook['from']);
        $this->assertStringContainsString('PostgreSQL Only', $runbook['to']);
        // Should mention backup
        $hasBackupStep = false;
        foreach ($runbook['steps'] as $step) {
            if (str_contains($step, 'backup')) {
                $hasBackupStep = true;
                break;
            }
        }
        $this->assertTrue($hasBackupStep, 'Runbook should include a backup step');
    }

    public function testDataParityReportInJsonOnlyMode(): void
    {
        $report = $this->manager->checkDataParityReport();

        $this->assertArrayHasKey('stores', $report);
        $this->assertArrayHasKey('master-data', $report['stores']);
        $this->assertArrayHasKey('users', $report['stores']);

        // JSON should exist
        $this->assertTrue($report['stores']['master-data']['json_exists']);
        $this->assertGreaterThan(0, $report['stores']['master-data']['json_records']);
    }

    public function testPreflightCheckInJsonOnlyMode(): void
    {
        $result = $this->manager->preflightCheck();

        $this->assertSame(DataLayer::MODE_SHADOW_WRITE, $result['target']);
        $this->assertNotEmpty($result['checks']);
        $this->assertArrayHasKey('env_vars', $result);
        $this->assertArrayHasKey('runbook', $result);

        // In JSON_ONLY without PG, first check (PG connection) should fail.
        // Skip if PG is actually reachable in the current environment (CI service).
        $pgCheck = $result['checks'][0];
        $this->assertSame('PostgreSQL Connection', $pgCheck['name']);
        if ($pgCheck['status'] === 'pass') {
            $this->markTestSkipped('PostgreSQL is reachable; the no-pg failure path is not testable in this environment.');
        }
        $this->assertSame('fail', $pgCheck['status']);
    }

    public function testBackfillWithoutPgReturnsError(): void
    {
        $result = $this->manager->runShadowSyncBackfill();

        $this->assertEmpty($result['synced']);
        $this->assertArrayHasKey('connection', $result['errors']);
    }

    private function removeDir(string $dir): void
    {
        if (!is_dir($dir)) return;
        $items = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($dir, \RecursiveDirectoryIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST
        );
        foreach ($items as $item) {
            $item->isDir() ? rmdir($item->getPathname()) : unlink($item->getPathname());
        }
        rmdir($dir);
    }
}
