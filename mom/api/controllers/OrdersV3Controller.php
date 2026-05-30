<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Api\Controllers\BaseController;
use MOM\Api\Services\EmailIntakeCaseService;
use MOM\Database\Connection;
use MOM\Services\CustomerPurchaseOrderService;
use MOM\Services\OrderService;
use MOM\Services\OrdersV3WorkspaceService;
use Throwable;

/**
 * Orders v3 — Workspace API.
 *
 * Net-new MVC controller dedicated to the v3 frontend. Old endpoints
 * (`order_hierarchy`, `customer_purchase_order_list`, etc.) keep
 * working — this layer composes them into workspace-ready payloads.
 *
 * @package MOM\Api\Controllers
 * @since   3.0.0
 */
class OrdersV3Controller extends BaseController
{
    private ?OrdersV3WorkspaceService $svc = null;

    private function workspaces(): OrdersV3WorkspaceService
    {
        if ($this->svc === null) {
            $orders = new OrderService($this->dataDir);
            $cpos   = new CustomerPurchaseOrderService($this->dataDir);
            $aeoi   = null;
            try {
                // EmailIntakeCaseService needs the DB connection; ignore
                // failures so the Today's queue still renders without AEOI.
                $aeoi = new EmailIntakeCaseService(Connection::getInstance());
            } catch (Throwable $e) {
                $aeoi = null;
            }
            $this->svc = new OrdersV3WorkspaceService($orders, $cpos, $aeoi);
        }
        return $this->svc;
    }

    // ── orders_v3_my_permissions ─────────────────────────────────────

    /**
     * Returns the user's effective Orders permissions so the v3
     * frontend can gate buttons. Server still enforces — this is
     * UX only.
     */
    public function myPermissions(): never
    {
        $user = $this->requireAuth();
        $role = strtolower(trim((string)($user['role'] ?? '')));

        $isAdmin = in_array($role, ['admin','it_admin','ceo','general_director'], true);

        // Coarse per-action grants. The real check is server-side in
        // OrderController::requireOrderPermission().
        $actions = [
            'orders.read'  => true,
            'orders.write' => $isAdmin || in_array($role, [
                'production_director','sales_manager','customer_service','planning_manager',
                'production_planner','engineering_manager','cnc_workshop_manager'
            ], true),
            'orders.admin' => $isAdmin,
            'orders.aeoi.review' => $isAdmin || in_array($role, ['sales_manager','customer_service'], true),
            'orders.dispatch'    => $isAdmin || in_array($role, ['production_planner','cnc_workshop_manager'], true),
        ];

        $this->success([
            'actions'       => $actions,
            'roles'         => [$role],
            'org_id'        => (string)($_SESSION['org_id'] ?? $user['org_legal_entity_code'] ?? ''),
            'is_superuser'  => $isAdmin,
            'username'      => (string)($user['username'] ?? ''),
            'display_name'  => (string)($user['name'] ?? ''),
            'title'         => (string)($user['title'] ?? ''),
        ]);
    }

    // ── orders_v3_today ─────────────────────────────────────────────

    /**
     * Today's queue payload — role-aware tiles + exceptions + shortcuts.
     */
    public function today(): never
    {
        $user = $this->requireAuth();
        try {
            $payload = $this->workspaces()->buildTodayPayload($user);
            $this->success($payload);
        } catch (Throwable $e) {
            $this->error('orders_v3_today_failed', 500, $e->getMessage());
        }
    }

    // ── orders_v3_intake_list ───────────────────────────────────────

    /**
     * Unified intake stream (AEOI cases + Customer POs).
     * Query params: status_group, source, q, limit, offset
     */
    public function intakeList(): never
    {
        $this->requireAuth();
        $filters = [
            'status_group' => $this->query('status_group'),
            'source'       => $this->query('source'),
            'q'            => $this->query('q'),
            'limit'        => $this->query('limit'),
            'offset'       => $this->query('offset'),
        ];
        try {
            $payload = $this->workspaces()->buildIntakePayload($filters);
            $this->success($payload);
        } catch (Throwable $e) {
            $this->error('orders_v3_intake_list_failed', 500, $e->getMessage());
        }
    }
}
