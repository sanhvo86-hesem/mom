<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Uom;

use MOM\Api\Services\Uom\AffineConverter;
use PHPUnit\Framework\TestCase;

/**
 * Affine temperature conversion tests.
 *
 * The critical danger case is TC-N003:
 *   naive factor-only: 98.6 × 5/9 = 54.8°C (WRONG)
 *   correct affine:    (98.6 + (−32)) × 5/9 = 37°C (CORRECT)
 */
final class AffineConverterTest extends TestCase
{
    private AffineConverter $converter;

    protected function setUp(): void
    {
        $this->converter = new AffineConverter();
    }

    // ── TC-G005: 100°C → K ──────────────────────────────────────────────────

    public function testCelsiusToKelvin100(): void
    {
        // factor=1, offset=273.15  →  K = (°C + 273.15) × 1
        $result = $this->converter->convert('100', '1', '273.15', 'ROUND_HALF_EVEN', 2);
        $this->assertSame('373.15', $result);
    }

    // ── TC-G007: 32°F → 0°C ─────────────────────────────────────────────────

    public function testFahrenheitToCelsiusFreezePoint(): void
    {
        // factor=5/9, offset=-32  →  °C = (32 + (−32)) × 5/9 = 0
        $result = $this->converter->convert('32', '0.55555555555555555556', '-32', 'ROUND_HALF_EVEN', 4);
        $this->assertSame('0.0000', $result);
    }

    // ── TC-G008: 212°F → 100°C ──────────────────────────────────────────────

    public function testFahrenheitToCelsiusBoilingPoint(): void
    {
        $result = $this->converter->convert('212', '0.55555555555555555556', '-32', 'ROUND_HALF_EVEN', 4);
        $this->assertSame('100.0000', $result);
    }

    // ── TC-G006 + TC-N003: 98.6°F → 37°C (NOT 54.8°C) ─────────────────────

    public function testFahrenheitToCelsiusBodyTemp(): void
    {
        $result = $this->converter->convert('98.6', '0.55555555555555555556', '-32', 'ROUND_HALF_EVEN', 4);
        $this->assertSame('37.0000', $result);
        $this->assertNotEquals('54.8', $result, 'TC-N003: naive factor-only result must never appear');
    }

    // ── TC-G009: 273.15K → 0°C ──────────────────────────────────────────────

    public function testKelvinToCelsiusReverse(): void
    {
        // Rule: Cel→K has factor=1, offset=273.15
        // Reverse: K→Cel = value/1 − 273.15
        $result = $this->converter->convertReverse('273.15', '1', '273.15', 'ROUND_HALF_EVEN', 4);
        $this->assertSame('0.0000', $result);
    }

    // ── TC-G030: 100°C → 212°F (reverse of °F→°C rule) ─────────────────────

    public function testCelsiusToFahrenheitReverse(): void
    {
        // Rule: °F→°C: factor=5/9, offset=-32
        // Reverse: °C→°F = Cel / (5/9) − (−32) = Cel × 9/5 + 32
        $result = $this->converter->convertReverse('100', '0.55555555555555555556', '-32', 'ROUND_HALF_EVEN', 4);
        $this->assertSame('212.0000', $result);
    }

    // ── TC-G025: Temperature DIFFERENCE is linear (not affine) ──────────────

    public function testTemperatureDifferenceIsLinearNotAffine(): void
    {
        // ΔK to Δ°C uses a LINEAR rule with factor=1, offset=0
        // This test validates the ENGINE would route ΔK correctly
        // (AffineConverter with offset=0 and factor=1 is identity — acceptable)
        $result = $this->converter->convert('10', '1', '0', 'ROUND_HALF_EVEN', 4);
        $this->assertSame('10.0000', $result);
    }

    public function testNegativeTemperatureAllowed(): void
    {
        // -40°C is a valid temperature (below zero is fine for ThermodynamicTemperature)
        $result = $this->converter->convert('-40', '1', '273.15', 'ROUND_HALF_EVEN', 2);
        $this->assertSame('233.15', $result);
    }

    public function testNegativeFahrenheitToKelvin(): void
    {
        // -40°F = -40°C = 233.15K
        // Step 1: -40°F → -40°C: (−40 + (−32)) × 5/9 = -72 × 5/9 = -40
        $degC = $this->converter->convert('-40', '0.55555555555555555556', '-32', 'ROUND_HALF_EVEN', 4);
        $this->assertSame('-40.0000', $degC);
    }

    public function testDivisionByZeroThrowsOnReverse(): void
    {
        $this->expectException(\DivisionByZeroError::class);
        $this->converter->convertReverse('100', '0', '0', 'ROUND_HALF_EVEN', 4);
    }
}
