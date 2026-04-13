<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use PHPUnit\Framework\TestCase;
use ReflectionClass;
use RuntimeException;

require_once QMS_TEST_BASE_DIR . '/api/services/UploadHardeningService.php';

final class UploadHardeningServiceTest extends TestCase
{
    private string $tmpDir;

    protected function setUp(): void
    {
        $this->tmpDir = sys_get_temp_dir() . '/mom_upload_hardening_test_' . bin2hex(random_bytes(4));
        if (!mkdir($this->tmpDir, 0775, true) && !is_dir($this->tmpDir)) {
            throw new RuntimeException('Unable to create temp upload test directory.');
        }
    }

    protected function tearDown(): void
    {
        $this->removeTree($this->tmpDir);
    }

    public function testHealthReportsWritableQuarantineBackend(): void
    {
        $service = new \UploadHardeningService($this->tmpDir);

        $health = $service->getHealth();

        $this->assertTrue($health['ok']);
        $this->assertSame('file_quarantine', $health['backend']);
        $this->assertSame(0, $health['exception_count']);
        $this->assertTrue($health['directories']['quarantine']['exists']);
        $this->assertTrue($health['directories']['quarantine']['writable']);
        $this->assertArrayHasKey('active_write_probe', $health);
        $this->assertTrue($health['active_write_probe']['ok']);
    }

    public function testJsonSidecarWriteFailureIsNotSilentlyIgnored(): void
    {
        $service = new \UploadHardeningService($this->tmpDir);
        $method = (new ReflectionClass($service))->getMethod('writeJsonFile');

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('upload_sidecar_write_failed:rename_failed');

        $method->invoke($service, $this->tmpDir . '/uploads/quarantine', ['status' => 'accepted'], 'upload_sidecar_write_failed');
    }

    public function testExceptionLogWriteFailureIsObservable(): void
    {
        $service = new \UploadHardeningService($this->tmpDir);
        $ref = new ReflectionClass($service);
        $property = $ref->getProperty('exceptionsFile');
        if (PHP_VERSION_ID < 80100) {
            $property->setAccessible(true);
        }
        $property->setValue($service, $this->tmpDir . '/uploads');

        $method = $ref->getMethod('logException');

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('upload_exception_log_write_failed:rename_failed');

        $method->invoke($service, 'blocked_extension', 'blocked', 'qa.user');
    }

    private function removeTree(string $path): void
    {
        if (!is_dir($path)) {
            return;
        }

        $it = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($path, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST,
        );
        foreach ($it as $item) {
            $item->isDir() ? rmdir($item->getPathname()) : unlink($item->getPathname());
        }
        rmdir($path);
    }
}
