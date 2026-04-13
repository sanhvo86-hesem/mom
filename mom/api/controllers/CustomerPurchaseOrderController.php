<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Api\Services\IdempotencyService;
use MOM\Api\Services\RecordConflictException;
use MOM\Services\CustomerPurchaseOrderService;
use Throwable;

final class CustomerPurchaseOrderController extends BaseController
{
    private ?CustomerPurchaseOrderService $customerPurchaseOrderService = null;
    private ?IdempotencyService $idempotencyService = null;
    private ?array $orderConfig = null;

    private function customerPurchaseOrders(): CustomerPurchaseOrderService
    {
        if ($this->customerPurchaseOrderService === null) {
            $this->customerPurchaseOrderService = new CustomerPurchaseOrderService($this->dataDir);
        }

        return $this->customerPurchaseOrderService;
    }

    private function idempotency(): IdempotencyService
    {
        if ($this->idempotencyService === null) {
            $this->idempotencyService = new IdempotencyService($this->dataDir);
        }

        return $this->idempotencyService;
    }

    /**
     * @return array<string, mixed>
     */
    private function loadOrderConfig(): array
    {
        if ($this->orderConfig !== null) {
            return $this->orderConfig;
        }

        $configFile = $this->confDir . '/so_jo_wo_config.json';
        $this->orderConfig = $this->readJsonFile($configFile) ?? [
            'roles' => [
                'admin' => ['so_read', 'so_write', 'jo_read', 'jo_write', 'wo_read', 'wo_write', 'link_form'],
                'doc_controller' => ['so_read', 'jo_read', 'jo_write', 'wo_read', 'link_form'],
                'quality' => ['so_read', 'jo_read', 'wo_read', 'link_form'],
                'production' => ['jo_read', 'wo_read', 'link_form'],
                'engineering' => ['jo_read', 'wo_read'],
                'viewer' => ['so_read', 'jo_read'],
            ],
        ];

        return $this->orderConfig;
    }

    private function normalizeOrderRole(string $role): string
    {
        static $map = [
            'general_director' => 'ceo',
            'deputy_director' => 'production_director',
            'prod_manager' => 'cnc_workshop_manager',
            'prod_supervisor' => 'shift_leader',
            'qms_supervisor' => 'qms_engineer',
            'doc_controller' => 'qms_engineer',
            'planning_officer' => 'production_planner',
            'planner' => 'production_planner',
            'qa_manager' => 'quality_manager',
        ];

        return $map[$role] ?? $role;
    }

    private function hasOrderPermission(array $user, string $permission): bool
    {
        if (user_is_admin($user)) {
            return true;
        }

        $config = $this->loadOrderConfig();
        $role = $this->normalizeOrderRole((string)($user['role'] ?? 'viewer'));
        if (in_array($role, ['admin', 'it_admin', 'ceo', 'qa_manager', 'quality_manager'], true)) {
            return true;
        }

        $legacyRoles = $config['roles'] ?? [];
        if (is_array($legacyRoles) && $legacyRoles !== []) {
            $perms = $legacyRoles[$role] ?? $legacyRoles['viewer'] ?? [];
            return in_array($permission, $perms, true);
        }

        return false;
    }

    private function requireCustomerPoRead(array $user): void
    {
        if ($this->hasAnyPermission($user, ['commercial_customer.customer_purchase_orders.read'])) {
            return;
        }
        if (!$this->hasOrderPermission($user, 'so_read')) {
            $this->error('forbidden', 403, 'Missing permission: customer_po_read');
        }
    }

    private function requireCustomerPoWrite(array $user): void
    {
        if ($this->hasAnyPermission($user, ['commercial_customer.customer_purchase_orders.create', 'commercial_customer.customer_purchase_orders.update'])) {
            return;
        }
        if (!$this->hasOrderPermission($user, 'so_write')) {
            $this->error('forbidden', 403, 'Missing permission: customer_po_write');
        }
    }

    private function userId(array $user): string
    {
        return (string)($user['username'] ?? $user['user'] ?? 'unknown');
    }

    private function parseIdempotencyKey(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (!is_scalar($value)) {
            $this->error('invalid_idempotency_key', 400);
        }

        $text = trim((string)$value);
        if ($text === '') {
            return null;
        }
        if (strlen($text) > 200 || preg_match('/^[A-Za-z0-9._:\-]+$/', $text) !== 1) {
            $this->error('invalid_idempotency_key', 400);
        }

        return $text;
    }

