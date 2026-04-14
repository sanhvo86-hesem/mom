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

    public function testConfiguredLokiIsUnverifiedUntilSuccessfulPush(): void
    {
        $transport = new LogTransport($this->tmpDir, 'http://127.0.0.1:3100', 'test', 10);

        $health = $transport->getHealth();

        $this->assertTrue($health['loki_configured']);
        $this->assertNull($health['loki_available']);
        $this->assertFalse($health['loki_verified']);
        $this->assertSame('unverified', $health['loki_probe_state']);
        $this->assertFalse($health['fallback_active']);
        $this->assertStringContainsString('not yet verified', $health['last_failure_message']);
    }

    public function testFallbackEntryCountOnlyIncludesEncodedLines(): void
    {
        $transport = new LogTransport($this->tmpDir, 'not-a-valid-url', 'test', 10);

        $reflection = new \ReflectionClass($transport);
        $method = $reflection->getMethod('pushToFile');
        if (PHP_VERSION_ID < 80100) {
            $method->setAccessible(true);
        }
        $method->invoke($transport, [
            ['source' => 'unit', 'message' => 'written'],
            ['source' => 'unit', 'message' => "\xB1\x31"],
        ]);

        $health = $transport->getHealth();

        $this->assertSame(1, $health['fallback_write_count']);
        $this->assertSame(1, $health['fallback_entry_count']);
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
