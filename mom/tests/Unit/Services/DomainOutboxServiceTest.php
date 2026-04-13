<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Services\ControlPlane\DomainOutboxService;
use PHPUnit\Framework\TestCase;

final class DomainOutboxServiceTest extends TestCase
{
    public function testEnqueueUsesPortableJsonbCastForBoundPayload(): void
    {
        $db = new DomainOutboxFakeDb();
        $service = new DomainOutboxService($db);

        $result = $service->enqueue(
            'evidence_record',
            'EV-1',
            'EvidenceRecordFinalized',
            ['record_state' => 'finalized'],
            ['idempotency_key' => 'idem-1'],
        );

        $this->assertTrue($result);
        $this->assertCount(1, $db->executeCalls);
        $this->assertStringContainsString('CAST(:payload AS jsonb)', $db->executeCalls[0]['sql']);
        $this->assertStringNotContainsString(':payload::jsonb', $db->executeCalls[0]['sql']);
        $this->assertSame('{"record_state":"finalized"}', $db->executeCalls[0]['params'][':payload']);
    }
}

final class DomainOutboxFakeDb
{
    /**
     * @var list<array{sql: string, params: array<string, mixed>}>
     */
    public array $executeCalls = [];

    /**
     * @param array<string, mixed> $params
     */
    public function execute(string $sql, array $params = []): int
    {
        $this->executeCalls[] = ['sql' => $sql, 'params' => $params];
        return 1;
    }
}
