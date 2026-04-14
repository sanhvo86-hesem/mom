<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\RegistryService;
use PHPUnit\Framework\TestCase;

final class RegistryBootstrapPathTest extends TestCase
{
    public function testBootstrapRegistryLivesInRuntimeConsumedPathOnly(): void
    {
        $portalRoot = dirname(__DIR__, 3);
        $repoRoot = dirname($portalRoot);
        $runtimeRegistryDir = $portalRoot . '/data/registry';

        $this->assertDirectoryExists($runtimeRegistryDir);
        $this->assertFileExists($runtimeRegistryDir . '/table-registry.json');
        $this->assertFileExists($runtimeRegistryDir . '/endpoint-catalog-index.json');
        $this->assertFileExists($runtimeRegistryDir . '/relation-map.json');
        $this->assertFileExists($runtimeRegistryDir . '/schema-authority-summary.json');
        $this->assertFileDoesNotExist($repoRoot . '/data/registry/table-registry.json');
    }

    public function testBootstrapRegistryContainsRuntimeUsableTablesAndEndpoints(): void
    {
        $portalRoot = dirname(__DIR__, 3);
        $runtimeRegistryDir = $portalRoot . '/data/registry';

        $tableRegistry = $this->readJson($runtimeRegistryDir . '/table-registry.json');
        $endpointCatalog = $this->readJson($runtimeRegistryDir . '/endpoint-catalog-index.json');

        $this->assertIsArray($tableRegistry['tables'] ?? null);
        $this->assertGreaterThan(0, count($tableRegistry['tables']));

        $firstTable = reset($tableRegistry['tables']);
        $this->assertIsArray($firstTable);
        $this->assertArrayHasKey('primaryKey', $firstTable);
        $this->assertArrayHasKey('primaryKeys', $firstTable);

        $this->assertIsArray($endpointCatalog['rows'] ?? null);
        $this->assertGreaterThan(0, count($endpointCatalog['rows']));

        $firstEndpoint = reset($endpointCatalog['rows']);
        $this->assertIsArray($firstEndpoint);
        $this->assertArrayHasKey('handler', $firstEndpoint);
    }

    public function testRuntimeRegistryOverlayPreservesControlledDomainAndColumnMetadata(): void
    {
        $portalRoot = dirname(__DIR__, 3);
        $registry = new RegistryService($portalRoot . '/data');
        $tableRegistry = $registry->raw('table-registry');
        $crmActivities = $tableRegistry['tables']['crm_activities'] ?? null;

        $this->assertIsArray($crmActivities);
        $this->assertSame('crm', $crmActivities['domain'] ?? null);
        $this->assertNotEmpty($crmActivities['columns']['crm_activity_id'] ?? null);
        $this->assertSame('crm_activity_id', $crmActivities['primaryKey'] ?? null);
    }

    /**
     * @return array<string, mixed>
     */
    private function readJson(string $path): array
    {
        $payload = json_decode((string)file_get_contents($path), true);
        $this->assertIsArray($payload);

        return $payload;
    }
}
