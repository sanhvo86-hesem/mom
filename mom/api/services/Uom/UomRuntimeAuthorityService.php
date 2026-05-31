<?php

declare(strict_types=1);

namespace MOM\Api\Services\Uom;

use MOM\Database\Connection;

/**
 * First-class runtime authority surface for governed UOM command quantities.
 *
 * Domain command handlers call this service before mutating inventory, MES,
 * quality, shipment, or cost truth. The implementation delegates conversion,
 * alias resolution, item policy, rounding, and measurement evidence to the
 * existing UOM subsystem instead of maintaining an MDA-side bridge authority.
 */
final class UomRuntimeAuthorityService
{
    public const AUTHORITY = 'uom_runtime_authority';

    private readonly ItemUomPolicyService $itemPolicy;
    private readonly UomAliasResolutionService $aliasResolver;
    private readonly ConversionEngine $conversionEngine;

    /**
     * @var array<string,array{
     *   slot:?string,
     *   item_required:bool,
     *   magnitude_fields:list<string>,
     *   unit_fields:list<string>,
     *   target_unit_fields:list<string>,
     *   context_code:string
     * }>
     */
    private const COMMAND_POLICIES = [
        'ReceiveInventoryCommand' => [
            'slot' => 'inventory',
            'item_required' => true,
            'magnitude_fields' => ['received_quantity', 'quantity', 'qty'],
            'unit_fields' => ['supplier_uom', 'purchase_uom', 'uom', 'unit_code'],
            'target_unit_fields' => [],
            'context_code' => 'RECEIPT',
        ],
        'PutawayInventoryCommand' => [
            'slot' => 'inventory',
            'item_required' => true,
            'magnitude_fields' => ['putaway_quantity', 'quantity', 'qty'],
            'unit_fields' => ['container_uom', 'uom', 'unit_code'],
            'target_unit_fields' => [],
            'context_code' => 'PUTAWAY',
        ],
        'MoveInventoryCommand' => [
            'slot' => 'inventory',
            'item_required' => true,
            'magnitude_fields' => ['move_quantity', 'quantity', 'qty'],
            'unit_fields' => ['inventory_uom', 'uom', 'unit_code'],
            'target_unit_fields' => [],
            'context_code' => 'MOVE',
        ],
        'IssueMaterialToWorkOrderCommand' => [
            'slot' => 'inventory',
            'item_required' => true,
            'magnitude_fields' => ['issue_quantity', 'quantity', 'qty'],
            'unit_fields' => ['material_uom', 'uom', 'unit_code'],
            'target_unit_fields' => [],
            'context_code' => 'MATERIAL_ISSUE',
        ],
        'SplitLotCommand' => [
            'slot' => 'inventory',
            'item_required' => true,
            'magnitude_fields' => ['split_quantity', 'quantity', 'qty'],
            'unit_fields' => ['inventory_uom', 'uom', 'unit_code'],
            'target_unit_fields' => [],
            'context_code' => 'LOT_SPLIT',
        ],
        'MergeLotCommand' => [
            'slot' => 'inventory',
            'item_required' => true,
            'magnitude_fields' => ['merge_quantity', 'quantity', 'qty'],
            'unit_fields' => ['inventory_uom', 'uom', 'unit_code'],
            'target_unit_fields' => [],
            'context_code' => 'LOT_MERGE',
        ],
        'CompleteToStockCommand' => [
            'slot' => 'inventory',
            'item_required' => true,
            'magnitude_fields' => ['completed_quantity', 'quantity_good', 'quantity', 'qty'],
            'unit_fields' => ['operation_uom', 'inventory_uom', 'uom', 'unit_code'],
            'target_unit_fields' => [],
            'context_code' => 'COMPLETE_TO_STOCK',
        ],
        'ScrapInventoryCommand' => [
            'slot' => 'inventory',
            'item_required' => true,
            'magnitude_fields' => ['scrap_quantity', 'quantity', 'qty'],
            'unit_fields' => ['inventory_uom', 'uom', 'unit_code'],
            'target_unit_fields' => [],
            'context_code' => 'SCRAP',
        ],
        'ReworkInventoryCommand' => [
            'slot' => 'inventory',
            'item_required' => true,
            'magnitude_fields' => ['rework_quantity', 'quantity', 'qty'],
            'unit_fields' => ['inventory_uom', 'uom', 'unit_code'],
            'target_unit_fields' => [],
            'context_code' => 'REWORK',
        ],
        'AdjustInventoryWithApprovalCommand' => [
            'slot' => 'inventory',
            'item_required' => true,
            'magnitude_fields' => ['adjustment_quantity', 'quantity_delta', 'quantity', 'qty'],
            'unit_fields' => ['inventory_uom', 'uom', 'unit_code'],
            'target_unit_fields' => [],
            'context_code' => 'ADJUSTMENT',
        ],
        'PostInventoryLedgerTransactionCommand' => [
            'slot' => 'inventory',
            'item_required' => true,
            'magnitude_fields' => ['quantity_delta', 'quantity', 'qty'],
            'unit_fields' => ['inventory_uom', 'uom', 'unit_code'],
            'target_unit_fields' => [],
            'context_code' => 'LEDGER_POST',
        ],
        'CompleteOperationCommand' => [
            'slot' => 'inventory',
            'item_required' => true,
            'magnitude_fields' => ['completed_quantity', 'quantity_good', 'quantity', 'qty'],
            'unit_fields' => ['operation_uom', 'uom', 'unit_code'],
            'target_unit_fields' => [],
            'context_code' => 'OPERATION_COMPLETE',
        ],
        'RecordInspectionResultCommand' => [
            'slot' => 'qc',
            'item_required' => true,
            'magnitude_fields' => ['actual_value', 'measured_value', 'quantity', 'value'],
            'unit_fields' => ['measurement_unit', 'unit_of_measure', 'uom', 'unit_code'],
            'target_unit_fields' => [],
            'context_code' => 'QC',
        ],
        'CostRollupCommand' => [
            'slot' => 'inventory',
            'item_required' => true,
            'magnitude_fields' => ['cost_quantity', 'quantity', 'qty'],
            'unit_fields' => ['purchase_uom', 'cost_uom', 'uom', 'unit_code'],
            'target_unit_fields' => [],
            'context_code' => 'COST',
        ],
        'ShipmentPackCommand' => [
            'slot' => 'sales',
            'item_required' => true,
            'magnitude_fields' => ['ship_quantity', 'quantity', 'qty'],
            'unit_fields' => ['sales_uom', 'packaging_uom', 'uom', 'unit_code'],
            'target_unit_fields' => [],
            'context_code' => 'SHIPMENT',
        ],
        'ToolPresetMeasurementCommand' => [
            'slot' => null,
            'item_required' => false,
            'magnitude_fields' => ['offset_value', 'wear_value', 'measured_value', 'quantity', 'value'],
            'unit_fields' => ['measurement_unit', 'uom', 'unit_code'],
            'target_unit_fields' => ['target_unit', 'canonical_unit_code'],
            'context_code' => 'TOOL_PRESET',
        ],
    ];

