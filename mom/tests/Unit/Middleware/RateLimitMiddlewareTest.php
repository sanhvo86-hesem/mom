<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Middleware;

use MOM\Api\Controllers\ExitException;
use MOM\Api\Middleware\RateLimitMiddleware;
use MOM\Api\Services\CacheService;
use PHPUnit\Framework\TestCase;

final class RateLimitMiddlewareTest extends TestCase
{
    private string $tmpDir;

    protected function setUp(): void
    {
        $this->tmpDir = sys_get_temp_dir() . '/mom_rate_limit_test_' . bin2hex(random_bytes(4));
        mkdir($this->tmpDir, 0775, true);
        $_SESSION = [];
        $_SERVER['REMOTE_ADDR'] = '203.0.113.10';
    }

    protected function tearDown(): void
    {
        $_SESSION = [];
        unset($_SERVER['REMOTE_ADDR']);
        $this->removeDir($this->tmpDir);
    }

    public function testInjectedCacheEnforcesLimitWithFileFallback(): void
    {
        $cache = new CacheService($this->tmpDir, 'mom:ratelimit:', [
            'host' => '127.0.0.1',
            'port' => 1,
            'timeout' => 0.1,
        ]);
        $middleware = new RateLimitMiddleware($this->tmpDir . '/ratelimit', 1, 60, [], $cache);

        $middleware->check('unit_action');

        try {
            $middleware->check('unit_action');
            $this->fail('Second request should be rate limited.');
        } catch (ExitException $e) {
            $this->assertSame(429, $e->getStatusCode());
            $this->assertSame('rate_limited', $e->getPayload()['error'] ?? null);
        }
    }

    public function testLegacyFileStoreStillEnforcesLimitWithoutCache(): void
    {
        $middleware = new RateLimitMiddleware($this->tmpDir . '/ratelimit', 1, 60);

        $middleware->check('unit_file_action');

        try {
            $middleware->check('unit_file_action');
            $this->fail('Second request should be rate limited.');
        } catch (ExitException $e) {
            $this->assertSame(429, $e->getStatusCode());
            $this->assertSame('rate_limited', $e->getPayload()['error'] ?? null);
        }
    }

    public function testInternalVpsAuthActionsBypassLimiter(): void
    {
        $middleware = new RateLimitMiddleware($this->tmpDir . '/ratelimit', 1, 60);

        $middleware->check('vps_observability_auth');
        $middleware->check('vps_observability_auth');
        $middleware->check('vps_terminal_auth');
        $middleware->check('vps_terminal_auth');

        $this->assertTrue(true);
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
