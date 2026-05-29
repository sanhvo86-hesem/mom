<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Uom;

use MOM\Api\Services\Uom\MeasurementEvidenceVerifier;
use MOM\Api\Services\Uom\MeasurementValueFactory;
use PHPUnit\Framework\TestCase;

/**
 * HESEM UoM V3 P03 — MEASVAL V2 affine canonicalisation + full-payload
 * evidence hash + replay verifier contract test.
 *
 * Pins:
 *   - HB-05: canonical SI for 100 Cel → degF is 373.15 K, not 212.
 *   - HB-06: audit_hash covers the full canonical-JSON payload; mutating
 *            any relevant field breaks the hash.
 */
final class MeasurementEvidenceVerifierTest extends TestCase
{
    public function testSim002_100Cel_to_degF_canonical_is_373_15_K(): void
    {
        $envelope = $this->buildCelToDegFEnvelope('100');

        $this->assertSame('K', $envelope['normalization']['si_unit']);
        $this->assertSame(
            0,
            bccomp('373.15', (string)$envelope['normalization']['si_value'], 4),
            'SIM-002: canonical SI for 100 Cel must be 373.15 K, got '
            . $envelope['normalization']['si_value']
        );
    }

    public function testReplayVerifierAcceptsUntamperedEnvelope(): void
    {
        $envelope = $this->buildCelToDegFEnvelope('100');
        $verifier = new MeasurementEvidenceVerifier();

        $result = $verifier->verify($envelope);

        $this->assertTrue($result['ok']);
        $this->assertSame($envelope['digital_thread']['audit_hash'], $result['recomputed']);
        $this->assertSame('MEASVAL-V2', $result['schema_version']);
    }

    public function testReplayVerifierRejectsTamperedFactor(): void
    {
        $envelope = $this->buildCelToDegFEnvelope('100');
        $envelope['evidence']['factor'] = '99999';
        $this->assertFalse((new MeasurementEvidenceVerifier())->verify($envelope)['ok']);
    }

    public function testReplayVerifierRejectsTamperedDisplayMagnitude(): void
    {
        $envelope = $this->buildCelToDegFEnvelope('100');
        $envelope['display']['magnitude'] = '999';
        $this->assertFalse((new MeasurementEvidenceVerifier())->verify($envelope)['ok']);
    }

    public function testReplayVerifierRejectsTamperedRoundingPolicy(): void
    {
        $envelope = $this->buildCelToDegFEnvelope('100');
        $envelope['precision_envelope']['rounding_policy'] = 'ROUND_UP_CEILING';
        $this->assertFalse((new MeasurementEvidenceVerifier())->verify($envelope)['ok']);
    }

    private function buildCelToDegFEnvelope(string $celValue): array
    {
        $fromUnitRow = [
            'quantity_kind_code' => 'ThermodynamicTemperature',
            'si_factor'          => '1',
            'si_offset'          => '273.15',
            'is_affine'          => true,
            'risk_level'         => 'low',
        ];
        $toUnitRow = [
            'quantity_kind_code' => 'ThermodynamicTemperature',
            'si_factor'          => '0.555555555555555556',
            'si_offset'          => '255.372222222222222222',
            'is_affine'          => true,
            'risk_level'         => 'low',
        ];
        $rule = [
            'rule_code'    => 'UOMCONV-TEMP-CEL-FAH-v1',
            'rule_version' => 1,
            'category'     => 'affine',
            'factor'       => '1.8',
            'offset_value' => '32',
            'reversed'     => false,
        ];

        return (new MeasurementValueFactory())->build(
            'Cel', $celValue, 'degF', '212',
            $rule, $fromUnitRow, $toUnitRow,
            2, 'ROUND_HALF_EVEN',
            ['trace_id' => 'test-trace'],
            []
        );
    }
}