    public function __construct(
        private readonly Connection $db,
        private readonly ?\Redis $redis = null,
        ?ItemUomPolicyService $itemPolicy = null,
        ?UomAliasResolutionService $aliasResolver = null,
        ?ConversionEngine $conversionEngine = null,
    ) {
        $this->itemPolicy = $itemPolicy ?? new ItemUomPolicyService($db, $redis);
        $this->aliasResolver = $aliasResolver ?? new UomAliasResolutionService($db, $redis);
        $this->conversionEngine = $conversionEngine ?? new ConversionEngine(
            new QuantityKindService($db),
            new ConversionRuleService($db, $redis),
            new MeasurementValueFactory()
        );
    }

    /**
     * @return array<string,array<string,mixed>>
     */
    public function commandPolicyMatrix(): array
    {
        return self::COMMAND_POLICIES;
    }

    /**
     * Normalize a governed command quantity through the UOM runtime authority.
     *
     * @param array<string,mixed> $payload
     * @param array<string,mixed> $context
     * @return array<string,mixed>
     */
    public function normalizeCommandQuantity(string $commandName, array $payload, array $context = []): array
    {
        $policy = self::COMMAND_POLICIES[$commandName] ?? null;
        if ($policy === null) {
            throw new UomException(
                'UOM_COMMAND_POLICY_NOT_REGISTERED',
                "Command '{$commandName}' has no UOM runtime authority policy.",
                409
            );
        }

        $magnitude = $this->firstString($payload, $policy['magnitude_fields']);
        $unit = $this->firstString($payload, $policy['unit_fields']);
        if ($magnitude === null || $unit === null) {
            throw new UomException(
                'UOM_COMMAND_MEASUREMENT_REQUIRED',
                "Command '{$commandName}' requires magnitude and unit before mutation.",
                422
            );
        }

        $commandContext = array_merge($context, [
            'domain_command' => $commandName,
            'context_code' => $policy['context_code'],
        ]);

        if (($policy['item_required'] ?? false) === true) {
            $itemId = $this->firstString($payload, ['item_id', 'part_number', 'material_id', 'sku']);
            if ($itemId === null) {
                throw new UomException(
                    'UOM_ITEM_POLICY_REQUIRED',
                    "Command '{$commandName}' requires item_id or equivalent item reference for UOM policy resolution.",
                    422
                );
            }

            return $this->normalizeItemQuantity(
                itemId: $itemId,
                slot: (string)$policy['slot'],
                magnitude: $magnitude,
                inputUnit: $unit,
                siteId: $this->firstString($payload, ['site_id', 'plant_id']),
                supplierId: $this->firstString($payload, ['supplier_id']),
                customerId: $this->firstString($payload, ['customer_id']),
                contextCode: $policy['context_code'],
                context: $commandContext
            );
        }

        $targetUnit = $this->firstString($payload, $policy['target_unit_fields']) ?? $unit;
        return $this->convertCanonical(
            magnitude: $magnitude,
            inputUnit: $unit,
            targetUnit: $targetUnit,
            context: $commandContext
        );
    }

