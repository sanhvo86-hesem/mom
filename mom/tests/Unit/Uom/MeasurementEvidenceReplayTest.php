<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Uom;

use MOM\Api\Services\Uom\MeasurementEvidenceVerifier;
use MOM\Api\Services\Uom\MeasurementValueFactory;
use PHPUnit\Framework\TestCase;

/**
 * HESEM UoM V3 P08 — historical MEASVAL replay test
 * (HB-14 catalog-aware wrap-only).
 */
final class MeasurementEvidenceReplayTest extends TestCase
{
    public function testCatalogAwareWrapOnlyCarriesCanonicalSi(): void
    {
        $factory = new MeasurementValueFactory();

        // 100 Cel wrapped with full unit-row context.
        $envelope = $factory->buildWrapOnly('100', 'Cel', [],
            [
                'quantity_kind_code' => 'ThermodynamicTemperature',
                'si_factor'          => '1',
                'si_offset'          => '273.15',
                'is_affine'          => true,
                'risk_level'         => 'low',
            ]
        );

        $this->assertSame('K', $envelope['normalization']['si_unit']);
        $this->assertSame(
            0,
            bccomp('373.15', (string)$envelope['normalization']['si_value'], 4)
        );
        $this->assertTrue($envelope['normalization']['catalog_aware']);
        $this->assertSame(
            'wrap_only_catalog_aware',
            $envelope['normalization']['derivation']
        );

        $this->assertTrue(
            (new MeasurementEvidenceVerifier())->verify($envelope)['ok']
        );
    }

    public function testCatalogBlindWrapOnlySurfacesReason(): void
    {
        $factory = new MeasurementValueFactory();
        $envelope = $factory->buildWrapOnly('45.3', 'MM');

        $this->assertNull($envelope['normalization']['si_unit']);
        $this->assertFalse($envelope['normalization']['catalog_aware']);
        $this->assertSame(
            'wrap_only_catalog_blind_no_row_supplied',
            $envelope['normalization']['derivation']
        );
    }

    public function testReplayVerifierAcceptsCatalogAwareWrap(): void
    {
        $factory = new MeasurementValueFactory();
        $envelope = $factory->buildWrapOnly('100', 'Cel', [],
            [
                'quantity_kind_code' => 'ThermodynamicTemperature',
                'si_factor'          => '1',
                'si_offset'          => '273.15',
                'is_affine'          => true,
                'risk_level'         => 'low',
            ]
        );

        $verifier = new MeasurementEvidenceVerifier();
        $result   = $verifier->verify($envelope);

        $this->assertTrue($result['ok']);
        $this->assertSame('MEASVAL-V2', $result['schema_version']);
    }
}
