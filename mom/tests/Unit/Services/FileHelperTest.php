<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\FileHelper;
use PHPUnit\Framework\TestCase;

class FileHelperTest extends TestCase
{
    private string $tmpDir;

    protected function setUp(): void
    {
        $this->tmpDir = sys_get_temp_dir() . '/mom_filehelper_test_' . bin2hex(random_bytes(4));
    }

    protected function tearDown(): void
    {
        $this->removeDir($this->tmpDir);
    }

    public function testEnsureDirCreatesDirectory(): void
    {
        $dir = $this->tmpDir . '/sub/deep';
        $this->assertDirectoryDoesNotExist($dir);

        FileHelper::ensureDir($dir);

        $this->assertDirectoryExists($dir);
    }

    public function testEnsureDirIdempotent(): void
    {
        FileHelper::ensureDir($this->tmpDir);
        FileHelper::ensureDir($this->tmpDir); // Should not throw
        $this->assertDirectoryExists($this->tmpDir);
    }

    public function testReadJsonValid(): void
    {
        mkdir($this->tmpDir, 0775, true);
        $file = $this->tmpDir . '/test.json';
        file_put_contents($file, json_encode(['key' => 'value']));

        $result = FileHelper::readJson($file);

        $this->assertIsArray($result);
        $this->assertSame('value', $result['key']);
    }

    public function testReadJsonMissingFile(): void
    {
        $this->assertNull(FileHelper::readJson('/nonexistent/file.json'));
    }

    public function testReadJsonInvalidJson(): void
    {
        mkdir($this->tmpDir, 0775, true);
        $file = $this->tmpDir . '/bad.json';
        file_put_contents($file, 'not json');

        $this->assertNull(FileHelper::readJson($file));
    }

    public function testWriteJsonAndReadBack(): void
    {
        mkdir($this->tmpDir, 0775, true);
        $file = $this->tmpDir . '/output.json';
        $data = ['name' => 'HESEM', 'version' => '2.1.0', 'items' => [1, 2, 3]];

        FileHelper::writeJson($file, $data);

        $result = FileHelper::readJson($file);
        $this->assertSame($data, $result);
    }

    public function testWriteJsonCreatesParentDir(): void
    {
        $file = $this->tmpDir . '/new/dir/data.json';

        FileHelper::writeJson($file, ['created' => true]);

        $this->assertFileExists($file);
        $result = FileHelper::readJson($file);
        $this->assertTrue($result['created']);
    }

    public function testTsCompactFormat(): void
    {
        $ts = FileHelper::tsCompact();
        $this->assertMatchesRegularExpression('/^\d{8}_\d{6}$/', $ts);
    }

    public function testHumanDtFormat(): void
    {
        $dt = FileHelper::humanDt();
        $this->assertMatchesRegularExpression('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/', $dt);
    }

    public function testNowIsoFormat(): void
    {
        $iso = FileHelper::nowIso();
        // ISO 8601: e.g., 2026-04-13T10:30:00+00:00
        $this->assertNotFalse(strtotime($iso));
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
