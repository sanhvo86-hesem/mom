<?php

declare(strict_types=1);

namespace MOM\Services;

use RuntimeException;

/**
 * Shipment Readiness Gate Service for HESEM MOM Portal.
 *
 * Evaluates a 10-point checklist to determine whether a Sales Order
 * is ready for shipment. Checks contract review, JO completion,
 * NCR/CAPA status, holds, documents, FAI, export control, and more.
 *
 * @package MOM\Services
 * @since   4.0.0
 */
final class ShipmentGateService
{
    private readonly string $dataDir;
    private readonly string $confDir;
    private ?object $db = null;
    private ?OperationalOverrideService $overrideService = null;

    /** Roles permitted to invoke shipment readiness checks. */
    private const ALLOWED_ROLES = [
        'admin', 'shipping_coordinator', 'logistics_coordinator', 'logistics_manager',
        'warehouse_clerk', 'customer_service', 'qa_manager',
        'production_director', 'ceo', 'it_admin', 'qms_engineer',
        'supply_chain_manager', 'sales_manager',
    ];

    /** Roles permitted to override (waive) a failed gate with documented reason. */
    private const OVERRIDE_ROLES = [
        'qa_manager', 'production_director', 'ceo', 'it_admin',
    ];

    /** Default gate configuration used when no config file exists. */
    private const DEFAULT_GATES = [
        ['code' => 'SG-01', 'label' => 'Contract review completed',              'label_vi' => 'Xem xet hop dong hoan thanh',        'required' => true],
        ['code' => 'SG-02', 'label' => 'All JOs completed or closed',            'label_vi' => 'Tat ca JO hoan thanh hoac dong',      'required' => true],
        ['code' => 'SG-03', 'label' => 'No open NCRs against this SO',           'label_vi' => 'Khong co NCR mo cho SO nay',          'required' => true],
        ['code' => 'SG-04', 'label' => 'No active holds on SO',                  'label_vi' => 'Khong co hold tren SO',               'required' => true],
        ['code' => 'SG-05', 'label' => 'Required documents received',            'label_vi' => 'Tai lieu yeu cau da nhan',            'required' => true],
        ['code' => 'SG-06', 'label' => 'All CAPA actions closed',                'label_vi' => 'Tat ca CAPA da dong',                 'required' => true],
        ['code' => 'SG-07', 'label' => 'FAI approved (if first article)',         'label_vi' => 'FAI duoc duyet (neu can)',            'required' => false],
        ['code' => 'SG-08', 'label' => 'Export control cleared (if required)',    'label_vi' => 'Kiem soat xuat khau da thong qua',    'required' => false],
        ['code' => 'SG-09', 'label' => 'Packing/labeling spec confirmed',        'label_vi' => 'Quy cach dong goi/nhan da xac nhan', 'required' => true],
        ['code' => 'SG-10', 'label' => 'Customer source inspection completed',   'label_vi' => 'Kiem tra nguon khach hang hoan thanh', 'required' => false],
    ];

    // ── Construction ────────────────────────────────────────────────────────

    /**
     * @param string $dataDir Absolute path to data directory.
     * @param string $confDir Absolute path to data/config directory.
     */
    public function __construct(string $dataDir, string $confDir, ?object $db = null)
    {
        $this->dataDir = rtrim(str_replace('\\', '/', $dataDir), '/');
        $this->confDir = rtrim(str_replace('\\', '/', $confDir), '/');
        $this->db      = $db;
    }

    // ── Shadow Write ────────────────────────────────────────────────────────

