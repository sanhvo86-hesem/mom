<?php

declare(strict_types=1);

namespace MOM\Services;

use RuntimeException;

/**
 * Governed order read/write service backed by the shared runtime order store.
 *
 * The live portal still uses `data/orders/orders.json` as the operational
 * read-model/write-model compatibility layer. This service must therefore read
 * and write the same file as the legacy `api.php` actions so that list/detail,
 * workflow, and create flows stay consistent.
 */
final class OrderService
{
    /** Valid SO statuses (aligned with workflow/runtime config). */
    private const SO_STATUSES = ['draft', 'quoted', 'confirmed', 'engineering_ready', 'in_production', 'shipped', 'closed', 'cancelled'];

    /** Valid JO statuses (aligned with workflow/runtime config). */
    private const JO_STATUSES = ['planned', 'released', 'active', 'on_hold', 'completed', 'closed', 'cancelled'];

    /** Valid WO statuses (aligned with workflow/runtime config). */
    private const WO_STATUSES = ['scheduled', 'setup', 'running', 'inspection', 'completed', 'on_hold', 'cancelled'];

    /** @var string Absolute path to data directory. */
    private readonly string $dataDir;

    /** @var string Absolute path to the orders directory. */
    private readonly string $ordersDir;

    /** @var string Absolute path to the governed runtime order store. */
    private readonly string $ordersFile;

    /** @var string Absolute path to the store lock file. */
    private readonly string $lockFile;

    /** @var string Absolute path to the legacy index file, kept for fallback migration only. */
    private readonly string $legacyIndexFile;

    /** @var string Absolute path to the legacy links file, kept for fallback migration only. */
    private readonly string $legacyLinksFile;

    /**
     * @param string $dataDir Absolute path to data directory.
     */
    public function __construct(string $dataDir)
    {
        $this->dataDir         = rtrim(str_replace('\\', '/', $dataDir), '/');
        $this->ordersDir       = $this->dataDir . '/orders';
        $this->ordersFile      = $this->ordersDir . '/orders.json';
        $this->lockFile        = $this->ordersFile . '.lock';
        $this->legacyIndexFile = $this->ordersDir . '/index.json';
        $this->legacyLinksFile = $this->ordersDir . '/links/form_links.json';

        if (!is_dir($this->ordersDir)) {
            @mkdir($this->ordersDir, 0775, true);
        }
    }

    /**
     * List Sales Orders with optional filters.
     *
     * Supported filters:
     *   - status    (string): Exact match on SO status.
     *   - search    (string): Partial match on SO number, customer name, or PO.
     *   - customer  (string): Legacy alias for `search`.
     *   - date_from (string): YYYY-MM-DD inclusive lower bound on order_date.
     *   - date_to   (string): YYYY-MM-DD inclusive upper bound on order_date.
     *
     * @param array<string, string> $filters Key-value filter pairs.
     * @return array<int, array<string, mixed>>
     */
    public function listSalesOrders(array $filters = []): array
    {
        $orders = array_values((array)($this->readStore()['sales_orders'] ?? []));
        $result = [];
        $statusFilter = strtolower(trim((string)($filters['status'] ?? '')));
        if ($statusFilter !== '' && !in_array($statusFilter, self::SO_STATUSES, true)) {
            return [];
        }

        foreach ($orders as $so) {
            if (!is_array($so)) {
                continue;
            }

            $status = strtolower((string)($so['status'] ?? ''));
            $soNumber = strtolower((string)($so['so_number'] ?? ''));
            $customerName = strtolower((string)($so['customer_name'] ?? ''));
            $customerPo = strtolower((string)($so['customer_po'] ?? $so['customer_po_number'] ?? ''));
            $customerPoId = strtolower((string)($so['customer_po_id'] ?? ''));
            $orderDate = (string)($so['order_date'] ?? '');

            if ($statusFilter !== '' && $status !== $statusFilter) {
                continue;
            }

            $search = trim((string)($filters['search'] ?? $filters['customer'] ?? ''));
            if ($search !== '') {
                $needle = strtolower($search);
                if (strpos($soNumber, $needle) === false
                    && strpos($customerName, $needle) === false
                    && strpos($customerPo, $needle) === false
                    && strpos($customerPoId, $needle) === false) {
                    continue;
                }
            }

            if (isset($filters['date_from']) && $filters['date_from'] !== '' && $orderDate !== '' && $orderDate < $filters['date_from']) {
                continue;
            }

            if (isset($filters['date_to']) && $filters['date_to'] !== '' && $orderDate !== '' && $orderDate > $filters['date_to']) {
                continue;
            }

            $result[] = $so;
        }

        usort(
            $result,
            static fn(array $a, array $b): int => strcmp((string)($b['order_date'] ?? ''), (string)($a['order_date'] ?? '')),
        );

        return $result;
    }

