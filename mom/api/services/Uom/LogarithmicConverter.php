<?php

declare(strict_types=1);

namespace MOM\Api\Services\Uom;

/**
 * Procedure-defined logarithmic conversion (e.g. dB, Neper).
 *
 * This converter is intentionally restricted: it does NOT expose a
 * generic log formula. Instead each procedure is explicitly registered
 * so that the relationship between the log-scale value and the
 * underlying SI quantity is always auditable.
 *
 * pH is NOT converted through this class (pH has no physical conversion
 * path to mol/L via a simple formula — pH ↔ [H+] requires knowing the
 * ionic activity). Attempting pH conversion returns UOM_NO_CONVERSION_PATH.
 *
 * Supported procedures (Phase 1):
 *   - dB (decibel): power ratio or amplitude ratio (must specify reference)
 *   - Np (neper):   amplitude ratio
 *
 * Phase 1 implementation: stubs only. Full implementation is Phase 2.
 */
final class LogarithmicConverter
{
    /**
     * Returns false for all requests in Phase 1; the engine falls through
     * to UomNoConversionPathException.
     */
    public function canConvert(string $fromUnit, string $toUnit): bool
    {
        return false;
    }

    public function convert(
        string $magnitude,
        string $fromUnit,
        string $toUnit,
        array $context = []
    ): never {
        throw new UomNoConversionPathException($fromUnit, $toUnit);
    }
}
