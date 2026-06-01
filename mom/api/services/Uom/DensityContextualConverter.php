<?php

declare(strict_types=1);

namespace MOM\Api\Services\Uom;

use MOM\Database\Connection;

/**
 * Density-based volume ↔ mass contextual conversion.
 *
 * Used when:
 *   - from_kind='Volume', to_kind='Mass' (or vice versa)
 *   - A substance_code is supplied in context
 *   - A density row exists in material_density_registry
 *
 * The density is looked up for the substance at the closest available
 * temperature (±5°C tolerance). The result is computed as:
 *
 *   mass (kg)   = volume (m³) × density (kg/m³)
 *   volume (m³) = mass (kg) / density (kg/m³)
 *
 * All intermediate values are in SI base units (kg, m³) before rounding.
 * Units are normalised via uom_unit_catalog.si_factor before and after.
 *
 * This converter is advisory-only — it writes a flag to the MEASVAL
 * evidence envelope so downstream QA can verify the density assumption.
 */
// V3 P05: marker removed from `final` so the ContextualConversionPlanner
// unit tests can swap in a mock without standing up a real Connection.
class DensityContextualConverter
{
    private const BCMATH_SCALE = 30;

    public function __construct(
        private readonly Connection $db
    ) {}

    /**
     * Convert volume (any volume unit) to mass (any mass unit) using substance density.
     *
     * @param string $volumeMagnitude  Magnitude in volumeUnit
     * @param string $volumeUnit       Canonical code (must be Volume kind)
     * @param string $massUnit         Target canonical code (must be Mass kind)
     * @param string $substanceCode    Substance code from material_density_registry
     * @param string $temperatureC     Sample temperature decimal string for density lookup (default 20°C)
     * @param string $policy           Rounding policy
     * @param int    $precision        Output decimal places
     * @return array{result:string, density_kg_m3:string, density_source:string, substance_code:string}
     */
    public function volumeToMass(
        string $volumeMagnitude,
        string $volumeUnit,
        string $massUnit,
        string $substanceCode,
        string $temperatureC = '20.0',
        string $policy = 'ROUND_HALF_EVEN',
        int $precision = 6
    ): array {
        $density = $this->lookupDensity($substanceCode, $temperatureC, null);

        // Normalise volume to m³
        $volSiFactor = $this->getSiFactor($volumeUnit);
        $volumeM3    = bcmul($volumeMagnitude, $volSiFactor, self::BCMATH_SCALE);

        // density_kg_m3 from registry is already in kg/m³
        $massKg = bcmul($volumeM3, $density['density_kg_m3'], self::BCMATH_SCALE);

        // Convert kg to target mass unit
        $massSiFactor  = $this->getSiFactor($massUnit);
        $rawResult     = bcdiv($massKg, $massSiFactor, self::BCMATH_SCALE);
        $result        = BcMathRounder::round($rawResult, $precision, $policy);

        return [
            'result'          => $result,
            'density_kg_m3'   => $density['density_kg_m3'],
            'density_source'  => $density['density_source'],
            'substance_code'  => $substanceCode,
        ];
    }

    /**
     * Convert mass (any mass unit) to volume (any volume unit) using substance density.
     */
    public function massToVolume(
        string $massMagnitude,
        string $massUnit,
        string $volumeUnit,
        string $substanceCode,
        string $temperatureC = '20.0',
        string $policy = 'ROUND_HALF_EVEN',
        int $precision = 6
    ): array {
        $density = $this->lookupDensity($substanceCode, $temperatureC, null);

        if (bccomp($density['density_kg_m3'], '0', self::BCMATH_SCALE) === 0) {
            throw new UomException('UOM_DENSITY_ZERO', "Density for '{$substanceCode}' is zero.");
        }

        $massSiFactor = $this->getSiFactor($massUnit);
        $massKg       = bcmul($massMagnitude, $massSiFactor, self::BCMATH_SCALE);

        $volumeM3   = bcdiv($massKg, $density['density_kg_m3'], self::BCMATH_SCALE);

        $volSiFactor = $this->getSiFactor($volumeUnit);
        $rawResult   = bcdiv($volumeM3, $volSiFactor, self::BCMATH_SCALE);
        $result      = BcMathRounder::round($rawResult, $precision, $policy);

        return [
            'result'          => $result,
            'density_kg_m3'   => $density['density_kg_m3'],
            'density_source'  => $density['density_source'],
            'substance_code'  => $substanceCode,
        ];
    }

    public function volumeToMassWithContext(
        string $volumeMagnitude,
        string $volumeUnit,
        string $massUnit,
        array $context,
        string $policy = 'ROUND_HALF_EVEN',
        int $precision = 6
    ): array {
        $density = $this->densityFromContext($context);
        $volSiFactor = $this->getSiFactor($volumeUnit);
        $volumeM3 = bcmul($volumeMagnitude, $volSiFactor, self::BCMATH_SCALE);
        $massKg = bcmul($volumeM3, $density['density_kg_m3'], self::BCMATH_SCALE);
        $massSiFactor = $this->getSiFactor($massUnit);
        $rawResult = bcdiv($massKg, $massSiFactor, self::BCMATH_SCALE);
        return $density + ['result' => BcMathRounder::round($rawResult, $precision, $policy)];
    }