    /**
     * Get full details of a single Sales Order.
     *
     * @param string $soNumber Sales Order number.
     * @return array<string, mixed>|null
     */
    public function getSalesOrder(string $soNumber): ?array
    {
        $store = $this->readStore();
        $hierarchy = $this->getHierarchy($soNumber);
        if ($hierarchy !== []) {
            return $hierarchy[0];
        }

        foreach ((array)($store['sales_orders'] ?? []) as $so) {
            if (is_array($so) && (string)($so['so_number'] ?? '') === $soNumber) {
                return $so;
            }
        }

        return null;
    }

    /**
     * List Job Orders with optional SO and status filters.
     *
     * @param string|null           $soNumber Filter by parent SO number.
     * @param array<string, string> $filters  Additional filters.
     * @return array<int, array<string, mixed>>
     */
    public function listJobOrders(?string $soNumber = null, array $filters = []): array
    {
        $jobs = array_values((array)($this->readStore()['job_orders'] ?? []));
        $result = [];
        $statusFilter = strtolower(trim((string)($filters['status'] ?? '')));
        if ($statusFilter !== '' && !in_array($statusFilter, self::JO_STATUSES, true)) {
            return [];
        }

        foreach ($jobs as $jo) {
            if (!is_array($jo)) {
                continue;
            }

            if ($soNumber !== null && (string)($jo['so_number'] ?? '') !== $soNumber) {
                continue;
            }

            if ($statusFilter !== '') {
                if (strtolower((string)($jo['status'] ?? '')) !== $statusFilter) {
                    continue;
                }
            }

            if (isset($filters['part']) && $filters['part'] !== '') {
                $needle = strtolower($filters['part']);
                $partNumber = strtolower((string)($jo['part_number'] ?? ''));
                $partDescription = strtolower((string)($jo['part_description'] ?? ''));
                if (strpos($partNumber, $needle) === false && strpos($partDescription, $needle) === false) {
                    continue;
                }
            }

            $result[] = $jo;
        }

        usort(
            $result,
            static fn(array $a, array $b): int => strcmp((string)($b['created_at'] ?? ''), (string)($a['created_at'] ?? '')),
        );

        return $result;
    }

    /**
     * Get full details of a single Job Order.
     *
     * @param string $joNumber Job Order number.
     * @return array<string, mixed>|null
     */
    public function getJobOrder(string $joNumber): ?array
    {
        $store = $this->readStore();
        foreach ((array)($store['job_orders'] ?? []) as $jo) {
            if (!is_array($jo) || (string)($jo['jo_number'] ?? '') !== $joNumber) {
                continue;
            }

            $jo['work_orders'] = $this->getWorkOrdersForJobFromStore($store, $joNumber);
            $jo['linked_forms'] = $this->getLinkedFormsForOrder($store, 'jo', $joNumber);
            return $jo;
        }

        return null;
    }

    /**
     * Get the full SO -> JO -> WO hierarchy as a nested tree.
     *
     * @param string|null $soNumber Optional: restrict to a single SO tree.
     * @return array<int, array<string, mixed>>
     */
    public function getHierarchy(?string $soNumber = null): array
    {
        $store = $this->readStore();
        $salesOrders = array_values((array)($store['sales_orders'] ?? []));
        $jobOrders = array_values((array)($store['job_orders'] ?? []));
        $workOrders = array_values((array)($store['work_orders'] ?? []));

        $josBySo = [];
        foreach ($jobOrders as $jo) {
            if (!is_array($jo)) {
                continue;
            }
            $josBySo[(string)($jo['so_number'] ?? '')][] = $jo;
        }

        $wosByJo = [];
        foreach ($workOrders as $wo) {
            if (!is_array($wo)) {
                continue;
            }
            $wosByJo[(string)($wo['jo_number'] ?? '')][] = $wo;
        }

        $tree = [];
        foreach ($salesOrders as $so) {
            if (!is_array($so)) {
                continue;
            }

            $soNum = (string)($so['so_number'] ?? '');
            if ($soNumber !== null && $soNum !== $soNumber) {
                continue;
            }

            $soNode = $so;
            $soNode['linked_forms'] = $this->getLinkedFormsForOrder($store, 'so', $soNum);
            $soNode['job_orders'] = [];

            foreach ((array)($josBySo[$soNum] ?? []) as $jo) {
                $joNum = (string)($jo['jo_number'] ?? '');
                $joNode = $jo;
                $joNode['linked_forms'] = $this->getLinkedFormsForOrder($store, 'jo', $joNum);
                $joNode['work_orders'] = [];

                foreach ((array)($wosByJo[$joNum] ?? []) as $wo) {
                    $woNode = $wo;
                    $woNode['linked_forms'] = $this->getLinkedFormsForOrder($store, 'wo', (string)($wo['wo_number'] ?? ''));
                    $joNode['work_orders'][] = $woNode;
                }

                usort($joNode['work_orders'], [$this, 'compareOperationNumber']);
                $soNode['job_orders'][] = $joNode;
            }

            usort(
                $soNode['job_orders'],
                static fn(array $a, array $b): int => strcmp((string)($a['created_at'] ?? ''), (string)($b['created_at'] ?? '')),
            );
            $tree[] = $soNode;
        }

        return $tree;
    }

