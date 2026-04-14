<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Database\DataLayer;
use MOM\Services\DataSchemaService;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;
use RuntimeException;

final class DataSchemaServicePathTest extends TestCase
{
    private string $tmpDir;
    private string $rootDir;
    private string $dataDir;

    protected function setUp(): void
    {
        $this->tmpDir = sys_get_temp_dir() . '/mom_dataschema_path_' . bin2hex(random_bytes(4));
        $this->rootDir = $this->tmpDir . '/root';
        $this->dataDir = $this->rootDir . '/mom/data';
        mkdir($this->dataDir, 0775, true);
    }

    protected function tearDown(): void
    {
        $this->removeDir($this->tmpDir);
    }

    public function testMissingRegistryArtifactUnderRootStillReturnsRelativePath(): void
    {
        $path = $this->dataDir . '/registry/table-registry.json';

        $this->assertSame(
            'mom/data/registry/table-registry.json',
            $this->relativePath($path),
        );
    }

    public function testTraversalOutsideRootIsRejectedForMissingPaths(): void
    {
        mkdir($this->tmpDir . '/outside', 0775, true);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Path traversal detected');

        $this->relativePath($this->rootDir . '/../outside/missing.json');
    }

    public function testSymlinkedParentOutsideRootIsRejectedForMissingPaths(): void
    {
        if (!function_exists('symlink')) {
            $this->markTestSkipped('symlink() is unavailable in this environment.');
        }

        $outsideDir = $this->tmpDir . '/outside';
        mkdir($outsideDir, 0775, true);
        $linkPath = $this->rootDir . '/mom/outside-link';
        if (!symlink($outsideDir, $linkPath)) {
            $this->markTestSkipped('Unable to create symlink in this environment.');
        }

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Path traversal detected');

        $this->relativePath($linkPath . '/missing.json');
    }

    private function relativePath(string $path): string
    {
        $service = new DataSchemaService(
            new DataLayer($this->dataDir, $this->rootDir, ['use_postgres' => false]),
            $this->dataDir,
            $this->rootDir,
        );

        $method = new ReflectionMethod(DataSchemaService::class, 'relativePath');
        if (PHP_VERSION_ID < 80100) {
            $method->setAccessible(true);
        }

        return (string)$method->invoke($service, $path);
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
