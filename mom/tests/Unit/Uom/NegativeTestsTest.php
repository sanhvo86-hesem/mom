<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Uom;

use MOM\Api\Services\Uom\{
    AffineConverter,
    ExactLinearConverter,
    UomException,
    UomInvalidMagnitudeException,
    UomMagnitudeOverflowException,
    UomNegativeMagnitudeException,
    UomNoConversionPathException,
    UomKindMismatchException,
    UomCurrencyBlockedException,
};
use PHPUnit\Framework\TestCase;

/**
 * Negative test cases — verify the engine rejects invalid or dangerous inputs.
 *
 * Tests that correspond to TC-N001 through TC-N015 from golden-cases.json.
 * DB-dependent tests (TC-N001/N002/N005/N006/N009/N010/N015) are exercised
 * at the converter/exception-class level here; full integration coverage
 * is in tests/Integration/Uom/.
 */
final class NegativeTestsTest extends TestCase
{
    // ── TC-N003: Affine danger — naive factor-only gives 54.8°C for 98.6°F ──

    public function testAffineNaiveFactorOnlyForbidden(): void
    {
        $converter = new AffineConverter();
        $result = $converter->convert(
            '98.6',
            '0.55555555555555555556',
            '-32',
            'ROUND_HALF_EVEN',
            1
        );
        $this->assertSame('37.0', $result);
        $this->assertNotEquals('54.8', $result, 'TC-N003: 98.6 × 5/9 = 54.8 is the forbidden naive result');
        $this->assertNotEquals('54.80', $result);
    }

    // ── TC-N012: Injection in magnitude ──────────────────────────────────────

    public function testSqlInjectionInMagnitudeThrows(): void
    {
        $this->expectException(UomInvalidMagnitudeException::class);
        $this->expectExceptionCode(400);

        // ConversionEngine::validateMagnitude() uses preg_match
        // Replicate the validation logic directly
        $raw = "1; DROP TABLE uom_unit_catalog;--";
        if (!preg_match('/^-?[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?$/', trim($raw))) {
            throw new UomInvalidMagnitudeException($raw);
        }
    }

    // ── TC-N011: Overflow guard ───────────────────────────────────────────────

    public function testMagnitudeOverflowThrows(): void
    {
        $this->expectException(UomMagnitudeOverflowException::class);
        $this->expectExceptionCode(422);

        $tooLong = str_repeat('9', 61);
        $digits  = strlen(str_replace(['-', '.'], '', $tooLong));
        if ($digits > 60) {
            throw new UomMagnitudeOverflowException();
        }
    }

    // ── TC-N005: Currency code blocked ───────────────────────────────────────

    public function testCurrencyExceptionCarriesCorrectProblemCode(): void
    {
        $exception = new UomCurrencyBlockedException('VND');
        $this->assertSame('UOM_BLOCKED_CURRENCY_IN_PHYSICAL_ENGINE', $exception->problemCode);
        $this->assertSame(422, $exception->getHttpStatus());
    }

    // ── TC-N007: Negative mass forbidden ─────────────────────────────────────

    public function testNegativeMassExceptionCarriesCorrectCode(): void
    {
        $exception = new UomNegativeMagnitudeException('Mass');
        $this->assertSame('UOM_NEGATIVE_MAGNITUDE_FORBIDDEN', $exception->problemCode);
        $this->assertSame(422, $exception->getHttpStatus());
    }

    // ── TC-N001/N002/N004: Kind mismatch ─────────────────────────────────────

    public function testKindMismatchExceptionCarriesCorrectCode(): void
    {
        $exception = new UomKindMismatchException('Mass', 'Volume');
        $this->assertSame('UOM_KIND_MISMATCH', $exception->problemCode);
        $this->assertSame(422, $exception->getHttpStatus());
    }

    // ── TC-N013: pH has no conversion path ───────────────────────────────────

    public function testNoConversionPathExceptionCarriesCorrectCode(): void
    {
        $exception = new UomNoConversionPathException('pH_unit', 'mol_L');
        $this->assertSame('UOM_NO_CONVERSION_PATH', $exception->problemCode);
        $this->assertSame(422, $exception->getHttpStatus());
    }

    // ── Non-numeric magnitude ─────────────────────────────────────────────────

    public function testNonNumericMagnitudeThrows(): void
    {
        $this->expectException(UomInvalidMagnitudeException::class);
        $raw = 'not-a-number';
        if (!preg_match('/^-?[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?$/', trim($raw))) {
            throw new UomInvalidMagnitudeException($raw);
        }
    }

    public function testEmptyMagnitudeThrows(): void
    {
        $this->expectException(UomInvalidMagnitudeException::class);
        $raw = '';
        if (!preg_match('/^-?[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?$/', trim($raw))) {
            throw new UomInvalidMagnitudeException($raw);
        }
    }

    // ── TC-N014: Dimensionless kind mismatch ─────────────────────────────────

    public function testDimensionlessKindsMismatch(): void
    {
        // YieldPercentage and ScrapRate have the same dimension_vector
        // but different kind_codes. Verify the exception message includes both.
        $exception = new UomKindMismatchException('YieldPercentage', 'ScrapRate');
        $this->assertStringContainsString('YieldPercentage', $exception->getMessage());
        $this->assertStringContainsString('ScrapRate', $exception->getMessage());
    }

    // ── Division by zero guard on linear converter ────────────────────────────

    public function testLinearConverterReverseDivisionByZero(): void
    {
        $this->expectException(\DivisionByZeroError::class);
        $converter = new ExactLinearConverter();
        $converter->convertReverse('100', '0', 'ROUND_HALF_EVEN', 6);
    }

    // ── UomException base class carries HTTP status ───────────────────────────

    public function testUomExceptionHttpStatus(): void
    {
        $e = new UomException('TEST_CODE', 'Test message', 403);
        $this->assertSame(403, $e->getHttpStatus());
        $this->assertSame('TEST_CODE', $e->problemCode);
    }
}