    /**
     * Link a form record to a Job Order.
     *
     * @param string $joNumber Job Order number.
     * @param string $formCode Form code.
     * @param string $recordId Record ID.
     * @return bool
     */
    public function linkFormToJob(string $joNumber, string $formCode, string $recordId): bool
    {
        $store = $this->readStore();
        $jo = $this->findOrderRecord($store, 'jo', $joNumber);
        if ($jo === null) {
            return false;
        }

        $links = array_values((array)($store['form_links'] ?? []));
        foreach ($links as $link) {
            if (!is_array($link)) {
                continue;
            }

            $sameLegacyLink = (string)($link['jo_number'] ?? '') === $joNumber && (string)($link['record_id'] ?? '') === $recordId;
            $sameNormalizedLink = (string)($link['order_type'] ?? '') === 'jo'
                && (string)($link['order_id'] ?? '') === $joNumber
                && (string)($link['record_id'] ?? '') === $recordId;

            if ($sameLegacyLink || $sameNormalizedLink) {
                return false;
            }
        }

        $links[] = [
            'link_id'     => $this->generateUuidV4(),
            'order_type'  => 'jo',
            'order_id'    => $joNumber,
            'jo_number'   => $joNumber,
            'so_number'   => (string)($jo['so_number'] ?? ''),
            'form_code'   => $formCode,
            'record_id'   => $recordId,
            'status'      => 'linked',
            'auto_linked' => false,
            'linked_at'   => gmdate('c'),
            'linked_by'   => (string)($_SESSION['user'] ?? 'system'),
        ];

        $store['form_links'] = array_values($links);
        $this->writeStore($store);

        return true;
    }

    /**
     * Get all form records linked to a Job Order.
     *
     * @param string $joNumber Job Order number.
     * @return array<int, array<string, mixed>>
     */
    public function getLinkedForms(string $joNumber): array
    {
        $links = $this->getLinkedFormsForOrder($this->readStore(), 'jo', $joNumber);
        usort(
            $links,
            static fn(array $a, array $b): int => strcmp((string)($b['linked_at'] ?? ''), (string)($a['linked_at'] ?? '')),
        );
        return $links;
    }

    /**
     * Generic linked-forms accessor used by the order detail panel.
     * Accepts any of so/jo/wo so the SO/JO/WO inspector can render
     * its Linked Evidence section regardless of node type. Sorted newest
     * first.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getLinkedFormsByOrder(string $orderType, string $orderId): array
    {
        $type = strtolower(trim($orderType));
        if (!in_array($type, ['so', 'jo', 'wo'], true) || trim($orderId) === '') {
            return [];
        }
        $links = $this->getLinkedFormsForOrder($this->readStore(), $type, trim($orderId));
        usort(
            $links,
            static fn(array $a, array $b): int => strcmp((string)($b['linked_at'] ?? ''), (string)($a['linked_at'] ?? '')),
        );
        return $links;
    }

    /**
     * Get dashboard statistics for orders.
     *
     * @return array<string, mixed>
     */
    public function getDashboardStats(): array
    {
        $store = $this->readStore();
        $salesOrders = array_values((array)($store['sales_orders'] ?? []));
        $jobOrders = array_values((array)($store['job_orders'] ?? []));

        $activeSoCount = 0;
        $activeJoCount = 0;
        $overdueCount = 0;
        $completedOnTime = 0;
        $completedTotal = 0;
        $backlogValue = 0.0;
        $byStatus = [];
        $recentCompleted = [];

        $now = date('Y-m-d');

        foreach ($salesOrders as $so) {
            if (!is_array($so)) {
                continue;
            }

            $status = strtolower((string)($so['status'] ?? ''));
            if (!in_array($status, ['closed', 'shipped', 'cancelled'], true)) {
                $activeSoCount++;
                $backlogValue += (float)($so['total_value'] ?? 0);
            }
        }

        foreach ($jobOrders as $jo) {
            if (!is_array($jo)) {
                continue;
            }

            $status = strtolower((string)($jo['status'] ?? ''));
            $dueDate = (string)($jo['due_date'] ?? '');

            $byStatus[$status] = ($byStatus[$status] ?? 0) + 1;

            if (!in_array($status, ['completed', 'closed', 'cancelled'], true)) {
                $activeJoCount++;
                if ($dueDate !== '' && $dueDate < $now) {
                    $overdueCount++;
                }
            }

            if ($status === 'completed') {
                $completedTotal++;
                $completedAt = (string)($jo['completed_at'] ?? $jo['updated_at'] ?? '');
                $completedDate = substr($completedAt, 0, 10);

                if ($dueDate !== '' && $completedDate !== '' && $completedDate <= $dueDate) {
                    $completedOnTime++;
                }

                $recentCompleted[] = [
                    'jo_number'    => (string)($jo['jo_number'] ?? ''),
                    'part_number'  => (string)($jo['part_number'] ?? ''),
                    'completed_at' => $completedAt,
                ];
            }
        }

        usort(
            $recentCompleted,
            static fn(array $a, array $b): int => strcmp((string)$b['completed_at'], (string)$a['completed_at']),
        );

        return [
            'active_so_count'    => $activeSoCount,
            'active_jo_count'    => $activeJoCount,
            'on_time_pct'        => $completedTotal > 0 ? round(($completedOnTime / $completedTotal) * 100, 1) : 0.0,
            'overdue_count'      => $overdueCount,
            'completed_total'    => $completedTotal,
            'completed_on_time'  => $completedOnTime,
            'backlog_value'      => round($backlogValue, 2),
            'by_status'          => $byStatus,
            'recent_completions' => array_slice($recentCompleted, 0, 5),
        ];
    }

