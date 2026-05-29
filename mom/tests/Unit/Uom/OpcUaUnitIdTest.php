<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Uom;

use MOM\Api\Services\Uom\OpcUaUnitId;
use PHPUnit\Framework\TestCase;

/**
 * HESEM UoM V3 P04 — OPC UA UnitId algorithm contract test (HB-08).
 *
 * Pins the OPC UA Part 8 §5.6.3 reference values in code so the algorithm
 * cannot regress to the previous table-driven mapping.
 */
final class OpcUaUnitIdTest extends TestCase
{
    public static function commonCodeReferenceTable(): array
    {
        return [
            ['KGM', 4_933_453],
            ['MMT', 5_066_068],
            ['LTR', 5_002_322],
            ['C81', 4_405_297],
            ['FAH', 4_604_232],
        ];
    }

    /** @dataProvider commonCodeReferenceTable */
    public function testPackCommonCodeMatchesOpcUaReference(string $code, int $expectedUnitId): void
    {
        $this->assertSame(
            $expectedUnitId,
            OpcUaUnitId::packCommonCode($code),
            "OPC UA Part 8 §5.6.3 — pack('{$code}') must equal {$expectedUnitId}"
        );
    }

    /** @dataProvider commonCodeReferenceTable */
    public function testUnpackRoundsTrip(string $code, int $unitId): void
    {
        $this->assertSame($code, OpcUaUnitId::unpackCommonCode($unitId));
        $this->assertTrue(OpcUaUnitId::isRoundTripStable($code));
    }

    public function testUnknownCodeReturnsMinusOne(): void
    {
        $this->assertSame(OpcUaUnitId::UNKNOWN, OpcUaUnitId::packCommonCode('!!'));
        $this->assertSame(OpcUaUnitId::UNKNOWN, OpcUaUnitId::packCommonCode(''));
        $this->assertSame(OpcUaUnitId::UNKNOWN, OpcUaUnitId::packCommonCode('TOOLONG'));
    }

    public function testUnknownUnitIdReturnsNull(): void
    {
        $this->assertNull(OpcUaUnitId::unpackCommonCode(OpcUaUnitId::UNKNOWN));
        $this->assertNull(OpcUaUnitId::unpackCommonCode(-2));
    }

    public function testShortCodePadsHighBytes(): void
    {
        // 'M' alone → only the high byte set: 0x4D << 16 = 5_046_272
        $this->assertSame(5_046_272, OpcUaUnitId::packCommonCode('M'));
        $this->assertSame('M', OpcUaUnitId::unpackCommonCode(5_046_272));
    }

    public function testLowerCaseAccepted(): void
    {
        $this->assertSame(4_933_453, OpcUaUnitId::packCommonCode('kgm'));
    }
}
