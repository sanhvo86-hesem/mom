<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use DateTimeImmutable;
use MOM\Services\ResourceReadinessService;
use MOM\Services\ToolingGageAuthorityService;
use PHPUnit\Framework\TestCase;

final class ToolingGageAuthorityServiceTest extends TestCase
{
    public function testToolLifeBelowStopThresholdBlocksStart(): void
    {
        $result = (new ToolingGageAuthorityService())->evaluateToolingReadiness([
            'tool' => [
                'tool_id' => 'TOOL-1',
                'life_basis' => 'percent_remaining',
                'life_remaining_pct' => 2.0,
                'stop_threshold_pct' => 5.0,
            ],
        ], new DateTimeImmutable('2026-05-29T00:00:00Z'));

        $this->assertFalse($result['allowed']);
        $this->assertSame('tool_life_below_stop_threshold', $result['reason_code']);
    }

    public function testBreakageCreatesSuspectWindowFromLastGoodCheck(): void
    {
        $plan = (new ToolingGageAuthorityService())->createBreakageSuspectWindow([
            'breakage_event_ref' => 'BRK-1',
            'tool_id' => 'TOOL-2',
            'equipment_id' => 'MILL-1',
            'work_order_id' => 'WO-1',
            'last_good_at' => '2026-05-29T08:00:00Z',
            'breakage_at' => '2026-05-29T10:00:00Z',
            'affected_lots' => ['LOT-1'],
            'affected_serials' => ['SER-1'],
        ]);

        $this->assertTrue($plan['allowed']);
        $this->assertSame('tool_breakage_suspect_window_required', $plan['reason_code']);
        $this->assertSame('containment_required', $plan['suspect_window']['suspect_window_status']);
        $this->assertMatchesRegularExpression('/^[a-f0-9]{64}$/', $plan['suspect_window']['window_hash_sha256']);
        $this->assertSame('quality_failure_containment_required', $plan['quality_containment_plan']['reason_code']);
    }

    public function testGageCalibrationExpiredBlocksCtqResult(): void
    {
        $result = (new ToolingGageAuthorityService())->evaluateGageCtqGate([
            'gage' => [
                'gage_id' => 'GAGE-1',
                'calibration_status' => 'active',
                'next_due_date' => '2026-05-01',
                'grr_percent' => 8.0,
                'ndc' => 10,
            ],
        ], new DateTimeImmutable('2026-05-29T00:00:00Z'));

        $this->assertFalse($result['allowed']);
        $this->assertSame('gage_calibration_expired', $result['reason_code']);
    }

    public function testOotImpactsShippedAndWipLots(): void
    {
        $plan = (new ToolingGageAuthorityService())->planGageOotImpact([
            'oot_ref' => 'OOT-1',
            'gage_id' => 'GAGE-2',
            'last_known_good_at' => '2026-05-01T00:00:00Z',
            'oot_discovered_at' => '2026-05-29T00:00:00Z',
            'affected_lots' => ['WIP-LOT-1', 'SHIP-LOT-1'],
            'affected_shipments' => ['SHIP-1'],
            'affected_work_orders' => ['WO-2'],
        ]);

        $this->assertTrue($plan['allowed']);
        $this->assertSame('gage_oot_impact_scope_required', $plan['reason_code']);
        $this->assertTrue($plan['impact_scope']['wip_containment_required']);
        $this->assertTrue($plan['impact_scope']['shipment_review_required']);
        $this->assertSame('customer_review', $plan['impact_scope']['impact_status']);
    }

    public function testToolAssemblyIncompatibleWithMachineFamilyBlocksLoad(): void
    {
        $result = (new ToolingGageAuthorityService())->evaluateToolingReadiness([
            'machine_family_code' => '5-axis',
            'tool_assembly' => [
                'assembly_id' => 'ASM-1',
                'status' => 'active',
                'compatible_machine_families' => ['3-axis'],
            ],
        ], new DateTimeImmutable('2026-05-29T00:00:00Z'));

        $this->assertFalse($result['allowed']);
        $this->assertSame('tool_assembly_machine_family_incompatible', $result['reason_code']);
    }

    public function testResourceReadinessCanUseToolingGageAuthority(): void
    {
        $result = (new ResourceReadinessService(null, new ToolingGageAuthorityService()))->evaluateReleaseOrStart([
            'command_name' => 'StartJob',
            'work_order_ref' => 'WO-3',
            'tool' => [
                'tool_id' => 'TOOL-3',
                'life_remaining_pct' => 1.0,
                'stop_threshold_pct' => 5.0,
            ],
        ], new DateTimeImmutable('2026-05-29T00:00:00Z'));

        $this->assertFalse($result['allowed']);
        $this->assertContains('tool_life_below_stop_threshold', array_column($result['blockers'] ?? [], 'code'));
    }
}
