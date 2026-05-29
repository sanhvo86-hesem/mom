<?php

declare(strict_types=1);

namespace MOM\Services;

use DateTimeImmutable;
use DateTimeZone;

/**
 * Side-effect-free inventory authority gate for P36.
 *
 * Domain command handlers must persist returned command/posting packets inside
 * the P31 transaction with audit, evidence, outbox and projection refresh.
 */
final class InventoryLedgerAuthorityService
{
    private const PROJECTION_TABLES = [
        'stock_balances',
        'inventory_balance_snapshot',
        'location_balance',
    ];

    private const BLOCKING_LOT_STATUSES = [
        'blocked',
        'expired',
        'hold',
        'held',
        'on_hold',
        'quality_hold',
        'quarantine',
        'rejected',
        'scrapped',
    ];

    public function __construct(
        private readonly ?CanonicalQualityCaseAuthorityService $qualityCaseAuthority = null,
    ) {
    }

    /** @return array<string, mixed> */
    public function authorityProbe(): array
    {
        return [
            'slice' => 'inventory_ledger_genealogy_wip_cost_authority',
            'readiness_state' => 'service_gate_partial',
            'command_packet_authority' => 'inventory_ledger_command_packet',
            'posting_packet_authority' => 'inventory_ledger_posting_packet',
            'balance_projection_guard' => self::PROJECTION_TABLES,
            'reconciliation_authority' => 'inventory_reconciliation_run',
            'period_close_gate_authority' => 'inventory_period_close_gate',
            'recall_export_authority' => 'inventory_recall_evidence_export',
            'quality_hold_authority_consumed' => 'quality_holds via CanonicalQualityCaseAuthorityService',
            'generic_crud_mutation_allowed' => false,
        ];
    }

    /**
     * @param array<string, mixed> $command
     * @param array<int, array<string, mixed>> $existingPackets
     * @param array<int, array<string, mixed>> $availableLots
     * @param array<int, array<string, mixed>> $qualityHolds
     * @return array<string, mixed>
     */
    public function evaluateIssueCommand(
        array $command,
        array $existingPackets = [],
        array $availableLots = [],
        array $qualityHolds = [],
        ?DateTimeImmutable $asOf = null
    ): array {
        $asOf = $asOf ?? new DateTimeImmutable('now', new DateTimeZone('UTC'));
        $commandName = $this->text($command['command_name'] ?? 'IssueMaterialToWorkOrder');
        $idempotencyKey = $this->text($command['idempotency_key'] ?? '');
        if ($idempotencyKey === '') {
            return $this->blocked('inventory_idempotency_key_required', 'Inventory issue requires an idempotency key.');
        }

        $scopeKey = $this->scopeKey($command);
        $requestHash = $this->hashPayload($this->normalizedIssueRequest($command));
        $replay = $this->evaluateIdempotencyReplay($scopeKey, $idempotencyKey, $requestHash, $existingPackets);
        if (($replay['allowed'] ?? false) === false || ($replay['status'] ?? '') === 'replayed') {
            return $replay;
        }

        $period = $this->evaluateOpenPeriod($command);
        if (($period['allowed'] ?? false) === false) {
            return $period;
        }

        $lotRef = $this->text($command['lot_ref'] ?? $command['lot_id'] ?? $command['lot_number'] ?? '');
        if ($lotRef !== '') {
            $hold = $this->qualityAuthority()->evaluateHoldGate('lot', $lotRef, $qualityHolds);
            if (($hold['allowed'] ?? false) === false) {
                return $this->blocked('inventory_lot_on_hold', 'Canonical quality hold blocks inventory issue.', [
                    'lot_ref' => $lotRef,
                    'quality_gate' => $hold,
                ]);
            }
        }

        $fefo = $this->evaluateFefo($command, $availableLots, $asOf);
        if (($fefo['allowed'] ?? false) === false) {
            return $fefo;
        }

        $stock = $this->evaluateAvailableStock($command, $availableLots);
        if (($stock['allowed'] ?? false) === false) {
            return $stock;
        }

        $commandPacket = $this->commandPacket($commandName, $scopeKey, $idempotencyKey, $requestHash, 'planned', $command);
        $postingPacket = $this->postingPacket('issue_to_wip', $command, [
            'period_state' => $period['period_state'] ?? 'open',
            'posting_state' => 'planned',
            'source_aggregate_type' => 'work_order',
            'source_aggregate_ref' => $this->text($command['work_order_ref'] ?? $command['work_order_id'] ?? $command['wo_number'] ?? ''),
            'qty_delta' => -abs($this->number($command['qty'] ?? $command['quantity'] ?? 0.0)),
        ]);

        return [
            'allowed' => true,
            'status' => 'planned',
            'reason_code' => 'inventory_issue_command_ready',
            'message' => 'Inventory issue is idempotent, FEFO-safe, not held, in an open period, and ready for ledger posting.',
            'command_packet' => $commandPacket,
            'posting_packets' => [$postingPacket],
            'ledger_writes_required' => ['inventory_transactions', 'inventory_ledger', 'wip_ledger', 'mes_material_consumption'],
            'projection_write_allowed_only_via_refresh' => self::PROJECTION_TABLES,
        ];
    }

