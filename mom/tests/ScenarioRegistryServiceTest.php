<?php

declare(strict_types=1);

namespace MOM\Tests;

use MOM\Api\Services\ScenarioRegistryService;
use PHPUnit\Framework\TestCase;

final class ScenarioRegistryServiceTest extends TestCase
{
    public function testScenarioRegistryBootstrapHasRequiredCoverage(): void
    {
        $service = new ScenarioRegistryService($this->repoRoot(), $this->dataDir());
        $result = $service->validate();
        $config = $service->load();

        self::assertTrue($result['valid'], json_encode($result['issues'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) ?: 'json_encode_failed');
        self::assertGreaterThanOrEqual(110, $result['summary']['scenarios'] ?? 0);
        self::assertGreaterThanOrEqual(24, $result['summary']['drills'] ?? 0);
        self::assertIsArray($config['scenarios'][0] ?? null);
        $first = $config['scenarios'][0];
        self::assertSame($first['raci']['a_process'] ?? null, $first['a_process'] ?? null);
        self::assertSame($first['authority']['release_authority'] ?? null, $first['release_authority'] ?? null);
        self::assertSame($first['authority']['hold_authority'] ?? null, $first['hold_authority'] ?? null);
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
