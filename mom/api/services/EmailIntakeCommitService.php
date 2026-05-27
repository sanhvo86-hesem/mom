<?php

declare(strict_types=1);

namespace MOM\Api\Services;

use MOM\Services\CustomerPurchaseOrderService;
use MOM\Services\OrderService;
use RuntimeException;

/**
 * EmailIntakeCommitService — translates an approved AEOI case into real
 * Customer PO / Sales Order rows through the EXISTING governed services.
 *
 * Hard rules (enforced here and re-checked by the underlying services):
 *   1. Case status must be approved or commit_ready.
 *   2. CPO commit must be the first step — SO commit requires either a
 *      previously-committed CPO id on the case OR a customer_po_number
 *      to embed into the SO payload.
 *   3. SO commit requires total_value > 0 (OrderService::createSalesOrder
 *      hard-rejects total_value <= 0).
 *   4. We NEVER call OrderService::createJobOrder or createWorkOrder from
 *      this service. JO/WO release goes through the normal Orders
 *      workflow once the SO advances to engineering_ready/in_production
 *      and a released part_revision is confirmed.
 *   5. Every commit attempt — success or failure — is recorded via
 *      EmailIntakeCaseService::recordCommit.
 *
 * @package MOM\Api\Services
 */
final class EmailIntakeCommitService
{
    private const COMMIT_READY_STATUSES = ['approved', 'commit_ready', 'committed_cpo'];

    public function __construct(
        private readonly EmailIntakeCaseService $cases,
        private readonly CustomerPurchaseOrderService $cpoService,
        private readonly OrderService $orderService
    ) {}

    /**
     * Commit a Customer PO from the case data. Returns the CPO record.
     */
    public function commitCustomerPo(int $caseId, string $actor): array
    {
        $case = $this->cases->getCase($caseId);
        $this->assertCommitReady($case, 'customer_po');

        if (!empty($case['committed_customer_po_id'])) {
            throw new RuntimeException('Case already has a committed Customer PO: ' . $case['committed_customer_po_id']);
        }
        if (empty($case['customer_id']) || empty($case['customer_po_number'])) {
            throw new RuntimeException('customer_id and customer_po_number are required to commit Customer PO.');
        }

        $payload = $this->buildCpoPayload($case, $caseId);

        try {
            $cpo = $this->cpoService->createPurchaseOrder($payload, $actor);
            $cpoId = (string)($cpo['customer_po_id'] ?? '');
            $this->cases->recordCommit($caseId, 'customer_po', $cpoId, $payload, $actor);
            return $cpo;
        } catch (\Throwable $e) {
            $this->cases->recordCommit($caseId, 'customer_po', '', $payload, $actor, $e->getMessage());
            throw $e;
        }
    }

    /**
     * Commit a Sales Order from the case data. Returns the SO record.
     */
    public function commitSalesOrder(int $caseId, string $actor): array
    {
        $case = $this->cases->getCase($caseId);
        $this->assertCommitReady($case, 'sales_order');

        if (!empty($case['committed_so_number'])) {
            throw new RuntimeException('Case already has a committed Sales Order: ' . $case['committed_so_number']);
        }
        if (empty($case['customer_id']) || empty($case['customer_po_number'])) {
            throw new RuntimeException('customer_id and customer_po_number are required to commit Sales Order.');
        }

        $payload = $this->buildSoPayload($case, $caseId);
        if (($payload['total_value'] ?? 0) <= 0) {
            throw new RuntimeException('Sales Order requires total_value > 0 (per OrderService gate).');
        }

        try {
            $so = $this->orderService->createSalesOrder($payload);
            $soNumber = (string)($so['so_number'] ?? '');
            $this->cases->recordCommit($caseId, 'sales_order', $soNumber, $payload, $actor);
            return $so;
        } catch (\Throwable $e) {
            $this->cases->recordCommit($caseId, 'sales_order', '', $payload, $actor, $e->getMessage());
            throw $e;
        }
    }

    // ── Payload builders ─────────────────────────────────────────────────

    private function buildCpoPayload(array $case, int $caseId): array
    {
        $extracted = $case['extracted_json'] ?? [];
        $lines     = [];
        foreach ($case['lines'] as $idx => $line) {
            $qty       = (float)($line['quantity']   ?? 0);
            $unitPrice = (float)($line['unit_price'] ?? 0);
            $total     = isset($line['line_total']) ? (float)$line['line_total'] : ($qty * $unitPrice);
            $lines[]   = [
                'line_number'          => $idx + 1,
                'customer_item_ref'    => trim((string)($line['customer_part_number'] ?? '')),
                'part_number'          => trim((string)($line['part_number'] ?? '')),
                'description'          => trim((string)($line['part_description'] ?? '')),
                'qty'                  => $qty,
                'uom'                  => trim((string)($line['uom'] ?? 'EA')) ?: 'EA',
                'unit_price'           => $unitPrice,
                'line_total'           => $total,
                'requested_date'       => trim((string)($line['requested_delivery_date'] ?? '')),
                'promise_date'         => '',
                'customer_revision'    => trim((string)($line['customer_revision'] ?? $line['revision_number'] ?? '')),
                'revision_number'      => trim((string)($line['revision_number'] ?? $line['customer_revision'] ?? '')),
                'drawing_revision'     => trim((string)($line['drawing_revision'] ?? '')),
                'delivery_address_raw' => trim((string)($line['delivery_address'] ?? '')),
                'ship_to_site_id'      => trim((string)($line['ship_to_site_id'] ?? '')),
                'source_intake_id'     => (string)($case['intake_no'] ?? ''),
            ];
        }

        return [
            'customer_id'        => (string)$case['customer_id'],
            'customer_name'      => (string)($case['customer_name'] ?? ''),
            'customer_po_number' => (string)$case['customer_po_number'],
            'received_at'        => (string)($case['created_at'] ?? date('c')),
            'requested_date'     => $this->minLineDate($case['lines']),
            'due_date'           => $this->maxLineDate($case['lines']),
            'currency_code'      => (string)($case['currency_code'] ?? 'USD'),
            'incoterm_code'      => (string)($case['incoterm_code'] ?? ''),
            'payment_term_code'  => (string)($case['payment_term_code'] ?? ''),
            'customer_reference' => (string)($extracted['email']['internet_message_id'] ?? ''),
            'source'             => 'ai_order_intake',
            'source_system'      => 'AEOI',
            'source_record_id'   => (string)($case['intake_no'] ?? ''),
            'notes'              => 'Auto-created from AEOI case ' . ($case['intake_no'] ?? "#$caseId"),
            'lines'              => $lines,
        ];
    }

