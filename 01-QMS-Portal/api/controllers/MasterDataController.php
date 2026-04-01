<?php

declare(strict_types=1);

namespace HESEM\QMS\Api\Controllers;

use HESEM\QMS\Services\MasterDataService;
use Throwable;

/**
 * Master Data Controller — CRUD for machines, parts, operators, shifts,
 * work centers, and all 30+ master data entity types.
 */
class MasterDataController extends BaseController
{
    private ?MasterDataService $mdService = null;

    private function mdService(): MasterDataService
    {
        if ($this->mdService === null) {
            $this->mdService = new MasterDataService($this->dataDir, $this->rootDir);
        }
        return $this->mdService;
    }

    private function userId(array $user): string
    {
        return (string)($user['username'] ?? $user['user'] ?? 'unknown');
    }

    /**
     * Load all records for an entity type from master-data.json.
     */
    private function loadEntityRecords(string $entity): array
    {
        $file = $this->dataDir . '/master-data/master-data.json';
        $data = $this->readJsonFile($file);
        if (!$data) return [];
        return is_array($data[$entity] ?? null) ? $data[$entity] : [];
    }

    /**
     * Get a single record by ID from an entity collection.
     */
    private function findRecord(string $entity, string $id): ?array
    {
        $records = $this->loadEntityRecords($entity);
        // Find by any key field
        foreach ($records as $r) {
            if (!is_array($r)) continue;
            // Check common key fields
            foreach (['id', 'machine_id', 'work_center_id', 'item_id', 'operator_id',
                       'customer_id', 'vendor_id', 'part_id', 'shift_code'] as $keyField) {
                if (isset($r[$keyField]) && (string)$r[$keyField] === $id) return $r;
            }
        }
        return null;
    }

    private function shiftDir(): string
    {
        $dir = $this->dataDir . '/shifts';
        if (!is_dir($dir)) @mkdir($dir, 0775, true);
        return $dir;
    }

    // ── Generic Master Data CRUD ────────────────────────────────────────

