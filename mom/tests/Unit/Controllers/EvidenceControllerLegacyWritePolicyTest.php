<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Controllers;

use MOM\Api\Controllers\EvidenceController;
use MOM\Database\DataLayer;
use PHPUnit\Framework\TestCase;
use RuntimeException;

final class EvidenceControllerLegacyWritePolicyTest extends TestCase
{
    private string $tmpDir;

    protected function setUp(): void
    {
        $this->tmpDir = sys_get_temp_dir() . '/mom_evidence_controller_test_' . bin2hex(random_bytes(4));
        mkdir($this->tmpDir, 0775, true);
    }

    protected function tearDown(): void
    {
        $this->removeDir($this->tmpDir);
    }

    public function testLegacyEvidenceUploadIsDeniedBeforeVaultWrite(): void
    {
        $controller = new EvidenceControllerDenyHarness(
            new DataLayer($this->tmpDir, (string)QMS_TEST_ROOT_DIR, ['use_postgres' => false]),
            (string)QMS_TEST_ROOT_DIR,
            $this->tmpDir,
        );

        try {
            $controller->upload();
            $this->fail('Legacy upload should be denied before EvidenceVaultService can write.');
        } catch (RuntimeException $e) {
            $this->assertStringContainsString('canonical_evidence_command_required|410', $e->getMessage());
        }
    }

    private function removeDir(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }
        $items = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($dir, \RecursiveDirectoryIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST,
        );
        foreach ($items as $item) {
            $item->isDir() ? rmdir($item->getPathname()) : unlink($item->getPathname());
        }
        rmdir($dir);
    }
}

final class EvidenceControllerDenyHarness extends EvidenceController
{
    protected function requireAuth(): array
    {
        return [
            'id' => 'admin-1',
            'username' => 'admin-1',
            'role' => 'admin',
        ];
    }

    protected function requireCsrf(): void
    {
    }

    protected function error(string $error, int $code = 400, ?string $detail = null, array $extra = []): never
    {
        throw new RuntimeException($error . '|' . $code . '|' . (string)$detail);
    }
}
