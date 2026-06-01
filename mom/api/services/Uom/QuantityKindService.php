<?php

declare(strict_types=1);

namespace MOM\Api\Services\Uom;

use MOM\Database\Connection;

/**
 * Quantity kind lookup and semantic compatibility checks.
 *
 * Enforces the core rule: two units may be converted only if they belong
 * to the same quantity_kind_code or an explicit active compatibility rule.
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
     *               si_offset:?string, is_affine:bool, lifecycle_status:string, risk_level:string,
     *               dimension_vector?:string, measurement_family?:string}
     */
    public function getUnit(string $code): array
    {
        if (in_array(strtoupper($code), self::BLOCKED_CURRENCY, true)) {
            throw new UomCurrencyBlockedException($code);
        }

        $row = $this->db->queryOne(
            'SELECT u.canonical_code, u.quantity_kind_code, u.si_factor, u.si_offset,
                    u.is_affine, u.lifecycle_status, u.risk_level,
                    k.dimension_vector, k.measurement_family
             FROM uom_unit_catalog u
             LEFT JOIN uom_quantity_kind k ON k.kind_code = u.quantity_kind_code
             WHERE u.canonical_code = :code',
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
    public function assertCompatible(
        array $fromUnit,
        array $toUnit,
        ?string $traceId = null,
        ?\DateTimeInterface $asOf = null
    ): void
    {
        $fromKind = $fromUnit['quantity_kind_code'];
        $toKind   = $toUnit['quantity_kind_code'];

        if ($fromKind === $toKind) {
            return;
        }

        $compatibility = $this->activeCompatibilityRule($fromKind, $toKind, $asOf);
        if ($compatibility !== null && (bool)$compatibility['allowed'] === true) {
            if ($this->hasConditionalSchema($compatibility)) {
                throw new UomKindMismatchException(
                    $fromKind,
                    $toKind,
                    'conditional_compatibility_requires_handler',
                    'Route this conversion through the governed handler named by condition_schema before enabling it.',
                    $traceId
                );
            }
            return;
        }

        if ($compatibility !== null && (bool)$compatibility['allowed'] === false) {
            throw new UomKindMismatchException(
                $fromKind,
                $toKind,
                (string)($compatibility['compatibility_type'] ?? 'explicit_compatibility_denied'),
                (string)($compatibility['remediation_path'] ?? 'Use the business-correct quantity kind; do not rely on same dimension vectors.'),
                $traceId
            );
        }

        throw new UomKindMismatchException(
            $fromKind,
            $toKind,
            'no_active_compatibility_rule',
            'Create and approve a uom_quantity_kind_compatibility rule, or use units from the same quantity kind.',
            $traceId
        );
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

    private function activeCompatibilityRule(
        string $fromKind,
        string $toKind,
        ?\DateTimeInterface $asOf
    ): ?array {
        $asOfDate = ($asOf ?? new \DateTimeImmutable('today'))->format('Y-m-d');

        return $this->db->queryOne(
            "SELECT from_kind, to_kind, compatibility_type, allowed,
                    condition_schema, owner_role, approval_status, risk_level,
                    remediation_path, effective_from, effective_to
               FROM uom_quantity_kind_compatibility
              WHERE from_kind = :from_kind
                AND to_kind = :to_kind
                AND approval_status = 'active'
                AND effective_from <= :as_of::date
                AND (effective_to IS NULL OR effective_to > :as_of::date)
              ORDER BY effective_from DESC, created_at DESC
              LIMIT 1",
            [
                ':from_kind' => $fromKind,
                ':to_kind' => $toKind,
                ':as_of' => $asOfDate,
            ]
        );
    }

    private function hasConditionalSchema(array $compatibility): bool
    {
        $schema = $compatibility['condition_schema'] ?? null;
        if ($schema === null || $schema === '' || $schema === [] || $schema === '{}') {
            return false;
        }
        if (is_string($schema)) {
            $decoded = json_decode($schema, true);
            return is_array($decoded) && $decoded !== [];
        }
        return is_array($schema) && $schema !== [];
    }
}
