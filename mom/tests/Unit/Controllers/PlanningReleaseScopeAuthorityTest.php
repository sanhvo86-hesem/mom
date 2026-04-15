<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Controllers;

use MOM\Api\Controllers\ExitException;
use MOM\Api\Controllers\PlanningScenarioController;
use MOM\Api\Controllers\TrustedReleaseRecordController;
use MOM\Database\DataLayer;
use PHPUnit\Framework\TestCase;
use ReflectionClass;
use RuntimeException;

final class PlanningReleaseScopeAuthorityTest extends TestCase
{
    private string $tmpDir;

    protected function setUp(): void
    {
        $this->tmpDir = sys_get_temp_dir() . '/mom_scope_authority_test_' . bin2hex(random_bytes(4));
        mkdir($this->tmpDir, 0775, true);
        $_GET = [];
        $_POST = [];
        $_SERVER['REQUEST_METHOD'] = 'POST';
        $_SERVER['HTTP_X_CSRF_TOKEN'] = 'scope-test-token';
        $_SERVER['CONTENT_TYPE'] = 'application/json';
        $_SESSION = [];
        set_authenticated_session('planner-user', [
            'role' => 'planning_manager',
            'org_company_code' => 'HESEM',
            'org_legal_entity_code' => 'HESEM-VN',
            'org_site_id' => 'SITE-A',
            'org_plant_id' => 'PLANT-A',
        ]);
        $_SESSION['csrf'] = 'scope-test-token';
    }

    protected function tearDown(): void
    {
        unset($GLOBALS['__mom_raw_input']);
        $_GET = [];
        $_POST = [];
        $_SESSION = [];
        unset($_SERVER['HTTP_X_CSRF_TOKEN'], $_SERVER['CONTENT_TYPE']);
        $this->removeDir($this->tmpDir);
    }

    public function testPlanningCalculateRejectsClientScopeOverride(): void
    {
        $controller = $this->planningController();
        $GLOBALS['__mom_raw_input'] = json_encode([
            'scenario_key' => 'SCOPE-OVERRIDE',
            'org_site_id' => 'SITE-B',
            'org_plant_id' => 'PLANT-B',
        ], JSON_THROW_ON_ERROR);

        try {
            $controller->calculate();
            $this->fail('Planning calculate should reject client-supplied scope.');
        } catch (ExitException $e) {
            $this->assertSame(403, $e->getStatusCode());
            $this->assertSame('unauthorized_scope_field_in_request', $e->getPayload()['error'] ?? null);
        }
    }

    public function testPlanningCalculateDerivesScopeFromSession(): void
    {
        $controller = $this->planningController();
        $GLOBALS['__mom_raw_input'] = json_encode($this->scenarioWithoutScope(), JSON_THROW_ON_ERROR);

        try {
            $controller->calculate();
            $this->fail('Planning calculate should throw structured API response.');
        } catch (ExitException $e) {
            $payload = $e->getPayload();
            $this->assertSame(201, $e->getStatusCode());
        }

        $scenario = $payload['planning_scenario'] ?? [];
        $this->assertSame('SITE-A', $scenario['org_site_id'] ?? null);
        $this->assertSame('PLANT-A', $scenario['org_plant_id'] ?? null);
        $this->assertSame('SITE-A', $scenario['site_id'] ?? null);
        $this->assertSame('PLANT-A', $scenario['plant_id'] ?? null);
    }

    public function testTrustedReleaseRejectsCrossSitePacketEvenWhenPlantMatches(): void
    {
        $controller = $this->releaseController();
        $method = (new ReflectionClass($controller))->getMethod('verifyPacketScope');
        if (PHP_VERSION_ID < 80100) {
            $method->setAccessible(true);
        }

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('unauthorized_site_scope');
        $method->invoke($controller, [
            'packet_id' => 'PKT-1',
            'org_site_id' => 'SITE-B',
            'org_plant_id' => 'PLANT-A',
        ], []);
    }

    public function testTrustedReleaseRejectsPacketsMissingPartitionScope(): void
    {
        $controller = $this->releaseController();
        $method = (new ReflectionClass($controller))->getMethod('verifyPacketScope');
        if (PHP_VERSION_ID < 80100) {
            $method->setAccessible(true);
        }

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('unauthorized_site_scope');
        $method->invoke($controller, [
            'packet_id' => 'PKT-1',
            'org_plant_id' => 'PLANT-A',
        ], []);
    }

    public function testTrustedReleaseFailsClosedWhenSessionPartitionScopeMissing(): void
    {
        unset($_SESSION['org_scope'], $_SESSION['user_scope']);
        $controller = $this->releaseController();
        $method = (new ReflectionClass($controller))->getMethod('verifyPacketScope');
        if (PHP_VERSION_ID < 80100) {
            $method->setAccessible(true);
        }

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('missing_session_partition_scope');
        $method->invoke($controller, [
            'packet_id' => 'PKT-1',
            'org_site_id' => 'SITE-A',
            'org_plant_id' => 'PLANT-A',
        ], []);
    }

    public function testTrustedReleaseCriteriaReceivesSessionSiteAndPlantScope(): void
    {
        $controller = $this->releaseController();
        $method = (new ReflectionClass($controller))->getMethod('addUserPlantToCriteria');
        if (PHP_VERSION_ID < 80100) {
            $method->setAccessible(true);
        }

        $criteria = ['wo_number' => 'WO-1'];
        $method->invokeArgs($controller, [&$criteria]);

        $this->assertSame('SITE-A', $criteria['org_site_id'] ?? null);
        $this->assertSame('PLANT-A', $criteria['org_plant_id'] ?? null);
        $this->assertSame('SITE-A', $criteria['site_id'] ?? null);
        $this->assertSame('PLANT-A', $criteria['plant_id'] ?? null);
    }

    private function planningController(): PlanningScenarioController
    {
        return (new PlanningScenarioController(
            new DataLayer($this->tmpDir, (string)QMS_TEST_ROOT_DIR, ['use_postgres' => false]),
            (string)QMS_TEST_ROOT_DIR,
            $this->tmpDir,
        ))->setStore($this->store());
    }

    private function releaseController(): TrustedReleaseRecordController
    {
        return (new TrustedReleaseRecordController(
            new DataLayer($this->tmpDir, (string)QMS_TEST_ROOT_DIR, ['use_postgres' => false]),
            (string)QMS_TEST_ROOT_DIR,
            $this->tmpDir,
        ))->setStore($this->store());
    }

    /**
     * @return array<string, mixed>
     */
    private function store(): array
    {
        return [
            'users' => [[
                'username' => 'planner-user',
                'name' => 'Planner User',
                'role' => 'planning_manager',
                'active' => true,
                'org_company_code' => 'HESEM',
                'org_legal_entity_code' => 'HESEM-VN',
                'org_site_id' => 'SITE-A',
                'org_plant_id' => 'PLANT-A',
            ]],
            'settings' => ['require_mfa' => false],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function scenarioWithoutScope(): array
    {
        return [
            'scenario_key' => 'SESSION-SCOPED',
            'scenario_name' => 'Session scoped plan',
            'horizon_start' => '2026-04-13',
            'work_orders' => [[
                'wo_number' => 'WO-PLAN-1',
                'operation_seq' => '20',
                'work_center_id' => 'WC-5AX',
                'machine_id' => 'MC-5AX-01',
                'required_minutes' => 120,
            ]],
            'capacity_buckets' => [[
                'work_center_id' => 'WC-5AX',
                'machine_id' => 'MC-5AX-01',
                'bucket_date' => '2026-04-13',
                'available_minutes' => 600,
            ]],
        ];
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
