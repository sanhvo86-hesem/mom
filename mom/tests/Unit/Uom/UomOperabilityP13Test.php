<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Uom;

use MOM\Api\Services\Uom\DecimalString;
use MOM\Api\Services\Uom\UcumParser;
use MOM\Api\Services\Uom\UomException;
use MOM\Api\Services\Uom\UomInvalidMagnitudeException;
use MOM\Api\Services\Uom\UomMagnitudeOverflowException;
use PHPUnit\Framework\TestCase;

final class UomOperabilityP13Test extends TestCase
{
    private string $root;

    protected function setUp(): void
    {
        $this->root = dirname(__DIR__, 3);
    }

    public function testSimP1301MagnitudeInjectionRejectedBeforeDb(): void
    {
        $this->expectException(UomInvalidMagnitudeException::class);
        DecimalString::parse('1; DROP TABLE uom_unit_catalog;--');
    }

    public function testSimP1302OversizedUcumExpressionRejectedWithSafeLimit(): void
    {
        $parser = new UcumParser();
        $this->expectException(UomException::class);
        $this->expectExceptionMessage('length limit');
        $parser->parse(str_repeat('kg*', 17000));
    }

    public function testParserFuzzRejectsUnicodeConfusablesAndInjectionPayloads(): void
    {
        $parser = new UcumParser();
        $payloads = [
            "kg'); DROP TABLE uom_unit_catalog;--",
            "kg<script>alert(1)</script>",
            "ｋｇ",
            "kg\u{200B}",
            "kg/../../etc/passwd",
            "kg||g"
        ];

        foreach ($payloads as $payload) {
            try {
                $parser->parse($payload);
                $this->fail('Payload unexpectedly parsed: ' . $payload);
            } catch (UomException $e) {
                $this->assertContains($e->problemCode, [
                    'UOM_UCUM_INVALID_EXPRESSION',
                    'UOM_UCUM_ATOM_CONTROLLED_GAP',
                    'UOM_UCUM_EXPRESSION_TOO_LONG',
                    'UOM_UCUM_EXPRESSION_TOO_COMPLEX',
                ]);
            }
        }
    }

    public function testExponentBombRejectedBeforeExpansion(): void
    {
        $this->expectException(UomMagnitudeOverflowException::class);
        DecimalString::parse('1e1000000');
    }

    public function testOperabilityRegistryDefinesThreatTelemetryCacheAndReplayContracts(): void
    {
        $json = $this->operabilityContract();

        foreach (['injection_magnitude', 'malicious_unit_expression', 'alias_poisoning', 'privilege_escalation', 'replay_esign', 'stale_cache', 'event_spoofing'] as $threat) {
            $this->assertArrayHasKey($threat, $json['threat_model']['threats']);
        }
        foreach (['uom.convert.preview', 'uom.alias.resolve', 'uom.rule.resolve', 'uom.measval.create'] as $span) {
            $this->assertContains($span, $json['observability_contract']['traces']);
        }
        foreach (['uom_conversion_latency_ms', 'uom_alias_quarantine_rate', 'uom_problem_code_total'] as $metric) {
            $this->assertContains($metric, $json['observability_contract']['metrics']);
        }
        $this->assertStringContainsString('{as_of}', $json['cache_contract']['rule_cache_key']);
        $this->assertContains('rule_version', $json['replay_contract']['required_fields']);
    }

    public function testAuthorizationMatrixSeparatesPreviewFromApproveAndManifest(): void
    {
        $matrix = $this->operabilityContract()['authorization_matrix'];

        $this->assertContains('uom.convert.preview', $matrix['list_read_preview']);
        $this->assertNotContains('uom.rule.approve', $matrix['list_read_preview']);
        $this->assertContains('uom.rule.approve', $matrix['approve_esign']);
        $this->assertContains('uom.standard_library_manifest.approve', $matrix['manifest_link']);
    }

    /**
     * @return array<string,mixed>
     */
    private function operabilityContract(): array
    {
        return json_decode(
            (string)file_get_contents($this->root . '/data/registry/uom-operability-contracts.json'),
            true,
            flags: JSON_THROW_ON_ERROR
        );
    }
}
