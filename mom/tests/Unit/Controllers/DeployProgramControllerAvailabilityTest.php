<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Controllers;

use MOM\Api\Controllers\DeployProgramController;
use MOM\Api\Controllers\ExitException;
use MOM\Database\DataLayer;
use PHPUnit\Framework\TestCase;

final class DeployProgramControllerAvailabilityTest extends TestCase
{
    private string $tmpDir;

    protected function setUp(): void
    {
        $this->tmpDir = sys_get_temp_dir() . '/mom-deploy-availability-' . bin2hex(random_bytes(4));
        mkdir($this->tmpDir . '/config/deploy', 0775, true);
        $_SERVER['REMOTE_ADDR'] = '127.0.0.1';
        $_SESSION = [
            'user' => 'qms',
            'mfa_ok' => true,
            'last_active' => time(),
        ];
        unset($GLOBALS['__mom_raw_input']);
    }

    protected function tearDown(): void
    {
        unset($GLOBALS['__mom_raw_input']);
        $_SESSION = [];
        $this->removeDir($this->tmpDir);
    }

    public function testSaveAvailabilityPersistsAbsenceWithApproverName(): void
    {
        $payload = $this->callController('saveAvailability', [
            'championName' => 'Nguyễn Văn A',
            'deptId' => 'qa',
            'role' => 'primary',
            'fromDate' => '2026-05-15',
            'toDate' => '2026-05-16',
            'reason' => 'Đi công tác',
            'coverBy' => 'Trần Thị B',
            'coverPhone' => '0901000000',
        ]);

        $this->assertTrue($payload['ok']);
        $this->assertSame('QA', $payload['entry']['deptId']);
        $this->assertSame('Trưởng QMS', $payload['entry']['approvedBy']);

        $state = $this->readJson('config/deploy/availability.json');
        $this->assertCount(1, $state['absences']);
        $this->assertSame('Nguyễn Văn A', $state['absences'][0]['championName']);
    }

    public function testCheckAvailabilityFindsTodayAbsenceWithoutCover(): void
    {
        $today = gmdate('Y-m-d');
        $this->writeJson('config/deploy/availability.json', [
            'version' => 1,
            'absences' => [
                [
                    'id' => 'ABS-OPEN',
                    'championName' => 'Nguyễn Văn A',
                    'deptId' => 'QA',
                    'role' => 'primary',
                    'fromDate' => $today,
                    'toDate' => $today,
                    'reason' => 'Nghỉ phép',
                    'coverBy' => '',
                ],
                [
                    'id' => 'ABS-COVERED',
                    'championName' => 'Trần Thị B',
                    'deptId' => 'PROD',
                    'role' => 'backup',
                    'fromDate' => $today,
                    'toDate' => $today,
                    'reason' => 'Đi công tác',
                    'coverBy' => 'Lê Văn C',
                ],
            ],
        ]);

        $payload = $this->callController('checkAvailability', []);

        $this->assertTrue($payload['ok']);
        $this->assertSame(1, $payload['data']['uncovered_count']);
        $this->assertTrue($payload['data']['notification_sent']);
        $this->assertSame('ABS-OPEN', $payload['data']['uncovered'][0]['id']);
        $this->assertFileExists($this->tmpDir . '/notifications/email_queue.jsonl');
    }

    /**
     * @param array<string, mixed> $body
     * @return array<string, mixed>
     */
    private function callController(string $method, array $body): array
    {
        $controller = new DeployProgramController(
            new DataLayer($this->tmpDir, $this->rootDir(), ['use_postgres' => false]),
            $this->rootDir(),
            $this->tmpDir,
        );
        $controller->setStore([
            'settings' => [],
            'users' => [
                [
                    'username' => 'qms',
                    'name' => 'Trưởng QMS',
                    'role' => 'qms_manager',
                    'roles' => ['qms_manager'],
                    'active' => true,
                ],
            ],
        ]);
        $GLOBALS['__mom_raw_input'] = json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '{}';

        try {
            $controller->{$method}();
        } catch (ExitException $e) {
            $payload = $e->getPayload();
            $this->assertIsArray($payload);
            return $payload;
        }

        $this->fail('Controller did not terminate with ExitException.');
    }

    private function rootDir(): string
    {
        $rootDir = defined('QMS_TEST_ROOT_DIR') ? constant('QMS_TEST_ROOT_DIR') : dirname(__DIR__, 4);
        return is_string($rootDir) ? $rootDir : dirname(__DIR__, 4);
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
