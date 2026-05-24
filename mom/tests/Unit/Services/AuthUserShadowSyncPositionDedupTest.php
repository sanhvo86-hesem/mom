<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use PHPUnit\Framework\TestCase;

final class AuthUserShadowSyncPositionDedupTest extends TestCase
{
    private string $serviceSource;

    protected function setUp(): void
    {
        $path = dirname(__DIR__, 3) . '/api/services/AuthUserShadowSyncService.php';
        $source = file_get_contents($path);
        self::assertIsString($source);
        $this->serviceSource = $source;
    }

    public function testAuthJsonSyncEndsDuplicateLiveAssignmentsForSamePosition(): void
    {
        self::assertStringContainsString('endDuplicateActivePositionAssignments(', $this->serviceSource);
        self::assertStringContainsString('auth_shadow_sync_duplicate_position', $this->serviceSource);
        self::assertStringContainsString('AND hcm_position_id = :position_id', $this->serviceSource);
        self::assertStringContainsString('AND (effective_to IS NULL OR effective_to > CURRENT_DATE)', $this->serviceSource);
        self::assertStringContainsString('AND NOT (', $this->serviceSource);
        self::assertStringContainsString('source_record_id IS NOT DISTINCT FROM :source_record_id', $this->serviceSource);
    }
}
