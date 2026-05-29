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
    protected function setUp(): void
    {
        $GLOBALS['RUNTIME_DATA_LAYER_OVERRIDE_FILE'] = (string) constant('QMS_TEST_DATA_DIR') . '/config/runtime_data_layer_override.test.json';
    }

    protected function tearDown(): void
    {
        putenv('HESEM_ALLOW_GOVERNED_GENERIC_MUTATION');
        $_SERVER = [];
    }

    public function testGovernedGenericMutationRequiresDomainCommandEvenForAdmin(): void
    {
        $controller = $this->controller();

        try {
            $this->enforceRuntimePermission($controller, [
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

        $this->enforceRuntimePermission($controller, [
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

    public function testDefaultAuthenticatedFallbackReadIsDeniedForSensitiveDomainWhenPermissionMatrixIsMissing(): void
    {
        $controller = $this->controller();

        try {
            $this->enforceRuntimePermission($controller, [
                'username' => 'fallback-user',
                'role' => 'unmapped_reader',
                'roles' => ['unmapped_reader'],
            ], [
                'kind' => 'list',
                'domain' => 'hcm_workforce',
                'table' => 'hcm_payroll_runs',
                'tableMeta' => [
                    'columns' => [
                        'run_id' => [],
                        'org_site_id' => [],
                        'status' => [],
                    ],
                    'statusColumn' => 'status',
                ],
            ]);
            $this->fail('Sensitive default-authenticated runtime read was not denied.');
        } catch (ExitException $e) {
            $this->assertSame(403, $e->getStatusCode());
            $this->assertSame('forbidden', $e->getPayload()['error'] ?? null);
            $this->assertSame('default_authenticated_read_denied', $e->getPayload()['policy'] ?? null);
        }
    }

    public function testDefaultAuthenticatedFallbackReadCanRemainAllowedForNonSensitiveScopedRead(): void
    {
        $controller = $this->controller();

        $this->enforceRuntimePermission($controller, [
            'username' => 'fallback-user',
            'role' => 'document_control',
            'roles' => ['document_control'],
        ], [
            'kind' => 'list',
            'domain' => 'sandbox_demo',
            'table' => 'portal_announcements',
            'tableMeta' => [
                'columns' => [
                    'announcement_id' => [],
                    'org_site_id' => [],
                ],
            ],
        ]);

        $this->addToAssertionCount(1);
    }

    public function testKpiDefinitionsMutationsRequireGovernedKpiAuthorityPath(): void
    {
        $controller = $this->controller();

        foreach (['create', 'update', 'delete'] as $kind) {
            try {
                $this->enforceRuntimePermission($controller, [
                    'username' => 'ceo-user',
                    'role' => 'ceo',
                    'roles' => ['ceo'],
                ], [
                    'kind' => $kind,
                    'domain' => 'bi_datawarehouse',
                    'table' => 'kpi_definitions',
                    'tableMeta' => [
                        'columns' => [],
                    ],
                ]);
                $this->fail("kpi_definitions {$kind} did not require governed KPI authority.");
            } catch (ExitException $e) {
                $this->assertSame(409, $e->getStatusCode());
                $this->assertSame('domain_command_required', $e->getPayload()['error'] ?? null);
                $this->assertSame('kpi_definitions', $e->getPayload()['table'] ?? null);
            }
        }
    }

    public function testGovernedGenericMutationOverrideRequiresBreakGlassManifestAndCommandHeaders(): void
    {
        putenv('HESEM_ALLOW_GOVERNED_GENERIC_MUTATION=break_glass_for_migration_only');
        $_SERVER['HTTP_X_HESEM_INTERNAL_GENERIC_OVERRIDE'] = 'domain-command-backfill';
        $_SERVER['HTTP_X_HESEM_RELEASE_MANIFEST'] = 'REL-2026-001';
        $_SERVER['HTTP_X_HESEM_COMMAND_ID'] = '00000000-0000-0000-0000-000000000001';

        $controller = $this->controller();

        $this->enforceRuntimePermission($controller, [
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

    public function testGovernedEntityRegistryTablesRequireCommandBoundary(): void
    {
        $controller = $this->controller();

        $cases = [
            ['update', 'master_data', 'uom_conversion_authority', 'MDA-FOUNDATION-MEASUREMENT'],
            ['update', 'master_data', 'item_revisions', 'MDA-ITEM-REVISION-SPEC'],
            ['transition', 'production', 'work_order', 'MDA-COMMERCIAL-EXECUTION'],
            ['delete', 'quality_management', 'quality_holds', 'MDA-QUALITY-CASE'],
            ['update', 'inventory', 'inventory_balance_snapshot', 'MDA-INVENTORY-TRACE-COST'],
            ['update', 'record_system', 'electronic_signatures', 'MDA-WORKFLOW-AUDIT-EVIDENCE'],
        ];

        foreach ($cases as [$kind, $domain, $table, $rootCode]) {
            try {
                $this->enforceRuntimePermission($controller, [
                    'username' => 'admin-user',
                    'role' => 'admin',
                    'roles' => ['admin'],
                ], [
                    'kind' => $kind,
                    'domain' => $domain,
                    'table' => $table,
                    'tableMeta' => [
                        'columns' => [],
                    ],
                ]);
                $this->fail("{$table} {$kind} was not blocked by the governed entity registry.");
            } catch (ExitException $e) {
                $this->assertSame(409, $e->getStatusCode());
                $this->assertSame('domain_command_required', $e->getPayload()['error'] ?? null);
                $this->assertSame('governed_entity_registry', $e->getPayload()['boundary_source'] ?? null);
                $this->assertSame($rootCode, $e->getPayload()['root_code'] ?? null);
            }
        }
    }

    public function testGovernedGenericMutationOverrideRequiresInternalOverrideHeader(): void
    {
        putenv('HESEM_ALLOW_GOVERNED_GENERIC_MUTATION=break_glass_for_migration_only');
        $_SERVER['HTTP_X_HESEM_RELEASE_MANIFEST'] = 'REL-2026-001';
        $_SERVER['HTTP_X_HESEM_COMMAND_ID'] = '00000000-0000-0000-0000-000000000001';

        $controller = $this->controller();

        try {
            $this->enforceRuntimePermission($controller, [
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
            $this->fail('Break-glass mutation bypassed the internal override header.');
        } catch (ExitException $e) {
            $this->assertSame(409, $e->getStatusCode());
            $this->assertSame('domain_command_required', $e->getPayload()['error'] ?? null);
        }
    }

    private function controller(): GenericCrudController
    {
        $dataDir = (string) constant('QMS_TEST_DATA_DIR');
        $rootDir = (string) constant('QMS_TEST_ROOT_DIR');

        return new GenericCrudController(
            new DataLayer($dataDir, $rootDir),
            $rootDir,
            $dataDir
        );
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $ctx
     * @throws ExitException
     */
    private function enforceRuntimePermission(GenericCrudController $controller, array $user, array $ctx): void
    {
        $this->method($controller, 'enforceRuntimePermission')->invoke($controller, $user, $ctx);
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
