<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Services\ExcelVerificationService;
use PHPUnit\Framework\TestCase;

final class ExcelVerificationServiceTest extends TestCase
{
    private string $tmpDir;

    protected function setUp(): void
    {
        $this->tmpDir = sys_get_temp_dir() . '/mom_excel_verify_test_' . bin2hex(random_bytes(4));
        mkdir($this->tmpDir, 0775, true);
    }

    protected function tearDown(): void
    {
        $this->removeDir($this->tmpDir);
    }

    public function testIssuanceHashBindsAllocationTemplateAndRecord(): void
    {
        $service = new ExcelVerificationService($this->tmpDir);

        $base = $service->computeHash('FRM-631', 'Rev.03', '2026-04-13T00:00:00Z', 'operator', 'ALLOC-1', str_repeat('a', 64), 'REC-1');
        $differentAllocation = $service->computeHash('FRM-631', 'Rev.03', '2026-04-13T00:00:00Z', 'operator', 'ALLOC-2', str_repeat('a', 64), 'REC-1');
        $differentTemplate = $service->computeHash('FRM-631', 'Rev.03', '2026-04-13T00:00:00Z', 'operator', 'ALLOC-1', str_repeat('b', 64), 'REC-1');
        $differentRecord = $service->computeHash('FRM-631', 'Rev.03', '2026-04-13T00:00:00Z', 'operator', 'ALLOC-1', str_repeat('a', 64), 'REC-2');

        $this->assertNotSame($base, $differentAllocation);
        $this->assertNotSame($base, $differentTemplate);
        $this->assertNotSame($base, $differentRecord);
    }

    public function testVerifyUploadRejectsTamperedAllocationMetadata(): void
    {
        $service = new ExcelVerificationService($this->tmpDir);
        $workbook = $this->tmpDir . '/FRM-631_Rev.03_test.xlsx';
        file_put_contents($workbook, 'not a real workbook, sidecar fallback drives this test');

        $templateHash = str_repeat('a', 64);
        $hash = $service->computeHash('FRM-631', 'Rev.03', '2026-04-13T00:00:00Z', 'operator', 'ALLOC-1', $templateHash, 'REC-1');
        $this->writeSidecar($workbook, [
            'form_code' => 'FRM-631',
            'form_revision' => 'Rev.03',
            'download_timestamp' => '2026-04-13T00:00:00Z',
            'download_user' => 'operator',
            'download_hash' => $hash,
            'system_origin' => 'HESEM-MOM-v3',
            'allocation_id' => 'ALLOC-2',
            'template_checksum' => $templateHash,
            'issued_record_id' => 'REC-1',
        ]);

        $result = $service->verifyUpload($workbook);

        $this->assertFalse($result->valid);
        $this->assertSame('hash_mismatch', $result->reason);
    }

    public function testVerifyUploadRejectsIncompleteVerificationPayloadWithStableReason(): void
    {
        $service = new ExcelVerificationService($this->tmpDir);
        $workbook = $this->tmpDir . '/FRM-631_Rev.03_incomplete.xlsx';
        file_put_contents($workbook, 'not a real workbook');
        $this->writeSidecar($workbook, [
            'form_code' => 'FRM-631',
            'system_origin' => 'HESEM-MOM-v3',
        ]);

        $result = $service->verifyUpload($workbook);

        $this->assertFalse($result->valid);
        $this->assertSame('verification_payload_incomplete', $result->reason);
    }

    /**
     * @param array<string, mixed> $verification
     */
    private function writeSidecar(string $workbook, array $verification): void
    {
        file_put_contents($workbook . '.qms.json', json_encode([
            '_meta' => ['type' => 'qms_verification_sidecar'],
            'verification' => $verification,
        ], JSON_THROW_ON_ERROR));
    }

    private function removeDir(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }
        $items = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($dir, \RecursiveDirectoryIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST,
        );
        foreach ($items as $item) {
            $item->isDir() ? rmdir($item->getPathname()) : unlink($item->getPathname());
        }
        rmdir($dir);
    }
}
