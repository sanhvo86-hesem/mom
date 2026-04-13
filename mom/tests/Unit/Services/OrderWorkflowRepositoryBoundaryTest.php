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
