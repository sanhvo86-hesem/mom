<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use DateTimeImmutable;
use MOM\Services\FinanceControlService;
use PHPUnit\Framework\TestCase;
use RuntimeException;

final class FinanceControlServicePeriodPolicyTest extends TestCase
{
    private string $dataDir;

    protected function setUp(): void
    {
        $this->dataDir = sys_get_temp_dir() . '/hesem-finance-period-policy-' . bin2hex(random_bytes(4));
        mkdir($this->dataDir, 0775, true);
    }

    protected function tearDown(): void
    {
        $this->removeDir($this->dataDir);
    }

    public function testMemoPostingIntoClosedPeriodRequiresBackdateException(): void
    {
        $service = new FinanceControlService($this->dataDir);
        $service->createPeriodClose([
            'period_code' => '2026-04',
            'ledger_scope' => 'AP',
            'reason' => 'AP closed.',
        ], 'finance-user');

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Posting period 2026-04 for AP is closed');

        $service->createDebitMemo([
            'invoice_scope' => 'AP',
            'original_invoice_ref' => 'INV-AP-001',
            'reason' => 'Late debit memo.',
            'amount' => 100,
            'posting_date' => '2026-04-15',
        ], 'finance-user');
    }

    public function testBackdateExceptionIsConsumedByClosedPeriodMemoPosting(): void
    {
        $service = new FinanceControlService($this->dataDir);
        $service->createPeriodClose([
            'period_code' => '2026-04',
            'ledger_scope' => 'AP',
            'reason' => 'AP closed.',
        ], 'finance-user');

        $exception = $service->createBackdateException([
            'ledger_scope' => 'AP',
            'subject_type' => 'invoice',
            'subject_ref' => 'INV-AP-002',
            'reason' => 'Approved late posting.',
            'approval_reference' => 'APR-1',
            'original_event_at' => '2026-04-14T08:00:00+07:00',
            'requested_posting_date' => '2026-04-15',
            'expires_at' => (new DateTimeImmutable('+2 days'))->format(DATE_ATOM),
        ], 'finance-user');

        $memo = $service->createDebitMemo([
            'invoice_scope' => 'AP',
            'original_invoice_ref' => 'INV-AP-002',
            'reason' => 'Late debit memo.',
            'amount' => 100,
            'posting_date' => '2026-04-15',
            'backdate_exception_id' => $exception['backdate_exception_id'],
        ], 'finance-user');

        $this->assertSame('approved', $memo['memo_status']);
        $this->assertSame('closed_period_backdate_exception_consumed', $memo['posting_control']['policy'] ?? null);

        $consumed = $service->getBackdateException((string)$exception['backdate_exception_id']);
        $this->assertSame('closed', $consumed['exception_status'] ?? null);
        $this->assertSame('INV-AP-002', $consumed['used_for']['subject_ref'] ?? null);
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
