<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Services\OrderWorkflowRepository;
use MOM\Services\OrderWorkflowService;
use PHPUnit\Framework\TestCase;

final class OrderWorkflowRepositoryBoundaryTest extends TestCase
{
    public function testTransitionPersistsThroughRepositoryBoundary(): void
    {
        $repository = new InMemoryOrderWorkflowRepository([
            'sales_orders' => [[
                'so_number' => 'SO-BOUNDARY-001',
                'status' => 'confirmed',
                'status_history' => [],
                'change_history' => [],
            ]],
            'job_orders' => [],
            'work_orders' => [],
        ]);
        $service = new OrderWorkflowService(sys_get_temp_dir(), repository: $repository);

        $result = $service->executeTransition('so', 'SO-BOUNDARY-001', 'in_production', 'qa-user', 'release');

        $this->assertTrue($result->ok, $result->message);
        $saved = $repository->orders['sales_orders'][0] ?? [];
        $this->assertSame('in_production', $saved['status'] ?? null);
        $this->assertCount(1, (array)($saved['status_history'] ?? []));
        $this->assertCount(1, (array)($saved['change_history'] ?? []));
        $this->assertCount(1, $repository->auditEvents);
        $this->assertCount(1, $repository->notifications);
        $this->assertSame('order_transition', $repository->notifications[0]['type'] ?? null);
    }

    public function testQuantityGuardBlocksBeforeRepositoryMutation(): void
    {
        $repository = new InMemoryOrderWorkflowRepository([
            'sales_orders' => [],
            'job_orders' => [],
            'work_orders' => [[
                'wo_number' => 'WO-BOUNDARY-001',
                'status' => 'scheduled',
                'qty_ordered' => 5,
                'qty_completed' => 0,
                'qty_scrap' => 0,
            ]],
        ]);
        $service = new OrderWorkflowService(sys_get_temp_dir(), repository: $repository);

        $result = $service->executeTransition('wo', 'WO-BOUNDARY-001', 'completed', 'qa-user', 'complete');

        $this->assertFalse($result->ok);
        $this->assertSame('qty_not_reported', $result->errorCode);
        $this->assertSame('scheduled', $repository->orders['work_orders'][0]['status'] ?? null);
        $this->assertSame(0, $repository->saveCount);
        $this->assertSame([], $repository->auditEvents);
    }

    public function testReleasedEcrFieldCanBeUnlockedByChangeAuthority(): void
    {
        $repository = new InMemoryOrderWorkflowRepository([
            'sales_orders' => [],
            'job_orders' => [[
                'jo_number' => 'JO-AUTH-001',
                'status' => 'released',
                'part_revision' => 'A',
            ]],
            'work_orders' => [],
        ]);
        $service = new OrderWorkflowService(
            sys_get_temp_dir(),
            db: new ReleasedChangeAuthorityFakeDb(),
            repository: $repository,
        );

        $result = $service->validateFieldEdit(
            'jo',
            'JO-AUTH-001',
            'part_revision',
            'B',
            'qa_manager',
            ['change_order_number' => 'ECO-001', 'requested_effect' => 'amend'],
        );

        $this->assertTrue($result->ok, $result->message);
    }

    public function testRunningOrderRejectsBroadLegacyChangeAuthority(): void
    {
        $repository = new InMemoryOrderWorkflowRepository([
            'sales_orders' => [],
            'job_orders' => [[
                'jo_number' => 'JO-AUTH-003',
                'status' => 'running',
                'part_revision' => 'A',
            ]],
            'work_orders' => [],
        ]);
        $service = new OrderWorkflowService(
            sys_get_temp_dir(),
            db: new BroadLegacyReleasedChangeAuthorityFakeDb(),
            repository: $repository,
        );

        $result = $service->validateFieldEdit(
            'jo',
            'JO-AUTH-003',
            'part_revision',
            'B',
            'qa_manager',
            ['change_order_number' => 'ECO-001', 'requested_effect' => 'amend'],
        );

        $this->assertFalse($result->ok);
        $this->assertSame('change_authority_required', $result->errorCode);
    }

    public function testRunningOrderCanBeUnlockedOnlyByExactCanonicalChangeAuthority(): void
    {
        $repository = new InMemoryOrderWorkflowRepository([
            'sales_orders' => [],
            'job_orders' => [[
                'jo_number' => 'JO-AUTH-003',
                'status' => 'running',
                'part_revision' => 'A',
            ]],
            'work_orders' => [],
        ]);
        $service = new OrderWorkflowService(
            sys_get_temp_dir(),
            db: new ReleasedChangeAuthorityFakeDb('JO-AUTH-003'),
            repository: $repository,
        );

        $result = $service->validateFieldEdit(
            'jo',
            'JO-AUTH-003',
            'part_revision',
            'B',
            'qa_manager',
            ['change_order_number' => 'ECO-001', 'requested_effect' => 'amend'],
        );

        $this->assertTrue($result->ok, $result->message);
    }

