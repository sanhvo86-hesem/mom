<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Database;

use PHPUnit\Framework\TestCase;

final class RuntimeRequirementResolverMigrationTest extends TestCase
{
    private string $sql;

    protected function setUp(): void
    {
        $path = dirname(__DIR__, 3) . '/database/migrations/273_runtime_requirement_resolver.sql';
        $this->sql = (string)file_get_contents($path);
    }

    public function testPolicyAndSnapshotTablesExist(): void
    {
        $this->assertStringContainsString('CREATE TABLE IF NOT EXISTS runtime_requirement_policy', $this->sql);
        $this->assertStringContainsString('CREATE TABLE IF NOT EXISTS runtime_requirement_snapshot', $this->sql);
    }

    public function testPolicyCapturesFailClosedAuthorityInputs(): void
    {
        $this->assertStringContainsString('match_criteria JSONB', $this->sql);
        $this->assertStringContainsString('source_authority VARCHAR', $this->sql);
        $this->assertStringContainsString('evidence_class VARCHAR', $this->sql);
        $this->assertStringContainsString('precedence INTEGER', $this->sql);
    }

    public function testSnapshotStoresHashAndBlockers(): void
    {
        $this->assertStringContainsString('requirements_snapshot_hash CHAR(64)', $this->sql);
        $this->assertStringContainsString('blockers JSONB', $this->sql);
        $this->assertStringContainsString('uq_runtime_req_snapshot_hash', $this->sql);
    }
}
