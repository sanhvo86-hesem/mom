<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Api\Controllers\BaseController;
use MOM\Services\CustomerPurchaseOrderService;
use MOM\Services\OrderService;
use MOM\Services\OrderWorkflowService;
use MOM\Services\ShipmentGateService;
use Throwable;

/**
 * Order controller for HESEM MOM Portal.
 *
 * Provides API endpoints for Sales Orders (SO), Job Orders (JO),
 * Work Orders (WO), order hierarchy browsing, form-to-job linking,
 * and order dashboard statistics.
 *
 * Access is role-based according to `so_jo_wo_config.json`.
 *
 * @package MOM\Api\Controllers
 * @since   3.0.0
 */
class OrderController extends BaseController
{
    /** @var OrderService|null Lazy-loaded order service. */
    private ?OrderService $orderService = null;

    /** @var OrderWorkflowService|null Lazy-loaded workflow service. */
    private ?OrderWorkflowService $workflowService = null;

    /** @var CustomerPurchaseOrderService|null Lazy-loaded canonical customer PO service. */
    private ?CustomerPurchaseOrderService $customerPurchaseOrderService = null;

    /** @var array|null Cached SO/JO/WO config. */
    private ?array $orderConfig = null;

    // â”€â”€ Service Access â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * Get or create the OrderService instance.
     *
     * @return OrderService
     */
    private function orderService(): OrderService
    {
        if ($this->orderService === null) {
            $this->orderService = new OrderService($this->dataDir);
        }
        return $this->orderService;
    }

    /**
     * Get or create the OrderWorkflowService instance.
     */
    private function workflowService(): OrderWorkflowService
    {
        if ($this->workflowService === null) {
            $this->workflowService = new OrderWorkflowService($this->dataDir);
        }
        return $this->workflowService;
    }

    private function customerPurchaseOrders(): CustomerPurchaseOrderService
    {
        if ($this->customerPurchaseOrderService === null) {
            $this->customerPurchaseOrderService = new CustomerPurchaseOrderService($this->dataDir);
        }

        return $this->customerPurchaseOrderService;
    }

    /**
     * Get user identifier string.
     */
    private function userId(array $user): string
    {
        return (string)($user['username'] ?? $user['user'] ?? 'unknown');
    }

    /**
     * Get primary user role string.
     */
    private function userRole(array $user): string
    {
        if (is_array($user['roles'] ?? null) && !empty($user['roles'])) {
            return (string)$user['roles'][0];
        }

        return (string)($user['role'] ?? '');
    }

    /**
     * Load the SO/JO/WO access control configuration.
     *
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
                'admin'          => ['so_read', 'so_write', 'jo_read', 'jo_write', 'wo_read', 'wo_write', 'link_form'],
                'doc_controller' => ['so_read', 'jo_read', 'jo_write', 'wo_read', 'link_form'],
                'quality'        => ['so_read', 'jo_read', 'wo_read', 'link_form'],
                'production'     => ['jo_read', 'wo_read', 'link_form'],
                'engineering'    => ['jo_read', 'wo_read'],
                'viewer'         => ['so_read', 'jo_read'],
            ],
        ];

        return $this->orderConfig;
    }

    /**
     * Check if the user has a specific order permission.
     *
     * @param array  $user       User record.
     * @param string $permission Permission key (e.g. 'so_read', 'link_form').
     * @return bool
     */
    private function hasOrderPermission(array $user, string $permission): bool
    {
        $config = $this->loadOrderConfig();
        $role   = $this->normalizeOrderRole((string)($user['role'] ?? 'viewer'));

        if (in_array($role, ['admin', 'it_admin', 'ceo', 'qa_manager', 'quality_manager'], true)) {
            return true;
        }

        $legacyRoles = $config['roles'] ?? [];
        if (is_array($legacyRoles) && $legacyRoles !== []) {
            $perms = $legacyRoles[$role] ?? $legacyRoles['viewer'] ?? [];
            return in_array($permission, $perms, true);
        }

        $permissionMap = [
            'so_read' => ['node' => 'sales_order', 'keys' => ['roles_view', 'roles_edit', 'roles_create', 'roles_delete']],
            'so_write' => ['node' => 'sales_order', 'keys' => ['roles_edit', 'roles_create', 'roles_delete']],
            'jo_read' => ['node' => 'job_order', 'keys' => ['roles_view', 'roles_edit', 'roles_create', 'roles_delete']],
            'jo_write' => ['node' => 'job_order', 'keys' => ['roles_edit', 'roles_create', 'roles_delete']],
            'wo_read' => ['node' => 'work_order', 'keys' => ['roles_view', 'roles_edit', 'roles_create', 'roles_delete']],
            'wo_write' => ['node' => 'work_order', 'keys' => ['roles_edit', 'roles_create', 'roles_delete']],
        ];

        if ($permission === 'link_form') {
            foreach (['jo_read', 'jo_write', 'wo_read', 'wo_write'] as $derivedPermission) {
                if ($this->hasOrderPermission($user, $derivedPermission)) {
                    return true;
                }
            }
            return false;
        }

        $meta = $permissionMap[$permission] ?? null;
        if ($meta === null) {
            return false;
        }

        $node = $config[$meta['node']] ?? [];
        $allowedRoles = [];
        foreach ($meta['keys'] as $key) {
            foreach ((array)($node[$key] ?? []) as $allowedRole) {
                $allowedRoles[] = $this->normalizeOrderRole((string)$allowedRole);
            }
        }

        return in_array($role, array_values(array_unique($allowedRoles)), true);
    }