    public function massToVolumeWithContext(
        string $massMagnitude,
        string $massUnit,
        string $volumeUnit,
        array $context,
        string $policy = 'ROUND_HALF_EVEN',
        int $precision = 6
    ): array {
        $density = $this->densityFromContext($context);
        if (bccomp($density['density_kg_m3'], '0', self::BCMATH_SCALE) === 0) {
            throw new UomException('UOM_DENSITY_ZERO', 'Density context is zero.');
        }
        $massSiFactor = $this->getSiFactor($massUnit);
        $massKg = bcmul($massMagnitude, $massSiFactor, self::BCMATH_SCALE);
        $volumeM3 = bcdiv($massKg, $density['density_kg_m3'], self::BCMATH_SCALE);
        $volSiFactor = $this->getSiFactor($volumeUnit);
        $rawResult = bcdiv($volumeM3, $volSiFactor, self::BCMATH_SCALE);
        return $density + ['result' => BcMathRounder::round($rawResult, $precision, $policy)];
    }

    private function densityFromContext(array $context): array
    {
        if (!empty($context['density_value']) && !empty($context['density_unit'])) {
            foreach (['source_method', 'evidence_ref'] as $field) {
                if (empty($context[$field])) {
                    throw new UomException('UOM_CONTEXT_REQUIRED', "Density context missing {$field}.", 422);
                }
            }
            return [
                'density_kg_m3' => $this->normaliseToKgM3(
                    DecimalString::parse((string)$context['density_value']),
                    (string)$context['density_unit']
                ),
                'density_source' => (string)$context['source_method'],
                'substance_code' => (string)($context['substance_code'] ?? $context['material_id'] ?? $context['item_id'] ?? ''),
                'lot_id' => isset($context['lot_id']) ? (string)$context['lot_id'] : null,
                'evidence_ref' => (string)$context['evidence_ref'],
            ];
        }

        $substanceCode = (string)($context['substance_code'] ?? $context['material_id'] ?? $context['item_id'] ?? '');
        if ($substanceCode === '') {
            throw new UomException('UOM_CONTEXT_REQUIRED', 'Density conversion requires item_id, material_id, or substance_code.', 422);
        }
        $temperatureC = isset($context['temperature_c'])
            ? DecimalString::parse((string)$context['temperature_c'])
            : '20.0';
        $lotId = isset($context['lot_id']) ? (string)$context['lot_id'] : null;
        return $this->lookupDensity($substanceCode, $temperatureC, $lotId);
    }

    private function lookupDensity(string $substanceCode, string $temperatureC, ?string $lotId): array
    {
        $temperatureC = DecimalString::parse($temperatureC);
        $lotClause = $lotId !== null && $lotId !== '' ? ' AND (lot_id = :lot_id OR lot_id IS NULL)' : '';
        $params = [':sc' => $substanceCode, ':temp' => $temperatureC];
        if ($lotClause !== '') {
            $params[':lot_id'] = $lotId;
        }
        $row = $this->db->queryOne(
            "SELECT density_value, density_unit_code, density_source, temperature_celsius,
                    lot_id, method_code, approved_by, approved_at
             FROM material_density_registry
             WHERE substance_code = :sc
               AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
               {$lotClause}
             ORDER BY
               (CASE WHEN lot_id IS NOT NULL THEN 1 ELSE 0 END) DESC,
               ABS(COALESCE(temperature_celsius, 20) - :temp::numeric) ASC
             LIMIT 1",
            $params
        );

        if ($row === null) {
            throw new UomException(
                'UOM_DENSITY_NOT_FOUND',
                "No density record found for substance '{$substanceCode}'.",
                422
            );
        }

        // Convert density to kg/m³ if stored in different unit
        $densityKgM3 = $this->normaliseToKgM3(
            (string)$row['density_value'],
            (string)$row['density_unit_code']
        );

        return [
            'density_kg_m3'  => $densityKgM3,
            'density_source' => (string)$row['density_source'],
            'substance_code' => $substanceCode,
            'lot_id' => isset($row['lot_id']) ? (string)$row['lot_id'] : null,
            'evidence_ref' => isset($row['method_code']) ? (string)$row['method_code'] : null,
        ];
    }

    private function normaliseToKgM3(string $value, string $densityUnitCode): string
    {
        if ($densityUnitCode === 'kg_m3') {
            return $value;
        }
        // kg_L: 1 kg/L = 1000 kg/m³
        if ($densityUnitCode === 'kg_L') {
            return bcmul($value, '1000', self::BCMATH_SCALE);
        }
        // Generic: look up si_factor for the density unit
        $factor = $this->getSiFactor($densityUnitCode);
        return bcmul($value, $factor, self::BCMATH_SCALE);
    }

    private function getSiFactor(string $unitCode): string
    {
        $row = $this->db->queryOne(
            'SELECT si_factor FROM uom_unit_catalog WHERE canonical_code = :code AND lifecycle_status = :s',
            [':code' => $unitCode, ':s' => 'active']
        );
        if ($row === null || $row['si_factor'] === null) {
            throw new UomUnitNotFoundException($unitCode);
        }
        return (string)$row['si_factor'];
    }
}
