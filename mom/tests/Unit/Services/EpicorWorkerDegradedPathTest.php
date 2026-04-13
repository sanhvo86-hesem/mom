<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Services\EpicorInboundWorker;
use MOM\Services\OutboxWorker;
use PHPUnit\Framework\TestCase;

final class EpicorWorkerDegradedPathTest extends TestCase
{
    /**
     * @runInSeparateProcess
     */
    public function testUnsupportedOutboundAndInboundDomainsAreNotReportedAsOk(): void
    {
        $tmpDir = sys_get_temp_dir() . '/mom_epicor_worker_test_' . bin2hex(random_bytes(4));
        mkdir($tmpDir . '/erp', 0775, true);
        mkdir($tmpDir . '/config', 0775, true);

        $previous = $this->swapEpicorGlobals($tmpDir);
        try {
            file_put_contents($tmpDir . '/config/epicor_integration_policy.json', json_encode([
                'system_name' => 'Epicor Kinetic',
                'domains' => [
                    'sales_orders' => ['direction' => 'inbound'],
                ],
                'outbound_targets' => [
                    'max_retry_count' => 2,
                    'dead_letter_after_failures' => 2,
                ],
            ], JSON_UNESCAPED_SLASHES));

            file_put_contents($tmpDir . '/erp/epicor-runtime.json', json_encode([
                '_meta' => ['version' => '1.0', 'updated' => gmdate(DATE_ATOM)],
                'sync_runs' => [],
                'reconciliation_exceptions' => [],
                'outbox_events' => [[
                    'outbox_event_id' => 'OUT-UNSUPPORTED-1',
                    'sync_domain' => 'unsupported_domain',
                    'publish_status' => 'queued',
                    'first_queued_at' => '2026-04-13T00:00:00Z',
                    'retry_count' => 0,
                    'payload' => ['id' => 'P1'],
                ]],
                'checkpoints' => [],
                'health' => [],
            ], JSON_UNESCAPED_SLASHES));

            $outbox = (new OutboxWorker($tmpDir))->processPending(['limit' => 1, 'user_id' => 'test']);
            $this->assertFalse($outbox['ok']);
            $this->assertSame(1, $outbox['dead_letter']);
            $this->assertSame('dead_letter', $outbox['results'][0]['status']);
            $this->assertSame('unsupported_outbox_domain', $outbox['results'][0]['degradation_reason']);
            $this->assertSame('dead_letter', $outbox['runtime']['outbox_events'][0]['publish_status']);

            $inbound = (new EpicorInboundWorker($tmpDir))->processInbound([
                'domains' => ['unsupported_inbound'],
                'user_id' => 'test',
            ]);
            $this->assertFalse($inbound['ok']);
            $this->assertSame(1, $inbound['skipped']);
            $this->assertSame('skipped', $inbound['results'][0]['status']);
            $this->assertTrue($inbound['runtime']['health']['last_inbound_worker_result']['degraded']);
        } finally {
            $this->restoreEpicorGlobals($previous);
            $this->removeDir($tmpDir);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function swapEpicorGlobals(string $tmpDir): array
    {
        $previous = [
            'DATA_DIR' => $GLOBALS['DATA_DIR'] ?? null,
            'CONF_DIR' => $GLOBALS['CONF_DIR'] ?? null,
            'EPICOR_RUNTIME_FILE' => $GLOBALS['EPICOR_RUNTIME_FILE'] ?? null,
            'EPICOR_POLICY_FILE' => $GLOBALS['EPICOR_POLICY_FILE'] ?? null,
        ];

        $GLOBALS['DATA_DIR'] = $tmpDir;
        $GLOBALS['CONF_DIR'] = $tmpDir . '/config';
        $GLOBALS['EPICOR_RUNTIME_FILE'] = $tmpDir . '/erp/epicor-runtime.json';
        $GLOBALS['EPICOR_POLICY_FILE'] = $tmpDir . '/config/epicor_integration_policy.json';

        return $previous;
    }

    /**
     * @param array<string, mixed> $previous
     */
    private function restoreEpicorGlobals(array $previous): void
    {
        foreach ($previous as $key => $value) {
            if ($value === null) {
                unset($GLOBALS[$key]);
            } else {
                $GLOBALS[$key] = $value;
            }
        }
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
