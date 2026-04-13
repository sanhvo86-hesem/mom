<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Database;

use PHPUnit\Framework\TestCase;

if (!defined('QMS_TEST_BASE_DIR')) {
    define('QMS_TEST_BASE_DIR', dirname(__DIR__, 3));
}

final class MobileInspectionBridgeMigrationTest extends TestCase
{
    public function testMobileInspectionBridgeAddsReplayAndThreadIndexes(): void
    {
        $sql = (string)file_get_contents(QMS_TEST_BASE_DIR . '/database/migrations/108_mobile_inspection_execution_bridge.sql');

        $this->assertStringContainsString('ADD COLUMN IF NOT EXISTS client_capture_id', $sql);
        $this->assertStringContainsString('ADD COLUMN IF NOT EXISTS idempotency_key', $sql);
        $this->assertStringContainsString('ADD COLUMN IF NOT EXISTS inspection_fingerprint', $sql);
        $this->assertStringContainsString('uq_mobile_insp_idempotency', $sql);
        $this->assertStringContainsString("'blocking_reason_codes'", $sql);
    }
}
