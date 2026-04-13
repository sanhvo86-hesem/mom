<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\FileIdempotencyReplayRepository;
use MOM\Api\Services\IdempotencyService;
use MOM\Api\Services\RuntimeAuthorityService;
use MOM\Database\DataLayer;
use MOM\Services\OrderWorkflowService;
use PHPUnit\Framework\TestCase;

final class RuntimeAuthorityServiceTest extends TestCase
{
    private string $tmpDir;

    protected function setUp(): void
    {
        $this->tmpDir = sys_get_temp_dir() . '/mom_runtime_authority_test_' . bin2hex(random_bytes(4));
        mkdir($this->tmpDir, 0775, true);
    }

    protected function tearDown(): void
    {
        $this->removeDir($this->tmpDir);
    }

    public function testReportClassifiesJsonOnlyRuntimeWithoutPretendingDbAuthority(): void
    {
        $data = $this->dataLayer(['use_postgres' => false]);
        $idempotency = new IdempotencyService(
            $this->tmpDir,
            repository: new FileIdempotencyReplayRepository($this->tmpDir),
            databaseConfig: ['use_postgres' => false],
        );

        $report = (new RuntimeAuthorityService($data, $this->tmpDir, $idempotency))->report();

        $this->assertTrue($report['ok']);
        $this->assertSame('JSON_ONLY', $report['profile']['data_layer_mode']);
        $this->assertSame('compatibility_only', $report['slices']['idempotency']['readiness_state']);
        $this->assertSame('compatibility_only', $report['slices']['order_workflow']['readiness_state']);
        $this->assertSame('compatibility_only', $report['slices']['master_data']['readiness_state']);
        $this->assertSame('compatibility_only', $report['slices']['manufacturing_events']['readiness_state']);
        $this->assertSame('authoritative_ready', $report['slices']['canonical_manufacturing_spine']['readiness_state']);
        $this->assertSame('authoritative_ready', $report['slices']['production_history']['readiness_state']);
        $this->assertSame('authority_partial', $report['slices']['workforce_qualification_gate']['readiness_state']);
        $this->assertSame('json_fallback', $report['slices']['order_workflow']['authority_mode']);
        $this->assertSame('json_fallback', $report['slices']['master_data']['authority_mode']);
        $this->assertSame('json_fallback', $report['slices']['manufacturing_events']['authority_mode']);
        $this->assertSame('registry_primary', $report['slices']['canonical_manufacturing_spine']['authority_mode']);
        $this->assertSame('event_ledger_read_model', $report['slices']['production_history']['authority_mode']);
        $this->assertSame('service_invariant_no_requirements', $report['slices']['workforce_qualification_gate']['authority_mode']);
    }

    public function testReportMarksExpectedPostgresIdempotencyFallbackAsDegraded(): void
    {
        $data = $this->dataLayer(['use_postgres' => false]);
        $idempotency = new IdempotencyService(
            $this->tmpDir,
            repository: new FileIdempotencyReplayRepository($this->tmpDir),
            databaseConfig: ['use_postgres' => true],
        );

        $report = (new RuntimeAuthorityService(
            $data,
            $this->tmpDir,
            $idempotency,
            modeSummaryOverride: [
                'mode' => 'POSTGRES_ONLY',
                'use_postgres' => true,
                'shadow_write' => false,
                'json_fallback' => false,
                'database_configured' => true,
                'database_probe_reachable' => false,
                'database_probe_error' => 'test override',
            ],
        ))->report();

        $this->assertFalse($report['ok']);
        $this->assertSame('degraded', $report['slices']['idempotency']['readiness_state']);
        $this->assertFalse($report['summary']['idempotency_expected_authority_met']);
        $this->assertSame(
            'expected_postgres_authority_but_active_backend_is_file',
            $report['slices']['idempotency']['degradation_reason'],
        );
    }

    public function testOrderWorkflowProbeReportsShadowModeOnlyWhenDbAdapterIsPresent(): void
    {
        $service = new OrderWorkflowService($this->tmpDir, db: new RuntimeAuthorityFakeDb());

        $probe = $service->authorityProbe([
            'mode' => 'SHADOW_WRITE',
            'use_postgres' => true,
        ]);

        $this->assertSame('authority_partial', $probe['readiness_state']);
        $this->assertSame('json', $probe['primary_backend']);
        $this->assertSame('postgres', $probe['shadow_backend']);
        $this->assertTrue($probe['shadow_write_active']);
    }

    /**
     * @param array<string, mixed> $config
     */
    private function dataLayer(array $config): DataLayer
    {
        return new DataLayer($this->tmpDir, (string)QMS_TEST_ROOT_DIR, array_merge([
            'use_postgres' => false,
            'shadow_write' => false,
            'json_fallback' => false,
        ], $config));
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

final class RuntimeAuthorityFakeDb
{
}
