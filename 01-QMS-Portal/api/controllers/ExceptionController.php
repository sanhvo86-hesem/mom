<?php

declare(strict_types=1);

namespace HESEM\QMS\Api\Controllers;

use HESEM\QMS\Api\Controllers\BaseController;
use HESEM\QMS\Services\ExceptionService;
use Throwable;

/**
 * Exception controller for HESEM QMS Portal.
 *
 * Provides unified API endpoints for exception management including
 * customer complaints, MRB sessions, deviations, concessions,
 * status transitions, COPQ analysis, trend data, and escalations.
 *
 * Reads NCR and CAPA data from existing stores and combines with
 * complaint, MRB, deviation, and concession records stored in
 * `qms-data/exceptions/`.
 *
 * @package HESEM\QMS\Api\Controllers
 * @since   3.0.0
 */
class ExceptionController extends BaseController
{
    /** @var ExceptionService|null Lazy-loaded exception service. */
    private ?ExceptionService $exceptionSvc = null;

    /** @var array|null Cached exception access-control config. */
    private ?array $exceptionConfig = null;

    // ── Service Access ──────────────────────────────────────────────────────

    /**
     * Get or create the ExceptionService instance.
     *
     * @return ExceptionService
     */
    private function exceptionService(): ExceptionService
    {
        if ($this->exceptionSvc === null) {
            $this->exceptionSvc = new ExceptionService($this->dataDir);
        }
        return $this->exceptionSvc;
    }

    /**
     * Load the exception access-control configuration.
     *
     * @return array<string, mixed>
     */
    private function loadExceptionConfig(): array
    {
        if ($this->exceptionConfig !== null) {
            return $this->exceptionConfig;
        }

        $configFile = $this->confDir . '/exception_config.json';
        $this->exceptionConfig = $this->readJsonFile($configFile) ?? [
            'roles' => [
                'admin'          => ['exc_read', 'exc_write', 'exc_transition', 'exc_escalate', 'exc_copq', 'exc_trends'],
                'doc_controller' => ['exc_read', 'exc_write', 'exc_transition', 'exc_copq', 'exc_trends'],
                'quality'        => ['exc_read', 'exc_write', 'exc_transition', 'exc_copq', 'exc_trends'],
                'production'     => ['exc_read', 'exc_write'],
                'engineering'    => ['exc_read'],
                'viewer'         => ['exc_read'],
            ],
        ];

        return $this->exceptionConfig;
    }

    /**
     * Check if the user has a specific exception permission.
     *
     * @param array  $user       User record.
     * @param string $permission Permission key.
     * @return bool
     */
    private function hasExceptionPermission(array $user, string $permission): bool
    {
        $config = $this->loadExceptionConfig();
        $roles  = $config['roles'] ?? [];
        $role   = (string)($user['role'] ?? 'viewer');

        $perms = $roles[$role] ?? $roles['viewer'] ?? [];

        return in_array($permission, $perms, true);
    }

    /**
     * Require an exception permission, terminating with 403 if missing.
     *
     * @param array  $user       User record.
     * @param string $permission Permission key.
     * @return void
     */
    private function requireExceptionPermission(array $user, string $permission): void
    {
        if (!$this->hasExceptionPermission($user, $permission)) {
            $this->error('forbidden', 403, "Missing permission: {$permission}");
        }
    }

    /**
     * Extract the acting username from a user record.
     *
     * @param array $user User record.
     * @return string
     */
    private function userId(array $user): string
    {
        return (string)($user['username'] ?? $user['user'] ?? 'unknown');
    }

    // ── Endpoints ───────────────────────────────────────────────────────────

