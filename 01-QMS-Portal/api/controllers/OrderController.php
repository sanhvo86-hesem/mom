<?php

declare(strict_types=1);

namespace HESEM\QMS\Api\Controllers;

use HESEM\QMS\Api\Controllers\BaseController;
use HESEM\QMS\Services\OrderService;
use Throwable;

/**
 * Order controller for HESEM QMS Portal.
 *
 * Provides API endpoints for Sales Orders (SO), Job Orders (JO),
 * Work Orders (WO), order hierarchy browsing, form-to-job linking,
 * and order dashboard statistics.
 *
 * Access is role-based according to `so_jo_wo_config.json`.
 *
 * @package HESEM\QMS\Api\Controllers
 * @since   3.0.0
 */
class OrderController extends BaseController
{
    /** @var OrderService|null Lazy-loaded order service. */
    private ?OrderService $orderService = null;

    /** @var array|null Cached SO/JO/WO config. */
    private ?array $orderConfig = null;

    // ── Service Access ──────────────────────────────────────────────────────

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
        $roles  = $config['roles'] ?? [];
        $role   = (string)($user['role'] ?? 'viewer');

        $perms = $roles[$role] ?? $roles['viewer'] ?? [];

        return in_array($permission, $perms, true);
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

    // ── Endpoints ───────────────────────────────────────────────────────────

    /**
     * GET listSalesOrders — List sales orders with optional filters.
     *
     * Action: `order_so_list`
     *
     * Query params:
     *   - status    (string, optional): Filter by SO status.
     *   - customer  (string, optional): Filter by customer name (partial match).
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

        $customer = $this->query('customer');
        if ($customer !== null && $customer !== '') {
            $filters['customer'] = $customer;
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
            $this->error('so_list_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET getSalesOrderDetail — Get full details of a single Sales Order.
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
            $this->error('so_detail_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET listJobOrders — List job orders with optional SO and status filters.
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
            $this->error('jo_list_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET getJobOrderDetail — Get full details of a single Job Order.
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
            $this->error('jo_detail_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET getHierarchy — Get the full SO -> JO -> WO hierarchy tree.
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
            $this->error('hierarchy_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST linkForm — Link a form record to a Job Order.
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
            $this->error('link_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET getDashboardStats — Get order-related dashboard statistics.
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
            $this->error('stats_failed', 500, $e->getMessage());
        }
    }
}
