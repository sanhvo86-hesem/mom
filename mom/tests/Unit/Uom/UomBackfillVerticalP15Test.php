<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Uom;

use PHPUnit\Framework\TestCase;

final class UomBackfillVerticalP15Test extends TestCase
{
    private string $repo;

    protected function setUp(): void
    {
        $this->repo = dirname(__DIR__, 4);
    }

    public function testShadowPolicyForbidsGuessingAndOverwriting(): void
    {
        $policy = $this->json('mom/data/registry/uom-backfill-shadow-policy.json');

        $this->assertSame('shadow_proposal_only', $policy['policy']['mode']);
        $this->assertFalse($policy['policy']['overwrite_original_fields']);
        $this->assertFalse($policy['policy']['guess_units_from_field_name']);
        $this->assertTrue($policy['policy']['require_unit_evidence_for_shadow_measval']);
    }

    public function testRequiredBackfillSimulationsAreClassified(): void
    {
        $rules = $this->json('mom/data/registry/uom-backfill-shadow-policy.json')['simulation_rules'];

        $this->assertSame('cannot_infer_unit', $rules['SIM-P15-01']['classification']);
        $this->assertSame('needs_measval_wrapper', $rules['SIM-P15-02']['classification']);
        $this->assertSame('needs_item_policy', $rules['SIM-P15-03A']['classification']);
        $this->assertSame('cannot_infer_unit', $rules['SIM-P15-03B']['classification']);
        $this->assertSame('ambiguous_alias', $rules['SIM-P15-04']['classification']);
        $this->assertSame('delete_shadow_proposals_only', $rules['SIM-P15-05']['action']);
    }

    public function testVerticalPacksCoverRequiredIndustries(): void
    {
        $packs = $this->json('mom/data/registry/uom-vertical-packs.json')['packs'];

        foreach (['electronics', 'metal_mechanical', 'food_beverage', 'pharma_biotech', 'medical_device', 'chemical', 'apparel'] as $pack) {
            $this->assertArrayHasKey($pack, $packs);
            $this->assertNotEmpty($packs[$pack]['quantity_kinds']);
            $this->assertNotEmpty($packs[$pack]['allowed_units']);
            $this->assertNotEmpty($packs[$pack]['contextual_rules']);
            $this->assertNotEmpty($packs[$pack]['validation_needs']);
        }
    }

    public function testHistoricalScanClassifiesWithoutMassUpdate(): void
    {
        $scan = $this->json('_reports/uom-v5/P15-historical-scan-results.json');

        $this->assertFalse($scan['summary']['mass_update_performed']);
        $this->assertSame(0, $scan['summary']['shadow_proposals_created']);
        $classes = array_unique(array_map(static fn (array $row): string => (string)$row['classification'], $scan['classified_fields']));
        foreach (['already_canonical', 'needs_measval_wrapper', 'needs_item_policy', 'ambiguous_alias', 'cannot_infer_unit'] as $class) {
            $this->assertContains($class, $classes);
        }
    }

    public function testSampleDatasetRollbackDeletesOnlyShadow(): void
    {
        $samples = $this->json('_reports/uom-v5/P15-sample-shadow-dataset.json')['samples'];
        $byId = [];
        foreach ($samples as $sample) {
            $byId[$sample['id']] = $sample;
        }

        $this->assertNull($byId['SIM-P15-01']['shadow_proposal']);
        $this->assertSame('missing unit evidence', $byId['SIM-P15-01']['quarantine_reason']);
        $this->assertTrue($byId['SIM-P15-05']['shadow_proposal']['delete_shadow_only']);
        $this->assertFalse($byId['SIM-P15-05']['shadow_proposal']['delete_original']);
    }

    /**
     * @return array<string,mixed>
     */
    private function json(string $relative): array
    {
        return json_decode(
            (string)file_get_contents($this->repo . '/' . $relative),
            true,
            flags: JSON_THROW_ON_ERROR
        );
    }
}