    /**
     * Generate the next order number for a given type.
     *
     * @param string $type 'so', 'jo', or 'wo'.
     * @return string
     */
    public function generateOrderNumber(string $type): string
    {
        $store = $this->readStore();
        $next = $this->nextOrderNumber($store, $type);
        $this->writeStore($store);
        return $next;
    }

    /**
     * Create a new Sales Order.
     *
     * @param array<string, mixed> $so
     * @return array<string, mixed>
     */
    public function createSalesOrder(array $so): array
    {
        $soNumber = trim((string)($so['so_number'] ?? ''));
        if ($soNumber === '') {
            throw new RuntimeException('Sales Order number is required.');
        }

        // MISSING-001 FIX: Validate order amount is not zero.
        $hasExplicitTotal = array_key_exists('total_value', $so) && $so['total_value'] !== null && $so['total_value'] !== '';
        $orderAmount = $hasExplicitTotal ? (float)$so['total_value'] : $this->deriveSalesOrderTotalValue($so);
        if ($orderAmount <= 0) {
            throw new \InvalidArgumentException('Order amount must be greater than zero');
        }
        if (!$hasExplicitTotal) {
            $so['total_value'] = round($orderAmount, 2);
        }

        $store = $this->readStore();
        if ($this->findOrderRecord($store, 'so', $soNumber) !== null) {
            throw new RuntimeException("Sales Order {$soNumber} already exists.");
        }

        // BLF-011: Validate credit limit if customer has one
        $customerId = (string)($so['customer_id'] ?? $so['customer'] ?? '');
        if ($customerId !== '') {
            $creditLimit = (float)($so['customer_credit_limit'] ?? 0);
            if ($creditLimit > 0) {
                // Calculate outstanding balance - sum of unpaid/partial orders
                $outstandingBalance = 0.0;
                foreach ((array)($store['sales_orders'] ?? []) as $existingSo) {
                    if (!is_array($existingSo)) {
                        continue;
                    }
                    if ((string)($existingSo['customer_id'] ?? '') !== $customerId) {
                        continue;
                    }
                    $status = strtolower((string)($existingSo['status'] ?? ''));
                    // ORD-003: Shipped orders count toward credit limit (only exclude truly settled)
                    if (!in_array($status, ['closed', 'cancelled'], true)) {
                        $outstandingBalance += (float)($existingSo['total_value'] ?? 0);
                    }
                }
                if ($outstandingBalance + $orderAmount > $creditLimit) {
                    throw new RuntimeException("Order amount exceeds customer credit limit. Outstanding: {$outstandingBalance}, Order: {$orderAmount}, Limit: {$creditLimit}");
                }
            }
        }

        $this->syncCounterWithNumber($store, 'so', $soNumber);
        $store['sales_orders'][] = $so;
        $this->writeStore($store);
        return $so;
    }

    /**
     * @param array<string, mixed> $so
     */
    private function deriveSalesOrderTotalValue(array $so): float
    {
        $total = 0.0;
        foreach ((array)($so['lines'] ?? []) as $line) {
            if (!is_array($line)) {
                continue;
            }

            foreach (['line_total', 'line_value', 'amount', 'total_value'] as $totalField) {
                if (array_key_exists($totalField, $line) && $line[$totalField] !== null && $line[$totalField] !== '') {
                    $total += (float)$line[$totalField];
                    continue 2;
                }
            }

            $quantity = $this->firstNumericLineValue($line, ['qty', 'quantity', 'order_qty']);
            $unitPrice = $this->firstNumericLineValue($line, ['unit_price', 'price', 'unit_value']);
            if ($quantity !== null && $unitPrice !== null) {
                $total += $quantity * $unitPrice;
            }
        }

        return round($total, 2);
    }

