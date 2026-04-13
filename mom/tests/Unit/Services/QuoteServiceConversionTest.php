<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Services\QuoteService;
use PHPUnit\Framework\TestCase;

final class QuoteServiceConversionTest extends TestCase
{
    private string $dataDir;

    protected function setUp(): void
    {
        $this->dataDir = sys_get_temp_dir() . '/hesem-quote-conversion-' . bin2hex(random_bytes(4));
        mkdir($this->dataDir . '/quotes', 0775, true);
    }

    protected function tearDown(): void
    {
        $this->removeDir($this->dataDir);
    }

    public function testConversionRetryRepairsAcceptedQuoteWithoutCreatingDuplicateSalesOrder(): void
    {
        $this->writeQuotes([[
            'quote_id' => 'QT-2026-0001',
            'status' => 'accepted',
            'customer_name' => 'ACME Aerospace',
            'customer_po' => 'PO-1',
            'total_value' => 1200,
            'total_qty' => 4,
            'lines' => [[
                'item_id' => 'PART-1',
                'qty' => 4,
                'unit_price' => 300,
            ]],
            'status_history' => [[
                'from' => 'sent',
                'to' => 'accepted',
                'timestamp' => '2026-04-13T10:00:00+07:00',
                'user' => 'sales-user',
            ]],
        ]]);

        $service = new QuoteService($this->dataDir);
        $first = $service->convertToSalesOrder('QT-2026-0001', 'PO-1', 'sales-user');
        $this->assertSame('SO-2026-0001', $first['so_number']);

        $quotes = $this->readQuotes();
        $quotes[0]['status'] = 'accepted';
        unset($quotes[0]['converted_to'], $quotes[0]['converted_at']);
        $this->writeQuotes($quotes);

        $retry = $service->convertToSalesOrder('QT-2026-0001', 'PO-1', 'sales-user');

        $this->assertSame($first['so_number'], $retry['so_number']);
        $this->assertTrue($retry['recovered_existing_sales_order']);
        $this->assertSame('converted', $retry['quote']['status']);
        $this->assertSame($first['so_number'], $retry['quote']['converted_to']);

        $orders = json_decode((string)file_get_contents($this->dataDir . '/orders/orders.json'), true);
        $this->assertIsArray($orders);
        $this->assertCount(1, $orders['sales_orders'] ?? []);
    }

    public function testConvertedQuoteReplayReturnsExistingSalesOrder(): void
    {
        $this->writeQuotes([[
            'quote_id' => 'QT-2026-0002',
            'status' => 'accepted',
            'customer_name' => 'Globex',
            'total_value' => 500,
            'total_qty' => 1,
            'lines' => [],
            'status_history' => [],
        ]]);

        $service = new QuoteService($this->dataDir);
        $first = $service->convertToSalesOrder('QT-2026-0002', '', 'sales-user');
        $second = $service->convertToSalesOrder('QT-2026-0002', '', 'sales-user');

        $this->assertSame($first['so_number'], $second['so_number']);
        $this->assertTrue($second['recovered_existing_sales_order']);

        $orders = json_decode((string)file_get_contents($this->dataDir . '/orders/orders.json'), true);
        $this->assertCount(1, $orders['sales_orders'] ?? []);
    }

    /**
     * @param array<int, array<string, mixed>> $quotes
     */
    private function writeQuotes(array $quotes): void
    {
        file_put_contents(
            $this->dataDir . '/quotes/quotes.json',
            json_encode($quotes, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
        );
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function readQuotes(): array
    {
        $decoded = json_decode((string)file_get_contents($this->dataDir . '/quotes/quotes.json'), true);
        return is_array($decoded) ? $decoded : [];
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
