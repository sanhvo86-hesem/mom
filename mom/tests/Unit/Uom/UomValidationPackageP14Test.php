<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Uom;

use PHPUnit\Framework\TestCase;

final class UomValidationPackageP14Test extends TestCase
{
    private string $repo;

    protected function setUp(): void
    {
        $this->repo = dirname(__DIR__, 4);
    }

    public function testValidationDeliverableTreeExistsAndIsNonEmpty(): void
    {
        foreach ($this->requiredFiles() as $file) {
            $path = $this->repo . '/' . $file;
            $this->assertFileExists($path, $file);
            $this->assertGreaterThan(100, filesize($path), $file);
        }
    }

    public function testTraceabilityMatrixLinksUrsFrsDsProtocolResultAndEvidence(): void
    {
        $csv = (string)file_get_contents($this->repo . '/_reports/uom-v5/validation/TRACEABILITY-UOM-V5.csv');

        $this->assertStringContainsString('URS,FRS,DS,Protocol,Result,Evidence File', $csv);
        foreach (['URS-01', 'FRS-01', 'DS-API/UI', 'OQ-01', 'P11-test-evidence.md'] as $needle) {
            $this->assertStringContainsString($needle, $csv);
        }
    }

    public function testFmeaContainsRequiredRiskControls(): void
    {
        $csv = (string)file_get_contents($this->repo . '/_reports/uom-v5/validation/RISK-FMEA-UOM-V5.csv');

        foreach (['Wrong degF conversion', 'Naked number accepted', 'Alias ambiguity auto-mapped', 'Stale rule used', 'Unauthorized approval', 'Audit tamper', 'AI overreach'] as $risk) {
            $this->assertStringContainsString($risk, $csv);
        }
    }

    public function testPart11Annex11ControlsAreCovered(): void
    {
        $md = (string)file_get_contents($this->repo . '/_reports/uom-v5/validation/PART11-ANNEX11-CONTROL-MATRIX.md');

        foreach (['Electronic records', 'Audit trail', 'Signature manifestation', 'Signer identity', 'Validation lifecycle', 'Business continuity'] as $control) {
            $this->assertStringContainsString($control, $md);
        }
    }

    public function testPackageUsesValidationReadyPostureOnly(): void
    {
        foreach ($this->requiredFiles() as $file) {
            $contents = (string)file_get_contents($this->repo . '/' . $file);
            $this->assertStringContainsString('validation-ready package candidate', $contents, $file);
            $blockedPhrase = implode(' ', ['validated', 'production', 'system']);
            $this->assertStringNotContainsString($blockedPhrase, strtolower($contents), $file);
        }
    }

    public function testPromptTraceabilityAliasExists(): void
    {
        $this->assertFileExists($this->repo . '/_reports/uom-v5/P14-traceability-matrix.csv');
        $this->assertGreaterThan(100, filesize($this->repo . '/_reports/uom-v5/P14-traceability-matrix.csv'));
    }

    /**
     * @return list<string>
     */
    private function requiredFiles(): array
    {
        return [
            '_reports/uom-v5/validation/URS-UOM-V5.md',
            '_reports/uom-v5/validation/FRS-UOM-V5.md',
            '_reports/uom-v5/validation/DS-UOM-V5.md',
            '_reports/uom-v5/validation/RISK-FMEA-UOM-V5.csv',
            '_reports/uom-v5/validation/TRACEABILITY-UOM-V5.csv',
            '_reports/uom-v5/validation/IQ-PROTOCOL-UOM-V5.md',
            '_reports/uom-v5/validation/OQ-PROTOCOL-UOM-V5.md',
            '_reports/uom-v5/validation/PQ-PROTOCOL-UOM-V5.md',
            '_reports/uom-v5/validation/TEST-REPORT-UOM-V5.md',
            '_reports/uom-v5/validation/PART11-ANNEX11-CONTROL-MATRIX.md',
            '_reports/uom-v5/validation/DEVIATION-LOG-UOM-V5.md',
        ];
    }
}