    /**
     * @param array<string, mixed> $body
     * @return array<string, mixed>
     */
    private function createIdempotency(array $body, string $actorPartyId): array
    {
        $explicitKey = $this->parseIdempotencyKey($this->requestHeader('Idempotency-Key'))
            ?? $this->parseIdempotencyKey($this->query('idempotency_key'))
            ?? $this->parseIdempotencyKey($this->query('request_id'))
            ?? $this->parseIdempotencyKey($body['idempotency_key'] ?? null)
            ?? $this->parseIdempotencyKey($body['request_id'] ?? null);

        $fingerprint = [
            'customer_id' => trim((string)($body['customer_id'] ?? '')),
            'customer_po_number' => trim((string)($body['customer_po_number'] ?? $body['customer_po'] ?? '')),
            'body' => $body,
        ];

        if ($explicitKey !== null) {
            return [
                'scope_key' => implode('|', ['customer_purchase_order', 'create', $actorPartyId]),
                'key' => $explicitKey,
                'key_source' => 'header_or_body',
                'mode' => 'client_token',
                'kind' => 'create',
                'domain' => 'commercial_customer',
                'table' => 'customer_purchase_orders',
                'user_id' => $actorPartyId,
                'fingerprint' => $fingerprint,
            ];
        }

        return [
            'scope_key' => implode('|', ['customer_purchase_order', 'create', $actorPartyId]),
            'key' => 'drv-customer-po-create-' . hash('sha256', json_encode($fingerprint, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: ''),
            'key_source' => 'derived:customer_id+customer_po_number+payload_retry_window',
            'mode' => 'derived_payload_window',
            'kind' => 'create',
            'domain' => 'commercial_customer',
            'table' => 'customer_purchase_orders',
            'user_id' => $actorPartyId,
            'ttl_seconds' => $this->idempotency()->retryWindowSeconds(),
            'fingerprint' => $fingerprint,
        ];
    }

    /**
     * @param array<string, mixed> $body
     * @return array<string, mixed>
     */
    private function transitionIdempotency(string $customerPoId, array $body, string $actorPartyId): array
    {
        $explicitKey = $this->parseIdempotencyKey($this->requestHeader('Idempotency-Key'))
            ?? $this->parseIdempotencyKey($this->query('idempotency_key'))
            ?? $this->parseIdempotencyKey($this->query('request_id'))
            ?? $this->parseIdempotencyKey($body['idempotency_key'] ?? null)
            ?? $this->parseIdempotencyKey($body['request_id'] ?? null);

        $fingerprint = [
            'customer_po_id' => $customerPoId,
            'transition' => trim((string)($body['transition'] ?? '')),
            'body' => $body,
        ];

        if ($explicitKey !== null) {
            return [
                'scope_key' => implode('|', ['customer_purchase_order', 'transition', $customerPoId, $actorPartyId]),
                'key' => $explicitKey,
                'key_source' => 'header_or_body',
                'mode' => 'client_token',
                'kind' => 'transition',
                'domain' => 'commercial_customer',
                'table' => 'customer_purchase_orders',
                'user_id' => $actorPartyId,
                'fingerprint' => $fingerprint,
            ];
        }

        return [
            'scope_key' => implode('|', ['customer_purchase_order', 'transition', $customerPoId, $actorPartyId]),
            'key' => 'drv-customer-po-transition-' . hash('sha256', json_encode($fingerprint, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: ''),
            'key_source' => 'derived:identity+payload_retry_window',
            'mode' => 'derived_identity_window',
            'kind' => 'transition',
            'domain' => 'commercial_customer',
            'table' => 'customer_purchase_orders',
            'user_id' => $actorPartyId,
            'ttl_seconds' => $this->idempotency()->retryWindowSeconds(),
            'fingerprint' => $fingerprint,
        ];
    }

    public function listPurchaseOrders(): never
    {
        $user = $this->requireAuth();
        $this->requireCustomerPoRead($user);

        $filters = [
            'status' => $this->query('status'),
            'customer_id' => $this->query('customer_id'),
            'so_number' => $this->query('so_number'),
            'search' => $this->query('search') ?? $this->query('q'),
            'org_id' => $_SESSION['org_id'] ?? null,
        ];

        // Apply pagination limit: max 200 records per request (COM-006)
        $offset = max(0, (int)($this->query('offset', '0')));
        $limit = min(200, max(1, (int)($this->query('limit', '50'))));

        try {
            $allPOs = $this->customerPurchaseOrders()->listPurchaseOrders($filters);
            $total = count($allPOs);
            $pagedPOs = array_slice($allPOs, $offset, $limit);

            $this->paginated('customer_purchase_orders', array_values($pagedPOs), $total, $offset, $limit);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('customer_purchase_order_list_failed', 500, $e->getMessage());
        }
    }

    public function getPurchaseOrder(): never
    {
        $user = $this->requireAuth();
        $this->requireCustomerPoRead($user);

        $customerPoId = trim((string)($this->query('customerPoId') ?? ''));
        if ($customerPoId === '') {
            $this->error('missing_customer_po_id', 400);
        }

        try {
            $record = $this->customerPurchaseOrders()->getPurchaseOrder($customerPoId);
            if ($record === null) {
                $this->error('customer_purchase_order_not_found', 404);
            }

            // COM-001: Verify ownership before returning record (org/customer scoping)
            $sessionOrgId = $_SESSION['org_id'] ?? null;
            $recordOrgId = $record['org_id'] ?? null;
            if ($sessionOrgId !== null && $recordOrgId !== null && $recordOrgId !== $sessionOrgId) {
                $this->error('forbidden', 403, 'You do not have access to this customer purchase order.');
            }

            $this->success(['customer_purchase_order' => $record]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('customer_purchase_order_detail_failed', 500, $e->getMessage());
        }
    }

    public function createPurchaseOrder(): never
    {
        $user = $this->requireAuth();
        $this->requireCustomerPoWrite($user);
        $this->requireCsrf();

        try {
            $body = $this->jsonBody();
            $execution = $this->idempotency()->execute(
                $this->createIdempotency($body, $this->userId($user)),
                function () use ($body, $user): array {
                    $record = $this->customerPurchaseOrders()->createPurchaseOrder($body, $this->userId($user));
                    return [
                        'status_code' => 201,
                        'payload' => ['customer_purchase_order' => $record],
                    ];
                }
            );
            $this->success((array)($execution['payload'] ?? []), (int)($execution['status_code'] ?? 201));
        } catch (RecordConflictException $e) {
            $this->error('customer_purchase_order_idempotency_conflict', 409, $e->getMessage());
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('customer_purchase_order_create_failed', 500, $e->getMessage());
        }
    }

    public function transitionPurchaseOrder(): never
    {
        $user = $this->requireAuth();
        $this->requireCustomerPoWrite($user);
        $this->requireCsrf();

        $customerPoId = trim((string)($this->query('customerPoId') ?? ''));
        if ($customerPoId === '') {
            $this->error('missing_customer_po_id', 400);
        }

        try {
            // COM-001: Verify ownership before transition
            $record = $this->customerPurchaseOrders()->getPurchaseOrder($customerPoId);
            if ($record === null) {
                $this->error('customer_purchase_order_not_found', 404);
            }

            $sessionOrgId = $_SESSION['org_id'] ?? null;
            $recordOrgId = $record['org_id'] ?? null;
            if ($sessionOrgId !== null && $recordOrgId !== null && $recordOrgId !== $sessionOrgId) {
                $this->error('forbidden', 403, 'You do not have access to this customer purchase order.');
            }

            $body = $this->jsonBody();
            $transition = trim((string)($body['transition'] ?? ''));
            if ($transition === '') {
                $this->error('missing_transition', 400);
            }

            $execution = $this->idempotency()->execute(
                $this->transitionIdempotency($customerPoId, $body, $this->userId($user)),
                function () use ($customerPoId, $body, $user): array {
                    $record = $this->customerPurchaseOrders()->transitionPurchaseOrder(
                        $customerPoId,
                        (string)($body['transition'] ?? ''),
                        $this->userId($user),
                        $body
                    );
                    return [
                        'status_code' => 200,
                        'payload' => ['customer_purchase_order' => $record],
                    ];
                }
            );
            $this->success((array)($execution['payload'] ?? []), (int)($execution['status_code'] ?? 200));
        } catch (RecordConflictException $e) {
            $this->error('customer_purchase_order_transition_idempotency_conflict', 409, $e->getMessage());
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('customer_purchase_order_transition_failed', 500, $e->getMessage());
        }
    }
}
