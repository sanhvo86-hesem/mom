<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Uom;

use MOM\Api\Services\Uom\UcumParser;
use MOM\Api\Services\Uom\UomException;
use PHPUnit\Framework\TestCase;

final class UcumParserP06Test extends TestCase
{
    public function testSimP0604UgPerMlParsesAsMassConcentration(): void
    {
        $parsed = (new UcumParser())->parse('ug/mL');

        $this->assertSame('parsed', $parsed['status']);
        $this->assertSame('MassConcentration', $parsed['quantity_kind_code']);
        $this->assertSame('M1L-3', $parsed['dimension_vector']);
        $this->assertSame('ug', $parsed['atoms'][0]['canonical_code']);
        $this->assertSame('mL', $parsed['atoms'][1]['canonical_code']);
        $this->assertSame(['/'], $parsed['operators']);
    }

    public function testSimP0605CelAndDegFAreSpecialAffineAtoms(): void
    {
        $cel = (new UcumParser())->parse('Cel');
        $degF = (new UcumParser())->parse('[degF]');

        $this->assertTrue($cel['is_affine']);
        $this->assertTrue($degF['is_affine']);
        $this->assertSame('ThermodynamicTemperature', $cel['quantity_kind_code']);
        $this->assertSame('degF', $degF['atoms'][0]['canonical_code']);
    }

    public function testCatalogRowMismatchFailsLoadContract(): void
    {
        $this->expectException(UomException::class);
        $this->expectExceptionCode(422);

        (new UcumParser())->validateCatalogRow([
            'canonical_code' => 'kg',
            'ucum_code' => 'g',
            'quantity_kind_code' => 'Length',
            'dimension_vector' => 'L1',
        ]);
    }
}