    /**
     * @param array<string,mixed> $context
     * @return array<string,mixed>
     */
    public function normalizeItemQuantity(
        string $itemId,
        string $slot,
        string $magnitude,
        string $inputUnit,
        ?string $siteId = null,
        ?string $supplierId = null,
        ?string $customerId = null,
        string $contextCode = 'STANDARD',
        array $context = []
    ): array {
        $canonicalInput = $this->resolveCanonicalUnit(
            $inputUnit,
            (string)($context['uom_source_system'] ?? 'SYSTEM'),
            $supplierId,
            $context,
            isset($context['trace_id']) ? (string)$context['trace_id'] : null
        );

        $targetUnit = $this->itemPolicy->getSlotUnit(
            $itemId,
            $slot,
            $siteId,
            $supplierId,
            $customerId,
            $contextCode
        );

        if ($targetUnit === null || $targetUnit === '') {
            throw new UomException(
                'UOM_POLICY_NOT_FOUND',
                "No active UOM policy for item '{$itemId}' slot '{$slot}' context '{$contextCode}'.",
                409
            );
        }

        $converted = $this->conversionEngine->convert(
            $magnitude,
            $canonicalInput['canonical_unit_code'],
            $targetUnit,
            null,
            'ROUND_HALF_EVEN',
            array_merge($context, [
                'domain' => $context['domain'] ?? 'mda_command',
                'item_id' => $itemId,
                'uom_authority' => self::AUTHORITY,
            ])
        );

        return [
            'authority' => self::AUTHORITY,
            'status' => 'normalized',
            'item_id' => $itemId,
            'slot' => $slot,
            'context_code' => $contextCode,
            'input' => [
                'magnitude' => $magnitude,
                'unit_code' => $canonicalInput['canonical_unit_code'],
                'raw_unit' => $inputUnit,
            ],
            'target' => [
                'unit_code' => $targetUnit,
                'source' => 'item_uom_policy',
            ],
            'conversion' => $converted,
            'alias_resolution' => $canonicalInput,
        ];
    }

