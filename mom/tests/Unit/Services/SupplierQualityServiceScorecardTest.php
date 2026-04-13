<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Services\SupplierQualityService;
use PHPUnit\Framework\TestCase;

final class SupplierQualityServiceScorecardTest extends TestCase
{
    private string $dataDir;

    protected function setUp(): void
    {
        $this->dataDir = sys_get_temp_dir() . '/hesem-supplier-scorecard-' . bin2hex(random_bytes(4));
        mkdir($this->dataDir . '/supplier-quality', 0775, true);
    }

    protected function tearDown(): void
    {
        $this->removeDir($this->dataDir);
    }

    public function testScorecardUsesPpmScarAuditAndCertRisk(): void
    {
        $this->writeSupplierQuality('incoming', [
            [
                'vendor_id' => 'V-100',
                'inspection_date' => '2026-04-10',
                'result' => 'accepted',
                'qty_received' => 1000,
                'qty_rejected' => 2,
                'received_date' => '2026-04-10',
                'promise_date' => '2026-04-10',
            ],
            [
                'vendor_id' => 'V-100',
                'inspection_date' => '2026-04-13',
                'result' => 'rejected',
                'qty_received' => 500,
                'defects_found' => 3,
                'received_date' => '2026-04-13',
                'promise_date' => '2026-04-12',
            ],
        ]);
        $this->writeSupplierQuality('scar', [[
            'vendor_id' => 'V-100',
            'issue_date' => '2026-04-02',
            'status' => 'corrective_action',
            'severity' => 'major',
            'corrective_due_date' => '2026-04-05',
        ]]);
        $this->writeSupplierQuality('audits', [[
            'vendor_id' => 'V-100',
            'audit_date' => '2026-04-20',
            'status' => 'failed',
            'findings_count_major' => 2,
        ]]);
        $this->writeSupplierQuality('asl', [[
            'vendor_id' => 'V-100',
            'asl_status' => 'approved',
            'expiry_date' => '2026-04-30',
        ]]);

        $scorecard = (new SupplierQualityService($this->dataDir))->calculateScorecard('V-100', '2026-04', 'qa-user');

        $this->assertSame(1500.0, $scorecard['qty_received']);
        $this->assertSame(5.0, $scorecard['qty_rejected']);
        $this->assertSame(3333.3, $scorecard['ppm']);
        $this->assertSame(1, $scorecard['scar_count']);
        $this->assertSame(1, $scorecard['open_scar_count']);
        $this->assertSame(1, $scorecard['overdue_scar_count']);
        $this->assertSame(22.0, $scorecard['scar_severity_penalty']);
        $this->assertSame(30.0, $scorecard['audit_risk_penalty']);
        $this->assertSame(15.0, $scorecard['cert_risk_penalty']);
        $this->assertSame(77.7, $scorecard['quality_score']);
        $this->assertSame(50.0, $scorecard['delivery_score']);
        $this->assertSame(47.0, $scorecard['compliance_score']);
        $this->assertSame(70.8, $scorecard['overall_score']);
        $this->assertTrue($scorecard['asl_approved']);
        $this->assertSame('qa-user', $scorecard['calculated_by']);
    }

    /**
     * @param array<int, array<string, mixed>> $records
     */
    private function writeSupplierQuality(string $store, array $records): void
    {
        file_put_contents(
            $this->dataDir . '/supplier-quality/' . $store . '.json',
            json_encode($records, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
        );
    }

    private function removeDir(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }

        $items = scandir($dir) ?: [];
        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }
            $path = $dir . '/' . $item;
            if (is_dir($path)) {
                $this->removeDir($path);
                continue;
            }
            @unlink($path);
        }
        @rmdir($dir);
    }
}
