<?php

declare(strict_types=1);

namespace MOM\Api\Services\Uom;

final class PackagingContextualConverter
{
    private const BCMATH_SCALE = 30;

    public function __construct(
        private readonly ItemUomPolicyService $policyService
    ) {}

    /**
     * @return array<string,mixed>
     */
    public function convert(
        string $magnitude,
        string $fromUnitCode,
        string $toUnitCode,
        array $context,
        string $policy = 'ROUND_HALF_EVEN',
        int $precision = 6
    ): array {
        foreach (['item_id', 'packaging_level'] as $field) {
            if (empty($context[$field])) {
                throw new UomException('UOM_MISSING_PACKAGING_POLICY', "Packaging context missing {$field}.", 422);
            }
        }
        $asOf = isset($context['effective_date']) && (string)$context['effective_date'] !== ''
            ? new \DateTimeImmutable((string)$context['effective_date'])
            : null;
        $row = $this->policyService->resolvePackaging(
            (string)$context['item_id'],
            isset($context['site_id']) ? (string)$context['site_id'] : null,
            isset($context['supplier_id']) ? (string)$context['supplier_id'] : null,
            isset($context['customer_id']) ? (string)$context['customer_id'] : null,
            $asOf
        );
        if ($row === null) {
            throw new UomException('UOM_MISSING_PACKAGING_POLICY', 'No active packaging policy found for context.', 422);
        }

        $level = (string)$context['packaging_level'];
        $qtyKey = match ($level) {
            'inner' => 'inner_pack_qty',
            'outer', 'box' => 'outer_pack_qty',
            'pallet' => 'pallet_qty',
            default => throw new UomException('UOM_MISSING_PACKAGING_POLICY', "Unknown packaging level '{$level}'.", 422),
        };
        $count = isset($row[$qtyKey]) ? DecimalString::parse((string)$row[$qtyKey]) : '';
        if ($count === '' || bccomp($count, '0', self::BCMATH_SCALE) <= 0) {
            throw new UomException('UOM_MISSING_PACKAGING_POLICY', "Packaging policy missing {$qtyKey}.", 422);
        }

        $fromEach = in_array($fromUnitCode, ['EA', 'each', 'pcs'], true);
        $toEach = in_array($toUnitCode, ['EA', 'each', 'pcs'], true);
        $fromPack = in_array($fromUnitCode, ['BOX', 'CASE', 'PALLET'], true);
        $toPack = in_array($toUnitCode, ['BOX', 'CASE', 'PALLET'], true);
        if ($fromPack && $toEach) {
            $raw = bcmul($magnitude, $count, self::BCMATH_SCALE);
        } elseif ($fromEach && $toPack) {
            $raw = bcdiv($magnitude, $count, self::BCMATH_SCALE);
        } else {
            throw new UomException('UOM_ROUTE_NOT_IMPLEMENTED', 'Packaging route supports pack to each or each to pack only.', 501);
        }

        return [
            'result' => BcMathRounder::round($raw, $precision, $policy),
            'item_id' => (string)$row['item_id'],
            'policy_id' => (string)$row['id'],
            'packaging_level' => $level,
            'count_per_parent' => $count,
            'effective_from' => (string)($row['effective_from'] ?? ''),
            'effective_to' => isset($row['effective_to']) ? (string)$row['effective_to'] : null,
        ];
    }
}
