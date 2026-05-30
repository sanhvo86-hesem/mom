<?php

declare(strict_types=1);

namespace MOM\Api\Services\Uom;

/**
 * Builds the canonical MeasurementValue (MEASVAL) evidence envelope.
 *
 * MEASVAL is an immutable evidence record that captures:
 *   - input section:           original magnitude + unit
 *   - normalization section:   SI-normalised value for comparison
 *   - display section:         rounded value for human-readable output
 *   - precision_envelope:      BCMath scale, rounding policy, significant figures
 *   - semantic_context:        quantity kind, domain context
 *   - evidence:                rule_code, rule_version, category, factor
 *   - digital_thread:          SHA-256 audit hash, trace_id, actor_id
 *   - ai_flags:                empty unless AI advisory was involved
 *
 * The audit_hash is computed as:
 *   SHA-256(from_unit|magnitude|to_unit|rule_code|rule_version|scale|result)
 *
 * The hash is deterministic and replay-verifiable: given the same inputs
 * the same hash must always be produced (TC-G-REPLAY).
 */
final class MeasurementValueFactory
{
    private const HASH_ALGORITHM = 'sha256';
    private const BCMATH_SCALE_SI = 30;

    /**
     * Build a complete MEASVAL envelope.
     *
     * @param string  $fromUnit       Canonical unit code (input)
     * @param string  $magnitude      Input magnitude (numeric string, BCMath)
     * @param string  $toUnit         Canonical unit code (output)
     * @param string  $result         Computed result magnitude (BCMath)
     * @param array   $rule           Rule descriptor from ConversionRuleService::resolve()
     * @param array   $fromUnitRow    Row from uom_unit_catalog for from_unit
     * @param array   $toUnitRow      Row from uom_unit_catalog for to_unit
     * @param int     $displayPrecision Output decimal places used
     * @param string  $roundingPolicy  Policy code used for display rounding
     * @param array   $context        Caller context (trace_id, actor_id, request_id, domain …)
     * @param array   $aiFlags        AI advisory flags (empty in non-AI path)
     * @return array                  The MEASVAL envelope (associative)
     */
    public function build(
        string $fromUnit,
        string $magnitude,
        string $toUnit,
        string $result,
        array  $rule,
        array  $fromUnitRow,
        array  $toUnitRow,
        int    $displayPrecision,
        string $roundingPolicy,
        array  $context = [],
        array  $aiFlags = []
    ): array {
        // HB-05 (V3 P03): canonical SI must be computed from the INPUT
        // unit's affine triplet, not from the display unit's. For 100 Cel
        // → degF the SI canonical is 373.15 K (input × si_factor + si_offset),
        // never the display value 212. The previous normalisedToSi returned
        // the display number whenever the display unit was affine.
        $siNormalised  = $this->canonicalSiFromInput($magnitude, $fromUnitRow);
        $canonicalUnit = $this->findSiBaseCode(
            $fromUnitRow['quantity_kind_code'] ?? null
        );
        // HB-06 (V3 P03): hash canonical-JSON over the full evidence payload.
        $auditHash = $this->computeEvidenceHash(
            $fromUnit, $magnitude, $toUnit, $result,
            $siNormalised, $canonicalUnit,
            $rule, $displayPrecision, $roundingPolicy
        );

        return [
            'input' => [
                'magnitude'  => $magnitude,
                'unit_code'  => $fromUnit,
                'kind_code'  => $fromUnitRow['quantity_kind_code'],
            ],
            'normalization' => [
                'si_value'   => $siNormalised,
                'si_unit'    => $canonicalUnit,
                'derivation' => 'from_input_via_affine_triplet',
            ],
            'display' => [
                'magnitude'  => $result,
                'unit_code'  => $toUnit,
            ],
            'precision_envelope' => [
                'bcmath_scale'    => ExactLinearConverter::BCMATH_SCALE,
                'display_scale'   => $displayPrecision,
                'rounding_policy' => $roundingPolicy,
            ],
            'semantic_context' => [
                'quantity_kind'     => $fromUnitRow['quantity_kind_code'],
                'from_risk_level'   => $fromUnitRow['risk_level'],
                'to_risk_level'     => $toUnitRow['risk_level'],
                'domain'            => $context['domain'] ?? null,
                'item_id'           => $context['item_id'] ?? null,
            ],
            'evidence' => [
                'rule_code'     => $rule['rule_code'],
                'rule_version'  => $rule['rule_version'],
                'category'      => $rule['category'],
                'factor'        => $rule['factor'],
                'offset_value'  => $rule['offset_value'],
                'reversed'      => $rule['reversed'],
            ],
            'digital_thread' => [
                'audit_hash'       => $auditHash,
                'hash_algorithm'   => strtoupper(self::HASH_ALGORITHM),
                'trace_id'         => $context['trace_id']   ?? null,
                'request_id'       => $context['request_id'] ?? null,
                'actor_id'         => $context['actor_id']   ?? null,
                'recorded_at'      => (new \DateTimeImmutable())->format(\DateTimeInterface::RFC3339_EXTENDED),
            ],
            'ai_flags' => $aiFlags,
        ];
    }