    /**
     * GET list — List records for any entity type.
     * Query: entity (required), search, status, offset, limit
     */
    public function listRecords(): never
    {
        $this->requireAuth();

        $entity = $this->query('entity') ?? '';
        if ($entity === '') $this->error('missing_entity', 400);

        $search = $this->query('search');
        $status = $this->query('status');

        try {
            $all = $this->loadEntityRecords($entity);

            // Filter by status
            if ($status && $status !== 'all') {
                $all = array_filter($all, fn($r) => ($r['status'] ?? '') === $status);
            }

            // Search
            if ($search && trim($search) !== '') {
                $q = strtolower(trim($search));
                $all = array_filter($all, function ($r) use ($q) {
                    $haystack = strtolower(json_encode($r) ?: '');
                    return strpos($haystack, $q) !== false;
                });
            }

            $offset = max(0, (int)($this->query('offset') ?? 0));
            $limit  = min(500, max(1, (int)($this->query('limit') ?? 100)));

            $this->paginated($entity, array_slice(array_values($all), $offset, $limit), count($all), $offset, $limit);
        } catch (Throwable $e) {
            $this->error('list_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET detail — Get single record.
     * Query: entity, id (required)
     */
    public function getDetail(): never
    {
        $this->requireAuth();

        $entity = $this->query('entity') ?? '';
        $id     = $this->query('id') ?? '';
        if ($entity === '' || $id === '') $this->error('missing_params', 400);

        try {
            $record = $this->findRecord($entity, $id);
            if (!$record) $this->error('not_found', 404);
            $this->success(['record' => $record]);
        } catch (Throwable $e) {
            $this->error('detail_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST create — Create new master data record.
     * Body: entity (required), data (required)
     */
    public function createRecord(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();

        $body   = $this->jsonBody();
        $entity = trim((string)($body['entity'] ?? ''));
        $data   = (array)($body['data'] ?? $body);
        unset($data['entity']);

        if ($entity === '') $this->error('missing_entity', 400);

        $uid = $this->userId($user);

        try {
            $result = $this->mdService()->create($entity, $data, $uid);
            if (!$result->ok) {
                $this->error($result->errorCode ?? 'create_failed', 400, $result->message);
            }
            $this->auditLog('master_data_create', ['entity' => $entity], $uid);
            $this->success(['record' => $result->data ?? $data], 201);
        } catch (Throwable $e) {
            $this->error('create_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST update — Update existing master data record.
     * Body: entity, id, data (required)
     */
    public function updateRecord(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();

        $body   = $this->jsonBody();
        $entity = trim((string)($body['entity'] ?? ''));
        $id     = trim((string)($body['id'] ?? ''));
        $data   = (array)($body['data'] ?? $body);
        unset($data['entity'], $data['id']);

        if ($entity === '' || $id === '') $this->error('missing_params', 400);

        $uid    = $this->userId($user);
        $reason = trim((string)($body['reason'] ?? 'Updated'));

        try {
            $result = $this->mdService()->update($entity, $id, $data, $uid, $reason);
            if (!$result->ok) {
                $this->error($result->errorCode ?? 'update_failed', 400, $result->message);
            }
            $this->auditLog('master_data_update', ['entity' => $entity, 'id' => $id], $uid);
            $this->success(['record' => $result->data ?? $data]);
        } catch (Throwable $e) {
            $this->error('update_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST delete — Delete master data record (with referential integrity check).
     * Body: entity, id (required)
     */
    public function deleteRecord(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();

        $body   = $this->jsonBody();
        $entity = trim((string)($body['entity'] ?? ''));
        $id     = trim((string)($body['id'] ?? ''));

        if ($entity === '' || $id === '') $this->error('missing_params', 400);

        $uid = $this->userId($user);

        try {
            $deps = $this->mdService()->checkReferentialIntegrity($entity, $id);
            if (!empty($deps)) {
                $this->error('has_dependencies', 409, 'Record has ' . count($deps) . ' dependencies. Cannot delete.');
            }

            $delResult = $this->mdService()->delete($entity, $id, $uid);
            if (!$delResult->ok) {
                $this->error($delResult->errorCode ?? 'delete_failed', 400, $delResult->message);
            }
            $this->auditLog('master_data_delete', ['entity' => $entity, 'id' => $id], $uid);
            $this->success(['deleted' => true]);
        } catch (Throwable $e) {
            $this->error('delete_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST changeStatus — Change status of a master data record.
     * Body: entity, id, target_status (required)
     */
    public function changeStatus(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();

        $body   = $this->jsonBody();
        $entity = trim((string)($body['entity'] ?? ''));
        $id     = trim((string)($body['id'] ?? ''));
        $target = trim((string)($body['target_status'] ?? ''));

        if ($entity === '' || $id === '' || $target === '') $this->error('missing_params', 400);

        $uid = $this->userId($user);

        try {
            $result = $this->mdService()->changeStatus($entity, $id, $target, $uid);
            $this->auditLog('master_data_status_change', ['entity' => $entity, 'id' => $id, 'status' => $target], $uid);
            $this->success(['record' => $result]);
        } catch (Throwable $e) {
            $this->error('status_change_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET history — Get change history for a record.
     */
    public function getHistory(): never
    {
        $this->requireAuth();

        $entity = $this->query('entity') ?? '';
        $id     = $this->query('id') ?? '';

        try {
            $history = $this->mdService()->getHistory($entity, $id);
            $this->success(['history' => $history]);
        } catch (Throwable $e) {
            $this->error('history_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET entities — List all available entity types with labels.
     */
    public function listEntities(): never
    {
        $this->requireAuth();

        $entities = [
            ['key' => 'machines',           'label' => 'Máy', 'label_en' => 'Machines', 'icon' => '🏭'],
            ['key' => 'work_centers',       'label' => 'Work Center', 'label_en' => 'Work Centers', 'icon' => '🔧'],
            ['key' => 'parts',              'label' => 'Chi tiết / Part Number', 'label_en' => 'Parts', 'icon' => '⚙'],
            ['key' => 'revisions',          'label' => 'Revision', 'label_en' => 'Revisions', 'icon' => '🔄'],
            ['key' => 'operators',          'label' => 'Người vận hành', 'label_en' => 'Operators', 'icon' => '👷'],
            ['key' => 'customers',          'label' => 'Khách hàng', 'label_en' => 'Customers', 'icon' => '🏢'],
            ['key' => 'suppliers',          'label' => 'Nhà cung cấp', 'label_en' => 'Suppliers', 'icon' => '🚚'],
            ['key' => 'routing_library',    'label' => 'Routing', 'label_en' => 'Routings', 'icon' => '🛤'],
            ['key' => 'bom_library',        'label' => 'BOM', 'label_en' => 'Bill of Materials', 'icon' => '📋'],
            ['key' => 'control_plans',      'label' => 'Control Plan', 'label_en' => 'Control Plans', 'icon' => '📊'],
            ['key' => 'inspection_plans',   'label' => 'Kế hoạch kiểm tra', 'label_en' => 'Inspection Plans', 'icon' => '🔍'],
            ['key' => 'tooling_assets',     'label' => 'Dụng cụ cắt', 'label_en' => 'Tooling Assets', 'icon' => '🔩'],
            ['key' => 'defect_catalog',     'label' => 'Danh mục lỗi', 'label_en' => 'Defect Catalog', 'icon' => '🐛'],
            ['key' => 'shipping_methods',   'label' => 'Phương thức giao', 'label_en' => 'Shipping Methods', 'icon' => '📦'],
            ['key' => 'payment_terms',      'label' => 'Điều khoản thanh toán', 'label_en' => 'Payment Terms', 'icon' => '💳'],
            ['key' => 'incoterms',          'label' => 'Incoterms', 'label_en' => 'Incoterms', 'icon' => '🌍'],
        ];

        $this->success(['entities' => $entities]);
    }

    // ── Shift Management ────────────────────────────────────────────────

    /**
     * GET listShifts — List all shift definitions.
     */
    public function listShifts(): never
    {
        $this->requireAuth();

        try {
            $file   = $this->shiftDir() . '/definitions.json';
            $shifts = $this->readJsonFile($file);

            // Fallback to config if no DB file yet
            if (!$shifts) {
                $configFile = $this->confDir . '/mes_shift_patterns.json';
                $config     = $this->readJsonFile($configFile);
                $shifts     = [];
                if ($config && isset($config['shifts'])) {
                    foreach ($config['shifts'] as $s) {
                        $shifts[] = [
                            'shift_code'      => $s['shift_code'] ?? '',
                            'shift_name'      => $s['label_en'] ?? $s['label'] ?? '',
                            'shift_name_vi'   => $s['label'] ?? '',
                            'start_time'      => $s['start'] ?? '',
                            'end_time'        => $s['end'] ?? '',
                            'duration_minutes' => 480,
                            'break_minutes'   => 30,
                            'color'           => $s['color'] ?? '#3b82f6',
                            'is_active'       => true,
                        ];
                    }
                }
            }

            $this->success(['shifts' => array_values($shifts ?: [])]);
        } catch (Throwable $e) {
            $this->error('shifts_list_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST saveShift — Create or update a shift definition.
     */
    public function saveShift(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['shift_code', 'shift_name', 'start_time', 'end_time']);

        $uid = $this->userId($user);

        try {
            $file   = $this->shiftDir() . '/definitions.json';
            $shifts = $this->readJsonFile($file) ?? [];

            $code      = trim((string)($body['shift_code'] ?? ''));
            $existing  = -1;
            foreach ($shifts as $idx => $s) {
                if (($s['shift_code'] ?? '') === $code) { $existing = $idx; break; }
            }

            $shift = [
                'shift_code'       => $code,
                'shift_name'       => trim((string)($body['shift_name'] ?? '')),
                'shift_name_vi'    => trim((string)($body['shift_name_vi'] ?? $body['shift_name'] ?? '')),
                'start_time'       => trim((string)($body['start_time'] ?? '')),
                'end_time'         => trim((string)($body['end_time'] ?? '')),
                'duration_minutes' => (int)($body['duration_minutes'] ?? 480),
                'break_minutes'    => (int)($body['break_minutes'] ?? 30),
                'color'            => trim((string)($body['color'] ?? '#3b82f6')),
                'is_active'        => (bool)($body['is_active'] ?? true),
                'sort_order'       => (int)($body['sort_order'] ?? 1),
                'updated_at'       => $this->nowIso(),
            ];

            if ($existing >= 0) {
                $shift['created_at'] = $shifts[$existing]['created_at'] ?? $this->nowIso();
                $shifts[$existing]   = $shift;
            } else {
                $shift['created_at'] = $this->nowIso();
                $shifts[] = $shift;
            }

            $this->writeJsonFile($file, $shifts);
            $this->auditLog('shift_save', ['shift_code' => $code], $uid);
            $this->success(['shift' => $shift]);
        } catch (Throwable $e) {
            $this->error('shift_save_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET listShiftAssignments — Get shift assignments for operators.
     * Query: employee_id, start_date, end_date
     */
    public function listShiftAssignments(): never
    {
        $this->requireAuth();

        $employeeId = $this->query('employee_id');
        $startDate  = $this->query('start_date') ?? date('Y-m-d');
        $endDate    = $this->query('end_date') ?? date('Y-m-d', strtotime('+7 days'));

        try {
            $file        = $this->shiftDir() . '/assignments.json';
            $assignments = $this->readJsonFile($file) ?? [];

            $filtered = array_filter($assignments, function ($a) use ($employeeId, $startDate, $endDate) {
                if ($employeeId && ($a['employee_id'] ?? '') !== $employeeId) return false;
                $aStart = $a['start_date'] ?? '';
                $aEnd   = $a['end_date'] ?? '9999-12-31';
                return $aStart <= $endDate && $aEnd >= $startDate;
            });

            $this->success(['assignments' => array_values($filtered)]);
        } catch (Throwable $e) {
            $this->error('assignments_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST saveShiftAssignment — Assign operator to shift.
     */
    public function saveShiftAssignment(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['employee_id', 'shift_code', 'start_date']);

        $uid = $this->userId($user);

        try {
            $file        = $this->shiftDir() . '/assignments.json';
            $assignments = $this->readJsonFile($file) ?? [];

            $assignment = [
                'assignment_id' => 'SA-' . bin2hex(random_bytes(8)),
                'employee_id'   => trim((string)($body['employee_id'] ?? '')),
                'shift_code'    => trim((string)($body['shift_code'] ?? '')),
                'machine_id'    => trim((string)($body['machine_id'] ?? '')),
                'work_center_id'=> trim((string)($body['work_center_id'] ?? '')),
                'start_date'    => trim((string)($body['start_date'] ?? '')),
                'end_date'      => trim((string)($body['end_date'] ?? '')),
                'recurrence'    => trim((string)($body['recurrence'] ?? 'daily')),
                'days_of_week'  => is_array($body['days_of_week'] ?? null) ? $body['days_of_week'] : [],
                'status'        => 'active',
                'notes'         => trim((string)($body['notes'] ?? '')),
                'assigned_by'   => $uid,
                'created_at'    => $this->nowIso(),
                'updated_at'    => $this->nowIso(),
            ];

            $assignments[] = $assignment;
            $this->writeJsonFile($file, $assignments);

            $this->auditLog('shift_assign', [
                'employee_id' => $assignment['employee_id'],
                'shift_code'  => $assignment['shift_code'],
                'machine_id'  => $assignment['machine_id'],
            ], $uid);

            $this->success(['assignment' => $assignment], 201);
        } catch (Throwable $e) {
            $this->error('assignment_save_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET listHolidays — Get holiday calendar.
     */
    public function listHolidays(): never
    {
        $this->requireAuth();

        try {
            $file     = $this->shiftDir() . '/holidays.json';
            $holidays = $this->readJsonFile($file) ?? [];
            $this->success(['holidays' => array_values($holidays)]);
        } catch (Throwable $e) {
            $this->error('holidays_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST saveHoliday — Add or update a holiday.
     */
    public function saveHoliday(): never
    {
        $user = $this->requireAuth();
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['holiday_date', 'holiday_name']);

        $uid = $this->userId($user);

        try {
            $file     = $this->shiftDir() . '/holidays.json';
            $holidays = $this->readJsonFile($file) ?? [];

            $date     = trim((string)($body['holiday_date'] ?? ''));
            $existing = -1;
            foreach ($holidays as $idx => $h) {
                if (($h['holiday_date'] ?? '') === $date) { $existing = $idx; break; }
            }

            $holiday = [
                'holiday_date'         => $date,
                'holiday_name'         => trim((string)($body['holiday_name'] ?? '')),
                'holiday_name_vi'      => trim((string)($body['holiday_name_vi'] ?? $body['holiday_name'] ?? '')),
                'is_full_day'          => (bool)($body['is_full_day'] ?? true),
                'affected_shifts'      => is_array($body['affected_shifts'] ?? null) ? $body['affected_shifts'] : ['morning', 'afternoon', 'night'],
                'is_recurring_annual'  => (bool)($body['is_recurring_annual'] ?? false),
            ];

            if ($existing >= 0) {
                $holidays[$existing] = $holiday;
            } else {
                $holidays[] = $holiday;
            }

            usort($holidays, fn($a, $b) => ($a['holiday_date'] ?? '') <=> ($b['holiday_date'] ?? ''));
            $this->writeJsonFile($file, $holidays);

            $this->auditLog('holiday_save', ['date' => $date, 'name' => $holiday['holiday_name']], $uid);
            $this->success(['holiday' => $holiday]);
        } catch (Throwable $e) {
            $this->error('holiday_save_failed', 500, $e->getMessage());
        }
    }
}