    /**
     * @param array<string, mixed> $line
     * @param array<int, string>   $fields
     */
    private function firstNumericLineValue(array $line, array $fields): ?float
    {
        foreach ($fields as $field) {
            if (array_key_exists($field, $line) && $line[$field] !== null && $line[$field] !== '') {
                return (float)$line[$field];
            }
        }

        return null;
    }

    /**
     * Attach a canonical customer purchase order reference to an existing SO.
     *
     * BLF-005: Uses optimistic locking to prevent TOCTOU race conditions.
     *
     * @return array<string, mixed>
     */
    public function linkCustomerPurchaseOrderToSalesOrder(string $soNumber, string $customerPoId, string $customerPoNumber, ?string $expectedUpdatedAt = null): array
    {
        $soNumber = trim($soNumber);
        $customerPoId = trim($customerPoId);
        $customerPoNumber = trim($customerPoNumber);
        if ($soNumber === '' || $customerPoId === '') {
            throw new RuntimeException('Sales Order and Customer PO identity are required for linkage.');
        }

        $store = $this->readStore();
        foreach ((array)($store['sales_orders'] ?? []) as $index => $row) {
            if (!is_array($row) || (string)($row['so_number'] ?? '') !== $soNumber) {
                continue;
            }

            // BLF-005: Optimistic lock check - verify SO hasn't been modified since we read it
            if ($expectedUpdatedAt !== null && ($row['updated_at'] ?? '') !== $expectedUpdatedAt) {
                throw new RuntimeException('Sales Order was modified by another user. Please refresh and try again.');
            }

            $row['customer_po_id'] = $customerPoId;
            if ($customerPoNumber !== '') {
                $row['customer_po_number'] = $customerPoNumber;
                $row['customer_po'] = $customerPoNumber;
            }
            $row['updated_at'] = date('c');
            $store['sales_orders'][$index] = $row;
            $this->writeStore($store);
            return $row;
        }

        throw new RuntimeException("Sales Order {$soNumber} not found.");
    }

    /**
     * Create a new Job Order.
     *
     * @param array<string, mixed> $jo
     * @return array<string, mixed>
     */
    public function createJobOrder(array $jo): array
    {
        $joNumber = trim((string)($jo['jo_number'] ?? ''));
        $soNumber = trim((string)($jo['so_number'] ?? ''));
        if ($joNumber === '') {
            throw new RuntimeException('Job Order number is required.');
        }
        if ($soNumber === '') {
            throw new RuntimeException('Parent Sales Order is required.');
        }

        $store = $this->readStore();
        if ($this->findOrderRecord($store, 'jo', $joNumber) !== null) {
            throw new RuntimeException("Job Order {$joNumber} already exists.");
        }
        $joStatus = strtolower(trim((string)($jo['status'] ?? 'planned')));
        if (!in_array($joStatus, self::JO_STATUSES, true)) {
            throw new RuntimeException("Invalid Job Order status: {$joStatus}.");
        }
        $jo['status'] = $joStatus;
        $parentSo = $this->findOrderRecord($store, 'so', $soNumber);
        if ($parentSo === null) {
            throw new RuntimeException("Parent Sales Order {$soNumber} not found.");
        }
        $parentStatus = strtolower(trim((string)($parentSo['status'] ?? '')));
        if (!in_array($parentStatus, ['engineering_ready', 'in_production'], true)) {
            throw new RuntimeException(
                "Sales Order {$soNumber} is not released to production. " .
                "CreateJobOrder requires SO status engineering_ready or in_production; current status: {$parentStatus}."
            );
        }

        $this->syncCounterWithNumber($store, 'jo', $joNumber);
        $store['job_orders'][] = $jo;
        $this->writeStore($store);
        return $jo;
    }

    /**
     * Create a new Work Order.
     *
     * @param array<string, mixed> $wo
     * @return array<string, mixed>
     */
    public function createWorkOrder(array $wo): array
    {
        $woNumber = trim((string)($wo['wo_number'] ?? ''));
        $joNumber = trim((string)($wo['jo_number'] ?? ''));
        if ($woNumber === '') {
            throw new RuntimeException('Work Order number is required.');
        }
        if ($joNumber === '') {
            throw new RuntimeException('Parent Job Order is required.');
        }

        $store = $this->readStore();
        if ($this->findOrderRecord($store, 'wo', $woNumber) !== null) {
            throw new RuntimeException("Work Order {$woNumber} already exists.");
        }
        $parentJo = $this->findOrderRecord($store, 'jo', $joNumber);
        if ($parentJo === null) {
            throw new RuntimeException("Parent Job Order {$joNumber} not found.");
        }
        $parentStatus = strtolower(trim((string)($parentJo['status'] ?? 'planned')));
        if (!in_array($parentStatus, ['planned', 'released', 'active'], true)) {
            throw new RuntimeException(
                "Job Order {$joNumber} is not eligible for Work Order creation; current status: {$parentStatus}."
            );
        }
        $wo = $this->assertWorkOrderMatchesParentContext($wo, $parentJo);
        $woStatus = strtolower(trim((string)($wo['status'] ?? 'scheduled')));
        if (!in_array($woStatus, self::WO_STATUSES, true)) {
            throw new RuntimeException("Invalid Work Order status: {$woStatus}.");
        }
        $wo['status'] = $woStatus;

        $this->syncCounterWithNumber($store, 'wo', $woNumber);
        $store['work_orders'][] = $wo;
        $this->writeStore($store);
        return $wo;
    }

