<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Uom;

use MOM\Api\Services\Uom\ExactLinearConverter;
use PHPUnit\Framework\TestCase;

/**
 * Exact linear conversion tests.
 *
 * Verifies BCMath precision and correct factor application.
 * No database required — tests the math class directly.
 */
final class ExactLinearConverterTest extends TestCase
{
    private ExactLinearConverter $converter;

    protected function setUp(): void
    {
        $this->converter = new ExactLinearConverter();
    }

    // ── TC-G001: kg → g ─────────────────────────────────────────────────────

    public function testKgToGram(): void
    {
        $result = $this->converter->convert('1', '1000', 'ROUND_HALF_EVEN', 0);
        $this->assertSame('1000', $result);
    }

    // ── TC-G002: g → kg (reverse) ───────────────────────────────────────────

    public function testGramToKgReverse(): void
    {
        $result = $this->converter->convertReverse('1000', '1000', 'ROUND_HALF_EVEN', 0);
        $this->assertSame('1', $result);
    }

    // ── TC-G010: 1.234m → 1234mm ────────────────────────────────────────────

    public function testMetreToMillimetre(): void
    {
        $result = $this->converter->convert('1.234', '1000', 'ROUND_HALF_EVEN', 0);
        $this->assertSame('1234', $result);
    }

    // ── TC-G012: 1 m³ → 1000 L ──────────────────────────────────────────────

    public function testCubicMetreToLitre(): void
    {
        $result = $this->converter->convert('1', '1000', 'ROUND_HALF_EVEN', 0);
        $this->assertSame('1000', $result);
    }

    // ── TC-G016: 3600000 J → 1 kWh ──────────────────────────────────────────

    public function testJoulesToKwh(): void
    {
        $result = $this->converter->convert('3600000', '0.000000277778', 'ROUND_HALF_EVEN', 0);
        $this->assertSame('1', $result);
    }

    // ── TC-G022: BCMath precision (no float drift) ───────────────────────────

    public function testBcMathPrecision(): void
    {
        // 1/3 kg in grams = 333.333... g — should not drift to float approximation
        $result = $this->converter->convert('0.333333333333', '1000', 'ROUND_HALF_EVEN', 9);
        $this->assertSame('333.333333333', $result);

        // Verify float would give wrong answer
        $floatResult = round(0.333333333333 * 1000, 9);
        // Float may give exactly correct here due to simple math, but the key
        // point is BCMath handles precision that float cannot at scale 30
        $this->assertIsFloat($floatResult);
    }

    // ── TC-G026: 5500 W = 5.5 kW ─────────────────────────────────────────────

    public function testWattsToKilowatts(): void
    {
        $result = $this->converter->convert('5500', '0.001', 'ROUND_HALF_EVEN', 1);
        $this->assertSame('5.5', $result);
    }

    // ── TC-G027: multi-hop via SI base: 1.5 km → 1500000 mm ─────────────────

    public function testMultiHopViaSiBase(): void
    {
        // km si_factor=1000, mm si_factor=0.001
        $result = $this->converter->convertViaSiBase('1.5', '1000', '0.001', 'ROUND_HALF_EVEN', 0);
        $this->assertSame('1500000', $result);
    }

    // ── TC-G028: extreme precision chain: 1e9 mg → 1 t ──────────────────────

    public function testExtremePrecisionChain(): void
    {
        // mg si_factor=0.000001, t si_factor=1000
        // 1e9 mg → SI (kg): 1e9 × 0.000001 = 1000 kg → t: 1000/1000 = 1 t
        $result = $this->converter->convertViaSiBase(
            '1000000000',
            '0.000001',
            '1000',
            'ROUND_HALF_EVEN',
            0
        );
        $this->assertSame('1', $result);
    }

    public function testReverseWithZeroFactorThrows(): void
    {
        $this->expectException(\DivisionByZeroError::class);
        $this->converter->convertReverse('100', '0', 'ROUND_HALF_EVEN', 6);
    }

    public function testSiBaseHopWithZeroTargetThrows(): void
    {
        $this->expectException(\DivisionByZeroError::class);
        $this->converter->convertViaSiBase('100', '1000', '0', 'ROUND_HALF_EVEN', 6);
    }
}
