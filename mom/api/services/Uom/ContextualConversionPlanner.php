<?php

declare(strict_types=1);

namespace MOM\Api\Services\Uom;

/**
 * Contextual conversion planner (HESEM UoM V3 P05 deliverable,
 * closes HB-07).
 *
 * Pre-V3, the conversion engine called `assertCompatible($from, $to)`
 * before any density/potency/packaging path could intercept. Volume↔Mass
 * therefore always failed with `UOM_KIND_MISMATCH` even when a substance
 * code was supplied. The planner replaces that hard gate with a routing
 * stage:
 *
 *   1. resolve unit catalog rows for from/to.
 *   2. classify the requested conversion (same-kind / density /
 *      potency / packaging / forbidden).
 *   3. validate that the required context fields are present and
 *      effective for the chosen route.
 *   4. delegate computation to the matching contextual converter.
 *   5. return the conversion result + a route descriptor that the
 *      engine can stamp into the MEASVAL evidence envelope.
 *
 * Three problem codes are minted here so the API surface (P06) returns
 * machine-readable RFC 9457 ProblemDetails:
 *
 *   - UOM_CONTEXT_REQUIRED
 *   - UOM_CONTEXT_RULE_NOT_EFFECTIVE
 *   - UOM_POLICY_NOT_FOUND
 *
 * Same-kind conversions are passed through (planner returns null) so the
 * existing engine path stays untouched.
 */
final class ContextualConversionPlanner
{
    public const ROUTE_SAME_KIND     = 'same_kind';
    public const ROUTE_DENSITY       = 'density';
    public const ROUTE_POTENCY       = 'potency';
    public const ROUTE_PACKAGING     = 'packaging';
    public const ROUTE_FORBIDDEN     = 'forbidden';

    public function __construct(
        private readonly DensityContextualConverter $densityConverter
    ) {}

    /**
     * Classify the request and produce a routing descriptor. The engine
     * uses the descriptor to either (a) fall through to its same-kind
     * path or (b) call back into the planner via `execute()`.
     *
     * @param array $fromUnitRow uom_unit_catalog row
     * @param array $toUnitRow   uom_unit_catalog row
     * @param array $context     ['substance_code'=>?, 'temperature_c'=>?,
     *                            'item_id'=>?, 'assay_pct'=>?, …]
     *
     * @return array{
     *   route: string,
     *   reason: string,
     *   context_required?: array<string,string>
     * }
     */
    public function classify(array $fromUnitRow, array $toUnitRow, array $context): array
    {
        $fromKind = $fromUnitRow['quantity_kind_code'] ?? '';
        $toKind   = $toUnitRow['quantity_kind_code']   ?? '';

        if ($fromKind === $toKind) {
            return [
                'route'  => self::ROUTE_SAME_KIND,
                'reason' => 'Identical quantity kinds; engine handles directly.',
            ];
        }

        // Volume ↔ Mass via density
        $volumeMassPair = ($fromKind === 'Volume' && $toKind === 'Mass')
                       || ($fromKind === 'Mass'   && $toKind === 'Volume');
        if ($volumeMassPair) {
            if (empty($context['substance_code'])) {
                return [
                    'route'            => self::ROUTE_FORBIDDEN,
                    'reason'           => 'Volume↔Mass requires substance density context.',
                    'context_required' => [
                        'substance_code' => 'string',
                        'temperature_c'  => 'float (optional, default 20.0)',
                    ],
                ];
            }
            return [
                'route'  => self::ROUTE_DENSITY,
                'reason' => 'Volume↔Mass with substance_code → density route.',
            ];
        }

        // Mass ↔ AmountOfSubstance via potency/assay (forwarded — converter
        // not yet built; planner records the requirement for P09).
        if (($fromKind === 'Mass' && $toKind === 'AmountOfSubstance')
         || ($fromKind === 'AmountOfSubstance' && $toKind === 'Mass')
        ) {
            return [
                'route'            => self::ROUTE_FORBIDDEN,
                'reason'           => 'Mass↔Amount requires assay/potency context.',
                'context_required' => [
                    'assay_pct'  => 'numeric 0..100',
                    'method_id'  => 'string',
                ],
            ];
        }

        // Default: no planner-known route → forbidden.
        return [
            'route'  => self::ROUTE_FORBIDDEN,
            'reason' => "No contextual route registered for {$fromKind}↔{$toKind}.",
        ];
    }

    /**
     * Execute a non-same-kind route. Same-kind requests should never
     * reach this method — callers must check the classifier first.
     *
     * Returns the converted magnitude as a BCMath string + a route
     * descriptor that the engine can stamp into MEASVAL evidence.
     */
    public function execute(
        string $magnitude,
        string $fromUnitCode,
        string $toUnitCode,
        array  $fromUnitRow,
        array  $toUnitRow,
        array  $context,
        int    $displayPrecision,
        string $roundingPolicy
    ): array {
        $plan = $this->classify($fromUnitRow, $toUnitRow, $context);

        if ($plan['route'] === self::ROUTE_SAME_KIND) {
            throw new UomException(
                'UOM_PLANNER_MISUSE',
                'execute() must not be called for same-kind conversions.',
                500
            );
        }

        if ($plan['route'] === self::ROUTE_FORBIDDEN) {
            // No context, no route. Surface the missing fields so the
            // API layer can build a ProblemDetails payload.
            $code = empty($context) || empty($context['substance_code'])
                  ? 'UOM_CONTEXT_REQUIRED'
                  : 'UOM_POLICY_NOT_FOUND';
            throw new UomException($code, $plan['reason'], 422);
        }

        if ($plan['route'] === self::ROUTE_DENSITY) {
            $fromKind = $fromUnitRow['quantity_kind_code'] ?? '';
            $substanceCode = (string)$context['substance_code'];
            $tempC         = isset($context['temperature_c'])
                ? (float)$context['temperature_c']
                : 20.0;

            $result = $fromKind === 'Volume'
                ? $this->densityConverter->volumeToMass(
                    $magnitude, $fromUnitCode, $toUnitCode,
                    $substanceCode, $tempC, $roundingPolicy, $displayPrecision
                )
                : $this->densityConverter->massToVolume(
                    $magnitude, $fromUnitCode, $toUnitCode,
                    $substanceCode, $tempC, $roundingPolicy, $displayPrecision
                );

            return [
                'route'           => self::ROUTE_DENSITY,
                'result'          => $result['result'],
                'density_kg_m3'   => $result['density_kg_m3'],
                'density_source'  => $result['density_source'],
                'substance_code'  => $substanceCode,
                'temperature_c'   => $tempC,
            ];
        }

        // Potency/packaging routes deliberately not executable in P05;
        // the planner classifier surfaces them so P09 and P11 can wire
        // the actual converters when those domains are hardened.
        throw new UomException(
            'UOM_ROUTE_NOT_IMPLEMENTED',
            "Planner route '{$plan['route']}' is not executable in P05.",
            501
        );
    }
}
