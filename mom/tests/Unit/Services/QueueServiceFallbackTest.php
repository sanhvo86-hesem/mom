<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\QueueService;
use PHPUnit\Framework\TestCase;

final class QueueServiceFallbackTest extends TestCase
{
    private string $tmpDir;

    protected function setUp(): void
    {
        $this->tmpDir = sys_get_temp_dir() . '/mom_queue_fallback_test_' . bin2hex(random_bytes(4));
        mkdir($this->tmpDir, 0775, true);
    }

    protected function tearDown(): void
    {
        $this->removeDir($this->tmpDir);
    }

    public function testFileFallbackDeadLettersPoisonMessageAfterMaxAttempts(): void
    {
        $queue = new QueueService($this->tmpDir, ['host' => '127.0.0.1', 'port' => 1], 2);

        $this->assertFalse($queue->isAmqpAvailable());
        $this->assertTrue($queue->publish('workflow.transitioned', ['record_id' => 'REC-1']));
        $this->assertSame(1, $queue->getPendingCount(QueueService::QUEUE_EVENTS_AUDIT));

        $queue->consume(QueueService::QUEUE_EVENTS_AUDIT, static fn(array $message): bool => false);
        $healthAfterFirstAttempt = $queue->getHealth();
        $this->assertSame(1, $queue->getPendingCount(QueueService::QUEUE_EVENTS_AUDIT));
        $this->assertSame(1, $healthAfterFirstAttempt['file_backlog_count']);
        $this->assertSame(0, $healthAfterFirstAttempt['file_dead_letter_count']);
        $this->assertFalse($healthAfterFirstAttempt['file_reconciliation_required']);

        $queue->consume(QueueService::QUEUE_EVENTS_AUDIT, static fn(array $message): bool => false);
        $healthAfterSecondAttempt = $queue->getHealth();

        $this->assertSame(0, $queue->getPendingCount(QueueService::QUEUE_EVENTS_AUDIT));
        $this->assertSame(0, $healthAfterSecondAttempt['file_backlog_count']);
        $this->assertSame(1, $healthAfterSecondAttempt['file_dead_letter_count']);
        $this->assertTrue($healthAfterSecondAttempt['file_reconciliation_required']);

        $deadLetterFile = $this->tmpDir . '/queue/events.audit.dead-letter.jsonl';
        $this->assertFileExists($deadLetterFile);
        $deadLetter = json_decode((string)file_get_contents($deadLetterFile), true);
        $this->assertSame('dead_letter', $deadLetter['file_status'] ?? null);
        $this->assertSame(2, $deadLetter['file_attempts'] ?? null);
        $this->assertSame('handler_returned_false', $deadLetter['dead_letter_reason'] ?? null);
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
