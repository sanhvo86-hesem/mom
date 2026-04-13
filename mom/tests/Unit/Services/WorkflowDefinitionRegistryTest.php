<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\WorkflowDefinitionRegistry;
use PHPUnit\Framework\TestCase;

class WorkflowDefinitionRegistryTest extends TestCase
{
    protected function setUp(): void
    {
        WorkflowDefinitionRegistry::reset();
    }

    public function testRegisterAndRetrieve(): void
    {
        $definitions = [
            'NCR' => [
                'initial'  => 'open',
                'terminal' => ['closed', 'voided'],
                'states'   => ['open', 'containment', 'root_cause', 'closed', 'voided'],
                'transitions' => [
                    'open' => [
                        'containment' => [
                            'label' => 'Start Containment',
                            'roles' => ['qa_engineer'],
                            'actions' => [],
                            'requires' => [],
                        ],
                    ],
                ],
            ],
        ];

        WorkflowDefinitionRegistry::register($definitions);

        $this->assertSame($definitions, WorkflowDefinitionRegistry::all());
    }

    public function testGetByType(): void
    {
        WorkflowDefinitionRegistry::register([
            'NCR'  => ['initial' => 'open', 'states' => ['open', 'closed']],
            'CAPA' => ['initial' => 'draft', 'states' => ['draft', 'closed']],
        ]);

        $ncr = WorkflowDefinitionRegistry::get('ncr');
        $this->assertNotNull($ncr);
        $this->assertSame('open', $ncr['initial']);

        $capa = WorkflowDefinitionRegistry::get('CAPA');
        $this->assertNotNull($capa);
        $this->assertSame('draft', $capa['initial']);

        $this->assertNull(WorkflowDefinitionRegistry::get('nonexistent'));
    }

    public function testTypes(): void
    {
        WorkflowDefinitionRegistry::register([
            'NCR'  => ['initial' => 'open'],
            'CAPA' => ['initial' => 'draft'],
            'FAI'  => ['initial' => 'planning'],
        ]);

        $types = WorkflowDefinitionRegistry::types();
        $this->assertSame(['NCR', 'CAPA', 'FAI'], $types);
    }

    public function testStepRequirements(): void
    {
        WorkflowDefinitionRegistry::registerStepRequirements([
            'NCR::containment' => [
                'table' => 'ncr_records',
                'required_fields' => [
                    'containment_action' => ['label' => 'Containment Action', 'type' => 'text'],
                ],
                'optional_fields' => ['notes'],
                'attachments' => ['photo'],
            ],
        ]);

        $reqs = WorkflowDefinitionRegistry::stepRequirements('NCR', 'containment');
        $this->assertSame('ncr_records', $reqs['table']);
        $this->assertArrayHasKey('containment_action', $reqs['required_fields']);
    }

    public function testStepRequirementsDefault(): void
    {
        WorkflowDefinitionRegistry::registerStepRequirements([]);

        $reqs = WorkflowDefinitionRegistry::stepRequirements('NCR', 'unknown_state');
        $this->assertSame('workflow_step_data', $reqs['table']);
        $this->assertEmpty($reqs['required_fields']);
    }

    public function testValidateStepDataPass(): void
    {
        WorkflowDefinitionRegistry::registerStepRequirements([
            'NCR::containment' => [
                'table' => 'ncr_records',
                'required_fields' => [
                    'action' => ['label' => 'Action', 'type' => 'text'],
                ],
                'optional_fields' => [],
                'attachments' => [],
            ],
        ]);

        $result = WorkflowDefinitionRegistry::validateStepData('NCR', 'containment', [
            'action' => 'Quarantine affected parts',
        ]);

        $this->assertTrue($result['ok']);
        $this->assertEmpty($result['missing']);
    }

    public function testValidateStepDataMissing(): void
    {
        WorkflowDefinitionRegistry::registerStepRequirements([
            'NCR::containment' => [
                'table' => 'ncr_records',
                'required_fields' => [
                    'action' => ['label' => 'Action', 'label_vi' => 'Hanh dong', 'type' => 'text'],
                    'quantity' => ['label' => 'Quantity', 'label_vi' => 'So luong', 'type' => 'integer'],
                ],
                'optional_fields' => [],
                'attachments' => [],
            ],
        ]);

        $result = WorkflowDefinitionRegistry::validateStepData('NCR', 'containment', [
            'action' => 'Quarantine',
            // quantity missing
        ]);

        $this->assertFalse($result['ok']);
        $this->assertCount(1, $result['missing']);
        $this->assertSame('quantity', $result['missing'][0]['field']);
    }

    public function testResetClearsCache(): void
    {
        WorkflowDefinitionRegistry::register(['NCR' => ['initial' => 'open']]);
        $this->assertNotEmpty(WorkflowDefinitionRegistry::all());

        WorkflowDefinitionRegistry::reset();
        $this->assertEmpty(WorkflowDefinitionRegistry::all());
    }
}
