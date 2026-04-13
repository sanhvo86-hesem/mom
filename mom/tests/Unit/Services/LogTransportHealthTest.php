<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\LogTransport;
use PHPUnit\Framework\TestCase;

final class LogTransportHealthTest extends TestCase
{
    private string $tmpDir;

    protected function setUp(): void
    {
        $this->tmpDir = sys_get_temp_dir() . '/mom_log_transport_test_' . bin2hex(random_bytes(4));
        mkdir($this->tmpDir, 0775, true);
    }

    protected function tearDown(): void
    {
        $this->removeDir($this->tmpDir);
    }

    public function testFallbackWritesAreVisibleInHealthProbe(): void
    {
        $transport = new LogTransport($this->tmpDir, 'not-a-valid-url', 'test', 1);
        $transport->error('simulated failure path', ['request_id' => 'REQ-LOG']);
        $transport->flush();

        $health = $transport->getHealth();

        $this->assertFalse($health['loki_available']);
        $this->assertTrue($health['fallback_active']);
        $this->assertSame(1, $health['fallback_write_count']);
        $this->assertSame(1, $health['fallback_entry_count']);
        $this->assertGreaterThanOrEqual(1, $health['fallback_file_count']);
        $this->assertGreaterThan(0, $health['fallback_bytes']);
        $this->assertNotSame('', $health['last_failure_at']);
        $this->assertStringContainsString('Invalid LOKI_URL', $health['last_failure_message']);
    }

    private function removeDir(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }
        $items = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($dir, \RecursiveDirectoryIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST,
        );
        foreach ($items as $item) {
            $item->isDir() ? rmdir($item->getPathname()) : unlink($item->getPathname());
        }
        rmdir($dir);
    }
}
