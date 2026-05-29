<?php

declare(strict_types=1);

namespace MOM\Api\Services\Uom;

/**
 * Arbitrary-precision rounding using BCMath (PHP 8.4+ bcround).
 *
 * Maps uom_rounding_policy.policy_code to PHP RoundingMode enum.
 * Falls back to manual string-based rounding if bcround() is unavailable.
 *
 * Rounding modes:
 *   ROUND_HALF_EVEN   — Banker's rounding (default for regulated/scientific)
 *   ROUND_HALF_UP     — Traditional half-up (commerce)
 *   ROUND_DOWN_TRUNCATE — Truncate toward zero (conservative)
 *   ROUND_UP_CEILING  — Always round away from zero
 *   ROUND_NONE        — Return full BCMath scale result (no rounding)
 */
final class BcMathRounder
{
    private const SUPPORTED_MODES = [
        'ROUND_HALF_EVEN',
        'ROUND_HALF_UP',
        'ROUND_DOWN_TRUNCATE',
        'ROUND_UP_CEILING',
        'ROUND_NONE',
    ];

    /**
     * Round a BCMath string value to given decimal places using the named policy.
     *
     * @param string $value    Numeric string (output of BCMath operation)
     * @param int    $scale    Number of decimal places in result (0 = integer)
     * @param string $policy   Policy code from uom_rounding_policy
     */
    public static function round(string $value, int $scale, string $policy = 'ROUND_HALF_EVEN'): string
    {
        if ($policy === 'ROUND_NONE') {
            return $value;
        }

        if (function_exists('bcround') && function_exists('bcceil') && function_exists('bcfloor')) {
            return self::roundNative($value, $scale, $policy);
        }

        return self::roundManual($value, $scale, $policy);
    }

    private static function roundNative(string $value, int $scale, string $policy): string
    {
        $mode = match ($policy) {
            'ROUND_HALF_EVEN'     => \RoundingMode::HalfEven,
            'ROUND_HALF_UP'       => \RoundingMode::HalfAwayFromZero,
            'ROUND_DOWN_TRUNCATE' => \RoundingMode::TowardsZero,
            'ROUND_UP_CEILING'    => \RoundingMode::AwayFromZero,
            default               => \RoundingMode::HalfEven,
        };
        return bcround($value, $scale, $mode);
    }

    /**
     * Manual implementation for environments without PHP 8.4 bcround().
     * Uses string arithmetic to avoid IEEE 754 float drift.
     */
    private static function roundManual(string $value, int $scale, string $policy): string
    {
        $negative = str_starts_with($value, '-');
        $abs = $negative ? substr($value, 1) : $value;

        [$intPart, $fracPart] = array_pad(explode('.', $abs, 2), 2, '');
        $fracPart = str_pad($fracPart, $scale + 2, '0');

        $keepFrac = substr($fracPart, 0, $scale);
        $firstDropped = (int)($fracPart[$scale] ?? '0');
        $remainingDropped = substr($fracPart, $scale + 1);

        $roundUp = match ($policy) {
            'ROUND_DOWN_TRUNCATE' => false,
            'ROUND_UP_CEILING'    => $firstDropped > 0 || $remainingDropped !== '',
            'ROUND_HALF_UP'       => $firstDropped >= 5,
            'ROUND_HALF_EVEN'     => self::halfEvenShouldRoundUp(
                $keepFrac,
                $firstDropped,
                $remainingDropped
            ),
            default => $firstDropped >= 5,
        };

        $truncated = $scale > 0 ? $intPart . '.' . $keepFrac : $intPart;
        if (!$roundUp) {
            return ($negative ? '-' : '') . self::normalizeZero($truncated, $scale);
        }

        $increment = $scale > 0
            ? bcdiv('1', bcpow('10', (string)$scale, 0), $scale)
            : '1';
        $rounded = bcadd($truncated, $increment, $scale);
        return ($negative ? '-' : '') . $rounded;
    }

    private static function halfEvenShouldRoundUp(
        string $keepFrac,
        int    $firstDropped,
        string $remainingDropped
    ): bool {
        if ($firstDropped < 5) {
            return false;
        }
        if ($firstDropped > 5 || ltrim($remainingDropped, '0') !== '') {
            return true;
        }
        // Exact half: round to even — look at last kept digit
        $lastKept = strlen($keepFrac) > 0 ? (int)$keepFrac[strlen($keepFrac) - 1] : 0;
        return ($lastKept % 2) !== 0;
    }

    private static function normalizeZero(string $v, int $scale): string
    {
        if ($scale === 0) {
            return $v === '' ? '0' : $v;
        }
        return $v;
    }
}
