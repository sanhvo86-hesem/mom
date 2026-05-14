<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Controllers;

use MOM\Api\Controllers\DeployProgramController;
use PHPUnit\Framework\TestCase;
use ReflectionClass;
use ReflectionMethod;

final class DeployProgramControllerResetTest extends TestCase
{
    public function testResetProgramProgressClearsGateSignoffsAndRestartsTimeline(): void
    {
        $controller = (new ReflectionClass(DeployProgramController::class))->newInstanceWithoutConstructor();
        $method = new ReflectionMethod(DeployProgramController::class, 'resetProgramProgress');
        if (PHP_VERSION_ID < 80100) {
            $method->setAccessible(true);
        }

        $program = [
            'currentWeek' => 4,
            'currentPhase' => 'P2',
            'phaseStatus' => ['P0' => 'completed', 'P1' => 'completed', 'P2' => 'in_progress'],
            'weeks' => [
                [
                    'n' => 0,
                    'label' => 'W0',
                    'status' => 'completed',
                    'signOff' => ['by' => 'ceo', 'decision' => 'go'],
                ],
                [
                    'n' => 1,
                    'label' => 'W1',
                    'status' => 'conditional',
                    'signOff' => ['by' => 'qms_manager', 'decision' => 'conditional'],
                ],
            ],
        ];

        $reset = $method->invoke($controller, $program);

        $this->assertSame(0, $reset['currentWeek']);
        $this->assertSame('P0', $reset['currentPhase']);
        $this->assertSame('in_progress', $reset['phaseStatus']['P0']);
        $this->assertSame('pending', $reset['phaseStatus']['P1']);
        $this->assertSame('pending', $reset['phaseStatus']['P4']);
        $this->assertSame('pending', $reset['weeks'][0]['status']);
        $this->assertNull($reset['weeks'][0]['signOff']);
        $this->assertSame('pending', $reset['weeks'][1]['status']);
        $this->assertNull($reset['weeks'][1]['signOff']);
        $this->assertArrayHasKey('lastUpdated', $reset);
    }
}
