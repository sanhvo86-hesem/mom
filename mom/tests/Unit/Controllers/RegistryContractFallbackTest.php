<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Controllers;

use MOM\Api\Controllers\ExitException;
use MOM\Api\Controllers\RegistryController;
use MOM\Api\Router;
use MOM\Database\DataLayer;
use PHPUnit\Framework\TestCase;
use ReflectionProperty;

final class RegistryContractFallbackTest extends TestCase
{
    private string $tmpDir;

    protected function setUp(): void
    {
        $this->tmpDir = sys_get_temp_dir() . '/mom_registry_contract_fallback_' . bin2hex(random_bytes(4));
        mkdir($this->tmpDir, 0775, true);
    }

    protected function tearDown(): void
    {
        $_GET = [];
        $_POST = [];
        $_SERVER = [];
        $_SESSION = [];
        $this->removeDir($this->tmpDir);
    }

    public function testSystemContractSynthesizesEndpointCatalogWhenRuntimeRegistryIsMissing(): void
    {
        set_authenticated_session('admin-user', ['role' => 'admin']);
        $controller = (new RegistryController(
            new DataLayer($this->tmpDir, (string)QMS_TEST_ROOT_DIR, ['use_postgres' => false]),
            (string)QMS_TEST_ROOT_DIR,
            $this->tmpDir,
        ))->setStore([
            'users' => [[
                'username' => 'admin-user',
                'name' => 'Admin User',
                'role' => 'admin',
                'active' => true,
            ]],
            'settings' => ['require_mfa' => false],
        ]);

        try {
            $controller->getSystemContract();
            $this->fail('Registry system contract should throw a structured API response.');
        } catch (ExitException $e) {
            $payload = $e->getPayload();
        }

        $this->assertGreaterThanOrEqual(600, (int)($payload['summary']['tableCount'] ?? 0));
        $this->assertGreaterThanOrEqual(3000, (int)($payload['summary']['endpointCount'] ?? 0));
        $this->assertTrue((bool)(($payload['data']['endpoint_catalog']['_meta'] ?? [])['fallback'] ?? false));
    }

    public function testGenericRuntimeRoutesUseControlledTableRegistryFallback(): void
    {
        $router = new Router(
            new DataLayer($this->tmpDir, (string)QMS_TEST_ROOT_DIR, ['use_postgres' => false]),
            (string)QMS_TEST_ROOT_DIR,
            $this->tmpDir,
        );
        $register = require QMS_TEST_BASE_DIR . '/api/routes/generic-runtime-routes.php';
        $register($router, $this->tmpDir);

        $routes = new ReflectionProperty($router, 'actionRoutes');
        if (PHP_VERSION_ID < 80100) {
            $routes->setAccessible(true);
        }

        $actionRoutes = $routes->getValue($router);
        $this->assertIsArray($actionRoutes);
        $this->assertArrayHasKey('sales.sales_orders.list', $actionRoutes);
        $this->assertArrayHasKey('sales.sales_orders.create', $actionRoutes);
        $this->assertArrayHasKey('sales.sales_orders.detail', $actionRoutes);
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
