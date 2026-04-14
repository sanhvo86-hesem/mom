<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\CacheService;
use PHPUnit\Framework\TestCase;

final class CacheServiceFallbackHealthTest extends TestCase
{
    private string $tmpPath;

    protected function tearDown(): void
    {
        if (isset($this->tmpPath) && is_file($this->tmpPath)) {
            unlink($this->tmpPath);
        }
    }

    public function testFileFallbackHealthReportsUnwritableCacheDirectory(): void
    {
        $this->tmpPath = tempnam(sys_get_temp_dir(), 'mom-cache-health-');
        $this->assertIsString($this->tmpPath);

        $cache = new CacheService($this->tmpPath, 'mom:test:', [
            'host' => '127.0.0.1',
            'port' => 1,
            'timeout' => 0.1,
        ]);

        $health = $cache->getHealth();

        $this->assertSame('file', $health['fallback_mode']);
        $this->assertFalse($health['file_cache_dir_exists']);
        $this->assertFalse($health['file_cache_writable']);
    }
}
