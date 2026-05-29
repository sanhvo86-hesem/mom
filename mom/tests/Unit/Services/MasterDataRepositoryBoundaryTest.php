<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Database\DataLayer;
use MOM\Services\DataLayerMasterDataRepository;
use MOM\Services\JsonMasterDataRepository;
use MOM\Services\MasterDataRepository;
use MOM\Services\MasterDataService;
use PHPUnit\Framework\TestCase;

final class MasterDataRepositoryBoundaryTest extends TestCase
{
    public function testDuplicateCreateRejectsThroughRepositoryBoundary(): void
    {
        $repository = new InMemoryMasterDataRepository([
            'parts' => [[
                'part_number' => 'PART-001',
                'status' => 'draft',
            ]],
        ]);
        $service = new MasterDataService(sys_get_temp_dir(), repository: $repository);

        $result = $service->create('parts', ['part_number' => 'PART-001'], 'planner');

        $this->assertFalse($result->ok);
        $this->assertSame('duplicate', $result->errorCode);
        $this->assertSame('PART-001', $result->data['existing_id'] ?? null);
    }

    public function testActiveUpdateQueuesApprovalAndApproveAppliesChange(): void
    {
        $repository = new InMemoryMasterDataRepository([
            'parts' => [[
                'part_number' => 'PART-002',
                'description' => 'Old description',
                'status' => 'active',
            ]],
        ]);
        $service = new MasterDataService(sys_get_temp_dir(), repository: $repository);

        $queued = $service->update('parts', 'PART-002', ['description' => 'New description'], 'planner', 'drawing update');

        $this->assertTrue($queued->ok, $queued->message);
        $this->assertSame('pending', $queued->data['status'] ?? null);
        $changeId = (string)($queued->data['change_id'] ?? '');
        $this->assertNotSame('', $changeId);
        $this->assertSame('Old description', $repository->store['parts'][0]['description'] ?? null);

        $this->assertTrue($service->approvePendingChange($changeId, 'qa-manager'));
        $this->assertSame('New description', $repository->store['parts'][0]['description'] ?? null);
        $this->assertSame('approved', $repository->pending['entries'][0]['status'] ?? null);
        $this->assertGreaterThanOrEqual(2, count((array)($repository->history['entries'] ?? [])));
    }

    public function testReferentialDeleteBlockUsesRepositoryReferenceStores(): void
    {
        $repository = new InMemoryMasterDataRepository(
            ['parts' => [['part_number' => 'PART-003', 'status' => 'draft']]],
            ['job_orders' => [['jo_number' => 'JO-001', 'part_number' => 'PART-003']]],
        );
        $service = new MasterDataService(sys_get_temp_dir(), repository: $repository);

        $result = $service->delete('parts', 'PART-003', 'planner');

        $this->assertFalse($result->ok);
        $this->assertSame('referential_integrity', $result->errorCode);
        $this->assertSame('PART-003', $repository->store['parts'][0]['part_number'] ?? null);
    }

    public function testDeleteArchivesUnreferencedRecordThroughRepositoryBoundary(): void
    {
        $repository = new InMemoryMasterDataRepository([
            'suppliers' => [[
                'supplier_id' => 'SUP-001',
                'supplier_name' => 'Supplier One',
                'status' => 'approved',
            ]],
        ]);
        $service = new MasterDataService(sys_get_temp_dir(), repository: $repository);

        $result = $service->delete('suppliers', 'SUP-001', 'buyer');

        $this->assertTrue($result->ok, $result->message);
        $this->assertSame([], $repository->store['suppliers']);
        $this->assertSame('SUP-001', $repository->archive['suppliers'][0]['supplier_id'] ?? null);
        $this->assertSame('delete', $repository->history['entries'][0]['action'] ?? null);
    }

