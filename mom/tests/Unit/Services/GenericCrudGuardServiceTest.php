<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\GenericCrudGuardService;
use MOM\Api\Services\GenericCrudMutationDeniedException;
use PHPUnit\Framework\TestCase;

final class GenericCrudGuardServiceTest extends TestCase
{
    private string $dataDir;

    protected function setUp(): void
    {
        $this->dataDir = sys_get_temp_dir() . '/mom-generic-crud-guard-' . bin2hex(random_bytes(6));
        mkdir($this->dataDir . '/registry', 0775, true);
        copy(
            (string)constant('QMS_TEST_BASE_DIR') . '/data/registry/governed-entity-registry.json',
            $this->dataDir . '/registry/governed-entity-registry.json'
        );
    }

    protected function tearDown(): void
    {
        putenv('HESEM_ALLOW_GOVERNED_GENERIC_MUTATION');
        $_SERVER = [];
        $this->deleteTree($this->dataDir);
    }

    public function testGovernedTableMutationRequiresDomainCommand(): void
    {
        $decision = $this->guard()->evaluate('sales', 'sales_orders', 'update', [
            'table_known' => true,
            'source' => 'unit_test',
        ]);

        $this->assertFalse($decision['allowed']);
        $this->assertSame('domain_command_required', $decision['code']);
        $this->assertSame('sales_order', $decision['governed_root']);
        $this->assertContains('ReleaseSalesOrderCommand', $decision['allowed_commands']);
    }

    public function testAssertMutationAllowedThrowsProblemDetailsException(): void
    {
        $this->expectException(GenericCrudMutationDeniedException::class);

        try {
            $this->guard()->assertMutationAllowed('quality_management', 'capa_records', 'delete', [
                'table_known' => true,
                'source' => 'unit_test',
            ]);
        } catch (GenericCrudMutationDeniedException $e) {
            $problem = $e->problemDetails();
            $this->assertSame('https://hesemeng.com/problems/domain-command-required', $problem['type']);
            $this->assertSame(409, $problem['status']);
            $this->assertSame('capa_records', $problem['table']);
            throw $e;
        }
    }

    public function testGovernedReadRemainsAllowed(): void
    {
        $decision = $this->guard()->evaluate('sales', 'sales_orders', 'list', [
            'table_known' => true,
        ]);

        $this->assertTrue($decision['allowed']);
        $this->assertSame('read_allowed', $decision['allowed_by']);
    }

    public function testProjectionMutationsAreReadOnlyButProjectionReadIsAllowed(): void
    {
        $guard = $this->guard();

        $writeDecision = $guard->evaluate('analytics', 'mda_runtime_authority_projection', 'update', [
            'table_known' => true,
        ]);
        $readDecision = $guard->evaluate('analytics', 'mda_runtime_authority_projection', 'detail', [
            'table_known' => true,
        ]);

        $this->assertFalse($writeDecision['allowed']);
        $this->assertSame('projection_read_only', $writeDecision['code']);
        $this->assertTrue($readDecision['allowed']);
    }

    public function testImportStagingWriteIsAllowedOnlyWithStagingContext(): void
    {
        $guard = $this->guard();

        $denied = $guard->evaluate('master_data', 'mda_import_staging_records', 'create', [
            'table_known' => true,
        ]);
        $allowed = $guard->evaluate('master_data', 'mda_import_staging_records', 'create', [
            'table_known' => true,
            'import_staging' => true,
        ]);

        $this->assertFalse($denied['allowed']);
        $this->assertSame('import_staging_context_required', $denied['code']);
        $this->assertTrue($allowed['allowed']);
        $this->assertSame('import_staging_allowed', $allowed['allowed_by']);
    }

    public function testUnknownTableMutationIsDeniedByDefault(): void
    {
        $decision = $this->guard()->evaluate('unknown_domain', 'unknown_runtime_table', 'create', [
            'table_known' => false,
        ]);

        $this->assertFalse($decision['allowed']);
        $this->assertSame('unknown_table_mutation_denied', $decision['code']);
    }

    public function testBreakGlassRequiresManifestCommandHeaderAndAdminRole(): void
    {
        putenv('HESEM_ALLOW_GOVERNED_GENERIC_MUTATION=break_glass_for_migration_only');
        $_SERVER['HTTP_X_HESEM_INTERNAL_GENERIC_OVERRIDE'] = 'domain-command-backfill';
        $_SERVER['HTTP_X_HESEM_RELEASE_MANIFEST'] = 'REL-2026-001';
        $_SERVER['HTTP_X_HESEM_COMMAND_ID'] = '00000000-0000-0000-0000-000000000001';

        $decision = $this->guard()->evaluate('quality_management', 'capa_records', 'update', [
            'table_known' => true,
            'user_roles' => ['admin'],
        ]);

        $this->assertTrue($decision['allowed']);
        $this->assertSame('migration_break_glass', $decision['allowed_by']);
    }

    public function testDeniedMutationTelemetryIsWrittenAsJsonl(): void
    {
        $guard = $this->guard();
        $decision = $guard->evaluate('inventory', 'inventory_ledger', 'update', [
            'table_known' => true,
        ]);

        $guard->recordDeniedMutation($decision, [
            'source' => 'unit_test',
            'user_id' => 'tester',
            'correlation_id' => 'corr-1',
        ]);

        $path = $this->dataDir . '/logs/generic-crud-denials.jsonl';
        $this->assertFileExists($path);
        $payload = json_decode(trim((string)file_get_contents($path)), true);
        $this->assertIsArray($payload);
        $this->assertSame('generic_crud_mutation_denied', $payload['event_type']);
        $this->assertSame('inventory_ledger', $payload['table']);
        $this->assertSame('tester', $payload['actor']);
    }

    private function guard(): GenericCrudGuardService
    {
        return new GenericCrudGuardService($this->dataDir);
    }

    private function deleteTree(string $path): void
    {
        if (!is_dir($path)) {
            return;
        }

        $items = scandir($path);
        foreach ($items === false ? [] : $items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            $child = $path . '/' . $item;
            if (is_dir($child)) {
                $this->deleteTree($child);
                continue;
            }
            @unlink($child);
        }
        @rmdir($path);
    }
}
