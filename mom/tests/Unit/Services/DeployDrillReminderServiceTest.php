<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use DateTimeImmutable;
use MOM\Services\DeployDrillReminderService;
use PHPUnit\Framework\TestCase;

final class DeployDrillReminderServiceTest extends TestCase
{
    private string $tmpDir;

    protected function setUp(): void
    {
        $this->tmpDir = sys_get_temp_dir() . '/mom-deploy-drill-' . bin2hex(random_bytes(4));
        mkdir($this->tmpDir . '/config/deploy', 0775, true);
    }

    protected function tearDown(): void
    {
        $this->removeDir($this->tmpDir);
    }

    public function testDailyRunMarksScheduledDrillOlderThanTwentyFourHoursOverdue(): void
    {
        $this->writeJson('config/deploy/drills.bootstrap.json', [
            'version' => 2,
            'reminderPolicy' => ['escalateOverdueCount' => 2],
            'drills' => [
                [
                    'id' => 'DRL-W02-PROD-RETR',
                    'weekN' => 2,
                    'deptId' => 'PROD',
                    'drillType' => 'retrieve_3min',
                    'scheduledAt' => '2026-05-13 05:59',
                    'targetSeconds' => 180,
                    'status' => 'scheduled',
                ],
            ],
        ]);

        $service = new DeployDrillReminderService($this->tmpDir);
        $result = $service->runDaily(new DateTimeImmutable('2026-05-15 06:00:00+07:00'));

        $this->assertSame(1, $result['marked_overdue']);
        $this->assertTrue($result['notification_sent']);
        $this->assertFileExists($this->tmpDir . '/notifications/email_queue.jsonl');
        $saved = $this->readJson('config/deploy/drills.json');
        $this->assertSame('overdue', $saved['drills'][0]['status']);
        $this->assertArrayHasKey('overdueAt', $saved['drills'][0]);
    }

    public function testDailyRunDoesNotNotifyWhenNoDrillNewlyBecomesOverdue(): void
    {
        $this->writeJson('config/deploy/drills.bootstrap.json', [
            'version' => 2,
            'reminderPolicy' => ['escalateOverdueCount' => 2],
            'drills' => [
                [
                    'id' => 'DRL-W02-PROD-RETR',
                    'weekN' => 2,
                    'deptId' => 'PROD',
                    'drillType' => 'retrieve_3min',
                    'scheduledAt' => '2026-05-13 05:59',
                    'targetSeconds' => 180,
                    'status' => 'overdue',
                ],
            ],
        ]);

        $service = new DeployDrillReminderService($this->tmpDir);
        $result = $service->runDaily(new DateTimeImmutable('2026-05-15 06:00:00+07:00'));

        $this->assertSame(0, $result['marked_overdue']);
        $this->assertFalse($result['notification_sent']);
        $this->assertFileDoesNotExist($this->tmpDir . '/notifications/email_queue.jsonl');
    }

    public function testDailyRunEscalatesWhenAtLeastTwoDrillsAreOverdue(): void
    {
        $this->writeJson('config/deploy/drills.bootstrap.json', [
            'version' => 2,
            'reminderPolicy' => [
                'escalateOverdueCount' => 2,
                'escalationRoles' => ['qms_manager'],
                'channels' => ['zalo', 'email'],
            ],
            'drills' => [
                [
                    'id' => 'DRL-W02-PROD-RETR',
                    'weekN' => 2,
                    'deptId' => 'PROD',
                    'drillType' => 'retrieve_3min',
                    'scheduledAt' => '2026-05-13 05:59',
                    'targetSeconds' => 180,
                    'status' => 'scheduled',
                ],
                [
                    'id' => 'DRL-W02-QA-RETR',
                    'weekN' => 2,
                    'deptId' => 'QA',
                    'drillType' => 'retrieve_3min',
                    'scheduledAt' => '2026-05-13 05:59',
                    'targetSeconds' => 180,
                    'status' => 'scheduled',
                ],
            ],
        ]);

        $service = new DeployDrillReminderService($this->tmpDir);
        $result = $service->runDaily(new DateTimeImmutable('2026-05-15 06:00:00+07:00'));

        $this->assertSame(2, $result['overdue_count']);
        $this->assertTrue($result['notification_sent']);
        $this->assertFileExists($this->tmpDir . '/notifications/email_queue.jsonl');
        $queue = file_get_contents($this->tmpDir . '/notifications/email_queue.jsonl');
        $this->assertIsString($queue);
        $this->assertStringContainsString('DRL-W02-PROD-RETR', $queue);
        $this->assertStringContainsString('qms_manager', $queue);
    }

    public function testIssuePayloadDefaultsToRealAndRequiresDrillIdForDrillSource(): void
    {
        $this->writeJson('config/deploy/drills.bootstrap.json', [
            'version' => 2,
            'drills' => [
                ['id' => 'DRL-W02-PROD-RETR', 'status' => 'scheduled'],
            ],
        ]);
        $this->writeJson('config/deploy/issues.bootstrap.json', ['version' => 2, 'issues' => []]);

        $service = new DeployDrillReminderService($this->tmpDir);
        $real = $service->buildIssuePayload([
            'title' => 'Machine stoppage',
            'deptId' => 'PROD',
            'owner' => 'QMS',
        ], null, 'tester', new DateTimeImmutable('2026-05-15 06:00:00+07:00'), $service->loadDrillsState());

        $this->assertSame('real', $real['source']);
        $this->assertNull($real['drillId']);

        $this->expectExceptionMessage('missing_drill_reference');
        $service->buildIssuePayload([
            'title' => 'Drill failure',
            'deptId' => 'PROD',
            'owner' => 'QMS',
            'source' => 'drill',
        ], null, 'tester', new DateTimeImmutable('2026-05-15 06:00:00+07:00'), $service->loadDrillsState());
    }

    /**
     * @param array<string, mixed> $data
     */
    private function writeJson(string $rel, array $data): void
    {
        file_put_contents(
            $this->tmpDir . '/' . $rel,
            json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . PHP_EOL,
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function readJson(string $rel): array
    {
        $raw = file_get_contents($this->tmpDir . '/' . $rel);
        $decoded = is_string($raw) ? json_decode($raw, true) : null;
        return is_array($decoded) ? $decoded : [];
    }

    private function removeDir(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }
        $items = scandir($dir);
        if (!is_array($items)) {
            return;
        }
        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            $path = $dir . '/' . $item;
            is_dir($path) ? $this->removeDir($path) : unlink($path);
        }
        rmdir($dir);
    }
}
