<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Services\MdaExecutableScenarioRunnerService;
use PHPUnit\Framework\TestCase;

final class MdaExecutableScenarioRunnerServiceTest extends TestCase
{
    public function testDeclaredCountMismatchBlocks(): void
    {
        $result = (new MdaExecutableScenarioRunnerService())->run([
            'dsl_version' => '2026-05-29.p38',
            'declared_count' => 2,
            'minimum_required_count' => 1,
            'scenarios' => [$this->scenario()],
        ]);

        $this->assertFalse($result['allowed']);
        $this->assertFalse($result['scenario_count_matches']);
        $this->assertSame('scenario_acceptance_dashboard_blocked', $result['reason_code']);
    }

    public function testRunsMasterLibraryWithTwoHundredPassFailResults(): void
    {
        $path = QMS_TEST_ROOT_DIR . '/_reports/agent-audits/mda-prompt-os-2026-05-29/MDA_SIMULATION_MASTER_LIBRARY.csv';
        $result = (new MdaExecutableScenarioRunnerService())->runFromCsv($path, [
            'minimum_required_count' => 200,
        ]);

        $this->assertTrue($result['allowed']);
        $this->assertSame(200, $result['dashboard']['total_scenarios_executed']);
        $this->assertSame(200, $result['dashboard']['passed_scenarios']);
        $this->assertSame(0, $result['dashboard']['failed_scenarios']);
    }

    public function testP0ScenarioFailureBlocksAcceptance(): void
    {
        $scenario = $this->scenario([
            'severity' => 'P0',
            'forced_result' => false,
        ]);
        $result = (new MdaExecutableScenarioRunnerService())->run([
            'dsl_version' => '2026-05-29.p38',
            'declared_count' => 1,
            'minimum_required_count' => 1,
            'scenarios' => [$scenario],
        ]);

        $this->assertFalse($result['allowed']);
        $this->assertSame(1, $result['dashboard']['p0_failed_scenarios']);
        $this->assertSame(1, $result['dashboard']['failed_blocker_scenarios']);
    }

    public function testMockOnlyFinalAcceptanceProhibited(): void
    {
        $scenario = $this->scenario([
            'severity' => 'P0',
            'command_driver' => 'mock_only',
        ]);
        $result = (new MdaExecutableScenarioRunnerService())->run([
            'dsl_version' => '2026-05-29.p38',
            'declared_count' => 1,
            'minimum_required_count' => 1,
            'final_acceptance' => true,
            'scenarios' => [$scenario],
        ]);

        $this->assertFalse($result['allowed']);
        $this->assertSame(1, $result['dashboard']['mock_only_final_acceptance_failures']);
        $this->assertContains('mock_only_final_acceptance_prohibited', $result['results'][0]['issues']);
    }

    public function testScenarioMapsRootCommandGateEventLedgerEvidence(): void
    {
        $result = (new MdaExecutableScenarioRunnerService())->run([
            'dsl_version' => '2026-05-29.p38',
            'declared_count' => 1,
            'minimum_required_count' => 1,
            'scenarios' => [$this->scenario()],
        ]);

        $this->assertTrue($result['allowed']);
        $this->assertSame('ROOT-INT-001', $result['results'][0]['root_code']);
        $this->assertSame('ReconcileDomain', $result['results'][0]['command']);
        $this->assertMatchesRegularExpression('/^[a-f0-9]{64}$/', $result['evidence_export']['export_hash_sha256']);
    }

    /** @param array<string, mixed> $overrides */
    private function scenario(array $overrides = []): array
    {
        return array_replace([
            'scenario_id' => 'SIM-P38-UNIT',
            'root_code' => 'ROOT-INT-001',
            'command' => 'ReconcileDomain',
            'expected_gate' => 'drift_gate',
            'expected_events' => ['drift.detected'],
            'expected_ledgers' => ['reconciliation ledger'],
            'expected_holds' => [],
            'expected_errors' => [],
            'expected_evidence' => 'scenario evidence packet',
            'assertions' => ['root mapped', 'command mapped', 'gate mapped', 'evidence hash'],
            'severity' => 'P1',
            'command_driver' => 'static_contract',
        ], $overrides);
    }
}
