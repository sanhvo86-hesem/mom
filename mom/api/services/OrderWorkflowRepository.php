<?php

declare(strict_types=1);

namespace MOM\Services;

/**
 * Persistence boundary for order workflow state and side-effect records.
 */
interface OrderWorkflowRepository
{
    /**
     * @return array<string, mixed>
     */
    public function loadConfig(): array;

    /**
     * @return array<int, array<string, mixed>>
     */
    public function loadUsers(): array;

    /**
     * @return array<string, mixed>
     */
    public function loadOrders(): array;

    /**
     * @param array<string, mixed> $data
     */
    public function saveOrders(array $data): void;

    /**
     * @param array<string, mixed> $event
     */
    public function appendImmutableAuditEvent(string $orderType, string $orderId, array $event): void;

    /**
     * @param array<string, mixed> $notification
     */
    public function appendOrderNotification(array $notification): void;
}