    /** @return array<string, mixed> */
    public function evaluateDirectBalanceMutation(string $tableName, array $change = []): array
    {
        $tableName = strtolower($this->text($tableName));
        if (in_array($tableName, self::PROJECTION_TABLES, true)) {
            return $this->blocked('direct_stock_balance_update_blocked', 'Inventory balances are projections and cannot be mutated directly.', [
                'table' => $tableName,
                'allowed_path' => 'InventoryLedgerAuthority command plus trusted projection refresh',
                'change_hash_sha256' => $this->hashPayload($change),
            ]);
        }

        return $this->allowed('not_inventory_balance_projection', 'Table is not an inventory balance projection in this gate.', [
            'table' => $tableName,
        ]);
    }

    /**
     * @param array<string, mixed> $completion
     * @return array<string, mixed>
     */
    public function planCompletionLedger(array $completion): array
    {
        $period = $this->evaluateOpenPeriod($completion);
        if (($period['allowed'] ?? false) === false) {
            return $period;
        }

        $workOrderRef = $this->text($completion['work_order_ref'] ?? $completion['work_order_id'] ?? $completion['wo_number'] ?? '');
        $itemRef = $this->text($completion['item_ref'] ?? $completion['item_id'] ?? $completion['part_number'] ?? '');
        if ($workOrderRef === '' || $itemRef === '') {
            return $this->blocked('completion_wip_cost_identity_required', 'Completion ledger plan requires work_order_ref and item_ref.');
        }

        $qtyGood = max(0.0, $this->number($completion['qty_good'] ?? $completion['good_qty'] ?? 0.0));
        $qtyScrap = max(0.0, $this->number($completion['qty_scrap'] ?? $completion['scrap_qty'] ?? 0.0));
        if ($qtyGood <= 0.0 && $qtyScrap <= 0.0) {
            return $this->blocked('completion_quantity_required', 'Completion ledger plan requires good or scrap quantity.');
        }

        $unitCost = max(0.0, $this->number($completion['unit_cost_amount'] ?? $completion['unit_cost'] ?? 0.0));
        $costAmount = $this->roundAmount(($qtyGood + $qtyScrap) * $unitCost);
        $posting = $this->postingPacket('completion', $completion, [
            'period_state' => $period['period_state'] ?? 'open',
            'posting_state' => 'planned',
            'source_aggregate_type' => 'work_order',
            'source_aggregate_ref' => $workOrderRef,
            'qty_delta' => $qtyGood,
            'cost_amount' => $costAmount,
        ]);

        return [
            'allowed' => true,
            'status' => 'planned',
            'reason_code' => 'completion_wip_cost_ledger_planned',
            'message' => 'Completion requires WIP relief and cost ledger posting in the same command transaction.',
            'wip_ledger_event' => [
                'production_order_ref' => $workOrderRef,
                'item_ref' => $itemRef,
                'stage_code' => $this->text($completion['operation_ref'] ?? $completion['operation_seq'] ?? 'completion'),
                'quantity_delta' => -abs($qtyGood + $qtyScrap),
                'amount_delta' => -abs($costAmount),
                'posting_state' => 'planned',
            ],
            'cost_ledger_event' => [
                'cost_object_type' => 'work_order',
                'cost_object_ref' => $workOrderRef,
                'cost_element_code' => $this->text($completion['cost_element_code'] ?? 'WIP_COMPLETION'),
                'cost_amount' => $costAmount,
                'currency_code' => $this->text($completion['currency_code'] ?? 'VND') ?: 'VND',
                'posting_state' => 'planned',
            ],
            'posting_packets' => [$posting],
        ];
    }

