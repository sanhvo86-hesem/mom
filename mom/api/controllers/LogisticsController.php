<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use Throwable;

/**
 * Logistics Controller.
 *
 * Manages subcontracting (outsource), OQC / final inspection,
 * packing lists, and delivery confirmation for the QMS Portal.
 */
class LogisticsController extends BaseController
{
    private function logisticsDir(): string
    {
        $dir = $this->dataDir . '/logistics';
        if (!is_dir($dir)) @mkdir($dir, 0775, true);
        return $dir;
    }

    private function userId(array $user): string
    {
        return (string)($user['username'] ?? $user['user'] ?? 'unknown');
    }

    private function logisticsReadRoles(): array
    {
        return [
            'admin',
            'it_admin',
            'ceo',
            'production_director',
            'supply_chain_manager',
            'buyer',
            'warehouse_clerk',
            'logistics_coordinator',
            'customer_service',
            'sales_manager',
            'qa_manager',
            'quality_engineer',
            'qc_inspector',
        ];
    }

    private function subcontractWriteRoles(): array
    {
        return [
            'admin',
            'it_admin',
            'ceo',
            'production_director',
            'supply_chain_manager',
            'buyer',
            'logistics_coordinator',
        ];
    }

    private function receivingRoles(): array
    {
        return array_values(array_unique(array_merge(
            $this->subcontractWriteRoles(),
            ['qa_manager', 'quality_engineer', 'qc_inspector', 'warehouse_clerk']
        )));
    }

    private function packingWriteRoles(): array
    {
        return [
            'admin',
            'it_admin',
            'ceo',
            'production_director',
            'supply_chain_manager',
            'logistics_coordinator',
            'warehouse_clerk',
            'customer_service',
            'sales_manager',
        ];
    }

    private function requireLogisticsReadAccess(array $user): void
    {
        $this->requireAnyRole($user, $this->logisticsReadRoles());
    }

    private function requireSubcontractWriteAccess(array $user): void
    {
        $this->requireAnyRole($user, $this->subcontractWriteRoles());
    }

    private function requireReceivingAccess(array $user): void
    {
        $this->requireAnyRole($user, $this->receivingRoles());
    }

    private function requirePackingWriteAccess(array $user): void
    {
        $this->requireAnyRole($user, $this->packingWriteRoles());
    }

    /**
     * Generate a sequential number: PREFIX-YYYY-NNNN.
     *
     * Reads/increments a counter stored in data/counters/logistics_{type}_{year}.json
     *
     * @param string $prefix e.g. 'SC', 'OQC', 'PK'
     * @param string $type   Counter type key (subcontract, oqc, packing)
     * @return string
     */
    private function nextNumber(string $prefix, string $type): string
    {
        $year       = date('Y');
        $counterDir = $this->dataDir . '/counters';
        if (!is_dir($counterDir)) @mkdir($counterDir, 0775, true);

        $counterFile = $counterDir . '/logistics_' . $type . '_' . $year . '.json';
        $counter     = $this->readJsonFile($counterFile) ?? ['seq' => 0];
        $counter['seq'] = ((int)($counter['seq'] ?? 0)) + 1;
        $this->writeJsonFile($counterFile, $counter);

        return $prefix . '-' . $year . '-' . str_pad((string)$counter['seq'], 4, '0', STR_PAD_LEFT);
    }

    // â”€â”€ SUBCONTRACT ENDPOINTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    private const SUBCONTRACT_STATUSES  = ['planned', 'shipped_out', 'at_vendor', 'received', 'inspected', 'closed'];
    private const SUBCONTRACT_PROCESSES = ['heat_treat', 'plating', 'grinding', 'ndt', 'painting', 'anodize', 'passivate', 'other'];

