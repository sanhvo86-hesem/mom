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
        $method = $this->privateMethod('resetProgramProgress');

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

    public function testNormalizeChampionStateMigratesLegacyPrimaryBackupToMultiPersonRoster(): void
    {
        $controller = (new ReflectionClass(DeployProgramController::class))->newInstanceWithoutConstructor();
        $method = $this->privateMethod('normalizeChampionState');

        $state = [
            'version' => 1,
            'champions' => [
                'PROD' => [
                    'primary' => ['name' => 'Nguyễn Văn A', 'phone' => '0901', 'ojtPass' => true],
                    'backup' => ['name' => 'Trần Thị B', 'phone' => '0902', 'ojtPass' => false],
                    'shift' => 'A',
                ],
                'MNT' => [
                    'primary' => ['name' => 'Lê Văn C', 'phone' => '0903', 'ojtPass' => false],
                    'backup' => ['name' => '[Chờ nominate backup]', 'phone' => '', 'ojtPass' => false],
                    'shift' => 'B',
                ],
            ],
        ];

        $normalized = $method->invoke($controller, $state);

        $this->assertSame(2, $normalized['version']);
        $this->assertContains('MNT', $normalized['departmentRoster']['active']);
        $this->assertSame('MNT', $normalized['departmentRoster']['custom']['MNT']['label']);
        $this->assertSame('Nguyễn Văn A', $normalized['champions']['PROD']['participants'][0]['name']);
        $this->assertTrue($normalized['champions']['PROD']['participants'][0]['ojtPass']);
        $this->assertSame('Trần Thị B', $normalized['champions']['PROD']['backups'][0]['name']);
        $this->assertSame([], $normalized['champions']['MNT']['backups']);
    }

    public function testNormalizeDepartmentRosterSanitizesCustomDepartmentPayload(): void
    {
        $controller = (new ReflectionClass(DeployProgramController::class))->newInstanceWithoutConstructor();
        $method = $this->privateMethod('normalizeDepartmentRoster');

        $normalized = $method->invoke($controller, [
            'active' => ['QA', 'mnt', 'BAD SPACE', '__custom__'],
            'custom' => [
                'mnt' => [
                    'id' => 'mnt',
                    'label' => 'Bảo trì',
                    'wave' => 9,
                    'color' => 'not-a-color',
                    'owner' => 'Maintenance Manager',
                ],
            ],
        ]);

        $this->assertSame(['QA', 'MNT'], $normalized['active']);
        $this->assertSame('Bảo trì', $normalized['custom']['MNT']['label']);
        // wave=9 không hợp lệ → bị normalize về mặc định 4 (đợt hỗ trợ).
        $this->assertSame(4, $normalized['custom']['MNT']['wave']);
        $this->assertSame('#475569', $normalized['custom']['MNT']['color']);
        $this->assertSame('Maintenance Manager', $normalized['custom']['MNT']['owner']);
    }

    private function privateMethod(string $name): ReflectionMethod
    {
        $method = new ReflectionMethod(DeployProgramController::class, $name);
        if (PHP_VERSION_ID < 80100) {
            $method->setAccessible(true);
        }
        return $method;
    }
}