    /**
     * @param array<int, array<string, mixed>> $ledgerRows
     * @param array<int, array<string, mixed>> $projectionRows
     * @return array<string, mixed>
     */
    public function planReconciliation(array $ledgerRows, array $projectionRows, float $tolerance = 0.000001): array
    {
        $ledger = $this->sumByInventoryKey($ledgerRows, ['qty_delta', 'normalized_qty_delta', 'quantity_delta', 'qty_change']);
        $projection = $this->sumByInventoryKey($projectionRows, ['on_hand_qty', 'qty_on_hand', 'available_qty']);
        $keys = array_values(array_unique(array_merge(array_keys($ledger), array_keys($projection))));
        sort($keys);

        $discrepancies = [];
        foreach ($keys as $key) {
            $ledgerQty = $ledger[$key] ?? 0.0;
            $projectionQty = $projection[$key] ?? 0.0;
            $delta = $this->roundQty($ledgerQty - $projectionQty);
            if (abs($delta) <= $tolerance) {
                continue;
            }
            $parts = explode('|', $key);
            $discrepancies[] = [
                'discrepancy_type' => 'ledger_projection_delta',
                'item_ref' => $parts[0] ?? '',
                'warehouse_ref' => $parts[1] ?? '',
                'lot_ref' => $parts[2] ?? '',
                'serial_ref' => $parts[3] ?? '',
                'ledger_qty' => $this->roundQty($ledgerQty),
                'projection_qty' => $this->roundQty($projectionQty),
                'delta_qty' => $delta,
                'severity_code' => abs($delta) > 0.01 ? 'major' : 'minor',
                'resolution_state' => 'open',
            ];
        }

        $state = $discrepancies === [] ? 'passed' : 'blocked_close';

        return [
            'allowed' => $discrepancies === [],
            'status' => $state,
            'reason_code' => $discrepancies === [] ? 'inventory_reconciliation_passed' : 'inventory_reconciliation_blocks_period_close',
            'mismatch_count' => count($discrepancies),
            'blocks_period_close' => $discrepancies !== [],
            'ledger_hash_sha256' => $this->hashPayload($ledger),
            'projection_hash_sha256' => $this->hashPayload($projection),
            'discrepancies' => $discrepancies,
        ];
    }

    /**
     * @param array<string, mixed> $reconciliationRun
     * @return array<string, mixed>
     */
    public function evaluatePeriodCloseGate(array $reconciliationRun): array
    {
        $state = strtolower($this->text($reconciliationRun['run_state'] ?? $reconciliationRun['status'] ?? ''));
        $mismatchCount = (int)($reconciliationRun['mismatch_count'] ?? 0);
        $periodCode = $this->text($reconciliationRun['period_code'] ?? '');
        if (!in_array($state, ['passed', 'ready'], true) || $mismatchCount > 0) {
            return $this->blocked('inventory_reconciliation_blocks_period_close', 'Inventory period close requires a passed ledger/projection reconciliation.', [
                'period_code' => $periodCode,
                'run_state' => $state,
                'mismatch_count' => $mismatchCount,
            ]);
        }

        return $this->allowed('inventory_period_close_gate_ready', 'Inventory reconciliation allows period-close gate to proceed.', [
            'period_code' => $periodCode,
            'gate_state' => 'ready',
        ]);
    }

    /**
     * @param array<string, mixed> $criteria
     * @param array<int, array<string, mixed>> $genealogyEdges
     * @param array<int, array<string, mixed>> $shipments
     * @return array<string, mixed>
     */
    public function traceRecall(array $criteria, array $genealogyEdges, array $shipments = []): array
    {
        $startRefs = $this->recallStartRefs($criteria);
        if ($startRefs === []) {
            return $this->blocked('recall_trace_key_required', 'Recall trace requires supplier heat, lot, serial, shipment, or customer key.');
        }

        [$forward, $backward] = $this->traverseGenealogy($startRefs, $genealogyEdges);
        $shipmentRefs = [];
        $customerRefs = [];
        foreach ($shipments as $shipment) {
            if (!is_array($shipment)) {
                continue;
            }
            $shipmentRef = $this->text($shipment['shipment_ref'] ?? $shipment['shipment_id'] ?? $shipment['shipment_number'] ?? '');
            $customerRef = $this->text($shipment['customer_ref'] ?? $shipment['customer_id'] ?? $shipment['customer_number'] ?? '');
            $lotRefs = $this->list($shipment['lot_refs'] ?? $shipment['lots'] ?? $shipment['lot_numbers'] ?? []);
            $serialRefs = $this->list($shipment['serial_refs'] ?? $shipment['serials'] ?? $shipment['serial_numbers'] ?? []);
            $matched = array_intersect(array_merge($lotRefs, $serialRefs, [$shipmentRef]), $this->traceRefs($forward));
            if ($matched === []) {
                continue;
            }
            if ($shipmentRef !== '') {
                $shipmentRefs[] = $shipmentRef;
            }
            if ($customerRef !== '') {
                $customerRefs[] = $customerRef;
            }
            $forward[] = [
                'edge_type' => 'ship',
                'from_type' => 'lot_or_serial',
                'from_ref' => reset($matched),
                'to_type' => 'shipment',
                'to_ref' => $shipmentRef,
                'customer_ref' => $customerRef,
            ];
        }

        $shipmentRefs = array_values(array_unique($shipmentRefs));
        $customerRefs = array_values(array_unique($customerRefs));
        sort($shipmentRefs);
        sort($customerRefs);

        $evidence = [
            'search_criteria' => $criteria,
            'backward_trace' => $backward,
            'forward_trace' => $forward,
            'shipment_refs' => $shipmentRefs,
            'customer_refs' => $customerRefs,
        ];

        return [
            'allowed' => true,
            'status' => 'generated',
            'reason_code' => 'recall_trace_evidence_generated',
            'backward_trace' => $backward,
            'forward_trace' => $forward,
            'shipment_refs' => $shipmentRefs,
            'customer_refs' => $customerRefs,
            'evidence_export' => [
                'recall_scope_hash_sha256' => $this->hashPayload($criteria),
                'evidence_package_hash_sha256' => $this->hashPayload($evidence),
                'export_state' => 'generated',
                'requires_quality_review' => true,
            ],
        ];
    }

