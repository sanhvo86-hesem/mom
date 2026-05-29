<?php

declare(strict_types=1);

namespace MOM\Api\Services\Uom;

/**
 * HESEM Measurement Intelligence — ConversionEngine
 *
 * Central orchestrator for unit-of-measure conversions. Performs:
 *
 *   1. Input validation & injection guard (TC-N012)
 *   2. Magnitude overflow check (TC-N011)
 *   3. Currency code block (TC-N005, DEC-005)
 *   4. Unit catalog lookup (lifecycle=active)
 *   5. Quantity kind compatibility check (TC-N001/N002/N004/N014)
 *   6. Non-negative magnitude enforcement for signed-excluded kinds (TC-N007)
 *   7. Conversion rule resolution (direct → reverse → SI base hop)
 *   8. Dispatch to appropriate converter (linear / affine / logarithmic)
 *   9. MEASVAL evidence envelope construction
 *
 * ⚠ All arithmetic is via BCMath (BCMATH_SCALE=30). No PHP float used
 *   anywhere in the computation path. This prevents the classic
 *   (98.6 × 5/9 = 54.8) float-era error for affine conversions.
 *
 * AI advisory integration: this engine is NOT an AI decision-maker.
 * AI flags are populated by the caller and passed through to the MEASVAL
 * digital_thread. The engine itself is deterministic and rule-bound.
 */
final class ConversionEngine
{
    private const MAX_MAGNITUDE_DIGITS = 60;
    private const DEFAULT_DISPLAY_PRECISION = 6;
    private const DEFAULT_ROUNDING_POLICY = 'ROUND_HALF_EVEN';

    private readonly ExactLinearConverter $linearConverter;
    private readonly AffineConverter $affineConverter;
    private readonly LogarithmicConverter $logConverter;

    public function __construct(
        private readonly QuantityKindService  $kindService,
        private readonly ConversionRuleService $ruleService,
        private readonly MeasurementValueFactory $measvalFactory,
        ?ExactLinearConverter $linear = null,
        ?AffineConverter $affine = null,
        ?LogarithmicConverter $log = null
    ) {
        $this->linearConverter = $linear ?? new ExactLinearConverter();
        $this->affineConverter = $affine ?? new AffineConverter();
        $this->logConverter    = $log    ?? new LogarithmicConverter();
    }

    /**
     * Convert a magnitude from one unit to another.
     *
     * @param string   $magnitude         Input value as a numeric string
     * @param string   $fromUnit          Canonical unit code (from uom_unit_catalog)
     * @param string   $toUnit            Canonical unit code (target)
     * @param int|null $displayPrecision  Decimal places for display result (null = engine default)
     * @param string   $roundingPolicy    Override rounding policy (default: ROUND_HALF_EVEN)
     * @param array    $context           Caller context: trace_id, actor_id, domain, item_id …
     * @param array    $aiFlags           AI advisory flags (empty for non-AI path)
     *
     * @return array{
     *   result:    string,
     *   from_unit: string,
     *   to_unit:   string,
     *   measval:   array,
     * }
     *
     * @throws UomInvalidMagnitudeException
     * @throws UomMagnitudeOverflowException
     * @throws UomCurrencyBlockedException
     * @throws UomUnitNotFoundException
     * @throws UomKindMismatchException
     * @throws UomNegativeMagnitudeException
     * @throws UomNoConversionPathException
     */
    public function convert(
        string  $magnitude,
        string  $fromUnit,
        string  $toUnit,
        ?int    $displayPrecision = null,
        string  $roundingPolicy = self::DEFAULT_ROUNDING_POLICY,
        array   $context = [],
        array   $aiFlags = []
    ): array {
        $magnitude = $this->validateMagnitude($magnitude);

        $fromUnitRow = $this->kindService->getUnit($fromUnit);
        $toUnitRow   = $this->kindService->getUnit($toUnit);

        $this->kindService->assertCompatible($fromUnitRow, $toUnitRow);

        if ($this->kindService->isNonNegativeKind($fromUnitRow['quantity_kind_code'])
            && bccomp($magnitude, '0', ExactLinearConverter::BCMATH_SCALE) < 0
        ) {
            throw new UomNegativeMagnitudeException($fromUnitRow['quantity_kind_code']);
        }

        $rule      = $this->ruleService->resolve($fromUnit, $toUnit, $fromUnitRow, $toUnitRow);
        $precision = $displayPrecision ?? self::DEFAULT_DISPLAY_PRECISION;

        $result = $this->dispatch($magnitude, $rule, $precision, $roundingPolicy);

        $measval = $this->measvalFactory->build(
            $fromUnit, $magnitude, $toUnit, $result,
            $rule, $fromUnitRow, $toUnitRow,
            $precision, $roundingPolicy,
            $context, $aiFlags
        );

        return [
            'result'    => $result,
            'from_unit' => $fromUnit,
            'to_unit'   => $toUnit,
            'measval'   => $measval,
        ];
    }

    /**
     * Dispatch to the appropriate converter based on rule category.
     */
    private function dispatch(
        string $magnitude,
        array  $rule,
        int    $precision,
        string $policy
    ): string {
        $category = $rule['category'];
        $factor   = $rule['factor'];
        $offset   = $rule['offset_value'];
        $reversed = $rule['reversed'];
        $rp       = $rule['rounding_policy'] !== 'ROUND_HALF_EVEN' ? $rule['rounding_policy'] : $policy;

        return match (true) {
            $category === 'identity'
                => $magnitude,

            $category === 'affine' && !$reversed
                => $this->affineConverter->convert($magnitude, $factor, $offset, $rp, $precision),

            $category === 'affine' && $reversed
                => $this->affineConverter->convertReverse($magnitude, $factor, $offset, $rp, $precision),

            in_array($category, ['exact_linear', 'defined_linear', 'si_base_hop'], true) && !$reversed
                => $this->linearConverter->convert($magnitude, $factor, $rp, $precision),

            in_array($category, ['exact_linear', 'defined_linear', 'si_base_hop'], true) && $reversed
                => $this->linearConverter->convertReverse($magnitude, $factor, $rp, $precision),

            $category === 'logarithmic'
                => $this->logConverter->convert($magnitude, '', '', []),

            default
                => throw new UomNoConversionPathException('?', '?'),
        };
    }

    /**
     * Validate and normalise a magnitude string.
     *
     * HB-04 (V3 P02): the previous implementation went through PHP float
     * (`(float)$trimmed` + `number_format`) for scientific-notation input,
     * which silently lost the 54th bit on values like `9007199254740993e0`.
     * Magnitude parsing is now delegated to `DecimalString::parse`, a
     * pure-string expander that preserves every significant digit and
     * rejects oversized exponents up front.
     */
    private function validateMagnitude(string $raw): string
    {
        $trimmed = DecimalString::parse($raw);

        // Final overflow guard kept here for backwards compatibility with
        // the existing MAX_MAGNITUDE_DIGITS contract — DecimalString caps
        // at MAX_TOTAL_DIGITS (256) which is much higher than the engine's
        // own cap, so this check is the engine's local policy.
        $digits = strlen(str_replace(['-', '.'], '', $trimmed));
        if ($digits > self::MAX_MAGNITUDE_DIGITS) {
            throw new UomMagnitudeOverflowException();
        }

        return $trimmed;
    }
}
