<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Uom;

use MOM\Api\Services\Uom\BcMathRounder;
use PHPUnit\Framework\TestCase;

/**
 * BCMath rounding tests — covers Banker's rounding (ROUND_HALF_EVEN)
 * and other rounding policies from uom_rounding_policy seeds.
 */
final class BcMathRounderTest extends TestCase
{
    // ── ROUND_HALF_EVEN (Banker's rounding) ──────────────────────────────────

    /** TC-G023: 2.5 rounds DOWN to 2 (nearest even) */
    public function testHalfEvenTiesDownOnEven(): void
    {
        $result = BcMathRounder::round('2.5', 0, 'ROUND_HALF_EVEN');
        $this->assertSame('2', $result, '2.5 rounds to 2 (nearest even)');
    }

    /** TC-G024: 3.5 rounds UP to 4 (nearest even) */
    public function testHalfEvenTiesUpOnOdd(): void
    {
        $result = BcMathRounder::round('3.5', 0, 'ROUND_HALF_EVEN');
        $this->assertSame('4', $result, '3.5 rounds to 4 (nearest even)');
    }

    public function testHalfEven25RoundsTo2(): void
    {
        // 1.25 with precision 1: last kept digit is 2 (even), so truncate
        $result = BcMathRounder::round('1.25', 1, 'ROUND_HALF_EVEN');
        $this->assertSame('1.2', $result);
    }

    public function testHalfEven35RoundsTo4(): void
    {
        // 1.35 with precision 1: last kept digit is 3 (odd), so round up
        $result = BcMathRounder::round('1.35', 1, 'ROUND_HALF_EVEN');
        $this->assertSame('1.4', $result);
    }

    public function testHalfEvenNonHalfAlwaysRoundsNormally(): void
    {
        $this->assertSame('3', BcMathRounder::round('2.6', 0, 'ROUND_HALF_EVEN'));
        $this->assertSame('2', BcMathRounder::round('2.4', 0, 'ROUND_HALF_EVEN'));
    }

    public function testHalfEvenNegativeNumber(): void
    {
        $result = BcMathRounder::round('-2.5', 0, 'ROUND_HALF_EVEN');
        $this->assertSame('-2', $result, '-2.5 rounds toward zero in HALF_EVEN');
    }

    // ── ROUND_HALF_UP ────────────────────────────────────────────────────────

    public function testHalfUpTiesAlwaysUp(): void
    {
        $this->assertSame('3', BcMathRounder::round('2.5', 0, 'ROUND_HALF_UP'));
        $this->assertSame('4', BcMathRounder::round('3.5', 0, 'ROUND_HALF_UP'));
    }

    // ── ROUND_DOWN_TRUNCATE ──────────────────────────────────────────────────

    public function testTruncateAlwaysCutsOff(): void
    {
        $this->assertSame('2', BcMathRounder::round('2.9', 0, 'ROUND_DOWN_TRUNCATE'));
        $this->assertSame('2', BcMathRounder::round('2.5', 0, 'ROUND_DOWN_TRUNCATE'));
        $this->assertSame('2', BcMathRounder::round('2.1', 0, 'ROUND_DOWN_TRUNCATE'));
    }

    // ── ROUND_NONE ───────────────────────────────────────────────────────────

    public function testRoundNoneReturnsValueUnchanged(): void
    {
        $value = '3.141592653589793238462643383279';
        $result = BcMathRounder::round($value, 10, 'ROUND_NONE');
        $this->assertSame($value, $result);
    }

    // ── Precision scaling ────────────────────────────────────────────────────

    public function testPrecision2(): void
    {
        $this->assertSame('3.14', BcMathRounder::round('3.14159', 2, 'ROUND_HALF_EVEN'));
    }

    public function testPrecision6(): void
    {
        $this->assertSame('2.718282', BcMathRounder::round('2.7182818284590452354', 6, 'ROUND_HALF_EVEN'));
    }

    public function testZeroInput(): void
    {
        $this->assertSame('0', BcMathRounder::round('0', 0, 'ROUND_HALF_EVEN'));
        $this->assertSame('0.000', BcMathRounder::round('0', 3, 'ROUND_HALF_EVEN'));
    }
}
