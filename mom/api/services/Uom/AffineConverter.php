<?php

declare(strict_types=1);

namespace MOM\Api\Services\Uom;

/**
 * Affine conversion for units with both offset and factor (e.g. temperature).
 *
 * Forward formula:  result = (magnitude + offset) × factor
 * Reverse formula:  magnitude = result / factor − offset
 *
 * The seeded rules use the convention where offset is applied BEFORE the
 * factor multiply. Examples from uom_seeds:
 *
 *   °C → K:   factor=1, offset=273.15  →  K = (°C + 273.15) × 1
 *   °F → °C:  factor=5/9, offset=-32   →  °C = (°F + (−32)) × (5/9)
 *              = (°F − 32) × 5/9
 *
 * Reverse of °F→°C (i.e. °C→°F):
 *   °F = °C / (5/9) − (−32) = °C × 9/5 + 32
 *
 * ⚠ TC-N003 danger: naive factor-only gives 98.6 × 5/9 = 54.8°C (WRONG).
 *   This converter ALWAYS applies the offset before multiplying.
 */
final class AffineConverter
{
    private const BCMATH_SCALE = 30;

    /**
     * Convert forward: result = (magnitude + offset) × factor.
     *
     * @param string $magnitude Input value
     * @param string $factor    Conversion factor (from uom_conversion_rule.factor)
     * @param string $offset    Offset (from uom_conversion_rule.offset_value)
     * @param string $policy    Rounding policy code
     * @param int    $precision Output decimal places
     */
    public function convert(
        string $magnitude,
        string $factor,
        string $offset,
        string $policy = 'ROUND_HALF_EVEN',
        int $precision = 6
    ): string {
        $shifted = bcadd($magnitude, $offset, self::BCMATH_SCALE);
        $raw     = bcmul($shifted, $factor, self::BCMATH_SCALE);
        return BcMathRounder::round($raw, $precision, $policy);
    }

    /**
     * Convert reverse: magnitude = result / factor − offset.
     *
     * Used when the stored rule is (from=A, to=B, bidirectional=true)
     * but the request is for B→A.
     *
     * @param string $result   The value in the "to" unit (now the input)
     * @param string $factor   Rule factor
     * @param string $offset   Rule offset
     */
    public function convertReverse(
        string $result,
        string $factor,
        string $offset,
        string $policy = 'ROUND_HALF_EVEN',
        int $precision = 6
    ): string {
        if (bccomp($factor, '0', self::BCMATH_SCALE) === 0) {
            throw new \DivisionByZeroError('Affine factor is zero; cannot compute reverse.');
        }
        $divided = bcdiv($result, $factor, self::BCMATH_SCALE);
        $raw     = bcsub($divided, $offset, self::BCMATH_SCALE);
        return BcMathRounder::round($raw, $precision, $policy);
    }
}
