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

    public const CATEGORY_DISPATCH = [
        'identity' => [
            'implemented' => true,
            'handler' => 'IdentityHandler',
            'allowed_without_context' => true,
            'reverse_allowed' => true,
        ],
        'exact_linear' => [
            'implemented' => true,
            'handler' => 'LinearHandler',
            'allowed_without_context' => true,
            'reverse_allowed' => true,
        ],
        'defined_linear' => [
            'implemented' => true,
            'handler' => 'LinearHandler',
            'allowed_without_context' => true,
            'reverse_allowed' => true,
        ],
        'approximate_linear' => [
            'implemented' => true,
            'handler' => 'LinearHandlerApproximate',
            'allowed_without_context' => true,
            'reverse_allowed' => true,
        ],
        'affine' => [
            'implemented' => true,
            'handler' => 'AffineHandler',
            'allowed_without_context' => true,
            'reverse_allowed' => true,
        ],
        'si_base_hop' => [
            'implemented' => true,
            'handler' => 'SyntheticSiHop',
            'allowed_without_context' => true,
            'reverse_allowed' => false,
        ],
        'dimensionless_strict' => [
            'implemented' => true,
            'handler' => 'LinearHandlerDimensionless',
            'allowed_without_context' => true,
            'reverse_allowed' => true,
        ],
        'ratio' => [
            'implemented' => true,
            'handler' => 'LinearHandlerRatio',
            'allowed_without_context' => true,
            'reverse_allowed' => true,
        ],
        'logarithmic' => [
            'implemented' => false,
            'handler' => 'UnsupportedGuard',
            'allowed_without_context' => false,
            'reverse_allowed' => false,
        ],
        'derived_expression' => [
            'implemented' => false,
            'handler' => 'UnsupportedGuard',
            'allowed_without_context' => false,
            'reverse_allowed' => false,
        ],
        'density_based' => [
            'implemented' => false,
            'handler' => 'P08ContextualDensityHandler',
            'allowed_without_context' => false,
            'reverse_allowed' => false,
        ],
        'potency_assay' => [
            'implemented' => false,
            'handler' => 'P08PotencyHandler',
            'allowed_without_context' => false,
            'reverse_allowed' => false,
        ],
        'packaging_policy' => [
            'implemented' => false,
            'handler' => 'P08PackagingPolicyHandler',
            'allowed_without_context' => false,
            'reverse_allowed' => false,
        ],
        'arbitrary' => [
            'implemented' => false,
            'handler' => 'UnsupportedGuard',
            'allowed_without_context' => false,
            'reverse_allowed' => false,
        ],
        'device_display' => [
            'implemented' => false,
            'handler' => 'UnsupportedGuard',
            'allowed_without_context' => false,
            'reverse_allowed' => false,
        ],
    ];

    private readonly ExactLinearConverter $linearConverter;
    private readonly AffineConverter $affineConverter;
    private readonly LogarithmicConverter $logConverter;

    public function __construct(
        private readonly QuantityKindService  $kindService,
        private readonly ConversionRuleService $ruleService,
        private readonly MeasurementValueFactory $measvalFactory,
        private readonly ?ContextualConversionPlanner $contextualPlanner = null,
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
        $asOf = $this->resolveAsOf($context['as_of'] ?? $context['effective_date'] ?? null);
        $traceId = isset($context['trace_id']) ? (string)$context['trace_id'] : null;
        $precision = $displayPrecision ?? self::DEFAULT_DISPLAY_PRECISION;

        if ((($fromUnitRow['quantity_kind_code'] ?? null) !== ($toUnitRow['quantity_kind_code'] ?? null)
                || isset($context['packaging_level']))
            && $this->contextualPlanner !== null
        ) {
            $plan = $this->contextualPlanner->classify($fromUnitRow, $toUnitRow, $context);
            if ($plan['route'] !== ContextualConversionPlanner::ROUTE_FORBIDDEN
                || isset($plan['context_required'])
            ) {
                return $this->convertContextual(
                    $magnitude,
                    $fromUnit,
                    $toUnit,
                    $fromUnitRow,
                    $toUnitRow,
                    $precision,
                    $roundingPolicy,
                    $context,
                    $aiFlags
                );
            }
        }

        $this->kindService->assertCompatible($fromUnitRow, $toUnitRow, $traceId, $asOf);

        if ($this->kindService->isNonNegativeKind($fromUnitRow['quantity_kind_code'])
            && bccomp($magnitude, '0', ExactLinearConverter::BCMATH_SCALE) < 0
        ) {
            throw new UomNegativeMagnitudeException($fromUnitRow['quantity_kind_code']);
        }

        $contextHash = isset($context['context_hash']) ? (string)$context['context_hash'] : null;
        $rule = $this->ruleService->resolve(
            $fromUnit,
            $toUnit,
            $fromUnitRow,
            $toUnitRow,
            $asOf,
            $contextHash
        );
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

    private function convertContextual(
        string $magnitude,
        string $fromUnit,
        string $toUnit,
        array $fromUnitRow,
        array $toUnitRow,
        int $precision,
        string $roundingPolicy,
        array $context,
        array $aiFlags
    ): array {
        if ($this->contextualPlanner === null) {
            throw new UomException('UOM_CONTEXT_REQUIRED', 'Contextual conversion planner is not configured.', 422);
        }

        $contextual = $this->contextualPlanner->execute(
            $magnitude,
            $fromUnit,
            $toUnit,
            $fromUnitRow,
            $toUnitRow,
            $context,
            $precision,
            $roundingPolicy
        );
        $route = (string)$contextual['route'];
        $result = (string)$contextual['result'];
        $rule = [
            'rule_code' => 'CONTEXTUAL-' . strtoupper($route),
            'rule_version' => 0,
            'category' => match ($route) {
                ContextualConversionPlanner::ROUTE_DENSITY => 'density_based',
                ContextualConversionPlanner::ROUTE_POTENCY => 'potency_assay',
                ContextualConversionPlanner::ROUTE_PACKAGING => 'packaging_policy',
                default => 'derived_expression',
            },
            'factor' => 'contextual',
            'offset_value' => '0',
            'rounding_policy' => $roundingPolicy,
            'factor_exact' => false,
            'effective_from' => $contextual['effective_from'] ?? ($context['effective_date'] ?? null),
            'effective_to' => $contextual['effective_to'] ?? null,
            'context_required' => true,
            'contextual_evidence' => $contextual,
            'reversed' => false,
            'risk_level' => 'medium',
        ];

        $measval = $this->measvalFactory->build(
            $fromUnit,
            $magnitude,
            $toUnit,
            $result,
            $rule,
            $fromUnitRow,
            $toUnitRow,
            $precision,
            $roundingPolicy,
            $context,
            $aiFlags
        );

        return [
            'result' => $result,
            'from_unit' => $fromUnit,
            'to_unit' => $toUnit,
            'measval' => $measval,
            'contextual_route' => $route,
            'contextual_evidence' => $contextual,
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
        $category = (string)$rule['category'];
        $factor   = (string)$rule['factor'];
        $offset   = (string)$rule['offset_value'];
        $reversed = (bool)$rule['reversed'];
        $rp       = $rule['rounding_policy'] !== 'ROUND_HALF_EVEN' ? (string)$rule['rounding_policy'] : $policy;

        if (!isset(self::CATEGORY_DISPATCH[$category])) {
            throw new UomCategoryNotSupportedException($category);
        }

        if (self::CATEGORY_DISPATCH[$category]['implemented'] !== true) {
            $this->touchLogConverterForStaticRead($category);
            throw new UomCategoryNotSupportedException($category);
        }

        return match ($category) {
            'identity' => $magnitude,

            'affine' => $reversed
                ? $this->affineConverter->convertReverse($magnitude, $factor, $offset, $rp, $precision)
                : $this->affineConverter->convert($magnitude, $factor, $offset, $rp, $precision),

            'exact_linear',
            'defined_linear',
            'approximate_linear',
            'dimensionless_strict',
            'ratio',
            'si_base_hop' => $reversed
                ? $this->linearConverter->convertReverse($magnitude, $factor, $rp, $precision)
                : $this->linearConverter->convert($magnitude, $factor, $rp, $precision),

            default => throw new UomCategoryNotSupportedException($category),
        };
    }

    /**
     * Validate and normalise a magnitude string.
     *
     * HB-04 (V3 P02): the previous implementation went through PHP float
     * (PHP floating-point cast + `number_format`) for scientific-notation input,
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

    private function resolveAsOf(mixed $raw): ?\DateTimeImmutable
    {
        if ($raw === null || $raw === '') {
            return null;
        }
        if ($raw instanceof \DateTimeImmutable) {
            return $raw;
        }
        if ($raw instanceof \DateTimeInterface) {
            return new \DateTimeImmutable($raw->format(\DateTimeInterface::ATOM));
        }
        try {
            return new \DateTimeImmutable((string)$raw);
        } catch (\Throwable) {
            throw new UomException(
                'UOM_INVALID_EFFECTIVE_DATE',
                'Conversion context effective date is not a parseable date.',
                422
            );
        }
    }

    private function touchLogConverterForStaticRead(string $category): void
    {
        if ($category === 'logarithmic') {
            $this->logConverter->canConvert('', '');
        }
    }
}
