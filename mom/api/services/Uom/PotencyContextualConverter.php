<?php

declare(strict_types=1);

namespace MOM\Api\Services\Uom;

final class PotencyContextualConverter
{
    private const BCMATH_SCALE = 30;

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
        $this->assertContext($context);
        $potencyValue = DecimalString::parse((string)$context['potency_value']);
        if (bccomp($potencyValue, '0', self::BCMATH_SCALE) <= 0) {
            throw new UomException('UOM_MISSING_ASSAY_EVIDENCE', 'Potency value must be greater than zero.', 422);
        }

        $potencyUnit = (string)$context['potency_unit'];
        if ($potencyUnit !== 'IU_per_mg') {
            throw new UomException('UOM_ROUTE_NOT_IMPLEMENTED', "Potency unit '{$potencyUnit}' is not implemented.", 501);
        }

        if ($fromUnitCode === 'IU' && in_array($toUnitCode, ['mg', 'g', 'kg'], true)) {
            $mg = bcdiv($magnitude, $potencyValue, self::BCMATH_SCALE);
            $result = match ($toUnitCode) {
                'mg' => $mg,
                'g' => bcdiv($mg, '1000', self::BCMATH_SCALE),
                'kg' => bcdiv($mg, '1000000', self::BCMATH_SCALE),
            };
        } elseif (in_array($fromUnitCode, ['mg', 'g', 'kg'], true) && $toUnitCode === 'IU') {
            $mg = match ($fromUnitCode) {
                'mg' => $magnitude,
                'g' => bcmul($magnitude, '1000', self::BCMATH_SCALE),
                'kg' => bcmul($magnitude, '1000000', self::BCMATH_SCALE),
            };
            $result = bcmul($mg, $potencyValue, self::BCMATH_SCALE);
        } else {
            throw new UomException('UOM_ROUTE_NOT_IMPLEMENTED', 'Potency route supports IU to mass or mass to IU only.', 501);
        }

        return [
            'result' => BcMathRounder::round($result, $precision, $policy),
            'potency_value' => $potencyValue,
            'potency_unit' => $potencyUnit,
            'assay_method' => (string)$context['assay_method'],
            'substance' => (string)$context['substance'],
            'lot_id' => (string)$context['lot_id'],
            'certificate_ref' => (string)$context['certificate_ref'],
            'expiry_date' => (string)$context['expiry_date'],
            'approved_by' => (string)$context['approved_by'],
        ];
    }

    private function assertContext(array $context): void
    {
        foreach (['substance', 'assay_method', 'potency_value', 'potency_unit', 'lot_id', 'certificate_ref', 'expiry_date', 'approved_by'] as $field) {
            if (empty($context[$field])) {
                throw new UomException('UOM_MISSING_ASSAY_EVIDENCE', "Potency context missing {$field}.", 422);
            }
        }
        $expiry = new \DateTimeImmutable((string)$context['expiry_date']);
        $asOf = isset($context['effective_date']) && (string)$context['effective_date'] !== ''
            ? new \DateTimeImmutable((string)$context['effective_date'])
            : new \DateTimeImmutable('today');
        if ($expiry < $asOf) {
            throw new UomException('UOM_MISSING_ASSAY_EVIDENCE', 'Potency assay evidence is expired.', 422);
        }
    }
}