    /**
     * @param array<string, mixed> $command
     * @return array<string, mixed>
     */
    private function normalizedIssueRequest(array $command): array
    {
        return [
            'command_name' => $this->text($command['command_name'] ?? 'IssueMaterialToWorkOrder'),
            'work_order_ref' => $this->text($command['work_order_ref'] ?? $command['work_order_id'] ?? $command['wo_number'] ?? ''),
            'item_ref' => $this->text($command['item_ref'] ?? $command['item_id'] ?? $command['part_number'] ?? ''),
            'lot_ref' => $this->text($command['lot_ref'] ?? $command['lot_id'] ?? $command['lot_number'] ?? ''),
            'serial_ref' => $this->text($command['serial_ref'] ?? $command['serial_id'] ?? $command['serial_number'] ?? ''),
            'qty' => $this->roundQty($this->number($command['qty'] ?? $command['quantity'] ?? 0.0)),
            'uom' => $this->text($command['uom'] ?? ''),
            'from_location' => $this->text($command['from_location'] ?? $command['location_ref'] ?? $command['location_id'] ?? ''),
            'period_code' => $this->text($command['period_code'] ?? ''),
        ];
    }

    /**
     * @param array<int, array<string, mixed>> $existingPackets
     * @return array<string, mixed>
     */
    private function evaluateIdempotencyReplay(string $scopeKey, string $idempotencyKey, string $requestHash, array $existingPackets): array
    {
        $scopeHash = hash('sha256', $scopeKey);
        foreach ($existingPackets as $packet) {
            if (!is_array($packet)) {
                continue;
            }
            $sameKey = $this->text($packet['idempotency_key'] ?? '') === $idempotencyKey;
            $sameScope = $this->text($packet['scope_key_hash'] ?? '') === $scopeHash
                || $this->text($packet['scope_key'] ?? '') === $scopeKey
                || $this->text($packet['scope'] ?? '') === $scopeKey;
            if (!$sameKey || !$sameScope) {
                continue;
            }

            $packetHash = $this->text($packet['request_hash_sha256'] ?? $packet['fingerprint_hash'] ?? '');
            if ($packetHash !== '' && $packetHash !== $requestHash) {
                return $this->blocked('inventory_idempotency_conflict', 'Same idempotency key was used with a different inventory request.', [
                    'scope_key_hash' => $scopeHash,
                    'idempotency_key' => $idempotencyKey,
                ]);
            }

            $state = strtolower($this->text($packet['command_state'] ?? $packet['status'] ?? 'posted'));
            if ($state === 'in_progress') {
                return $this->blocked('inventory_idempotency_in_progress', 'Inventory command is already in progress and cannot be claimed by another scan.', [
                    'scope_key_hash' => $scopeHash,
                    'idempotency_key' => $idempotencyKey,
                ]);
            }

            return [
                'allowed' => true,
                'status' => 'replayed',
                'reason_code' => 'inventory_issue_idempotent_replay',
                'message' => 'Duplicate scan replayed the original inventory command packet without a second issue.',
                'command_packet' => $packet,
            ];
        }

        return $this->allowed('inventory_idempotency_new_claim', 'No existing inventory command packet conflicts with this issue.', [
            'scope_key_hash' => $scopeHash,
            'idempotency_key' => $idempotencyKey,
        ]);
    }

