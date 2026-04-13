<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Services\ControlPlane\DomainOutboxWorker;
use PHPUnit\Framework\TestCase;
use RuntimeException;

final class DomainOutboxWorkerTest extends TestCase
{
    public function testFailedEventMovesToDeadLetterAfterMaximumAttempts(): void
    {
        $db = new DomainOutboxWorkerFakeDb([
            [
                'domain_outbox_event_id' => '00000000-0000-0000-0000-000000000001',
                'event_type' => 'PublicationQueued',
                'attempts' => 4,
            ],
        ]);
        $worker = new DomainOutboxWorker($db, [
            'PublicationQueued' => static fn(): never => throw new RuntimeException('Graph unavailable'),
        ]);

        $result = $worker->runOnce(1);

        $this->assertSame(['processed' => 0, 'failed' => 0, 'dead_letter' => 1], $result);
        $this->assertCount(2, $db->executeCalls);
        $failedMark = $db->executeCalls[1];
        $this->assertStringContainsString("THEN 'dead_letter'", $failedMark['sql']);
        $this->assertStringContainsString('CAST(:id AS uuid)', $failedMark['sql']);
        $this->assertStringNotContainsString(':id::uuid', $failedMark['sql']);
        $this->assertSame('failed', $failedMark['params'][':status']);
        $this->assertSame(5, $failedMark['params'][':max_attempts']);
    }
}

final class DomainOutboxWorkerFakeDb
{
    /**
     * @var list<array<string, mixed>>
     */
    private array $rows;

    /**
     * @var list<array{sql: string, params: array<string, mixed>}>
     */
    public array $executeCalls = [];

    /**
     * @param list<array<string, mixed>> $rows
     */
    public function __construct(array $rows)
    {
        $this->rows = $rows;
    }

    /**
     * @param array<string, mixed> $params
     * @return list<array<string, mixed>>
     */
    public function query(string $sql, array $params = []): array
    {
        return $this->rows;
    }

    /**
     * @param array<string, mixed> $params
     */
    public function execute(string $sql, array $params = []): int
    {
        $this->executeCalls[] = ['sql' => $sql, 'params' => $params];
        return 1;
    }
}
