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
        $_SESSION = [];
        $this->removeDir($this->tmpDir);
    }

    public function testStatusPayloadIncludesRuntimeAuthorityReport(): void
    {
        $controller = $this->adminController();

        try {
            $controller->status();
            $this->fail('Health status should throw structured API response.');
        } catch (ExitException $e) {
            $payload = $e->getPayload();
        }

        $this->assertIsArray($payload);
        $this->assertArrayHasKey('infrastructure', $payload);
        $this->assertArrayHasKey('evidence_vault', $payload['infrastructure']);
        $this->assertArrayHasKey('upload_hardening', $payload['infrastructure']);
        $this->assertSame('postgres', $payload['infrastructure']['evidence_vault']['backend'] ?? null);
        $this->assertSame('file_quarantine', $payload['infrastructure']['upload_hardening']['backend'] ?? null);
        $this->assertArrayHasKey('authority', $payload);
        $this->assertArrayHasKey('health_evaluation', $payload);
        $this->assertSame(
            !in_array(false, $payload['health_evaluation']['components_ok'], true),
            $payload['ok'],
        );
        $this->assertSame(
            (bool)($payload['authority']['ok'] ?? false),
            $payload['health_evaluation']['components_ok']['runtime_authority'] ?? null,
        );
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

    public function testStatusRequiresAdminAuthentication(): void
    {
        $controller = new HealthController(
            new DataLayer($this->tmpDir, (string)QMS_TEST_ROOT_DIR, ['use_postgres' => false]),
            (string)QMS_TEST_ROOT_DIR,
            $this->tmpDir,
        );
        $controller->setStore([
            'users' => [[
                'username' => 'admin-user',
                'name' => 'Admin User',
                'role' => 'admin',
                'active' => true,
            ]],
            'settings' => [],
        ]);

        try {
            $controller->status();
            $this->fail('Health status should throw structured API response.');
        } catch (ExitException $e) {
            $payload = $e->getPayload();
            $status = $e->getStatusCode();
        }

        $this->assertIsArray($payload);
        $this->assertSame(401, $status);
        $this->assertSame('unauthorized', $payload['error'] ?? null);
    }

    public function testReadyIncludesInfrastructureChecks(): void
    {
        $controller = new HealthController(
            new DataLayer($this->tmpDir, (string)QMS_TEST_ROOT_DIR, ['use_postgres' => false]),
            (string)QMS_TEST_ROOT_DIR,
            $this->tmpDir,
        );
        $GLOBALS['DATA_DIR'] = $this->tmpDir;
        $GLOBALS['store'] = ['users' => []];

        try {
            $controller->ready();
            $this->fail('Health ready should throw structured API response.');
        } catch (ExitException $e) {
            $payload = $e->getPayload();
        } finally {
            unset($GLOBALS['DATA_DIR'], $GLOBALS['store']);
        }

        $this->assertIsArray($payload);
        $this->assertArrayHasKey('checks', $payload);
        $this->assertArrayHasKey('redis', $payload['checks']);
        $this->assertArrayHasKey('rabbitmq', $payload['checks']);
        $this->assertArrayHasKey('logging', $payload['checks']);
        $this->assertArrayHasKey('evidence_vault', $payload['checks']);
        $this->assertArrayHasKey('upload_hardening', $payload['checks']);
        $this->assertArrayHasKey('runtime_authority', $payload['checks']);
        $this->assertSame(
            !in_array(false, $payload['checks'], true),
            $payload['ok'],
        );
        $this->assertNoErrorKeys($payload);
    }

    private function adminController(): HealthController
    {
        $store = [
            'users' => [[
                'username' => 'admin-user',
                'name' => 'Admin User',
                'role' => 'admin',
                'active' => true,
            ]],
            'settings' => [],
        ];
        set_authenticated_session('admin-user', ['role' => 'admin']);

        return (new HealthController(
            new DataLayer($this->tmpDir, (string)QMS_TEST_ROOT_DIR, ['use_postgres' => false]),
            (string)QMS_TEST_ROOT_DIR,
            $this->tmpDir,
        ))->setStore($store);
    }

    /**
     * @param mixed $payload
     */
    private function assertNoErrorKeys(mixed $payload): void
    {
        if (!is_array($payload)) {
            return;
        }
        foreach ($payload as $key => $value) {
            $this->assertNotSame('error', $key, 'Unauthenticated readiness payload leaked an error key.');
            $this->assertNoErrorKeys($value);
        }
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
