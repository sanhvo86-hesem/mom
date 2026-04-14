<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\RegistryService;
use PHPUnit\Framework\TestCase;

final class RegistryBootstrapPathTest extends TestCase
{
    public function testBootstrapRegistryDoesNotPolluteControlledRuntimeDataPath(): void
    {
        $portalRoot = dirname(__DIR__, 3);
        $repoRoot = dirname($portalRoot);
        $runtimeRegistryDir = $portalRoot . '/data/registry';
        $controlledRegistryDir = $portalRoot . '/contracts';
        $runtimeRegistryPath = $runtimeRegistryDir . '/table-registry.json';
        $controlledRegistryPath = $controlledRegistryDir . '/table-registry.json';

        $this->assertFileExists($controlledRegistryPath);
        $this->assertFileDoesNotExist($repoRoot . '/data/registry/table-registry.json');

        if (!is_file($runtimeRegistryPath)) {
            return;
        }

        $runtimeRegistry = $this->readJson($runtimeRegistryPath);
        $controlledRegistry = $this->readJson($controlledRegistryPath);
        $runtimeTables = (array)($runtimeRegistry['tables'] ?? []);
        $controlledTables = (array)($controlledRegistry['tables'] ?? []);

        $this->assertGreaterThanOrEqual(count($controlledTables), count($runtimeTables));
        $firstRuntimeTable = reset($runtimeTables);
        $this->assertIsArray($firstRuntimeTable);
        $this->assertNotSame('', trim((string)($firstRuntimeTable['domain'] ?? '')));
        $this->assertNotEmpty((array)($firstRuntimeTable['columns'] ?? []));
    }

    public function testControlledRegistryFallbackContainsUsableTablesAndGeneratedEndpoints(): void
    {
        $portalRoot = dirname(__DIR__, 3);
        $controlledRegistryDir = $portalRoot . '/contracts';

        $tableRegistry = $this->readJson($controlledRegistryDir . '/table-registry.json');
        $endpointCatalog = (new RegistryService($portalRoot . '/data'))->raw('endpoint-catalog');

        $this->assertIsArray($tableRegistry['tables'] ?? null);
        $this->assertGreaterThan(0, count($tableRegistry['tables']));

        $firstTable = reset($tableRegistry['tables']);
        $this->assertIsArray($firstTable);
        $this->assertArrayHasKey('primaryKey', $firstTable);
        $primaryKeys = $firstTable['primaryKeys'] ?? (array)$firstTable['primaryKey'];
        $this->assertNotEmpty(array_filter($primaryKeys));

        $this->assertIsArray($endpointCatalog['endpoints'] ?? null);
        $this->assertGreaterThan(0, count($endpointCatalog['endpoints']));

        $firstEndpoint = reset($endpointCatalog['endpoints']);
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
