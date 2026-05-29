<?php

declare(strict_types=1);

namespace MOM\Api\Services\Uom;

use MOM\Database\Connection;

/**
 * Quantity kind lookup and semantic compatibility checks.
 *
 * Enforces the core rule: two units may be converted ONLY if they belong
 * to the same quantity_kind_code (or a declared compatible pair).
 *
 * TemperatureDifference is NOT compatible with ThermodynamicTemperature:
 * you cannot add ΔK to an absolute temperature through this engine.
 *
 * Torque (M1L2T-2) and Energy (M1L2T-2) share the same dimension vector
 * but DIFFERENT kind_codes — they are BLOCKED (see DEC-003).
 *
 * Currency codes (VND, USD, EUR …) are blocked entirely from this engine;
 * they never appear in uom_unit_catalog (DEC-005).
 *
 * Packaging codes (BOX, CS, CTN …) are flagged ITUOM_ONLY in
 * uom_external_code_map.context and also blocked here.
 */
final class QuantityKindService
{
    private const BLOCKED_CURRENCY = ['VND', 'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'KRW', 'THB'];

    public function __construct(
        private readonly Connection $db
    ) {}

    /**
     * Look up the catalog row for a canonical code. Throws if not found or inactive.
     *
     * @return array{canonical_code:string, quantity_kind_code:string, si_factor:?string,
     *               si_offset:?string, is_affine:bool, lifecycle_status:string, risk_level:string}
     */
    public function getUnit(string $code): array
    {
        if (in_array(strtoupper($code), self::BLOCKED_CURRENCY, true)) {
            throw new UomCurrencyBlockedException($code);
        }

        $row = $this->db->queryOne(
            'SELECT canonical_code, quantity_kind_code, si_factor, si_offset,
                    is_affine, lifecycle_status, risk_level
             FROM uom_unit_catalog
             WHERE canonical_code = :code',
            [':code' => $code]
        );

        if ($row === null) {
            throw new UomUnitNotFoundException($code);
        }
        if ($row['lifecycle_status'] !== 'active') {
            throw new UomUnitNotFoundException($code);
        }

        return $row;
    }

    /**
     * Verify both units share the same quantity kind. Throws on mismatch.
     *
     * @param array $fromUnit  Row from getUnit()
     * @param array $toUnit    Row from getUnit()
     */
    public function assertCompatible(array $fromUnit, array $toUnit): void
    {
        $fromKind = $fromUnit['quantity_kind_code'];
        $toKind   = $toUnit['quantity_kind_code'];

        if ($fromKind === $toKind) {
            return;
        }

        if ($this->isAncestorDescendantPair($fromKind, $toKind)) {
            return;
        }

        throw new UomKindMismatchException($fromKind, $toKind);
    }

    /**
     * Resolve whether a quantity kind is non-negative by convention
     * (Mass, Length, Volume, Area, Duration, Frequency — but NOT Temperature
     * which can be negative in Celsius/Fahrenheit).
     */
    public function isNonNegativeKind(string $kindCode): bool
    {
        static $nonNeg = [
            'Mass', 'Length', 'Area', 'Volume', 'Duration', 'Frequency',
            'Density', 'MassFlowRate', 'VolumetricFlowRate', 'Power',
            'Frequency', 'CountOrQuantity',
        ];
        return in_array($kindCode, $nonNeg, true);
    }

    /**
     * Check the kind hierarchy: TemperatureDifference is a child of
     * ThermodynamicTemperature but NOT compatible for absolute conversions.
     * Only returns true when the pair is a valid same-ancestor relationship
     * that the engine permits.
     */
    private function isAncestorDescendantPair(string $kindA, string $kindB): bool
    {
        // No cross-kind conversions are permitted in Phase 1.
        // TemperatureDifference and ThermodynamicTemperature are intentionally
        // kept incompatible even though they share the same dimension vector.
        return false;
    }
}
