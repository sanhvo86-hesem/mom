<?php

declare(strict_types=1);

namespace HESEM\QMS\Api\Controllers;

use HESEM\QMS\Api\Controllers\BaseController;
use HESEM\QMS\Services\SupplierQualityService;
use Throwable;

/**
 * Supplier quality controller for HESEM QMS Portal.
 *
 * Provides API endpoints for supplier scorecards, incoming inspections,
 * skip-lot tracking, approved supplier list (ASL), SCAR management,
 * and supplier audit scheduling.
 *
 * Data stored in `qms-data/supplier-quality/` with per-entity JSON files.
 *
 * @package HESEM\QMS\Api\Controllers
 * @since   3.0.0
 */
class SupplierController extends BaseController
{
    /** @var SupplierQualityService|null Lazy-loaded supplier quality service. */
    private ?SupplierQualityService $supplierSvc = null;

    /** @var array|null Cached supplier quality access-control config. */
    private ?array $supplierConfig = null;

    // ── Service Access ──────────────────────────────────────────────────────

    /**
     * Get or create the SupplierQualityService instance.
     *
     * @return SupplierQualityService
     */
    private function supplierService(): SupplierQualityService
    {
        if ($this->supplierSvc === null) {
            $this->supplierSvc = new SupplierQualityService($this->dataDir);
        }
        return $this->supplierSvc;
    }

    /**
     * Load the supplier quality access-control configuration.
     *
     * @return array<string, mixed>
     */
    private function loadSupplierConfig(): array
    {
        if ($this->supplierConfig !== null) {
            return $this->supplierConfig;
        }

        $configFile = $this->confDir . '/supplier_quality_config.json';
        $this->supplierConfig = $this->readJsonFile($configFile) ?? [
            'roles' => [
                'admin'          => ['sq_read', 'sq_write', 'sq_scar', 'sq_audit', 'sq_asl', 'sq_skip_lot'],
                'doc_controller' => ['sq_read', 'sq_write', 'sq_scar', 'sq_audit', 'sq_asl'],
                'quality'        => ['sq_read', 'sq_write', 'sq_scar', 'sq_audit', 'sq_asl', 'sq_skip_lot'],
                'purchasing'     => ['sq_read', 'sq_write', 'sq_asl'],
                'production'     => ['sq_read'],
                'engineering'    => ['sq_read'],
                'viewer'         => ['sq_read'],
            ],
        ];

        return $this->supplierConfig;
    }

    /**
     * Check if the user has a specific supplier quality permission.
     *
     * @param array  $user       User record.
     * @param string $permission Permission key.
     * @return bool
     */
    private function hasSupplierPermission(array $user, string $permission): bool
    {
        $config = $this->loadSupplierConfig();
        $roles  = $config['roles'] ?? [];
        $role   = (string)($user['role'] ?? 'viewer');

        $perms = $roles[$role] ?? $roles['viewer'] ?? [];

        return in_array($permission, $perms, true);
    }

