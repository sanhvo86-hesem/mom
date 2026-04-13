<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\CacheService;
use MOM\Services\CircuitBreaker;
use PHPUnit\Framework\TestCase;

final class CircuitBreakerTest extends TestCase
{
    private string $tmpDir;

    protected function setUp(): void
    {
        $this->tmpDir = sys_get_temp_dir() . '/mom_circuit_breaker_test_' . bin2hex(random_bytes(4));
        mkdir($this->tmpDir, 0775, true);
    }

    protected function tearDown(): void
    {
        $this->removeDir($this->tmpDir);
    }

    public function testInjectedCachePersistsOpenStateAcrossInstances(): void
    {
        $cache = $this->fallbackCache();
        $breaker = new CircuitBreaker($this->tmpDir . '/state', 'supplier_api', 2, 60, 1, $cache);

        $breaker->recordFailure();
        $breaker->recordFailure();

        $this->assertFalse($breaker->allowRequest());
        $this->assertSame('open', $breaker->getStatus()['state']);

        $freshBreaker = new CircuitBreaker($this->tmpDir . '/state', 'supplier_api', 2, 60, 1, $this->fallbackCache());

        $this->assertFalse($freshBreaker->allowRequest());
        $this->assertSame('open', $freshBreaker->getStatus()['state']);
    }

    public function testRecoveryTimeoutMovesToHalfOpenAndSuccessClosesCircuit(): void
    {
        $breaker = new CircuitBreaker($this->tmpDir . '/state', 'epicor', 1, 0, 1);

        $breaker->recordFailure();

        $this->assertTrue($breaker->allowRequest());
        $this->assertSame('half_open', $breaker->getStatus()['state']);

        $breaker->recordSuccess();

        $status = $breaker->getStatus();
        $this->assertSame('closed', $status['state']);
        $this->assertSame(0, $status['failure_count']);
    }

    private function fallbackCache(): CacheService
    {
        return new CacheService($this->tmpDir, 'mom:circuitbreaker:', [
            'host' => '127.0.0.1',
            'port' => 1,
            'timeout' => 0.1,
        ]);
    }

    private function removeDir(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }
        $items = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($dir, \RecursiveDirectoryIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST
        );
        foreach ($items as $item) {
            $item->isDir() ? rmdir($item->getPathname()) : unlink($item->getPathname());
        }
        rmdir($dir);
    }
}
