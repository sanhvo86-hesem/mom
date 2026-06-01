<?php

declare(strict_types=1);

namespace MOM\Api\Services\Uom;

/**
 * Pure-string decimal magnitude parser (HESEM UoM V3 P02 deliverable).
 *
 * Closes V3 hard-blocker HB-04: the previous magnitude normaliser in
 * ConversionEngine::validateMagnitude went through PHP float for any
 * scientific-notation input (PHP floating-point cast + `number_format`). That path
 * truncates anything beyond the IEEE 754 double-precision mantissa (53 bits,
 * about 15-17 significant decimal digits). The V3 simulation library makes
 * this concrete: SIM-006 requires `9007199254740993e0` (2^53 + 1) to round-
 * trip exactly through the conversion engine, but the float cast collapses
 * it to `9007199254740992`.
 *
 * This class re-implements scientific-to-plain-decimal expansion entirely as
 * string arithmetic. No PHP floating-point cast, no `number_format`, no
 * not-a-number/infinity paths.
 * The output is a BCMath-safe decimal string with no exponent and no leading
 * zeros (apart from the leading `0` on `|value| < 1`).
 *
 * It also classifies the parse:
 *   - INVALID_INPUT — does not match the accepted grammar.
 *   - OVERFLOW      — total digit count after expansion exceeds the cap.
 *   - OK            — return the expanded plain-decimal string.
 *
 * The cap is enforced BEFORE computing the expansion so a malicious
 * `1e1000000` request cannot allocate a megabyte-long zero string.
 */
final class DecimalString
{
    /**
     * Hard cap on total significant + filler digits in the expanded form.
     * 256 covers every legitimate metrology magnitude (the 256-digit budget
     * matches BCMATH_SCALE=30 internal precision used elsewhere in the
     * engine, plus room for large integer mass/volume values).
     */
    public const MAX_TOTAL_DIGITS = 256;

    /** Grammar: optional sign, digits, optional `.digits`, optional eE-exponent. */
    private const RE_NUMERIC = '/^([+-]?)([0-9]+)(?:\.([0-9]+))?(?:[eE]([+-]?[0-9]+))?$/';

    /**
     * Parse a magnitude string into a BCMath-safe decimal representation.
     * Throws UomInvalidMagnitudeException on bad input, UomMagnitudeOverflowException
     * when the expansion would exceed MAX_TOTAL_DIGITS.
     */
    public static function parse(string $raw): string
    {
        $trimmed = trim($raw);

        if ($trimmed === '') {
            throw new UomInvalidMagnitudeException($raw);
        }

        // Reject locale comma, hex, not-a-number/infinity text and any non-grammar tokens
        // explicitly — the regex below would already catch them, but the
        // explicit guard makes the intent obvious in the code.
        if (preg_match('/[a-df-zA-DF-Z,_]/', $trimmed)
            || str_contains($trimmed, '0x')
            || str_contains($trimmed, '0X')
        ) {
            throw new UomInvalidMagnitudeException($raw);
        }

        if (!preg_match(self::RE_NUMERIC, $trimmed, $m)) {
            throw new UomInvalidMagnitudeException($raw);
        }

        $sign     = $m[1] === '-' ? '-' : '';
        $intPart  = ltrim($m[2], '0');
        $fracPart = $m[3] ?? '';
        $expPart  = $m[4] ?? '0';

        // Cheap overflow guard: reject exponent magnitudes that could not
        // possibly fit MAX_TOTAL_DIGITS regardless of mantissa. Done before
        // numeric exponent parsing so 1e100000 fails fast.
        if (strlen($expPart) > 8 || abs((int) $expPart) > self::MAX_TOTAL_DIGITS * 2) {
            throw new UomMagnitudeOverflowException();
        }

        $exp = (int) $expPart;
        if ($intPart === '') {
            $intPart = '0';
        }

        // Concatenate integer + fractional digits into a single integer-form
        // stream, then place the decimal point by (frac_len - exp).
        $allDigits   = $intPart . $fracPart;
        $pointFromR  = strlen($fracPart) - $exp;
        $totalDigits = strlen($allDigits);

        if ($totalDigits + max(0, -$pointFromR) > self::MAX_TOTAL_DIGITS
            || max(0, $pointFromR) + $totalDigits > self::MAX_TOTAL_DIGITS) {
            throw new UomMagnitudeOverflowException();
        }

        if ($pointFromR <= 0) {
            // Decimal point is to the right of the digit string → integer
            // with trailing zeros equal to (-pointFromR).
            $result = $allDigits . str_repeat('0', -$pointFromR);
        } elseif ($pointFromR >= $totalDigits) {
            // Decimal point sits before the leading digit → `0.000…digits`.
            $padding = str_repeat('0', $pointFromR - $totalDigits);
            $result = '0.' . $padding . $allDigits;
        } else {
            // Decimal point sits inside the digit string.
            $intDigits  = substr($allDigits, 0, $totalDigits - $pointFromR);
            $fracDigits = substr($allDigits, $totalDigits - $pointFromR);
            $result = $intDigits . '.' . $fracDigits;
        }

        // Trim insignificant trailing zeros AFTER the decimal point only;
        // leading zeros on the integer side were already trimmed.
        if (str_contains($result, '.')) {
            $result = rtrim($result, '0');
            $result = rtrim($result, '.');
        }
        if ($result === '' || $result === '-') {
            $result = '0';
        }
        if ($result === '0' || $result === '-0') {
            // Preserve canonical zero; drop sign.
            return '0';
        }

        return $sign . $result;
    }

    /**
     * Lightweight "looks numeric" check that does not throw. Useful for the
     * controller layer when it needs to decide whether to delegate to the
     * engine vs. return ProblemDetails immediately.
     */
    public static function isValid(string $raw): bool
    {
        try {
            self::parse($raw);
            return true;
        } catch (UomException) {
            return false;
        }
    }
}
