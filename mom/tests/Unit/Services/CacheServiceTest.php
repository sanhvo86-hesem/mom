<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\CacheService;
use PHPUnit\Framework\TestCase;

/**
 * Unit tests for CacheService.
 * Tests file-based fallback mode (Redis not required).
 */
class CacheServiceTest extends TestCase
{
    private string $tmpDir;
    private CacheService $cache;

    protected function setUp(): void
    {
        $this->tmpDir = sys_get_temp_dir() . '/mom_cache_test_' . bin2hex(random_bytes(4));
        mkdir($this->tmpDir, 0775, true);

        // Force file-based mode by using unreachable Redis
        $this->cache = new CacheService($this->tmpDir, 'test:', [
            'host' => '127.0.0.1',
            'port' => 1, // Unreachable port
            'timeout' => 0.1,
        ]);
    }

    protected function tearDown(): void
    {
        $this->removeDir($this->tmpDir);
    }

    public function testSetAndGet(): void
    {
        $this->cache->set('foo', ['bar' => 'baz']);
        $result = $this->cache->get('foo');

        $this->assertIsArray($result);
        $this->assertSame('baz', $result['bar']);
    }

    public function testGetReturnNullOnMiss(): void
    {
        $result = $this->cache->get('nonexistent');
        $this->assertNull($result);
    }

    public function testDelete(): void
    {
        $this->cache->set('to_delete', 'value');
        $this->assertNotNull($this->cache->get('to_delete'));

        $this->cache->delete('to_delete');
        $this->assertNull($this->cache->get('to_delete'));
    }

    public function testTtlExpiration(): void
    {
        $this->cache->set('expires', 'value', 1);

        // Should exist immediately
        $this->assertSame('value', $this->cache->get('expires'));

        // L1 cache holds value; clear it
        sleep(2);

        // Force re-read from file
        $freshCache = new CacheService($this->tmpDir, 'test:', [
            'host' => '127.0.0.1', 'port' => 1, 'timeout' => 0.1,
        ]);
        $this->assertNull($freshCache->get('expires'));
    }

    public function testIncrement(): void
    {
        $val1 = $this->cache->increment('counter', 1);
        $this->assertSame(1, $val1);

        $val2 = $this->cache->increment('counter', 5);
        $this->assertSame(6, $val2);
    }

    public function testSetNx(): void
    {
        $first = $this->cache->setNx('unique', 'first_value');
        $this->assertTrue($first);

        $second = $this->cache->setNx('unique', 'second_value');
        $this->assertFalse($second);

        $this->assertSame('first_value', $this->cache->get('unique'));
    }

    public function testScalarValues(): void
    {
        $this->cache->set('string', 'hello');
        $this->assertSame('hello', $this->cache->get('string'));

        $this->cache->set('int', 42);
        $this->assertSame(42, $this->cache->get('int'));

        $this->cache->set('bool', true);
        $this->assertTrue($this->cache->get('bool'));

        $this->cache->set('null_val', null);
        $this->assertNull($this->cache->get('null_val'));
    }

    public function testRedisNotAvailable(): void
    {
        $this->assertFalse($this->cache->isRedisAvailable());
    }

    public function testHealthReportsFallbackMode(): void
    {
        $health = $this->cache->getHealth();
        $this->assertFalse($health['redis_available']);
        $this->assertSame('file', $health['fallback_mode']);
    }

    private function removeDir(string $dir): void
    {
        if (!is_dir($dir)) return;
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
