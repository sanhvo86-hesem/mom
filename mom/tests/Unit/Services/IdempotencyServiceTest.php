<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\CacheService;
use MOM\Api\Services\IdempotencyService;
use MOM\Api\Services\RecordConflictException;
use PHPUnit\Framework\TestCase;

final class IdempotencyServiceTest extends TestCase
{
    private string $tmpDir;

    protected function setUp(): void
    {
        $this->tmpDir = sys_get_temp_dir() . '/mom_idempotency_test_' . bin2hex(random_bytes(4));
        mkdir($this->tmpDir, 0775, true);
    }

    protected function tearDown(): void
    {
        $this->removeDir($this->tmpDir);
    }

    public function testFileFallbackReplaysMatchingRequest(): void
    {
        $service = new IdempotencyService($this->tmpDir, $this->fallbackCache());
        $executions = 0;
        $descriptor = $this->descriptor();

        $first = $service->execute($descriptor, static function () use (&$executions): array {
            $executions++;
            return [
                'status_code' => 201,
                'payload' => ['record' => ['id' => 'SO-001']],
            ];
        });
        $second = $service->execute($descriptor, static function (): array {
            throw new \RuntimeException('Replay should not execute operation.');
        });

        $this->assertSame(1, $executions);
        $this->assertFalse($first['replayed']);
        $this->assertTrue($second['replayed']);
        $this->assertSame('SO-001', $second['payload']['record']['id'] ?? null);
    }

    public function testConflictingFingerprintIsRejected(): void
    {
        $service = new IdempotencyService($this->tmpDir, $this->fallbackCache());
        $descriptor = $this->descriptor();

        $service->execute($descriptor, static fn(): array => [
            'status_code' => 200,
            'payload' => ['ok' => true],
        ]);

        $conflicting = $descriptor;
        $conflicting['fingerprint']['payload']['amount'] = 42;

        $this->expectException(RecordConflictException::class);
        $service->execute($conflicting, static fn(): array => [
            'status_code' => 200,
            'payload' => ['ok' => true],
        ]);
    }

    public function testCachePathReplaysWithoutCreatingLegacyStateStore(): void
    {
        $cache = $this->fallbackCache();
        $this->forceCachePrimaryPath($cache);
        $service = new IdempotencyService($this->tmpDir, $cache);
        $descriptor = $this->descriptor('cache-key-001');
        $executions = 0;

        $first = $service->execute($descriptor, static function () use (&$executions): array {
            $executions++;
            return [
                'status_code' => 200,
                'payload' => ['record' => ['id' => 'CACHE-001']],
            ];
        });
        $second = $service->execute($descriptor, static function (): array {
            throw new \RuntimeException('Cache replay should not execute operation.');
        });

        $this->assertSame(1, $executions);
        $this->assertFalse($first['replayed']);
        $this->assertTrue($second['replayed']);
        $this->assertSame('CACHE-001', $second['payload']['record']['id'] ?? null);
        $this->assertDirectoryDoesNotExist($this->tmpDir . '/idempotency');
    }

    /**
     * @return array<string, mixed>
     */
    private function descriptor(string $key = 'retry-key-001'): array
    {
        return [
            'scope_key' => 'sales|convert_quote|QUOTE-001',
            'key' => $key,
            'key_source' => 'header:Idempotency-Key',
            'mode' => 'client_token',
            'kind' => 'convert',
            'domain' => 'sales',
            'table' => 'sales_orders',
            'user_id' => 'unit-user',
            'ttl_seconds' => 300,
            'fingerprint' => [
                'quote_id' => 'QUOTE-001',
                'payload' => [
                    'customer_po' => 'PO-001',
                ],
            ],
        ];
    }

    private function fallbackCache(): CacheService
    {
        return new CacheService($this->tmpDir, 'mom:idempotency:', [
            'host' => '127.0.0.1',
            'port' => 1,
            'timeout' => 0.1,
        ]);
    }

    private function forceCachePrimaryPath(CacheService $cache): void
    {
        $property = new \ReflectionProperty($cache, 'redisAvailable');
        $property->setValue($cache, true);
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
