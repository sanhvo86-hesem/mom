<?php

declare(strict_types=1);

namespace MOM\Tests;

use MOM\Api\Services\AuthorityWorkflowGuardService;
use PHPUnit\Framework\TestCase;

final class AuthorityWorkflowGuardServiceTest extends TestCase
{
    public function testWorkflowRegistryMapsCriticalTransitionsToEvidenceAndAuthority(): void
    {
        $service = new AuthorityWorkflowGuardService($this->repoRoot(), $this->dataDir());
        $result = $service->validate();

        self::assertTrue($result['valid'], json_encode($result['issues'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) ?: 'json_encode_failed');
        self::assertGreaterThan(0, $result['summary']['critical_rows'] ?? 0);
    }

    public function testWorkflowRegistryFailsWhenScenarioCoverageIsMissing(): void
    {
        $workspace = $this->buildWorkspace();

        $workflowPath = $workspace . '/mom/data/config/workflow_transition_registry.bootstrap.json';
        $workflow = json_decode((string) file_get_contents($workflowPath), true, 512, JSON_THROW_ON_ERROR);
        $workflow['rows'][0]['scenario_ids'] = [];
        file_put_contents($workflowPath, json_encode($workflow, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n");

        $service = new AuthorityWorkflowGuardService($workspace, $workspace . '/mom/data');
        $result = $service->validate();

        self::assertFalse($result['valid']);
        self::assertStringContainsString(
            'mapped scenario playbook',
            json_encode($result['issues'], JSON_UNESCAPED_UNICODE) ?: 'json_encode_failed'
        );
    }

    public function testWorkflowRegistryFailsWhenScenarioCdrDoesNotMatch(): void
    {
        $workspace = $this->buildWorkspace();

        $workflowPath = $workspace . '/mom/data/config/workflow_transition_registry.bootstrap.json';
        $workflow = json_decode((string) file_get_contents($workflowPath), true, 512, JSON_THROW_ON_ERROR);
        $workflow['rows'][0]['scenario_ids'] = ['SCN-G3-SCHEDULE-BREAKGLASS'];
        file_put_contents($workflowPath, json_encode($workflow, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n");

        $service = new AuthorityWorkflowGuardService($workspace, $workspace . '/mom/data');
        $result = $service->validate();

        self::assertFalse($result['valid']);
        self::assertStringContainsString(
            'does not cover workflow CDR',
            json_encode($result['issues'], JSON_UNESCAPED_UNICODE) ?: 'json_encode_failed'
        );
    }

    private function repoRoot(): string
    {
        return dirname(__DIR__, 2);
    }

    private function dataDir(): string
    {
        return $this->repoRoot() . '/mom/data';
    }

    private function buildWorkspace(): string
    {
        $workspace = sys_get_temp_dir() . '/authority-workflow-guard-' . bin2hex(random_bytes(6));
        mkdir($workspace . '/mom/data/config', 0777, true);
        mkdir($workspace . '/mom/docs/system/organization/04-RACI-Authority', 0777, true);

        copy(
            $this->repoRoot() . '/mom/data/config/workflow_transition_registry.bootstrap.json',
            $workspace . '/mom/data/config/workflow_transition_registry.bootstrap.json'
        );
        copy(
            $this->repoRoot() . '/mom/data/config/raci_control_registry.bootstrap.json',
            $workspace . '/mom/data/config/raci_control_registry.bootstrap.json'
        );
        copy(
            $this->repoRoot() . '/mom/data/config/scenario_registry.bootstrap.json',
            $workspace . '/mom/data/config/scenario_registry.bootstrap.json'
        );
        copy(
            $this->repoRoot() . '/mom/docs/system/organization/04-RACI-Authority/authority-matrix.html',
            $workspace . '/mom/docs/system/organization/04-RACI-Authority/authority-matrix.html'
        );

        return $workspace;
    }
}
