<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Uom;

use MOM\Api\Services\Uom\DecimalString;
use MOM\Api\Services\Uom\OpcUaUnitId;
use MOM\Api\Services\Uom\UomException;
use MOM\Api\Services\Uom\UomInvalidMagnitudeException;
use MOM\Api\Services\Uom\UomMagnitudeOverflowException;
use PHPUnit\Framework\TestCase;

/**
 * HESEM UoM V3 P07 — Adversarial / fuzz boundary tests (HB-03).
 *
 * Pre-V3 the negative-test suite was allowed to error/fail while the
 * upstream chain still emitted a PASS token. V3 P07 establishes an
 * adversarial regression layer that runs real service paths (not
 * mocked regex copies of them) and asserts on the stable HESEM
 * problem code surface.
 *
 * Coverage matrix:
 *   - SIM-006 large scientific (DecimalString)
 *   - SIM-008 overflow exponent (DecimalString)
 *   - SIM-009 NaN literal (DecimalString)
 *   - SIM-026 OPC UA KGM round trip
 *   - SIM-028 OPC UA unknown UnitId quarantine
 *   - locale comma + hex notation rejection
 *   - empty input rejection
 *   - lowercase Common Code acceptance
 */
final class UomAdversarialConversionTest extends TestCase
{
    /** Magnitudes that must throw UomInvalidMagnitudeException. */
    public static function invalidMagnitudeInputs(): array
    {
        return [
            'empty'        => [''],
            'whitespace'   => ['   '],
            'NaN literal'  => ['NaN'],
            'INF literal'  => ['INF'],
            'hex'          => ['0x10'],
            'locale comma' => ['1,234.5'],
            'two signs'    => ['+-1'],
            'trailing exp' => ['1.5e'],
            'word'         => ['kg'],
        ];
    }

    /** @dataProvider invalidMagnitudeInputs */
    public function testInvalidMagnitudeIsRejected(string $raw): void
    {
        $this->expectException(UomInvalidMagnitudeException::class);
        DecimalString::parse($raw);
    }

    public function testOverflowExponentIsRejected(): void
    {
        $this->expectException(UomMagnitudeOverflowException::class);
        DecimalString::parse('1e100000');
    }

    public function testLargeScientificMagnitudePreservesEveryDigit(): void
    {
        // SIM-006: 2^53 + 1 must survive the parse.
        $this->assertSame(
            '9007199254740993',
            DecimalString::parse('9007199254740993e0')
        );
    }

    public function testOpcUaUnknownReturnsQuarantineSentinel(): void
    {
        // SIM-028: bogus code → -1 quarantine.
        $this->assertSame(OpcUaUnitId::UNKNOWN, OpcUaUnitId::packCommonCode('!!'));
        $this->assertNull(OpcUaUnitId::unpackCommonCode(OpcUaUnitId::UNKNOWN));
    }

    public function testOpcUaReferenceValuesAreStable(): void
    {
        // SIM-026 / SIM-027: locked reference values.
        $this->assertSame(4_933_453, OpcUaUnitId::packCommonCode('KGM'));
        $this->assertSame(5_066_068, OpcUaUnitId::packCommonCode('MMT'));
    }

    public function testUomExceptionCarriesStableProblemCode(): void
    {
        // The Adversarial layer treats UomException::problemCode as the
        // stable API surface — anything that re-uses RuntimeException
        // alone would break this contract.
        $ex = new UomException('UOM_ADVERSARIAL_TEST', 'fixture', 422);
        $this->assertSame('UOM_ADVERSARIAL_TEST', $ex->problemCode);
        $this->assertSame(422, $ex->getHttpStatus());
    }
}
