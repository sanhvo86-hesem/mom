<?php

declare(strict_types=1);

namespace MOM\Api\Services\Uom;

/**
 * Exact linear conversion: result = magnitude × factor.
 *
 * Handles all non-affine unit conversions (mass, length, volume, pressure,
 * energy, etc.). Both forward and reverse (bidirectional) are supported:
 *   reverse: magnitude = result / factor
 *
 * All arithmetic uses BCMath at BCMATH_SCALE precision to avoid IEEE 754
 * float drift. See DEC-011 (BCMath chosen over float/GMP).
 */
final class ExactLinearConverter
{
    public const BCMATH_SCALE = 30;

    /**
     * Convert forward: result = magnitude × factor.
     *
     * @param string $magnitude  Input value (numeric string, validated by caller)
     * @param string $factor     Conversion factor (numeric string from uom_conversion_rule)
     * @param string $policy     Rounding policy code (from uom_rounding_policy)
     * @param int    $precision  Output decimal places (null = full BCMath scale)
     */
    public function convert(
        string $magnitude,
        string $factor,
        string $policy = 'ROUND_HALF_EVEN',
        int $precision = 12
    ): string {
        $raw = bcmul($magnitude, $factor, self::BCMATH_SCALE);
        return BcMathRounder::round($raw, $precision, $policy);
    }

    /**
     * Convert reverse (bidirectional): result = magnitude / factor.
     */
    public function convertReverse(
        string $magnitude,
        string $factor,
        string $policy = 'ROUND_HALF_EVEN',
        int $precision = 12
    ): string {
        if (bccomp($factor, '0', self::BCMATH_SCALE) === 0) {
            throw new \DivisionByZeroError('Conversion factor is zero; cannot compute reverse.');
        }
        $raw = bcdiv($magnitude, $factor, self::BCMATH_SCALE);
        return BcMathRounder::round($raw, $precision, $policy);
    }

    /**
     * Compute a multi-hop conversion via SI base:
     *   result = magnitude × from_si_factor / to_si_factor
     *
     * Used when no direct rule exists but both units have si_factor in catalog.
     * ONLY valid for non-affine (is_affine=false) units.
     */
    public function convertViaSiBase(
        string $magnitude,
        string $fromSiFactor,
        string $toSiFactor,
        string $policy = 'ROUND_HALF_EVEN',
        int $precision = 12
    ): string {
        if (bccomp($toSiFactor, '0', self::BCMATH_SCALE) === 0) {
            throw new \DivisionByZeroError('Target SI factor is zero; cannot convert via SI base.');
        }
        $inSi = bcmul($magnitude, $fromSiFactor, self::BCMATH_SCALE);
        $raw  = bcdiv($inSi, $toSiFactor, self::BCMATH_SCALE);
        return BcMathRounder::round($raw, $precision, $policy);
    }
}
