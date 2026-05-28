<?php

declare(strict_types=1);

namespace MOM\Tests;

use MOM\Api\Services\DecisionThresholdService;
use PHPUnit\Framework\TestCase;

final class DecisionThresholdServiceTest extends TestCase
{
    private string $tmpDir = '';

    protected function tearDown(): void
    {
        if ($this->tmpDir !== '' && is_dir($this->tmpDir)) {
            $this->removeDir($this->tmpDir);
        }
    }

    public function testBootstrapFallbackKeepsCurrentA2A3A4SemanticsWhenRuntimeFileIsMissing(): void
    {
        $this->tmpDir = sys_get_temp_dir() . '/decision-thresholds-' . bin2hex(random_bytes(6));
        mkdir($this->tmpDir . '/config', 0777, true);
        copy(
            $this->repoRoot() . '/mom/data/config/decision_thresholds.bootstrap.json',
            $this->tmpDir . '/config/decision_thresholds.bootstrap.json'
        );

        $service = new DecisionThresholdService($this->repoRoot(), $this->tmpDir);
        $config = $service->load();
        $items = $config['items'] ?? [];

        self::assertSame('≤ 3000 USD: EST lập, CS xác nhận yêu cầu.', $items['quote']['l1'] ?? null);
        self::assertSame('> 3000 USD: CEO ký sau khi EST hoàn tất bảng tính giá và biên gộp.', $items['quote']['l2'] ?? null);
        self::assertSame('Biên gộp mục tiêu < 30% → CEO.', $items['quote']['escalation'] ?? null);
        self::assertSame('> 0%: EST đề xuất trên hồ sơ báo giá → CEO duyệt.', $items['discount']['l1'] ?? null);
        self::assertSame('≤ công nợ 30 ngày: EST chuẩn bị hồ sơ, CS xác nhận yêu cầu.', $items['payment_terms']['l1'] ?? null);
        self::assertSame('> 30 ngày → CEO duyệt.', $items['payment_terms']['l2'] ?? null);
    }

    public function testPreviewAuthorityLookupBlockRendersCurrentThresholdText(): void
    {
        $service = new DecisionThresholdService($this->repoRoot(), $this->repoRoot() . '/mom/data');
        $html = $service->previewAuthorityLookupBlock();

        self::assertStringContainsString('≤ 3000 USD', $html);
        self::assertStringContainsString('&gt; 3000 USD', $html);
        self::assertStringContainsString('Biên gộp mục tiêu &lt; 30%', $html);
        self::assertStringContainsString('&gt; 0%: <a class="entity-link role-link"', $html);
        self::assertStringContainsString('≤ công nợ 30 ngày', html_entity_decode($html, ENT_QUOTES | ENT_HTML5, 'UTF-8'));
    }

    private function repoRoot(): string
    {
        return dirname(__DIR__, 2);
    }

    private function removeDir(string $path): void
    {
        $items = scandir($path);
        if ($items === false) {
            return;
        }
        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            $child = $path . '/' . $item;
            if (is_dir($child)) {
                $this->removeDir($child);
                continue;
            }
            @unlink($child);
        }
        @rmdir($path);
    }
}
