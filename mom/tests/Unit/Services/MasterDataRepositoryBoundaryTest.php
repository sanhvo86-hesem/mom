<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Services\MasterDataRepository;
use MOM\Services\MasterDataAuthorityModeService;
use MOM\Services\MasterDataService;
use PHPUnit\Framework\TestCase;

final class MasterDataRepositoryBoundaryTest extends TestCase
{
    public function testDirectCreateRequiresDomainCommandGateway(): void
    {
        $repository = new InMemoryMasterDataRepository([
            'parts' => [[
                'part_number' => 'PART-001',
                'status' => 'draft',
            ]],
        ]);
        $service = $this->service($repository);

        $result = $service->create('parts', ['part_number' => 'PART-001'], 'planner');

        $this->assertFalse($result->ok);
        $this->assertSame('domain_command_required', $result->errorCode);
        $this->assertSame('DomainCommandGateway', $result->data['authority'] ?? null);
    }

    public function testDirectUpdateRequiresDomainCommandGateway(): void
    {
        $repository = new InMemoryMasterDataRepository([
            'parts' => [[
                'part_number' => 'PART-002',
                'description' => 'Old description',
                'status' => 'active',
            ]],
        ]);
        $service = $this->service($repository);

        $queued = $service->update('parts', 'PART-002', ['description' => 'New description'], 'planner', 'drawing update');

        $this->assertFalse($queued->ok);
        $this->assertSame('domain_command_required', $queued->errorCode);
        $this->assertSame('Old description', $repository->store['parts'][0]['description'] ?? null);
    }

    public function testDirectDeleteRequiresDomainCommandGatewayBeforeReferentialChecks(): void
    {
        $repository = new InMemoryMasterDataRepository(
            ['parts' => [['part_number' => 'PART-003', 'status' => 'draft']]],
            ['job_orders' => [['jo_number' => 'JO-001', 'part_number' => 'PART-003']]],
        );
        $service = $this->service($repository);

        $result = $service->delete('parts', 'PART-003', 'planner');

        $this->assertFalse($result->ok);
        $this->assertSame('domain_command_required', $result->errorCode);
        $this->assertSame('PART-003', $repository->store['parts'][0]['part_number'] ?? null);
    }

    public function testReadDetailRemainsAllowedForProjectionUse(): void
    {
        $repository = new InMemoryMasterDataRepository([
            'suppliers' => [[
                'supplier_id' => 'SUP-001',
                'supplier_name' => 'Supplier One',
                'status' => 'approved',
            ]],
        ]);
        $service = $this->service($repository);

        $result = $service->getRecord('suppliers', 'SUP-001');

        $this->assertSame('SUP-001', $result['supplier_id'] ?? null);
        $this->assertSame('Supplier One', $result['supplier_name'] ?? null);
    }

    private function service(InMemoryMasterDataRepository $repository): MasterDataService
    {
        return new MasterDataService(
            sys_get_temp_dir(),
            repository: $repository,
            authorityMode: new MasterDataAuthorityModeService(sys_get_temp_dir(), null, [
                'use_postgres' => true,
                'shadow_write' => false,
                'json_fallback' => false,
            ]),
        );
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