    /**
     * @param array<string, mixed> $command
     * @param array<int, array<string, mixed>> $availableLots
     * @return array<string, mixed>
     */
    private function evaluateFefo(array $command, array $availableLots, DateTimeImmutable $asOf): array
    {
        if ((bool)($command['fefo_required'] ?? true) === false) {
            return $this->allowed('fefo_not_required', 'FEFO gate is not required for this command.');
        }

        $selectedLotRef = $this->text($command['lot_ref'] ?? $command['lot_id'] ?? $command['lot_number'] ?? '');
        if ($selectedLotRef === '') {
            return $this->blocked('lot_required_for_fefo_issue', 'FEFO issue requires a selected lot.');
        }

        $eligible = [];
        $selected = null;
        foreach ($availableLots as $lot) {
            if (!is_array($lot)) {
                continue;
            }
            $lotRef = $this->lotRef($lot);
            if ($lotRef === '') {
                continue;
            }
            $status = strtolower($this->text($lot['status'] ?? $lot['lot_status'] ?? $lot['conformance_status'] ?? 'available'));
            $expiry = $this->text($lot['expiry_date'] ?? $lot['expiration_date'] ?? '');
            if ($lotRef === $selectedLotRef) {
                $selected = $lot;
            }
            if (in_array($status, self::BLOCKING_LOT_STATUSES, true)) {
                continue;
            }
            if ($expiry !== '' && $this->dateIsBefore($expiry, $asOf)) {
                continue;
            }
            if ($this->number($lot['available_qty'] ?? $lot['qty_available'] ?? $lot['on_hand_qty'] ?? 1.0) <= 0.0) {
                continue;
            }
            $eligible[] = $lot + ['_lot_ref' => $lotRef, '_expiry' => $expiry];
        }

        if (!is_array($selected)) {
            return $this->blocked('selected_lot_not_available', 'Selected issue lot is not present in available lots.', [
                'lot_ref' => $selectedLotRef,
            ]);
        }

        $selectedStatus = strtolower($this->text($selected['status'] ?? $selected['lot_status'] ?? $selected['conformance_status'] ?? 'available'));
        $selectedExpiry = $this->text($selected['expiry_date'] ?? $selected['expiration_date'] ?? '');
        if (in_array($selectedStatus, self::BLOCKING_LOT_STATUSES, true)
            || ($selectedExpiry !== '' && $this->dateIsBefore($selectedExpiry, $asOf))) {
            return $this->blocked('expired_lot_blocked', 'Expired or blocked lot cannot be issued.', [
                'lot_ref' => $selectedLotRef,
                'lot_status' => $selectedStatus,
                'expiry_date' => $selectedExpiry,
            ]);
        }

        usort($eligible, function (array $a, array $b): int {
            $aExpiry = $this->text($a['_expiry'] ?? '');
            $bExpiry = $this->text($b['_expiry'] ?? '');
            if ($aExpiry === $bExpiry) {
                return strcmp($this->text($a['_lot_ref'] ?? ''), $this->text($b['_lot_ref'] ?? ''));
            }
            if ($aExpiry === '') {
                return 1;
            }
            if ($bExpiry === '') {
                return -1;
            }
            return strcmp($aExpiry, $bExpiry);
        });

        $earliest = $eligible[0]['_lot_ref'] ?? $selectedLotRef;
        if ($earliest !== $selectedLotRef) {
            return $this->blocked('fefo_violation', 'Selected lot is not the earliest eligible expiration lot.', [
                'selected_lot_ref' => $selectedLotRef,
                'earliest_eligible_lot_ref' => $earliest,
            ]);
        }

        return $this->allowed('fefo_gate_ready', 'Selected lot satisfies FEFO.');
    }

