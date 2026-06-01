<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Uom;

use MOM\Api\Services\Uom\MeasurementEvidenceVerifier;
use MOM\Api\Services\Uom\MeasurementValueFactory;
use MOM\Api\Services\Uom\NakedNumberMeasurementScanner;
use PHPUnit\Framework\TestCase;

final class MeasurementValueP09Test extends TestCase
{
    public function testSimP0901FahrenheitIqcKeepsOriginalAndCanonicalDisplay(): void
    {
        $envelope = $this->fahrenheitEnvelope(1);

        $this->assertSame('98.6', $envelope['original_input']['magnitude']);
        $this->assertSame('degF', $envelope['original_input']['unit_code']);
        $this->assertSame('LIMS', $envelope['original_input']['source_system']);
        $this->assertSame('37.0', $envelope['display']['display_magnitude']);
        $this->assertSame('Cel', $envelope['display']['display_unit']);
        $this->assertSame('K', $envelope['normalization']['canonical_unit_code']);
        $this->assertSame('ThermodynamicTemperature', $envelope['normalization']['quantity_kind']);
    }

    public function testSimP0902HashReplaySamePayloadPasses(): void
    {
        $envelope = $this->fahrenheitEnvelope(1);
        $result = (new MeasurementEvidenceVerifier())->verify($envelope);

        $this->assertTrue($result['ok']);
        $this->assertSame($envelope['digital_thread']['audit_hash'], $result['recomputed']);
    }

    public function testSimP0903ChangingRuleVersionChangesHash(): void
    {
        $v1 = $this->fahrenheitEnvelope(1);
        $v2 = $this->fahrenheitEnvelope(2);

        $this->assertNotSame($v1['digital_thread']['audit_hash'], $v2['digital_thread']['audit_hash']);
    }

    public function testSimP0904NakedTemperatureFixtureIsFlagged(): void
    {
        $file = tempnam(sys_get_temp_dir(), 'p09-naked-');
        self::assertIsString($file);
        file_put_contents($file, '{"temperature": 37, "operator": "iqc"}');

        try {
            $findings = (new NakedNumberMeasurementScanner())->scanFiles([$file]);
        } finally {
            @unlink($file);
        }

        $this->assertCount(1, $findings);
        $this->assertSame('temperature', $findings[0]['field']);
        $this->assertSame('high', $findings[0]['severity']);
    }

    public function testSimP0905AiAdvisoryReferenceIsStoredWithoutAuthority(): void
    {
        $envelope = $this->fahrenheitEnvelope(1, ['advisory_ref' => 'ai-uom-1']);

        $this->assertSame('ai-uom-1', $envelope['evidence']['ai_advisory_refs'][0]['id']);
        $this->assertSame('advisory_only', $envelope['evidence']['ai_advisory_refs'][0]['authority']);
    }

    private function fahrenheitEnvelope(int $ruleVersion, array $aiFlags = []): array
    {
        $fromUnitRow = [
            'quantity_kind_code' => 'ThermodynamicTemperature',
            'si_factor' => '0.55555555555555555556',
            'si_offset' => '255.37222222222222222222',
            'is_affine' => true,
            'risk_level' => 'medium',
        ];
        $toUnitRow = [
            'quantity_kind_code' => 'ThermodynamicTemperature',
            'si_factor' => '1',
            'si_offset' => '273.15',
            'is_affine' => true,
            'risk_level' => 'medium',
        ];
        $rule = [
            'rule_code' => 'UOMCONV-TEMP-DEGF-CEL-v1',
            'rule_version' => $ruleVersion,
            'category' => 'affine',
            'factor' => '0.55555555555555555556',
            'offset_value' => '-32',
            'rounding_policy' => 'ROUND_HALF_EVEN',
            'factor_exact' => true,
            'effective_from' => '2026-01-01',
            'effective_to' => null,
            'reversed' => false,
        ];

        return (new MeasurementValueFactory())->build(
            'degF',
            '98.6',
            'Cel',
            '37.0',
            $rule,
            $fromUnitRow,
            $toUnitRow,
            1,
            'ROUND_HALF_EVEN',
            [
                'source_system' => 'LIMS',
                'entered_by' => 'iqc-user',
                'entered_at' => '2026-05-30T08:00:00+07:00',
                'trace_id' => 'trace-p09',
                'linked_record_type' => 'inspection_results',
                'linked_record_id' => 'INSP-1',
                'item_id' => 'ITEM-1',
                'lot_id' => 'LOT-1',
                'inspection_id' => 'INSP-1',
            ],
            $aiFlags
        );
    }
}