    private function buildSoPayload(array $case, int $caseId): array
    {
        $extracted = $case['extracted_json'] ?? [];
        $totalQty   = 0.0;
        $totalValue = 0.0;
        $lines      = [];

        foreach ($case['lines'] as $idx => $line) {
            $qty       = (float)($line['quantity'] ?? 0);
            $unitPrice = (float)($line['unit_price'] ?? 0);
            $total     = isset($line['line_total']) ? (float)$line['line_total'] : ($qty * $unitPrice);
            $totalQty   += $qty;
            $totalValue += $total;

            $lines[] = [
                'line_number'          => $idx + 1,
                'part_number'          => trim((string)($line['part_number'] ?? '')),
                'customer_part_number' => trim((string)($line['customer_part_number'] ?? '')),
                'part_description'     => trim((string)($line['part_description'] ?? '')),
                'revision_number'      => trim((string)($line['revision_number'] ?? '')),
                'part_revision'        => trim((string)($line['revision_number'] ?? '')),
                'qty'                  => $qty,
                'quantity'             => $qty,
                'uom'                  => trim((string)($line['uom'] ?? 'EA')) ?: 'EA',
                'unit_price'           => $unitPrice,
                'line_total'           => $total,
                'requested_date'       => trim((string)($line['requested_delivery_date'] ?? '')),
                'due_date'             => trim((string)($line['requested_delivery_date'] ?? '')),
                'delivery_address_raw' => trim((string)($line['delivery_address']  ?? '')),
                'ship_to_site_id'      => trim((string)($line['ship_to_site_id']   ?? '')),
                'source_intake_id'     => (string)($case['intake_no'] ?? ''),
            ];
        }

        return [
            'customer_id'         => (string)$case['customer_id'],
            'customer_name'       => (string)($case['customer_name'] ?? ''),
            'customer_po_id'      => (string)($case['committed_customer_po_id'] ?? ''),
            'customer_po'         => (string)$case['customer_po_number'],
            'customer_po_number'  => (string)$case['customer_po_number'],
            'order_date'          => (string)($case['po_date'] ?? date('Y-m-d')),
            'requested_date'      => $this->minLineDate($case['lines']),
            'due_date'            => $this->maxLineDate($case['lines']),
            'total_qty'           => $totalQty,
            'total_value'         => $totalValue,
            'priority'            => 'normal',
            'incoterm_code'       => (string)($case['incoterm_code'] ?? ''),
            'payment_term_code'   => (string)($case['payment_term_code'] ?? ''),
            'shipping_method_code'=> (string)($extracted['purchase_order']['shipping_method_code'] ?? ''),
            'special_requirements'=> (string)($extracted['purchase_order']['special_requirements'] ?? ''),
            'lines'               => $lines,
        ];
    }

    private function minLineDate(array $lines): string
    {
        $dates = array_filter(array_map(
            static fn($l) => trim((string)($l['requested_delivery_date'] ?? '')),
            $lines
        ));
        if (!$dates) {
            return '';
        }
        sort($dates);
        return $dates[0];
    }

    private function maxLineDate(array $lines): string
    {
        $dates = array_filter(array_map(
            static fn($l) => trim((string)($l['requested_delivery_date'] ?? '')),
            $lines
        ));
        if (!$dates) {
            return '';
        }
        rsort($dates);
        return $dates[0];
    }

    private function assertCommitReady(array $case, string $commitType): void
    {
        $status = (string)($case['status'] ?? '');
        if (!in_array($status, self::COMMIT_READY_STATUSES, true)) {
            throw new RuntimeException(
                "Cannot commit {$commitType} from case in status '{$status}'. "
                . 'Required: approved or commit_ready.'
            );
        }
        $blockers = is_array($case['blocking_codes'] ?? null)
            ? $case['blocking_codes']
            : (json_decode((string)($case['blocking_codes'] ?? '[]'), true) ?: []);
        if ($blockers) {
            throw new RuntimeException('Cannot commit while validation blockers remain: ' . implode(', ', $blockers));
        }
    }
}