    /**
     * Build a MEASVAL envelope for a measurement that requires no conversion.
     *
     * Used by QualityMeasurementBridge when wrapping an existing inspection
     * measurement in-situ (no unit change). The audit hash uses the same
     * format with from_unit == to_unit and rule_code = 'IDENTITY'.
     *
     * @param string $magnitude  The measurement value (numeric string)
     * @param string $unitCode   The canonical unit code
     * @param array  $context    Caller context (source_table, source_id, item_id, …)
     * @return array  MEASVAL envelope
     */
    public function buildWrapOnly(string $magnitude, string $unitCode, array $context = []): array
    {
        $identityRule = [
            'rule_code'    => 'IDENTITY',
            'rule_version' => 0,
            'category'     => 'identity',
            'factor'       => '1',
            'offset_value' => '0',
            'reversed'     => false,
        ];
        $auditHash = $this->computeEvidenceHash(
            $unitCode, $magnitude, $unitCode, $magnitude,
            $magnitude, null,
            $identityRule, 0, 'ROUND_HALF_EVEN'
        );

        return [
            'input' => [
                'magnitude' => $magnitude,
                'unit_code' => $unitCode,
                'kind_code' => null,
            ],
            'normalization' => [
                'si_value'          => $magnitude,
                'si_unit'           => null,
                'converted_magnitude' => null,
                'converted_unit'    => null,
                'rule_code'         => 'IDENTITY',
                'rule_version'      => 0,
                'rounding_policy'   => 'ROUND_HALF_EVEN',
            ],
            'display' => [
                'magnitude' => $magnitude,
                'unit_code' => $unitCode,
            ],
            'precision_envelope' => [
                'bcmath_scale'    => ExactLinearConverter::BCMATH_SCALE,
                'display_scale'   => null,
                'rounding_policy' => 'ROUND_HALF_EVEN',
            ],
            'semantic_context' => [
                'quantity_kind'   => null,
                'context_code'    => $context['context_code'] ?? null,
                'source_table'    => $context['source_table'] ?? null,
                'source_id'       => $context['source_id']    ?? null,
                'item_id'         => $context['item_id']      ?? null,
                'ai_advisory'     => false,
            ],
            'evidence' => $identityRule,
            'digital_thread' => [
                'audit_hash'   => $auditHash,
                'hash_algorithm' => strtoupper(self::HASH_ALGORITHM),
                'trace_id'     => $context['trace_id']   ?? null,
                'request_id'   => $context['request_id'] ?? null,
                'actor_id'     => $context['actor_id']   ?? null,
                'recorded_at'  => (new \DateTimeImmutable())->format(\DateTimeInterface::RFC3339_EXTENDED),
            ],
            'ai_flags' => [],
        ];
    }