    /**
     * @param array<string, mixed> $wo
     * @param array<string, mixed> $parentJo
     * @return array<string, mixed>
     */
    private function assertWorkOrderMatchesParentContext(array $wo, array $parentJo): array
    {
        foreach ([
            'org_plant_id',
            'org_site_id',
            'routing_id',
            'inspection_plan_id',
            'part_number',
            'part_revision',
        ] as $field) {
            $parentValue = $this->stringValue($parentJo[$field] ?? '');
            if ($parentValue === '') {
                continue;
            }
            $workValue = $this->stringValue($wo[$field] ?? '');
            if ($workValue === '') {
                $wo[$field] = $parentValue;
                continue;
            }
            if ($workValue !== $parentValue) {
                throw new RuntimeException('work_order_context_mismatch:' . $field);
            }
        }

        $operation = $this->findParentOperationForWorkOrder($wo, $parentJo);
        if ($operation === null) {
            return $wo;
        }

        foreach ([
            'routing_operation_id',
            'job_operation_id',
            'work_center_id',
            'machine_id',
            'setup_sheet_id',
            'cnc_program_version_id',
            'org_plant_id',
            'org_site_id',
        ] as $field) {
            $expected = $this->stringValue($operation[$field] ?? '');
            if ($expected === '') {
                continue;
            }
            $actual = $this->stringValue($wo[$field] ?? '');
            if ($actual === '') {
                $wo[$field] = $expected;
                continue;
            }
            if ($actual !== $expected) {
                throw new RuntimeException('work_order_operation_context_mismatch:' . $field);
            }
        }

        return $wo;
    }

    /**
     * @param array<string, mixed> $wo
     * @param array<string, mixed> $parentJo
     * @return array<string, mixed>|null
     */
    private function findParentOperationForWorkOrder(array $wo, array $parentJo): ?array
    {
        $operationRows = [];
        foreach (['operations', 'routing_operations', 'job_operations'] as $field) {
            if (is_array($parentJo[$field] ?? null)) {
                foreach ((array)$parentJo[$field] as $row) {
                    if (is_array($row)) {
                        $operationRows[] = $row;
                    }
                }
            }
        }
        if ($operationRows === []) {
            return null;
        }

        $operationNumber = $this->stringValue($wo['operation_number'] ?? $wo['operation_seq'] ?? '');
        $routingOperationId = $this->stringValue($wo['routing_operation_id'] ?? '');
        $jobOperationId = $this->stringValue($wo['job_operation_id'] ?? '');

        foreach ($operationRows as $operation) {
            if (
                $routingOperationId !== ''
                && $routingOperationId === $this->stringValue($operation['routing_operation_id'] ?? $operation['operation_id'] ?? '')
            ) {
                return $operation;
            }
            if (
                $jobOperationId !== ''
                && $jobOperationId === $this->stringValue($operation['job_operation_id'] ?? $operation['operation_id'] ?? '')
            ) {
                return $operation;
            }
            if (
                $operationNumber !== ''
                && $operationNumber === $this->stringValue($operation['operation_number'] ?? $operation['operation_seq'] ?? $operation['seq'] ?? '')
            ) {
                return $operation;
            }
        }

        throw new RuntimeException('work_order_operation_not_in_parent_routing');
    }

    /**
     * @return array<string, mixed>
     */
    private function readStore(): array
    {
        $store = $this->readJsonFile($this->ordersFile);
        if (is_array($store)) {
            return $this->normalizeStore($store);
        }

        $legacyIndex = $this->readJsonFile($this->legacyIndexFile);
        if (is_array($legacyIndex)) {
            $migrated = $this->buildDefaultStore();
            $migrated['sales_orders'] = array_values((array)($legacyIndex['sales_orders'] ?? []));
            $migrated['job_orders'] = array_values((array)($legacyIndex['job_orders'] ?? []));
            $migrated['work_orders'] = array_values((array)($legacyIndex['work_orders'] ?? []));
            $legacyLinks = $this->readJsonListFile($this->legacyLinksFile);
            if ($legacyLinks !== []) {
                $migrated['form_links'] = $legacyLinks;
            }
            $this->writeStore($migrated);
            return $this->normalizeStore($migrated);
        }

        $default = $this->buildDefaultStore();
        $this->writeStore($default);
        return $default;
    }

