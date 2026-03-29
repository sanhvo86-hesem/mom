<?php

declare(strict_types=1);

namespace HESEM\QMS\Api\Controllers;

use HESEM\QMS\Api\Controllers\BaseController;
use HESEM\QMS\Services\AllocationService;
use HESEM\QMS\Services\RecordIdGenerator;
use Throwable;

/**
 * Allocation controller for HESEM QMS Portal.
 *
 * Handles Record-ID allocation, history, voiding, duplicate checks,
 * status queries, .txt placeholder downloads, expanded type listings,
 * and next-ID preview.
 *
 * @package HESEM\QMS\Api\Controllers
 * @since   3.0.0
 */
class AllocationController extends BaseController
{
    /** @var AllocationService|null Lazy-loaded allocation service. */
    private ?AllocationService $allocationService = null;

    /** @var RecordIdGenerator|null Lazy-loaded ID generator. */
    private ?RecordIdGenerator $idGenerator = null;

    // ── Service Access ──────────────────────────────────────────────────────

    /**
     * Get or create the AllocationService instance.
     *
     * @return AllocationService
     */
    private function allocationService(): AllocationService
    {
        if ($this->allocationService === null) {
            $this->allocationService = new AllocationService($this->dataDir);
        }
        return $this->allocationService;
    }

    /**
     * Get or create the RecordIdGenerator instance.
     *
     * @return RecordIdGenerator
     */
    private function idGenerator(): RecordIdGenerator
    {
        if ($this->idGenerator === null) {
            $this->idGenerator = new RecordIdGenerator($this->dataDir);
        }
        return $this->idGenerator;
    }

    // ── Endpoints ───────────────────────────────────────────────────────────

    /**
     * POST allocate — Create a new Record-ID allocation.
     *
     * Action: `record_id_generate`
     *
     * Request body:
     *   - record_type (string, required): Record type code (e.g. "NCR", "CAPA").
     *   - department   (string, required): Department code (e.g. "QA", "PRO").
     *   - job_number   (string, optional): Job order number to link.
     *
     * @return never
     */
    public function allocate(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['record_type', 'department']);

        $recordType = strtoupper(trim((string)($body['record_type'] ?? '')));
        $department = strtoupper(trim((string)($body['department'] ?? '')));
        $jobNumber  = isset($body['job_number']) ? trim((string)$body['job_number']) : null;
        $userId     = (string)($user['username'] ?? $user['user'] ?? 'unknown');

        $this->validatePattern($recordType, '/^[A-Z][A-Z0-9\-]{1,20}$/', 'invalid_record_type');
        $this->validatePattern($department, '/^[A-Z]{2,5}$/', 'invalid_department');

        if ($jobNumber !== null && $jobNumber !== '') {
            $this->validatePattern($jobNumber, '/^JOB-\d{4}-\d{4}$/', 'invalid_job_number');
        } else {
            $jobNumber = null;
        }

