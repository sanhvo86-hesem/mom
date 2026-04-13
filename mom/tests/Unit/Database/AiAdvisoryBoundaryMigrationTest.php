<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Database;

use PHPUnit\Framework\TestCase;

final class AiAdvisoryBoundaryMigrationTest extends TestCase
{
    private string $migrationSql;

    protected function setUp(): void
    {
        $path = dirname(__DIR__, 3) . '/database/migrations/110_ai_advisory_boundary_comments.sql';
        $sql = file_get_contents($path);
        $this->assertIsString($sql);
        $this->migrationSql = $sql;
    }

    public function testRecommendationActionCommentsPreserveAdvisoryBoundary(): void
    {
        $this->assertStringContainsString('Advisory recommendation records created from AI predictions', $this->migrationSql);
        $this->assertStringContainsString('not execution authority', $this->migrationSql);
        $this->assertStringContainsString('advisory_only=true', $this->migrationSql);
        $this->assertStringContainsString('execution_authority=false', $this->migrationSql);
        $this->assertStringContainsString('requires_human_approval=true', $this->migrationSql);
        $this->assertStringContainsString('pending_human_review_only', $this->migrationSql);
    }
}
