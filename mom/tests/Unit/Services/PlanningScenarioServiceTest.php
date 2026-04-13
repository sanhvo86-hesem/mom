<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\FilePlanningScenarioRepository;
use MOM\Api\Services\PlanningScenarioService;
use PHPUnit\Framework\TestCase;
use RuntimeException;

final class PlanningScenarioServiceTest extends TestCase
{
    private string $tmpDir;
    private PlanningScenarioService $service;

    protected function setUp(): void
    {
        $this->tmpDir = sys_get_temp_dir() . '/mom_planning_scenario_test_' . bin2hex(random_bytes(4));
        mkdir($this->tmpDir, 0775, true);
        $this->service = new PlanningScenarioService(
            $this->tmpDir,
            repository: new FilePlanningScenarioRepository($this->tmpDir),
        );
    }

    protected function tearDown(): void
    {
        $this->removeDir($this->tmpDir);
    }

    public function testFeasibleScenarioProducesPromiseAndCapacityLoad(): void
    {
        $scenario = $this->service->calculateScenario($this->baseScenario());
        $feasibility = $this->service->feasibility($scenario['scenario_id']);
        $capacity = $this->service->capacityLoad($scenario['scenario_id']);

        $this->assertSame('calculated', $scenario['scenario_state']);
        $this->assertTrue($scenario['promise']['feasible']);
        $this->assertSame('2026-04-13', $scenario['promise']['promise_date']);
        $this->assertSame([], $scenario['promise']['reason_codes']);
        $this->assertSame(1, $scenario['metrics']['scheduled_operation_count']);
        $this->assertSame(1, count($capacity['capacity_load']));
        $this->assertTrue($feasibility['publishable']);
        $this->assertSame('deterministic_finite_capacity.v1', $scenario['constraints']['constraint_model']);
    }

    public function testCapacityOverloadMakesScenarioInfeasibleWithStableReason(): void
    {
        $input = $this->baseScenario([
            'capacity_buckets' => [[
                'work_center_id' => 'WC-5AX',
                'machine_id' => 'MC-5AX-01',
                'bucket_date' => '2026-04-13',
                'available_minutes' => 60,
            ]],
        ]);

        $scenario = $this->service->calculateScenario($input);

        $this->assertSame('infeasible', $scenario['scenario_state']);
        $this->assertContains('capacity_overload', $scenario['promise']['reason_codes']);
        $this->assertSame('capacity_overload', $scenario['blockers'][0]['reason_code']);
    }

    public function testQualityHoldBlocksPublishability(): void
    {
        $scenario = $this->service->calculateScenario($this->baseScenario([
            'quality_holds' => [[
                'wo_number' => 'WO-PLAN-1',
                'hold_status' => 'open',
                'reason_code' => 'NCR_OPEN',
            ]],
        ]));

        $this->assertSame('infeasible', $scenario['scenario_state']);
        $this->assertContains('quality_hold', $scenario['promise']['reason_codes']);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('planning_scenario_not_approvable');
        $this->service->approveScenario($scenario['scenario_id']);
    }

    public function testMaintenanceDowntimeImpactsScheduleFeasibility(): void
    {
        $scenario = $this->service->calculateScenario($this->baseScenario([
            'capacity_buckets' => [[
                'work_center_id' => 'WC-5AX',
                'machine_id' => 'MC-5AX-01',
                'bucket_date' => '2026-04-13',
                'available_minutes' => 600,
                'maintenance_blocked_minutes' => 520,
            ]],
        ]));

        $this->assertSame('infeasible', $scenario['scenario_state']);
        $this->assertContains('maintenance_window', $scenario['promise']['reason_codes']);
        $this->assertContains('capacity_overload', $scenario['promise']['reason_codes']);
    }

    public function testMissingAndExpiredQualificationImpactsExecutableFeasibility(): void
    {
        $missing = $this->service->calculateScenario($this->baseScenario([
            'scenario_key' => 'TR8-MISSING-QUAL',
            'qualification_assertions' => [],
        ]));
        $this->assertSame('infeasible', $missing['scenario_state']);
        $this->assertContains('missing_qualification', $missing['promise']['reason_codes']);

        $expired = $this->service->calculateScenario($this->baseScenario([
            'scenario_key' => 'TR8-EXPIRED-QUAL',
            'qualification_assertions' => [[
                'qualification_assertion_id' => 'QUAL-OLD',
                'employee_id' => 'operator-1',
                'qualification_type' => 'training',
                'qualification_code' => 'WI-OP20-TRAINING',
                'assertion_state' => 'active',
                'expires_at' => '2020-01-01T00:00:00Z',
            ]],
        ]));
        $this->assertContains('expired_qualification', $expired['promise']['reason_codes']);
    }

