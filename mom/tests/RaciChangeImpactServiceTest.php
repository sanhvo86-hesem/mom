<?php

declare(strict_types=1);

namespace MOM\Tests;

use MOM\Api\Services\RaciChangeImpactService;
use PHPUnit\Framework\TestCase;

final class RaciChangeImpactServiceTest extends TestCase
{
    public function testA2ImpactPreviewIncludesDocsWorkflowAndScenarios(): void
    {
        $service = new RaciChangeImpactService($this->repoRoot(), $this->dataDir());
        $impact = $service->previewImpact('A2');

        self::assertGreaterThan(0, $impact['document_count'] ?? 0);
        self::assertGreaterThan(0, $impact['workflow_count'] ?? 0);
        self::assertGreaterThan(0, $impact['scenario_count'] ?? 0);
    }

    private function repoRoot(): string
    {
        return dirname(__DIR__, 2);
    }

    private function dataDir(): string
    {
        return $this->repoRoot() . '/mom/data';
    }
}