    /**
     * Require a supplier quality permission, terminating with 403 if missing.
     *
     * @param array  $user       User record.
     * @param string $permission Permission key.
     * @return void
     */
    private function requireSupplierPermission(array $user, string $permission): void
    {
        if (!$this->hasSupplierPermission($user, $permission)) {
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
     * GET dashboard — Supplier quality KPIs.
     *
     * Returns avg score, at-risk suppliers, open SCARs, incoming reject rate.
     *
     * @return never
     */
    public function dashboard(): never
    {
        $user = $this->requireAuth();
        $this->requireSupplierPermission($user, 'sq_read');

        try {
            $kpis = $this->supplierService()->getDashboardKpis();

            $this->success(['kpis' => $kpis]);
        } catch (Throwable $e) {
            $this->error('supplier_dashboard_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET listScorecards — List supplier scorecards with optional filters.
     *
     * Query params:
     *   - vendor_id    (string, optional): Filter by vendor.
     *   - period       (string, optional): Filter by period (e.g. "2026-Q1").
     *   - rating_grade (string, optional): Filter by grade (A, B, C, D, F).
     *   - offset       (int, optional):    Pagination offset.
     *   - limit        (int, optional):    Page size (default 50, max 200).
     *
     * @return never
     */
    public function listScorecards(): never
    {
        $user = $this->requireAuth();
        $this->requireSupplierPermission($user, 'sq_read');

        $filters = [];

        $vendorId = $this->query('vendor_id');
        if ($vendorId !== null && $vendorId !== '') {
            $filters['vendor_id'] = $vendorId;
        }

        $period = $this->query('period');
        if ($period !== null && $period !== '') {
            $filters['period'] = $period;
        }

        $ratingGrade = $this->query('rating_grade');
        if ($ratingGrade !== null && $ratingGrade !== '') {
            $filters['rating_grade'] = strtoupper($ratingGrade);
        }

        $offset = max(0, (int)($this->query('offset', '0')));
        $limit  = min(200, max(1, (int)($this->query('limit', '50'))));

        try {
            $allItems = $this->supplierService()->listScorecards($filters);
            $total    = count($allItems);
            $items    = array_slice($allItems, $offset, $limit);

            $this->paginated('scorecards', array_values($items), $total, $offset, $limit);
        } catch (Throwable $e) {
            $this->error('scorecards_list_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET scorecardDetail — Single vendor scorecard with trend data.
     *
     * Query params:
     *   - vendor_id (string, required): Vendor identifier.
     *   - period    (string, optional): Specific period.
     *
     * @return never
     */
    public function scorecardDetail(): never
    {
        $user = $this->requireAuth();
        $this->requireSupplierPermission($user, 'sq_read');

        $vendorId = $this->query('vendor_id');
        if ($vendorId === null || trim($vendorId) === '') {
            $this->error('missing_vendor_id', 400);
        }

        $vendorId = trim($vendorId);
        $period   = $this->query('period');

        try {
            $scorecard = $this->supplierService()->getScorecardDetail($vendorId, $period);
            if ($scorecard === null) {
                $this->error('not_found', 404, "Scorecard for vendor {$vendorId} not found.");
            }

            $this->success(['scorecard' => $scorecard]);
        } catch (Throwable $e) {
            $this->error('scorecard_detail_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST calculateScorecard — Calculate/recalculate scorecard for a vendor and period.
     *
     * Body fields:
     *   - vendor_id (string, required)
     *   - period    (string, required): e.g. "2026-Q1"
     *
     * @return never
     */
    public function calculateScorecard(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireSupplierPermission($user, 'sq_write');

        $body = $this->jsonBody();
        $this->requireFields($body, ['vendor_id', 'period']);

        $vendorId = trim((string)($body['vendor_id'] ?? ''));
        $period   = trim((string)($body['period'] ?? ''));
        $userId   = $this->userId($user);

        try {
            $scorecard = $this->supplierService()->calculateScorecard($vendorId, $period, $userId);

            $this->auditLog('supplier_calculate_scorecard', [
                'vendor_id' => $vendorId,
                'period'    => $period,
            ], $userId);

            $this->success(['scorecard' => $scorecard]);
        } catch (Throwable $e) {
            $this->error('scorecard_calc_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET listIncoming — List incoming inspections with optional filters.
     *
     * Query params:
     *   - vendor_id  (string, optional)
     *   - status     (string, optional)
     *   - part_id    (string, optional)
     *   - date_from  (string, optional)
     *   - date_to    (string, optional)
     *   - offset     (int, optional)
     *   - limit      (int, optional)
     *
     * @return never
     */
    public function listIncoming(): never
    {
        $user = $this->requireAuth();
        $this->requireSupplierPermission($user, 'sq_read');

        $filters = [];

        $vendorId = $this->query('vendor_id');
        if ($vendorId !== null && $vendorId !== '') {
            $filters['vendor_id'] = $vendorId;
        }

        $status = $this->query('status');
        if ($status !== null && $status !== '') {
            $filters['status'] = strtolower($status);
        }

        $partId = $this->query('part_id');
        if ($partId !== null && $partId !== '') {
            $filters['part_id'] = $partId;
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
            $sqDir    = $this->dataDir . '/supplier-quality';
            $allItems = $this->readJsonFile($sqDir . '/incoming.json') ?? [];

            // Apply filters
            if (!empty($filters)) {
                $allItems = array_filter($allItems, function (array $insp) use ($filters) {
                    if (isset($filters['vendor_id']) && ($insp['vendor_id'] ?? '') !== $filters['vendor_id']) {
                        return false;
                    }
                    if (isset($filters['status']) && ($insp['status'] ?? '') !== $filters['status']) {
                        return false;
                    }
                    if (isset($filters['part_id']) && ($insp['part_id'] ?? '') !== $filters['part_id']) {
                        return false;
                    }
                    if (isset($filters['date_from'])) {
                        $date = substr($insp['created_at'] ?? $insp['date'] ?? '', 0, 10);
                        if ($date < $filters['date_from']) {
                            return false;
                        }
                    }
                    if (isset($filters['date_to'])) {
                        $date = substr($insp['created_at'] ?? $insp['date'] ?? '', 0, 10);
                        if ($date > $filters['date_to']) {
                            return false;
                        }
                    }
                    return true;
                });
                $allItems = array_values($allItems);
            }

            $total = count($allItems);
            $items = array_slice($allItems, $offset, $limit);

            $this->paginated('inspections', array_values($items), $total, $offset, $limit);
        } catch (Throwable $e) {
            $this->error('incoming_list_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST createIncoming — Create an incoming inspection record.
     *
     * Body fields:
     *   - vendor_id   (string, required)
     *   - part_id     (string, required)
     *   - po_number   (string, required)
     *   - qty_received (int, required)
     *   - lot_number  (string, optional)
     *   - inspection_plan (string, optional)
     *
     * @return never
     */
    public function createIncoming(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireSupplierPermission($user, 'sq_write');

        $body = $this->jsonBody();
        $this->requireFields($body, ['vendor_id', 'part_id', 'po_number', 'qty_received']);

        $userId = $this->userId($user);

        try {
            $inspection = $this->supplierService()->createIncoming([
                'vendor_id'       => trim((string)($body['vendor_id'] ?? '')),
                'part_id'         => trim((string)($body['part_id'] ?? '')),
                'po_number'       => trim((string)($body['po_number'] ?? '')),
                'qty_received'    => (int)($body['qty_received'] ?? 0),
                'lot_number'      => trim((string)($body['lot_number'] ?? '')),
                'inspection_plan' => trim((string)($body['inspection_plan'] ?? '')),
            ], $userId);

            $this->auditLog('supplier_create_incoming', [
                'inspection_id' => $inspection['id'],
                'vendor_id'     => $body['vendor_id'],
                'po_number'     => $body['po_number'],
            ], $userId);

            $this->success(['inspection' => $inspection], 201);
        } catch (Throwable $e) {
            $this->error('incoming_create_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST updateIncoming — Update incoming inspection with results.
     *
     * Body fields:
     *   - id          (string, required)
     *   - qty_accepted (int, optional)
     *   - qty_rejected (int, optional)
     *   - disposition (string, optional)
     *   - notes       (string, optional)
     *   - measurements (array, optional)
     *
     * @return never
     */
    public function updateIncoming(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireSupplierPermission($user, 'sq_write');

        $body = $this->jsonBody();
        $this->requireFields($body, ['id']);

        $id     = trim((string)($body['id'] ?? ''));
        $userId = $this->userId($user);

        try {
            $updated = $this->supplierService()->updateIncoming($id, $body, $userId);
            if ($updated === null) {
                $this->error('not_found', 404, "Incoming inspection {$id} not found.");
            }

            $this->auditLog('supplier_update_incoming', [
                'inspection_id' => $id,
                'fields'        => array_keys($body),
            ], $userId);

            $this->success(['inspection' => $updated]);
        } catch (Throwable $e) {
            $this->error('incoming_update_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET skipLotStatus — Get skip-lot status for a vendor x part combination.
     *
     * Query params:
     *   - vendor_id (string, required)
     *   - part_id   (string, required)
     *
     * @return never
     */
    public function skipLotStatus(): never
    {
        $user = $this->requireAuth();
        $this->requireSupplierPermission($user, 'sq_read');

        $vendorId = $this->query('vendor_id');
        if ($vendorId === null || trim($vendorId) === '') {
            $this->error('missing_vendor_id', 400);
        }

        $partId = $this->query('part_id');
        if ($partId === null || trim($partId) === '') {
            $this->error('missing_part_id', 400);
        }

        $vendorId = trim($vendorId);
        $partId   = trim($partId);

        try {
            $status = $this->supplierService()->getSkipLotStatus($vendorId, $partId);

            $this->success(['skip_lot' => $status]);
        } catch (Throwable $e) {
            $this->error('skip_lot_status_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST updateSkipLot — Update skip-lot tracking (auto-calculated from inspection results).
     *
     * Body fields:
     *   - vendor_id (string, required)
     *   - part_id   (string, required)
     *   - level     (int, optional): Manual override of skip level.
     *   - reset     (bool, optional): Reset to level 0.
     *
     * @return never
     */
    public function updateSkipLot(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireSupplierPermission($user, 'sq_skip_lot');

        $body = $this->jsonBody();
        $this->requireFields($body, ['vendor_id', 'part_id']);

        $vendorId = trim((string)($body['vendor_id'] ?? ''));
        $partId   = trim((string)($body['part_id'] ?? ''));
        $userId   = $this->userId($user);

        try {
            $status = $this->supplierService()->updateSkipLotLevel($vendorId, $partId, $body, $userId);

            $this->auditLog('supplier_update_skip_lot', [
                'vendor_id' => $vendorId,
                'part_id'   => $partId,
            ], $userId);

            $this->success(['skip_lot' => $status]);
        } catch (Throwable $e) {
            $this->error('skip_lot_update_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET listAsl — List approved supplier list entries.
     *
     * Query params:
     *   - vendor_id (string, optional)
     *   - status    (string, optional): approved, conditional, probation, disqualified.
     *   - category  (string, optional)
     *   - offset    (int, optional)
     *   - limit     (int, optional)
     *
     * @return never
     */
    public function listAsl(): never
    {
        $user = $this->requireAuth();
        $this->requireSupplierPermission($user, 'sq_read');

        $filters = [];

        $vendorId = $this->query('vendor_id');
        if ($vendorId !== null && $vendorId !== '') {
            $filters['vendor_id'] = $vendorId;
        }

        $status = $this->query('status');
        if ($status !== null && $status !== '') {
            $filters['status'] = strtolower($status);
        }

        $category = $this->query('category');
        if ($category !== null && $category !== '') {
            $filters['category'] = $category;
        }

        $offset = max(0, (int)($this->query('offset', '0')));
        $limit  = min(200, max(1, (int)($this->query('limit', '50'))));

        try {
            $allItems = $this->supplierService()->listAsl($filters);
            $total    = count($allItems);
            $items    = array_slice($allItems, $offset, $limit);

            $this->paginated('asl_entries', array_values($items), $total, $offset, $limit);
        } catch (Throwable $e) {
            $this->error('asl_list_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST upsertAsl — Create or update an ASL entry.
     *
     * Body fields:
     *   - vendor_id   (string, required)
     *   - vendor_name (string, required)
     *   - status      (string, required): approved, conditional, probation, disqualified.
     *   - category    (string, optional)
     *   - approved_parts (array, optional)
     *   - notes       (string, optional)
     *   - review_date (string, optional, YYYY-MM-DD)
     *
     * @return never
     */
    public function upsertAsl(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireSupplierPermission($user, 'sq_asl');

        $body = $this->jsonBody();
        $this->requireFields($body, ['vendor_id', 'vendor_name', 'status']);

        $userId = $this->userId($user);

        try {
            $entry = $this->supplierService()->upsertAsl([
                'vendor_id'      => trim((string)($body['vendor_id'] ?? '')),
                'vendor_name'    => trim((string)($body['vendor_name'] ?? '')),
                'status'         => strtolower(trim((string)($body['status'] ?? ''))),
                'category'       => trim((string)($body['category'] ?? '')),
                'approved_parts' => (array)($body['approved_parts'] ?? []),
                'notes'          => trim((string)($body['notes'] ?? '')),
                'review_date'    => trim((string)($body['review_date'] ?? '')),
                'updated_by'     => $userId,
            ]);

            $this->auditLog('supplier_upsert_asl', [
                'vendor_id' => $body['vendor_id'],
                'status'    => $body['status'],
            ], $userId);

            $this->success(['asl_entry' => $entry]);
        } catch (Throwable $e) {
            $this->error('asl_upsert_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET listScar — List SCAR (Supplier Corrective Action Request) records.
     *
     * Query params:
     *   - vendor_id (string, optional)
     *   - status    (string, optional)
     *   - severity  (string, optional)
     *   - offset    (int, optional)
     *   - limit     (int, optional)
     *
     * @return never
     */
    public function listScar(): never
    {
        $user = $this->requireAuth();
        $this->requireSupplierPermission($user, 'sq_read');

        $filters = [];

        $vendorId = $this->query('vendor_id');
        if ($vendorId !== null && $vendorId !== '') {
            $filters['vendor_id'] = $vendorId;
        }

        $status = $this->query('status');
        if ($status !== null && $status !== '') {
            $filters['status'] = strtolower($status);
        }

        $severity = $this->query('severity');
        if ($severity !== null && $severity !== '') {
            $filters['severity'] = strtoupper($severity);
        }

        $offset = max(0, (int)($this->query('offset', '0')));
        $limit  = min(200, max(1, (int)($this->query('limit', '50'))));

        try {
            $sqDir    = $this->dataDir . '/supplier-quality';
            $allItems = $this->readJsonFile($sqDir . '/scar.json') ?? [];

            // Apply filters
            if (!empty($filters)) {
                $allItems = array_filter($allItems, function (array $scar) use ($filters) {
                    if (isset($filters['vendor_id']) && ($scar['vendor_id'] ?? '') !== $filters['vendor_id']) {
                        return false;
                    }
                    if (isset($filters['status']) && ($scar['status'] ?? '') !== $filters['status']) {
                        return false;
                    }
                    if (isset($filters['severity']) && ($scar['severity'] ?? '') !== $filters['severity']) {
                        return false;
                    }
                    return true;
                });
                $allItems = array_values($allItems);
            }

            $total = count($allItems);
            $items = array_slice($allItems, $offset, $limit);

            $this->paginated('scars', array_values($items), $total, $offset, $limit);
        } catch (Throwable $e) {
            $this->error('scar_list_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST createScar — Create a SCAR. Auto-generates SCAR-YYYY-NNN number.
     *
     * Body fields:
     *   - vendor_id   (string, required)
     *   - severity    (string, required)
     *   - subject     (string, required)
     *   - description (string, required)
     *   - po_number   (string, optional)
     *   - part_id     (string, optional)
     *   - ncr_id      (string, optional): Link to originating NCR.
     *
     * @return never
     */
    public function createScar(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireSupplierPermission($user, 'sq_scar');

        $body = $this->jsonBody();
        $this->requireFields($body, ['vendor_id', 'severity', 'subject', 'description']);

        $userId = $this->userId($user);

        try {
            $scar = $this->supplierService()->createScar([
                'vendor_id'   => trim((string)($body['vendor_id'] ?? '')),
                'severity'    => strtoupper(trim((string)($body['severity'] ?? ''))),
                'subject'     => trim((string)($body['subject'] ?? '')),
                'description' => trim((string)($body['description'] ?? '')),
                'po_number'   => trim((string)($body['po_number'] ?? '')),
                'part_id'     => trim((string)($body['part_id'] ?? '')),
                'ncr_id'      => trim((string)($body['ncr_id'] ?? '')),
            ], $userId);

            $this->auditLog('supplier_create_scar', [
                'scar_number' => $scar['number'],
                'vendor_id'   => $body['vendor_id'],
            ], $userId);

            $this->success(['scar' => $scar], 201);
        } catch (Throwable $e) {
            $this->error('scar_create_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST updateScar — Update SCAR with root cause, corrective action, etc.
     *
     * Body fields:
     *   - id               (string, required)
     *   - root_cause       (string, optional)
     *   - corrective_action (string, optional)
     *   - preventive_action (string, optional)
     *   - due_date         (string, optional, YYYY-MM-DD)
     *   - Any other updatable SCAR fields.
     *
     * @return never
     */
    public function updateScar(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireSupplierPermission($user, 'sq_scar');

        $body = $this->jsonBody();
        $this->requireFields($body, ['id']);

        $id     = trim((string)($body['id'] ?? ''));
        $userId = $this->userId($user);

        try {
            $updated = $this->supplierService()->updateScar($id, $body, $userId);
            if ($updated === null) {
                $this->error('not_found', 404, "SCAR {$id} not found.");
            }

            $this->auditLog('supplier_update_scar', [
                'scar_id' => $id,
                'fields'  => array_keys($body),
            ], $userId);

            $this->success(['scar' => $updated]);
        } catch (Throwable $e) {
            $this->error('scar_update_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST scarTransition — SCAR status transition.
     *
     * Body fields:
     *   - id        (string, required)
     *   - to_status (string, required)
     *   - comment   (string, optional)
     *
     * @return never
     */
    public function scarTransition(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireSupplierPermission($user, 'sq_scar');

        $body = $this->jsonBody();
        $this->requireFields($body, ['id', 'to_status']);

        $id       = trim((string)($body['id'] ?? ''));
        $toStatus = strtolower(trim((string)($body['to_status'] ?? '')));
        $comment  = trim((string)($body['comment'] ?? ''));
        $userId   = $this->userId($user);

        try {
            $updated = $this->supplierService()->transitionScar($id, $toStatus, $userId, $comment);
            if ($updated === null) {
                $this->error('transition_failed', 400, "Cannot transition SCAR {$id} to {$toStatus}.");
            }

            $this->auditLog('supplier_scar_transition', [
                'scar_id'   => $id,
                'to_status' => $toStatus,
                'comment'   => $comment,
            ], $userId);

            $this->success(['scar' => $updated]);
        } catch (Throwable $e) {
            $this->error('scar_transition_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET listAudits — List supplier audit schedule.
     *
     * Query params:
     *   - vendor_id (string, optional)
     *   - status    (string, optional)
     *   - year      (int, optional)
     *   - offset    (int, optional)
     *   - limit     (int, optional)
     *
     * @return never
     */
    public function listAudits(): never
    {
        $user = $this->requireAuth();
        $this->requireSupplierPermission($user, 'sq_read');

        $filters = [];

        $vendorId = $this->query('vendor_id');
        if ($vendorId !== null && $vendorId !== '') {
            $filters['vendor_id'] = $vendorId;
        }

        $status = $this->query('status');
        if ($status !== null && $status !== '') {
            $filters['status'] = strtolower($status);
        }

        $year = $this->query('year');
        if ($year !== null && preg_match('/^\d{4}$/', $year)) {
            $filters['year'] = (int)$year;
        }

        $offset = max(0, (int)($this->query('offset', '0')));
        $limit  = min(200, max(1, (int)($this->query('limit', '50'))));

        try {
            $allItems = $this->supplierService()->listAudits($filters);
            $total    = count($allItems);
            $items    = array_slice($allItems, $offset, $limit);

            $this->paginated('audits', array_values($items), $total, $offset, $limit);
        } catch (Throwable $e) {
            $this->error('audits_list_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST upsertAudit — Create or update a supplier audit entry.
     *
     * Body fields:
     *   - vendor_id    (string, required)
     *   - audit_type   (string, required): initial, surveillance, re-certification.
     *   - scheduled_date (string, required, YYYY-MM-DD)
     *   - id           (string, optional): If provided, updates existing.
     *   - auditor      (string, optional)
     *   - scope        (string, optional)
     *   - findings     (array, optional)
     *   - score        (float, optional)
     *   - status       (string, optional)
     *
     * @return never
     */
    public function upsertAudit(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();
        $this->requireSupplierPermission($user, 'sq_audit');

        $body = $this->jsonBody();
        $this->requireFields($body, ['vendor_id', 'audit_type', 'scheduled_date']);

        $userId = $this->userId($user);

        try {
            $audit = $this->supplierService()->upsertAudit([
                'id'             => trim((string)($body['id'] ?? '')),
                'vendor_id'      => trim((string)($body['vendor_id'] ?? '')),
                'audit_type'     => strtolower(trim((string)($body['audit_type'] ?? ''))),
                'scheduled_date' => trim((string)($body['scheduled_date'] ?? '')),
                'auditor'        => trim((string)($body['auditor'] ?? '')),
                'scope'          => trim((string)($body['scope'] ?? '')),
                'findings'       => (array)($body['findings'] ?? []),
                'score'          => isset($body['score']) ? (float)$body['score'] : null,
                'status'         => strtolower(trim((string)($body['status'] ?? 'scheduled'))),
                'updated_by'     => $userId,
            ]);

            $this->auditLog('supplier_upsert_audit', [
                'audit_id'  => $audit['id'],
                'vendor_id' => $body['vendor_id'],
            ], $userId);

            $this->success(['audit' => $audit]);
        } catch (Throwable $e) {
            $this->error('audit_upsert_failed', 500, $e->getMessage());
        }
    }
}
