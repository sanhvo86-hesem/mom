<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Database\DataLayer;
use MOM\Services\RuntimeCutoverControlTowerService;
use PHPUnit\Framework\TestCase;

final class RuntimeCutoverControlTowerServiceTest extends TestCase
{
    public function testPostgresPrimaryFallbackCreatesIncident(): void
    {
        $result = (new RuntimeCutoverControlTowerService())->evaluateFallbackRead([
            'mode' => DataLayer::MODE_POSTGRES_PRIMARY,
        ], [
            'source' => 'json_fallback',
            'fallback' => true,
            'error' => 'postgres_read_failed',
            'attempts' => 3,
        ], [
            'domain_code' => 'master_data',
            'collection_key' => 'parts',
        ]);

        $this->assertFalse($result['allowed']);
        $this->assertSame('postgres_primary_fallback_incident_recorded', $result['reason_code']);
        $this->assertSame(1, $result['metrics']['fallback_incident_count']);
        $this->assertMatchesRegularExpression('/^[a-f0-9]{64}$/', $result['fallback_incident']['incident_hash_sha256']);
    }

    public function testDriftBlocksPostgresOnly(): void
    {
        $service = new RuntimeCutoverControlTowerService();
        $drift = $service->evaluateDriftReport([
            'domains' => [
                'master_data' => [
                    'collections' => [
                        [
                            'collection' => 'bom_library',
                            'json_count' => 2,
                            'postgres_count' => 1,
                            'missing_in_postgres' => ['BOM-2'],
                            'missing_in_json' => [],
                            'mismatch_count' => 0,
                            'status' => 'missing_in_postgres',
                        ],
                    ],
                ],
            ],
        ]);

        $this->assertFalse($drift['allowed']);
        $this->assertSame('drift_blocks_postgres_only', $drift['reason_code']);
        $this->assertSame(1, $drift['drift_blocker_count']);
    }

    public function testRestoreDrillChecksumMismatchBlocks(): void
    {
        $result = (new RuntimeCutoverControlTowerService())->evaluateRestoreDrill([
            'drill_scope' => 'master_data',
            'backup_ref' => 'backup-001',
            'restore_target_ref' => 'restore-sandbox',
            'expected_checksum_sha256' => str_repeat('a', 64),
            'actual_checksum_sha256' => str_repeat('b', 64),
            'source_record_count' => 10,
            'restored_record_count' => 10,
        ]);

        $this->assertFalse($result['allowed']);
        $this->assertSame('restore_drill_checksum_mismatch_blocks_cutover', $result['reason_code']);
        $this->assertSame('mismatch', $result['context']['restore_drill_evidence']['checksum_state']);
    }

    public function testCollectionRowCountMismatchBlocks(): void
    {
        $result = (new RuntimeCutoverControlTowerService())->evaluateCollectionCountGate([
            [
                'domain_code' => 'master_data',
                'collection_key' => 'routing_library',
                'record_key_field' => 'routing_id',
                'json_count' => 5,
                'postgres_count' => 4,
            ],
        ]);

        $this->assertFalse($result['allowed']);
        $this->assertSame('collection_row_count_mismatch_blocks_cutover', $result['reason_code']);
        $this->assertSame('blocked', $result['collection_probes'][0]['probe_state']);
    }

    public function testHumanReadableDriftExportGenerated(): void
    {
        $export = (new RuntimeCutoverControlTowerService())->generateHumanDriftExport([
            'domains' => [
                'orders' => [
                    'collections' => [
                        [
                            'collection' => 'work_orders',
                            'json_count' => 1,
                            'postgres_count' => 1,
                            'missing_in_postgres' => [],
                            'missing_in_json' => [],
                            'mismatch_count' => 0,
                            'status' => 'ok',
                        ],
                    ],
                ],
            ],
        ]);

        $this->assertTrue($export['allowed']);
        $this->assertSame('human_readable_drift_export_generated', $export['reason_code']);
        $this->assertStringContainsString('| orders | work_orders | ok | 1 | 1 | 0 | 0 | 0 |', $export['body']);
        $this->assertMatchesRegularExpression('/^[a-f0-9]{64}$/', $export['export_hash_sha256']);
    }
}
