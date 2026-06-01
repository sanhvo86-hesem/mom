<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\Scenario\MdaRuntimeScenarioRunner;
use PHPUnit\Framework\TestCase;

final class MdaRuntimeScenarioRunnerTest extends TestCase
{
    public function testP58LibraryRunsThroughRealGatewayAndProducesDashboard(): void
    {
        $dataDir = dirname(__DIR__, 3) . '/data';
        $runner = new MdaRuntimeScenarioRunner($dataDir);
        $dashboard = $runner->run();

        $this->assertSame('P58_PASS_READY_FOR_NEXT', $dashboard['decision']);
        $this->assertSame(14, $dashboard['scenario_total']);
        $this->assertSame(14, $dashboard['passed']);
        $this->assertSame(0, $dashboard['failed']);
        $this->assertFalse($dashboard['mock_only']);
        $this->assertSame('NO_GO_CUTOVER_FALLBACK_READ_PRESENT', $dashboard['cutover_decision']);
    }
}