    public function testScenarioLifecyclePublishesReadyDispatchPackage(): void
    {
        $scenario = $this->service->calculateScenario($this->baseScenario());
        $approved = $this->service->approveScenario($scenario['scenario_id'], ['approved_by' => 'planner-1']);
        $published = $this->service->publishScenario($scenario['scenario_id'], ['published_by' => 'planner-1']);
        $dispatch = $this->service->dispatchReadiness(['scenario_id' => $scenario['scenario_id']]);

        $this->assertSame('approved', $approved['scenario_state']);
        $this->assertSame('published', $published['scenario_state']);
        $this->assertSame(1, $published['published_schedule']['entry_count']);
        $this->assertSame('ready', $published['published_schedule']['entries'][0]['dispatch_state']);
        $this->assertSame(1, $dispatch['ready_count']);
        $this->assertSame(0, $dispatch['blocked_count']);
    }

    public function testPublishBlockedWhenConstraintsRemain(): void
    {
        $scenario = $this->service->calculateScenario($this->baseScenario([
            'scenario_key' => 'TR8-BLOCKED-PUBLISH',
            'quality_holds' => [[
                'wo_number' => 'WO-PLAN-1',
                'hold_status' => 'open',
            ]],
        ]));

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('planning_scenario_not_approved');
        $this->service->publishScenario($scenario['scenario_id']);
    }

    public function testReplanningSignalIsStructuredAndQueryable(): void
    {
        $scenario = $this->service->calculateScenario($this->baseScenario());
        $signal = $this->service->recordReplanningSignal([
            'scenario_id' => $scenario['scenario_id'],
            'source_type' => 'downtime_event',
            'source_id' => 'DT-1',
            'wo_number' => 'WO-PLAN-1',
            'work_center_id' => 'WC-5AX',
            'machine_id' => 'MC-5AX-01',
            'reason_code' => 'machine_downtime',
        ]);
        $signals = $this->service->replanningSignals(['scenario_id' => $scenario['scenario_id']]);

        $this->assertSame('maintenance_block', $signal['signal_category']);
        $this->assertSame(1, $signals['signal_count']);
        $this->assertSame(['maintenance_block' => 1], $signals['category_counts']);
    }

    /**
     * @param array<string, mixed> $overrides
     * @return array<string, mixed>
     */
    private function baseScenario(array $overrides = []): array
    {
        $base = [
            'scenario_key' => 'TR8-PLAN-A',
            'scenario_name' => 'Tranche 8 planning scenario',
            'horizon_start' => '2026-04-13',
            'org_company_code' => 'HESEM',
            'org_legal_entity_code' => 'HESEM-VN',
            'org_plant_id' => 'PLANT-1',
            'org_site_id' => 'SITE-A',
            'require_active_revision' => true,
            'work_orders' => [[
                'wo_number' => 'WO-PLAN-1',
                'job_number' => 'JO-PLAN-1',
                'operation_seq' => '20',
                'work_center_id' => 'WC-5AX',
                'machine_id' => 'MC-5AX-01',
                'required_minutes' => 120,
                'operator_id' => 'operator-1',
                'required_qualification_type' => 'training',
                'required_qualification_code' => 'WI-OP20-TRAINING',
                'active_revision_id' => 'WI-OP20',
                'active_revision_version' => 'V2',
                'part_number' => 'PN-001',
                'part_revision' => 'A',
            ]],
            'capacity_buckets' => [[
                'work_center_id' => 'WC-5AX',
                'machine_id' => 'MC-5AX-01',
                'bucket_date' => '2026-04-13',
                'available_minutes' => 600,
                'maintenance_blocked_minutes' => 0,
            ]],
            'qualification_assertions' => [[
                'qualification_assertion_id' => 'QUAL-OP1-WI20',
                'employee_id' => 'operator-1',
                'qualification_type' => 'training',
                'qualification_code' => 'WI-OP20-TRAINING',
                'assertion_state' => 'active',
                'expires_at' => '2099-01-01T00:00:00Z',
            ]],
            'material_availability' => [[
                'part_number' => 'PN-001',
                'shortage_flag' => false,
            ]],
        ];

        foreach ($overrides as $key => $value) {
            $base[$key] = $value;
        }
        return $base;
    }

    private function removeDir(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }
        $items = scandir($dir);
        if ($items === false) {
            return;
        }
        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            $path = $dir . DIRECTORY_SEPARATOR . $item;
            if (is_dir($path)) {
                $this->removeDir($path);
            } else {
                @unlink($path);
            }
        }
        @rmdir($dir);
    }
}
