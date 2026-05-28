<?php

declare(strict_types=1);

namespace MOM\Tests;

use MOM\Api\Services\RaciDerivativeIntegrityService;
use MOM\Api\Services\RaciMatrixService;
use PHPUnit\Framework\TestCase;

final class RaciDerivativeIntegrityServiceTest extends TestCase
{
    public function testAuditPassesOnCurrentGeneratedDocs(): void
    {
        $service = new RaciDerivativeIntegrityService($this->repoRoot(), $this->dataDir());
        $result = $service->audit();
        $message = json_encode($result['issues'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        self::assertSame([], $result['issues'], is_string($message) ? $message : 'json_encode_failed');
        self::assertGreaterThan(0, $result['documents_scanned']);
        self::assertGreaterThan(0, $result['regions_scanned']);
    }

    public function testCompareGeneratedDocumentFlagsTamperedSop201Row(): void
    {
        $matrix = new RaciMatrixService($this->repoRoot(), $this->dataDir());
        $preview = $matrix->previewPublication();
        $path = 'mom/docs/operations/sops/02-SOP-200/sop-201-order-fulfillment-rfq-to-cash.html';
        $expected = $preview[$path] ?? '';

        self::assertNotSame('', $expected);
        $actual = str_replace(
            '<tr><td>G0</td><td>A2</td><td>Phê duyệt báo giá theo bậc giá trị',
            '<tr><td>G0</td><td>A2</td><td>TAMPERED A2',
            $expected
        );

        $service = new RaciDerivativeIntegrityService($this->repoRoot(), $this->dataDir(), $matrix);
        $issues = $service->compareGeneratedDocument($path, $actual, $expected);

        self::assertNotSame([], $issues);
        self::assertSame('P0', $issues[0]['severity']);
        self::assertStringContainsString('TAMPERED', $issues[0]['message']);
    }

    private function repoRoot(): string
    {
        return dirname(__DIR__, 2);
    }

    private function dataDir(): string
    {
        return $this->repoRoot() . '/mom/data';
    }
}
