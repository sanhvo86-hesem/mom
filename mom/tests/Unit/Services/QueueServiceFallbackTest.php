<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Api\Services\QueueService;
use PhpAmqpLib\Channel\AMQPChannel;
use PhpAmqpLib\Message\AMQPMessage;
use PHPUnit\Framework\TestCase;
use ReflectionClass;

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

    public function testAmqpPublishWaitsForBrokerConfirmBeforeSuccess(): void
    {
        $queue = new QueueService($this->tmpDir, ['host' => '127.0.0.1', 'port' => 1], 2);
        $channel = $this->newFakeChannel();

        $this->setPrivate($queue, 'channel', $channel);
        $this->invokePrivate($queue, 'enablePublisherConfirms');
        $this->setPrivate($queue, 'amqpAvailable', true);

        $this->assertTrue($queue->publish('workflow.transitioned', ['record_id' => 'REC-1']));
        $this->assertTrue($channel->confirmSelected);
        $this->assertTrue($channel->published);
        $this->assertTrue($channel->mandatory);
        $this->assertTrue($channel->waitedForConfirm);
        $this->assertSame(5.0, $channel->confirmTimeout);
    }

    private function newFakeChannel(): ConfirmingQueueTestChannel
    {
        $reflection = new ReflectionClass(ConfirmingQueueTestChannel::class);
        /** @var ConfirmingQueueTestChannel $channel */
        $channel = $reflection->newInstanceWithoutConstructor();
        return $channel;
    }

    private function setPrivate(object $target, string $property, mixed $value): void
    {
        $reflection = new ReflectionClass($target);
        $prop = $reflection->getProperty($property);
        if (PHP_VERSION_ID < 80100) {
            $prop->setAccessible(true);
        }
        $prop->setValue($target, $value);
    }

    private function invokePrivate(object $target, string $method): void
    {
        $reflection = new ReflectionClass($target);
        $refMethod = $reflection->getMethod($method);
        if (PHP_VERSION_ID < 80100) {
            $refMethod->setAccessible(true);
        }
        $refMethod->invoke($target);
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

final class ConfirmingQueueTestChannel extends AMQPChannel
{
    public bool $confirmSelected = false;
    public bool $published = false;
    public bool $mandatory = false;
    public bool $waitedForConfirm = false;
    public float|int $confirmTimeout = -1;

    public function confirm_select($nowait = false)
    {
        $this->confirmSelected = true;
    }

    public function set_nack_handler($callback)
    {
    }

    public function set_return_listener($callback)
    {
    }

    public function basic_publish(
        $msg,
        $exchange = '',
        $routing_key = '',
        $mandatory = false,
        $immediate = false,
        $ticket = null
    ) {
        TestCase::assertInstanceOf(AMQPMessage::class, $msg);
        $this->published = true;
        $this->mandatory = (bool)$mandatory;
    }

    public function wait_for_pending_acks_returns($timeout = 0)
    {
        $this->waitedForConfirm = true;
        $this->confirmTimeout = $timeout;
    }
}