    /**
     * @param array<string, mixed> $command
     * @param array<int, array<string, mixed>> $availableLots
     * @return array<string, mixed>
     */
    private function evaluateAvailableStock(array $command, array $availableLots): array
    {
        if ($availableLots === []) {
            return $this->allowed('stock_evidence_not_provided', 'Stock sufficiency evidence not provided in this slice.');
        }

        $selectedLotRef = $this->text($command['lot_ref'] ?? $command['lot_id'] ?? $command['lot_number'] ?? '');
        $qty = abs($this->number($command['qty'] ?? $command['quantity'] ?? 0.0));
        $available = 0.0;
        foreach ($availableLots as $lot) {
            if (!is_array($lot) || $this->lotRef($lot) !== $selectedLotRef) {
                continue;
            }
            $available += $this->number($lot['available_qty'] ?? $lot['qty_available'] ?? $lot['on_hand_qty'] ?? 0.0);
        }

        if ($qty > 0.0 && $available < $qty) {
            return $this->blocked('insufficient_available_stock', 'Selected lot does not have enough available stock for issue.', [
                'lot_ref' => $selectedLotRef,
                'requested_qty' => $qty,
                'available_qty' => $available,
            ]);
        }

        return $this->allowed('stock_sufficiency_ready', 'Selected lot has sufficient available stock.', [
            'lot_ref' => $selectedLotRef,
            'requested_qty' => $qty,
            'available_qty' => $available,
        ]);
    }

    /** @param array<string, mixed> $payload */
    private function evaluateOpenPeriod(array $payload): array
    {
        $state = strtolower($this->text($payload['period_state'] ?? 'open'));
        if ($state === 'closed' && !(bool)($payload['backdate_exception_approved'] ?? false)) {
            return $this->blocked('inventory_period_closed', 'Inventory/WIP/cost posting into a closed period requires approved exception.', [
                'period_code' => $this->text($payload['period_code'] ?? ''),
            ]);
        }

        return $this->allowed('inventory_period_open', 'Inventory posting period is open or has approved exception.', [
            'period_state' => $state === 'closed' ? 'exception_approved' : ($state ?: 'open'),
            'period_code' => $this->text($payload['period_code'] ?? ''),
        ]);
    }

    /** @param array<string, mixed> $command */
    private function scopeKey(array $command): string
    {
        $explicit = $this->text($command['scope_key'] ?? '');
        if ($explicit !== '') {
            return $explicit;
        }

        return implode('|', [
            $this->text($command['command_name'] ?? 'IssueMaterialToWorkOrder'),
            $this->text($command['work_order_ref'] ?? $command['work_order_id'] ?? $command['wo_number'] ?? ''),
            $this->text($command['item_ref'] ?? $command['item_id'] ?? $command['part_number'] ?? ''),
            $this->text($command['lot_ref'] ?? $command['lot_id'] ?? $command['lot_number'] ?? ''),
            $this->text($command['serial_ref'] ?? $command['serial_id'] ?? $command['serial_number'] ?? ''),
            $this->roundQty($this->number($command['qty'] ?? $command['quantity'] ?? 0.0)),
        ]);
    }

    /**
     * @param array<string, mixed> $command
     * @return array<string, mixed>
     */
    private function commandPacket(string $commandName, string $scopeKey, string $idempotencyKey, string $requestHash, string $state, array $command): array
    {
        $packet = [
            'command_name' => $commandName,
            'scope_key' => $scopeKey,
            'scope_key_hash' => hash('sha256', $scopeKey),
            'idempotency_key' => $idempotencyKey,
            'request_hash_sha256' => $requestHash,
            'command_state' => $state,
            'actor_ref' => $this->text($command['actor_ref'] ?? $command['actor_id'] ?? ''),
            'correlation_id' => $this->text($command['correlation_id'] ?? $command['command_correlation_id'] ?? ''),
            'payload' => $this->normalizedIssueRequest($command),
        ];
        $packet['result_hash_sha256'] = $this->hashPayload($packet);

        return $packet;
    }

