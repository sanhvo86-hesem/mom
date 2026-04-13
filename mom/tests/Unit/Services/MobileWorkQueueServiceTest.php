<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Services\MobileWorkQueueService;
use PHPUnit\Framework\TestCase;
use RuntimeException;

final class MobileWorkQueueServiceTest extends TestCase
{
    private string $tmpDir;

    protected function setUp(): void
    {
        $this->tmpDir = sys_get_temp_dir() . '/mom_mobile_queue_' . bin2hex(random_bytes(4));
        mkdir($this->tmpDir, 0775, true);
    }

    protected function tearDown(): void
    {
        $this->removeDir($this->tmpDir);
    }

    public function testClockOutRequiresMatchingOperatorWhenProvided(): void
    {
        $service = new MobileWorkQueueService($this->tmpDir);
        $clockIn = $service->clockIn('operator-1', 'WO-1001', 20, 'MC-5AX-01');

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('forbidden_clock_out_operator');

        $service->clockOut((string)$clockIn['entry_id'], 1, 0, 'operator-2');
    }

    public function testClockOutWithMatchingOperatorCreatesOutEntry(): void
    {
        $service = new MobileWorkQueueService($this->tmpDir);
        $clockIn = $service->clockIn('operator-1', 'WO-1001', 20, 'MC-5AX-01');

        $clockOut = $service->clockOut((string)$clockIn['entry_id'], 3, 1, 'operator-1');

        $this->assertSame('clock_out', $clockOut['entry_type']);
        $this->assertSame('operator-1', $clockOut['operator_id']);
        $this->assertSame(3, $clockOut['quantity_completed']);
        $this->assertSame(1, $clockOut['quantity_scrap']);
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
