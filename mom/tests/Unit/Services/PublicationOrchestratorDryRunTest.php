<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use PHPUnit\Framework\TestCase;

final class PublicationOrchestratorDryRunTest extends TestCase
{
    public function testDryRunDoesNotReportVerifiedPass(): void
    {
        $portalRoot = dirname(__DIR__, 3);
        $repoRoot = dirname($portalRoot);
        $script = $portalRoot . '/tools/registry/canonical_publication_orchestrator.py';

        $command = 'cd ' . escapeshellarg($repoRoot)
            . ' && python3 ' . escapeshellarg($script) . ' --dry-run 2>&1';
        exec($command, $output, $exitCode);
        $text = implode("\n", $output);

        $this->assertSame(0, $exitCode, $text);
        $this->assertStringContainsString('Overall: DRY-RUN (NOT VERIFIED)', $text);
        $this->assertStringNotContainsString('Overall: PASS', $text);
    }
}

