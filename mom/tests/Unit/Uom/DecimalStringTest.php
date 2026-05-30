<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Uom;

use MOM\Api\Services\Uom\DecimalString;
use MOM\Api\Services\Uom\UomInvalidMagnitudeException;
use MOM\Api\Services\Uom\UomMagnitudeOverflowException;
use PHPUnit\Framework\TestCase;

/**
 * HESEM UoM V3 P02 — DecimalString contract test.
 *
 * Pins the no-float-in-magnitude-path guarantee in code so HB-04 cannot
 * regress. The flagship case is SIM-006:
 * `9007199254740993e0` (2^53 + 1) must survive parse without losing the
 * trailing `3`. Previously this returned `9007199254740992` because the
 * engine cast through PHP float.
 */
final class DecimalStringTest extends TestCase
{
    /** SIM-006: large scientific magnitude preserves every bit. */
    public function testSim006LargeScientificPreservesExactInteger(): void
    {
        $this->assertSame(
            '9007199254740993',
            DecimalString::parse('9007199254740993e0')
        );
    }

    /** SIM-007: tiny scientific shifts decimal cleanly. */
    public function testSim007TinyScientificStaysExact(): void
    {
        $this->assertSame(
            '0.00000000000000000001234567890123456789',
            DecimalString::parse('1.234567890123456789e-20')
        );
    }

    /** SIM-008: 1e100000 must be rejected BEFORE allocation. */
    public function testSim008OverflowExponentRejected(): void
    {
        $this->expectException(UomMagnitudeOverflowException::class);
        DecimalString::parse('1e100000');
    }

    /** SIM-009: invalid magnitude — NaN literal — rejected. */
    public function testSim009RejectsNanLiteral(): void
    {
        $this->expectException(UomInvalidMagnitudeException::class);
        DecimalString::parse('NaN');
    }

    public function testRejectsInfLiteral(): void
    {
        $this->expectException(UomInvalidMagnitudeException::class);
        DecimalString::parse('INF');
    }

    public function testRejectsLocaleComma(): void
    {
        $this->expectException(UomInvalidMagnitudeException::class);
        DecimalString::parse('1,234.5');
    }

    public function testRejectsHex(): void
    {
        $this->expectException(UomInvalidMagnitudeException::class);
        DecimalString::parse('0x10');
    }

    public function testRejectsEmpty(): void
    {
        $this->expectException(UomInvalidMagnitudeException::class);
        DecimalString::parse('');
    }

    public function testPlainIntegerPassthrough(): void
    {
        $this->assertSame('42',   DecimalString::parse('42'));
        $this->assertSame('-42',  DecimalString::parse('-42'));
        $this->assertSame('42',   DecimalString::parse('+42'));
        $this->assertSame('0',    DecimalString::parse('0'));
        $this->assertSame('0',    DecimalString::parse('-0'));
    }

    public function testPlainDecimalPassthrough(): void
    {
        $this->assertSame('1.5',  DecimalString::parse('1.5'));
        $this->assertSame('0.5',  DecimalString::parse('0.5'));
        $this->assertSame('-0.5', DecimalString::parse('-0.5'));
    }

    public function testLeadingZerosNormalised(): void
    {
        $this->assertSame('1',     DecimalString::parse('001'));
        $this->assertSame('1.5',   DecimalString::parse('01.50'));
        $this->assertSame('1',     DecimalString::parse('1.0'));
    }

    public function testScientificPositiveExponent(): void
    {
        $this->assertSame('1500',  DecimalString::parse('1.5e3'));
        $this->assertSame('12340', DecimalString::parse('1.234e4'));
    }

    public function testScientificNegativeExponent(): void
    {
        $this->assertSame('0.0015', DecimalString::parse('1.5e-3'));
        $this->assertSame('0.001',  DecimalString::parse('1e-3'));
        $this->assertSame('0.0001234', DecimalString::parse('1.234e-4'));
    }

    public function testIsValidNeverThrows(): void
    {
        $this->assertTrue(DecimalString::isValid('1.5'));
        $this->assertFalse(DecimalString::isValid('NaN'));
        $this->assertFalse(DecimalString::isValid(''));
    }
}
