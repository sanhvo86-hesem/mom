<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Controllers;

use MOM\Api\Controllers\ExitException;
use MOM\Api\Controllers\SchemaStudioController;
use MOM\Database\DataLayer;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;

final class SchemaStudioRegistryFallbackTest extends TestCase
{
    private string $tmpDir;

    protected function setUp(): void
    {
        $this->tmpDir = sys_get_temp_dir() . '/mom_schema_studio_registry_fallback_' . bin2hex(random_bytes(4));
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

    public function testDesignListKeepsWorkspaceAndSystemRegistryWhenRuntimeRegistryIsMissing(): void
    {
        $controller = $this->controller();

        try {
            $controller->listDesigns();
            $this->fail('Schema Studio list should throw a structured API response.');
        } catch (ExitException $e) {
            $payload = $e->getPayload();
        }

        $designs = array_values(array_filter((array)($payload['designs'] ?? []), 'is_array'));
        $designIds = array_map(static fn(array $design): string => (string)($design['id'] ?? ''), $designs);

        $this->assertContains('workspace', $designIds);
        $this->assertContains('system_contract_registry', $designIds);

        $registry = $this->findDesign($designs, 'system_contract_registry');
        $this->assertIsArray($registry);
        $this->assertTrue((bool)($registry['readOnly'] ?? false));
        $this->assertGreaterThanOrEqual(600, (int)($registry['tableCount'] ?? 0));
    }

    public function testSystemRegistryDesignFallsBackToControlledContractAndRestoresRelations(): void
    {
        $controller = $this->controller();
        $buildRegistryDesignDocument = new ReflectionMethod($controller, 'buildRegistryDesignDocument');
        if (PHP_VERSION_ID < 80100) {
            $buildRegistryDesignDocument->setAccessible(true);
        }

        $schema = $buildRegistryDesignDocument->invoke($controller, 'system_contract_registry', [
            'name' => 'HESEM System Contract Registry',
            'description' => 'Read-only full backend contract registry.',
            'designType' => 'system_contract_registry',
            'authorityLayer' => 'system_contract_registry',
            'readOnly' => true,
            'editable' => false,
            'validation_profile' => 'logical_registry',
        ]);

        $this->assertIsArray($schema);
        $this->assertSame('system_contract_registry', (string)(($schema['_meta'] ?? [])['id'] ?? ''));
        $this->assertTrue((bool)(($schema['_meta'] ?? [])['readOnly'] ?? false));
        $this->assertSame('mom/contracts/table-registry.json', (string)(($schema['_meta'] ?? [])['source'] ?? ''));
        $this->assertGreaterThanOrEqual(600, count((array)($schema['tables'] ?? [])));
        $this->assertGreaterThanOrEqual(3000, count((array)($schema['relations'] ?? [])));
    }

    /**
     * @param array<int, array<string, mixed>> $designs
     */
    private function findDesign(array $designs, string $id): ?array
    {
        foreach ($designs as $design) {
            if ((string)($design['id'] ?? '') === $id) {
                return $design;
            }
        }
        return null;
    }

    private function controller(): SchemaStudioController
    {
        $_SERVER['REQUEST_METHOD'] = 'POST';
        $_SERVER['HTTP_X_CSRF_TOKEN'] = 'schema-test-token';
        set_authenticated_session('admin-user', ['role' => 'admin']);
        $_SESSION['csrf'] = 'schema-test-token';

        return (new SchemaStudioController(
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
            'settings' => [],
        ]);
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
