<?php

declare(strict_types=1);

namespace MOM\Tests\Unit\Services;

use MOM\Services\ControlPlane\DomainOutboxService;
use PHPUnit\Framework\TestCase;

final class DomainOutboxServiceTest extends TestCase
{
    public function testEnqueueBridgesLegacyDomainOutboxToCanonicalOutboxEvents(): void
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
        $this->assertStringContainsString('INSERT INTO outbox_events', $db->executeCalls[0]['sql']);
        $this->assertStringContainsString('CAST(:payload AS jsonb)', $db->executeCalls[0]['sql']);
        $this->assertStringNotContainsString(':payload::jsonb', $db->executeCalls[0]['sql']);
        $this->assertSame('legacy_domain.evidencerecordfinalized', $db->executeCalls[0]['params'][':handler_key']);
        $this->assertSame('legacy_domain_outbox_bridge.v1', $db->executeCalls[0]['params'][':payload_schema_version']);
        $payload = json_decode((string)$db->executeCalls[0]['params'][':payload'], true);
        $this->assertIsArray($payload);
        $this->assertSame('finalized', $payload['record_state'] ?? null);
        $this->assertSame('DomainOutboxService', $payload['_compatibility']['legacy_api'] ?? null);
        $this->assertSame('domain_outbox_events', $payload['_compatibility']['legacy_table'] ?? null);
        $this->assertSame('outbox_events', $payload['_compatibility']['canonical_table'] ?? null);
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
