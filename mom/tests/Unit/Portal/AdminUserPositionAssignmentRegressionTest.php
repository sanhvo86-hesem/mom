<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Portal;

use PHPUnit\Framework\TestCase;

final class AdminUserPositionAssignmentRegressionTest extends TestCase
{
    private string $portalSource;

    protected function setUp(): void
    {
        $path = dirname(__DIR__, 3) . '/scripts/portal/02-state-auth-ui.js';
        $source = file_get_contents($path);
        self::assertIsString($source);
        $this->portalSource = $source;
    }

    public function testUserModalCollapsesDuplicateRowsByPosition(): void
    {
        self::assertStringContainsString('function userPositionAssignmentRows(user)', $this->portalSource);
        self::assertStringContainsString('const byPosition = {};', $this->portalSource);
        self::assertStringContainsString('compareUserPositionAssignmentRows(normalized, byPosition[positionId]) < 0', $this->portalSource);
        self::assertStringContainsString('Object.keys(byPosition).map(positionId=>byPosition[positionId])', $this->portalSource);
    }

    public function testUserModalStillFiltersSoftEndedAssignments(): void
    {
        self::assertStringContainsString('function isLivePositionAssignmentRow(row, today)', $this->portalSource);
        self::assertStringContainsString("String(row.assignment_status || 'active') !== 'active'", $this->portalSource);
        self::assertStringContainsString('return !effTo || effTo > today;', $this->portalSource);
    }
}
