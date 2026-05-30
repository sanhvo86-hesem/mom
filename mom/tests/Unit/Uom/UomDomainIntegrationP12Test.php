<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Uom;

use PHPUnit\Framework\TestCase;

final class UomDomainIntegrationP12Test extends TestCase
{
    private string $root;

    protected function setUp(): void
    {
        $this->root = dirname(__DIR__, 3);
    }

    public function testAllRequiredDomainRootsHaveContracts(): void
    {
        $json = $this->domainContract();
        $roots = array_keys($json['domain_roots']);

        foreach (['ITEM', 'CUST', 'SUP', 'EQP', 'MDEV', 'PO', 'IREV', 'SO', 'WO', 'LOT', 'INSP', 'NQCASE', 'CAPA', 'BREL', 'CDOC', 'TRAIN', 'Analytics/AI'] as $root) {
            $this->assertContains($root, $roots);
            $this->assertNotEmpty($json['domain_roots'][$root]['required_contract'] ?? null, $root);
            $this->assertNotEmpty($json['domain_roots'][$root]['measurement_fields'] ?? [], $root);
            $this->assertNotEmpty($json['domain_roots'][$root]['existing_evidence'] ?? [], $root);
        }
    }

    public function testAuthorityPolicyBlocksFreeTextAliasAndAiOverride(): void
    {
        $policy = $this->domainContract()['authority_policy'];

        $this->assertTrue($policy['canonical_unit_required']);
        $this->assertStringContainsString('uom_alias_quarantine', $policy['alias_policy']);
        $this->assertStringContainsString('cannot override', $policy['ai_policy']);
        $this->assertStringContainsString('price/currency', $policy['pricing_policy']);
    }

    public function testRequiredOperationalSimulationsAreMapped(): void
    {
        $simulations = $this->domainContract()['simulation_contracts'];

        foreach (['SIM-P12-01', 'SIM-P12-02', 'SIM-P12-03', 'SIM-P12-04', 'SIM-P12-05'] as $id) {
            $this->assertArrayHasKey($id, $simulations);
            $this->assertNotEmpty($simulations[$id]['root_sequence']);
            $this->assertNotEmpty($simulations[$id]['required_evidence']);
        }

        $this->assertContains('Analytics/AI', $simulations['SIM-P12-05']['root_sequence']);
    }

    public function testBacklogClassifiesNakedNumberFieldsByRoot(): void
    {
        $backlog = $this->backlog();
        $roots = array_unique(array_map(static fn (array $item): string => (string)$item['root'], $backlog['items']));

        foreach (['SO', 'WO', 'LOT', 'INSP', 'BREL', 'NQCASE', 'EQP', 'Analytics/AI'] as $root) {
            $this->assertContains($root, $roots);
        }
        foreach ($backlog['items'] as $item) {
            $this->assertNotEmpty($item['file'] ?? null);
            $this->assertNotEmpty($item['required_repair'] ?? null);
            $this->assertStringContainsString('P12-BL-', $item['id']);
        }
    }

    public function testIntegrationRegistryReferencesExistingUomAuthorityPaths(): void
    {
        foreach ([
            'api/services/Uom/ItemUomPolicyService.php',
            'api/services/Uom/MeasurementValueFactory.php',
            'api/services/Uom/UomAliasResolutionService.php',
            'api/services/Uom/QualityMeasurementBridge.php',
            'api/services/Uom/PotencyContextualConverter.php',
        ] as $path) {
            $this->assertFileExists($this->root . '/' . $path);
        }
    }

    /**
     * @return array<string,mixed>
     */
    private function domainContract(): array
    {
        return json_decode(
            (string)file_get_contents($this->root . '/data/registry/uom-domain-integration-contracts.json'),
            true,
            flags: JSON_THROW_ON_ERROR
        );
    }

    /**
     * @return array<string,mixed>
     */
    private function backlog(): array
    {
        return json_decode(
            (string)file_get_contents(dirname($this->root) . '/_reports/uom-v5/P12-domain-naked-number-backlog.json'),
            true,
            flags: JSON_THROW_ON_ERROR
        );
    }
}
