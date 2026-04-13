<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

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
