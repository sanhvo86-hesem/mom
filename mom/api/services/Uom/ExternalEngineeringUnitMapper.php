<?php

declare(strict_types=1);

namespace MOM\Api\Services\Uom;

use MOM\Database\Connection;

/**
 * Maps external engineering unit representations to canonical HESEM UoM codes.
 *
 * Supported external systems:
 *
 *   OPC_UA    — OPC UA EUInformation node. Lookup by UnitId (numeric, e.g. 4408 for kg).
 *               DisplayName string is NOT used as lookup key — it is not authoritative
 *               (GAP-001 resolution: use numeric UnitId aligned to UNECE Rec20).
 *
 *   UNECE_REC20 — UN/CEFACT Recommendation 20 three-letter codes (KGM, MTR, LTR…).
 *               Used in EDI (EDIFACT, X12) and e-invoicing (PEPPOL, UBL).
 *
 *   LIMS      — Laboratory Information Management System string aliases.
 *               Resolved via uom_alias table with context_scope='SYSTEM'.
 *               Unknown LIMS strings → quarantine (reviewed by metrology team).
 *
 *   CUSTOM    — Free-form alias resolution via supplier/customer alias table.
 *
 * All failed resolutions are submitted to uom_alias_quarantine.
 *
 * ISA-88 / OPC UA Part 8 note:
 *   OPC UA EUInformation.UnitId is a 32-bit integer encoding the UNECE
 *   Recommendation 20 numeric code. The numeric lookup is the only
 *   reliable cross-system identifier; DisplayName varies by server locale.
 */
final class ExternalEngineeringUnitMapper
{
    public function __construct(
        private readonly UomAliasResolutionService $aliasService
    ) {}

    /**
     * Resolve an OPC UA EUInformation.UnitId (numeric) to canonical_code.
     *
     * @param int $unitId  OPC UA UnitId integer (e.g. 4408 = kg, 5595 = m, 5565 = L)
     * @throws UomExternalCodeUnknownException when no mapping exists
     */
    public function fromOpcUaUnitId(int $unitId): string
    {
        return $this->aliasService->resolveOpcUaUnitId($unitId);
    }

    /**
     * Resolve a UNECE Recommendation 20 alpha code to canonical_code.
     *
     * @param string $unece  Three-letter code (case-insensitive), e.g. 'KGM', 'MTR', 'LTR'
     * @throws UomExternalCodeUnknownException when no mapping exists
     */
    public function fromUnece(string $unece): string
    {
        return $this->aliasService->resolveUnece($unece);
    }

    /**
     * Resolve a LIMS unit string to canonical_code.
     *
     * LIMS strings are often informal (e.g. 'mg/ml', 'ppm', 'cfu/mL').
     * Lookup uses uom_alias with context_scope='SYSTEM' first,
     * then falls back to UCUM expression matching.
     *
     * @param string $limsUnit  Free-form unit string from LIMS
     * @throws UomExternalCodeUnknownException if unresolvable (also quarantines)
     */
    public function fromLims(string $limsUnit): string
    {
        return $this->aliasService->resolve($limsUnit, 'SYSTEM');
    }

    /**
     * Resolve a supplier-specific unit string to canonical_code.
     *
     * @param string $unit       Supplier's unit label (e.g. 'pao', 'hộp', 'MT')
     * @param string $supplierId Supplier code for context-aware lookup
     * @throws UomExternalCodeUnknownException if unresolvable (also quarantines)
     */
    public function fromSupplierUnit(string $unit, string $supplierId): string
    {
        return $this->aliasService->resolve($unit, 'SUPPLIER', $supplierId);
    }

    /**
     * Resolve a customer-specific unit string to canonical_code.
     */
    public function fromCustomerUnit(string $unit, string $customerId): string
    {
        return $this->aliasService->resolve($unit, 'CUSTOMER', $customerId);
    }

    /**
     * Batch-resolve multiple OPC UA UnitIds.
     *
     * Returns a map of unitId → canonical_code. Unresolvable IDs map to null.
     * Does NOT throw — use this for bulk MES stream ingestion where partial
     * failures must be logged but must not halt the stream.
     *
     * @param list<int> $unitIds
     * @return array<int, string|null>
     */
    public function batchFromOpcUaUnitIds(array $unitIds): array
    {
        $result = [];
        foreach ($unitIds as $id) {
            try {
                $result[$id] = $this->fromOpcUaUnitId($id);
            } catch (UomExternalCodeUnknownException) {
                $result[$id] = null;
            }
        }
        return $result;
    }

    /**
     * Attempt resolution from any supported system, in priority order:
     *   1. UNECE alpha code (if exactly 3 uppercase letters)
     *   2. OPC UA numeric UnitId (if integer)
     *   3. LIMS / system alias
     *
     * Useful when the external system type is not known in advance (e.g.
     * generic webhook from a SCADA bridge).
     *
     * @throws UomExternalCodeUnknownException if all strategies fail
     */
    public function fromUnknown(string|int $rawUnit): string
    {
        if (is_int($rawUnit)) {
            return $this->fromOpcUaUnitId($rawUnit);
        }

        $trimmed = trim($rawUnit);

        // Try UNECE 3-letter alpha code
        if (preg_match('/^[A-Za-z]{2,3}[0-9]?$/', $trimmed)) {
            try {
                return $this->fromUnece($trimmed);
            } catch (UomExternalCodeUnknownException) {
            }
        }

        // Try integer UnitId encoded as string
        if (ctype_digit($trimmed)) {
            try {
                return $this->fromOpcUaUnitId((int)$trimmed);
            } catch (UomExternalCodeUnknownException) {
            }
        }

        // Fall through to LIMS alias (may quarantine on failure)
        return $this->fromLims($trimmed);
    }
}