    /**
     * @param array<string,mixed> $context
     * @return array<string,mixed>
     */
    public function convertCanonical(
        string $magnitude,
        string $inputUnit,
        string $targetUnit,
        array $context = []
    ): array {
        $canonicalInput = $this->resolveCanonicalUnit(
            $inputUnit,
            (string)($context['uom_source_system'] ?? 'SYSTEM'),
            isset($context['supplier_id']) ? (string)$context['supplier_id'] : null,
            $context,
            isset($context['trace_id']) ? (string)$context['trace_id'] : null
        );
        $canonicalTarget = $this->resolveCanonicalUnit(
            $targetUnit,
            (string)($context['target_uom_source_system'] ?? 'SYSTEM'),
            isset($context['supplier_id']) ? (string)$context['supplier_id'] : null,
            $context,
            isset($context['trace_id']) ? (string)$context['trace_id'] : null
        );

        $converted = $this->conversionEngine->convert(
            $magnitude,
            $canonicalInput['canonical_unit_code'],
            $canonicalTarget['canonical_unit_code'],
            null,
            'ROUND_HALF_EVEN',
            array_merge($context, [
                'domain' => $context['domain'] ?? 'mda_command',
                'uom_authority' => self::AUTHORITY,
            ])
        );

        return [
            'authority' => self::AUTHORITY,
            'status' => 'normalized',
            'input' => [
                'magnitude' => $magnitude,
                'unit_code' => $canonicalInput['canonical_unit_code'],
                'raw_unit' => $inputUnit,
            ],
            'target' => [
                'unit_code' => $canonicalTarget['canonical_unit_code'],
                'raw_unit' => $targetUnit,
            ],
            'conversion' => $converted,
            'alias_resolution' => [
                'input' => $canonicalInput,
                'target' => $canonicalTarget,
            ],
        ];
    }

    /**
     * @param array<string,mixed> $sourcePayload
     * @return array{status:string,canonical_unit_code:string,source_system:string,trace_id:?string,raw:array<string,mixed>}
     */
    public function resolveCanonicalUnit(
        string $unit,
        string $sourceSystem = 'SYSTEM',
        ?string $supplierId = null,
        array $sourcePayload = [],
        ?string $traceId = null
    ): array {
        if (method_exists($this->aliasResolver, 'resolveDetailed')) {
            /** @var array<string,mixed> $result */
            $result = $this->aliasResolver->resolveDetailed($unit, $sourceSystem, $supplierId, $sourcePayload, $traceId);
            if (($result['status'] ?? null) !== 'resolved' || empty($result['canonical_unit_code'])) {
                throw new UomException(
                    'UOM_ALIAS_NOT_RESOLVED',
                    "Unit '{$unit}' from '{$sourceSystem}' did not resolve to a canonical UOM.",
                    422
                );
            }

            return [
                'status' => 'resolved',
                'canonical_unit_code' => (string)$result['canonical_unit_code'],
                'source_system' => (string)($result['source_system'] ?? $sourceSystem),
                'trace_id' => isset($result['trace_id']) ? (string)$result['trace_id'] : $traceId,
                'raw' => $result,
            ];
        }

        $canonical = $this->aliasResolver->resolve($unit, $sourceSystem, $supplierId);
        return [
            'status' => 'resolved',
            'canonical_unit_code' => $canonical,
            'source_system' => $sourceSystem,
            'trace_id' => $traceId,
            'raw' => [
                'legacy_resolver' => true,
                'input_alias' => $unit,
                'canonical_unit_code' => $canonical,
            ],
        ];
    }

    /**
     * @param array<string,mixed> $payload
     * @param list<string> $fields
     */
    private function firstString(array $payload, array $fields): ?string
    {
        foreach ($fields as $field) {
            if (!array_key_exists($field, $payload)) {
                continue;
            }
            $value = trim((string)$payload[$field]);
            if ($value !== '') {
                return $value;
            }
        }
        return null;
    }
}