    /**
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    private function normalizeStore(array $data): array
    {
        $default = $this->buildDefaultStore();
        $data['_meta'] = is_array($data['_meta'] ?? null) ? $data['_meta'] : $default['_meta'];
        $data['_meta']['counters'] = is_array($data['_meta']['counters'] ?? null) ? $data['_meta']['counters'] : $default['_meta']['counters'];
        $data['sales_orders'] = array_values(is_array($data['sales_orders'] ?? null) ? $data['sales_orders'] : []);
        $data['job_orders'] = array_values(is_array($data['job_orders'] ?? null) ? $data['job_orders'] : []);
        $data['work_orders'] = array_values(is_array($data['work_orders'] ?? null) ? $data['work_orders'] : []);
        $data['form_links'] = array_values(is_array($data['form_links'] ?? null) ? $data['form_links'] : []);

        if ($data['form_links'] === []) {
            $legacyLinks = $this->readJsonListFile($this->legacyLinksFile);
            if ($legacyLinks !== []) {
                $data['form_links'] = $legacyLinks;
            }
        }

        return $data;
    }

    /**
     * @return array<string, mixed>
     */
    private function buildDefaultStore(): array
    {
        $year = date('Y');
        return [
            '_meta' => [
                'version' => '1.1',
                'updated' => gmdate('c'),
                'description' => 'Sales Order -> Job Order -> Work Order hierarchy managed inside the QMS Portal.',
                'counters' => [
                    'last_so' => 'SO-' . $year . '-0000',
                    'last_jo' => 'JO-' . $year . '-0000',
                    'last_wo' => 'WO-' . $year . '-000000',
                ],
            ],
            'sales_orders' => [],
            'job_orders' => [],
            'work_orders' => [],
            'form_links' => [],
        ];
    }

    /**
     * @param array<string, mixed> $data
     */
    private function writeStore(array $data): void
    {
        $data = $this->normalizeStore($data);
        $data['_meta']['updated'] = gmdate('c');

        $lockHandle = @fopen($this->lockFile, 'c');
        if ($lockHandle === false) {
            $this->writeJsonFileAtomic($this->ordersFile, $data);
            return;
        }

        try {
            if (@flock($lockHandle, LOCK_EX)) {
                $this->writeJsonFileAtomic($this->ordersFile, $data);
                @flock($lockHandle, LOCK_UN);
                return;
            } else {
                @fclose($lockHandle);
                throw new \RuntimeException('Failed to acquire write lock for orders store');
            }
        } finally {
            @fclose($lockHandle);
        }
    }

    /**
     * @param string $path Absolute path.
     * @return array<string, mixed>|null
     */
    private function readJsonFile(string $path): ?array
    {
        if (!is_file($path)) {
            return null;
        }

        $raw = @file_get_contents($path);
        if ($raw === false || trim($raw) === '') {
            return null;
        }

        $data = json_decode($raw, true);
        return is_array($data) ? $data : null;
    }

    /**
     * @param string $path Absolute path.
     * @return array<int, array<string, mixed>>
     */
    private function readJsonListFile(string $path): array
    {
        $data = $this->readJsonFile($path);
        return is_array($data) ? array_values($data) : [];
    }

    /**
     * @param string               $path Absolute path.
     * @param array<string, mixed> $data Data to encode.
     */
    private function writeJsonFileAtomic(string $path, array $data): void
    {
        $dir = dirname($path);
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }

