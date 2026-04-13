<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Controllers;

use MOM\Api\Controllers\ExitException;
use MOM\Api\Controllers\GenericCrudController;
use MOM\Database\DataLayer;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;

final class GenericCrudControllerRuntimeSafetyTest extends TestCase
{
    protected function tearDown(): void
    {
        putenv('HESEM_ALLOW_GOVERNED_GENERIC_MUTATION');
        $_SERVER = [];
    }

    public function testGovernedGenericMutationRequiresDomainCommandEvenForAdmin(): void
    {
        $controller = $this->controller();
        $guard = $this->method($controller, 'enforceRuntimePermission');

        try {
            $guard->invoke($controller, [
                'username' => 'admin-user',
                'role' => 'admin',
                'roles' => ['admin'],
            ], [
                'kind' => 'create',
                'domain' => 'sales',
                'table' => 'sales_orders',
                'tableMeta' => [
                    'columns' => [],
                    'statusColumn' => 'so_status',
                ],
            ]);
            $this->fail('Governed Generic CRUD mutation did not require a domain command.');
        } catch (ExitException $e) {
            $this->assertSame(409, $e->getStatusCode());
            $this->assertSame('domain_command_required', $e->getPayload()['error'] ?? null);
            $this->assertSame('sales_orders', $e->getPayload()['table'] ?? null);
        }
    }

    public function testGovernedGenericReadRemainsAllowedForAdmin(): void
    {
        $controller = $this->controller();
        $guard = $this->method($controller, 'enforceRuntimePermission');

        $guard->invoke($controller, [
            'username' => 'admin-user',
            'role' => 'admin',
            'roles' => ['admin'],
        ], [
            'kind' => 'list',
            'domain' => 'sales',
            'table' => 'sales_orders',
            'tableMeta' => [
                'columns' => [],
                'statusColumn' => 'so_status',
            ],
        ]);

        $this->addToAssertionCount(1);
    }

    public function testGovernedGenericMutationOverrideRequiresEnvironmentAndHeader(): void
    {
        putenv('HESEM_ALLOW_GOVERNED_GENERIC_MUTATION=1');
        $_SERVER['HTTP_X_HESEM_INTERNAL_GENERIC_OVERRIDE'] = 'domain-command-backfill';

        $controller = $this->controller();
        $guard = $this->method($controller, 'enforceRuntimePermission');

        $guard->invoke($controller, [
            'username' => 'admin-user',
            'role' => 'admin',
            'roles' => ['admin'],
        ], [
            'kind' => 'update',
            'domain' => 'quality_management',
            'table' => 'capa_records',
            'tableMeta' => [
                'columns' => [],
                'workflowId' => 'wf_capa',
            ],
        ]);

        $this->addToAssertionCount(1);
    }

    private function controller(): GenericCrudController
    {
        return new GenericCrudController(
            new DataLayer(QMS_TEST_DATA_DIR, QMS_TEST_ROOT_DIR),
            QMS_TEST_ROOT_DIR,
            QMS_TEST_DATA_DIR
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
}