        try {
            $result = $this->allocationService()->createAllocation(
                $recordType,
                $department,
                $userId,
                $jobNumber,
            );

            $this->auditLog('record_id_generate', [
                'record_id'   => $result['record_id'],
                'record_type' => $recordType,
                'department'  => $department,
                'job_number'  => $jobNumber,
            ], $userId);

            $this->success([
                'allocation' => $result,
            ], 201);
        } catch (Throwable $e) {
            $this->error('allocation_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET getHistory — Get allocation history with optional filters.
     *
     * Action: `record_id_history`
     *
     * Query params:
     *   - record_type (string, optional): Filter by type.
     *   - department   (string, optional): Filter by department.
     *   - status       (string, optional): Filter by status.
     *   - user         (string, optional): Filter by requesting user.
     *   - date_from    (string, optional): Start date (YYYY-MM-DD).
     *   - date_to      (string, optional): End date (YYYY-MM-DD).
     *   - offset       (int, optional):    Pagination offset (default 0).
     *   - limit        (int, optional):    Page size (default 50, max 200).
     *
     * @return never
     */
    public function getHistory(): never
    {
        $this->requireAuth();

        $filters = [];

        $recordType = $this->query('record_type');
        if ($recordType !== null && $recordType !== '') {
            $filters['record_type'] = strtoupper($recordType);
        }

        $department = $this->query('department');
        if ($department !== null && $department !== '') {
            $filters['department'] = strtoupper($department);
        }

        $status = $this->query('status');
        if ($status !== null && $status !== '') {
            $filters['status'] = strtoupper($status);
        }

        $userFilter = $this->query('user');
        if ($userFilter !== null && $userFilter !== '') {
            $filters['requested_by'] = $userFilter;
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
            $allItems = $this->allocationService()->getHistory($filters);
            $total    = count($allItems);
            $items    = array_slice($allItems, $offset, $limit);

            $this->paginated('allocations', array_values($items), $total, $offset, $limit);
        } catch (Throwable $e) {
            $this->error('history_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST void — Void an unused allocation.
     *
     * Action: `record_id_void`
     *
     * Request body:
     *   - allocation_id (string, required): UUID of the allocation.
     *   - reason        (string, required): Reason for voiding.
     *
     * @return never
     */
    public function void(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['allocation_id', 'reason']);

        $allocationId = trim((string)($body['allocation_id'] ?? ''));
        $reason       = trim((string)($body['reason'] ?? ''));
        $userId       = (string)($user['username'] ?? $user['user'] ?? 'unknown');

        $this->validatePattern(
            $allocationId,
            '/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i',
            'invalid_allocation_id',
        );

        if (mb_strlen($reason) < 5) {
            $this->error('reason_too_short', 400, 'Void reason must be at least 5 characters.');
        }

        try {
            $success = $this->allocationService()->voidAllocation($allocationId, $reason, $userId);

            if (!$success) {
                $this->error('void_failed', 404, 'Allocation not found or already voided.');
            }

            $this->auditLog('record_id_void', [
                'allocation_id' => $allocationId,
                'reason'        => $reason,
            ], $userId);

            $this->success(['voided' => true]);
        } catch (Throwable $e) {
            $this->error('void_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET checkDuplicate — Check if a Record-ID already exists.
     *
     * Action: `record_id_check_duplicate`
     *
     * Query params:
     *   - record_id (string, required): The ID to check.
     *
     * @return never
     */
    public function checkDuplicate(): never
    {
        $this->requireAuth();

        $recordId = $this->query('record_id');
        if ($recordId === null || trim($recordId) === '') {
            $this->error('missing_record_id', 400);
        }

        $recordId = trim($recordId);

        try {
            $exists = $this->allocationService()->checkDuplicate($recordId);

            $this->success([
                'record_id' => $recordId,
                'exists'    => $exists,
            ]);
        } catch (Throwable $e) {
            $this->error('check_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET getStatus — Get allocation status by Record-ID or allocation_id.
     *
     * Action: `upload_allocation_status`
     *
     * Query params:
     *   - record_id     (string, optional): Lookup by Record-ID.
     *   - allocation_id (string, optional): Lookup by allocation UUID.
     *
     * @return never
     */
    public function getStatus(): never
    {
        $this->requireAuth();

        $recordId     = $this->query('record_id');
        $allocationId = $this->query('allocation_id');

        if (($recordId === null || trim($recordId) === '')
            && ($allocationId === null || trim($allocationId) === '')) {
            $this->error('missing_identifier', 400, 'Provide record_id or allocation_id.');
        }

        try {
            $allocation = null;

            if ($recordId !== null && trim($recordId) !== '') {
                $allocation = $this->allocationService()->getByRecordId(trim($recordId));
            }

            if ($allocation === null && $allocationId !== null && trim($allocationId) !== '') {
                // Search by allocation_id in the full log
                $all = $this->allocationService()->getHistory(['allocation_id' => trim($allocationId)]);
                $allocation = $all[0] ?? null;
            }

            if ($allocation === null) {
                $this->error('not_found', 404, 'Allocation not found.');
            }

            $this->success(['allocation' => $allocation]);
        } catch (Throwable $e) {
            $this->error('status_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET downloadTxt — Generate and download an empty .txt file named with the Record-ID.
     *
     * Action: `record_id_download_txt`
     *
     * Query params:
     *   - record_id (string, required): Record-ID for the filename.
     *
     * @return never
     */
    public function downloadTxt(): never
    {
        $user = $this->requireAuth();

        $recordId = $this->query('record_id');
        if ($recordId === null || trim($recordId) === '') {
            $this->error('missing_record_id', 400);
        }

        $recordId = trim($recordId);
        $userId   = (string)($user['username'] ?? $user['user'] ?? 'unknown');

        try {
            $filePath = $this->allocationService()->generateTxtFile($recordId);

            // Update allocation status to DOWNLOADED
            $allocation = $this->allocationService()->getByRecordId($recordId);
            if ($allocation !== null) {
                $this->allocationService()->updateStatus(
                    $allocation['allocation_id'],
                    'DOWNLOADED',
                    $userId,
                );
            }

            $this->auditLog('record_id_download_txt', [
                'record_id' => $recordId,
                'file_path' => $filePath,
            ], $userId);

            // Serve the file
            $filename = basename($filePath);
            header('Content-Type: text/plain; charset=utf-8');
            header('Content-Disposition: attachment; filename="' . $filename . '"');
            header('Content-Length: ' . filesize($filePath));
            header('Cache-Control: no-store, no-cache, must-revalidate');
            readfile($filePath);

            // Clean up temp file
            @unlink($filePath);
            exit;
        } catch (Throwable $e) {
            $this->error('download_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET getExpandedTypes — Get all record types with optional department filter.
     *
     * Action: `record_id_types_expanded`
     *
     * Query params:
     *   - department (string, optional): Filter by department code.
     *
     * @return never
     */
    public function getExpandedTypes(): never
    {
        $this->requireAuth();

        $department = $this->query('department');
        if ($department !== null && $department !== '') {
            $department = strtoupper(trim($department));
        } else {
            $department = null;
        }

        try {
            $registryFile = $this->confDir . '/document_type_registry.json';
            $registry     = $this->readJsonFile($registryFile) ?? [];
            $departments  = $registry['departments'] ?? [];
            $recordTypes  = $registry['record_types'] ?? [];

            $result = [];

            foreach ($recordTypes as $code => $meta) {
                if (!is_array($meta)) {
                    continue;
                }

                // Filter by department if specified
                if ($department !== null) {
                    $deptInfo = $departments[$department] ?? null;
                    if ($deptInfo === null) {
                        continue;
                    }
                    $deptTypes = $deptInfo['record_types'] ?? [];
                    if (!in_array($code, $deptTypes, true)) {
                        continue;
                    }
                }

                $result[] = [
                    'code'        => (string)$code,
                    'label'       => (string)($meta['label'] ?? $code),
                    'label_vi'    => (string)($meta['label_vi'] ?? ''),
                    'format'      => (string)($meta['format'] ?? ''),
                    'digits'      => (int)($meta['digits'] ?? 3),
                    'scope'       => (string)($meta['scope'] ?? ''),
                    'departments' => $this->findDepartmentsForType($departments, (string)$code),
                ];
            }

            // Sort by code
            usort($result, fn(array $a, array $b) => strcmp($a['code'], $b['code']));

            $this->success(['record_types' => $result]);
        } catch (Throwable $e) {
            $this->error('types_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET preview — Preview the next Record-ID without allocating.
     *
     * Action: `record_id_preview`
     *
     * Query params:
     *   - record_type (string, required): Record type code.
     *   - department  (string, optional): Department code.
     *
     * @return never
     */
    public function preview(): never
    {
        $this->requireAuth();

        $recordType = $this->query('record_type');
        if ($recordType === null || trim($recordType) === '') {
            $this->error('missing_record_type', 400);
        }

        $recordType = strtoupper(trim($recordType));
        $department = $this->query('department');
        if ($department !== null && $department !== '') {
            $department = strtoupper(trim($department));
        } else {
            $department = null;
        }

        try {
            // Read current counter value without incrementing
            $year        = (int)date('Y');
            $counterFile = $this->dataDir . '/counters/' . $recordType . '-' . $year . '.txt';
            $current     = 0;

            if (file_exists($counterFile)) {
                $current = (int)trim((string)file_get_contents($counterFile));
            }

            $next = $current + 1;

            // Build preview ID based on common patterns
            $registryFile = $this->confDir . '/document_type_registry.json';
            $registry     = $this->readJsonFile($registryFile) ?? [];
            $typeMeta     = $registry['record_types'][$recordType] ?? [];
            $digits       = (int)($typeMeta['digits'] ?? 3);
            $previewId    = $recordType . '-' . $year . '-' . str_pad((string)$next, $digits, '0', STR_PAD_LEFT);

            $this->success([
                'preview_id'    => $previewId,
                'record_type'   => $recordType,
                'next_sequence' => $next,
                'year'          => $year,
                'note'          => 'Preview only. Actual ID assigned on allocation.',
            ]);
        } catch (Throwable $e) {
            $this->error('preview_failed', 500, $e->getMessage());
        }
    }

    // ── Private Helpers ─────────────────────────────────────────────────────

    /**
     * Find all departments that include a given record type.
     *
     * @param array  $departments Department registry map.
     * @param string $typeCode    Record type code.
     * @return string[]
     */
    private function findDepartmentsForType(array $departments, string $typeCode): array
    {
        $result = [];
        foreach ($departments as $deptCode => $deptInfo) {
            if (!is_array($deptInfo)) {
                continue;
            }
            $types = $deptInfo['record_types'] ?? [];
            if (in_array($typeCode, $types, true)) {
                $result[] = (string)$deptCode;
            }
        }
        return $result;
    }
}