    /**
     * @param array<string, mixed> $source
     * @param array<string, mixed> $override
     * @return array<string, mixed>
     */
    private function postingPacket(string $postingKind, array $source, array $override = []): array
    {
        $packet = [
            'posting_kind' => $postingKind,
            'source_aggregate_type' => $this->text($override['source_aggregate_type'] ?? $source['source_aggregate_type'] ?? 'inventory_command'),
            'source_aggregate_ref' => $this->text($override['source_aggregate_ref'] ?? $source['source_aggregate_ref'] ?? $source['work_order_ref'] ?? $source['work_order_id'] ?? $source['receipt_id'] ?? ''),
            'item_ref' => $this->text($source['item_ref'] ?? $source['item_id'] ?? $source['part_number'] ?? ''),
            'item_revision_ref' => $this->text($source['item_revision_ref'] ?? $source['revision'] ?? ''),
            'warehouse_ref' => $this->text($source['warehouse_ref'] ?? $source['warehouse_id'] ?? ''),
            'location_ref' => $this->text($source['location_ref'] ?? $source['location_id'] ?? $source['from_location'] ?? ''),
            'lot_ref' => $this->text($source['lot_ref'] ?? $source['lot_id'] ?? $source['lot_number'] ?? ''),
            'serial_ref' => $this->text($source['serial_ref'] ?? $source['serial_id'] ?? $source['serial_number'] ?? ''),
            'container_ref' => $this->text($source['container_ref'] ?? $source['container_id'] ?? ''),
            'qty_delta' => $this->roundQty($this->number($override['qty_delta'] ?? $source['qty_delta'] ?? $source['qty'] ?? $source['quantity'] ?? 0.0)),
            'source_uom' => $this->text($source['uom'] ?? $source['source_uom'] ?? ''),
            'normalized_qty_delta' => $this->roundQty($this->number($source['normalized_qty'] ?? $override['qty_delta'] ?? $source['qty'] ?? $source['quantity'] ?? 0.0)),
            'normalized_uom' => $this->text($source['normalized_uom'] ?? $source['uom'] ?? ''),
            'unit_cost_amount' => $this->roundAmount($this->number($source['unit_cost_amount'] ?? $source['unit_cost'] ?? 0.0)),
            'cost_amount' => $this->roundAmount($this->number($override['cost_amount'] ?? $source['cost_amount'] ?? 0.0)),
            'currency_code' => $this->text($source['currency_code'] ?? 'VND') ?: 'VND',
            'period_code' => $this->text($source['period_code'] ?? ''),
            'period_state' => $this->text($override['period_state'] ?? 'open') ?: 'open',
            'posting_state' => $this->text($override['posting_state'] ?? 'planned') ?: 'planned',
            'metadata' => is_array($source['metadata'] ?? null) ? (array)$source['metadata'] : [],
        ];
        $packet['posting_hash_sha256'] = $this->hashPayload($packet);

        return $packet;
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     * @param array<int, string> $quantityFields
     * @return array<string, float>
     */
    private function sumByInventoryKey(array $rows, array $quantityFields): array
    {
        $sum = [];
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $key = implode('|', [
                $this->text($row['item_ref'] ?? $row['item_id'] ?? $row['inventory_item_id'] ?? ''),
                $this->text($row['warehouse_ref'] ?? $row['warehouse_id'] ?? ''),
                $this->text($row['lot_ref'] ?? $row['lot_id'] ?? $row['lot_number'] ?? ''),
                $this->text($row['serial_ref'] ?? $row['serial_id'] ?? $row['serial_number'] ?? ''),
            ]);
            $qty = 0.0;
            foreach ($quantityFields as $field) {
                if (array_key_exists($field, $row)) {
                    $qty = $this->number($row[$field]);
                    break;
                }
            }
            $sum[$key] = ($sum[$key] ?? 0.0) + $qty;
        }
        ksort($sum);

        return array_map(fn(float $value): float => $this->roundQty($value), $sum);
    }

    /**
     * @param array<string, mixed> $criteria
     * @return array<int, string>
     */
    private function recallStartRefs(array $criteria): array
    {
        $refs = [];
        foreach (['supplier_heat', 'heat_number', 'lot_ref', 'lot_id', 'lot_number', 'serial_ref', 'serial_id', 'serial_number', 'shipment_ref', 'shipment_id'] as $key) {
            $value = $this->text($criteria[$key] ?? '');
            if ($value !== '') {
                $refs[] = $value;
            }
        }

        return array_values(array_unique($refs));
    }

    /**
     * @param array<int, string> $startRefs
     * @param array<int, array<string, mixed>> $edges
     * @return array{0: array<int, array<string, mixed>>, 1: array<int, array<string, mixed>>}
     */
    private function traverseGenealogy(array $startRefs, array $edges): array
    {
        $normalized = [];
        foreach ($edges as $edge) {
            if (!is_array($edge)) {
                continue;
            }
            $fromRef = $this->text($edge['from_ref'] ?? $edge['from_object_id'] ?? $edge['parent_lot_number'] ?? $edge['source_ref'] ?? '');
            $toRef = $this->text($edge['to_ref'] ?? $edge['to_object_id'] ?? $edge['child_lot_number'] ?? $edge['target_ref'] ?? '');
            if ($fromRef === '' || $toRef === '') {
                continue;
            }
            $normalized[] = [
                'edge_type' => $this->text($edge['edge_type'] ?? $edge['edge_fact_type'] ?? 'trace'),
                'from_type' => $this->text($edge['from_type'] ?? $edge['from_object_type'] ?? 'lot'),
                'from_ref' => $fromRef,
                'to_type' => $this->text($edge['to_type'] ?? $edge['to_object_type'] ?? 'lot'),
                'to_ref' => $toRef,
            ];
        }

        return [
            $this->walkEdges($startRefs, $normalized, 'forward'),
            $this->walkEdges($startRefs, $normalized, 'backward'),
        ];
    }

