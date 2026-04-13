<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Controllers;

use MOM\Api\Controllers\DispatchController;
use MOM\Database\DataLayer;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;

final class DispatchControllerExecutionStateLockTest extends TestCase
{
    private string $tmpDir;

    protected function setUp(): void
    {
        $this->tmpDir = sys_get_temp_dir() . '/mom_dispatch_lock_test_' . bin2hex(random_bytes(4));
        mkdir($this->tmpDir, 0775, true);
    }

    protected function tearDown(): void
    {
        $this->removeDir($this->tmpDir);
    }

    public function testExecutionStateLockExcludesConcurrentWriterUntilReleased(): void
    {
        $rootDir = dirname(__DIR__, 4);
        $controller = new DispatchController(
            new DataLayer($this->tmpDir, $rootDir, ['use_postgres' => false]),
            $rootDir,
            $this->tmpDir,
        );
        $acquire = $this->method($controller, 'acquireExecutionStateLock');
        $release = $this->method($controller, 'releaseExecutionStateLock');
        $lockHandle = null;
        $competingHandle = null;

        try {
            $lockHandle = $acquire->invoke($controller);
            $this->assertTrue(is_resource($lockHandle));

            $lockPath = $this->tmpDir . '/dispatch/dispatch_state.lock';
            $this->assertFileExists($lockPath);

            $competingHandle = fopen($lockPath, 'c');
            $this->assertTrue(is_resource($competingHandle));
            $this->assertFalse(flock($competingHandle, LOCK_EX | LOCK_NB));

            $release->invoke($controller, $lockHandle);
            $lockHandle = null;

            $this->assertTrue(flock($competingHandle, LOCK_EX | LOCK_NB));
        } finally {
            if (is_resource($competingHandle)) {
                @flock($competingHandle, LOCK_UN);
                @fclose($competingHandle);
            }
            if (is_resource($lockHandle)) {
                $release->invoke($controller, $lockHandle);
            }
        }
    }

    public function testSharedExecutionStateLockAllowsReadersButBlocksWriters(): void
    {
        $rootDir = dirname(__DIR__, 4);
        $controller = new DispatchController(
            new DataLayer($this->tmpDir, $rootDir, ['use_postgres' => false]),
            $rootDir,
            $this->tmpDir,
        );
        $acquire = $this->method($controller, 'acquireExecutionStateLock');
        $release = $this->method($controller, 'releaseExecutionStateLock');
        $lockHandle = null;
        $readerHandle = null;
        $writerHandle = null;

        try {
            $lockHandle = $acquire->invoke($controller, LOCK_SH);
            $this->assertTrue(is_resource($lockHandle));

            $lockPath = $this->tmpDir . '/dispatch/dispatch_state.lock';
            $readerHandle = fopen($lockPath, 'c');
            $this->assertTrue(is_resource($readerHandle));
            $this->assertTrue(flock($readerHandle, LOCK_SH | LOCK_NB));
            @flock($readerHandle, LOCK_UN);

            $writerHandle = fopen($lockPath, 'c');
            $this->assertTrue(is_resource($writerHandle));
            $this->assertFalse(flock($writerHandle, LOCK_EX | LOCK_NB));
        } finally {
            if (is_resource($writerHandle)) {
                @flock($writerHandle, LOCK_UN);
                @fclose($writerHandle);
            }
            if (is_resource($readerHandle)) {
                @flock($readerHandle, LOCK_UN);
                @fclose($readerHandle);
            }
            if (is_resource($lockHandle)) {
                $release->invoke($controller, $lockHandle);
            }
        }
    }

    private function method(object $target, string $name): ReflectionMethod
    {
        $method = new ReflectionMethod($target, $name);
        if (PHP_VERSION_ID < 80100) {
            $method->setAccessible(true);
        }

        return $method;
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