    /**
     * Normalize legacy/runtime role names to the canonical order role set.
     */
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

    /**
     * Require an order permission, terminating with 403 if missing.
     *
     * @param array  $user       User record.
     * @param string $permission Permission key.
     * @return void
     */
    private function requireOrderPermission(array $user, string $permission): void
    {
        if (!$this->hasOrderPermission($user, $permission)) {
            $this->error('forbidden', 403, "Missing permission: {$permission}");
        }
    }

    // â”€â”€ Endpoints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * GET listSalesOrders â€” List sales orders with optional filters.
     *
     * Action: `order_so_list`
     *
     * Query params:
     *   - status    (string, optional): Filter by SO status.
     *   - search    (string, optional): Filter by SO number, customer name, or customer PO.
     *   - customer  (string, optional): Legacy alias for `search`.
     *   - date_from (string, optional): Start date (YYYY-MM-DD).
     *   - date_to   (string, optional): End date (YYYY-MM-DD).
     *   - offset    (int, optional):    Pagination offset (default 0).
     *   - limit     (int, optional):    Page size (default 50, max 200).
     *
     * @return never
     */
    public function listSalesOrders(): never
    {
        $user = $this->requireAuth();
        $this->requireOrderPermission($user, 'so_read');

        $filters = [];

        $status = $this->query('status');
        if ($status !== null && $status !== '') {
            $filters['status'] = strtoupper($status);
        }

        $search = $this->query('search');
        if ($search === null || $search === '') {
            $search = $this->query('customer');
        }
        if ($search !== null && $search !== '') {
            $filters['search'] = $search;
        }

        $dateFrom = $this->query('date_from');
        if ($dateFrom !== null && preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateFrom)) {
            $filters['date_from'] = $dateFrom;
        }

