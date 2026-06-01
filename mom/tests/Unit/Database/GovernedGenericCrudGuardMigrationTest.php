<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Database;

use PHPUnit\Framework\TestCase;

final class GovernedGenericCrudGuardMigrationTest extends TestCase
{
    public function testMigrationDefinesRegistryDenialEventFunctionAndTriggerRollout(): void
    {
        $path = (string)constant('QMS_TEST_BASE_DIR') . '/database/migrations/254_governed_generic_crud_guard.sql';
        $sql = (string)file_get_contents($path);

        $this->assertStringContainsString('CREATE TABLE IF NOT EXISTS governed_entity_registry', $sql);
        $this->assertStringContainsString('CREATE TABLE IF NOT EXISTS generic_crud_denial_event', $sql);
        $this->assertStringContainsString('CREATE OR REPLACE FUNCTION hesem_governed_generic_crud_guard()', $sql);
        $this->assertStringContainsString("current_setting('hesem.generic_crud_context', TRUE)", $sql);
        $this->assertStringContainsString("current_setting('hesem.generic_crud_break_glass', TRUE)", $sql);
        $this->assertStringContainsString('trg_governed_generic_crud_guard', $sql);
        $this->assertStringContainsString('domain_command_required: Generic CRUD mutation is disabled', $sql);
    }
}
