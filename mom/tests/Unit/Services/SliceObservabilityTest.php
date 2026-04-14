<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Services\SliceObservability;
use PHPUnit\Framework\TestCase;

final class SliceObservabilityTest extends TestCase
{
    private string $tmpDir;

    protected function setUp(): void
    {
        $this->tmpDir = sys_get_temp_dir() . '/mom_slice_observability_test_' . bin2hex(random_bytes(4));
        mkdir($this->tmpDir, 0775, true);
        SliceObservability::reset();
    }

    protected function tearDown(): void
    {
        SliceObservability::reset();
        $this->removeDir($this->tmpDir);
    }

    public function testBeginRequestCreatesFreshTraceContext(): void
    {
        $first = SliceObservability::beginRequest($this->tmpDir);
        $firstTrace = $first->getTraceId();
        $firstRequest = $first->getRequestId();

        $second = SliceObservability::beginRequest($this->tmpDir);
        $attrs = $second->getTraceAttributes();

        $this->assertNotSame($firstTrace, $second->getTraceId());
        $this->assertNotSame($firstRequest, $second->getRequestId());
        $this->assertArrayHasKey('request_started_at', $attrs);
        $this->assertSame($second->getTraceId(), $attrs['trace_id']);
        $this->assertSame($second->getRequestId(), $attrs['request_id']);
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