        $dateTo = $this->query('date_to');
        if ($dateTo !== null && preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateTo)) {
            $filters['date_to'] = $dateTo;
        }

        $offset = max(0, (int)($this->query('offset', '0')));
        $limit  = min(200, max(1, (int)($this->query('limit', '50'))));

        try {
            $allItems = $this->orderService()->listSalesOrders($filters);
            $total    = count($allItems);
            $items    = array_slice($allItems, $offset, $limit);

            $this->paginated('sales_orders', array_values($items), $total, $offset, $limit);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('so_list_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET getSalesOrderDetail â€” Get full details of a single Sales Order.
     *
     * Action: `order_so_detail`
     *
     * Query params:
     *   - so_number (string, required): Sales Order number (e.g. "SO-2026-0150").
     *
     * @return never
     */
    public function getSalesOrderDetail(): never
    {
        $user = $this->requireAuth();
        $this->requireOrderPermission($user, 'so_read');

        $soNumber = $this->query('so_number');
        if ($soNumber === null || trim($soNumber) === '') {
            $this->error('missing_so_number', 400);
        }

        $soNumber = trim($soNumber);

        try {
            $so = $this->orderService()->getSalesOrder($soNumber);
            if ($so === null) {
                $this->error('not_found', 404, "Sales Order {$soNumber} not found.");
            }

            $this->success(['sales_order' => $so]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('so_detail_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET listJobOrders â€” List job orders with optional SO and status filters.
     *
     * Action: `order_jo_list`
     *
     * Query params:
     *   - so_number (string, optional): Filter by parent SO number.
     *   - status    (string, optional): Filter by JO status.
     *   - part      (string, optional): Filter by part number (partial match).
     *   - offset    (int, optional):    Pagination offset (default 0).
     *   - limit     (int, optional):    Page size (default 50, max 200).
     *
     * @return never
     */
    public function listJobOrders(): never
    {
        $user = $this->requireAuth();
        $this->requireOrderPermission($user, 'jo_read');

        $soNumber = $this->query('so_number');
        if ($soNumber !== null && trim($soNumber) === '') {
            $soNumber = null;
        }

        $filters = [];

        $status = $this->query('status');
        if ($status !== null && $status !== '') {
            $filters['status'] = strtoupper($status);
        }

        $part = $this->query('part');
        if ($part !== null && $part !== '') {
            $filters['part'] = $part;
        }

        $offset = max(0, (int)($this->query('offset', '0')));
        $limit  = min(200, max(1, (int)($this->query('limit', '50'))));

        try {
            $allItems = $this->orderService()->listJobOrders($soNumber, $filters);
            $total    = count($allItems);
            $items    = array_slice($allItems, $offset, $limit);

            $this->paginated('job_orders', array_values($items), $total, $offset, $limit);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('jo_list_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET getJobOrderDetail â€” Get full details of a single Job Order.
     *
     * Action: `order_jo_detail`
     *
     * Returns the JO with its operations (WOs) and all linked form records.
     *
     * Query params:
     *   - jo_number (string, required): Job Order number (e.g. "JOB-2026-0042").
     *
     * @return never
     */
    public function getJobOrderDetail(): never
    {
        $user = $this->requireAuth();
        $this->requireOrderPermission($user, 'jo_read');

        $joNumber = $this->query('jo_number');
        if ($joNumber === null || trim($joNumber) === '') {
            $this->error('missing_jo_number', 400);
        }

        $joNumber = trim($joNumber);

        try {
            $jo = $this->orderService()->getJobOrder($joNumber);
            if ($jo === null) {
                $this->error('not_found', 404, "Job Order {$joNumber} not found.");
            }

            // Enrich with linked forms
            $jo['linked_forms'] = $this->orderService()->getLinkedForms($joNumber);

            $this->success(['job_order' => $jo]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('jo_detail_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET getHierarchy â€” Get the full SO -> JO -> WO hierarchy tree.
     *
     * Action: `order_hierarchy`
     *
     * Query params:
     *   - so_number (string, optional): Filter to a single SO tree.
     *
     * @return never
     */
    public function getHierarchy(): never
    {
        $user = $this->requireAuth();
        $this->requireOrderPermission($user, 'so_read');

        $soNumber = $this->query('so_number');
        if ($soNumber !== null && trim($soNumber) === '') {
            $soNumber = null;
        }

        try {
            $tree = $this->orderService()->getHierarchy($soNumber);

            $this->success(['hierarchy' => $tree]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('hierarchy_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST linkForm â€” Link a form record to a Job Order.
     *
     * Action: `order_link_form`
     *
     * Request body:
     *   - jo_number (string, required): Job Order number.
     *   - form_code (string, required): Form code (e.g. "FRM-631").
     *   - record_id (string, required): Record-ID (e.g. "NCR-2026-043").
     *
     * @return never
     */
    public function linkForm(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireOrderPermission($user, 'link_form');

        $body = $this->jsonBody();
        $this->requireFields($body, ['jo_number', 'form_code', 'record_id']);

        $joNumber = trim((string)($body['jo_number'] ?? ''));
        $formCode = strtoupper(trim((string)($body['form_code'] ?? '')));
        $recordId = trim((string)($body['record_id'] ?? ''));
        $userId   = (string)($user['username'] ?? $user['user'] ?? 'unknown');

        $this->validatePattern($joNumber, '/^JOB-\d{4}-\d{4}$/', 'invalid_jo_number');
        $this->validatePattern($formCode, '/^FRM-\d{3}$/', 'invalid_form_code');

        try {
            $success = $this->orderService()->linkFormToJob($joNumber, $formCode, $recordId);

            if (!$success) {
                $this->error('link_failed', 400, 'Job Order not found or link already exists.');
            }

            $this->auditLog('order_link_form', [
                'jo_number' => $joNumber,
                'form_code' => $formCode,
                'record_id' => $recordId,
            ], $userId);

            $this->success(['linked' => true]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('link_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET getDashboardStats â€” Get order-related dashboard statistics.
     *
     * Action: `order_dashboard_stats`
     *
     * Returns KPIs: active SOs, active JOs, on-time percentage, overdue count.
     *
     * @return never
     */
    public function getDashboardStats(): never
    {
        $user = $this->requireAuth();
        $this->requireOrderPermission($user, 'so_read');

        try {
            $stats = $this->orderService()->getDashboardStats();

            $this->success(['stats' => $stats]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('stats_failed', 500, $e->getMessage());
        }
    }

    // â”€â”€ CRUD: Sales Orders â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * POST createSalesOrder â€” Create a new Sales Order.
     * Action: `order_so_create`
     * @return never
     */
    public function createSalesOrder(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireOrderPermission($user, 'so_write');

        $body = $this->jsonBody();
        $this->requireFields($body, ['customer_id', 'order_date', 'due_date']);

        $now = $this->nowIso();
        $uid = $this->userId($user);

        $so = [
            'so_number'      => $this->orderService()->generateOrderNumber('so'),
            'customer_id'    => trim((string)($body['customer_id'] ?? '')),
            'customer_name'  => trim((string)($body['customer_name'] ?? '')),
            'customer_site_id' => trim((string)($body['customer_site_id'] ?? '')),
            'ship_to_site_id' => trim((string)($body['ship_to_site_id'] ?? '')),
            'customer_po_id' => trim((string)($body['customer_po_id'] ?? '')),
            'customer_po'    => trim((string)($body['customer_po'] ?? $body['customer_po_number'] ?? '')),
            'customer_po_number' => trim((string)($body['customer_po_number'] ?? $body['customer_po'] ?? '')),
            'order_date'     => (string)($body['order_date'] ?? ''),
            'requested_date' => (string)($body['requested_date'] ?? ''),
            'promise_date'   => (string)($body['promise_date'] ?? ''),
            'commit_date'    => (string)($body['commit_date'] ?? ''),
            'due_date'       => (string)($body['due_date'] ?? ''),
            'total_qty'      => (int)($body['total_qty'] ?? 0),
            'total_value'    => (float)($body['total_value'] ?? 0),
            'priority'       => (string)($body['priority'] ?? 'normal'),
            'incoterm_code'  => (string)($body['incoterm_code'] ?? ''),
            'payment_term_code' => (string)($body['payment_term_code'] ?? ''),
            'shipping_method_id' => (string)($body['shipping_method_id'] ?? $body['shipping_method_code'] ?? ''),
            'shipping_method_code' => (string)($body['shipping_method_code'] ?? $body['shipping_method_id'] ?? ''),
            'special_requirements' => (string)($body['special_requirements'] ?? ''),
            'status'         => 'draft',
            'lines'          => is_array($body['lines'] ?? null) ? $body['lines'] : [],
            'created_by'     => $uid,
            'created_at'     => $now,
            'updated_at'     => $now,
            'status_history' => [['status' => 'draft', 'from' => '', 'to' => 'draft', 'timestamp' => $now, 'user' => $uid]],
            'change_history' => [],
        ];

        try {
            $saved = $this->orderService()->createSalesOrder($so);
            $linkedCustomerPo = $this->customerPurchaseOrders()->synchronizeSalesOrder($saved, $uid);
            if (is_array($linkedCustomerPo)) {
                $saved = $this->orderService()->linkCustomerPurchaseOrderToSalesOrder(
                    (string)$saved['so_number'],
                    (string)$linkedCustomerPo['customer_po_id'],
                    (string)$linkedCustomerPo['customer_po_number']
                );
            }
            $this->auditLog('order_so_create', ['so_number' => $saved['so_number']], $uid);
            $this->success(['sales_order' => $saved], 201);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('so_create_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST updateSalesOrder â€” Update an existing Sales Order.
     * Action: `order_so_update`
     * @return never
     */
    public function updateSalesOrder(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireOrderPermission($user, 'so_write');

        $body = $this->jsonBody();
        $soNumber = trim((string)($body['so_number'] ?? $this->query('so_number') ?? ''));
        if ($soNumber === '') {
            $this->error('missing_so_number', 400);
        }

        $changes = $body['changes'] ?? $body;
        unset($changes['so_number'], $changes['status'], $changes['created_at'], $changes['created_by']);

        $uid = $this->userId($user);
        $reason = trim((string)($body['reason'] ?? 'Field update'));

        try {
            $result = $this->workflowService()->executeFieldEdit('so', $soNumber, $changes, $uid, $reason);
            if (!$result->ok) {
                $this->error($result->errorCode ?? 'update_failed', 400, $result->message);
            }
            if (is_array($result->data ?? null)) {
                $this->customerPurchaseOrders()->synchronizeSalesOrder((array)$result->data, $uid);
            }
            $this->auditLog('order_so_update', ['so_number' => $soNumber, 'fields' => array_keys($changes)], $uid);
            $this->success(['sales_order' => $result->data]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('so_update_failed', 500, $e->getMessage());
        }
    }

    // â”€â”€ CRUD: Job Orders â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * POST createJobOrder â€” Create a new Job Order linked to an SO.
     * Action: `order_jo_create`
     * @return never
     */
    public function createJobOrder(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireOrderPermission($user, 'jo_write');

        $body = $this->jsonBody();
        $this->requireFields($body, ['so_number', 'part_number', 'qty_ordered', 'due_date']);

        $now = $this->nowIso();
        $uid = $this->userId($user);

        $jo = [
            'jo_number'       => $this->orderService()->generateOrderNumber('jo'),
            'so_number'       => trim((string)($body['so_number'] ?? '')),
            'part_number'     => trim((string)($body['part_number'] ?? '')),
            'part_revision'   => trim((string)($body['part_revision'] ?? '')),
            'part_description'=> trim((string)($body['part_description'] ?? '')),
            'material_spec'   => trim((string)($body['material_spec'] ?? '')),
            'qty_ordered'     => (int)($body['qty_ordered'] ?? 0),
            'start_date'      => (string)($body['start_date'] ?? ''),
            'release_target_date' => (string)($body['release_target_date'] ?? ''),
            'due_date'        => (string)($body['due_date'] ?? ''),
            'routing_id'      => (string)($body['routing_id'] ?? ''),
            'bom_id'          => (string)($body['bom_id'] ?? ''),
            'control_plan_id' => (string)($body['control_plan_id'] ?? ''),
            'inspection_plan_id' => (string)($body['inspection_plan_id'] ?? ''),
            'traveler_template_id' => (string)($body['traveler_template_id'] ?? ''),
            'engineering_release_status' => (string)($body['engineering_release_status'] ?? ''),
            'material_ready_status' => (string)($body['material_ready_status'] ?? ''),
            'quality_plan_status' => (string)($body['quality_plan_status'] ?? ''),
            'source_inspection_status' => (string)($body['source_inspection_status'] ?? ''),
            'outside_processing_status' => (string)($body['outside_processing_status'] ?? ''),
            'fai_required'    => (bool)($body['fai_required'] ?? false),
            'customer_source_inspection' => (bool)($body['customer_source_inspection'] ?? false),
            'special_process' => (string)($body['special_process'] ?? ''),
            'special_process_supplier_id' => (string)($body['special_process_supplier_id'] ?? ''),
            'status'          => 'planned',
            'created_by'      => $uid,
            'created_at'      => $now,
            'updated_at'      => $now,
            'status_history'  => [['status' => 'planned', 'from' => '', 'to' => 'planned', 'timestamp' => $now, 'user' => $uid]],
            'change_history'  => [],
        ];

        try {
            $saved = $this->orderService()->createJobOrder($jo);
            $this->auditLog('order_jo_create', ['jo_number' => $saved['jo_number'], 'so_number' => $jo['so_number']], $uid);
            $this->success(['job_order' => $saved], 201);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('jo_create_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST updateJobOrder â€” Update an existing Job Order.
     * Action: `order_jo_update`
     * @return never
     */
    public function updateJobOrder(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireOrderPermission($user, 'jo_write');

        $body = $this->jsonBody();
        $joNumber = trim((string)($body['jo_number'] ?? $this->query('jo_number') ?? ''));
        if ($joNumber === '') {
            $this->error('missing_jo_number', 400);
        }

        $changes = $body['changes'] ?? $body;
        unset($changes['jo_number'], $changes['status'], $changes['created_at'], $changes['created_by']);

        $uid = $this->userId($user);
        $reason = trim((string)($body['reason'] ?? 'Field update'));

        try {
            $result = $this->workflowService()->executeFieldEdit('jo', $joNumber, $changes, $uid, $reason);
            if (!$result->ok) {
                $this->error($result->errorCode ?? 'update_failed', 400, $result->message);
            }
            $this->auditLog('order_jo_update', ['jo_number' => $joNumber, 'fields' => array_keys($changes)], $uid);
            $this->success(['job_order' => $result->data]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('jo_update_failed', 500, $e->getMessage());
        }
    }

    // â”€â”€ CRUD: Work Orders â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * POST createWorkOrder â€” Create a new Work Order linked to a JO.
     * Action: `order_wo_create`
     * @return never
     */
    public function createWorkOrder(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireOrderPermission($user, 'wo_write');

        $body = $this->jsonBody();
        $this->requireFields($body, ['jo_number', 'operation_number', 'machine_id', 'work_center_id']);

        $now = $this->nowIso();
        $uid = $this->userId($user);

        $wo = [
            'wo_number'        => $this->orderService()->generateOrderNumber('wo'),
            'jo_number'        => trim((string)($body['jo_number'] ?? '')),
            'operation_number' => (int)($body['operation_number'] ?? 10),
            'operation_desc'   => trim((string)($body['operation_desc'] ?? '')),
            'machine_id'       => trim((string)($body['machine_id'] ?? '')),
            'work_center_id'   => trim((string)($body['work_center_id'] ?? '')),
            'operator_id'      => (string)($body['operator_id'] ?? ''),
            'nc_program_id'    => (string)($body['nc_program_id'] ?? ''),
            'setup_time_est'   => (float)($body['setup_time_est'] ?? 0),
            'run_time_est'     => (float)($body['run_time_est'] ?? 0),
            'scheduled_start'  => (string)($body['scheduled_start'] ?? ''),
            'scheduled_end'    => (string)($body['scheduled_end'] ?? ''),
            'fixture_id'       => (string)($body['fixture_id'] ?? ''),
            'dispatch_priority'=> (string)($body['dispatch_priority'] ?? 'normal'),
            'quality_gate_status' => (string)($body['quality_gate_status'] ?? ''),
            'first_piece_status' => (string)($body['first_piece_status'] ?? ''),
            'handover_status' => (string)($body['handover_status'] ?? ''),
            'material_lot_number' => (string)($body['material_lot_number'] ?? ''),
            'heat_number' => (string)($body['heat_number'] ?? ''),
            'traveler_number' => (string)($body['traveler_number'] ?? ''),
            'traveler_status' => (string)($body['traveler_status'] ?? ''),
            'material_cert_status' => (string)($body['material_cert_status'] ?? ''),
            'status'           => 'scheduled',
            'created_by'       => $uid,
            'created_at'       => $now,
            'updated_at'       => $now,
            'status_history'   => [['status' => 'scheduled', 'from' => '', 'to' => 'scheduled', 'timestamp' => $now, 'user' => $uid]],
            'change_history'   => [],
        ];

        try {
            $saved = $this->orderService()->createWorkOrder($wo);
            $this->auditLog('order_wo_create', ['wo_number' => $saved['wo_number'], 'jo_number' => $wo['jo_number']], $uid);
            $this->success(['work_order' => $saved], 201);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('wo_create_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST updateWorkOrder â€” Update an existing Work Order.
     * Action: `order_wo_update`
     * @return never
     */
    public function updateWorkOrder(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireOrderPermission($user, 'wo_write');

        $body = $this->jsonBody();
        $woNumber = trim((string)($body['wo_number'] ?? $this->query('wo_number') ?? ''));
        if ($woNumber === '') {
            $this->error('missing_wo_number', 400);
        }

        $changes = $body['changes'] ?? $body;
        unset($changes['wo_number'], $changes['status'], $changes['created_at'], $changes['created_by']);

        $uid = $this->userId($user);
        $reason = trim((string)($body['reason'] ?? 'Field update'));

        try {
            $result = $this->workflowService()->executeFieldEdit('wo', $woNumber, $changes, $uid, $reason);
            if (!$result->ok) {
                $this->error($result->errorCode ?? 'update_failed', 400, $result->message);
            }
            $this->auditLog('order_wo_update', ['wo_number' => $woNumber, 'fields' => array_keys($changes)], $uid);
            $this->success(['work_order' => $result->data]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('wo_update_failed', 500, $e->getMessage());
        }
    }

    // â”€â”€ Workflow â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * POST transition â€” Execute status transition on any order type.
     * Action: `order_transition`
     * @return never
     */
    public function transition(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['order_type', 'order_id', 'target_status']);

        $orderType = strtolower(trim((string)($body['order_type'] ?? '')));
        $orderId   = trim((string)($body['order_id'] ?? ''));
        $target    = strtolower(trim((string)($body['target_status'] ?? '')));
        $reason    = trim((string)($body['reason'] ?? ''));
        $uid       = $this->userId($user);

        if (!in_array($orderType, ['so', 'jo', 'wo'], true)) {
            $this->error('invalid_order_type', 400);
        }

        $permKey = $orderType . '_write';
        $this->requireOrderPermission($user, $permKey);

        try {
            $result = $this->workflowService()->executeTransition($orderType, $orderId, $target, $uid, $reason ?: null);
            if (!$result->ok) {
                $this->error($result->errorCode ?? 'transition_failed', 400, $result->message);
            }
            if ($orderType === 'so' && is_array($result->data ?? null)) {
                $this->customerPurchaseOrders()->synchronizeSalesOrder((array)$result->data, $uid);
            }
            $this->auditLog('order_transition', [
                'order_type' => $orderType,
                'order_id'   => $orderId,
                'target'     => $target,
                'reason'     => $reason,
            ], $uid);
            $this->success(['transition' => $result->toArray()]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('transition_failed', 500, $e->getMessage());
        }
    }

    // â”€â”€ Contract Review â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * POST contractReview â€” Submit or update contract review for an SO.
     * Action: `order_contract_review`
     * @return never
     */
    public function contractReview(): never
    {
        $user = $this->requireAuth();
        $isRead = $this->method() === 'GET';

        if ($isRead) {
            $this->requireOrderPermission($user, 'so_read');
            $soNumber = trim((string)($this->query('so_number') ?? ''));
            if ($soNumber === '') {
                $this->error('missing_so_number', 400);
            }

            try {
                $reviewFile = $this->dataDir . '/orders/reviews/' . preg_replace('/[^A-Za-z0-9\-_]/', '_', $soNumber) . '.json';
                $review = $this->readJsonFile($reviewFile) ?? [
                    'so_number' => $soNumber,
                    'items' => [],
                    'history' => [],
                    'completion_pct' => 0,
                    'all_approved' => false,
                ];
                $this->success(['review' => $review]);
            } catch (Throwable $e) {
                $this->rethrowResponse($e);
                $this->error('contract_review_failed', 500, $e->getMessage());
            }
        }

        $this->requireCsrf();
        $this->requireOrderPermission($user, 'so_write');

        $body = $this->jsonBody();
        $this->requireFields($body, ['so_number']);

        $soNumber = trim((string)($body['so_number'] ?? ''));
        $items    = is_array($body['items'] ?? null) ? $body['items'] : [];
        $uid      = $this->userId($user);
        $now      = $this->nowIso();

        try {
            $reviewFile = $this->dataDir . '/orders/reviews/' . preg_replace('/[^A-Za-z0-9\-_]/', '_', $soNumber) . '.json';
            $reviewDir  = dirname($reviewFile);
            if (!is_dir($reviewDir)) {
                @mkdir($reviewDir, 0775, true);
            }

            $existing = $this->readJsonFile($reviewFile) ?? ['so_number' => $soNumber, 'items' => [], 'history' => []];

            foreach ($items as $item) {
                $code   = (string)($item['code'] ?? '');
                $result = (string)($item['result'] ?? 'pending');
                $comment = (string)($item['comments'] ?? '');

                $found = false;
                foreach ($existing['items'] as &$ex) {
                    if (($ex['code'] ?? '') === $code) {
                        $ex['result']      = $result;
                        $ex['comments']    = $comment;
                        $ex['reviewer']    = $uid;
                        $ex['reviewed_at'] = $now;
                        $found = true;
                        break;
                    }
                }
                unset($ex);

                if (!$found) {
                    $existing['items'][] = [
                        'code'        => $code,
                        'result'      => $result,
                        'comments'    => $comment,
                        'reviewer'    => $uid,
                        'reviewed_at' => $now,
                    ];
                }
            }

            $existing['history'][] = ['user' => $uid, 'timestamp' => $now, 'action' => 'review_updated', 'items_count' => count($items)];
            $existing['updated_at'] = $now;

            $total    = count($existing['items']);
            $approved = 0;
            foreach ($existing['items'] as $it) {
                if (in_array($it['result'] ?? '', ['approved', 'not_applicable'], true)) {
                    $approved++;
                }
            }
            $existing['completion_pct'] = $total > 0 ? round(($approved / $total) * 100, 1) : 0;
            $existing['all_approved']   = ($approved === $total && $total > 0);

            $this->writeJsonFile($reviewFile, $existing);
            $this->auditLog('order_contract_review', ['so_number' => $soNumber, 'completion' => $existing['completion_pct']], $uid);

            $this->success(['review' => $existing]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('contract_review_failed', 500, $e->getMessage());
        }
    }

    // â”€â”€ Holds â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * POST setHold â€” Set a hold on an order.
     * Action: `order_hold_set`
     * @return never
     */
    public function setHold(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['order_type', 'order_id', 'hold_type', 'reason']);

        $orderType = strtolower(trim((string)($body['order_type'] ?? '')));
        $orderId   = trim((string)($body['order_id'] ?? ''));
        $holdType  = trim((string)($body['hold_type'] ?? ''));
        $reason    = trim((string)($body['reason'] ?? ''));
        $uid       = $this->userId($user);
        $now       = $this->nowIso();

        $permKey = $orderType . '_write';
        $this->requireOrderPermission($user, $permKey);

        try {
            $holdsFile = $this->dataDir . '/orders/holds.json';
            $holds = $this->readJsonFile($holdsFile) ?? [];

            $holds[] = [
                'hold_id'    => bin2hex(random_bytes(8)),
                'order_type' => $orderType,
                'order_id'   => $orderId,
                'hold_type'  => $holdType,
                'reason'     => $reason,
                'set_by'     => $uid,
                'set_at'     => $now,
                'released'   => false,
            ];

            $this->writeJsonFile($holdsFile, $holds);
            $this->auditLog('order_hold_set', ['order_id' => $orderId, 'hold_type' => $holdType], $uid);
            $this->success(['hold_set' => true]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('hold_set_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST releaseHold â€” Release a hold on an order.
     * Action: `order_hold_release`
     * @return never
     */
    public function releaseHold(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['hold_id']);

        $holdId = trim((string)($body['hold_id'] ?? ''));
        $reason = trim((string)($body['release_reason'] ?? ''));
        $uid    = $this->userId($user);
        $now    = $this->nowIso();

        try {
            $holdsFile = $this->dataDir . '/orders/holds.json';
            $holds = $this->readJsonFile($holdsFile) ?? [];
            $found = false;

            foreach ($holds as &$h) {
                if (($h['hold_id'] ?? '') === $holdId && !($h['released'] ?? false)) {
                    $h['released']       = true;
                    $h['released_by']    = $uid;
                    $h['released_at']    = $now;
                    $h['release_reason'] = $reason;
                    $found = true;
                    break;
                }
            }
            unset($h);

            if (!$found) {
                $this->error('hold_not_found', 404);
            }

            $this->writeJsonFile($holdsFile, $holds);
            $this->auditLog('order_hold_release', ['hold_id' => $holdId], $uid);
            $this->success(['released' => true]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('hold_release_failed', 500, $e->getMessage());
        }
    }

    // â”€â”€ Notes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * POST addNote â€” Add a note to an order.
     * Action: `order_note_add`
     * @return never
     */
    public function addNote(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['order_type', 'order_id', 'note_text']);

        $uid = $this->userId($user);
        $now = $this->nowIso();

        $note = [
            'note_id'      => bin2hex(random_bytes(8)),
            'order_type'   => strtolower(trim((string)($body['order_type'] ?? ''))),
            'order_number' => trim((string)($body['order_id'] ?? '')),
            'note_type'    => (string)($body['note_type'] ?? 'internal'),
            'note_text'    => trim((string)($body['note_text'] ?? '')),
            'author'       => $uid,
            'author_name'  => (string)($user['name'] ?? $uid),
            'created_at'   => $now,
        ];

        try {
            $notesFile = $this->dataDir . '/orders/notes.json';
            $notes = $this->readJsonFile($notesFile) ?? [];
            $notes[] = $note;
            $this->writeJsonFile($notesFile, $notes);

            $this->auditLog('order_note_add', ['order_id' => $note['order_number'], 'note_type' => $note['note_type']], $uid);
            $this->success(['note' => $note]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('note_add_failed', 500, $e->getMessage());
        }
    }

    // â”€â”€ Timeline â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * GET getTimeline â€” Get timeline events for Gantt visualization.
     * Action: `order_timeline`
     * @return never
     */
    public function getTimeline(): never
    {
        $user = $this->requireAuth();
        $this->requireOrderPermission($user, 'so_read');

        $soNumber = $this->query('so_number');

        try {
            $hierarchy = $this->orderService()->getHierarchy($soNumber);

            $events = [];
            foreach ($hierarchy as $so) {
                $events[] = [
                    'type'     => 'so',
                    'id'       => $so['so_number'] ?? '',
                    'label'    => ($so['customer_name'] ?? '') . ' / ' . ($so['so_number'] ?? ''),
                    'start'    => $so['order_date'] ?? '',
                    'end'      => $so['due_date'] ?? '',
                    'status'   => $so['status'] ?? '',
                    'children' => [],
                ];

                foreach (($so['job_orders'] ?? []) as $jo) {
                    $joEvent = [
                        'type'   => 'jo',
                        'id'     => $jo['jo_number'] ?? '',
                        'label'  => ($jo['jo_number'] ?? '') . ' - ' . ($jo['part_number'] ?? ''),
                        'start'  => $jo['start_date'] ?? '',
                        'end'    => $jo['due_date'] ?? '',
                        'status' => $jo['status'] ?? '',
                        'children' => [],
                    ];

                    foreach (($jo['work_orders'] ?? []) as $wo) {
                        $joEvent['children'][] = [
                            'type'   => 'wo',
                            'id'     => $wo['wo_number'] ?? '',
                            'label'  => 'OP' . ($wo['operation_number'] ?? '') . ' ' . ($wo['operation_desc'] ?? ''),
                            'start'  => $wo['scheduled_start'] ?? '',
                            'end'    => $wo['scheduled_end'] ?? '',
                            'status' => $wo['status'] ?? '',
                        ];
                    }
                    $events[count($events) - 1]['children'][] = $joEvent;
                }
            }

            $this->success(['timeline' => $events]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('timeline_failed', 500, $e->getMessage());
        }
    }

    // â”€â”€ Dashboard KPI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * GET getDashboardKpi â€” Extended KPI aggregation.
     * Action: `order_dashboard_kpi`
     * @return never
     */
    public function getDashboardKpi(): never
    {
        $user = $this->requireAuth();
        $this->requireOrderPermission($user, 'so_read');

        try {
            $stats = $this->orderService()->getDashboardStats();

            // Add hold count
            $holdsFile = $this->dataDir . '/orders/holds.json';
            $holds = $this->readJsonFile($holdsFile) ?? [];
            $activeHolds = 0;
            foreach ($holds as $h) {
                if (!($h['released'] ?? false)) {
                    $activeHolds++;
                }
            }
            $stats['active_holds'] = $activeHolds;

            $this->success(['kpi' => $stats]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('kpi_failed', 500, $e->getMessage());
        }
    }

    // â”€â”€ Search â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * GET search â€” Full-text search across all orders.
     * Action: `order_search`
     * @return never
     */
    public function search(): never
    {
        $user = $this->requireAuth();
        $this->requireOrderPermission($user, 'so_read');

        $q = strtolower(trim((string)($this->query('q') ?? '')));
        if ($q === '' || strlen($q) < 2) {
            $this->error('query_too_short', 400, 'Search query must be at least 2 characters.');
        }

        $offset = max(0, (int)($this->query('offset', '0')));
        $limit  = min(100, max(1, (int)($this->query('limit', '25'))));

        try {
            $hierarchy = $this->orderService()->getHierarchy(null);
            $results = [];

            foreach ($hierarchy as $so) {
                $soStr = strtolower(json_encode($so) ?: '');
                if (strpos($soStr, $q) !== false) {
                    $results[] = ['type' => 'so', 'id' => $so['so_number'] ?? '', 'label' => ($so['so_number'] ?? '') . ' - ' . ($so['customer_name'] ?? ''), 'status' => $so['status'] ?? ''];
                }
                foreach (($so['job_orders'] ?? []) as $jo) {
                    $joStr = strtolower(json_encode($jo) ?: '');
                    if (strpos($joStr, $q) !== false) {
                        $results[] = ['type' => 'jo', 'id' => $jo['jo_number'] ?? '', 'label' => ($jo['jo_number'] ?? '') . ' - ' . ($jo['part_number'] ?? ''), 'status' => $jo['status'] ?? ''];
                    }
                }
            }

            $total = count($results);
            $paged = array_slice($results, $offset, $limit);

            $this->paginated('results', $paged, $total, $offset, $limit);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('search_failed', 500, $e->getMessage());
        }
    }

    // â”€â”€ Shipment Readiness Gate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * GET checkShipmentReadiness â€” Check if SO is ready to ship.
     * Action: `order_shipment_gate`
     * @return never
     */
    public function checkShipmentReadiness(): never
    {
        $user = $this->requireAuth();
        $this->requireOrderPermission($user, 'so_read');

        $soNumber = $this->query('so_number');
        if ($soNumber === null || trim($soNumber) === '') {
            $this->error('missing_so_number', 400);
        }

        try {
            $gateService = new ShipmentGateService($this->dataDir, $this->confDir);
            $result = $gateService->checkReadiness(trim($soNumber), $this->userId($user), $this->userRole($user));

            $this->success(['shipment_gate' => $result]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('shipment_gate_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST overrideShipmentGate — Approve a timeboxed shipment gate override.
     * Action: `order_shipment_gate_override`
     * @return never
     */
    public function overrideShipmentGate(): never
    {
        $user = $this->requireAuth();
        $this->requireOrderPermission($user, 'so_write');
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['so_number', 'gate_code', 'reason_code', 'reason', 'expires_at']);

        try {
            $gateService = new ShipmentGateService($this->dataDir, $this->confDir);
            $override = $gateService->overrideGate(
                trim((string)$body['so_number']),
                trim((string)$body['gate_code']),
                trim((string)$body['reason']),
                $this->userId($user),
                $this->userRole($user),
                trim((string)$body['reason_code']),
                trim((string)$body['expires_at']),
                isset($body['approval_reference']) ? trim((string)$body['approval_reference']) : null,
            );

            $this->success(['override' => $override], 201);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('shipment_gate_override_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET listShipmentGateOverrides — List governed shipment gate overrides for one SO.
     * Action: `order_shipment_gate_overrides`
     * @return never
     */
    public function listShipmentGateOverrides(): never
    {
        $user = $this->requireAuth();
        $this->requireOrderPermission($user, 'so_read');

        $soNumber = $this->query('so_number');
        if ($soNumber === null || trim($soNumber) === '') {
            $this->error('missing_so_number', 400);
        }

        try {
            $gateService = new ShipmentGateService($this->dataDir, $this->confDir);
            $this->success(['overrides' => $gateService->listOverrides(trim($soNumber))]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('shipment_gate_override_list_failed', 500, $e->getMessage());
        }
    }
}