    /**
     * @param array<int, string> $startRefs
     * @param array<int, array<string, mixed>> $edges
     * @return array<int, array<string, mixed>>
     */
    private function walkEdges(array $startRefs, array $edges, string $direction): array
    {
        $seenRefs = array_fill_keys($startRefs, true);
        $frontier = $startRefs;
        $result = [];
        for ($depth = 0; $depth < 50 && $frontier !== []; $depth++) {
            $next = [];
            foreach ($edges as $edge) {
                $from = $this->text($edge['from_ref'] ?? '');
                $to = $this->text($edge['to_ref'] ?? '');
                $match = $direction === 'forward' ? in_array($from, $frontier, true) : in_array($to, $frontier, true);
                if (!$match) {
                    continue;
                }
                $target = $direction === 'forward' ? $to : $from;
                if (isset($seenRefs[$target])) {
                    continue;
                }
                $seenRefs[$target] = true;
                $next[] = $target;
                $result[] = $edge + ['trace_direction' => $direction, 'trace_depth' => $depth + 1];
            }
            $frontier = $next;
        }

        return $result;
    }

    /** @param array<int, array<string, mixed>> $trace */
    private function traceRefs(array $trace): array
    {
        $refs = [];
        foreach ($trace as $edge) {
            $refs[] = $this->text($edge['from_ref'] ?? '');
            $refs[] = $this->text($edge['to_ref'] ?? '');
        }

        return array_values(array_unique(array_filter($refs, static fn(string $ref): bool => $ref !== '')));
    }

    /** @param array<string, mixed> $lot */
    private function lotRef(array $lot): string
    {
        return $this->text($lot['lot_ref'] ?? $lot['lot_id'] ?? $lot['lot_number'] ?? $lot['lot_no'] ?? '');
    }

    private function qualityAuthority(): CanonicalQualityCaseAuthorityService
    {
        return $this->qualityCaseAuthority ?? new CanonicalQualityCaseAuthorityService();
    }

    /** @param mixed $value */
    private function text(mixed $value): string
    {
        return trim((string)$value);
    }

    /** @param mixed $value */
    private function number(mixed $value): float
    {
        return is_numeric($value) ? (float)$value : 0.0;
    }

    /** @param mixed $value @return array<int, string> */
    private function list(mixed $value): array
    {
        if (!is_array($value)) {
            $value = $value === null || $value === '' ? [] : [$value];
        }
        $list = [];
        foreach ($value as $item) {
            $text = $this->text($item);
            if ($text !== '') {
                $list[] = $text;
            }
        }

        return array_values(array_unique($list));
    }

    private function dateIsBefore(string $date, DateTimeImmutable $asOf): bool
    {
        try {
            $parsed = new DateTimeImmutable($date, new DateTimeZone('UTC'));
        } catch (\Throwable) {
            return false;
        }

        return $parsed < $asOf;
    }

    private function roundQty(float $value): float
    {
        return round($value, 6);
    }

    private function roundAmount(float $value): float
    {
        return round($value, 6);
    }

    /** @param array<string, mixed> $payload */
    private function hashPayload(array $payload): string
    {
        $payload = $this->sortRecursively($payload);

        return hash('sha256', json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
    }

    /** @param array<string, mixed> $value @return array<string, mixed> */
    private function sortRecursively(array $value): array
    {
        ksort($value);
        foreach ($value as $key => $item) {
            if (is_array($item)) {
                $value[$key] = $this->sortRecursively($item);
            }
        }

        return $value;
    }

    /** @param array<string, mixed> $context */
    private function allowed(string $reasonCode, string $message, array $context = []): array
    {
        return [
            'allowed' => true,
            'status' => 'passed',
            'reason_code' => $reasonCode,
            'message' => $message,
            'context' => $context,
        ];
    }

    /** @param array<string, mixed> $context */
    private function blocked(string $reasonCode, string $message, array $context = []): array
    {
        return [
            'allowed' => false,
            'status' => 'blocked',
            'reason_code' => $reasonCode,
            'message' => $message,
            'context' => $context,
        ];
    }
}

if (!class_exists('MOM\\Api\\Services\\InventoryLedgerAuthorityService', false)) {
    class_alias(InventoryLedgerAuthorityService::class, 'MOM\\Api\\Services\\InventoryLedgerAuthorityService');
}
