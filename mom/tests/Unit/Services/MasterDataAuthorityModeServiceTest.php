<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Services\MasterDataAuthorityException;
use MOM\Services\MasterDataAuthorityModeService;
use MOM\Services\MasterDataFallbackTelemetry;
use MOM\Services\MasterDataService;
use PHPUnit\Framework\TestCase;

final class MasterDataAuthorityModeServiceTest extends TestCase
{
    private string $dataDir;

    protected function setUp(): void
    {
        $this->dataDir = sys_get_temp_dir() . '/mom-master-data-mode-' . bin2hex(random_bytes(6));
        mkdir($this->dataDir . '/master-data', 0775, true);
    }

    protected function tearDown(): void
    {
        putenv('HESEM_MASTER_DATA_AUTHORITY_MODE');
        $this->deleteTree($this->dataDir);
    }

    public function testJsonOnlyBlocksGovernedMasterDataCommand(): void
    {
        $mode = new MasterDataAuthorityModeService($this->dataDir, null, [
            'use_postgres' => false,
            'shadow_write' => false,
            'json_fallback' => false,
        ]);
        $service = new MasterDataService($this->dataDir, null, null, $mode);

        $result = $service->create('parts', [
            'part_number' => 'PN-001',
            'part_name' => 'Test Part',
        ], 'tester');

        $this->assertFalse($result->ok);
        $this->assertSame('governed_master_data_postgres_authority_required', $result->errorCode);
        $this->assertSame('blocked_postgres_required', $service->authorityProbe()['readiness_state']);
    }

    public function testPostgresOnlyCutoverBlocksWhenFallbackTelemetryExists(): void
    {
        $mode = new MasterDataAuthorityModeService($this->dataDir, null, [
            'use_postgres' => true,
            'shadow_write' => false,
            'json_fallback' => false,
        ]);
        $telemetry = new MasterDataFallbackTelemetry($this->dataDir);
        $telemetry->recordFallbackRead('parts', 'unit_test');

        $this->expectException(MasterDataAuthorityException::class);
        $mode->assertPostgresOnlyCutoverAllowed($telemetry);
    }

    private function deleteTree(string $path): void
    {
        if (!is_dir($path)) {
            return;
        }
        foreach (scandir($path) ?: [] as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            $child = $path . '/' . $item;
            if (is_dir($child)) {
                $this->deleteTree($child);
                continue;
            }
            @unlink($child);
        }
        @rmdir($path);
    }
}