    /**
     * GET subcontract_list -- List subcontract orders with filters (status, vendor, date range).
     */
    public function subcontract_list(): never
    {
        $user = $this->requireAuth();
        $this->requireLogisticsReadAccess($user);

        $status   = $this->query('status');
        $vendorId = $this->query('vendor_id');
        $dateFrom = $this->query('date_from');
        $dateTo   = $this->query('date_to');

        try {
            $file  = $this->logisticsDir() . '/subcontracts.json';
            $items = $this->readJsonFile($file) ?? [];

            $filtered = array_filter($items, function ($r) use ($status, $vendorId, $dateFrom, $dateTo) {
                if ($status && ($r['status'] ?? '') !== $status) return false;
                if ($vendorId && ($r['vendor_id'] ?? '') !== $vendorId) return false;
                if ($dateFrom && ($r['ship_out_date'] ?? '') < $dateFrom) return false;
                if ($dateTo && ($r['ship_out_date'] ?? '') > $dateTo) return false;
                return true;
            });

            usort($filtered, fn($a, $b) => ($b['created_at'] ?? '') <=> ($a['created_at'] ?? ''));

            $offset = max(0, (int)($this->query('offset') ?? 0));
            $limit  = min(200, max(1, (int)($this->query('limit') ?? 50)));

            $this->paginated('subcontracts', array_slice(array_values($filtered), $offset, $limit), count($filtered), $offset, $limit);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('subcontract_list_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST subcontract_create -- Create a new subcontract order.
     */
    public function subcontract_create(): never
    {
        $user = $this->requireAuth();
        $this->requireSubcontractWriteAccess($user);
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['wo_number', 'vendor_id', 'process_type']);

        $processType = trim((string)($body['process_type'] ?? ''));
        if (!in_array($processType, self::SUBCONTRACT_PROCESSES, true)) {
            $this->error('invalid_process_type', 400, 'Allowed: ' . implode(', ', self::SUBCONTRACT_PROCESSES));
        }

        $uid = $this->userId($user);
        $now = $this->nowIso();

        try {
            $file  = $this->logisticsDir() . '/subcontracts.json';
            $items = $this->readJsonFile($file) ?? [];

            $scNumber = $this->nextNumber('SC', 'subcontract');

            $record = [
                'id'                   => bin2hex(random_bytes(8)),
                'sc_number'            => $scNumber,
                'wo_number'            => trim((string)($body['wo_number'] ?? '')),
                'jo_number'            => trim((string)($body['jo_number'] ?? '')),
                'vendor_id'            => trim((string)($body['vendor_id'] ?? '')),
                'vendor_name'          => trim((string)($body['vendor_name'] ?? '')),
                'process_type'         => $processType,
                'process_spec'         => trim((string)($body['process_spec'] ?? '')),
                'item_id'              => trim((string)($body['item_id'] ?? '')),
                'qty_sent'             => (int)($body['qty_sent'] ?? 0),
                'ship_out_date'        => trim((string)($body['ship_out_date'] ?? '')),
                'expected_return_date' => trim((string)($body['expected_return_date'] ?? '')),
                'nadcap_required'      => (bool)($body['nadcap_required'] ?? false),
                'coc_required'         => (bool)($body['coc_required'] ?? false),
                'notes'                => trim((string)($body['notes'] ?? '')),
                'status'               => 'planned',
                'created_by'           => $uid,
                'created_at'           => $now,
                'updated_at'           => $now,
            ];

            $items[] = $record;
            $this->writeJsonFile($file, $items);

            $this->auditLog('subcontract_create', [
                'id'        => $record['id'],
                'sc_number' => $record['sc_number'],
                'wo_number' => $record['wo_number'],
                'vendor_id' => $record['vendor_id'],
            ], $uid);

            $this->success(['subcontract' => $record], 201);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('subcontract_create_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST subcontract_update -- Update subcontract fields and/or status transition.
     */
    public function subcontract_update(): never
    {
        $user = $this->requireAuth();
        $this->requireSubcontractWriteAccess($user);
        $this->requireCsrf();

        $body = $this->jsonBody();
        $id   = trim((string)($body['subcontract_id'] ?? $body['id'] ?? ''));
        if ($id === '') $this->error('missing_subcontract_id', 400);

        $uid = $this->userId($user);
        $now = $this->nowIso();

        try {
            $file    = $this->logisticsDir() . '/subcontracts.json';
            $items   = $this->readJsonFile($file) ?? [];
            $updated = null;

            foreach ($items as &$r) {
                if (($r['id'] ?? '') === $id || ($r['sc_number'] ?? '') === $id) {
                    $editable = [
                        'wo_number', 'jo_number', 'vendor_id', 'vendor_name',
                        'process_type', 'process_spec', 'item_id', 'qty_sent',
                        'ship_out_date', 'expected_return_date',
                        'nadcap_required', 'coc_required', 'notes',
                    ];
                    foreach ($editable as $field) {
                        if (array_key_exists($field, $body)) $r[$field] = $body[$field];
                    }

                    // Status transition
                    if (isset($body['status'])) {
                        $newStatus = (string)$body['status'];
                        if (in_array($newStatus, self::SUBCONTRACT_STATUSES, true)) {
                            $r['status'] = $newStatus;
                        }
                    }

                    $r['updated_at'] = $now;
                    $updated = $r;
                    break;
                }
            }
            unset($r);

            if (!$updated) $this->error('subcontract_not_found', 404);

            $this->writeJsonFile($file, $items);
            $this->auditLog('subcontract_update', ['id' => $id, 'status' => $updated['status'] ?? ''], $uid);
            $this->success(['subcontract' => $updated]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('subcontract_update_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST subcontract_receive -- Mark subcontract as received with QC results.
     */
    public function subcontract_receive(): never
    {
        $user = $this->requireAuth();
        $this->requireReceivingAccess($user);
        $this->requireCsrf();

        $body = $this->jsonBody();
        $id   = trim((string)($body['subcontract_id'] ?? ''));
        if ($id === '') $this->error('missing_subcontract_id', 400);

        $uid = $this->userId($user);
        $now = $this->nowIso();

        try {
            $file  = $this->logisticsDir() . '/subcontracts.json';
            $items = $this->readJsonFile($file) ?? [];
            $updated = null;

            foreach ($items as &$r) {
                if (($r['id'] ?? '') === $id || ($r['sc_number'] ?? '') === $id) {
                    $r['status']                = 'received';
                    $r['received_date']         = trim((string)($body['received_date'] ?? date('Y-m-d')));
                    $r['qty_received']          = (int)($body['qty_received'] ?? 0);
                    $r['qty_accepted']          = (int)($body['qty_accepted'] ?? 0);
                    $r['qty_rejected']          = (int)($body['qty_rejected'] ?? 0);
                    $r['coc_received']          = (bool)($body['coc_received'] ?? false);
                    $r['test_report_received']  = (bool)($body['test_report_received'] ?? false);
                    $r['inspection_result']     = trim((string)($body['inspection_result'] ?? 'accept'));
                    $r['ncr_reference']         = trim((string)($body['ncr_reference'] ?? ''));
                    $r['receive_notes']         = trim((string)($body['notes'] ?? ''));
                    $r['received_by']           = $uid;
                    $r['updated_at']            = $now;
                    $updated = $r;
                    break;
                }
            }
            unset($r);

            if (!$updated) $this->error('subcontract_not_found', 404);

            $this->writeJsonFile($file, $items);

            $this->auditLog('subcontract_receive', [
                'id'                => $id,
                'qty_received'      => $updated['qty_received'],
                'qty_accepted'      => $updated['qty_accepted'],
                'qty_rejected'      => $updated['qty_rejected'],
                'inspection_result' => $updated['inspection_result'],
            ], $uid);

            $this->success(['subcontract' => $updated]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('subcontract_receive_failed', 500, $e->getMessage());
        }
    }

    // â”€â”€ OQC ENDPOINTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    private const OQC_TYPES   = ['final_inspection', 'oqc_sampling', 'customer_witness'];
    private const OQC_RESULTS = ['pending', 'pass', 'fail', 'conditional'];

    /**
     * GET oqc_list -- List OQC / final inspection records with filters.
     */
    public function oqc_list(): never
    {
        $user = $this->requireAuth();
        $this->requireLogisticsReadAccess($user);

        $status   = $this->query('status');
        $soNumber = $this->query('so_number');
        $dateFrom = $this->query('date_from');
        $dateTo   = $this->query('date_to');

        try {
            $file  = $this->logisticsDir() . '/oqc.json';
            $items = $this->readJsonFile($file) ?? [];

            $filtered = array_filter($items, function ($r) use ($status, $soNumber, $dateFrom, $dateTo) {
                if ($status && ($r['result'] ?? '') !== $status) return false;
                if ($soNumber && ($r['so_number'] ?? '') !== $soNumber) return false;
                if ($dateFrom && ($r['created_at'] ?? '') < $dateFrom) return false;
                if ($dateTo && ($r['created_at'] ?? '') > $dateTo) return false;
                return true;
            });

            usort($filtered, fn($a, $b) => ($b['created_at'] ?? '') <=> ($a['created_at'] ?? ''));

            $offset = max(0, (int)($this->query('offset') ?? 0));
            $limit  = min(200, max(1, (int)($this->query('limit') ?? 50)));

            $this->paginated('oqc_records', array_slice(array_values($filtered), $offset, $limit), count($filtered), $offset, $limit);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('oqc_list_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST oqc_create -- Create an OQC / final inspection record.
     */
    public function oqc_create(): never
    {
        $user = $this->requireAuth();
        $this->requireReceivingAccess($user);
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['so_number', 'item_id', 'qty_inspected']);

        $oqcType = trim((string)($body['oqc_type'] ?? 'final_inspection'));
        if (!in_array($oqcType, self::OQC_TYPES, true)) {
            $this->error('invalid_oqc_type', 400, 'Allowed: ' . implode(', ', self::OQC_TYPES));
        }

        $uid = $this->userId($user);
        $now = $this->nowIso();

        try {
            $file  = $this->logisticsDir() . '/oqc.json';
            $items = $this->readJsonFile($file) ?? [];

            $oqcNumber = $this->nextNumber('OQC', 'oqc');

            $record = [
                'id'                       => bin2hex(random_bytes(8)),
                'oqc_number'               => $oqcNumber,
                'so_number'                => trim((string)($body['so_number'] ?? '')),
                'jo_number'                => trim((string)($body['jo_number'] ?? '')),
                'wo_number'                => trim((string)($body['wo_number'] ?? '')),
                'item_id'                  => trim((string)($body['item_id'] ?? '')),
                'lot_number'               => trim((string)($body['lot_number'] ?? '')),
                'serial_numbers'           => is_array($body['serial_numbers'] ?? null) ? $body['serial_numbers'] : [],
                'qty_inspected'            => (int)($body['qty_inspected'] ?? 0),
                'qty_accepted'             => 0,
                'qty_rejected'             => 0,
                'oqc_type'                 => $oqcType,
                'inspection_plan_ref'      => trim((string)($body['inspection_plan_ref'] ?? '')),
                'measurements'             => is_array($body['measurements'] ?? null) ? $body['measurements'] : [],
                'photos'                   => is_array($body['photos'] ?? null) ? $body['photos'] : [],
                'customer_witness_required'=> (bool)($body['customer_witness_required'] ?? false),
                'customer_witness_name'    => trim((string)($body['customer_witness_name'] ?? '')),
                'notes'                    => trim((string)($body['notes'] ?? '')),
                'result'                   => 'pending',
                'ncr_reference'            => '',
                'approved_by'              => '',
                'created_by'               => $uid,
                'created_at'               => $now,
                'updated_at'               => $now,
            ];

            $items[] = $record;
            $this->writeJsonFile($file, $items);

            $this->auditLog('oqc_create', [
                'id'         => $record['id'],
                'oqc_number' => $record['oqc_number'],
                'so_number'  => $record['so_number'],
                'item_id'    => $record['item_id'],
                'oqc_type'   => $record['oqc_type'],
            ], $uid);

            $this->success(['oqc' => $record], 201);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('oqc_create_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST oqc_update -- Update OQC record with inspection results.
     */
    public function oqc_update(): never
    {
        $user = $this->requireAuth();
        $this->requireReceivingAccess($user);
        $this->requireCsrf();

        $body = $this->jsonBody();
        $id   = trim((string)($body['oqc_id'] ?? $body['id'] ?? ''));
        if ($id === '') $this->error('missing_oqc_id', 400);

        $uid = $this->userId($user);
        $now = $this->nowIso();

        try {
            $file    = $this->logisticsDir() . '/oqc.json';
            $items   = $this->readJsonFile($file) ?? [];
            $updated = null;

            foreach ($items as &$r) {
                if (($r['id'] ?? '') === $id || ($r['oqc_number'] ?? '') === $id) {
                    if (array_key_exists('qty_accepted', $body))  $r['qty_accepted']  = (int)$body['qty_accepted'];
                    if (array_key_exists('qty_rejected', $body))  $r['qty_rejected']  = (int)$body['qty_rejected'];
                    if (array_key_exists('measurements', $body) && is_array($body['measurements'])) {
                        $r['measurements'] = $body['measurements'];
                    }
                    if (array_key_exists('ncr_reference', $body)) $r['ncr_reference'] = trim((string)$body['ncr_reference']);
                    if (array_key_exists('approved_by', $body))   $r['approved_by']   = trim((string)$body['approved_by']);
                    if (array_key_exists('notes', $body))         $r['notes']         = trim((string)$body['notes']);

                    // Result transition
                    if (isset($body['result'])) {
                        $newResult = (string)$body['result'];
                        if (in_array($newResult, self::OQC_RESULTS, true)) {
                            $r['result'] = $newResult;

                            // If fail, flag for NCR creation
                            if ($newResult === 'fail' && empty($r['ncr_reference'])) {
                                $r['ncr_required'] = true;
                            }
                        }
                    }

                    $r['updated_at'] = $now;
                    $updated = $r;
                    break;
                }
            }
            unset($r);

            if (!$updated) $this->error('oqc_not_found', 404);

            $this->writeJsonFile($file, $items);

            $this->auditLog('oqc_update', [
                'id'     => $id,
                'result' => $updated['result'] ?? '',
            ], $uid);

            $this->success(['oqc' => $updated]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('oqc_update_failed', 500, $e->getMessage());
        }
    }

    // â”€â”€ PACKING ENDPOINTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    private const PACKING_STATUSES = ['draft', 'packed', 'verified', 'shipped'];

    /**
     * POST packing_create -- Create a packing list for a sales order.
     */
    public function packing_create(): never
    {
        $user = $this->requireAuth();
        $this->requirePackingWriteAccess($user);
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['so_number']);

        $uid = $this->userId($user);
        $now = $this->nowIso();

        try {
            $file  = $this->logisticsDir() . '/packing.json';
            $items = $this->readJsonFile($file) ?? [];

            $pkNumber = $this->nextNumber('PK', 'packing');

            $record = [
                'id'                      => bin2hex(random_bytes(8)),
                'pk_number'               => $pkNumber,
                'so_number'               => trim((string)($body['so_number'] ?? '')),
                'customer_id'             => trim((string)($body['customer_id'] ?? '')),
                'customer_name'           => trim((string)($body['customer_name'] ?? '')),
                'packing_date'            => trim((string)($body['packing_date'] ?? date('Y-m-d'))),
                'items'                   => is_array($body['items'] ?? null) ? $body['items'] : [],
                'total_packages'          => (int)($body['total_packages'] ?? 0),
                'total_weight_kg'         => (float)($body['total_weight_kg'] ?? 0),
                'special_packaging_notes' => trim((string)($body['special_packaging_notes'] ?? '')),
                'coc_reference'           => trim((string)($body['coc_reference'] ?? '')),
                'status'                  => 'draft',
                'created_by'              => $uid,
                'created_at'              => $now,
                'updated_at'              => $now,
            ];

            $items[] = $record;
            $this->writeJsonFile($file, $items);

            $this->auditLog('packing_create', [
                'id'        => $record['id'],
                'pk_number' => $record['pk_number'],
                'so_number' => $record['so_number'],
            ], $uid);

            $this->success(['packing' => $record], 201);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('packing_create_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST packing_update -- Update packing list fields, add items, change status.
     */
    public function packing_update(): never
    {
        $user = $this->requireAuth();
        $this->requirePackingWriteAccess($user);
        $this->requireCsrf();

        $body = $this->jsonBody();
        $id   = trim((string)($body['packing_id'] ?? $body['id'] ?? ''));
        if ($id === '') $this->error('missing_packing_id', 400);

        $uid = $this->userId($user);
        $now = $this->nowIso();

        try {
            $file    = $this->logisticsDir() . '/packing.json';
            $items   = $this->readJsonFile($file) ?? [];
            $updated = null;

            foreach ($items as &$r) {
                if (($r['id'] ?? '') === $id || ($r['pk_number'] ?? '') === $id) {
                    $editable = [
                        'customer_id', 'customer_name', 'packing_date',
                        'total_packages', 'total_weight_kg',
                        'special_packaging_notes', 'coc_reference',
                    ];
                    foreach ($editable as $field) {
                        if (array_key_exists($field, $body)) $r[$field] = $body[$field];
                    }

                    // Replace or merge items array
                    if (array_key_exists('items', $body) && is_array($body['items'])) {
                        $r['items'] = $body['items'];
                    }

                    // Status transition
                    if (isset($body['status'])) {
                        $newStatus = (string)$body['status'];
                        if (in_array($newStatus, self::PACKING_STATUSES, true)) {
                            $r['status'] = $newStatus;
                        }
                    }

                    $r['updated_at'] = $now;
                    $updated = $r;
                    break;
                }
            }
            unset($r);

            if (!$updated) $this->error('packing_not_found', 404);

            $this->writeJsonFile($file, $items);
            $this->auditLog('packing_update', ['id' => $id, 'status' => $updated['status'] ?? ''], $uid);
            $this->success(['packing' => $updated]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('packing_update_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET packing_list -- List packing lists with filters.
     */
    public function packing_list(): never
    {
        $user = $this->requireAuth();
        $this->requireLogisticsReadAccess($user);

        $status   = $this->query('status');
        $soNumber = $this->query('so_number');
        $dateFrom = $this->query('date_from');
        $dateTo   = $this->query('date_to');

        try {
            $file  = $this->logisticsDir() . '/packing.json';
            $items = $this->readJsonFile($file) ?? [];

            $filtered = array_filter($items, function ($r) use ($status, $soNumber, $dateFrom, $dateTo) {
                if ($status && ($r['status'] ?? '') !== $status) return false;
                if ($soNumber && ($r['so_number'] ?? '') !== $soNumber) return false;
                if ($dateFrom && ($r['packing_date'] ?? '') < $dateFrom) return false;
                if ($dateTo && ($r['packing_date'] ?? '') > $dateTo) return false;
                return true;
            });

            usort($filtered, fn($a, $b) => ($b['created_at'] ?? '') <=> ($a['created_at'] ?? ''));

            $offset = max(0, (int)($this->query('offset') ?? 0));
            $limit  = min(200, max(1, (int)($this->query('limit') ?? 50)));

            $this->paginated('packing_lists', array_slice(array_values($filtered), $offset, $limit), count($filtered), $offset, $limit);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('packing_list_failed', 500, $e->getMessage());
        }
    }

    // â”€â”€ DELIVERY ENDPOINT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * POST delivery_confirm -- Confirm delivery of a shipment.
     */
    public function delivery_confirm(): never
    {
        $user = $this->requireAuth();
        $this->requirePackingWriteAccess($user);
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['so_number']);

        $uid = $this->userId($user);
        $now = $this->nowIso();

        try {
            // Record delivery confirmation
            $file       = $this->logisticsDir() . '/deliveries.json';
            $deliveries = $this->readJsonFile($file) ?? [];

            $record = [
                'id'                      => bin2hex(random_bytes(8)),
                'so_number'               => trim((string)($body['so_number'] ?? '')),
                'packing_id'              => trim((string)($body['packing_id'] ?? '')),
                'tracking_number'         => trim((string)($body['tracking_number'] ?? '')),
                'carrier'                 => trim((string)($body['carrier'] ?? '')),
                'ship_date'               => trim((string)($body['ship_date'] ?? '')),
                'delivery_date_est'       => trim((string)($body['delivery_date_est'] ?? '')),
                'delivery_confirmed'      => (bool)($body['delivery_confirmed'] ?? false),
                'delivery_confirmed_date' => trim((string)($body['delivery_confirmed_date'] ?? '')),
                'recipient_name'          => trim((string)($body['recipient_name'] ?? '')),
                'notes'                   => trim((string)($body['notes'] ?? '')),
                'confirmed_by'            => $uid,
                'created_at'              => $now,
                'updated_at'              => $now,
            ];

            $deliveries[] = $record;
            $this->writeJsonFile($file, $deliveries);

            // If packing_id provided, update packing list status to 'shipped'
            if ($record['packing_id'] !== '') {
                $pkFile  = $this->logisticsDir() . '/packing.json';
                $pkItems = $this->readJsonFile($pkFile) ?? [];
                foreach ($pkItems as &$pk) {
                    if (($pk['id'] ?? '') === $record['packing_id'] || ($pk['pk_number'] ?? '') === $record['packing_id']) {
                        $pk['status']      = 'shipped';
                        $pk['updated_at']  = $now;
                        break;
                    }
                }
                unset($pk);
                $this->writeJsonFile($pkFile, $pkItems);
            }

            $this->auditLog('delivery_confirm', [
                'id'              => $record['id'],
                'so_number'       => $record['so_number'],
                'packing_id'      => $record['packing_id'],
                'tracking_number' => $record['tracking_number'],
            ], $uid);

            $this->success(['delivery' => $record], 201);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('delivery_confirm_failed', 500, $e->getMessage());
        }
    }
}