    public function testEveryPostReleaseFieldRequiresReleasedChangeAuthority(): void
    {
        $repository = new InMemoryOrderWorkflowRepository([
            'sales_orders' => [],
            'job_orders' => [[
                'jo_number' => 'JO-AUTH-002',
                'status' => 'active',
                'due_date' => '2026-05-01',
            ]],
            'work_orders' => [],
        ]);
        $service = new OrderWorkflowService(sys_get_temp_dir(), repository: $repository);

        $result = $service->validateFieldEdit(
            'jo',
            'JO-AUTH-002',
            'due_date',
            '2026-05-02',
            'qa_manager',
        );

        $this->assertFalse($result->ok);
        $this->assertContains($result->errorCode, ['change_authority_required', 'change_authority_unavailable']);
    }
}

final class InMemoryOrderWorkflowRepository implements OrderWorkflowRepository
{
    /** @var array<string, mixed> */
    public array $orders;

    /** @var array<int, array<string, mixed>> */
    public array $auditEvents = [];

    /** @var array<int, array<string, mixed>> */
    public array $notifications = [];

    public int $saveCount = 0;

    /**
     * @param array<string, mixed> $orders
     */
    public function __construct(array $orders)
    {
        $this->orders = array_merge([
            '_meta' => ['version' => 'test'],
            'sales_orders' => [],
            'job_orders' => [],
            'work_orders' => [],
        ], $orders);
    }

    public function loadConfig(): array
    {
        return [
            'status_flow' => [
                'so' => [
                    'transitions' => [
                        'confirmed' => ['in_production'],
                    ],
                ],
                'wo' => [
                    'transitions' => [
                        'scheduled' => ['completed'],
                    ],
                ],
            ],
            'sales_order' => [
                'roles_edit' => ['qa_manager'],
            ],
            'work_order' => [
                'roles_edit' => ['qa_manager'],
            ],
            'job_order' => [
                'roles_edit' => ['qa_manager'],
            ],
        ];
    }

    public function loadUsers(): array
    {
        return [[
            'username' => 'qa-user',
            'role' => 'qa_manager',
        ]];
    }

    public function loadOrders(): array
    {
        return $this->orders;
    }

    public function saveOrders(array $data): void
    {
        $this->orders = $data;
        $this->saveCount++;
    }

    public function appendImmutableAuditEvent(string $orderType, string $orderId, array $event): void
    {
        $event['order_type'] = $orderType;
        $event['order_id'] = $orderId;
        $this->auditEvents[] = $event;
    }

    public function appendOrderNotification(array $notification): void
    {
        $this->notifications[] = $notification;
    }
}

final class ReleasedChangeAuthorityFakeDb
{
    public function __construct(private readonly string $objectId = 'JO-AUTH-001')
    {
    }

    /**
     * @param array<string, mixed> $params
     * @return array<int, array<string, mixed>>
     */
    public function query(string $sql, array $params = []): array
    {
        if (str_contains($sql, 'eqms_field_governance_rule')) {
            return [[
                'object_type' => 'jo',
                'field_path' => 'part_revision',
                'lifecycle_state' => 'released',
                'governance_class' => 'post_release_locked',
                'change_required' => true,
                'signature_required' => true,
                'warn_only' => false,
                'metadata' => '{}',
            ]];
        }

        if (str_contains($sql, 'plm_change_affected_objects')) {
            return [[
                'plm_change_order_id' => '00000000-0000-4000-8000-000000000001',
                'change_order_number' => 'ECO-001',
                'status' => 'released',
                'object_id' => $this->objectId,
                'allowed_effect' => 'amend',
                'affected_fields' => '{part_revision}',
                'plm_change_effectivity_id' => '00000000-0000-4000-8000-000000000002',
                'effectivity_scope' => ['order_id' => $this->objectId],
                'effective_from' => '2026-04-14T00:00:00Z',
                'effective_to' => null,
                'authority_source' => 'affected_object',
            ]];
        }

        return [];
    }
}

final class BroadLegacyReleasedChangeAuthorityFakeDb
{
    /**
     * @param array<string, mixed> $params
     * @return array<int, array<string, mixed>>
     */
    public function query(string $sql, array $params = []): array
    {
        if (str_contains($sql, 'eqms_field_governance_rule')) {
            return [[
                'object_type' => 'jo',
                'field_path' => 'part_revision',
                'lifecycle_state' => 'released',
                'governance_class' => 'post_release_locked',
                'change_required' => true,
                'signature_required' => true,
                'warn_only' => false,
                'metadata' => '{}',
            ]];
        }

        if (str_contains($sql, 'eqms_change_affected_object')) {
            return [[
                'plm_change_order_id' => '00000000-0000-4000-8000-000000000001',
                'change_order_number' => 'ECO-001',
                'status' => 'released',
                'object_id' => '*',
                'allowed_effect' => 'revise',
                'effectivity_rule' => '{}',
                'affected_fields' => '{}',
                'authority_source' => 'affected_object',
            ]];
        }

        return [];
    }
}
