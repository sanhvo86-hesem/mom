<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Database;

use PHPUnit\Framework\TestCase;

final class MdaRuntimeAuthorityNoP0P1GuardMigrationTest extends TestCase
{
    public function testMigrationDefinesUniversalDomainCommandGuardAndServerEvidenceStores(): void
    {
        $path = (string)constant('QMS_TEST_BASE_DIR') . '/database/migrations/286_mda_runtime_authority_no_p0p1_guard.sql';
        $sql = (string)file_get_contents($path);

        $this->assertStringContainsString('CREATE TABLE IF NOT EXISTS domain_command_sod_exception', $sql);
        $this->assertStringContainsString('CREATE TABLE IF NOT EXISTS domain_command_reauth_challenge', $sql);
        $this->assertStringContainsString('CREATE TABLE IF NOT EXISTS domain_command_break_glass_grant', $sql);
        $this->assertStringContainsString("current_setting('hesem.domain_command_context', TRUE)", $sql);
        $this->assertStringContainsString("current_setting('hesem.domain_command_name', TRUE)", $sql);
        $this->assertStringContainsString("current_setting('hesem.domain_command_id', TRUE)", $sql);
        $this->assertStringContainsString("v_generic_context <> '1'", $sql);
        $this->assertStringContainsString('domain_command_required: governed table', $sql);
        $this->assertStringContainsString('trg_governed_generic_crud_guard', $sql);
    }

    public function testRuntimeEvidenceStoresAreInDataSchemaAuthorityRegistry(): void
    {
        $path = (string)constant('QMS_TEST_DATA_DIR') . '/registry/table-registry.json';
        $registry = json_decode((string)file_get_contents($path), true);
        $this->assertIsArray($registry);

        $tables = (array)($registry['tables'] ?? []);
        foreach ([
            'domain_command_sod_exception',
            'domain_command_reauth_challenge',
            'domain_command_break_glass_grant',
        ] as $tableName) {
            $this->assertArrayHasKey($tableName, $tables);
            $this->assertSame(
                '286_mda_runtime_authority_no_p0p1_guard.sql',
                (string)($tables[$tableName]['migration'] ?? '')
            );
            $this->assertSame('master_data_governance', (string)($tables[$tableName]['domain'] ?? ''));
        }
    }
}
