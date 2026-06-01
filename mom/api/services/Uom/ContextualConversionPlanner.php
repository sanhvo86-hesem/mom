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
        private readonly DensityContextualConverter $densityConverter,
        private readonly ?PotencyContextualConverter $potencyConverter = null,
        private readonly ?PackagingContextualConverter $packagingConverter = null
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

        // Packaging policy: item-specific tiers, never a global factor.
        if ($this->isPackagingPair($fromUnitRow, $toUnitRow, $context)) {
            if (empty($context['item_id']) || empty($context['packaging_level'])) {
                return [
                    'route' => self::ROUTE_FORBIDDEN,
                    'reason' => 'Packaging conversion requires item packaging policy context.',
                    'context_required' => [
                        'item_id' => 'string',
                        'site_id' => 'string optional',
                        'packaging_level' => 'inner|outer|pallet',
                        'supplier_id' => 'string optional',
                        'customer_id' => 'string optional',
                        'effective_date' => 'date optional',
                    ],
                ];
            }
            return [
                'route' => self::ROUTE_PACKAGING,
                'reason' => 'Packaging route with item-specific policy.',
            ];
        }

        if ($fromKind === $toKind) {
            return [
                'route'  => self::ROUTE_SAME_KIND,
                'reason' => 'Identical quantity kinds; engine handles directly.',
            ];
        }

        // Volume <-> Mass via density
        $volumeMassPair = ($fromKind === 'Volume' && $toKind === 'Mass')
                       || ($fromKind === 'Mass'   && $toKind === 'Volume');
        if ($volumeMassPair) {
            if (!$this->hasDensityContext($context)) {
                return [
                    'route'            => self::ROUTE_FORBIDDEN,
                    'reason'           => 'Volume/Mass requires active density context.',
                    'context_required' => [
                        'item_id_or_material_id' => 'string',
                        'substance_code' => 'string',
                        'density_value_or_registry' => 'decimal density with unit or active registry row',
                        'lot_id' => 'string',
                        'temperature_c'  => 'decimal string (optional, default 20.0)',
                        'source_method' => 'string',
                        'evidence_ref' => 'string',
                    ],
                ];
            }
            return [
                'route'  => self::ROUTE_DENSITY,
                'reason' => 'Volume/Mass with density context.',
            ];
        }

        // Potency/assay: IU <-> mass requires lot-specific assay evidence.
        if (($fromKind === 'PotencyUnit' && $toKind === 'Mass')
         || ($fromKind === 'Mass' && $toKind === 'PotencyUnit')
         || ($fromKind === 'Mass' && $toKind === 'AmountOfSubstance')
         || ($fromKind === 'AmountOfSubstance' && $toKind === 'Mass')
        ) {
            if ($this->hasPotencyContext($context)) {
                return [
                    'route' => self::ROUTE_POTENCY,
                    'reason' => 'Potency conversion with lot assay evidence.',
                ];
            }
            return [
                'route'            => self::ROUTE_FORBIDDEN,
                'reason'           => 'Potency conversion requires assay evidence.',
                'context_required' => [
                    'substance' => 'string',
                    'assay_method' => 'string',
                    'potency_value' => 'decimal',
                    'potency_unit' => 'IU_per_mg or equivalent',
                    'assay_pct' => 'numeric 0..100 legacy alias',
                    'method_id' => 'string legacy alias',
                    'lot_id' => 'string',
                    'certificate_ref' => 'string',
                    'expiry_date' => 'date',
                    'approved_by' => 'human approver id',
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
            throw $this->contextException($plan, $context);
        }

        if ($plan['route'] === self::ROUTE_DENSITY) {
            $fromKind = $fromUnitRow['quantity_kind_code'] ?? '';
            $substanceCode = (string)($context['substance_code'] ?? $context['material_id'] ?? $context['item_id'] ?? '');
            $tempC         = isset($context['temperature_c'])
                ? DecimalString::parse((string)$context['temperature_c'])
                : '20.0';

            $result = $fromKind === 'Volume'
                ? $this->densityConverter->volumeToMassWithContext(
                    $magnitude, $fromUnitCode, $toUnitCode,
                    $context + ['substance_code' => $substanceCode, 'temperature_c' => $tempC],
                    $roundingPolicy,
                    $displayPrecision
                )
                : $this->densityConverter->massToVolumeWithContext(
                    $magnitude, $fromUnitCode, $toUnitCode,
                    $context + ['substance_code' => $substanceCode, 'temperature_c' => $tempC],
                    $roundingPolicy,
                    $displayPrecision
                );

            return [
                'route'           => self::ROUTE_DENSITY,
                'result'          => $result['result'],
                'density_kg_m3'   => $result['density_kg_m3'],
                'density_source'  => $result['density_source'],
                'evidence_ref'    => $result['evidence_ref'] ?? null,
                'lot_id'          => $result['lot_id'] ?? ($context['lot_id'] ?? null),
                'substance_code'  => $substanceCode,
                'temperature_c'   => $tempC,
            ];
        }

        if ($plan['route'] === self::ROUTE_POTENCY) {
            if ($this->potencyConverter === null) {
                throw new UomException('UOM_ROUTE_NOT_IMPLEMENTED', 'Potency converter is not configured.', 501);
            }
            return $this->potencyConverter->convert(
                $magnitude,
                $fromUnitCode,
                $toUnitCode,
                $context,
                $roundingPolicy,
                $displayPrecision
            ) + ['route' => self::ROUTE_POTENCY];
        }

        if ($plan['route'] === self::ROUTE_PACKAGING) {
            if ($this->packagingConverter === null) {
                throw new UomException('UOM_ROUTE_NOT_IMPLEMENTED', 'Packaging converter is not configured.', 501);
            }
            return $this->packagingConverter->convert(
                $magnitude,
                $fromUnitCode,
                $toUnitCode,
                $context,
                $roundingPolicy,
                $displayPrecision
            ) + ['route' => self::ROUTE_PACKAGING];
        }

        throw new UomException(
            'UOM_ROUTE_NOT_IMPLEMENTED',
            "Planner route '{$plan['route']}' is not executable.",
            501
        );
    }

    private function hasDensityContext(array $context): bool
    {
        $hasSubject = !empty($context['substance_code']) || !empty($context['material_id']) || !empty($context['item_id']);
        $hasDirectDensity = !empty($context['density_value']) && !empty($context['density_unit']);
        return $hasSubject && ($hasDirectDensity || !empty($context['lot_id']) || !empty($context['source_method']) || !empty($context['substance_code']));
    }

    private function hasPotencyContext(array $context): bool
    {
        foreach (['substance', 'assay_method', 'potency_value', 'potency_unit', 'lot_id', 'certificate_ref', 'expiry_date', 'approved_by'] as $key) {
            if (empty($context[$key])) {
                return false;
            }
        }
        return true;
    }

    private function isPackagingPair(array $fromUnitRow, array $toUnitRow, array $context): bool
    {
        $from = (string)($fromUnitRow['canonical_code'] ?? '');
        $to = (string)($toUnitRow['canonical_code'] ?? '');
        $packagingCodes = ['BOX', 'CASE', 'PALLET'];
        $eachCodes = ['EA', 'each', 'pcs'];
        return in_array($from, $packagingCodes, true) && in_array($to, $eachCodes, true)
            || in_array($to, $packagingCodes, true) && in_array($from, $eachCodes, true)
            || !empty($context['packaging_level']);
    }

    private function contextException(array $plan, array $context): UomException
    {
        $required = $plan['context_required'] ?? [];
        $reason = (string)($plan['reason'] ?? 'Contextual conversion cannot be planned.');
        if (isset($required['density_value_or_registry'])) {
            return new UomException('UOM_CONTEXT_REQUIRED', $reason . ' Remediation: provide active lot/material density evidence.', 422);
        }
        if (isset($required['certificate_ref'])) {
            return new UomException('UOM_MISSING_ASSAY_EVIDENCE', $reason . ' Remediation: attach approved lot assay certificate.', 422);
        }
        if (isset($required['packaging_level'])) {
            return new UomException('UOM_MISSING_PACKAGING_POLICY', $reason . ' Remediation: create an active item packaging policy.', 422);
        }
        return new UomException(empty($context) ? 'UOM_CONTEXT_REQUIRED' : 'UOM_POLICY_NOT_FOUND', $reason, 422);
    }
}
