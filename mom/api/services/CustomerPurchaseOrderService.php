<?php

declare(strict_types=1);

namespace MOM\Services;

use DateTimeImmutable;
use RuntimeException;

/**
 * Canonical customer purchase-order object extracted from embedded SO fields.
 *
 * Purpose:
 * - preserve the external commercial commitment as its own auditable object
 * - link that commitment to one or more sales orders without split truth
 * - provide lifecycle/gate control before and during commercial execution
 *
 * Wave 3 keeps the runtime implementation file-backed so it can operate today,
 * while the canonical DB schema is introduced separately as migration backlog.
 */
final class CustomerPurchaseOrderService
{
    private const STATUSES = ['received', 'acknowledged', 'confirmed', 'closed', 'cancelled'];

    private string $dataDir;
    private string $commercialDir;
    private string $storePath;

    public function __construct(string $dataDir)
    {
        $this->dataDir = rtrim(str_replace('\\', '/', $dataDir), '/');
        $this->commercialDir = $this->dataDir . '/commercial';
        $this->storePath = $this->commercialDir . '/customer_purchase_orders.json';
    }

    /**
     * @param array<string, mixed> $filters
     * @return array<int, array<string, mixed>>
     */
    public function listPurchaseOrders(array $filters = []): array
    {
        $this->synchronizeLegacySalesOrders();

        $rows = [];
        foreach ($this->records() as $record) {
            if (!$this->matchesFilters($record, $filters)) {
                continue;
            }

            $rows[] = $record;
        }

        usort($rows, static function (array $left, array $right): int {
            return strcmp((string)($right['updated_at'] ?? ''), (string)($left['updated_at'] ?? ''));
        });

        // COM-006: Apply pagination cap at service layer (max 200 records)
        // This is enforced by controller layer via paginated() method
        return $rows;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function getPurchaseOrder(string $customerPoId): ?array
    {
        $needle = trim($customerPoId);
        if ($needle === '') {
            return null;
        }

        $this->synchronizeLegacySalesOrders();
        foreach ($this->records() as $record) {
            if (($record['customer_po_id'] ?? '') === $needle || ($record['customer_po_number'] ?? '') === $needle) {
                return $record;
            }
        }

        return null;
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function createPurchaseOrder(array $payload, string $userId): array
    {
        $this->synchronizeLegacySalesOrders();

        $customerId = trim((string)($payload['customer_id'] ?? ''));
        $customerPoNumber = trim((string)($payload['customer_po_number'] ?? $payload['customer_po'] ?? ''));
        $receivedAt = $this->normalizeTimestamp((string)($payload['received_at'] ?? ''), $this->nowIso());

        if ($customerId === '' || $customerPoNumber === '') {
            throw new RuntimeException('Customer purchase order requires customer_id and customer_po_number.');
        }

        $store = $this->readStore();
        $existingIdx = $this->findRecordIndex($store, $customerId, $customerPoNumber, trim((string)($payload['customer_po_id'] ?? '')));
        if ($existingIdx !== null) {
            throw new RuntimeException('Customer purchase order already exists for this customer and PO number.');
        }

        $now = $this->nowIso();
        $record = [
            'customer_po_id' => $this->nextCustomerPoId($store),
            'customer_po_number' => $customerPoNumber,
            'po_status' => 'received',
            'customer_id' => $customerId,
            'customer_name' => trim((string)($payload['customer_name'] ?? '')),
            'customer_site_id' => trim((string)($payload['customer_site_id'] ?? '')),
            'ship_to_site_id' => trim((string)($payload['ship_to_site_id'] ?? '')),
            'quote_id' => trim((string)($payload['quote_id'] ?? '')),
            'received_at' => $receivedAt,
            'requested_date' => trim((string)($payload['requested_date'] ?? '')),
            'due_date' => trim((string)($payload['due_date'] ?? '')),
            'currency_code' => strtoupper(trim((string)($payload['currency_code'] ?? 'VND'))),
            'incoterm_code' => trim((string)($payload['incoterm_code'] ?? '')),
            'payment_term_code' => trim((string)($payload['payment_term_code'] ?? '')),
            'customer_reference' => trim((string)($payload['customer_reference'] ?? '')),
            'source' => trim((string)($payload['source'] ?? 'manual_entry')) ?: 'manual_entry',
            'source_system' => trim((string)($payload['source_system'] ?? 'QMS')) ?: 'QMS',
            'source_record_id' => trim((string)($payload['source_record_id'] ?? '')),
            'notes' => trim((string)($payload['notes'] ?? '')),
            'lines' => $this->normalizeLines($payload['lines'] ?? [], $customerPoNumber),
            'sales_order_refs' => [],
            'status_history' => [[
                'from' => '',
                'to' => 'received',
                'transition' => 'create',
                'timestamp' => $now,
                'user' => $userId,
                'reason' => 'Customer purchase order captured into canonical commercial demand object.',
            ]],
            'change_history' => [],
            'created_at' => $now,
            'created_by' => $userId,
            'updated_at' => $now,
            'updated_by' => $userId,
        ];
        if (!in_array((string)$record['po_status'], self::STATUSES, true)) {
            throw new RuntimeException('Invalid customer purchase order status.');
        }
        $record = $this->withTotals($record);

        $store['customer_purchase_orders'][] = $record;
        $this->writeStore($store);

        return $record;
    }

    /**
     * @param array<string, mixed> $context
     * @return array<string, mixed>
     */
    public function transitionPurchaseOrder(string $customerPoId, string $transition, string $userId, array $context = []): array
    {
        $this->synchronizeLegacySalesOrders();

        $transition = strtolower(trim($transition));
        if ($transition === '') {
            throw new RuntimeException('Customer purchase order transition is required.');
        }

        $store = $this->readStore();
        $index = $this->findRecordIndex($store, '', '', $customerPoId);
        if ($index === null) {
            throw new RuntimeException('Customer purchase order not found.');
        }

        $record = (array)$store['customer_purchase_orders'][$index];
        $record = $this->refreshSalesOrderStatuses($record);
        $currentStatus = (string)($record['po_status'] ?? 'received');
        if (!in_array($currentStatus, self::STATUSES, true)) {
            throw new RuntimeException("Invalid customer purchase order status: {$currentStatus}.");
        }
        $reason = trim((string)($context['reason'] ?? ''));

        $targetStatus = match ($transition) {
            'acknowledge' => 'acknowledged',
            'confirm' => 'confirmed',
            'cancel' => 'cancelled',
            'close' => 'closed',
            default => '',
        };
        if ($targetStatus === '') {
            throw new RuntimeException('Unsupported customer purchase order transition.');
        }
        if (!in_array($targetStatus, self::STATUSES, true)) {
            throw new RuntimeException("Invalid target customer purchase order status: {$targetStatus}.");
        }

        $allowed = [
            'received' => ['acknowledge', 'confirm', 'cancel'],
            'acknowledged' => ['confirm', 'cancel'],
            'confirmed' => ['close'],
            'closed' => [],
            'cancelled' => [],
        ];
        if (!in_array($transition, $allowed[$currentStatus], true)) {
            throw new RuntimeException("Transition {$transition} is not allowed from {$currentStatus}.");
        }

        if ($transition === 'confirm') {
            $soNumber = trim((string)($context['so_number'] ?? ''));
            if ($soNumber !== '') {
                $record = $this->applySalesOrderLink($record, $soNumber, (string)($context['sales_order_status'] ?? ''), $userId);
            }
            if (count((array)($record['sales_order_refs'] ?? [])) === 0) {
                throw new RuntimeException('Customer purchase order cannot be confirmed before it is linked to at least one Sales Order.');
            }
        }

        if ($transition === 'close' && !$this->allLinkedSalesOrdersTerminal($record)) {
            throw new RuntimeException('Customer purchase order cannot close while linked Sales Orders are still open.');
        }

        if ($transition === 'cancel' && !$this->canCancel($record)) {
            throw new RuntimeException('Customer purchase order cannot cancel while linked Sales Orders are active.');
        }

        $now = $this->nowIso();
        $record['po_status'] = $targetStatus;
        $record['updated_at'] = $now;
        $record['updated_by'] = $userId;
        $record['status_history'][] = [
            'from' => $currentStatus,
            'to' => $targetStatus,
            'transition' => $transition,
            'timestamp' => $now,
            'user' => $userId,
            'reason' => $reason !== '' ? $reason : null,
        ];
        $record = $this->stripNulls($record);

        $store['customer_purchase_orders'][$index] = $record;
        $this->writeStore($store);

        return $record;
    }

    /**
     * Extract or update a canonical customer PO from a linked sales order.
     *
     * @param array<string, mixed> $salesOrder
     * @return array<string, mixed>|null
     */
    public function synchronizeSalesOrder(array $salesOrder, string $userId = 'system'): ?array
    {
        $customerPoNumber = trim((string)($salesOrder['customer_po_number'] ?? $salesOrder['customer_po'] ?? ''));
        $customerId = trim((string)($salesOrder['customer_id'] ?? ''));
        $soNumber = trim((string)($salesOrder['so_number'] ?? ''));
        if ($customerPoNumber === '' || $customerId === '' || $soNumber === '') {
            return null;
        }

        $store = $this->readStore();
        $existingIdx = $this->findRecordIndex(
            $store,
            $customerId,
            $customerPoNumber,
            trim((string)($salesOrder['customer_po_id'] ?? ''))
        );

        $record = $existingIdx !== null
            ? (array)$store['customer_purchase_orders'][$existingIdx]
            : $this->seedRecordFromSalesOrder($store, $salesOrder, $userId);

        $record['customer_name'] = trim((string)($salesOrder['customer_name'] ?? $record['customer_name'] ?? ''));
        $record['customer_site_id'] = trim((string)($salesOrder['customer_site_id'] ?? $record['customer_site_id'] ?? ''));
        $record['ship_to_site_id'] = trim((string)($salesOrder['ship_to_site_id'] ?? $record['ship_to_site_id'] ?? ''));
        $record['quote_id'] = trim((string)($salesOrder['quote_id'] ?? $record['quote_id'] ?? ''));
        $record['requested_date'] = trim((string)($salesOrder['requested_date'] ?? $record['requested_date'] ?? ''));
        $record['due_date'] = trim((string)($salesOrder['due_date'] ?? $record['due_date'] ?? ''));
        $record['currency_code'] = strtoupper(trim((string)($salesOrder['currency_code'] ?? $record['currency_code'] ?? 'VND')));
        $record['incoterm_code'] = trim((string)($salesOrder['incoterm_code'] ?? $record['incoterm_code'] ?? ''));
        $record['payment_term_code'] = trim((string)($salesOrder['payment_term_code'] ?? $record['payment_term_code'] ?? ''));
        $record['lines'] = $this->preferExistingOrSalesOrderLines((array)($record['lines'] ?? []), $salesOrder, $customerPoNumber);
        $record = $this->applySalesOrderLink($record, $soNumber, (string)($salesOrder['status'] ?? ''), $userId);

        $soStatus = strtolower(trim((string)($salesOrder['status'] ?? '')));
        $derivedStatus = match ($soStatus) {
            'closed', 'cancelled' => $soStatus === 'closed' ? 'closed' : 'cancelled',
            default => 'confirmed',
        };
        if (($record['po_status'] ?? 'received') !== $derivedStatus) {
            $record['status_history'][] = [
                'from' => $record['po_status'] ?? 'received',
                'to' => $derivedStatus,
                'transition' => 'sync_sales_order',
                'timestamp' => $this->nowIso(),
                'user' => $userId,
                'reason' => "Synchronized from Sales Order {$soNumber}",
            ];
            $record['po_status'] = $derivedStatus;
        }

        $record['updated_at'] = $this->nowIso();
        $record['updated_by'] = $userId;
        $record = $this->withTotals($record);
        $record = $this->refreshSalesOrderStatuses($record);

        if ($existingIdx === null) {
            $store['customer_purchase_orders'][] = $record;
        } else {
            $store['customer_purchase_orders'][$existingIdx] = $record;
        }

        $this->writeStore($store);
        $this->orders()->linkCustomerPurchaseOrderToSalesOrder($soNumber, (string)$record['customer_po_id'], (string)$record['customer_po_number']);

        return $record;
    }

    /**
     * @return array<string, mixed>
     */
    private function seedRecordFromSalesOrder(array &$store, array $salesOrder, string $userId): array
    {
        $now = $this->nowIso();
        $record = [
            'customer_po_id' => $this->nextCustomerPoId($store),
            'customer_po_number' => trim((string)($salesOrder['customer_po_number'] ?? $salesOrder['customer_po'] ?? '')),
            'po_status' => 'received',
            'customer_id' => trim((string)($salesOrder['customer_id'] ?? '')),
            'customer_name' => trim((string)($salesOrder['customer_name'] ?? '')),
            'customer_site_id' => trim((string)($salesOrder['customer_site_id'] ?? '')),
            'ship_to_site_id' => trim((string)($salesOrder['ship_to_site_id'] ?? '')),
            'quote_id' => trim((string)($salesOrder['quote_id'] ?? '')),
            'received_at' => $this->normalizeTimestamp((string)($salesOrder['order_date'] ?? ''), $now),
            'requested_date' => trim((string)($salesOrder['requested_date'] ?? '')),
            'due_date' => trim((string)($salesOrder['due_date'] ?? '')),
            'currency_code' => strtoupper(trim((string)($salesOrder['currency_code'] ?? 'VND'))),
            'incoterm_code' => trim((string)($salesOrder['incoterm_code'] ?? '')),
            'payment_term_code' => trim((string)($salesOrder['payment_term_code'] ?? '')),
            'customer_reference' => trim((string)($salesOrder['customer_reference'] ?? '')),
            'source' => 'sales_order_backfill',
            'source_system' => 'QMS',
            'source_record_id' => trim((string)($salesOrder['so_number'] ?? '')),
            'notes' => 'Backfilled from legacy Sales Order customer PO embedding.',
            'lines' => $this->normalizeLines($salesOrder['lines'] ?? [], trim((string)($salesOrder['customer_po_number'] ?? $salesOrder['customer_po'] ?? ''))),
            'sales_order_refs' => [],
            'status_history' => [[
                'from' => '',
                'to' => 'received',
                'transition' => 'backfill',
                'timestamp' => $now,
                'user' => $userId,
                'reason' => "Extracted from Sales Order " . trim((string)($salesOrder['so_number'] ?? '')),
            ]],
            'change_history' => [],
            'created_at' => $now,
            'created_by' => $userId,
            'updated_at' => $now,
            'updated_by' => $userId,
        ];

        return $this->withTotals($record);
    }

    private function synchronizeLegacySalesOrders(): void
    {
        $salesOrders = $this->orders()->listSalesOrders();
        foreach ($salesOrders as $salesOrder) {
            if (!is_array($salesOrder)) {
                continue;
            }
            $customerPoNumber = trim((string)($salesOrder['customer_po_number'] ?? $salesOrder['customer_po'] ?? ''));
            if ($customerPoNumber === '') {
                continue;
            }
            $this->synchronizeSalesOrder($salesOrder, 'system_sync');
        }
    }

    /**
     * @param array<string, mixed> $record
     * @return array<string, mixed>
     */
    private function refreshSalesOrderStatuses(array $record): array
    {
        $refs = [];
        foreach ((array)($record['sales_order_refs'] ?? []) as $ref) {
            if (!is_array($ref) || trim((string)($ref['so_number'] ?? '')) === '') {
                continue;
            }
            $refs[(string)$ref['so_number']] = $ref;
        }

        if ($refs === []) {
            return $record;
        }

        $salesOrders = [];
        foreach ($this->orders()->listSalesOrders() as $salesOrder) {
            if (!is_array($salesOrder)) {
                continue;
            }
            $salesOrders[(string)($salesOrder['so_number'] ?? '')] = $salesOrder;
        }

        foreach ($refs as $soNumber => &$ref) {
            $current = $salesOrders[$soNumber] ?? null;
            if (is_array($current)) {
                $ref['sales_order_status'] = (string)($current['status'] ?? '');
                $ref['due_date'] = (string)($current['due_date'] ?? ($ref['due_date'] ?? ''));
                $ref['linked_customer_po_id'] = (string)($current['customer_po_id'] ?? ($ref['linked_customer_po_id'] ?? ''));
            }
        }
        unset($ref);

        $record['sales_order_refs'] = array_values($refs);
        return $record;
    }

    /**
     * @param array<string, mixed> $record
     * @return array<string, mixed>
     */
    private function applySalesOrderLink(array $record, string $soNumber, string $soStatus, string $userId): array
    {
        $soNumber = trim($soNumber);
        if ($soNumber === '') {
            return $record;
        }

        $refs = [];
        $found = false;
        foreach ((array)($record['sales_order_refs'] ?? []) as $ref) {
            if (!is_array($ref)) {
                continue;
            }
            if (($ref['so_number'] ?? '') === $soNumber) {
                $ref['sales_order_status'] = $soStatus !== '' ? $soStatus : (string)($ref['sales_order_status'] ?? '');
                $ref['linked_at'] = $ref['linked_at'] ?? $this->nowIso();
                $ref['linked_by'] = $ref['linked_by'] ?? $userId;
                $found = true;
            }
            $refs[] = $ref;
        }

        if (!$found) {
            $refs[] = [
                'so_number' => $soNumber,
                'sales_order_status' => $soStatus,
                'linked_at' => $this->nowIso(),
                'linked_by' => $userId,
            ];
        }

        $record['sales_order_refs'] = $refs;
        return $record;
    }

    /**
     * @param array<int, array<string, mixed>> $existingLines
     * @param array<string, mixed> $salesOrder
     * @return array<int, array<string, mixed>>
     */
    private function preferExistingOrSalesOrderLines(array $existingLines, array $salesOrder, string $customerPoNumber): array
    {
        if ($existingLines !== []) {
            return $existingLines;
        }

        return $this->normalizeLines($salesOrder['lines'] ?? [], $customerPoNumber);
    }

    private function allLinkedSalesOrdersTerminal(array $record): bool
    {
        $refs = (array)($record['sales_order_refs'] ?? []);
        if ($refs === []) {
            return false;
        }

        foreach ($refs as $ref) {
            if (!is_array($ref)) {
                return false;
            }
            $status = strtolower((string)($ref['sales_order_status'] ?? ''));
            if (!in_array($status, ['closed', 'cancelled'], true)) {
                return false;
            }
        }

        return true;
    }

    private function canCancel(array $record): bool
    {
        foreach ((array)($record['sales_order_refs'] ?? []) as $ref) {
            if (!is_array($ref)) {
                continue;
            }
            $status = strtolower((string)($ref['sales_order_status'] ?? ''));
            if ($status !== '' && !in_array($status, ['closed', 'cancelled'], true)) {
                return false;
            }
        }

        return true;
    }

    /**
     * @param array<string, mixed> $record
     * @return array<string, mixed>
     */
    private function withTotals(array $record): array
    {
        $totalQty = 0.0;
        $totalValue = 0.0;
        foreach ((array)($record['lines'] ?? []) as $line) {
            if (!is_array($line)) {
                continue;
            }
            $qty = (float)($line['qty'] ?? $line['quantity'] ?? 0);
            $price = (float)($line['unit_price'] ?? 0);
            $extended = isset($line['line_total']) ? (float)$line['line_total'] : $qty * $price;
            $totalQty += $qty;
            $totalValue += $extended;
        }

        $record['line_count'] = count((array)($record['lines'] ?? []));
        $record['total_qty'] = round($totalQty, 2);
        $record['total_value'] = round($totalValue, 2);
        return $record;
    }

    /**
     * @param mixed $rawLines
     * @return array<int, array<string, mixed>>
     */
    private function normalizeLines(mixed $rawLines, string $customerPoNumber): array
    {
        if (!is_array($rawLines)) {
            return [];
        }

        $lines = [];
        $lineNumber = 1;
        foreach ($rawLines as $rawLine) {
            if (!is_array($rawLine)) {
                continue;
            }
            $qty = (float)($rawLine['qty'] ?? $rawLine['quantity'] ?? 0);
            $unitPrice = (float)($rawLine['unit_price'] ?? $rawLine['price'] ?? 0);
            $lineTotal = isset($rawLine['line_total']) ? (float)$rawLine['line_total'] : ($qty * $unitPrice);
            $lines[] = [
                'customer_po_line_id' => sprintf('%s-L%03d', preg_replace('/[^A-Za-z0-9]+/', '-', strtoupper($customerPoNumber)) ?: 'CPO', $lineNumber),
                'line_number' => (int)($rawLine['line_number'] ?? $lineNumber),
                'customer_item_ref' => trim((string)($rawLine['customer_item_ref'] ?? $rawLine['customer_part_number'] ?? '')),
                'item_id' => trim((string)($rawLine['item_id'] ?? '')),
                'part_number' => trim((string)($rawLine['part_number'] ?? '')),
                'description' => trim((string)($rawLine['description'] ?? $rawLine['part_description'] ?? '')),
                'qty' => $qty,
                'uom' => trim((string)($rawLine['uom'] ?? 'EA')) ?: 'EA',
                'unit_price' => round($unitPrice, 4),
                'line_total' => round($lineTotal, 2),
                'requested_date' => trim((string)($rawLine['requested_date'] ?? '')),
                'promise_date' => trim((string)($rawLine['promise_date'] ?? '')),
            ];
            $lineNumber++;
        }

        return $lines;
    }

    /**
     * @param array<string, mixed> $record
     * @param array<string, mixed> $filters
     */
    private function matchesFilters(array $record, array $filters): bool
    {
        // COM-001: Filter by org_id if provided in session
        $orgId = trim((string)($filters['org_id'] ?? ''));
        if ($orgId !== '' && (string)($record['org_id'] ?? '') !== $orgId) {
            return false;
        }

        $status = strtolower(trim((string)($filters['status'] ?? '')));
        if ($status !== '' && !in_array($status, self::STATUSES, true)) {
            return false;
        }
        if ($status !== '' && strtolower((string)($record['po_status'] ?? '')) !== $status) {
            return false;
        }

        $customerId = trim((string)($filters['customer_id'] ?? ''));
        if ($customerId !== '' && (string)($record['customer_id'] ?? '') !== $customerId) {
            return false;
        }

        $soNumber = trim((string)($filters['so_number'] ?? ''));
        if ($soNumber !== '') {
            $linked = false;
            foreach ((array)($record['sales_order_refs'] ?? []) as $ref) {
                if (is_array($ref) && (string)($ref['so_number'] ?? '') === $soNumber) {
                    $linked = true;
                    break;
                }
            }
            if (!$linked) {
                return false;
            }
        }

        $search = strtolower(trim((string)($filters['search'] ?? '')));
        if ($search !== '') {
            $haystacks = [
                strtolower((string)($record['customer_po_id'] ?? '')),
                strtolower((string)($record['customer_po_number'] ?? '')),
                strtolower((string)($record['customer_name'] ?? '')),
                strtolower((string)($record['customer_id'] ?? '')),
                strtolower((string)($record['quote_id'] ?? '')),
            ];
            foreach ((array)($record['sales_order_refs'] ?? []) as $ref) {
                if (is_array($ref)) {
                    $haystacks[] = strtolower((string)($ref['so_number'] ?? ''));
                }
            }
            $matched = false;
            foreach ($haystacks as $haystack) {
                if ($haystack !== '' && strpos($haystack, $search) !== false) {
                    $matched = true;
                    break;
                }
            }
            if (!$matched) {
                return false;
            }
        }

        return true;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function records(): array
    {
        $store = $this->readStore();
        $records = array_values(array_filter((array)($store['customer_purchase_orders'] ?? []), 'is_array'));
        return array_map(function (array $record): array {
            return $this->withTotals($this->refreshSalesOrderStatuses($record));
        }, $records);
    }

    /**
     * @param array<string, mixed> $store
     */
    private function nextCustomerPoId(array &$store): string
    {
        $year = (new DateTimeImmutable('now', new \DateTimeZone('+07:00')))->format('Y');
        $current = (int)(($store['counters']['customer_purchase_order'] ?? 0));
        $current++;
        $store['counters']['customer_purchase_order'] = $current;
        return sprintf('CPO-%s-%04d', $year, $current);
    }

    /**
     * @param array<string, mixed> $store
     */
    private function findRecordIndex(array $store, string $customerId, string $customerPoNumber, string $customerPoId = ''): ?int
    {
        foreach ((array)($store['customer_purchase_orders'] ?? []) as $index => $record) {
            if (!is_array($record)) {
                continue;
            }
            if ($customerPoId !== '' && (string)($record['customer_po_id'] ?? '') === $customerPoId) {
                return (int)$index;
            }
            if ($customerId !== '' && $customerPoNumber !== '') {
                if ((string)($record['customer_id'] ?? '') === $customerId && (string)($record['customer_po_number'] ?? '') === $customerPoNumber) {
                    return (int)$index;
                }
            }
        }

        return null;
    }

    /**
     * @return array<string, mixed>
     */
    private function readStore(): array
    {
        if (!is_file($this->storePath)) {
            return $this->defaultStore();
        }

        $raw = @file_get_contents($this->storePath);
        if ($raw === false || trim($raw) === '') {
            return $this->defaultStore();
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            return $this->defaultStore();
        }

        return $this->normalizeStore($decoded);
    }

    /**
     * @param array<string, mixed> $store
     */
    private function writeStore(array $store): void
    {
        if (!is_dir($this->commercialDir) && !@mkdir($this->commercialDir, 0775, true) && !is_dir($this->commercialDir)) {
            throw new RuntimeException('Unable to initialize customer purchase order storage.');
        }

        $tmp = $this->storePath . '.tmp.' . getmypid();
        $json = json_encode($this->normalizeStore($store), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json === false) {
            throw new RuntimeException('Unable to encode customer purchase order storage.');
        }
        if (@file_put_contents($tmp, $json . PHP_EOL, LOCK_EX) === false) {
            @unlink($tmp);
            throw new RuntimeException('Unable to persist customer purchase order storage.');
        }
        if (!@rename($tmp, $this->storePath)) {
            @unlink($tmp);
            throw new RuntimeException('Unable to finalize customer purchase order storage.');
        }
    }

    /**
     * @param array<string, mixed> $store
     * @return array<string, mixed>
     */
    private function normalizeStore(array $store): array
    {
        $base = $this->defaultStore();
        $base['customer_purchase_orders'] = array_values(array_filter((array)($store['customer_purchase_orders'] ?? []), 'is_array'));
        $base['counters']['customer_purchase_order'] = max(
            (int)($base['counters']['customer_purchase_order'] ?? 0),
            (int)(($store['counters']['customer_purchase_order'] ?? 0))
        );
        return $base;
    }

    /**
     * @return array<string, mixed>
     */
    private function defaultStore(): array
    {
        return [
            'customer_purchase_orders' => [],
            'counters' => [
                'customer_purchase_order' => 0,
            ],
        ];
    }

    private function normalizeTimestamp(string $value, string $fallback): string
    {
        $value = trim($value);
        return $value !== '' ? $value : $fallback;
    }

    private function nowIso(): string
    {
        return (new DateTimeImmutable('now', new \DateTimeZone('+07:00')))->format('c');
    }

    private function orders(): OrderService
    {
        return new OrderService($this->dataDir);
    }

    /**
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    private function stripNulls(array $data): array
    {
        foreach ($data as $key => $value) {
            if (is_array($value)) {
                $data[$key] = $this->stripNulls($value);
            }
            if ($data[$key] === null) {
                unset($data[$key]);
            }
        }
        return $data;
    }
}
