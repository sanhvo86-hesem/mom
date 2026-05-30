<?php

declare(strict_types=1);

namespace MOM\Api\Services\Uom;

use RuntimeException;

/**
 * Base UoM domain exception. All UoM errors carry a machine-readable
 * problem code so the API layer can build RFC 9457 Problem Details responses.
 */
class UomException extends RuntimeException
{
    public function __construct(
        public readonly string $problemCode,
        string $message,
        int $httpStatus = 422,
        ?\Throwable $previous = null
    ) {
        parent::__construct($message, $httpStatus, $previous);
    }

    public function getHttpStatus(): int
    {
        return $this->getCode();
    }
}

/** Unit does not exist in uom_unit_catalog or is not lifecycle_status='active'. */
class UomUnitNotFoundException extends UomException
{
    public function __construct(string $code)
    {
        parent::__construct('UOM_UNIT_NOT_ACTIVE', "Unit '{$code}' not found or not active.", 422);
    }
}

/** Source and target units belong to incompatible quantity kinds. */
class UomKindMismatchException extends UomException
{
    public function __construct(
        public readonly string $fromKind,
        public readonly string $toKind,
        public readonly string $reason = 'no_active_compatibility_rule',
        public readonly string $remediationPath = 'Create and approve a uom_quantity_kind_compatibility rule, or use units from the same quantity kind.',
        public readonly ?string $traceId = null
    ) {
        $traceSuffix = $traceId !== null && $traceId !== '' ? " Trace: {$traceId}." : '';
        parent::__construct(
            'UOM_KIND_MISMATCH',
            "Cannot convert between quantity kinds '{$fromKind}' and '{$toKind}'. Reason: {$reason}. Remediation: {$remediationPath}.{$traceSuffix}",
            422
        );
    }
}

/** No approved conversion rule or SI-base path exists between these units. */
class UomNoConversionPathException extends UomException
{
    public function __construct(string $from, string $to)
    {
        parent::__construct(
            'UOM_NO_CONVERSION_PATH',
            "No approved conversion path found from '{$from}' to '{$to}'.",
            422
        );
    }
}

/** Currency codes are blocked from the physical conversion engine. */
class UomCurrencyBlockedException extends UomException
{
    public function __construct(string $code)
    {
        parent::__construct(
            'UOM_BLOCKED_CURRENCY_IN_PHYSICAL_ENGINE',
            "'{$code}' is a currency code; use the Finance domain for currency conversion.",
            422
        );
    }
}

/** Magnitude is not a valid numeric string. */
class UomInvalidMagnitudeException extends UomException
{
    public function __construct(string $raw)
    {
        $safe = substr(preg_replace('/[^0-9.\-+eE]/', '', $raw), 0, 40);
        parent::__construct('UOM_INVALID_MAGNITUDE', "Invalid magnitude value: '{$safe}'.", 400);
    }
}

/** Negative magnitude provided for a kind that requires non-negative values. */
class UomNegativeMagnitudeException extends UomException
{
    public function __construct(string $kind)
    {
        parent::__construct(
            'UOM_NEGATIVE_MAGNITUDE_FORBIDDEN',
            "Quantity kind '{$kind}' does not allow negative magnitudes.",
            422
        );
    }
}

/** Magnitude is outside the acceptable range for BCMath processing. */
class UomMagnitudeOverflowException extends UomException
{
    public function __construct()
    {
        parent::__construct('UOM_MAGNITUDE_OVERFLOW', 'Magnitude value exceeds allowable precision range.', 422);
    }
}

/** Conversion rule category is known but not implemented in this engine phase. */
class UomCategoryNotSupportedException extends UomException
{
    public function __construct(string $category)
    {
        parent::__construct(
            'UOM_CATEGORY_NOT_SUPPORTED',
            "Conversion category '{$category}' is not supported by the deterministic UoM engine.",
            422
        );
    }
}

/** Unit is flagged ITUOM_ONLY and cannot be used in physical conversion. */
class UomItuomOnlyException extends UomException
{
    public function __construct(string $code)
    {
        parent::__construct(
            'UOM_UNIT_ITUOM_ONLY_NO_PHYSICAL_CONVERSION',
            "'{$code}' is a packaging/ITUOM-only code; it has no physical conversion factor.",
            422
        );
    }
}

/** A conversion rule exists but its lifecycle_status is not 'approved'. */
class UomRuleNotActiveException extends UomException
{
    public function __construct(string $ruleCode)
    {
        parent::__construct(
            'UOM_RULE_NOT_ACTIVE',
            "Conversion rule '{$ruleCode}' is not in approved status.",
            422
        );
    }
}

/** External system code is not mapped in uom_external_code_map. */
class UomExternalCodeUnknownException extends UomException
{
    public function __construct(string $system, string|int $code)
    {
        parent::__construct(
            'UOM_EXTERNAL_CODE_UNKNOWN',
            "External code '{$code}' from system '{$system}' has no mapping in uom_external_code_map.",
            422
        );
    }
}