    /**
     * GET dashboard — Unified exception KPIs.
     *
     * Returns open NCRs, open CAPAs, open complaints, COPQ MTD, average age.
     *
     * @return never
     */
    public function dashboard(): never
    {
        $user = $this->requireAuth();
        $this->requireExceptionPermission($user, 'exc_read');

        try {
            $kpis = $this->exceptionService()->getDashboardKpis();

            $this->success(['kpis' => $kpis]);
        } catch (Throwable $e) {
            $this->error('exception_dashboard_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET listAll — Unified list across all exception types.
     *
     * Supports filters: type, severity, status, date_from, date_to,
     * department, assigned_to. Paginated.
     *
     * Each item includes: exception_type, id, number, subject/title,
     * severity, status, age_days, assigned_to, linked_order.
     *
     * @return never
     */
    public function listAll(): never
    {
        $user = $this->requireAuth();
        $this->requireExceptionPermission($user, 'exc_read');

        $filters = [];

        $type = $this->query('type');
        if ($type !== null && $type !== '') {
            $filters['type'] = strtolower($type);
        }

        $severity = $this->query('severity');
        if ($severity !== null && $severity !== '') {
            $filters['severity'] = strtoupper($severity);
        }

        $status = $this->query('status');
        if ($status !== null && $status !== '') {
            $filters['status'] = strtolower($status);
        }

        $dateFrom = $this->query('date_from');
        if ($dateFrom !== null && preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateFrom)) {
            $filters['date_from'] = $dateFrom;
        }

        $dateTo = $this->query('date_to');
        if ($dateTo !== null && preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateTo)) {
            $filters['date_to'] = $dateTo;
        }

        $department = $this->query('department');
        if ($department !== null && $department !== '') {
            $filters['department'] = $department;
        }

        $assignedTo = $this->query('assigned_to');
        if ($assignedTo !== null && $assignedTo !== '') {
            $filters['assigned_to'] = $assignedTo;
        }

        $offset = max(0, (int)($this->query('offset', '0')));
        $limit  = min(200, max(1, (int)($this->query('limit', '50'))));

        try {
            $allItems = $this->exceptionService()->listAll($filters);
            $total    = count($allItems);
            $items    = array_slice($allItems, $offset, $limit);

            $this->paginated('exceptions', array_values($items), $total, $offset, $limit);
        } catch (Throwable $e) {
            $this->error('exception_list_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET detail — Get single exception detail by type and id.
     *
     * Query params:
     *   - type (string, required): Exception type (ncr, capa, complaint, mrb, deviation, concession).
     *   - id   (string, required): Exception record ID.
     *
     * @return never
     */
    public function detail(): never
    {
        $user = $this->requireAuth();
        $this->requireExceptionPermission($user, 'exc_read');

        $type = $this->query('type');
        if ($type === null || trim($type) === '') {
            $this->error('missing_type', 400);
        }

        $id = $this->query('id');
        if ($id === null || trim($id) === '') {
            $this->error('missing_id', 400);
        }

        $type = strtolower(trim($type));
        $id   = trim($id);

        try {
            $record = $this->exceptionService()->getDetail($type, $id);
            if ($record === null) {
                $this->error('not_found', 404, "Exception {$type}/{$id} not found.");
            }

            $this->success(['exception' => $record]);
        } catch (Throwable $e) {
            $this->error('exception_detail_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST createComplaint — Create a customer complaint with 8D template.
     *
     * Body fields:
     *   - customer_id        (string, required)
     *   - source             (string, required)
     *   - severity           (string, required)
     *   - subject            (string, required)
     *   - description        (string, required)
     *   - affected_so_number (string, optional)
     *   - affected_part_id   (string, optional)
     *   - affected_qty       (int, optional)
     *   - received_date      (string, optional, YYYY-MM-DD)
     *
     * Auto-generates complaint number (COMP-YYYY-NNN).
     *
     * @return never
     */
    public function createComplaint(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireExceptionPermission($user, 'exc_write');

        $body = $this->jsonBody();
        $this->requireFields($body, ['customer_id', 'source', 'severity', 'subject', 'description']);

        $userId = $this->userId($user);

        try {
            $complaint = $this->exceptionService()->createComplaint([
                'customer_id'        => trim((string)($body['customer_id'] ?? '')),
                'source'             => trim((string)($body['source'] ?? '')),
                'severity'           => strtoupper(trim((string)($body['severity'] ?? ''))),
                'subject'            => trim((string)($body['subject'] ?? '')),
                'description'        => trim((string)($body['description'] ?? '')),
                'affected_so_number' => trim((string)($body['affected_so_number'] ?? '')),
                'affected_part_id'   => trim((string)($body['affected_part_id'] ?? '')),
                'affected_qty'       => (int)($body['affected_qty'] ?? 0),
                'received_date'      => trim((string)($body['received_date'] ?? gmdate('Y-m-d'))),
                'created_by'         => $userId,
            ]);

            $this->auditLog('exception_create_complaint', [
                'complaint_number' => $complaint['number'],
            ], $userId);

            $this->success(['complaint' => $complaint], 201);
        } catch (Throwable $e) {
            $this->error('complaint_create_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST updateComplaint — Update complaint fields including 8D steps (d1-d8).
     *
     * Body fields:
     *   - id (string, required): Complaint record ID.
     *   - Any updatable fields including d1..d8 step data.
     *
     * @return never
     */
    public function updateComplaint(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireExceptionPermission($user, 'exc_write');

        $body = $this->jsonBody();
        $this->requireFields($body, ['id']);

        $id     = trim((string)($body['id'] ?? ''));
        $userId = $this->userId($user);

        try {
            $updated = $this->exceptionService()->updateComplaint($id, $body, $userId);
            if ($updated === null) {
                $this->error('not_found', 404, "Complaint {$id} not found.");
            }

            $this->auditLog('exception_update_complaint', [
                'complaint_id' => $id,
                'fields'       => array_keys($body),
            ], $userId);

            $this->success(['complaint' => $updated]);
        } catch (Throwable $e) {
            $this->error('complaint_update_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST createMrb — Create an MRB (Material Review Board) session.
     *
     * Body fields:
     *   - ncr_id     (string, required): Related NCR record ID.
     *   - item_id    (string, required): Part/item ID under review.
     *   - job_number (string, optional)
     *   - lot_number (string, optional)
     *   - qty_affected (int, required)
     *
     * @return never
     */
    public function createMrb(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireExceptionPermission($user, 'exc_write');

        $body = $this->jsonBody();
        $this->requireFields($body, ['ncr_id', 'item_id', 'qty_affected']);

        $userId = $this->userId($user);

        try {
            $mrb = $this->exceptionService()->createMrb([
                'ncr_id'       => trim((string)($body['ncr_id'] ?? '')),
                'item_id'      => trim((string)($body['item_id'] ?? '')),
                'job_number'   => trim((string)($body['job_number'] ?? '')),
                'lot_number'   => trim((string)($body['lot_number'] ?? '')),
                'qty_affected' => (int)($body['qty_affected'] ?? 0),
                'created_by'   => $userId,
            ]);

            $this->auditLog('exception_create_mrb', [
                'mrb_number' => $mrb['number'],
                'ncr_id'     => $body['ncr_id'],
            ], $userId);

            $this->success(['mrb' => $mrb], 201);
        } catch (Throwable $e) {
            $this->error('mrb_create_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST updateMrb — Update MRB session with disposition decision.
     *
     * Body fields:
     *   - id         (string, required): MRB record ID.
     *   - disposition (string, optional): use_as_is, rework, scrap, return_to_vendor.
     *   - Any other updatable MRB fields.
     *
     * @return never
     */
    public function updateMrb(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireExceptionPermission($user, 'exc_write');

        $body = $this->jsonBody();
        $this->requireFields($body, ['id']);

        $id     = trim((string)($body['id'] ?? ''));
        $userId = $this->userId($user);

        try {
            $updated = $this->exceptionService()->updateMrb($id, $body, $userId);
            if ($updated === null) {
                $this->error('not_found', 404, "MRB {$id} not found.");
            }

            $this->auditLog('exception_update_mrb', [
                'mrb_id' => $id,
                'fields' => array_keys($body),
            ], $userId);

            $this->success(['mrb' => $updated]);
        } catch (Throwable $e) {
            $this->error('mrb_update_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST createDeviation — Create a deviation request.
     *
     * Body fields:
     *   - title       (string, required)
     *   - description (string, required)
     *   - severity    (string, required)
     *   - department  (string, required)
     *   - affected_process (string, optional)
     *   - justification    (string, optional)
     *
     * @return never
     */
    public function createDeviation(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireExceptionPermission($user, 'exc_write');

        $body = $this->jsonBody();
        $this->requireFields($body, ['title', 'description', 'severity', 'department']);

        $userId = $this->userId($user);

        try {
            $deviation = $this->exceptionService()->createDeviation([
                'title'            => trim((string)($body['title'] ?? '')),
                'description'      => trim((string)($body['description'] ?? '')),
                'severity'         => strtoupper(trim((string)($body['severity'] ?? ''))),
                'department'       => trim((string)($body['department'] ?? '')),
                'affected_process' => trim((string)($body['affected_process'] ?? '')),
                'justification'    => trim((string)($body['justification'] ?? '')),
                'created_by'       => $userId,
            ]);

            $this->auditLog('exception_create_deviation', [
                'deviation_number' => $deviation['number'],
            ], $userId);

            $this->success(['deviation' => $deviation], 201);
        } catch (Throwable $e) {
            $this->error('deviation_create_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST updateDeviation — Update a deviation request.
     *
     * Body fields:
     *   - id (string, required): Deviation record ID.
     *   - Any updatable fields.
     *
     * @return never
     */
    public function updateDeviation(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireExceptionPermission($user, 'exc_write');

        $body = $this->jsonBody();
        $this->requireFields($body, ['id']);

        $id     = trim((string)($body['id'] ?? ''));
        $userId = $this->userId($user);

        try {
            $updated = $this->exceptionService()->updateDeviation($id, $body, $userId);
            if ($updated === null) {
                $this->error('not_found', 404, "Deviation {$id} not found.");
            }

            $this->auditLog('exception_update_deviation', [
                'deviation_id' => $id,
                'fields'       => array_keys($body),
            ], $userId);

            $this->success(['deviation' => $updated]);
        } catch (Throwable $e) {
            $this->error('deviation_update_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST createConcession — Create a concession request.
     *
     * Body fields:
     *   - title       (string, required)
     *   - description (string, required)
     *   - severity    (string, required)
     *   - customer_id (string, required)
     *   - affected_part_id (string, optional)
     *   - affected_qty     (int, optional)
     *   - justification    (string, optional)
     *
     * @return never
     */
    public function createConcession(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireExceptionPermission($user, 'exc_write');

        $body = $this->jsonBody();
        $this->requireFields($body, ['title', 'description', 'severity', 'customer_id']);

        $userId = $this->userId($user);

        try {
            $concession = $this->exceptionService()->createConcession([
                'title'            => trim((string)($body['title'] ?? '')),
                'description'      => trim((string)($body['description'] ?? '')),
                'severity'         => strtoupper(trim((string)($body['severity'] ?? ''))),
                'customer_id'      => trim((string)($body['customer_id'] ?? '')),
                'affected_part_id' => trim((string)($body['affected_part_id'] ?? '')),
                'affected_qty'     => (int)($body['affected_qty'] ?? 0),
                'justification'    => trim((string)($body['justification'] ?? '')),
                'created_by'       => $userId,
            ]);

            $this->auditLog('exception_create_concession', [
                'concession_number' => $concession['number'],
            ], $userId);

            $this->success(['concession' => $concession], 201);
        } catch (Throwable $e) {
            $this->error('concession_create_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST updateConcession — Update a concession request.
     *
     * Body fields:
     *   - id (string, required): Concession record ID.
     *   - Any updatable fields.
     *
     * @return never
     */
    public function updateConcession(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireExceptionPermission($user, 'exc_write');

        $body = $this->jsonBody();
        $this->requireFields($body, ['id']);

        $id     = trim((string)($body['id'] ?? ''));
        $userId = $this->userId($user);

        try {
            $updated = $this->exceptionService()->updateConcession($id, $body, $userId);
            if ($updated === null) {
                $this->error('not_found', 404, "Concession {$id} not found.");
            }

            $this->auditLog('exception_update_concession', [
                'concession_id' => $id,
                'fields'        => array_keys($body),
            ], $userId);

            $this->success(['concession' => $updated]);
        } catch (Throwable $e) {
            $this->error('concession_update_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST transition — Generic status transition for any exception type.
     *
     * Body fields:
     *   - type       (string, required): Exception type.
     *   - id         (string, required): Record ID.
     *   - to_status  (string, required): Target status.
     *   - comment    (string, optional): Transition note.
     *
     * @return never
     */
    public function transition(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireExceptionPermission($user, 'exc_transition');

        $body = $this->jsonBody();
        $this->requireFields($body, ['type', 'id', 'to_status']);

        $type     = strtolower(trim((string)($body['type'] ?? '')));
        $id       = trim((string)($body['id'] ?? ''));
        $toStatus = strtolower(trim((string)($body['to_status'] ?? '')));
        $comment  = trim((string)($body['comment'] ?? ''));
        $userId   = $this->userId($user);

        try {
            $updated = $this->exceptionService()->transition($type, $id, $toStatus, $userId, $comment);
            if ($updated === null) {
                $this->error('transition_failed', 400, "Cannot transition {$type}/{$id} to {$toStatus}.");
            }

            $this->auditLog('exception_transition', [
                'type'      => $type,
                'id'        => $id,
                'to_status' => $toStatus,
                'comment'   => $comment,
            ], $userId);

            $this->success(['exception' => $updated]);
        } catch (Throwable $e) {
            $this->error('transition_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET copqSummary — COPQ aggregation by period and category.
     *
     * Query params:
     *   - period (string, optional): month, quarter, year (default: month).
     *   - from   (string, optional): Start date YYYY-MM-DD.
     *   - to     (string, optional): End date YYYY-MM-DD.
     *
     * @return never
     */
    public function copqSummary(): never
    {
        $user = $this->requireAuth();
        $this->requireExceptionPermission($user, 'exc_copq');

        $period = strtolower(trim($this->query('period', 'month') ?? 'month'));
        if (!in_array($period, ['month', 'quarter', 'year'], true)) {
            $period = 'month';
        }

        $from = $this->query('from');
        if ($from !== null && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $from)) {
            $from = null;
        }

        $to = $this->query('to');
        if ($to !== null && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $to)) {
            $to = null;
        }

        try {
            $summary = $this->exceptionService()->copqSummary($period, $from, $to);

            $this->success(['copq' => $summary]);
        } catch (Throwable $e) {
            $this->error('copq_summary_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET trends — Pareto and trend data across exception types.
     *
     * Query params:
     *   - months (int, optional): Number of months to look back (default: 12).
     *   - type   (string, optional): Filter to specific exception type.
     *
     * @return never
     */
    public function trends(): never
    {
        $user = $this->requireAuth();
        $this->requireExceptionPermission($user, 'exc_trends');

        $months = min(60, max(1, (int)($this->query('months', '12'))));

        $type = $this->query('type');
        if ($type !== null && trim($type) === '') {
            $type = null;
        }

        try {
            $trendData = $this->exceptionService()->trends($months, $type);

            $this->success(['trends' => $trendData]);
        } catch (Throwable $e) {
            $this->error('trends_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST escalate — Manual escalation trigger for an exception.
     *
     * Body fields:
     *   - type   (string, required): Exception type.
     *   - id     (string, required): Record ID.
     *   - reason (string, required): Escalation reason.
     *   - escalate_to (string, optional): Target person or role.
     *
     * @return never
     */
    public function escalate(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireExceptionPermission($user, 'exc_escalate');

        $body = $this->jsonBody();
        $this->requireFields($body, ['type', 'id', 'reason']);

        $type       = strtolower(trim((string)($body['type'] ?? '')));
        $id         = trim((string)($body['id'] ?? ''));
        $reason     = trim((string)($body['reason'] ?? ''));
        $escalateTo = trim((string)($body['escalate_to'] ?? ''));
        $userId     = $this->userId($user);

        try {
            $result = $this->exceptionService()->escalate($type, $id, $userId, $reason, $escalateTo);
            if ($result === null) {
                $this->error('escalation_failed', 400, "Cannot escalate {$type}/{$id}.");
            }

            $this->auditLog('exception_escalate', [
                'type'        => $type,
                'id'          => $id,
                'reason'      => $reason,
                'escalate_to' => $escalateTo,
            ], $userId);

            $this->success(['escalation' => $result]);
        } catch (Throwable $e) {
            $this->error('escalation_failed', 500, $e->getMessage());
        }
    }
}
