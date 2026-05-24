<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Database;

use PHPUnit\Framework\TestCase;

final class PositionAssignmentUniquenessMigrationTest extends TestCase
{
    private string $migrationSql;

    protected function setUp(): void
    {
        $path = dirname(__DIR__, 3) . '/database/migrations/197_enforce_unique_live_position_assignment.sql';
        $sql = file_get_contents($path);
        self::assertIsString($sql);
        $this->migrationSql = $sql;
    }

    public function testDataHealRanksDuplicateLiveRowsByEmployeeAndPosition(): void
    {
        self::assertStringContainsString('PARTITION BY employee_id, hcm_position_id', $this->migrationSql);
        self::assertStringContainsString("assignment_status = 'active'", $this->migrationSql);
        self::assertStringContainsString('effective_to IS NULL OR effective_to > CURRENT_DATE', $this->migrationSql);
        self::assertStringContainsString("'ended_by', 'migration_197_duplicate_live_position'", $this->migrationSql);
    }

    public function testOpenEndedUniqueIndexCoversTheCommonDuplicateCase(): void
    {
        self::assertStringContainsString('uq_hcm_emp_pos_assign_one_open_live_position', $this->migrationSql);
        self::assertStringContainsString('ON hcm_employee_position_assignments (employee_id, hcm_position_id)', $this->migrationSql);
        self::assertStringContainsString('AND effective_to IS NULL', $this->migrationSql);
    }

    public function testTriggerBlocksSecondaryDuplicateWhenPrimaryExists(): void
    {
        self::assertStringContainsString('fn_hcm_emp_pos_assign_unique_live_position', $this->migrationSql);
        self::assertStringContainsString('existing_primary_id IS NOT NULL', $this->migrationSql);
        self::assertStringContainsString('duplicate_active_position_assignment', $this->migrationSql);
        self::assertStringContainsString("'ended_by', 'trg_unique_live_position'", $this->migrationSql);
        self::assertStringContainsString('source_record_id IS NOT DISTINCT FROM NEW.source_record_id', $this->migrationSql);
    }
}