    /**
     * Public hash recomputation used by MeasurementEvidenceVerifier.
     */
    public function recomputeEvidenceHash(array $envelope): string
    {
        $rule = $envelope['evidence'] ?? [];
        return $this->computeEvidenceHash(
            (string)($envelope['input']['unit_code']            ?? ''),
            (string)($envelope['input']['magnitude']            ?? ''),
            (string)($envelope['display']['unit_code']          ?? ''),
            (string)($envelope['display']['magnitude']          ?? ''),
            (string)($envelope['normalization']['si_value']     ?? ''),
            $envelope['normalization']['si_unit']               ?? null,
            $rule,
            (int)   ($envelope['precision_envelope']['display_scale'] ?? 0),
            (string)($envelope['precision_envelope']['rounding_policy'] ?? '')
        );
    }

    /**
     * V2 deterministic SHA-256 audit hash over canonical-JSON of full
     * evidence payload (HB-06). Excludes recorded_at / trace_id / actor_id
     * so replay across sessions stays meaningful.
     */
    private function computeEvidenceHash(
        string  $fromUnit,
        string  $magnitude,
        string  $toUnit,
        string  $result,
        string  $siValue,
        ?string $siUnit,
        array   $rule,
        int     $displayScale,
        string  $roundingPolicy
    ): string {
        $payload = [
            'from_unit'        => $fromUnit,
            'input_magnitude'  => $magnitude,
            'to_unit'          => $toUnit,
            'result_magnitude' => $result,
            'canonical_si'     => ['value' => $siValue, 'unit' => $siUnit],
            'rule' => [
                'code'         => $rule['rule_code']    ?? 'si_base_hop',
                'version'      => $rule['rule_version'] ?? 0,
                'category'     => $rule['category']     ?? null,
                'factor'       => (string)($rule['factor']       ?? ''),
                'offset_value' => (string)($rule['offset_value'] ?? ''),
                'reversed'     => (bool)  ($rule['reversed']     ?? false),
            ],
            'precision' => [
                'display_scale'   => $displayScale,
                'rounding_policy' => $roundingPolicy,
            ],
        ];
        return hash(
            self::HASH_ALGORITHM,
            json_encode(
                $payload,
                JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
            )
        );
    }

    /**
     * Canonical SI value derived from the INPUT unit's affine triplet.
     *   si_value = magnitude × si_factor + si_offset
     * (For a non-affine unit si_offset = 0 and the formula reduces to a
     * pure factor multiply, which is what SI prefix conversions need.)
     */
    private function canonicalSiFromInput(string $magnitude, array $fromUnitRow): string
    {
        $factor = (string)($fromUnitRow['si_factor'] ?? '1');
        $offset = (string)($fromUnitRow['si_offset'] ?? '0');
        if ($factor === '') { $factor = '1'; }
        if ($offset === '') { $offset = '0'; }

        $scaled = bcmul($magnitude, $factor, self::BCMATH_SCALE_SI);
        return bcadd($scaled, $offset, self::BCMATH_SCALE_SI);
    }

    /**
     * Returns the conventional SI base unit code for a given quantity kind.
     * Used only for labelling in the normalization section; not for computation.
     */
    private function findSiBaseCode(string $kindCode): ?string
    {
        return match ($kindCode) {
            'Mass'                       => 'kg',
            'Length'                     => 'm',
            'Area'                       => 'm2',
            'Volume'                     => 'm3',
            'Duration'                   => 's',
            'ThermodynamicTemperature'   => 'K',
            'TemperatureDifference'      => 'DeltaK',
            'Pressure'                   => 'Pa',
            'Energy'                     => 'J',
            'Power'                      => 'W',
            'Frequency'                  => 'Hz',
            'Density'                    => 'kg_m3',
            'Angle'                      => 'rad',
            'AngularVelocity'            => 'rad_s',
            'Velocity'                   => 'm_s',
            'AmountOfSubstance'          => 'mol',
            default                      => null,
        };
    }
}