    public function testDataLayerRepositoryReportsJsonOnlyCompatibilityBridge(): void
    {
        $dataDir = sys_get_temp_dir() . '/hesem-md-repo-' . bin2hex(random_bytes(4));
        @mkdir($dataDir . '/master-data', 0775, true);

        try {
            $defaults = [
                '_meta' => ['version' => 'test'],
                'customers' => [],
                'suppliers' => [],
                'parts' => [],
                'revisions' => [],
            ];
            $dataLayer = new DataLayer($dataDir, (string)constant('QMS_TEST_ROOT_DIR'), [
                'use_postgres' => false,
                'shadow_write' => false,
                'json_fallback' => false,
            ]);
            $repository = new DataLayerMasterDataRepository(
                $dataLayer,
                new JsonMasterDataRepository($dataDir, $defaults),
            );

            $repository->saveStore(array_merge($defaults, [
                'customers' => [[
                    'customer_id' => 'CUS-P27',
                    'customer_name' => 'P27 Customer',
                ]],
            ]));

            $loaded = $repository->loadStore();
            $probe = $repository->authorityProbe($dataLayer->getModeSummary());

            $this->assertSame('CUS-P27', $loaded['customers'][0]['customer_id'] ?? null);
            $this->assertSame(DataLayer::MODE_JSON_ONLY, $probe['authority_mode'] ?? null);
            $this->assertSame('json', $probe['primary_backend'] ?? null);
            $this->assertSame('primary_compatibility_store', $probe['json_bridge_role'] ?? null);
        } finally {
            $this->removeTree($dataDir);
        }
    }

    private function removeTree(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }
        foreach (array_diff(scandir($dir) ?: [], ['.', '..']) as $entry) {
            $path = $dir . '/' . $entry;
            if (is_dir($path)) {
                $this->removeTree($path);
                continue;
            }
            @unlink($path);
        }
        @rmdir($dir);
    }
}

final class InMemoryMasterDataRepository implements MasterDataRepository
{
    /** @var array<string, mixed> */
    public array $store;

    /** @var array<string, mixed> */
    public array $history = ['_meta' => ['version' => 'test'], 'entries' => []];

    /** @var array<string, mixed> */
    public array $pending = ['_meta' => ['version' => 'test'], 'entries' => []];

    /** @var array<string, mixed> */
    public array $archive = ['_meta' => ['version' => 'test']];

    /** @var array<string, mixed> */
    private array $orders;

    /** @var array<string, mixed> */
    private array $mesRuntime;

    /**
     * @param array<string, mixed> $store
     * @param array<string, mixed> $orders
     * @param array<string, mixed> $mesRuntime
     */
    public function __construct(array $store, array $orders = [], array $mesRuntime = [])
    {
        $this->store = array_merge([
            '_meta' => ['version' => 'test'],
            'customers' => [],
            'suppliers' => [],
            'parts' => [],
            'revisions' => [],
            'nc_program_releases' => [],
            'tooling_assets' => [],
        ], $store);
        $this->orders = array_merge([
            'sales_orders' => [],
            'job_orders' => [],
            'work_orders' => [],
        ], $orders);
        $this->mesRuntime = array_merge([
            'downtime_events' => [],
            'maintenance_requests' => [],
            'progress_reports' => [],
            'tooling_status' => [],
            'connector_feeds' => [],
            'machine_signals' => [],
            'mes_connectivity_events' => [],
            'machine_alarm_events' => [],
            'nc_download_receipts' => [],
            'mes_tool_preset_offsets' => [],
        ], $mesRuntime);
    }

    public function loadStore(): array
    {
        return $this->store;
    }

    public function saveStore(array $data): void
    {
        $this->store = $data;
    }

    public function loadHistory(): array
    {
        return $this->history;
    }

    public function saveHistory(array $data): void
    {
        $this->history = $data;
    }

    public function loadPending(): array
    {
        return $this->pending;
    }

    public function savePending(array $data): void
    {
        $this->pending = $data;
    }

    public function loadArchive(): array
    {
        return $this->archive;
    }

    public function saveArchive(array $data): void
    {
        $this->archive = $data;
    }

    public function loadOrders(): array
    {
        return $this->orders;
    }

    public function loadMesRuntime(): array
    {
        return $this->mesRuntime;
    }
}
