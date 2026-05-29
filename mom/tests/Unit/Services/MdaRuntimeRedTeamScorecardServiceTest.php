<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Services\MdaRuntimeRedTeamScorecardService;
use PHPUnit\Framework\TestCase;

final class MdaRuntimeRedTeamScorecardServiceTest extends TestCase
{
    public function testOpenP0BlocksPass(): void
    {
        $result = (new MdaRuntimeRedTeamScorecardService())->score([[
            'blocker_id' => 'P23-P0-001',
            'gap_id' => 'GAP-P01-001',
            'severity' => 'P0',
            'status' => 'open',
        ]], [], ['mode' => 'POSTGRES_ONLY']);

        $this->assertSame('P41_BLOCKED_RUNTIME_AUTHORITY_RISK', $result['decision_token']);
        $this->assertSame('open_p0_blocks_pass', $result['simulations']['SIM-P41-002']);
    }

    public function testJsonOnlyAndRestoreGapBlockFinalReadiness(): void
    {
        $result = (new MdaRuntimeRedTeamScorecardService())->score([[
            'blocker_id' => 'P23-P1-035',
            'gap_id' => 'GAP-P15-001',
            'severity' => 'P1',
            'status' => 'open',
        ]], [], ['mode' => 'JSON_ONLY']);

        $this->assertSame('P41_BLOCKED_RUNTIME_AUTHORITY_RISK', $result['decision_token']);
        $this->assertSame('restore_drill_missing_blocks', $result['simulations']['SIM-P41-004']);
    }

    public function testZeroP0WithP1OnlyIsControlledGap(): void
    {
        $result = (new MdaRuntimeRedTeamScorecardService())->score([[
            'blocker_id' => 'P23-P1-001',
            'gap_id' => 'GAP-OTHER',
            'severity' => 'P1',
            'status' => 'open',
        ]], [], ['mode' => 'POSTGRES_ONLY']);

        $this->assertSame('P41_PASS_WITH_CONTROLLED_GAPS', $result['decision_token']);
        $this->assertSame('NO_GO', $result['go_no_go']);
    }
}
