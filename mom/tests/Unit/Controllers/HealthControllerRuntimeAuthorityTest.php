<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Controllers;

use MOM\Api\Controllers\ExitException;
use MOM\Api\Controllers\HealthController;
use MOM\Database\DataLayer;
use PHPUnit\Framework\TestCase;

final class HealthControllerRuntimeAuthorityTest extends TestCase
{
    private string $tmpDir;

    protected function setUp(): void
    {
        $this->tmpDir = sys_get_temp_dir() . '/mom_health_authority_test_' . bin2hex(random_bytes(4));
        mkdir($this->tmpDir, 0775, true);
    }

    protected function tearDown(): void
    {
        $this->removeDir($this->tmpDir);
    }

    public function testStatusPayloadIncludesRuntimeAuthorityReport(): void
    {
        $controller = new HealthController(
            new DataLayer($this->tmpDir, (string)QMS_TEST_ROOT_DIR, ['use_postgres' => false]),
            (string)QMS_TEST_ROOT_DIR,
            $this->tmpDir,
        );

        try {
            $controller->status();
            $this->fail('Health status should throw structured API response.');
        } catch (ExitException $e) {
            $payload = $e->getPayload();
        }

        $this->assertIsArray($payload);
        $this->assertArrayHasKey('authority', $payload);
        $this->assertSame('compatibility_only', $payload['authority']['slices']['idempotency']['readiness_state'] ?? null);
        $this->assertSame('compatibility_only', $payload['authority']['slices']['order_workflow']['readiness_state'] ?? null);
        $this->assertSame('compatibility_only', $payload['authority']['slices']['master_data']['readiness_state'] ?? null);
        $this->assertSame('compatibility_only', $payload['authority']['slices']['manufacturing_events']['readiness_state'] ?? null);
        $this->assertSame('authoritative_ready', $payload['authority']['slices']['canonical_manufacturing_spine']['readiness_state'] ?? null);
        $this->assertSame('authoritative_ready', $payload['authority']['slices']['production_history']['readiness_state'] ?? null);
        $this->assertSame('authority_partial', $payload['authority']['slices']['workforce_qualification_gate']['readiness_state'] ?? null);
        $this->assertSame('compatibility_only', $payload['authority']['slices']['trusted_release_record']['readiness_state'] ?? null);
        $this->assertSame('authority_partial', $payload['authority']['slices']['connected_governance']['readiness_state'] ?? null);
        $this->assertSame('authority_partial', $payload['authority']['slices']['planning_scenario']['readiness_state'] ?? null);
        $this->assertSame('compatibility_only', $payload['authority']['slices']['traceability_genealogy']['readiness_state'] ?? null);
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