        $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json === false) {
            throw new RuntimeException('Failed to encode JSON for ' . basename($path));
        }

        $tmpFile = $path . '.tmp.' . getmypid();
        if (@file_put_contents($tmpFile, $json, LOCK_EX) === false) {
            @unlink($tmpFile);
            throw new RuntimeException('Failed to write ' . basename($path));
        }

        if (file_exists($path)) {
            @unlink($path);
        }
        if (!@rename($tmpFile, $path)) {
            @unlink($tmpFile);
            throw new RuntimeException('Failed to atomically replace ' . basename($path));
        }
    }

    /**
     * @param array<string, mixed> $store
     * @return array<string, mixed>|null
     */
    private function findOrderRecord(array $store, string $type, string $orderNumber): ?array
    {
        $meta = $this->orderMeta($type);
        foreach ((array)($store[$meta['store_key']] ?? []) as $row) {
            if (is_array($row) && (string)($row[$meta['number_key']] ?? '') === $orderNumber) {
                return $row;
            }
        }
        return null;
    }

    /**
     * @param array<string, mixed> $store
     * @return array<int, array<string, mixed>>
     */
    private function getWorkOrdersForJobFromStore(array $store, string $joNumber): array
    {
        $result = [];
        foreach ((array)($store['work_orders'] ?? []) as $wo) {
            if (is_array($wo) && (string)($wo['jo_number'] ?? '') === $joNumber) {
                $result[] = $wo;
            }
        }

        usort($result, [$this, 'compareOperationNumber']);
        return $result;
    }

    /**
     * @param array<string, mixed> $store
     * @return array<int, array<string, mixed>>
     */
    private function getLinkedFormsForOrder(array $store, string $orderType, string $orderId): array
    {
        $links = [];
        foreach ((array)($store['form_links'] ?? []) as $link) {
            if (!is_array($link)) {
                continue;
            }

            $normalizedMatch = strtolower((string)($link['order_type'] ?? '')) === $orderType
                && (string)($link['order_id'] ?? '') === $orderId;

            $legacyMatch = false;
            if ($orderType === 'jo') {
                $legacyMatch = (string)($link['jo_number'] ?? '') === $orderId;
            } elseif ($orderType === 'so') {
                $legacyMatch = (string)($link['so_number'] ?? '') === $orderId;
            } elseif ($orderType === 'wo') {
                $legacyMatch = (string)($link['wo_number'] ?? '') === $orderId;
            }

            if ($normalizedMatch || $legacyMatch) {
                $links[] = $link;
            }
        }

        return $links;
    }

    /**
     * @param array<string, mixed> $store
     */
    private function nextOrderNumber(array &$store, string $type): string
    {
        $meta = $this->orderMeta($type);
        $counterKey = $meta['counter_key'];
        $current = (string)($store['_meta']['counters'][$counterKey] ?? '');

        if (!preg_match($this->orderNumberPattern($type), $current, $matches)) {
            $currentYear = (int)date('Y');
            $sequence = 0;
        } else {
            $currentYear = (int)$matches[1];
            $sequence = (int)$matches[2];
        }

        $year = (int)date('Y');
        if ($currentYear !== $year) {
            $sequence = 0;
        }

        $sequence++;
        $next = $meta['prefix'] . '-' . $year . '-' . str_pad((string)$sequence, $meta['digits'], '0', STR_PAD_LEFT);
        $store['_meta']['counters'][$counterKey] = $next;

        return $next;
    }

    /**
     * @param array<string, mixed> $store
     */
    private function syncCounterWithNumber(array &$store, string $type, string $orderNumber): void
    {
        if (!preg_match($this->orderNumberPattern($type), strtoupper(trim($orderNumber)), $manualMatch)) {
            return;
        }

        $meta = $this->orderMeta($type);
        $counterKey = $meta['counter_key'];
        $manualYear = (int)$manualMatch[1];
        $manualSequence = (int)$manualMatch[2];
        $current = (string)($store['_meta']['counters'][$counterKey] ?? '');

        if (!preg_match($this->orderNumberPattern($type), $current, $currentMatch)) {
            $store['_meta']['counters'][$counterKey] = strtoupper(trim($orderNumber));
            return;
        }

        $currentYear = (int)$currentMatch[1];
        $currentSequence = (int)$currentMatch[2];

        if ($manualYear > $currentYear || ($manualYear === $currentYear && $manualSequence > $currentSequence)) {
            $store['_meta']['counters'][$counterKey] = strtoupper(trim($orderNumber));
        }
    }

    private function orderNumberPattern(string $type): string
    {
        return '/^' . preg_quote($this->orderMeta($type)['prefix'], '/') . '-([0-9]{4})-([0-9]+)$/';
    }

    /**
     * @return array<string, string|int>
     */
    private function orderMeta(string $type): array
    {
        return match ($type) {
            'so' => ['store_key' => 'sales_orders', 'number_key' => 'so_number', 'counter_key' => 'last_so', 'prefix' => 'SO', 'digits' => 4],
            'jo' => ['store_key' => 'job_orders', 'number_key' => 'jo_number', 'counter_key' => 'last_jo', 'prefix' => 'JO', 'digits' => 4],
            'wo' => ['store_key' => 'work_orders', 'number_key' => 'wo_number', 'counter_key' => 'last_wo', 'prefix' => 'WO', 'digits' => 6],
            default => throw new RuntimeException('Unsupported order type: ' . $type),
        };
    }

    /**
     * @param array<string, mixed> $a
     * @param array<string, mixed> $b
     */
    private function compareOperationNumber(array $a, array $b): int
    {
        return (int)($a['operation_number'] ?? 0) <=> (int)($b['operation_number'] ?? 0);
    }

    private function stringValue(mixed $value): string
    {
        if (is_scalar($value)) {
            return trim((string)$value);
        }

        return '';
    }

    private function generateUuidV4(): string
    {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