    private function shadowWriteToDb(string $table, string $idColumn, string $idValue, array $row): void
    {
        if ($this->db === null) return;
        try {
            $meta = json_encode($row, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            $this->db->execute(
                "INSERT INTO {$table} ({$idColumn}, metadata, created_at) VALUES (:id, :meta::jsonb, NOW())
                 ON CONFLICT ({$idColumn}) DO UPDATE SET metadata = EXCLUDED.metadata",
                [':id' => $idValue, ':meta' => $meta]
            );
        } catch (\Throwable $e) {
            error_log("[ShipmentGateService] Shadow write to {$table} failed: " . $e->getMessage());
        }
    }

    private function overrideService(): OperationalOverrideService
    {
        if ($this->overrideService === null) {
            $this->overrideService = new OperationalOverrideService($this->dataDir, $this->confDir);
        }

        return $this->overrideService;
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Check shipment readiness for a Sales Order.
     *
     * Returns a checklist with pass/fail per gate item and overall readiness.
     * Enforces RBAC and writes an audit trail entry for every check.
     *
     * @param string      $soNumber Sales Order number.
     * @param string|null $userId   User performing the check (required for audit).
     * @param string|null $userRole Role of the user (required for RBAC).
     * @return array{ready: bool, so_number: string, checked_at: string, checked_by: string, checked_role: string, items: array, failed_gates: array<int, string>, overrides: array}
     */
    public function checkReadiness(string $soNumber, ?string $userId = null, ?string $userRole = null): array
    {
        // ── RBAC enforcement ────────────────────────────────────────────
        if ($userRole !== null && !$this->isRoleAllowed($userRole, self::ALLOWED_ROLES)) {
            throw new RuntimeException(
                "Access denied: role '{$userRole}' is not permitted to perform shipment readiness checks."
            );
        }

        $orders = $this->loadOrders();
        $so     = $this->findSo($soNumber, $orders);

        if ($so === null) {
            throw new RuntimeException("Sales Order {$soNumber} not found.");
        }

        $config    = $this->getGateConfig();
        $gates     = $config['gates'] ?? self::DEFAULT_GATES;
        $overrides = $this->loadOverrides($soNumber);
        $items     = [];
        $allPass   = true;
        $failedGates = [];

        foreach ($gates as $gate) {
            $code     = $gate['code'] ?? '';
            $required = (bool)($gate['required'] ?? true);

            $check  = $this->evaluateGate($code, $soNumber, $so, $orders);
            $status = $check['status'];
            $detail = $check['detail'] ?? '';

            // Check if a failed required gate has been overridden
            $overridden = false;
            if ($required && $status === 'fail' && isset($overrides[$code])) {
                $overridden = true;
                $status     = 'waived';
                $detail     = 'Overridden: ' . ($overrides[$code]['reason_text'] ?? $overrides[$code]['reason'] ?? '');
            }

            if ($required && $status === 'fail') {
                $allPass = false;
                $failedGates[] = $code;
            }

            $items[] = [
                'code'       => $code,
                'label'      => $gate['label'] ?? '',
                'label_vi'   => $gate['label_vi'] ?? '',
                'required'   => $required,
                'status'     => $status,
                'detail'     => $detail,
                'overridden' => $overridden,
            ];
        }

        $now    = $this->nowIso();
        $result = [
            'ready'        => $allPass,
            'so_number'    => $soNumber,
            'checked_at'   => $now,
            'checked_by'   => $userId ?? 'system',
            'checked_role' => $userRole ?? 'system',
            'items'        => $items,
            'failed_gates' => $failedGates,
            'overrides'    => $overrides,
        ];

        // ── Audit trail: record every readiness check ────────────────────
        $this->appendAuditLog($soNumber, [
            'action'       => 'shipment_readiness_check',
            'ready'        => $allPass,
            'failed_gates' => $failedGates,
            'checked_by'   => $userId ?? 'system',
            'checked_role' => $userRole ?? 'system',
            'timestamp'    => $now,
            'gate_count'   => count($items),
            'pass_count'   => count(array_filter($items, fn($i) => $i['status'] === 'pass')),
            'fail_count'   => count(array_filter($items, fn($i) => $i['status'] === 'fail')),
            'waived_count' => count(array_filter($items, fn($i) => $i['status'] === 'waived')),
        ]);

        return $result;
    }

    /**
     * Override (waive) a failed gate with documented reason and approval.
     *
     * Only OVERRIDE_ROLES can perform this action. Creates an audit trail entry.
     *
     * @param string $soNumber  Sales Order number.
     * @param string $gateCode  Gate code to override (e.g. "SG-03").
     * @param string $reason    Mandatory reason for the override.
     * @param string $userId    Approving user.
     * @param string $userRole  Role of the approving user.
     * @return array The override record.
     */
    public function overrideGate(
        string $soNumber,
        string $gateCode,
        string $reason,
        string $userId,
        string $userRole,
        ?string $reasonCode = null,
        ?string $expiresAt = null,
        ?string $approvalReference = null,
    ): array {
        if (!$this->isRoleAllowed($userRole, self::OVERRIDE_ROLES)) {
            throw new RuntimeException(
                "Access denied: role '{$userRole}' cannot override shipment gates. " .
                "Required: " . implode(', ', self::OVERRIDE_ROLES)
            );
        }

        if (trim($reason) === '') {
            throw new RuntimeException('Override reason is required.');
        }

        // Validate gate code against configured gates
        $config     = $this->getGateConfig();
        $gates      = $config['gates'] ?? self::DEFAULT_GATES;
        $validCodes = array_column($gates, 'code');
        if (!in_array($gateCode, $validCodes, true)) {
            throw new RuntimeException("Invalid gate code '{$gateCode}'. Valid codes: " . implode(', ', $validCodes));
        }

        $override = $this->overrideService()->createOverride([
            'override_type' => 'shipment_gate_override',
            'subject_type' => 'sales_order',
            'subject_id' => $soNumber,
            'control_family' => 'shipment_gate',
            'control_code' => $gateCode,
            'reason_code' => trim((string)($reasonCode ?: 'risk_accepted_by_quality')),
            'reason_text' => $reason,
            'requested_by' => $userId,
            'requested_role' => $userRole,
            'approved_by' => $userId,
            'approved_role' => $userRole,
            'expires_at' => trim((string)$expiresAt),
            'approval_reference' => trim((string)$approvalReference),
            'source_context' => [
                'so_number' => $soNumber,
                'gate_code' => $gateCode,
            ],
        ]);

        // Audit trail
        $this->appendAuditLog($soNumber, [
            'action'     => 'gate_override',
            'gate_code'  => $gateCode,
            'override_id' => $override['override_id'] ?? null,
            'reason_code' => $override['reason_code'] ?? null,
            'reason'     => $reason,
            'user'       => $userId,
            'role'       => $userRole,
            'timestamp'  => $override['approved_at'] ?? $this->nowIso(),
        ]);

        return $override;
    }

    /**
     * List shipment gate overrides for one SO, newest first.
     *
     * @return array<int, array<string, mixed>>
     */
    public function listOverrides(string $soNumber): array
    {
        return $this->overrideService()->listOverrides([
            'subject_type' => 'sales_order',
            'subject_id' => $soNumber,
            'control_family' => 'shipment_gate',
        ]);
    }

    /**
     * Get full audit history for shipment readiness of a Sales Order.
     *
     * @param string $soNumber Sales Order number.
     * @return array List of audit entries, newest first.
     */
    public function getAuditLog(string $soNumber): array
    {
        $log = $this->loadAuditLog($soNumber);
        return array_reverse($log);
    }

    /**
     * Load gate configuration from shipment_readiness_gate.json.
     *
     * @return array Configuration array.
     */
    public function getGateConfig(): array
    {
        $configFile = $this->confDir . '/shipment_readiness_gate.json';
        $config     = $this->readJson($configFile);

        if ($config === null) {
            return ['gates' => self::DEFAULT_GATES];
        }

        if (!is_array($config['gates'] ?? null) && is_array($config['gate_items'] ?? null)) {
            $config['gates'] = array_values(array_map(static function (array $gate): array {
                if (!array_key_exists('required', $gate)) {
                    $severity = strtolower(trim((string)($gate['severity'] ?? 'blocking')));
                    $gate['required'] = $severity !== 'warning';
                }
                return $gate;
            }, array_filter($config['gate_items'], 'is_array')));
        }

        return $config;
    }

    /**
     * Check document readiness for a Sales Order.
     *
     * @param string $soNumber Sales Order number.
     * @return array Document readiness details.
     */
    public function getDocumentReadiness(string $soNumber): array
    {
        $orders = $this->loadOrders();
        $so     = $this->findSo($soNumber, $orders);

        if ($so === null) {
            return ['ready' => false, 'detail' => 'SO not found'];
        }

        $requiredDocs = (array)($so['documents_required'] ?? $so['order_documents_required'] ?? []);

        if (empty($requiredDocs)) {
            return [
                'ready'    => true,
                'detail'   => 'No documents required',
                'required' => [],
                'received' => [],
                'missing'  => [],
            ];
        }

        $receivedDocs = (array)($so['documents_received'] ?? []);
        $missing      = [];

        foreach ($requiredDocs as $doc) {
            $docType = is_array($doc) ? ($doc['type'] ?? $doc['code'] ?? '') : (string)$doc;
            $found   = false;

            foreach ($receivedDocs as $rd) {
                $rdType = is_array($rd) ? ($rd['type'] ?? $rd['code'] ?? '') : (string)$rd;
                if (strtolower($rdType) === strtolower($docType)) {
                    $found = true;
                    break;
                }
            }

            if (!$found) {
                $missing[] = $docType;
            }
        }

        return [
            'ready'    => empty($missing),
            'required' => $requiredDocs,
            'received' => $receivedDocs,
            'missing'  => $missing,
        ];
    }

    /**
     * Check quality readiness (NCR/CAPA status) for a Sales Order.
     *
     * @param string $soNumber Sales Order number.
     * @return array Quality readiness details.
     */
    public function getQualityReadiness(string $soNumber): array
    {
        $orders = $this->loadOrders();

        // Check open NCRs
        $openNcrs = [];
        foreach (($orders['ncrs'] ?? []) as $ncr) {
            if (!is_array($ncr)) {
                continue;
            }
            $ncrSo = $ncr['so_number'] ?? '';
            if ($ncrSo !== $soNumber) {
                continue;
            }
            if (strtolower($ncr['status'] ?? '') !== 'closed') {
                $openNcrs[] = [
                    'id'     => $ncr['ncr_number'] ?? $ncr['id'] ?? '',
                    'status' => $ncr['status'] ?? '',
                    'title'  => $ncr['title'] ?? '',
                ];
            }
        }

        // Check open CAPAs
        $openCapas = [];
        foreach (($orders['capas'] ?? []) as $capa) {
            if (!is_array($capa)) {
                continue;
            }
            $capaSo = $capa['so_number'] ?? '';
            if ($capaSo !== $soNumber) {
                continue;
            }
            if (strtolower($capa['status'] ?? '') !== 'closed') {
                $openCapas[] = [
                    'id'     => $capa['capa_number'] ?? $capa['id'] ?? '',
                    'status' => $capa['status'] ?? '',
                    'title'  => $capa['title'] ?? '',
                ];
            }
        }

        // Also check exceptions (complaints, deviations linked to SO)
        $exceptionsDir = $this->dataDir . '/exceptions';
        $openExceptions = [];
        foreach (['complaints', 'mrb', 'deviations', 'concessions'] as $type) {
            $file    = $exceptionsDir . '/' . $type . '.json';
            $records = $this->readJson($file) ?? [];
            foreach ($records as $rec) {
                if (!is_array($rec)) {
                    continue;
                }
                if (($rec['so_number'] ?? '') !== $soNumber) {
                    continue;
                }
                if (strtolower($rec['status'] ?? '') !== 'closed') {
                    $openExceptions[] = [
                        'id'     => $rec['id'] ?? '',
                        'type'   => $type,
                        'status' => $rec['status'] ?? '',
                    ];
                }
            }
        }

        return [
            'ncr_clear'        => empty($openNcrs),
            'capa_clear'       => empty($openCapas),
            'exceptions_clear' => empty($openExceptions),
            'open_ncrs'        => $openNcrs,
            'open_capas'       => $openCapas,
            'open_exceptions'  => $openExceptions,
        ];
    }

    // ── Private Gate Evaluators ─────────────────────────────────────────────

    /**
     * Evaluate a single gate check.
     */
    private function evaluateGate(string $code, string $soNumber, array $so, array $orders): array
    {
        switch ($code) {
            case 'SG-01':
                return $this->checkContractReview($so);

            case 'SG-02':
                return $this->checkAllJosComplete($soNumber, $orders);

            case 'SG-03':
                return $this->checkNoOpenNcrs($soNumber, $orders);

            case 'SG-04':
                return $this->checkNoActiveHolds($soNumber);

            case 'SG-05':
                return $this->checkDocumentsReceived($soNumber, $so);

            case 'SG-06':
                return $this->checkAllCapasClosed($soNumber, $orders);

            case 'SG-07':
                return $this->checkFaiApproved($so, $orders, $soNumber);

            case 'SG-08':
                return $this->checkExportControl($so);

            case 'SG-09':
                return $this->checkPackingSpec($so);

            case 'SG-10':
                return $this->checkCustomerSourceInspection($so);

            default:
                return ['status' => 'na', 'detail' => 'Unknown gate code'];
        }
    }

    /** SG-01: Contract review completed. */
    private function checkContractReview(array $so): array
    {
        $review = $so['contract_review'] ?? [];

        if (empty($review)) {
            return ['status' => 'fail', 'detail' => 'No contract review data found'];
        }

        $reviewStatus = strtolower($review['status'] ?? '');
        if ($reviewStatus === 'approved' || $reviewStatus === 'completed') {
            return ['status' => 'pass', 'detail' => 'Contract review completed'];
        }

        // Check individual items
        if (isset($review['items']) && is_array($review['items'])) {
            foreach ($review['items'] as $item) {
                $itemStatus = strtolower($item['status'] ?? '');
                if ($itemStatus !== 'approved' && $itemStatus !== 'na' && $itemStatus !== 'n/a') {
                    return ['status' => 'fail', 'detail' => 'Contract review item pending: ' . ($item['label'] ?? '')];
                }
            }
            return ['status' => 'pass', 'detail' => 'All contract review items approved or N/A'];
        }

        return ['status' => 'fail', 'detail' => 'Contract review not completed. Status: ' . $reviewStatus];
    }

    /** SG-02: All JOs completed or closed. */
    private function checkAllJosComplete(string $soNumber, array $orders): array
    {
        $jobOrders = $orders['job_orders'] ?? [];
        $found     = false;
        $incomplete = [];

        foreach ($jobOrders as $jo) {
            if (!is_array($jo) || ($jo['so_number'] ?? '') !== $soNumber) {
                continue;
            }
            $found  = true;
            $status = strtolower($jo['status'] ?? '');
            if (!in_array($status, ['completed', 'closed'], true)) {
                $incomplete[] = ($jo['jo_number'] ?? '') . " ({$status})";
            }
        }

        if (!$found) {
            return ['status' => 'fail', 'detail' => 'No Job Orders found for this SO'];
        }

        if (!empty($incomplete)) {
            return ['status' => 'fail', 'detail' => 'Incomplete JOs: ' . implode(', ', $incomplete)];
        }

        return ['status' => 'pass', 'detail' => 'All JOs completed or closed'];
    }

    /** SG-03: No open NCRs. */
    private function checkNoOpenNcrs(string $soNumber, array $orders): array
    {
        $quality = $this->getQualityReadiness($soNumber);

        if ($quality['ncr_clear']) {
            return ['status' => 'pass', 'detail' => 'No open NCRs'];
        }

        $count = count($quality['open_ncrs']);
        return ['status' => 'fail', 'detail' => "{$count} open NCR(s) against this SO"];
    }

    /** SG-04: No active holds. */
    private function checkNoActiveHolds(string $soNumber): array
    {
        $holdsFile = $this->dataDir . '/orders/holds.json';
        $holds     = $this->readJson($holdsFile) ?? [];

        $activeHolds = [];
        foreach ($holds as $hold) {
            if (!is_array($hold)) {
                continue;
            }
            $holdSo = $hold['so_number'] ?? '';
            if ($holdSo !== $soNumber) {
                continue;
            }
            if (strtolower($hold['status'] ?? '') === 'active') {
                $activeHolds[] = $hold['hold_id'] ?? '';
            }
        }

        if (empty($activeHolds)) {
            return ['status' => 'pass', 'detail' => 'No active holds'];
        }

        $count = count($activeHolds);
        return ['status' => 'fail', 'detail' => "{$count} active hold(s) on this SO"];
    }

    /** SG-05: Required documents received. */
    private function checkDocumentsReceived(string $soNumber, array $so): array
    {
        $docReady = $this->getDocumentReadiness($soNumber);

        if ($docReady['ready']) {
            return ['status' => 'pass', 'detail' => $docReady['detail'] ?? 'All required documents received'];
        }

        $missing = implode(', ', $docReady['missing'] ?? []);
        return ['status' => 'fail', 'detail' => 'Missing documents: ' . $missing];
    }

    /** SG-06: All CAPA actions closed. */
    private function checkAllCapasClosed(string $soNumber, array $orders): array
    {
        $quality = $this->getQualityReadiness($soNumber);

        if ($quality['capa_clear']) {
            return ['status' => 'pass', 'detail' => 'All CAPAs closed'];
        }

        $count = count($quality['open_capas']);
        return ['status' => 'fail', 'detail' => "{$count} open CAPA(s) linked to this SO"];
    }

    /** SG-07: FAI approved (if first article required). */
    private function checkFaiApproved(array $so, array $orders, string $soNumber): array
    {
        // Check if FAI is required
        $faiRequired = false;
        $jobOrders   = $orders['job_orders'] ?? [];

        foreach ($jobOrders as $jo) {
            if (!is_array($jo) || ($jo['so_number'] ?? '') !== $soNumber) {
                continue;
            }
            if (!empty($jo['fai_required'])) {
                $faiRequired = true;
                break;
            }
        }

        if (!$faiRequired && empty($so['fai_required'])) {
            return ['status' => 'na', 'detail' => 'FAI not required for this order'];
        }

        $faiStatus = strtolower($so['fai_status'] ?? '');
        if ($faiStatus === 'approved' || $faiStatus === 'completed') {
            return ['status' => 'pass', 'detail' => 'FAI approved'];
        }

        // Check JO-level FAI
        foreach ($jobOrders as $jo) {
            if (!is_array($jo) || ($jo['so_number'] ?? '') !== $soNumber) {
                continue;
            }
            if (!empty($jo['fai_required'])) {
                $joFai = strtolower($jo['fai_status'] ?? '');
                if ($joFai !== 'approved' && $joFai !== 'completed') {
                    return ['status' => 'fail', 'detail' => 'FAI not approved for JO ' . ($jo['jo_number'] ?? '')];
                }
            }
        }

        return ['status' => 'pass', 'detail' => 'All required FAIs approved'];
    }

    /** SG-08: Export control cleared. */
    private function checkExportControl(array $so): array
    {
        if (empty($so['export_control_required'])) {
            return ['status' => 'na', 'detail' => 'Export control not required'];
        }

        $ecStatus = strtolower($so['export_control_status'] ?? '');
        if ($ecStatus === 'cleared' || $ecStatus === 'approved') {
            return ['status' => 'pass', 'detail' => 'Export control cleared'];
        }

        return ['status' => 'fail', 'detail' => 'Export control not cleared. Status: ' . $ecStatus];
    }

    /** SG-09: Packing/labeling spec confirmed. */
    private function checkPackingSpec(array $so): array
    {
        $packingConfirmed = $so['packing_spec_confirmed'] ?? $so['packing_confirmed'] ?? false;

        if ($packingConfirmed) {
            return ['status' => 'pass', 'detail' => 'Packing and labeling spec confirmed'];
        }

        return ['status' => 'fail', 'detail' => 'Packing/labeling specification not confirmed'];
    }

    /** SG-10: Customer source inspection completed. */
    private function checkCustomerSourceInspection(array $so): array
    {
        if (empty($so['customer_source_inspection_required'])) {
            return ['status' => 'na', 'detail' => 'Customer source inspection not required'];
        }

        $csiStatus = strtolower($so['customer_source_inspection_status'] ?? '');
        if ($csiStatus === 'completed' || $csiStatus === 'approved' || $csiStatus === 'waived') {
            return ['status' => 'pass', 'detail' => 'Customer source inspection completed'];
        }

        return ['status' => 'fail', 'detail' => 'Customer source inspection not completed. Status: ' . $csiStatus];
    }

    // ── Private Helpers ─────────────────────────────────────────────────────

    private function findSo(string $soNumber, array $orders): ?array
    {
        foreach (($orders['sales_orders'] ?? []) as $so) {
            if (is_array($so) && ($so['so_number'] ?? '') === $soNumber) {
                return $so;
            }
        }
        return null;
    }

    private function loadOrders(): array
    {
        $ordersFile = $this->dataDir . '/orders/orders.json';
        return $this->readJson($ordersFile) ?? [
            'sales_orders' => [],
            'job_orders'   => [],
            'work_orders'  => [],
        ];
    }

    private function readJson(string $path): ?array
    {
        if (!is_file($path)) {
            return null;
        }
        $raw = @file_get_contents($path);
        if ($raw === false) {
            return null;
        }
        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : null;
    }

    private function writeJson(string $path, array $data): void
    {
        $dir = dirname($path);
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
        $tmp  = $path . '.tmp.' . getmypid();
        $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
        if ($json === false) {
            throw new RuntimeException('Failed to encode JSON for ' . basename($path));
        }
        if (@file_put_contents($tmp, $json, LOCK_EX) === false) {
            @unlink($tmp);
            throw new RuntimeException('Cannot write ' . basename($path));
        }
        if (file_exists($path)) {
            @unlink($path);
        }
        if (!@rename($tmp, $path)) {
            @unlink($tmp);
            throw new RuntimeException('Failed to atomically replace ' . basename($path));
        }
    }

    private function nowIso(): string
    {
        return (new \DateTimeImmutable('now', new \DateTimeZone('+07:00')))->format('c');
    }

    // ── RBAC helpers ────────────────────────────────────────────────────────

    /**
     * Check if a role is in an allowed-roles list (admin bypass included).
     */
    private function isRoleAllowed(string $role, array $allowedRoles): bool
    {
        if (in_array($role, ['it_admin', 'ceo'], true)) {
            return true;
        }
        return in_array($role, $allowedRoles, true);
    }

    // ── Audit trail persistence ─────────────────────────────────────────────

    private function auditLogPath(string $soNumber): string
    {
        return $this->dataDir . '/orders/shipment_gate_audit_' . preg_replace('/[^A-Za-z0-9_-]/', '_', $soNumber) . '.jsonl';
    }

    private function appendAuditLog(string $soNumber, array $entry): void
    {
        $path = $this->auditLogPath($soNumber);
        $dir  = dirname($path);
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
        $line = json_encode($entry, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
        @file_put_contents($path, $line, FILE_APPEND | LOCK_EX);
    }

    private function loadAuditLog(string $soNumber): array
    {
        $path = $this->auditLogPath($soNumber);
        if (!is_file($path)) {
            return [];
        }
        $raw   = @file_get_contents($path);
        $lines = explode("\n", trim($raw ?: ''));
        $entries = [];
        foreach ($lines as $line) {
            $decoded = json_decode($line, true);
            if (is_array($decoded)) {
                $entries[] = $decoded;
            }
        }
        return $entries;
    }

    // ── Override persistence ────────────────────────────────────────────────

    private function overridesPath(string $soNumber): string
    {
        return $this->dataDir . '/orders/shipment_gate_overrides_' . preg_replace('/[^A-Za-z0-9_-]/', '_', $soNumber) . '.json';
    }

    private function loadOverrides(string $soNumber): array
    {
        $mapped = [];
        foreach ($this->overrideService()->activeOverridesForSubject('sales_order', $soNumber, 'shipment_gate') as $row) {
            if (!is_array($row)) {
                continue;
            }
            $code = (string)($row['control_code'] ?? '');
            if ($code !== '') {
                $mapped[$code] = $row;
            }
        }

        // Backward-compatibility for legacy per-SO waiver files until migration completes.
        $legacy = $this->readJson($this->overridesPath($soNumber)) ?? [];
        foreach ($legacy as $code => $row) {
            if (!isset($mapped[$code]) && is_array($row)) {
                $row['control_code'] = $row['control_code'] ?? $row['gate_code'] ?? $code;
                $row['current_status'] = 'active';
                $mapped[$code] = $row;
            }
        }

        return $mapped;
    }

    private function saveOverrides(string $soNumber, array $overrides): void
    {
        $this->writeJson($this->overridesPath($soNumber), $overrides);
    }
}
