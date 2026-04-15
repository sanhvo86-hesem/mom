<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Middleware;

use MOM\Api\Middleware\AuditMiddleware;
use PHPUnit\Framework\TestCase;

final class AuditMiddlewareFallbackHealthTest extends TestCase
{
    private string $tmpDir;

    protected function setUp(): void
    {
        $this->tmpDir = sys_get_temp_dir() . '/mom_audit_middleware_test_' . bin2hex(random_bytes(4));
        mkdir($this->tmpDir, 0775, true);
        AuditMiddleware::resetLegacySinkHealthForTests();
    }

    protected function tearDown(): void
    {
        $this->removeDir($this->tmpDir);
    }

    public function testLegacyAuditWriteFailureIsSurfacedInHealth(): void
    {
        $before = AuditMiddleware::legacySinkHealth();
        $middleware = new AuditMiddleware($this->tmpDir, enabled: true);

        $middleware->writeEntry([
            'action' => 'scope_audit',
            'uri' => '/api.php?action=scope_audit',
            'timestamp' => gmdate('c'),
        ]);

        $after = AuditMiddleware::legacySinkHealth();
        $this->assertGreaterThan((int)$before['write_failure_count'], (int)$after['write_failure_count']);
        $this->assertNotEmpty($after['last_write_failure_at']);
    }

    private function removeDir(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }
        $items = scandir($dir);
        if ($items === false) {
            return;
        }
        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            $path = $dir . DIRECTORY_SEPARATOR . $item;
            is_dir($path) ? $this->removeDir($path) : unlink($path);
        }
        rmdir($dir);
    }
}
