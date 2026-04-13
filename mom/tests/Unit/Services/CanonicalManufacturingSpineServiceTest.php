<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\CanonicalManufacturingSpineService;
use PHPUnit\Framework\TestCase;

final class CanonicalManufacturingSpineServiceTest extends TestCase
{
    public function testCanonicalSpineValidatesAgainstCurrentRegistry(): void
    {
        $service = new CanonicalManufacturingSpineService(QMS_TEST_BASE_DIR);
        $validation = $service->validate();
        $probe = $service->probe();

        $this->assertTrue($validation['ok'], implode("\n", $validation['errors']));
        $this->assertSame(20, $validation['definition_count']);
        $this->assertSame(0, $validation['error_count']);
        $this->assertSame('authoritative_ready', $probe['readiness_state']);
        $this->assertSame('registry_primary', $probe['authority_mode']);
    }

    public function testDefinitionsDeclareRequiredIdentityScopeAndAuthority(): void
    {
        $definitions = CanonicalManufacturingSpineService::definitions();
        $required = [
            'org_company',
            'legal_entity',
            'plant',
            'site',
            'work_center',
            'line_or_cell',
            'equipment_machine',
            'item_part',
            'item_revision',
            'material_lot',
            'serial_identity',
            'sales_order',
            'job_order',
            'work_order',
            'operation',
            'inspection_execution',
            'evidence_attachment',
            'employee',
            'qualification_requirement',
            'certification_evidence',
        ];

        foreach ($required as $entityKey) {
            $this->assertArrayHasKey($entityKey, $definitions);
            $definition = $definitions[$entityKey];
            $this->assertNotEmpty($definition['canonical_key_fields'], "{$entityKey} missing canonical key strategy");
            $this->assertNotEmpty($definition['org_scope_fields'], "{$entityKey} missing org scope strategy");
            $this->assertNotEmpty($definition['source_authority']['system_of_record'] ?? '', "{$entityKey} missing SoR");
            $this->assertNotEmpty($definition['source_authority']['source_system'] ?? '', "{$entityKey} missing source system");
            $this->assertNotEmpty($definition['source_authority']['authority_state'] ?? '', "{$entityKey} missing authority state");
        }

        $claims = [];
        foreach ($definitions as $entityKey => $definition) {
            $claim = $definition['canonical_table'] . ':' . implode('+', $definition['canonical_key_fields']);
            $this->assertArrayNotHasKey($claim, $claims, "{$entityKey} duplicates {$claim}");
            $claims[$claim] = $entityKey;
        }
    }

    public function testRelationMapExposesCriticalManufacturingChain(): void
    {
        $relations = (new CanonicalManufacturingSpineService(QMS_TEST_BASE_DIR))->relationMap();
        $relationKeys = array_map(
            static fn(array $relation): string => $relation['source_entity'] . '>' . $relation['target_table'],
            $relations,
        );

        $this->assertContains('work_center>org_plant', $relationKeys);
        $this->assertContains('line_or_cell>org_work_center', $relationKeys);
        $this->assertContains('work_order>production_order', $relationKeys);
        $this->assertContains('job_order>item_revision', $relationKeys);
        $this->assertContains('inspection_execution>lot', $relationKeys);
        $this->assertContains('certification_evidence>employees', $relationKeys);
    }
}
